/**
 * Route-Level Code Splitting Optimization
 * Implements lazy loading for safe routes while keeping QR/barcode modules eagerly loaded
 */

import React, { Suspense, lazy } from 'react';
import { isPerformanceFlagEnabled, isRouteOptimizable, handlePerformanceError } from '../utils/performanceFlags.js';

// Track loaded chunks to prevent duplicate loads
const loadedChunks = new Set();
const chunkLoadPromises = new Map();

/**
 * Enhanced lazy loading with error handling and retry logic
 */
function createLazyComponent(importFn, componentName) {
  return lazy(async () => {
    try {
      const module = await importFn();
      console.log(`✅ Lazy loaded component: ${componentName}`);
      return module;
    } catch (error) {
      handlePerformanceError(error, 'perf_route_split');
      
      // Retry once after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const module = await importFn();
        console.log(`✅ Lazy loaded component (retry): ${componentName}`);
        return module;
      } catch (retryError) {
        console.error(`❌ Failed to load component after retry: ${componentName}`, retryError);
        
        // Return a fallback component
        return {
          default: () => React.createElement('div', {
            style: { padding: '20px', textAlign: 'center' }
          }, `Failed to load ${componentName}. Please refresh the page.`)
        };
      }
    }
  });
}

/**
 * Safe route components - only these can be lazy loaded
 */
const LazyRouteComponents = {
  // Public pages (safe for lazy loading)
  Home: null,
  About: null,
  Plans: null,
  Contact: null,
  Login: null,
  Register: null,
  
  // Initialize lazy components only if flag is enabled
  initialize() {
    if (!isPerformanceFlagEnabled('perf_route_split')) {
      return;
    }
    
    this.Home = createLazyComponent(
      () => import('../pages/Home.jsx'),
      'Home'
    );
    
    this.About = createLazyComponent(
      () => import('../pages/About.jsx'),
      'About'
    );
    
    this.Plans = createLazyComponent(
      () => import('../pages/Plans.jsx'),
      'Plans'
    );
    
    this.Contact = createLazyComponent(
      () => import('../pages/Contact.jsx'),
      'Contact'
    );
    
    this.Login = createLazyComponent(
      () => import('../pages/Login.jsx'),
      'Login'
    );
    
    this.Register = createLazyComponent(
      () => import('../pages/Register.jsx'),
      'Register'
    );
    
    console.log('✅ Route-level code splitting initialized');
  }
};

/**
 * Eagerly loaded components (critical paths that must not be lazy loaded)
 */
const EagerComponents = {
  // QR/Barcode critical components - NEVER lazy load these
  MembershipCard: React.lazy(() => import('../components/MembershipCard.jsx')),
  MerchantCertificate: React.lazy(() => import('../components/MerchantCertificate.jsx')),
  
  // Image processing components
  ImageUpload: React.lazy(() => import('../components/common/ImageUpload.jsx')),
  
  // Dashboard and admin (contain critical functionality)
  Dashboard: React.lazy(() => import('../pages/Dashboard.jsx')),
  AdminDashboard: React.lazy(() => import('../pages/AdminDashboard.jsx')),
  MerchantDashboard: React.lazy(() => import('../pages/MerchantDashboard.jsx')),
  
  // Deal management (may contain image processing)
  Deals: React.lazy(() => import('../pages/Deals.jsx')),
  DealDetails: React.lazy(() => import('../pages/DealDetails.jsx')),
};

/**
 * Route component factory - decides whether to use lazy or eager loading
 */
export function createRouteComponent(routePath, componentName) {
  // Check if route is optimizable and flag is enabled
  if (!isPerformanceFlagEnabled('perf_route_split') || !isRouteOptimizable(routePath)) {
    console.log(`⚠️ Route not optimizable, using eager loading: ${routePath}`);
    return EagerComponents[componentName] || null;
  }
  
  // Initialize lazy components if needed
  if (!LazyRouteComponents.Home) {
    LazyRouteComponents.initialize();
  }
  
  // Return lazy component if available
  const LazyComponent = LazyRouteComponents[componentName];
  if (LazyComponent) {
    console.log(`🚀 Using lazy loading for route: ${routePath}`);
    return LazyComponent;
  }
  
  // Fallback to eager loading
  console.log(`⚠️ No lazy component found, using eager loading: ${componentName}`);
  return EagerComponents[componentName] || null;
}

