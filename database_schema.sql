-- Indians in Ghana Membership System - MySQL Database Schema
-- Generated: August 1, 2025

-- Create database (if needed)
-- CREATE DATABASE indians_ghana_membership;
-- USE indians_ghana_membership;

-- Users table (Main user accounts)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    dob DATE,
    community VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Ghana',
    state VARCHAR(100),
    city VARCHAR(100),
    profilePicture VARCHAR(500),
    preferences JSON,
    membership ENUM('basic', 'premium', 'vip') DEFAULT 'basic',
    membershipNumber VARCHAR(20) UNIQUE,
    membershipType VARCHAR(50) DEFAULT 'basic',
    socialMediaFollowed BOOLEAN DEFAULT FALSE,
    userType ENUM('user', 'merchant', 'admin') DEFAULT 'user',
    status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    adminRole VARCHAR(50),
    permissions JSON,
    resetPasswordToken VARCHAR(255),
    resetPasswordExpires DATETIME,
    planAssignedAt DATETIME,
    planAssignedBy INT,
    lastLogin DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_userType (userType),
    INDEX idx_status (status),
    INDEX idx_membershipType (membershipType),
    FOREIGN KEY (planAssignedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Businesses table (Merchant business information)
CREATE TABLE IF NOT EXISTS businesses (
    businessId INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    businessName VARCHAR(255) NOT NULL,
    businessDescription TEXT,
    businessCategory VARCHAR(100),
    businessAddress TEXT,
    businessPhone VARCHAR(20),
    businessEmail VARCHAR(255),
    website VARCHAR(500),
    businessLicense VARCHAR(255),
    taxId VARCHAR(100),
    isVerified BOOLEAN DEFAULT FALSE,
    verificationDate DATETIME,
    membershipLevel ENUM('basic', 'premium', 'vip') DEFAULT 'basic',
    status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
    socialMediaFollowed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_category (businessCategory),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Plans table (Membership plans)
CREATE TABLE IF NOT EXISTS plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'GHS',
    duration INT DEFAULT 12, -- months
    features JSON,
    isActive BOOLEAN DEFAULT TRUE,
    sortOrder INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (`key`),
    INDEX idx_active (isActive)
);

-- Deals table (Merchant deals and offers)
CREATE TABLE IF NOT EXISTS deals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    businessId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    discount VARCHAR(50),
    discountType ENUM('percentage', 'fixed', 'bogo', 'other') DEFAULT 'percentage',
    originalPrice DECIMAL(10, 2),
    discountedPrice DECIMAL(10, 2),
    termsConditions TEXT,
    accessLevel ENUM('basic', 'premium', 'vip', 'all') DEFAULT 'all',
    status ENUM('active', 'inactive', 'expired', 'pending_approval') DEFAULT 'pending_approval',
    expiration_date DATE,
    views INT DEFAULT 0,
    redemptions INT DEFAULT 0,
    maxRedemptions INT,
    imageUrl VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_businessId (businessId),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_accessLevel (accessLevel),
    INDEX idx_expiration (expiration_date),
    FOREIGN KEY (businessId) REFERENCES businesses(businessId) ON DELETE CASCADE
);

-- Deal redemptions table (Track user deal redemptions)
CREATE TABLE IF NOT EXISTS deal_redemptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dealId INT NOT NULL,
    userId INT NOT NULL,
    redeemedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redemptionCode VARCHAR(50),
    status ENUM('redeemed', 'used', 'expired') DEFAULT 'redeemed',
    
    UNIQUE KEY unique_user_deal (dealId, userId),
    INDEX idx_dealId (dealId),
    INDEX idx_userId (userId),
    INDEX idx_redeemedAt (redeemedAt),
    FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin settings table (System configuration)
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    settingKey VARCHAR(100) NOT NULL UNIQUE,
    settingValue JSON,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (settingKey),
    INDEX idx_category (category)
);

-- Activities table (System activity log)
CREATE TABLE IF NOT EXISTS activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT,
    adminId INT,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50), -- 'user', 'business', 'deal', etc.
    entityId INT,
    description TEXT,
    metadata JSON,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_userId (userId),
    INDEX idx_adminId (adminId),
    INDEX idx_action (action),
    INDEX idx_entity (entity, entityId),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (adminId) REFERENCES users(id) ON DELETE SET NULL
);

-- Sessions table (for express-mysql-session)
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    expires INT(11) UNSIGNED NOT NULL,
    data MEDIUMTEXT COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id)
);

-- Insert default plans
INSERT INTO plans (`key`, name, description, price, features, isActive, sortOrder) VALUES
('basic', 'Basic Membership', 'Free membership with basic access to deals and services', 0.00, 
 '["Access to basic deals", "Community forum access", "Monthly newsletter"]', TRUE, 1),
('premium', 'Premium Membership', 'Enhanced membership with premium deals and priority support', 50.00,
 '["All basic features", "Premium deals access", "Priority customer support", "Exclusive events"]', TRUE, 2),
