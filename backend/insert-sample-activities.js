const db = require('./db');

// Utility function to promisify db.query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

const insertSampleActivities = async () => {
  try {
    console.log('Inserting sample activities...');
    
    // Clear existing test data and insert new sample activities
    console.log('Clearing existing test data...');
    await queryAsync("DELETE FROM activities WHERE userEmail IN ('test@example.com', 'merchant@example.com', 'admin@example.com')");
    
    const sampleActivities = [
      {
        type: 'user_registered',
        title: 'New User Registration',
        description: 'Test user registered as user',
        userName: 'Test User',
        userEmail: 'test@example.com',
        userType: 'user',
        icon: 'fas fa-user-plus',
        color: 'success'
      },
      {
        type: 'merchant_registered',
        title: 'New Merchant Registration',
        description: 'Test merchant registered as merchant',
        userName: 'Test Merchant',
        userEmail: 'merchant@example.com',
        userType: 'merchant',
        icon: 'fas fa-store',
        color: 'info'
      },
      {
        type: 'new_deal_posted',
        title: 'New Deal Posted',
        description: 'Test deal has been posted',
        userName: 'Test Merchant',
        userEmail: 'merchant@example.com',
        userType: 'merchant',
        icon: 'fas fa-tags',
        color: 'primary'
      },
      {
        type: 'deal_approved',
        title: 'Deal Approved',
        description: 'Test deal has been approved by admin',
        userName: 'Admin User',
        userEmail: 'admin@example.com',
        userType: 'admin',
        icon: 'fas fa-check-circle',
        color: 'success'
      },
      {
        type: 'pending_deal_redemption_by',
        title: 'Pending Deal Redemption',
        description: 'User requested redemption for test deal',
        userName: 'Test User',
        userEmail: 'test@example.com',
        userType: 'user',
        icon: 'fas fa-shopping-cart',
        color: 'info'
      },
      {
        type: 'accepting_deal_redemption_by',
        title: 'Deal Redemption Accepted',
        description: 'Merchant accepted deal redemption request',
        userName: 'Test Merchant',
        userEmail: 'merchant@example.com',
        userType: 'merchant',
        icon: 'fas fa-check',
        color: 'success'
      },
      {
        type: 'user_plan_expired',
        title: 'User Plan Expired',
        description: 'Basic plan has expired for user',
        userName: 'Test User',
        userEmail: 'test@example.com',
        userType: 'user',
        icon: 'fas fa-calendar-times',
        color: 'danger'
      },
      {
        type: 'merchant_plan_expired',
        title: 'Merchant Plan Expired',
        description: 'Silver plan has expired for merchant',
        userName: 'Test Merchant',
        userEmail: 'merchant@example.com',
        userType: 'merchant',
        icon: 'fas fa-calendar-times',
        color: 'danger'
      },
      {
        type: 'new_plan_assigned',
        title: 'New Plan Assigned',
        description: 'Platinum plan assigned to user',
        userName: 'Test User',
        userEmail: 'test@example.com',
        userType: 'user',
        icon: 'fas fa-crown',
        color: 'primary'
      },
      {
        type: 'password_changed',
        title: 'Password Changed',
        description: 'User changed their account password',
        userName: 'Test User',
        userEmail: 'test@example.com',
        userType: 'user',
        icon: 'fas fa-key',
        color: 'warning'
      },
      {
        type: 'deal_rejected',
        title: 'Deal Rejected',
        description: 'Deal was rejected by admin',
        userName: 'Admin User',
        userEmail: 'admin@example.com',
        userType: 'admin',
        icon: 'fas fa-times-circle',
        color: 'danger'
      },
      {
        type: 'deal_inactive',
        title: 'Deal Inactive',
        description: 'Deal was set to inactive status',
        userName: 'Test Merchant',
        userEmail: 'merchant@example.com',
        userType: 'merchant',
        icon: 'fas fa-pause-circle',
        color: 'warning'
      },
      {
        type: 'assigned_custom_deal_redemption',
        title: 'Custom Deal Redemption Assigned',
        description: 'Admin assigned custom redemption settings',
        userName: 'Admin User',
        userEmail: 'admin@example.com',
        userType: 'admin',
        icon: 'fas fa-gift',
        color: 'primary'
      },
      {
        type: 'assigned_custom_deal_limit',
        title: 'Custom Deal Limit Assigned',
        description: 'Admin assigned custom deal posting limit',
        userName: 'Admin User',
        userEmail: 'admin@example.com',
        userType: 'admin',
        icon: 'fas fa-limit',
        color: 'primary'
      },
      {
        type: 'rejected_deal_redemption_by',
        title: 'Deal Redemption Rejected',
        description: 'Merchant rejected deal redemption request',
        userName: 'Test Merchant',
        userEmail: 'merchant@example.com',
        userType: 'merchant',
        icon: 'fas fa-times',
        color: 'danger'
      }
    ];
    
    for (const activity of sampleActivities) {
      // Use only existing columns
      const insertQuery = `
        INSERT INTO activities (
          type, title, description, userName, userEmail, userType, 
          icon, color, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await queryAsync(insertQuery, [
        activity.type,
        activity.title,
        activity.description,
        activity.userName,
        activity.userEmail,
        activity.userType,
        activity.icon,
        activity.color
      ]);
    }
    
    console.log('✅ Sample activities inserted successfully');
    
    // Check final count
    const countResult = await queryAsync('SELECT COUNT(*) as total FROM activities');
    console.log(`Total activities in table: ${countResult[0].total}`);
    
  } catch (error) {
    console.error('❌ Error inserting activities:', error);
  } finally {
    process.exit(0);
  }
};

insertSampleActivities();