import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import PlanExpiryBanner from '../components/PlanExpiryBanner';
import ImageUpload from '../components/common/ImageUpload';
import { useImageUrl } from '../hooks/useImageUrl.jsx';
import api from '../services/api';
import '../styles/enhanced-user-settings.css';

const UserSettings = () => {
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const { getProfileImageUrl, getMerchantLogoUrl } = useImageUrl();
  const [userProfile, setUserProfile] = useState({
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    community: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    country: 'Ghana',
    profilePicture: '',
    membershipType: '',
    membershipNumber: '',
    createdAt: '',
    status: '',
    role: ''
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [notificationState, setNotificationState] = useState({ message: '', type: '' });
  const [currentActiveTab, setCurrentActiveTab] = useState(() => {
    return user?.role === 'merchant' ? 'business' : 'profile';
  });
  const [userRedemptions, setUserRedemptions] = useState([]);
  const [redemptionsLoadingState, setRedemptionsLoadingState] = useState(false);

  // Update active tab when user role changes
  useEffect(() => {
    if (user?.role === 'merchant' && currentActiveTab === 'profile') {
      setCurrentActiveTab('business');
    } else if (user?.role !== 'merchant' && currentActiveTab === 'business') {
      setCurrentActiveTab('profile');
    }
  }, [user?.role, currentActiveTab]);

  // Fetch comprehensive user data
  useEffect(() => {
    if (user) {
      fetchUserProfileData();
    }
  }, [user]);

  const fetchUserProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/users/profile/complete');
      const userData = response.data.user || user;
      
      // Parse address if it's a string
      let parsedAddress = { street: '', city: '', state: '', zipCode: '' };
      if (userData.address) {
        if (typeof userData.address === 'object') {
          parsedAddress = {
            street: userData.address.street || userData.address.address || '',
            city: userData.address.city || '',
            state: userData.address.state || '',
            zipCode: userData.address.zipCode || userData.address.zip || ''
          };
        } else if (typeof userData.address === 'string') {
          try {
            const parsed = JSON.parse(userData.address);
            parsedAddress = {
              street: parsed.street || parsed.address || userData.address || '',
              city: parsed.city || '',
              state: parsed.state || '',
              zipCode: parsed.zipCode || parsed.zip || ''
            };
          } catch (e) {
            parsedAddress = { street: userData.address, city: '', state: '', zipCode: '' };
          }
        }
      }

      setUserProfile({
        fullName: userData.fullName || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        dob: userData.dob ? userData.dob.split('T')[0] : '',
        gender: userData.gender || '',
        bloodGroup: userData.bloodGroup || '',
        community: userData.community || '',
        address: parsedAddress,
        country: userData.country || 'Ghana',
        profilePicture: userData.profilePicture || userData.profilePhoto || '',
        membershipType: userData.membershipType || userData.membership || '',
        membershipNumber: userData.membershipNumber || '',
        createdAt: userData.createdAt || '',
        status: userData.status || '',
        role: userData.role || ''
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      showNotification('Failed to load user profile data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user redemptions when redemptions tab is active
  const fetchRedemptions = async () => {
    if (activeTab !== 'redemptions') return;
    
    setRedemptionsLoading(true);
    try {
      const response = await api.get('/deals/user/redeemed');
      if (response.data.success) {
        setRedemptions(response.data.redeemedDeals || []);
      }
    } catch (err) {
      console.error('Error fetching redemptions:', err);
      showNotification('Failed to load redemption history', 'error');
    } finally {
      setRedemptionsLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/users/profile', formData);
      // Wait 600ms before showing notification (for toggle UX)
      await new Promise(resolve => setTimeout(resolve, 600));
      if (response && response.data && response.data.user) {
        updateUser(response.data.user);
        setSuccess('Profile updated successfully! Your changes have been saved.');
        showNotification('Profile updated successfully! Your changes have been saved.', 'success');
      } else {
        setError('Failed to update profile. Please try again.');
        showNotification('Failed to update profile. Please try again.', 'error');
      }
    } catch (err) {
      await new Promise(resolve => setTimeout(resolve, 600));
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      const errorMsg = 'New passwords do not match. Please check and try again.';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      const errorMsg = 'New password must be at least 6 characters long.';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      const successMsg = 'Password changed successfully! Your account is now more secure.';
      setSuccess(successMsg);
      showNotification(successMsg, 'success');
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to change password. Please check your current password and try again.';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };
  const deleteAccount = async () => {
    const confirmed = await showDeleteConfirm('your account', async () => {
      try {
        await api.delete('/users/account');
        showNotification('Account deleted successfully', 'success');
        // This would typically redirect to login page
        window.location.href = '/login';
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete account');
      }
    }, {
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action cannot be undone.',
      confirmText: 'Delete Account'
    });
  };

  return (
    <div className={`page active ${user?.role === 'merchant' ? 'merchant-settings' : ''}`}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="page-header">
              <h1>
                <i className="fas fa-user-cog me-2"></i>
                Account Settings
              </h1>
              <p className="lead">Manage your account information and preferences</p>
            </div>

            {/* Notification */}
            {(error || success) && (
              <div className={`notification ${success ? 'success' : 'error'}`}>
                <span>{error || success}</span>
                <button onClick={() => {
                  setError('');
                  setSuccess('');
                }}>×</button>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="settings-tabs">
              {user?.role === 'merchant' ? (
                <>
                  <button 
                    className={`tab ${activeTab === 'business' ? 'active' : ''}`}
                    onClick={() => setActiveTab('business')}
                  >
                    <i className="fas fa-store"></i> Business Logo
                  </button>
                  <button 
                    className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                  >
                    <i className="fas fa-shield-alt"></i> Security
                  </button>
                  <button 
                    className={`tab ${activeTab === 'redemptions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('redemptions')}
                  >
                    <i className="fas fa-ticket-alt"></i> Redemptions
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                  >
                    <i className="fas fa-user"></i> Profile
                  </button>
                  <button 
                    className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                  >
                    <i className="fas fa-shield-alt"></i> Security
                  </button>
                  <button 
                    className={`tab ${activeTab === 'redemptions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('redemptions')}
                  >
                    <i className="fas fa-ticket-alt"></i> Redemptions
                  </button>
                </>
              )}
            </div>

            {/* Business Tab (Merchants Only) */}
            {user?.role === 'merchant' && activeTab === 'business' && (
              <div className="settings-section">
                <div className="card mb-4">
                  <div className="card-header">
                    <h4 className="mb-0">
                      <i className="fas fa-store me-2"></i>
                      Business Logo Settings
                    </h4>
                    <p className="mb-0 mt-2 text-muted">Upload and manage your business logo for the directory</p>
                  </div>
                  <div className="card-body">
                    <div className="row justify-content-center">
                      <div className="col-md-8">
                        <div className="business-logo-section text-center">
                          <h5 className="mb-3">
                            <i className="fas fa-image me-2"></i>
                            Business Logo
                          </h5>
                          <p className="text-muted mb-4">
                            Upload your business logo to be displayed in the business directory and on business cards throughout the platform.
                          </p>
                          <ImageUpload
                            type="merchant"
                            entityId={user?.business?.businessId || user?.id}
                            currentImage={user?.business?.logo ? `/uploads/businesses/${user.business.logo}` : null}
                            onUploadSuccess={(data) => {
                              showNotification('Business logo updated successfully!', 'success');
                              // Update user business data in context
                              if (user.business) {
                                updateUser({
                                  ...user,
                                  business: {
                                    ...user.business,
                                    logo: data.filename
                                  }
                                });
                              }
                            }}
                            onUploadError={(error) => {
                              showNotification('Failed to upload business logo', 'error');
                            }}
                            label="Upload Business Logo"
                            description="Recommended size: 200x200px. Supported formats: JPG, PNG, GIF"
                            aspectRatio="1:1"
                            className="mb-4"
                          />
                          <div className="logo-preview-info">
                            <div className="alert alert-info">
                              <i className="fas fa-info-circle me-2"></i>
                              <strong>Where your logo will appear:</strong>
                              <ul className="mb-0 mt-2 text-start">
                                <li>Business Directory listings</li>
                                <li>Business Partner cards on the home page</li>
                                <li>Your business profile page</li>
                                <li>Deal advertisements</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && user?.role !== 'merchant' && (
              <div className="settings-section">
                {/* Profile Information */}
                <div className="card mb-4">
                  <div className="card-header">
                    <h4 className="mb-0">
                      <i className="fas fa-user me-2"></i>
                      Profile Information
                    </h4>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleProfileUpdate}>
                      {/* Profile Photo Upload Section */}
                      <div className="row mb-4">
                        <div className="col-12">
                          <h5 className="mb-3">
                            <i className="fas fa-camera me-2"></i>
                            Profile Photo
                          </h5>
                          <ImageUpload
                            type="profile"
                            entityId={user?.id}
                            currentImage={getProfileImageUrl(user)}
                            onUploadSuccess={(data) => {
                              showNotification('Profile photo updated successfully!', 'success');
                              // Update user data in context
                              updateUser({ ...user, profilePhoto: data.filename });
                            }}
                            onUploadError={(error) => {
                              showNotification('Failed to upload profile photo', 'error');
                            }}
                            label="Upload Profile Photo"
                            description="This will be displayed on your membership card and in the community directory"
                            aspectRatio="1:1"
                            className="mb-4"
                          />
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Full Name</label>
                            <input
                              type="text"
                              className="form-control"
                              value={formData.name}
                              onChange={(e) => setFormData({...formData, name: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Email Address</label>
                            <input
                              type="email"
                              className="form-control"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Phone Number</label>
                            <input
                              type="tel"
                              className="form-control"
                              value={formData.phone}
                              onChange={handleInputChange}
                              placeholder="+233 XX XXX XXXX"
                              name="phone"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="address-section">
                        <h3>Address Information</h3>
                        <div className="form-grid">
                          <div className="form-group">
                            <label htmlFor="street">
                              <i className="fas fa-road"></i> Street Address
                            </label>
                            <input
                              type="text"
                              id="street"
                              name="address.street"
                              value={formData.address.street}
                              onChange={handleInputChange}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="city">
                              <i className="fas fa-city"></i> City
                            </label>
                            <input
                              type="text"
                              id="city"
                              name="address.city"
                              value={formData.address.city}
                              onChange={handleInputChange}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="state">
                              <i className="fas fa-map"></i> State/Region
                            </label>
                            <input
                              type="text"
                              id="state"
                              name="address.state"
                              value={formData.address.state}
                              onChange={handleInputChange}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="zipCode">
                              <i className="fas fa-mail-bulk"></i> ZIP/Postal Code
                            </label>
                            <input
                              type="text"
                              id="zipCode"
                              name="address.zipCode"
                              value={formData.address.zipCode}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? 'Updating...' : 'Update Profile'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="settings-section">
                <h2>Security Settings</h2>
                <form onSubmit={handlePasswordChange} className="settings-form">
                  <div className="form-group">
                    <label htmlFor="currentPassword">
                      <i className="fas fa-lock"></i> Current Password
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="newPassword">
                      <i className="fas fa-key"></i> New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordInputChange}
                      minLength="6"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirmPassword">
                      <i className="fas fa-check"></i> Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordInputChange}
                      minLength="6"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-warning"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Changing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key me-2"></i>
                        Change Password
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Redemptions History Tab */}
            {activeTab === 'redemptions' && (
              <div className="settings-section">
                <div className="card">
                  <div className="card-header">
                    <h4 className="mb-0">
                      <i className="fas fa-ticket-alt me-2"></i>
                      Redemption History
                    </h4>
                  </div>
                  <div className="card-body">
                    {redemptionsLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading redemption history...</p>
                      </div>
                    ) : redemptions.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                        <h5 className="text-muted">No Redemptions Yet</h5>
                        <p className="text-muted">You haven't redeemed any deals yet. Start exploring deals to see your redemption history here!</p>
                      </div>
                    ) : (
                      <div className="redemptions-list">
                        {redemptions.map((redemption) => (
                          <div key={redemption.id} className="redemption-item card mb-3">
                            <div className="card-body">
                              <div className="row align-items-center">
                                <div className="col-md-8">
                                  <h5 className="deal-title mb-1">{redemption.title}</h5>
                                  <p className="business-name text-muted mb-1">
                                    <i className="fas fa-store me-1"></i>
                                    {redemption.businessName}
                                  </p>
                                  {redemption.businessAddress && (
                                    <p className="business-address text-muted mb-1">
                                      <i className="fas fa-map-marker-alt me-1"></i>
                                      {redemption.businessAddress}
                                    </p>
                                  )}
                                  <p className="deal-discount mb-2">
                                    <span className="badge bg-success">
                                      {redemption.discountType === 'percentage' 
                                        ? `${redemption.discount}% OFF` 
                                        : `$${redemption.discount} OFF`
                                      }
                                    </span>
                                  </p>
                                </div>
                                <div className="col-md-4 text-md-end">
                                  <div className="redemption-status mb-2">
                                    <span className={`badge ${
                                      redemption.status === 'approved' ? 'bg-success' :
                                      redemption.status === 'pending' ? 'bg-warning' :
                                      redemption.status === 'rejected' ? 'bg-danger' : 'bg-secondary'
                                    }`}>
                                      <i className={`fas ${
                                        redemption.status === 'approved' ? 'fa-check' :
                                        redemption.status === 'pending' ? 'fa-clock' :
                                        redemption.status === 'rejected' ? 'fa-times' : 'fa-question'
                                      } me-1`}></i>
                                      {redemption.status?.charAt(0).toUpperCase() + redemption.status?.slice(1) || 'Unknown'}
                                    </span>
                                  </div>
                                  <small className="text-muted">
                                    <i className="fas fa-calendar me-1"></i>
                                    {new Date(redemption.redeemed_at).toLocaleDateString()}
                                  </small>
                                  {redemption.status === 'rejected' && redemption.rejection_reason && (
                                    <div className="mt-2">
                                      <small className="text-danger">
                                        <i className="fas fa-exclamation-triangle me-1"></i>
                                        Reason: {redemption.rejection_reason}
                                      </small>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="card border-danger">
              <div className="card-header bg-danger text-white">
                <h4 className="mb-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Danger Zone
                </h4>
              </div>
              <div className="card-body">
                <p className="card-text">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  className="btn btn-danger"
                  onClick={deleteAccount}
                >
                  <i className="fas fa-trash me-2"></i>
                  Delete Account
                </button>
              </div>
            </div>
          </div>        </div>
      </div>
      <Modal modal={modal} onClose={hideModal} />
    </div>
  );
};

export default UserSettings;
