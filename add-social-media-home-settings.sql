-- Add social media home page display settings
INSERT INTO admin_settings (category, setting_key, setting_value, data_type) VALUES
-- Social Media Home Display Settings
('features', 'show_social_media_home', 'true', 'boolean'),
('social_media', 'home_section_title', 'Join Our Community', 'string'),
('social_media', 'home_section_subtitle', 'Stay connected with the Indians in Ghana community through our social channels', 'string'),

-- Social Media Platform Display Settings
('social_media', 'whatsapp_channel_display_name', 'WhatsApp Channel', 'string'),
('social_media', 'whatsapp_channel_display_description', 'Get official updates and announcements', 'string'),
('social_media', 'whatsapp_channel_display_button', 'Join Channel', 'string'),

('social_media', 'facebook_display_name', 'Facebook', 'string'),
('social_media', 'facebook_display_description', 'Follow us for community updates and events', 'string'),
('social_media', 'facebook_display_button', 'Like & Follow', 'string'),

('social_media', 'instagram_display_name', 'Instagram', 'string'),
('social_media', 'instagram_display_description', 'See photos and stories from our community', 'string'),
('social_media', 'instagram_display_button', 'Follow Us', 'string'),

('social_media', 'youtube_display_name', 'YouTube', 'string'),
('social_media', 'youtube_display_description', 'Watch our community events and tutorials', 'string'),
('social_media', 'youtube_display_button', 'Subscribe Now', 'string')

ON DUPLICATE KEY UPDATE 
setting_value = VALUES(setting_value);
