/**
 * Caching Middleware for Express Routes
 * Automatically caches GET responses for better performance
 */

const { cacheService } = require('../services/cacheService');

// Generic cache middleware
function cacheMiddleware(options = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `route:${req.method}:${req.originalUrl}`,
    condition = (req) => req.method === 'GET'
  } = options;

  return async (req, res, next) => {
    // Only cache if condition is met (default: GET requests)
    if (!condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get cached response
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        console.log(`🗄️ Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Cache miss - intercept response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200 && data) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Cache set error:', err);
          });
          console.log(`🗄️ Cache SET: ${cacheKey}`);
        }
        return originalJson.call(this, data);
      };

    } catch (error) {
      console.error('Cache middleware error:', error);
    }
    
    next();
  };
}

// Specific cache middleware for different endpoints
const businessDirectoryCache = cacheMiddleware({
  ttl: 600, // 10 minutes for business directory
  keyGenerator: (req) => {
    const { category, verified } = req.query;
    let key = 'businesses:directory';
    if (category) key += `:category:${category}`;
    if (verified) key += `:verified:${verified}`;
    return key;
  }
});

const dealsCache = cacheMiddleware({
  ttl: 300, // 5 minutes for deals
  keyGenerator: (req) => {
    const { category, businessId, active } = req.query;
    let key = 'deals:list';
    if (category) key += `:category:${category}`;
    if (businessId) key += `:business:${businessId}`;
    if (active) key += `:active:${active}`;
    return key;
  }
});

const userProfileCache = cacheMiddleware({
  ttl: 180, // 3 minutes for user profiles
  keyGenerator: (req) => `user:profile:${req.params.id || req.session?.user?.id}`,
  condition: (req) => req.method === 'GET' && req.session?.user
});

const plansCache = cacheMiddleware({
  ttl: 1800, // 30 minutes for plans (they change less frequently)
  keyGenerator: () => 'plans:all'
});

const systemSettingsCache = cacheMiddleware({
  ttl: 3600, // 1 hour for system settings
  keyGenerator: () => 'system:settings'
});

// Cache invalidation helper
function invalidateCache(patterns = []) {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    function invalidatePatterns() {
      patterns.forEach(async (pattern) => {
        try {
          if (typeof pattern === 'function') {
            pattern = pattern(req);
          }
          await cacheService.delPattern(pattern);
          console.log(`🗄️ Cache INVALIDATED: ${pattern}`);
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      });
    }

    // Override response methods to invalidate cache on successful operations
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidatePatterns();
      }
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidatePatterns();
      }
      return originalSend.call(this, data);
    };

    next();
  };
}

// Specific invalidation middleware
const invalidateBusinessCache = invalidateCache([
  'businesses:*',
  'deals:*' // Deals are related to businesses
]);

const invalidateDealsCache = invalidateCache([
  'deals:*'
]);

const invalidateUserCache = invalidateCache([
  (req) => `user:*:${req.params.id || req.session?.user?.id}`
]);

const invalidateSystemCache = invalidateCache([
  'system:*',
  'plans:*'
]);

module.exports = {
  cacheMiddleware,
  businessDirectoryCache,
  dealsCache,
  userProfileCache,
  plansCache,
  systemSettingsCache,
  invalidateBusinessCache,
  invalidateDealsCache,
  invalidateUserCache,
  invalidateSystemCache
};