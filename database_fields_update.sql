-- Add missing fields to users table for new registration form
-- These fields are required for the comprehensive membership system

-- Add new fields to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS community VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Ghana',
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Update user status to be pending by default (instead of active)
ALTER TABLE users 
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending';

-- Update userType to use 'user' instead of 'member'
UPDATE users SET userType = 'user' WHERE userType = 'member';

-- Create communities table for dynamic community management by admin
CREATE TABLE IF NOT EXISTS communities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    sortOrder INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (isActive)
);

-- Insert default communities
INSERT IGNORE INTO communities (name, description, sortOrder) VALUES
('Gujarati', 'Gujarati community', 1),
('Punjabi', 'Punjabi community', 2),
('Tamil', 'Tamil community', 3),
('Bengali', 'Bengali community', 4),
('Hindi', 'Hindi speaking community', 5),
('Marathi', 'Marathi community', 6),
('Telugu', 'Telugu community', 7),
('Kannada', 'Kannada community', 8),
('Malayalam', 'Malayalam community', 9),
('Sindhi', 'Sindhi community', 10),
('Rajasthani', 'Rajasthani community', 11),
('Other Indian', 'Other Indian communities', 12),
('Mixed Heritage', 'Mixed heritage background', 13);

-- Update plans table to support plan-based access control
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS type ENUM('user', 'merchant') DEFAULT 'user',
ADD COLUMN IF NOT EXISTS dealAccess JSON,
ADD COLUMN IF NOT EXISTS maxDealsPerMonth INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS maxRedemptionsPerMonth INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS billingCycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;

-- Insert default user plans
INSERT IGNORE INTO plans (`key`, name, description, price, currency, type, priority, dealAccess, maxRedemptionsPerMonth, billingCycle, features) VALUES
('basic', 'Basic Plan', 'Community access with basic features', 0.00, 'GHS', 'user', 1, JSON_ARRAY('basic'), 5, 'monthly', JSON_ARRAY('Basic directory access', 'Community updates', 'Basic support')),
('silver', 'Silver Plan', 'Enhanced features and more deal access', 50.00, 'GHS', 'user', 2, JSON_ARRAY('basic', 'silver'), 15, 'monthly', JSON_ARRAY('All basic features', 'Priority support', 'Silver deals', 'Event notifications')),
('gold', 'Gold Plan', 'Premium features with unlimited access', 150.00, 'GHS', 'user', 3, JSON_ARRAY('basic', 'silver', 'gold'), 50, 'monthly', JSON_ARRAY('All silver features', 'VIP events', 'Premium support', 'Business networking', 'All exclusive deals'));

-- Insert default merchant plans
INSERT IGNORE INTO plans (`key`, name, description, price, currency, type, priority, maxDealsPerMonth, billingCycle, features) VALUES
('basic_business', 'Basic Business', 'Basic business listing and limited deals', 0.00, 'GHS', 'merchant', 1, 3, 'monthly', JSON_ARRAY('Business listing', 'Basic analytics', 'Limited deals')),
('silver_business', 'Silver Business', 'Enhanced business features', 100.00, 'GHS', 'merchant', 2, 10, 'monthly', JSON_ARRAY('Enhanced listing', 'Advanced analytics', 'Priority placement', 'More deals')),
('gold_business', 'Gold Business', 'Premium business features', 200.00, 'GHS', 'merchant', 2, 20, 'monthly', JSON_ARRAY('Premium listing', 'Full analytics', 'Featured placement', 'Unlimited deals')),
('platinum_business', 'Platinum Business', 'Top-tier business features', 350.00, 'GHS', 'merchant', 3, 50, 'monthly', JSON_ARRAY('Top listing', 'Advanced analytics', 'Homepage featuring', 'Premium support')),
('platinum_plus_business', 'Platinum Plus Business', 'Ultimate business package', 500.00, 'GHS', 'merchant', 3, 100, 'monthly', JSON_ARRAY('Ultimate listing', 'Custom analytics', 'Exclusive promotions', 'Dedicated support'));

