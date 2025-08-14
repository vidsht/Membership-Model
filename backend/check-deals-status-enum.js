const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('Connection failed:', err);
    return;
  }
  
  console.log('Checking deals table structure...\n');
  
  connection.query('DESCRIBE deals', (err, results) => {
    if (err) {
      console.error('Query failed:', err);
    } else {
      console.log('Current deals table structure:');
      console.log('Field               | Type                    | Null  | Default');
      console.log('----------------------------------------------------------------');
      results.forEach(row => {
        const field = row.Field.padEnd(18);
        const type = row.Type.padEnd(22);
        const nullable = row.Null.padEnd(5);
        const defaultVal = row.Default || 'NULL';
        console.log(`${field} | ${type} | ${nullable} | ${defaultVal}`);
      });
      
      // Specifically check the status field
      const statusField = results.find(row => row.Field === 'status');
      if (statusField) {
        console.log('\n=== STATUS FIELD DETAILS ===');
        console.log('Type:', statusField.Type);
        console.log('Default:', statusField.Default);
        console.log('Null:', statusField.Null);
        
        // Check if pending_approval is in the enum
        if (statusField.Type.includes('pending_approval')) {
          console.log('✅ pending_approval is supported');
        } else {
          console.log('❌ pending_approval is NOT supported');
          console.log('Supported values:', statusField.Type);
        }
      }
    }
    connection.end();
  });
});
