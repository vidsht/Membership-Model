/**
 * Emergency Cache Clearing Utility
 * Run this script to immediately clear all caches and fix stagnation
 */

console.log('🚨 EMERGENCY CACHE CLEARING STARTING...');

(async function emergencyCacheClear() {
  try {
    // Step 1: Clear all browser storage
    console.log('🧹 Step 1: Clearing browser storage...');
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Browser storage cleared');

    // Step 2: Clear all service worker caches
    if ('caches' in window) {
      console.log('🧹 Step 2: Clearing service worker caches...');
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} caches:`, cacheNames);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('🗑️ Deleted cache:', cacheName);
      }
      console.log('✅ All service worker caches cleared');
    }

    // Step 3: Unregister all service workers
    if ('serviceWorker' in navigator) {
      console.log('🧹 Step 3: Unregistering service workers...');
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service workers`);
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ Unregistered service worker:', registration.scope);
      }
      console.log('✅ All service workers unregistered');
    }

    // Step 4: Clear any IndexedDB data
    if ('indexedDB' in window) {
      console.log('🧹 Step 4: Clearing IndexedDB...');
      try {
        // This is a more aggressive approach
        const databases = await indexedDB.databases();
        for (const db of databases) {
          indexedDB.deleteDatabase(db.name);
          console.log('🗑️ Deleted IndexedDB:', db.name);
        }
      } catch (error) {
        console.log('⚠️ IndexedDB clearing not fully supported:', error.message);
      }
    }

    // Step 5: Force reload with cache bypass
    console.log('🔄 Step 5: Force reloading with cache bypass...');
    
    // Add timestamp to URL to force fresh load
    const url = new URL(window.location);
    url.searchParams.set('emergency_clear', Date.now());
    url.searchParams.set('cache_bust', 'true');
    url.searchParams.set('v', Date.now());
    
    console.log('🎯 Redirecting to:', url.toString());
    
    // Use location.replace to avoid back button issues
    window.location.replace(url.toString());

  } catch (error) {
    console.error('❌ Emergency cache clear failed:', error);
    console.log('🔄 Falling back to simple reload...');
    
    // Fallback: multiple reload attempts
    window.location.reload(true);
  }
})();

console.log('⏳ Emergency cache clear initiated...');