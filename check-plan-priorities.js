const db = require('./backend/db');

db.query("SELECT name, `key`, priority, type FROM plans WHERE type = 'user' ORDER BY priority ASC", (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Current User Plan Priorities:');
    result.forEach(plan => {
      console.log(`  ${plan.name} (${plan.key}): Priority ${plan.priority}`);
    });
  }
  process.exit();
});
