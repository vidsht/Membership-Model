/**
 * Health Check and Monitoring Routes
 * Provides endpoints for monitoring system health and performance
 */

const express = require('express');
const performanceMonitor = require('../services/performanceMonitor');
const { cacheService } = require('../services/cacheService');

const router = express.Router();

// Basic health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await performanceMonitor.getHealthReport();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      status: health.status,
      timestamp: health.timestamp,
      uptime: health.services.system.uptime,
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed health check (admin only)
router.get('/health/detailed', async (req, res) => {
  try {
    // Basic auth check - only allow in development or for admin users
    if (process.env.NODE_ENV === 'production' && req.session?.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const health = await performanceMonitor.getHealthReport();
    const recommendations = performanceMonitor.getRecommendations();

    res.json({
      ...health,
      recommendations,
      environment: process.env.NODE_ENV,
      nodeVersion: process.version
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Performance metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    // Basic auth check
    if (process.env.NODE_ENV === 'production' && req.session?.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const system = await performanceMonitor.getSystemMetrics();
    const cache = await performanceMonitor.getCacheHealth();
    const database = await performanceMonitor.getDatabaseHealth();

    res.json({
      timestamp: new Date().toISOString(),
      system,
      cache,
      database,
      requests: performanceMonitor.metrics.requests
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cache management endpoints
router.post('/cache/clear', async (req, res) => {
  try {
    // Admin only
    if (req.session?.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await cacheService.flush();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/cache/stats', async (req, res) => {
  try {
    // Admin only
    if (process.env.NODE_ENV === 'production' && req.session?.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = cacheService.getStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System information endpoint
router.get('/system', async (req, res) => {
  try {
    // Admin only
    if (process.env.NODE_ENV === 'production' && req.session?.user?.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const system = await performanceMonitor.getSystemMetrics();
    
    res.json({
      ...system,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Reset performance metrics (development only)
router.post('/metrics/reset', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    performanceMonitor.resetMetrics();
    res.json({
      success: true,
      message: 'Performance metrics reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;