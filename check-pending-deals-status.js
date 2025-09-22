const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('Checking deals by status...\n');

db.query('SELECT status, COUNT(*) as count FROM deals GROUP BY status', (err, results) => {
  if (err) {
    console.error('Error checking deals by status:', err);
  } else {
    console.log('Deal counts by status:');
    results.forEach(row => {
      console.log(`${row.status}: ${row.count}`);
    });
  }
  
  console.log('\nChecking specific pending_approval deals...\n');
  
  db.query('SELECT id, title, status, businessId, created_at FROM deals WHERE status = "pending_approval" ORDER BY created_at DESC LIMIT 10', (err, results) => {
    if (err) {
      console.error('Error checking pending deals:', err);
    } else {
      console.log('Pending deals for approval:');
      if (results.length === 0) {
        console.log('No deals found with pending_approval status');
      } else {
        results.forEach(deal => {
          console.log(`ID: ${deal.id}, Title: ${deal.title}, Status: ${deal.status}, BusinessId: ${deal.businessId}, Created: ${deal.created_at}`);
        });
      }
    }
    
    console.log('\nChecking all deals created by merchants vs admins...\n');
    
    db.query(`
      SELECT 
        d.id, 
        d.title, 
        d.status, 
        d.businessId,
        d.created_at,
        CASE 
          WHEN d.businessId IS NOT NULL THEN 'merchant'
          ELSE 'admin'
        END as created_by
      FROM deals d 
      ORDER BY d.created_at DESC 
      LIMIT 20
    `, (err, results) => {
      if (err) {
        console.error('Error checking deal creators:', err);
      } else {
        console.log('Recent deals by creator:');
        results.forEach(deal => {
          console.log(`ID: ${deal.id}, Title: ${deal.title}, Status: ${deal.status}, Created by: ${deal.created_by}, Date: ${deal.created_at}`);
        });
      }
      
      db.end();
    });
  });
});