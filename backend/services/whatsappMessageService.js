/**
 * WhatsApp Message Templates for Indians in Ghana Membership System
 * Professional WhatsApp messaging with proper formatting
 */

class WhatsAppMessageService {
  
  /**
   * Generate birthday WhatsApp message with proper formatting
   * @param {Object} user - User object with name and other details
   * @returns {string} Formatted WhatsApp birthday message
   */
  static generateBirthdayMessage(user) {
    const firstName = user.firstName || (user.fullName || '').split(' ')[0] || 'Dear Member';
    
    const message = `🎉 *Happy Birthday!* 🎉

Dear *${firstName}*,

On this special day, we wish you joy, health, and prosperity. May your year ahead be filled with happiness and success. 🌟

Warm regards,
🇮🇳 *Indians In Ghana Team* 🇬🇭

_____
_This is an automated birthday greeting from your community portal._

💌 *Indians in Ghana Community*
📧 cards@indiansinghana.com
🌐 www.indiansinghana.com`;

    return message;
  }

  /**
   * Generate merchant plan expiry WhatsApp message
   * @param {Object} merchant - Merchant object with business details
   * @param {Object} options - Expiry details
   * @returns {string} Formatted WhatsApp expiry message
   */
  static generateMerchantExpiryMessage(merchant, options = {}) {
    const businessName = merchant.businessName || merchant.fullName || 'Your Business';
    const firstName = merchant.firstName || (merchant.fullName || '').split(' ')[0] || 'Dear Merchant';
    const daysLeft = options.daysLeft || 0;
    const planName = options.planName || 'your plan';

    let urgencyEmoji = '⏰';
    let urgencyText = 'Plan Expiry Notice';
    
    if (daysLeft <= 1) {
      urgencyEmoji = '🚨';
      urgencyText = 'URGENT: Plan Expires Soon';
    } else if (daysLeft <= 3) {
      urgencyEmoji = '⚠️';
      urgencyText = 'Important: Plan Expiry Warning';
    }

    const message = `${urgencyEmoji} *${urgencyText}* ${urgencyEmoji}

Dear *${firstName}*,

Your business "*${businessName}*" membership plan is expiring soon.

📊 *Plan Details:*
• Business: ${businessName}
• Plan: ${planName}
• Days Remaining: *${daysLeft} day${daysLeft !== 1 ? 's' : ''}*

${daysLeft === 0 ? '🔴 *Your plan expires TODAY!*' : 
  daysLeft === 1 ? '🟡 *Your plan expires TOMORROW!*' : 
  `🟠 *Your plan expires in ${daysLeft} days*`}

Don't lose access to:
✅ Business directory listing
✅ Exclusive deals posting
✅ Community networking
✅ Marketing opportunities

*Renew now to continue your membership benefits!*

📞 *Contact Support:*
📧 cards@indiansinghana.com
📱 WhatsApp: +233 57 232 3912

🇮🇳 *Indians In Ghana Team* 🇬🇭
🌐 www.indiansinghana.com

_____
_This is an automated business plan expiry reminder._`;

    return message;
  }

  /**
   * Generate user plan expiry WhatsApp message
   * @param {Object} user - User object
   * @param {Object} options - Expiry details
   * @returns {string} Formatted WhatsApp expiry message
   */
  static generateUserExpiryMessage(user, options = {}) {
    const firstName = user.firstName || (user.fullName || '').split(' ')[0] || 'Dear Member';
    const daysLeft = options.daysLeft || 0;
    const planName = options.planName || 'your membership';

    let urgencyEmoji = '⏰';
    if (daysLeft <= 1) urgencyEmoji = '🚨';
    else if (daysLeft <= 3) urgencyEmoji = '⚠️';

    const message = `${urgencyEmoji} *Membership Expiry Notice* ${urgencyEmoji}

Dear *${firstName}*,

Your Indians in Ghana membership is expiring soon.

📋 *Membership Details:*
• Plan: ${planName}
• Days Remaining: *${daysLeft} day${daysLeft !== 1 ? 's' : ''}*

${daysLeft === 0 ? '🔴 *Your membership expires TODAY!*' : 
  daysLeft === 1 ? '🟡 *Your membership expires TOMORROW!*' : 
  `🟠 *Your membership expires in ${daysLeft} days*`}

Don't miss out on:
✅ Exclusive member deals
✅ Community events
✅ Business directory access
✅ Networking opportunities

*Renew now to continue enjoying member benefits!*

📞 *Contact Support:*
📧 cards@indiansinghana.com
📱 WhatsApp: +233 57 232 3912

🇮🇳 *Indians In Ghana Community* 🇬🇭
🌐 www.indiansinghana.com

_____
_This is an automated membership expiry reminder._`;

    return message;
  }

  /**
   * Generate deal approval WhatsApp message
   * @param {Object} merchant - Merchant object
   * @param {Object} deal - Deal object
   * @returns {string} Formatted WhatsApp message
   */
  static generateDealApprovalMessage(merchant, deal) {
    const businessName = merchant.businessName || merchant.fullName || 'Your Business';
    const firstName = merchant.firstName || (merchant.fullName || '').split(' ')[0] || 'Dear Merchant';

    const message = `✅ *Deal Approved!* ✅

Dear *${firstName}*,

Great news! Your deal for "*${businessName}*" has been approved and is now live.

🎯 *Deal Details:*
• Title: ${deal.title}
• Business: ${businessName}
• Status: *APPROVED & LIVE*

Your deal is now visible to all community members and they can start redeeming it right away!

📈 *Track your deal performance through your merchant dashboard.*

📞 *Need Help?*
📧 cards@indiansinghana.com
📱 WhatsApp: +233 57 232 3912

🇮🇳 *Indians In Ghana Team* 🇬🇭
🌐 www.indiansinghana.com`;

    return message;
  }

  /**
   * Generate welcome WhatsApp message for new members
   * @param {Object} user - User object
   * @returns {string} Formatted WhatsApp welcome message
   */
  static generateWelcomeMessage(user) {
    const firstName = user.firstName || (user.fullName || '').split(' ')[0] || 'Dear Member';

    const message = `🎉 *Welcome to Indians in Ghana!* 🎉

Dear *${firstName}*,

Welcome to our vibrant community! We're excited to have you join the Indians in Ghana family.

🌟 *Your membership benefits:*
✅ Access to exclusive deals & discounts
✅ Digital membership card
✅ Community events & networking
✅ Business directory access
✅ Priority customer support

🎯 *Next Steps:*
1. Complete your profile
2. Download your digital membership card
3. Start exploring exclusive deals
4. Connect with fellow community members

📞 *Need Help Getting Started?*
📧 cards@indiansinghana.com
📱 WhatsApp: +233 57 232 3912

🇮🇳 *Indians In Ghana Community* 🇬🇭
🌐 www.indiansinghana.com

_Thank you for being part of our growing community!_`;

    return message;
  }
}

module.exports = WhatsAppMessageService;