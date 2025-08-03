const db = require('./db');

// Check the current structure of deal_redemptions table
const checkTableStructure = () => {
  console.log('Checking deal_redemptions table structure...');
  
  db.query('DESCRIBE deal_redemptions', (err, results) => {
    if (err) {
      console.error('Error checking table structure:', err);
      return;
    }
    
    console.log('deal_redemptions table structure:');
    console.table(results);
    
    // Check if the table exists and has data
    db.query('SELECT COUNT(*) as count FROM deal_redemptions', (countErr, countResults) => {
      if (countErr) {
        console.error('Error counting records:', countErr);
      } else {
        console.log(`Total redemptions in table: ${countResults[0].count}`);
      }
      
      // Check deals table structure too
      db.query('DESCRIBE deals', (dealsErr, dealsResults) => {
        if (dealsErr) {
          console.error('Error checking deals table structure:', dealsErr);
        } else {
          console.log('\ndeals table structure:');
          console.table(dealsResults);
        }
        
        process.exit(0);
      });
    });
  });
};

checkTableStructure();
