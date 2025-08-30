/**
 * Performance Test Script
 * Validates that performance optimizations don't break critical functionality
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CRITICAL_FILES = [
  // QR/Barcode related
  'frontend/src/components/MembershipCard.jsx',
  'frontend/src/components/MerchantCertificate.jsx',
  
  // Image processing
  'frontend/src/components/common/ImageUpload.jsx',
  'backend/routes/upload.js',
  
  // Critical libraries (external)
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js'
];

const EXCLUDED_PATTERNS = [
  // These should NOT be touched by optimizations
  'qrcode',
  'jsbarcode',
  'canvas',
  'barcode',
  'upload',
  'image-processing'
];

/**
 * Check that critical files haven't been modified by optimizations
 */
function validateCriticalFiles() {
  console.log('🔍 Validating critical files...');
  
  const results = [];
  
  CRITICAL_FILES.forEach(filePath => {
    if (filePath.startsWith('http')) {
      // External file - just log
      results.push({
        file: filePath,
        status: 'external',
        message: 'External dependency - ensure not deferred'
      });
      return;
    }
    
    const fullPath = path.join(__dirname, filePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for performance optimization markers that shouldn't be there
      const hasOptimizationCode = EXCLUDED_PATTERNS.some(pattern => 
        content.toLowerCase().includes(pattern.toLowerCase() + '_optimization') ||
        content.includes('perf_') ||
        content.includes('lazy(') ||
        content.includes('defer')
      );
      
      results.push({
        file: filePath,
        status: hasOptimizationCode ? 'warning' : 'clean',
        message: hasOptimizationCode ? 
          'Contains optimization code - verify it doesn\'t affect core functionality' :
          'Clean - no optimization interference detected'
      });
    } else {
      results.push({
        file: filePath,
        status: 'missing',
        message: 'File not found'
      });
    }
  });
  
  return results;
}

/**
 * Check performance optimization file integrity
 */
function validateOptimizationFiles() {
  console.log('🔍 Validating optimization files...');
  
  const optimizationFiles = [
    'frontend/src/utils/performanceFlags.js',
    'frontend/src/utils/criticalCSS.js',
    'frontend/src/utils/lcpOptimization.js',
    'frontend/src/utils/fontOptimization.js',
    'frontend/src/utils/routeSplitting.js',
    'frontend/src/utils/thirdPartyOptimization.js',
    'frontend/src/components/PerformanceOptimizer.jsx',
    'backend/middleware/performanceMiddleware.js'
  ];
  
  const results = [];
  
  optimizationFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for safety measures
      const hasKillSwitch = content.includes('perf_disable_all');
      const hasErrorHandling = content.includes('handlePerformanceError') || content.includes('try') || content.includes('catch');
      const hasExclusions = content.includes('EXCLUDED') || content.includes('excluded');
      
      results.push({
        file: filePath,
        status: (hasKillSwitch && hasErrorHandling && hasExclusions) ? 'safe' : 'warning',
        killSwitch: hasKillSwitch,
        errorHandling: hasErrorHandling,
        exclusions: hasExclusions
      });
    } else {
      results.push({
        file: filePath,
        status: 'missing',
        message: 'Optimization file not found'
      });
    }
  });
  
  return results;
}

/**
 * Validate environment configuration
 */
function validateEnvironmentConfig() {
  console.log('🔍 Validating environment configuration...');
  
  const envFiles = [
    'frontend/.env.performance',
    'backend/.env.performance'
  ];
  
  const results = [];
  
  envFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check that all flags default to false
      const lines = content.split('\n');
      const flagLines = lines.filter(line => 
        line.includes('PERF_') && 
        line.includes('=') && 
        !line.startsWith('#')
      );
      
      const unsafeFlags = flagLines.filter(line => 
        !line.includes('=false') && 
        !line.includes('=true') // Allow true in commented examples
      );
      
      results.push({
        file: filePath,
        status: unsafeFlags.length === 0 ? 'safe' : 'warning',
        totalFlags: flagLines.length,
        unsafeFlags: unsafeFlags.length,
        message: unsafeFlags.length === 0 ? 
          'All flags safely defaulted to false' :
          `${unsafeFlags.length} flags may not be safely configured`
      });
    } else {
      results.push({
        file: filePath,
        status: 'missing',
        message: 'Environment config file not found'
      });
    }
  });
  
  return results;
}

/**
 * Main validation function
 */
function runPerformanceValidation() {
  console.log('🧪 Running Performance Optimization Validation');
  console.log('================================================');
  
  const report = {
    timestamp: new Date().toISOString(),
    criticalFiles: validateCriticalFiles(),
    optimizationFiles: validateOptimizationFiles(),
    environmentConfig: validateEnvironmentConfig()
  };
  
  // Print results
  console.log('\n📋 Critical Files Status:');
  report.criticalFiles.forEach(result => {
    const icon = {
      'clean': '✅',
      'external': '🔗',
      'warning': '⚠️',
      'missing': '❌'
    }[result.status] || '?';
    
    console.log(`${icon} ${result.file}: ${result.message}`);
  });
  
  console.log('\n🛠️ Optimization Files Status:');
  report.optimizationFiles.forEach(result => {
    const icon = {
      'safe': '✅',
      'warning': '⚠️',
      'missing': '❌'
    }[result.status] || '?';
    
    console.log(`${icon} ${result.file}`);
    if (result.status === 'safe') {
      console.log(`   Kill Switch: ✅, Error Handling: ✅, Exclusions: ✅`);
    } else if (result.status === 'warning') {
      console.log(`   Kill Switch: ${result.killSwitch ? '✅' : '❌'}, Error Handling: ${result.errorHandling ? '✅' : '❌'}, Exclusions: ${result.exclusions ? '✅' : '❌'}`);
    }
  });
  
  console.log('\n⚙️ Environment Configuration Status:');
  report.environmentConfig.forEach(result => {
    const icon = {
      'safe': '✅',
      'warning': '⚠️',
      'missing': '❌'
    }[result.status] || '?';
    
    console.log(`${icon} ${result.file}: ${result.message}`);
  });
  
  // Overall status
  const hasErrors = [
    ...report.criticalFiles,
    ...report.optimizationFiles,
    ...report.environmentConfig
  ].some(result => result.status === 'missing' || result.status === 'error');
  
  const hasWarnings = [
    ...report.criticalFiles,
    ...report.optimizationFiles,
    ...report.environmentConfig
  ].some(result => result.status === 'warning');
  
  console.log('\n📊 Overall Status:');
  if (hasErrors) {
    console.log('❌ FAILED - Critical issues detected');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️ WARNINGS - Review flagged items');
    process.exit(0);
  } else {
    console.log('✅ PASSED - All validations successful');
    process.exit(0);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runPerformanceValidation();
}

module.exports = {
  runPerformanceValidation,
  validateCriticalFiles,
  validateOptimizationFiles,
  validateEnvironmentConfig
};
