const axios = require('axios');

/**
 * WhatsApp Business API Integration Service
 * Handles sending WhatsApp messages through WhatsApp Business Cloud API
 */
class WhatsAppBusinessService {
  constructor() {
    // WhatsApp Business Cloud API configuration
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID; // Your WhatsApp Business phone number ID
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN; // Your WhatsApp Business access token
    this.version = process.env.WHATSAPP_API_VERSION || 'v18.0';
    
    // Fallback configuration for testing/development
    this.isConfigured = !!(this.phoneNumberId && this.accessToken);
    
    if (!this.isConfigured) {
      console.warn('⚠️ WhatsApp Business API not configured. Messages will be logged instead of sent.');
      console.warn('Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN environment variables.');
    }
  }

  /**
   * Send a WhatsApp message using Business Cloud API
   * @param {string} to - Recipient phone number (format: 233571234567)
   * @param {string} message - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} API response or mock response
   */
  async sendMessage(to, message, options = {}) {
    try {
      // Clean and format phone number
      const formattedPhone = this.formatPhoneNumber(to);
      
      if (!this.isConfigured) {
        // Development/testing mode - log message instead of sending
        return this.logMessage(formattedPhone, message);
      }

      // Prepare message payload
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      };

      // Add preview URL if specified
      if (options.preview_url !== undefined) {
        payload.text.preview_url = options.preview_url;
      }

      // Send message via WhatsApp Business Cloud API
      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp message sent successfully to ${formattedPhone}`);
      return {
        success: true,
        messageId: response.data.messages[0]?.id,
        phone: formattedPhone,
        status: 'sent',
        response: response.data
      };

    } catch (error) {
      console.error('❌ WhatsApp Business API Error:', error.response?.data || error.message);
      
      // Fallback to logging if API fails
      if (error.response?.status === 401) {
        console.error('WhatsApp API Authentication failed. Check your access token.');
      } else if (error.response?.status === 400) {
        console.error('WhatsApp API Bad Request. Check phone number format and message content.');
      }

      return {
        success: false,
        error: error.response?.data || error.message,
        phone: to,
        status: 'failed'
      };
    }
  }

  /**
   * Send birthday greeting via WhatsApp Business
   * @param {Object} user - User object
   * @param {string} message - Formatted birthday message
   * @returns {Promise<Object>} Send result
   */
  async sendBirthdayGreeting(user, message) {
    try {
      if (!user.phone) {
        console.warn(`⚠️ No phone number for user ${user.fullName}`);
        return {
          success: false,
          error: 'No phone number available',
          user: user.fullName
        };
      }

      const result = await this.sendMessage(user.phone, message, {
        preview_url: false
      });

      // Log the birthday greeting
      await this.logBirthdayActivity(user.id, result.success, result.messageId);

      return {
        ...result,
        user: user.fullName,
        type: 'birthday_greeting'
      };

    } catch (error) {
      console.error(`Error sending birthday greeting to ${user.fullName}:`, error);
      return {
        success: false,
        error: error.message,
        user: user.fullName,
        type: 'birthday_greeting'
      };
    }
  }

  /**
   * Send plan expiry warning via WhatsApp Business
   * @param {Object} user - User object
   * @param {string} message - Formatted expiry message
   * @param {number} daysLeft - Days until expiry
   * @returns {Promise<Object>} Send result
   */
  async sendPlanExpiryWarning(user, message, daysLeft) {
    try {
      if (!user.phone) {
        console.warn(`⚠️ No phone number for user ${user.fullName}`);
        return {
          success: false,
          error: 'No phone number available',
          user: user.fullName
        };
      }

      const result = await this.sendMessage(user.phone, message, {
        preview_url: false
      });

      // Log the expiry warning
      await this.logExpiryWarningActivity(user.id, daysLeft, result.success, result.messageId);

      return {
        ...result,
        user: user.fullName,
        businessName: user.businessName,
        daysLeft: daysLeft,
        type: 'plan_expiry_warning'
      };

    } catch (error) {
      console.error(`Error sending plan expiry warning to ${user.fullName}:`, error);
      return {
        success: false,
        error: error.message,
        user: user.fullName,
        type: 'plan_expiry_warning'
      };
    }
  }

  /**
   * Send deal approval notification via WhatsApp Business
   * @param {Object} merchant - Merchant object
   * @param {Object} deal - Deal object
   * @param {string} message - Formatted message
   * @returns {Promise<Object>} Send result
   */
  async sendDealApprovalNotification(merchant, deal, message) {
    try {
      if (!merchant.phone) {
        console.warn(`⚠️ No phone number for merchant ${merchant.fullName}`);
        return {
          success: false,
          error: 'No phone number available',
          merchant: merchant.fullName
        };
      }

      const result = await this.sendMessage(merchant.phone, message, {
        preview_url: false
      });

      return {
        ...result,
        merchant: merchant.fullName,
        businessName: merchant.businessName,
        dealTitle: deal.title,
        type: 'deal_approval'
      };

    } catch (error) {
      console.error(`Error sending deal approval notification to ${merchant.fullName}:`, error);
      return {
        success: false,
        error: error.message,
        merchant: merchant.fullName,
        type: 'deal_approval'
      };
    }
  }

  /**
   * Format phone number for WhatsApp API
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0, replace with country code (233 for Ghana)
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    }
    
    // If it doesn't start with 233, add it
    if (!cleaned.startsWith('233')) {
      cleaned = '233' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number
   * @returns {boolean} Is valid
   */
  isValidPhoneNumber(phone) {
    const formatted = this.formatPhoneNumber(phone);
    // Ghana phone numbers: 233 + 9 digits (233501234567)
    return /^233\d{9}$/.test(formatted);
  }

  /**
   * Log message for development/testing
   * @param {string} phone - Phone number
   * @param {string} message - Message content
   * @returns {Object} Mock response
   */
  logMessage(phone, message) {
    console.log('📱 WhatsApp Business Message (Development Mode)');
    console.log('=' .repeat(60));
    console.log(`📞 To: ${phone}`);
    console.log(`📄 Message:`);
    console.log(message);
    console.log('=' .repeat(60));
    console.log('💡 Configure WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to send real messages');
    
    return {
      success: true,
      messageId: `dev_${Date.now()}`,
      phone: phone,
      status: 'logged',
      mode: 'development'
    };
  }

  /**
   * Log birthday greeting activity
   * @param {number} userId - User ID
   * @param {boolean} success - Was message sent successfully
   * @param {string} messageId - WhatsApp message ID
   */
  async logBirthdayActivity(userId, success, messageId) {
    try {
      const db = require('../db');
      const query = `
        INSERT INTO activity_logs (user_id, action, description, metadata, timestamp)
        VALUES (?, 'whatsapp_birthday_greeting', ?, ?, NOW())
      `;
      const description = success ? 'Birthday WhatsApp greeting sent via Business API' : 'Birthday WhatsApp greeting failed';
      const metadata = JSON.stringify({ messageId, success, service: 'whatsapp_business' });
      
      await new Promise((resolve, reject) => {
        db.query(query, [userId, description, metadata], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    } catch (error) {
      console.error('Error logging birthday activity:', error);
    }
  }

  /**
   * Log expiry warning activity
   * @param {number} userId - User ID
   * @param {number} daysLeft - Days until expiry
   * @param {boolean} success - Was message sent successfully
   * @param {string} messageId - WhatsApp message ID
   */
  async logExpiryWarningActivity(userId, daysLeft, success, messageId) {
    try {
      const db = require('../db');
      const query = `
        INSERT INTO activity_logs (user_id, action, description, metadata, timestamp)
        VALUES (?, 'whatsapp_expiry_warning', ?, ?, NOW())
      `;
      const description = success 
        ? `Plan expiry WhatsApp warning sent (${daysLeft} days left)` 
        : `Plan expiry WhatsApp warning failed (${daysLeft} days left)`;
      const metadata = JSON.stringify({ messageId, success, daysLeft, service: 'whatsapp_business' });
      
      await new Promise((resolve, reject) => {
        db.query(query, [userId, description, metadata], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    } catch (error) {
      console.error('Error logging expiry warning activity:', error);
    }
  }

  /**
   * Get WhatsApp Business API configuration status
   * @returns {Object} Configuration status
   */
  getConfigurationStatus() {
    return {
      configured: this.isConfigured,
      hasPhoneNumberId: !!this.phoneNumberId,
      hasAccessToken: !!this.accessToken,
      apiVersion: this.version,
      mode: this.isConfigured ? 'production' : 'development'
    };
  }

  /**
   * Test WhatsApp Business API connection
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'WhatsApp Business API not configured',
          mode: 'development'
        };
      }

      // Test by getting phone number details
      const response = await axios.get(
        `${this.baseURL}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        success: true,
        phoneNumber: response.data.display_phone_number,
        status: response.data.status,
        mode: 'production'
      };

    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        mode: 'production'
      };
    }
  }
}

module.exports = new WhatsAppBusinessService();