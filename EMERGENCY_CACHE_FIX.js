/**
 * IMMEDIATE CACHE FIX SCRIPT
 * 
 * For users experiencing cache issues:
 * 1. Open browser console (F12 → Console)
 * 2. Copy and paste this entire script
 * 3. Press Enter
 * 
 * This will completely clear all caches and force reload the latest version
 */

console.log('🚨 EMERGENCY CACHE FIX STARTING...');

(async function emergencyCacheFix() {
  try {
    console.log('🧹 Step 1: Clearing all browser caches...');
    
    // Clear localStorage completely
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // Clear sessionStorage completely  
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Clear all service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('📦 Found', cacheNames.length, 'caches to delete');
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('🗑️ Deleted cache:', cacheName);
      }
      console.log('✅ All service worker caches cleared');
    }
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('🔧 Found', registrations.length, 'service workers to unregister');
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ Unregistered service worker:', registration.scope);
      }
      console.log('✅ All service workers unregistered');
    }
    
    console.log('🔄 Step 2: Forcing cache-bypassed reload...');
    
    // Create a completely new URL with aggressive cache busting
    const url = new URL(window.location);
    const timestamp = Date.now();
    
    // Clear existing parameters
    url.search = '';
    
    // Add aggressive cache busting parameters
    url.searchParams.set('emergency_cache_clear', timestamp);
    url.searchParams.set('cache_bust', 'true');
    url.searchParams.set('v', timestamp);
    url.searchParams.set('force_reload', 'true');
    url.searchParams.set('nocache', timestamp);
    
    console.log('🎯 Redirecting to cache-busted URL:', url.toString());
    
    // Use location.replace to avoid back button issues
    window.location.replace(url.toString());
    
  } catch (error) {
    console.error('❌ Emergency cache fix failed:', error);
    console.log('🔄 Falling back to simple force reload...');
    
    // Fallback: Multiple reload attempts
    setTimeout(() => window.location.reload(true), 100);
    setTimeout(() => window.location.reload(true), 500);
    setTimeout(() => window.location.reload(true), 1000);
  }
})();

console.log('⏳ Emergency cache fix initiated. Page will reload in a moment...');