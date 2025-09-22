const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'indians_in_ghana'
};

async function checkData() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('🔍 Checking businesses table structure...');
    const [businesses] = await connection.execute('DESCRIBE businesses');
    console.log('Businesses table columns:');
    businesses.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });
    
    console.log('\n🔍 Checking sample business data...');
    const [businessData] = await connection.execute('SELECT * FROM businesses LIMIT 3');
    console.log('Sample businesses:', businessData);
    
    console.log('\n🔍 Checking pending deals...');
    const [pendingDeals] = await connection.execute(`
      SELECT d.id, d.title, d.businessId, d.status, b.businessName
      FROM deals d
      LEFT JOIN businesses b ON d.businessId = b.businessId
      WHERE d.status = 'pending_approval'
      LIMIT 5
    `);
    console.log('Pending deals:', pendingDeals);
    
    console.log('\n🔍 Checking all deals with pending status...');
    const [allPendingDeals] = await connection.execute(`
      SELECT id, title, businessId, status
      FROM deals 
      WHERE status = 'pending_approval'
      LIMIT 5
    `);
    console.log('All pending deals:', allPendingDeals);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkData();