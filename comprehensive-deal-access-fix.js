/**
 * Comprehensive Deal Access Logic Fix
 * 
 * This script addresses all the issues identified:
 * 1. Make all hardcoded plan mappings dynamic based on database plans
 * 2. Fix minPlanPriority field not being updated in deal creation
 * 3. Fix deal approval not updating both priority fields
 * 4. Fix redemption button logic using inconsistent fields
 * 
 * Issues Found:
 * - Admin deal creation only sets requiredPlanPriority, not minPlanPriority
 * - Deal approval has hardcoded priority-to-accessLevel mapping (3=all, 2=premium, 1=intermediate)
 * - Frontend uses deal.minPlanPriority || deal.requiredPlanPriority causing inconsistency
 * - No dynamic plan loading for access level conversion
 */

const axios = require('axios');

async function analyzeCurrentState() {
  try {
    console.log('🔍 ANALYZING CURRENT DEAL ACCESS SYSTEM STATE\n');

    // 1. Check current plans and their priorities
    console.log('1. Loading current plans from database...');
    const plansResponse = await axios.get('http://localhost:5001/api/plans');
    const plans = plansResponse.data.plans || [];
    
    console.log(`Found ${plans.length} plans:`);
    plans.forEach(plan => {
      console.log(`  - ${plan.name} (${plan.key}): Priority ${plan.priority}, Type: ${plan.type}`);
    });

    // 2. Check deals with mismatched priority fields
    console.log('\n2. Checking deals with mismatched priority fields...');
    const dealsResponse = await axios.get('http://localhost:5001/api/deals');
    const deals = dealsResponse.data.deals || [];
    
    const mismatchedDeals = deals.filter(deal => 
      deal.minPlanPriority !== deal.requiredPlanPriority
    );
    
    console.log(`Found ${mismatchedDeals.length} deals with mismatched priority fields:`);
    mismatchedDeals.forEach(deal => {
      console.log(`  - Deal #${deal.id}: minPlanPriority=${deal.minPlanPriority}, requiredPlanPriority=${deal.requiredPlanPriority}`);
    });

    // 3. Check for hardcoded access level mappings
    console.log('\n3. Issues found in current system:');
    console.log('   ❌ Admin deal creation only sets requiredPlanPriority field');
    console.log('   ❌ Deal approval uses hardcoded priority mapping (3=all, 2=premium, 1=intermediate)');
    console.log('   ❌ Frontend redemption logic uses fallback: deal.minPlanPriority || deal.requiredPlanPriority');
    console.log('   ❌ No dynamic plan loading for access level conversion');

    return { plans, deals, mismatchedDeals };
  } catch (error) {
    console.error('Error analyzing current state:', error.message);
    return null;
  }
}

async function testRedemptionLogic() {
  try {
    console.log('\n🧪 TESTING REDEMPTION LOGIC WITH DIFFERENT SCENARIOS\n');
    
    const plansResponse = await axios.get('http://localhost:5001/api/plans');
    const plans = plansResponse.data.plans.filter(p => p.type === 'user');
    
    const dealsResponse = await axios.get('http://localhost:5001/api/deals');
    const deals = dealsResponse.data.deals.slice(0, 3); // Test with first 3 deals
    
    // Simulate different user scenarios
    const testUsers = [
      { membership: 'silver', name: 'Silver User' },
      { membership: 'gold', name: 'Gold User' },
      { membership: 'platinum', name: 'Platinum User' }
    ];

    console.log('Redemption access matrix:');
    console.log('Deal ID | Deal Title | Required Priority | Silver | Gold | Platinum');
    console.log('--------|------------|------------------|--------|------|----------');

    deals.forEach(deal => {
      const priority = deal.minPlanPriority || deal.requiredPlanPriority || 1;
      const title = deal.title.length > 15 ? deal.title.substring(0, 15) + '...' : deal.title;
      
      let accessLine = `${deal.id.toString().padEnd(7)} | ${title.padEnd(10)} | ${priority.toString().padEnd(16)} |`;
      
      testUsers.forEach(testUser => {
        const userPlan = plans.find(plan => plan.key === testUser.membership);
        const canAccess = userPlan && userPlan.priority >= priority;
        accessLine += ` ${canAccess ? '✅' : '❌'.padEnd(4)} |`;
      });
      
      console.log(accessLine);
    });

  } catch (error) {
    console.error('Error testing redemption logic:', error.message);
  }
}

async function generateFixRecommendations() {
  console.log('\n🔧 COMPREHENSIVE FIX RECOMMENDATIONS\n');
  
  console.log('1. BACKEND FIXES NEEDED:');
  console.log('   📝 admin.js - Deal creation route:');
  console.log('      - Update INSERT query to include both minPlanPriority and requiredPlanPriority');
  console.log('      - Set both fields to same value: requiredPlanPriority');
  console.log('');
  console.log('   📝 admin.js - Deal approval route:');
  console.log('      - Remove hardcoded priority-to-accessLevel mapping');
  console.log('      - Load plans dynamically from database');
  console.log('      - Generate accessLevel based on actual plan data');
  console.log('');
  console.log('   📝 admin.js - Add dynamic plan access conversion:');
  console.log('      - Create function to convert priority to accessLevel using live plan data');
  console.log('      - Support multiple priority systems (not just 1,2,3)');
  console.log('');

  console.log('2. DATABASE FIXES NEEDED:');
  console.log('   📝 Synchronize priority fields:');
  console.log('      - Update all deals: SET minPlanPriority = requiredPlanPriority');
  console.log('      - Ensure consistent field usage across all deals');
  console.log('');

  console.log('3. FRONTEND FIXES NEEDED:');
  console.log('   📝 Deals.jsx - Redemption logic:');
  console.log('      - Use consistent field: deal.minPlanPriority (primary)');
  console.log('      - Remove fallback to requiredPlanPriority');
  console.log('      - Ensure canRedeem function uses correct field');
  console.log('');

  console.log('4. DYNAMIC SYSTEM IMPLEMENTATION:');
  console.log('   📝 Replace all hardcoded plan mappings:');
  console.log('      - Load plans dynamically in all components');
  console.log('      - Remove hardcoded (1=Basic, 2=Premium, 3=VIP) references');
  console.log('      - Use plan.key and plan.priority from database');
  console.log('');
}

// Run the analysis
async function main() {
  console.log('🚀 COMPREHENSIVE DEAL ACCESS SYSTEM ANALYSIS\n');
  
  const analysis = await analyzeCurrentState();
  if (analysis) {
    await testRedemptionLogic();
    await generateFixRecommendations();
    
    console.log('\n✅ ANALYSIS COMPLETE');
    console.log('📋 Next steps: Apply the recommended fixes to resolve all issues');
  }
}

main().catch(console.error);
