/**
 * Font Loading Strategy Optimization
 * Optimizes font loading with preloading, font-display: swap, and metric overrides
 */
import React from 'react';
import { isPerformanceFlagEnabled, handlePerformanceError } from '../utils/performanceFlags.js';

// Font configurations
const FONT_CONFIGS = {
  // Primary fonts (critical for above-the-fold content)
  critical: [
    {
      family: 'Inter',
      variants: ['400', '500', '600', '700'],
      formats: ['woff2', 'woff'],
      display: 'swap',
      preload: true
    }
  ],
  
  // Secondary fonts (for body text, less critical)
  secondary: [
    {
      family: 'Roboto',
      variants: ['300', '400', '500'],
      formats: ['woff2', 'woff'],
      display: 'swap',
      preload: false
    }
  ],
  
  // Icon fonts (defer loading)
  icons: [
    {
      family: 'FontAwesome',
      variants: ['400', '900'],
      formats: ['woff2', 'woff'],
      display: 'block', // Icons can wait
      preload: false
    }
  ]
};

// Font metric overrides to prevent layout shift
const FONT_METRICS = {
  'Inter': {
    ascentOverride: '90%',
    descentOverride: '22%',
    lineGapOverride: '0%',
    sizeAdjust: '100%'
  },
  'Roboto': {
    ascentOverride: '92%',
    descentOverride: '24%',
    lineGapOverride: '0%',
    sizeAdjust: '100%'
  }
};

// Fonts to EXCLUDE from optimization (canvas/SVG fonts used by QR/barcode)
const EXCLUDED_FONTS = [
  'Monaco',      // Often used in QR code text
  'Courier',     // Monospace fonts for codes
  'monospace',   // Generic monospace
  'sans-serif'   // Keep system fonts untouched
];

/**
 * Preload critical fonts
 */
function preloadCriticalFonts() {
  try {
    if (!isPerformanceFlagEnabled('perf_font_strategy')) {
      return;
    }
    
    console.log('🚀 Preloading critical fonts');
    
    FONT_CONFIGS.critical.forEach(font => {
      if (font.preload) {
        font.variants.forEach(weight => {
          font.formats.forEach(format => {
            const fontUrl = getFontUrl(font.family, weight, format);
            if (fontUrl) {
              preloadFont(fontUrl, format);
            }
          });
        });
      }
    });
    
  } catch (error) {
    handlePerformanceError(error, 'perf_font_strategy');
  }
}

/**
 * Get font URL from Google Fonts or local fonts
 */
function getFontUrl(family, weight, format) {
  // Check for local fonts first
  const localPath = `/fonts/${family}-${weight}.${format}`;
  
  // For Google Fonts, construct URL
  if (family === 'Inter' || family === 'Roboto') {
    return `https://fonts.gstatic.com/s/${family.toLowerCase()}/v${getGoogleFontVersion(family)}/${family}-${weight}.${format}`;
  }
  
  return localPath;
}

/**
 * Get Google Font version (approximate)
 */
function getGoogleFontVersion(family) {
  const versions = {
    'Inter': '12',
    'Roboto': '30'
  };
  return versions[family] || '1';
}

/**
 * Preload a single font file
 */
function preloadFont(fontUrl, format) {
  try {
    // Check if already preloaded
    const existing = document.querySelector(`link[href="${fontUrl}"]`);
    if (existing) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = `font/${format}`;
    link.href = fontUrl;
    link.crossOrigin = 'anonymous';
    
    link.onload = () => {
      console.log('✅ Font preloaded:', fontUrl);
    };
    
    link.onerror = () => {
      console.warn('❌ Failed to preload font:', fontUrl);
    };
    
    document.head.appendChild(link);
    
  } catch (error) {
    handlePerformanceError(error, 'perf_font_strategy');
  }
}

/**
 * Apply font-display: swap to existing font faces
 */
function applyFontDisplaySwap() {
  try {
    if (!isPerformanceFlagEnabled('perf_font_strategy')) {
      return;
    }
    
    // Find Google Fonts links and add display=swap
    const googleFontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    googleFontLinks.forEach(link => {
      const url = new URL(link.href);
      if (!url.searchParams.has('display')) {
        url.searchParams.set('display', 'swap');
        link.href = url.toString();
      }
    });
    
    // Apply font-display: swap via CSS
    const fontDisplayCSS = generateFontDisplayCSS();
    if (fontDisplayCSS) {
      injectFontDisplayCSS(fontDisplayCSS);
    }
    
    console.log('✅ Font display swap applied');
  } catch (error) {
    handlePerformanceError(error, 'perf_font_strategy');
  }
}

