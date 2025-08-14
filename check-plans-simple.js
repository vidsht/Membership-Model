const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'membership_system'
});

console.log('Checking plans in database...');

connection.query('SELECT COUNT(*) as count FROM plans', (err, results) => {
  if (err) {
    console.error('Error:', err.message);
    return;
  }
  
  console.log('Total plans in database:', results[0].count);
  
  connection.query('SELECT id, name, type, isActive FROM plans', (err2, plans) => {
    if (err2) {
      console.error('Error fetching plans:', err2.message);
      return;
    }
    
    console.log('All plans:');
    plans.forEach(plan => {
      console.log(`- ${plan.name} (${plan.type}) - Active: ${plan.isActive}`);
    });
    
    connection.end();
  });
});
