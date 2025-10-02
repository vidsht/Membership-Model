/**
 * Backend Performance Optimization Middleware
 * Implements caching, compression, and connection optimizations with zero functional regressions
 */

const compression = require('compression');
const helmet = require('helmet');

// Performance flags from environment variables
const getPerformanceFlags = () => {
  return {
    perf_disable_all: process.env.PERF_DISABLE_ALL === 'true',
    perf_cache_headers: process.env.PERF_CACHE_HEADERS === 'true',
    perf_compression: process.env.PERF_COMPRESSION === 'true',
    perf_security_headers: process.env.PERF_SECURITY_HEADERS === 'true',
  };
};

/**
 * Safe routes for caching - excludes image/QR/barcode endpoints
 */
const SAFE_CACHE_ROUTES = [
  '/api/businesses',      // Public business directory
  '/api/plans',          // Membership plans
  '/api/health',         // Health check
  '/api/admin/settings/public', // Public settings
];

/**
 * Routes to EXCLUDE from caching (critical paths)
 */
const EXCLUDED_CACHE_ROUTES = [
  '/api/upload',         // Image upload/processing
  '/api/auth',           // Authentication
  '/api/users',          // User data
  '/api/merchant',       // Merchant data with images
  '/api/deals',          // Deals with banners (exclude to be safe)
  '/api/admin',          // Admin operations
];

/**
 * Enhanced cache control middleware with cache busting
 */
const cacheControlMiddleware = {
  // Static assets caching with cache busting
  staticAssets: (req, res, next) => {
    const flags = getPerformanceFlags();
    
    if (flags.perf_disable_all || !flags.perf_cache_headers) {
      return next();
    }
    
    try {
      // Only cache static assets, not dynamic content
      if (req.path.startsWith('/uploads/') && req.method === 'GET') {
        // Cache uploaded files but NOT during upload process
        if (!req.path.includes('/temp_uploads/')) {
          const fileExt = path.extname(req.path).toLowerCase();
          const buildVersion = process.env.BUILD_VERSION || Date.now().toString();
          
          // Different cache strategies for different file types
          if (['.css', '.js'].includes(fileExt)) {
            // CSS/JS: Short cache with must-revalidate for cache busting
            res.set({
              'Cache-Control': 'public, max-age=3600, must-revalidate',
              'ETag': `"${buildVersion}-${req.path}"`,
              'X-Build-Version': buildVersion,
              'Vary': 'Accept-Encoding'
            });
          } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(fileExt)) {
            // Images: Longer cache but with version
            res.set({
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
              'ETag': `"${buildVersion}-${req.path}"`,
              'X-Build-Version': buildVersion
            });
          } else if (['.woff', '.woff2', '.ttf', '.eot'].includes(fileExt)) {
            // Fonts: Very long cache (they rarely change)
            res.set({
              'Cache-Control': 'public, max-age=2592000, immutable',
              'ETag': `"${buildVersion}-${req.path}"`
            });
          } else {
            // Default: Medium cache with revalidation
            res.set({
              'Cache-Control': 'public, max-age=7200, must-revalidate',
              'ETag': `"${buildVersion}-${req.path}"`,
              'X-Build-Version': buildVersion
            });
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('Cache control middleware error:', error);
      next();
    }
  },
  
  // API response caching for safe endpoints with cache busting
  apiResponses: (req, res, next) => {
    const flags = getPerformanceFlags();
    
    if (flags.perf_disable_all || !flags.perf_cache_headers) {
      return next();
    }
    
    try {
      const path = req.path;
      const buildVersion = process.env.BUILD_VERSION || Date.now().toString();
      
      // Check if route is safe for caching
      const isSafe = SAFE_CACHE_ROUTES.some(route => path.startsWith(route));
      const isExcluded = EXCLUDED_CACHE_ROUTES.some(route => path.startsWith(route));
      
      if (isSafe && !isExcluded && req.method === 'GET') {
        // Cache safe GET responses for 5 minutes with version tracking
        res.set({
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
          'Vary': 'Accept-Encoding',
          'X-API-Version': buildVersion,
          'ETag': `"api-${buildVersion}-${Buffer.from(path).toString('base64').substr(0, 8)}"`
        });
      } else if (isExcluded || req.method !== 'GET') {
        // Explicitly prevent caching for excluded routes and non-GET requests
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': buildVersion
        });
      }
      
      next();
    } catch (error) {
      console.error('API cache middleware error:', error);
      next();
    }
  }
};

/**
 * Enhanced compression middleware
 */
const compressionMiddleware = (req, res, next) => {
  const flags = getPerformanceFlags();
  
  if (flags.perf_disable_all || !flags.perf_compression) {
    return next();
  }
  
  try {
    // Use compression with safe settings
    return compression({
      // Only compress responses larger than 1KB
      threshold: 1024,
      
      // Compression level (6 is a good balance)
      level: 6,
      
      // Memory level
      memLevel: 8,
      
      // Filter function to exclude certain content types
      filter: (req, res) => {
        // Don't compress if response is already compressed
        if (res.getHeader('Content-Encoding')) {
          return false;
        }
        
        // Don't compress images (they're already compressed)
        const contentType = res.getHeader('Content-Type') || '';
        if (contentType.startsWith('image/')) {
          return false;
        }
        
        // Don't compress if this is an upload endpoint (could interfere with processing)
        if (req.path.includes('/upload')) {
          return false;
        }
        
        // Use compression for text-based content
        return /json|text|javascript|css|xml|svg/.test(contentType);
      }
    })(req, res, next);
  } catch (error) {
    console.error('Compression middleware error:', error);
    next();
  }
};

