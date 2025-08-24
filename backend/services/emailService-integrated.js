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
        user: process.env.SMTP_USER || 'support@indiansinghana.com',
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection (optional in development)
    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'support@indiansinghana.com') {
        await this.transporter.verify();
        console.log('✅ Email service initialized successfully');
      } else {
        console.log('⚠️ Email service initialized without SMTP verification (development mode)');
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
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
        from: `${process.env.SMTP_FROM_NAME || 'Indians in Ghana'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'support@indiansinghana.com'}>`,
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
        if (process.env.NODE_ENV === 'production' && process.env.SMTP_USER && process.env.SMTP_PASS) {
          const info = await this.transporter.sendMail(mailOptions);
          result = {
            success: true,
            messageId: info.messageId,
            sent: true
          };
        } else {
          // Development mode - just log
          console.log('📧 Email would be sent (development mode):');
          console.log(`To: ${to}`);
          console.log(`Subject: ${subject}`);
          console.log('Template Type:', templateType);
          result = {
            success: true,
            messageId: 'dev-' + Date.now(),
            sent: false,
            development: true
          };
        }
      }

      // Log the email
      await this.logEmail({
        template_name: templateType,
        recipient_email: to,
        subject: subject,
        status: result.success ? 'sent' : 'failed',
        message_id: result.messageId,
        data: JSON.stringify(data)
      });

      return result;

    } catch (error) {
      console.error('Error sending email:', error);
      
      // Log failed email
      await this.logEmail({
        template_name: templateType,
        recipient_email: to,
        subject: 'Failed to render',
        status: 'failed',
        error_message: error.message,
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
          emailData.recipient_email || emailData.recipient,
          emailData.template_name || emailData.type,
          emailData.subject,
          emailData.status,
          emailData.message_id || null,
          emailData.error_message || null,
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

          if (process.env.NODE_ENV === 'production' && process.env.SMTP_USER && process.env.SMTP_PASS) {
            const info = await this.transporter.sendMail(mailOptions);
            
            // Update status to sent
            await this.queryAsync(
              'UPDATE email_queue SET status = "sent", message_id = ?, sent_at = NOW() WHERE id = ?',
              [info.messageId, email.id]
            );
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
