# Email Notification System Documentation

## Overview
This comprehensive email notification system provides automated email notifications for the Indians in Ghana membership platform. The system includes 23 different notification types, scheduled tasks, email queue management, and an admin interface.

## Features

### 📧 Email Types Supported

#### User Notifications (8 types)
1. **Welcome Message** - Sent when new user account is created
2. **New Deal Posted** - Notify when new deals are available
3. **Profile Status Update** - Sent when admin accepts/suspends/rejects user's profile
4. **Redemption Request Response** - Notify when merchant accepts/rejects redemption
5. **Max Redemption Limit Reached** - Alert when monthly limit is completed
6. **Plan Expiry Warning** - Check validationDate and send warning before expiry
7. **Redemption Limit Renewed** - Notify when monthly limit is reset
8. **New Plan Assigned** - Alert when admin assigns new plan

#### Merchant Notifications (10 types)
1. **Welcome Message** - Sent when new merchant account is created
2. **Deal Request Response** - Notify when admin accepts/rejects deal
3. **Profile Status Update** - Sent when admin accepts/suspends/rejects profile
4. **Deal Limit Reached** - Alert when monthly deal posting limit reached
5. **Plan Expiry Warning** - Check validationDate and send warning
6. **Custom Deal Limit Assigned** - Notify when admin sets custom limit
7. **Deal Limit Renewed** - Alert when monthly limit is reset
8. **New Plan Assigned** - Notify when admin assigns new plan
9. **New Redemption Request** - Alert when user requests redemption

#### Admin Notifications (5 types)
1. **New Registration** - Alert when new user/merchant registers
2. **Deal Redemption** - Notify when user redeems a deal
3. **New Deal Request** - Alert when merchant submits deal for approval
4. **Deal Published** - Notify when new deal goes live
5. **Plan Expiry Alert** - Check validationDate for all users/merchants

### 🏗️ Architecture

#### Core Components
- **EmailService** - Core email sending functionality
- **NotificationService** - Business logic for notifications
- **NotificationHooks** - Integration points with existing routes
- **ScheduledTasks** - Automated tasks (cron jobs)
- **EmailAdmin** - Admin interface routes

#### Database Tables
- `email_templates` - Stores email templates
- `email_notifications` - Logs all sent emails
- `email_queue` - Queue system for reliable delivery
- `user_email_preferences` - User notification preferences
- `email_analytics` - Email delivery tracking

## Installation

### 1. Automatic Installation
```bash
cd backend
node install-email-system.js
```

### 2. Manual Installation

#### Install Dependencies
```bash
npm install handlebars node-cron nodemailer
```

#### Setup Database
```bash
mysql -u username -p database_name < database/email-schema.sql
```

#### Environment Configuration
Add to your `.env` file:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support@indiansinghana.com
SMTP_PASS=your_app_password_here
FRONTEND_URL=http://localhost:3000
```

## Integration Guide

### 1. Server Setup
Add to your `server.js`:

```javascript
// Email System Integration
const EmailSystemSetup = require('./emailSystemSetup');
const ScheduledTasks = require('./services/scheduledTasks');

// Initialize email system
EmailSystemSetup.initialize().then(() => {
  console.log('Email system ready');
}).catch(error => {
  console.error('Email system failed:', error);
});

// Add email admin routes
app.use('/api/admin/email', require('./routes/emailAdmin'));
```

### 2. Route Integration
Add notification hooks to your existing routes:

#### User Registration (auth.js)
```javascript
const NotificationHooks = require('../services/notificationHooks');

// After successful user creation
await NotificationHooks.onUserRegistration(userId);
```

#### Deal Creation (deals.js)
```javascript
// After deal creation
await NotificationHooks.onDealCreated(dealId);
```

#### Deal Approval (admin.js)
```javascript
// After status update
if (status === 'approved') {
  await NotificationHooks.onDealApproved(dealId);
} else if (status === 'rejected') {
  await NotificationHooks.onDealRejected(dealId);
}
```

#### Profile Status Updates (admin.js)
```javascript
// After status change
await NotificationHooks.onUserProfileStatusUpdate(userId, newStatus, reason);
```

#### Redemption Requests (redemptions.js)
```javascript
// After redemption creation
await NotificationHooks.onRedemptionRequested(redemptionId);

