const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

async function createCommunitiesTable() {
  const connection = mysql.createConnection(dbConfig);
  
  try {
    console.log('Creating communities table...');
    
    // Create communities table
    await connection.promise().execute(`
      CREATE TABLE IF NOT EXISTS communities (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        isActive BOOLEAN DEFAULT TRUE,
        sortOrder INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_active (isActive)
      )
    `);
    
    console.log('✅ Communities table created');
    
    // Insert default communities
    const communities = [
      ['Gujarati', 'Gujarati community', 1],
      ['Punjabi', 'Punjabi community', 2],
      ['Tamil', 'Tamil community', 3],
      ['Bengali', 'Bengali community', 4],
      ['Hindi', 'Hindi speaking community', 5],
      ['Marathi', 'Marathi community', 6],
      ['Telugu', 'Telugu community', 7],
      ['Kannada', 'Kannada community', 8],
      ['Malayalam', 'Malayalam community', 9],
      ['Sindhi', 'Sindhi community', 10],
      ['Rajasthani', 'Rajasthani community', 11],
      ['Other Indian', 'Other Indian communities', 12],
      ['Mixed Heritage', 'Mixed heritage background', 13]
    ];
    
    for (const [name, description, sortOrder] of communities) {
      try {
        await connection.promise().execute(
          'INSERT IGNORE INTO communities (name, description, sortOrder) VALUES (?, ?, ?)',
          [name, description, sortOrder]
        );
      } catch (error) {
        console.log(`⚠️ Community ${name} might already exist`);
      }
    }
    
    console.log('✅ Default communities inserted');
    
    // Check final state
    const [result] = await connection.promise().execute('SELECT COUNT(*) as count FROM communities');
    console.log(`📊 Total communities: ${result[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating communities table:', error);
  } finally {
    connection.end();
  }
}

createCommunitiesTable();
