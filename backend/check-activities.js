const db = require('./db');

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

const checkActivities = async () => {
  try {
    const results = await queryAsync('SELECT type, title, COUNT(*) as count FROM activities GROUP BY type, title ORDER BY count DESC');
    console.log('Activity types in database:');
    results.forEach(row => {
      console.log(`${row.type}: ${row.title} (${row.count})`);
    });
    
    console.log('\nTotal activities:', results.reduce((sum, row) => sum + row.count, 0));
  } catch (error) {
    console.error('Error checking activities:', error);
  } finally {
    process.exit(0);
  }
};

checkActivities();