const mysql = require('mysql2');

// Database conf    type: 'merchant',
    maxDealsPerM    dealPriority: 2,
    features: [h: 5,
    dealPriority: 2,
    features: [tion
const dbConfig = {
  host: 'auth-db1388.hstgr.io',
  user: 'u214148440_SachinHursale',
  password: 'Membership@2025',
  database: 'u214148440_membership01'
};

// Default merchant plans as specified
const merchantPlans = [
  {
    key: 'basic',
    name: 'Basic',
    description: 'Free Forever Plan',
    price: 0,
    currency: 'GHS',
    billingCycle: 'yearly',
    type: 'merchant',
    maxDealsPerMonth: 0, // No deals allowed
    dealPriority: 1,
    features: [
      'Basic Business Listing',
      'Up to 2 Images',
      'Social Media Links Setup',
      'Content Writing',
      'Newsletter Features',
      'Facebook Ads',
      'Instagram Ads',
      'WhatsApp Channel Ads',
      'WhatsApp Group Ads',
      'Job Post (dedicated page)',
      'Website Ads',
      'On Page Optimization',
      'Google Indexing Support',
      'Regular SEO Updates',
      'Dedicated Account Manager',
      'Promotion Campaigns'
    ],
    isDefault: 1,
    sortOrder: 1,
    status: 'active'
  },
  {
    key: 'silver_business',
    name: 'Silver',
    description: 'Standard Business Package',
    price: 300,
    originalPrice: 600,
    currency: 'GHS',
    billingCycle: 'yearly',
    type: 'merchant',
    maxDealsPerMonth: 1,
    dealPriority: 2,
    features: [
      'Standard Business Listing',
      'Up to 5 Images',
      'Social Media Links Setup',
      'Basic Content Writing',
      'Newsletter Features',
      'Facebook Ads: 1/Month',
      'Instagram Ads: 1/Month',
      'WhatsApp Channel Ads: 1/Month',
      'WhatsApp Group Ads: 1/Month',
      '1 Deal Post/Month',
      'Job Post Included',
      'Website Ads',
      'Basic On Page Optimization',
      'Basic Google Indexing Support',
      'Half Yearly SEO Updates',
      'Dedicated Account Manager',
      '1 Promotion Campaign/Year'
    ],
    isDefault: 1,
    sortOrder: 2,
    status: 'active'
  },
  {
    key: 'gold_business',
    name: 'Gold',
    description: 'Featured Business Package',
    price: 500,
    originalPrice: 1000,
    currency: 'GHS',
    billingCycle: 'yearly',
    type: 'merchant',
    maxDealsPerMonth: 2,
    dealPriority: 3,
    features: [
      'Featured Business Listing',
      'Up to 8 Images',
      'Social Media Links Setup',
      'Professional Content Writing',
      'Quarterly Newsletter',
      'Facebook Ads: 2/Month',
      'Instagram Ads: 2/Month',
      'WhatsApp Channel Ads: 2/Month',
      'WhatsApp Group Ads: 2/Month',
      '2 Deals Posts/Month',
      'Job Post Included',
      'Inner Page Ads: 2/month',
      'Standard On Page Optimization',
      'Standard Google Indexing Support',
      'Quarterly SEO Updates',
      'Dedicated Account Manager',
      '2 Promotion Campaigns/Year'
    ],
    isDefault: 1,
    sortOrder: 3,
    status: 'active'
  },
  {
    key: 'platinum_business',
    name: 'Platinum',
    description: 'Premium Business Package - POPULAR',
    price: 800,
    originalPrice: 1600,
    currency: 'GHS',
    billingCycle: 'yearly',
    type: 'merchant',
    maxDealsPerMonth: 3,
    dealPriority: 4,
    features: [
      'Featured Business Listing',
      'Up to 10+ Gallery Images',
      'Social Media Links Setup',
      'Professional Content Writing',
      '2 Times Quarterly Newsletter',
      'Facebook Ads: 3/Month',
      'Instagram Ads: 3/Month',
      'WhatsApp Channel Ads: 3/Month',
      'WhatsApp Group Ads: 3/Month',
      '3 Deals Posts/Month',
      'Job Post Included',
      'Inner Page Ads: 3/month + Homepage: 1',
      'Advanced On Page Optimization',
      'Standard Google Indexing Support',
      'Monthly SEO Updates',
      'Dedicated Account Manager',
      '3 Promotion Campaigns/Year'
    ],
    isDefault: 1,
    sortOrder: 4,
    status: 'active'
  },
  {
    key: 'platinum_plus_business',
    name: 'Platinum Plus',
    description: 'Ultimate Business Package',
    price: 1000,
    originalPrice: 2000,
    currency: 'GHS',
    billingCycle: 'yearly',
    type: 'merchant',
    maxDealsPerMonth: 4,
    dealPriority: 5,
    features: [
      'Featured Business Listing',
      'Up to 15+ Gallery Images',
      'Social Media Links Setup',
      'Professional Content Writing + Blog',
      '3 Times Quarterly Newsletter',
      'Facebook Ads: 4/Month',
      'Instagram Ads: 4/Month',
      'WhatsApp Channel Ads: 4/Month',
      'WhatsApp Group Ads: 4/Month',
      '4 Deals Posts/Month',
      'Job Post Included',
      'Inner Page Ads: 4/month + Homepage: 1',
      'Comprehensive On Page Optimization',
      'Standard Google Indexing Support',
      'Monthly SEO Updates',
      'Dedicated Account Manager',
      '4 Promotion Campaigns/Year'
    ],
    isDefault: 1,
    sortOrder: 5,
    status: 'active'
  }
];

// Default user plans as specified
const userPlans = [
  {
    key: 'silver',
    name: 'Silver',
    description: 'Basic user membership with limited access',
    price: 50,
    currency: 'GHS',
    billingCycle: 'yearly',
    type: 'user',
    maxDealRedemptions: 3, // 2-3 deals per month
    dealPriority: 2,
    features: [
      'Access to all basic deals',
      '2-3 curated deals per month',
      'Access to 2-3 business sectors',
      'No flash deals access',
      'No coupons available',
      'No cashback offers',
      'No event benefits',
      'No community updates'
    ],
    isDefault: 1,
    sortOrder: 1,
    status: 'active'
  },
  {
    key: 'gold',
    name: 'Gold',
    description: 'Premium user membership with enhanced benefits',
    price: 100,
    currency: 'GHS',
    billingCycle: 'yearly',
    type: 'user',
    maxDealRedemptions: 7, // 5-7 deals per month
    dealPriority: 3,
    features: [
      'Access to all deals',
      '5-7 premium deals per month',
      'Access to 5-7 business sectors',
      'Occasional flash deals',
      'Limited coupons available',
      '5% cashback from select merchants',
      'Basic event benefits',
      'Monthly community updates',
      'Referral bonus program'
    ],
    isDefault: 1,
    sortOrder: 2,
    status: 'active'
  },
  {
    key: 'platinum',
    name: 'Platinum',
    description: 'VIP user membership with full access',
    price: 150,
    currency: 'GHS',
    billingCycle: 'yearly',
    type: 'user',
    maxDealRedemptions: -1, // Unlimited
    dealPriority: 4,
    features: [
      'Full access to all deals',
      'Unlimited premium deals',
      'Access to all business sectors',
      'Priority access to flash deals',
      'All available coupons',
      '10% cashback from more merchants',
      'VIP event benefits',
      'Weekly community updates',
      'Enhanced referral bonus program'
    ],
    isDefault: 1,
    sortOrder: 3,
    status: 'active'
  }
];

const connection = mysql.createConnection(dbConfig);

console.log('🌱 Seeding Default Plans for Enhanced Plan Management System...\n');

connection.connect(async (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
    return;
  }
  
  console.log('✅ Connected to database successfully!');
  
  try {
    // Helper function to execute queries
    const queryAsync = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // Clear existing default plans
    console.log('🧹 Cleaning existing default plans...');
    await queryAsync('DELETE FROM plans WHERE isDefault = 1');
    
    console.log('📦 Seeding Merchant Plans...');
    for (const plan of merchantPlans) {
      try {
        await queryAsync(`
          INSERT INTO plans (
            \`key\`, name, description, price, currency, billingCycle, type,
            max_deals_per_month, dealPriority, features, features_json,
            isDefault, sortOrder, status, isActive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          plan.key,
          plan.name,
          plan.description,
          plan.price,
          plan.currency,
          plan.billingCycle,
          plan.type,
          plan.maxDealsPerMonth,
          plan.dealPriority,
          plan.features.join(','),
          JSON.stringify({
            features: plan.features,
            originalPrice: plan.originalPrice
          }),
          plan.isDefault,
          plan.sortOrder,
          plan.status,
          1
        ]);
        
        console.log(`   ✅ ${plan.name} (${plan.key}) - ${plan.currency} ${plan.price}/${plan.billingCycle}`);
      } catch (error) {
        console.error(`   ❌ Error seeding ${plan.name}:`, error.message);
      }
    }
    
    console.log('\n👥 Seeding User Plans...');
    for (const plan of userPlans) {
      try {
        await queryAsync(`
          INSERT INTO plans (
            \`key\`, name, description, price, currency, billingCycle, type,
            maxDealRedemptions, dealPriority, features, features_json,
            isDefault, sortOrder, status, isActive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          plan.key,
          plan.name,
          plan.description,
          plan.price,
          plan.currency,
          plan.billingCycle,
          plan.type,
          plan.maxDealRedemptions,
          plan.dealPriority,
          plan.features.join(','),
          JSON.stringify({
            features: plan.features
          }),
          plan.isDefault,
          plan.sortOrder,
          plan.status,
          1
        ]);
        
        console.log(`   ✅ ${plan.name} (${plan.key}) - ${plan.currency} ${plan.price}/${plan.billingCycle}`);
      } catch (error) {
        console.error(`   ❌ Error seeding ${plan.name}:`, error.message);
      }
    }
    
    // Verify seeding
    console.log('\n🔍 Verifying seeded plans...');
    const merchantPlanCount = await queryAsync('SELECT COUNT(*) as count FROM plans WHERE type = "merchant" AND isDefault = 1');
    const userPlanCount = await queryAsync('SELECT COUNT(*) as count FROM plans WHERE type = "user" AND isDefault = 1');
    
    console.log(`   📊 Merchant Plans: ${merchantPlanCount[0].count}`);
    console.log(`   📊 User Plans: ${userPlanCount[0].count}`);
    
    const allPlans = await queryAsync('SELECT * FROM plans WHERE isDefault = 1 ORDER BY type, sortOrder');
    console.log('\n📋 SEEDED PLANS SUMMARY:');
    allPlans.forEach(plan => {
      console.log(`   ${plan.type.toUpperCase()}: ${plan.name} (${plan.key}) - ${plan.currency} ${plan.price}/${plan.billingCycle} - Deals: ${plan.max_deals_per_month || plan.maxDealRedemptions || 'N/A'}`);
    });
    
    console.log('\n🎉 Default plans seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    connection.end();
  }
});