/**
 * Enhanced Suspense wrapper with loading states
 */
export function RouteSuspense({ children, fallback, routeName }) {
  const defaultFallback = (
    <div className="route-loading">
      <div className="loading-spinner"></div>
      <p>Loading {routeName || 'page'}...</p>
    </div>
  );
  
  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Preload route component for faster navigation
 */
export function preloadRouteComponent(routePath, componentName) {
  try {
    if (!isPerformanceFlagEnabled('perf_route_split') || !isRouteOptimizable(routePath)) {
      return;
    }
    
    // Check if already preloading
    const cacheKey = `${routePath}-${componentName}`;
    if (chunkLoadPromises.has(cacheKey)) {
      return chunkLoadPromises.get(cacheKey);
    }
    
    // Initialize lazy components if needed
    if (!LazyRouteComponents.Home) {
      LazyRouteComponents.initialize();
    }
    
    const LazyComponent = LazyRouteComponents[componentName];
    if (LazyComponent && LazyComponent._payload) {
      const promise = LazyComponent._payload._result || LazyComponent._payload._init();
      chunkLoadPromises.set(cacheKey, promise);
      
      promise.then(() => {
        console.log(`✅ Preloaded route component: ${componentName}`);
        loadedChunks.add(cacheKey);
      }).catch(error => {
        console.warn(`❌ Failed to preload route component: ${componentName}`, error);
        chunkLoadPromises.delete(cacheKey);
      });
      
      return promise;
    }
  } catch (error) {
    handlePerformanceError(error, 'perf_route_split');
  }
}

/**
 * Route optimization hook for React Router
 */
export function useRouteOptimization() {
  React.useEffect(() => {
    if (!isPerformanceFlagEnabled('perf_route_split')) {
      return;
    }
    
    // Preload likely next routes based on current route
    const currentPath = window.location.pathname;
    
    if (currentPath === '/') {
      // From home, users might go to login, register, or plans
      preloadRouteComponent('/login', 'Login');
      preloadRouteComponent('//unified-registration', 'Register');
      preloadRouteComponent('/plans', 'Plans');
    } else if (currentPath === '/login') {
      // From login, users might go to dashboard or home
      preloadRouteComponent('/', 'Home');
    } else if (currentPath === '/unified-registration') {
      // From register, users might go to login or plans
      preloadRouteComponent('/login', 'Login');
      preloadRouteComponent('/plans', 'Plans');
    }
  }, []);
}

/**
 * Router-level optimization component
 */
export function OptimizedRouter({ children }) {
  useRouteOptimization();
  
  // Add route change listener for preloading
  React.useEffect(() => {
    if (!isPerformanceFlagEnabled('perf_route_split')) {
      return;
    }
    
    const handleRouteChange = () => {
      // Small delay to let the route settle
      setTimeout(() => {
        const event = new CustomEvent('routeOptimizationCheck', {
          detail: { pathname: window.location.pathname }
        });
        window.dispatchEvent(event);
      }, 100);
    };
    
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
  
  return children;
}

/**
 * Link component with intelligent preloading
 */
export function OptimizedLink({ to, children, onMouseEnter, ...props }) {
  const handleMouseEnter = (event) => {
    // Preload on hover with debouncing
    if (isPerformanceFlagEnabled('perf_route_split') && isRouteOptimizable(to)) {
      const routeMap = {
        '/': 'Home',
        '/about': 'About',
        '/plans': 'Plans',
        '/contact': 'Contact',
        '/login': 'Login',
        '//unified-registration': 'Register'
      };
      
      const componentName = routeMap[to];
      if (componentName) {
        preloadRouteComponent(to, componentName);
      }
    }
    
    // Call original onMouseEnter if provided
    if (onMouseEnter) {
      onMouseEnter(event);
    }
  };
  
  return React.createElement('a', {
    ...props,
    href: to,
    onMouseEnter: handleMouseEnter,
    children
  });
}

// Initialize lazy components on module load if flag is enabled
if (typeof window !== 'undefined' && isPerformanceFlagEnabled('perf_route_split')) {
  LazyRouteComponents.initialize();
}

export { LazyRouteComponents, EagerComponents };