-- Add plan assignment fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS currentPlan VARCHAR(50) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS planExpiryDate DATE,
ADD COLUMN IF NOT EXISTS planStatus ENUM('active', 'expired', 'suspended') DEFAULT 'active',
ADD COLUMN IF NOT EXISTS customDealLimit INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS customRedemptionLimit INT DEFAULT NULL;

-- Add plan assignment fields to businesses table  
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS currentPlan VARCHAR(50) DEFAULT 'basic_business',
ADD COLUMN IF NOT EXISTS planExpiryDate DATE,
ADD COLUMN IF NOT EXISTS planStatus ENUM('active', 'expired', 'suspended') DEFAULT 'active',
ADD COLUMN IF NOT EXISTS customDealLimit INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dealsUsedThisMonth INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS lastDealReset DATE DEFAULT (CURDATE());

-- Create user_plan_history table to track plan changes
CREATE TABLE IF NOT EXISTS user_plan_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    planKey VARCHAR(50) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE,
    assignedBy INT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_userId (userId),
    INDEX idx_planKey (planKey),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Create business_plan_history table to track merchant plan changes
CREATE TABLE IF NOT EXISTS business_plan_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    businessId INT NOT NULL,
    planKey VARCHAR(50) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE,
    assignedBy INT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_businessId (businessId),
    INDEX idx_planKey (planKey),
    FOREIGN KEY (businessId) REFERENCES businesses(businessId) ON DELETE CASCADE,
    FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE SET NULL
);

-- Update deals table to support approval workflow and access levels
ALTER TABLE deals 
MODIFY COLUMN status ENUM('pending_approval', 'active', 'inactive', 'expired', 'rejected') DEFAULT 'pending_approval',
ADD COLUMN IF NOT EXISTS approvedBy INT,
ADD COLUMN IF NOT EXISTS approvedAt TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS rejectionReason TEXT,
ADD COLUMN IF NOT EXISTS requiredPlanLevel JSON;

-- Add foreign key for approvedBy
ALTER TABLE deals 
ADD CONSTRAINT fk_deals_approved_by FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL;

-- Create deal_analytics table for detailed analytics
CREATE TABLE IF NOT EXISTS deal_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dealId INT NOT NULL,
    date DATE NOT NULL,
    views INT DEFAULT 0,
    clicks INT DEFAULT 0,
    redemptions INT DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0.00,
    
    UNIQUE KEY unique_deal_date (dealId, date),
    INDEX idx_dealId (dealId),
    INDEX idx_date (date),
    FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE
);

-- Create notifications table for system notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    type ENUM('registration', 'approval', 'deal', 'plan', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    actionUrl VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_userId (userId),
    INDEX idx_type (type),
    INDEX idx_isRead (isRead),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create email_queue table for email notifications
CREATE TABLE IF NOT EXISTS email_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipientEmail VARCHAR(255) NOT NULL,
    recipientName VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50),
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    lastAttempt TIMESTAMP NULL,
    sentAt TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
);

-- Add admin settings for system configuration
INSERT IGNORE INTO admin_settings (settingKey, settingValue, description, category) VALUES
('site_name', '"Indians in Ghana Membership Portal"', 'Website name', 'general'),
('site_description', '"Connecting the Indian community in Ghana"', 'Website description', 'general'),
('registration_approval_required', 'true', 'Whether new registrations require admin approval', 'registration'),
('deal_approval_required', 'true', 'Whether new deals require admin approval', 'deals'),
('email_notifications_enabled', 'true', 'Enable email notifications', 'notifications'),
('max_file_upload_size', '5242880', 'Maximum file upload size in bytes (5MB)', 'uploads'),
('allowed_file_types', '["jpg", "jpeg", "png", "pdf", "doc", "docx"]', 'Allowed file types for uploads', 'uploads'),
('membership_card_template', '{"qrCode": true, "barcode": true, "photo": true}', 'Membership card template settings', 'membership'),
('social_media_required', 'true', 'Whether social media following is required for registration', 'registration'),
('minimum_age', '18', 'Minimum age for registration', 'registration');
