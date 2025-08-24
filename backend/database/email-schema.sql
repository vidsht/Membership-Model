-- Email notification system database schema

-- Table to store email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT NOT NULL,
    variables TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_active (is_active)
);

-- Table to log all email notifications sent
CREATE TABLE IF NOT EXISTS email_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
    message_id VARCHAR(255),
    scheduled_for TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    error TEXT,
    data TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_recipient (recipient),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_for),
    INDEX idx_created (created_at)
);

-- Table for email queue system
CREATE TABLE IF NOT EXISTS email_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_log_id INT,
    recipient VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT NOT NULL,
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
    scheduled_for TIMESTAMP NULL,
    status ENUM('pending', 'processing', 'sent', 'failed') DEFAULT 'pending',
    message_id VARCHAR(255),
    sent_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    error TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (email_log_id) REFERENCES email_notifications(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_scheduled (scheduled_for),
    INDEX idx_recipient (recipient)
);

-- Table for user email preferences
CREATE TABLE IF NOT EXISTS user_email_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_notification (user_id, notification_type),
    INDEX idx_user_id (user_id),
    INDEX idx_type_enabled (notification_type, is_enabled)
);

-- Table for email analytics and tracking
CREATE TABLE IF NOT EXISTS email_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_log_id INT NOT NULL,
    event_type ENUM('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained') NOT NULL,
    event_data TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_log_id) REFERENCES email_notifications(id) ON DELETE CASCADE,
    INDEX idx_email_log (email_log_id),
    INDEX idx_event_type (event_type),
    INDEX idx_timestamp (timestamp)
);

-- Insert default email templates
INSERT INTO email_templates (type, name, subject, html_content, text_content, variables) VALUES

-- User Notifications
('user_welcome', 'User Welcome Message', 'Welcome to Indians in Ghana - {{fullName}}!', 
'<h1>Welcome {{firstName}}!</h1><p>Your membership is confirmed. Membership #: {{membershipNumber}}</p>', 
'Welcome {{firstName}}! Your membership is confirmed. Membership #: {{membershipNumber}}', 
'fullName,firstName,email,membershipNumber,validationDate'),

('new_deal_notification', 'New Deal Posted', 'New Deal Available - {{dealTitle}}', 
'<h1>New Deal: {{dealTitle}}</h1><p>{{dealDescription}}</p><p>From: {{businessName}}</p>', 
'New Deal: {{dealTitle}} - {{dealDescription}} From: {{businessName}}', 
'firstName,dealTitle,dealDescription,businessName,discount,validUntil,dealUrl'),

('profile_status_update', 'Profile Status Update', 'Profile Status Update - Indians in Ghana', 
'<h1>Profile Update</h1><p>Hi {{firstName}}, {{statusMessage}}</p>', 
'Hi {{firstName}}, {{statusMessage}}', 
'firstName,fullName,newStatus,reason,statusMessage,loginUrl'),

('redemption_approved', 'Redemption Approved', 'Redemption Request Approved - {{dealTitle}}', 
'<h1>Redemption Approved!</h1><p>Your request for {{dealTitle}} has been approved.</p>', 
'Your redemption request for {{dealTitle}} has been approved!', 
'firstName,dealTitle,businessName,status,redemptionDate,qrCode'),

('redemption_rejected', 'Redemption Rejected', 'Redemption Request Update - {{dealTitle}}', 
'<h1>Redemption Update</h1><p>Your request for {{dealTitle}} was not approved. Reason: {{rejectionReason}}</p>', 
'Your redemption request for {{dealTitle}} was not approved. Reason: {{rejectionReason}}', 
'firstName,dealTitle,businessName,status,rejectionReason,redemptionDate'),

('redemption_limit_reached', 'Max Redemption Limit Reached', 'Monthly Redemption Limit Reached', 
'<h1>Limit Reached</h1><p>You have reached your monthly limit of {{currentLimit}} redemptions. Resets on {{resetDate}}.</p>', 
'You have reached your monthly limit of {{currentLimit}} redemptions. Resets on {{resetDate}}.', 
'firstName,currentLimit,resetDate,planName'),

