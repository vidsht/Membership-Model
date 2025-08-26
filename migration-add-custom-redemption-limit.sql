-- Migration: Add customRedemptionLimit column to users table
-- This can be run directly in MySQL/phpMyAdmin or via a migration tool

USE indian_membership_system;

-- Check if column exists first
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'customRedemptionLimit';

-- Add column only if it doesn't exist
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE users ADD COLUMN customRedemptionLimit INT NULL DEFAULT NULL COMMENT "Custom redemption limit set by admin. NULL means use plan default, -1 means unlimited"',
  'SELECT "Column customRedemptionLimit already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column was added
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT, 
  COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'customRedemptionLimit';

SELECT 'Migration completed successfully' as status;
