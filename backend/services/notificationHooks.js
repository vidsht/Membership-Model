const notificationService = require('../services/notificationService');

class NotificationHooks {
  // User Registration Hook
  static async onUserRegistration(userId) {
    try {
      await notificationService.sendWelcomeMessage(userId);
      await notificationService.notifyAdminNewRegistration(userId);
      console.log(`✅ User registration notifications sent for user ID: ${userId}`);
    } catch (error) {
      console.error('❌ Error sending user registration notifications:', error);
    }
  }

  // Merchant Registration Hook
  static async onMerchantRegistration(merchantId) {
    try {
      await notificationService.sendMerchantWelcomeMessage(merchantId);
      await notificationService.notifyAdminNewRegistration(merchantId);
      console.log(`✅ Merchant registration notifications sent for merchant ID: ${merchantId}`);
    } catch (error) {
      console.error('❌ Error sending merchant registration notifications:', error);
    }
  }

  // Deal Creation Hook
  static async onDealCreated(dealId) {
    try {
      await notificationService.notifyAdminNewDealRequest(dealId);
      console.log(`✅ Deal creation notification sent for deal ID: ${dealId}`);
    } catch (error) {
      console.error('❌ Error sending deal creation notification:', error);
    }
  }

  // Deal Approval Hook
  static async onDealApproved(dealId) {
    try {
      await notificationService.notifyDealRequestResponse(dealId);
      await notificationService.notifyNewDealPosted(dealId);
      await notificationService.notifyAdminDealPublished(dealId);
      console.log(`✅ Deal approval notifications sent for deal ID: ${dealId}`);
    } catch (error) {
      console.error('❌ Error sending deal approval notifications:', error);
    }
  }

  // Deal Rejection Hook
  static async onDealRejected(dealId) {
    try {
      await notificationService.notifyDealRequestResponse(dealId);
      console.log(`✅ Deal rejection notification sent for deal ID: ${dealId}`);
    } catch (error) {
      console.error('❌ Error sending deal rejection notification:', error);
    }
  }

  // User Profile Status Update Hook
  static async onUserProfileStatusUpdate(userId, newStatus, reason = null) {
    try {
      await notificationService.notifyProfileStatusUpdate(userId, newStatus, reason);
      console.log(`✅ User profile status update notification sent for user ID: ${userId}`);
    } catch (error) {
      console.error('❌ Error sending user profile status update notification:', error);
    }
  }

  // Merchant Profile Status Update Hook
  static async onMerchantProfileStatusUpdate(merchantId, newStatus, reason = null) {
    try {
      await notificationService.notifyMerchantProfileStatusUpdate(merchantId, newStatus, reason);
      console.log(`✅ Merchant profile status update notification sent for merchant ID: ${merchantId}`);
    } catch (error) {
      console.error('❌ Error sending merchant profile status update notification:', error);
    }
  }

  // Deal Redemption Request Hook
  static async onRedemptionRequested(redemptionId) {
    try {
      await notificationService.notifyNewRedemptionRequest(redemptionId);
      console.log(`✅ Redemption request notification sent for redemption ID: ${redemptionId}`);
    } catch (error) {
      console.error('❌ Error sending redemption request notification:', error);
    }
  }

  // Deal Redemption Response Hook
  static async onRedemptionResponse(redemptionId) {
    try {
      await notificationService.notifyRedemptionResponse(redemptionId);
      await notificationService.notifyAdminDealRedemption(redemptionId);
      console.log(`✅ Redemption response notifications sent for redemption ID: ${redemptionId}`);
    } catch (error) {
      console.error('❌ Error sending redemption response notifications:', error);
    }
  }

  // Plan Assignment Hook
  static async onPlanAssigned(userId, planId, userType = 'user') {
    try {
      if (userType === 'merchant') {
        await notificationService.notifyMerchantNewPlanAssigned(userId, planId);
      } else {
        await notificationService.notifyNewPlanAssigned(userId, planId);
      }
      console.log(`✅ Plan assignment notification sent for user ID: ${userId}, plan ID: ${planId}`);
    } catch (error) {
      console.error('❌ Error sending plan assignment notification:', error);
    }
  }

  // Redemption Limit Reached Hook
  static async onRedemptionLimitReached(userId) {
    try {
      await notificationService.notifyMaxRedemptionLimitReached(userId);
      console.log(`✅ Redemption limit reached notification sent for user ID: ${userId}`);
    } catch (error) {
      console.error('❌ Error sending redemption limit reached notification:', error);
    }
  }

