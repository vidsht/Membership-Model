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

  // Fetch user redemption history
  const fetchRedemptionHistory = async () => {
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
  };

  // Load redemptions when redemption tab is active
  useEffect(() => {
    if (currentActiveTab === 'redemptions' && userRedemptions.length === 0) {
      fetchRedemptionHistory();
    }
  }, [currentActiveTab]);

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

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateUserProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setNotificationState({ message: '', type: '' });

    try {
      const addressData = typeof userProfile.address === 'object' 
        ? JSON.stringify(userProfile.address) 
        : userProfile.address;

      const profileUpdateData = {
        fullName: userProfile.fullName,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        phone: userProfile.phone,
        dob: userProfile.dob,
        gender: userProfile.gender,
        bloodGroup: userProfile.bloodGroup,
        community: userProfile.community,
        address: addressData,
        country: userProfile.country
      };

      const response = await api.put('/users/profile', profileUpdateData);
      
      if (response.data.user) {
        await updateUser(response.data.user);
        setNotificationState({ message: 'Profile updated successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update profile';
      setNotificationState({ message: errorMessage, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPassword = async (e) => {
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
  };

  const handleProfilePhotoUpload = async (file) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post(`/upload/profile-photo/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.imageUrl) {
        const updatedUser = { ...user, profilePicture: response.data.imageUrl };
        await updateUser(updatedUser);
        setUserProfile(prev => ({ ...prev, profilePicture: response.data.imageUrl }));
        showNotification('Profile photo updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      showNotification('Failed to upload profile photo', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerchantLogoUpload = async (file) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post(`/upload/merchant-logo/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.imageUrl) {
        showNotification('Business logo updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error uploading merchant logo:', error);
      showNotification('Failed to upload business logo', 'error');
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
                src={getMerchantLogoUrl(user?.id) || '/logo-placeholder.svg'} 
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
                type="merchant"
                entityId={user?.id}
                onUploadSuccess={handleMerchantLogoUpload}
                currentImage={getMerchantLogoUrl(user?.id)}
                className="merchant-logo-upload"
                accept="image/*"
                maxSize={5}
              />
              <div className="upload-instructions">
                <p>• Upload in PNG, JPG, or SVG format</p>
                <p>• Maximum file size: 5MB</p>
                <p>• Recommended size: 200x200 pixels</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ProfileInformationTab = () => (
    <div className="user-settings-tab-content">
      <form onSubmit={updateUserProfile} className="user-profile-form">
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
              src={getProfileImageUrl(userProfile.profilePicture, user?.id) || '/default-avatar.png'} 
              alt="Profile"
              className="profile-photo-display"
            />
            <div className="photo-upload-controls">
              <ImageUpload
                type="profile"
                entityId={user?.id}
                onUploadSuccess={handleProfilePhotoUpload}
                currentImage={userProfile.profilePicture}
                className="profile-photo-upload"
                accept="image/*"
                maxSize={5}
              />
            </div>
          </div>
        </div>

        {/* Basic Information */}
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
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">First Name</label>
              <input
                type="text"
                name="firstName"
                value={userProfile.firstName}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your first name"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={userProfile.lastName}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your last name"
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
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Gender</label>
              <select
                name="gender"
                value={userProfile.gender}
                onChange={handleProfileInputChange}
                className="enhanced-form-select"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Blood Group</label>
              <select
                name="bloodGroup"
                value={userProfile.bloodGroup}
                onChange={handleProfileInputChange}
                className="enhanced-form-select"
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
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="user-profile-form-section">
          <h3 className="form-section-title">Address Information</h3>
          <div className="user-profile-form-grid">
            <div className="form-field-group form-field-full-width">
              <label className="form-field-label">Street Address</label>
              <input
                type="text"
                name="address.street"
                value={userProfile.address.street}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your street address"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">City</label>
              <input
                type="text"
                name="address.city"
                value={userProfile.address.city}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your city"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">State/Region</label>
              <input
                type="text"
                name="address.state"
                value={userProfile.address.state}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your state or region"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">ZIP/Postal Code</label>
              <input
                type="text"
                name="address.zipCode"
                value={userProfile.address.zipCode}
                onChange={handleProfileInputChange}
                className="enhanced-form-input"
                placeholder="Enter your postal code"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Country</label>
              <select
                name="country"
                value={userProfile.country}
                onChange={handleProfileInputChange}
                className="enhanced-form-select"
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
              <label className="form-field-label">Membership Type</label>
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

            <div className="form-field-group">
              <label className="form-field-label">Member Since</label>
              <input
                type="text"
                value={userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : ''}
                className="enhanced-form-input disabled-input"
                disabled
                placeholder="Member since"
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">Account Status</label>
              <input
                type="text"
                value={userProfile.status}
                className="enhanced-form-input disabled-input"
                disabled
                placeholder="Account status"
              />
            </div>
          </div>
        </div>

        <div className="form-action-buttons">
          <button
            type="submit"
            disabled={isLoading}
            className="enhanced-primary-button"
          >
            {isLoading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );

  const SecuritySettingsTab = () => (
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
          <div className="loading-state"></div>
        ) : userRedemptions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎫</div>
            <h3>No Redemptions Yet</h3>
            <p>You haven't redeemed any deals yet. Start exploring our deals to save money!</p>
          </div>
        ) : (
          <div className="redemption-cards-grid">
            {userRedemptions.map((redemption, index) => (
              <div key={index} className="redemption-card">
                <div className="redemption-card-header">
                  <h4 className="deal-title">{redemption.dealTitle || 'Deal'}</h4>
                  <span className="redemption-date">
                    {new Date(redemption.redeemedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="redemption-card-body">
                  <p className="business-name">{redemption.businessName}</p>
                  <p className="redemption-code">Code: {redemption.redemptionCode}</p>
                  <div className="redemption-status">
                    <span className="status-badge">Redeemed</span>
                  </div>
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
        return <SecuritySettingsTab />;
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
