-- Database Schema Check and Fix Script
-- This script will add the missing columns to fix the deal details errors

USE indians_in_ghana_membership;

-- Check current structure of deals table
DESCRIBE deals;

-- Check if deal_redemptions table exists
SHOW TABLES LIKE 'deal_redemptions';

-- Add missing requiredPlanPriority column to deals table if it doesn't exist
ALTER TABLE deals 
ADD COLUMN requiredPlanPriority INT DEFAULT 1
COMMENT 'Priority level requirement for this deal (1=Basic, 2=Premium, 3=VIP)';

-- Create deal_redemptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS deal_redemptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dealId INT NOT NULL,
    userId INT NOT NULL,
    redemptionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('redeemed', 'pending', 'cancelled') DEFAULT 'redeemed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_deal_redemptions_dealId (dealId),
    INDEX idx_deal_redemptions_userId (userId),
    INDEX idx_deal_redemptions_date (redemptionDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Display final table structures
SELECT 'DEALS TABLE STRUCTURE:' AS info;
DESCRIBE deals;

SELECT 'DEAL_REDEMPTIONS TABLE STRUCTURE:' AS info;  
DESCRIBE deal_redemptions;

SELECT 'SUCCESS: Database schema has been updated!' AS result;
