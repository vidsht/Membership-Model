const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'membership_db'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL database');

  connection.query('DESCRIBE activities', (err, results) => {
    if (err) {
      console.error('Error describing table:', err);
    } else {
      console.log('Activities table structure:');
      console.table(results);
    }
    connection.end();
  });
});