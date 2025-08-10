const db = require('./db');

console.log('🔍 Checking settings table...');

db.query('SELECT * FROM settings ORDER BY section, `key`', (err, results) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log('📊 Settings table data:');
    console.table(results);
    
    console.log('\n🔍 Social Media Requirements:');
    const socialRows = results.filter(r => r.section === 'socialMediaRequirements');
    socialRows.forEach(row => {
      console.log(`${row.key}: ${row.value}`);
    });
    
    console.log('\n🎛️ Feature Toggles:');
    const featureRows = results.filter(r => r.section === 'featureToggles');
    featureRows.forEach(row => {
      console.log(`${row.key}: ${row.value}`);
    });
  }
  process.exit();
});
