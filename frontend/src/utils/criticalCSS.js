/**
 * Critical CSS Optimization Component
 * Extracts and inlines critical CSS while deferring non-critical styles
 */

import { isPerformanceFlagEnabled, isComponentOptimizable, handlePerformanceError } from '../utils/performanceFlags.js';

// Critical CSS patterns - only for safe components
const CRITICAL_CSS_PATTERNS = [
  // Global layout and typography
  'body', 'html', '.container', '.main-content',
  '.header', '.nav', '.footer',
  
  // Critical UI components (safe ones only)
  '.btn', '.form-group', '.input', '.card',
  '.hero', '.cta', '.landing',
  
  // Loading states
  '.loading', '.spinner', '.skeleton',
  
  // Critical animations
  '.fade-in', '.slide-in', '.bounce',
];

// CSS files to EXCLUDE from optimization (QR/barcode related)
const EXCLUDED_CSS_FILES = [
  'membership-card.css',     // Contains QR/barcode styling
  'merchant-certificate.css', // Contains QR code styling
  'image-upload.css',        // Image processing UI
  'qr-code.css',            // QR code specific styles
  'barcode.css',            // Barcode specific styles
];

/**
 * Extract critical CSS from a stylesheet
 */
function extractCriticalCSS(cssText, patterns) {
  try {
    const rules = cssText.split('}');
    const criticalRules = [];
    const nonCriticalRules = [];
    
    rules.forEach(rule => {
      if (!rule.trim()) return;
      
      const ruleWithBrace = rule + '}';
      const isCritical = patterns.some(pattern => 
        rule.includes(pattern) || rule.includes(`.${pattern}`) || rule.includes(`#${pattern}`)
      );
      
      if (isCritical) {
        criticalRules.push(ruleWithBrace);
      } else {
        nonCriticalRules.push(ruleWithBrace);
      }
    });
    
    return {
      critical: criticalRules.join('\n'),
      nonCritical: nonCriticalRules.join('\n')
    };
  } catch (error) {
    handlePerformanceError(error, 'perf_css_split');
    return { critical: cssText, nonCritical: '' };
  }
}

/**
 * Create and inject critical CSS
 */
function injectCriticalCSS(criticalCSS) {
  try {
    // Check if critical CSS already injected
    if (document.getElementById('critical-css')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'critical-css';
    style.textContent = criticalCSS;
    document.head.insertBefore(style, document.head.firstChild);
    
    console.log('✅ Critical CSS injected');
  } catch (error) {
    handlePerformanceError(error, 'perf_css_split');
  }
}

/**
 * Load non-critical CSS asynchronously
 */
function loadNonCriticalCSS(css, filename) {
  try {
    // Create a blob URL for the non-critical CSS
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    
    // Create link element with media="print" trick for async loading
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.media = 'print';
    link.id = `non-critical-css-${filename}`;
    
    // Switch to screen media after load
    link.onload = () => {
      link.media = 'screen';
      URL.revokeObjectURL(url);
      console.log(`✅ Non-critical CSS loaded: ${filename}`);
    };
    
    link.onerror = () => {
      URL.revokeObjectURL(url);
      console.warn(`❌ Failed to load non-critical CSS: ${filename}`);
    };
    
    document.head.appendChild(link);
  } catch (error) {
    handlePerformanceError(error, 'perf_css_split');
  }
}

/**
 * Process a CSS file for critical/non-critical splitting
 */
async function processCSSFile(href) {
  try {
    // Skip excluded CSS files
    const filename = href.split('/').pop();
    if (EXCLUDED_CSS_FILES.some(excluded => filename.includes(excluded))) {
      console.log(`⚠️ Skipping excluded CSS file: ${filename}`);
      return;
    }
    
    // Fetch CSS content
    const response = await fetch(href);
    if (!response.ok) throw new Error(`Failed to fetch CSS: ${href}`);
    
    const cssText = await response.text();
    
    // Extract critical and non-critical CSS
    const { critical, nonCritical } = extractCriticalCSS(cssText, CRITICAL_CSS_PATTERNS);
    
    // Inject critical CSS immediately
    if (critical) {
      injectCriticalCSS(critical);
    }
    
    // Load non-critical CSS asynchronously
    if (nonCritical) {
      loadNonCriticalCSS(nonCritical, filename);
    }
    
    // Remove original link to avoid duplicate loading
    const originalLink = document.querySelector(`link[href="${href}"]`);
    if (originalLink) {
      originalLink.remove();
    }
    
  } catch (error) {
    handlePerformanceError(error, 'perf_css_split');
  }
}

/**
 * Initialize CSS splitting optimization
 */
function initializeCSSOptimization() {
  try {
    // Only run if flag is enabled
    if (!isPerformanceFlagEnabled('perf_css_split')) {
      return;
    }
    
    console.log('🚀 Initializing CSS splitting optimization');
    
    // Process existing stylesheets
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach(link => {
      if (link.href && !link.id.startsWith('critical-') && !link.id.startsWith('non-critical-')) {
        processCSSFile(link.href);
      }
    });
    
    // Watch for new stylesheets being added
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.tagName === 'LINK' && 
              node.rel === 'stylesheet' && node.href &&
              !node.id.startsWith('critical-') && !node.id.startsWith('non-critical-')) {
            processCSSFile(node.href);
          }
        });
      });
    });
    
    observer.observe(document.head, { childList: true });
    
  } catch (error) {
    handlePerformanceError(error, 'perf_css_split');
  }
}

/**
 * Critical CSS Component - Wrapper for CSS optimization
 */
export function CriticalCSSOptimizer({ children, componentName }) {
  // Only apply optimization if component is safe and flag is enabled
  if (!isPerformanceFlagEnabled('perf_css_split') || 
      (componentName && !isComponentOptimizable(componentName))) {
    return children;
  }
  
  // Initialize CSS optimization on mount
  React.useEffect(() => {
    initializeCSSOptimization();
  }, []);
  
  return children;
}

// Auto-initialize if we're in the browser and flag is enabled
if (typeof window !== 'undefined' && isPerformanceFlagEnabled('perf_css_split')) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCSSOptimization);
  } else {
    initializeCSSOptimization();
  }
}

export { initializeCSSOptimization, processCSSFile };
