const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function checkDealsTable() {
  const connection = mysql.createConnection(dbConfig);
  
  try {
    console.log('Checking deals table structure and data...');
    
    // Check table structure
    const [structure] = await connection.promise().execute('DESCRIBE deals');
    console.log('📋 Deals table structure:');
    structure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
    // Check sample data
    const [deals] = await connection.promise().execute('SELECT id, businessId, title, originalPrice, discountedPrice, validFrom, validUntil FROM deals LIMIT 5');
    console.log('\n📊 Sample deals data:');
    deals.forEach(deal => {
      console.log(`  Deal ${deal.id}: businessId=${deal.businessId}, originalPrice=${deal.originalPrice}, discountedPrice=${deal.discountedPrice}`);
    });
    
    // Check business IDs in businesses table
    const [businesses] = await connection.promise().execute('SELECT businessId, userId, businessName FROM businesses LIMIT 5');
    console.log('\n🏢 Sample businesses data:');
    businesses.forEach(biz => {
      console.log(`  Business: businessId=${biz.businessId}, userId=${biz.userId}, name=${biz.businessName}`);
    });
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    connection.end();
  }
}

checkDealsTable();