('plan_expiry_warning', 'Plan Expiry Warning', 'Plan Expiry Warning - {{planName}}', 
'<h1>Plan Expiring Soon</h1><p>Your {{planName}} plan expires on {{expiryDate}} ({{daysLeft}} days left).</p>', 
'Your {{planName}} plan expires on {{expiryDate}} ({{daysLeft}} days left).', 
'firstName,planName,expiryDate,daysLeft,renewalUrl'),

('redemption_limit_renewed', 'Redemption Limit Renewed', 'Redemption Limit Renewed', 
'<h1>Limit Renewed!</h1><p>Your monthly redemption limit has been reset to {{newLimit}} for {{currentMonth}}.</p>', 
'Your monthly redemption limit has been reset to {{newLimit}} for {{currentMonth}}.', 
'firstName,newLimit,planName,currentMonth'),

('plan_assigned', 'New Plan Assigned', 'New Plan Assigned - {{planName}}', 
'<h1>New Plan Assigned</h1><p>{{planName}} has been assigned to your account. Monthly limit: {{monthlyRedemptionLimit}}.</p>', 
'{{planName}} has been assigned to your account. Monthly limit: {{monthlyRedemptionLimit}}.', 
'firstName,planName,planDescription,monthlyRedemptionLimit,validUntil,dashboardUrl'),

-- Merchant Notifications
('merchant_welcome', 'Merchant Welcome Message', 'Welcome to Indians in Ghana Business Directory - {{businessName}}!', 
'<h1>Welcome {{businessName}}!</h1><p>Your business account is now active. Start posting deals today!</p>', 
'Welcome {{businessName}}! Your business account is now active.', 
'businessName,ownerName,email,businessType,validationDate,dashboardUrl'),

('deal_approved', 'Deal Approved', 'Your Deal Has Been Approved - {{dealTitle}}', 
'<h1>Deal Approved!</h1><p>{{dealTitle}} is now live and visible to all members.</p>', 
'Your deal {{dealTitle}} has been approved and is now live!', 
'businessName,ownerName,dealTitle,dealDescription,status,approvedDate,dealUrl'),

('deal_rejected', 'Deal Rejected', 'Deal Submission Update - {{dealTitle}}', 
'<h1>Deal Update</h1><p>{{dealTitle}} was not approved. Reason: {{rejectionReason}}</p>', 
'Your deal {{dealTitle}} was not approved. Reason: {{rejectionReason}}', 
'businessName,ownerName,dealTitle,dealDescription,status,rejectionReason'),

('deal_limit_reached', 'Deal Limit Reached', 'Monthly Deal Posting Limit Reached', 
'<h1>Limit Reached</h1><p>You have reached your monthly limit of {{currentLimit}} deals. Resets on {{resetDate}}.</p>', 
'You have reached your monthly limit of {{currentLimit}} deals. Resets on {{resetDate}}.', 
'businessName,ownerName,currentLimit,resetDate,planName'),

('deal_limit_renewed', 'Deal Limit Renewed', 'Deal Posting Limit Renewed', 
'<h1>Limit Renewed!</h1><p>Your monthly deal posting limit has been reset to {{newLimit}} for {{currentMonth}}.</p>', 
'Your monthly deal posting limit has been reset to {{newLimit}} for {{currentMonth}}.', 
'businessName,ownerName,newLimit,planName,currentMonth'),

('custom_deal_limit_assigned', 'Custom Deal Limit Assigned', 'Custom Deal Limit Assigned', 
'<h1>Custom Limit Assigned</h1><p>A custom deal posting limit of {{newLimit}} has been assigned to your account.</p>', 
'A custom deal posting limit of {{newLimit}} has been assigned to your account.', 
'businessName,ownerName,newLimit,effectiveDate,dashboardUrl'),

