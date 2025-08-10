const mysql = require('mysql2/promise');

async function checkBusinessTableAndPlans() {
  try {
    // Use environment variables or hardcoded connection for testing
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'srv1429.hstgr.io',
      user: process.env.DB_USER || 'u749262054_ronak',
      password: process.env.DB_PASSWORD || 'Welcome@2024',
      database: process.env.DB_NAME || 'u749262054_membership_club'
    });

    console.log('Checking business table structure...');
    
    // Check if businesses table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'businesses'");
    console.log('Businesses table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Show businesses table structure
      const [columns] = await connection.execute("DESCRIBE businesses");
      console.log('Businesses table structure:', columns.map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        key: col.Key,
        default: col.Default
      })));
    }

    // Check users table for recent merchants
    const [users] = await connection.execute(`
      SELECT id, fullName, email, userType, currentPlan, status, createdAt 
      FROM users 
      WHERE userType = 'merchant' 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);
    console.log('Recent merchants:', users);

    // Check plans table
    const [plans] = await connection.execute(`
      SELECT \`key\`, name, type, price, billingCycle, currency, isActive 
      FROM plans 
      WHERE type = 'merchant' AND isActive = TRUE
    `);
    console.log('Available merchant plans:', plans);

    await connection.end();
  } catch (error) {
    console.error('Error checking database:', error.message);
  }
}

checkBusinessTableAndPlans();
