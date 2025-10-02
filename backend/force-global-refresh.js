/**
 * Force Global Refresh Endpoint
 * Add this to your backend server.js
 */

// Global refresh trigger endpoint
app.post('/api/admin/force-global-refresh', (req, res) => {
  try {
    // Update cache version to force refresh
    const newVersion = cacheBustingManager.updateVersion();
    
    // Set a global refresh flag in database/memory
    global.forceRefreshFlag = {
      timestamp: Date.now(),
      version: newVersion,
      active: true
    };
    
    console.log(`🔄 GLOBAL REFRESH TRIGGERED by admin - Version: ${newVersion}`);
    
    res.json({
      success: true,
      message: 'Global refresh triggered for all users',
      version: newVersion,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to trigger global refresh:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger global refresh',
      error: error.message
    });
  }
});

// Middleware to check for global refresh flag
app.use((req, res, next) => {
  if (global.forceRefreshFlag && global.forceRefreshFlag.active) {
    // Add special header to force refresh
    res.setHeader('X-Force-Refresh', 'true');
    res.setHeader('X-Force-Refresh-Version', global.forceRefreshFlag.version);
    res.setHeader('X-Force-Refresh-Timestamp', global.forceRefreshFlag.timestamp);
  }
  next();
});