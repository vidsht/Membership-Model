/**
 * Emergency Stop Auto-Refresh Script
 * Run this in browser console if page keeps refreshing
 */

console.log('🛑 STOPPING AUTO-REFRESH LOOPS...');

// Clear the refresh triggers
localStorage.removeItem('last_cache_clear');
localStorage.removeItem('membership_cache_version');
sessionStorage.clear();

// Disable service workers temporarily
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('🗑️ Unregistered service worker:', registration.scope);
    });
  });
}

// Clear any pending timeouts/intervals that might cause refresh
var highestTimeoutId = setTimeout(";");
for (var i = 0 ; i < highestTimeoutId ; i++) {
  clearTimeout(i); 
}

var highestIntervalId = setInterval(";");
for (var i = 0 ; i < highestIntervalId ; i++) {
  clearInterval(i); 
}

// Override window.location methods temporarily
var originalReload = window.location.reload;
var originalReplace = window.location.replace;

window.location.reload = function() {
  console.log('🛑 Blocked automatic reload');
  return false;
};

window.location.replace = function() {
  console.log('🛑 Blocked automatic replace');
  return false;
};

console.log('✅ Auto-refresh stopped!');
console.log('💡 To restore normal functionality, refresh the page manually (Ctrl+R)');

// Restore after 30 seconds
setTimeout(() => {
  window.location.reload = originalReload;
  window.location.replace = originalReplace;
  console.log('🔄 Auto-refresh functionality restored');
}, 30000);