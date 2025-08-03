const db = require('./db');

async function updatePlanPriorities() {
  try {
    console.log('Updating plan priorities...');
    
    // Update priorities
    await new Promise((resolve, reject) => {
      db.query('UPDATE plans SET priority = 1 WHERE name = "Silver Hai"', (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Updated Silver priority to 1');
          resolve();
        }
      });
    });
    
    await new Promise((resolve, reject) => {
      db.query('UPDATE plans SET priority = 2 WHERE name = "Gold"', (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Updated Gold priority to 2');
          resolve();
        }
      });
    });
    
    await new Promise((resolve, reject) => {
      db.query('UPDATE plans SET priority = 3 WHERE name = "Platinum"', (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Updated Platinum priority to 3');
          resolve();
        }
      });
    });
    
    // Verify the changes
    db.query('SELECT id, name, priority FROM plans WHERE type = "user" ORDER BY priority', (err, result) => {
      if (err) {
        console.error('Error verifying:', err);
      } else {
        console.log('\nUpdated user plans:');
        console.log(JSON.stringify(result, null, 2));
      }
      process.exit();
    });
    
  } catch (error) {
    console.error('Error updating priorities:', error);
    process.exit(1);
  }
}

updatePlanPriorities();
