#!/usr/bin/env node

/**
 * Email System Installation and Setup Script
 * Run this script to install and initialize the complete email notification system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Indians in Ghana - Email System Installer');
console.log('='.repeat(50));

async function installEmailSystem() {
  try {
    console.log('\n📦 Step 1: Installing required dependencies...');
    
    // Install required npm packages
    const dependencies = ['handlebars', 'node-cron', 'nodemailer'];
    
    for (const dep of dependencies) {
      try {
        console.log(`Installing ${dep}...`);
        execSync(`npm install ${dep}`, { stdio: 'pipe' });
        console.log(`✅ ${dep} installed successfully`);
      } catch (error) {
        console.log(`⚠️ ${dep} may already be installed or failed to install`);
      }
    }

    console.log('\n🗄️ Step 2: Setting up database schema...');
    
    // Initialize the email system
    const EmailSystemSetup = require('./emailSystemSetup');
    const setupResult = await EmailSystemSetup.initialize();
    
    if (setupResult) {
      console.log('\n📧 Step 3: Email system setup completed!');
      
      // Display integration guide
      console.log('\n📋 Step 4: Integration Guide');
      console.log('='.repeat(30));
      
      await EmailSystemSetup.integrateWithExistingRoutes();
      
      console.log('\n🔧 Step 5: Environment Configuration');
      console.log('='.repeat(35));
      
      // Check if .env file exists and add email configuration
      const envPath = path.join(__dirname, '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      
      const emailEnvVars = `
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support@indiansinghana.com
SMTP_PASS=your_app_password_here
FRONTEND_URL=http://localhost:3000
`;

      if (!envContent.includes('SMTP_HOST')) {
        fs.writeFileSync(envPath, envContent + emailEnvVars);
        console.log('✅ Email environment variables added to .env file');
      } else {
        console.log('⚠️ Email environment variables already exist in .env file');
      }
      
      console.log('\n📝 Step 6: Server Integration');
      console.log('='.repeat(25));
      
      console.log(`
Add these lines to your server.js file:

// Email System Integration
const EmailSystemSetup = require('./emailSystemSetup');
const ScheduledTasks = require('./services/scheduledTasks');

// Initialize email system on startup
EmailSystemSetup.initialize().then(() => {
  console.log('Email system ready');
}).catch(error => {
  console.error('Email system initialization failed:', error);
});

// Add email admin routes
app.use('/api/admin/email', require('./routes/emailAdmin'));

// Add notification hooks to existing routes (see integration guide above)
      `);
      
      console.log('\n🧪 Step 7: Testing the System');
      console.log('='.repeat(25));
      
      const status = await EmailSystemSetup.getSystemStatus();
      console.log('System Status:');
      console.log(`📊 Database: ${status.database ? '✅ Connected' : '❌ Not Connected'}`);
      console.log(`📧 Email Service: ${status.emailService ? '✅ Ready' : '❌ Not Ready'}`);
      console.log(`⏰ Scheduled Tasks: ${status.scheduledTasks ? '✅ Running' : '❌ Not Running'}`);
      console.log(`📄 Templates: ${status.templates} available`);
      console.log(`📮 Queue: ${status.queuedEmails} pending emails`);
      
      console.log('\n🎉 Installation Complete!');
      console.log('='.repeat(25));
      
      console.log(`
✅ Email notification system has been successfully installed!

🔗 Next Steps:
1. Update your .env file with actual SMTP credentials
2. Add the server integration code to server.js
3. Add notification hooks to your existing routes
4. Test the system with the admin interface at /api/admin/email
5. Send test emails to verify everything works

📚 Features Available:
• 23 different email notification types
• Automated plan expiry warnings
• Monthly limit renewals
• Email queue system with retry logic
• Admin interface for template management
• User preference management
• Email analytics and logging
• Scheduled task management

🛠️ Admin Interface Endpoints:
• GET /api/admin/email/email-templates - Manage templates
• GET /api/admin/email/email-stats - View statistics
• GET /api/admin/email/email-logs - Check delivery logs
• POST /api/admin/email/send-test-email - Send test emails

📞 Support:
If you need help, check the integration guide above or refer to the documentation
in the email system files.

Happy emailing! 📧✨
      `);
      
    } else {
      console.log('\n❌ Email system setup failed. Please check the error logs above.');
    }
    
  } catch (error) {
    console.error('\n❌ Installation failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure you have database connectivity');
    console.log('2. Ensure all required environment variables are set');
    console.log('3. Check file permissions in the project directory');
    console.log('4. Verify Node.js version compatibility (Node 14+ recommended)');
  }
}

// Run the installer
if (require.main === module) {
  installEmailSystem();
}

module.exports = { installEmailSystem };
