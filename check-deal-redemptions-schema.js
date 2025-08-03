const db = require('./backend/db');

// Utility function to promisify db.query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function checkSchemas() {
  try {
    console.log('Checking deal_redemptions table structure...');
    const redemptionsSchema = await queryAsync('DESCRIBE deal_redemptions');
    console.log('deal_redemptions columns:', redemptionsSchema.map(col => col.Field));
    
    console.log('\nChecking deals table structure...');
    const dealsSchema = await queryAsync('DESCRIBE deals');
    console.log('deals columns:', dealsSchema.map(col => col.Field));
    
    console.log('\nChecking businesses table structure...');
    const businessesSchema = await queryAsync('DESCRIBE businesses');
    console.log('businesses columns:', businessesSchema.map(col => col.Field));
    
  } catch (error) {
    console.error('Error checking schemas:', error);
  } finally {
    process.exit(0);
  }
}

checkSchemas();
