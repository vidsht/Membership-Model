const db = require('../db');

console.log('🔧 Adding dynamic fields settings to settings table...');

// Dynamic field options to be stored in settings table
const dynamicFieldSettings = [
  // Communities
  ['dynamicFields.communities', JSON.stringify([
    { name: 'Gujarati', description: 'Gujarati community', isActive: true },
    { name: 'Punjabi', description: 'Punjabi community', isActive: true },
    { name: 'Tamil', description: 'Tamil community', isActive: true },
    { name: 'Bengali', description: 'Bengali community', isActive: true },
    { name: 'Hindi', description: 'Hindi speaking community', isActive: true },
    { name: 'Marathi', description: 'Marathi community', isActive: true },
    { name: 'Telugu', description: 'Telugu community', isActive: true },
    { name: 'Kannada', description: 'Kannada community', isActive: true },
    { name: 'Malayalam', description: 'Malayalam community', isActive: true },
    { name: 'Sindhi', description: 'Sindhi community', isActive: true },
    { name: 'Other Indian', description: 'Other Indian communities', isActive: true }
  ]), 'dynamicFields'],

  // User Types
  ['dynamicFields.userTypes', JSON.stringify([
    { name: 'Professional', description: 'Working professional', isActive: true },
    { name: 'Business Owner', description: 'Business owner or entrepreneur', isActive: true },
    { name: 'Student', description: 'Student', isActive: true },
    { name: 'Homemaker', description: 'Homemaker', isActive: true },
    { name: 'Retired', description: 'Retired person', isActive: true },
    { name: 'Other', description: 'Other profession', isActive: true }
  ]), 'dynamicFields'],

  // Business Categories
  ['dynamicFields.businessCategories', JSON.stringify([
    { name: 'restaurant', label: 'Restaurant & Food', description: 'Restaurants, food services, catering', isActive: true },
    { name: 'retail', label: 'Retail & Shopping', description: 'Retail stores, shopping centers', isActive: true },
    { name: 'services', label: 'Professional Services', description: 'Consulting, legal, accounting, etc.', isActive: true },
    { name: 'healthcare', label: 'Healthcare', description: 'Medical, dental, wellness services', isActive: true },
    { name: 'technology', label: 'Technology', description: 'IT services, software, tech products', isActive: true },
    { name: 'education', label: 'Education', description: 'Schools, training, tutoring', isActive: true },
    { name: 'entertainment', label: 'Entertainment', description: 'Events, media, entertainment services', isActive: true },
    { name: 'automotive', label: 'Automotive', description: 'Car services, repairs, sales', isActive: true },
    { name: 'real_estate', label: 'Real Estate', description: 'Property sales, rentals, management', isActive: true },
    { name: 'finance', label: 'Finance & Insurance', description: 'Banking, insurance, financial services', isActive: true },
    { name: 'travel', label: 'Travel & Tourism', description: 'Travel agencies, hotels, tourism', isActive: true },
    { name: 'other', label: 'Other', description: 'Other business types', isActive: true }
  ]), 'dynamicFields'],

  // Deal Categories
  ['dynamicFields.dealCategories', JSON.stringify([
    { name: 'restaurant', label: 'Restaurant', description: 'Food and dining deals', isActive: true },
    { name: 'retail', label: 'Retail', description: 'Shopping and retail deals', isActive: true },
    { name: 'electronics', label: 'Electronics', description: 'Electronic devices and gadgets', isActive: true },
    { name: 'fashion', label: 'Fashion', description: 'Clothing, accessories, fashion items', isActive: true },
    { name: 'health', label: 'Health & Wellness', description: 'Health, fitness, wellness services', isActive: true },
    { name: 'entertainment', label: 'Entertainment', description: 'Movies, events, entertainment', isActive: true },
    { name: 'travel', label: 'Travel', description: 'Travel packages, hotels, transportation', isActive: true },
    { name: 'education', label: 'Education', description: 'Educational courses, training', isActive: true },
    { name: 'home', label: 'Home & Garden', description: 'Home improvement, gardening, furniture', isActive: true },
    { name: 'services', label: 'Services', description: 'Professional and personal services', isActive: true },
    { name: 'automotive', label: 'Automotive', description: 'Car services, parts, accessories', isActive: true },
    { name: 'technology', label: 'Technology', description: 'Tech products, software, gadgets', isActive: true },
    { name: 'general', label: 'General', description: 'General deals and offers', isActive: true },
    { name: 'other', label: 'Other', description: 'Other categories', isActive: true }
  ]), 'dynamicFields']
];

// Check if settings table exists, if not create it
const checkAndCreateSettingsTable = () => {
  return new Promise((resolve, reject) => {
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
        reject(err);
      } else {
        console.log('✅ Settings table ready');
        resolve();
      }
    });
  });
};

// Insert dynamic field settings
const insertDynamicFieldSettings = async () => {
  return new Promise((resolve, reject) => {
    let completed = 0;
    let hasError = false;

    dynamicFieldSettings.forEach(([key, value, section]) => {
      const insertSQL = 'INSERT INTO settings (\`key\`, value, section) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()';
      
      db.query(insertSQL, [key, value, section, value], (err) => {
        if (err && !hasError) {
          console.error(`❌ Error inserting ${key}:`, err);
          hasError = true;
          reject(err);
          return;
        }
        
        if (!hasError) {
          console.log(`✅ Added dynamic field setting: ${key}`);
          completed++;
          
          if (completed === dynamicFieldSettings.length) {
            resolve();
          }
        }
      });
    });
  });
};

// Main execution
const runMigration = async () => {
  try {
    await checkAndCreateSettingsTable();
    await insertDynamicFieldSettings();
    
    console.log('\n🎉 Dynamic fields settings migration completed successfully!');
    
    // Verify the data
    db.query('SELECT * FROM settings WHERE section = "dynamicFields" ORDER BY \`key\`', (err, results) => {
      if (err) {
        console.error('Error verifying dynamic fields:', err);
      } else {
        console.log('\n📊 Dynamic fields settings:');
        results.forEach(setting => {
          console.log(`  ${setting.key}: ${JSON.parse(setting.value).length} items`);
        });
      }
      process.exit();
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
