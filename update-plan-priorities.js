const fetch = require('node-fetch');

async function updatePlanPriorities() {
  try {
    console.log('Updating plan priorities...\n');
    
    // Define the priority updates
    const planUpdates = [
      { id: 95, key: 'silver', priority: 2 },   // Silver plan
      { id: 96, key: 'gold', priority: 3 },     // Gold plan  
      { id: 97, key: 'platinum', priority: 4 }  // Platinum plan
    ];
    
    for (const plan of planUpdates) {
      console.log(`Updating ${plan.key} plan (ID: ${plan.id}) to priority ${plan.priority}...`);
      
      const response = await fetch(`http://localhost:5000/api/plans/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          priority: plan.priority
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log(`✅ Successfully updated ${plan.key} plan`);
      } else {
        console.log(`❌ Failed to update ${plan.key} plan:`, data.message || 'Unknown error');
      }
    }
    
    console.log('\n✅ Plan priority updates completed!');
    
  } catch (error) {
    console.error('Update failed:', error.message);
  }
}

updatePlanPriorities();
