// Check user/membership plans in database
const db = require('./backend/db');

function checkUserPlans() {
  console.log('Checking user/membership plans...\n');

  db.query(`
    SELECT id, name, \`key\`, type, priority, price, currency, isActive, dealAccess, features
    FROM plans 
    WHERE type IN ('user', 'membership') OR \`key\` IN ('community', 'silver', 'gold')
    ORDER BY priority ASC
  `, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return;
    }

    console.log('User/Membership Plans Found:', results.length);
    results.forEach(plan => {
      console.log(`- ID: ${plan.id}, Name: ${plan.name}, Key: ${plan.key}, Type: ${plan.type}, Priority: ${plan.priority}, Active: ${plan.isActive}`);
    });

    // Also check all plans to see what we have
    console.log('\nAll Plans:');
    db.query('SELECT id, name, `key`, type, priority FROM plans ORDER BY type, priority', (err2, allResults) => {
      if (err2) {
        console.error('Error getting all plans:', err2);
        return;
      }

      allResults.forEach(plan => {
        console.log(`- ID: ${plan.id}, Name: ${plan.name}, Key: ${plan.key}, Type: ${plan.type}, Priority: ${plan.priority}`);
      });

      db.end();
    });
  });
}

checkUserPlans();
