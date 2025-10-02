const mysql = require('mysql2');
const db = require('./db');

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function analyzeEmailSystem() {
  console.log('📧 EMAIL SYSTEM ANALYSIS - Complete Inconsistency Report');
  console.log('='.repeat(70));

  try {
    // 1. Check email-related database tables
    console.log('\n1. 📊 EMAIL DATABASE TABLES:');
    const tables = await queryAsync("SHOW TABLES LIKE '%email%'");
    console.log('Email-related tables:');
    tables.forEach(table => {
      console.log(`✅ ${Object.values(table)[0]}`);
    });

    // Check email_notifications structure
    if (tables.length > 0) {
      console.log('\n📋 email_notifications table structure:');
      const structure = await queryAsync('DESCRIBE email_notifications');
      structure.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

    // 2. Check email service files
    console.log('\n2. 📁 EMAIL SERVICE FILES:');
    const fs = require('fs');
    const path = require('path');
    
    const servicesDir = path.join(__dirname, 'services');
    const files = fs.readdirSync(servicesDir);
    const emailFiles = files.filter(file => file.includes('email') || file.includes('notification'));
    
    console.log('Email-related service files:');
    emailFiles.forEach(file => {
      console.log(`📄 ${file}`);
    });

    // 3. Check template files
    console.log('\n3. 📨 EMAIL TEMPLATE FILES:');
    const templatesDir = path.join(__dirname, 'templates', 'emails');
    if (fs.existsSync(templatesDir)) {
      const templateFiles = fs.readdirSync(templatesDir);
      console.log('Template files:');
      templateFiles.forEach(file => {
        console.log(`📧 ${file}`);
      });
    }

    // 4. Check template naming patterns used in code
    console.log('\n4. 🏷️ TEMPLATE NAMING PATTERNS:');
    console.log('Checking recent email logs for template types used...');
    
    const recentEmails = await queryAsync(`
      SELECT DISTINCT type FROM email_notifications 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    
    console.log('Template types used in database:');
    recentEmails.forEach(email => {
      console.log(`🏷️ ${email.type}`);
    });

    // 5. Check for email service inconsistencies
    console.log('\n5. ⚠️ POTENTIAL INCONSISTENCIES:');
    
    // Check mixed service usage
    console.log('\nService Usage Analysis:');
    console.log('- auth.js: Uses emailService-integrated');
    console.log('- admin.js: MIXED - Uses both notificationService and notificationHooks');
    console.log('- emailAdmin.js: Uses emailService-integrated');
    console.log('- merchant.js: Uses notificationHooks-integrated');
    console.log('- deals.js: Uses notificationHooks-integrated');

    // 6. Check template name mapping
    console.log('\n6. 🔄 TEMPLATE NAME MAPPING:');
    console.log('File names (hyphenated) vs Code usage (underscored):');
    
    const templateMappings = [
      { file: 'user-welcome.hbs', code: 'user_welcome' },
      { file: 'admin-new-registration.hbs', code: 'admin_new_registration' },
      { file: 'profile-status-update.hbs', code: 'profile_status_update' },
      { file: 'password-reset.hbs', code: 'password_reset' },
      { file: 'password-changed-by-admin.hbs', code: 'password_changed_by_admin' },
      { file: 'new-deal-notification.hbs', code: 'new_deal_notification' },
      { file: 'redemption-approved.hbs', code: 'redemption_approved' },
      { file: 'deal-posting-status.hbs', code: 'deal_posting_status' }
    ];

    templateMappings.forEach(mapping => {
      console.log(`📧 ${mapping.file} ↔ ${mapping.code}`);
    });

    // 7. Check environment variables
    console.log('\n7. 🔧 ENVIRONMENT CONFIGURATION:');
    console.log(`SMTP_HOST: ${process.env.SMTP_HOST || 'Not set'}`);
    console.log(`SMTP_PORT: ${process.env.SMTP_PORT || 'Not set'}`);
    console.log(`SMTP_USER: ${process.env.SMTP_USER ? 'Set' : 'Not set'}`);
    console.log(`SMTP_PASS: ${process.env.SMTP_PASS ? 'Set' : 'Not set'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`DISABLE_SMTP_VERIFY: ${process.env.DISABLE_SMTP_VERIFY || 'false'}`);

  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    process.exit(0);
  }
}

analyzeEmailSystem();