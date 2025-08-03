const db = require('./db');
const fs = require('fs');

const sql = fs.readFileSync('../database_settings_table.sql', 'utf8');

db.query(sql, (err, result) => {
  if (err) {
    console.error('Error creating settings table:', err);
    process.exit(1);
  }
  console.log('Admin settings table created and populated successfully!');
  process.exit(0);
});
