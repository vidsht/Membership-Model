import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// ✅ FIXED: Simple response interceptor without loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Filter out browser extension connection errors
    if (error && error.message && 
        error.message.includes('Could not establish connection') && 
        error.message.includes('Receiving end does not exist')) {
      console.warn('Browser extension connection error suppressed in API call:', error.message);
      // Return a resolved promise with a default response to prevent app crashes
      return Promise.resolve({
        status: 200,
        data: { success: true, browserExtensionErrorSuppressed: true }
      });
    }
    
    // Handle 401 authentication errors globally
    if (error.response?.status === 401) {
      // Clear any cached auth state
      localStorage.removeItem('auth');
      sessionStorage.removeItem('auth');
      
      // Check if we're in admin context
      const currentPath = window.location.pathname;
      if (currentPath.includes('/admin')) {
        // Only redirect if not already on login page
        if (!currentPath.includes('/login')) {
          console.log('Session expired, redirecting to admin login');
          window.location.href = '/admin/login';
        }
      } else if (currentPath.includes('/merchant')) {
        // Only redirect if not already on login page
        if (!currentPath.includes('/login')) {
          console.log('Session expired, redirecting to merchant login');
          window.location.href = '/merchant/login';
        }
      } 
      // Removed forced redirect to login on 401
    }
    
    // Skip logging for expected errors that are handled gracefully
    const isExpectedError = (
      // Plan seeding "already exist" error is expected
      (error.config?.url?.includes('/admin/plans/seed') && 
       error.response?.status === 400 && 
       error.response?.data?.message?.includes('already exist')) ||
      // Add other expected errors here as needed
      false
    );
    
    // Add detailed error logging for debugging (skip expected errors)
    if (!isExpectedError) {
      console.error('API Error Details:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        withCredentials: error.config?.withCredentials,
        request: {
          baseURL: error.config?.baseURL,
          data: error.config?.data,
          params: error.config?.params
        }
      });    
    }
    
    // Log the full error for debugging (skip expected errors)
    if (!isExpectedError) {
      console.log('Full error object:', error);
    }
    
    // Don't redirect on 401 in API layer - let components handle it
    return Promise.reject(error);
  }
);

// Get all deals (for users)
export const getAllDeals = async () => {
  const response = await api.get('/deals');
  // Always return the deals array, never the whole object
  return response.data.deals || [];
};

// Redeem a deal
export const redeemDeal = async (dealId) => {
  const response = await api.post(`/deals/${dealId}/redeem`);
  return response.data;
};

export const authApi = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Merchant login
  merchantLogin: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Merchant registration
  merchantRegister: async (merchantData) => {
    const response = await api.post('/auth/merchant/register', merchantData);
    return response.data;
  },
  // Password reset
  requestPasswordReset: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  validateResetToken: async (token) => {
    const response = await api.get(`/auth/reset-password/${token}/validate`);
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post(`/auth/reset-password/${token}`, { password: newPassword });
    return response.data;
  },
  
  // Session refresh
  refreshSession: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Get communities for dropdown
  getCommunities: async () => {
    const response = await api.get('/auth/communities');
    return response.data;
  },

  // Get user types for dropdown
  getUserTypes: async () => {
    const response = await api.get('/auth/user-types');
    return response.data;
  }
};

// Get all plans
export const getAllPlans = async (type = null, isActive = true) => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (isActive !== null) params.append('isActive', isActive.toString());
  
  const response = await api.get(`/plans?${params.toString()}`);
  return response.data;
};

// Get upgrade plans for a specific user priority level
export const getUpgradePlans = async (userPriority = 1) => {
  const response = await api.get(`/deals/upgrade-plans/${userPriority}`);
  return response.data.upgradePlans || [];
};

// Get all businesses (for users)
export const getAllBusinesses = async () => {
  const response = await api.get('/businesses');
  return response.data.businesses || [];
};

// Merchant API functions
export const merchantApi = {
  // Verify member by membership number
  verifyMember: async (membershipNumber) => {
    const response = await api.get(`/merchant/verify-member/${encodeURIComponent(membershipNumber)}`);
    return response.data;
  },
  // Get merchant dashboard data
  getDashboard: async () => {
    const response = await api.get('/merchant/dashboard');
    return response.data;
  },

  // Update merchant business info
  updateBusinessInfo: async (businessData) => {
    const response = await api.put('/merchant/profile', businessData);
    return response.data;
  },

  // Update merchant profile (alias for updateBusinessInfo)
  updateProfile: async (businessData) => {
    const response = await api.put('/merchant/profile', businessData);
    return response.data;
  },

  // Get merchant deals
  getDeals: async () => {
    const response = await api.get('/merchant/deals');
    return response.data;
  },

  // Create new deal
  createDeal: async (dealData) => {
    // businessId is now included in dealData, but backend will use session to verify
    const response = await api.post('/merchant/deals', dealData);
    return response.data;
  },
  // Fetch business details by businessId (for admin/customer views)
  getBusinessById: async (businessId) => {
    // Use new admin businesses endpoint for business details
    const response = await api.get(`/admin/businesses/${businessId}`);
    return response.data;
  },

  // Update deal
  updateDeal: async (dealId, dealData) => {
    const response = await api.put(`/merchant/deals/${dealId}`, dealData);
    return response.data;
  },

  // Delete deal
  deleteDeal: async (dealId) => {
    const response = await api.delete(`/merchant/deals/${dealId}`);
    return response.data;
  },

  // Get analytics data
  getAnalytics: async (dealId = null) => {
    const endpoint = dealId ? `/merchant/analytics/deals/${dealId}` : '/merchant/analytics/deals';
    const response = await api.get(endpoint);
    return response.data;
  },

  // Get merchant notifications
  getNotifications: async () => {
    const response = await api.get('/merchant/notifications');
    return response.data;
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId) => {
    const response = await api.patch(`/merchant/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllNotificationsAsRead: async () => {
    const response = await api.patch('/merchant/notifications/read-all');
    return response.data;
  },

  // Get redemption requests
  getRedemptionRequests: async () => {
    console.log('[DEBUG FRONTEND] Calling redemption requests API...');
    console.log('[DEBUG FRONTEND] Full API URL:', `${API_BASE_URL}/merchant/redemption-requests`);
    try {
      const response = await api.get('/merchant/redemption-requests');
      console.log('[DEBUG FRONTEND] Redemption requests API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG FRONTEND] API call failed:', error);
      throw error;
    }
  },

  // Approve redemption request
  approveRedemptionRequest: async (requestId) => {
    const response = await api.patch(`/merchant/redemption-requests/${requestId}/approve`);
    return response.data;
  },

  // Reject redemption request
  rejectRedemptionRequest: async (requestId, reason) => {
    const response = await api.patch(`/merchant/redemption-requests/${requestId}/reject`, { reason });
    return response.data;
  }
};

// Export individual merchant helper wrappers for named imports used across the app
export const getNotifications = async () => merchantApi.getNotifications();
export const markNotificationAsRead = async (notificationId) => merchantApi.markNotificationAsRead(notificationId);
export const markAllNotificationsAsRead = async () => merchantApi.markAllNotificationsAsRead();
export const getRedemptionRequests = async () => merchantApi.getRedemptionRequests();
export const approveRedemptionRequest = async (requestId) => merchantApi.approveRedemptionRequest(requestId);
export const rejectRedemptionRequest = async (requestId, reason) => merchantApi.rejectRedemptionRequest(requestId, reason);

export default api;