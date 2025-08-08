// UserForm.jsx - Route-based Create/Edit User Form
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './UserForm.css';

const UserForm = () => {
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
    status: 'approved'
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
      const [communitiesRes, allPlansRes, userPlansRes, merchantPlansRes] = await Promise.allSettled([
        api.get('/admin/communities'),
        api.get('/admin/plans'),
        api.get('/admin/plans?userType=user'),
        api.get('/admin/plans?userType=merchant')
      ]);

      // Handle communities
      let communities = [];
      if (communitiesRes.status === 'fulfilled' && communitiesRes.value?.data?.success) {
        communities = communitiesRes.value.data.communities || [];
      } else {
        communities = [
          'Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi', 'Telugu', 
          'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani', 'Other Indian', 'Mixed Heritage'
        ].map(name => ({ name, isActive: true }));
      }

      // Handle plans
      let allPlans = [];
      if (allPlansRes.status === 'fulfilled' && allPlansRes.value?.data?.success) {
        allPlans = allPlansRes.value.data.plans || [];
      } else {
        allPlans = fallbackPlans;
      }

      let userPlans = [];
      if (userPlansRes.status === 'fulfilled' && userPlansRes.value?.data?.success) {
        userPlans = userPlansRes.value.data.plans.filter(plan => plan.type === 'user') || [];
      } else {
        userPlans = allPlans.filter(plan => plan.type === 'user');
      }

      let merchantPlans = [];
      if (merchantPlansRes.status === 'fulfilled' && merchantPlansRes.value?.data?.success) {
        merchantPlans = merchantPlansRes.value.data.plans.filter(plan => plan.type === 'merchant') || [];
      } else {
        merchantPlans = allPlans.filter(plan => plan.type === 'merchant');
      }

      setReferenceData({
        communities,
        plans: allPlans,
        userPlans,
        merchantPlans
      });
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
        navigate('/admin/users');
        return;
      }
      showNotification('Failed to load user data', 'error');
    }
  }, [userId, handleSessionExpired, showNotification, navigate]);

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
  }, [isEditMode, fetchReferenceData, fetchUserData, validateSession, handleSessionExpired, showNotification]);

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
        
        navigate('/admin/users');
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
              onClick={() => navigate('/admin/users')}
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
                    {referenceData.communities.map((community, index) => (
                      <option key={index} value={community.name}>
                        {community.name}
                      </option>
                    ))}
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
                    <option value="Ghana">Ghana</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="state">State/Region</label>
                  <input
                    type="text"
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Enter state or region"
                  />
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
              onClick={() => navigate('/admin/users')}
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
