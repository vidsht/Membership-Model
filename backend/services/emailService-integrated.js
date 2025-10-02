/**
 * Email Service for Indians in Ghana Membership
 * Integrate  async initialize() {
    // Try multiple SMTP configurations for better compatibility
    const smtpConfigs = [
      // Primary Gmail configuration (current)
      {
        name: 'Gmail SMTP 587',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: p        // For connection/timeout errors on any attempt, try alternative config
        if ((isConnectionError || isTimeoutError) && attempt <= 2) {
          console.log(`🔄 Connection/timeout failed on attempt ${attempt}, trying alternative SMTP configuration...`);
          try {
            await this.tryAlternativeConfig();
            console.log(`✅ Switched to alternative config, continuing with retry...`);
          } catch (reinitError) {
            console.log(`⚠️ Alternative config failed: ${reinitError.message}`);
          }
        }rocess.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false }
      },
      // Gmail SSL configuration (port 465)
      {
        name: 'Gmail SMTP 465 (SSL)',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false }
      },
      // Gmail port 25 (if available)
      {
        name: 'Gmail SMTP 25',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: 25,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: { rejectUnauthorized: false }
      }
    ];

    // Try each configuration until one works
    for (const config of smtpConfigs) {
      try {
        console.log(`📧 Trying ${config.name}...`);
        
        const testTransporter = nodemailer.createTransporter({
          ...config,
          connectionTimeout: 15000, // 15 seconds
          greetingTimeout: 10000,   // 10 seconds  
          socketTimeout: 15000,     // 15 seconds
        });

        // Test connection with short timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection test timeout'));
          }, 15000);
          
          testTransporter.verify((error, success) => {
            clearTimeout(timeout);
            if (error) reject(error);
            else resolve(success);
          });
        });

        // If we get here, this configuration works
        this.transporter = testTransporter;
        this.workingConfig = config;
        console.log(`✅ Successfully connected using ${config.name}`);
        break;
        
      } catch (error) {
        console.log(`❌ ${config.name} failed: ${error.message}`);
        continue;
      }
    }

    // If no configuration worked, use the first one anyway (for queue fallback)
    if (!this.transporter) {
      console.log('⚠️ All SMTP configurations failed, using default for queue processing');
      this.transporter = nodemailer.createTransporter(smtpConfigs[0]);
      this.workingConfig = null;
    }

    // Skip SMTP verification entirely if disabled or in developmentdatabase structure
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

  // Reinitialize email service with current environment variables
  async reinitialize() {
    console.log('🔄 Reinitializing email service with current environment variables...');
    await this.initialize();
    this.clearTemplateCache();
    console.log(`✅ Email service reinitialized with SMTP_USER: ${process.env.SMTP_USER}`);
    console.log(`✅ Email service FROM_EMAIL: ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}`);
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
      const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateType}.hbs`);
      
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

  // Send email with automatic SMTP configuration switching
  async sendWithRetry(mailOptions, recipient, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📧 Attempt ${attempt}/${maxRetries} to send email to ${recipient}`);
        
        // Add timeout wrapper to prevent hanging
        const sendWithTimeout = new Promise((resolve, reject) => {
          // Use shorter timeout for faster fallback
          const timeoutMs = 20000; // 20 seconds
          const timeout = setTimeout(() => {
            reject(new Error(`Email send timeout - SMTP server did not respond within ${timeoutMs/1000} seconds`));
          }, timeoutMs);
          
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
          attempts: attempt,
          config: this.workingConfig?.name || 'Default'
        };
        
      } catch (sendError) {
        console.error(`❌ Attempt ${attempt} failed for ${recipient}:`, sendError.message);
        
        const isConnectionError = (sendError.code === 'ETIMEDOUT' && sendError.command === 'CONN') ||
                                 sendError.message.includes('Email send timeout - SMTP server did not respond');
        const isTimeoutError = sendError.message.includes('timeout') || 
                              sendError.message.includes('ETIMEDOUT') ||
                              sendError.message.includes('ECONNRESET') ||
                              sendError.message.includes('ECONNREFUSED') ||
                              sendError.message.includes('ENOTFOUND') ||
                              sendError.message.includes('Connection timeout') ||
                              sendError.message.includes('Email send timeout') ||
                              sendError.code === 'ETIMEDOUT' ||
                              sendError.code === 'ECONNRESET' ||
                              sendError.code === 'ECONNREFUSED';

        // For connection errors on first attempt, try reinitializing with different config
        if (isConnectionError && attempt === 1) {
          console.log(`� Connection failed, trying alternative SMTP configuration...`);
          try {
            await this.tryAlternativeConfig();
          } catch (reinitError) {
            console.log(`⚠️ Alternative config failed: ${reinitError.message}`);
          }
        }

        // If it's the last attempt or not a timeout error, don't retry
        if (attempt === maxRetries || !isTimeoutError) {
          // In production, queue failed emails for later processing
          if (process.env.NODE_ENV === 'production' && isTimeoutError) {
            console.log(`📤 Queueing email for later delivery due to persistent timeout`);
            try {
              await this.queueEmail({
                recipient: recipient,
                type: mailOptions.templateType || 'unknown',
                subject: mailOptions.subject,
                html_content: mailOptions.html,
                text_content: mailOptions.text,
                priority: 'normal',
                data: JSON.stringify({ retryAfterTimeout: true })
              });
            } catch (queueError) {
              console.error('Failed to queue email:', queueError.message);
            }
          }
          
          return {
            success: true, // Don't break application flow
            error: sendError.message,
            sent: false,
            mode: isTimeoutError ? 'queued_for_retry' : 'logged_only',
            attempts: attempt
          };
        }
        
        // Wait before retrying (shorter delays for faster fallback)
        const delayMs = Math.min(Math.pow(2, attempt) * 1000, 5000); // Max 5 seconds
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // Try alternative SMTP configuration
  async tryAlternativeConfig() {
    const currentConfig = this.workingConfig?.name || 'Default (587)';
    console.log(`🔄 Current config failed: ${currentConfig} - Testing alternatives...`);
    
    // Try different ports for the same host
    const alternativeConfigs = [
      {
        name: 'Gmail SMTP 465 (SSL)',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      },
      {
        name: 'Gmail SMTP 25',
        host: process.env.SMTP_HOST || 'smtp.gmail.com', 
        port: 25,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      },
      {
        name: 'Gmail SMTP 2525',
        host: process.env.SMTP_HOST || 'smtp.gmail.com', 
        port: 2525,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      }
    ];

    // Filter out current configuration to avoid testing the same thing
    const configsToTest = alternativeConfigs.filter(config => 
      config.name !== currentConfig
    );

    for (const config of configsToTest) {
      try {
        console.log(`📧 Testing ${config.name} (port ${config.port})...`);
        
        const testTransporter = nodemailer.createTransporter({
          ...config,
          connectionTimeout: 8000,   // Shorter timeout for faster testing
          greetingTimeout: 4000,     // Shorter greeting timeout
          socketTimeout: 8000,       // Shorter socket timeout
        });

        // Quick connection test with shorter timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Quick test timeout (8s)')), 8000);
          testTransporter.verify((error, success) => {
            clearTimeout(timeout);
            if (error) reject(error);
            else resolve(success);
          });
        });

        // Switch to this configuration
        this.transporter = testTransporter;
        this.workingConfig = config;
        console.log(`✅ Successfully switched from ${currentConfig} to ${config.name} (port ${config.port})`);
        return;
        
      } catch (error) {
        console.log(`❌ ${config.name} (port ${config.port}) failed: ${error.message}`);
        continue;
      }
    }
    
    console.log(`❌ All alternative SMTP configurations failed, keeping current config`);
    throw new Error(`No alternative SMTP configuration works (tested ${configsToTest.length} alternatives)`);
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
        // Send immediately with retry logic
        if (process.env.SMTP_USER && process.env.SMTP_PASS && this.transporter) {
          console.log(`📧 Attempting to send email to ${to} with subject: ${subject}`);
          
          // Try sending with retry logic for timeout errors
          result = await this.sendWithRetry(mailOptions, to, 3);
          
          if (result.sent) {
            console.log(`✅ Email sent successfully to ${to} (${result.attempts} attempts)`);
          } else {
            console.log(`📧 Email failed after ${result.attempts} attempts: ${result.error || 'Unknown error'}`);
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
      }

      // Log the email attempt (whether successful or not)
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
      // Check for recent connection failures to avoid spamming
      const recentFailures = await this.queryAsync(`
        SELECT COUNT(*) as failures
        FROM email_queue 
        WHERE status = 'failed' 
        AND error LIKE '%ETIMEDOUT%' 
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
      `);
      
      if (recentFailures[0].failures > 5) {
        console.log(`⏸️ Skipping queue processing - too many recent connection failures (${recentFailures[0].failures})`);
        return { processed: 0, success: true, skipped: 'connection_issues' };
      }

      const pendingEmails = await this.queryAsync(
        `SELECT * FROM email_queue 
         WHERE status = 'pending' 
         AND (scheduled_for IS NULL OR scheduled_for <= NOW()) 
         ORDER BY priority DESC, created_at ASC 
         LIMIT 5`  // Reduced from 10 to 5 for connection issues
      );

      for (const email of pendingEmails) {
        try {
          // Update status to processing
          await this.queryAsync(
            'UPDATE email_queue SET status = "processing" WHERE id = ?',
            [email.id]
          );

          // Send email with current environment settings
          const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'cards@indiansinghana.com';
          const fromName = process.env.SMTP_FROM_NAME || 'Indians in Ghana';
          
          const mailOptions = {
            from: `${fromName} <${fromEmail}>`,
            to: email.recipient,
            subject: email.subject,
            html: email.html_content,
            text: email.text_content
          };

          console.log(`📧 Queue processing: Sending from ${fromEmail} to ${email.recipient}`);

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