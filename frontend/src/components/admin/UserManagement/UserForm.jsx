// UserForm.jsx - Route-based Create/Edit User Form
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDynamicFields } from '../../../hooks/useDynamicFields';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './UserForm.css';

const UserForm = () => {
  const { getCommunityOptions, getCountryOptions, getStateOptions, isLoading: fieldsLoading } = useDynamicFields();
  const { userId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(userId);
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    community: '',
    country: 'Ghana',
    state: '',
    city: '',
    userType: 'user',
    membershipType: 'community',
    status: 'approved',
    bloodGroup: ''
  });

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [errors, setErrors] = useState({});

  // Reference data state
  const [referenceData, setReferenceData] = useState({
    communities: [],
    plans: [],
    userPlans: [],
    merchantPlans: []
  });

  // Fallback plans
  const fallbackPlans = useMemo(() => [
    { id: 1, key: 'community', name: 'Community Plan', type: 'user', price: 0, currency: 'FREE', billingCycle: 'yearly' },
    { id: 2, key: 'silver', name: 'Silver Plan', type: 'user', price: 50, currency: 'GHS', billingCycle: 'yearly' },
    { id: 3, key: 'gold', name: 'Gold Plan', type: 'user', price: 150, currency: 'GHS', billingCycle: 'yearly' },
    { id: 4, key: 'basic_business', name: 'Basic Business', type: 'merchant', price: 100, currency: 'GHS', billingCycle: 'monthly' },
    { id: 5, key: 'premium_business', name: 'Premium Business', type: 'merchant', price: 200, currency: 'GHS', billingCycle: 'monthly' }
  ], []);

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      // Fetch communities via existing API (fallback to built-in list if it fails)
      let communities = [];
      try {
        const cRes = await api.get('/admin/communities');
        if (cRes?.data?.success) {
          communities = cRes.data.communities || [];
        } else {
          throw new Error('No communities');
        }
      } catch (e) {
        communities = [
          'Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi', 'Telugu',
          'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani', 'Other Indian', 'Mixed Heritage'
        ].map(name => ({ name, isActive: true }));
      }

      // Load plans using the same approach as UnifiedRegistration (absolute API endpoints)
      const API_BASE = 'https://membership-model.onrender.com/api'; // Replace with real backend URL or env var

      // Try to fetch all plans via admin API as fallback
      let allPlans = [];
      try {
        const allRes = await api.get('/admin/plans');
        if (allRes?.data?.success) allPlans = allRes.data.plans || [];
      } catch (e) {
        allPlans = fallbackPlans;
      }

      // Fetch user and merchant plans from API_BASE endpoints (active plans)
      let userPlans = [];
      let merchantPlans = [];
      try {
        const [uRes, mRes] = await Promise.all([
          fetch(`${API_BASE}/plans?type=user&isActive=true`, { credentials: 'include', headers: { 'Accept': 'application/json' } }),
          fetch(`${API_BASE}/plans?type=merchant&isActive=true`, { credentials: 'include', headers: { 'Accept': 'application/json' } })
        ]);

        if (uRes.ok) {
          const uJson = await uRes.json();
          userPlans = uJson.plans || [];
        } else {
          userPlans = allPlans.filter(p => p.type === 'user');
        }

        if (mRes.ok) {
          const mJson = await mRes.json();
          merchantPlans = mJson.plans || [];
        } else {
          merchantPlans = allPlans.filter(p => p.type === 'merchant');
        }
      } catch (e) {
        // fallback
        userPlans = allPlans.filter(p => p.type === 'user');
        merchantPlans = allPlans.filter(p => p.type === 'merchant');
      }

      setReferenceData({
        communities,
        plans: allPlans,
        userPlans,
        merchantPlans
      });

      // If creating a new user, default membershipType to first user plan if available
      if (!isEditMode && (!formData.membershipType || formData.membershipType === 'community')) {
        if (userPlans && userPlans.length > 0) {
          setFormData(prev => ({ ...prev, membershipType: userPlans[0].key || prev.membershipType }));
        }
      }
    } catch (err) {
      console.error('Error fetching reference data:', err);
      setReferenceData({
        communities: [{ name: 'General', isActive: true }],
        plans: fallbackPlans,
        userPlans: fallbackPlans.filter(plan => plan.type === 'user'),
        merchantPlans: fallbackPlans.filter(plan => plan.type === 'merchant')
      });
    }
  }, [fallbackPlans]);

  // Fetch user data for edit mode
  const fetchUserData = useCallback(async () => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      if (response.data.success && response.data.user) {
        const user = response.data.user;
        setFormData({
          fullName: user.fullName || '',
          email: user.email || '',
          phone: user.phone || '',
          address: typeof user.address === 'string' ? user.address : typeof user.address === 'object' ? JSON.stringify(user.address) : '',
          dob: user.dob ? user.dob.split('T')[0] : '',
          community: user.community || '',
          country: user.country || 'Ghana',
          state: user.state || '',
          city: user.city || '',
          userType: user.userType || 'user',
          membershipType: user.membershipType || 'community',
          status: user.status || 'approved'
        });
      } else {
        throw new Error(response.data.message || 'User not found');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      if (err.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      if (err.response?.status === 404) {
        showNotification('User not found', 'error');
        navigate('/admin');
        return;
      }
      showNotification('Failed to load user data', 'error');
    }
  }, [userId]); // Remove function dependencies to prevent re-rendering

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        const sessionValid = await validateSession();
        if (!sessionValid) {
          handleSessionExpired();
          return;
        }

        await fetchReferenceData();
        
        if (isEditMode) {
          await fetchUserData();
        }
      } catch (err) {
        console.error('Error initializing component:', err);
        showNotification('Failed to initialize form', 'error');
      } finally {
        setPageLoading(false);
      }
    };

    initializeComponent();
  }, [isEditMode]); // Remove function dependencies to prevent re-rendering

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13) {
        newErrors.dob = 'User must be at least 13 years old';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      let response;
      if (isEditMode) {
        response = await api.put(`/admin/users/${userId}`, formData);
      } else {
        response = await api.post('/admin/users', formData);
      }

      if (response.data.success) {
        showNotification(
          `User ${isEditMode ? 'updated' : 'created'} successfully`,
          'success'
        );
        
        if (!isEditMode && response.data.tempPassword) {
          showNotification(
            `Temporary password: ${response.data.tempPassword}. Please share this securely.`,
            'info',
            10000
          );
        }
        
        navigate('/admin');
      } else {
        throw new Error(response.data.message || `Failed to ${isEditMode ? 'update' : 'create'} user`);
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} user:`, err);
      const message = err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} user`;
      showNotification(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get available membership plans
  const getAvailablePlans = () => {
    if (formData.userType === 'merchant') {
      return referenceData.merchantPlans.filter(plan => plan.type === 'merchant');
    } else {
      return referenceData.userPlans.filter(plan => plan.type === 'user');
    }
  };

  if (pageLoading) {
    return (
      <div className="user-form-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-form-container">
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <button
              onClick={() => navigate('/admin', { state: { activeTab: 'users' } })}
              className="btn-back"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <h1>{isEditMode ? 'Edit User' : 'Add New User'}</h1>
          </div>
        </div>
      </div>

      <div className="form-content">
        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-sections">
            {/* Personal Information Section */}
            <div className="form-section">
              <h3>Personal Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={errors.fullName ? 'error' : ''}
                    placeholder="Enter full name"
                  />
                  {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'error' : ''}
                    placeholder="Enter email address"
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={errors.phone ? 'error' : ''}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="dob">Date of Birth</label>
                  <input
                    type="date"
                    id="dob"
                    value={formData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    className={errors.dob ? 'error' : ''}
                  />
                  {errors.dob && <span className="error-message">{errors.dob}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="community">Community</label>
                  <select
                    id="community"
                    value={formData.community}
                    onChange={(e) => handleInputChange('community', e.target.value)}
                  >
                    <option value="">Select community</option>
                    {fieldsLoading ? (
                      <option disabled>Loading communities...</option>
                    ) : (
                      getCommunityOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bloodGroup">Blood Group</label>
                  <select
                    id="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                  >
                    <option value="">Select blood group (optional)</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Enter full address"
                  rows="3"
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="form-section">
              <h3>Location</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  >
                    <option value="">Select country</option>
                    {fieldsLoading ? (
                      <option disabled>Loading countries...</option>
                    ) : (
                      getCountryOptions().map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="state">State/Region</label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  >
                    <option value="">Select state/region</option>
                    {fieldsLoading ? (
                      <option disabled>Loading states...</option>
                    ) : (
                      getStateOptions().map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Enter city"
                  />
                </div>
              </div>
            </div>

            {/* Account Settings Section */}
            <div className="form-section">
              <h3>Account Settings</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="userType">User Type</label>
                  <select
                    id="userType"
                    value={formData.userType}
                    onChange={(e) => {
                      const newUserType = e.target.value;
                      handleInputChange('userType', newUserType);
                      // Reset membership type when user type changes
                      if (newUserType === 'merchant') {
                        handleInputChange('membershipType', 'basic_business');
                      } else {
                        handleInputChange('membershipType', 'community');
                      }
                    }}
                  >
                    <option value="user">User</option>
                    <option value="merchant">Merchant</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="membershipType">Membership Plan</label>
                  <select
                    id="membershipType"
                    value={formData.membershipType}
                    onChange={(e) => handleInputChange('membershipType', e.target.value)}
                  >
                    {getAvailablePlans().map((plan) => (
                      <option key={plan.key} value={plan.key}>
                        {plan.name} - {plan.currency === 'FREE' ? 'FREE' : `${plan.currency} ${plan.price}/${plan.billingCycle}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="btn-spinner"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className={`fas ${isEditMode ? 'fa-save' : 'fa-plus'}`}></i>
                  {isEditMode ? 'Update User' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
