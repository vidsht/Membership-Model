-- Ensure users table has socialMediaFollowed column
-- This script will add the column if it doesn't exist

-- Check if socialMediaFollowed column exists, if not add it
SET @exist := (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = 'membership_db' 
               AND table_name = 'users' 
               AND column_name = 'socialMediaFollowed');

SET @sqlstmt := IF(@exist > 0, 
                   'SELECT "socialMediaFollowed column already exists"', 
                   'ALTER TABLE users ADD COLUMN socialMediaFollowed JSON DEFAULT NULL');

PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure admin_settings has all social media settings
INSERT IGNORE INTO admin_settings (category, setting_key, setting_value, data_type) VALUES
('features', 'show_social_media_home', 'true', 'boolean'),
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
('social_media', 'home_section_title', 'Join Our Community', 'string'),
('social_media', 'home_section_subtitle', 'Stay connected with the Indians in Ghana community', 'string');
