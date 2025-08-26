const express = require('express');
const router = express.Router();
const db = require('../db');

// Utility function to promisify db.query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};

// Migration endpoint - Add customRedemptionLimit column
router.post('/add-custom-redemption-column', async (req, res) => {
  try {
    console.log('🔄 Starting migration: Add customRedemptionLimit column');
    
    // Check if column exists
    const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'customRedemptionLimit'
    `;
    
    const columnExists = await queryAsync(checkColumnQuery);
    
    if (columnExists.length > 0) {
      console.log('✅ Column already exists');
      return res.json({
        success: true,
        message: 'customRedemptionLimit column already exists',
        alreadyExists: true
      });
    }
    
    console.log('➕ Adding customRedemptionLimit column...');
    
    const addColumnQuery = `
      ALTER TABLE users 
      ADD COLUMN customRedemptionLimit INT NULL DEFAULT NULL 
      COMMENT 'Custom redemption limit set by admin. NULL means use plan default, -1 means unlimited'
    `;
    
    await queryAsync(addColumnQuery);
    
    console.log('✅ Column added successfully');
    
    // Verify the column was added
    const verifyQuery = `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'customRedemptionLimit'
    `;
    
    const columnInfo = await queryAsync(verifyQuery);
    
    res.json({
      success: true,
      message: 'customRedemptionLimit column added successfully',
      columnInfo: columnInfo[0]
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add customRedemptionLimit column',
      error: error.message
    });
  }
});

// Test endpoint to check column status
router.get('/check-custom-redemption-column', async (req, res) => {
  try {
    const checkColumnQuery = `
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'customRedemptionLimit'
    `;
    
    const columnInfo = await queryAsync(checkColumnQuery);
    
    res.json({
      success: true,
      exists: columnInfo.length > 0,
      columnInfo: columnInfo[0] || null
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check column status',
      error: error.message
    });
  }
});

module.exports = router;