  // Deal Limit Reached Hook
  static async onDealLimitReached(merchantId) {
    try {
      await notificationService.notifyDealLimitReached(merchantId);
      console.log(`✅ Deal limit reached notification sent for merchant ID: ${merchantId}`);
    } catch (error) {
      console.error('❌ Error sending deal limit reached notification:', error);
    }
  }

  // Custom Deal Limit Assignment Hook
  static async onCustomDealLimitAssigned(merchantId, newLimit) {
    try {
      await notificationService.notifyCustomDealLimitAssigned(merchantId, newLimit);
      console.log(`✅ Custom deal limit assignment notification sent for merchant ID: ${merchantId}`);
    } catch (error) {
      console.error('❌ Error sending custom deal limit assignment notification:', error);
    }
  }

  // Monthly Limits Renewal Hook (Called by cron job)
  static async onMonthlyLimitsRenewal() {
    try {
      await notificationService.renewMonthlyLimits();
      console.log(`✅ Monthly limits renewal notifications processed`);
    } catch (error) {
      console.error('❌ Error processing monthly limits renewal notifications:', error);
    }
  }

  // Plan Expiry Check Hook (Called by cron job)
  static async onPlanExpiryCheck() {
    try {
      await notificationService.checkAndSendExpiryWarnings();
      console.log(`✅ Plan expiry check completed`);
    } catch (error) {
      console.error('❌ Error checking plan expiry:', error);
    }
  }

  // Utility method to check if notifications should be sent
  static async shouldSendNotification(userId, notificationType) {
    try {
      const notificationService = require('../services/notificationService');
      const preference = await notificationService.queryAsync(
        'SELECT is_enabled FROM user_email_preferences WHERE user_id = ? AND notification_type = ?',
        [userId, notificationType]
      );
      
      // Default to true if no preference is set
      return preference.length === 0 ? true : preference[0].is_enabled;
    } catch (error) {
      console.error('Error checking notification preference:', error);
      return true; // Default to sending notifications if check fails
    }
  }

  // Method to enable/disable specific notifications for a user
  static async updateNotificationPreference(userId, notificationType, isEnabled) {
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.queryAsync(
        `INSERT INTO user_email_preferences (user_id, notification_type, is_enabled) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE is_enabled = ?`,
        [userId, notificationType, isEnabled, isEnabled]
      );
      
      console.log(`✅ Notification preference updated for user ${userId}: ${notificationType} = ${isEnabled}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating notification preference:', error);
      return false;
    }
  }

  // Method to get user's notification preferences
  static async getUserNotificationPreferences(userId) {
    try {
      const notificationService = require('../services/notificationService');
      const preferences = await notificationService.queryAsync(
        'SELECT notification_type, is_enabled FROM user_email_preferences WHERE user_id = ?',
        [userId]
      );
      
      // Convert to object for easier usage
      const preferencesObj = {};
      preferences.forEach(pref => {
        preferencesObj[pref.notification_type] = pref.is_enabled;
      });
      
      return preferencesObj;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return {};
    }
  }

  // Method to initialize default preferences for a new user
  static async initializeDefaultPreferences(userId, userType = 'user') {
    try {
      const defaultPreferences = [
        'profile_status_update',
        'plan_expiry_warning',
        'plan_assigned'
      ];

      if (userType === 'user') {
        defaultPreferences.push(
          'user_welcome',
          'new_deal_notification',
          'redemption_approved',
          'redemption_rejected',
          'redemption_limit_reached',
          'redemption_limit_renewed'
        );
      } else if (userType === 'merchant') {
        defaultPreferences.push(
          'merchant_welcome',
          'deal_approved',
          'deal_rejected',
          'deal_limit_reached',
          'deal_limit_renewed',
          'custom_deal_limit_assigned',
          'new_redemption_request'
        );
      }

      const notificationService = require('../services/notificationService');
      
      for (const notificationType of defaultPreferences) {
        await notificationService.queryAsync(
          `INSERT INTO user_email_preferences (user_id, notification_type, is_enabled) 
           VALUES (?, ?, TRUE) 
           ON DUPLICATE KEY UPDATE is_enabled = is_enabled`,
          [userId, notificationType]
        );
      }

      console.log(`✅ Default notification preferences initialized for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Error initializing default notification preferences:', error);
      return false;
    }
  }
}

module.exports = NotificationHooks;
