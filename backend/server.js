const express = require('express');
// const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const uploadRouter = require('./routes/upload');

const app = express();

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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization'] 
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// **IMPORTANT: Serve static files BEFORE other routes - MOVE THIS UP**
const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d', // ADD THESE OPTIONS
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

// Import database connection for public routes
const db = require('./db');
// const { promisify } = require('util');
// const queryAsync = promisify(db.query).bind(db);

// Basic routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Mount merchant routes
app.use('/api/merchant', require('./routes/merchant'));

// Public deals route for users
app.use('/api/deals', require('./routes/deals'));
app.use('/api/plans', require('./routes/plans'));

// Admin routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin', require('./routes/roles'));

// Upload routes
app.use('/api/upload', require('./routes/upload'));


// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uploadsPath: uploadsPath 
  });
});

// Public businesses endpoint for home page
// Public businesses endpoint for home page
app.get('/api/businesses', async (req, res) => {
  try {
    console.log('🔍 Attempting to fetch businesses...');
    
    // CORRECTED: Removed u.business since it doesn't exist in users table
    const [businesses] = await db.promise().execute(`
      SELECT b.businessId, b.businessName, b.businessDescription, b.businessCategory,
      b.businessAddress, b.businessPhone, b.businessEmail, b.website,
      b.isVerified, b.logo, b.logoUrl,
      u.fullName as ownerName, u.membershipType as membershipLevel
      FROM businesses b
      LEFT JOIN users u ON b.userId = u.id
      WHERE (b.status = 'active' OR b.status = '') AND u.status = 'approved'
      ORDER BY b.businessName ASC
    `);

    console.log('✅ Businesses fetched successfully:', businesses.length);

    // Format the data for frontend consumption
    const formattedBusinesses = businesses.map(business => {
      let merchantLogo = null;
      
      // Try multiple sources for merchant logo - both columns exist in businesses table
      if (business.logo) {
        merchantLogo = business.logo;
      } else if (business.logoUrl) {
        merchantLogo = business.logoUrl;
      }

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

    res.json(formattedBusinesses);
  } catch (err) {
    console.error('❌ Error fetching public businesses:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching businesses',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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
