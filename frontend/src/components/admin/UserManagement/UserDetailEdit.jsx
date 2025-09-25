import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useImageUrl, SmartImage, DefaultAvatar } from '../../../hooks/useImageUrl.jsx';
import ImageUpload from '../../common/ImageUpload';
import { useDynamicFields } from '../../../hooks/useDynamicFields';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import api from '../../../services/api';
import './UserDetailEdit.css';

const UserDetailEdit = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { navigateBackToAdmin } = useAdminNavigation();
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();
  const { getProfileImageUrl } = useImageUrl();
  const { getCommunityOptions, getCountryOptions, getStateOptions, isLoading: fieldsLoading } = useDynamicFields();

  // State Management
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    community: '',
    country: '',
    state: '',
    city: '',
    userType: 'user',
    membershipType: 'community',
    status: 'approved',
    bloodGroup: '',
    profilePhoto: null
  });

  // Reference data
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

      let communities = [];
      if (communitiesRes.status === 'fulfilled' && communitiesRes.value?.data?.success) {
        communities = communitiesRes.value.data.communities || [];
      } else {
        communities = [
          'Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi', 'Telugu', 
          'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani', 'Other Indian', 'Mixed Heritage'
        ].map(name => ({ name, isActive: true }));
      }

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

      setReferenceData({ communities, plans: allPlans, userPlans, merchantPlans });
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

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users/${userId}`);
      
      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setUser(userData);
        
        // Set form data
        setFormData({
          fullName: userData.fullName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: typeof userData.address === 'string' ? userData.address : JSON.stringify(userData.address || ''),
          dob: userData.dob ? userData.dob.split('T')[0] : '',
          community: userData.community || '',
          country: userData.country || '',
          state: userData.state || '',
          city: userData.city || '',
          userType: userData.userType || 'user',
          membershipType: userData.membershipType || 'community',
          status: userData.status || 'approved',
          bloodGroup: userData.bloodGroup || '',
          profilePhoto: userData.profilePhoto || null
        });

        // Set profile image
        if (userData.profilePhoto) {
          setProfileImage(getProfileImageUrl(userData));
        }
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
    } finally {
      setLoading(false);
    }
  }, [userId, getProfileImageUrl, handleSessionExpired, showNotification, navigate]);

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        const sessionValid = await validateSession();
        if (!sessionValid) {
          handleSessionExpired();
          return;
        }

        await Promise.all([fetchReferenceData(), fetchUserData()]);
      } catch (err) {
        console.error('Error initializing component:', err);
        showNotification('Failed to initialize page', 'error');
      }
    };

    initializeComponent();
  }, []);

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle profile image upload
  const handleProfileImageUpload = async (file) => {
    try {
      const formDataObj = new FormData();
      formDataObj.append('profilePhoto', file);
      formDataObj.append('userId', userId);

      const response = await api.post('/upload/profile-photo', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const newImageUrl = response.data.imageUrl;
        setProfileImage(newImageUrl);
        setFormData(prev => ({ ...prev, profilePhoto: response.data.filename }));
        setUser(prev => ({ ...prev, profilePhoto: response.data.filename }));
        showNotification('Profile photo updated successfully', 'success');
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading profile photo:', err);
      showNotification(err.response?.data?.message || 'Failed to upload profile photo', 'error');
    }
  };

  // Handle save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put(`/admin/users/${userId}`, formData);

      if (response.data.success) {
        setUser(prev => ({ ...prev, ...formData }));
        setEditMode(false);
        showNotification('User updated successfully', 'success');
        // Refresh user data to get latest info
        await fetchUserData();
      } else {
        throw new Error(response.data.message || 'Failed to update user');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      showNotification(err.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditMode(false);
    // Reset form data to original user data
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: typeof user.address === 'string' ? user.address : JSON.stringify(user.address || ''),
        dob: user.dob ? user.dob.split('T')[0] : '',
        community: user.community || '',
        country: user.country || '',
        state: user.state || '',
        city: user.city || '',
        userType: user.userType || 'user',
        membershipType: user.membershipType || 'community',
        status: user.status || 'approved',
        bloodGroup: user.bloodGroup || '',
        profilePhoto: user.profilePhoto || null
      });
    }
  };

  // Get available plans
  const getAvailablePlans = () => {
    if (formData.userType === 'merchant') {
      return referenceData.merchantPlans.filter(plan => plan.type === 'merchant');
    } else {
      return referenceData.userPlans.filter(plan => plan.type === 'user');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'suspended': return 'status-suspended';
      default: return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="user-detail-edit-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-detail-edit-container">
        <div className="error-state">
          <i className="fas fa-user-slash"></i>
          <h3>User Not Found</h3>
          <p>The requested user could not be found.</p>
          <button onClick={() => navigateBackToAdmin('users')} className="btn btn-primary">
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-detail-edit-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <button
              onClick={() => navigateBackToAdmin('users')}
              className="btn-back"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="header-info">
              <h1>{user.fullName || 'Unknown User'}</h1>
              <span className="user-id">ID: {user.id}</span>
              {user.membershipNumber && (
                <span className="membership-number">#{user.membershipNumber}</span>
              )}
            </div>
          </div>
          <div className="header-actions">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="btn btn-primary"
              >
                <i className="fas fa-edit"></i>
                Edit User
              </button>
            ) : (
              <div className="edit-actions">
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  <i className="fas fa-times"></i>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-success"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="btn-spinner"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="user-detail-content">
        {/* Profile Section */}
        <div className="profile-section">
          <div className="profile-card">
            <div className="profile-header">
              
              <div className="profile-info">
                <div className="user-name-section">
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="edit-input name-input"
                      placeholder="Full Name"
                    />
                  ) : (
                    <h2 className="user-name">{user.fullName || 'Unknown User'}</h2>
                  )}
                </div>
                
                <div className="user-meta">
                  <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                    {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                  </span>
                  <span className="user-type-badge">
                    {user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'}
                  </span>
                </div>

                <div className="quick-stats">
                  <div className="stat-item">
                    <i className="fas fa-calendar-plus"></i>
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                  {user.lastLogin && (
                    <div className="stat-item">
                      <i className="fas fa-clock"></i>
                      <span>Last seen {formatDate(user.lastLogin)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Sections */}
        <div className="details-sections">
          {/* Personal Information */}
          <div className="detail-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-user"></i>
                Personal Information
              </h3>
            </div>
            <div className="section-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Email Address</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="edit-input"
                      placeholder="Email address"
                    />
                  ) : (
                    <span>{user.email || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Phone Number</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="edit-input"
                      placeholder="Phone number"
                    />
                  ) : (
                    <span>{user.phone || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Date of Birth</label>
                  {editMode ? (
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{user.dob ? formatDate(user.dob) : 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Blood Group</label>
                  {editMode ? (
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                      className="edit-input"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  ) : (
                    <span>{user.bloodGroup || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Community</label>
                  {editMode ? (
                    <select
                      value={formData.community}
                      onChange={(e) => handleInputChange('community', e.target.value)}
                      className="edit-input"
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
                  ) : (
                    <span>{user.community || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item full-width">
                  <label>Address</label>
                  {editMode ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="edit-input"
                      placeholder="Full address"
                      rows="3"
                    />
                  ) : (
                    <span>{user.address || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="detail-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-map-marker-alt"></i>
                Location
              </h3>
            </div>
            <div className="section-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Country</label>
                  {editMode ? (
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="edit-input"
                    >
                      <option value="">Select country</option>
                      {fieldsLoading ? (
                        <option disabled>Loading countries...</option>
                      ) : (
                        getCountryOptions().map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <span>{user.country || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>State/Region</label>
                  {editMode ? (
                    <select
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="edit-input"
                    >
                      <option value="">Select state/region</option>
                      {fieldsLoading ? (
                        <option disabled>Loading states...</option>
                      ) : (
                        getStateOptions().map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <span>{user.state || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>City</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="edit-input"
                      placeholder="City"
                    />
                  ) : (
                    <span>{user.city || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="detail-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-cog"></i>
                Account Settings
              </h3>
            </div>
            <div className="section-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>User Type</label>
                  {editMode ? (
                    <select
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
                      className="edit-input"
                    >
                      <option value="user">User</option>
                      <option value="merchant">Merchant</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span>{user.userType ? user.userType.charAt(0).toUpperCase() + user.userType.slice(1) : 'User'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Membership Plan</label>
                  {editMode ? (
                    <select
                      value={formData.membershipType}
                      onChange={(e) => handleInputChange('membershipType', e.target.value)}
                      className="edit-input"
                    >
                      {getAvailablePlans().map((plan) => (
                        <option key={plan.key} value={plan.key}>
                          {plan.name} - {plan.currency === 'FREE' ? 'FREE' : `${plan.currency} ${plan.price}/${plan.billingCycle}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>
                      {user.membershipType ? 
                        user.membershipType.charAt(0).toUpperCase() + user.membershipType.slice(1) : 
                        'None'
                      }
                    </span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Account Status</label>
                  {editMode ? (
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="edit-input"
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  ) : (
                    <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                      {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                    </span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Plan Valid Until</label>
                  <span>
                    {user.validationDate ? 
                      formatDate(user.validationDate) : 
                      'No expiry date set'
                    }
                  </span>
                </div>

                <div className="detail-item">
                  <label>Membership Number</label>
                  <span>{user.membershipNumber || 'Not assigned'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailEdit;
