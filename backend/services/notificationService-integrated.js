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
      const userResult = await this.queryAsync('SELECT email, fullName FROM users WHERE id = ?', [userId]);
      if (userResult.length === 0) return { success: false, error: 'User not found' };

      const user = userResult[0];
      const data = {
        firstName: user.fullName?.split(' ')[0] || 'Member',
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
      const userResult = await this.queryAsync('SELECT email, fullName FROM users WHERE id = ?', [userId]);
      if (userResult.length === 0) return { success: false, error: 'User not found' };

      const user = userResult[0];
      const data = {
        firstName: user.fullName?.split(' ')[0] || 'Member',
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
      const userResult = await this.queryAsync('SELECT email, fullName FROM users WHERE id = ?', [userId]);
      if (userResult.length === 0) return { success: false, error: 'User not found' };

      const user = userResult[0];
      const data = {
        firstName: user.fullName?.split(' ')[0] || 'Member',
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
      const userResult = await this.queryAsync('SELECT email, fullName FROM users WHERE id = ?', [userId]);
      if (userResult.length === 0) return { success: false, error: 'User not found' };

      const user = userResult[0];
      const data = {
        firstName: user.fullName?.split(' ')[0] || 'Member',
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
      // Get admin emails - using adminRole column instead of role
      const adminResult = await this.queryAsync(
        'SELECT email FROM users WHERE adminRole IS NOT NULL AND adminRole != "" AND status = "approved"'
      );
      
      if (adminResult.length === 0) {
        console.log('No admin users found, checking for any user with admin in userType');
        // Fallback: check for admin in userType 
        const fallbackAdmins = await this.queryAsync(
          'SELECT email FROM users WHERE userType LIKE "%admin%" AND status = "approved"'
        );
        
        if (fallbackAdmins.length === 0) {
          return { success: false, error: 'No admin users found' };
        }
        
        adminResult.push(...fallbackAdmins);
      }

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

  async sendRedemptionRequestAlert(merchantId, redemptionData) {
    try {
      // Get merchant email - check business email first, then user email
      const merchantResult = await this.queryAsync(`
        SELECT u.email as userEmail, u.fullName, b.businessEmail, b.businessName
        FROM users u
        LEFT JOIN businesses b ON u.id = b.userId
        WHERE u.id = ?
      `, [merchantId]);
      
      if (merchantResult.length === 0) return { success: false, error: 'Merchant not found' };

      const merchant = merchantResult[0];
      const merchantEmail = merchant.businessEmail || merchant.userEmail;
      
      if (!merchantEmail) return { success: false, error: 'No email found for merchant' };

      const data = {
        businessName: merchant.businessName || 'Your Business',
        merchantEmail: merchantEmail,
        customerName: redemptionData.customerName || redemptionData.fullName,
        dealTitle: redemptionData.dealTitle,
        requestDate: new Date().toLocaleDateString(),
        membershipNumber: redemptionData.membershipNumber || 'N/A',
        requestId: redemptionData.requestId || redemptionData.id,
        customerEmail: redemptionData.customerEmail,
        approveUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/redemptions?action=approve&id=${redemptionData.requestId}`,
        rejectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/redemptions?action=reject&id=${redemptionData.requestId}`
      };

      return await emailService.sendEmail({
        to: merchantEmail,
        templateType: 'redemption_request_alert',
        data: data
      });
    } catch (error) {
      console.error('Error sending redemption request alert:', error);
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

  // Send plan assignment notification to user or merchant
  async sendPlanAssignmentNotification(userId, planId, planType = 'user') {
    try {
      console.log(`📧 Sending plan assignment notification for plan ${planId} to user ${userId}`);
      
      // Get user details
      const userResult = await this.queryAsync(`
        SELECT u.email, u.fullName, b.businessName, b.businessEmail
        FROM users u 
        LEFT JOIN businesses b ON u.id = b.userId 
        WHERE u.id = ?
      `, [userId]);

      if (userResult.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult[0];
      const userEmail = planType === 'merchant' ? (user.businessEmail || user.email) : user.email;

      // Get plan details
      const planResult = await this.queryAsync('SELECT * FROM plans WHERE id = ?', [planId]);

      if (planResult.length === 0) {
        throw new Error('Plan not found');
      }

      const plan = planResult[0];

      const data = {
        userName: planType === 'merchant' ? user.businessName : (user.fullName || user.email),
        planName: plan.name,
        planType: planType,
        planDescription: plan.description,
        planPrice: plan.price,
        planDuration: plan.duration_months,
        features: plan.features ? plan.features.split(',') : [],
        dealsPerMonth: plan.deals_per_month || 'Unlimited',
        redemptionsPerMonth: plan.redemptions_per_month || 'Unlimited',
        activationDate: new Date().toLocaleDateString(),
        expiryDate: new Date(Date.now() + (plan.duration_months * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString(),
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${planType === 'merchant' ? 'merchant' : 'user'}/dashboard`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
      };

      return await emailService.sendEmail({
        to: userEmail,
        templateType: 'plan_assignment',
        data: data
      });
      
    } catch (error) {
      console.error('❌ Error sending plan assignment notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send deal posting status notification to merchant
  async sendDealPostingStatusNotification(dealId, merchantId, status, options = {}) {
    try {
      console.log(`📧 Sending deal posting status notification for deal ${dealId} to merchant ${merchantId} - Status: ${status}`);
      
      // Get merchant details
      const merchantResult = await this.queryAsync(`
        SELECT u.email, u.fullName, b.businessName, b.businessEmail
        FROM users u 
        LEFT JOIN businesses b ON u.id = b.userId 
        WHERE u.id = ?
      `, [merchantId]);

      if (merchantResult.length === 0) {
        throw new Error('Merchant not found');
      }

      const merchant = merchantResult[0];
      const merchantEmail = merchant.businessEmail || merchant.email;

      // Get deal details
      const dealResult = await this.queryAsync('SELECT * FROM deals WHERE id = ?', [dealId]);

      if (dealResult.length === 0) {
        throw new Error('Deal not found');
      }

      const deal = dealResult[0];

      const data = {
        merchantName: merchant.businessName || merchant.fullName || 'Merchant',
        dealTitle: deal.title,
        dealCategory: deal.category,
        originalPrice: deal.original_price || deal.originalPrice,
        discountedPrice: deal.discounted_price || deal.discountedPrice,
        submittedDate: deal.created_at ? new Date(deal.created_at).toLocaleDateString() : '',
        statusUpdateDate: new Date().toLocaleDateString(),
        status: status.toLowerCase(),
        approved: status.toLowerCase() === 'approved',
        rejected: status.toLowerCase() === 'rejected',
        pending: status.toLowerCase() === 'pending',
        rejectionReason: options.rejectionReason || '',
        adminMessage: options.adminMessage || '',
        dealUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/${dealId}`,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/dashboard`,
        createDealUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/deals/create`,
        supportUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
        helpUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/help`
      };

      return await emailService.sendEmail({
        to: merchantEmail,
        templateType: 'deal_posting_status',
        data: data
      });
      
    } catch (error) {
      console.error('❌ Error sending deal posting status notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send custom deals assignment notification to merchant
  async sendCustomDealsAssignmentNotification(merchantId, newLimit, options = {}) {
    try {
      console.log(`📧 Sending custom deals assignment notification to merchant ${merchantId} - New limit: ${newLimit}`);
      
      // Get merchant details
      const merchantResult = await this.queryAsync(`
        SELECT u.email, u.fullName, b.businessName, b.businessEmail, b.maxDealsPerMonth, b.dealsUsedThisMonth
        FROM users u 
        LEFT JOIN businesses b ON u.id = b.userId 
        WHERE u.id = ?
      `, [merchantId]);

      if (merchantResult.length === 0) {
        throw new Error('Merchant not found');
      }

      const merchant = merchantResult[0];
      const merchantEmail = merchant.businessEmail || merchant.email;
      const previousLimit = merchant.maxDealsPerMonth || 5; // Default if not set
      const dealsUsedThisMonth = merchant.dealsUsedThisMonth || 0;

      // Calculate change
      const change = newLimit - previousLimit;
      const isIncrease = change > 0;
      const isDecrease = change < 0;

      // Get active deals count
      const activeDealsResult = await this.queryAsync(
        'SELECT COUNT(*) as count FROM deals WHERE businessId IN (SELECT businessId FROM businesses WHERE userId = ?) AND isActive = 1',
        [merchantId]
      );
      const activeDeals = activeDealsResult[0]?.count || 0;

      // Get total redemptions for this merchant
      const redemptionsResult = await this.queryAsync(`
        SELECT COUNT(*) as count FROM deal_redemptions dr 
        JOIN deals d ON dr.deal_id = d.id 
        WHERE d.businessId IN (SELECT businessId FROM businesses WHERE userId = ?)
      `, [merchantId]);
      const totalRedemptions = redemptionsResult[0]?.count || 0;

      const data = {
        merchantName: merchant.businessName || merchant.fullName || 'Merchant',
        newDealLimit: newLimit,
        previousLimit: previousLimit,
        change: Math.abs(change),
        isIncrease: isIncrease,
        isDecrease: isDecrease,
        changeClass: isIncrease ? 'increase' : (isDecrease ? 'decrease' : 'same'),
        effectiveDate: new Date().toLocaleDateString(),
        assignedBy: options.assignedBy || 'Admin Team',
        validUntil: options.validUntil || '',
        adminMessage: options.adminMessage || '',
        dealsUsedThisMonth: dealsUsedThisMonth,
        remainingDeals: Math.max(0, newLimit - dealsUsedThisMonth),
        totalRedemptions: totalRedemptions,
        activeDeals: activeDeals,
        isPremiumLimit: newLimit >= 20,
        tips: newLimit > previousLimit, // Show tips if it's an increase
        createDealUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/deals/create`,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/dashboard`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
        helpUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/help`
      };

      return await emailService.sendEmail({
        to: merchantEmail,
        templateType: 'custom_deals_assignment',
        data: data
      });
      
    } catch (error) {
      console.error('❌ Error sending custom deals assignment notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();
