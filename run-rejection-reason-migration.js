const fs = require('fs');
const path = require('path');
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

async function runMigration() {
  try {
    console.log('🔄 Running database migration for rejection_reason column...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-rejection-reason-column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
        await queryAsync(statement.trim());
        console.log('✅ Success');
      }
    }

    console.log('\n✅ Migration completed successfully!');
    
    // Verify the schema
    console.log('\n🔍 Verifying schema...');
    const schema = await queryAsync('DESCRIBE deal_redemptions');
    
    const hasRejectionReason = schema.some(col => col.Field === 'rejection_reason');
    const hasUpdatedAt = schema.some(col => col.Field === 'updated_at');
    
    console.log(`✅ rejection_reason column exists: ${hasRejectionReason}`);
    console.log(`✅ updated_at column exists: ${hasUpdatedAt}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    process.exit(0);
  }
}

runMigration();
