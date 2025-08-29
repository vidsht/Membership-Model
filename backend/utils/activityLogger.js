const db = require('../db');

// Utility function to promisify db.query
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Check if table exists
const tableExists = async (tableName) => {
  try {
    const result = await queryAsync('SHOW TABLES LIKE ?', [tableName]);
    return result.length > 0;
  } catch (error) {
    return false;
  }
};

// Activity types and their configurations
const ACTIVITY_TYPES = {
  // User activities
  USER_REGISTERED: {
    type: 'user_registered',
    title: 'New User Registration',
    icon: 'fas fa-user-plus',
    color: 'success'
  },
  MERCHANT_REGISTERED: {
    type: 'merchant_registered',
    title: 'New Merchant Registration',
    icon: 'fas fa-store',
    color: 'info'
  },
  
  // Deal activities
  DEAL_CREATED: {
    type: 'deal_created',
    title: 'New Deal Created',
    icon: 'fas fa-tags',
    color: 'primary'
  },
  DEAL_APPROVED: {
    type: 'deal_approved',
    title: 'Deal Approved',
    icon: 'fas fa-check-circle',
    color: 'success'
  },
  DEAL_REJECTED: {
    type: 'deal_rejected',
    title: 'Deal Rejected',
    icon: 'fas fa-times-circle',
    color: 'danger'
  },
  DEAL_EXPIRED: {
    type: 'deal_expired',
    title: 'Deal Expired',
    icon: 'fas fa-clock',
    color: 'warning'
  },
  DEAL_ACTIVATED: {
    type: 'deal_activated',
    title: 'Deal Activated',
    icon: 'fas fa-play-circle',
    color: 'success'
  },
  DEAL_DEACTIVATED: {
    type: 'deal_deactivated',
    title: 'Deal Deactivated',
    icon: 'fas fa-pause-circle',
    color: 'warning'
  },
  DEAL_VIEWED: {
    type: 'deal_viewed',
    title: 'Deal Viewed',
    icon: 'fas fa-eye',
    color: 'info'
  },
  
  // Redemption activities
  REDEMPTION_REQUESTED: {
    type: 'redemption_requested',
    title: 'Redemption Requested',
    icon: 'fas fa-shopping-cart',
    color: 'info'
  },
  REDEMPTION_APPROVED: {
    type: 'redemption_approved',
    title: 'Redemption Approved',
    icon: 'fas fa-check',
    color: 'success'
  },
  REDEMPTION_REJECTED: {
    type: 'redemption_rejected',
    title: 'Redemption Rejected',
    icon: 'fas fa-times',
    color: 'danger'
  },
  
  // Plan activities
  PLAN_EXPIRING: {
    type: 'plan_expiring',
    title: 'Plan Expiring Soon',
    icon: 'fas fa-exclamation-triangle',
    color: 'warning'
  },
  PLAN_EXPIRED: {
    type: 'plan_expired',
    title: 'Plan Expired',
    icon: 'fas fa-calendar-times',
    color: 'danger'
  },
  PLAN_UPGRADED: {
    type: 'plan_upgraded',
    title: 'Plan Upgraded',
    icon: 'fas fa-arrow-up',
    color: 'success'
  },
  
  // Admin activities
  USER_STATUS_CHANGED: {
    type: 'user_status_changed',
    title: 'User Status Changed',
    icon: 'fas fa-user-edit',
    color: 'warning'
  },
  PASSWORD_CHANGED: {
    type: 'password_changed',
    title: 'Password Changed',
    icon: 'fas fa-key',
    color: 'info'
  }
};

/**
 * Log an activity to the database
 * @param {string} activityType - Activity type from ACTIVITY_TYPES
 * @param {Object} options - Activity options
 * @param {number} options.userId - User ID who performed the action
 * @param {string} options.description - Activity description
 * @param {Object} options.metadata - Additional metadata
 * @param {number} options.relatedId - Related entity ID (dealId, businessId, etc.)
 * @param {string} options.relatedType - Type of related entity
 */
