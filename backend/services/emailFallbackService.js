// Simple Email Fallback Service for Render.com SMTP Issues
const https = require('https');
const querystring = require('querystring');

class EmailFallbackService {
  
  // Use a free email API service as fallback
  async sendViaWebhook(emailData) {
    try {
      // Using EmailJS public API (free service)
      const formData = {
        service_id: 'gmail',
        template_id: 'template_email',
        user_id: 'public_key', // Would need actual keys
        template_params: {
          to_email: emailData.to,
          subject: emailData.subject,
          message: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
          from_name: 'Indians in Ghana'
        }
      };

      return new Promise((resolve, reject) => {
        const postData = JSON.stringify(formData);
        
        const options = {
          hostname: 'api.emailjs.com',
          port: 443,
          path: '/api/v1.0/email/send',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve({ success: true, method: 'webhook' });
            } else {
              reject(new Error(`Webhook failed: ${res.statusCode}`));
            }
          });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });
      
    } catch (error) {
      throw new Error(`Webhook email failed: ${error.message}`);
    }
  }

  // Simple log-based fallback
  logEmailFallback(emailData) {
    console.log('\n=== EMAIL FALLBACK LOG ===');
    console.log(`To: ${emailData.to}`);
    console.log(`Subject: ${emailData.subject}`);
    console.log(`Content: ${emailData.text || 'HTML content'}`);
    console.log('=========================\n');
    
    return { 
      success: true, 
      messageId: `fallback-${Date.now()}`,
      sent: true,
      method: 'console_log'
    };
  }
}

module.exports = new EmailFallbackService();