('vip', 'VIP Membership', 'Ultimate membership with exclusive benefits and personalized service', 100.00,
 '["All premium features", "VIP-only deals", "Personal account manager", "Custom services", "Partner discounts"]', TRUE, 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert default admin settings
INSERT INTO admin_settings (settingKey, settingValue, description, category) VALUES
('site_name', '"Indians in Ghana"', 'Website name', 'general'),
('site_description', '"Membership management system for the Indian community in Ghana"', 'Website description', 'general'),
('max_file_size', '5242880', 'Maximum file upload size in bytes (5MB)', 'uploads'),
('allowed_file_types', '["jpg", "jpeg", "png", "pdf"]', 'Allowed file extensions', 'uploads'),
('email_notifications', 'true', 'Enable email notifications', 'notifications'),
('require_approval', 'true', 'Require admin approval for new users', 'registration'),
('default_membership', '"basic"', 'Default membership type for new users', 'membership')
ON DUPLICATE KEY UPDATE settingValue=VALUES(settingValue);

-- Create indexes for better performance
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_businesses_created_at ON businesses(created_at);
CREATE INDEX idx_deals_created_at ON deals(created_at);
CREATE INDEX idx_deal_redemptions_status ON deal_redemptions(status);

-- Add full-text search indexes for better search functionality
-- ALTER TABLE businesses ADD FULLTEXT(businessName, businessDescription);
-- ALTER TABLE deals ADD FULLTEXT(title, description);

DELIMITER //

-- Trigger to generate membership numbers
CREATE TRIGGER generate_membership_number 
BEFORE INSERT ON users 
FOR EACH ROW 
BEGIN 
    IF NEW.membershipNumber IS NULL THEN
        SET NEW.membershipNumber = CONCAT('ING', YEAR(CURDATE()), LPAD(LAST_INSERT_ID() + 1, 6, '0'));
    END IF;
END//

-- Trigger to update deal redemption counts
CREATE TRIGGER update_deal_redemptions 
AFTER INSERT ON deal_redemptions 
FOR EACH ROW 
BEGIN 
    UPDATE deals SET redemptions = redemptions + 1 WHERE id = NEW.dealId;
END//

DELIMITER ;

-- Views for commonly used queries
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    userType,
    status,
    membershipType,
    COUNT(*) as count,
    DATE(created_at) as date_created
FROM users 
GROUP BY userType, status, membershipType, DATE(created_at);

CREATE OR REPLACE VIEW business_stats AS
SELECT 
    businessCategory,
    status,
    membershipLevel,
    COUNT(*) as count,
    DATE(created_at) as date_created
FROM businesses 
GROUP BY businessCategory, status, membershipLevel, DATE(created_at);

CREATE OR REPLACE VIEW deal_stats AS
SELECT 
    category,
    status,
    accessLevel,
    COUNT(*) as total_deals,
    SUM(views) as total_views,
    SUM(redemptions) as total_redemptions,
    DATE(created_at) as date_created
FROM deals 
GROUP BY category, status, accessLevel, DATE(created_at);

-- Comments for documentation
ALTER TABLE users COMMENT = 'Main user accounts table with authentication and profile data';
ALTER TABLE businesses COMMENT = 'Merchant business profiles and verification information';
ALTER TABLE plans COMMENT = 'Membership plans and pricing structure';
ALTER TABLE deals COMMENT = 'Merchant deals and promotional offers';
ALTER TABLE deal_redemptions COMMENT = 'Tracking table for user deal redemptions';
ALTER TABLE admin_settings COMMENT = 'System configuration settings';
ALTER TABLE activities COMMENT = 'System activity and audit log';
ALTER TABLE sessions COMMENT = 'Express session storage for authentication';

deals table:
#	Name	Type
1	id Primary	int(11)
	2	businessId Index		
	3	title	varchar(255)	
	4	description	text	
	5	category	varchar(100)	
	6	imageUrl	varchar(255)		
	7	startDate	date				
	8	endDate	date				
	9	isActive	tinyint(1)				
	10	created_at	timestamp				
	11	expiration_date	date				
	12	accessLevel	varchar(32)		
	13	discount	varchar(32)		
	14	discountType	varchar(32)		
	15	termsConditions	text		
	16	views	int(11)				
	17	redemptions	int(11)				
	18	status	enum('active', 'inactive', 'expired', 'scheduled')		
	19	couponCode	varchar(64)
deal redemption table:
1	id Primary	int(11)				
	2	user_id Index	int(11)				
	3	membership_level	varchar(20)		
	4	deal_id Index	int(11)				
	5	redeemed_at	timestamp				
	6	status	varchar(20)	
session table:
	1	session_id Primary		
	2	expires	int(11)			
	3	data	text
admin_setting table:
	1	id Primary	int(11)				
	2	keyName Index	varchar(100)		
	3	value	text				
	4	updated_at	timestamp
activities:
1	id Primary	int(11)				
	2	type	varchar(64)		
	3	title	varchar(128)		
	4	description	text		
	5	userId	int(11)				
	6	userName	varchar(128)		
	7	userEmail	varchar(128)		
	8	userType	varchar(32)		
	9	timestamp	datetime				
	10	icon	varchar(32)

