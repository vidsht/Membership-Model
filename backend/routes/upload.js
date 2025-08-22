const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const ftp = require('basic-ftp');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { promisify } = require('util');

// Promisify database query
const queryAsync = promisify(db.query).bind(db);

// FTP Configuration
const FTP_CONFIG = {
  host: process.env.FTP_HOST || 'ftp.yourdomain.com',
  user: process.env.FTP_USER || 'your_ftp_username',
  password: process.env.FTP_PASSWORD || 'your_ftp_password',
  secure: false, // Use true for FTPS
  port: 21
};

// Image upload configuration
const UPLOAD_CONFIGS = {
  profile: {
    maxSize: 5 * 1024 * 1024, // 5MB
    dimensions: { width: 500, height: 500 },
    directory: '/public_html/uploads/profile_photos/',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  },
  merchant: {
    maxSize: 3 * 1024 * 1024, // 3MB
    dimensions: { width: 300, height: 300 },
    directory: '/public_html/uploads/merchant_logos/',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  },
  deal: {
    maxSize: 8 * 1024 * 1024, // 8MB
    dimensions: { width: 800, height: 400 },
    directory: '/public_html/uploads/deal_banners/',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  }
};

// Helper function to create FTP directories
async function ensureFTPDirectory(client, directory) {
  try {
    await client.ensureDir(directory);
    return true;
  } catch (error) {
    console.error('Error creating FTP directory:', error);
    return false;
  }
}

// Helper function to upload file to FTP
async function uploadToFTP(localPath, remotePath, config) {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  
  try {
    await client.access(FTP_CONFIG);
    
    // Ensure remote directory exists
    const remoteDir = path.dirname(remotePath);
    await ensureFTPDirectory(client, remoteDir);
    
    // Upload file
    await client.uploadFrom(localPath, remotePath);
    console.log(`✅ File uploaded to FTP: ${remotePath}`);
    return true;
  } catch (error) {
    console.error('❌ FTP upload error:', error);
    throw error;
  } finally {
    client.close();
  }
}

// Helper function to delete file from FTP
async function deleteFromFTP(remotePath) {
  if (!remotePath) return true;
  
  const client = new ftp.Client();
  client.ftp.verbose = false;
  
  try {
    await client.access(FTP_CONFIG);
    await client.remove(remotePath);
    console.log(`✅ File deleted from FTP: ${remotePath}`);
    return true;
  } catch (error) {
    console.log(`⚠️ Could not delete FTP file: ${remotePath}`, error.message);
    // Try to delete local fallback copy if exists
    try {
      const subPath = remotePath.replace(/^\/public_html\/uploads\//, '').replace(/^\/uploads\//, '').replace(/^\//, '');
      const localPath = path.join(__dirname, '..', 'uploads', subPath);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`✅ Deleted local fallback file: ${localPath}`);
        return true;
      }
    } catch (localErr) {
      console.warn('Failed to delete local fallback file:', localErr.message);
    }
    return false;
  } finally {
    client.close();
  }
}

