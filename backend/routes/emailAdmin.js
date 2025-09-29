const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService-integrated');
const notificationService = require('../services/notificationService-integrated');
const NotificationHooks = require('../services/notificationHooks-integrated');
const ScheduledTasks = require('../services/scheduledTasks-integrated');
const db = require('../db');

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get email templates
router.get('/email-templates', requireAdmin, async (req, res) => {
  try {
    const query = 'SELECT * FROM email_templates ORDER BY type ASC';
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching email templates:', err);
        return res.status(500).json({ error: 'Failed to fetch email templates' });
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Error in email templates endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific email template
router.get('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    const query = 'SELECT * FROM email_templates WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
      if (err) {
        console.error('Error fetching email template:', err);
        return res.status(500).json({ error: 'Failed to fetch email template' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'Email template not found' });
      }
      
      res.json(results[0]);
    });
  } catch (error) {
    console.error('Error in email template endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update email template
router.put('/email-templates/:id', requireAdmin, async (req, res) => {
  try {
    const { subject, html_content, text_content, is_active } = req.body;
    
    const query = `
      UPDATE email_templates 
      SET subject = ?, html_content = ?, text_content = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    db.query(query, [subject, html_content, text_content, is_active, req.params.id], (err, result) => {
      if (err) {
        console.error('Error updating email template:', err);
        return res.status(500).json({ error: 'Failed to update email template' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Email template not found' });
      }
      
      // Clear template cache
      emailService.templatesCache.clear();
      
      res.json({ message: 'Email template updated successfully' });
    });
  } catch (error) {
    console.error('Error in update email template endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get email statistics
router.get('/email-stats', requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = dateTo || new Date().toISOString().split('T')[0];
    
    const stats = await emailService.getEmailStats(fromDate, toDate);
    
    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_emails,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_emails,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_emails,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_emails,
        COUNT(DISTINCT recipient) as unique_recipients
      FROM email_notifications 
      WHERE created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
    `;
    
    db.query(summaryQuery, [fromDate, toDate], (err, summaryResults) => {
      if (err) {
        console.error('Error fetching email summary:', err);
        return res.status(500).json({ error: 'Failed to fetch email statistics' });
      }
      
      const summary = summaryResults[0];
      summary.success_rate = summary.total_emails > 0 ? 
        ((summary.sent_emails / summary.total_emails) * 100).toFixed(2) : '0';
      
      res.json({
        summary,
        detailed_stats: stats,
        date_range: { from: fromDate, to: toDate }
      });
    });
    
  } catch (error) {
    console.error('Error in email stats endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get email logs
router.get('/email-logs', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, type, recipient } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    
    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }
    
    if (type) {
      whereClause += ' AND type = ?';
      queryParams.push(type);
    }
    
    if (recipient) {
      whereClause += ' AND recipient LIKE ?';
      queryParams.push(`%${recipient}%`);
    }
    
    const query = `
      SELECT * FROM email_notifications 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Error fetching email logs:', err);
        return res.status(500).json({ error: 'Failed to fetch email logs' });
      }
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM email_notifications ${whereClause}`;
      db.query(countQuery, queryParams.slice(0, -2), (err, countResults) => {
        if (err) {
          console.error('Error fetching email logs count:', err);
          return res.status(500).json({ error: 'Failed to fetch email logs count' });
        }
        
        res.json({
          logs: results,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResults[0].total,
            pages: Math.ceil(countResults[0].total / limit)
          }
        });
      });
    });
    
  } catch (error) {
    console.error('Error in email logs endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send test email
router.post('/send-test-email', requireAdmin, async (req, res) => {
  try {
    const { recipient, type, testData } = req.body;
    
    if (!recipient || !type) {
      return res.status(400).json({ error: 'Recipient and type are required' });
    }
    
    const defaultTestData = {
      firstName: 'Test User',
      businessName: 'Test Business',
      dealTitle: 'Test Deal',
      planName: 'Test Plan',
      daysLeft: 5,
      expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };
    
    const emailData = { ...defaultTestData, ...testData };
    
    const result = await emailService.sendEmail({
      to: recipient,
      type: type,
      data: emailData
    });
    
    res.json({ 
      message: 'Test email sent successfully',
      messageId: result.messageId,
      logId: result.logId
    });
    
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

// Resend failed email
router.post('/resend-email/:id', requireAdmin, async (req, res) => {
  try {
    const emailId = req.params.id;
    
    // Get email details
    const getEmailQuery = 'SELECT * FROM email_notifications WHERE id = ?';
    db.query(getEmailQuery, [emailId], async (err, results) => {
      if (err) {
        console.error('Error fetching email for resend:', err);
        return res.status(500).json({ error: 'Failed to fetch email details' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ error: 'Email not found' });
      }
      
      const email = results[0];
      const emailData = JSON.parse(email.data || '{}');
      
      try {
        const result = await emailService.sendEmail({
          to: email.recipient,
          type: email.type,
          data: emailData
        });
        
        res.json({ 
          message: 'Email resent successfully',
          messageId: result.messageId,
          logId: result.logId
        });
        
      } catch (sendError) {
        console.error('Error resending email:', sendError);
        res.status(500).json({ error: 'Failed to resend email', details: sendError.message });
      }
    });
    
  } catch (error) {
    console.error('Error in resend email endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user notification preferences
router.get('/user-preferences/:userId', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const preferences = await NotificationHooks.getUserNotificationPreferences(userId);
    
    res.json({ userId, preferences });
    
  } catch (error) {
    console.error('Error fetching user notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user notification preferences
router.put('/user-preferences/:userId', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Valid preferences object is required' });
    }
    
    const results = [];
    for (const [notificationType, isEnabled] of Object.entries(preferences)) {
      const success = await NotificationHooks.updateNotificationPreference(
        userId, 
        notificationType, 
        isEnabled
      );
      results.push({ notificationType, isEnabled, success });
    }
    
    res.json({ 
      message: 'User notification preferences updated',
      results 
    });
    
  } catch (error) {
    console.error('Error updating user notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get scheduled tasks status
router.get('/scheduled-tasks', requireAdmin, async (req, res) => {
  try {
    const status = ScheduledTasks.getTaskStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching scheduled tasks status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manually trigger plan expiry check
router.post('/trigger-expiry-check', requireAdmin, async (req, res) => {
  try {
    await ScheduledTasks.runPlanExpiryCheck();
    res.json({ message: 'Plan expiry check triggered successfully' });
  } catch (error) {
    console.error('Error triggering plan expiry check:', error);
    res.status(500).json({ error: 'Failed to trigger plan expiry check' });
  }
});

// Manually trigger monthly limits renewal
router.post('/trigger-limits-renewal', requireAdmin, async (req, res) => {
  try {
    await ScheduledTasks.runMonthlyLimitsRenewal();
    res.json({ message: 'Monthly limits renewal triggered successfully' });
  } catch (error) {
    console.error('Error triggering monthly limits renewal:', error);
    res.status(500).json({ error: 'Failed to trigger monthly limits renewal' });
  }
});

// Process email queue manually
router.post('/process-email-queue', requireAdmin, async (req, res) => {
  try {
    await emailService.processEmailQueue();
    res.json({ message: 'Email queue processed successfully' });
  } catch (error) {
    console.error('Error processing email queue:', error);
    res.status(500).json({ error: 'Failed to process email queue' });
  }
});

// Get email queue status
router.get('/email-queue', requireAdmin, async (req, res) => {
  try {
    const queueQuery = `
      SELECT 
        status,
        priority,
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM email_queue 
      GROUP BY status, priority
      ORDER BY priority DESC, status
    `;
    
    db.query(queueQuery, (err, results) => {
      if (err) {
        console.error('Error fetching email queue status:', err);
        return res.status(500).json({ error: 'Failed to fetch email queue status' });
      }
      
      res.json({ queue_status: results });
    });
    
  } catch (error) {
    console.error('Error in email queue endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear email queue (failed emails only)
router.delete('/email-queue/failed', requireAdmin, async (req, res) => {
  try {
    const deleteQuery = 'DELETE FROM email_queue WHERE status = "failed"';
    
    db.query(deleteQuery, (err, result) => {
      if (err) {
        console.error('Error clearing failed emails from queue:', err);
        return res.status(500).json({ error: 'Failed to clear failed emails' });
      }
      
      res.json({ 
        message: 'Failed emails cleared from queue',
        deleted_count: result.affectedRows 
      });
    });
    
  } catch (error) {
    console.error('Error in clear failed emails endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get email statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await emailService.getEmailStats();
    const taskStatus = ScheduledTasks.getTaskStatus();
    
    res.json({
      success: true,
      data: {
        ...stats,
        scheduledTasks: taskStatus
      }
    });
  } catch (error) {
    console.error('Error getting email stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get email statistics',
      error: error.message
    });
  }
});

// Test email endpoint
router.post('/test', async (req, res) => {
  try {
    const { email, templateType = 'user_welcome' } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const result = await NotificationHooks.sendTestEmail(email, templateType);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

// Test SMTP connection
router.post('/test-smtp', requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin requested SMTP connection test');
    
    // Get current service status
    const status = emailService.getServiceStatus();
    
    // Perform verification
    const verificationResult = await emailService.verifySMTPConnection();
    
    res.json({
      success: true,
      serviceStatus: status,
      verificationResult: verificationResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing SMTP connection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      serviceStatus: emailService.getServiceStatus()
    });
  }
});

// Get email service status
router.get('/service-status', requireAdmin, async (req, res) => {
  try {
    const status = emailService.getServiceStatus();
    const stats = await emailService.getEmailStats();
    
    res.json({
      success: true,
      status: status,
      stats: stats,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        DISABLE_SMTP_VERIFY: process.env.DISABLE_SMTP_VERIFY
      }
    });
  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
