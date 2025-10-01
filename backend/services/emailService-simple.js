const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templatesCache = new Map();
    this.initialize();
  }

  async initialize() {
    // Validate required environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ Missing required email environment variables:');
      console.error('SMTP_HOST:', process.env.SMTP_HOST ? '✓' : '✗');
      console.error('SMTP_USER:', process.env.SMTP_USER ? '✓' : '✗');
      console.error('SMTP_PASS:', process.env.SMTP_PASS ? '✓' : '✗');
      throw new Error('Email service cannot initialize: Missing SMTP credentials');
    }

    // Simple email transporter setup with validated credentials
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('📧 Email service initialized successfully');
    console.log('   SMTP Host:', process.env.SMTP_HOST);
    console.log('   SMTP User:', process.env.SMTP_USER);
    console.log('   SMTP Port:', process.env.SMTP_PORT || 587);
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
      console.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found`);
    }
  }

  async getEmailTemplate(type) {
    // Simple template configurations
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
      },
      'password_reset': {
        subject: 'Password Reset Request - Indians in Ghana',
        templateName: 'password-reset',
        textContent: 'You have requested a password reset.'
      },
      'welcome_email': {
        subject: 'Welcome to Indians in Ghana - {{fullName}}!',
        templateName: 'user-welcome',
        textContent: 'Welcome to our community!'
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
      const htmlContent = await this.loadTemplate(config.templateName);
      return {
        subject: config.subject,
        htmlContent: htmlContent,
        textContent: config.textContent
      };
    } catch (error) {
      console.error(`Error loading template ${config.templateName}:`, error);
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
        data = {}
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

      // Send email
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Indians in Ghana'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        text: text,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully: ${type} to ${to}`);
      
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error(`❌ Email sending failed for ${options.type} to ${options.to}:`, error);
      throw error;
    }
  }
}

module.exports = new EmailService();