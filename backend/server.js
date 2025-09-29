const express = require('express');
// const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const uploadRouter = require('./routes/upload');
const seoMiddleware = require('./middleware/seoMiddleware');
const { setupPerformanceOptimizations, setupPerformanceFlagEndpoint } = require('./middleware/performanceMiddleware');
const rateLimiting = require('./middleware/rateLimiting');
const { businessDirectoryCache, invalidateBusinessCache } = require('./middleware/cacheMiddleware');
const performanceMonitor = require('./services/performanceMonitor');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Setup performance optimizations BEFORE other middleware
setupPerformanceOptimizations(app);

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid issues with dynamic content
  crossOriginEmbedderPolicy: false
}));
app.use(compression()); // Gzip compression

// Performance monitoring middleware
app.use(performanceMonitor.requestTracker());

// Apply general rate limiting to all requests
app.use(rateLimiting.generalLimiter);

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

// Basic middleware
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// SEO Middleware - Apply globally with environment-aware settings
app.use(seoMiddleware.conditional);

// **IMPORTANT: Serve static files BEFORE other routes - MOVE THIS UP**
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d', 
  etag: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
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

// Session configuration (MySQL store) - Optimized for 1000-2000 users
const MySQLStore = require('express-mysql-session')(session);

// Import existing pool from db.js to share connections
const dbPool = require('./db');

// Optimized session store configuration for high concurrency
const sessionStoreOptions = {
  clearExpired: true,
  checkExpirationInterval: 300000, // 5 minutes (reduced for better cleanup)
  expiration: 24 * 60 * 60 * 1000, // 24 hours
  createDatabaseTable: true,
  endConnectionOnClose: false, // Keep connections alive for better performance
  // Optimizations for production scale
  useConnectionPooling: true,
  reconnect: true,
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
  // Optimized cookie settings for production scale
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Cross-site compatibility
  },
  // Performance optimizations
  rolling: false, // Don't reset expiry on every request
  unset: 'destroy' // Clean up session data properly
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

// Basic routes with specific rate limiting
app.use('/api/auth', rateLimiting.authLimiter, seoMiddleware.protected, require('./routes/auth'));
app.use('/api/users', seoMiddleware.protected, require('./routes/users'));

// Mount merchant routes with deal-specific rate limiting
app.use('/api/merchant', rateLimiting.dealLimiter, seoMiddleware.protected, require('./routes/merchant'));

// Public deals route for users with public rate limiting
app.use('/api/deals', rateLimiting.publicLimiter, seoMiddleware.api, require('./routes/deals'));
app.use('/api/plans', rateLimiting.publicLimiter, seoMiddleware.api, require('./routes/plans'));

// Admin routes with admin-specific rate limiting
app.use('/api/admin', rateLimiting.adminLimiter, seoMiddleware.blockAll, require('./routes/admin'));
app.use('/api/admin', rateLimiting.adminLimiter, seoMiddleware.blockAll, require('./routes/roles'));

// Migration routes (for database schema updates) - admin level
app.use('/api/migration', rateLimiting.adminLimiter, seoMiddleware.blockAll, require('./routes/migration'));

// Email admin routes with email-specific rate limiting
const emailAdminRoutes = require('./routes/emailAdmin');
app.use('/api/admin/email', rateLimiting.emailLimiter, seoMiddleware.blockAll, emailAdminRoutes);

// Public admin endpoints that don't require authentication
app.use('/api/admin', rateLimiting.adminLimiter, seoMiddleware.blockAll, require('./routes/admin')); // This ensures public routes work

// Upload routes with upload-specific rate limiting
app.use('/api/upload', rateLimiting.uploadLimiter, seoMiddleware.api, require('./routes/upload'));

// Monitoring and health check routes
app.use('/api/monitoring', require('./routes/monitoring'));

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
// Public businesses endpoint with caching
app.get('/api/businesses', businessDirectoryCache, seoMiddleware.api, async (req, res) => {
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
  console.log(`📁 Static files served from: ${uploadsPath}`); // ADD THIS
  console.log(`🌐 CORS enabled for: https://membership.indiansinghana.com`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
});
