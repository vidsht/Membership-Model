const mysql = require('mysql2');

const dbConfig = {
  host: 'auth-db1388.hstgr.io',
  user: 'u214148440_SachinHursale',
  password: 'Membership@2025',
  database: 'u214148440_membership01'
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('Connection failed:', err);
    return;
  }
  
  console.log('=== CHECKING EXISTING PLAN-RELATED STRUCTURE ===\n');
  
  // Check plans table
  connection.query('DESCRIBE plans', (err, res) => {
    if (err) {
      console.log('Plans table does not exist');
    } else {
      console.log('PLANS TABLE COLUMNS:');
      res.forEach(r => console.log(`  ${r.Field} (${r.Type}) - Default: ${r.Default}`));
    }
    
    // Check users table for plan-related columns
    connection.query('DESCRIBE users', (err, res) => {
      console.log('\nUSERS TABLE PLAN-RELATED COLUMNS:');
      res.filter(r => 
        r.Field.includes('plan') || 
        r.Field.includes('membership') || 
        r.Field.includes('validation') || 
        r.Field.includes('deal') ||
        r.Field.includes('limit')
      ).forEach(r => console.log(`  ${r.Field} (${r.Type}) - Default: ${r.Default}`));
      
      // Check businesses table for plan-related columns
      connection.query('DESCRIBE businesses', (err, res) => {
        console.log('\nBUSINESSES TABLE PLAN-RELATED COLUMNS:');
        res.filter(r => 
          r.Field.includes('plan') || 
          r.Field.includes('membership') || 
          r.Field.includes('deal') ||
          r.Field.includes('limit')
        ).forEach(r => console.log(`  ${r.Field} (${r.Type}) - Default: ${r.Default}`));
        
        // Check deals table for plan-related columns
        connection.query('DESCRIBE deals', (err, res) => {
          console.log('\nDEALS TABLE PLAN-RELATED COLUMNS:');
          res.filter(r => 
            r.Field.includes('plan') || 
            r.Field.includes('level') || 
            r.Field.includes('required') ||
            r.Field.includes('priority')
          ).forEach(r => console.log(`  ${r.Field} (${r.Type}) - Default: ${r.Default}`));
          
          // Check existing plans data
          connection.query('SELECT * FROM plans LIMIT 5', (err, plans) => {
            console.log('\nEXISTING PLANS DATA:');
            if (err) {
              console.log('No plans data available');
            } else {
              plans.forEach(plan => {
                console.log(`  ID: ${plan.id}, Key: ${plan.key}, Name: ${plan.name}, Type: ${plan.type}`);
              });
            }
            
            connection.end();
          });
        });
      });
    });
  });
});
