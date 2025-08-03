const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: 'auth-db1388.hstgr.io',
  user: 'u214148440_SachinHursale',
  password: 'Membership@2025',
  database: 'u214148440_membership01'
};

// Create connection
const connection = mysql.createConnection(dbConfig);

console.log('Adding community plan...');
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  
  console.log('Connected to database successfully!');
    // Add community plan
  const communityPlan = {
    name: 'Community',
    key: 'community',
    type: 'user',
    price: 0.00,
    currency: 'GHS',
    billingCycle: 'lifetime',
    features: 'Basic community access, Event notifications, Member directory access',
    description: 'Free community membership with basic features',
    priority: 1,
    isActive: true
  };
  
  const insertQuery = `INSERT INTO plans (name, \`key\`, type, price, currency, billingCycle, features, description, priority, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  connection.query(insertQuery, [
    communityPlan.name,
    communityPlan.key,
    communityPlan.type,
    communityPlan.price,
    communityPlan.currency,
    communityPlan.billingCycle,
    communityPlan.features,
    communityPlan.description,
    communityPlan.priority,
    communityPlan.isActive
  ], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('Community plan already exists');
      } else {
        console.error('Error adding community plan:', err);
      }
    } else {
      console.log('Community plan added successfully');
    }
    connection.end();
  });
});
