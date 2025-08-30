/**
 * Third-Party Script Optimization
 * Defers non-critical third-party scripts while preserving QR/barcode dependencies
 */

import React from 'react';
import { isPerformanceFlagEnabled, handlePerformanceError } from '../utils/performanceFlags.js';

// Third-party script configurations
const SCRIPT_CONFIGS = {
  // Critical scripts (QR/barcode) - NEVER defer these
  critical: [
    {
      name: 'QRCode Library',
      src: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
      async: false,
      defer: false,
      priority: 'high'
    },
    {
      name: 'JsBarcode Library',
      src: 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
      async: false,
      defer: false,
      priority: 'high'
    }
  ],
  
  // Analytics and tracking (can be deferred)
  analytics: [
    {
      name: 'Google Analytics',
      src: /gtag|google-analytics|googletagmanager/,
      async: true,
      defer: true,
      priority: 'low',
      delayUntil: 'user-interaction'
    }
  ],
  
  // Social media widgets (can be deferred)
  social: [
    {
      name: 'Facebook Pixel',
      src: /connect\.facebook\.net/,
      async: true,
      defer: true,
      priority: 'low',
      delayUntil: 'idle'
    },
    {
      name: 'Twitter Widget',
      src: /platform\.twitter\.com/,
      async: true,
      defer: true,
      priority: 'low',
      delayUntil: 'idle'
    }
  ],
  
  // Chat widgets (can be deferred)
  chat: [
    {
      name: 'Chat Widget',
      src: /chat|support|intercom|zendesk/,
      async: true,
      defer: true,
      priority: 'low',
      delayUntil: 'user-interaction'
    }
  ]
};

// Track deferred scripts
const deferredScripts = new Map();
const userInteracted = { value: false };
const idleCallbackId = { value: null };

/**
 * Check if a script is critical (QR/barcode related)
 */
function isCriticalScript(src) {
  return SCRIPT_CONFIGS.critical.some(config => {
    if (typeof config.src === 'string') {
      return src.includes(config.src) || src === config.src;
    }
    if (config.src instanceof RegExp) {
      return config.src.test(src);
    }
    return false;
  });
}

/**
 * Check if a script should be deferred
 */
function shouldDeferScript(src) {
  const allDeferrableConfigs = [
    ...SCRIPT_CONFIGS.analytics,
    ...SCRIPT_CONFIGS.social,
    ...SCRIPT_CONFIGS.chat
  ];
  
  return allDeferrableConfigs.some(config => {
    if (typeof config.src === 'string') {
      return src.includes(config.src);
    }
    if (config.src instanceof RegExp) {
      return config.src.test(src);
    }
    return false;
  });
}

/**
 * Get script configuration
 */
function getScriptConfig(src) {
  const allConfigs = [
    ...SCRIPT_CONFIGS.critical,
    ...SCRIPT_CONFIGS.analytics,
    ...SCRIPT_CONFIGS.social,
    ...SCRIPT_CONFIGS.chat
  ];
  
  return allConfigs.find(config => {
    if (typeof config.src === 'string') {
      return src.includes(config.src) || src === config.src;
    }
    if (config.src instanceof RegExp) {
      return config.src.test(src);
    }
    return false;
  });
}

/**
 * Load a script with specified strategy
 */
