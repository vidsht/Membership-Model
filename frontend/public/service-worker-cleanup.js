/**
 * Service Worker Cleanup Utility
 * Run this in browser console to fix service worker cache errors
 */

(function() {
  console.log('🧹 Starting Service Worker Cleanup...');

  // Function to safely clear all caches
  async function clearAllCaches() {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        console.log('📦 Found caches:', cacheNames);
        
        for (const cacheName of cacheNames) {
          try {
            await caches.delete(cacheName);
            console.log('✅ Deleted cache:', cacheName);
          } catch (error) {
            console.warn('❌ Failed to delete cache:', cacheName, error);
          }
        }
      } catch (error) {
        console.error('❌ Failed to access caches:', error);
      }
    }
  }

  // Function to unregister all service workers
  async function unregisterAllServiceWorkers() {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('🔧 Found service workers:', registrations.length);
        
        for (const registration of registrations) {
          try {
            await registration.unregister();
            console.log('✅ Unregistered service worker:', registration.scope);
          } catch (error) {
            console.warn('❌ Failed to unregister service worker:', error);
          }
        }
      } catch (error) {
        console.error('❌ Failed to get service worker registrations:', error);
      }
    }
  }

  // Function to clear problematic storage
  function clearProblematicStorage() {
    try {
      // Clear localStorage (but keep auth tokens)
      Object.keys(localStorage).forEach(key => {
        if (!key.includes('auth') && !key.includes('token')) {
          localStorage.removeItem(key);
          console.log('🧹 Cleared localStorage:', key);
        }
      });

      // Clear sessionStorage
      sessionStorage.clear();
      console.log('✅ Cleared sessionStorage');

    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
    }
  }

  // Main cleanup function
  async function runCleanup() {
    console.log('🚀 Starting comprehensive cleanup...');
    
    try {
      await clearAllCaches();
      await unregisterAllServiceWorkers();
      clearProblematicStorage();
      
      console.log('🎉 Cleanup completed successfully!');
      console.log('💡 You may need to refresh the page to see changes.');
      
      // Ask user if they want to refresh
      if (confirm('Cleanup completed! Would you like to refresh the page now?')) {
        window.location.reload(true);
      }
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  // Run the cleanup
  runCleanup();

})();