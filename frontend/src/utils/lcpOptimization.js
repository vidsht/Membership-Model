/**
 * LCP (Largest Contentful Paint) Optimization
 * Preloads detected LCP images with high priority to improve Core Web Vitals
 */

import React from 'react';
import { isPerformanceFlagEnabled, isRouteOptimizable, handlePerformanceError } from '../utils/performanceFlags.js';

// Track LCP candidates
let lcpElements = [];
let lcpObserver = null;
let preloadedImages = new Set();

/**
 * Detect LCP element using PerformanceObserver
 */
function detectLCPElement() {
  try {
    if (!window.PerformanceObserver) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Create LCP observer
    lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      if (lastEntry && lastEntry.element) {
        lcpElements.push({
          element: lastEntry.element,
          startTime: lastEntry.startTime,
          size: lastEntry.size,
          url: lastEntry.url
        });
        
        // Preload the LCP image if it's an image
        if (lastEntry.element.tagName === 'IMG' && lastEntry.url) {
          preloadLCPImage(lastEntry.url, lastEntry.element);
        }
      }
    });

    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    
    console.log('✅ LCP detection initialized');
  } catch (error) {
    handlePerformanceError(error, 'perf_lcp_preload');
  }
}

/**
 * Preload an LCP image with high priority
 */
function preloadLCPImage(imageUrl, imgElement) {
  try {
    // Skip if already preloaded
    if (preloadedImages.has(imageUrl)) {
      return;
    }
    
    // Check if this is a safe image (not from QR/barcode generation)
    if (isImageFromCriticalPath(imageUrl, imgElement)) {
      console.log('⚠️ Skipping LCP preload for critical path image:', imageUrl);
      return;
    }
    
    // Create preload link
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.href = imageUrl;
    preloadLink.fetchPriority = 'high';
    
    // Add responsive image attributes if available
    if (imgElement) {
      if (imgElement.sizes) {
        preloadLink.sizes = imgElement.sizes;
      }
      if (imgElement.srcset) {
        preloadLink.imagesrcset = imgElement.srcset;
      }
    }
    
    preloadLink.onload = () => {
      console.log('✅ LCP image preloaded:', imageUrl);
    };
    
    preloadLink.onerror = () => {
      console.warn('❌ Failed to preload LCP image:', imageUrl);
    };
    
    document.head.appendChild(preloadLink);
    preloadedImages.add(imageUrl);
    
    // Add dimensions and attributes to prevent CLS
    if (imgElement && !imgElement.width && !imgElement.height) {
      addImageDimensions(imgElement);
    }
    
  } catch (error) {
    handlePerformanceError(error, 'perf_lcp_preload');
  }
}

/**
 * Check if image is from a critical path (QR/barcode/uploads)
 */
function isImageFromCriticalPath(imageUrl, imgElement) {
  // Skip images from upload paths (user-generated content)
  if (imageUrl.includes('/uploads/') || imageUrl.includes('/temp_uploads/')) {
    return true;
  }
  
  // Skip base64 images (likely from canvas/QR generation)
  if (imageUrl.startsWith('data:image/')) {
    return true;
  }
  
  // Skip images from QR/barcode APIs
  if (imageUrl.includes('qrserver.com') || imageUrl.includes('qr-code')) {
    return true;
  }
  
  // Check element classes for QR/barcode indicators
  if (imgElement) {
    const className = imgElement.className || '';
    const criticalClasses = ['qr-code', 'barcode', 'profile-image', 'merchant-logo', 'deal-banner'];
    if (criticalClasses.some(cls => className.includes(cls))) {
      return true;
    }
    
    // Check parent elements for critical contexts
    let parent = imgElement.parentElement;
    while (parent && parent !== document.body) {
      const parentClass = parent.className || '';
      if (criticalClasses.some(cls => parentClass.includes(cls))) {
        return true;
      }
      parent = parent.parentElement;
    }
  }
  
  return false;
}

