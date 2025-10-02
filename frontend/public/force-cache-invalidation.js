/**
 * Comprehensive Cache Invalidation Script
 * Run this to immediately fix cache issues for all users
 */

console.log('🔧 Starting Comprehensive Cache Invalidation...');

// Function to force cache invalidation immediately
(async function forceGlobalCacheInvalidation() {
  console.log('🚀 Initiating emergency cache clearing...');

  try {
    // Step 1: Clear all browser caches
    console.log('📦 Clearing browser caches...');
    
    // Clear localStorage (preserve auth tokens)
    Object.keys(localStorage).forEach(key => {
      if (!key.includes('auth_token') && !key.includes('session')) {
        localStorage.removeItem(key);
        console.log('🧹 Cleared localStorage:', key);
      }
    });

    // Clear sessionStorage completely
    sessionStorage.clear();
    console.log('✅ Cleared sessionStorage');

    // Step 2: Clear all service worker caches
    if ('caches' in window) {
      console.log('🔧 Clearing service worker caches...');
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('✅ Deleted cache:', cacheName);
      }
    }

    // Step 3: Unregister all service workers
    if ('serviceWorker' in navigator) {
      console.log('🔧 Unregistering service workers...');
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ Unregistered service worker:', registration.scope);
      }
    }

    // Step 4: Clear HTTP cache by forcing reload
    console.log('🔄 Forcing HTTP cache reload...');
    
    // Create invisible iframe to force cache reload
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = window.location.href + '?cache_bust=' + Date.now();
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 3000);

    // Step 5: Force reload with cache bypass
    console.log('🎯 Cache invalidation complete. Reloading page...');
    
    // Add special parameter to force server cache bypass
    const url = new URL(window.location);
    url.searchParams.set('force_refresh', Date.now());
    url.searchParams.set('cache_bust', 'true');
    
    // Use replace to avoid adding to history
    window.location.replace(url.toString());

  } catch (error) {
    console.error('❌ Cache invalidation error:', error);
    
    // Fallback: Simple force reload
    console.log('🔄 Falling back to force reload...');
    window.location.reload(true);
  }
})();