const db = require('./db');

console.log('🔍 Checking database structure for missing columns...\n');

// Check businesses table
db.query('DESCRIBE businesses', (err, results) => {
  if (err) {
    console.error('❌ Error checking businesses table:', err);
  } else {
    console.log('📋 Businesses table columns:');
    results.forEach(row => {
      console.log(`  ${row.Field} (${row.Type})`);
    });
    console.log('');
  }
  
  // Check if we have all necessary business columns
  const requiredBusinessColumns = [
    'businessId', 'businessName', 'businessCategory', 'businessAddress',
    'businessPhone', 'businessEmail', 'businessDescription', 'businessWebsite',
    'isVerified', 'status', 'created_at', 'updated_at'
  ];
  
  const existingColumns = results.map(row => row.Field);
  const missingColumns = requiredBusinessColumns.filter(col => !existingColumns.includes(col));
  
  if (missingColumns.length > 0) {
    console.log('❌ Missing business columns:', missingColumns);
    console.log('SQL to add missing columns:');
    missingColumns.forEach(col => {
      let sqlType = 'VARCHAR(255)';
      if (col.includes('created_at') || col.includes('updated_at')) sqlType = 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
      if (col === 'isVerified') sqlType = 'TINYINT(1) DEFAULT 0';
      if (col === 'businessDescription') sqlType = 'TEXT';
      console.log(`ALTER TABLE businesses ADD COLUMN ${col} ${sqlType};`);
    });
  } else {
    console.log('✅ All required business columns present');
  }
  
  process.exit(0);
});
