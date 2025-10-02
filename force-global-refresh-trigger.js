#!/usr/bin/env node

/**
 * Developer Tool: Force Global Refresh
 * Run this script to force refresh all users
 */

const https = require('https');
const http = require('http');

class GlobalRefreshTrigger {
  constructor() {
    this.backendUrl = process.env.BACKEND_URL || 'https://membership-model.onrender.com';
    this.isLocal = this.backendUrl.includes('localhost');
  }

  async triggerGlobalRefresh() {
    console.log('🚀 TRIGGERING GLOBAL REFRESH FOR ALL USERS...');
    console.log(`📍 Target: ${this.backendUrl}`);
    
    try {
      const result = await this.makeRequest('/api/admin/force-global-refresh', 'POST');
      
      if (result.success) {
        console.log('✅ SUCCESS: Global refresh triggered!');
        console.log(`📦 New version: ${result.version}`);
        console.log(`⏰ Timestamp: ${result.timestamp}`);
        console.log('');
        console.log('🎯 What happens now:');
        console.log('   1. All users will get refresh notification on next API call');
        console.log('   2. Pages will auto-refresh after 3 seconds');
        console.log('   3. Users will get the latest version automatically');
        console.log('');
        console.log('💡 You can also manually bust cache with:');
        console.log('   npm run cache-bust-local  (for local)');
        console.log('   npm run cache-bust        (for production)');
      } else {
        console.error('❌ FAILED:', result.message);
      }
      
    } catch (error) {
      console.error('❌ ERROR triggering global refresh:', error.message);
      
      // Fallback: Try cache busting
      console.log('');
      console.log('🔄 Trying fallback cache busting...');
      await this.fallbackCacheBust();
    }
  }

  async fallbackCacheBust() {
    try {
      const result = await this.makeRequest('/api/admin/update-cache-version', 'POST');
      
      if (result.success) {
        console.log('✅ Fallback cache bust successful!');
        console.log(`📦 New cache version: ${result.version}`);
      } else {
        console.error('❌ Fallback also failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Fallback cache bust failed:', error.message);
    }
  }

  makeRequest(path, method = 'GET', data = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.backendUrl}${path}`;
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const postData = method === 'POST' ? JSON.stringify(data) : null;
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Developer-Global-Refresh-Tool/1.0'
        }
      };
      
      if (postData) {
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }
      
      const req = client.request(url, options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(10000); // 10 second timeout
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }
}

// CLI Usage
if (require.main === module) {
  const trigger = new GlobalRefreshTrigger();
  
  // Handle command line arguments
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Global Refresh Trigger Tool

Usage: node force-global-refresh-trigger.js [options]

Options:
  --help     Show this help message

Environment Variables:
  BACKEND_URL    Backend server URL (default: http://localhost:5001)

Examples:
  node force-global-refresh-trigger.js                           # Local server
  BACKEND_URL=https://membership-model.onrender.com node force-global-refresh-trigger.js  # Production

This tool will:
1. Trigger a global refresh for all active users
2. Update cache version automatically  
3. Force users to get the latest application version
`);
    process.exit(0);
  }
  
  trigger.triggerGlobalRefresh().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = GlobalRefreshTrigger;