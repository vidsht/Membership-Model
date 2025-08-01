-- Update users table to add new required fields and update existing schema
-- Add missing fields for comprehensive user management

-- First check if columns exist and add them if not
SET @sql = CONCAT('SELECT COUNT(*) INTO @cnt FROM information_schema.columns WHERE table_name = "users" AND column_name = "dob"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add missing fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS community VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Ghana',
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS currentLocation VARCHAR(100),
ADD COLUMN IF NOT EXISTS userCategory ENUM('Students', 'Housewife', 'Working Professional', 'Others') DEFAULT 'Others',
ADD COLUMN IF NOT EXISTS planExpiry DATETIME,
ADD COLUMN IF NOT EXISTS planStatus ENUM('active', 'expired', 'suspended') DEFAULT 'active',
ADD COLUMN IF NOT EXISTS dealRedemptionCount INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS maxDealRedemptions INT DEFAULT 10;

-- Update businesses table to add new fields for merchant management
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS planExpiry DATETIME,
ADD COLUMN IF NOT EXISTS planStatus ENUM('active', 'expired', 'suspended') DEFAULT 'active',
ADD COLUMN IF NOT EXISTS dealCount INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS maxDealsPerMonth INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS currentMonthDeals INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS lastDealResetDate DATE DEFAULT (CURDATE());

-- Update plans table to add new fields for better plan management
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS type ENUM('user', 'merchant') DEFAULT 'user',
ADD COLUMN IF NOT EXISTS billingCycle ENUM('monthly', 'yearly') DEFAULT 'yearly',
ADD COLUMN IF NOT EXISTS dealAccess TEXT,
ADD COLUMN IF NOT EXISTS maxUsers INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS maxDealRedemptions INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS maxDealsPerMonth INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS metadata JSON;

-- Update deals table to add new fields
ALTER TABLE deals 
ADD COLUMN IF NOT EXISTS startDate DATE,
ADD COLUMN IF NOT EXISTS endDate DATE,
ADD COLUMN IF NOT EXISTS isActive TINYINT(1) DEFAULT 1,
ADD COLUMN IF NOT EXISTS couponCode VARCHAR(64),
ADD COLUMN IF NOT EXISTS maxRedemptions INT,
ADD COLUMN IF NOT EXISTS usageCount INT DEFAULT 0;

-- Update admin_settings table to use consistent naming
ALTER TABLE admin_settings 
CHANGE COLUMN keyName settingKey VARCHAR(100);

-- Create communities table for dynamic community management
CREATE TABLE IF NOT EXISTS communities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default communities
INSERT INTO communities (name, description) VALUES
('Gujarati', 'Gujarati community members'),
('Punjabi', 'Punjabi community members'),  
('Tamil', 'Tamil community members'),
('Telugu', 'Telugu community members'),
('Bengali', 'Bengali community members'),
('Marathi', 'Marathi community members'),
('Hindi', 'Hindi speaking community members'),
('Others', 'Other community members')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Create membership number sequence table
CREATE TABLE IF NOT EXISTS membership_sequence (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year YEAR NOT NULL,
    month TINYINT NOT NULL,
    sequence_number INT DEFAULT 0,
    UNIQUE KEY unique_year_month (year, month)
);

-- Update plans with proper user and merchant plans
DELETE FROM plans;

-- Insert user plans
INSERT INTO plans (`key`, name, description, price, currency, duration, billingCycle, features, dealAccess, isActive, sortOrder, type, maxDealRedemptions, priority) VALUES
('basic', 'Basic Membership', 'Free membership with basic access to deals and services', 0.00, 'GHS', 12, 'yearly', 
 '["Access to basic deals", "Community forum access", "Monthly newsletter"]', 
 'basic', TRUE, 1, 'user', 5, 1),
 
('silver', 'Silver Membership', 'Enhanced membership with more deals and priority support', 100.00, 'GHS', 12, 'yearly',
 '["All basic features", "Silver deals access", "Priority customer support", "Event notifications"]', 
 'silver', TRUE, 2, 'user', 15, 2),
 
('gold', 'Gold Membership', 'Premium membership with exclusive benefits and personalized service', 300.00, 'GHS', 12, 'yearly',
 '["All silver features", "Gold exclusive deals", "VIP events", "Personal account manager", "Business networking"]', 
 'gold', TRUE, 3, 'user', 25, 3);

-- Insert merchant plans with custom mapping
INSERT INTO plans (`key`, name, description, price, currency, duration, billingCycle, features, dealAccess, isActive, sortOrder, type, maxDealsPerMonth, priority) VALUES
('basic', 'Basic Business', 'Basic business listing with limited deal posting', 0.00, 'GHS', 12, 'yearly',
 '["Business directory listing", "Basic profile", "Limited analytics", "Email support"]',
 'basic', TRUE, 1, 'merchant', 3, 1),
 
('silver_business', 'Silver Business', 'Enhanced business features with premium visibility', 200.00, 'GHS', 12, 'yearly',
 '["Enhanced listing", "Priority placement", "Advanced analytics", "Deal posting", "Priority support"]',
 'premium', TRUE, 2, 'merchant', 10, 2),
 
('gold_business', 'Gold Business', 'Premium business features with maximum visibility', 500.00, 'GHS', 12, 'yearly',
 '["Premium listing", "Featured placement", "Full analytics", "Unlimited deal posting", "Priority support", "Marketing tools"]',
 'premium', TRUE, 3, 'merchant', 20, 2),
 
('platinum_business', 'Platinum Business', 'Ultimate business package with exclusive benefits', 1000.00, 'GHS', 12, 'yearly',
 '["Top-tier listing", "Homepage featuring", "Advanced analytics", "Unlimited deals", "White-label support", "Custom branding"]',
 'featured', TRUE, 4, 'merchant', 50, 3),
 
('platinum_plus_business', 'Platinum Plus Business', 'Elite business package with all premium benefits', 1500.00, 'GHS', 12, 'yearly',
 '["Elite listing", "Always featured", "Premium analytics", "Unlimited everything", "Dedicated account manager", "Custom solutions"]',
 'featured', TRUE, 5, 'merchant', 100, 3);

-- Create plan features mapping table
CREATE TABLE IF NOT EXISTS plan_features (
    id INT PRIMARY KEY AUTO_INCREMENT,
    planKey VARCHAR(50) NOT NULL,
    featureKey VARCHAR(100) NOT NULL,
    featureValue JSON,
    isActive BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (planKey) REFERENCES plans(`key`) ON DELETE CASCADE,
    UNIQUE KEY unique_plan_feature (planKey, featureKey)
);

-- Insert feature mappings for merchant plans
INSERT INTO plan_features (planKey, featureKey, featureValue) VALUES
-- Basic features
('basic', 'business_listing', '{"included": true, "type": "basic", "priority": 1}'),
('basic', 'deal_posting', '{"included": false}'),
('basic', 'analytics', '{"included": false}'),
('basic', 'visibility', '{"type": "standard", "highlighting": false}'),
('basic', 'support', '{"level": "basic", "response_time": "48h"}'),

-- Silver Business features (maps to premium)
('silver_business', 'business_listing', '{"included": true, "type": "enhanced", "priority": 2}'),
('silver_business', 'deal_posting', '{"included": true, "limit": 10, "visibility": "enhanced"}'),
('silver_business', 'analytics', '{"included": true, "level": "basic", "reports": ["views", "redemptions"]}'),
('silver_business', 'visibility', '{"type": "highlighted", "highlighting": true, "featured_sections": ["category"]}'),
('silver_business', 'support', '{"level": "priority", "response_time": "24h"}'),

-- Gold Business features (maps to premium)
('gold_business', 'business_listing', '{"included": true, "type": "enhanced", "priority": 2}'),
('gold_business', 'deal_posting', '{"included": true, "limit": 20, "visibility": "enhanced"}'),
('gold_business', 'analytics', '{"included": true, "level": "advanced", "reports": ["views", "redemptions", "engagement", "trends"]}'),
('gold_business', 'visibility', '{"type": "highlighted", "highlighting": true, "featured_sections": ["category", "homepage"]}'),
('gold_business', 'support', '{"level": "priority", "response_time": "12h"}'),
('gold_business', 'marketing_tools', '{"included": true, "tools": ["email_campaigns", "social_sharing"]}'),

-- Platinum Business features (maps to featured)
('platinum_business', 'business_listing', '{"included": true, "type": "featured", "priority": 3}'),
('platinum_business', 'deal_posting', '{"included": true, "limit": 50, "visibility": "maximum"}'),
('platinum_business', 'analytics', '{"included": true, "level": "premium", "reports": ["all"], "competitor_analysis": true}'),
('platinum_business', 'visibility', '{"type": "featured", "highlighting": true, "featured_sections": ["homepage", "category", "special"], "always_top": true}'),
('platinum_business', 'support', '{"level": "premium", "response_time": "4h", "dedicated_manager": false}'),
('platinum_business', 'marketing_tools', '{"included": true, "tools": ["all"], "custom_campaigns": true}'),
('platinum_business', 'events', '{"exclusive": true, "priority_access": true}'),

-- Platinum Plus Business features (maps to featured)
('platinum_plus_business', 'business_listing', '{"included": true, "type": "featured", "priority": 3}'),
('platinum_plus_business', 'deal_posting', '{"included": true, "limit": 100, "visibility": "maximum"}'),
('platinum_plus_business', 'analytics', '{"included": true, "level": "enterprise", "reports": ["all"], "competitor_analysis": true, "custom_reports": true}'),
('platinum_plus_business', 'visibility', '{"type": "featured", "highlighting": true, "featured_sections": ["all"], "always_top": true, "custom_branding": true}'),
('platinum_plus_business', 'support', '{"level": "premium", "response_time": "2h", "dedicated_manager": true}'),
('platinum_plus_business', 'marketing_tools', '{"included": true, "tools": ["all"], "custom_campaigns": true, "white_label": true}'),
('platinum_plus_business', 'events', '{"exclusive": true, "priority_access": true, "vip_events": true}'),
('platinum_plus_business', 'custom_branding', '{"included": true, "custom_profile": true, "branded_deals": true}');

-- Update admin settings with new required settings
INSERT INTO admin_settings (settingKey, settingValue, description, category) VALUES
('membership_approval_required', 'true', 'Require admin approval for new memberships', 'registration'),
('merchant_approval_required', 'true', 'Require admin approval for new merchants', 'registration'),
('deal_approval_required', 'true', 'Require admin approval for new deals', 'deals'),
('email_notifications_enabled', 'true', 'Enable email notifications', 'notifications'),
('welcome_email_enabled', 'true', 'Send welcome emails to new users', 'notifications'),
('plan_expiry_notification_days', '7', 'Days before plan expiry to send notification', 'notifications'),
('auto_suspend_expired_plans', 'true', 'Automatically suspend expired plans', 'plans'),
('membership_number_format', 'ING{YEAR}{MONTH}{DAY}{SEQUENCE}', 'Format for membership numbers', 'general'),
('default_user_plan', 'basic', 'Default plan for new users', 'plans'),
('default_merchant_plan', 'basic', 'Default plan for new merchants', 'plans'),
('max_profile_image_size', '5242880', 'Maximum profile image size in bytes (5MB)', 'uploads'),
('allowed_image_types', '["jpg", "jpeg", "png", "gif"]', 'Allowed image file types', 'uploads'),
('deal_image_required', 'false', 'Require image for deal creation', 'deals'),
('social_media_follow_required', '1', 'Minimum social media accounts to follow', 'registration')
ON DUPLICATE KEY UPDATE settingValue=VALUES(settingValue);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_community ON users(community);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_plan_expiry ON users(planExpiry);
CREATE INDEX IF NOT EXISTS idx_users_plan_status ON users(planStatus);
CREATE INDEX IF NOT EXISTS idx_businesses_plan_expiry ON businesses(planExpiry);
CREATE INDEX IF NOT EXISTS idx_businesses_plan_status ON businesses(planStatus);
CREATE INDEX IF NOT EXISTS idx_deals_start_date ON deals(startDate);
CREATE INDEX IF NOT EXISTS idx_deals_end_date ON deals(endDate);
CREATE INDEX IF NOT EXISTS idx_deals_is_active ON deals(isActive);

-- Update existing data to set proper defaults
UPDATE users SET 
    country = 'Ghana' WHERE country IS NULL OR country = '',
    planStatus = 'active' WHERE planStatus IS NULL,
    dealRedemptionCount = 0 WHERE dealRedemptionCount IS NULL,
    maxDealRedemptions = 10 WHERE maxDealRedemptions IS NULL;

UPDATE businesses SET 
    planStatus = 'active' WHERE planStatus IS NULL,
    dealCount = 0 WHERE dealCount IS NULL,
    maxDealsPerMonth = 5 WHERE maxDealsPerMonth IS NULL,
    currentMonthDeals = 0 WHERE currentMonthDeals IS NULL,
    lastDealResetDate = CURDATE() WHERE lastDealResetDate IS NULL;
