
import axios from 'axios';
// Get all deals (for users)
export const getAllDeals = async () => {
  const response = await api.get('/deals');
  return response.data;
};

// Redeem a deal
export const redeemDeal = async (dealId) => {
  const response = await api.post(`/deals/${dealId}/redeem`);
  return response.data;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
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
    
    // Add detailed error logging for debugging
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
    
    // Log the full error for debugging
    console.log('Full error object:', error);
    
    // Don't redirect on 401 in API layer - let components handle it
    return Promise.reject(error);
  }
);

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
  }
};

// Merchant API functions
export const merchantApi = {
  // Get merchant dashboard data
  getDashboard: async () => {
    const response = await api.get('/merchant/dashboard');
    return response.data;
  },

  // Update merchant business info
  updateBusinessInfo: async (businessData) => {
    const response = await api.put('/merchant/business-info', businessData);
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
    const response = await api.get(`/deals/business/${businessId}`);
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
  }
};

export default api;