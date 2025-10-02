const db = require('./db');
const { formatDateForEmail, getCurrentDateForEmail } = require('./utils/dateFormatter');
const fs = require('fs').promises;
const path = require('path');
const emailService = require('./services/emailService-integrated');
const ScheduledTasks = require('./services/scheduledTasks');promises;
const path = require('path');
const emailService = require('./services/emailService-integrated');
const ScheduledTasks = require('./services/scheduledTasks');

class EmailSystemSetup {
  static async initialize() {
    console.log('🚀 Initializing Email Notification System...');
    
    try {
      // Step 1: Run database schema
      await this.setupDatabase();
      
      // Step 2: Verify email service configuration
      await this.verifyEmailService();
      
      // Step 3: Initialize scheduled tasks
      await this.initializeScheduledTasks();
      
      // Step 4: Setup default email preferences for existing users
      await this.setupDefaultPreferences();
      
      // Step 5: Validate email templates
      await this.validateEmailTemplates();
      
      console.log('✅ Email notification system initialized successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize email system:', error);
      return false;
    }
  }

  static async setupDatabase() {
    console.log('📦 Setting up email database schema...');
    
    try {
      // Read and execute the email schema SQL file
      const schemaPath = path.join(__dirname, 'database', 'email-schema-simple.sql');
      const schemaSql = await fs.readFile(schemaPath, 'utf-8');
      
      // Split the SQL file into individual statements
      const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const statement of statements) {
        if (statement.toLowerCase().includes('delimiter')) {
          continue; // Skip delimiter statements
        }
        
        await new Promise((resolve, reject) => {
          db.query(statement, (err, result) => {
            if (err) {
              // Ignore "table already exists" errors
              if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️ Table/Index already exists, skipping...');
                resolve(result);
              } else {
                reject(err);
              }
            } else {
              resolve(result);
            }
          });
        });
      }
      
