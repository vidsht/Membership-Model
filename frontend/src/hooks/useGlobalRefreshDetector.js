/**
 * Global Force Refresh Detector
 * Auto-initializes when imported
 */

console.log('🔧 Global refresh detector initialized');

// Auto-initialize the global refresh detection (non-interfering)
(function initGlobalRefreshDetector() {
  // Only intercept responses, don't override fetch completely
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      
      // Only check for force refresh headers, don't interfere with normal operation
      if (response && response.headers) {
        const forceRefresh = response.headers.get('X-Force-Refresh');
        const refreshVersion = response.headers.get('X-Force-Refresh-Version');
        
        if (forceRefresh === 'true') {
          console.log('🚨 FORCE REFRESH DETECTED FROM SERVER');
          console.log(`📦 New version: ${refreshVersion}`);
          
          // Show user notification
          showForceRefreshNotification(refreshVersion);
          
          // Auto-refresh after 3 seconds
          setTimeout(() => {
            console.log('🔄 Executing forced global refresh...');
            
            // Clear all caches
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear service worker caches if available
            if ('caches' in window) {
              caches.keys().then(cacheNames => {
                return Promise.all(
                  cacheNames.map(cacheName => caches.delete(cacheName))
                );
              }).then(() => {
                console.log('✅ All caches cleared');
              });
            }
            
            // Force hard refresh
            window.location.reload(true);
          }, 3000);
        }
      }
      
      return response;
    } catch (error) {
      // Don't interfere with error handling, just log
      console.warn('Fetch interceptor error:', error);
      throw error;
    }
  };
})();

function showForceRefreshNotification(version) {
  // Remove any existing notification
  const existing = document.getElementById('force-refresh-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create prominent notification
  const notification = document.createElement('div');
  notification.id = 'force-refresh-notification';
  notification.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #ff4444, #cc0000);
    color: white;
    padding: 20px;
    text-align: center;
    z-index: 99999;
    font-family: 'Inter', Arial, sans-serif;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: slideDown 0.5s ease-out;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
      <span style="font-size: 24px;">🔄</span>
      <div>
        <div style="font-size: 18px; margin-bottom: 5px;">
          SYSTEM UPDATE DETECTED
        </div>
        <div style="font-size: 14px; opacity: 0.9;">
          Version ${version} • Refreshing automatically in 3 seconds...
        </div>
      </div>
    </div>
    <div style="margin-top: 15px;">
      <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
        <div id="refresh-progress" style="width: 0%; height: 100%; background: white; border-radius: 2px; transition: width 3s linear;"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Add CSS animation
  if (!document.getElementById('refresh-animations')) {
    const style = document.createElement('style');
    style.id = 'refresh-animations';
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Start progress bar animation
  setTimeout(() => {
    const progressBar = document.getElementById('refresh-progress');
    if (progressBar) {
      progressBar.style.width = '100%';
    }
  }, 100);
  
  // Remove after refresh
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

export const useGlobalRefreshDetector = () => {
  // Hook version for React components (optional)
  // The detection is already auto-initialized above
  return {
    isActive: true,
    version: '1.0.0'
  };
};