import api from './api.js';
import mockData from './mockData.js';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || false;

console.log('API Service with mock fallback initialized, USE_MOCK_DATA:', USE_MOCK_DATA);

const adminApi = {
  // Partners endpoints with mock fallback
  getPartners: async () => {
    if (USE_MOCK_DATA) {
      console.log('Using mock data for getPartners');
      return {
        success: true,
        partners: [
          mockData['/admin/partners/1'].merchant,
          mockData['/admin/partners/2'].merchant
        ]
      };
    }
    
    try {
      const response = await api.get('/admin/partners');
      return response.data;
    } catch (error) {
      console.error('API call failed, falling back to mock data:', error);
      return {
        success: true,
        partners: [
          mockData['/admin/partners/1'].merchant,
          mockData['/admin/partners/2'].merchant
        ]
      };
    }
  },

  getPartner: async (id) => {
    console.log(`AdminAPI: Getting partner with ID: ${id}`);
    console.log('Mock data available:', USE_MOCK_DATA);
    
    if (USE_MOCK_DATA) {
      const mockKey = `/admin/partners/${id}`;
      const mockResponse = mockData[mockKey] || mockData['/admin/partners/1'];
      console.log('Returning mock data:', mockResponse);
      return mockResponse;
    }
    
    try {
      console.log(`Making API call to: /admin/partners/${id}`);
      const response = await api.get(`/admin/partners/${id}`);
      console.log('API response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('API call failed, falling back to mock data:', error);
      const mockKey = `/admin/partners/${id}`;
      const mockResponse = mockData[mockKey] || mockData['/admin/partners/1'];
      console.log('Returning fallback mock data:', mockResponse);
      return mockResponse;
    }
  },

  updatePartner: async (id, updateData) => {
    console.log(`AdminAPI: Updating partner ${id} with data:`, updateData);
    
    if (USE_MOCK_DATA) {
      console.log('Mock update completed successfully');
      return {
        success: true,
        message: 'Partner updated successfully (mock)',
        merchant: { ...mockData['/admin/partners/1'].merchant, ...updateData }
      };
    }
    
    try {
      const response = await api.put(`/admin/partners/${id}`, updateData);
      console.log('Update API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update API call failed, returning mock success:', error);
      return {
        success: true,
        message: 'Partner updated successfully (mock fallback)',
        merchant: { ...mockData['/admin/partners/1'].merchant, ...updateData }
      };
    }
  },

  // Other admin endpoints (without mock fallback for now)
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  // System settings
  getSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },

  // Admin authentication
  login: async (credentials) => {
    const response = await api.post('/admin/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/admin/logout');
    return response.data;
  },

  me: async () => {
    const response = await api.get('/admin/me');
    return response.data;
  }
};

export default adminApi;
