const db = require('./backend/db');

// Check if any deals have applicableLocations data
console.log('🔍 Checking existing deals for applicableLocations data...');

db.query('SELECT id, title, applicableLocations, status, created_at FROM deals WHERE applicableLocations IS NOT NULL AND applicableLocations != "" ORDER BY created_at DESC LIMIT 10', (err, results) => {
  if (err) {
    console.error('❌ Error querying deals:', err);
  } else {
    if (results.length > 0) {
      console.log('✅ Found deals with applicableLocations data:');
      results.forEach(deal => {
        console.log(`  ID: ${deal.id}, Title: "${deal.title}", Locations: "${deal.applicableLocations}", Status: ${deal.status}`);
      });
    } else {
      console.log('❌ No deals found with applicableLocations data');
      console.log('🔍 This suggests the frontend form is not saving this field properly');
    }
    
    // Check all deals to see the pattern
    db.query('SELECT COUNT(*) as total, SUM(CASE WHEN applicableLocations IS NOT NULL AND applicableLocations != "" THEN 1 ELSE 0 END) as withLocations FROM deals', (err, counts) => {
      if (err) {
        console.error('❌ Error getting deal counts:', err);
      } else {
        console.log(`\n📊 Deal Statistics:`);
        console.log(`  Total deals: ${counts[0].total}`);
        console.log(`  Deals with locations: ${counts[0].withLocations}`);
        console.log(`  Deals without locations: ${counts[0].total - counts[0].withLocations}`);
        
        if (counts[0].withLocations === 0 && counts[0].total > 0) {
          console.log('🚨 ISSUE CONFIRMED: No existing deals have applicableLocations data saved');
          console.log('💡 This means the frontend form submission is not properly sending this field');
        }
      }
      process.exit(0);
    });
  }
});