// Script to clean up existing plans and test seeding
const mongoose = require('mongoose');
const Plan = require('./models/Plan');

async function cleanupAndTest() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://127.0.0.1:27017/indians-in-ghana', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    
    // Clean up existing plans
    const deleteResult = await Plan.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing plans`);
    
    // Test creating a simple plan
    const testPlan = new Plan({
      name: 'Test Plan',
      key: 'test_plan',
      price: 50,
      currency: 'GHS',
      features: ['Feature 1', 'Feature 2'],
      description: 'Test description',
      isActive: true,
      billingCycle: 'monthly',
      priority: 1,
      metadata: { userType: 'user' }
    });
    
    const savedPlan = await testPlan.save();
    console.log('✅ Test plan saved:', savedPlan._id);
    
    // Test the seed data
    const seedPlans = [
      {
        name: 'Community',
        key: 'community',
        price: 0,
        currency: 'GHS',
        features: ['Basic membership card', 'Access to community events'],
        description: 'Free community membership with basic features',
        isActive: true,
        billingCycle: 'lifetime',
        priority: 1,
        metadata: { userType: 'user' }
      },
      {
        name: 'Silver',
        key: 'silver',
        price: 50,
        currency: 'GHS',
        features: ['All Community features', 'Premium membership card'],
        description: 'Premium membership with enhanced benefits',
        isActive: true,
        billingCycle: 'yearly',
        priority: 2,
        metadata: { userType: 'user' }
      }
    ];
    
    // Clean up the test plan first
    await Plan.findByIdAndDelete(savedPlan._id);
    console.log('🗑️ Test plan cleaned up');
    
    // Try to insert seed plans
    const insertedPlans = await Plan.insertMany(seedPlans);
    console.log(`✅ Inserted ${insertedPlans.length} seed plans`);
    
    // List all plans
    const allPlans = await Plan.find({});
    console.log('📋 All plans in database:');
    allPlans.forEach(plan => {
      console.log(`- ${plan.name} (${plan.key}): ${plan.price} ${plan.currency}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

cleanupAndTest();
