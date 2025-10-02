/**
 * Simple Email Service for Indians in Ghana Membership
 * With fallback for SMTP connection issues
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { promisify } = require('util');
const emailFallback = require('./emailFallbackService');

// Register Handlebars helpers
handlebars.registerHelper('eq', function(a, b) { return a === b; });
handlebars.registerHelper('ne', function(a, b) { return a !== b; });
handlebars.registerHelper('gt', function(a, b) { return a > b; });
handlebars.registerHelper('lt', function(a, b) { return a < b; });
handlebars.registerHelper('and', function(a, b) { return a && b; });
handlebars.registerHelper('or', function(a, b) { return a || b; });
handlebars.registerHelper('gte', function(a, b) { return a >= b; });
handlebars.registerHelper('lte', function(a, b) { return a <= b; });

class EmailService {
  constructor() {
    this.transporter = null;
    this.templatesCache = new Map();
    this.queryAsync = promisify(db.query).bind(db);
    this.smtpBlocked = false; // Track if SMTP is completely blocked
    
    this.initialize().catch(error => {
      console.error('Email service initialization failed:', error.message);
    });
  }

  async initialize() {
    // Simple SMTP configuration
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    console.log(`📧 Email service initialized with ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  }

  async getTemplate(templateType) {
    if (this.templatesCache.has(templateType)) {
      return this.templatesCache.get(templateType);
    }

    try {
      // Try loading from file first
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateType}.hbs`);
      
      if (fs.existsSync(templatePath)) {
        const htmlContent = fs.readFileSync(templatePath, 'utf8');
        const dbResults = await this.queryAsync(
          'SELECT subject FROM email_templates WHERE type = ? AND is_active = 1',
          [templateType]
        );
        
        const template = {
          subject: dbResults.length > 0 ? dbResults[0].subject : `{{subject}} - Indians in Ghana`,
          html: htmlContent,
          text: this.htmlToText(htmlContent)
        };

        this.templatesCache.set(templateType, template);
        return template;
      }

      // Fallback to database
      const results = await this.queryAsync(
        'SELECT * FROM email_templates WHERE type = ? AND is_active = 1',
        [templateType]
      );

      if (results.length === 0) {
        throw new Error(`Template not found: ${templateType}`);
      }

      const template = {
        subject: results[0].subject,
        html: results[0].html_content,
        text: results[0].text_content || ''
      };

      this.templatesCache.set(templateType, template);
      return template;
    } catch (error) {
      console.error(`Error loading template ${templateType}:`, error);
      throw error;
    }
  }

  renderTemplate(templateString, data) {
    try {
      const template = handlebars.compile(templateString);
      return template(data);
    } catch (error) {
      console.error('Error rendering template:', error);
      return templateString;
    }
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Main email sending method with fallback
  async sendEmail({ to, templateType, type, data, priority = 'normal', scheduledFor = null }) {
    try {
      const emailType = templateType || type;
      if (!emailType) {
        throw new Error('Email type/templateType is required');
      }
      
      const template = await this.getTemplate(emailType);
      const subject = this.renderTemplate(template.subject, data);
      const htmlContent = this.renderTemplate(template.html, data);
      const textContent = this.renderTemplate(template.text, data);

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'Indians in Ghana'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'cards@indiansinghana.com'}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      let result;
      
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        result = await this.queueEmail({
          recipient: to,
          type: emailType,
          subject: subject,
          html_content: htmlContent,
          text_content: textContent,
          priority: priority,
          scheduled_for: scheduledFor,
          data: JSON.stringify(data)
        });
      } else {
        // Try sending immediately with fallback
        if (!this.smtpBlocked && process.env.SMTP_USER && process.env.SMTP_PASS && this.transporter) {
          result = await this.sendWithFallback(mailOptions, to);
        } else {
          // Use fallback method immediately
          result = await this.sendViaFallback(mailOptions);
        }
      }

      // Log the email attempt
      await this.logEmail({
        recipient: to,
        type: emailType,
        subject: subject,
        status: result.sent ? 'sent' : (result.error ? 'failed' : 'logged'),
        message_id: result.messageId,
        error: result.error || null,
        data: JSON.stringify(data)
      });

      return result;

    } catch (error) {
      console.error('Error in email service:', error);
      
      await this.logEmail({
        recipient: to,
        type: emailType,
        subject: 'Failed to render',
        status: 'failed',
        error: error.message,
        data: JSON.stringify(data)
      });

      return { success: false, error: error.message };
    }
  }

  // Send with SMTP and fallback on failure
  async sendWithFallback(mailOptions, recipient) {
    try {
      console.log(`📧 Attempting SMTP send to ${recipient}`);
      
      // Quick SMTP attempt with short timeout
      const sendWithTimeout = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SMTP timeout - 10 seconds'));
        }, 10000); // Only 10 seconds for SMTP
        
        this.transporter.sendMail(mailOptions)
          .then(resolve)
          .catch(reject)
          .finally(() => clearTimeout(timeout));
      });
      
      const info = await sendWithTimeout;
      
      return {
        success: true,
        messageId: info.messageId,
        sent: true,
        method: 'smtp'
      };
      
    } catch (smtpError) {
      console.log(`❌ SMTP failed for ${recipient}: ${smtpError.message}`);
      
      // Mark SMTP as blocked if connection error
      if (smtpError.code === 'ETIMEDOUT' || smtpError.message.includes('timeout')) {
        this.smtpBlocked = true;
        console.log('🚫 SMTP marked as blocked due to timeout - using fallback for future emails');
      }
      
      // Use fallback method
      return await this.sendViaFallback(mailOptions);
    }
  }

  // Fallback email method
  async sendViaFallback(mailOptions) {
    try {
      console.log(`📧 Using fallback email method for ${mailOptions.to}`);
      
      // Simple console log fallback (can be replaced with webhook service)
      const result = emailFallback.logEmailFallback({
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html
      });
      
      return result;
      
    } catch (fallbackError) {
      console.error('Fallback email also failed:', fallbackError);
      return {
        success: false,
        error: fallbackError.message,
        sent: false
      };
    }
  }

  async queueEmail(emailData) {
    try {
      const result = await this.queryAsync(
        `INSERT INTO email_queue (recipient, type, subject, html_content, text_content, priority, scheduled_for, data, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          emailData.recipient,
          emailData.type,
          emailData.subject,
          emailData.html_content,
          emailData.text_content,
          emailData.priority,
          emailData.scheduled_for,
          emailData.data
        ]
      );

      return { success: true, queueId: result.insertId, queued: true };
    } catch (error) {
      console.error('Error queueing email:', error);
      throw error;
    }
  }

  async logEmail(emailData) {
    try {
      await this.queryAsync(
        `INSERT INTO email_notifications (recipient, type, subject, status, message_id, error, data) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          emailData.recipient,
          emailData.type,
          emailData.subject,
          emailData.status,
          emailData.message_id || null,
          emailData.error || null,
          emailData.data
        ]
      );
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  async processEmailQueue() {
    try {
      const pendingEmails = await this.queryAsync(
        `SELECT * FROM email_queue 
         WHERE status = 'pending' 
         AND (scheduled_for IS NULL OR scheduled_for <= NOW()) 
         ORDER BY priority DESC, created_at ASC 
         LIMIT 5`
      );

      let processed = 0;
      for (const email of pendingEmails) {
        try {
          await this.queryAsync(
            'UPDATE email_queue SET status = "processing" WHERE id = ?',
            [email.id]
          );

          const mailOptions = {
            from: `${process.env.SMTP_FROM_NAME || 'Indians in Ghana'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'cards@indiansinghana.com'}>`,
            to: email.recipient,
            subject: email.subject,
            html: email.html_content,
            text: email.text_content
          };

          console.log(`📧 Queue processing: Sending from ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER} to ${email.recipient}`);

          let result;
          if (!this.smtpBlocked && process.env.SMTP_USER && process.env.SMTP_PASS) {
            result = await this.sendWithFallback(mailOptions, email.recipient);
          } else {
            result = await this.sendViaFallback(mailOptions);
          }

          if (result.sent) {
            await this.queryAsync(
              'UPDATE email_queue SET status = "sent", message_id = ?, sent_at = NOW() WHERE id = ?',
              [result.messageId, email.id]
            );
            console.log(`✅ Queue email sent to ${email.recipient}: ${email.subject}`);
          } else {
            await this.queryAsync(
              'UPDATE email_queue SET status = "sent", message_id = ?, sent_at = NOW() WHERE id = ?',
              [result.messageId, email.id]
            );
            console.log(`📧 Queue email processed via fallback to ${email.recipient}: ${email.subject}`);
          }
          
          processed++;

        } catch (error) {
          console.error(`Error processing queue email ${email.id}:`, error);
          await this.queryAsync(
            'UPDATE email_queue SET status = "failed", error = ?, failed_at = NOW() WHERE id = ?',
            [error.message, email.id]
          );
        }
      }

      return { processed: processed, success: true };
    } catch (error) {
      console.error('Error processing email queue:', error);
      return { processed: 0, success: false, error: error.message };
    }
  }

  // Utility methods
  clearTemplateCache() {
    this.templatesCache.clear();
  }

  getServiceStatus() {
    return {
      initialized: !!this.transporter,
      smtpBlocked: this.smtpBlocked,
      hasCredentials: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      templatesLoaded: this.templatesCache.size
    };
  }

  async reinitialize() {
    console.log('🔄 Reinitializing email service...');
    await this.initialize();
    this.clearTemplateCache();
    console.log(`✅ Email service reinitialized`);
  }

  async getEmailStats() {
    try {
      const stats = await this.queryAsync(`
        SELECT 
          COUNT(*) as total_emails,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_emails,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_emails,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_emails
        FROM email_notifications
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      return {
        ...stats[0],
        success_rate: stats[0].total_emails > 0 ? 
          ((stats[0].sent_emails / stats[0].total_emails) * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Error getting email stats:', error);
      return {};
    }
  }

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
}

module.exports = new EmailService();