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
  console.log('🔍 COMPREHENSIVE EMAIL SYSTEM ANALYSIS - POST FIXES');
  console.log('='.repeat(80));
  console.log('🎯 DETAILED INCONSISTENCY ASSESSMENT');
  console.log('='.repeat(80));
  
  const inconsistencies = [];
  const warnings = [];
  const improvements = [];
  const criticalIssues = [];

  try {
    // 1. ARCHITECTURE ANALYSIS
    console.log('\n1. 🏗️ ARCHITECTURE ANALYSIS:');
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
        type: 'ARCHITECTURE_FRAGMENTATION',
        severity: 'MEDIUM',
        issue: `Unexpected service files detected: ${unexpectedFiles.join(', ')}`,
        impact: 'Potential service confusion and maintenance overhead',
        recommendation: 'Consolidate or clearly document purpose of additional services'
      });
    } else {
      console.log('✅ Clean architecture: Only core services remain');
    }

    // 2. SERVICE DEPENDENCY ANALYSIS
    console.log('\n2. 🔗 SERVICE DEPENDENCY ANALYSIS:');
    
    // Check emailService-integrated.js dependencies
    const emailServicePath = path.join(servicesDir, 'emailService-integrated.js');
    const emailServiceContent = fs.readFileSync(emailServicePath, 'utf8');
    
    // Check unifiedNotificationService.js dependencies
    const unifiedServicePath = path.join(servicesDir, 'unifiedNotificationService.js');
    const unifiedServiceContent = fs.readFileSync(unifiedServicePath, 'utf8');
    
    // Analyze dependency patterns
    const emailServiceDeps = emailServiceContent.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
    const unifiedServiceDeps = unifiedServiceContent.match(/require\(['"`]([^'"`]+)['"`]\)/g) || [];
    
    console.log('📋 emailService-integrated.js dependencies:');
    emailServiceDeps.forEach(dep => console.log(`  ${dep}`));
    
    console.log('📋 unifiedNotificationService.js dependencies:');
    unifiedServiceDeps.forEach(dep => console.log(`  ${dep}`));
    
    // Check for circular dependencies
    const hasCircularDep = unifiedServiceContent.includes("require('./emailService-integrated')") &&
                          emailServiceContent.includes("require('./unifiedNotificationService')");
    
    if (hasCircularDep) {
      criticalIssues.push({
        type: 'CIRCULAR_DEPENDENCY',
        severity: 'CRITICAL',
        issue: 'Circular dependency detected between core email services',
        impact: 'Risk of module loading failures and runtime errors',
        recommendation: 'Refactor to eliminate circular imports'
      });
    }

    // 3. METHOD INTERFACE CONSISTENCY
    console.log('\n3. 🔌 METHOD INTERFACE CONSISTENCY:');
    
    // Extract all public methods from both services
    const emailServiceMethods = emailServiceContent.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g) || [];
    const unifiedServiceMethods = unifiedServiceContent.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g) || [];
    
    console.log(`📊 emailService-integrated.js methods: ${emailServiceMethods.length}`);
    console.log(`📊 unifiedNotificationService.js methods: ${unifiedServiceMethods.length}`);
    
    // Check for sendEmail method consistency
    const emailServiceSendEmailMatch = emailServiceContent.match(/sendEmail\s*\(\s*\{([^}]+)\}/);
    const unifiedServiceSendEmailMatch = unifiedServiceContent.match(/sendEmail\s*\(\s*\{([^}]+)\}/);
    
    if (emailServiceSendEmailMatch && unifiedServiceSendEmailMatch) {
      const emailParams = emailServiceSendEmailMatch[1].split(',').map(p => p.trim().split(/[=:]/)[0].trim());
      const unifiedParams = unifiedServiceSendEmailMatch[1].split(',').map(p => p.trim().split(/[=:]/)[0].trim());
      
      console.log('📋 sendEmail parameter analysis:');
      console.log(`  Core service: [${emailParams.join(', ')}]`);
      console.log(`  Unified service: [${unifiedParams.join(', ')}]`);
      
      const paramDifferences = emailParams.filter(p => !unifiedParams.includes(p))
                             .concat(unifiedParams.filter(p => !emailParams.includes(p)));
      
      if (paramDifferences.length > 0) {
        inconsistencies.push({
          type: 'METHOD_SIGNATURE_MISMATCH',
          severity: 'MEDIUM',
          issue: `sendEmail parameter mismatch: ${paramDifferences.join(', ')}`,
          impact: 'Potential runtime errors when switching between services',
          recommendation: 'Standardize sendEmail method signatures across services'
        });
      }
    }

    // 4. ROUTE INTEGRATION DEEP ANALYSIS
    console.log('\n4. 🛣️ ROUTE INTEGRATION DEEP ANALYSIS:');
    const routesDir = path.join(__dirname, 'routes');
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    const routeAnalysis = {};
    let totalEmailRoutes = 0;
    let unifiedServiceRoutes = 0;
    let legacyPatternRoutes = 0;
    let missingErrorHandling = 0;
    
    for (const routeFile of routeFiles) {
      const routePath = path.join(routesDir, routeFile);
      const content = fs.readFileSync(routePath, 'utf8');
      
      // More precise email functionality detection - only count routes that actually send emails
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
      
      const hasEmailFunctionality = actualEmailSending;
      
      if (hasEmailFunctionality) {
        totalEmailRoutes++;
        
        const usesUnified = content.includes('unifiedNotificationService');
        const usesLegacyServices = content.includes('notificationService') && 
                                  !content.includes('unifiedNotificationService');
        const usesLegacyHooks = content.includes('NotificationHooks') || 
                               content.includes('notificationHooks');
        const usesDirectEmail = content.includes('emailService-integrated');
        const hasProperErrorHandling = content.includes('try {') && 
                                      content.includes('catch') &&
                                      content.includes('console.error');
        
        routeAnalysis[routeFile] = {
          hasEmailFunctionality,
          usesUnified,
          usesLegacyServices,
          usesLegacyHooks,
          usesDirectEmail,
          hasProperErrorHandling,
          emailCallCount: (content.match(/sendEmail|notification/g) || []).length
        };
        
        console.log(`📄 ${routeFile}:`);
        console.log(`  Email calls: ${routeAnalysis[routeFile].emailCallCount}`);
        console.log(`  Unified service: ${usesUnified ? '✅' : '❌'}`);
        console.log(`  Legacy patterns: ${usesLegacyServices || usesLegacyHooks ? '⚠️' : '✅'}`);
        console.log(`  Error handling: ${hasProperErrorHandling ? '✅' : '❌'}`);
        
        if (usesUnified) {
          unifiedServiceRoutes++;
        }
        
        if (usesLegacyServices || usesLegacyHooks) {
          legacyPatternRoutes++;
          inconsistencies.push({
            type: 'LEGACY_PATTERN_USAGE',
            severity: 'MEDIUM',
            issue: `${routeFile} still uses legacy email patterns`,
            impact: 'Inconsistent email service usage across application',
            recommendation: `Update ${routeFile} to use unifiedNotificationService exclusively`
          });
        }
        
        if (!hasProperErrorHandling) {
          missingErrorHandling++;
          warnings.push({
            type: 'INSUFFICIENT_ERROR_HANDLING',
            severity: 'LOW',
            issue: `${routeFile} lacks comprehensive error handling for email operations`,
            impact: 'Email failures may go unnoticed or cause application instability',
            recommendation: 'Add try-catch blocks and proper error logging for email operations'
          });
        }
        
        // Check for mixed patterns
        if (usesUnified && (usesLegacyServices || usesLegacyHooks)) {
          warnings.push({
            type: 'MIXED_SERVICE_PATTERNS',
            severity: 'LOW',
            issue: `${routeFile} mixes unified and legacy email patterns`,
            impact: 'Code confusion and maintenance overhead',
            recommendation: 'Standardize on unified service pattern throughout file'
          });
        }
      }
    }
    
    console.log(`\n📊 Route Integration Summary:`);
    console.log(`  Total routes with email functionality: ${totalEmailRoutes}`);
    console.log(`  Using unified service: ${unifiedServiceRoutes}`);
    console.log(`  Using legacy patterns: ${legacyPatternRoutes}`);
    console.log(`  Missing error handling: ${missingErrorHandling}`);
    
    const integrationCompleteness = totalEmailRoutes > 0 ? (unifiedServiceRoutes / totalEmailRoutes) * 100 : 100;
    console.log(`  Integration completeness: ${integrationCompleteness.toFixed(1)}%`);

    // 5. TEMPLATE SYSTEM COMPREHENSIVE ANALYSIS
    console.log('\n5. 📧 TEMPLATE SYSTEM COMPREHENSIVE ANALYSIS:');
    
    const templatesDir = path.join(__dirname, 'templates', 'emails');
    const templateFiles = fs.readdirSync(templatesDir);
    
    console.log(`📁 Template files found: ${templateFiles.length}`);
    
    // Detailed naming convention analysis
    const namingPatterns = {
      underscore: templateFiles.filter(f => f.includes('_') && !f.includes('-')),
      hyphenated: templateFiles.filter(f => f.includes('-') && !f.includes('_')),
      mixed: templateFiles.filter(f => f.includes('_') && f.includes('-')),
      camelCase: templateFiles.filter(f => /[A-Z]/.test(f.replace('.hbs', '')) && !f.includes('_') && !f.includes('-')),
      lowercase: templateFiles.filter(f => f === f.toLowerCase() && !f.includes('_') && !f.includes('-'))
    };
    
    console.log(`📝 Detailed naming analysis:`);
    Object.entries(namingPatterns).forEach(([pattern, files]) => {
      console.log(`  ${pattern}: ${files.length} files`);
      if (files.length > 0 && files.length <= 3) {
        console.log(`    ${files.join(', ')}`);
      }
    });
    
    if (namingPatterns.hyphenated.length > 0) {
      inconsistencies.push({
        type: 'TEMPLATE_NAMING_INCONSISTENCY',
        severity: 'HIGH',
        issue: `Templates using hyphens: ${namingPatterns.hyphenated.join(', ')}`,
        impact: 'Template loading failures due to naming convention mismatch',
        recommendation: 'Rename all templates to use underscore convention'
      });
    }
    
    if (namingPatterns.mixed.length > 0) {
      inconsistencies.push({
        type: 'TEMPLATE_NAMING_INCONSISTENCY',
        severity: 'MEDIUM',
        issue: `Templates with mixed naming: ${namingPatterns.mixed.join(', ')}`,
        impact: 'Confusion in template naming standards',
        recommendation: 'Standardize on single naming convention'
      });
    }
    
    // Template usage analysis
    const dbTemplateTypes = await queryAsync(`
      SELECT type, COUNT(*) as usage_count 
      FROM email_notifications 
      GROUP BY type 
      ORDER BY usage_count DESC
    `);
    
    console.log(`\n📊 Database template usage analysis:`);
    dbTemplateTypes.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.type}: ${row.usage_count} records`);
    });
    
    const fileTemplateNames = templateFiles.map(f => f.replace('.hbs', ''));
    const dbTemplateNames = dbTemplateTypes.map(t => t.type);
    
    const orphanedFiles = fileTemplateNames.filter(f => !dbTemplateNames.includes(f));
    const missingFiles = dbTemplateNames.filter(d => !fileTemplateNames.includes(d));
    
    if (orphanedFiles.length > 0) {
      warnings.push({
        type: 'ORPHANED_TEMPLATES',
        severity: 'LOW',
        issue: `Template files not used in database: ${orphanedFiles.join(', ')}`,
        impact: 'Unused files consuming disk space and causing confusion',
        recommendation: 'Remove unused templates or implement corresponding functionality'
      });
    }
    
    if (missingFiles.length > 0) {
      criticalIssues.push({
        type: 'MISSING_TEMPLATE_FILES',
        severity: 'CRITICAL',
        issue: `Database references missing templates: ${missingFiles.join(', ')}`,
        impact: 'Email sending failures for these template types',
        recommendation: 'Create missing template files immediately'
      });
    }

    // 6. DATABASE SCHEMA INTEGRITY ANALYSIS
    console.log('\n6. 🗄️ DATABASE SCHEMA INTEGRITY ANALYSIS:');
    
    // Check email_notifications table structure
    const notificationsStructure = await queryAsync('DESCRIBE email_notifications');
    console.log('📋 email_notifications table structure:');
    notificationsStructure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    // Check for proper indexes
    const indexes = await queryAsync('SHOW INDEX FROM email_notifications');
    const indexedColumns = [...new Set(indexes.map(idx => idx.Column_name))];
    
    console.log(`📊 Indexed columns: ${indexedColumns.join(', ')}`);
    
    const recommendedIndexes = ['recipient', 'type', 'status', 'created_at', 'scheduled_for'];
    const missingIndexes = recommendedIndexes.filter(col => !indexedColumns.includes(col));
    
    if (missingIndexes.length > 0) {
      improvements.push({
        type: 'DATABASE_PERFORMANCE_OPTIMIZATION',
        severity: 'MEDIUM',
        issue: `Missing recommended indexes: ${missingIndexes.join(', ')}`,
        impact: 'Slower query performance on large email datasets',
        recommendation: 'Add database indexes for frequently queried columns'
      });
    }
    
    // Check for data integrity issues
    const integrityChecks = [
      {
        name: 'Orphaned email records',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'sent' AND sent_at IS NULL"
      },
      {
        name: 'Invalid status combinations',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE status = 'failed' AND error IS NULL"
      },
      {
        name: 'Future scheduled emails',
        query: "SELECT COUNT(*) as count FROM email_notifications WHERE scheduled_for < NOW() AND status = 'pending'"
      }
    ];
    
    for (const check of integrityChecks) {
      try {
        const result = await queryAsync(check.query);
        const count = result[0]?.count || 0;
        console.log(`🔍 ${check.name}: ${count} records`);
        
        if (count > 0) {
          warnings.push({
            type: 'DATA_INTEGRITY_ISSUE',
            severity: 'LOW',
            issue: `Found ${count} records with ${check.name.toLowerCase()}`,
            impact: 'Potential data inconsistency in email tracking',
            recommendation: 'Review and clean up inconsistent email records'
          });
        }
      } catch (error) {
        console.warn(`❌ Failed to check ${check.name}:`, error.message);
      }
    }

    // 7. CONFIGURATION CONSISTENCY ANALYSIS
    console.log('\n7. ⚙️ CONFIGURATION CONSISTENCY ANALYSIS:');
    
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const optionalEnvVars = ['FRONTEND_URL', 'DISABLE_SMTP_VERIFY', 'EMAIL_FROM'];
    
    console.log('📧 SMTP Configuration validation:');
    let missingRequired = [];
    
    requiredEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      const value = isSet ? '***' : 'Not set';
      console.log(`  ${envVar}: ${isSet ? '✅' : '❌'} ${value}`);
      if (!isSet) missingRequired.push(envVar);
    });
    
    console.log('\n🔧 Optional Configuration:');
    optionalEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      const value = isSet ? process.env[envVar] : 'Not set';
      console.log(`  ${envVar}: ${isSet ? '✅' : 'ℹ️'} ${value}`);
    });
    
    if (missingRequired.length > 0) {
      criticalIssues.push({
        type: 'MISSING_SMTP_CONFIGURATION',
        severity: 'CRITICAL',
        issue: `Missing required SMTP variables: ${missingRequired.join(', ')}`,
        impact: 'Email sending will fail completely',
        recommendation: 'Set all required SMTP configuration variables in environment'
      });
    }

    // 8. FUNCTIONAL INTEGRATION TESTING
    console.log('\n8. 🧪 FUNCTIONAL INTEGRATION TESTING:');
    
    try {
      const unifiedService = require('./services/unifiedNotificationService');
      
      // Test core method availability
      const coreMethods = [
        'sendEmail',
        'onUserRegistration', 
        'onMerchantRegistration',
        'onProfileStatusChange',
        'onPasswordChangedByAdmin',
        'onPlanAssigned',
        'onDealStatusChange',
        'onRedemptionRequested',
        'onRedemptionResponse',
        'onPlanExpiryCheck',
        'onMonthlyLimitsRenewal'
      ];
      
      const availableMethods = coreMethods.filter(method => typeof unifiedService[method] === 'function');
      const missingMethods = coreMethods.filter(method => typeof unifiedService[method] !== 'function');
      
      console.log(`📋 Core methods availability: ${availableMethods.length}/${coreMethods.length}`);
      
      if (missingMethods.length > 0) {
        criticalIssues.push({
          type: 'MISSING_CORE_METHODS',
          severity: 'CRITICAL',
          issue: `Missing core methods: ${missingMethods.join(', ')}`,
          impact: 'Incomplete email functionality',
          recommendation: 'Implement all required notification methods'
        });
      }
      
      // Test method parameter validation
      try {
        // Test with invalid parameters
        const testResult = await unifiedService.sendEmail({});
        if (testResult && testResult.success) {
          warnings.push({
            type: 'INSUFFICIENT_PARAMETER_VALIDATION',
            severity: 'LOW',
            issue: 'sendEmail accepts empty parameters without validation',
            impact: 'Potential runtime errors with invalid email data',
            recommendation: 'Add comprehensive parameter validation to sendEmail method'
          });
        }
      } catch (validationError) {
        console.log('✅ Parameter validation working correctly');
      }
      
    } catch (error) {
      criticalIssues.push({
        type: 'SERVICE_LOADING_FAILURE',
        severity: 'CRITICAL',
        issue: `Failed to load unifiedNotificationService: ${error.message}`,
        impact: 'Email system completely non-functional',
        recommendation: 'Fix service loading issues and dependencies'
      });
    }

    // 9. PERFORMANCE AND SCALABILITY ANALYSIS
    console.log('\n9. 📊 PERFORMANCE AND SCALABILITY ANALYSIS:');
    
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
        console.log(`❌ ${templateType}: Load failed - ${error.message}`);
      }
    }
    
    const avgLoadTime = successfulLoads > 0 ? totalLoadTime / successfulLoads : 0;
    console.log(`📈 Average template load time: ${avgLoadTime.toFixed(0)}ms`);
    
    if (avgLoadTime > 500) {
      improvements.push({
        type: 'TEMPLATE_PERFORMANCE_OPTIMIZATION',
        severity: 'MEDIUM',
        issue: `Template loading is slow (${avgLoadTime.toFixed(0)}ms average)`,
        impact: 'Slower email sending performance',
        recommendation: 'Implement template caching or optimize template loading mechanism'
      });
    }
    
    // Check email queue size and processing
    try {
      const queueSize = await queryAsync("SELECT COUNT(*) as count FROM email_notifications WHERE status = 'pending'");
      const queueCount = queueSize[0]?.count || 0;
      
      console.log(`📬 Email queue size: ${queueCount} pending emails`);
      
      if (queueCount > 100) {
        warnings.push({
          type: 'LARGE_EMAIL_QUEUE',
          severity: 'MEDIUM',
          issue: `Large email queue detected: ${queueCount} pending emails`,
          impact: 'Potential email delivery delays',
          recommendation: 'Review email processing capacity and consider optimization'
        });
      }
    } catch (error) {
      console.warn('Could not check email queue size:', error.message);
    }

    // COMPREHENSIVE SUMMARY
    console.log('\n' + '='.repeat(80));
    console.log('📋 COMPREHENSIVE EMAIL SYSTEM ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    
    const allIssues = [...criticalIssues, ...inconsistencies, ...warnings];
    const totalIssues = allIssues.length;
    const criticalCount = criticalIssues.length;
    const highCount = inconsistencies.filter(i => i.severity === 'HIGH').length;
    const mediumCount = [...inconsistencies, ...warnings].filter(i => i.severity === 'MEDIUM').length;
    const lowCount = [...inconsistencies, ...warnings].filter(i => i.severity === 'LOW').length;
    
    console.log(`\n🎯 COMPREHENSIVE ASSESSMENT:`);
    console.log(`Total Issues Found: ${totalIssues}`);
    console.log(`├─ Critical: ${criticalCount} 🚨`);
    console.log(`├─ High: ${highCount} ⚠️`);
    console.log(`├─ Medium: ${mediumCount} 📋`);
    console.log(`└─ Low: ${lowCount} ℹ️`);
    console.log(`Improvements Suggested: ${improvements.length} ✨`);
    
    // Detailed issue breakdown
    if (criticalCount > 0) {
      console.log('\n🚨 CRITICAL ISSUES (Fix Immediately):');
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.issue}`);
        console.log(`   💥 Impact: ${issue.impact}`);
        console.log(`   🔧 Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (highCount > 0) {
      console.log('\n⚠️ HIGH PRIORITY ISSUES:');
      inconsistencies.filter(i => i.severity === 'HIGH').forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.issue}`);
        console.log(`   📍 Impact: ${issue.impact}`);
        console.log(`   🛠️ Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (mediumCount > 0) {
      console.log('\n📋 MEDIUM PRIORITY ISSUES:');
      [...inconsistencies, ...warnings].filter(i => i.severity === 'MEDIUM').forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.issue}`);
        console.log(`   📊 Impact: ${issue.impact}`);
        console.log(`   🔨 Fix: ${issue.recommendation}\n`);
      });
    }
    
    if (lowCount > 0) {
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
    
    // Calculate comprehensive health score
    const maxScore = 100;
    const criticalPenalty = criticalCount * 40;
    const highPenalty = highCount * 25;
    const mediumPenalty = mediumCount * 15;
    const lowPenalty = lowCount * 5;
    
    const totalPenalty = criticalPenalty + highPenalty + mediumPenalty + lowPenalty;
    const healthScore = Math.max(0, maxScore - totalPenalty);
    
    console.log(`\n🏥 COMPREHENSIVE EMAIL SYSTEM HEALTH SCORE: ${healthScore}/100`);
    
    // Enhanced status determination
    let status, emoji, message, actionable;
    if (healthScore >= 95) {
      status = 'EXCELLENT';
      emoji = '🎉';
      message = 'Email system is in exceptional condition with minimal issues!';
      actionable = 'Focus on suggested improvements for optimization.';
    } else if (healthScore >= 85) {
      status = 'VERY GOOD';
      emoji = '✅';
      message = 'Email system is well-maintained with minor optimizations needed.';
      actionable = 'Address medium priority issues when convenient.';
    } else if (healthScore >= 75) {
      status = 'GOOD';
      emoji = '👍';
      message = 'Email system is functional with some improvements recommended.';
      actionable = 'Plan to address medium and high priority issues.';
    } else if (healthScore >= 60) {
      status = 'FAIR';
      emoji = '⚠️';
      message = 'Email system has several issues that should be addressed.';
      actionable = 'Address high and critical issues promptly.';
    } else if (healthScore >= 40) {
      status = 'POOR';
      emoji = '🚨';
      message = 'Email system has significant issues requiring immediate attention.';
      actionable = 'Immediate action required on critical and high priority issues.';
    } else {
      status = 'CRITICAL';
      emoji = '💥';
      message = 'Email system has severe issues that may cause failures.';
      actionable = 'URGENT: Address all critical issues before using in production.';
    }
    
    console.log(`${emoji} OVERALL STATUS: ${status}`);
    console.log(`📝 ${message}`);
    console.log(`🎯 ${actionable}`);
    
    // Detailed metrics
    console.log(`\n📊 DETAILED METRICS:`);
    console.log(`✅ Architecture Consolidation: ${unexpectedFiles.length === 0 ? 'Complete' : 'Needs work'}`);
    console.log(`✅ Route Integration: ${integrationCompleteness.toFixed(1)}% complete`);
    console.log(`✅ Template Consistency: ${namingPatterns.hyphenated.length === 0 ? 'Complete' : 'Needs work'}`);
    console.log(`✅ Database Schema: ${missingIndexes.length === 0 ? 'Optimized' : 'Needs optimization'}`);
    console.log(`✅ Error Handling: ${missingErrorHandling === 0 ? 'Complete' : `${missingErrorHandling} routes need improvement`}`);
    console.log(`✅ Performance: ${avgLoadTime < 500 ? 'Good' : 'Needs optimization'} (${avgLoadTime.toFixed(0)}ms avg)`);

  } catch (error) {
    console.error('❌ Analysis error:', error);
    criticalIssues.push({
      type: 'ANALYSIS_SYSTEM_ERROR',
      severity: 'CRITICAL',
      issue: `Failed to complete comprehensive analysis: ${error.message}`,
      impact: 'Cannot fully assess system health and integrity',
      recommendation: 'Fix analysis system errors and re-run comprehensive assessment'
    });
  } finally {
    process.exit(0);
  }
}

comprehensiveEmailAnalysis();
