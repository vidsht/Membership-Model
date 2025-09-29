/**
 * Caching Service for Performance Optimization
 * Supports both Redis (production) and in-memory (development) caching
 */

const NodeCache = require('node-cache');
let redisClient = null;

// Try to initialize Redis if available
try {
  const redis = require('redis');
  
  // Only initialize Redis in production or if explicitly configured
  if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.log('Redis connection refused, falling back to in-memory cache');
          return undefined; // Don't retry
        }
        if (options.times_connected > 10) {
          return undefined; // Don't retry after 10 attempts
        }
        return Math.min(options.attempt * 100, 3000); // Retry with exponential backoff
      }
    });

    redisClient.on('error', (err) => {
      console.log('Redis Client Error:', err);
      redisClient = null; // Fall back to in-memory cache
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis cache connected');
    });

  }
} catch (error) {
  console.log('Redis not available, using in-memory cache');
}

// Fallback to in-memory cache
const memoryCache = new NodeCache({
  stdTTL: 300, // Default 5 minutes TTL
  checkperiod: 60, // Check for expired keys every minute
  useClones: false // Don't clone objects for better performance
});

class CacheService {
  constructor() {
    this.isRedisAvailable = !!redisClient;
    console.log(`🗄️ Cache service initialized with ${this.isRedisAvailable ? 'Redis' : 'in-memory'} backend`);
  }

  async get(key) {
    try {
      if (this.isRedisAvailable && redisClient?.isOpen) {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return memoryCache.get(key) || null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    try {
      if (this.isRedisAvailable && redisClient?.isOpen) {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
      } else {
        memoryCache.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (this.isRedisAvailable && redisClient?.isOpen) {
        await redisClient.del(key);
      } else {
        memoryCache.del(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async flush() {
    try {
      if (this.isRedisAvailable && redisClient?.isOpen) {
        await redisClient.flushAll();
      } else {
        memoryCache.flushAll();
      }
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Clear cache by pattern (only works with in-memory cache)
  async delPattern(pattern) {
    try {
      if (this.isRedisAvailable && redisClient?.isOpen) {
        // Redis pattern deletion would require additional logic
        console.log('Pattern deletion not implemented for Redis');
      } else {
        const keys = memoryCache.keys();
        const regex = new RegExp(pattern);
        keys.forEach(key => {
          if (regex.test(key)) {
            memoryCache.del(key);
          }
        });
      }
      return true;
    } catch (error) {
      console.error('Cache pattern delete error:', error);
      return false;
    }
  }

  // Get cache statistics
  getStats() {
    if (this.isRedisAvailable && redisClient?.isOpen) {
      return { backend: 'redis', connected: redisClient.isOpen };
    } else {
      const stats = memoryCache.getStats();
      return { 
        backend: 'memory',
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hitrate: stats.hits / (stats.hits + stats.misses) || 0
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Cache key generators for different data types
const CacheKeys = {
  // Business directory cache
  businesses: {
    all: () => 'businesses:all',
    verified: () => 'businesses:verified',
    byCategory: (category) => `businesses:category:${category}`,
    byUser: (userId) => `businesses:user:${userId}`,
    byId: (id) => `business:${id}`
  },
  
  // Deals cache
  deals: {
    all: () => 'deals:all',
    active: () => 'deals:active',
    byCategory: (category) => `deals:category:${category}`,
    byBusiness: (businessId) => `deals:business:${businessId}`,
    featured: () => 'deals:featured',
    byId: (id) => `deal:${id}`,
    public: () => 'deals:public'
  },
  
  // User cache
  users: {
    byId: (id) => `user:${id}`,
    byEmail: (email) => `user:email:${email}`,
    stats: () => 'users:stats'
  },
  
  // Plans cache
  plans: {
    all: () => 'plans:all',
    active: () => 'plans:active',
    byId: (id) => `plan:${id}`
  },
  
  // System cache
  system: {
    settings: () => 'system:settings',
    stats: () => 'system:stats'
  }
};

// Cache helper functions
const CacheHelpers = {
  // Cache with automatic invalidation
  async getOrSet(key, fetchFunction, ttl = 300) {
    let data = await cacheService.get(key);
    if (!data) {
      data = await fetchFunction();
      if (data) {
        await cacheService.set(key, data, ttl);
      }
    }
    return data;
  },

  // Invalidate related caches when data changes
  async invalidateBusinessCaches(businessId = null) {
    await cacheService.del(CacheKeys.businesses.all());
    await cacheService.del(CacheKeys.businesses.verified());
    await cacheService.delPattern('businesses:category:*');
    
    if (businessId) {
      await cacheService.del(CacheKeys.businesses.byId(businessId));
      await cacheService.delPattern(`deals:business:${businessId}`);
    }
  },

  async invalidateDealCaches(dealId = null, businessId = null) {
    await cacheService.del(CacheKeys.deals.all());
    await cacheService.del(CacheKeys.deals.active());
    await cacheService.del(CacheKeys.deals.featured());
    await cacheService.del(CacheKeys.deals.public());
    await cacheService.delPattern('deals:category:*');
    
    if (dealId) {
      await cacheService.del(CacheKeys.deals.byId(dealId));
    }
    
    if (businessId) {
      await cacheService.del(CacheKeys.deals.byBusiness(businessId));
    }
  },

  async invalidateUserCaches(userId = null) {
    await cacheService.del(CacheKeys.users.stats());
    
    if (userId) {
      await cacheService.del(CacheKeys.users.byId(userId));
    }
  }
};

module.exports = {
  cacheService,
  CacheKeys,
  CacheHelpers
};