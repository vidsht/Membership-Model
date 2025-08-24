/**
 * Notification Hooks for Indians in Ghana Membership Platform
 * Easy integration points for existing routes
 */

const notificationService = require('./notificationService-integrated');

class NotificationHooks {
  // User Registration Hook
  static async onUserRegistration(userId, userData) {
    try {
      console.log(`📧 Sending welcome email to user ${userId}`);
      
      // Send welcome email to user
      const userResult = await notificationService.sendWelcomeEmail(userId, userData);
      
      // Notify admins of new registration
      const adminResult = await notificationService.sendAdminNotification('admin_new_registration', {
        fullName: userData.fullName || userData.email,
        email: userData.email,
        membershipType: userData.membershipType || 'Standard',
        registrationDate: new Date().toLocaleDateString(),
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/users`
      });

      return {
        userEmail: userResult,
        adminEmail: adminResult
      };
    } catch (error) {
      console.error('Error in user registration hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Profile Status Change Hook
  static async onProfileStatusChange(userId, newStatus, reason = '') {
    try {
      console.log(`📧 Sending profile status update to user ${userId}: ${newStatus}`);
      
      return await notificationService.sendProfileStatusUpdate(userId, {
        status: newStatus,
        reason: reason
      });
    } catch (error) {
      console.error('Error in profile status change hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Deal Creation Hook (for merchants)
  static async onDealCreated(dealId, dealData) {
    try {
      console.log(`📧 Processing deal creation notifications for deal ${dealId}`);
      
      // Get all active users who should receive deal notifications
      const db = require('../db');
      const { promisify } = require('util');
      const queryAsync = promisify(db.query).bind(db);
      
      const usersResult = await queryAsync(`
        SELECT u.id, u.email, u.fullName
        FROM users u
        LEFT JOIN user_email_preferences uep ON u.id = uep.user_id AND uep.notification_type = 'deals'
        WHERE u.status = 'approved' 
        AND (uep.is_enabled IS NULL OR uep.is_enabled = 1)
        LIMIT 100
      `);

      if (usersResult.length === 0) {
        return { success: true, message: 'No users to notify' };
      }

      // Send deal notifications to users
      const recipients = usersResult.map(user => ({
        email: user.email,
        data: {
          firstName: user.fullName?.split(' ')[0] || 'Member'
        }
      }));

      return await notificationService.sendBulkNotifications(
        recipients,
        'new_deal_notification',
        {
          dealTitle: dealData.title || dealData.dealTitle,
          dealDescription: dealData.description || dealData.dealDescription,
          businessName: dealData.businessName || 'Business',
          discount: dealData.discount || dealData.discountPercentage || '',
          validUntil: dealData.validUntil || dealData.expiryDate || '',
          dealUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/${dealId}`
        }
      );
    } catch (error) {
      console.error('Error in deal creation hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Deal Status Change Hook
  static async onDealStatusChange(dealId, newStatus, reason = '') {
    try {
      console.log(`📧 Sending deal status notification for deal ${dealId}: ${newStatus}`);
      
      return await notificationService.sendDealStatusNotification({
        id: dealId,
        reason: reason
      }, newStatus);
    } catch (error) {
      console.error('Error in deal status change hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Merchant Registration Hook
  static async onMerchantRegistration(merchantData) {
    try {
      console.log(`📧 Sending merchant welcome email`);
      
      // Send welcome email to merchant
      const merchantResult = await notificationService.sendMerchantWelcome(merchantData);
      
      // Notify admins of new merchant application
      const adminResult = await notificationService.sendAdminNotification('admin_new_merchant', {
        businessName: merchantData.businessName || merchantData.name || 'New Business',
        ownerName: merchantData.ownerName || merchantData.fullName || 'Business Owner',
        email: merchantData.businessEmail || merchantData.email,
        applicationDate: new Date().toLocaleDateString(),
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/merchants`
      });

      return {
        merchantEmail: merchantResult,
        adminEmail: adminResult
      };
    } catch (error) {
      console.error('Error in merchant registration hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Redemption Request Hook
  static async onRedemptionRequested(redemptionId, redemptionData) {
    try {
      console.log(`📧 Processing redemption request notifications for ${redemptionId}`);
      
      // This would notify the merchant of a new redemption request
      // For now, we'll just log it since we need to implement merchant notification templates
      console.log('Redemption request notification would be sent to merchant');
      
      return { success: true, message: 'Redemption request processed' };
    } catch (error) {
      console.error('Error in redemption request hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Redemption Response Hook (Approved/Rejected)
  static async onRedemptionResponse(redemptionId, status, responseData) {
    try {
      console.log(`📧 Sending redemption response notification: ${status}`);
      
      if (status === 'approved') {
        return await notificationService.sendRedemptionApproved(responseData.userId, {
          dealTitle: responseData.dealTitle,
          businessName: responseData.businessName,
          redemptionDate: responseData.redemptionDate,
          qrCode: responseData.qrCode
        });
      } else if (status === 'rejected') {
        return await notificationService.sendRedemptionRejected(responseData.userId, {
          dealTitle: responseData.dealTitle,
          businessName: responseData.businessName,
          reason: responseData.reason,
          redemptionDate: responseData.redemptionDate
        });
      }
      
      return { success: true, message: 'No notification needed for status: ' + status };
    } catch (error) {
      console.error('Error in redemption response hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Password Reset Hook
  static async onPasswordReset(email, resetData) {
    try {
      console.log(`📧 Sending password reset email to ${email}`);
      
      // This would use a password_reset template if available
      // For now, we'll use a generic approach
      return { success: true, message: 'Password reset email would be sent' };
    } catch (error) {
      console.error('Error in password reset hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Scheduled Task Hooks
  static async checkExpiringDeals() {
    try {
      console.log('🔍 Checking for expiring deals...');
      
      const db = require('../db');
      const { promisify } = require('util');
      const queryAsync = promisify(db.query).bind(db);
      
      // Find deals expiring in the next 3 days
      const expiringDeals = await queryAsync(`
        SELECT d.*, u.email, u.fullName
        FROM deals d
        JOIN users u ON d.userId = u.id
        WHERE d.expiryDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
        AND d.status = 'active'
      `);

      for (const deal of expiringDeals) {
        await notificationService.sendDealNotification(deal.userId, {
          dealTitle: deal.title,
          dealDescription: deal.description,
          expiryDate: deal.expiryDate
        });
      }

      return {
        success: true,
        processed: expiringDeals.length
      };
    } catch (error) {
      console.error('Error checking expiring deals:', error);
      return { success: false, error: error.message };
    }
  }

  static async checkExpiringMemberships() {
    try {
      console.log('🔍 Checking for expiring memberships...');
      
      const db = require('../db');
      const { promisify } = require('util');
      const queryAsync = promisify(db.query).bind(db);
      
      // Find memberships expiring in the next 30 days
      const expiringUsers = await queryAsync(`
        SELECT id, email, fullName, validationDate
        FROM users 
        WHERE validationDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
        AND status = 'approved'
      `);

      for (const user of expiringUsers) {
        await notificationService.sendProfileStatusUpdate(user.id, {
          status: 'expiring',
          validationDate: user.validationDate
        });
      }

      return {
        success: true,
        processed: expiringUsers.length
      };
    } catch (error) {
      console.error('Error checking expiring memberships:', error);
      return { success: false, error: error.message };
    }
  }

  // Test Hook for development
  static async sendTestEmail(email, templateType = 'user_welcome') {
    try {
      const testData = {
        firstName: 'Test',
        fullName: 'Test User',
        email: email,
        membershipNumber: 'TEST001',
        validationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        dealTitle: 'Test Deal',
        dealDescription: 'This is a test deal notification',
        businessName: 'Test Business'
      };

      return await notificationService.sendWelcomeEmail(999, testData);
    } catch (error) {
      console.error('Error sending test email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationHooks;
