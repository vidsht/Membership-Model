/**
 * Database Migration Script: Synchronize minPlanPriority and requiredPlanPriority
 * 
 * This script fixes the issue where deals table has mismatched priority fields:
 * - Some deals have minPlanPriority = null and requiredPlanPriority = value
 * - Some deals have different values in both fields
 * 
 * Solution: Set minPlanPriority = requiredPlanPriority for all deals
 */

const db = require('./backend/db');

async function synchronizePriorityFields() {
  console.log('🔧 SYNCHRONIZING DEAL PRIORITY FIELDS\n');

  try {
    // Step 1: Analyze current state
    console.log('1. Analyzing current priority field state...');
    
    const analysisQuery = `
      SELECT 
        COUNT(*) as total_deals,
        COUNT(CASE WHEN minPlanPriority IS NULL THEN 1 END) as null_min_priority,
        COUNT(CASE WHEN requiredPlanPriority IS NULL THEN 1 END) as null_required_priority,
        COUNT(CASE WHEN minPlanPriority != requiredPlanPriority THEN 1 END) as mismatched_priorities
      FROM deals
    `;
    
    const analysis = await queryAsync(analysisQuery);
    console.log('Current state:');
    console.log(`  Total deals: ${analysis[0].total_deals}`);
    console.log(`  Deals with NULL minPlanPriority: ${analysis[0].null_min_priority}`);
    console.log(`  Deals with NULL requiredPlanPriority: ${analysis[0].null_required_priority}`);
    console.log(`  Deals with mismatched priorities: ${analysis[0].mismatched_priorities}`);

    // Step 2: Show specific mismatched deals
    console.log('\n2. Showing deals with mismatched priorities...');
    
    const mismatchQuery = `
      SELECT id, title, minPlanPriority, requiredPlanPriority, status
      FROM deals 
      WHERE minPlanPriority != requiredPlanPriority 
         OR minPlanPriority IS NULL 
         OR requiredPlanPriority IS NULL
      ORDER BY id
    `;
    
    const mismatched = await queryAsync(mismatchQuery);
    
    if (mismatched.length > 0) {
      console.log('Deals requiring synchronization:');
      mismatched.forEach(deal => {
        console.log(`  Deal #${deal.id}: "${deal.title}" - minPlan=${deal.minPlanPriority}, required=${deal.requiredPlanPriority}`);
      });
    } else {
      console.log('✅ All deals already have synchronized priority fields!');
      return;
    }

    // Step 3: Fix NULL minPlanPriority values
    console.log('\n3. Fixing NULL minPlanPriority values...');
    
    const fixNullQuery = `
      UPDATE deals 
      SET minPlanPriority = requiredPlanPriority
      WHERE minPlanPriority IS NULL AND requiredPlanPriority IS NOT NULL
    `;
    
    const nullResult = await queryAsync(fixNullQuery);
    console.log(`✅ Fixed ${nullResult.affectedRows} deals with NULL minPlanPriority`);

    // Step 4: Fix NULL requiredPlanPriority values
    console.log('\n4. Fixing NULL requiredPlanPriority values...');
    
    const fixRequiredQuery = `
      UPDATE deals 
      SET requiredPlanPriority = COALESCE(minPlanPriority, 1)
      WHERE requiredPlanPriority IS NULL
    `;
    
    const requiredResult = await queryAsync(fixRequiredQuery);
    console.log(`✅ Fixed ${requiredResult.affectedRows} deals with NULL requiredPlanPriority`);

    // Step 5: Synchronize mismatched values (use requiredPlanPriority as source of truth)
    console.log('\n5. Synchronizing mismatched priority values...');
    
    const syncQuery = `
      UPDATE deals 
      SET minPlanPriority = requiredPlanPriority
      WHERE minPlanPriority != requiredPlanPriority
    `;
    
    const syncResult = await queryAsync(syncQuery);
    console.log(`✅ Synchronized ${syncResult.affectedRows} deals with mismatched priorities`);

    // Step 6: Verify the fix
    console.log('\n6. Verifying synchronization...');
    
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_deals,
        COUNT(CASE WHEN minPlanPriority IS NULL THEN 1 END) as null_min_priority,
        COUNT(CASE WHEN requiredPlanPriority IS NULL THEN 1 END) as null_required_priority,
        COUNT(CASE WHEN minPlanPriority != requiredPlanPriority THEN 1 END) as mismatched_priorities
      FROM deals
    `;
    
    const verification = await queryAsync(verifyQuery);
    
    console.log('Final state:');
    console.log(`  Total deals: ${verification[0].total_deals}`);
    console.log(`  Deals with NULL minPlanPriority: ${verification[0].null_min_priority}`);
    console.log(`  Deals with NULL requiredPlanPriority: ${verification[0].null_required_priority}`);
    console.log(`  Deals with mismatched priorities: ${verification[0].mismatched_priorities}`);

    if (verification[0].mismatched_priorities === 0 && verification[0].null_min_priority === 0) {
      console.log('\n🎉 SUCCESS: All priority fields are now synchronized!');
    } else {
      console.log('\n⚠️  WARNING: Some issues remain, manual review may be needed.');
    }

    // Step 7: Show sample of synchronized deals
    console.log('\n7. Sample of synchronized deals:');
    
    const sampleQuery = `
      SELECT id, title, minPlanPriority, requiredPlanPriority, status
      FROM deals 
      ORDER BY id 
      LIMIT 5
    `;
    
    const sample = await queryAsync(sampleQuery);
    sample.forEach(deal => {
      console.log(`  Deal #${deal.id}: minPlan=${deal.minPlanPriority}, required=${deal.requiredPlanPriority}`);
    });

  } catch (error) {
    console.error('❌ Error synchronizing priority fields:', error);
  }
}

// Utility function to promisify database queries
function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

// Main execution
async function main() {
  console.log('🚀 DEAL PRIORITY FIELDS SYNCHRONIZATION SCRIPT\n');
  await synchronizePriorityFields();
  process.exit(0);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
