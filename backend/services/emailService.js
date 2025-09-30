const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const db = require('../db');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templatesCache = new Map();
    this.initialize();
  }

  async initialize() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'cards@indiansinghana.com',
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection (optional in development)
    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'cards@indiansinghana.com') {
        await this.transporter.verify();
        console.log('✅ Email service initialized successfully');
      } else {
        console.log('⚠️ Email service initialized without SMTP verification (development mode)');
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
    }
  }

  async loadTemplate(templateName) {
    if (this.templatesCache.has(templateName)) {
      return this.templatesCache.get(templateName);
    }

    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);
      
      this.templatesCache.set(templateName, compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      console.error(`Error loading email template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found`);
    }
  }

  async getEmailTemplate(type) {
    try {
      const query = 'SELECT * FROM email_templates WHERE type = ?';
      const results = await this.queryAsync(query, [type]);
      
      if (results.length > 0) {
        return results[0];
      }
      
      // Fallback to default template
      return await this.getDefaultTemplate(type);
    } catch (error) {
      console.error('Error fetching email template:', error);
      return await this.getDefaultTemplate(type);
    }
  }

  async getDefaultTemplate(type) {
    // Define template configurations without loading them
    const templateConfigs = {
      'user_welcome': {
        subject: 'Welcome to Indians in Ghana - {{fullName}}!',
        templateName: 'user-welcome',
        textContent: 'Welcome to Indians in Ghana community!'
      },
      'merchant_welcome': {
        subject: 'Welcome to Indians in Ghana Business Directory - {{businessName}}!',
        templateName: 'merchant-welcome',
        textContent: 'Welcome to Indians in Ghana Business Directory!'
      },
      'deal_approved': {
        subject: 'Your Deal Has Been Approved - {{dealTitle}}',
        templateName: 'deal-approved',
        textContent: 'Your deal has been approved and is now live!'
      },
      'deal_rejected': {
        subject: 'Deal Submission Update - {{dealTitle}}',
        templateName: 'deal-rejected',
        textContent: 'Your deal submission has been reviewed.'
      },
      'redemption_approved': {
        subject: 'Redemption Request Approved - {{dealTitle}}',
        templateName: 'redemption-approved',
        textContent: 'Your redemption request has been approved!'
      },
      'redemption_rejected': {
        subject: 'Redemption Request Update - {{dealTitle}}',
        templateName: 'redemption-rejected',
        textContent: 'Your redemption request has been reviewed.'
      },
      'plan_expiry_warning': {
        subject: 'Plan Expiry Warning - {{planName}}',
        templateName: 'plan-expiry-warning',
        textContent: 'Your membership plan is expiring soon.'
      },
      'plan_assigned': {
        subject: 'New Plan Assigned - {{planName}}',
        templateName: 'plan-assignment',
        textContent: 'A new membership plan has been assigned to your account.'
      },
      'profile_status_update': {
        subject: 'Profile Status Update - Indians in Ghana',
        templateName: 'profile-status-update',
        textContent: 'Your profile status has been updated.'
      },
      'new_deal_notification': {
        subject: 'New Deal Available - {{dealTitle}}',
        templateName: 'new-deal-notification',
        textContent: 'A new deal is now available for you!'
      },
      'redemption_limit_reached': {
        subject: 'Monthly Redemption Limit Reached',
        templateName: 'redemption-limit-reached',
        textContent: 'You have reached your monthly redemption limit.'
      },
      'redemption_limit_renewed': {
        subject: 'Redemption Limit Renewed',
        templateName: 'redemption-limit-renewed',
        textContent: 'Your monthly redemption limit has been renewed!'
      },
      'deal_limit_reached': {
        subject: 'Monthly Deal Posting Limit Reached',
        templateName: 'deal-limit-reached',
        textContent: 'You have reached your monthly deal posting limit.'
      },
      'deal_limit_renewed': {
        subject: 'Deal Posting Limit Renewed',
        templateName: 'deal-limit-renewed',
        textContent: 'Your monthly deal posting limit has been renewed!'
      },
      'custom_deal_limit_assigned': {
        subject: 'Custom Deal Limit Assigned',
        templateName: 'custom-deals-assignment',
        textContent: 'A custom deal posting limit has been assigned to your account.'
      },
      'new_redemption_request': {
        subject: 'New Redemption Request - {{dealTitle}}',
        templateName: 'redemption-request-alert',
        textContent: 'You have received a new redemption request.'
      },
      'admin_new_registration': {
        subject: 'New Registration - Action Required',
        templateName: 'admin-new-registration',
        textContent: 'A new user has registered and requires approval.'
      },
      'admin_deal_redemption': {
        subject: 'Deal Redemption Alert - {{dealTitle}}',
        templateName: 'admin-deal-redemption',
        textContent: 'A deal has been redeemed.'
      },
      'admin_new_deal_request': {
        subject: 'New Deal Approval Required - {{dealTitle}}',
        templateName: 'admin-new-deal-request',
        textContent: 'A new deal has been submitted for approval.'
      },
      'admin_deal_published': {
        subject: 'Deal Published - {{dealTitle}}',
        templateName: 'admin-deal-published',
        textContent: 'A new deal has been published.'
      },
      'admin_plan_expiry_alert': {
        subject: 'Plan Expiry Alert - Multiple Users',
        templateName: 'admin-plan-expiry-alert',
        textContent: 'Multiple user plans are expiring soon.'
      },
      'password_changed_by_admin': {
        subject: 'Password Changed by Administrator - {{fullName}}',
        templateName: 'password-changed-by-admin',
        textContent: 'Your password has been changed by an administrator. Please check your email for the new password.'
      }
    };

    const config = templateConfigs[type];
    if (!config) {
      return {
        subject: 'Notification from Indians in Ghana',
        htmlContent: '<p>{{message}}</p>',
        textContent: '{{message}}'
      };
    }

    try {
      // Load the template only when needed
      const htmlContent = await this.loadTemplate(config.templateName);
      return {
        subject: config.subject,
        htmlContent: htmlContent,
        textContent: config.textContent
      };
    } catch (error) {
      console.error(`Error loading template ${config.templateName}:`, error);
      // Return a fallback template
      return {
        subject: config.subject,
        htmlContent: `<p>{{message}}</p>`,
        textContent: config.textContent
      };
    }
  }

  async sendEmail(options) {
    try {
      const {
        to,
        type,
        data = {},
        priority = 'normal',
        scheduledFor = null
      } = options;

      // Get email template
      const template = await this.getEmailTemplate(type);
      
      // Compile template with data
      const subjectTemplate = handlebars.compile(template.subject);
      const htmlTemplate = typeof template.htmlContent === 'function' 
        ? template.htmlContent 
        : handlebars.compile(template.htmlContent);
      const textTemplate = handlebars.compile(template.textContent);

      const subject = subjectTemplate(data);
      const html = htmlTemplate(data);
      const text = textTemplate(data);

      // Log email attempt
      const logData = {
        to,
        type,
        subject,
        status: 'pending',
        scheduledFor,
        createdAt: new Date(),
        data: JSON.stringify(data)
      };

      const logId = await this.logEmail(logData);

      // If scheduled for future, add to queue
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        await this.queueEmail({ ...logData, id: logId });
        return { success: true, messageId: logId, status: 'queued' };
      }

      // Send immediately
      const mailOptions = {
        from: `"Indians in Ghana" <${process.env.SMTP_USER || 'cards@indiansinghana.com'}>`,
        to,
        subject,
        text,
        html,
        headers: {
          'X-Priority': priority === 'high' ? '1' : priority === 'low' ? '5' : '3'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Update log with success
      await this.updateEmailLog(logId, {
        status: 'sent',
        message_id: result.messageId,
        sent_at: new Date()
      });

      console.log(`✅ Email sent successfully: ${type} to ${to}`);
      return { success: true, messageId: result.messageId, logId };

    } catch (error) {
      console.error('❌ Email sending failed:', error);
      
      // Update log with failure
      if (options.logId) {
        await this.updateEmailLog(options.logId, {
          status: 'failed',
          error: error.message,
          failed_at: new Date()
        });
      }

      throw error;
    }
  }

  async logEmail(data) {
    try {
      const query = `
        INSERT INTO email_notifications 
        (recipient, type, subject, status, scheduled_for, created_at, data) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await this.queryAsync(query, [
        data.to,
        data.type,
        data.subject,
        data.status,
        data.scheduledFor,
        data.createdAt,
        data.data
      ]);
      return result.insertId;
    } catch (error) {
      console.error('Error logging email:', error);
      return null;
    }
  }

  async updateEmailLog(id, updates) {
    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const query = `UPDATE email_notifications SET ${setClause} WHERE id = ?`;
      const values = [...Object.values(updates), id];
      await this.queryAsync(query, values);
    } catch (error) {
      console.error('Error updating email log:', error);
    }
  }

  async queueEmail(emailData) {
    try {
      const query = `
        INSERT INTO email_queue 
        (email_log_id, recipient, type, subject, html_content, text_content, scheduled_for, priority, data) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.queryAsync(query, [
        emailData.id,
        emailData.to,
        emailData.type,
        emailData.subject,
        emailData.html,
        emailData.text,
        emailData.scheduledFor,
        emailData.priority || 'normal',
        emailData.data
      ]);
    } catch (error) {
      console.error('Error queueing email:', error);
    }
  }

  async processEmailQueue() {
    try {
      const query = `
        SELECT * FROM email_queue 
        WHERE status = 'pending' 
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
        ORDER BY priority DESC, created_at ASC
        LIMIT 10
      `;
      const emails = await this.queryAsync(query);

      for (const email of emails) {
        try {
          await this.sendQueuedEmail(email);
        } catch (error) {
          console.error(`Failed to send queued email ${email.id}:`, error);
          await this.updateQueuedEmail(email.id, { 
            status: 'failed', 
            error: error.message,
            failed_at: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }

  async sendQueuedEmail(queuedEmail) {
    const mailOptions = {
      from: `"Indians in Ghana" <${process.env.SMTP_USER || 'cards@indiansinghana.com'}>`,
      to: queuedEmail.recipient,
      subject: queuedEmail.subject,
      text: queuedEmail.text_content,
      html: queuedEmail.html_content
    };

    const result = await this.transporter.sendMail(mailOptions);
    
    await this.updateQueuedEmail(queuedEmail.id, {
      status: 'sent',
      message_id: result.messageId,
      sent_at: new Date()
    });

    await this.updateEmailLog(queuedEmail.email_log_id, {
      status: 'sent',
      message_id: result.messageId,
      sent_at: new Date()
    });
  }

  async updateQueuedEmail(id, updates) {
    try {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const query = `UPDATE email_queue SET ${setClause} WHERE id = ?`;
      const values = [...Object.values(updates), id];
      await this.queryAsync(query, values);
    } catch (error) {
      console.error('Error updating queued email:', error);
    }
  }

  // Utility method to promisify database queries
  queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  // Method to check email delivery status
  async getEmailStatus(logId) {
    try {
      const query = 'SELECT * FROM email_notifications WHERE id = ?';
      const results = await this.queryAsync(query, [logId]);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching email status:', error);
      return null;
    }
  }

  // Method to get email statistics
  async getEmailStats(dateFrom, dateTo) {
    try {
      const query = `
        SELECT 
          type,
          status,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM email_notifications
        WHERE created_at BETWEEN ? AND ?
        GROUP BY type, status, DATE(created_at)
        ORDER BY date DESC
      `;
      return await this.queryAsync(query, [dateFrom, dateTo]);
    } catch (error) {
      console.error('Error fetching email stats:', error);
      return [];
    }
  }
}

module.exports = new EmailService();
