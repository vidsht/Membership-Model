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

async function comprehensiveEmailAnalysis() {
  console.log('🔍 COMPREHENSIVE EMAIL SYSTEM ANALYSIS - POST CONSOLIDATION');
  console.log('='.repeat(70));
  
  const inconsistencies = [];
  const warnings = [];
  const improvements = [];

  try {
    // 1. SERVICE ARCHITECTURE ANALYSIS
    console.log('\n1. 🏗️ SERVICE ARCHITECTURE ANALYSIS:');
    const servicesDir = path.join(__dirname, 'services');
    const allFiles = fs.readdirSync(servicesDir);
    const emailServices = allFiles.filter(f => f.includes('email') || f.includes('notification'));
    
    console.log('Email/Notification service files:');
    emailServices.forEach(file => console.log(`📄 ${file}`));
    
    // Check for architectural issues
    const coreServices = emailServices.filter(f => 
      f === 'emailService-integrated.js' || f === 'unifiedNotificationService.js'
    );
    const legacyServices = emailServices.filter(f => 
      !coreServices.includes(f) && !f.includes('whatsapp')
    );
    
    if (legacyServices.length > 0) {
      inconsistencies.push({
        type: 'ARCHITECTURE',
        severity: 'MEDIUM',
        issue: `Legacy notification services still exist: ${legacyServices.join(', ')}`,
        impact: 'Potential confusion about which service to use',
        recommendation: 'Consider removing unused legacy services'
      });
    }

    // 2. ROUTE IMPLEMENTATION ANALYSIS
    console.log('\n2. 🛣️ ROUTE IMPLEMENTATION ANALYSIS:');
    const routesDir = path.join(__dirname, 'routes');
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    const routeAnalysis = {};
    for (const routeFile of routeFiles) {
      const routePath = path.join(routesDir, routeFile);
      const content = fs.readFileSync(routePath, 'utf8');
      
      // Analyze imports
      const emailServiceImports = content.match(/require\(['"]\.\.\/services\/.*email.*['"]\)/g) || [];
      const notificationImports = content.match(/require\(['"]\.\.\/services\/.*notification.*['"]\)/g) || [];
      const whatsappImports = content.match(/require\(['"]\.\.\/services\/.*whatsapp.*['"]\)/g) || [];
      
      // Analyze usage patterns
      const emailSendCalls = content.match(/\.sendEmail\s*\(/g) || [];
      const notificationCalls = content.match(/notification\w*\.\w+\s*\(/g) || [];
      const hookCalls = content.match(/NotificationHooks\.\w+\s*\(/g) || [];
      
      // Check for mixed patterns
      const usesUnified = content.includes('unifiedNotificationService');
      const usesLegacyNotification = content.includes('notificationService') && !usesUnified;
      const usesLegacyHooks = content.includes('notificationHooks') || content.includes('NotificationHooks');
      const usesDirectEmail = content.includes('emailService-integrated');
      
      routeAnalysis[routeFile] = {
        emailImports: emailServiceImports.length,
        notificationImports: notificationImports.length,
        whatsappImports: whatsappImports.length,
        emailCalls: emailSendCalls.length,
        notificationCalls: notificationCalls.length,
        hookCalls: hookCalls.length,
        usesUnified,
        usesLegacyNotification,
        usesLegacyHooks,
        usesDirectEmail,
        hasEmailFunctionality: emailSendCalls.length > 0 || notificationCalls.length > 0 || hookCalls.length > 0
      };
      
      // Identify inconsistencies
      if (routeAnalysis[routeFile].hasEmailFunctionality) {
        console.log(`📄 ${routeFile}:`);
        console.log(`  Unified Service: ${usesUnified ? '✅' : '❌'}`);
        console.log(`  Legacy Notification: ${usesLegacyNotification ? '⚠️' : '✅'}`);
        console.log(`  Legacy Hooks: ${usesLegacyHooks ? '⚠️' : '✅'}`);
        console.log(`  Direct Email: ${usesDirectEmail ? 'ℹ️' : '✅'}`);
        
        if (usesLegacyNotification || usesLegacyHooks) {
          inconsistencies.push({
            type: 'ROUTE_USAGE',
            severity: 'MEDIUM',
            issue: `${routeFile} still uses legacy notification services`,
            impact: 'Inconsistent email sending patterns',
            recommendation: 'Update to use unifiedNotificationService'
          });
        }
        
        if (usesDirectEmail && usesUnified) {
          warnings.push({
            type: 'MIXED_USAGE',
            severity: 'LOW',
            issue: `${routeFile} uses both direct email service and unified service`,
            impact: 'Potential confusion, but functional',
            recommendation: 'Standardize on unified service for consistency'
          });
        }
      }
    }

    // 3. TEMPLATE SYSTEM ANALYSIS
    console.log('\n3. 📧 TEMPLATE SYSTEM ANALYSIS:');
    
    // Check template files
    const templatesDir = path.join(__dirname, 'templates', 'emails');
    const templateFiles = fs.readdirSync(templatesDir);
    console.log(`Template files found: ${templateFiles.length}`);
    
    // Check naming consistency
    const hyphenatedTemplates = templateFiles.filter(f => f.includes('-'));
    const underscoreTemplates = templateFiles.filter(f => f.includes('_'));
    
    console.log(`Hyphenated templates: ${hyphenatedTemplates.length}`);
    console.log(`Underscore templates: ${underscoreTemplates.length}`);
    
    if (hyphenatedTemplates.length > 0) {
      inconsistencies.push({
        type: 'TEMPLATE_NAMING',
        severity: 'HIGH',
        issue: `Templates still use hyphens: ${hyphenatedTemplates.join(', ')}`,
        impact: 'Template loading failures possible',
        recommendation: 'Rename to underscore convention'
      });
    }
    
    // Check database template usage
    const dbTemplateTypes = await queryAsync(`
      SELECT DISTINCT type, COUNT(*) as usage_count 
      FROM email_notifications 
      GROUP BY type 
      ORDER BY usage_count DESC
    `);
    
    console.log('\nTop template usage in database:');
    dbTemplateTypes.slice(0, 10).forEach(row => {
      console.log(`📊 ${row.type}: ${row.usage_count} uses`);
    });
    
    // Check for template mismatches
    const fileTemplateNames = templateFiles.map(f => f.replace('.hbs', ''));
    const dbTemplateNames = dbTemplateTypes.map(t => t.type);
    
    const orphanedFiles = fileTemplateNames.filter(f => !dbTemplateNames.includes(f));
    const missingFiles = dbTemplateNames.filter(d => !fileTemplateNames.includes(d));
    
    if (orphanedFiles.length > 0) {
      warnings.push({
        type: 'ORPHANED_TEMPLATES',
        severity: 'LOW',
        issue: `Template files not used in database: ${orphanedFiles.join(', ')}`,
        impact: 'Unused files taking up space',
        recommendation: 'Remove unused templates or implement functionality'
      });
    }
    
    if (missingFiles.length > 0) {
      inconsistencies.push({
        type: 'MISSING_TEMPLATES',
        severity: 'CRITICAL',
        issue: `Database references missing templates: ${missingFiles.join(', ')}`,
        impact: 'Email sending will fail for these types',
        recommendation: 'Create missing template files'
      });
    }

    // 4. SERVICE METHOD CONSISTENCY ANALYSIS
    console.log('\n4. 🔧 SERVICE METHOD CONSISTENCY:');
    
    // Analyze emailService-integrated.js
    const emailServicePath = path.join(servicesDir, 'emailService-integrated.js');
    const emailServiceContent = fs.readFileSync(emailServicePath, 'utf8');
    
    // Analyze unifiedNotificationService.js
    const unifiedServicePath = path.join(servicesDir, 'unifiedNotificationService.js');
    const unifiedServiceContent = fs.readFileSync(unifiedServicePath, 'utf8');
    
    // Check method signatures
    const emailServiceMethods = emailServiceContent.match(/async\s+(\w+)\s*\(/g) || [];
    const unifiedServiceMethods = unifiedServiceContent.match(/async\s+(\w+)\s*\(/g) || [];
    
    console.log(`EmailService methods: ${emailServiceMethods.length}`);
    console.log(`UnifiedService methods: ${unifiedServiceMethods.length}`);
    
    // Check for sendEmail method consistency
    const emailServiceSendEmail = emailServiceContent.match(/sendEmail\s*\(\s*\{([^}]+)\}/);
    const unifiedServiceSendEmail = unifiedServiceContent.match(/sendEmail\s*\(\s*\{([^}]+)\}/);
    
    if (emailServiceSendEmail && unifiedServiceSendEmail) {
      const emailParams = emailServiceSendEmail[1].split(',').map(p => p.trim().split(':')[0].trim());
      const unifiedParams = unifiedServiceSendEmail[1].split(',').map(p => p.trim().split(':')[0].trim());
      
      const paramDifferences = emailParams.filter(p => !unifiedParams.includes(p));
      if (paramDifferences.length > 0) {
        inconsistencies.push({
          type: 'METHOD_SIGNATURE',
          severity: 'MEDIUM',
          issue: `sendEmail method parameters differ between services`,
          impact: 'Potential integration issues',
          recommendation: 'Standardize method signatures'
        });
      }
    }

    // 5. DATABASE SCHEMA ANALYSIS
    console.log('\n5. 🗄️ DATABASE SCHEMA ANALYSIS:');
    
    const emailTables = await queryAsync("SHOW TABLES LIKE '%email%'");
    console.log('Email-related tables:');
    emailTables.forEach(table => console.log(`📊 ${Object.values(table)[0]}`));
    
    // Analyze email_notifications structure
    const notificationsStructure = await queryAsync('DESCRIBE email_notifications');
    console.log('\nemail_notifications columns:');
    notificationsStructure.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'required'})`);
    });
    
    // Check for schema inconsistencies
    const messageIdColumn = notificationsStructure.find(col => col.Field === 'messageId');
    const message_idColumn = notificationsStructure.find(col => col.Field === 'message_id');
    
    if (messageIdColumn && message_idColumn) {
      inconsistencies.push({
        type: 'DATABASE_SCHEMA',
        severity: 'HIGH',
        issue: 'Both messageId and message_id columns exist',
        impact: 'Data inconsistency and confusion',
        recommendation: 'Remove duplicate messageId column'
      });
    }
    
    // Check for proper indexing
    const indexes = await queryAsync('SHOW INDEX FROM email_notifications');
    const indexedColumns = indexes.map(idx => idx.Column_name);
    
    const recommendedIndexes = ['recipient', 'type', 'status', 'created_at'];
    const missingIndexes = recommendedIndexes.filter(col => !indexedColumns.includes(col));
    
    if (missingIndexes.length > 0) {
      improvements.push({
        type: 'DATABASE_PERFORMANCE',
        severity: 'LOW',
        issue: `Missing indexes on: ${missingIndexes.join(', ')}`,
        impact: 'Slower query performance',
        recommendation: 'Add indexes for better performance'
      });
    }

    // 6. ERROR HANDLING ANALYSIS
    console.log('\n6. ⚠️ ERROR HANDLING ANALYSIS:');
    
    const errorHandlingPatterns = {};
    for (const routeFile of routeFiles) {
      const routePath = path.join(routesDir, routeFile);
      const content = fs.readFileSync(routePath, 'utf8');
      
      // Check error handling patterns
      const hasTryCatch = content.includes('try {') && content.includes('catch');
      const hasEmailErrorHandling = content.includes('emailError') || content.includes('Failed to send');
      const hasConsoleError = content.includes('console.error');
      const hasErrorLogging = content.includes('error.message') || content.includes('error:');
      
      errorHandlingPatterns[routeFile] = {
        hasTryCatch,
        hasEmailErrorHandling,
        hasConsoleError,
        hasErrorLogging,
        score: [hasTryCatch, hasEmailErrorHandling, hasConsoleError, hasErrorLogging].filter(Boolean).length
      };
      
      if (routeAnalysis[routeFile]?.hasEmailFunctionality && errorHandlingPatterns[routeFile].score < 3) {
        inconsistencies.push({
          type: 'ERROR_HANDLING',
          severity: 'MEDIUM',
          issue: `${routeFile} has insufficient email error handling`,
          impact: 'Email failures may not be properly logged or handled',
          recommendation: 'Implement comprehensive error handling'
        });
      }
    }

    // 7. CONFIGURATION AND ENVIRONMENT ANALYSIS
    console.log('\n7. ⚙️ CONFIGURATION ANALYSIS:');
    
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const optionalEnvVars = ['FRONTEND_URL', 'DISABLE_SMTP_VERIFY'];
    
    console.log('Required SMTP variables:');
    const missingRequired = [];
    requiredEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      console.log(`${isSet ? '✅' : '❌'} ${envVar}`);
      if (!isSet) missingRequired.push(envVar);
    });
    
    console.log('\nOptional variables:');
    optionalEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      console.log(`${isSet ? '✅' : 'ℹ️'} ${envVar}: ${isSet ? process.env[envVar] : 'Not set'}`);
    });
    
    if (missingRequired.length > 0) {
      inconsistencies.push({
        type: 'CONFIGURATION',
        severity: 'CRITICAL',
        issue: `Missing required environment variables: ${missingRequired.join(', ')}`,
        impact: 'Email sending will fail completely',
        recommendation: 'Set all required SMTP configuration variables'
      });
    }

    // 8. PERFORMANCE AND OPTIMIZATION ANALYSIS
    console.log('\n8. 📊 PERFORMANCE ANALYSIS:');
    
    // Test template loading performance
    const templateLoadTimes = [];
    const testTemplates = ['user_welcome', 'admin_new_registration', 'password_reset'];
    
    for (const templateType of testTemplates) {
      const start = Date.now();
      try {
        const emailService = require('./services/emailService-integrated');
        await emailService.getTemplate(templateType);
        const loadTime = Date.now() - start;
        templateLoadTimes.push({ template: templateType, time: loadTime });
        console.log(`📄 ${templateType}: ${loadTime}ms`);
      } catch (error) {
        console.log(`❌ ${templateType}: Failed to load`);
      }
    }
    
    const avgLoadTime = templateLoadTimes.reduce((sum, t) => sum + t.time, 0) / templateLoadTimes.length;
    if (avgLoadTime > 1000) {
      improvements.push({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        issue: `Average template load time is ${avgLoadTime.toFixed(0)}ms`,
        impact: 'Slower email sending performance',
        recommendation: 'Implement template caching or optimization'
      });
    }

    // 9. INTEGRATION AND DEPENDENCY ANALYSIS
    console.log('\n9. 🔗 INTEGRATION ANALYSIS:');
    
    // Check for circular dependencies
    const serviceDependencies = {};
    emailServices.forEach(serviceFile => {
      const servicePath = path.join(servicesDir, serviceFile);
      const content = fs.readFileSync(servicePath, 'utf8');
      const requires = content.match(/require\(['"]\.\/[^'"]*['"]\)/g) || [];
      serviceDependencies[serviceFile] = requires.map(r => r.match(/\.\/([^'"]*)/)[1] + '.js');
    });
    
    console.log('Service dependencies:');
    Object.entries(serviceDependencies).forEach(([service, deps]) => {
      console.log(`📄 ${service}: [${deps.join(', ')}]`);
    });

    // COMPREHENSIVE SUMMARY
    console.log('\n' + '='.repeat(70));
    console.log('📋 COMPREHENSIVE ANALYSIS SUMMARY');
    console.log('='.repeat(70));
    
    const totalIssues = inconsistencies.length + warnings.length;
    const criticalIssues = inconsistencies.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = inconsistencies.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = inconsistencies.filter(i => i.severity === 'MEDIUM').length;
    const lowIssues = warnings.filter(w => w.severity === 'LOW').length;
    
    console.log(`\n🎯 OVERALL ASSESSMENT:`);
    console.log(`Total Issues Found: ${totalIssues}`);
    console.log(`Critical: ${criticalIssues} | High: ${highIssues} | Medium: ${mediumIssues} | Low: ${lowIssues}`);
    console.log(`Improvements Suggested: ${improvements.length}`);
    
    if (criticalIssues > 0) {
      console.log('\n🚨 CRITICAL ISSUES (Fix Immediately):');
      inconsistencies.filter(i => i.severity === 'CRITICAL').forEach(issue => {
        console.log(`❌ ${issue.type}: ${issue.issue}`);
        console.log(`   Impact: ${issue.impact}`);
        console.log(`   Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (highIssues > 0) {
      console.log('\n⚠️ HIGH PRIORITY ISSUES:');
      inconsistencies.filter(i => i.severity === 'HIGH').forEach(issue => {
        console.log(`🔴 ${issue.type}: ${issue.issue}`);
        console.log(`   Impact: ${issue.impact}`);
        console.log(`   Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (mediumIssues > 0) {
      console.log('\n📋 MEDIUM PRIORITY ISSUES:');
      inconsistencies.filter(i => i.severity === 'MEDIUM').forEach(issue => {
        console.log(`🟡 ${issue.type}: ${issue.issue}`);
        console.log(`   Impact: ${issue.impact}`);
        console.log(`   Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (lowIssues > 0) {
      console.log('\nℹ️ LOW PRIORITY WARNINGS:');
      warnings.filter(w => w.severity === 'LOW').forEach(warning => {
        console.log(`🟢 ${warning.type}: ${warning.issue}`);
        console.log(`   Impact: ${warning.impact}`);
        console.log(`   Suggestion: ${warning.recommendation}\n`);
      });
    }
    
    if (improvements.length > 0) {
      console.log('\n💡 SUGGESTED IMPROVEMENTS:');
      improvements.forEach(improvement => {
        console.log(`✨ ${improvement.type}: ${improvement.issue}`);
        console.log(`   Benefit: ${improvement.impact}`);
        console.log(`   Action: ${improvement.recommendation}\n`);
      });
    }
    
    // Final health score
    const maxPossibleScore = 100;
    const deductions = (criticalIssues * 25) + (highIssues * 15) + (mediumIssues * 10) + (lowIssues * 5);
    const healthScore = Math.max(0, maxPossibleScore - deductions);
    
    console.log(`\n🏥 EMAIL SYSTEM HEALTH SCORE: ${healthScore}/100`);
    
    if (healthScore >= 90) {
      console.log('🎉 EXCELLENT - Email system is in great shape!');
    } else if (healthScore >= 75) {
      console.log('✅ GOOD - Minor issues to address');
    } else if (healthScore >= 60) {
      console.log('⚠️ FAIR - Several issues need attention');
    } else {
      console.log('🚨 POOR - Critical issues require immediate attention');
    }

  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    process.exit(0);
  }
}

comprehensiveEmailAnalysis();