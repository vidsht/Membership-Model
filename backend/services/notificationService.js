const emailService = require('./emailService');
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
          fullName: user.fullName || `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
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
            firstName: user.firstName,
            dealTitle: deal.title,
            dealDescription: deal.description,
            businessName: deal.businessName,
            discount: deal.discount,
            validUntil: deal.validUntil,
            dealUrl: `${process.env.FRONTEND_URL}/deals/${dealId}`
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
          firstName: user.firstName,
          fullName: user.fullName || `${user.firstName} ${user.lastName}`,
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
          firstName: user.firstName,
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
          firstName: user.firstName,
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
          firstName: user.firstName,
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
          firstName: user.firstName,
          planName: plan.name,
          planDescription: plan.description,
          monthlyRedemptionLimit: plan.monthlyRedemptionLimit,
          validUntil: user.validationDate,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
        }
      });

      console.log(`New plan assignment notification sent to user: ${user.email}`);
    } catch (error) {
      console.error('Error sending new plan assignment notification:', error);
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
          ownerName: merchant.ownerName || merchant.firstName,
          email: merchant.email,
          businessType: merchant.businessType,
          validationDate: merchant.validationDate,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
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
          ownerName: merchant.firstName,
          dealTitle: deal.title,
          dealDescription: deal.description,
          status: deal.status,
          rejectionReason: deal.rejectionReason,
          approvedDate: deal.updatedAt,
          dealUrl: deal.status === 'approved' ? `${process.env.FRONTEND_URL}/deals/${dealId}` : null
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
          ownerName: merchant.firstName,
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
          ownerName: merchant.firstName,
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
          ownerName: merchant.firstName,
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
          ownerName: merchant.firstName,
          newLimit: newLimit,
          effectiveDate: new Date().toLocaleDateString(),
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
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
          ownerName: merchant.firstName,
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
          ownerName: merchant.firstName,
          planName: plan.name,
          planDescription: plan.description,
          monthlyDealLimit: plan.monthlyDealLimit,
          validUntil: merchant.validationDate,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
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
          ownerName: merchant.firstName,
          dealTitle: redemption.dealTitle,
          userName: redemption.userName,
          userEmail: redemption.userEmail,
          redemptionDate: redemption.redemptionDate,
          qrCode: redemption.qrCode,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/redemptions`
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
            adminName: admin.firstName,
            userType: user.userType,
            fullName: user.fullName || `${user.firstName} ${user.lastName}`,
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
            adminName: admin.firstName,
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
            adminName: admin.firstName,
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
            adminName: admin.firstName,
            dealTitle: deal.title,
            businessName: merchant.businessName,
            publishedDate: deal.updatedAt,
            dealUrl: `${process.env.FRONTEND_URL}/deals/${dealId}`
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
            adminName: admin.firstName,
            expiringCount: expiringUsers.length,
            expiringUsers: expiringUsers,
            dashboardUrl: `${process.env.FRONTEND_URL}/admin/users`
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
      
      // Reset user redemption counts
      const usersToReset = await this.getUsersWithRedemptionLimits();
      for (const user of usersToReset) {
        await this.resetUserRedemptionCount(user.id);
        await this.notifyRedemptionLimitRenewed(user.id);
      }

      // Reset merchant deal counts
      const merchantsToReset = await this.getMerchantsWithDealLimits();
      for (const merchant of merchantsToReset) {
        await this.resetMerchantDealCount(merchant.id);
        await this.notifyDealLimitRenewed(merchant.id);
      }

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
             u.firstName, u.lastName, u.email as userEmail,
             u.firstName as userName,
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
    const query = 'SELECT email, firstName FROM users WHERE userType = "admin" AND status = "active"';
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
      SELECT id, firstName, lastName, email, userType, validationDate
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
    const query = 'UPDATE users SET monthlyRedemptionCount = 0 WHERE id = ?';
    await this.queryAsync(query, [userId]);
  }

  async resetMerchantDealCount(merchantId) {
    const query = 'UPDATE users SET monthlyDealCount = 0 WHERE id = ?';
    await this.queryAsync(query, [merchantId]);
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
}

module.exports = new NotificationService();
