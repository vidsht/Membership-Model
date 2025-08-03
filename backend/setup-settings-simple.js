const db = require('./db');

// Create admin_settings table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    data_type ENUM('string', 'boolean', 'number', 'json') DEFAULT 'string',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_setting (category, setting_key)
)`;

db.query(createTableSQL, (err, result) => {
  if (err) {
    console.error('Error creating settings table:', err);
    process.exit(1);
  }
  console.log('Admin settings table created successfully!');
  
  // Insert default settings
  const insertSettings = [
    ['social_media', 'facebook_required', 'true', 'boolean'],
    ['social_media', 'facebook_url', 'https://facebook.com/indiansinghana', 'string'],
    ['social_media', 'instagram_required', 'true', 'boolean'],
    ['social_media', 'instagram_url', 'https://instagram.com/indians_in_ghana', 'string'],
    ['social_media', 'youtube_required', 'false', 'boolean'],
    ['social_media', 'youtube_url', 'https://youtube.com/indiansinghana', 'string'],
    ['social_media', 'whatsapp_channel_required', 'true', 'boolean'],
    ['social_media', 'whatsapp_channel_url', 'https://whatsapp.com/channel/indiansinghana', 'string'],
    ['social_media', 'whatsapp_group_required', 'false', 'boolean'],
    ['social_media', 'whatsapp_group_url', 'https://chat.whatsapp.com/indiansinghana', 'string'],
    ['system', 'site_name', 'Indians in Ghana', 'string'],
    ['system', 'admin_email', 'admin@indiansinghana.com', 'string'],
    ['system', 'registration_enabled', 'true', 'boolean'],
    ['system', 'maintenance_mode', 'false', 'boolean'],
    ['features', 'deal_management', 'true', 'boolean'],
    ['features', 'plan_management', 'true', 'boolean'],
    ['features', 'user_management', 'true', 'boolean'],
    ['features', 'show_statistics', 'true', 'boolean'],
    ['security', 'session_timeout', '24', 'number'],
    ['security', 'max_login_attempts', '5', 'number'],
    ['content', 'terms_conditions', 'By using this service, you agree to abide by all rules and regulations set forth by the Indians in Ghana community.', 'string'],
    ['card', 'default_layout', 'modern', 'string'],
    ['card', 'show_qr_code', 'true', 'boolean'],
    ['card', 'show_barcode', 'true', 'boolean'],
    ['card', 'allow_download', 'true', 'boolean'],
    ['card', 'allow_share', 'true', 'boolean']
  ];
  
  const insertSQL = `INSERT IGNORE INTO admin_settings (category, setting_key, setting_value, data_type) VALUES ?`;
  
  db.query(insertSQL, [insertSettings], (err, result) => {
    if (err) {
      console.error('Error inserting settings:', err);
      process.exit(1);
    }
    console.log('Default settings inserted successfully!');
    process.exit(0);
  });
});
