/**
 * Email Service for Indians in Ghana Membership
 * Integrated with existing database structure
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { promisify } = require('util');

// Register Handlebars helpers
handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

handlebars.registerHelper('ne', function(a, b) {
  return a !== b;
});

handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

handlebars.registerHelper('and', function(a, b) {
  return a && b;
});

handlebars.registerHelper('or', function(a, b) {
  return a || b;
});

handlebars.registerHelper('gte', function(a, b) {
  return a >= b;
});

handlebars.registerHelper('lte', function(a, b) {
  return a <= b;
});

class EmailService {
  constructor() {
    this.transporter = null;
    this.templatesCache = new Map();
    this.queryAsync = promisify(db.query).bind(db);
    this.smtpVerified = false;
    
    // Initialize in the background to not block server startup
    this.initialize().catch(error => {
      console.error('Email service background initialization failed:', error.message);
    });
  }

  async initialize() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Skip SMTP verification entirely if disabled or in development
    if (process.env.DISABLE_SMTP_VERIFY === 'true') {
      console.log('⚠️ Email service initialized without SMTP verification (DISABLE_SMTP_VERIFY=true)');
      this.smtpVerified = false;
      return;
    }

    // Only verify in production with credentials
    const shouldVerify = process.env.NODE_ENV === 'production' 
      && process.env.SMTP_USER 
      && process.env.SMTP_PASS;
      
    if (!shouldVerify) {
      console.log('⚠️ Email service initialized without SMTP verification (development mode or missing credentials)');
      this.smtpVerified = false;
      return;
    }

    // Verify connection in production
    try {
      console.log('🔍 Verifying SMTP connection...');
      
      // Add timeout wrapper for the verify call
      const verifyWithTimeout = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - SMTP server did not respond within 15 seconds'));
        }, 15000);
        
        this.transporter.verify().then(resolve).catch(reject).finally(() => {
          clearTimeout(timeout);
        });
      });
      
      await verifyWithTimeout;
      console.log('✅ Email service initialized successfully');
      this.smtpVerified = true;
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      
      // Provide more specific error guidance
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        console.log('⚠️ SMTP Connection Timeout - Possible causes:');
        console.log('   1. Network connectivity issues');
        console.log('   2. Firewall blocking SMTP port 587');
        console.log('   3. Gmail SMTP server temporarily unavailable');
        console.log('   4. Invalid SMTP credentials');
        console.log('   5. Gmail account has 2FA enabled without app password');
        console.log('💡 To skip SMTP verification during startup, add DISABLE_SMTP_VERIFY=true to .env');
      } else if (error.message.includes('authentication') || error.message.includes('Invalid login')) {
        console.log('⚠️ SMTP Authentication Failed - Check credentials:');
        console.log('   1. Verify SMTP_USER and SMTP_PASS in .env file');
        console.log('   2. Use App Password if 2FA is enabled on Gmail');
        console.log('   3. Enable "Less secure app access" (if available)');
      }
      
      console.log('📧 Emails will be logged only (SMTP connection failed)');
    }
  }

  async getTemplate(templateType) {
    // Check cache first
    if (this.templatesCache.has(templateType)) {
      return this.templatesCache.get(templateType);
    }

    try {
      // First, try to load from local template files
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateType.replace(/_/g, '-')}.hbs`);
      
      if (fs.existsSync(templatePath)) {
        console.log(`📄 Loading template from file: ${templateType}`);
        const htmlContent = fs.readFileSync(templatePath, 'utf8');
        
        // Get subject from database for consistency
        const dbResults = await this.queryAsync(
          'SELECT subject FROM email_templates WHERE type = ? AND is_active = 1',
          [templateType]
        );
        
        const template = {
          subject: dbResults.length > 0 ? dbResults[0].subject : `{{subject}} - Indians in Ghana`,
          html: htmlContent,
          text: this.htmlToText(htmlContent)
        };

        // Cache the template
        this.templatesCache.set(templateType, template);
        return template;
      }

      // Fallback to database templates
      console.log(`📄 Loading template from database: ${templateType}`);
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

      // Cache the template
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
      return templateString; // Return original if compilation fails
    }
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  async sendEmail({ to, templateType, type, data, priority = 'normal', scheduledFor = null }) {
    try {
      // Support both 'type' and 'templateType' for backward compatibility
      const emailType = templateType || type;
      if (!emailType) {
        throw new Error('Email type/templateType is required');
      }
      
      // Get email template
      const template = await this.getTemplate(emailType);
      
      // Render subject and content with data
      const subject = this.renderTemplate(template.subject, data);
      const htmlContent = this.renderTemplate(template.html, data);
      const textContent = this.renderTemplate(template.text, data);

      // Prepare email options
      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'Indians in Ghana'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'cards@indiansinghana.com'}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      let result;
      
      if (scheduledFor && new Date(scheduledFor) > new Date()) {
        // Queue for later sending
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
        // Send immediately
        try {
          if (process.env.SMTP_USER && process.env.SMTP_PASS && this.transporter) {
            console.log(`📧 Attempting to send email to ${to} with subject: ${subject}`);
            // Try sending directly (avoid verify which can sometimes fail even when sendMail works)
            try {
              const info = await this.transporter.sendMail(mailOptions);
              result = {
                success: true,
                messageId: info.messageId,
                sent: true
              };
              console.log(`✅ Email sent successfully to ${to}`);
            } catch (sendError) {
              console.error(`❌ Failed to send email to ${to}:`, sendError.message);
              console.log('📧 Email logged instead of sent due to SMTP error');
              result = {
                success: true,
                error: sendError.message,
                sent: false,
                mode: 'logged_only'
              };
            }
          } else {
            // Development/fallback mode - log to console
            console.log('📧 Email would be sent (no SMTP configured):');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('Template Type:', emailType);
            console.log('---');
            result = {
              success: true,
              messageId: 'fallback-' + Date.now(),
              sent: false,
              mode: 'fallback'
            };
          }
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${to}:`, emailError.message);
          
          // Fallback - still consider it successful for application flow
          console.log('📧 Email logged instead of sent due to SMTP error');
          result = {
            success: true, // Don't break application flow
            error: emailError.message,
            sent: false,
            mode: 'logged_only'
          };
        }
      }

      // Log the email attempt (whether successful or not)
      await this.logEmail({
        recipient: to,
        type: emailType,
        subject: subject,
        status: result.sent ? 'sent' : 'logged',
        message_id: result.messageId,
        error: result.error || null,
        data: JSON.stringify(data)
      });

      return result;

    } catch (error) {
      console.error('Error in email service:', error);
      
      // Log failed email
      await this.logEmail({
        recipient: to,
        type: emailType,
        subject: 'Failed to render',
        status: 'failed',
        error: error.message,
        data: JSON.stringify(data)
      });

      return {
        success: false,
        error: error.message
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

      return {
        success: true,
        queueId: result.insertId,
        queued: true
      };
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
          emailData.recipient || emailData.recipient_email,
          emailData.type || emailData.template_name,
          emailData.subject,
          emailData.status,
          emailData.message_id || null,
          emailData.error || emailData.error_message || null,
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
         LIMIT 10`
      );

      for (const email of pendingEmails) {
        try {
          // Update status to processing
          await this.queryAsync(
            'UPDATE email_queue SET status = "processing" WHERE id = ?',
            [email.id]
          );

          // Send email
          const mailOptions = {
            from: `${process.env.SMTP_FROM_NAME || 'Indians in Ghana'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'cards@indiansinghana.com'}>`,
            to: email.recipient,
            subject: email.subject,
            html: email.html_content,
            text: email.text_content
          };

          if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const info = await this.transporter.sendMail(mailOptions);
            
            // Update status to sent
            await this.queryAsync(
              'UPDATE email_queue SET status = "sent", message_id = ?, sent_at = NOW() WHERE id = ?',
              [info.messageId, email.id]
            );
            console.log(`✅ Queue email sent to ${email.recipient}: ${email.subject}`);
          } else {
            // Development mode
            console.log(`📧 Queue email sent (dev): ${email.subject} to ${email.recipient}`);
            await this.queryAsync(
              'UPDATE email_queue SET status = "sent", message_id = ?, sent_at = NOW() WHERE id = ?',
              [`dev-${Date.now()}`, email.id]
            );
          }

        } catch (error) {
          console.error(`Error processing queue email ${email.id}:`, error);
          
          // Update retry count and status
          const newRetryCount = email.retry_count + 1;
          const maxRetries = email.max_retries || 3;
          
          if (newRetryCount >= maxRetries) {
            await this.queryAsync(
              'UPDATE email_queue SET status = "failed", error = ?, retry_count = ?, failed_at = NOW() WHERE id = ?',
              [error.message, newRetryCount, email.id]
            );
          } else {
            await this.queryAsync(
              'UPDATE email_queue SET status = "pending", error = ?, retry_count = ?, updated_at = NOW() WHERE id = ?',
              [error.message, newRetryCount, email.id]
            );
          }
        }
      }

      return {
        processed: pendingEmails.length,
        success: true
      };
    } catch (error) {
      console.error('Error processing email queue:', error);
      return {
        processed: 0,
        success: false,
        error: error.message
      };
    }
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

      const queueStats = await this.queryAsync(`
        SELECT 
          COUNT(*) as queued_emails,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_queue
        FROM email_queue
      `);

      return {
        ...stats[0],
        ...queueStats[0],
        success_rate: stats[0].total_emails > 0 ? 
          ((stats[0].sent_emails / stats[0].total_emails) * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Error getting email stats:', error);
      return {};
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, resetData) {
    try {
      const templateData = {
        fullName: resetData.fullName || 'Member',
        resetUrl: resetData.resetUrl,
        expiryMinutes: resetData.expiryMinutes || 30,
        requestTime: new Date().toLocaleString(),
        ipAddress: resetData.ipAddress || 'Unknown',
        userAgent: resetData.userAgent || 'Unknown'
      };

      return await this.sendEmail({
        to: email,
        templateType: 'password-reset',
        data: templateData
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear template cache
  clearTemplateCache() {
    this.templatesCache.clear();
  }

  // On-demand SMTP verification (useful for health checks)
  async verifySMTPConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const verifyWithTimeout = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout - SMTP server did not respond within 15 seconds'));
        }, 15000);
        
        this.transporter.verify().then(resolve).catch(reject).finally(() => {
          clearTimeout(timeout);
        });
      });

      await verifyWithTimeout;
      this.smtpVerified = true;
      return { success: true, message: 'SMTP connection verified' };
    } catch (error) {
      this.smtpVerified = false;
      return { success: false, error: error.message };
    }
  }

  // Get email service status
  getServiceStatus() {
    return {
      initialized: !!this.transporter,
      smtpVerified: this.smtpVerified,
      hasCredentials: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
      templatesLoaded: this.templatesCache.size
    };
  }
}

module.exports = new EmailService();