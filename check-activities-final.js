const mysql = require('mysql2/promise');

async function checkActivities() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin123',
    database: 'membership_db'
  });
  
  try {
    const [results] = await connection.execute('SELECT COUNT(*) as count FROM activities');
    console.log('Total activities in database:', results[0].count);
    
    const [activityTypes] = await connection.execute('SELECT type, COUNT(*) as count FROM activities GROUP BY type ORDER BY count DESC');
    console.log('\nActivity types breakdown:');
    activityTypes.forEach(row => {
      console.log(`- ${row.type}: ${row.count}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkActivities();