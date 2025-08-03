const db = require('./backend/db');

async function updatePlanPriorities() {
  try {
    console.log('Updating plan priorities in database...\n');
    
    // Define the priority updates
    const planUpdates = [
      { key: 'silver', priority: 2 },   // Silver plan
      { key: 'gold', priority: 3 },     // Gold plan  
      { key: 'platinum', priority: 4 }  // Platinum plan
    ];
    
    for (const plan of planUpdates) {
      console.log(`Updating ${plan.key} plan to priority ${plan.priority}...`);
      
      const result = await new Promise((resolve, reject) => {
        db.query(
          'UPDATE plans SET priority = ? WHERE `key` = ?', 
          [plan.priority, plan.key], 
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      });
      
      if (result.affectedRows > 0) {
        console.log(`✅ Successfully updated ${plan.key} plan`);
      } else {
        console.log(`❌ No rows affected for ${plan.key} plan`);
      }
    }
    
    console.log('\n✅ Plan priority updates completed!');
    
    // Verify the updates
    console.log('\nVerifying updates...');
    const verifyResult = await new Promise((resolve, reject) => {
      db.query(
        'SELECT `key`, name, priority FROM plans WHERE type = "user" ORDER BY priority', 
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
    
    console.log('Updated plans:');
    verifyResult.forEach(plan => {
      console.log(`  ${plan.key}: ${plan.name} (Priority: ${plan.priority})`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

updatePlanPriorities();
