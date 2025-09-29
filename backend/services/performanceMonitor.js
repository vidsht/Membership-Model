/**
 * Performance Monitoring and Health Check Service
 * Monitors system performance, database health, and provides health endpoints
 */

const os = require('os');
const { cacheService } = require('./cacheService');
const db = require('../db');

class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.slowRequests = [];
    this.maxSlowRequests = 100; // Keep last 100 slow requests
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byStatus: {},
        avgResponseTime: 0,
        slowRequests: 0
      },
      system: {
        uptime: 0,
        memory: {},
        cpu: {},
        connections: {
          database: 0,
          active: 0
        }
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
  }

  // Middleware to track request performance
  requestTracker() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.recordRequest(req, res, duration);
      });

      next();
    };
  }

  recordRequest(req, res, duration) {
    this.requestCount++;
    this.metrics.requests.total++;

    // Track by method
    this.metrics.requests.byMethod[req.method] = 
      (this.metrics.requests.byMethod[req.method] || 0) + 1;

    // Track by status
    const statusCode = res.statusCode;
    this.metrics.requests.byStatus[statusCode] = 
      (this.metrics.requests.byStatus[statusCode] || 0) + 1;

    // Update average response time
    this.metrics.requests.avgResponseTime = 
      (this.metrics.requests.avgResponseTime + duration) / 2;

    // Track slow requests (> 1 second)
    if (duration > 1000) {
      this.metrics.requests.slowRequests++;
      this.slowRequests.push({
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        duration,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      // Keep only the last N slow requests
      if (this.slowRequests.length > this.maxSlowRequests) {
        this.slowRequests.shift();
      }

      console.warn(`🐌 Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
  }

  // Get current system metrics
  async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    this.metrics.system = {
      uptime: Date.now() - this.startTime,
      processUptime: process.uptime() * 1000,
      systemUptime: os.uptime() * 1000,
      memory: {
        system: systemMem,
        process: memUsage,
        usage: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        }
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
        platform: os.platform(),
        arch: os.arch()
      }
    };

    return this.metrics.system;
  }

  // Get database health
  async getDatabaseHealth() {
    try {
      const start = Date.now();
      
      // Test query
      await new Promise((resolve, reject) => {
        db.query('SELECT 1 as health_check', (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      const connectionTime = Date.now() - start;

      // Get database stats
      const stats = await new Promise((resolve, reject) => {
        db.query(`
          SELECT 
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM businesses) as total_businesses,
            (SELECT COUNT(*) FROM deals WHERE status = 'active') as active_deals,
            (SELECT COUNT(*) FROM sessions WHERE expires > NOW()) as active_sessions
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });

      return {
        status: 'healthy',
        connectionTime,
        stats,
        pool: {
          total: db.config.connectionLimit,
          active: db._allConnections ? db._allConnections.length : 0,
          queue: db._connectionQueue ? db._connectionQueue.length : 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connectionTime: null
      };
    }
  }

  // Get cache health
  async getCacheHealth() {
    try {
      const stats = cacheService.getStats();
      const testKey = 'health_check_' + Date.now();
      const testValue = { test: true };

      // Test cache write/read
      await cacheService.set(testKey, testValue, 5);
      const retrieved = await cacheService.get(testKey);
      await cacheService.del(testKey);

      const isWorking = retrieved && retrieved.test === true;

      return {
        status: isWorking ? 'healthy' : 'degraded',
        stats,
        backend: stats.backend
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  // Get comprehensive health report
  async getHealthReport() {
    const [system, database, cache] = await Promise.all([
      this.getSystemMetrics(),
      this.getDatabaseHealth(),
      this.getCacheHealth()
    ]);

    const overall = database.status === 'healthy' && cache.status !== 'unhealthy' 
      ? 'healthy' : 'degraded';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      services: {
        database,
        cache,
        system
      },
      performance: {
        requests: this.metrics.requests,
        slowRequests: this.slowRequests.slice(-10) // Last 10 slow requests
      }
    };
  }

  // Get performance recommendations
  getRecommendations() {
    const recommendations = [];
    const { memory, requests } = this.metrics;

    // Memory recommendations
    if (memory.usage && memory.usage.heapUsed > 500) {
      recommendations.push({
        type: 'memory',
        severity: 'warning',
        message: 'High memory usage detected. Consider optimizing memory-intensive operations.',
        value: `${memory.usage.heapUsed}MB`
      });
    }

    // Response time recommendations  
    if (requests.avgResponseTime > 500) {
      recommendations.push({
        type: 'performance',
        severity: 'warning',
        message: 'Average response time is high. Consider adding more caching or optimizing queries.',
        value: `${Math.round(requests.avgResponseTime)}ms`
      });
    }

    // Slow requests recommendations
    if (requests.slowRequests > 10) {
      recommendations.push({
        type: 'performance',
        severity: 'critical',
        message: 'Too many slow requests detected. Review slow request log and optimize.',
        value: `${requests.slowRequests} slow requests`
      });
    }

    return recommendations;
  }

  // Reset metrics (for testing or periodic cleanup)
  resetMetrics() {
    this.requestCount = 0;
    this.slowRequests = [];
    this.metrics.requests = {
      total: 0,
      byMethod: {},
      byStatus: {},
      avgResponseTime: 0,
      slowRequests: 0
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;