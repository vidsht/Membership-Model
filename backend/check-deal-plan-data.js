const db = require('./db');

db.query('SELECT id, title, minPlanPriority, accessLevel, accessLevels FROM deals ORDER BY id DESC LIMIT 5', (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Recent deals with plan data:');
    result.forEach(r => console.log(`ID: ${r.id}, Title: ${r.title}, minPlanPriority: ${r.minPlanPriority}, accessLevel: ${r.accessLevel}, accessLevels: ${r.accessLevels}`));
  }
  process.exit();
});
