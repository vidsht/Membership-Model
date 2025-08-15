const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function seedPlans() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Delete existing plans
    await connection.execute('DELETE FROM plans');
    console.log('Cleared existing plans');

    // Insert merchant plans
    const merchantPlans = [
      {
        key: 'basic',
        name: 'Basic',
        description: 'Free basic plan for new merchants',
        price: 0,
        currency: 'GHS',
        billingCycle: 'yearly',
        type: 'merchant',
        features: JSON.stringify(['Basic listing', 'Up to 5 deals per month', 'Basic support']),
        max_deals_per_month: 5,
        isActive: true,
        priority: 1
      },
      {
        key: 'silver_business',
        name: 'Silver',
        description: 'Enhanced features for growing businesses',
        price: 300,
         currency: 'GHS',
        billingCycle: 'yearly',
        type: 'merchant',
        features: JSON.stringify(['Priority listing', 'Up to 15 deals per month', 'Enhanced analytics', 'Email support']),
        max_deals_per_month: 15,
        isActive: true,
        priority: 2
      },
      {
        key: 'gold_business',
        name: 'Gold',
        description: 'Premium features for established businesses',
        price: 500,
        currency: 'GHS',
        billingCycle: 'yearly',
        type: 'merchant',
        features: JSON.stringify(['Featured listing', 'Up to 30 deals per month', 'Advanced analytics', 'Priority support', 'Custom branding']),
        max_deals_per_month: 30,
        isActive: true,
        priority: 3
      },
      {
        key: 'platinum_business',
        name: 'Platinum',
        description: 'Enterprise-level features for large businesses',
        price: 800,
        currency: 'GHS',
        billingCycle: 'yearly',
        type: 'merchant',
        features: JSON.stringify(['Top placement', 'Up to 50 deals per month', 'Comprehensive analytics', 'Dedicated support', 'API access', 'White-label options']),
        max_deals_per_month: 50,
        isActive: true,
        priority: 4
      },
      {
        key: 'platinum_plus_business',
        name: 'Platinum Plus',
        description: 'Ultimate package for enterprise clients',
        price: 1000,
        currency: 'GHS',
        billingCycle: 'yearly',
        type: 'merchant',
        features: JSON.stringify(['Premium placement', 'Unlimited deals', 'Full analytics suite', '24/7 dedicated support', 'Full API access', 'Complete customization', 'Marketing assistance']),
        max_deals_per_month: -1,
        isActive: true,
        priority: 5
      }
    ];

    // Insert user plans
    const userPlans = [
      {
        key: 'silver',
        name: 'Silver',
        description: 'Entry-level premium access for users',
        price: 50,
        currency: 'GHS',
        billingCycle: 'yearly',
        type: 'user',
        features: JSON.stringify(['Priority deal notifications', 'Up to 10 redemptions per month', 'Basic customer support']),
        maxRedemptions: 10,
        isActive: true,
        priority: 1
      },
      {
        key: 'gold',
        name: 'Gold',
        description: 'Enhanced experience for regular users',
        price: 100,
        currency: 'GHS',
        billingCycle: 'yearly',
        type: 'user',
        features: JSON.stringify(['Early deal access', 'Up to 25 redemptions per month', 'Priority customer support', 'Exclusive deals']),
        maxRedemptions: 25,
        isActive: true,
        priority: 2
      },
      {
        key: 'platinum',
        name: 'Platinum',
        description: 'Premium experience for power users',
        price: 150,
        currency: 'GHS',
        billingCycle: 'yearly',
        type: 'user',
        features: JSON.stringify(['VIP deal access', 'Unlimited redemptions', 'Dedicated support', 'Exclusive VIP deals', 'Special events access']),
        maxRedemptions: -1,
        isActive: true,
        priority: 3
      }
    ];

    // Insert all plans
    const allPlans = [...merchantPlans, ...userPlans];
    
    for (const plan of allPlans) {
      const result = await connection.execute(`
        INSERT INTO plans (
          \`key\`, name, description, price, billingCycle, type, features, 
          max_deals_per_month, maxRedemptions, isActive, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        plan.key, plan.name, plan.description, plan.price, plan.billingCycle,
        plan.type, plan.features, plan.max_deals_per_month || null,
        plan.maxRedemptions || null, plan.isActive, plan.priority
      ]);
      
    }
    connection.end();
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
  }
}

seedPlans();