const logActivity = async (activityType, options = {}) => {
  try {
    // Check if activities table exists
    if (!(await tableExists('activities'))) {
      console.warn('Activities table does not exist, skipping activity log');
      return;
    }

    const config = ACTIVITY_TYPES[activityType];
    if (!config) {
      console.warn(`Unknown activity type: ${activityType}`);
      return;
    }

    const {
      userId,
      description,
      metadata = {},
      relatedId,
      relatedType,
      userName,
      userEmail,
      userType = 'user'
    } = options;

    // Get user info if not provided but userId is available
    let finalUserName = userName;
    let finalUserEmail = userEmail;
    let finalUserType = userType;

    if (userId && (!userName || !userEmail)) {
      try {
        const userResult = await queryAsync('SELECT fullName, email, userType FROM users WHERE id = ?', [userId]);
        if (userResult.length > 0) {
          finalUserName = finalUserName || userResult[0].fullName;
          finalUserEmail = finalUserEmail || userResult[0].email;
          finalUserType = finalUserType || userResult[0].userType || 'user';
        }
      } catch (error) {
        console.warn('Error fetching user info for activity log:', error);
      }
    }

    const activityData = {
      type: config.type,
      title: config.title,
      description: description || config.title,
      userId: userId || null,
      userName: finalUserName || null,
      userEmail: finalUserEmail || null,
      userType: finalUserType,
      icon: config.icon,
      color: config.color,
      metadata: JSON.stringify(metadata),
      relatedId: relatedId || null,
      relatedType: relatedType || null,
      timestamp: new Date()
    };

    const query = `
      INSERT INTO activities (
        type, title, description, userId, userName, userEmail, userType,
        icon, color, metadata, relatedId, relatedType, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const params = [
      activityData.type,
      activityData.title,
      activityData.description,
      activityData.userId,
      activityData.userName,
      activityData.userEmail,
      activityData.userType,
      activityData.icon,
      activityData.color,
      activityData.metadata,
      activityData.relatedId,
      activityData.relatedType
    ];

    await queryAsync(query, params);
    console.log(`✅ Activity logged: ${config.title} - ${description}`);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

/**
 * Log deal view activity
 */
const logDealView = async (dealId, userId, dealTitle, viewSource = 'unknown') => {
  await logActivity('DEAL_VIEWED', {
    userId,
    description: `Deal "${dealTitle}" viewed from ${viewSource}`,
    relatedId: dealId,
    relatedType: 'deal',
    metadata: {
      dealId,
      dealTitle,
      viewSource,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Log redemption request activity
 */
const logRedemptionRequest = async (userId, dealId, dealTitle, merchantId) => {
  await logActivity('REDEMPTION_REQUESTED', {
    userId,
    description: `Redemption requested for deal "${dealTitle}"`,
    relatedId: dealId,
    relatedType: 'deal',
    metadata: {
      dealId,
      dealTitle,
      merchantId,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Log redemption approval/rejection activity
 */
const logRedemptionDecision = async (merchantId, userId, dealId, dealTitle, decision, reason = '') => {
  const activityType = decision === 'approved' ? 'REDEMPTION_APPROVED' : 'REDEMPTION_REJECTED';
  const description = `Redemption ${decision} for deal "${dealTitle}"${reason ? ` - Reason: ${reason}` : ''}`;
  
  await logActivity(activityType, {
    userId: merchantId,
    description,
    relatedId: dealId,
    relatedType: 'deal',
    metadata: {
      dealId,
      dealTitle,
      customerId: userId,
      decision,
      reason,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Log deal status change activity
 */
const logDealStatusChange = async (dealId, dealTitle, newStatus, userId, reason = '') => {
  let activityType;
  switch (newStatus) {
    case 'active':
      activityType = 'DEAL_ACTIVATED';
      break;
    case 'inactive':
      activityType = 'DEAL_DEACTIVATED';
      break;
    case 'expired':
      activityType = 'DEAL_EXPIRED';
      break;
    case 'approved':
      activityType = 'DEAL_APPROVED';
      break;
    case 'rejected':
      activityType = 'DEAL_REJECTED';
      break;
    default:
      activityType = 'DEAL_CREATED';
  }

  await logActivity(activityType, {
    userId,
    description: `Deal "${dealTitle}" status changed to ${newStatus}${reason ? ` - ${reason}` : ''}`,
    relatedId: dealId,
    relatedType: 'deal',
    metadata: {
      dealId,
      dealTitle,
      newStatus,
      previousStatus: 'unknown',
      reason,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Log plan expiry warnings
 */
const logPlanExpiry = async (userId, planName, expiryDate, daysUntilExpiry) => {
  const activityType = daysUntilExpiry <= 0 ? 'PLAN_EXPIRED' : 'PLAN_EXPIRING';
  const description = daysUntilExpiry <= 0 
    ? `Plan "${planName}" has expired`
    : `Plan "${planName}" expires in ${daysUntilExpiry} days`;

  await logActivity(activityType, {
    userId,
    description,
    relatedId: userId,
    relatedType: 'user',
    metadata: {
      planName,
      expiryDate,
      daysUntilExpiry,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Log user registration activity
 */
const logUserRegistration = async (userId, userName, userEmail, userType) => {
  const activityType = userType === 'merchant' ? 'MERCHANT_REGISTERED' : 'USER_REGISTERED';
  await logActivity(activityType, {
    userId,
    userName,
    userEmail,
    userType,
    description: `${userName} registered as ${userType}`,
    relatedId: userId,
    relatedType: 'user'
  });
};

module.exports = {
  logActivity,
  logDealView,
  logRedemptionRequest,
  logRedemptionDecision,
  logDealStatusChange,
  logPlanExpiry,
  logUserRegistration,
  ACTIVITY_TYPES
};