// Multer configuration for temporary local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../temp_uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create multer upload middleware for different contexts
const createUploadMiddleware = (uploadType) => {
  const config = UPLOAD_CONFIGS[uploadType];
  
  return multer({
    storage: storage,
    limits: { fileSize: config.maxSize },
    fileFilter: (req, file, cb) => {
      if (config.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed types: ${config.allowedTypes.join(', ')}`));
      }
    }
  });
};

// Image processing function
async function processImage(inputPath, outputPath, dimensions) {
  try {
    await sharp(inputPath)
      .resize(dimensions.width, dimensions.height, {
        fit: sharp.fit.cover,
        position: sharp.strategy.center
      })
      .jpeg({ quality: 85 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error('Image processing error:', error);
    throw error;
  }
}

// Generic upload handler
async function handleImageUpload(req, res, uploadType, idField, tableField, tableName) {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const config = UPLOAD_CONFIGS[uploadType];
    const entityId = req.params.id || req.body[idField];
    
    if (!entityId) {
      return res.status(400).json({ 
        success: false, 
        message: `${idField} is required` 
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(req.file.originalname).toLowerCase();
    const filename = `${uploadType}${entityId}_${timestamp}${extension}`;
    
    // Process image
    const processedPath = path.join(path.dirname(req.file.path), 'processed_' + req.file.filename);
    await processImage(req.file.path, processedPath, config.dimensions);
    
    // Upload to FTP
    const remotePath = config.directory + filename;
    let uploadedToFTP = false;
    try {
      // Try FTP upload first (if FTP configured)
      if (FTP_CONFIG && FTP_CONFIG.host && FTP_CONFIG.host !== 'ftp.yourdomain.com') {
        await uploadToFTP(processedPath, remotePath, config);
        uploadedToFTP = true;
      } else {
        throw new Error('FTP not configured, using local storage fallback');
      }
    } catch (ftpErr) {
      console.warn('FTP upload failed or not configured, falling back to local storage:', ftpErr.message);
      // Ensure local uploads directory exists and copy processed file there
      try {
        const subDir = config.directory.replace(/^\/public_html\/uploads\//, '').replace(/^\/uploads\//, '').replace(/^\//, '').replace(/\/$/, '');
        const localDir = path.join(__dirname, '..', 'uploads', subDir);
        fs.mkdirSync(localDir, { recursive: true });
        const localDest = path.join(localDir, filename);
        fs.copyFileSync(processedPath, localDest);
        console.log('✅ File copied to local uploads folder:', localDest);
      } catch (localCopyErr) {
        console.error('Failed to save file locally as fallback:', localCopyErr);
        throw localCopyErr; // let outer catch handle response
      }
    }

    // Get old image for cleanup
    const oldImageQuery = `SELECT ${tableField} FROM ${tableName} WHERE ${idField} = ?`;
    const oldImageResult = await queryAsync(oldImageQuery, [entityId]);
    const oldImage = oldImageResult[0]?.[tableField];
    
    // Update database
    // Use updated_at (widely available) instead of assuming a '<field>_uploaded_at' column exists
    const updateQuery = `UPDATE ${tableName} SET ${tableField} = ?, updated_at = NOW() WHERE ${idField} = ?`;
    await queryAsync(updateQuery, [filename, entityId]);
    
    // Delete old image from FTP if exists
    if (oldImage && oldImage !== filename) {
      await deleteFromFTP(config.directory + oldImage);
    }
    
    // Clean up temporary files
    fs.unlinkSync(req.file.path);
    fs.unlinkSync(processedPath);
    
    // Return success response
    // Build public URL - ensure it matches frontend expectations
    const domain = process.env.DOMAIN_URL || process.env.VITE_DOMAIN_URL || 'https://membership.indiansinghana.com';
    const subDir = config.directory.replace(/^\/public_html\/uploads\//, '').replace(/^\/uploads\//, '').replace(/^\//, '').replace(/\/$/, '');
    const imageUrl = `${domain}/uploads/${subDir}/${filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: filename
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up temporary files on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Image upload failed',
      error: error.message
    });
  }
}

// Profile Photo Upload
router.post('/profile-photo/:id', auth, createUploadMiddleware('profile').single('profilePhoto'), async (req, res) => {
  await handleImageUpload(req, res, 'profile', 'id', 'profilePhoto', 'users');
});

// Merchant Logo Upload
router.post('/merchant-logo/:id', auth, createUploadMiddleware('merchant').single('merchantLogo'), async (req, res) => {
  await handleImageUpload(req, res, 'merchant', 'id', 'profilePhoto', 'users');
});

// Deal Banner Upload
router.post('/deal-banner/:id', auth, createUploadMiddleware('deal').single('dealBanner'), async (req, res) => {
  await handleImageUpload(req, res, 'deal', 'id', 'bannerImage', 'deals');
});

// Get image URL helper endpoint
router.get('/image-url/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const config = UPLOAD_CONFIGS[type];
  
  if (!config) {
    return res.status(400).json({ success: false, message: 'Invalid image type' });
  }
  
  const subDir = config.directory.replace(/^\/public_html\/uploads\//, '').replace(/^\/uploads\//, '').replace(/^\//, '').replace(/\/$/, '');
  const imageUrl = `${process.env.DOMAIN_URL || 'https://yourdomain.com'}/uploads/${subDir}/${filename}`;
  
  res.json({
    success: true,
    imageUrl: imageUrl
  });
});

// Delete image endpoint
router.delete('/image/:type/:id', auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const config = UPLOAD_CONFIGS[type];
    
    if (!config) {
      return res.status(400).json({ success: false, message: 'Invalid image type' });
    }
    
    let tableName, tableField, idField;
    
    switch (type) {
      case 'profile':
        tableName = 'users';
        tableField = 'profilePhoto';
        idField = 'id';
        break;
      case 'merchant':
        tableName = 'users';
        tableField = 'profilePhoto';
        idField = 'id';
        break;
      case 'deal':
        tableName = 'deals';
        tableField = 'bannerImage';
        idField = 'id';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid image type' });
    }
    
    // Get current image
    const currentImageQuery = `SELECT ${tableField} FROM ${tableName} WHERE ${idField} = ?`;
    const currentImageResult = await queryAsync(currentImageQuery, [id]);
    const currentImage = currentImageResult[0]?.[tableField];
    
    if (currentImage) {
      // Delete from FTP
      await deleteFromFTP(config.directory + currentImage);
      
      // Update database
      const updateQuery = `UPDATE ${tableName} SET ${tableField} = NULL, updated_at = NOW() WHERE ${idField} = ?`;
      await queryAsync(updateQuery, [id]);
    }
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

module.exports = router;
