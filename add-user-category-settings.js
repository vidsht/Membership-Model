const db = require('./backend/db');

const userCategorySettings = [
  ['user_categories', 'available_categories', 'Individual,Business Owner,Professional,Student,Retiree', 'string'],
  ['user_categories', 'default_category', 'Individual', 'string'],
  ['user_categories', 'category_required', 'true', 'boolean'],
  ['user_categories', 'show_in_profile', 'true', 'boolean']
];

const insertSQL = `INSERT IGNORE INTO admin_settings (category, setting_key, setting_value, data_type) VALUES ?`;

db.query(insertSQL, [userCategorySettings], (err, result) => {
  if (err) {
    console.error('Error inserting user category settings:', err);
    process.exit(1);
  }
  console.log(`✅ Inserted ${result.affectedRows} user category settings!`);
  
  // Display current user category settings
  const selectSQL = `SELECT * FROM admin_settings WHERE category = 'user_categories'`;
  db.query(selectSQL, (err, results) => {
    if (err) {
      console.error('Error fetching settings:', err);
    } else {
      console.log('\n📊 Current user category settings:');
      results.forEach(setting => {
        console.log(`   ${setting.setting_key}: ${setting.setting_value}`);
      });
    }
    process.exit(0);
  });
});