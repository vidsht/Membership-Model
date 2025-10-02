const emailService = require('./emailService-integrated');
const db = require('../db');
const { promisify } = require('util');
const { logActivity, ACTIVITY_TYPES } = require('../utils/activityLogger');

class UnifiedNotificationService {
  constructor() {
    this.queryAsync = promisify(db.query).bind(db);
  }

  // ===========================================
  // CORE EMAIL SENDING METHODS
  // ===========================================

  /**
   * Send email using the integrated email service
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email
   * @param {string} params.templateType - Template type to use
   * @param {string} params.type - Alternative template type (for backward compatibility)
   * @param {Object} params.data - Template data
   * @param {string} params.priority - Email priority (default: 'normal')
   * @param {Date} params.scheduledFor - Schedule email for future sending
   */
  async sendEmail({ to, templateType, type, data, priority = 'normal', scheduledFor = null }) {
    try {
      return await emailService.sendEmail({
        to,
        templateType: templateType || type,
        type,
        data,
        priority,
        scheduledFor
      });
    } catch (error) {
      console.error(`Error sending email (${templateType || type}) to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // USER LIFECYCLE NOTIFICATIONS
  // ===========================================

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(userId, userData) {
    try {
      const data = {
        firstName: userData.firstName || userData.fullName?.split(' ')[0] || 'Member',
        fullName: userData.fullName || userData.email,
        email: userData.email,
        membershipNumber: userData.membershipNumber || `MEM${userId}`,
        validationDate: userData.validationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };

      return await this.sendEmail({
        to: userData.email,
        templateType: 'user_welcome',
        data: data
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send merchant welcome email
   */
  async sendMerchantWelcomeEmail(merchantId, merchantData) {
    try {
      const data = {
        businessName: merchantData.businessName || 'Your Business',
        fullName: merchantData.fullName || merchantData.email,
        email: merchantData.email,
        membershipNumber: merchantData.membershipNumber || `MER${merchantId}`,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/dashboard`
      };

      return await this.sendEmail({
        to: merchantData.email,
        templateType: 'merchant_welcome',
        data: data
      });
    } catch (error) {
      console.error('Error sending merchant welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send profile status update notification
   */
  async sendProfileStatusUpdate(userId, status, reason = '') {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      const data = {
        fullName: user.fullName,
        status: status,
        reason: reason,
        membershipNumber: user.membershipNumber,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
      };

      return await this.sendEmail({
        to: user.email,
        templateType: 'profile_status_update',
        data: data
      });
    } catch (error) {
      console.error('Error sending profile status update:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password changed by admin notification
   */
  async sendPasswordChangedByAdmin(userId, passwordData) {
    try {
      const data = {
        fullName: passwordData.fullName,
        email: passwordData.email,
        tempPassword: passwordData.tempPassword,
        membershipNumber: passwordData.membershipNumber,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
      };

      return await this.sendEmail({
        to: passwordData.email,
        templateType: 'password_changed_by_admin',
        data: data
      });
    } catch (error) {
      console.error('Error sending password change notification:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // PLAN AND MEMBERSHIP NOTIFICATIONS
  // ===========================================

  /**
   * Send plan assignment notification
   */
  async sendPlanAssignment(userId, planData) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      const data = {
        fullName: user.fullName,
        membershipNumber: user.membershipNumber,
        planName: planData.planName,
        planType: planData.planType,
        effectiveDate: planData.effectiveDate,
        expiryDate: planData.expiryDate,
        message: planData.message || '',
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
      };

      return await this.sendEmail({
        to: user.email,
        templateType: 'plan_assignment',
        data: data
      });
    } catch (error) {
      console.error('Error sending plan assignment notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send custom deal limit assignment notification
   */
  async sendCustomDealLimitAssignment(merchantId, newLimit, assignmentData) {
    try {
      const merchant = await this.getUserById(merchantId);
      if (!merchant) throw new Error('Merchant not found');

      const data = {
        businessName: assignmentData.businessName || 'Your Business',
        fullName: merchant.fullName,
        newLimit: newLimit,
        assignedBy: assignmentData.assignedBy,
        message: assignmentData.adminMessage || '',
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/dashboard`
      };

      return await this.sendEmail({
        to: merchant.email,
        templateType: 'custom_deals_assignment',
        data: data
      });
    } catch (error) {
      console.error('Error sending custom deal limit notification:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // DEAL AND REDEMPTION NOTIFICATIONS
  // ===========================================

  /**
   * Send deal status change notification
   */
  async sendDealStatusChange(dealId, status, reason = '') {
    try {
      const deal = await this.getDealById(dealId);
      if (!deal) throw new Error('Deal not found');

      const data = {
        dealTitle: deal.title,
        businessName: deal.businessName,
        status: status,
        reason: reason,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/dashboard`
      };

      return await this.sendEmail({
        to: deal.merchantEmail,
        templateType: 'deal_posting_status',
        data: data
      });
    } catch (error) {
      console.error('Error sending deal status change notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send redemption response notification
   */
  async sendRedemptionResponse(requestId, response, responseData) {
    try {
      const redemption = await this.getRedemptionById(requestId);
      if (!redemption) throw new Error('Redemption request not found');

      const templateType = response === 'approved' ? 'redemption_approved' : 'redemption_rejected';
      
      const data = {
        fullName: redemption.userFullName,
        membershipNumber: redemption.membershipNumber,
        dealTitle: redemption.dealTitle,
        businessName: redemption.businessName,
        redemptionId: requestId,
        requestDate: redemption.requestDate,
        reason: responseData.reason || '',
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
      };

      return await this.sendEmail({
        to: redemption.userEmail,
        templateType: templateType,
        data: data
      });
    } catch (error) {
      console.error('Error sending redemption response notification:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // ADMIN NOTIFICATIONS
  // ===========================================

  /**
   * Send admin notification for new registrations
   */
  async sendAdminNewRegistration(userData) {
    try {
      const adminEmails = await this.getAdminEmails();
      const promises = [];

      const data = {
        fullName: userData.fullName || userData.email,
        email: userData.email,
        userType: userData.userType || 'user',
        membershipType: userData.membershipType || 'Standard',
        registrationDate: new Date().toLocaleDateString(),
        adminDashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/dashboard`
      };

      for (const adminEmail of adminEmails) {
        promises.push(
          this.sendEmail({
            to: adminEmail,
            templateType: 'admin_new_registration',
            data: data
          })
        );
      }

      const results = await Promise.allSettled(promises);
      return { success: true, results: results };
    } catch (error) {
      console.error('Error sending admin new registration notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send admin notification for new merchant
   */
  async sendAdminNewMerchant(merchantData) {
    try {
      const adminEmails = await this.getAdminEmails();
      const promises = [];

      const data = {
        businessName: merchantData.businessName || 'New Business',
        fullName: merchantData.fullName || merchantData.email,
        email: merchantData.email,
        phone: merchantData.phone || 'Not provided',
        businessCategory: merchantData.businessCategory || 'Not specified',
        businessLocation: merchantData.businessLocation || 'Not specified',
        businessDescription: merchantData.businessDescription || '',
        registrationDate: new Date().toLocaleDateString(),
        adminDashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/merchants`
      };

      for (const adminEmail of adminEmails) {
        promises.push(
          this.sendEmail({
            to: adminEmail,
            templateType: 'admin_new_merchant',
            data: data
          })
        );
      }

      const results = await Promise.allSettled(promises);
      return { success: true, results: results };
    } catch (error) {
      console.error('Error sending admin new merchant notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send admin notification for plan expiry warning
   */
  async sendAdminPlanExpiryAlert(expiringUsers) {
    try {
      const adminEmails = await this.getAdminEmails();
      const promises = [];

      const data = {
        alertDate: new Date().toLocaleDateString(),
        expiringUsersCount: expiringUsers.length,
        expiringUsers: expiringUsers,
        adminDashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/users`
      };

      for (const adminEmail of adminEmails) {
        promises.push(
          this.sendEmail({
            to: adminEmail,
            templateType: 'admin_plan_expiry_alert',
            data: data
          })
        );
      }

      const results = await Promise.allSettled(promises);
      return { success: true, results: results };
    } catch (error) {
      console.error('Error sending admin plan expiry alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send admin notification for new deal request
   */
  async sendAdminNewDealRequest(dealData) {
    try {
      const adminEmails = await this.getAdminEmails();
      const promises = [];

      const data = {
        dealTitle: dealData.title || 'New Deal',
        businessName: dealData.businessName || 'Business',
        merchantName: dealData.merchantName || 'Merchant',
        category: dealData.category || 'General',
        submissionDate: new Date().toLocaleDateString(),
        adminDashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deals`
      };

      for (const adminEmail of adminEmails) {
        promises.push(
          this.sendEmail({
            to: adminEmail,
            templateType: 'admin_new_deal_request',
            data: data
          })
        );
      }

      const results = await Promise.allSettled(promises);
      return { success: true, results: results };
    } catch (error) {
      console.error('Error sending admin new deal request notification:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // HIGH-LEVEL HOOKS (Event-Driven)
  // ===========================================

  /**
   * Handle user registration event
   */
  async onUserRegistration(userId, userData) {
    try {
      console.log(`📧 Processing user registration notifications for user ${userId}`);
      
      const userResult = await this.sendWelcomeEmail(userId, userData);
      const adminResult = await this.sendAdminNewRegistration(userData);

      return {
        userEmail: userResult,
        adminEmail: adminResult
      };
    } catch (error) {
      console.error('Error in user registration hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle merchant registration event
   */
  async onMerchantRegistration(merchantId, merchantData) {
    try {
      console.log(`📧 Processing merchant registration notifications for merchant ${merchantId}`);
      
      const merchantResult = await this.sendMerchantWelcomeEmail(merchantId, merchantData);
      const adminResult = await this.sendAdminNewMerchant(merchantData);

      return {
        merchantEmail: merchantResult,
        adminEmail: adminResult
      };
    } catch (error) {
      console.error('Error in merchant registration hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle profile status change event
   */
  async onProfileStatusChange(userId, status, reason = '') {
    try {
      console.log(`📧 Processing profile status change for user ${userId}: ${status}`);
      return await this.sendProfileStatusUpdate(userId, status, reason);
    } catch (error) {
      console.error('Error in profile status change hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle password changed by admin event
   */
  async onPasswordChangedByAdmin(userId, passwordData) {
    try {
      console.log(`📧 Processing password change notification for user ${userId}`);
      return await this.sendPasswordChangedByAdmin(userId, passwordData);
    } catch (error) {
      console.error('Error in password change hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle plan assignment event
   */
  async onPlanAssigned(userId, planData) {
    try {
      console.log(`📧 Processing plan assignment notification for user ${userId}`);
      return await this.sendPlanAssignment(userId, planData);
    } catch (error) {
      console.error('Error in plan assignment hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle custom deal limit assignment event
   */
  async onCustomDealLimitAssigned(merchantId, newLimit, assignmentData) {
    try {
      console.log(`📧 Processing custom deal limit assignment for merchant ${merchantId}`);
      return await this.sendCustomDealLimitAssignment(merchantId, newLimit, assignmentData);
    } catch (error) {
      console.error('Error in custom deal limit assignment hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle deal status change event
   */
  async onDealStatusChange(dealId, status, reason = '') {
    try {
      console.log(`📧 Processing deal status change for deal ${dealId}: ${status}`);
      return await this.sendDealStatusChange(dealId, status, reason);
    } catch (error) {
      console.error('Error in deal status change hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle deal creation event
   */
  async onDealCreated(dealId, dealData) {
    try {
      console.log(`📧 Processing deal creation notification for deal ${dealId}`);
      
      // Send notification to admins about new deal request
      return await this.sendAdminNewDealRequest(dealData);
    } catch (error) {
      console.error('Error in deal creation hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle redemption request event
   */
  async onRedemptionRequested(requestId, requestData) {
    try {
      console.log(`📧 Processing redemption request notification for request ${requestId}`);
      
      // Send notification to merchant about redemption request
      const merchant = await this.getUserById(requestData.merchantId);
      if (!merchant) {
        throw new Error('Merchant not found');
      }

      const data = {
        customerName: requestData.customerName,
        customerEmail: requestData.customerEmail,
        membershipNumber: requestData.membershipNumber,
        dealTitle: requestData.dealTitle,
        redemptionId: requestId,
        requestDate: new Date().toLocaleDateString(),
        merchantDashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/redemptions`
      };

      return await this.sendEmail({
        to: merchant.email,
        templateType: 'redemption_request_alert',
        data: data
      });
    } catch (error) {
      console.error('Error in redemption request hook:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle redemption response event
   */
  async onRedemptionResponse(requestId, response, responseData) {
    try {
      console.log(`📧 Processing redemption response for request ${requestId}: ${response}`);
      return await this.sendRedemptionResponse(requestId, response, responseData);
    } catch (error) {
      console.error('Error in redemption response hook:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // ADMIN AND UTILITY METHODS
  // ===========================================

  /**
   * Get user notification preferences
   */
  async getUserNotificationPreferences(userId) {
    try {
      const results = await this.queryAsync(`
        SELECT * FROM user_email_preferences 
        WHERE userId = ?
      `, [userId]);
      
      return results[0] || {
        emailNotifications: true,
        dealNotifications: true,
        redemptionNotifications: true,
        planExpiryNotifications: true
      };
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user notification preference
   */
  async updateNotificationPreference(userId, preferenceType, value) {
    try {
      // Check if preferences exist
      const existing = await this.queryAsync(`
        SELECT id FROM user_email_preferences WHERE userId = ?
      `, [userId]);

      if (existing.length > 0) {
        await this.queryAsync(`
          UPDATE user_email_preferences 
          SET ${preferenceType} = ?, updated_at = NOW()
          WHERE userId = ?
        `, [value, userId]);
      } else {
        await this.queryAsync(`
          INSERT INTO user_email_preferences (userId, ${preferenceType}, created_at, updated_at)
          VALUES (?, ?, NOW(), NOW())
        `, [userId, value]);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating notification preference:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(email, templateType) {
    try {
      const testData = {
        fullName: 'Test User',
        firstName: 'Test',
        email: email,
        membershipNumber: 'TEST001',
        businessName: 'Test Business',
        dealTitle: 'Test Deal',
        status: 'test',
        reason: 'This is a test email',
        testMode: true
      };

      return await this.sendEmail({
        to: email,
        templateType: templateType,
        data: testData
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  async getUserById(userId) {
    try {
      const results = await this.queryAsync(
        'SELECT id, fullName, email, membershipNumber, userType FROM users WHERE id = ?',
        [userId]
      );
      return results[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getDealById(dealId) {
    try {
      const results = await this.queryAsync(`
        SELECT d.id, d.title, d.merchantId, b.businessName, u.email as merchantEmail
        FROM deals d
        LEFT JOIN businesses b ON d.merchantId = b.userId
        LEFT JOIN users u ON d.merchantId = u.id
        WHERE d.id = ?
      `, [dealId]);
      return results[0] || null;
    } catch (error) {
      console.error('Error getting deal by ID:', error);
      return null;
    }
  }

  async getRedemptionById(requestId) {
    try {
      const results = await this.queryAsync(`
        SELECT r.id, r.userId, r.dealId, r.createdAt as requestDate,
               u.fullName as userFullName, u.email as userEmail, u.membershipNumber,
               d.title as dealTitle, b.businessName
        FROM redemptions r
        LEFT JOIN users u ON r.userId = u.id
        LEFT JOIN deals d ON r.dealId = d.id
        LEFT JOIN businesses b ON d.merchantId = b.userId
        WHERE r.id = ?
      `, [requestId]);
      return results[0] || null;
    } catch (error) {
      console.error('Error getting redemption by ID:', error);
      return null;
    }
  }

  async getAdminEmails() {
    try {
      const results = await this.queryAsync(
        'SELECT email FROM users WHERE userType = "admin" AND status = "approved"'
      );
      return results.map(admin => admin.email);
    } catch (error) {
      console.error('Error getting admin emails:', error);
      return [];
    }
  }

  /**
   * Check for plan expiries and send admin alert
   */
  async onPlanExpiryCheck() {
    try {
      console.log('🔍 Checking for plan expiries...');
      
      // Get users whose plans are expiring tomorrow
      const expiringTomorrow = await this.queryAsync(`
        SELECT u.id, u.fullName, u.email, u.membershipType, u.userType, u.validationDate,
               p.name as planName, b.businessName
        FROM users u
        LEFT JOIN plans p ON u.membershipType = p.key
        LEFT JOIN businesses b ON u.id = b.userId AND u.userType = 'merchant'
        WHERE u.validationDate IS NOT NULL 
        AND DATE(u.validationDate) = DATE(DATE_ADD(NOW(), INTERVAL 1 DAY))
        AND u.status = 'approved'
        ORDER BY u.userType, u.fullName
      `);

      if (expiringTomorrow.length > 0) {
        console.log(`📧 Found ${expiringTomorrow.length} plans expiring tomorrow`);
        
        // Format the data for the email template
        const expiringUsers = expiringTomorrow.map(user => ({
          name: user.userType === 'merchant' ? (user.businessName || user.fullName) : user.fullName,
          email: user.email,
          planName: user.planName || user.membershipType,
          type: user.userType === 'merchant' ? 'business' : 'user'
        }));

        // Send admin alert
        const result = await this.sendAdminPlanExpiryAlert(expiringUsers);
        console.log(`📧 Admin plan expiry alert sent:`, result);

        return {
          success: true,
          expiringCount: expiringTomorrow.length,
          expiringUsers: expiringUsers
        };
      } else {
        console.log('✅ No plans expiring tomorrow');
        return {
          success: true,
          expiringCount: 0,
          expiringUsers: []
        };
      }
    } catch (error) {
      console.error('❌ Error checking plan expiries:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reset monthly limits for all users (called on 1st of each month)
   */
  async onMonthlyLimitsRenewal() {
    try {
      console.log('🔄 Starting monthly limits renewal...');
      
      // Check if monthly tracking columns exist
      const hasMonthlyColumns = await this.queryAsync(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME IN ('monthlyRedemptionCount', 'monthlyDealCount')
      `);
      
      if (hasMonthlyColumns.length > 0) {
        // Reset monthly counters for all users
        const resetResult = await this.queryAsync(`
          UPDATE users 
          SET monthlyRedemptionCount = 0, monthlyDealCount = 0 
          WHERE status = 'approved'
        `);
        
        console.log(`✅ Reset monthly limits for ${resetResult.affectedRows} users`);
        
        return {
          success: true,
          usersReset: resetResult.affectedRows
        };
      } else {
        console.log('ℹ️ Monthly tracking columns not found, skipping reset');
        return {
          success: true,
          usersReset: 0,
          message: 'Monthly tracking columns not found'
        };
      }
    } catch (error) {
      console.error('❌ Error renewing monthly limits:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new UnifiedNotificationService();