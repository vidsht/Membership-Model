const db = require('./db');

console.log('🔍 Checking dynamic fields in database...');

// Check if settings table exists
db.query('SHOW TABLES LIKE "settings"', (err, tables) => {
  if (err) {
    console.error('❌ Error checking settings table:', err);
    process.exit(1);
  }
  
  if (tables.length === 0) {
    console.log('❌ Settings table does not exist');
    process.exit(1);
  }
  
  console.log('✅ Settings table exists');
  
  // Check dynamic fields data
  db.query('SELECT * FROM settings WHERE section = "dynamicFields" ORDER BY `key`', (err, results) => {
    if (err) {
      console.error('❌ Error fetching dynamic fields:', err);
      process.exit(1);
    }
    
    console.log('\n📊 Dynamic Fields in Database:');
    console.log('='.repeat(50));
    
    if (results.length === 0) {
      console.log('❌ No dynamic fields found in database');
    } else {
      results.forEach(row => {
        console.log(`\n🔑 Key: ${row.key}`);
        console.log(`📝 Section: ${row.section}`);
        try {
          const data = JSON.parse(row.value);
          console.log(`📊 Items: ${data.length}`);
          console.log(`📄 Sample: ${data.slice(0, 2).map(item => item.name || item.label).join(', ')}`);
        } catch (e) {
          console.log(`❌ Invalid JSON: ${row.value.substring(0, 100)}...`);
        }
      });
    }
    
    // Check if other related tables exist
    console.log('\n🔍 Checking related tables...');
    
    const tableChecks = [
      'communities',
      'user_types', 
      'business_categories',
      'deal_categories'
    ];
    
    let completed = 0;
    tableChecks.forEach(tableName => {
      db.query(`SHOW TABLES LIKE "${tableName}"`, (err, tableResult) => {
        if (!err && tableResult.length > 0) {
          db.query(`SELECT COUNT(*) as count FROM ${tableName}`, (countErr, countResult) => {
            if (!countErr) {
              console.log(`✅ Table '${tableName}' exists with ${countResult[0].count} records`);
            }
          });
        } else {
          console.log(`❌ Table '${tableName}' does not exist`);
        }
        
        completed++;
        if (completed === tableChecks.length) {
          console.log('\n✅ Database check completed');
          process.exit(0);
        }
      });
    });
  });
});