// After redemption response
await NotificationHooks.onRedemptionResponse(redemptionId);
```

#### Plan Assignments (admin.js)
```javascript
// After plan assignment
await NotificationHooks.onPlanAssigned(userId, planId, userType);
```

## API Reference

### Admin Endpoints

#### Email Templates
- `GET /api/admin/email/email-templates` - List all templates
- `GET /api/admin/email/email-templates/:id` - Get specific template
- `PUT /api/admin/email/email-templates/:id` - Update template

#### Email Statistics
- `GET /api/admin/email/email-stats` - Get email statistics
- `GET /api/admin/email/email-logs` - Get email delivery logs

#### Email Management
- `POST /api/admin/email/send-test-email` - Send test email
- `POST /api/admin/email/resend-email/:id` - Resend failed email
- `POST /api/admin/email/process-email-queue` - Process queue manually

#### User Preferences
- `GET /api/admin/email/user-preferences/:userId` - Get user preferences
- `PUT /api/admin/email/user-preferences/:userId` - Update preferences

#### Scheduled Tasks
- `GET /api/admin/email/scheduled-tasks` - Get task status
- `POST /api/admin/email/trigger-expiry-check` - Trigger expiry check
- `POST /api/admin/email/trigger-limits-renewal` - Trigger renewal

#### Email Queue
- `GET /api/admin/email/email-queue` - Get queue status
- `DELETE /api/admin/email/email-queue/failed` - Clear failed emails

### Notification Hooks API

```javascript
const NotificationHooks = require('./services/notificationHooks');

// User notifications
await NotificationHooks.onUserRegistration(userId);
await NotificationHooks.onUserProfileStatusUpdate(userId, status, reason);
await NotificationHooks.onPlanAssigned(userId, planId);
await NotificationHooks.onRedemptionLimitReached(userId);

// Merchant notifications  
await NotificationHooks.onMerchantRegistration(merchantId);
await NotificationHooks.onDealCreated(dealId);
await NotificationHooks.onDealApproved(dealId);
await NotificationHooks.onDealRejected(dealId);
await NotificationHooks.onDealLimitReached(merchantId);
await NotificationHooks.onNewRedemptionRequest(redemptionId);

// Admin notifications
await NotificationHooks.onRedemptionResponse(redemptionId);

// Scheduled tasks
await NotificationHooks.onPlanExpiryCheck();
await NotificationHooks.onMonthlyLimitsRenewal();
```

## Scheduled Tasks

The system includes several automated tasks:

### Daily Tasks
- **9:00 AM** - Plan expiry check and warnings
- **6:00 AM** - Email queue health check
- **8:00 AM** - Daily admin summary email

### Periodic Tasks
- **Every 5 minutes** - Process email queue
- **Every hour** - Retry failed emails
- **Monthly (1st day)** - Reset monthly limits
- **Weekly (Sunday 2AM)** - Cleanup old email logs

### Manual Triggers
```javascript
const ScheduledTasks = require('./services/scheduledTasks');

// Manual triggers for testing
await ScheduledTasks.runPlanExpiryCheck();
await ScheduledTasks.runMonthlyLimitsRenewal();

