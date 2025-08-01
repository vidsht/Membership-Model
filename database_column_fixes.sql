-- SQL script to add missing columns and fix database schema issues
-- Run this SQL script on your database

USE u214148440_membership01;

-- Add missing columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS currentPlan VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS planExpiryDate DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS planStatus VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS dealsUsedThisMonth INT DEFAULT 0;

-- Rename custom_deal_limit to customDealLimit for consistency
ALTER TABLE businesses 
CHANGE COLUMN custom_deal_limit customDealLimit INT(11) DEFAULT NULL;

-- Add missing columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS currentPlan VARCHAR(50) DEFAULT NULL;
ADD COLUMN IF NOT EXISTS planStatus VARCHAR(50) DEFAULT NULL;

-- Rename columns in deal_redemptions table for consistency
ALTER TABLE deal_redemptions 
CHANGE COLUMN user_id userId INT(11) NOT NULL,
CHANGE COLUMN deal_id dealId INT(11) NOT NULL,
CHANGE COLUMN redeemed_at redeemedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key constraints if they don't exist
ALTER TABLE deal_redemptions 
DROP FOREIGN KEY IF EXISTS fk_deal_redemptions_user,
DROP FOREIGN KEY IF EXISTS fk_deal_redemptions_deal;

ALTER TABLE deal_redemptions 
ADD CONSTRAINT fk_deal_redemptions_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_deal_redemptions_deal FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE;

-- Update the unique constraint
ALTER TABLE deal_redemptions 
DROP INDEX IF EXISTS unique_user_deal;

ALTER TABLE deal_redemptions 
ADD UNIQUE KEY unique_user_deal (dealId, userId);

-- Add maxRedemptionsPerMonth column to plans table if missing
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS maxRedemptionsPerMonth INT DEFAULT 0;

-- Copy max_deals_per_month value to maxRedemptionsPerMonth for existing records
UPDATE plans 
SET maxRedemptionsPerMonth = COALESCE(max_deals_per_month, 0) 
WHERE maxRedemptionsPerMonth IS NULL OR maxRedemptionsPerMonth = 0;

-- Rename admin_settings keyName to settingKey for consistency
ALTER TABLE admin_settings 
CHANGE COLUMN keyName settingKey VARCHAR(100) NOT NULL;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_businesses_currentPlan ON businesses(currentPlan);
CREATE INDEX IF NOT EXISTS idx_users_currentPlan ON users(currentPlan);
CREATE INDEX IF NOT EXISTS idx_users_membershipType ON users(membershipType);

-- Ensure all required columns exist with proper defaults
ALTER TABLE users 
MODIFY COLUMN membershipType VARCHAR(50) DEFAULT 'basic',
MODIFY COLUMN joinDate DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Set default values for existing records
UPDATE users SET currentPlan = membershipType WHERE currentPlan IS NULL;
UPDATE users SET joinDate = created_at WHERE joinDate IS NULL;

-- Update businesses to have default plan if null
UPDATE businesses SET currentPlan = 'basic_business' WHERE currentPlan IS NULL;

-- Show final table structures
DESCRIBE users;
DESCRIBE businesses;
DESCRIBE plans;
DESCRIBE deal_redemptions;
DESCRIBE admin_settings;
