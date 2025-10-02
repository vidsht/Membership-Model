const express = require('express');
// const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const uploadRouter = require('./routes/upload');
const seoMiddleware = require('./middleware/seoMiddleware');
const { setupPerformanceOptimizations, setupPerformanceFlagEndpoint } = require('./middleware/performanceMiddleware');
const cacheBustingManager = require('./utils/cacheBusting');

const app = express();

// Setup performance optimizations BEFORE other middleware
setupPerformanceOptimizations(app);

// Apply cache busting middleware early in the stack
app.use(cacheBustingManager.middleware());

// CORS configuration for credentials

const corsOptions = {
  origin: [
    'https://membership.indiansinghana.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    // Add your deployed frontend URL here
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], 
  allowedHeaders: ['Content-Type', 'Authorization'] 
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Add aggressive cache control for API responses
app.use('/api', (req, res, next) => {
  // Check if this is localhost/development
  const isLocalhost = req.hostname === 'localhost' || 
                     req.hostname === '127.0.0.1' ||
                     process.env.NODE_ENV === 'development';
  
  if (!isLocalhost) {
    // Force cache invalidation for all API responses (production only)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('X-Cache-Version', cacheBustingManager.getBuildVersion());
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"${cacheBustingManager.getBuildVersion()}-${Date.now()}"`);
    res.setHeader('Vary', 'Accept-Encoding, Cache-Control');
    
    // Additional aggressive headers
    res.setHeader('X-Accel-Expires', '0');
    res.setHeader('X-Cache-Status', 'BYPASS');
    res.setHeader('Clear-Site-Data', '"cache", "storage"');
  } else {
    // Development mode - normal caching
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Cache-Version', cacheBustingManager.getBuildVersion());
    console.log('🏠 Localhost detected - using normal cache headers');
  }
  
  next();
});

// Also add cache control for static files serving
app.use((req, res, next) => {
  // Check if this is localhost/development
  const isLocalhost = req.hostname === 'localhost' || 
                     req.hostname === '127.0.0.1' ||
                     process.env.NODE_ENV === 'development';
  
  if (!isLocalhost) {
    // For HTML files, prevent all caching (production only)
    if (req.path.endsWith('.html') || req.path === '/' || req.path.endsWith('/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Cache-Version', cacheBustingManager.getBuildVersion());
      res.setHeader('Clear-Site-Data', '"cache"');
    }
    
    // For JS/CSS files, use version-based caching (production only)
    if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
      if (req.query.cache_bust || req.query.v) {
        // Cache busted files can be cached longer
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Non-cache-busted files should not be cached
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      res.setHeader('X-Cache-Version', cacheBustingManager.getBuildVersion());
    }
  }
  
  next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SEO Middleware - Apply globally with environment-aware settings
app.use(seoMiddleware.conditional);

// **IMPORTANT: Serve static files BEFORE other routes - MOVE THIS UP**
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');

// Enhanced cache control for different file types
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '7d', // Cache for 7 days for uploaded files
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Enhanced cache busting headers
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.css', '.js'].includes(ext)) {
      // For CSS/JS files, force revalidation
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
      res.setHeader('Vary', 'Accept-Encoding');
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(ext)) {
      // For images, longer cache but with version checking
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    } else if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
      // For fonts, very long cache
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    } else {
      // Default cache for other files
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
    
    // Add build version for cache busting
    res.setHeader('X-Build-Version', process.env.BUILD_VERSION || Date.now().toString());
  }
}));

app.use('/uploads/*', (req, res, next) => {
  console.log(`🖼️  Static file request: ${req.path}`);
  const fullPath = path.join(uploadsPath, req.path.replace('/uploads/', ''));
  console.log(`📁 Looking for file at: ${fullPath}`);
  console.log(`📋 File exists: ${require('fs').existsSync(fullPath)}`);
  next();
});

// Trust first proxy (Render / Cloudflare) so secure cookies are set correctly when behind a proxy
app.set('trust proxy', 1);

// Session configuration (MySQL store)
const MySQLStore = require('express-mysql-session')(session);

// Import existing pool from db.js to share connections
const dbPool = require('./db');

// Create session store using the existing pool for better connection handling
const sessionStoreOptions = {
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 minutes
  expiration: 86400000, // 1 day
  createDatabaseTable: true,
  // Use the pool's promise-based connections
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

const sessionStore = new MySQLStore(sessionStoreOptions, dbPool.promise ? dbPool.promise() : dbPool);

// Add error handling for session store
sessionStore.onReady = function() {
  console.log('✅ MySQL session store ready');
};

sessionStore.on('error', function(error) {
  console.error('❌ MySQL session store error:', error);
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  store: sessionStore,
  cookie: {
    // secure: false,
    secure: true,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    // sameSite: 'lax'
    sameSite: 'none'
  }
}));

// MySQL connection (handled in db.js)
require('./db');

// Initialize Email System
console.log('📧 Initializing email notification system...');
const ScheduledTasks = require('./services/scheduledTasks-integrated');
ScheduledTasks.initialize();
ScheduledTasks.startAllTasks();
console.log('✅ Email system initialized and scheduled tasks started');

// Import database connection for public routes
const db = require('./db');
const { promisify } = require('util');
const queryAsync = promisify(db.query).bind(db);

// Basic routes
app.use('/api/auth', seoMiddleware.protected, require('./routes/auth'));
app.use('/api/users', seoMiddleware.protected, require('./routes/users'));

// Mount merchant routes
app.use('/api/merchant', seoMiddleware.protected, require('./routes/merchant'));

// Public deals route for users
app.use('/api/deals', seoMiddleware.api, require('./routes/deals'));
app.use('/api/plans', seoMiddleware.api, require('./routes/plans'));

// Admin routes
app.use('/api/admin', seoMiddleware.blockAll, require('./routes/admin'));
app.use('/api/admin', seoMiddleware.blockAll, require('./routes/roles'));

// Migration routes (for database schema updates)
app.use('/api/migration', seoMiddleware.blockAll, require('./routes/migration'));

// Email admin routes
const emailAdminRoutes = require('./routes/emailAdmin');
app.use('/api/admin/email', seoMiddleware.blockAll, emailAdminRoutes);

// Public admin endpoints that don't require authentication
app.use('/api/admin', seoMiddleware.blockAll, require('./routes/admin')); // This ensures public routes work

// Upload routes
app.use('/api/upload', seoMiddleware.api, require('./routes/upload'));

// Performance flag management endpoint
setupPerformanceFlagEndpoint(app);


// Health check
app.get('/api/health', seoMiddleware.api, (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uploadsPath: uploadsPath 
  });
});

// Public businesses endpoint for home page
app.get('/api/businesses', seoMiddleware.api, async (req, res) => {
  try {
    const businesses = await queryAsync(`
      SELECT
        b.businessId,
        b.businessName,
        b.businessDescription,
        b.businessCategory,
        b.businessAddress,
        b.businessPhone,
        b.businessEmail,
        b.website,
        b.isVerified,
        u.profilePhoto as logo,           -- Use user.profilePhoto as logo
        u.profilePicture as logoUrl,      -- Use user.profilePicture as alternative
        u.fullName as ownerName,
        u.membershipType as membershipLevel
      FROM businesses b
      LEFT JOIN users u ON b.userId = u.id
      WHERE u.status = 'approved'
      ORDER BY b.businessName ASC
    `);

    // Map fields for frontend compatiblity
    const formattedBusinesses = businesses.map(business => {
      let merchantLogo = business.logo || business.logoUrl || null;

      return {
        id: business.businessId,
        name: business.businessName,
        businessName: business.businessName,
        description: business.businessDescription,
        sector: business.businessCategory || 'General',
        category: business.businessCategory || 'General',
        address: business.businessAddress,
        phone: business.businessPhone,
        email: business.businessEmail,
        website: business.website,
        isVerified: business.isVerified,
        membershipLevel: business.membershipLevel,
        ownerName: business.ownerName,
        merchantLogo: merchantLogo,
        logoUrl: merchantLogo,
        logo: merchantLogo
      };
    });

    console.log('📊 Businesses with logos:', formattedBusinesses.map(b => ({
      name: b.name,
      hasLogo: !!b.merchantLogo,
      logo: b.merchantLogo || 'No logo'
    })));

    res.json(formattedBusinesses);
  } catch (err) {
    console.error('Error fetching public businesses:', err);
    res.status(500).json({ success: false, message: 'Server error fetching businesses' });
  }
});

// Cache busting management endpoint
app.post('/api/admin/update-cache-version', (req, res) => {
  try {
    const newVersion = cacheBustingManager.updateVersion();
    console.log(`🔄 Cache version updated to: ${newVersion}`);
    res.json({ 
      success: true, 
      message: 'Cache version updated successfully',
      version: newVersion 
    });
  } catch (error) {
    console.error('Error updating cache version:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update cache version',
      error: error.message 
    });
  }
});

// Get current cache version endpoint
app.get('/api/cache-version', (req, res) => {
  res.json({ 
    version: cacheBustingManager.getBuildVersion(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Static files served from: ${uploadsPath}`);
  console.log(`🌐 CORS enabled for: https://membership.indiansinghana.com`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
  console.log(`📦 Cache busting version: ${cacheBustingManager.getBuildVersion()}`);
  console.log(`🔄 Cache management endpoint: POST /api/admin/update-cache-version`);
});
