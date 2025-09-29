/**
 * Check Database Schema for Accurate Column Names
 */

const mysql = require('mysql2');
require('dotenv').config();

async function checkSchema() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const tables = ['businesses', 'deals'];
    
    for (const table of tables) {
      console.log(`\n📋 ${table.toUpperCase()} TABLE COLUMNS:`);
      console.log('=' .repeat(40));
      
      const columns = await new Promise((resolve, reject) => {
        connection.query(
          `DESCRIBE ${table}`,
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });

      columns.forEach(col => {
        console.log(`   ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    connection.end();
  }
}

checkSchema();