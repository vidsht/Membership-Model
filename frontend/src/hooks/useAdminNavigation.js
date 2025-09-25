import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

/**
 * Custom hook for managing admin panel navigation with tab context
 * This ensures back buttons return to the correct admin tab instead of always going to dashboard
 */
export const useAdminNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [previousTab, setPreviousTab] = useState('dashboard');

  // Map of route patterns to their corresponding admin tabs
  const routeToTabMap = {
    '/admin/users': 'users',
    '/admin/merchants': 'merchants', 
    '/admin/deals': 'deals',
    '/admin/plans': 'plans',
    '/admin/plan-management': 'plans',
    '/admin/settings': 'settings',
    '/admin/activities': 'activities',
    '/admin/approvals': 'approvals',
    '/admin/birthdays': 'birthdays',
    '/admin/expired': 'expired'
  };

  // Determine the admin tab based on current location
  const getCurrentAdminTab = (pathname) => {
    // Check for exact matches first
    if (routeToTabMap[pathname]) {
      return routeToTabMap[pathname];
    }

    // Check for partial matches (for nested routes)
    for (const [route, tab] of Object.entries(routeToTabMap)) {
      if (pathname.startsWith(route)) {
        return tab;
      }
    }

    // Default to dashboard
    return 'dashboard';
  };

  // Update previous tab when navigating within admin area
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      const currentTab = getCurrentAdminTab(location.pathname);
      
      // Only update previous tab if we're not on a detail/edit page
      // This prevents losing the tab context when navigating to sub-pages
      const isDetailPage = location.pathname.includes('/edit') || 
                          location.pathname.includes('/create') ||
                          /\/admin\/[^/]+\/[^/]+/.test(location.pathname);
      
      if (!isDetailPage || location.pathname === '/admin') {
        setPreviousTab(currentTab);
      }
    }
  }, [location.pathname]);

  /**
   * Enhanced back navigation that returns to the appropriate admin tab
   * @param {string} fallbackTab - Tab to use if no previous tab is determined
   */
  const navigateBackToAdmin = (fallbackTab = 'dashboard') => {
    const targetTab = previousTab || fallbackTab;
    
    // Navigate to admin dashboard with the target tab state
    navigate('/admin', { 
      state: { activeTab: targetTab },
      replace: false 
    });
  };

  /**
   * Navigate to admin with a specific tab
   * @param {string} tab - The tab to navigate to
   */
  const navigateToAdminTab = (tab) => {
    navigate('/admin', { 
      state: { activeTab: tab },
      replace: false 
    });
  };

  /**
   * Navigate to a specific admin route while preserving tab context
   * @param {string} path - The path to navigate to
   * @param {string} sourceTab - The tab this navigation originated from
   */
  const navigateWithContext = (path, sourceTab = null) => {
    if (sourceTab) {
      setPreviousTab(sourceTab);
    }
    navigate(path);
  };

  return {
    navigateBackToAdmin,
    navigateToAdminTab,
    navigateWithContext,
    previousTab,
    getCurrentAdminTab: () => getCurrentAdminTab(location.pathname)
  };
};

export default useAdminNavigation;