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

const createActivitiesTable = async () => {
  try {
    console.log('Creating activities table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        userId INT,
        userName VARCHAR(255),
        userEmail VARCHAR(255),
        userType ENUM('user', 'merchant', 'admin') DEFAULT 'user',
        icon VARCHAR(100),
        color VARCHAR(50),
        metadata JSON,
        relatedId INT,
        relatedType VARCHAR(100),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_userId (userId),
        INDEX idx_timestamp (timestamp),
        INDEX idx_relatedId_type (relatedId, relatedType)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await queryAsync(createTableQuery);
    console.log('✅ Activities table created successfully');
    
    // Insert some sample activities to test
    console.log('Inserting sample activities...');
    
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
      const insertQuery = `
        INSERT INTO activities (
          type, title, description, userName, userEmail, userType, 
          icon, color, metadata, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await queryAsync(insertQuery, [
        activity.type,
        activity.title,
        activity.description,
        activity.userName,
        activity.userEmail,
        activity.userType,
        activity.icon,
        activity.color,
        '{}' // empty metadata
      ]);
    }
    
    console.log('✅ Sample activities inserted successfully');
    console.log('Activities table is now ready and populated with sample data');
    
  } catch (error) {
    console.error('❌ Error creating activities table:', error);
  } finally {
    process.exit(0);
  }
};

createActivitiesTable();