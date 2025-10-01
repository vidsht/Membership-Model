/**
 * Notification Hooks for Indians in Ghana Membership Platform
 * Easy integration points for existing routes
 */

const notificationService = require('./notificationService');
const { logActivity, logPlanExpiry, ACTIVITY_TYPES } = require('../utils/activityLogger');
const { queryAsync } = require('../db');

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
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}`
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
      
      const db = require('../db');
      const { promisify } = require('util');
      const queryAsync = promisify(db.query).bind(db);
      
      // Send admin notification about new deal request
      console.log(`📧 Sending admin notification for new deal request ${dealId}`);
      const adminResult = await notificationService.sendAdminNotification('admin_new_deal_request', {
        adminName: 'Admin',
        dealTitle: dealData.title || dealData.dealTitle,
        dealDescription: dealData.description || dealData.dealDescription,
        dealCategory: dealData.category || 'Uncategorized',
        discount: dealData.discount || dealData.discountPercentage || '',
        discountType: dealData.discountType || 'percentage',
        originalPrice: dealData.originalPrice || '',
        discountedPrice: dealData.discountedPrice || '',
        validUntil: dealData.validUntil || dealData.expiryDate || '',
        businessName: dealData.businessName || 'Business',
        merchantEmail: dealData.merchantEmail || '',
        submissionDate: new Date().toLocaleDateString(),
        termsConditions: dealData.termsConditions || '',
        reviewUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deals/${dealId}/review`,
        approveUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deals/${dealId}/approve`,
        rejectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deals/${dealId}/reject`
      });

      // Note: User notifications should only be sent when deal status is 'active'
      // This will be handled in the deal status change hook
      
      return {
        adminNotification: adminResult,
        message: 'Admin notification sent for new deal request'
      };
    } catch (error) {
      console.error('Error in deal creation hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Deal Status Change Hook
  static async onDealStatusChange(dealId, newStatus, reason = '') {
    try {
      console.log(`📧 Sending deal status notification for deal ${dealId}: ${newStatus}`);
      
      const db = require('../db');
      const { promisify } = require('util');
      const queryAsync = promisify(db.query).bind(db);
      
      // Get deal details first
      const dealResult = await queryAsync('SELECT * FROM deals WHERE id = ?', [dealId]);
      if (dealResult.length === 0) {
        throw new Error('Deal not found');
      }
      const deal = dealResult[0];
      
      // If deal becomes active, send notifications to users
      if (newStatus === 'active') {
        console.log(`📧 Deal ${dealId} is now active, sending notifications to users`);
        
        // Get business name
        const businessResult = await queryAsync('SELECT businessName FROM businesses WHERE businessId = ?', [deal.businessId]);
        const businessName = businessResult.length > 0 ? businessResult[0].businessName : 'Business';
        
        // Get all active users who should receive deal notifications
        const usersResult = await queryAsync(`
          SELECT u.id, u.email, u.fullName
          FROM users u
          LEFT JOIN user_email_preferences uep ON u.id = uep.user_id AND uep.notification_type = 'deals'
          WHERE u.status = 'approved' 
          AND (uep.is_enabled IS NULL OR uep.is_enabled = 1)
          LIMIT 100
        `);

        if (usersResult.length > 0) {
          // Send deal notifications to users
          const recipients = usersResult.map(user => ({
            email: user.email,
            data: {
              firstName: user.fullName?.split(' ')[0] || 'Member'
            }
          }));

          const userNotificationResult = await notificationService.sendBulkNotifications(
            recipients,
            'new_deal_notification',
            {
              dealTitle: deal.title,
              dealDescription: deal.description,
              businessName: businessName,
              discount: deal.discount || '',
              validUntil: deal.validUntil || deal.expiration_date || '',
              dealUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/deals/${dealId}`
            }
          );
          
          console.log(`📧 Sent deal notifications to ${userNotificationResult.sent || 0} users`);
        }
      }
      
      // Send deal status update to merchant
      // Get merchant ID from deal's business
      const merchantResult = await queryAsync('SELECT userId FROM businesses WHERE businessId = ?', [deal.businessId]);
      const merchantId = merchantResult.length > 0 ? merchantResult[0].userId : null;
      
      if (merchantId) {
        return await notificationService.sendDealPostingStatusNotification(dealId, merchantId, newStatus, {
          reason: reason
        });
      } else {
        console.warn(`No merchant found for deal ${dealId} with businessId ${deal.businessId}`);
        return { success: true, message: 'Deal status changed but no merchant notification sent' };
      }
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
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}`
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
      
      // Send notification to merchant
      return await notificationService.sendRedemptionRequestAlert(redemptionData.merchantId, {
        requestId: redemptionId,
        customerName: redemptionData.customerName || redemptionData.fullName,
        dealTitle: redemptionData.dealTitle,
        membershipNumber: redemptionData.membershipNumber,
        customerEmail: redemptionData.customerEmail
      });
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

  // Password Changed by Admin Hook
  static async onPasswordChangedByAdmin(userId, userData) {
    try {
      await notificationService.notifyPasswordChangedByAdmin(userId, userData);
      console.log(`✅ Password change notification sent for user ID: ${userId}`);
      return { success: true, userId: userId };
    } catch (error) {
      console.error('❌ Error sending password change notification:', error);
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

  // Plan Expiry Check Hook (Called by cron job)
  static async onPlanExpiryCheck() {
    try {
      console.log('🔄 Starting plan expiry check...');
      
      const db = require('../db');
      const { promisify } = require('util');
      const queryAsync = promisify(db.query).bind(db);
      
      // Check for users whose plans are expiring in 30, 7, 3, and 1 days
      const warningDays = [30, 7, 3, 1];
      
      for (const days of warningDays) {
        console.log(`📅 Checking for plans expiring in ${days} days...`);
        
        // Calculate expiry date based on planAssignedAt and planExpiry
        // For yearly plans: add 1 year, for monthly plans: add 1 month
        const usersQuery = `
          SELECT u.id, u.email, u.fullName, u.currentPlan, u.planExpiry, u.planAssignedAt, u.userType,
                 CASE 
                   WHEN u.planExpiry = 'yearly' THEN DATE_ADD(u.planAssignedAt, INTERVAL 1 YEAR)
                   WHEN u.planExpiry = 'monthly' THEN DATE_ADD(u.planAssignedAt, INTERVAL 1 MONTH)
                   ELSE DATE_ADD(u.planAssignedAt, INTERVAL 1 YEAR)
                 END as calculated_expiry_date
          FROM users u
          WHERE u.currentPlan IS NOT NULL 
          AND u.planStatus = 'active'
          AND u.status = 'approved'
          AND u.planAssignedAt IS NOT NULL
          HAVING DATE(calculated_expiry_date) = DATE_ADD(CURDATE(), INTERVAL ${days} DAY)
        `;
        
        const expiringUsers = await queryAsync(usersQuery);
        
        if (expiringUsers.length > 0) {
          console.log(`📧 Found ${expiringUsers.length} users with plans expiring in ${days} days`);
          
          // Send warnings to users and merchants
          for (const user of expiringUsers) {
            try {
              const expiryDate = new Date(user.calculated_expiry_date);
              
              if (user.userType === 'user') {
                // Send user plan expiry warning
                await notificationService.sendPlanExpiryWarning(user.id, {
                  planName: user.currentPlan,
                  daysLeft: days,
                  expiryDate: expiryDate.toLocaleDateString(),
                  firstName: user.fullName.split(' ')[0],
                  renewalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/plans`
                });
                
                // Log plan expiry activity
                if (days <= 0) {
                  await logActivity('USER_PLAN_EXPIRED', {
                    userId: user.id,
                    description: `${user.fullName}'s ${user.currentPlan} plan has expired`,
                    relatedId: user.id,
                    relatedType: 'user',
                    metadata: {
                      planName: user.currentPlan,
                      expiryDate: expiryDate.toISOString(),
                      userType: 'user'
                    }
                  });
                } else {
                  await logPlanExpiry(user.id, user.currentPlan, expiryDate, days);
                }
              } else if (user.userType === 'merchant') {
                // Send merchant plan expiry warning  
                await notificationService.sendMerchantPlanExpiryWarning(user.id, {
                  planName: user.currentPlan,
                  daysLeft: days,
                  expiryDate: expiryDate.toLocaleDateString(),
                  businessName: user.fullName,
                  renewalUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/merchant/plans`
                });
                
                // Log merchant plan expiry activity with business name
                if (days <= 0) {
                  // Get business name for better logging
                  let displayName = user.fullName;
                  try {
                    const businessResult = await queryAsync('SELECT businessName FROM businesses WHERE userId = ?', [user.id]);
                    if (businessResult.length > 0 && businessResult[0].businessName) {
                      displayName = businessResult[0].businessName;
                    }
                  } catch (businessError) {
                    console.warn('Error fetching business name for plan expiry log:', businessError);
                  }

                  await logActivity('MERCHANT_PLAN_EXPIRED', {
                    userId: user.id,
                    description: `${displayName}'s ${user.currentPlan} plan has expired`,
                    relatedId: user.id,
                    relatedType: 'user',
                    metadata: {
                      planName: user.currentPlan,
                      expiryDate: expiryDate.toISOString(),
                      userType: 'merchant'
                    }
                  });
                } else {
                  await logPlanExpiry(user.id, user.currentPlan, expiryDate, days);
                }
              }
              
              console.log(`✅ Sent expiry warning to ${user.userType} ${user.fullName} (${user.email})`);
            } catch (userError) {
              console.error(`Error sending expiry warning to user ${user.id}:`, userError);
            }
          }
          
          // If expiring in 1 day, also notify admin
          if (days === 1) {
            const adminQuery = `SELECT email FROM users WHERE adminRole = 'superAdmin' AND status = 'approved'`;
            const admins = await queryAsync(adminQuery);
            
            if (admins.length > 0) {
              for (const admin of admins) {
                try {
                  await notificationService.sendAdminPlanExpiryAlert(admin.email, {
                    expiringCount: expiringUsers.length,
                    expiringUsers: expiringUsers.map(u => ({
                      name: u.fullName,
                      email: u.email,
                      planName: u.currentPlan,
                      type: u.userType
                    })),
                    dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}`,
                    today: new Date().toLocaleDateString()
                  });
                  
                  console.log(`✅ Sent admin expiry alert to ${admin.email}`);
                } catch (adminError) {
                  console.error('Error sending admin expiry alert:', adminError);
                }
              }
            }
          }
        } else {
          console.log(`📭 No users found with plans expiring in ${days} days`);
        }
      }
      
      console.log('✅ Plan expiry check completed successfully');
      return { success: true, message: 'Plan expiry check completed' };
    } catch (error) {
      console.error('❌ Error in plan expiry check:', error);
      return { success: false, error: error.message };
    }
  }

  // Plan Assignment Hook
  static async onPlanAssigned(userId, planData) {
    try {
      console.log(`📧 Sending plan assignment notification for user ${userId}`);
      
      return await notificationService.sendPlanAssignmentNotification(userId, planData);
    } catch (error) {
      console.error('Error in plan assignment hook:', error);
      return { success: false, error: error.message };
    }
  }

  // Custom Deal Limit Assignment Hook
  static async onCustomDealLimitAssigned(merchantId, newLimit, options = {}) {
    try {
      console.log(`📧 Sending custom deal limit assignment notification for merchant ${merchantId} - New limit: ${newLimit}`);
      return await notificationService.sendCustomDealsAssignmentNotification(merchantId, newLimit, options);
    } catch (error) {
      console.error('❌ Error in custom deal limit assignment hook:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationHooks;
