-- Email Notification System Database Schema
-- For Indians in Ghana Membership Platform

-- Table for email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject_template VARCHAR(500) NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    category ENUM('user', 'merchant', 'admin') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_template_name (template_name),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);

-- Table for logging email notifications
CREATE TABLE IF NOT EXISTS email_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    template_name VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'delivered', 'bounced') DEFAULT 'pending',
    message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    data TEXT COMMENT 'JSON data for template variables',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_template (template_name),
    INDEX idx_recipient (recipient_email),
    INDEX idx_sent_at (sent_at)
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

-- Table for email analytics
CREATE TABLE IF NOT EXISTS email_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    emails_sent INT DEFAULT 0,
    emails_delivered INT DEFAULT 0,
    emails_failed INT DEFAULT 0,
    emails_bounced INT DEFAULT 0,
    open_rate DECIMAL(5,2) DEFAULT 0.00,
    click_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_template_date (template_name, date),
    INDEX idx_template_name (template_name),
    INDEX idx_date (date)
);

-- Insert default email templates
INSERT IGNORE INTO email_templates (template_name, subject_template, html_template, text_template, category) VALUES
('user_welcome', 'Welcome to Indians in Ghana Community! 🇮🇳', '<h1>Welcome {{firstName}}!</h1><p>Thank you for joining Indians in Ghana.</p>', 'Welcome {{firstName}}! Thank you for joining Indians in Ghana.', 'user'),
('merchant_welcome', 'Welcome to Indians in Ghana Merchant Program! 🏪', '<h1>Welcome {{businessName}}!</h1><p>Your merchant account is ready.</p>', 'Welcome {{businessName}}! Your merchant account is ready.', 'merchant'),
('deal_created', 'New Deal Posted: {{dealTitle}} 🎉', '<h1>New Deal Available!</h1><p>{{dealTitle}} - {{description}}</p>', 'New Deal: {{dealTitle}} - {{description}}', 'user'),
('deal_approved', 'Your Deal Has Been Approved! ✅', '<h1>Congratulations!</h1><p>Your deal "{{dealTitle}}" has been approved.</p>', 'Your deal "{{dealTitle}}" has been approved.', 'merchant'),
('deal_rejected', 'Deal Update Required 📝', '<h1>Deal Needs Updates</h1><p>Your deal "{{dealTitle}}" requires changes.</p>', 'Your deal "{{dealTitle}}" requires changes.', 'merchant'),
('plan_expiry_warning', 'Plan Expiring Soon! ⏰', '<h1>Plan Expiring</h1><p>Your {{planType}} plan expires on {{expiryDate}}.</p>', 'Your {{planType}} plan expires on {{expiryDate}}.', 'merchant'),
('redemption_requested', 'New Redemption Request 🎫', '<h1>Redemption Request</h1><p>Customer: {{customerName}} wants to redeem: {{dealTitle}}</p>', 'New redemption request from {{customerName}} for {{dealTitle}}', 'merchant'),
('redemption_approved', 'Redemption Approved! 🎉', '<h1>Redemption Confirmed</h1><p>Your redemption for {{dealTitle}} has been approved.</p>', 'Your redemption for {{dealTitle}} has been approved.', 'user'),
('password_reset', 'Password Reset Request 🔐', '<h1>Reset Your Password</h1><p>Click here to reset: {{resetLink}}</p>', 'Reset your password: {{resetLink}}', 'user'),
('profile_approved', 'Profile Approved! ✅', '<h1>Welcome Aboard!</h1><p>Your profile has been approved.</p>', 'Your profile has been approved.', 'user'),
('monthly_limit_renewed', 'Monthly Deal Limits Renewed 🔄', '<h1>Limits Renewed</h1><p>Your monthly deal limits have been renewed.</p>', 'Your monthly deal limits have been renewed.', 'merchant'),
('admin_new_registration', 'New User Registration 👤', '<h1>New Registration</h1><p>{{fullName}} has registered.</p>', 'New registration: {{fullName}}', 'admin'),
('admin_new_merchant', 'New Merchant Application 🏪', '<h1>New Merchant</h1><p>{{businessName}} has applied.</p>', 'New merchant application: {{businessName}}', 'admin'),
('admin_deal_review', 'Deal Requires Review 📋', '<h1>Deal Review</h1><p>{{dealTitle}} needs review.</p>', 'Deal needs review: {{dealTitle}}', 'admin'),
('security_alert', 'Security Alert 🔒', '<h1>Security Alert</h1><p>{{alertMessage}}</p>', 'Security Alert: {{alertMessage}}', 'user'),
('plan_purchase_confirmation', 'Plan Purchase Confirmed! 💳', '<h1>Purchase Confirmed</h1><p>{{planName}} plan activated.</p>', 'Your {{planName}} plan has been activated.', 'merchant'),
('payment_reminder', 'Payment Reminder 💰', '<h1>Payment Due</h1><p>Your payment of {{amount}} is due on {{dueDate}}.</p>', 'Payment reminder: {{amount}} due on {{dueDate}}', 'merchant'),
('account_status_update', 'Account Status Update 📢', '<h1>Account Update</h1><p>Your account status: {{status}}</p>', 'Account status update: {{status}}', 'user'),
('redemption_rejected', 'Redemption Update 📝', '<h1>Redemption Response</h1><p>{{message}}</p>', 'Redemption update: {{message}}', 'user'),
('deal_expiry_warning', 'Deal Expiring Soon! ⏰', '<h1>Deal Expiring</h1><p>{{dealTitle}} expires on {{expiryDate}}</p>', 'Deal expiring: {{dealTitle}} on {{expiryDate}}', 'user'),
('monthly_report', 'Monthly Report 📊', '<h1>Monthly Report</h1><p>Your performance summary is ready.</p>', 'Your monthly report is ready.', 'merchant'),
('system_maintenance', 'System Maintenance Notice 🔧', '<h1>Maintenance Notice</h1><p>{{message}}</p>', 'System maintenance: {{message}}', 'admin'),
('performance_report', 'Performance Report 📈', '<h1>Performance Report</h1><p>{{reportSummary}}</p>', 'Performance report: {{reportSummary}}', 'merchant');

-- Insert default user preferences for existing users (if any)
INSERT IGNORE INTO user_email_preferences (user_id, notification_type, is_enabled)
SELECT u.id, 'welcome', TRUE FROM users u
ON DUPLICATE KEY UPDATE is_enabled = is_enabled;

INSERT IGNORE INTO user_email_preferences (user_id, notification_type, is_enabled)
SELECT u.id, 'deals', TRUE FROM users u
ON DUPLICATE KEY UPDATE is_enabled = is_enabled;

INSERT IGNORE INTO user_email_preferences (user_id, notification_type, is_enabled)
SELECT u.id, 'redemptions', TRUE FROM users u
ON DUPLICATE KEY UPDATE is_enabled = is_enabled;
