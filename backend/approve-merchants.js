const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: 'auth-db1388.hstgr.io',
  user: 'u214148440_SachinHursale',
  password: 'Membership@2025',
  database: 'u214148440_membership01'
};

// Create connection
const connection = mysql.createConnection(dbConfig);

console.log('Connecting to database...');
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  
  console.log('Connected to database successfully!');
  
  // Check merchant users and their status
  const checkQuery = `
    SELECT u.id, u.fullName, u.userType, u.status, 
           b.businessId, b.businessName, b.status as businessStatus 
    FROM users u 
    LEFT JOIN businesses b ON u.id = b.userId 
    WHERE u.userType = 'merchant' 
    LIMIT 10
  `;
  
  connection.query(checkQuery, (err, results) => {
    if (err) {
      console.error('Error checking merchants:', err);
      connection.end();
      return;
    }
    
    console.log('Current merchant status:');
    console.table(results);
    
    if (results.length > 0) {
      // Approve all pending merchants for testing
      const approveUsersQuery = `UPDATE users SET status = 'approved' WHERE userType = 'merchant' AND status = 'pending'`;
      const approveBusinessesQuery = `UPDATE businesses SET status = 'approved' WHERE status = 'pending'`;
      
      connection.query(approveUsersQuery, (err, result) => {
        if (err) {
          console.error('Error approving users:', err);
        } else {
          console.log(`Approved ${result.affectedRows} merchant users`);
        }
        
        connection.query(approveBusinessesQuery, (err, result) => {
          if (err) {
            console.error('Error approving businesses:', err);
          } else {
            console.log(`Approved ${result.affectedRows} businesses`);
          }
          
          // Check final status
          connection.query(checkQuery, (err, finalResults) => {
            if (err) {
              console.error('Error checking final status:', err);
            } else {
              console.log('Final merchant status:');
              console.table(finalResults);
            }
            connection.end();
          });
        });
      });
    } else {
      console.log('No merchants found');
      connection.end();
    }
  });
});
