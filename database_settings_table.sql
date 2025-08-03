-- Create admin_settings table to store all admin configurations
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    data_type ENUM('string', 'boolean', 'number', 'json') DEFAULT 'string',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_setting (category, setting_key)
);

-- Insert default social media settings
INSERT INTO admin_settings (category, setting_key, setting_value, data_type) VALUES
-- Social Media Requirements
('social_media', 'facebook_required', 'true', 'boolean'),
('social_media', 'facebook_url', 'https://facebook.com/indiansinghana', 'string'),
('social_media', 'instagram_required', 'true', 'boolean'),
('social_media', 'instagram_url', 'https://instagram.com/indians_in_ghana', 'string'),
('social_media', 'youtube_required', 'false', 'boolean'),
('social_media', 'youtube_url', 'https://youtube.com/indiansinghana', 'string'),
('social_media', 'whatsapp_channel_required', 'true', 'boolean'),
('social_media', 'whatsapp_channel_url', 'https://whatsapp.com/channel/indiansinghana', 'string'),
('social_media', 'whatsapp_group_required', 'false', 'boolean'),
('social_media', 'whatsapp_group_url', 'https://chat.whatsapp.com/indiansinghana', 'string'),

-- System Settings
('system', 'site_name', 'Indians in Ghana', 'string'),
('system', 'admin_email', 'admin@indiansinghana.com', 'string'),
('system', 'registration_enabled', 'true', 'boolean'),
('system', 'maintenance_mode', 'false', 'boolean'),
('system', 'login_image_url', '', 'string'),
('system', 'language', 'en', 'string'),

-- Feature Toggles
('features', 'deal_management', 'true', 'boolean'),
('features', 'plan_management', 'true', 'boolean'),
('features', 'user_management', 'true', 'boolean'),
('features', 'show_statistics', 'true', 'boolean'),
('features', 'business_directory', 'true', 'boolean'),

-- Security Settings
('security', 'session_timeout', '24', 'number'),
('security', 'max_login_attempts', '5', 'number'),
('security', 'require_email_verification', 'true', 'boolean'),
('security', 'password_min_length', '8', 'number'),

-- Terms and Conditions
('content', 'terms_conditions', 'By using this service, you agree to abide by all rules and regulations set forth by the Indians in Ghana community. Membership benefits are subject to change without prior notice.', 'string'),
('content', 'privacy_policy', '', 'string'),

-- Card Settings
('card', 'default_layout', 'modern', 'string'),
('card', 'show_qr_code', 'true', 'boolean'),
('card', 'show_barcode', 'true', 'boolean'),
('card', 'allow_download', 'true', 'boolean'),
('card', 'allow_share', 'true', 'boolean')

ON DUPLICATE KEY UPDATE 
setting_value = VALUES(setting_value),
updated_at = CURRENT_TIMESTAMP;
