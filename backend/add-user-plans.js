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

console.log('Adding user plans (Silver and Gold)...');
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  
  console.log('Connected to database successfully!');
  
  const userPlans = [
    {
      name: 'Silver',
      key: 'silver',
      type: 'user',
      price: 50.00,
      currency: 'GHS',
      billingCycle: 'yearly',
      features: 'All community features, Priority support, Exclusive deals access, Business directory promotion',
      description: 'Premium membership with enhanced features and priority support',
      priority: 2,
      isActive: true
    },
    {
      name: 'Gold',
      key: 'gold',
      type: 'user',
      price: 150.00,
      currency: 'GHS',
      billingCycle: 'yearly',
      features: 'All Silver features, VIP event access, Personal concierge service, Premium business networking',
      description: 'Premium membership with all features and VIP benefits',
      priority: 3,
      isActive: true
    }
  ];
  
  const insertQuery = `INSERT INTO plans (name, \`key\`, type, price, currency, billingCycle, features, description, priority, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  let completed = 0;
  userPlans.forEach((plan, index) => {
    connection.query(insertQuery, [
      plan.name,
      plan.key,
      plan.type,
      plan.price,
      plan.currency,
      plan.billingCycle,
      plan.features,
      plan.description,
      plan.priority,
      plan.isActive
    ], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`${plan.name} plan already exists`);
        } else {
          console.error(`Error adding ${plan.name} plan:`, err);
        }
      } else {
        console.log(`${plan.name} plan added successfully`);
      }
      
      completed++;
      if (completed === userPlans.length) {
        connection.end();
      }
    });
  });
});
