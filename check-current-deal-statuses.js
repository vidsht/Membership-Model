const axios = require('axios');

async function checkCurrentDealStatuses() {
  const baseURL = 'http://localhost:5001';
  
  try {
    console.log('=== Checking Current Deal Statuses ===\n');
    
    const dealsResponse = await axios.get(`${baseURL}/api/deals`);
    
    if (dealsResponse.data.success && dealsResponse.data.deals.length > 0) {
      const deals = dealsResponse.data.deals;
      console.log(`Found ${deals.length} deals`);
      
      // Get unique status values
      const statuses = [...new Set(deals.map(deal => deal.status))];
      console.log('\nCurrent status values in database:');
      statuses.forEach(status => {
        const count = deals.filter(deal => deal.status === status).length;
        console.log(`- ${status}: ${count} deals`);
      });
      
      // Check if pending_approval exists
      if (statuses.includes('pending_approval')) {
        console.log('\n✅ pending_approval status is supported by database');
      } else {
        console.log('\n❌ pending_approval status is NOT in database');
        console.log('This confirms the enum issue!');
        console.log('\nSupported statuses:', statuses);
        console.log('Required by backend: pending_approval, rejected');
      }
      
      // Show sample deal structure
      console.log('\nSample deal structure:');
      const sampleDeal = deals[0];
      console.log({
        id: sampleDeal.id,
        title: sampleDeal.title,
        status: sampleDeal.status,
        businessId: sampleDeal.businessId
      });
      
    } else {
      console.log('No deals found or deals endpoint not accessible');
    }
    
  } catch (error) {
    console.error('❌ Error checking deals:', error.response?.data || error.message);
  }
}

checkCurrentDealStatuses();
