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
  console.log('='.repeat(70));
  console.log('🎯 POST-CLEANUP INCONSISTENCY ASSESSMENT');
  console.log('='.repeat(70));
  
  const inconsistencies = [];
  const warnings = [];
  const improvements = [];

  try {
    // 1. ARCHITECTURE ANALYSIS - POST CLEANUP
    console.log('\n1. 🏗️ FINAL ARCHITECTURE ANALYSIS:');
    const servicesDir = path.join(__dirname, 'services');
    const allFiles = fs.readdirSync(servicesDir);
    const emailServices = allFiles.filter(f => f.includes('email') || f.includes('notification'));
    
    console.log('📄 Email/Notification service files:');
    emailServices.forEach(file => console.log(`  - ${file}`));
    
    // Check for proper consolidation
    const expectedCoreFiles = ['emailService-integrated.js', 'unifiedNotificationService.js'];
    const unexpectedFiles = emailServices.filter(f => 
      !expectedCoreFiles.includes(f) && 
      !f.includes('whatsapp') && 
      !f.includes('scheduledTasks')
    );
    
    if (unexpectedFiles.length > 0) {
      inconsistencies.push({
        type: 'ARCHITECTURE',
        severity: 'MEDIUM',
        issue: `Unexpected service files still exist: ${unexpectedFiles.join(', ')}`,
        impact: 'Potential confusion about service usage',
        recommendation: 'Remove or document remaining files'
      });
    } else {
      console.log('✅ Clean architecture: Only expected service files remain');
    }

    // 2. SERVICE INTERFACE CONSISTENCY
    console.log('\n2. 🔌 SERVICE INTERFACE ANALYSIS:');
    
    // Check emailService-integrated.js methods
    const emailServicePath = path.join(servicesDir, 'emailService-integrated.js');
    const emailServiceContent = fs.readFileSync(emailServicePath, 'utf8');
    
    // Check unifiedNotificationService.js methods
    const unifiedServicePath = path.join(servicesDir, 'unifiedNotificationService.js');
    const unifiedServiceContent = fs.readFileSync(unifiedServicePath, 'utf8');
    
    // Extract sendEmail method signatures
    const emailServiceSendEmailMatch = emailServiceContent.match(/sendEmail\s*\(\s*\{([^}]+)\}\s*\)/);
    const unifiedServiceSendEmailMatch = unifiedServiceContent.match(/sendEmail\s*\(\s*\{([^}]+)\}\s*\)/);
    
    if (emailServiceSendEmailMatch && unifiedServiceSendEmailMatch) {
      const emailParams = emailServiceSendEmailMatch[1].split(',').map(p => p.trim().split(/[=:]/)[0].trim());
      const unifiedParams = unifiedServiceSendEmailMatch[1].split(',').map(p => p.trim().split(/[=:]/)[0].trim());
      
      console.log('📋 sendEmail parameters:');
      console.log(`  EmailService: [${emailParams.join(', ')}]`);
      console.log(`  UnifiedService: [${unifiedParams.join(', ')}]`);
      
      const missingInUnified = emailParams.filter(p => !unifiedParams.includes(p));
      const extraInUnified = unifiedParams.filter(p => !emailParams.includes(p));
      
      if (missingInUnified.length > 0 || extraInUnified.length > 0) {
        inconsistencies.push({
          type: 'METHOD_SIGNATURE',
          severity: 'LOW',
          issue: 'sendEmail method signatures differ between services',
          impact: 'Potential confusion when switching between services',
          recommendation: 'Ensure parameter compatibility'
        });
      } else {
        console.log('✅ Method signatures are consistent');
      }
    }

    // 3. ROUTE INTEGRATION ANALYSIS
    console.log('\n3. 🛣️ ROUTE INTEGRATION ANALYSIS:');
    const routesDir = path.join(__dirname, 'routes');
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    const routeAnalysis = {};
    let totalEmailRoutes = 0;
    let unifiedServiceRoutes = 0;
    let legacyPatternRoutes = 0;
    
    for (const routeFile of routeFiles) {
      const routePath = path.join(routesDir, routeFile);
      const content = fs.readFileSync(routePath, 'utf8');
      
      // Check for email-related functionality
      const hasEmailFunctionality = content.includes('sendEmail') || 
                                   content.includes('notification') ||
                                   content.includes('email');
      
      if (hasEmailFunctionality) {
        totalEmailRoutes++;
        
        const usesUnified = content.includes('unifiedNotificationService');
        const usesLegacyServices = content.includes('notificationService') && !content.includes('unifiedNotificationService');
        const usesLegacyHooks = content.includes('NotificationHooks') || content.includes('notificationHooks');
        const usesDirectEmail = content.includes('emailService-integrated');
        
        routeAnalysis[routeFile] = {
          hasEmailFunctionality,
          usesUnified,
          usesLegacyServices,
          usesLegacyHooks,
          usesDirectEmail
        };
        
        console.log(`📄 ${routeFile}:`);
        console.log(`  Unified Service: ${usesUnified ? '✅' : '❌'}`);
        console.log(`  Legacy Services: ${usesLegacyServices ? '⚠️' : '✅'}`);
        console.log(`  Legacy Hooks: ${usesLegacyHooks ? '⚠️' : '✅'}`);
        console.log(`  Direct Email: ${usesDirectEmail ? 'ℹ️' : '✅'}`);
        
        if (usesUnified) {
          unifiedServiceRoutes++;
        }
        
        if (usesLegacyServices || usesLegacyHooks) {
          legacyPatternRoutes++;
          inconsistencies.push({
            type: 'ROUTE_INTEGRATION',
            severity: 'MEDIUM',
            issue: `${routeFile} still uses legacy patterns`,
            impact: 'Inconsistent email service usage',
            recommendation: 'Update to use unifiedNotificationService exclusively'
          });
        }
        
        // Check for mixed patterns
        if (usesUnified && (usesLegacyServices || usesLegacyHooks)) {
          warnings.push({
            type: 'MIXED_PATTERNS',
            severity: 'LOW',
            issue: `${routeFile} mixes unified and legacy patterns`,
            impact: 'Code confusion and maintenance overhead',
            recommendation: 'Standardize on single service pattern'
          });
        }
      }
    }
    
    console.log(`\n📊 Route Integration Summary:`);
    console.log(`  Total routes with email functionality: ${totalEmailRoutes}`);
    console.log(`  Using unified service: ${unifiedServiceRoutes}`);
    console.log(`  Using legacy patterns: ${legacyPatternRoutes}`);
    
    const routeIntegrationScore = totalEmailRoutes > 0 ? (unifiedServiceRoutes / totalEmailRoutes) * 100 : 100;
    console.log(`  Integration completeness: ${routeIntegrationScore.toFixed(1)}%`);

    // 4. TEMPLATE SYSTEM CONSISTENCY
    console.log('\n4. 📧 TEMPLATE SYSTEM ANALYSIS:');
    
    const templatesDir = path.join(__dirname, 'templates', 'emails');
    const templateFiles = fs.readdirSync(templatesDir);
    
    console.log(`📁 Template files found: ${templateFiles.length}`);
    
    // Check naming conventions
    const hyphenatedTemplates = templateFiles.filter(f => f.includes('-'));
    const underscoreTemplates = templateFiles.filter(f => f.includes('_'));
    const mixedCaseTemplates = templateFiles.filter(f => /[A-Z]/.test(f.replace('.hbs', '')));
    
    console.log(`📝 Naming analysis:`);
    console.log(`  Underscore templates: ${underscoreTemplates.length}`);
    console.log(`  Hyphenated templates: ${hyphenatedTemplates.length}`);
    console.log(`  Mixed case templates: ${mixedCaseTemplates.length}`);
    
    if (hyphenatedTemplates.length > 0) {
      inconsistencies.push({
        type: 'TEMPLATE_NAMING',
        severity: 'HIGH',
        issue: `Templates still use hyphens: ${hyphenatedTemplates.join(', ')}`,
        impact: 'Template loading failures',
        recommendation: 'Rename to underscore convention'
      });
    }
    
    if (mixedCaseTemplates.length > 0) {
      warnings.push({
        type: 'TEMPLATE_NAMING',
        severity: 'LOW',
        issue: `Templates use mixed case: ${mixedCaseTemplates.join(', ')}`,
        impact: 'Potential case sensitivity issues',
        recommendation: 'Use lowercase with underscores'
      });
    }
    
    // Check database template usage
    const dbTemplateTypes = await queryAsync(`
      SELECT DISTINCT type, COUNT(*) as usage_count 
      FROM email_notifications 
      GROUP BY type 
      ORDER BY usage_count DESC
    `);
    
    console.log(`\n📊 Database template usage (top 10):`);
    dbTemplateTypes.slice(0, 10).forEach(row => {
      console.log(`  ${row.type}: ${row.usage_count} records`);
    });
    
    // Template file vs database consistency
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
        impact: 'Email sending failures',
        recommendation: 'Create missing template files immediately'
      });
    }

    // 5. DATABASE SCHEMA ANALYSIS
    console.log('\n5. 🗄️ DATABASE SCHEMA ANALYSIS:');
    
    // Check email_notifications table structure
    const notificationsStructure = await queryAsync('DESCRIBE email_notifications');
    console.log('📋 email_notifications columns:');
    notificationsStructure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`);
    });
    
    // Check for duplicate columns
    const messageIdColumns = notificationsStructure.filter(col => 
      col.Field === 'messageId' || col.Field === 'message_id'
    );
    
    if (messageIdColumns.length > 1) {
      inconsistencies.push({
        type: 'DATABASE_SCHEMA',
        severity: 'HIGH',
        issue: 'Duplicate message ID columns exist',
        impact: 'Data inconsistency and confusion',
        recommendation: 'Remove duplicate messageId column, keep message_id'
      });
    } else {
      console.log('✅ No duplicate message ID columns');
    }
    
    // Check for proper indexes
    const indexes = await queryAsync('SHOW INDEX FROM email_notifications');
    const indexedColumns = indexes.map(idx => idx.Column_name);
    
    const recommendedIndexes = ['recipient', 'type', 'status', 'created_at'];
    const missingIndexes = recommendedIndexes.filter(col => !indexedColumns.includes(col));
    
    if (missingIndexes.length > 0) {
      improvements.push({
        type: 'DATABASE_PERFORMANCE',
        severity: 'MEDIUM',
        issue: `Missing recommended indexes: ${missingIndexes.join(', ')}`,
        impact: 'Slower query performance on large datasets',
        recommendation: 'Add database indexes for better performance'
      });
    }

    // 6. ERROR HANDLING CONSISTENCY
    console.log('\n6. ⚠️ ERROR HANDLING ANALYSIS:');
    
    const errorPatterns = {};
    let totalEmailMethods = 0;
    let properErrorHandling = 0;
    
    // Check unified service error handling
    const unifiedServiceMethods = unifiedServiceContent.match(/async\s+\w+\s*\([^)]*\)\s*\{[^}]*try\s*\{[^}]*\}\s*catch\s*\([^)]*\)\s*\{/g) || [];
    totalEmailMethods += unifiedServiceMethods.length;
    properErrorHandling += unifiedServiceMethods.length;
    
    console.log(`📋 Error handling in unifiedNotificationService:`);
    console.log(`  Methods with try-catch: ${unifiedServiceMethods.length}`);
    
    // Check routes error handling
    for (const [routeFile, analysis] of Object.entries(routeAnalysis)) {
      if (analysis.hasEmailFunctionality) {
        const routePath = path.join(routesDir, routeFile);
        const content = fs.readFileSync(routePath, 'utf8');
        
        const hasTryCatch = content.includes('try {') && content.includes('catch');
        const hasEmailErrorHandling = content.includes('emailError') || content.includes('email') && content.includes('error');
        const hasConsoleError = content.includes('console.error');
        
        errorPatterns[routeFile] = {
          hasTryCatch,
          hasEmailErrorHandling,
          hasConsoleError,
          score: [hasTryCatch, hasEmailErrorHandling, hasConsoleError].filter(Boolean).length
        };
        
        console.log(`📄 ${routeFile}: Error handling score ${errorPatterns[routeFile].score}/3`);
        
        if (errorPatterns[routeFile].score < 2) {
          warnings.push({
            type: 'ERROR_HANDLING',
            severity: 'MEDIUM',
            issue: `${routeFile} has insufficient error handling for email operations`,
            impact: 'Email failures may go unnoticed',
            recommendation: 'Add comprehensive error handling and logging'
          });
        }
      }
    }

    // 7. CONFIGURATION CONSISTENCY
    console.log('\n7. ⚙️ CONFIGURATION ANALYSIS:');
    
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const optionalEnvVars = ['FRONTEND_URL', 'DISABLE_SMTP_VERIFY'];
    
    console.log('📧 SMTP Configuration:');
    let missingRequired = [];
    
    requiredEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      console.log(`  ${envVar}: ${isSet ? '✅ Set' : '❌ Missing'}`);
      if (!isSet) missingRequired.push(envVar);
    });
    
    console.log('\n🔧 Optional Configuration:');
    optionalEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      const value = isSet ? process.env[envVar] : 'Not set';
      console.log(`  ${envVar}: ${isSet ? '✅' : 'ℹ️'} ${value}`);
    });
    
    if (missingRequired.length > 0) {
      inconsistencies.push({
        type: 'CONFIGURATION',
        severity: 'CRITICAL',
        issue: `Missing required SMTP variables: ${missingRequired.join(', ')}`,
        impact: 'Email sending will fail completely',
        recommendation: 'Set all required SMTP configuration variables'
      });
    }

    // 8. FUNCTIONAL TESTING
    console.log('\n8. 🧪 FUNCTIONAL TESTING:');
    
    try {
      const unifiedService = require('./services/unifiedNotificationService');
      
      // Test core methods availability
      const coreMethods = [
        'sendEmail',
        'onUserRegistration', 
        'onMerchantRegistration',
        'onProfileStatusChange',
        'onPasswordChangedByAdmin',
        'onPlanAssigned',
        'onDealStatusChange',
        'onRedemptionResponse'
      ];
      
      const availableMethods = coreMethods.filter(method => typeof unifiedService[method] === 'function');
      
      console.log(`📋 Core methods availability: ${availableMethods.length}/${coreMethods.length}`);
      
      if (availableMethods.length < coreMethods.length) {
        const missingMethods = coreMethods.filter(method => typeof unifiedService[method] !== 'function');
        inconsistencies.push({
          type: 'MISSING_METHODS',
          severity: 'HIGH',
          issue: `Missing core methods in unifiedNotificationService: ${missingMethods.join(', ')}`,
          impact: 'Functionality gaps in email system',
          recommendation: 'Implement missing methods'
        });
      }
      
      // Test method signatures
      if (typeof unifiedService.sendEmail === 'function') {
        console.log('✅ Core sendEmail method available');
      }
      
    } catch (error) {
      inconsistencies.push({
        type: 'SERVICE_LOADING',
        severity: 'CRITICAL',
        issue: `Failed to load unifiedNotificationService: ${error.message}`,
        impact: 'Email system completely non-functional',
        recommendation: 'Fix service loading issues immediately'
      });
    }

    // 9. PERFORMANCE ANALYSIS
    console.log('\n9. 📊 PERFORMANCE ANALYSIS:');
    
    // Test template loading performance
    const templateLoadTests = ['user_welcome', 'admin_new_registration', 'password_reset'];
    let totalLoadTime = 0;
    let successfulLoads = 0;
    
    for (const templateType of templateLoadTests) {
      try {
        const start = Date.now();
        const emailService = require('./services/emailService-integrated');
        await emailService.getTemplate(templateType);
        const loadTime = Date.now() - start;
        totalLoadTime += loadTime;
        successfulLoads++;
        console.log(`📄 ${templateType}: ${loadTime}ms`);
      } catch (error) {
        console.log(`❌ ${templateType}: Load failed`);
      }
    }
    
    const avgLoadTime = successfulLoads > 0 ? totalLoadTime / successfulLoads : 0;
    console.log(`📈 Average template load time: ${avgLoadTime.toFixed(0)}ms`);
    
    if (avgLoadTime > 1000) {
      improvements.push({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        issue: `Template loading is slow (${avgLoadTime.toFixed(0)}ms average)`,
        impact: 'Slower email sending performance',
        recommendation: 'Implement template caching or optimize template loading'
      });
    }

    // COMPREHENSIVE SUMMARY
    console.log('\n' + '='.repeat(70));
    console.log('📋 FINAL COMPREHENSIVE ANALYSIS SUMMARY');
    console.log('='.repeat(70));
    
    const totalIssues = inconsistencies.length + warnings.length;
    const criticalIssues = inconsistencies.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = inconsistencies.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = inconsistencies.filter(i => i.severity === 'MEDIUM').length;
    const lowIssues = [...inconsistencies, ...warnings].filter(i => i.severity === 'LOW').length;
    
    console.log(`\n🎯 FINAL ASSESSMENT:`);
    console.log(`Total Issues Found: ${totalIssues}`);
    console.log(`├─ Critical: ${criticalIssues}`);
    console.log(`├─ High: ${highIssues}`);
    console.log(`├─ Medium: ${mediumIssues}`);
    console.log(`└─ Low: ${lowIssues}`);
    console.log(`Improvements Suggested: ${improvements.length}`);
    
    // Detailed issue breakdown
    if (criticalIssues > 0) {
      console.log('\n🚨 CRITICAL ISSUES (Fix Immediately):');
      inconsistencies.filter(i => i.severity === 'CRITICAL').forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.issue}`);
        console.log(`   💥 Impact: ${issue.impact}`);
        console.log(`   🔧 Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (highIssues > 0) {
      console.log('\n⚠️ HIGH PRIORITY ISSUES:');
      inconsistencies.filter(i => i.severity === 'HIGH').forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.issue}`);
        console.log(`   📍 Impact: ${issue.impact}`);
        console.log(`   🛠️ Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (mediumIssues > 0) {
      console.log('\n📋 MEDIUM PRIORITY ISSUES:');
      inconsistencies.filter(i => i.severity === 'MEDIUM').forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.issue}`);
        console.log(`   📊 Impact: ${issue.impact}`);
        console.log(`   🔨 Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (lowIssues > 0) {
      console.log('\nℹ️ LOW PRIORITY WARNINGS:');
      [...inconsistencies, ...warnings].filter(i => i.severity === 'LOW').forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.type}: ${warning.issue}`);
        console.log(`   💡 Impact: ${warning.impact}`);
        console.log(`   📝 Suggestion: ${warning.recommendation}\n`);
      });
    }
    
    if (improvements.length > 0) {
      console.log('\n✨ SUGGESTED IMPROVEMENTS:');
      improvements.forEach((improvement, index) => {
        console.log(`${index + 1}. ${improvement.type}: ${improvement.issue}`);
        console.log(`   🚀 Benefit: ${improvement.impact}`);
        console.log(`   🎯 Action: ${improvement.recommendation}\n`);
      });
    }
    
    // Calculate final health score
    const maxScore = 100;
    const criticalPenalty = criticalIssues * 30;
    const highPenalty = highIssues * 20;
    const mediumPenalty = mediumIssues * 10;
    const lowPenalty = lowIssues * 5;
    
    const totalPenalty = criticalPenalty + highPenalty + mediumPenalty + lowPenalty;
    const healthScore = Math.max(0, maxScore - totalPenalty);
    
    console.log(`\n🏥 EMAIL SYSTEM HEALTH SCORE: ${healthScore}/100`);
    
    // Status determination
    let status, emoji, message;
    if (healthScore >= 95) {
      status = 'EXCELLENT';
      emoji = '🎉';
      message = 'Email system is in exceptional condition!';
    } else if (healthScore >= 85) {
      status = 'VERY GOOD';
      emoji = '✅';
      message = 'Email system is well-maintained with minor optimizations needed.';
    } else if (healthScore >= 75) {
      status = 'GOOD';
      emoji = '👍';
      message = 'Email system is functional with some improvements recommended.';
    } else if (healthScore >= 60) {
      status = 'FAIR';
      emoji = '⚠️';
      message = 'Email system has several issues that should be addressed.';
    } else {
      status = 'POOR';
      emoji = '🚨';
      message = 'Email system has critical issues requiring immediate attention.';
    }
    
    console.log(`${emoji} OVERALL STATUS: ${status}`);
    console.log(`📝 ${message}`);
    
    // Cleanup progress assessment
    console.log(`\n📈 CLEANUP PROGRESS ASSESSMENT:`);
    console.log(`✅ Architecture Consolidation: ${unexpectedFiles.length === 0 ? 'Complete' : 'Partial'}`);
    console.log(`✅ Route Integration: ${routeIntegrationScore.toFixed(1)}% complete`);
    console.log(`✅ Template Consistency: ${hyphenatedTemplates.length === 0 ? 'Complete' : 'Needs work'}`);
    console.log(`✅ Database Schema: ${messageIdColumns.length <= 1 ? 'Clean' : 'Needs cleanup'}`);
    console.log(`✅ Error Handling: ${properErrorHandling > 0 ? 'Implemented' : 'Needs improvement'}`);

  } catch (error) {
    console.error('❌ Analysis error:', error);
    inconsistencies.push({
      type: 'ANALYSIS_ERROR',
      severity: 'CRITICAL',
      issue: `Failed to complete analysis: ${error.message}`,
      impact: 'Cannot assess system health',
      recommendation: 'Fix analysis errors and re-run assessment'
    });
  } finally {
    process.exit(0);
  }
}

finalEmailSystemAnalysis();