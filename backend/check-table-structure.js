const db = require('./db');

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

const checkTableStructure = async () => {
  try {
    const structure = await queryAsync('DESCRIBE activities');
    console.log('Activities table structure:');
    console.log('===========================');
    structure.forEach(col => {
      console.log(`${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
    });
  } catch (error) {
    console.error('Error checking table structure:', error);
  } finally {
    process.exit(0);
  }
};

checkTableStructure();