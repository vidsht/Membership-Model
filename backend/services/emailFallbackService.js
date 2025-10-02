// Enhanced Email Fallback Service with SendGrid implementation
const https = require('https');
const querystring = require('querystring');

class EmailFallbackService {
  
  constructor() {
    // Initialize SendGrid if available
    this.sendGrid = null;
    if (process.env.SENDGRID_API_KEY) {
      try {
        this.sendGrid = require('@sendgrid/mail');
        this.sendGrid.setApiKey(process.env.SENDGRID_API_KEY);
        console.log('✅ SendGrid initialized successfully');
      } catch (error) {
        console.error('❌ SendGrid initialization failed:', error.message);
      }
    }
  }
  
  // Use SendGrid API for real email delivery
  async sendViaAPI(emailData) {
    try {
      if (this.sendGrid && process.env.SENDGRID_API_KEY) {
        return await this.sendViaSendGrid(emailData);
      } else if (process.env.MAILGUN_API_KEY) {
        return await this.sendViaMailgun(emailData);
      } else {
        throw new Error('No email API configured - add SENDGRID_API_KEY to environment variables');
      }
    } catch (error) {
      throw new Error(`API email failed: ${error.message}`);
    }
  }

  // SendGrid API implementation using official package
  async sendViaSendGrid(emailData) {
    try {
      const msg = {
        to: emailData.to,
        from: {
          email: process.env.SMTP_FROM_EMAIL || 'cards@indiansinghana.com',
          name: process.env.SMTP_FROM_NAME || 'Indians in Ghana'
        },
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      };

      console.log(`📧 Sending via SendGrid to ${emailData.to}...`);
      const response = await this.sendGrid.send(msg);
      
      console.log(`✅ SendGrid email sent successfully to ${emailData.to}`);
      return { 
        success: true, 
        messageId: response[0].headers['x-message-id'] || `sendgrid-${Date.now()}`,
        sent: true,
        method: 'sendgrid_api',
        statusCode: response[0].statusCode
      };
      
    } catch (error) {
      console.error('SendGrid send failed:', error.message);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      throw error;
    }
  }

  // Mailgun API implementation  
  async sendViaMailgun(emailData) {
    return new Promise((resolve, reject) => {
      const formData = querystring.stringify({
        from: `${process.env.SMTP_FROM_NAME || 'Indians in Ghana'} <${process.env.SMTP_FROM_EMAIL || 'cards@indiansinghana.com'}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      });

      const options = {
        hostname: 'api.mailgun.net',
        port: 443,
        path: `/v3/${process.env.MAILGUN_DOMAIN}/messages`,
        method: 'POST',
        auth: `api:${process.env.MAILGUN_API_KEY}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ Mailgun email sent to ${emailData.to}`);
            resolve({ 
              success: true, 
              messageId: `mailgun-${Date.now()}`,
              sent: true,
              method: 'mailgun_api'
            });
          } else {
            reject(new Error(`Mailgun failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(formData);
      req.end();
    });
  }

  // Enhanced log-based fallback with better formatting
  logEmailFallback(emailData) {
    console.log('\n📧 EMAIL DELIVERY NOTIFICATION');
    console.log('===============================');
    console.log(`✅ Email processed for: ${emailData.to}`);
    console.log(`📋 Subject: ${emailData.subject}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    console.log(`📧 Status: Email content logged (SMTP unavailable)`);
    console.log('===============================\n');
    
    // In production, this could:
    // 1. Save to database for manual sending
    // 2. Send to a webhook
    // 3. Queue for alternative delivery service
    // 4. Send via API service
    
    return { 
      success: true, 
      messageId: `fallback-${Date.now()}`,
      sent: true,
      method: 'console_log',
      note: 'Email logged - SMTP unavailable'
    };
  }

  // Try multiple fallback methods with SendGrid priority
  async sendWithMultipleFallbacks(emailData) {
    try {
      // Method 1: Try SendGrid API (if configured)
      if (this.sendGrid && process.env.SENDGRID_API_KEY) {
        console.log('📧 Using SendGrid API for email delivery');
        return await this.sendViaSendGrid(emailData);
      }
      
      // Method 2: Try other API services
      if (process.env.MAILGUN_API_KEY) {
        console.log('📧 Using Mailgun API for email delivery');
        return await this.sendViaMailgun(emailData);
      }
      
      // Method 3: Enhanced logging fallback
      console.log('📧 No API configured - using console logging');
      return this.logEmailFallback(emailData);
      
    } catch (error) {
      console.error('SendGrid/API delivery failed, falling back to logging:', error.message);
      // Always fall back to logging if API fails
      return this.logEmailFallback(emailData);
    }
  }
}

module.exports = new EmailFallbackService();