// Check deal priorities and access levels
const axios = require('axios');

async function checkDealPriorities() {
  try {
    const response = await axios.get('http://localhost:5000/api/deals');
    const deals = response.data.deals || [];
    
    console.log('📊 Deal Priority Analysis:');
    console.log(`Total deals: ${deals.length}\n`);
    
    deals.slice(0, 5).forEach((deal, i) => {
      console.log(`${i+1}. "${deal.title}"`);
      console.log(`   - minPlanPriority: ${deal.minPlanPriority}`);
      console.log(`   - accessLevel: ${deal.accessLevel}`);
      console.log(`   - businessName: ${deal.businessName}`);
      console.log('');
    });

    // Count by priority
    const priorityCounts = {};
    deals.forEach(deal => {
      const priority = deal.minPlanPriority || 'null';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });

    console.log('📈 Priority Distribution:');
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      console.log(`   Priority ${priority}: ${count} deals`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDealPriorities();
