-- Fix social media system by adding all missing settings

-- First, ensure the show_social_media_home toggle exists
INSERT IGNORE INTO admin_settings (category, setting_key, setting_value, data_type) VALUES
('features', 'show_social_media_home', 'true', 'boolean');

-- Add complete social media settings for each platform
INSERT IGNORE INTO admin_settings (category, setting_key, setting_value, data_type) VALUES
-- Facebook settings
('social_media', 'facebook_required', 'true', 'boolean'),
('social_media', 'facebook_url', 'https://facebook.com/indiansinghana', 'string'),
('social_media', 'facebook_display_name', 'Facebook', 'string'),
('social_media', 'facebook_display_description', 'Follow us for community updates and events', 'string'),
('social_media', 'facebook_display_button', 'Like & Follow', 'string'),

-- Instagram settings
('social_media', 'instagram_required', 'true', 'boolean'),
('social_media', 'instagram_url', 'https://instagram.com/indians_in_ghana', 'string'),
('social_media', 'instagram_display_name', 'Instagram', 'string'),
('social_media', 'instagram_display_description', 'See photos and stories from our community', 'string'),
('social_media', 'instagram_display_button', 'Follow Us', 'string'),

-- YouTube settings
('social_media', 'youtube_required', 'false', 'boolean'),
('social_media', 'youtube_url', 'https://youtube.com/indiansinghana', 'string'),
('social_media', 'youtube_display_name', 'YouTube', 'string'),
('social_media', 'youtube_display_description', 'Watch our community events and tutorials', 'string'),
('social_media', 'youtube_display_button', 'Subscribe Now', 'string'),

-- WhatsApp Channel settings
('social_media', 'whatsapp_channel_required', 'true', 'boolean'),
('social_media', 'whatsapp_channel_url', 'https://whatsapp.com/channel/indiansinghana', 'string'),
('social_media', 'whatsapp_channel_display_name', 'WhatsApp Channel', 'string'),
('social_media', 'whatsapp_channel_display_description', 'Get official updates and announcements', 'string'),
('social_media', 'whatsapp_channel_display_button', 'Join Channel', 'string'),

-- WhatsApp Group settings
('social_media', 'whatsapp_group_required', 'false', 'boolean'),
('social_media', 'whatsapp_group_url', 'https://chat.whatsapp.com/indiansinghana', 'string'),
('social_media', 'whatsapp_group_display_name', 'WhatsApp Group', 'string'),
('social_media', 'whatsapp_group_display_description', 'Join community discussions', 'string'),
('social_media', 'whatsapp_group_display_button', 'Join Group', 'string'),

-- Home section customization
('social_media', 'home_section_title', 'Join Our Community', 'string'),
('social_media', 'home_section_subtitle', 'Stay connected with the Indians in Ghana community through our social channels', 'string');
