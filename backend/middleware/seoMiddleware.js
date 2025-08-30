/**
 * SEO Middleware for Express.js
 * Handles X-Robots-Tag headers for comprehensive crawling control
 */

const seoMiddleware = {
  // Allow all crawlers - for public pages
  allowAll: (req, res, next) => {
    res.set('X-Robots-Tag', 'index, follow, snippet, archive');
    next();
  },

  // Block all crawlers - for private/admin pages
  blockAll: (req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive, noimageindex');
    next();
  },

  // Allow indexing but no following - for landing pages
  indexOnly: (req, res, next) => {
    res.set('X-Robots-Tag', 'index, nofollow, snippet');
    next();
  },

  // Allow following but no indexing - for navigation pages
  followOnly: (req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, follow, nosnippet');
    next();
  },

  // Environment-specific middleware
  production: (req, res, next) => {
    // Allow crawling in production
    res.set('X-Robots-Tag', 'index, follow, snippet, archive');
    next();
  },

  staging: (req, res, next) => {
    // Block crawling in staging/development
    res.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
    next();
  },

  // Conditional middleware based on environment
  conditional: (req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const robotsTag = isProduction 
      ? 'index, follow, snippet, archive'
      : 'noindex, nofollow, nosnippet, noarchive';
    
    res.set('X-Robots-Tag', robotsTag);
    next();
  },

  // API-specific middleware - typically no indexing needed
  api: (req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive, noimageindex');
    next();
  },

  // Auth-required pages
  protected: (req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
    next();
  }
};

module.exports = seoMiddleware;
