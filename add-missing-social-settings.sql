-- Add missing social media settings
INSERT IGNORE INTO admin_settings (category, setting_key, setting_value, data_type) VALUES
-- Show social media home section toggle
('features', 'show_social_media_home', 'true', 'boolean'),

-- Social media display settings for home section
('social_media', 'home_section_title', 'Join Our Community', 'string'),
('social_media', 'home_section_subtitle', 'Stay connected with the Indians in Ghana community through our social channels', 'string'),

-- Facebook display settings
('social_media', 'facebook_display_name', 'Facebook', 'string'),
('social_media', 'facebook_display_description', 'Follow us for community updates and events', 'string'),
('social_media', 'facebook_display_button', 'Like & Follow', 'string'),

-- Instagram display settings
('social_media', 'instagram_display_name', 'Instagram', 'string'),
('social_media', 'instagram_display_description', 'See photos and stories from our community', 'string'),
('social_media', 'instagram_display_button', 'Follow Us', 'string'),

-- YouTube display settings
('social_media', 'youtube_display_name', 'YouTube', 'string'),
('social_media', 'youtube_display_description', 'Watch our community events and tutorials', 'string'),
('social_media', 'youtube_display_button', 'Subscribe Now', 'string'),

-- WhatsApp Channel display settings
('social_media', 'whatsapp_channel_display_name', 'WhatsApp Channel', 'string'),
('social_media', 'whatsapp_channel_display_description', 'Get official updates and announcements', 'string'),
('social_media', 'whatsapp_channel_display_button', 'Join Channel', 'string'),

-- WhatsApp Group display settings
('social_media', 'whatsapp_group_display_name', 'WhatsApp Group', 'string'),
('social_media', 'whatsapp_group_display_description', 'Join community discussions', 'string'),
('social_media', 'whatsapp_group_display_button', 'Join Group', 'string');
