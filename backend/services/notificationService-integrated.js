/**
 * Notification Service for Indians in Ghana Membership Platform
 * Handles all email notifications using existing database templates
 */

const emailService = require('./emailService-integrated');
const db = require('../db');
const { promisify } = require('util');

class NotificationService {
  constructor() {
    this.queryAsync = promisify(db.query).bind(db);
  }

  // User Notifications
  async sendWelcomeEmail(userId, userData) {
    try {
      const data = {
        firstName: userData.firstName || userData.fullName?.split(' ')[0] || 'Member',
        fullName: userData.fullName || userData.email,
        email: userData.email,
        membershipNumber: userData.membershipNumber || `MEM${userId}`,
        validationDate: userData.validationDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
      };

      return await emailService.sendEmail({
        to: userData.email,
        templateType: 'user_welcome',
        data: data
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendDealNotification(userId, dealData) {
    try {
      // Get user email
      const userResult = await this.queryAsync('SELECT email, firstName, fullName FROM users WHERE id = ?', [userId]);
      if (userResult.length === 0) return { success: false, error: 'User not found' };

      const user = userResult[0];
      const data = {
        firstName: user.firstName || user.fullName?.split(' ')[0] || 'Member',
        dealTitle: dealData.title || dealData.dealTitle,
        dealDescription: dealData.description || dealData.dealDescription,
        businessName: dealData.businessName || 'Business',
        discount: dealData.discount || dealData.discountPercentage || '',
        validUntil: dealData.validUntil || dealData.expiryDate || '',
        dealUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/${dealData.id}`
      };

      return await emailService.sendEmail({
        to: user.email,
        templateType: 'new_deal_notification',
        data: data
      });
    } catch (error) {
      console.error('Error sending deal notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendProfileStatusUpdate(userId, statusData) {
    try {
      const userResult = await this.queryAsync('SELECT email, firstName, fullName FROM users WHERE id = ?', [userId]);
      if (userResult.length === 0) return { success: false, error: 'User not found' };

      const user = userResult[0];
      const data = {
        firstName: user.firstName || user.fullName?.split(' ')[0] || 'Member',
        fullName: user.fullName || user.email,
        newStatus: statusData.status || statusData.newStatus,
        reason: statusData.reason || '',
        statusMessage: this.getStatusMessage(statusData.status, statusData.reason),
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
      };

      return await emailService.sendEmail({
        to: user.email,
        templateType: 'profile_status_update',
        data: data
      });
    } catch (error) {
      console.error('Error sending profile status update:', error);
      return { success: false, error: error.message };
    }
  }

  async sendRedemptionApproved(userId, redemptionData) {
    try {
      const userResult = await this.queryAsync('SELECT email, firstName, fullName FROM users WHERE id = ?', [userId]);
      if (userResult.length === 0) return { success: false, error: 'User not found' };

      const user = userResult[0];
      const data = {
        firstName: user.firstName || user.fullName?.split(' ')[0] || 'Member',
        dealTitle: redemptionData.dealTitle || 'Deal',
        businessName: redemptionData.businessName || 'Business',
        status: 'approved',
        redemptionDate: redemptionData.redemptionDate || new Date().toLocaleDateString(),
        qrCode: redemptionData.qrCode || ''
      };

      return await emailService.sendEmail({
        to: user.email,
        templateType: 'redemption_approved',
        data: data
      });
    } catch (error) {
      console.error('Error sending redemption approved:', error);
      return { success: false, error: error.message };
    }
  }

  async sendRedemptionRejected(userId, redemptionData) {
    try {
      const userResult = await this.queryAsync('SELECT email, firstName, fullName FROM users WHERE id = ?', [userId]);
      if (userResult.length === 0) return { success: false, error: 'User not found' };

      const user = userResult[0];
      const data = {
        firstName: user.firstName || user.fullName?.split(' ')[0] || 'Member',
        dealTitle: redemptionData.dealTitle || 'Deal',
        businessName: redemptionData.businessName || 'Business',
        status: 'rejected',
        rejectionReason: redemptionData.reason || redemptionData.rejectionReason || 'No reason provided',
        redemptionDate: redemptionData.redemptionDate || new Date().toLocaleDateString()
      };

      return await emailService.sendEmail({
        to: user.email,
        templateType: 'redemption_rejected',
        data: data
      });
    } catch (error) {
      console.error('Error sending redemption rejected:', error);
      return { success: false, error: error.message };
    }
  }

  // Merchant Notifications
  async sendMerchantWelcome(merchantData) {
    try {
      // For merchants, we need to check if they have a business email or use their user email
      let email = merchantData.businessEmail || merchantData.email;
      let businessName = merchantData.businessName || merchantData.name || 'Your Business';

      // If we have userId, get user details
      if (merchantData.userId) {
        const userResult = await this.queryAsync('SELECT email, fullName FROM users WHERE id = ?', [merchantData.userId]);
        if (userResult.length > 0) {
          email = email || userResult[0].email;
        }
      }

      const data = {
        businessName: businessName,
        ownerName: merchantData.ownerName || merchantData.fullName || 'Business Owner',
        email: email,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/login`
      };

      return await emailService.sendEmail({
        to: email,
        templateType: 'merchant_welcome',
        data: data
      });
    } catch (error) {
      console.error('Error sending merchant welcome:', error);
      return { success: false, error: error.message };
    }
  }

  async sendDealStatusNotification(dealData, status) {
    try {
      // Get merchant/business email from the deal
      const dealQuery = `
        SELECT d.*, u.email as userEmail, b.businessEmail, b.businessName, u.fullName
        FROM deals d
        LEFT JOIN users u ON d.userId = u.id  
        LEFT JOIN businesses b ON d.businessId = b.businessId
        WHERE d.id = ?
      `;
      
      const dealResult = await this.queryAsync(dealQuery, [dealData.id || dealData.dealId]);
      if (dealResult.length === 0) return { success: false, error: 'Deal not found' };

      const deal = dealResult[0];
      const email = deal.businessEmail || deal.userEmail;
      
      if (!email) return { success: false, error: 'No email found for merchant' };

      const data = {
        dealTitle: deal.title || dealData.title,
        businessName: deal.businessName || 'Your Business',
        status: status,
        reason: dealData.reason || '',
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/deals`
      };

      const templateType = status === 'approved' ? 'deal_approved' : 'deal_rejected';
      
      return await emailService.sendEmail({
        to: email,
        templateType: templateType,
        data: data
      });
    } catch (error) {
      console.error('Error sending deal status notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Admin Notifications
  async sendAdminNotification(type, data) {
    try {
      // Get admin emails
      const adminResult = await this.queryAsync(
        'SELECT email FROM users WHERE role = "admin" OR role = "super_admin"'
      );
      
      if (adminResult.length === 0) return { success: false, error: 'No admin users found' };

      const results = [];
      
      for (const admin of adminResult) {
        const result = await emailService.sendEmail({
          to: admin.email,
          templateType: type,
          data: data
        });
        results.push(result);
      }

      return {
        success: true,
        sent: results.filter(r => r.success).length,
        total: results.length
      };
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility Methods
  getStatusMessage(status, reason) {
    const messages = {
      'approved': 'Your profile has been approved and you now have full access to the platform.',
      'rejected': `Your profile was not approved. ${reason ? 'Reason: ' + reason : 'Please contact support for more information.'}`,
      'suspended': `Your account has been temporarily suspended. ${reason ? 'Reason: ' + reason : 'Please contact support.'}`,
      'pending': 'Your profile is currently under review. You will be notified once the review is complete.',
      'active': 'Your account is now active and you have full access to the platform.'
    };

    return messages[status] || `Your account status has been updated to: ${status}`;
  }

  async checkUserEmailPreferences(userId, notificationType) {
    try {
      const result = await this.queryAsync(
        'SELECT is_enabled FROM user_email_preferences WHERE user_id = ? AND notification_type = ?',
        [userId, notificationType]
      );

      // Default to enabled if no preference is set
      return result.length > 0 ? result[0].is_enabled : true;
    } catch (error) {
      console.error('Error checking email preferences:', error);
      return true; // Default to enabled on error
    }
  }

  // Batch operations
  async sendBulkNotifications(recipients, templateType, commonData) {
    try {
      const results = [];
      
      for (const recipient of recipients) {
        const data = { ...commonData, ...recipient.data };
        const result = await emailService.sendEmail({
          to: recipient.email,
          templateType: templateType,
          data: data
        });
        results.push({ email: recipient.email, ...result });
      }

      return {
        success: true,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        total: results.length,
        results: results
      };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();
