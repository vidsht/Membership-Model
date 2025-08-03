-- Database Migration: Fix Deal Management Issues
-- This script addresses the missing columns for deal management

-- Fix Issue 1: Add missing originalPrice and discountedPrice columns to deals table
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS originalPrice DECIMAL(10, 2) DEFAULT NULL AFTER discountType,
ADD COLUMN IF NOT EXISTS discountedPrice DECIMAL(10, 2) DEFAULT NULL AFTER originalPrice;

-- Fix Issue 2: Add businessId column to users table 
-- This is needed for the business lookup query
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS businessId VARCHAR(20) DEFAULT NULL AFTER id;

-- Update existing users with their business IDs from the businesses table
UPDATE users u 
JOIN businesses b ON u.id = b.userId 
SET u.businessId = b.businessId 
WHERE u.userType = 'merchant';

-- Fix Issue 3: Add missing updated_at column to deals table
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add validFrom column to deals table if missing (used in the queries)
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS validFrom DATE DEFAULT NULL AFTER termsConditions,
ADD COLUMN IF NOT EXISTS validUntil DATE DEFAULT NULL AFTER validFrom;

-- Migrate expiration_date to validUntil if needed
UPDATE deals 
SET validUntil = expiration_date 
WHERE validUntil IS NULL AND expiration_date IS NOT NULL;

-- Add index for businessId in users table for better performance
CREATE INDEX IF NOT EXISTS idx_users_businessId ON users(businessId);

-- Ensure the deals table has the correct foreign key reference
-- (In case there are inconsistencies with businessId references)
ALTER TABLE deals DROP FOREIGN KEY IF EXISTS deals_ibfk_1;
ALTER TABLE deals ADD CONSTRAINT deals_ibfk_1 
    FOREIGN KEY (businessId) REFERENCES businesses(businessId) ON DELETE CASCADE;

SELECT 'Database migration completed successfully' as status;
