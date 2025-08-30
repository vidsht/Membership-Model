/**
 * Performance Feature Flags System
 * Provides runtime control over performance optimizations with zero functional regressions
 */

// Default performance flags - ALL OFF in production for safety
const DEFAULT_FLAGS = {
  // Kill switch - instantly disables all performance optimizations
  perf_disable_all: false,
  
  // Individual optimization flags
  perf_css_split: false,          // Critical CSS extraction and async loading
  perf_lcp_preload: false,        // LCP image preloading optimization
  perf_font_strategy: false,      // Font loading and display optimization
  perf_route_split: false,        // Route-level code splitting
  perf_thirdparty_defer: false,   // Third-party script deferring
  perf_cache_headers: false,      // Enhanced caching strategies
  perf_cls_dims: false,          // CLS fixes with dimensions
};

// Allowlisted routes/components safe for optimization
const SAFE_ROUTES = [
  '/',                    // Homepage
  '/home',               // Home page
  '/about',              // About page
  '/plans',              // Plans/pricing page
  '/contact',            // Contact page
  '/login',              // Login page
  '/register',           // Registration page
];

// Routes/components to EXCLUDE from optimization (QR/barcode/image critical paths)
const EXCLUDED_ROUTES = [
  '/dashboard',          // Contains QR/barcode generation
  '/profile',           // Contains image upload/processing
  '/merchant',          // Contains business logic and image processing
  '/admin',             // Contains complex interactions
  '/deals',             // May contain image processing
  '/verify',            // Contains QR/barcode scanning
];

// Components to EXCLUDE from optimization
const EXCLUDED_COMPONENTS = [
  'MembershipCard',      // QR/barcode generation
  'MerchantCertificate', // QR code generation
  'ImageUpload',         // Image processing pipeline
  'QRCodeGenerator',     // QR code functionality
  'BarcodeGenerator',    // Barcode functionality
];

/**
 * Get performance flags from environment variables with fallbacks
 */
function getEnvironmentFlags() {
  const envFlags = {};
  
  // Read from environment variables (Vite uses VITE_ prefix)
  Object.keys(DEFAULT_FLAGS).forEach(flag => {
    const envKey = `VITE_${flag.toUpperCase()}`;
    const envValue = import.meta.env[envKey];
    
    if (envValue !== undefined) {
      envFlags[flag] = envValue === 'true' || envValue === '1';
    }
  });
  
  return envFlags;
}

/**
 * Get performance flags from localStorage (for runtime toggles)
 */
function getLocalStorageFlags() {
  try {
    const stored = localStorage.getItem('perfFlags');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to parse performance flags from localStorage:', error);
    return {};
  }
}

/**
 * Save performance flags to localStorage
 */
function saveLocalStorageFlags(flags) {
  try {
    localStorage.setItem('perfFlags', JSON.stringify(flags));
  } catch (error) {
    console.warn('Failed to save performance flags to localStorage:', error);
  }
}

/**
 * Main function to get current performance flags
 * Priority: localStorage > environment > defaults
 */
function getPerformanceFlags() {
  const envFlags = getEnvironmentFlags();
  const localFlags = getLocalStorageFlags();
  
  const flags = {
    ...DEFAULT_FLAGS,
    ...envFlags,
    ...localFlags
  };
  
  // Kill switch check - if perf_disable_all is true, disable everything
  if (flags.perf_disable_all) {
    Object.keys(flags).forEach(key => {
      if (key !== 'perf_disable_all') {
        flags[key] = false;
      }
    });
  }
  
  return flags;
}

/**
 * Check if a route is safe for optimization
 */
function isRouteOptimizable(route) {
  // Check if route is in allowlist
  const isSafe = SAFE_ROUTES.some(safeRoute => 
    route === safeRoute || route.startsWith(safeRoute + '/')
  );
  
  // Check if route is explicitly excluded
  const isExcluded = EXCLUDED_ROUTES.some(excludedRoute => 
    route.startsWith(excludedRoute)
  );
  
  return isSafe && !isExcluded;
}

/**
 * Check if a component is safe for optimization
 */
function isComponentOptimizable(componentName) {
  return !EXCLUDED_COMPONENTS.includes(componentName);
}

/**
 * Check if a specific performance flag is enabled
 */
function isPerformanceFlagEnabled(flagName) {
  const flags = getPerformanceFlags();
  return flags[flagName] === true;
}

/**
 * Toggle a performance flag at runtime
 */
function togglePerformanceFlag(flagName, enabled) {
  const currentFlags = getLocalStorageFlags();
  const newFlags = {
    ...currentFlags,
    [flagName]: enabled
  };
  
  saveLocalStorageFlags(newFlags);
  
  // Log the change for debugging
  console.log(`Performance flag ${flagName} ${enabled ? 'enabled' : 'disabled'}`);
  
  // If kill switch was activated, log warning
  if (flagName === 'perf_disable_all' && enabled) {
    console.warn('🔴 Performance kill switch activated - all optimizations disabled');
  }
}

/**
 * Instantly disable all performance optimizations (kill switch)
 */
function disableAllPerformanceOptimizations() {
  togglePerformanceFlag('perf_disable_all', true);
  console.warn('🚨 All performance optimizations have been disabled via kill switch');
}

/**
 * Error boundary integration - disable flag if errors occur
 */
function handlePerformanceError(error, flagName) {
  console.error(`Performance optimization error in ${flagName}:`, error);
  
  // Disable the problematic flag
  togglePerformanceFlag(flagName, false);
  
  // Add Sentry breadcrumb if available
  if (window.Sentry && window.Sentry.addBreadcrumb) {
    window.Sentry.addBreadcrumb({
      message: `Performance optimization disabled due to error: ${flagName}`,
      level: 'warning',
      data: {
        flag: flagName,
        error: error.message,
        performanceFlags: getPerformanceFlags()
      }
    });
  }
}

/**
 * Development helper to log current performance flags
 */
function logPerformanceFlags() {
  if (import.meta.env.DEV) {
    const flags = getPerformanceFlags();
    console.group('🚀 Performance Flags Status');
    Object.entries(flags).forEach(([flag, enabled]) => {
      console.log(`${flag}: ${enabled ? '✅ ON' : '❌ OFF'}`);
    });
    console.groupEnd();
  }
}

// Auto-log flags in development
if (import.meta.env.DEV) {
  logPerformanceFlags();
}

export {
  getPerformanceFlags,
  isPerformanceFlagEnabled,
  isRouteOptimizable,
  isComponentOptimizable,
  togglePerformanceFlag,
  disableAllPerformanceOptimizations,
  handlePerformanceError,
  logPerformanceFlags,
  SAFE_ROUTES,
  EXCLUDED_ROUTES,
  EXCLUDED_COMPONENTS
};
