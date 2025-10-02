const fs = require('fs');
const path = require('path');

async function analyzeRouteIntegrationDiscrepancy() {
  console.log('🔍 ROUTE INTEGRATION DISCREPANCY ANALYSIS');
  console.log('='.repeat(60));
  
  const routesDir = path.join(__dirname, 'routes');
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  console.log('📊 DETAILED ROUTE ANALYSIS:');
  console.log('='.repeat(60));
  
  let totalEmailRoutes = 0;
  let unifiedServiceRoutes = 0;
  let routesAnalyzed = [];
  
  for (const routeFile of routeFiles) {
    const routePath = path.join(routesDir, routeFile);
    const content = fs.readFileSync(routePath, 'utf8');
    
    // More precise email functionality detection
    const hasEmailFunctionality = content.includes('sendEmail') || 
                                 content.includes('notification') ||
                                 (content.includes('email') && content.includes('send'));
    
    const usesUnified = content.includes('unifiedNotificationService');
    const usesLegacyServices = content.includes('notificationService') && 
                              !content.includes('unifiedNotificationService');
    const usesLegacyHooks = content.includes('NotificationHooks') || 
                           content.includes('notificationHooks');
    const usesDirectEmail = content.includes('emailService-integrated');
    
    // Count actual email method calls
    const emailCalls = (content.match(/sendEmail|notification/g) || []).length;
    const actualEmailSending = content.includes('.sendEmail(') || 
                               content.includes('.onUserRegistration(') ||
                               content.includes('.onMerchantRegistration(') ||
                               content.includes('.onRedemptionRequested(') ||
                               content.includes('.onProfileStatusChange(') ||
                               content.includes('.onDealStatusChange(') ||
                               content.includes('.onPlanAssigned(') ||
                               content.includes('.onPasswordChangedByAdmin(');
    
    const routeAnalysis = {
      file: routeFile,
      hasEmailFunctionality,
      actualEmailSending,
      emailCalls,
      usesUnified,
      usesLegacyServices,
      usesLegacyHooks,
      usesDirectEmail,
      shouldBeCountedAsEmailRoute: actualEmailSending || usesUnified || usesLegacyServices || usesLegacyHooks
    };
    
    routesAnalyzed.push(routeAnalysis);
    
    console.log(`📄 ${routeFile}:`);
    console.log(`  Email functionality detected: ${hasEmailFunctionality ? '✅' : '❌'}`);
    console.log(`  Actual email sending: ${actualEmailSending ? '✅' : '❌'}`);
    console.log(`  Email call count: ${emailCalls}`);
    console.log(`  Uses unified service: ${usesUnified ? '✅' : '❌'}`);
    console.log(`  Uses legacy services: ${usesLegacyServices ? '⚠️' : '✅'}`);
    console.log(`  Uses legacy hooks: ${usesLegacyHooks ? '⚠️' : '✅'}`);
    console.log(`  Should count as email route: ${routeAnalysis.shouldBeCountedAsEmailRoute ? '✅' : '❌'}`);
    
    if (routeAnalysis.shouldBeCountedAsEmailRoute) {
      totalEmailRoutes++;
      if (usesUnified && !usesLegacyServices && !usesLegacyHooks) {
        unifiedServiceRoutes++;
      }
    }
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('📊 SUMMARY ANALYSIS:');
  console.log('='.repeat(60));
  
  console.log(`Total routes analyzed: ${routeFiles.length}`);
  console.log(`Routes with actual email functionality: ${totalEmailRoutes}`);
  console.log(`Routes using unified service properly: ${unifiedServiceRoutes}`);
  
  const currentPercentage = totalEmailRoutes > 0 ? (unifiedServiceRoutes / totalEmailRoutes) * 100 : 100;
  console.log(`Current integration percentage: ${currentPercentage.toFixed(1)}%`);
  
  // Identify the specific issues
  console.log('\n🔍 ROUTES CAUSING LOW PERCENTAGE:');
  const problematicRoutes = routesAnalyzed.filter(r => 
    r.shouldBeCountedAsEmailRoute && (!r.usesUnified || r.usesLegacyServices || r.usesLegacyHooks)
  );
  
  problematicRoutes.forEach(route => {
    console.log(`❌ ${route.file}:`);
    if (!route.usesUnified) {
      console.log(`   - Missing unifiedNotificationService import/usage`);
    }
    if (route.usesLegacyServices) {
      console.log(`   - Still uses legacy notificationService`);
    }
    if (route.usesLegacyHooks) {
      console.log(`   - Still uses legacy NotificationHooks`);
    }
  });
  
  // Identify routes that shouldn't be counted
  console.log('\n🔍 ROUTES INCORRECTLY COUNTED AS EMAIL ROUTES:');
  const incorrectlyCountedRoutes = routesAnalyzed.filter(r => 
    r.hasEmailFunctionality && !r.actualEmailSending && !r.shouldBeCountedAsEmailRoute
  );
  
  incorrectlyCountedRoutes.forEach(route => {
    console.log(`ℹ️ ${route.file}:`);
    console.log(`   - Detected as email route but only contains email references in queries/data`);
    console.log(`   - Should NOT be counted in integration percentage`);
  });
  
  // Calculate what the percentage SHOULD be
  const actualEmailRoutes = routesAnalyzed.filter(r => r.actualEmailSending);
  const properlyIntegratedRoutes = actualEmailRoutes.filter(r => 
    r.usesUnified && !r.usesLegacyServices && !r.usesLegacyHooks
  );
  
  console.log('\n📊 CORRECTED CALCULATION:');
  console.log(`Routes with actual email sending: ${actualEmailRoutes.length}`);
  console.log(`Properly integrated routes: ${properlyIntegratedRoutes.length}`);
  
  const correctedPercentage = actualEmailRoutes.length > 0 ? 
    (properlyIntegratedRoutes.length / actualEmailRoutes.length) * 100 : 100;
  
  console.log(`Corrected integration percentage: ${correctedPercentage.toFixed(1)}%`);
  
  if (correctedPercentage < 100) {
    console.log('\n🎯 ROUTES NEEDING FIXES:');
    const routesNeedingFixes = actualEmailRoutes.filter(r => 
      !r.usesUnified || r.usesLegacyServices || r.usesLegacyHooks
    );
    
    routesNeedingFixes.forEach(route => {
      console.log(`🔧 ${route.file} needs:`);
      if (!route.usesUnified) {
        console.log(`   - Add unifiedNotificationService import and usage`);
      }
      if (route.usesLegacyServices) {
        console.log(`   - Remove legacy notificationService usage`);
      }
      if (route.usesLegacyHooks) {
        console.log(`   - Replace NotificationHooks calls with unifiedNotificationService`);
      }
    });
  } else {
    console.log('\n🎉 ALL ROUTES ARE PROPERLY INTEGRATED!');
    console.log('The analysis logic needs to be corrected to show 100%');
  }
  
  return {
    totalAnalyzed: routeFiles.length,
    actualEmailRoutes: actualEmailRoutes.length,
    properlyIntegrated: properlyIntegratedRoutes.length,
    correctedPercentage: correctedPercentage,
    routesNeedingFixes: actualEmailRoutes.filter(r => 
      !r.usesUnified || r.usesLegacyServices || r.usesLegacyHooks
    ).map(r => r.file)
  };
}

analyzeRouteIntegrationDiscrepancy().then(result => {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL RESULT:');
  console.log('='.repeat(60));
  console.log(`Actual integration status: ${result.correctedPercentage.toFixed(1)}%`);
  
  if (result.correctedPercentage === 100) {
    console.log('✅ Route integration is actually 100% complete!');
    console.log('✅ The analysis needs to be updated to reflect this correctly.');
  } else {
    console.log(`❌ ${result.routesNeedingFixes.length} routes need fixes: ${result.routesNeedingFixes.join(', ')}`);
  }
  
  process.exit(0);
}).catch(error => {
  console.error('Analysis failed:', error);
  process.exit(1);
});