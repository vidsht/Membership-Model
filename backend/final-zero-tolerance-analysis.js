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

async function finalEmailSystemAnalysis() {
  console.log('🔍 FINAL COMPREHENSIVE EMAIL SYSTEM ANALYSIS');
  console.log('='.repeat(80));
  console.log('🎯 ZERO-TOLERANCE INCONSISTENCY DETECTION');
  console.log('='.repeat(80));
  
  const inconsistencies = [];
  const warnings = [];
  const criticalIssues = [];
  const improvements = [];

  try {
    // 1. DEEP ARCHITECTURE ANALYSIS
    console.log('\n1. 🏗️ DEEP ARCHITECTURE ANALYSIS:');
    
    const servicesDir = path.join(__dirname, 'services');
    const allFiles = fs.readdirSync(servicesDir);
    const emailServices = allFiles.filter(f => f.includes('email') || f.includes('notification'));
    
    console.log('📄 Email/Notification service files:');
    emailServices.forEach(file => console.log(`  - ${file}`));
    
    // Check for any legacy service remnants
    const legacyServicePatterns = [
      'emailService.js',
      'notificationHooks.js', 
      'notificationService.js',
      'emailHooks.js',
      'mailService.js'
    ];
    
    const foundLegacyServices = emailServices.filter(f => legacyServicePatterns.includes(f));
    if (foundLegacyServices.length > 0) {
      criticalIssues.push({
        type: 'LEGACY_SERVICE_FILES',
        severity: 'CRITICAL',
        issue: `Legacy service files still exist: ${foundLegacyServices.join(', ')}`,
        impact: 'Risk of using outdated email services',
        recommendation: 'Remove all legacy email service files'
      });
    }

    // 2. SERVICE INTERFACE DEEP VALIDATION
    console.log('\n2. 🔌 SERVICE INTERFACE DEEP VALIDATION:');
    
    // Validate emailService-integrated.js
    const emailServicePath = path.join(servicesDir, 'emailService-integrated.js');
    const emailServiceContent = fs.readFileSync(emailServicePath, 'utf8');
    
    // Validate unifiedNotificationService.js  
    const unifiedServicePath = path.join(servicesDir, 'unifiedNotificationService.js');
    const unifiedServiceContent = fs.readFileSync(unifiedServicePath, 'utf8');
    
    // Check for consistent error handling patterns
    const emailServiceTryCatchCount = (emailServiceContent.match(/try\s*\{[\s\S]*?\}\s*catch/g) || []).length;
    const unifiedServiceTryCatchCount = (unifiedServiceContent.match(/try\s*\{[\s\S]*?\}\s*catch/g) || []).length;
    
    console.log(`📊 Error handling coverage:`);
    console.log(`  emailService-integrated.js: ${emailServiceTryCatchCount} try-catch blocks`);
    console.log(`  unifiedNotificationService.js: ${unifiedServiceTryCatchCount} try-catch blocks`);
    
    // Check for proper async/await usage
    const emailServiceAsyncMethods = (emailServiceContent.match(/async\s+\w+\s*\(/g) || []).length;
    const unifiedServiceAsyncMethods = (unifiedServiceContent.match(/async\s+\w+\s*\(/g) || []).length;
    
    console.log(`📊 Async method coverage:`);
    console.log(`  emailService-integrated.js: ${emailServiceAsyncMethods} async methods`);
    console.log(`  unifiedNotificationService.js: ${unifiedServiceAsyncMethods} async methods`);
    
    // Validate critical methods exist
    const requiredEmailServiceMethods = ['sendEmail', 'getTemplate', 'processEmailQueue'];
    const requiredUnifiedMethods = [
      'sendEmail', 'onUserRegistration', 'onMerchantRegistration', 'onProfileStatusChange',
      'onDealStatusChange', 'onRedemptionRequested', 'onRedemptionResponse', 'onPlanAssigned',
      'onPasswordChangedByAdmin', 'onPlanExpiryCheck', 'onMonthlyLimitsRenewal'
    ];
    
    const missingEmailServiceMethods = requiredEmailServiceMethods.filter(method => 
      !emailServiceContent.includes(`${method}(`) && !emailServiceContent.includes(`${method} (`)
    );
    
    const missingUnifiedMethods = requiredUnifiedMethods.filter(method => 
      !unifiedServiceContent.includes(`${method}(`) && !unifiedServiceContent.includes(`${method} (`)
    );
    
    if (missingEmailServiceMethods.length > 0) {
      criticalIssues.push({
        type: 'MISSING_CORE_METHODS',
        severity: 'CRITICAL', 
        issue: `Missing methods in emailService-integrated.js: ${missingEmailServiceMethods.join(', ')}`,
        impact: 'Core email functionality broken',
        recommendation: 'Implement missing core methods immediately'
      });
    }
    
    if (missingUnifiedMethods.length > 0) {
      criticalIssues.push({
        type: 'MISSING_UNIFIED_METHODS',
        severity: 'CRITICAL',
        issue: `Missing methods in unifiedNotificationService.js: ${missingUnifiedMethods.join(', ')}`,
        impact: 'Incomplete notification functionality',
        recommendation: 'Implement missing notification methods immediately'
      });
    }

    // 3. COMPREHENSIVE ROUTE ANALYSIS
    console.log('\n3. 🛣️ COMPREHENSIVE ROUTE ANALYSIS:');
    
    const routesDir = path.join(__dirname, 'routes');
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    let totalEmailRoutes = 0;
    let perfectlyIntegratedRoutes = 0;
    let routesWithIssues = [];
    
    for (const routeFile of routeFiles) {
      const routePath = path.join(routesDir, routeFile);
      const content = fs.readFileSync(routePath, 'utf8');
      
      // Precise email functionality detection
      const actualEmailSending = content.includes('.sendEmail(') || 
                                 content.includes('.onUserRegistration(') ||
                                 content.includes('.onMerchantRegistration(') ||
                                 content.includes('.onRedemptionRequested(') ||
                                 content.includes('.onProfileStatusChange(') ||
                                 content.includes('.onDealStatusChange(') ||
                                 content.includes('.onPlanAssigned(') ||
                                 content.includes('.onPasswordChangedByAdmin(') ||
                                 content.includes('.onRedemptionResponse(') ||
                                 content.includes('notificationService') ||
                                 content.includes('NotificationHooks');
      
      if (actualEmailSending) {
        totalEmailRoutes++;
        
        // Check for perfect integration
        const usesUnified = content.includes('unifiedNotificationService');
        const noLegacyServices = !content.includes('notificationService') || 
                                content.includes('unifiedNotificationService');
        const noLegacyHooks = !content.includes('NotificationHooks') && 
                             !content.includes('notificationHooks');
        const hasErrorHandling = content.includes('try {') && content.includes('catch');
        const hasProperLogging = content.includes('console.error') && content.includes('console.log');
        
        const routeScore = [usesUnified, noLegacyServices, noLegacyHooks, hasErrorHandling, hasProperLogging]
          .filter(Boolean).length;
        
        console.log(`📄 ${routeFile}: Score ${routeScore}/5`);
        console.log(`  ✅ Unified service: ${usesUnified ? '✅' : '❌'}`);
        console.log(`  ✅ No legacy services: ${noLegacyServices ? '✅' : '❌'}`);
        console.log(`  ✅ No legacy hooks: ${noLegacyHooks ? '✅' : '❌'}`);
        console.log(`  ✅ Error handling: ${hasErrorHandling ? '✅' : '❌'}`);
        console.log(`  ✅ Proper logging: ${hasProperLogging ? '✅' : '❌'}`);
        
        if (routeScore === 5) {
          perfectlyIntegratedRoutes++;
        } else {
          routesWithIssues.push({
            file: routeFile,
            score: routeScore,
            issues: []
          });
          
          if (!usesUnified) {
            routesWithIssues[routesWithIssues.length - 1].issues.push('Missing unifiedNotificationService');
          }
          if (!noLegacyServices) {
            routesWithIssues[routesWithIssues.length - 1].issues.push('Uses legacy services');
          }
          if (!noLegacyHooks) {
            routesWithIssues[routesWithIssues.length - 1].issues.push('Uses legacy hooks');
          }
          if (!hasErrorHandling) {
            routesWithIssues[routesWithIssues.length - 1].issues.push('Missing error handling');
          }
          if (!hasProperLogging) {
            routesWithIssues[routesWithIssues.length - 1].issues.push('Missing proper logging');
          }
        }
      }
    }
    
    console.log(`\n📊 Route Integration Summary:`);
    console.log(`  Total email routes: ${totalEmailRoutes}`);
    console.log(`  Perfectly integrated: ${perfectlyIntegratedRoutes}`);
    console.log(`  Routes with issues: ${routesWithIssues.length}`);
    
    const integrationPercentage = totalEmailRoutes > 0 ? (perfectlyIntegratedRoutes / totalEmailRoutes) * 100 : 100;
    console.log(`  Perfect integration: ${integrationPercentage.toFixed(1)}%`);
    
    routesWithIssues.forEach(route => {
      inconsistencies.push({
        type: 'ROUTE_INTEGRATION_IMPERFECTION',
        severity: route.score < 3 ? 'HIGH' : 'MEDIUM',
        issue: `${route.file} has integration issues: ${route.issues.join(', ')}`,
        impact: 'Inconsistent email handling and potential failures',
        recommendation: `Fix all integration issues in ${route.file}`
      });
    });

    // 4. TEMPLATE SYSTEM EXHAUSTIVE ANALYSIS
    console.log('\n4. 📧 TEMPLATE SYSTEM EXHAUSTIVE ANALYSIS:');
    
    const templatesDir = path.join(__dirname, 'templates', 'emails');
    const templateFiles = fs.readdirSync(templatesDir);
    
    console.log(`📁 Template files: ${templateFiles.length}`);
    
    // Validate each template file
    let templateErrors = 0;
    for (const templateFile of templateFiles) {
      try {
        const templatePath = path.join(templatesDir, templateFile);
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        
        // Check for common template issues
        const hasHandlebarsDelimiters = templateContent.includes('{{') && templateContent.includes('}}');
        const hasBasicStructure = templateContent.includes('<html') || templateContent.includes('<!DOCTYPE');
        const hasEmailStyles = templateContent.includes('<style') || templateContent.includes('style=');
        const hasProperCharset = templateContent.includes('charset=UTF-8') || templateContent.includes('utf-8');
        
        if (!hasHandlebarsDelimiters) {
          warnings.push({
            type: 'TEMPLATE_STRUCTURE',
            severity: 'LOW',
            issue: `${templateFile} may not have Handlebars variables`,
            impact: 'Template may not render dynamic content',
            recommendation: 'Verify template has proper Handlebars syntax'
          });
        }
        
        if (!hasBasicStructure) {
          inconsistencies.push({
            type: 'TEMPLATE_HTML_STRUCTURE',
            severity: 'MEDIUM',
            issue: `${templateFile} missing proper HTML structure`,
            impact: 'Email may not render correctly in clients',
            recommendation: 'Add proper HTML document structure'
          });
        }
        
        if (!hasEmailStyles) {
          improvements.push({
            type: 'TEMPLATE_STYLING',
            severity: 'LOW',
            issue: `${templateFile} may lack email-specific styling`,
            impact: 'Email appearance may not be optimal',
            recommendation: 'Consider adding inline styles for better email client compatibility'
          });
        }
        
      } catch (error) {
        templateErrors++;
        criticalIssues.push({
          type: 'TEMPLATE_FILE_ERROR',
          severity: 'CRITICAL',
          issue: `Cannot read template file ${templateFile}: ${error.message}`,
          impact: 'Template cannot be used for email sending',
          recommendation: 'Fix template file immediately'
        });
      }
    }
    
    console.log(`📊 Template validation: ${templateFiles.length - templateErrors}/${templateFiles.length} readable`);

    // 5. DATABASE SCHEMA DEEP VALIDATION
    console.log('\n5. 🗄️ DATABASE SCHEMA DEEP VALIDATION:');
    
    // Comprehensive table structure analysis
    const emailNotificationsStructure = await queryAsync('DESCRIBE email_notifications');
    
    console.log('📋 email_notifications table structure validation:');
    
    const requiredColumns = [
      { name: 'id', type: 'int', nullable: false },
      { name: 'recipient', type: 'varchar', nullable: false },
      { name: 'type', type: 'varchar', nullable: false },
      { name: 'subject', type: 'varchar', nullable: false },
      { name: 'status', type: 'enum', nullable: true },
      { name: 'created_at', type: 'timestamp', nullable: true }
    ];
    
    const missingColumns = requiredColumns.filter(reqCol => 
      !emailNotificationsStructure.some(dbCol => dbCol.Field === reqCol.name)
    );
    
    if (missingColumns.length > 0) {
      criticalIssues.push({
        type: 'MISSING_DATABASE_COLUMNS',
        severity: 'CRITICAL',
        issue: `Missing required columns: ${missingColumns.map(c => c.name).join(', ')}`,
        impact: 'Email system cannot function properly',
        recommendation: 'Add missing database columns immediately'
      });
    }
    
    // Check for proper indexes
    const indexes = await queryAsync('SHOW INDEX FROM email_notifications');
    const indexedColumns = [...new Set(indexes.map(idx => idx.Column_name))];
    
    const recommendedIndexes = ['recipient', 'type', 'status', 'created_at', 'scheduled_for'];
    const missingIndexes = recommendedIndexes.filter(col => !indexedColumns.includes(col));
    
    console.log(`📊 Database indexes: ${indexedColumns.length} total, ${missingIndexes.length} missing`);
    
    if (missingIndexes.length > 0) {
      improvements.push({
        type: 'DATABASE_INDEX_OPTIMIZATION',
        severity: 'MEDIUM',
        issue: `Missing performance indexes: ${missingIndexes.join(', ')}`,
        impact: 'Slower email query performance on large datasets',
        recommendation: 'Add recommended indexes for optimal performance'
      });
    }
    
    // Advanced data integrity checks
    const integrityChecks = [
      {
        name: 'Orphaned sent emails',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'sent' AND sent_at IS NULL",
        critical: true
      },
      {
        name: 'Failed emails without errors',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'failed' AND (error IS NULL OR error = '')",
        critical: true
      },
      {
        name: 'Invalid email addresses',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE recipient NOT LIKE '%@%'",
        critical: true
      },
      {
        name: 'Duplicate pending emails',
        query: "SELECT COUNT(*) - COUNT(DISTINCT recipient, type) as count FROM email_notifications WHERE status = 'pending'",
        critical: false
      },
      {
        name: 'Old pending emails',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)",
        critical: false
      }
    ];
    
    for (const check of integrityChecks) {
      try {
        const result = await queryAsync(check.query);
        const count = result[0]?.count || 0;
        
        console.log(`🔍 ${check.name}: ${count} records`);
        
        if (count > 0) {
          const issueData = {
            type: 'DATA_INTEGRITY_VIOLATION',
            severity: check.critical ? 'HIGH' : 'LOW',
            issue: `Found ${count} records with ${check.name.toLowerCase()}`,
            impact: check.critical ? 'Critical data inconsistency affecting email reliability' : 'Minor data inconsistency',
            recommendation: check.critical ? 'Fix data integrity issues immediately' : 'Clean up data during maintenance'
          };
          
          if (check.critical) {
            inconsistencies.push(issueData);
          } else {
            warnings.push(issueData);
          }
        }
      } catch (error) {
        console.warn(`❌ Failed integrity check ${check.name}:`, error.message);
      }
    }

    // 6. CONFIGURATION COMPLETENESS ANALYSIS
    console.log('\n6. ⚙️ CONFIGURATION COMPLETENESS ANALYSIS:');
    
    const criticalEnvVars = [
      'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'
    ];
    
    const importantEnvVars = [
      'FRONTEND_URL', 'EMAIL_FROM', 'ADMIN_EMAIL'
    ];
    
    const optionalEnvVars = [
      'DISABLE_SMTP_VERIFY', 'EMAIL_RATE_LIMIT', 'EMAIL_RETRY_ATTEMPTS'
    ];
    
    console.log('🔧 Critical configuration:');
    let missingCritical = [];
    criticalEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      console.log(`  ${envVar}: ${isSet ? '✅' : '❌'}`);
      if (!isSet) missingCritical.push(envVar);
    });
    
    console.log('📧 Important configuration:');
    let missingImportant = [];
    importantEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      console.log(`  ${envVar}: ${isSet ? '✅' : '⚠️'} ${isSet ? '***' : 'Not set'}`);
      if (!isSet) missingImportant.push(envVar);
    });
    
    console.log('🔧 Optional configuration:');
    optionalEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      const value = isSet ? process.env[envVar] : 'Not set';
      console.log(`  ${envVar}: ${isSet ? '✅' : 'ℹ️'} ${value}`);
    });
    
    if (missingCritical.length > 0) {
      criticalIssues.push({
        type: 'MISSING_CRITICAL_CONFIG',
        severity: 'CRITICAL',
        issue: `Missing critical configuration: ${missingCritical.join(', ')}`,
        impact: 'Email system cannot function',
        recommendation: 'Set all critical environment variables immediately'
      });
    }
    
    if (missingImportant.length > 0) {
      inconsistencies.push({
        type: 'MISSING_IMPORTANT_CONFIG',
        severity: 'MEDIUM',
        issue: `Missing important configuration: ${missingImportant.join(', ')}`,
        impact: 'Email system functionality may be limited',
        recommendation: 'Set important environment variables for full functionality'
      });
    }

    // 7. PERFORMANCE AND RELIABILITY ANALYSIS
    console.log('\n7. 📊 PERFORMANCE AND RELIABILITY ANALYSIS:');
    
    // Test template loading performance
    const templatePerformanceTests = ['user_welcome', 'admin_new_registration', 'password_reset', 'plan_assignment'];
    let totalLoadTime = 0;
    let successfulLoads = 0;
    let slowTemplates = [];
    
    for (const templateType of templatePerformanceTests) {
      try {
        const start = Date.now();
        const emailService = require('./services/emailService-integrated');
        await emailService.getTemplate(templateType);
        const loadTime = Date.now() - start;
        totalLoadTime += loadTime;
        successfulLoads++;
        
        console.log(`📄 ${templateType}: ${loadTime}ms`);
        
        if (loadTime > 1000) {
          slowTemplates.push({ template: templateType, time: loadTime });
        }
      } catch (error) {
        console.log(`❌ ${templateType}: Failed - ${error.message}`);
        criticalIssues.push({
          type: 'TEMPLATE_LOADING_FAILURE',
          severity: 'CRITICAL',
          issue: `Template ${templateType} failed to load: ${error.message}`,
          impact: 'Emails using this template will fail',
          recommendation: 'Fix template loading issue immediately'
        });
      }
    }
    
    const avgLoadTime = successfulLoads > 0 ? totalLoadTime / successfulLoads : 0;
    console.log(`📈 Average template load time: ${avgLoadTime.toFixed(0)}ms`);
    
    if (avgLoadTime > 500) {
      improvements.push({
        type: 'TEMPLATE_PERFORMANCE',
        severity: 'MEDIUM',
        issue: `Template loading is slow (${avgLoadTime.toFixed(0)}ms average)`,
        impact: 'Slower email sending performance',
        recommendation: 'Optimize template loading or implement caching'
      });
    }
    
    if (slowTemplates.length > 0) {
      warnings.push({
        type: 'SLOW_TEMPLATE_LOADING',
        severity: 'LOW',
        issue: `Slow templates detected: ${slowTemplates.map(t => `${t.template}(${t.time}ms)`).join(', ')}`,
        impact: 'These specific templates load slowly',
        recommendation: 'Optimize slow-loading templates'
      });
    }
    
    // Check email queue health
    try {
      const queueStats = await queryAsync(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(sent_at, failed_at, NOW()))) as avg_process_time
        FROM email_notifications 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY status
      `);
      
      console.log('\n📬 Email queue health (last 24 hours):');
      queueStats.forEach(stat => {
        console.log(`  ${stat.status}: ${stat.count} emails, avg processing: ${stat.avg_process_time?.toFixed(1) || 'N/A'} minutes`);
      });
      
      const pendingEmails = queueStats.find(s => s.status === 'pending')?.count || 0;
      const failedEmails = queueStats.find(s => s.status === 'failed')?.count || 0;
      
      if (pendingEmails > 50) {
        warnings.push({
          type: 'HIGH_PENDING_EMAIL_COUNT',
          severity: 'MEDIUM',
          issue: `High number of pending emails: ${pendingEmails}`,
          impact: 'Email delivery delays',
          recommendation: 'Check email processing capacity and queue health'
        });
      }
      
      if (failedEmails > 10) {
        inconsistencies.push({
          type: 'HIGH_FAILED_EMAIL_COUNT',
          severity: 'HIGH',
          issue: `High number of failed emails: ${failedEmails}`,
          impact: 'Email delivery reliability issues',
          recommendation: 'Investigate and fix email delivery failures'
        });
      }
      
    } catch (error) {
      console.warn('Could not analyze email queue health:', error.message);
    }

    // 8. FUNCTIONAL INTEGRATION TESTING
    console.log('\n8. 🧪 FUNCTIONAL INTEGRATION TESTING:');
    
    try {
      const unifiedService = require('./services/unifiedNotificationService');
      
      // Test all critical methods
      const criticalMethods = [
        'sendEmail', 'onUserRegistration', 'onMerchantRegistration', 'onProfileStatusChange',
        'onDealStatusChange', 'onRedemptionRequested', 'onRedemptionResponse', 'onPlanAssigned',
        'onPasswordChangedByAdmin', 'onPlanExpiryCheck', 'onMonthlyLimitsRenewal'
      ];
      
      const methodTests = [];
      for (const method of criticalMethods) {
        const exists = typeof unifiedService[method] === 'function';
        methodTests.push({ method, exists });
        console.log(`📋 ${method}: ${exists ? '✅' : '❌'}`);
        
        if (!exists) {
          criticalIssues.push({
            type: 'MISSING_CRITICAL_METHOD',
            severity: 'CRITICAL',
            issue: `Method ${method} is missing from unifiedNotificationService`,
            impact: 'Core email functionality broken',
            recommendation: 'Implement missing method immediately'
          });
        }
      }
      
      const existingMethods = methodTests.filter(t => t.exists).length;
      console.log(`📊 Method availability: ${existingMethods}/${criticalMethods.length} (${((existingMethods/criticalMethods.length)*100).toFixed(1)}%)`);
      
      // Test error handling in services
      try {
        await unifiedService.sendEmail({});
      } catch (validationError) {
        console.log('✅ Parameter validation working correctly');
      }
      
    } catch (serviceError) {
      criticalIssues.push({
        type: 'SERVICE_LOADING_ERROR',
        severity: 'CRITICAL',
        issue: `Cannot load unifiedNotificationService: ${serviceError.message}`,
        impact: 'Email system completely non-functional',
        recommendation: 'Fix service loading errors immediately'
      });
    }

    // FINAL COMPREHENSIVE ASSESSMENT
    console.log('\n' + '='.repeat(80));
    console.log('📋 FINAL COMPREHENSIVE EMAIL SYSTEM ASSESSMENT');
    console.log('='.repeat(80));
    
    const allIssues = [...criticalIssues, ...inconsistencies, ...warnings];
    const totalIssues = allIssues.length;
    const criticalCount = criticalIssues.length;
    const highCount = inconsistencies.filter(i => i.severity === 'HIGH').length;
    const mediumCount = [...inconsistencies, ...warnings].filter(i => i.severity === 'MEDIUM').length;
    const lowCount = [...inconsistencies, ...warnings].filter(i => i.severity === 'LOW').length;
    
    console.log(`\n🎯 ZERO-TOLERANCE ASSESSMENT RESULTS:`);
    console.log(`Total Issues Detected: ${totalIssues}`);
    console.log(`├─ Critical: ${criticalCount} 🚨`);
    console.log(`├─ High: ${highCount} ⚠️`);
    console.log(`├─ Medium: ${mediumCount} 📋`);
    console.log(`└─ Low: ${lowCount} ℹ️`);
    console.log(`Optimization Opportunities: ${improvements.length} ✨`);
    
    // Display all issues with detailed information
    if (criticalCount > 0) {
      console.log('\n🚨 CRITICAL ISSUES (IMMEDIATE ACTION REQUIRED):');
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}:`);
        console.log(`   💥 Issue: ${issue.issue}`);
        console.log(`   💥 Impact: ${issue.impact}`);
        console.log(`   🔧 Action: ${issue.recommendation}\n`);
      });
    }
    
    if (highCount > 0) {
      console.log('\n⚠️ HIGH PRIORITY ISSUES:');
      inconsistencies.filter(i => i.severity === 'HIGH').forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}:`);
        console.log(`   📍 Issue: ${issue.issue}`);
        console.log(`   📍 Impact: ${issue.impact}`);
        console.log(`   🛠️ Action: ${issue.recommendation}\n`);
      });
    }
    
    if (mediumCount > 0) {
      console.log('\n📋 MEDIUM PRIORITY ISSUES:');
      [...inconsistencies, ...warnings].filter(i => i.severity === 'MEDIUM').forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}:`);
        console.log(`   📊 Issue: ${issue.issue}`);
        console.log(`   📊 Impact: ${issue.impact}`);
        console.log(`   🔨 Action: ${issue.recommendation}\n`);
      });
    }
    
    if (lowCount > 0) {
      console.log('\nℹ️ LOW PRIORITY ITEMS:');
      [...inconsistencies, ...warnings].filter(i => i.severity === 'LOW').forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}:`);
        console.log(`   💡 Issue: ${issue.issue}`);
        console.log(`   💡 Impact: ${issue.impact}`);
        console.log(`   📝 Suggestion: ${issue.recommendation}\n`);
      });
    }
    
    if (improvements.length > 0) {
      console.log('\n✨ OPTIMIZATION OPPORTUNITIES:');
      improvements.forEach((improvement, index) => {
        console.log(`${index + 1}. ${improvement.type}:`);
        console.log(`   🚀 Opportunity: ${improvement.issue}`);
        console.log(`   🚀 Benefit: ${improvement.impact}`);
        console.log(`   🎯 Action: ${improvement.recommendation}\n`);
      });
    }
    
    // Calculate final health score with zero tolerance
    const maxScore = 100;
    const criticalPenalty = criticalCount * 50;  // Higher penalty for critical issues
    const highPenalty = highCount * 30;
    const mediumPenalty = mediumCount * 15;
    const lowPenalty = lowCount * 5;
    
    const totalPenalty = criticalPenalty + highPenalty + mediumPenalty + lowPenalty;
    const healthScore = Math.max(0, maxScore - totalPenalty);
    
    console.log(`\n🏥 FINAL EMAIL SYSTEM HEALTH SCORE: ${healthScore}/100`);
    
    // Final status determination with zero tolerance
    let status, emoji, message, actionRequired;
    if (criticalCount > 0) {
      status = 'CRITICAL FAILURE';
      emoji = '💥';
      message = 'Email system has critical failures that prevent safe operation!';
      actionRequired = 'IMMEDIATE: Fix all critical issues before using in production!';
    } else if (healthScore >= 98) {
      status = 'PERFECT';
      emoji = '🏆';
      message = 'Email system is in perfect condition with zero tolerance standards!';
      actionRequired = 'NONE: System is production-ready at the highest standards.';
    } else if (healthScore >= 95) {
      status = 'EXCELLENT';
      emoji = '🎉';
      message = 'Email system is in exceptional condition with minimal issues!';
      actionRequired = 'OPTIONAL: Address remaining items for perfect score.';
    } else if (healthScore >= 85) {
      status = 'VERY GOOD';
      emoji = '✅';
      message = 'Email system is well-maintained with minor optimizations needed.';
      actionRequired = 'RECOMMENDED: Address medium priority issues.';
    } else if (healthScore >= 75) {
      status = 'GOOD';
      emoji = '👍';
      message = 'Email system is functional with some improvements recommended.';
      actionRequired = 'REQUIRED: Address high and medium priority issues.';
    } else {
      status = 'POOR';
      emoji = '🚨';
      message = 'Email system has significant issues requiring immediate attention.';
      actionRequired = 'URGENT: Address all high and critical issues immediately.';
    }
    
    console.log(`${emoji} FINAL STATUS: ${status}`);
    console.log(`📝 ASSESSMENT: ${message}`);
    console.log(`🎯 ACTION REQUIRED: ${actionRequired}`);
    
    // Detailed final metrics
    console.log(`\n📊 DETAILED FINAL METRICS:`);
    console.log(`✅ Service Architecture: ${foundLegacyServices.length === 0 ? 'Perfect' : 'Needs cleanup'}`);
    console.log(`✅ Route Integration: ${integrationPercentage.toFixed(1)}% perfect`);
    console.log(`✅ Template System: ${templateFiles.length - templateErrors}/${templateFiles.length} functional`);
    console.log(`✅ Database Integrity: ${criticalCount === 0 ? 'Clean' : 'Has issues'}`);
    console.log(`✅ Configuration: ${missingCritical.length === 0 ? 'Complete' : 'Missing critical items'}`);
    console.log(`✅ Performance: ${avgLoadTime < 500 ? 'Excellent' : 'Needs optimization'} (${avgLoadTime.toFixed(0)}ms avg)`);
    console.log(`✅ Reliability: ${healthScore >= 95 ? 'High' : healthScore >= 85 ? 'Good' : 'Needs improvement'}`);
    
    return {
      healthScore,
      status,
      totalIssues,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      integrationPercentage,
      avgLoadTime
    };

  } catch (error) {
    console.error('💥 Analysis failed with critical error:', error);
    console.error('Stack:', error.stack);
    return {
      healthScore: 0,
      status: 'ANALYSIS_FAILED',
      error: error.message
    };
  } finally {
    process.exit(0);
  }
}

finalEmailSystemAnalysis();