// Task management
ScheduledTasks.stopAllTasks();
ScheduledTasks.startAllTasks();
const status = ScheduledTasks.getTaskStatus();
```

## Email Templates

### Template Structure
Templates use Handlebars for dynamic content:

```handlebars
<h1>Welcome {{firstName}}!</h1>
<p>Your membership number is: {{membershipNumber}}</p>
{{#if businessName}}
<p>Business: {{businessName}}</p>
{{/if}}
```

### Available Variables by Template Type

#### User Welcome
- `firstName`, `fullName`, `email`, `membershipNumber`, `validationDate`

#### New Deal Notification
- `firstName`, `dealTitle`, `dealDescription`, `businessName`, `discount`, `validUntil`, `dealUrl`

#### Plan Expiry Warning
- `firstName`, `planName`, `expiryDate`, `daysLeft`, `renewalUrl`

#### Redemption Approved
- `firstName`, `dealTitle`, `businessName`, `status`, `redemptionDate`, `qrCode`

### Custom Templates
You can customize templates through:
1. Database - Update `email_templates` table
2. Admin Interface - Use `/api/admin/email/email-templates` endpoints
3. File System - Modify `.hbs` files in `templates/emails/`

## Configuration

### SMTP Settings
```env
SMTP_HOST=smtp.gmail.com          # SMTP server hostname
SMTP_PORT=587                     # SMTP port (587 for TLS)
SMTP_USER=support@indiansinghana.com  # From email address
SMTP_PASS=app_password            # App password (not regular password)
```

### Application Settings
```env
FRONTEND_URL=http://localhost:3000    # Frontend URL for links
NODE_ENV=production                   # Environment
```

### Database Connection
Uses existing database connection from `db.js`

## User Preferences

Users can opt-out of specific notification types:

```javascript
// Get user preferences
const preferences = await NotificationHooks.getUserNotificationPreferences(userId);

// Update preference
await NotificationHooks.updateNotificationPreference(
  userId, 
  'new_deal_notification', 
  false  // disable
);

// Initialize defaults for new user
await NotificationHooks.initializeDefaultPreferences(userId, 'user');
```

## Error Handling

### Email Delivery Failures
- Automatic retry mechanism (3 attempts)
- Failed emails logged in database
- Admin notifications for high failure rates

### Queue Management
- Stuck email detection and reset
- Priority-based processing
- Health monitoring

### Logging
- All emails logged in `email_notifications` table
- Detailed error messages
- Delivery status tracking

## Monitoring

### Email Statistics
Access via admin interface:
- Total emails sent/failed
- Success rates
- Most common email types
- Recipient engagement

### Queue Health
- Pending email count
- Processing status
- Failed email analysis

### System Status
```javascript
const status = await EmailSystemSetup.getSystemStatus();
// Returns: database, emailService, scheduledTasks, templates, queuedEmails
```

## Troubleshooting

### Common Issues

#### 1. SMTP Authentication Failed
- Check SMTP credentials in `.env`
- Use app passwords for Gmail
- Verify SMTP server settings

#### 2. Emails Not Sending
- Check email queue: `GET /api/admin/email/email-queue`
- Process queue manually: `POST /api/admin/email/process-email-queue`
- Check email service status

#### 3. Database Errors
- Verify email tables exist
- Run database schema: `mysql < database/email-schema.sql`
- Check database connection

#### 4. Template Errors
- Verify template files exist
- Check template syntax (Handlebars)
- Validate template variables

### Debug Mode
Set environment variable for detailed logging:
```env
DEBUG=email:*
```

### Manual Testing
```javascript
// Send test email
const result = await EmailSystemSetup.testEmailSystem('test@example.com');

// Check system status
const status = await EmailSystemSetup.getSystemStatus();
```

## Security Considerations

### Email Security
- Use app passwords instead of regular passwords
- Enable TLS/SSL for SMTP connections
- Validate email addresses before sending

### Template Security
- Sanitize user data in templates
- Prevent email injection attacks
- Validate template content

### Access Control
- Admin-only access to email management
- User preference validation
- Rate limiting on email sending

## Performance Optimization

### Queue System
- Batch processing for bulk emails
- Priority-based sending
- Retry logic with exponential backoff

### Template Caching
- Templates cached in memory
- Automatic cache invalidation
- Precompiled Handlebars templates

### Database Optimization
- Indexed email logs
- Automated cleanup of old logs
- Optimized queries for statistics

## Backup and Recovery

### Email Logs
- Regular backup of `email_notifications` table
- Archive old email logs
- Export email statistics

### Templates
- Backup custom templates
- Version control for template changes
- Template restore functionality

## Compliance

### GDPR/Privacy
- User consent for notifications
- Opt-out mechanisms
- Data retention policies

### Email Best Practices
- Unsubscribe links where appropriate
- Clear sender identification
- Professional email formatting

## Support

For technical support or questions:
- Check the troubleshooting section above
- Review error logs in the database
- Use the admin interface for diagnostics
- Contact: support@indiansinghana.com

---

This documentation covers the complete email notification system. For specific implementation details, refer to the source code and inline comments.
