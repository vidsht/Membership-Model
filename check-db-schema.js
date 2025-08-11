const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'indians_in_ghana_membership'
};

async function checkTables() {
  const connection = await mysql.createConnection(config);
  
  console.log('=== DEALS TABLE STRUCTURE ===');
  const [dealsColumns] = await connection.execute('DESCRIBE deals');
  dealsColumns.forEach(col => console.log(`${col.Field} - ${col.Type}`));
  
  console.log('\n=== DEAL_REDEMPTIONS TABLE STRUCTURE ===');
  try {
    const [redemptionsColumns] = await connection.execute('DESCRIBE deal_redemptions');
    redemptionsColumns.forEach(col => console.log(`${col.Field} - ${col.Type}`));
  } catch (error) {
    console.log('Table deal_redemptions does not exist or cannot be accessed');
  }
  
  await connection.end();
}

checkTables().catch(console.error);
