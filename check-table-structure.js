const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: 'admin',
      database: 'indians_in_ghana'
    });

    console.log('=== PLANS TABLE STRUCTURE ===');
    const [plansColumns] = await connection.execute('DESCRIBE plans');
    plansColumns.forEach(col => console.log(col.Field + ' - ' + col.Type));

    console.log('\n=== BUSINESSES TABLE STRUCTURE ===');
    const [businessColumns] = await connection.execute('DESCRIBE businesses');
    businessColumns.forEach(col => console.log(col.Field + ' - ' + col.Type));

    console.log('\n=== SAMPLE PLANS DATA ===');
    const [plans] = await connection.execute('SELECT id, name, max_deals_per_month, type FROM plans WHERE type = "merchant" LIMIT 3');
    console.log(plans);

    connection.end();
  } catch (error) {
    console.error('Database check error:', error.message);
  }
}

checkTables();
