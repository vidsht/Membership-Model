const emailService = require('./emailService');
const WhatsAppMessageService = require('./whatsappMessageService');
const { formatDateForEmail } = require('../utils/dateFormatter');
const db = require('../db');

class NotificationService {
  constructor() {
    this.emailService = emailService;
  }

  // User Notifications
  async sendWelcomeMessage(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      await this.emailService.sendEmail({
        to: user.email,
        type: 'user_welcome',
        data: {
          fullName: user.fullName,
          firstName: (user.fullName || '').split(' ')[0] || 'Member',
          email: user.email,
          membershipNumber: user.membershipNumber,
          validationDate: user.validationDate
        }
      });

      console.log(`Welcome email sent to user: ${user.email}`);
    } catch (error) {
      console.error('Error sending welcome message:', error);
      throw error;
    }
  }

  async notifyNewDealPosted(dealId, excludeMerchantId = null) {
    try {
      const deal = await this.getDealById(dealId);
      if (!deal) throw new Error('Deal not found');

      // Get all active users with valid plans
      const users = await this.getActiveUsersWithValidPlans(excludeMerchantId);

      for (const user of users) {
        await this.emailService.sendEmail({
          to: user.email,
          type: 'new_deal_notification',
          data: {
            firstName: (user.fullName || '').split(' ')[0] || 'Member',
            dealTitle: deal.title,
            dealDescription: deal.description,
            businessName: deal.businessName,
            discount: deal.discount,
            validUntil: deal.validUntil,
            dealUrl: `${process.env.FRONTEND_URL}/deals`
          }
        });
      }

      console.log(`New deal notification sent to ${users.length} users`);
    } catch (error) {
      console.error('Error sending new deal notifications:', error);
      throw error;
    }
  }

  async notifyProfileStatusUpdate(userId, newStatus, reason = null) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      await this.emailService.sendEmail({
        to: user.email,
        type: 'profile_status_update',
        data: {
          firstName: (user.fullName || '').split(' ')[0] || 'Member',
          fullName: user.fullName,
          newStatus: newStatus,
          reason: reason,
          statusMessage: this.getStatusMessage(newStatus),
          loginUrl: `${process.env.FRONTEND_URL}/login`
        }
      });

      console.log(`Profile status update email sent to user: ${user.email}`);
    } catch (error) {
      console.error('Error sending profile status update:', error);
      throw error;
    }
  }

  async notifyRedemptionResponse(redemptionId) {
    try {
      const redemption = await this.getRedemptionById(redemptionId);
      if (!redemption) throw new Error('Redemption not found');

      const emailType = redemption.status === 'approved' ? 'redemption_approved' : 'redemption_rejected';

      await this.emailService.sendEmail({
        to: redemption.userEmail,
        type: emailType,
        data: {
          firstName: redemption.firstName,
          dealTitle: redemption.dealTitle,
          businessName: redemption.businessName,
          status: redemption.status,
          rejectionReason: redemption.rejectionReason,
          redemptionDate: redemption.redemptionDate,
          qrCode: redemption.qrCode
        }
      });

      console.log(`Redemption response email sent to user: ${redemption.userEmail}`);
    } catch (error) {
      console.error('Error sending redemption response:', error);
      throw error;
    }
  }

  async notifyMaxRedemptionLimitReached(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      const userPlan = await this.getUserPlan(userId);

      await this.emailService.sendEmail({
        to: user.email,
        type: 'redemption_limit_reached',
        data: {
          firstName: (user.fullName || '').split(' ')[0] || 'Member',
          currentLimit: userPlan.monthlyRedemptionLimit,
          resetDate: this.getNextMonthFirstDay(),
          planName: userPlan.planName
        }
      });
      console.log(`Max redemption limit notification sent to user: ${user.email}`);
    } catch (error) {
      console.error('Error sending max redemption limit notification:', error);
      throw error;
    }
  }

  async sendPlanExpiryWarning(userId, daysUntilExpiry) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      const userPlan = await this.getUserPlan(userId);

      await this.emailService.sendEmail({
        to: user.email,
        type: 'plan_expiry_warning',
        data: {
          firstName: (user.fullName || '').split(' ')[0] || 'Member',
          planName: userPlan.planName,
          expiryDate: user.validationDate,
          daysLeft: daysUntilExpiry,
          renewalUrl: `${process.env.FRONTEND_URL}/plans`
        }
      });

      console.log(`Plan expiry warning sent to user: ${user.email}`);
    } catch (error) {
      console.error('Error sending plan expiry warning:', error);
      throw error;
    }
  }

  async notifyRedemptionLimitRenewed(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      const userPlan = await this.getUserPlan(userId);

      await this.emailService.sendEmail({
        to: user.email,
        type: 'redemption_limit_renewed',
        data: {
          firstName: (user.fullName || '').split(' ')[0] || 'Member',
          newLimit: userPlan.monthlyRedemptionLimit,
          planName: userPlan.planName,
          currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
      });

      console.log(`Redemption limit renewed notification sent to user: ${user.email}`);
    } catch (error) {
      console.error('Error sending redemption limit renewed notification:', error);
      throw error;
    }
  }

  async notifyNewPlanAssigned(userId, planId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      const plan = await this.getPlanById(planId);
      if (!plan) throw new Error('Plan not found');

      await this.emailService.sendEmail({
        to: user.email,
        type: 'plan_assigned',
        data: {
          firstName: (user.fullName || '').split(' ')[0] || 'Member',
          planName: plan.name,
          planDescription: plan.description,
          monthlyRedemptionLimit: plan.monthlyRedemptionLimit,
          validUntil: user.validationDate,
          dashboardUrl: `${process.env.FRONTEND_URL}/login`
        }
      });

      console.log(`New plan assignment notification sent to user: ${user.email}`);
    } catch (error) {
      console.error('Error sending new plan assignment notification:', error);
      throw error;
    }
  }

  async notifyPasswordChangedByAdmin(userId, userData = {}) {
    try {
      const user = await this.getUserById(userId);
      // Prefer admin-provided data when available (useful for legacy flows or when DB record is incomplete)
      const recipientEmail = (userData && userData.email) ? userData.email : (user && user.email) ? user.email : null;
      const recipientFullName = (userData && userData.fullName) ? userData.fullName : (user && user.fullName) ? user.fullName : '';

      if (!recipientEmail) {
        console.warn(`Password change notification skipped: no recipient email available for userId=${userId}`);
        return { success: false, reason: 'no_recipient_email' };
      }

      const firstName = (recipientFullName || '').split(' ')[0] || 'Member';

      await this.emailService.sendEmail({
        to: recipientEmail,
        type: 'password_changed_by_admin',
        data: {
          firstName: firstName,
          fullName: recipientFullName,
          email: recipientEmail,
          tempPassword: (userData && userData.tempPassword) || '',
          loginUrl: `${process.env.FRONTEND_URL}/login`,
          supportEmail: process.env.SUPPORT_EMAIL || 'cards@indiansinghana.com'
        }
      });

      console.log(`Password change notification sent to ${recipientEmail} for user ID: ${userId}`);
      return { success: true, to: recipientEmail };
    } catch (error) {
      console.error('Error sending password change notification:', error);
      throw error;
    }
  }

  // Merchant Notifications
  async sendMerchantWelcomeMessage(merchantId) {
    try {
      const merchant = await this.getMerchantById(merchantId);
      if (!merchant) throw new Error('Merchant not found');

      await this.emailService.sendEmail({
        to: merchant.email,
        type: 'merchant_welcome',
        data: {
          businessName: merchant.businessName,
          ownerName: merchant.ownerName || (merchant.fullName || '').split(' ')[0] || 'Owner',
          email: merchant.email,
          businessType: merchant.businessType,
          validationDate: merchant.validationDate,
          dashboardUrl: `${process.env.FRONTEND_URL}/login`
        }
      });

      console.log(`Merchant welcome email sent to: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending merchant welcome message:', error);
      throw error;
    }
  }

  async notifyDealRequestResponse(dealId) {
    try {
      const deal = await this.getDealById(dealId);
      if (!deal) throw new Error('Deal not found');

      const merchant = await this.getUserById(deal.businessId);
      if (!merchant) throw new Error('Merchant not found');

      const emailType = deal.status === 'approved' ? 'deal_approved' : 'deal_rejected';

      await this.emailService.sendEmail({
        to: merchant.email,
        type: emailType,
        data: {
          businessName: merchant.businessName,
          ownerName: (merchant.fullName || '').split(' ')[0] || 'Owner',
          dealTitle: deal.title,
          dealDescription: deal.description,
          status: deal.status,
          rejectionReason: deal.rejectionReason,
          approvedDate: deal.updatedAt,
          dealUrl: deal.status === 'approved' ? `${process.env.FRONTEND_URL}/deals` : null
        }
      });

      console.log(`Deal response notification sent to merchant: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending deal response notification:', error);
      throw error;
    }
  }

  async notifyMerchantProfileStatusUpdate(merchantId, newStatus, reason = null) {
    try {
      const merchant = await this.getMerchantById(merchantId);
      if (!merchant) throw new Error('Merchant not found');

      await this.emailService.sendEmail({
        to: merchant.email,
        type: 'profile_status_update',
        data: {
          businessName: merchant.businessName,
          ownerName: (merchant.fullName || '').split(' ')[0] || 'Owner',
          newStatus: newStatus,
          reason: reason,
          statusMessage: this.getStatusMessage(newStatus),
          loginUrl: `${process.env.FRONTEND_URL}/login`
        }
      });

      console.log(`Merchant profile status update email sent to: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending merchant profile status update:', error);
      throw error;
    }
  }

  async notifyDealLimitReached(merchantId) {
    try {
      const merchant = await this.getMerchantById(merchantId);
      if (!merchant) throw new Error('Merchant not found');

      const merchantPlan = await this.getUserPlan(merchantId);

      await this.emailService.sendEmail({
        to: merchant.email,
        type: 'deal_limit_reached',
        data: {
          businessName: merchant.businessName,
          ownerName: (merchant.fullName || '').split(' ')[0] || 'Owner',
          currentLimit: merchantPlan.monthlyDealLimit,
          resetDate: this.getNextMonthFirstDay(),
          planName: merchantPlan.planName
        }
      });

      console.log(`Deal limit reached notification sent to merchant: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending deal limit reached notification:', error);
      throw error;
    }
  }

  async sendMerchantPlanExpiryWarning(merchantId, daysUntilExpiry) {
    try {
      const merchant = await this.getMerchantById(merchantId);
      if (!merchant) throw new Error('Merchant not found');

      const merchantPlan = await this.getUserPlan(merchantId);

      await this.emailService.sendEmail({
        to: merchant.email,
        type: 'plan_expiry_warning',
        data: {
          businessName: merchant.businessName,
          ownerName: (merchant.fullName || '').split(' ')[0] || 'Owner',
          planName: merchantPlan.planName,
          expiryDate: merchant.validationDate,
          daysLeft: daysUntilExpiry,
          renewalUrl: `${process.env.FRONTEND_URL}/plans`
        }
      });

      console.log(`Merchant plan expiry warning sent to: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending merchant plan expiry warning:', error);
      throw error;
    }
  }

  async notifyCustomDealLimitAssigned(merchantId, newLimit) {
    try {
      const merchant = await this.getMerchantById(merchantId);
      if (!merchant) throw new Error('Merchant not found');

      await this.emailService.sendEmail({
        to: merchant.email,
        type: 'custom_deal_limit_assigned',
        data: {
          businessName: merchant.businessName,
          ownerName: (merchant.fullName || '').split(' ')[0] || 'Owner',
          newLimit: newLimit,
          effectiveDate: new Date().toLocaleDateString(),
          dashboardUrl: `${process.env.FRONTEND_URL}/login`
        }
      });

      console.log(`Custom deal limit notification sent to merchant: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending custom deal limit notification:', error);
      throw error;
    }
  }

  async notifyDealLimitRenewed(merchantId) {
    try {
      const merchant = await this.getMerchantById(merchantId);
      if (!merchant) throw new Error('Merchant not found');

      const merchantPlan = await this.getUserPlan(merchantId);

      await this.emailService.sendEmail({
        to: merchant.email,
        type: 'deal_limit_renewed',
        data: {
          businessName: merchant.businessName,
          ownerName: (merchant.fullName || '').split(' ')[0] || 'Owner',
          newLimit: merchantPlan.monthlyDealLimit,
          planName: merchantPlan.planName,
          currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }
      });

      console.log(`Deal limit renewed notification sent to merchant: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending deal limit renewed notification:', error);
      throw error;
    }
  }

  async notifyMerchantNewPlanAssigned(merchantId, planId) {
    try {
      const merchant = await this.getMerchantById(merchantId);
      if (!merchant) throw new Error('Merchant not found');

      const plan = await this.getPlanById(planId);
      if (!plan) throw new Error('Plan not found');

      await this.emailService.sendEmail({
        to: merchant.email,
        type: 'plan_assigned',
        data: {
          businessName: merchant.businessName,
          ownerName: (merchant.fullName || '').split(' ')[0] || 'Owner',
          planName: plan.name,
          planDescription: plan.description,
          monthlyDealLimit: plan.monthlyDealLimit,
          validUntil: merchant.validationDate,
          dashboardUrl: `${process.env.FRONTEND_URL}/login`
        }
      });

      console.log(`New plan assignment notification sent to merchant: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending merchant new plan assignment notification:', error);
      throw error;
    }
  }

  async notifyNewRedemptionRequest(redemptionId) {
    try {
      const redemption = await this.getRedemptionById(redemptionId);
      if (!redemption) throw new Error('Redemption not found');

      const merchant = await this.getUserById(redemption.businessId);
      if (!merchant) throw new Error('Merchant not found');

      await this.emailService.sendEmail({
        to: merchant.email,
        type: 'new_redemption_request',
        data: {
          businessName: merchant.businessName,
          ownerName: (merchant.fullName || '').split(' ')[0] || 'Owner',
          dealTitle: redemption.dealTitle,
          userName: redemption.userName,
          userEmail: redemption.userEmail,
          redemptionDate: redemption.redemptionDate,
          qrCode: redemption.qrCode,
          dashboardUrl: `${process.env.FRONTEND_URL}`
        }
      });

      console.log(`New redemption request notification sent to merchant: ${merchant.email}`);
    } catch (error) {
      console.error('Error sending new redemption request notification:', error);
      throw error;
    }
  }

  // Admin Notifications
  async notifyAdminNewRegistration(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      const admins = await this.getAdminEmails();

      for (const admin of admins) {
        await this.emailService.sendEmail({
          to: admin.email,
          type: 'admin_new_registration',
          data: {
            adminName: (admin.fullName || '').split(' ')[0] || 'Admin',
            userType: user.userType,
            fullName: user.fullName,
            email: user.email,
            businessName: user.businessName,
            registrationDate: user.createdAt,
            reviewUrl: `${process.env.FRONTEND_URL}/admin/users/${userId}`
          }
        });
      }

      console.log(`New registration notification sent to ${admins.length} admins`);
    } catch (error) {
      console.error('Error sending admin new registration notification:', error);
      throw error;
    }
  }

  async notifyAdminDealRedemption(redemptionId) {
    try {
      const redemption = await this.getRedemptionById(redemptionId);
      if (!redemption) throw new Error('Redemption not found');

      const admins = await this.getAdminEmails();

      for (const admin of admins) {
        await this.emailService.sendEmail({
          to: admin.email,
          type: 'admin_deal_redemption',
          data: {
            adminName: (admin.fullName || '').split(' ')[0] || 'Admin',
            dealTitle: redemption.dealTitle,
            businessName: redemption.businessName,
            userName: redemption.userName,
            userEmail: redemption.userEmail,
            redemptionDate: redemption.redemptionDate,
            status: redemption.status
          }
        });
      }

      console.log(`Deal redemption notification sent to ${admins.length} admins`);
    } catch (error) {
      console.error('Error sending admin deal redemption notification:', error);
      throw error;
    }
  }

  async notifyAdminNewDealRequest(dealId) {
    try {
      const deal = await this.getDealById(dealId);
      if (!deal) throw new Error('Deal not found');

      const merchant = await this.getUserById(deal.businessId);
      if (!merchant) throw new Error('Merchant not found');

      const admins = await this.getAdminEmails();

      for (const admin of admins) {
        await this.emailService.sendEmail({
          to: admin.email,
          type: 'admin_new_deal_request',
          data: {
            adminName: (admin.fullName || '').split(' ')[0] || 'Admin',
            dealTitle: deal.title,
            dealDescription: deal.description,
            businessName: merchant.businessName,
            merchantEmail: merchant.email,
            submissionDate: deal.createdAt,
            reviewUrl: `${process.env.FRONTEND_URL}/admin/deals/${dealId}`
          }
        });
      }

      console.log(`New deal request notification sent to ${admins.length} admins`);
    } catch (error) {
      console.error('Error sending admin new deal request notification:', error);
      throw error;
    }
  }

  async notifyAdminDealPublished(dealId) {
    try {
      const deal = await this.getDealById(dealId);
      if (!deal) throw new Error('Deal not found');

      const merchant = await this.getUserById(deal.businessId);
      if (!merchant) throw new Error('Merchant not found');

      const admins = await this.getAdminEmails();

      for (const admin of admins) {
        await this.emailService.sendEmail({
          to: admin.email,
          type: 'admin_deal_published',
          data: {
            adminName: (admin.fullName || '').split(' ')[0] || 'Admin',
            dealTitle: deal.title,
            businessName: merchant.businessName,
            publishedDate: deal.updatedAt,
            dealUrl: `${process.env.FRONTEND_URL}/deals`
          }
        });
      }

      console.log(`Deal published notification sent to ${admins.length} admins`);
    } catch (error) {
      console.error('Error sending admin deal published notification:', error);
      throw error;
    }
  }

  async notifyAdminPlanExpiryAlert() {
    try {
      const expiringUsers = await this.getExpiringUsers();
      if (expiringUsers.length === 0) return;

      const admins = await this.getAdminEmails();

      for (const admin of admins) {
        await this.emailService.sendEmail({
          to: admin.email,
          type: 'admin_plan_expiry_alert',
          data: {
            adminName: (admin.fullName || '').split(' ')[0] || 'Admin',
            expiringCount: expiringUsers.length,
            expiringUsers: expiringUsers,
            dashboardUrl: `${process.env.FRONTEND_URL}`
          }
        });
      }

      console.log(`Plan expiry alert sent to ${admins.length} admins for ${expiringUsers.length} users`);
    } catch (error) {
      console.error('Error sending admin plan expiry alert:', error);
      throw error;
    }
  }

  // Scheduled Tasks
  async checkAndSendExpiryWarnings() {
    try {
      console.log('Checking for plan expiry warnings...');
      
      // Check for users expiring in 7 days
      const usersExpiring7Days = await this.getUsersExpiringInDays(7);
      for (const user of usersExpiring7Days) {
        await this.sendPlanExpiryWarning(user.id, 7);
      }

      // Check for users expiring in 3 days
      const usersExpiring3Days = await this.getUsersExpiringInDays(3);
      for (const user of usersExpiring3Days) {
        await this.sendPlanExpiryWarning(user.id, 3);
      }

      // Check for users expiring in 1 day
      const usersExpiring1Day = await this.getUsersExpiringInDays(1);
      for (const user of usersExpiring1Day) {
        await this.sendPlanExpiryWarning(user.id, 1);
      }

      // Check for merchants expiring in 7 days
      const merchantsExpiring7Days = await this.getMerchantsExpiringInDays(7);
      for (const merchant of merchantsExpiring7Days) {
        await this.sendMerchantPlanExpiryWarning(merchant.id, 7);
      }

      // Check for merchants expiring in 3 days
      const merchantsExpiring3Days = await this.getMerchantsExpiringInDays(3);
      for (const merchant of merchantsExpiring3Days) {
        await this.sendMerchantPlanExpiryWarning(merchant.id, 3);
      }

      // Check for merchants expiring in 1 day
      const merchantsExpiring1Day = await this.getMerchantsExpiringInDays(1);
      for (const merchant of merchantsExpiring1Day) {
        await this.sendMerchantPlanExpiryWarning(merchant.id, 1);
      }

      // Send admin alert if any users are expiring
      const totalExpiring = usersExpiring7Days.length + usersExpiring3Days.length + 
                          usersExpiring1Day.length + merchantsExpiring7Days.length + 
                          merchantsExpiring3Days.length + merchantsExpiring1Day.length;

      if (totalExpiring > 0) {
        await this.notifyAdminPlanExpiryAlert();
      }

      console.log(`Expiry warning check completed. Processed ${totalExpiring} expiring plans.`);
    } catch (error) {
      console.error('Error checking expiry warnings:', error);
    }
  }

  async renewMonthlyLimits() {
    try {
      console.log('Renewing monthly limits...');
      
      // Reset user redemption counts (preserve current behavior for notification)
      const usersToReset = await this.getUsersWithRedemptionLimits();
      for (const user of usersToReset) {
        await this.resetUserRedemptionCount(user.id);
        await this.notifyRedemptionLimitRenewed(user.id);
      }

      // Reset merchant deal counts (preserve current behavior for notification)
      const merchantsToReset = await this.getMerchantsWithDealLimits();
      for (const merchant of merchantsToReset) {
        await this.resetMerchantDealCount(merchant.id);
        await this.notifyDealLimitRenewed(merchant.id);
      }

      // Recompute and persist current calendar-month counts based on DB rows
      // This ensures frontend (calendar-month) and backend counters stay in sync.
      await this.recomputeMonthlyCounts();

      console.log(`Monthly limits renewed for ${usersToReset.length} users and ${merchantsToReset.length} merchants`);
    } catch (error) {
      console.error('Error renewing monthly limits:', error);
    }
  }

  // Database helper methods
  queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  async getUserById(userId) {
    const query = 'SELECT * FROM users WHERE id = ?';
    const results = await this.queryAsync(query, [userId]);
    return results[0] || null;
  }

  async getMerchantById(merchantId) {
    const query = 'SELECT * FROM users WHERE id = ? AND userType = "merchant"';
    const results = await this.queryAsync(query, [merchantId]);
    return results[0] || null;
  }

  async getDealById(dealId) {
    const query = `
      SELECT d.*, u.businessName, u.email as merchantEmail
      FROM deals d
      LEFT JOIN users u ON d.businessId = u.id
      WHERE d.id = ?
    `;
    const results = await this.queryAsync(query, [dealId]);
    return results[0] || null;
  }

  async getRedemptionById(redemptionId) {
    const query = `
      SELECT dr.*, d.title as dealTitle, d.description as dealDescription,
             u.fullName, u.email as userEmail,
             u.fullName as userName,
             b.businessName, b.email as merchantEmail
      FROM deal_redemptions dr
      LEFT JOIN deals d ON dr.dealId = d.id
      LEFT JOIN users u ON dr.userId = u.id
      LEFT JOIN users b ON d.businessId = b.id
      WHERE dr.id = ?
    `;
    const results = await this.queryAsync(query, [redemptionId]);
    return results[0] || null;
  }

  async getUserPlan(userId) {
    const query = `
      SELECT up.*, p.name as planName, p.description as planDescription,
             p.monthlyRedemptionLimit, p.monthlyDealLimit
      FROM user_plans up
      LEFT JOIN plans p ON up.planId = p.id
      WHERE up.userId = ? AND up.isActive = 1
    `;
    const results = await this.queryAsync(query, [userId]);
    return results[0] || null;
  }

  async getPlanById(planId) {
    const query = 'SELECT * FROM plans WHERE id = ?';
    const results = await this.queryAsync(query, [planId]);
    return results[0] || null;
  }

  async getActiveUsersWithValidPlans(excludeUserId = null) {
    const query = `
      SELECT u.* FROM users u
      LEFT JOIN user_plans up ON u.id = up.userId
      WHERE u.status = 'active' 
      AND u.validationDate > NOW()
      AND (up.isActive = 1 OR up.isActive IS NULL)
      ${excludeUserId ? 'AND u.id != ?' : ''}
    `;
    const params = excludeUserId ? [excludeUserId] : [];
    return await this.queryAsync(query, params);
  }

  async getAdminEmails() {
    const query = 'SELECT email, fullName FROM users WHERE userType = "admin" AND status = "active"';
    return await this.queryAsync(query);
  }

  async getUsersExpiringInDays(days) {
    const query = `
      SELECT * FROM users 
      WHERE userType = 'user' 
      AND status = 'active'
      AND DATE(validationDate) = DATE(DATE_ADD(NOW(), INTERVAL ? DAY))
    `;
    return await this.queryAsync(query, [days]);
  }

  async getMerchantsExpiringInDays(days) {
    const query = `
      SELECT * FROM users 
      WHERE userType = 'merchant' 
      AND status = 'active'
      AND DATE(validationDate) = DATE(DATE_ADD(NOW(), INTERVAL ? DAY))
    `;
    return await this.queryAsync(query, [days]);
  }

  async getExpiringUsers() {
    const query = `
      SELECT id, fullName, email, userType, validationDate
      FROM users 
      WHERE status = 'active'
      AND validationDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
      ORDER BY validationDate ASC
    `;
    return await this.queryAsync(query);
  }

  async getUsersWithRedemptionLimits() {
    const query = `
      SELECT DISTINCT u.* FROM users u
      LEFT JOIN user_plans up ON u.id = up.userId
      LEFT JOIN plans p ON up.planId = p.id
      WHERE u.userType = 'user' 
      AND u.status = 'active'
      AND (p.monthlyRedemptionLimit > 0 OR p.monthlyRedemptionLimit IS NULL)
    `;
    return await this.queryAsync(query);
  }

  async getMerchantsWithDealLimits() {
    const query = `
      SELECT DISTINCT u.* FROM users u
      LEFT JOIN user_plans up ON u.id = up.userId
      LEFT JOIN plans p ON up.planId = p.id
      WHERE u.userType = 'merchant' 
      AND u.status = 'active'
      AND (p.monthlyDealLimit > 0 OR p.monthlyDealLimit IS NULL)
    `;
    return await this.queryAsync(query);
  }

  async resetUserRedemptionCount(userId) {
    // Reset usage counter to 0, set the user's monthly limit to their custom limit or plan default,
    // and record the renewal date (first day of this month)
    const query = `
      UPDATE users u
      LEFT JOIN user_plans up ON u.id = up.userId AND up.isActive = 1
      LEFT JOIN plans p ON up.planId = p.id
      SET u.monthlyRedemptionCount = 0,
          u.monthlyRedemptionLimit = COALESCE(u.customRedemptionLimit, p.monthlyRedemptionLimit, 0),
          u.lastRenewalDate = DATE_FORMAT(CURDATE(), '%Y-%m-01')
      WHERE u.id = ? AND u.userType = 'user'
    `;
    await this.queryAsync(query, [userId]);
  }

  async resetMerchantDealCount(merchantId) {
    // Reset merchant usage counter to 0, set monthly deal limit to custom or plan default,
    // and record the renewal date (first day of this month)
    const query = `
      UPDATE users u
      LEFT JOIN user_plans up ON u.id = up.userId AND up.isActive = 1
      LEFT JOIN plans p ON up.planId = p.id
      SET u.monthlyDealCount = 0,
          u.monthlyDealLimit = COALESCE(u.customDealLimit, p.monthlyDealLimit, 0),
          u.lastRenewalDate = DATE_FORMAT(CURDATE(), '%Y-%m-01')
      WHERE u.id = ? AND u.userType = 'merchant'
    `;
    await this.queryAsync(query, [merchantId]);
  }

  // New: recompute monthly counters from DB using calendar-month (frontend date)
  async recomputeMonthlyCounts() {
    try {
      console.log('🔄 Recomputing monthly counts from database...');
      
      // Recompute user redemption counts (approved only, calendar-month)
      const userCountsQuery = `
        SELECT dr.user_id as userId, COUNT(*) as cnt
        FROM deal_redemptions dr
        WHERE dr.status = 'approved'
          AND DATE_FORMAT(dr.redeemed_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
        GROUP BY dr.user_id
      `;
      const userCounts = await this.queryAsync(userCountsQuery);

      // Zero all user monthly counts, then apply computed values
      await this.queryAsync("UPDATE users SET monthlyRedemptionCount = 0 WHERE userType = 'user'");
      if (userCounts && userCounts.length) {
        const promises = userCounts.map(r => this.queryAsync('UPDATE users SET monthlyRedemptionCount = ? WHERE id = ?', [r.cnt, r.userId]));
        await Promise.all(promises);
        console.log(`✅ Updated redemption counts for ${userCounts.length} users`);
      }

      // Recompute merchant deal counts (approved deals posted this calendar-month)
      const merchantCountsQuery = `
        SELECT d.businessId as merchantId, COUNT(*) as cnt
        FROM deals d
        WHERE d.status IN ('approved', 'active')
          AND DATE_FORMAT(d.created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
        GROUP BY d.businessId
      `;
      const merchantCounts = await this.queryAsync(merchantCountsQuery);

      // Zero all merchant monthly deal counts, then apply computed values
      await this.queryAsync("UPDATE users SET monthlyDealCount = 0 WHERE userType = 'merchant'");
      if (merchantCounts && merchantCounts.length) {
        const mPromises = merchantCounts.map(r => this.queryAsync('UPDATE users SET monthlyDealCount = ? WHERE id = ?', [r.cnt, r.merchantId]));
        await Promise.all(mPromises);
        console.log(`✅ Updated deal counts for ${merchantCounts.length} merchants`);
      }

      console.log('✅ Monthly count recomputation completed');
    } catch (err) {
      console.error('❌ Error recomputing monthly counts:', err);
      throw err;
    }
  }

  // Increment user's redemption count when a redemption is approved
  async incrementUserRedemptionCount(userId, redemptionDate = new Date()) {
    try {
      // Only increment if redemption is from current calendar month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const redemptionMonth = new Date(redemptionDate).toISOString().slice(0, 7);
      
      if (currentMonth === redemptionMonth) {
        await this.queryAsync(
          'UPDATE users SET monthlyRedemptionCount = monthlyRedemptionCount + 1 WHERE id = ? AND userType = "user"',
          [userId]
        );
        console.log(`📈 Incremented redemption count for user ${userId}`);
      }
    } catch (err) {
      console.error('Error incrementing user redemption count:', err);
    }
  }

  // Increment merchant's deal count when a deal is approved
  async incrementMerchantDealCount(merchantId, dealDate = new Date()) {
    try {
      // Only increment if deal is from current calendar month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const dealMonth = new Date(dealDate).toISOString().slice(0, 7);
      
      if (currentMonth === dealMonth) {
        await this.queryAsync(
          'UPDATE users SET monthlyDealCount = monthlyDealCount + 1 WHERE id = ? AND userType = "merchant"',
          [merchantId]
        );
        console.log(`📈 Incremented deal count for merchant ${merchantId}`);
      }
    } catch (err) {
      console.error('Error incrementing merchant deal count:', err);
    }
  }

  // Decrement user's redemption count when a redemption is rejected (if it was previously approved)
  async decrementUserRedemptionCount(userId, redemptionDate = new Date()) {
    try {
      // Only decrement if redemption is from current calendar month and count > 0
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const redemptionMonth = new Date(redemptionDate).toISOString().slice(0, 7);
      
      if (currentMonth === redemptionMonth) {
        await this.queryAsync(
          'UPDATE users SET monthlyRedemptionCount = GREATEST(monthlyRedemptionCount - 1, 0) WHERE id = ? AND userType = "user"',
          [userId]
        );
        console.log(`📉 Decremented redemption count for user ${userId}`);
      }
    } catch (err) {
      console.error('Error decrementing user redemption count:', err);
    }
  }

  // Get comprehensive monthly statistics for admin dashboard
  async getMonthlyStatistics() {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const stats = {
        users: {
          totalActiveUsers: 0,
          totalRedemptions: 0,
          avgRedemptionsPerUser: 0,
          usersAtLimit: 0
        },
        merchants: {
          totalActiveMerchants: 0,
          totalDealsPosted: 0,
          avgDealsPerMerchant: 0,
          merchantsAtLimit: 0
        },
        deals: {
          approvedThisMonth: 0,
          pendingApproval: 0,
          totalRedemptions: 0,
          conversionRate: 0
        }
      };

      // User statistics
      const userStatsQuery = `
        SELECT 
          COUNT(*) as totalUsers,
          SUM(monthlyRedemptionCount) as totalRedemptions,
          AVG(monthlyRedemptionCount) as avgRedemptions,
          SUM(CASE WHEN monthlyRedemptionCount >= COALESCE(customRedemptionLimit, 
            (SELECT monthlyRedemptionLimit FROM plans p 
             LEFT JOIN user_plans up ON p.id = up.planId 
             WHERE up.userId = users.id AND up.isActive = 1 LIMIT 1), 5) THEN 1 ELSE 0 END) as usersAtLimit
        FROM users 
        WHERE userType = 'user' AND status = 'active'
      `;
      const userStats = await this.queryAsync(userStatsQuery);
      if (userStats.length > 0) {
        stats.users = {
          totalActiveUsers: userStats[0].totalUsers || 0,
          totalRedemptions: userStats[0].totalRedemptions || 0,
          avgRedemptionsPerUser: parseFloat(userStats[0].avgRedemptions) || 0,
          usersAtLimit: userStats[0].usersAtLimit || 0
        };
      }

      // Merchant statistics
      const merchantStatsQuery = `
        SELECT 
          COUNT(*) as totalMerchants,
          SUM(monthlyDealCount) as totalDeals,
          AVG(monthlyDealCount) as avgDeals,
          SUM(CASE WHEN monthlyDealCount >= COALESCE(
            (SELECT monthlyDealLimit FROM plans p 
             LEFT JOIN user_plans up ON p.id = up.planId 
             WHERE up.userId = users.id AND up.isActive = 1 LIMIT 1), 3) THEN 1 ELSE 0 END) as merchantsAtLimit
        FROM users 
        WHERE userType = 'merchant' AND status = 'active'
      `;
      const merchantStats = await this.queryAsync(merchantStatsQuery);
      if (merchantStats.length > 0) {
        stats.merchants = {
          totalActiveMerchants: merchantStats[0].totalMerchants || 0,
          totalDealsPosted: merchantStats[0].totalDeals || 0,
          avgDealsPerMerchant: parseFloat(merchantStats[0].avgDeals) || 0,
          merchantsAtLimit: merchantStats[0].merchantsAtLimit || 0
        };
      }

      // Deal statistics for current month
      const dealStatsQuery = `
        SELECT 
          SUM(CASE WHEN status IN ('approved', 'active') THEN 1 ELSE 0 END) as approvedDeals,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingDeals,
          (SELECT COUNT(*) FROM deal_redemptions dr 
           JOIN deals d ON dr.deal_id = d.id 
           WHERE dr.status = 'approved' 
           AND DATE_FORMAT(dr.redeemed_at, '%Y-%m') = '${currentMonth}') as totalRedemptions,
          (SELECT SUM(views) FROM deals 
           WHERE DATE_FORMAT(created_at, '%Y-%m') = '${currentMonth}') as totalViews
        FROM deals 
        WHERE DATE_FORMAT(created_at, '%Y-%m') = '${currentMonth}'
      `;
      const dealStats = await this.queryAsync(dealStatsQuery);
      if (dealStats.length > 0) {
        const totalViews = dealStats[0].totalViews || 0;
        const totalRedemptions = dealStats[0].totalRedemptions || 0;
        stats.deals = {
          approvedThisMonth: dealStats[0].approvedDeals || 0,
          pendingApproval: dealStats[0].pendingDeals || 0,
          totalRedemptions: totalRedemptions,
          conversionRate: totalViews > 0 ? ((totalRedemptions / totalViews) * 100).toFixed(2) : 0
        };
      }

      return stats;
    } catch (err) {
      console.error('Error getting monthly statistics:', err);
      return null;
    }
  }

  // Utility methods
  getStatusMessage(status) {
    const messages = {
      'active': 'Your profile has been approved and is now active.',
      'suspended': 'Your profile has been temporarily suspended.',
      'rejected': 'Your profile submission has been rejected.',
      'pending': 'Your profile is under review.'
    };
    return messages[status] || 'Your profile status has been updated.';
  }

  getNextMonthFirstDay() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString();
  }

  // Birthday Notification Methods
  async sendBirthdayGreeting(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      // Generate WhatsApp birthday message
      const whatsappMessage = WhatsAppMessageService.generateBirthdayMessage({
        firstName: (user.fullName || '').split(' ')[0] || 'Dear Member',
        fullName: user.fullName
      });

      console.log(`🎉 Birthday WhatsApp message for ${user.fullName}:`);
      console.log('=' .repeat(50));
      console.log(whatsappMessage);
      console.log('=' .repeat(50));
      console.log(`📱 Send to: ${user.phone || 'Phone number not available'}`);

      // In a real implementation, you would integrate with a WhatsApp API service here
      // For now, we're logging the message for manual sending

      // Optional: Log birthday greeting in database
      await this.logBirthdayGreeting(userId);

      return {
        success: true,
        message: whatsappMessage,
        phone: user.phone,
        recipient: user.fullName
      };

    } catch (error) {
      console.error('Error sending birthday greeting:', error);
      throw error;
    }
  }

  async logBirthdayGreeting(userId) {
    try {
      const query = `
        INSERT INTO activity_logs (user_id, action, description, timestamp)
        VALUES (?, 'birthday_greeting', 'Birthday WhatsApp greeting sent', NOW())
      `;
      await this.queryAsync(query, [userId]);
    } catch (error) {
      console.error('Error logging birthday greeting:', error);
    }
  }

  async sendTodaysBirthdayGreetings() {
    try {
      console.log('🎂 Checking for today\'s birthdays...');

      const query = `
        SELECT id, fullName, phone, email, dateOfBirth
        FROM users 
        WHERE status = 'active' 
        AND dateOfBirth IS NOT NULL
        AND (
          -- Current year birthday
          DATE_FORMAT(dateOfBirth, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')
        )
      `;

      const birthdayUsers = await this.queryAsync(query);

      if (birthdayUsers.length === 0) {
        console.log('🎂 No birthdays today');
        return { count: 0, sent: [] };
      }

      console.log(`🎉 Found ${birthdayUsers.length} birthday(s) today!`);

      const results = [];
      for (const user of birthdayUsers) {
        try {
          const result = await this.sendBirthdayGreeting(user.id);
          results.push({
            userId: user.id,
            name: user.fullName,
            success: true,
            ...result
          });
        } catch (error) {
          console.error(`Failed to send birthday greeting to ${user.fullName}:`, error);
          results.push({
            userId: user.id,
            name: user.fullName,
            success: false,
            error: error.message
          });
        }
      }

      return {
        count: birthdayUsers.length,
        sent: results
      };

    } catch (error) {
      console.error('Error sending birthday greetings:', error);
      throw error;
    }
  }

  // Enhanced Plan Expiry Notifications with Business Names
  async sendPlanExpiryWarning(userId, daysUntilExpiry = 7) {
    try {
      const user = await this.getUserById(userId);
      if (!user) throw new Error('User not found');

      // Get plan details
      const planDetails = await this.getUserPlanDetails(userId);
      if (!planDetails) throw new Error('Plan details not found');

      // Prepare template data with business name for merchants
      const templateData = {
        firstName: (user.fullName || '').split(' ')[0] || 'Member',
        fullName: user.fullName,
        planName: planDetails.planName || 'Your Plan',
        daysLeft: daysUntilExpiry,
        expiryDate: formatDateForEmail(planDetails.validationDate)
      };

      // Add business name for merchants
      if (user.userType === 'merchant' && user.businessName) {
        templateData.businessName = user.businessName;
      }

      // Send email notification
      await this.emailService.sendEmail({
        to: user.email,
        type: 'plan_expiry_warning',
        data: templateData
      });

      // Generate WhatsApp message
      const whatsappMessage = user.userType === 'merchant' 
        ? WhatsAppMessageService.generateMerchantExpiryMessage(
            { 
              firstName: templateData.firstName,
              fullName: user.fullName,
              businessName: user.businessName 
            }, 
            {
              daysLeft: daysUntilExpiry,
              planName: templateData.planName
            }
          )
        : WhatsAppMessageService.generateUserExpiryMessage(
            { 
              firstName: templateData.firstName,
              fullName: user.fullName 
            },
            {
              daysLeft: daysUntilExpiry,
              planName: templateData.planName
            }
          );

      console.log(`⚠️ Plan expiry WhatsApp message for ${user.fullName}:`);
      console.log('=' .repeat(50));
      console.log(whatsappMessage);
      console.log('=' .repeat(50));
      console.log(`📱 Send to: ${user.phone || 'Phone number not available'}`);

      return {
        success: true,
        emailSent: true,
        whatsappMessage: whatsappMessage,
        phone: user.phone,
        recipient: user.fullName,
        businessName: user.businessName
      };

    } catch (error) {
      console.error('Error sending plan expiry warning:', error);
      throw error;
    }
  }

  async getUserPlanDetails(userId) {
    try {
      const query = `
        SELECT up.*, p.name as planName, p.type as planType
        FROM user_plans up
        LEFT JOIN plans p ON up.plan_id = p.id
        WHERE up.user_id = ? AND up.status = 'active'
        ORDER BY up.id DESC
        LIMIT 1
      `;
      
      const results = await this.queryAsync(query, [userId]);
      return results[0] || null;
    } catch (error) {
      console.error('Error getting user plan details:', error);
      return null;
    }
  }
}

module.exports = new NotificationService();