/**
 * Add responsive dimensions to images to prevent CLS
 */
function addImageDimensions(imgElement) {
  try {
    // Skip if image already has dimensions
    if (imgElement.width || imgElement.height || imgElement.style.aspectRatio) {
      return;
    }
    
    // Add loading="lazy" for non-LCP images
    if (!imgElement.loading) {
      imgElement.loading = 'lazy';
    }
    
    // Try to determine dimensions from natural size when loaded
    if (imgElement.complete && imgElement.naturalWidth && imgElement.naturalHeight) {
      setImageDimensions(imgElement);
    } else {
      imgElement.addEventListener('load', () => setImageDimensions(imgElement), { once: true });
    }
    
  } catch (error) {
    handlePerformanceError(error, 'perf_lcp_preload');
  }
}

/**
 * Set image dimensions to prevent layout shift
 */
function setImageDimensions(imgElement) {
  try {
    const { naturalWidth, naturalHeight } = imgElement;
    
    if (naturalWidth && naturalHeight) {
      // Set aspect ratio to maintain proportions
      imgElement.style.aspectRatio = `${naturalWidth} / ${naturalHeight}`;
      
      // Set width and height attributes for better performance
      if (!imgElement.width) {
        imgElement.width = naturalWidth;
      }
      if (!imgElement.height) {
        imgElement.height = naturalHeight;
      }
    }
  } catch (error) {
    handlePerformanceError(error, 'perf_lcp_preload');
  }
}

/**
 * Initialize LCP optimization for current route
 */
function initializeLCPOptimization() {
  try {
    // Only run if flag is enabled and route is safe
    if (!isPerformanceFlagEnabled('perf_lcp_preload')) {
      return;
    }
    
    const currentPath = window.location.pathname;
    if (!isRouteOptimizable(currentPath)) {
      console.log('⚠️ Skipping LCP optimization for route:', currentPath);
      return;
    }
    
    console.log('🚀 Initializing LCP optimization for route:', currentPath);
    
    // Start LCP detection
    detectLCPElement();
    
    // Process existing images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !isImageFromCriticalPath(img.src, img)) {
        addImageDimensions(img);
      }
    });
    
    // Watch for new images
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.tagName === 'IMG') {
              if (node.src && !isImageFromCriticalPath(node.src, node)) {
                addImageDimensions(node);
              }
            } else {
              // Check for images in added subtree
              const imgs = node.querySelectorAll ? node.querySelectorAll('img') : [];
              imgs.forEach(img => {
                if (img.src && !isImageFromCriticalPath(img.src, img)) {
                  addImageDimensions(img);
                }
              });
            }
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
  } catch (error) {
    handlePerformanceError(error, 'perf_lcp_preload');
  }
}

/**
 * Cleanup LCP optimization
 */
function cleanupLCPOptimization() {
  try {
    if (lcpObserver) {
      lcpObserver.disconnect();
      lcpObserver = null;
    }
    lcpElements = [];
    console.log('✅ LCP optimization cleaned up');
  } catch (error) {
    console.warn('Error cleaning up LCP optimization:', error);
  }
}

/**
 * React hook for LCP optimization
 */
export function useLCPOptimization() {
  React.useEffect(() => {
    if (isPerformanceFlagEnabled('perf_lcp_preload')) {
      initializeLCPOptimization();
      
      return () => {
        cleanupLCPOptimization();
      };
    }
  }, []);
}

/**
 * LCP Optimizer Component
 */
export function LCPOptimizer({ children }) {
  useLCPOptimization();
  return children;
}

// Auto-initialize if we're in the browser and flag is enabled
if (typeof window !== 'undefined' && isPerformanceFlagEnabled('perf_lcp_preload')) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLCPOptimization);
  } else {
    initializeLCPOptimization();
  }
}

export { initializeLCPOptimization, cleanupLCPOptimization };
