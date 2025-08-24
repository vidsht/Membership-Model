/**
 * Scheduled Tasks for Email Notifications
 * Indians in Ghana Membership Platform
 */

const cron = require('node-cron');
const emailService = require('./emailService-integrated');
const NotificationHooks = require('./notificationHooks-integrated');

class ScheduledTasks {
  constructor() {
    this.tasks = new Map();
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Scheduled tasks already initialized');
      return;
    }

    console.log('⏰ Initializing scheduled email tasks...');

    // Process email queue every 5 minutes
    this.addTask('processEmailQueue', '*/5 * * * *', async () => {
      try {
        const result = await emailService.processEmailQueue();
        if (result.processed > 0) {
          console.log(`📧 Processed ${result.processed} queued emails`);
        }
      } catch (error) {
        console.error('Error processing email queue:', error);
      }
    });

    // Check for expiring deals daily at 9 AM
    this.addTask('checkExpiringDeals', '0 9 * * *', async () => {
      try {
        console.log('🔍 Daily check for expiring deals...');
        const result = await NotificationHooks.checkExpiringDeals();
        console.log(`✅ Processed ${result.processed} expiring deals`);
      } catch (error) {
        console.error('Error checking expiring deals:', error);
      }
    });

    // Check for expiring memberships daily at 10 AM
    this.addTask('checkExpiringMemberships', '0 10 * * *', async () => {
      try {
        console.log('🔍 Daily check for expiring memberships...');
        const result = await NotificationHooks.checkExpiringMemberships();
        console.log(`✅ Processed ${result.processed} expiring memberships`);
      } catch (error) {
        console.error('Error checking expiring memberships:', error);
      }
    });

