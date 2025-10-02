/**
 * Emergency Cache Clearing Service Worker
 * This immediately clears all caches when loaded
 */

const CACHE_VERSION = '1759421427139';
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

// Intercept all requests and force cache bypass
self.addEventListener('fetch', function(event) {
  // For critical resources, always fetch from network
  if (event.request.url.includes('/src/') || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('.js') ||
      event.request.url.includes('.css')) {
    
    event.respondWith(
      fetch(event.request, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }).catch(function() {
        // If fetch fails, don't serve from cache
        return new Response('Resource not available', { status: 503 });
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