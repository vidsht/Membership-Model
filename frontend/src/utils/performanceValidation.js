/**
 * Performance Testing and Validation Suite
 * Ensures QR/barcode functionality remains intact after optimizations
 */
import React from 'react';
import { isPerformanceFlagEnabled } from '../utils/performanceFlags.js';

/**
 * Test QR code generation functionality
 */
async function testQRCodeGeneration() {
  return new Promise((resolve) => {
    try {
      const testData = 'TEST123456';
      
      // Test Method 1: qrcode npm package
      if (typeof window !== 'undefined') {
        import('qrcode').then(QR => {
          const canvas = document.createElement('canvas');
          QR.toCanvas(canvas, testData, {
            width: 100,
            margin: 1
          }).then(() => {
            const dataUrl = canvas.toDataURL();
            resolve({
              method: 'qrcode-npm',
              success: dataUrl.startsWith('data:image/png'),
              output: dataUrl.substring(0, 50) + '...'
            });
          }).catch(error => {
            console.warn('QR code npm test failed:', error);
            resolve({
              method: 'qrcode-npm',
              success: false,
              error: error.message
            });
          });
        }).catch(error => {
          console.warn('QR code import failed:', error);
          resolve({
            method: 'qrcode-npm',
            success: false,
            error: error.message
          });
        });
      } else {
        resolve({
          method: 'qrcode-npm',
          success: false,
          error: 'Not in browser environment'
        });
      }
    } catch (error) {
      resolve({
        method: 'qrcode-npm',
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Test barcode generation functionality
 */
async function testBarcodeGeneration() {
  return new Promise((resolve) => {
    try {
      const testData = '123456789';
      
      // Test JsBarcode
      if (typeof window !== 'undefined' && window.JsBarcode) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        
        try {
          window.JsBarcode(svg, testData, {
            format: "CODE128",
            width: 1,
            height: 25,
            displayValue: false
          });
          
          const svgData = new XMLSerializer().serializeToString(svg);
          
          resolve({
            method: 'jsbarcode',
            success: svgData.includes('rect') && svgData.includes('CODE128'),
            output: `SVG length: ${svgData.length}`
          });
        } catch (error) {
          resolve({
            method: 'jsbarcode',
            success: false,
            error: error.message
          });
        }
      } else {
        resolve({
          method: 'jsbarcode',
          success: false,
          error: 'JsBarcode not available'
        });
      }
    } catch (error) {
      resolve({
        method: 'jsbarcode',
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Test image upload/processing functionality
 */
async function testImageProcessing() {
  return new Promise((resolve) => {
    try {
      // Create a test canvas with image data
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      // Draw a simple test pattern
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 50, 50);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(50, 0, 50, 50);
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(0, 50, 50, 50);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(50, 50, 50, 50);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            method: 'canvas-processing',
            success: true,
            output: `Blob size: ${blob.size} bytes, type: ${blob.type}`
          });
        } else {
          resolve({
            method: 'canvas-processing',
            success: false,
            error: 'Failed to create blob'
          });
        }
      });
    } catch (error) {
      resolve({
        method: 'canvas-processing',
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Test html2canvas functionality (used for card/certificate generation)
 */
async function testHtml2Canvas() {
  try {
    const html2canvas = await import('html2canvas');
    
    // Create a test element
    const testDiv = document.createElement('div');
    testDiv.innerHTML = '<p style="color: red;">Test HTML2Canvas</p>';
    testDiv.style.position = 'absolute';
    testDiv.style.top = '-9999px';
    document.body.appendChild(testDiv);
    
    try {
      const canvas = await html2canvas.default(testDiv, {
        width: 200,
        height: 100
      });
      
      document.body.removeChild(testDiv);
      
      return {
        method: 'html2canvas',
        success: canvas.width === 200 && canvas.height === 100,
        output: `Canvas: ${canvas.width}x${canvas.height}`
      };
    } catch (error) {
      document.body.removeChild(testDiv);
      return {
        method: 'html2canvas',
        success: false,
        error: error.message
      };
    }
  } catch (error) {
    return {
      method: 'html2canvas',
      success: false,
      error: error.message
    };
  }
}

/**
 * Test performance impact on critical paths
 */
async function testPerformanceImpact() {
  const tests = [];
  
  // Test QR code generation performance
  const qrStart = performance.now();
  const qrResult = await testQRCodeGeneration();
  const qrDuration = performance.now() - qrStart;
  tests.push({ ...qrResult, duration: qrDuration.toFixed(2) + 'ms' });
  
  // Test barcode generation performance
  const barcodeStart = performance.now();
  const barcodeResult = await testBarcodeGeneration();
  const barcodeDuration = performance.now() - barcodeStart;
  tests.push({ ...barcodeResult, duration: barcodeDuration.toFixed(2) + 'ms' });
  
  // Test image processing performance
  const imageStart = performance.now();
  const imageResult = await testImageProcessing();
  const imageDuration = performance.now() - imageStart;
  tests.push({ ...imageResult, duration: imageDuration.toFixed(2) + 'ms' });
  
  // Test html2canvas performance
  const h2cStart = performance.now();
  const h2cResult = await testHtml2Canvas();
  const h2cDuration = performance.now() - h2cStart;
  tests.push({ ...h2cResult, duration: h2cDuration.toFixed(2) + 'ms' });
  
  return tests;
}

/**
 * Comprehensive performance validation
 */
export async function validatePerformanceOptimizations() {
  console.group('🧪 Performance Optimization Validation');
  
  try {
    // Get current performance flags
    const flags = {
      perf_css_split: isPerformanceFlagEnabled('perf_css_split'),
      perf_lcp_preload: isPerformanceFlagEnabled('perf_lcp_preload'),
      perf_font_strategy: isPerformanceFlagEnabled('perf_font_strategy'),
      perf_route_split: isPerformanceFlagEnabled('perf_route_split'),
      perf_thirdparty_defer: isPerformanceFlagEnabled('perf_thirdparty_defer'),
    };
    
    console.log('🚩 Active performance flags:', flags);
    
    // Run performance impact tests
    console.log('⏱️ Testing performance impact on critical paths...');
    const performanceTests = await testPerformanceImpact();
    
    // Log results
    performanceTests.forEach(test => {
      if (test.success) {
        console.log(`✅ ${test.method}: PASS (${test.duration})`);
        if (test.output) console.log(`   Output: ${test.output}`);
      } else {
        console.error(`❌ ${test.method}: FAIL (${test.duration})`);
        if (test.error) console.error(`   Error: ${test.error}`);
      }
    });
    
    // Check for performance regressions
    const failedTests = performanceTests.filter(test => !test.success);
    if (failedTests.length > 0) {
      console.warn(`⚠️ ${failedTests.length} critical functionality tests failed!`);
      console.warn('Consider disabling performance optimizations if functionality is impacted.');
    } else {
      console.log('✅ All critical functionality tests passed!');
    }
    
    // Performance metrics
    const totalDuration = performanceTests.reduce((sum, test) => 
      sum + parseFloat(test.duration), 0
    );
    console.log(`📊 Total test duration: ${totalDuration.toFixed(2)}ms`);
    
    return {
      success: failedTests.length === 0,
      flags,
      tests: performanceTests,
      totalDuration: totalDuration.toFixed(2) + 'ms'
    };
    
  } catch (error) {
    console.error('❌ Performance validation failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    console.groupEnd();
  }
}

/**
 * Automated performance monitoring
 */
export function startPerformanceMonitoring() {
  // Run validation every 5 minutes in development
  if (import.meta.env.DEV) {
    const interval = setInterval(async () => {
      const result = await validatePerformanceOptimizations();
      
      if (!result.success) {
        console.warn('🚨 Performance validation failed, consider reviewing optimizations');
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Cleanup function
    return () => clearInterval(interval);
  }
  
  return () => {}; // No-op in production
}

/**
 * React hook for performance validation
 */
export function usePerformanceValidation() {
  React.useEffect(() => {
    // Run initial validation
    if (import.meta.env.DEV) {
      setTimeout(() => {
        validatePerformanceOptimizations();
      }, 2000); // Wait 2 seconds for everything to load
    }
    
    // Start monitoring
    const cleanup = startPerformanceMonitoring();
    
    return cleanup;
  }, []);
}

// Auto-start validation in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  // Wait for page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(validatePerformanceOptimizations, 3000);
    });
  } else {
    setTimeout(validatePerformanceOptimizations, 3000);
  }
}

export { testQRCodeGeneration, testBarcodeGeneration, testImageProcessing, testHtml2Canvas };
