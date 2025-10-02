#!/usr/bin/env node

/**
 * Deployment Cache Busting Script
 * Updates cache version after successful deployment
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class DeploymentCacheBuster {
  constructor() {
    this.baseUrl = process.env.BACKEND_URL || 'https://membership.indiansinghana.com';
    this.localMode = process.argv.includes('--local');
    
    if (this.localMode) {
      this.baseUrl = 'http://localhost:5000';
    }
  }

  /**
   * Update cache version on server
   */
  async updateServerCacheVersion() {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/api/admin/update-cache-version`;
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : require('http');
      
      const postData = JSON.stringify({});
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Deployment-Cache-Buster/1.0'
        }
      };

      console.log(`🔄 Updating cache version at: ${url}`);

      const req = client.request(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (res.statusCode === 200 && result.success) {
              console.log(`✅ Cache version updated: ${result.version}`);
              resolve(result);
            } else {
              console.error(`❌ Server responded with error: ${result.message || data}`);
              reject(new Error(result.message || `HTTP ${res.statusCode}`));
            }
          } catch (error) {
            console.error(`❌ Failed to parse response: ${data}`);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error(`❌ Request failed: ${error.message}`);
        reject(error);
      });

      req.on('timeout', () => {
        console.error('❌ Request timed out');
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(10000); // 10 second timeout
      req.write(postData);
      req.end();
    });
  }

  /**
   * Update frontend build version
   */
  updateFrontendVersion() {
    const versionFile = path.join(__dirname, '..', 'frontend', 'public', 'version.json');
    const buildVersion = `v${Date.now()}`;
    
    const versionData = {
      version: buildVersion,
      buildTime: new Date().toISOString(),
      deployment: true
    };

    try {
      // Ensure directory exists
      const dir = path.dirname(versionFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
      console.log(`📦 Frontend version file updated: ${buildVersion}`);
      return buildVersion;
    } catch (error) {
      console.error('❌ Failed to update frontend version:', error);
      throw error;
    }
  }

  /**
   * Generate deployment report
   */
  generateDeploymentReport(serverResult, frontendVersion) {
    const report = {
      timestamp: new Date().toISOString(),
      success: true,
      versions: {
        server: serverResult?.version || 'unknown',
        frontend: frontendVersion
      },
      environment: this.localMode ? 'local' : 'production',
      baseUrl: this.baseUrl
    };

    const reportFile = path.join(__dirname, '..', 'deployment-cache-report.json');
    
    try {
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      console.log(`📋 Deployment report saved: ${reportFile}`);
    } catch (error) {
      console.warn('⚠️  Failed to save deployment report:', error);
    }

    return report;
  }

  /**
   * Main deployment cache busting process
   */
  async run() {
    console.log('🚀 Starting deployment cache busting...');
    console.log(`📍 Target: ${this.baseUrl}`);
    console.log(`🔧 Mode: ${this.localMode ? 'Local' : 'Production'}`);
    
    try {
      // Update frontend version
      const frontendVersion = this.updateFrontendVersion();
      
      // Update server cache version
      const serverResult = await this.updateServerCacheVersion();
      
      // Generate report
      const report = this.generateDeploymentReport(serverResult, frontendVersion);
      
      console.log('\n✅ Deployment cache busting completed successfully!');
      console.log(`🎯 Server version: ${serverResult.version}`);
      console.log(`🎯 Frontend version: ${frontendVersion}`);
      
      return report;
      
    } catch (error) {
      console.error('\n❌ Deployment cache busting failed:');
      console.error(error.message);
      
      // Still try to update frontend version
      try {
        const frontendVersion = this.updateFrontendVersion();
        console.log(`📦 Frontend version updated despite server error: ${frontendVersion}`);
      } catch (frontendError) {
        console.error('❌ Frontend version update also failed:', frontendError);
      }
      
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const buster = new DeploymentCacheBuster();
  
  // Handle command line arguments
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Deployment Cache Busting Script

Usage: node deployment-cache-bust.js [options]

Options:
  --local    Run against local server (http://localhost:5000)
  --help     Show this help message

Environment Variables:
  BACKEND_URL    Backend server URL (default: https://membership.indiansinghana.com)

Examples:
  node deployment-cache-bust.js                    # Production deployment
  node deployment-cache-bust.js --local            # Local testing
`);
    process.exit(0);
  }
  
  buster.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = DeploymentCacheBuster;