/**
 * Cache Busting Utility for Indians in Ghana Membership System
 * Handles version management and cache invalidation
 */

const fs = require('fs');
const path = require('path');

class CacheBustingManager {
  constructor() {
    this.buildVersion = this.generateBuildVersion();
    this.versionFile = path.join(__dirname, '..', 'build-version.json');
    this.loadOrCreateVersionFile();
  }

  /**
   * Generate a new build version
   */
  generateBuildVersion() {
    const timestamp = Date.now();
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `v${date}.${timestamp}`;
  }

  /**
   * Load existing version file or create new one
   */
  loadOrCreateVersionFile() {
    try {
      if (fs.existsSync(this.versionFile)) {
        const versionData = JSON.parse(fs.readFileSync(this.versionFile, 'utf8'));
        this.buildVersion = versionData.version;
        console.log(`📦 Build version loaded: ${this.buildVersion}`);
      } else {
        this.createVersionFile();
      }
    } catch (error) {
      console.error('Error loading version file:', error);
      this.createVersionFile();
    }
  }

  /**
   * Create new version file
   */
  createVersionFile() {
    const versionData = {
      version: this.buildVersion,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    try {
      fs.writeFileSync(this.versionFile, JSON.stringify(versionData, null, 2));
      console.log(`📦 New build version created: ${this.buildVersion}`);
    } catch (error) {
      console.error('Error creating version file:', error);
    }
  }

  /**
   * Update build version (call this when deploying)
   */
  updateVersion() {
    this.buildVersion = this.generateBuildVersion();
    
    const versionData = {
      version: this.buildVersion,
      created: fs.existsSync(this.versionFile) ? 
        JSON.parse(fs.readFileSync(this.versionFile, 'utf8')).created : 
        new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    try {
      fs.writeFileSync(this.versionFile, JSON.stringify(versionData, null, 2));
      process.env.BUILD_VERSION = this.buildVersion;
      console.log(`📦 Build version updated: ${this.buildVersion}`);
      return this.buildVersion;
    } catch (error) {
      console.error('Error updating version file:', error);
      return null;
    }
  }

  /**
   * Get current build version
   */
  getBuildVersion() {
    return this.buildVersion;
  }

  /**
   * Generate cache-busted URL for assets
   */
  cacheBustUrl(url, type = 'asset') {
    if (!url) return url;
    
    const separator = url.includes('?') ? '&' : '?';
    const param = type === 'api' ? 'av' : 'v'; // av = api version, v = asset version
    
    return `${url}${separator}${param}=${this.buildVersion}`;
  }

  /**
   * Get cache headers for different asset types
   */
  getCacheHeaders(fileType = 'default') {
    const baseHeaders = {
      'X-Build-Version': this.buildVersion,
      'Vary': 'Accept-Encoding'
    };

    switch (fileType) {
      case 'css':
      case 'js':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=3600, must-revalidate',
          'ETag': `"${this.buildVersion}-${fileType}"`
        };

      case 'image':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
          'ETag': `"${this.buildVersion}-img"`
        };

      case 'font':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=2592000, immutable',
          'ETag': `"${this.buildVersion}-font"`
        };

      case 'api':
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
          'X-API-Version': this.buildVersion,
          'ETag': `"api-${this.buildVersion}"`
        };

      case 'no-cache':
        return {
          ...baseHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        };

      default:
        return {
          ...baseHeaders,
          'Cache-Control': 'public, max-age=7200, must-revalidate',
          'ETag': `"${this.buildVersion}-default"`
        };
    }
  }

  /**
   * Express middleware for automatic cache busting
   */
  middleware() {
    return (req, res, next) => {
      // Add cache busting headers based on request type
      const ext = path.extname(req.path).toLowerCase();
      let cacheType = 'default';

      if (['.css', '.js'].includes(ext)) {
        cacheType = ext.substring(1); // Remove the dot
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(ext)) {
        cacheType = 'image';
      } else if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
        cacheType = 'font';
      } else if (req.path.startsWith('/api/')) {
        cacheType = 'api';
      }

      // Apply headers
      const headers = this.getCacheHeaders(cacheType);
      Object.keys(headers).forEach(header => {
        res.setHeader(header, headers[header]);
      });

      next();
    };
  }
}

// Create singleton instance
const cacheBustingManager = new CacheBustingManager();

// Set environment variable
process.env.BUILD_VERSION = cacheBustingManager.getBuildVersion();

module.exports = cacheBustingManager;