const db = require('./db');

db.query('SHOW TABLES LIKE "admin_settings"', (err, result) => {
  if (err) {
    console.error('Error checking table:', err);
    process.exit(1);
  }
  
  console.log('Table admin_settings exists:', result.length > 0);
  
  if (result.length === 0) {
    console.log('Creating admin_settings table...');
    
    const createTableSQL = `
    CREATE TABLE admin_settings (
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
        console.error('Error creating table:', err);
        process.exit(1);
      }
      console.log('Table created successfully!');
      process.exit(0);
    });
  } else {
    console.log('Table already exists!');
    process.exit(0);
  }
});
