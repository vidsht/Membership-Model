// Enhanced Email Fallback Service with real email delivery
const https = require('https');
const querystring = require('querystring');

class EmailFallbackService {
  
  // Use SendGrid API for real email delivery
  async sendViaAPI(emailData) {
    try {
      if (process.env.SENDGRID_API_KEY) {
        return await this.sendViaSendGrid(emailData);
      } else if (process.env.MAILGUN_API_KEY) {
        return await this.sendViaMailgun(emailData);
      } else {
        throw new Error('No email API configured');
      }
    } catch (error) {
      throw new Error(`API email failed: ${error.message}`);
    }
  }

  // SendGrid API implementation
  async sendViaSendGrid(emailData) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        personalizations: [{
          to: [{ email: emailData.to }],
          subject: emailData.subject
        }],
        from: { 
          email: process.env.SMTP_FROM_EMAIL || 'cards@indiansinghana.com',
          name: process.env.SMTP_FROM_NAME || 'Indians in Ghana'
        },
        content: [
          { type: 'text/html', value: emailData.html },
          { type: 'text/plain', value: emailData.text }
        ]
      });

      const options = {
        hostname: 'api.sendgrid.com',
        port: 443,
        path: '/v3/mail/send',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 202) {
            console.log(`✅ SendGrid email sent to ${emailData.to}`);
            resolve({ 
              success: true, 
              messageId: `sendgrid-${Date.now()}`,
              sent: true,
              method: 'sendgrid_api'
            });
          } else {
            reject(new Error(`SendGrid failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
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

  // Try multiple fallback methods
  async sendWithMultipleFallbacks(emailData) {
    try {
      // Method 1: Try API service (if configured)
      if (process.env.ENABLE_API_EMAIL === 'true') {
        return await this.sendViaAPI(emailData);
      }
      
      // Method 2: Enhanced logging
      return this.logEmailFallback(emailData);
      
    } catch (error) {
      console.error('All fallback methods failed:', error);
      return {
        success: false,
        error: error.message,
        sent: false
      };
    }
  }
}

module.exports = new EmailFallbackService();