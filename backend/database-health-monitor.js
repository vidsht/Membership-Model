    const db = require('./db');

class DatabaseHealthMonitor {
  constructor() {
    this.isHealthy = true;
    this.lastHealthCheck = Date.now();
    this.connectionErrors = 0;
    this.maxErrors = 5;
    this.healthCheckInterval = 30000; // 30 seconds
    
    this.startHealthChecks();
  }

  async startHealthChecks() {
    console.log('🏥 Starting database health monitoring...');
    
    setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  async performHealthCheck() {
    try {
      const start = Date.now();
      
      await new Promise((resolve, reject) => {
        db.query('SELECT 1 as health_check', (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });
      
      const responseTime = Date.now() - start;
      
      // Reset error count on successful check
      this.connectionErrors = 0;
      this.isHealthy = true;
      this.lastHealthCheck = Date.now();
      
      if (responseTime > 5000) {
        console.warn(`⚠️ Slow database response: ${responseTime}ms`);
      } else {
        console.log(`✅ Database health check passed (${responseTime}ms)`);
      }
      
    } catch (error) {
      this.connectionErrors++;
      console.error(`❌ Database health check failed (${this.connectionErrors}/${this.maxErrors}):`, error.message);
      
      if (this.connectionErrors >= this.maxErrors) {
        this.isHealthy = false;
        console.error('🚨 Database marked as unhealthy due to consecutive failures');
        
        // Notify admins or trigger alerts here
        this.notifyUnhealthyDatabase(error);
      }
    }
  }

  notifyUnhealthyDatabase(error) {
    console.error('🚨 DATABASE CRITICAL ALERT 🚨');
    console.error('Database has been marked unhealthy due to connection failures');
    console.error('Error details:', error);
    console.error('Host:', process.env.DB_HOST);
    console.error('Database:', process.env.DB_NAME);
    console.error('Time:', new Date().toISOString());
    
    // Add email notification or external monitoring service here
  }

  getHealth() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      connectionErrors: this.connectionErrors,
      uptime: Date.now() - this.lastHealthCheck
    };
  }

  // Middleware to check database health before processing requests
  healthCheckMiddleware() {
    return (req, res, next) => {
      if (!this.isHealthy) {
        return res.status(503).json({
          success: false,
          message: 'Database service temporarily unavailable',
          error: 'UNHEALTHY_DATABASE'
        });
      }
      next();
    };
  }
}

// Database connection wrapper with retry logic
class DatabaseConnectionWrapper {
  static async queryWithRetry(query, params = [], maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Query timeout after 30 seconds'));
          }, 30000);

          db.query(query, params, (err, results) => {
            clearTimeout(timeout);
            
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        });
        
      } catch (error) {
        console.error(`Database query attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Transaction wrapper with retry logic
  static async transactionWithRetry(operations, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const connection = await new Promise((resolve, reject) => {
        db.getConnection((err, conn) => {
          if (err) reject(err);
          else resolve(conn);
        });
      });

      try {
        await new Promise((resolve, reject) => {
          connection.beginTransaction((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Execute all operations
        const results = [];
        for (const operation of operations) {
          const result = await new Promise((resolve, reject) => {
            connection.query(operation.query, operation.params || [], (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
          results.push(result);
        }

        // Commit transaction
        await new Promise((resolve, reject) => {
          connection.commit((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        connection.release();
        return results;

      } catch (error) {
        // Rollback transaction
        await new Promise((resolve) => {
          connection.rollback(() => resolve());
        });
        
        connection.release();
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.error(`Transaction attempt ${attempt}/${maxRetries} failed:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
}

module.exports = { DatabaseHealthMonitor, DatabaseConnectionWrapper };