    // Clean up old email logs weekly (Sundays at 2 AM)
    this.addTask('cleanupEmailLogs', '0 2 * * 0', async () => {
      try {
        console.log('🧹 Weekly cleanup of old email logs...');
        const db = require('../db');
        const { promisify } = require('util');
        const queryAsync = promisify(db.query).bind(db);

        // Delete email notifications older than 90 days
        const result = await queryAsync(`
          DELETE FROM email_notifications 
          WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
        `);

        // Delete processed email queue items older than 7 days
        const queueResult = await queryAsync(`
          DELETE FROM email_queue 
          WHERE status IN ('sent', 'failed') 
          AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        console.log(`✅ Cleaned up ${result.affectedRows} old email logs and ${queueResult.affectedRows} queue items`);
      } catch (error) {
        console.error('Error cleaning up email logs:', error);
      }
    });

    // Generate email analytics daily at 1 AM
    this.addTask('generateEmailAnalytics', '0 1 * * *', async () => {
      try {
        console.log('📊 Generating daily email analytics...');
        
        const db = require('../db');
        const { promisify } = require('util');
        const queryAsync = promisify(db.query).bind(db);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];

        // Get email stats for yesterday
        const stats = await queryAsync(`
          SELECT 
            template_name,
            COUNT(*) as emails_sent,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as emails_delivered,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as emails_failed
          FROM email_notifications 
          WHERE DATE(created_at) = ?
          GROUP BY template_name
        `, [dateStr]);

        // Insert/update analytics
        for (const stat of stats) {
          await queryAsync(`
            INSERT INTO email_analytics (template_name, date, emails_sent, emails_delivered, emails_failed)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            emails_sent = VALUES(emails_sent),
            emails_delivered = VALUES(emails_delivered),
            emails_failed = VALUES(emails_failed)
          `, [stat.template_name, dateStr, stat.emails_sent, stat.emails_delivered, stat.emails_failed]);
        }

        console.log(`✅ Generated analytics for ${stats.length} email templates`);
      } catch (error) {
        console.error('Error generating email analytics:', error);
      }
    });

    // Health check every hour
    this.addTask('healthCheck', '0 * * * *', async () => {
      try {
        const stats = await emailService.getEmailStats();
        
        // Log warning if too many failures
        if (stats.failed_emails > 0 && stats.success_rate < 90) {
          console.warn(`⚠️ Email system health warning: ${stats.success_rate}% success rate`);
        }
        
        // Log info every 6 hours (only on hour 0, 6, 12, 18)
        const hour = new Date().getHours();
        if (hour % 6 === 0) {
          console.log(`📊 Email system health: ${stats.success_rate}% success rate, ${stats.pending_queue} pending`);
        }
      } catch (error) {
        console.error('Error in health check:', error);
      }
    });

    this.isInitialized = true;
    console.log(`✅ Initialized ${this.tasks.size} scheduled email tasks`);
  }

  addTask(name, schedule, taskFunction) {
    if (this.tasks.has(name)) {
      console.warn(`⚠️ Task ${name} already exists, replacing...`);
      this.stopTask(name);
    }

    const task = cron.schedule(schedule, taskFunction, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.tasks.set(name, {
      task: task,
      schedule: schedule,
      isRunning: false,
      lastRun: null
    });

    console.log(`📅 Added scheduled task: ${name} (${schedule})`);
  }

  startTask(name) {
    const taskInfo = this.tasks.get(name);
    if (!taskInfo) {
      console.error(`❌ Task ${name} not found`);
      return false;
    }

    if (taskInfo.isRunning) {
      console.warn(`⚠️ Task ${name} is already running`);
      return false;
    }

    taskInfo.task.start();
    taskInfo.isRunning = true;
    console.log(`▶️ Started task: ${name}`);
    return true;
  }

  stopTask(name) {
    const taskInfo = this.tasks.get(name);
    if (!taskInfo) {
      console.error(`❌ Task ${name} not found`);
      return false;
    }

    taskInfo.task.stop();
    taskInfo.isRunning = false;
    console.log(`⏹️ Stopped task: ${name}`);
    return true;
  }

  startAllTasks() {
    console.log('🚀 Starting all scheduled tasks...');
    let started = 0;
    
    for (const [name] of this.tasks) {
      if (this.startTask(name)) {
        started++;
      }
    }
    
    console.log(`✅ Started ${started} scheduled tasks`);
  }

  stopAllTasks() {
    console.log('🛑 Stopping all scheduled tasks...');
    let stopped = 0;
    
    for (const [name] of this.tasks) {
      if (this.stopTask(name)) {
        stopped++;
      }
    }
    
    console.log(`✅ Stopped ${stopped} scheduled tasks`);
  }

  getTaskStatus() {
    const status = {};
    
    for (const [name, taskInfo] of this.tasks) {
      status[name] = {
        schedule: taskInfo.schedule,
        isRunning: taskInfo.isRunning,
        lastRun: taskInfo.lastRun
      };
    }
    
    return {
      totalTasks: this.tasks.size,
      runningTasks: Array.from(this.tasks.values()).filter(t => t.isRunning).length,
      tasks: status
    };
  }

  // Manual trigger methods for testing
  async runTaskNow(name) {
    const taskInfo = this.tasks.get(name);
    if (!taskInfo) {
      console.error(`❌ Task ${name} not found`);
      return false;
    }

    try {
      console.log(`🔄 Manually triggering task: ${name}`);
      
      // This is a bit hacky, but we'll extract the function from the cron task
      // For production, you might want to store the function separately
      switch (name) {
        case 'processEmailQueue':
          await emailService.processEmailQueue();
          break;
        case 'checkExpiringDeals':
          await NotificationHooks.checkExpiringDeals();
          break;
        case 'checkExpiringMemberships':
          await NotificationHooks.checkExpiringMemberships();
          break;
        default:
          console.warn(`⚠️ Manual trigger not implemented for task: ${name}`);
          return false;
      }
      
      taskInfo.lastRun = new Date();
      console.log(`✅ Task ${name} completed manually`);
      return true;
    } catch (error) {
      console.error(`❌ Error running task ${name}:`, error);
      return false;
    }
  }
}

module.exports = new ScheduledTasks();