function loadScript(src, config = {}) {
  return new Promise((resolve, reject) => {
    try {
      // Check if script already exists
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve(existing);
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = config.async || false;
      script.defer = config.defer || false;
      
      if (config.priority) {
        script.fetchPriority = config.priority;
      }
      
      script.onload = () => {
        console.log(`✅ Script loaded: ${config.name || src}`);
        resolve(script);
      };
      
      script.onerror = () => {
        console.warn(`❌ Failed to load script: ${config.name || src}`);
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.head.appendChild(script);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Defer script loading until specified condition
 */
function deferScript(originalScript, config) {
  try {
    const src = originalScript.src;
    const scriptConfig = config || getScriptConfig(src);
    
    if (!scriptConfig) {
      return;
    }
    
    // Remove original script
    originalScript.remove();
    
    // Store for later loading
    deferredScripts.set(src, {
      config: scriptConfig,
      loaded: false
    });
    
    console.log(`⏳ Script deferred: ${scriptConfig.name || src}`);
    
    // Schedule loading based on strategy
    if (scriptConfig.delayUntil === 'idle') {
      scheduleIdleLoading(src, scriptConfig);
    } else if (scriptConfig.delayUntil === 'user-interaction') {
      scheduleInteractionLoading(src, scriptConfig);
    } else {
      // Default: load after a short delay
      setTimeout(() => loadDeferredScript(src), 2000);
    }
    
  } catch (error) {
    handlePerformanceError(error, 'perf_thirdparty_defer');
  }
}

/**
 * Schedule script loading on idle
 */
function scheduleIdleLoading(src, config) {
  try {
    if ('requestIdleCallback' in window) {
      idleCallbackId.value = requestIdleCallback(() => {
        loadDeferredScript(src);
      }, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => loadDeferredScript(src), 3000);
    }
  } catch (error) {
    handlePerformanceError(error, 'perf_thirdparty_defer');
  }
}

/**
 * Schedule script loading on user interaction
 */
function scheduleInteractionLoading(src, config) {
  try {
    if (userInteracted.value) {
      loadDeferredScript(src);
      return;
    }
    
    const events = ['click', 'scroll', 'touchstart', 'keydown'];
    const loadOnInteraction = () => {
      loadDeferredScript(src);
      
      // Remove event listeners
      events.forEach(event => {
        document.removeEventListener(event, loadOnInteraction, { passive: true });
      });
    };
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, loadOnInteraction, { passive: true, once: true });
    });
    
    // Fallback timeout
    setTimeout(() => {
      if (!deferredScripts.get(src)?.loaded) {
        loadOnInteraction();
      }
    }, 10000);
    
  } catch (error) {
    handlePerformanceError(error, 'perf_thirdparty_defer');
  }
}

/**
 * Load a deferred script
 */
async function loadDeferredScript(src) {
  try {
    const deferredInfo = deferredScripts.get(src);
    if (!deferredInfo || deferredInfo.loaded) {
      return;
    }
    
    await loadScript(src, deferredInfo.config);
    deferredInfo.loaded = true;
    
  } catch (error) {
    handlePerformanceError(error, 'perf_thirdparty_defer');
  }
}

/**
 * Process existing scripts on the page
 */
function processExistingScripts() {
  try {
    if (!isPerformanceFlagEnabled('perf_thirdparty_defer')) {
      return;
    }
    
    const scripts = document.querySelectorAll('script[src]');
    
    scripts.forEach(script => {
      const src = script.src;
      
      // Skip critical scripts (QR/barcode)
      if (isCriticalScript(src)) {
        console.log(`🔒 Preserving critical script: ${src}`);
        return;
      }
      
      // Defer non-critical scripts
      if (shouldDeferScript(src)) {
        deferScript(script);
      }
    });
    
    console.log('✅ Third-party script optimization applied');
  } catch (error) {
    handlePerformanceError(error, 'perf_thirdparty_defer');
  }
}

/**
 * Watch for new scripts being added
 */
function watchForNewScripts() {
  try {
    if (!isPerformanceFlagEnabled('perf_thirdparty_defer')) {
      return;
    }
    
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.tagName === 'SCRIPT' && node.src) {
            const src = node.src;
            
            // Skip critical scripts
            if (isCriticalScript(src)) {
              console.log(`🔒 Preserving critical script: ${src}`);
              return;
            }
            
            // Defer if applicable
            if (shouldDeferScript(src)) {
              // Small delay to let the script settle
              setTimeout(() => {
                if (node.parentNode) {
                  deferScript(node);
                }
              }, 100);
            }
          }
        });
      });
    });
    
    observer.observe(document.head, { childList: true });
    observer.observe(document.body, { childList: true });
    
  } catch (error) {
    handlePerformanceError(error, 'perf_thirdparty_defer');
  }
}

/**
 * Setup user interaction tracking
 */
function setupUserInteractionTracking() {
  try {
    const events = ['click', 'scroll', 'touchstart', 'keydown'];
    
    const markInteraction = () => {
      userInteracted.value = true;
      
      // Load any interaction-dependent scripts
      deferredScripts.forEach((info, src) => {
        if (!info.loaded && info.config.delayUntil === 'user-interaction') {
          loadDeferredScript(src);
        }
      });
      
      // Remove event listeners
      events.forEach(event => {
        document.removeEventListener(event, markInteraction, { passive: true });
      });
    };
    
    events.forEach(event => {
      document.addEventListener(event, markInteraction, { passive: true, once: true });
    });
    
  } catch (error) {
    handlePerformanceError(error, 'perf_thirdparty_defer');
  }
}

/**
 * Initialize third-party script optimization
 */
function initializeThirdPartyOptimization() {
  try {
    if (!isPerformanceFlagEnabled('perf_thirdparty_defer')) {
      return;
    }
    
    console.log('🚀 Initializing third-party script optimization');
    
    // Setup user interaction tracking
    setupUserInteractionTracking();
    
    // Process existing scripts
    processExistingScripts();
    
    // Watch for new scripts
    watchForNewScripts();
    
  } catch (error) {
    handlePerformanceError(error, 'perf_thirdparty_defer');
  }
}

/**
 * React hook for third-party optimization
 */
export function useThirdPartyOptimization() {
  React.useEffect(() => {
    if (isPerformanceFlagEnabled('perf_thirdparty_defer')) {
      initializeThirdPartyOptimization();
      
      return () => {
        // Cleanup
        if (idleCallbackId.value) {
          cancelIdleCallback(idleCallbackId.value);
        }
      };
    }
  }, []);
}

/**
 * Third-Party Optimizer Component
 */
export function ThirdPartyOptimizer({ children }) {
  useThirdPartyOptimization();
  return children;
}

// Auto-initialize if we're in the browser and flag is enabled
if (typeof window !== 'undefined' && isPerformanceFlagEnabled('perf_thirdparty_defer')) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeThirdPartyOptimization);
  } else {
    initializeThirdPartyOptimization();
  }
}

export { initializeThirdPartyOptimization, loadScript };