('new_redemption_request', 'New Redemption Request', 'New Redemption Request - {{dealTitle}}', 
'<h1>New Redemption</h1><p>{{userName}} wants to redeem {{dealTitle}}. Review in your dashboard.</p>', 
'{{userName}} wants to redeem {{dealTitle}}. Review in your dashboard.', 
'businessName,ownerName,dealTitle,userName,userEmail,redemptionDate,qrCode,dashboardUrl'),

-- Admin Notifications
('admin_new_registration', 'New Registration Alert', 'New Registration - Action Required', 
'<h1>New Registration</h1><p>{{userType}}: {{fullName}} ({{email}}) registered on {{registrationDate}}.</p>', 
'New {{userType}} registration: {{fullName}} ({{email}}) on {{registrationDate}}.', 
'adminName,userType,fullName,email,businessName,registrationDate,reviewUrl'),

('admin_deal_redemption', 'Deal Redemption Alert', 'Deal Redemption Alert - {{dealTitle}}', 
'<h1>Deal Redeemed</h1><p>{{userName}} redeemed {{dealTitle}} from {{businessName}}.</p>', 
'{{userName}} redeemed {{dealTitle}} from {{businessName}}.', 
'adminName,dealTitle,businessName,userName,userEmail,redemptionDate,status'),

('admin_new_deal_request', 'New Deal Request', 'New Deal Approval Required - {{dealTitle}}', 
'<h1>Deal Pending</h1><p>{{businessName}} submitted {{dealTitle}} for approval.</p>', 
'{{businessName}} submitted {{dealTitle}} for approval.', 
'adminName,dealTitle,dealDescription,businessName,merchantEmail,submissionDate,reviewUrl'),

('admin_deal_published', 'Deal Published Alert', 'Deal Published - {{dealTitle}}', 
'<h1>Deal Published</h1><p>{{dealTitle}} from {{businessName}} is now live.</p>', 
'{{dealTitle}} from {{businessName}} is now live.', 
'adminName,dealTitle,businessName,publishedDate,dealUrl'),

('admin_plan_expiry_alert', 'Plan Expiry Alert', 'Plan Expiry Alert - Multiple Users', 
'<h1>Plans Expiring</h1><p>{{expiringCount}} user plans are expiring within 7 days.</p>', 
'{{expiringCount}} user plans are expiring within 7 days.', 
'adminName,expiringCount,expiringUsers,dashboardUrl');

-- Insert default email preferences for all notification types
INSERT INTO user_email_preferences (user_id, notification_type, is_enabled)
SELECT id, 'user_welcome', TRUE FROM users WHERE userType = 'user'
ON DUPLICATE KEY UPDATE is_enabled = is_enabled;

INSERT INTO user_email_preferences (user_id, notification_type, is_enabled)
SELECT id, 'new_deal_notification', TRUE FROM users WHERE userType = 'user'
ON DUPLICATE KEY UPDATE is_enabled = is_enabled;

INSERT INTO user_email_preferences (user_id, notification_type, is_enabled)
SELECT id, 'profile_status_update', TRUE FROM users
ON DUPLICATE KEY UPDATE is_enabled = is_enabled;

-- Add indexes for better performance
ALTER TABLE email_notifications ADD INDEX idx_recipient_type (recipient, type);
ALTER TABLE email_notifications ADD INDEX idx_status_created (status, created_at);
ALTER TABLE email_queue ADD INDEX idx_status_priority (status, priority);

-- Add email preference check procedure
DELIMITER //
CREATE PROCEDURE CheckEmailPreference(
    IN user_id INT,
    IN notification_type VARCHAR(100),
    OUT is_enabled BOOLEAN
)
BEGIN
    SELECT IFNULL(uep.is_enabled, TRUE) INTO is_enabled
    FROM user_email_preferences uep
    WHERE uep.user_id = user_id AND uep.notification_type = notification_type
    LIMIT 1;
    
    IF is_enabled IS NULL THEN
        SET is_enabled = TRUE;
    END IF;
END //
DELIMITER ;
