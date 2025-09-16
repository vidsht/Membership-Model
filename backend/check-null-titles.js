const pool = require('./db');
const { promisify } = require('util');
const query = promisify(pool.query).bind(pool);

const checkNullTitles = async () => {
  try {
    console.log('Activities with null titles:');
    const results = await query('SELECT type, COUNT(*) as count FROM activities WHERE title IS NULL GROUP BY type ORDER BY count DESC');
    
    results.forEach(row => {
      console.log(`${row.type}: ${row.count} entries`);
    });
    
    console.log('\nTotal null title activities:', results.reduce((sum, row) => sum + row.count, 0));
  } catch (error) {
    console.error('Error checking null titles:', error);
  } finally {
    process.exit(0);
  }
};

checkNullTitles();