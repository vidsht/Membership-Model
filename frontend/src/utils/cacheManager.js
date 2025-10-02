/**
 * Frontend Cache Busting Utilities
 * Handles client-side cache management for the membership system
 */

class FrontendCacheManager {
  constructor() {
    this.cacheVersion = null;
    this.lastVersionCheck = 0;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.localStorageKey = 'membership_cache_version';
    this.init();
  }

  /**
   * Initialize cache manager
   */
  async init() {
    await this.loadStoredVersion();
    await this.checkForUpdates();
    this.startPeriodicChecks();
  }

  /**
   * Load version from localStorage
   */
  loadStoredVersion() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.cacheVersion = data.version;
        this.lastVersionCheck = data.timestamp || 0;
      }
    } catch (error) {
      console.warn('Failed to load stored cache version:', error);
    }
  }

  /**
   * Store version to localStorage
   */
  storeVersion(version) {
    try {
      const data = {
        version,
        timestamp: Date.now()
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(data));
      this.cacheVersion = version;
    } catch (error) {
      console.warn('Failed to store cache version:', error);
    }
  }

  /**
   * Check for cache version updates from server
   */
  async checkForUpdates(force = false) {
    const now = Date.now();
    
    if (!force && (now - this.lastVersionCheck) < this.checkInterval) {
      return false; // Not time to check yet
    }

    try {
      const response = await fetch('/api/cache-version', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const serverVersion = data.version;
        
        this.lastVersionCheck = now;

        if (this.cacheVersion && this.cacheVersion !== serverVersion) {
          console.log(`🔄 Cache version mismatch. Local: ${this.cacheVersion}, Server: ${serverVersion}`);
          this.handleVersionChange(serverVersion);
          return true;
        } else if (!this.cacheVersion) {
          this.storeVersion(serverVersion);
          console.log(`📦 Initial cache version set: ${serverVersion}`);
          return false;
        }
      }
    } catch (error) {
      console.warn('Failed to check cache version:', error);
    }

    return false;
  }

  /**
   * Handle version change (usually requires page refresh)
   */
  handleVersionChange(newVersion) {
    this.storeVersion(newVersion);
    
    // Show user notification about updates
    this.showUpdateNotification();
    
    // Clear various caches
    this.clearBrowserCaches();
  }

  /**
   * Show update notification to user
   */
  showUpdateNotification() {
    // Check if we should show notification
    if (this.shouldShowNotification()) {
      const notification = this.createUpdateNotification();
      document.body.appendChild(notification);
    }
  }

  /**
   * Check if we should show the update notification
   */
  shouldShowNotification() {
    // Don't show on login/register pages
    const path = window.location.pathname;
    if (path.includes('login') || path.includes('register')) {
      return false;
    }

    // Don't show if already shown recently
    const lastShown = localStorage.getItem('last_update_notification');
    if (lastShown && (Date.now() - parseInt(lastShown)) < 30000) { // 30 seconds
      return false;
    }

    return true;
  }

  /**
   * Create update notification element
   */
  createUpdateNotification() {
    const notification = document.createElement('div');
    notification.id = 'cache-update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0066cc;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 14px;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <strong>🔄 Updates Available</strong>
          <div style="margin-top: 5px; font-size: 13px; opacity: 0.9;">
            New features and improvements are ready!
          </div>
        </div>
        <button id="refresh-page-btn" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 15px;
        ">Refresh</button>
      </div>
      <div style="margin-top: 10px; font-size: 12px; opacity: 0.8;">
        Click refresh to load the latest version
      </div>
    `;

    // Add click handlers
    notification.querySelector('#refresh-page-btn').addEventListener('click', () => {
      this.refreshPage();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);

    // Track that we showed this notification
    localStorage.setItem('last_update_notification', Date.now().toString());

    return notification;
  }

  /**
   * Clear browser caches
   */
  clearBrowserCaches() {
    try {
      // Clear localStorage items related to our app (but keep auth)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('membership_') && key !== 'membership_auth_token') {
          localStorage.removeItem(key);
        }
      });

      // Clear sessionStorage
      sessionStorage.clear();

      // If Service Worker is available, clear its cache
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        });
      }

      console.log('✅ Browser caches cleared');
    } catch (error) {
      console.warn('Failed to clear some caches:', error);
    }
  }

  /**
   * Force page refresh with cache clearing
   */
  refreshPage() {
    // Clear caches first
    this.clearBrowserCaches();
    
    // Force reload with cache bypass
    window.location.reload(true);
  }

  /**
   * Start periodic version checks
   */
  startPeriodicChecks() {
    setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);

    // Also check when page becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
  }

  /**
   * Add cache busting to URLs
   */
  bustUrl(url) {
    if (!url || !this.cacheVersion) return url;
    
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${this.cacheVersion}&t=${Date.now()}`;
  }

  /**
   * Manually force a version check
   */
  async forceCheck() {
    return await this.checkForUpdates(true);
  }

  /**
   * Get current cache version
   */
  getVersion() {
    return this.cacheVersion;
  }
}

// Create and expose global instance
window.cacheManager = new FrontendCacheManager();

// Add CSS animation for notification
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

console.log('🔧 Frontend cache manager initialized');

export default window.cacheManager;