/**
 * Security headers middleware (performance-related security)
 */
const securityHeadersMiddleware = (req, res, next) => {
  const flags = getPerformanceFlags();
  
  if (flags.perf_disable_all || !flags.perf_security_headers) {
    return next();
  }
  
  try {
    // Apply performance-focused security headers
    res.set({
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Enable DNS prefetch control
      'X-DNS-Prefetch-Control': 'on',
      
      // Frame options (for embedding)
      'X-Frame-Options': 'SAMEORIGIN',
      
      // Referrer policy for better privacy and performance
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    
    next();
  } catch (error) {
    console.error('Security headers middleware error:', error);
    next();
  }
};

/**
 * Connection hints middleware (preconnect/dns-prefetch)
 */
const connectionHintsMiddleware = (req, res, next) => {
  const flags = getPerformanceFlags();
  
  if (flags.perf_disable_all || !flags.perf_cache_headers) {
    return next();
  }
  
  try {
    // Only add connection hints to HTML responses
    const originalSend = res.send;
    
    res.send = function(data) {
      const contentType = this.getHeader('Content-Type') || '';
      
      if (contentType.includes('text/html') && typeof data === 'string') {
        // Add preconnect/dns-prefetch for known safe origins
        const connectionHints = `
          <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
        `;
        
        // Insert before closing </head> tag
        data = data.replace('</head>', connectionHints + '</head>');
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Connection hints middleware error:', error);
    next();
  }
};

/**
 * Error boundary for performance middleware
 */
const performanceErrorHandler = (error, req, res, next) => {
  console.error('Performance middleware error:', error);
  
  // Log to monitoring system if available
  if (global.performanceMonitor) {
    global.performanceMonitor.logError(error, {
      middleware: 'performance',
      path: req.path,
      method: req.method
    });
  }
  
  // Don't let performance optimizations break the application
  next();
};

/**
 * Performance monitoring middleware
 */
const performanceMonitoringMiddleware = (req, res, next) => {
  const flags = getPerformanceFlags();
  
  if (flags.perf_disable_all) {
    return next();
  }
  
  try {
    const startTime = Date.now();
    
    // Override res.end to measure response time
    const originalEnd = res.end;
    
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      
      // Log slow requests (> 1 second)
      if (duration > 1000) {
        console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
      }
      
      // Add performance headers for debugging
      if (process.env.NODE_ENV === 'development') {
        this.setHeader('X-Response-Time', duration + 'ms');
      }
      
      return originalEnd.apply(this, args);
    };
    
    next();
  } catch (error) {
    console.error('Performance monitoring error:', error);
    next();
  }
};

/**
 * Main performance optimization setup
 */
function setupPerformanceOptimizations(app) {
  const flags = getPerformanceFlags();
  
  if (flags.perf_disable_all) {
    console.log('🔴 Performance optimizations disabled via kill switch');
    return;
  }
  
  console.log('🚀 Setting up backend performance optimizations');
  console.log('Performance flags:', flags);
  
  try {
    // Performance monitoring (always enabled for debugging)
    app.use(performanceMonitoringMiddleware);
    
    // Compression middleware
    if (flags.perf_compression) {
      app.use(compressionMiddleware);
      console.log('✅ Compression enabled');
    }
    
    // Security headers
    if (flags.perf_security_headers) {
      app.use(securityHeadersMiddleware);
      console.log('✅ Security headers enabled');
    }
    
    // Cache control
    if (flags.perf_cache_headers) {
      app.use(cacheControlMiddleware.staticAssets);
      app.use(cacheControlMiddleware.apiResponses);
      app.use(connectionHintsMiddleware);
      console.log('✅ Cache control enabled');
    }
    
    // Error handler for performance middleware
    app.use(performanceErrorHandler);
    
  } catch (error) {
    console.error('Error setting up performance optimizations:', error);
  }
}

/**
 * Runtime flag toggle endpoint (for emergency kill switch)
 */
function setupPerformanceFlagEndpoint(app) {
  app.post('/api/admin/performance-flags', (req, res) => {
    try {
      // This endpoint should be protected by admin authentication
      const { flag, enabled } = req.body;
      
      if (!flag || typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Invalid flag or enabled value'
        });
      }
      
      // Set environment variable for this process
      process.env[`PERF_${flag.toUpperCase()}`] = enabled.toString();
      
      console.log(`Performance flag ${flag} ${enabled ? 'enabled' : 'disabled'}`);
      
      res.json({
        success: true,
        message: `Performance flag ${flag} ${enabled ? 'enabled' : 'disabled'}`,
        flags: getPerformanceFlags()
      });
      
    } catch (error) {
      console.error('Error toggling performance flag:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle performance flag'
      });
    }
  });
  
  // Get current performance flags
  app.get('/api/admin/performance-flags', (req, res) => {
    try {
      res.json({
        success: true,
        flags: getPerformanceFlags()
      });
    } catch (error) {
      console.error('Error getting performance flags:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get performance flags'
      });
    }
  });
}

module.exports = {
  setupPerformanceOptimizations,
  setupPerformanceFlagEndpoint,
  cacheControlMiddleware,
  compressionMiddleware,
  securityHeadersMiddleware,
  performanceMonitoringMiddleware,
  getPerformanceFlags
};
