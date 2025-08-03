// Add missing community plan and fix plan keys
const db = require('./backend/db');

function addCommunityPlanAndFixKeys() {
  console.log('Adding Community plan and fixing plan keys...\n');

  // First, add the community plan if it doesn't exist
  const addCommunityQuery = `
    INSERT INTO plans (name, \`key\`, type, priority, price, currency, billingCycle, features, dealAccess, isActive, sortOrder)
    VALUES ('Community', 'community', 'membership', 1, 0.00, 'GHS', 'lifetime', 'Basic membership benefits', 'community', 1, 1)
    ON DUPLICATE KEY UPDATE \`key\` = 'community', type = 'membership'
  `;

  db.query(addCommunityQuery, (err, result) => {
    if (err) {
      console.error('Error adding community plan:', err);
      return;
    }
    console.log('✅ Community plan added/updated');

    // Update existing plans to have proper keys and types
    const updatePlansQuery = `
      UPDATE plans SET 
        \`key\` = CASE 
          WHEN name LIKE '%Silver%' THEN 'silver'
          WHEN name LIKE '%Gold%' THEN 'gold'
          WHEN name LIKE '%Platinum%' THEN 'platinum'
          ELSE \`key\`
        END,
        type = 'membership'
      WHERE type = 'user' AND \`key\` IS NULL OR \`key\` = ''
    `;

    db.query(updatePlansQuery, (err2, result2) => {
      if (err2) {
        console.error('Error updating plan keys:', err2);
        return;
      }
      console.log('✅ Plan keys updated');

      // Verify the results
      db.query(`
        SELECT id, name, \`key\`, type, priority, price, currency, isActive
        FROM plans 
        WHERE type = 'membership'
        ORDER BY priority ASC
      `, (err3, results) => {
        if (err3) {
          console.error('Error fetching results:', err3);
          return;
        }

        console.log('\n📋 Updated Membership Plans:');
        results.forEach(plan => {
          console.log(`- ${plan.name} (${plan.key}) - Priority: ${plan.priority}, Price: ${plan.price} ${plan.currency}`);
        });

        console.log('\n✅ Plan setup completed!');
        db.end();
      });
    });
  });
}

addCommunityPlanAndFixKeys();
