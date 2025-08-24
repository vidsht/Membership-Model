/**
 * Email Service for Indians in Ghana Membership Platform
 * Integrated with existing database structure
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const db = require('../db');
const { promisify } = require('util');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templatesCache = new Map();
    this.queryAsync = promisify(db.query).bind(db);
    this.initialize();
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

    // Verify connection in production
    try {
      if (process.env.NODE_ENV === 'production' && process.env.SMTP_USER && process.env.SMTP_PASS) {
        console.log('🔍 Verifying SMTP connection...');
        await this.transporter.verify();
        console.log('✅ Email service initialized successfully');
      } else {
        console.log('⚠️ Email service initialized without SMTP verification (development mode)');
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      console.log('📧 Emails will be logged only (SMTP connection failed)');
    }
  }

  async getTemplate(templateType) {
    // Check cache first
    if (this.templatesCache.has(templateType)) {
      return this.templatesCache.get(templateType);
    }

    try {
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

  async sendEmail({ to, templateType, data, priority = 'normal', scheduledFor = null }) {
    try {
      // Get email template
      const template = await this.getTemplate(templateType);
      
      // Render subject and content with data
      const subject = this.renderTemplate(template.subject, data);
      const htmlContent = this.renderTemplate(template.html, data);
      const textContent = this.renderTemplate(template.text, data);

      // Prepare email options
      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'Indians in Ghana'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'tvidushi1234@gmail.com'}>`,
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
          type: templateType,
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
            
            // First verify the connection
            await this.transporter.verify();
            
            const info = await this.transporter.sendMail(mailOptions);
            result = {
              success: true,
              messageId: info.messageId,
              sent: true
            };
            console.log(`✅ Email sent successfully to ${to}`);
          } else {
            // Development/fallback mode - log to console
            console.log('📧 Email would be sent (no SMTP configured):');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log('Template Type:', templateType);
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
        type: templateType,
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
        type: templateType,
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
            from: `${process.env.SMTP_FROM_NAME || 'Indians in Ghana'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'support@indiansinghana.com'}>`,
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

  // Clear template cache
  clearTemplateCache() {
    this.templatesCache.clear();
  }
}

module.exports = new EmailService();
