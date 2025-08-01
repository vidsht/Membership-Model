const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

(async () => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    connection.connect((err) => {
      if (err) {
        console.error('Connection failed:', err);
        return;
      }
      
      // Create admin user
      const insertAdminQuery = 'INSERT INTO users (fullName, email, password, userType, status, membership, adminRole, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const adminValues = [
        'Admin User',
        'admin@example.com',
        hashedPassword,
        'admin',
        'approved',
        'basic',
        'super_admin',
        JSON.stringify(['all'])
      ];
      
      connection.query(insertAdminQuery, adminValues, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            console.log('Admin user already exists');
          } else {
            console.error('Insert failed:', err);
          }
        } else {
          console.log('Admin user created:', result.insertId);
        }
        connection.end();
      });
    });
  } catch (error) {
    console.error('Error:', error);
  }
})();
