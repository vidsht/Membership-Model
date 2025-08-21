import React, { useState, useEffect, useCallback } from 'react';
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

  const fetchUserProfileData = useCallback(async () => {
  try {
    setIsLoading(true);
    // Prefer the authenticated user available from AuthContext (same as MembershipCard)
    if (user) {
      const userData = user;

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
        profilePicture: userData.profilePicture || userData.profilePhoto || userData.profilePhotoUrl || '',
        membershipType: userData.membershipType || userData.membership || '',
        membershipNumber: userData.membershipNumber || '',
        createdAt: userData.created_at || '',
        status: userData.status || '',
        role: userData.role || userData.userType || ''
      });
      return;
    }

    // Fallback: call the protected endpoint only if context user is not available
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
      createdAt: userData.created_at || '',
      status: userData.status || '',
      role: userData.role || ''
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    showNotification('Failed to load user profile data', 'error');
  } finally {
    setIsLoading(false);
  }
}, [user, showNotification]);

useEffect(() => {
        if (user) {
          fetchUserProfileData();
        }
      }, [user, fetchUserProfileData]);

  // Fetch user redemption history
const fetchRedemptionHistory = useCallback(async () => {
  try {
    setRedemptionsLoadingState(true);
    const response = await api.get('/users/redemptions/user-history');
    setUserRedemptions(response.data.redemptions || []);
  } catch (error) {
    console.error('Error fetching redemption history:', error);
    showNotification('Failed to load redemption history', 'error');
  } finally {
    setRedemptionsLoadingState(false);
  }
}, [showNotification]);


  // Load redemptions when redemption tab is active
  useEffect(() => {
  if (currentActiveTab === 'redemptions' && userRedemptions.length === 0) {
    fetchRedemptionHistory();
  }
}, [currentActiveTab, userRedemptions.length, fetchRedemptionHistory]);

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setUserProfile(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setUserProfile(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasswordInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);


  

  const updateUserPassword = useCallback(async (e) => {
  e.preventDefault();
  
  if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
    setNotificationState({ message: 'New passwords do not match', type: 'error' });
    return;
  }

  if (passwordFormData.newPassword.length < 6) {
    setNotificationState({ message: 'Password must be at least 6 characters long', type: 'error' });
    return;
  }

  setIsLoading(true);
  setNotificationState({ message: '', type: '' });

  try {
    await api.put('/users/password', {
      currentPassword: passwordFormData.currentPassword,
      newPassword: passwordFormData.newPassword
    });
    
    setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setNotificationState({ message: 'Password updated successfully!', type: 'success' });
  } catch (error) {
    console.error('Error updating password:', error);
    const errorMessage = error.response?.data?.message || 'Failed to update password';
    setNotificationState({ message: errorMessage, type: 'error' });
  } finally {
    setIsLoading(false);
  }
}, [passwordFormData]);

  const handleProfilePhotoUpload = async (file) => {
  try {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('profilePhoto', file);

    const response = await api.post(`/upload/profile-photo/${user.id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.data.success && response.data.imageUrl) {
      const updatedUser = { ...user, profilePicture: response.data.imageUrl };
      await updateUser(updatedUser);
      setUserProfile(prev => ({ ...prev, profilePicture: response.data.imageUrl }));
      showNotification('Profile photo updated successfully!', 'success');
    } else {
      throw new Error('Upload failed: No image URL returned');
    }
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    const errorMessage = error.response?.data?.message || 'Failed to upload profile photo';
    showNotification(errorMessage, 'error');
  } finally {
    setIsLoading(false);
  }
};

    const handleMerchantLogoUpload = async (file) => {
      try {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('merchantLogo', file);

        const response = await api.post(`/upload/merchant-logo/${user.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success && response.data.imageUrl) {
          // ✅ Update user context with new logo
          const updatedUser = { 
            ...user, 
            business: { 
              ...user.business, 
              logoUrl: response.data.imageUrl 
            }
          };
          await updateUser(updatedUser);
          showNotification('Business logo updated successfully!', 'success');
        } else {
          throw new Error('Upload failed: No image URL returned');
        }
      } catch (error) {
        console.error('Error uploading merchant logo:', error);
        const errorMessage = error.response?.data?.message || 'Failed to upload business logo';
        showNotification(errorMessage, 'error');
      } finally {
        setIsLoading(false);
      }
    };

  const TabNavigation = () => {
    const availableTabs = [];
    
    if (user?.role === 'merchant') {
      availableTabs.push(
        { id: 'business', label: 'Business Settings', icon: '🏢' },
        { id: 'profile', label: 'Profile Information', icon: '👤' },
        { id: 'security', label: 'Security Settings', icon: '🔒' },
        { id: 'redemptions', label: 'Redemption History', icon: '🎫' }
      );
    } else {
      availableTabs.push(
        { id: 'profile', label: 'Profile Information', icon: '👤' },
        { id: 'security', label: 'Security Settings', icon: '🔒' },
        { id: 'redemptions', label: 'Redemption History', icon: '🎫' }
      );
    }

    return (
      <div className="user-profile-navigation-container">
        {availableTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentActiveTab(tab.id)}
            className={`user-profile-tab-button ${currentActiveTab === tab.id ? 'user-profile-tab-active' : ''}`}
          >
            <span className="user-profile-tab-icon">{tab.icon}</span>
            <span className="user-profile-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const BusinessSettingsTab = () => (
  <div className="user-settings-tab-content">
    <div className="user-settings-business-section">
      <div className="user-profile-header-section">
        <h2 className="user-profile-section-title">Business Logo Management</h2>
        <p className="user-profile-section-description">
          Upload and manage your business logo for the business directory
        </p>
      </div>

      <div className="merchant-business-logo-container">
        <div className="merchant-logo-upload-section">
          <div className="current-logo-display">
            <img 
              src={getMerchantLogoUrl(user?.business || {}) || '/logo-placeholder.jpg'} 
              alt="Current business logo"
              className="business-logo-preview"
            />
            <div className="logo-info">
              <h4>Current Business Logo</h4>
              <p>This logo will appear in the business directory</p>
            </div>
          </div>
          
          <div className="logo-upload-controls">
            <ImageUpload
              onUpload={handleMerchantLogoUpload}
              currentImage={getMerchantLogoUrl(user?.business || {}) || '/logo-placeholder.jpg'}
              className="merchant-logo-upload"
              accept="image/*"
              maxSize={3}
              label="Upload Business Logo"
              description="Upload your business logo"
            />
            <div className="upload-instructions">
              <p>• Upload in PNG, JPG, or SVG format</p>
              <p>• Maximum file size: 3MB</p>
              <p>• Recommended size: 300x300 pixels</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);


  const ProfileInformationTab = () => (
    <div className="user-settings-tab-content">
      <div className="user-profile-form">
        <div className="user-profile-header">
          <h2 className="user-profile-section-title">Profile Information</h2>
          <p className="user-profile-section-description">
            Update your personal information and membership details
          </p>
        </div>

        {/* Profile Photo Section */}
        <div className="user-profile-photo-section">
          <div className="profile-photo-container">
            <img 
                src={getProfileImageUrl(userProfile) || '/default-avatar.jpg'} 
                alt="Profile"
                className="profile-photo-display"
            />

            <div className="photo-upload-controls">
                <ImageUpload
                  onUpload={handleProfilePhotoUpload}  // This passes the FILE to your handler
                  currentImage={getProfileImageUrl(userProfile) || '/default-avatar.jpg'}
                  className="profile-photo-upload"
                  accept="image/*"
                  maxSize={5}
                />
            </div>
          </div>
        </div>

        {/* Basic Information (read-only - update disabled) */}
        <div className="user-profile-form-section">
          <h3 className="form-section-title">Basic Information</h3>
          <div className="user-profile-form-grid">
            <div className="form-field-group">
              <label className="form-field-label">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={userProfile.fullName}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your full name"
                disabled
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={userProfile.email}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your email address"
                disabled
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={userProfile.phone}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your phone number"
                disabled
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={userProfile.dob}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                disabled
              />
            </div>


            <div className="form-field-group">
              <label className="form-field-label">Blood Group</label>
              <select
                name="bloodGroup"
                value={userProfile.bloodGroup}
                onChange={handleProfileInputChange}
                className="enhanced-form-select"
                disabled
              >
                <option value="">Select Blood Group</option>
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

            <div className="form-field-group">
              <label className="form-field-label">Community</label>
              <input
                type="text"
                name="community"
                value={userProfile.community}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your community"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="user-profile-form-section">
          <h3 className="form-section-title">Address Information</h3>
          <div className="user-profile-form-grid">
            <div className="form-field-group form-field-full-width">
              <label className="form-field-label">Address</label>
              <input
                type="text"
                name="address.street"
                value={userProfile.address.street}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your street address"
                disabled
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Country</label>
              <select
                name="country"
                value={userProfile.country}
                onChange={handleProfileInputChange}
                className="enhanced-form-select"
                disabled
              >
                <option value="Ghana">Ghana</option>
                <option value="India">India</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Membership Information (Read-only) */}
        <div className="user-profile-form-section">
          <h3 className="form-section-title">Membership Information</h3>
          <div className="user-profile-form-grid">
            <div className="form-field-group">
              <label className="form-field-label">Membership Plan</label>
              <input
                type="text"
                value={userProfile.membershipType}
                className="enhanced-form-input disabled-input"
                disabled
                placeholder="Membership type"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Membership Number</label>
              <input
                type="text"
                value={userProfile.membershipNumber}
                className="enhanced-form-input disabled-input"
                disabled
                placeholder="Membership number"
              />
            </div>

          </div>
        </div>

        {/* Update button and submission removed per request */}
      </div>
    </div>
  );

const RedemptionHistoryTab = () => (
  <div className="user-settings-tab-content">
    <div className="user-profile-header">
      <h2 className="user-profile-title">Redemption History</h2>
      <p className="user-profile-section-description">
        View your redeemed deals and offers
      </p>
    </div>

    <div className="redemption-history-container">
      {redemptionsLoadingState ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading redemption history...</p>
        </div>
      ) : userRedemptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎫</div>
          <h3>No Redemptions Yet</h3>
          <p>You haven't redeemed any deals yet. Start exploring deals to see your redemption history here!</p>
        </div>
      ) : (
        <div className="redemption-cards-grid">
          {userRedemptions.map((redemption, index) => (
            <div key={redemption.id || index} className="redemption-card">
              <div className="redemption-card-header">
                <h4 className="deal-title">{redemption.dealTitle || redemption.title || 'Deal'}</h4>
                <span className="redemption-date">
                  {redemption.redeemedAt ? new Date(redemption.redeemedAt).toLocaleDateString() : 'Date not available'}
                </span>
              </div>
              <div className="redemption-card-body">
                <p className="business-name">
                  <i className="fas fa-store"></i>
                  {redemption.businessName || 'Business Name Not Available'}
                </p>
                {redemption.businessAddress && (
                  <p className="business-address">
                    <i className="fas fa-map-marker-alt"></i>
                    {redemption.businessAddress}
                  </p>
                )}
                <p className="redemption-code">
                  {redemption.discount ? (
                    <span className="discount-badge">
                      {redemption.discountType === 'percentage' 
                        ? `${redemption.discount}% OFF` 
                        : `$${redemption.discount} OFF`
                      }
                    </span>
                  ) : (
                    <span>Discount not available</span>
                  )}
                </p>
                <div className="redemption-status">
                  <span className={`status-badge status-${redemption.status || 'redeemed'}`}>
                    {redemption.status?.charAt(0).toUpperCase() + redemption.status?.slice(1) || 'Redeemed'}
                  </span>
                </div>
                {redemption.status === 'rejected' && redemption.rejectionReason && (
                  <div className="rejection-reason">
                    <small>Reason: {redemption.rejectionReason}</small>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);


const renderTabContent = () => {
  switch (currentActiveTab) {
    case 'business':
      return <BusinessSettingsTab />;
    case 'profile':
      return <ProfileInformationTab />;
    case 'security':
      return (
        <div className="user-settings-tab-content">
          <form onSubmit={updateUserPassword} className="user-profile-form">
            <div className="user-profile-header">
              <h2 className="user-profile-title">Security Settings</h2>
              <p className="user-profile-section-description">
                Change your password to keep your account secure
              </p>
            </div>

            <div className="user-profile-form-section">
              <h3 className="form-section-title">Change Password</h3>
              <div className="user-profile-form-grid">
                <div className="form-field-group form-field-full-width">
                  <label className="form-field-label">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordFormData.currentPassword}
                    onChange={handlePasswordInputChange}
                    className="enhanced-form-input"
                    placeholder="Enter your current password"
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordFormData.newPassword}
                    onChange={handlePasswordInputChange}
                    className="enhanced-form-input"
                    placeholder="Enter new password"
                    required
                    minLength="6"
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-field-label">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordFormData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    className="enhanced-form-input"
                    placeholder="Confirm new password"
                    required
                    minLength="6"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="password-requirements">
                <h4>Password Requirements:</h4>
                <ul>
                  <li>At least 6 characters long</li>
                  <li>Both passwords must match</li>
                </ul>
              </div>
            </div>

            <div className="form-action-buttons">
              <button
                type="submit"
                disabled={isLoading}
                className="enhanced-primary-button"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      );
    case 'redemptions':
      return <RedemptionHistoryTab />;
    default:
      return <ProfileInformationTab />;
  }
};



return (
  <div className="enhanced-user-settings-container">
    <PlanExpiryBanner />
    
    <div className="user-settings-content-wrapper">
      <div className="user-profile-header-section">
        <h1 className="user-settings-main-title">Account Settings</h1>
        <p className="user-settings-main-description">
          Manage your account information, security settings, and preferences
        </p>
      </div>

      {/* Notification Display */}
      {notificationState.message && (
        <div className={`user-settings-notification ${notificationState.type === 'success' ? 'notification-success' : 'notification-error'}`}>
          <span>{notificationState.message}</span>
          <button 
            onClick={() => setNotificationState({ message: '', type: '' })}
            className="notification-close-button"
          >
            ×
          </button>
        </div>
      )}

      <div className="user-settings-layout">
        <div className="user-settings-sidebar">
          <TabNavigation />
        </div>

        <div className="user-settings-main-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  </div>
);

}; 

export default UserSettings;
