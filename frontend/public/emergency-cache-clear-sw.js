/**
 * Emergency Cache Clearing Service Worker
 * This immediately clears all caches when loaded
 */

const CACHE_VERSION = '1759422496557';
const CACHE_NAME = `membership-cache-${CACHE_VERSION}`;

console.log('🧹 Emergency cache clearing service worker activated');

// Immediately clear all existing caches
self.addEventListener('install', function(event) {
  console.log('🔧 Service worker installing, clearing all caches...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('🗑️ Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('✅ All caches cleared by service worker');
      return self.skipWaiting();
    })
  );
});

// Take control immediately
self.addEventListener('activate', function(event) {
  console.log('⚡ Service worker activated, taking control...');
  
  event.waitUntil(
    self.clients.claim().then(function() {
      console.log('✅ Service worker now controlling all clients');
      
      // Notify all clients to refresh
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({
          type: 'CACHE_CLEARED',
          version: CACHE_VERSION
        });
      });
    })
  );
});

// Intercept only problematic requests, let normal API calls through
self.addEventListener('fetch', function(event) {
  // Only intercept specific problematic resources, not all API calls
  const url = event.request.url;
  
  // Don't intercept API calls - let them go through normally
  if (url.includes('/api/')) {
    return; // Let the request proceed normally
  }
  
  // Only intercept static assets that might be cached incorrectly
  if (url.includes('/src/') || 
      (url.includes('.js') && !url.includes('/api/')) ||
      (url.includes('.css') && !url.includes('/api/'))) {
    
    event.respondWith(
      fetch(event.request, {
        cache: 'no-cache'
      }).catch(function() {
        // Don't return 503, just let it fail naturally
        return fetch(event.request);
      })
    );
  }
});

// Listen for messages from main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🧹 Received cache clear request from main thread');
    
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      event.ports[0].postMessage({success: true});
    });
  }
});