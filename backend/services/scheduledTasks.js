const cron = require('node-cron');
const notificationService = require('./unifiedNotificationService');
const emailService = require('./emailService-integrated');

class ScheduledTasks {
  static initialize() {
    console.log('🕐 Initializing scheduled email tasks...');

    // Daily expiry check at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('🔄 Running daily plan expiry check...');
      try {
        await notificationService.onPlanExpiryCheck();
        console.log('✅ Daily plan expiry check completed');
      } catch (error) {
        console.error('❌ Error in daily plan expiry check:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Accra"
    });

    // Monthly limits renewal on 1st day of every month at 12:01 AM
    cron.schedule('1 0 1 * *', async () => {
      console.log('🔄 Running monthly limits renewal...');
      try {
        await notificationService.onMonthlyLimitsRenewal();
        console.log('✅ Monthly limits renewal completed');
      } catch (error) {
        console.error('❌ Error in monthly limits renewal:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Accra"
    });

    // Process email queue every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        await emailService.processEmailQueue();
      } catch (error) {
        console.error('❌ Error processing email queue:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Accra"
    });

    // Weekly email analytics cleanup (every Sunday at 2:00 AM)
    cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Running weekly email cleanup...');
      try {
        await this.cleanupOldEmailLogs();
        console.log('✅ Weekly email cleanup completed');
      } catch (error) {
        console.error('❌ Error in weekly email cleanup:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Accra"
    });

    // Daily email queue health check at 6:00 AM
    cron.schedule('0 6 * * *', async () => {
      console.log('🔍 Running email queue health check...');
      try {
        await this.emailQueueHealthCheck();
        console.log('✅ Email queue health check completed');
      } catch (error) {
        console.error('❌ Error in email queue health check:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Accra"
    });

    // Send daily admin summary at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('📊 Sending daily admin summary...');
      try {
        await this.sendDailyAdminSummary();
        console.log('✅ Daily admin summary sent');
      } catch (error) {
        console.error('❌ Error sending daily admin summary:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Accra"
    });

    // Retry failed emails every hour
    cron.schedule('0 * * * *', async () => {
      try {
        await this.retryFailedEmails();
      } catch (error) {
        console.error('❌ Error retrying failed emails:', error);
      }
    }, {
      scheduled: true,
      timezone: "Africa/Accra"
    });

    console.log('✅ All scheduled email tasks initialized successfully');
  }

  // Cleanup old email logs (older than 90 days)
  static async cleanupOldEmailLogs() {
    try {
      const db = require('../db');
      
      // Delete old email notifications
      const deleteOldNotifications = `
        DELETE FROM email_notifications 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        AND status IN ('sent', 'failed')
      `;
      
      // Delete old email analytics
      const deleteOldAnalytics = `
        DELETE FROM email_analytics 
        WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY)
      `;
      
      // Delete old email queue entries
      const deleteOldQueue = `
        DELETE FROM email_queue 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status IN ('sent', 'failed')
      `;

      await new Promise((resolve, reject) => {
        db.query(deleteOldNotifications, (err, result) => {
          if (err) reject(err);
          else {
            console.log(`🧹 Cleaned up ${result.affectedRows} old email notifications`);
            resolve(result);
          }
        });
      });

      await new Promise((resolve, reject) => {
        db.query(deleteOldAnalytics, (err, result) => {
          if (err) reject(err);
          else {
            console.log(`🧹 Cleaned up ${result.affectedRows} old email analytics`);
            resolve(result);
          }
        });
      });

      await new Promise((resolve, reject) => {
        db.query(deleteOldQueue, (err, result) => {
          if (err) reject(err);
          else {
            console.log(`🧹 Cleaned up ${result.affectedRows} old email queue entries`);
            resolve(result);
          }
        });
      });

    } catch (error) {
      console.error('Error cleaning up old email logs:', error);
    }
  }

  // Health check for email queue
  static async emailQueueHealthCheck() {
    try {
      const db = require('../db');
      
      // Check for stuck emails in queue
      const stuckEmails = await new Promise((resolve, reject) => {
        db.query(`
          SELECT COUNT(*) as count 
          FROM email_queue 
          WHERE status = 'processing' 
          AND updated_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results[0].count);
        });
      });

      if (stuckEmails > 0) {
        console.log(`⚠️ Found ${stuckEmails} stuck emails in queue, resetting to pending`);
        
        // Reset stuck emails to pending
        await new Promise((resolve, reject) => {
          db.query(`
            UPDATE email_queue 
            SET status = 'pending', updated_at = NOW() 
            WHERE status = 'processing' 
            AND updated_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
          `, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      }

      // Check for high failure rate
      const failureRate = await new Promise((resolve, reject) => {
        db.query(`
          SELECT 
            (SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as failure_rate
          FROM email_notifications 
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results[0].failure_rate || 0);
        });
      });

      if (failureRate > 10) {
        console.log(`⚠️ High email failure rate detected: ${failureRate.toFixed(2)}%`);
        // Could send alert to admin here
      }

    } catch (error) {
      console.error('Error in email queue health check:', error);
    }
  }

  // Send daily summary to admins
  static async sendDailyAdminSummary() {
    try {
      const db = require('../db');
      
      // Get yesterday's email statistics
      const emailStats = await new Promise((resolve, reject) => {
        db.query(`
          SELECT 
            COUNT(*) as total_emails,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_emails,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_emails,
            COUNT(DISTINCT recipient) as unique_recipients
          FROM email_notifications 
          WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      });

      // Get top email types from yesterday
      const topEmailTypes = await new Promise((resolve, reject) => {
        db.query(`
          SELECT type, COUNT(*) as count
          FROM email_notifications 
          WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
          GROUP BY type
          ORDER BY count DESC
          LIMIT 5
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      // Get admin emails
      const admins = await notificationService.getAdminEmails();

      if (admins.length > 0 && emailStats.total_emails > 0) {
        for (const admin of admins) {
          await emailService.sendEmail({
            to: admin.email,
            type: 'admin_daily_summary',
            data: {
              adminName: admin.firstName,
              date: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString(),
              totalEmails: emailStats.total_emails,
              sentEmails: emailStats.sent_emails,
              failedEmails: emailStats.failed_emails,
              uniqueRecipients: emailStats.unique_recipients,
              successRate: emailStats.total_emails > 0 ? 
                ((emailStats.sent_emails / emailStats.total_emails) * 100).toFixed(2) : '0',
              topEmailTypes: topEmailTypes
            }
          });
        }
      }

    } catch (error) {
      console.error('Error sending daily admin summary:', error);
    }
  }

  // Retry failed emails
  static async retryFailedEmails() {
    try {
      const db = require('../db');
      
      // Get failed emails that haven't exceeded max retries
      const failedEmails = await new Promise((resolve, reject) => {
        db.query(`
          SELECT * FROM email_queue 
          WHERE status = 'failed' 
          AND retry_count < max_retries
          AND failed_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
          ORDER BY priority DESC, created_at ASC
          LIMIT 10
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      for (const email of failedEmails) {
        try {
          // Increment retry count
          await new Promise((resolve, reject) => {
            db.query(
              'UPDATE email_queue SET retry_count = retry_count + 1, status = "pending" WHERE id = ?',
              [email.id],
              (err, result) => {
                if (err) reject(err);
                else resolve(result);
              }
            );
          });

          console.log(`🔄 Retrying failed email ID: ${email.id} (attempt ${email.retry_count + 1})`);
          
        } catch (error) {
          console.error(`❌ Error retrying email ID ${email.id}:`, error);
        }
      }

      if (failedEmails.length > 0) {
        console.log(`🔄 Queued ${failedEmails.length} failed emails for retry`);
      }

    } catch (error) {
      console.error('Error retrying failed emails:', error);
    }
  }

  // Manual trigger for plan expiry check (for testing)
  static async runPlanExpiryCheck() {
    console.log('🔄 Manually running plan expiry check...');
    await notificationService.onPlanExpiryCheck();
  }

  // Manual trigger for monthly limits renewal (for testing)
  static async runMonthlyLimitsRenewal() {
    console.log('🔄 Manually running monthly limits renewal...');
    await notificationService.onMonthlyLimitsRenewal();
  }

  // Get scheduled task status
  static getTaskStatus() {
    const tasks = cron.getTasks();
    const status = {
      totalTasks: tasks.size,
      tasks: []
    };

    tasks.forEach((task, name) => {
      status.tasks.push({
        name: name || 'unnamed',
        running: task.running || false,
        scheduled: task.scheduled || false
      });
    });

    return status;
  }

  // Stop all scheduled tasks
  static stopAllTasks() {
    const tasks = cron.getTasks();
    tasks.forEach(task => {
      if (task.running) {
        task.stop();
      }
    });
    console.log('🛑 All scheduled tasks stopped');
  }

  // Start all scheduled tasks
  static startAllTasks() {
    const tasks = cron.getTasks();
    tasks.forEach(task => {
      if (!task.running) {
        task.start();
      }
    });
    console.log('▶️ All scheduled tasks started');
  }
}

module.exports = ScheduledTasks;