/**
 * Generate CSS for font-display: swap
 */
function generateFontDisplayCSS() {
  const cssRules = [];
  
  Object.keys(FONT_CONFIGS).forEach(category => {
    FONT_CONFIGS[category].forEach(font => {
      // Skip excluded fonts
      if (EXCLUDED_FONTS.includes(font.family)) {
        return;
      }
      
      font.variants.forEach(weight => {
        cssRules.push(`
          @font-face {
            font-family: '${font.family}';
            font-weight: ${weight};
            font-display: ${font.display};
            font-style: normal;
            ${generateFontMetrics(font.family)}
          }
        `);
      });
    });
  });
  
  return cssRules.join('\n');
}

/**
 * Generate font metric overrides
 */
function generateFontMetrics(fontFamily) {
  const metrics = FONT_METRICS[fontFamily];
  if (!metrics) return '';
  
  return Object.entries(metrics)
    .map(([prop, value]) => `${prop}: ${value};`)
    .join('\n    ');
}

/**
 * Inject font display CSS
 */
function injectFontDisplayCSS(css) {
  try {
    // Check if already injected
    if (document.getElementById('font-optimization-css')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'font-optimization-css';
    style.textContent = css;
    document.head.appendChild(style);
    
  } catch (error) {
    handlePerformanceError(error, 'perf_font_strategy');
  }
}

/**
 * Check for font loading API support and optimize
 */
function optimizeFontLoading() {
  try {
    if (!isPerformanceFlagEnabled('perf_font_strategy')) {
      return;
    }
    
    if (!document.fonts) {
      console.warn('Font Loading API not supported');
      return;
    }
    
    // Monitor font loading
    document.fonts.addEventListener('loadingdone', (event) => {
      console.log('✅ Fonts loaded:', event.fontfaces.length);
    });
    
    document.fonts.addEventListener('loadingerror', (event) => {
      console.warn('❌ Font loading error:', event);
    });
    
    // Force font loading for critical fonts
    const criticalFonts = FONT_CONFIGS.critical.map(font => 
      font.variants.map(weight => `${weight} 1em ${font.family}`)
    ).flat();
    
    Promise.all(
      criticalFonts.map(font => document.fonts.load(font))
    ).then(() => {
      console.log('✅ Critical fonts loaded');
    }).catch(error => {
      handlePerformanceError(error, 'perf_font_strategy');
    });
    
  } catch (error) {
    handlePerformanceError(error, 'perf_font_strategy');
  }
}

/**
 * Prevent font optimization for canvas/SVG elements (QR/barcode)
 */
function excludeCanvasElements() {
  try {
    // Find canvas elements and mark them to exclude from font optimization
    const canvases = document.querySelectorAll('canvas, svg');
    canvases.forEach(element => {
      element.setAttribute('data-font-optimize-exclude', 'true');
    });
    
    // Watch for new canvas/SVG elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.tagName === 'CANVAS' || node.tagName === 'SVG') {
              node.setAttribute('data-font-optimize-exclude', 'true');
            }
            
            // Check for canvas/SVG in subtree
            const elements = node.querySelectorAll ? node.querySelectorAll('canvas, svg') : [];
            elements.forEach(el => {
              el.setAttribute('data-font-optimize-exclude', 'true');
            });
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
  } catch (error) {
    console.warn('Error excluding canvas elements from font optimization:', error);
  }
}

/**
 * Initialize font optimization
 */
function initializeFontOptimization() {
  try {
    if (!isPerformanceFlagEnabled('perf_font_strategy')) {
      return;
    }
    
    console.log('🚀 Initializing font optimization');
    
    // Preload critical fonts
    preloadCriticalFonts();
    
    // Apply font-display swap
    applyFontDisplaySwap();
    
    // Optimize font loading
    optimizeFontLoading();
    
    // Exclude canvas elements from font optimization
    excludeCanvasElements();
    
  } catch (error) {
    handlePerformanceError(error, 'perf_font_strategy');
  }
}

/**
 * React hook for font optimization
 */
export function useFontOptimization() {
  React.useEffect(() => {
    if (isPerformanceFlagEnabled('perf_font_strategy')) {
      initializeFontOptimization();
    }
  }, []);
}

/**
 * Font Optimizer Component
 */
export function FontOptimizer({ children }) {
  useFontOptimization();
  return children;
}

// Auto-initialize if we're in the browser and flag is enabled
if (typeof window !== 'undefined' && isPerformanceFlagEnabled('perf_font_strategy')) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFontOptimization);
  } else {
    initializeFontOptimization();
  }
}

export { initializeFontOptimization, preloadCriticalFonts };
