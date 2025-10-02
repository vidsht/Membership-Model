const fs = require('fs');
const path = require('path');
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

async function analyzeEmailLogicInconsistencies() {
  console.log('🔍 COMPREHENSIVE EMAIL LOGIC ANALYSIS');
  console.log('='.repeat(60));
  
  const inconsistencies = [];

  try {
    // 1. Analyze Service Layer Architecture
    console.log('\n1. 📁 SERVICE LAYER ANALYSIS:');
    const servicesDir = path.join(__dirname, 'services');
    const serviceFiles = fs.readdirSync(servicesDir).filter(f => 
      f.includes('email') || f.includes('notification')
    );
    
    console.log('Email/Notification service files:');
    serviceFiles.forEach(file => console.log(`- ${file}`));
    
    // Check for architectural inconsistencies
    const emailServices = serviceFiles.filter(f => f.includes('email'));
    const notificationServices = serviceFiles.filter(f => f.includes('notification'));
    
    if (emailServices.length > 1) {
      inconsistencies.push({
        type: 'ARCHITECTURAL',
        severity: 'HIGH',
        issue: `Multiple email services exist: ${emailServices.join(', ')}`,
        impact: 'Confusion about which service to use, potential conflicts'
      });
    }
    
    if (notificationServices.length > 2) {
      inconsistencies.push({
        type: 'ARCHITECTURAL', 
        severity: 'MEDIUM',
        issue: `Multiple notification services: ${notificationServices.join(', ')}`,
        impact: 'Overlapping functionality, maintenance overhead'
      });
    }

    // 2. Analyze Route Implementation Patterns
    console.log('\n2. 🛣️ ROUTE IMPLEMENTATION ANALYSIS:');
    const routesDir = path.join(__dirname, 'routes');
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    const routeAnalysis = [];
    for (const routeFile of routeFiles) {
      const routePath = path.join(routesDir, routeFile);
      const content = fs.readFileSync(routePath, 'utf8');
      
      const analysis = {
        file: routeFile,
        emailServiceImports: [],
        notificationImports: [],
        emailSendCalls: [],
        inconsistencies: []
      };

      // Check imports
      const importMatches = content.match(/require\(['"]\.\.\/services\/[^'"]*email[^'"]*['"]\)/g) || [];
      analysis.emailServiceImports = importMatches.map(m => m.match(/services\/([^'"]*)/)[1]);
      
      const notifyMatches = content.match(/require\(['"]\.\.\/services\/[^'"]*notification[^'"]*['"]\)/g) || [];
      analysis.notificationImports = notifyMatches.map(m => m.match(/services\/([^'"]*)/)[1]);

      // Check email sending patterns
      const sendEmailMatches = content.match(/\.sendEmail\([^)]*\)/g) || [];
      const notificationMatches = content.match(/NotificationHooks\.\w+\(/g) || [];
      
      analysis.emailSendCalls = [...sendEmailMatches, ...notificationMatches];

      // Detect inconsistencies
      if (analysis.emailServiceImports.length > 1) {
        analysis.inconsistencies.push('Multiple email service imports');
        inconsistencies.push({
          type: 'IMPORT',
          severity: 'HIGH',
          issue: `${routeFile}: Multiple email services imported: ${analysis.emailServiceImports.join(', ')}`,
          impact: 'Unclear which service is actually used'
        });
      }

      if (analysis.emailServiceImports.length > 0 && analysis.notificationImports.length > 0) {
        analysis.inconsistencies.push('Mixed email and notification service usage');
        inconsistencies.push({
          type: 'MIXED_USAGE',
          severity: 'MEDIUM', 
          issue: `${routeFile}: Uses both email services and notification layers`,
          impact: 'Inconsistent email sending patterns'
        });
      }

      routeAnalysis.push(analysis);
      console.log(`📄 ${routeFile}:`);
      console.log(`  Email services: ${analysis.emailServiceImports.join(', ') || 'None'}`);
      console.log(`  Notifications: ${analysis.notificationImports.join(', ') || 'None'}`);
      console.log(`  Email calls: ${analysis.emailSendCalls.length}`);
      if (analysis.inconsistencies.length > 0) {
        console.log(`  ⚠️ Issues: ${analysis.inconsistencies.join(', ')}`);
      }
    }

    // 3. Template Consistency Analysis
    console.log('\n3. 📧 TEMPLATE CONSISTENCY ANALYSIS:');
    
    // Check template files
    const templatesDir = path.join(__dirname, 'templates', 'emails');
    const templateFiles = fs.readdirSync(templatesDir);
    console.log(`Template files found: ${templateFiles.length}`);
    
    // Check database template types
    const dbTemplateTypes = await queryAsync(`
      SELECT DISTINCT type, COUNT(*) as usage_count 
      FROM email_notifications 
      GROUP BY type 
      ORDER BY type
    `);
    
    console.log('Template types in database:');
    dbTemplateTypes.forEach(row => console.log(`- ${row.type} (${row.usage_count} uses)`));
    
    // Check for template mismatches
    const fileTemplateNames = templateFiles.map(f => f.replace('.hbs', ''));
    const dbTemplateNames = dbTemplateTypes.map(t => t.type);
    
    const missingInDb = fileTemplateNames.filter(f => !dbTemplateNames.includes(f));
    const missingFiles = dbTemplateNames.filter(d => !fileTemplateNames.includes(d));
    
    if (missingInDb.length > 0) {
      inconsistencies.push({
        type: 'TEMPLATE_MISMATCH',
        severity: 'LOW',
        issue: `Template files exist but not used in DB: ${missingInDb.join(', ')}`,
        impact: 'Unused template files'
      });
    }
    
    if (missingFiles.length > 0) {
      inconsistencies.push({
        type: 'TEMPLATE_MISMATCH', 
        severity: 'HIGH',
        issue: `DB references templates that don't exist: ${missingFiles.join(', ')}`,
        impact: 'Email sending will fail for these templates'
      });
    }

    // 4. Email Service Method Consistency
    console.log('\n4. 🔧 EMAIL SERVICE METHOD ANALYSIS:');
    
    for (const emailService of emailServices) {
      const servicePath = path.join(servicesDir, emailService);
      const content = fs.readFileSync(servicePath, 'utf8');
      
      // Check method signatures
      const sendEmailMatch = content.match(/sendEmail\s*\([^)]*\)/);
      const getTemplateMatch = content.match(/getTemplate\s*\([^)]*\)/);
      
      console.log(`📄 ${emailService}:`);
      console.log(`  sendEmail signature: ${sendEmailMatch ? sendEmailMatch[0] : 'Not found'}`);
      console.log(`  getTemplate signature: ${getTemplateMatch ? getTemplateMatch[0] : 'Not found'}`);
      
      // Check parameter naming conventions
      if (content.includes('templateName') && content.includes('templateType')) {
        inconsistencies.push({
          type: 'PARAMETER_NAMING',
          severity: 'MEDIUM',
          issue: `${emailService}: Uses both 'templateName' and 'templateType' parameters`,
          impact: 'Confusion about which parameter to use'
        });
      }
    }

    // 5. Database Schema Analysis
    console.log('\n5. 🗄️ DATABASE SCHEMA ANALYSIS:');
    
    const emailTables = await queryAsync("SHOW TABLES LIKE '%email%'");
    console.log('Email-related tables:');
    emailTables.forEach(table => console.log(`- ${Object.values(table)[0]}`));
    
    // Check email_notifications structure
    const notificationsStructure = await queryAsync('DESCRIBE email_notifications');
    console.log('\nemail_notifications columns:');
    notificationsStructure.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type}`);
    });
    
    // Check for naming inconsistencies in columns
    const hasMessageId = notificationsStructure.some(col => col.Field === 'messageId');
    const hasMessage_id = notificationsStructure.some(col => col.Field === 'message_id');
    
    if (hasMessageId && hasMessage_id) {
      inconsistencies.push({
        type: 'DATABASE_SCHEMA',
        severity: 'HIGH', 
        issue: 'Both messageId and message_id columns exist',
        impact: 'Potential data inconsistency and confusion'
      });
    }

    // 6. Error Handling Consistency
    console.log('\n6. ⚠️ ERROR HANDLING ANALYSIS:');
    
    const errorPatterns = [];
    for (const routeFile of routeFiles) {
      const routePath = path.join(routesDir, routeFile);
      const content = fs.readFileSync(routePath, 'utf8');
      
      // Check error handling patterns
      const hasTryCatch = content.includes('try {') && content.includes('catch');
      const hasEmailErrorHandling = content.includes('emailError') || content.includes('Failed to send');
      const hasConsoleError = content.includes('console.error');
      
      errorPatterns.push({
        file: routeFile,
        hasTryCatch,
        hasEmailErrorHandling,
        hasConsoleError
      });
    }
    
    const inconsistentErrorHandling = errorPatterns.filter(p => 
      !p.hasTryCatch || !p.hasEmailErrorHandling
    );
    
    if (inconsistentErrorHandling.length > 0) {
      inconsistencies.push({
        type: 'ERROR_HANDLING',
        severity: 'MEDIUM',
        issue: `Inconsistent error handling in: ${inconsistentErrorHandling.map(p => p.file).join(', ')}`,
        impact: 'Some email failures may not be properly logged or handled'
      });
    }

    // 7. Configuration Consistency
    console.log('\n7. ⚙️ CONFIGURATION ANALYSIS:');
    
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingEnvVars.length > 0) {
      inconsistencies.push({
        type: 'CONFIGURATION',
        severity: 'CRITICAL',
        issue: `Missing environment variables: ${missingEnvVars.join(', ')}`,
        impact: 'Email sending will fail'
      });
    }
    
    console.log('Environment variables:');
    requiredEnvVars.forEach(envVar => {
      console.log(`- ${envVar}: ${process.env[envVar] ? 'Set' : 'Missing'}`);
    });

    // 8. Frontend Email Integration Analysis
    console.log('\n8. 🌐 FRONTEND INTEGRATION ANALYSIS:');
    
    const frontendDir = path.join(__dirname, '..', 'frontend');
    if (fs.existsSync(frontendDir)) {
      // Check for email-related frontend code
      const frontendFiles = getAllJSFiles(frontendDir);
      const emailFrontendUsage = [];
      
      for (const file of frontendFiles.slice(0, 10)) { // Limit to avoid overwhelming output
        const content = fs.readFileSync(file, 'utf8');
        const hasEmailCalls = content.includes('/api/email') || 
                             content.includes('send-email') ||
                             content.includes('email');
        
        if (hasEmailCalls) {
          emailFrontendUsage.push(path.relative(frontendDir, file));
        }
      }
      
      console.log(`Frontend files with email functionality: ${emailFrontendUsage.length}`);
      emailFrontendUsage.forEach(file => console.log(`- ${file}`));
    }

    // SUMMARY REPORT
    console.log('\n' + '='.repeat(60));
    console.log('📊 INCONSISTENCY SUMMARY REPORT');
    console.log('='.repeat(60));
    
    if (inconsistencies.length === 0) {
      console.log('🎉 NO INCONSISTENCIES FOUND! Email system is well-structured.');
    } else {
      console.log(`Found ${inconsistencies.length} inconsistencies:\n`);
      
      const critical = inconsistencies.filter(i => i.severity === 'CRITICAL');
      const high = inconsistencies.filter(i => i.severity === 'HIGH'); 
      const medium = inconsistencies.filter(i => i.severity === 'MEDIUM');
      const low = inconsistencies.filter(i => i.severity === 'LOW');
      
      if (critical.length > 0) {
        console.log('🚨 CRITICAL ISSUES:');
        critical.forEach(i => console.log(`- ${i.issue}`));
        console.log();
      }
      
      if (high.length > 0) {
        console.log('⚠️ HIGH PRIORITY:');
        high.forEach(i => console.log(`- ${i.issue}`));
        console.log();
      }
      
      if (medium.length > 0) {
        console.log('📋 MEDIUM PRIORITY:');
        medium.forEach(i => console.log(`- ${i.issue}`));
        console.log();
      }
      
      if (low.length > 0) {
        console.log('ℹ️ LOW PRIORITY:');
        low.forEach(i => console.log(`- ${i.issue}`));
        console.log();
      }
    }

  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    process.exit(0);
  }
}

function getAllJSFiles(dir) {
  const files = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...getAllJSFiles(fullPath));
      } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not exist or be accessible
  }
  return files;
}

analyzeEmailLogicInconsistencies();