      console.log('✅ Database schema setup completed');
      
    } catch (error) {
      console.error('❌ Error setting up database schema:', error);
      throw error;
    }
  }

  static async verifyEmailService() {
    console.log('📧 Verifying email service configuration...');
    
    try {
      // Check environment variables
      const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.log('⚠️ Missing environment variables:', missingVars.join(', '));
        console.log('Using default SMTP configuration...');
      }
      
      // Test email service initialization
      await emailService.initialize();
      
      console.log('✅ Email service verification completed');
      
    } catch (error) {
      console.error('❌ Error verifying email service:', error);
      throw error;
    }
  }

  static async initializeScheduledTasks() {
    console.log('⏰ Initializing scheduled tasks...');
    
    try {
      ScheduledTasks.initialize();
      console.log('✅ Scheduled tasks initialized');
      
    } catch (error) {
      console.error('❌ Error initializing scheduled tasks:', error);
      throw error;
    }
  }

  static async setupDefaultPreferences() {
    console.log('👥 Setting up default email preferences for existing users...');
    
    try {
      // Get all existing users
      const users = await new Promise((resolve, reject) => {
        db.query(
          'SELECT id, userType FROM users WHERE status = "active"',
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });

      console.log(`Found ${users.length} active users`);

      // Setup default preferences for each user
      const NotificationHooks = require('./services/notificationHooks');
      
      for (const user of users) {
        try {
          await NotificationHooks.initializeDefaultPreferences(user.id, user.userType);
        } catch (error) {
          console.error(`Error setting up preferences for user ${user.id}:`, error);
        }
      }
      
      console.log('✅ Default email preferences setup completed');
      
    } catch (error) {
      console.error('❌ Error setting up default preferences:', error);
      throw error;
    }
  }

  static async validateEmailTemplates() {
    console.log('📄 Validating email templates...');
    
    try {
      // Check if email templates directory exists
      const templatesDir = path.join(__dirname, 'templates', 'emails');
      
      try {
        await fs.access(templatesDir);
        console.log('✅ Email templates directory found');
      } catch (error) {
        console.log('⚠️ Email templates directory not found, but default templates are available in database');
      }
      
      // Verify database templates
      const templates = await new Promise((resolve, reject) => {
        db.query('SELECT COUNT(*) as count FROM email_templates', (err, results) => {
          if (err) reject(err);
          else resolve(results[0].count);
        });
      });
      
      console.log(`📊 Found ${templates} email templates in database`);
      
      if (templates === 0) {
        console.log('⚠️ No email templates found in database. Default templates should be available.');
      }
      
      console.log('✅ Email templates validation completed');
      
    } catch (error) {
      console.error('❌ Error validating email templates:', error);
      throw error;
    }
  }

  // Method to add email system hooks to existing routes
  static async integrateWithExistingRoutes() {
    console.log('🔗 Integration guide for existing routes...');
    
    console.log(`
📋 INTEGRATION CHECKLIST:

1. User Registration (routes/auth.js):
   Add after successful user creation:
   const NotificationHooks = require('../services/notificationHooks');
   await NotificationHooks.onUserRegistration(userId);

2. Deal Creation (routes/deals.js):
   Add after deal creation:
   await NotificationHooks.onDealCreated(dealId);

3. Deal Approval/Rejection (routes/admin.js):
   Add after status update:
   if (status === 'approved') {
     await NotificationHooks.onDealApproved(dealId);
   } else if (status === 'rejected') {
     await NotificationHooks.onDealRejected(dealId);
   }

4. Profile Status Updates (routes/admin.js):
   Add after status change:
   await NotificationHooks.onUserProfileStatusUpdate(userId, newStatus, reason);

5. Redemption Requests (routes/redemptions.js):
   Add after redemption creation:
   await NotificationHooks.onRedemptionRequested(redemptionId);
   
   Add after redemption response:
   await NotificationHooks.onRedemptionResponse(redemptionId);

6. Plan Assignments (routes/admin.js):
   Add after plan assignment:
   await NotificationHooks.onPlanAssigned(userId, planId, userType);

7. Limit Checks:
   Add checks for redemption/deal limits and call:
   await NotificationHooks.onRedemptionLimitReached(userId);
   await NotificationHooks.onDealLimitReached(merchantId);

📧 EMAIL ADMIN ROUTES:
Add to your main server.js:
app.use('/api/admin/email', require('./routes/emailAdmin'));

⚙️ REQUIRED NPM PACKAGES:
npm install nodemailer handlebars node-cron
    `);
  }

  // Test email functionality
  static async testEmailSystem(testRecipient = 'test@example.com') {
    console.log('🧪 Testing email system...');
    
    try {
      // Test basic email sending
      const result = await emailService.sendEmail({
        to: testRecipient,
        type: 'user_welcome',
        data: {
          firstName: 'Test',
          fullName: 'Test User',
          email: testRecipient,
          membershipNumber: 'TEST001',
          validationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      });
      
      console.log('✅ Test email sent successfully:', result.messageId);
      return true;
      
    } catch (error) {
      console.error('❌ Test email failed:', error);
      return false;
    }
  }

  // Status check
  static async getSystemStatus() {
    try {
      const status = {
        database: false,
        emailService: false,
        scheduledTasks: false,
        templates: 0,
        queuedEmails: 0
      };

      // Check database
      try {
        const result = await new Promise((resolve, reject) => {
          db.query('SELECT 1 FROM email_notifications LIMIT 1', (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });
        status.database = true;
      } catch (error) {
        status.database = false;
      }

      // Check email service
      try {
        await emailService.transporter.verify();
        status.emailService = true;
      } catch (error) {
        status.emailService = false;
      }

      // Check scheduled tasks
      const taskStatus = ScheduledTasks.getTaskStatus();
      status.scheduledTasks = taskStatus.totalTasks > 0;

      // Count templates
      try {
        const templates = await new Promise((resolve, reject) => {
          db.query('SELECT COUNT(*) as count FROM email_templates', (err, results) => {
            if (err) reject(err);
            else resolve(results[0].count);
          });
        });
        status.templates = templates;
      } catch (error) {
        status.templates = 0;
      }

      // Count queued emails
      try {
        const queued = await new Promise((resolve, reject) => {
          db.query('SELECT COUNT(*) as count FROM email_queue WHERE status = "pending"', (err, results) => {
            if (err) reject(err);
            else resolve(results[0].count);
          });
        });
        status.queuedEmails = queued;
      } catch (error) {
        status.queuedEmails = 0;
      }

      return status;

    } catch (error) {
      console.error('Error getting system status:', error);
      return null;
    }
  }
}

module.exports = EmailSystemSetup;
