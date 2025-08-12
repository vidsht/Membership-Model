import api from './api.js';

console.log('API Service initialized');

const adminApi = {
  // Partners endpoints
  getPartners: async () => {
    const response = await api.get('/admin/partners');
    return response.data;
  },

  getPartner: async (id) => {
    console.log(`AdminAPI: Getting partner with ID: ${id}`);
    const response = await api.get(`/admin/partners/${id}`);
    console.log('API response received:', response.data);
    return response.data;
  },

  updatePartner: async (id, updateData) => {
    console.log(`AdminAPI: Updating partner ${id} with data:`, updateData);
    const response = await api.put(`/admin/partners/${id}`, updateData);
    console.log('Update API response:', response.data);
    return response.data;
  },

  createPartner: async (partnerData) => {
    const response = await api.post('/admin/partners', partnerData);
    return response.data;
  },

  // Other admin endpoints
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
