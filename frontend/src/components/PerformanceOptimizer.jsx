/**
 * Performance Optimization Manager
 * Centralized component to initialize and manage all performance optimizations
 */

import React from 'react';
import { isPerformanceFlagEnabled, logPerformanceFlags } from '../utils/performanceFlags.js';
import { CriticalCSSOptimizer } from '../utils/criticalCSS.js';
import { LCPOptimizer } from '../utils/lcpOptimization.js';
import { FontOptimizer } from '../utils/fontOptimization.js';
import { ThirdPartyOptimizer } from '../utils/thirdPartyOptimization.js';
import { OptimizedRouter } from '../utils/routeSplitting.jsx';

/**
 * Performance optimization wrapper component
 * Applies all enabled optimizations without affecting functionality
 */
export function PerformanceOptimizer({ children }) {
  // Log current performance flags in development
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      logPerformanceFlags();
    }
  }, []);
  
  // Monitor for performance errors and auto-disable problematic optimizations
  React.useEffect(() => {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      // Check if error is related to performance optimizations
      const errorMessage = args.join(' ').toLowerCase();
      
      if (errorMessage.includes('performance') || 
          errorMessage.includes('optimization') ||
          errorMessage.includes('lazy') ||
          errorMessage.includes('chunk')) {
        
        console.warn('🚨 Performance optimization error detected, consider disabling flags');
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args);
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  // Wrap children with optimization components only if flags are enabled
  let optimizedChildren = children;
  
  // Route-level optimizations
  if (isPerformanceFlagEnabled('perf_route_split')) {
    optimizedChildren = (
      <OptimizedRouter>
        {optimizedChildren}
      </OptimizedRouter>
    );
  }
  
  // Third-party script optimizations
  if (isPerformanceFlagEnabled('perf_thirdparty_defer')) {
    optimizedChildren = (
      <ThirdPartyOptimizer>
        {optimizedChildren}
      </ThirdPartyOptimizer>
    );
  }
  
  // Font optimizations
  if (isPerformanceFlagEnabled('perf_font_strategy')) {
    optimizedChildren = (
      <FontOptimizer>
        {optimizedChildren}
      </FontOptimizer>
    );
  }
  
  // LCP optimizations
  if (isPerformanceFlagEnabled('perf_lcp_preload')) {
    optimizedChildren = (
      <LCPOptimizer>
        {optimizedChildren}
      </LCPOptimizer>
    );
  }
  
  // CSS optimizations
  if (isPerformanceFlagEnabled('perf_css_split')) {
    optimizedChildren = (
      <CriticalCSSOptimizer>
        {optimizedChildren}
      </CriticalCSSOptimizer>
    );
  }
  
  return optimizedChildren;
}

/**
 * Performance monitoring hook
 * Tracks Core Web Vitals and performance metrics
 */
export function usePerformanceMonitoring() {
  React.useEffect(() => {
    // Only monitor in production or when specifically enabled
    if (import.meta.env.DEV && !import.meta.env.VITE_PERF_MONITORING) {
      return;
    }
    
    try {
      // Monitor Core Web Vitals
      if ('PerformanceObserver' in window) {
        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          console.log('📊 LCP:', lastEntry.startTime.toFixed(2) + 'ms');
          
          // Log if LCP is poor (> 2.5s)
          if (lastEntry.startTime > 2500) {
            console.warn('⚠️ Poor LCP detected:', lastEntry.startTime.toFixed(2) + 'ms');
          }
        });
        
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        
        // FID (First Input Delay)
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach(entry => {
            console.log('📊 FID:', entry.processingStart - entry.startTime + 'ms');
            
            // Log if FID is poor (> 100ms)
            if (entry.processingStart - entry.startTime > 100) {
              console.warn('⚠️ Poor FID detected:', (entry.processingStart - entry.startTime).toFixed(2) + 'ms');
            }
          });
        });
        
        fidObserver.observe({ type: 'first-input', buffered: true });
        
        // CLS (Cumulative Layout Shift)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          console.log('📊 CLS:', clsValue.toFixed(4));
          
          // Log if CLS is poor (> 0.1)
          if (clsValue > 0.1) {
            console.warn('⚠️ Poor CLS detected:', clsValue.toFixed(4));
          }
        });
        
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        
        // Cleanup observers
        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        };
      }
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }, []);
}

/**
 * Development performance tools component
 */
export function PerformanceDevTools() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [flags, setFlags] = React.useState({});
  
  React.useEffect(() => {
    // Only show in development
    if (!import.meta.env.DEV) {
      return;
    }
    
    // Load current flags
    const currentFlags = JSON.parse(localStorage.getItem('perfFlags') || '{}');
    setFlags(currentFlags);
    
    // Add keyboard shortcut to toggle dev tools (Ctrl+Shift+P)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  const toggleFlag = (flagName) => {
    const newFlags = {
      ...flags,
      [flagName]: !flags[flagName]
    };
    
    setFlags(newFlags);
    localStorage.setItem('perfFlags', JSON.stringify(newFlags));
    
    // Refresh page to apply changes
    window.location.reload();
  };
  
  if (!import.meta.env.DEV || !isVisible) {
    return null;
  }
  
  const flagDefinitions = [
    { key: 'perf_css_split', label: 'CSS Splitting' },
    { key: 'perf_lcp_preload', label: 'LCP Preload' },
    { key: 'perf_font_strategy', label: 'Font Strategy' },
    { key: 'perf_route_split', label: 'Route Splitting' },
    { key: 'perf_thirdparty_defer', label: 'Third-party Defer' },
    { key: 'perf_cls_dims', label: 'CLS Fixes' }
  ];
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      zIndex: 10000,
      fontFamily: 'monospace',
      fontSize: '12px',
      minWidth: '200px'
    }}>
      <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
        🚀 Performance DevTools
      </div>
      
      {flagDefinitions.map(({ key, label }) => (
        <div key={key} style={{ marginBottom: '5px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flags[key] || false}
              onChange={() => toggleFlag(key)}
              style={{ marginRight: '8px' }}
            />
            {label}
          </label>
        </div>
      ))}
      
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333' }}>
        <button
          onClick={() => {
            localStorage.removeItem('perfFlags');
            window.location.reload();
          }}
          style={{
            background: '#ff4444',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Reset All Flags
        </button>
      </div>
      
      <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.7 }}>
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
}

/**
 * Main performance optimization hook
 */
export function usePerformanceOptimizations() {
  usePerformanceMonitoring();
  
  React.useEffect(() => {
    // Log performance optimization status
    console.log('🚀 Performance optimizations initialized');
    
    // Add global performance flag toggle function for emergency use
    window.disableAllPerformanceOptimizations = () => {
      localStorage.setItem('perfFlags', JSON.stringify({ perf_disable_all: true }));
      console.warn('🔴 All performance optimizations disabled');
      window.location.reload();
    };
    
  }, []);
}

export default PerformanceOptimizer;
