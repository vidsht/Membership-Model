const db = require('./db');

console.log('🔧 Creating settings table and adding social media data...');

// Create settings table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  \`key\` VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  section VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`;

db.query(createTableSQL, (err) => {
  if (err) {
    console.error('❌ Error creating settings table:', err);
    process.exit(1);
  }
  
  console.log('✅ Settings table created successfully');
  
  // Add initial social media settings
  const initialSettings = [
    // Feature toggles
    ['featureToggles.show_social_media_home', 'true', 'featureToggles'],
    ['featureToggles.show_statistics', 'true', 'featureToggles'], 
    ['featureToggles.business_directory', 'true', 'featureToggles'],
    
    // Social media requirements
    ['socialMediaRequirements.home_section_title', 'Join Our Community', 'socialMediaRequirements'],
    ['socialMediaRequirements.home_section_subtitle', 'Stay connected with the Indians in Ghana community through our social channels', 'socialMediaRequirements'],
    
    // WhatsApp Channel
    ['socialMediaRequirements.whatsapp_channel', JSON.stringify({
      url: 'https://whatsapp.com/channel/0029VaDfCH74xoA7F3iFv43x',
      display: {
        name: 'WhatsApp Channel',
        description: 'Get official updates and announcements',
        button: 'Join Channel'
      }
    }), 'socialMediaRequirements'],
    
    // Facebook
    ['socialMediaRequirements.facebook', JSON.stringify({
      url: 'https://facebook.com/indiansinghana',
      display: {
        name: 'Facebook',
        description: 'Follow us for community updates and events', 
        button: 'Like & Follow'
      }
    }), 'socialMediaRequirements'],
    
    // Instagram  
    ['socialMediaRequirements.instagram', JSON.stringify({
      url: 'https://instagram.com/indiansinghana',
      display: {
        name: 'Instagram',
        description: 'See photos and stories from our community',
        button: 'Follow Us'
      }
    }), 'socialMediaRequirements'],
    
    // YouTube
    ['socialMediaRequirements.youtube', JSON.stringify({
      url: 'https://youtube.com/@indiansinghana',
      display: {
        name: 'YouTube', 
        description: 'Watch our community events and tutorials',
        button: 'Subscribe Now'
      }
    }), 'socialMediaRequirements'],
    
    // Content
    ['content.terms_conditions', 'By using this service, you agree to abide by all rules and regulations set forth by the Indians in Ghana community. Membership benefits are subject to change without prior notice.', 'content']
  ];
  
  // Insert all settings
  let completed = 0;
  initialSettings.forEach(([key, value, section]) => {
    const insertSQL = 'INSERT INTO settings (\`key\`, value, section) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()';
    
    db.query(insertSQL, [key, value, section, value], (err) => {
      if (err) {
        console.error(`❌ Error inserting ${key}:`, err);
      } else {
        console.log(`✅ Added setting: ${key}`);
      }
      
      completed++;
      if (completed === initialSettings.length) {
        console.log('\n🎉 All settings added successfully!');
        
        // Verify the data
        db.query('SELECT * FROM settings ORDER BY section, \`key\`', (err, results) => {
          if (err) {
            console.error('Error verifying:', err);
          } else {
            console.log('\n📊 Final settings table:');
            console.table(results);
          }
          process.exit();
        });
      }
    });
  });
});
