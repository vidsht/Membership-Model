# Email System Integration Guide

## Quick Start Checklist

### 1. Installation
```bash
# Install dependencies
npm install handlebars node-cron

# Run the installation script
node backend/install-email-system.js

# Test the system
node backend/test-email-system.js --quick
```

### 2. Environment Configuration
Add to your `.env` file:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support@indiansinghana.com
SMTP_PASS=your_app_password
SMTP_FROM_NAME=Indians in Ghana
SMTP_FROM_EMAIL=support@indiansinghana.com

# Test email for verification
TEST_EMAIL=your-test@email.com
```

### 3. Server Integration
Add to your `server.js`:
```javascript
// Email System Setup
const EmailSystemSetup = require('./backend/emailSystemSetup');
const ScheduledTasks = require('./backend/services/scheduledTasks');

// Initialize email system on startup
EmailSystemSetup.initialize().then(() => {
  console.log('✅ Email system initialized');
  
  // Start scheduled tasks
  ScheduledTasks.startAllTasks();
  console.log('✅ Scheduled tasks started');
}).catch(err => {
  console.error('❌ Email system initialization failed:', err);
});

// Add email admin routes
const emailAdminRoutes = require('./backend/routes/emailAdmin');
app.use('/api/admin/email', emailAdminRoutes);
```

### 4. Route Integration
Add notification hooks to your existing routes:

#### Auth Routes (`auth.js`)
```javascript
const NotificationHooks = require('../services/notificationHooks');

// After user registration success
await NotificationHooks.onUserRegistration(userId, userData);

// After profile update
await NotificationHooks.onProfileUpdate(userId, updatedData);

// After account status change
await NotificationHooks.onAccountStatusChange(userId, newStatus, reason);
```

#### Deal Routes (`deals.js`)
```javascript
const NotificationHooks = require('../services/notificationHooks');

// After deal creation
await NotificationHooks.onDealCreated(dealId, dealData);

// After deal approval/rejection
await NotificationHooks.onDealStatusChange(dealId, newStatus, reason);

// Daily at 9 AM (handled by scheduled tasks)
// No manual integration needed for expiry warnings
```

#### Merchant Routes (`merchants.js`)
```javascript
const NotificationHooks = require('../services/notificationHooks');

// After merchant approval
await NotificationHooks.onMerchantStatusChange(merchantId, 'approved');

// After merchant plan purchase
await NotificationHooks.onPlanPurchase(merchantId, planData);
```

#### Redemption Routes (`redemptions.js`)
```javascript
const NotificationHooks = require('../services/notificationHooks');

// After redemption request
await NotificationHooks.onRedemptionRequested(redemptionId, redemptionData);

// After redemption approval/rejection
await NotificationHooks.onRedemptionResponse(redemptionId, status, responseData);
```

#### Admin Routes (`admin.js`)
```javascript
const NotificationHooks = require('../services/notificationHooks');

// On new user registration (for admin notification)
await NotificationHooks.onNewUserRegistration(userData);

// On new merchant application
await NotificationHooks.onNewMerchantApplication(merchantData);

// On deal requiring review
await NotificationHooks.onDealReviewRequired(dealData);
```

## Testing Your Integration

### 1. Quick Health Check
```bash
node backend/test-email-system.js --quick
```

### 2. Full Test Suite
```bash
node backend/test-email-system.js
```

### 3. Send Test Email
```bash
# Set TEST_EMAIL in .env first
TEST_EMAIL=your@email.com node backend/test-email-system.js
```

### 4. Test Specific Notifications
```javascript
// In Node.js console or test script
const NotificationHooks = require('./backend/services/notificationHooks');

// Test welcome email
await NotificationHooks.onUserRegistration(1, {
  firstName: 'Test',
  email: 'test@example.com'
});

// Test deal notification
await NotificationHooks.onDealCreated(1, {
  title: 'Test Deal',
  description: 'Test deal description'
});
```

## Admin Interface Access

Once integrated, access the admin interface at:
- **Email Templates**: `GET/POST /api/admin/email/templates`
- **Email Statistics**: `GET /api/admin/email/stats`
- **Queue Management**: `GET /api/admin/email/queue`
- **User Preferences**: `GET/PUT /api/admin/email/users/:userId/preferences`

### Example Admin Interface Usage
```javascript
// Get email statistics
fetch('/api/admin/email/stats')
  .then(res => res.json())
  .then(stats => console.log(stats));

// Update email template
fetch('/api/admin/email/templates/user_welcome', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'Welcome to Indians in Ghana!',
    body: '<h1>Welcome {{firstName}}!</h1>'
  })
});
```

## Scheduled Tasks Overview

The system automatically runs these tasks:
- **Daily 9:00 AM**: Check for expiring plans and send warnings
- **Monthly 1st**: Renew monthly deal limits
- **Every 5 minutes**: Process email queue
- **Every hour**: Clean up old notifications
- **Daily 2:00 AM**: Generate email analytics

## Troubleshooting

### Common Issues

1. **SMTP Authentication Failed**
   - Check SMTP credentials in `.env`
   - Use app-specific passwords for Gmail
   - Verify SMTP server settings

2. **Templates Not Loading**
   - Check template files exist in `backend/templates/emails/`
   - Verify file permissions
   - Check template syntax (Handlebars)

3. **Database Errors**
   - Run database migration: `node backend/database/email-schema.sql`
   - Check table permissions
   - Verify column names match schema

4. **Emails Not Sending**
   - Check email queue: `SELECT * FROM email_queue`
   - Verify user preferences allow emails
   - Check SMTP connection

5. **Scheduled Tasks Not Running**
   - Verify node-cron is installed
   - Check server timezone settings
   - Ensure server stays running

### Debug Commands
```bash
# Check system status
node -e "require('./backend/emailSystemSetup').getSystemStatus().then(console.log)"

# Test SMTP connection
node -e "require('./backend/services/emailService').transporter.verify().then(() => console.log('SMTP OK'))"

# Check scheduled tasks
node -e "console.log(require('./backend/services/scheduledTasks').getTaskStatus())"

# View email queue
mysql -u root -p membership_db -e "SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 10"
```

## Performance Optimization

### For High Volume
1. **Email Queue Processing**
   - Increase queue processing frequency
   - Add email rate limiting
   - Use email service providers (SendGrid, Mailgun)

2. **Database Optimization**
   - Add indexes to email tables
   - Archive old notifications
   - Use database connection pooling

3. **Template Caching**
   - Templates are automatically cached
   - Clear cache when updating templates
   - Use CDN for email assets

## Security Considerations

1. **SMTP Credentials**
   - Use environment variables
   - Rotate passwords regularly
   - Use OAuth2 when possible

2. **User Data**
   - Validate email addresses
   - Respect unsubscribe requests
   - Implement rate limiting

3. **Admin Access**
   - Restrict admin endpoints
   - Use authentication middleware
   - Log all admin actions

## Next Steps

1. **Configure SMTP credentials**
2. **Run installation script**
3. **Add hooks to existing routes**
4. **Test with sample data**
5. **Monitor email delivery**
6. **Customize templates as needed**

Your email notification system is now ready to enhance user engagement and provide professional communication for your Indians in Ghana membership platform! 🚀
