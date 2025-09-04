import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import PlanExpiryBanner from '../components/PlanExpiryBanner';
import ImageUpload from '../components/common/ImageUpload';
import { useImageUrl,  SmartImage, DefaultAvatar } from '../hooks/useImageUrl.jsx';
import api from '../services/api';
import '../styles/enhanced-user-settings.css';
import { useDynamicFields } from '../hooks/useDynamicFields';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator/PasswordStrengthIndicator';
import { checkPasswordStrength } from '../utils/passwordStrength';


const UserSettings = () => {
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const { getProfileImageUrl, getMerchantLogoUrl } = useImageUrl();
  const { dynamicFields, isLoading: fieldsLoading, getCommunityOptions } = useDynamicFields();
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
    return 'profile'; // Always start with profile tab for all users
  });
  const [userRedemptions, setUserRedemptions] = useState([]);
  const [redemptionsLoadingState, setRedemptionsLoadingState] = useState(false);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    bloodGroup: '',
    community: '',
    address: {
      street: ''
    },
    country: 'Ghana'
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if current user is a merchant
  const isMerchant = user?.userType === 'merchant' || user?.role === 'merchant';

  // Update active tab when user role changes
  useEffect(() => {
    if (isMerchant && currentActiveTab === 'profile') {
      setCurrentActiveTab('business');
    } else if (!isMerchant && currentActiveTab === 'business') {
      setCurrentActiveTab('profile');
    }
  }, [isMerchant, currentActiveTab]);

  const fetchUserProfileData = useCallback(async () => {
  try {
    setIsLoading(true);
    
    // For all users, prefer the authenticated user available from AuthContext
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
        profilePicture: userData.profilePhoto || userData.profilePicture || '',
        membershipType: userData.membershipType || userData.membership || '',
        membershipNumber: userData.membershipNumber || '',
        createdAt: userData.created_at || '',
        status: userData.status || '',
        role: userData.role || userData.userType || '',
        // Monthly counters and limits (may be provided by backend)
        monthlyRedemptionsRemaining: userData.monthlyRedemptionsRemaining,
        monthlyRedemptionCount: userData.monthlyRedemptionCount,
        monthlyRedemptionLimit: userData.monthlyRedemptionLimit,
        monthlyDealsRemaining: userData.monthlyDealsRemaining,
        monthlyDealCount: userData.monthlyDealCount,
        monthlyDealLimit: userData.monthlyDealLimit
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
      role: userData.role || '',
      // Monthly counters and limits (may be provided by backend)
      monthlyRedemptionsRemaining: userData.monthlyRedemptionsRemaining,
      monthlyRedemptionCount: userData.monthlyRedemptionCount,
      monthlyRedemptionLimit: userData.monthlyRedemptionLimit,
      monthlyDealsRemaining: userData.monthlyDealsRemaining,
      monthlyDealCount: userData.monthlyDealCount,
      monthlyDealLimit: userData.monthlyDealLimit
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


  // Load redemptions when redemption tab is active (but not for merchants)
  useEffect(() => {
  if (currentActiveTab === 'redemptions' && userRedemptions.length === 0 && !isMerchant) {
    fetchRedemptionHistory();
  }
}, [currentActiveTab, userRedemptions.length, fetchRedemptionHistory, isMerchant]);

useEffect(() => {
  if (user && isMerchant) {
    setUserProfile(prev => ({
      ...prev,
      profilePicture: user.profilePhoto || user.profilePicture || null
    }));
  }
}, [user?.profilePhoto, user?.profilePicture, isMerchant]);

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

  // Edit modal functions
  const openEditModal = () => {
    setEditFormData({
      fullName: userProfile.fullName || '',
      email: userProfile.email || '',
      phone: userProfile.phone || '',
      dob: userProfile.dob || '',
      bloodGroup: userProfile.bloodGroup || '',
      community: userProfile.community || '',
      address: {
        street: userProfile.address?.street || ''
      },
      country: userProfile.country || 'Ghana'
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditFormData({
      fullName: '',
      email: '',
      phone: '',
      dob: '',
      bloodGroup: '',
      community: '',
      address: {
        street: ''
      },
      country: 'Ghana'
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setEditFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSaveChanges = async () => {
    setIsUpdating(true);
    try {
      // Merge edited values onto existing profile so backend receives sensible defaults
      const merged = {
        fullName: editFormData.fullName !== undefined && editFormData.fullName !== null && String(editFormData.fullName).trim() !== '' ? editFormData.fullName : (userProfile.fullName || ''),
        phone: editFormData.phone !== undefined && editFormData.phone !== null && String(editFormData.phone).trim() !== '' ? editFormData.phone : (userProfile.phone || ''),
        dob: editFormData.dob !== undefined && editFormData.dob !== null && String(editFormData.dob).trim() !== '' ? editFormData.dob : (userProfile.dob || null),
        bloodGroup: editFormData.bloodGroup !== undefined && editFormData.bloodGroup !== null && String(editFormData.bloodGroup).trim() !== '' ? editFormData.bloodGroup : (userProfile.bloodGroup || ''),
        community: editFormData.community !== undefined && editFormData.community !== null && String(editFormData.community).trim() !== '' ? editFormData.community : (userProfile.community || ''),
        country: editFormData.country !== undefined && editFormData.country !== null && String(editFormData.country).trim() !== '' ? editFormData.country : (userProfile.country || 'Ghana')
      };

      // Address: merge fields and only include if any non-empty value exists
      const existingAddr = userProfile.address || {};
      const editAddr = editFormData.address || {};
      const mergedAddress = {
        street: (editAddr.street !== undefined && editAddr.street !== null && String(editAddr.street).trim() !== '') ? editAddr.street : (existingAddr.street || '')
      };

      // Decide whether to send email: include only if user changed it and it's non-empty
      const payload = { ...merged };
      if (editFormData.email && editFormData.email !== userProfile.email) payload.email = editFormData.email;

      // Only include address if any meaningful value exists, send as object (backend will stringify)
      const hasAddressValues = Object.values(mergedAddress).some(v => v && String(v).trim() !== '');
      if (hasAddressValues) payload.address = mergedAddress;

      // Send request
      const response = await api.put('/users/profile', payload);

      if (response.data && response.data.user) {
        const returnedUser = response.data.user;
        // Normalize address
        let parsedAddress = returnedUser.address;
        if (parsedAddress && typeof parsedAddress === 'string') {
          try { parsedAddress = JSON.parse(parsedAddress); } catch (e) { parsedAddress = { street: parsedAddress }; }
        }

        setUserProfile(prev => ({
          ...prev,
          ...returnedUser,
          address: parsedAddress
        }));

        updateUser({
          ...user,
          ...returnedUser
        });

        showNotification('Profile updated successfully!', 'success');
        closeEditModal();
      } else if (response.data && response.data.message) {
        showNotification(response.data.message || 'Failed to update profile', 'error');
      } else {
        showNotification('Profile updated (unexpected response format)', 'success');
        closeEditModal();
      }
    } catch (error) {
      console.error('Profile update error:', error);
      if (error.response) console.error('API Error Details:', error.response);
      showNotification(
        error.response?.data?.message || 'Failed to update profile. Please try again.',
        'error'
      );
    } finally {
      setIsUpdating(false);
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
  
  // New/confirm match check
  if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
    setNotificationState({ message: 'New passwords do not match', type: 'error' });
    return;
  }

  // Use the centralized password strength validator used by ResetPassword
  const pwCheck = checkPasswordStrength(passwordFormData.newPassword);
  if (!pwCheck.isValid) {
    // Show the same user-facing message as other password flows
    setNotificationState({ message: pwCheck.message || 'Password does not meet requirements', type: 'error' });
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

const handleMerchantLogoUpload = async (uploadResponse) => {
  try {
    console.log('Logo response received:', uploadResponse, typeof uploadResponse);
    
    // Handle removal case (when uploadResponse is null/undefined)
    if (!uploadResponse || uploadResponse === null || 
        (uploadResponse && uploadResponse.imageUrl === null) ||
        (uploadResponse && Object.keys(uploadResponse).length === 0)) {
      
      console.log('Handling logo removal...');
      return await handleMerchantLogoRemoval();
    }
    
    // Handle successful upload
    if (uploadResponse && uploadResponse.imageUrl) {
      // For merchants, the logo is stored as profilePhoto in users table
      const updatedUser = { 
        ...user, 
        profilePhoto: uploadResponse.filename,
        profilePicture: uploadResponse.filename
      };
      
      await updateUser(updatedUser);
      
      setUserProfile(prev => ({
        ...prev,
        profilePicture: uploadResponse.filename
      }));

      // Update localStorage 
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      userData.profilePhoto = uploadResponse.filename;
      userData.profilePicture = uploadResponse.filename;
      localStorage.setItem('user_data', JSON.stringify(userData));
      
      showNotification('Business logo updated successfully!', 'success');
    } else {
      throw new Error('Invalid upload response format');
    }
  } catch (error) {
    console.error('Error updating merchant logo:', error);
    showNotification('Failed to update business logo', 'error');
  }
};
  
const handleMerchantLogoRemoval = async () => {
  try {
    console.log('Removing merchant logo...');
    
    // Clear the profilePhoto in users table via AuthContext
    const updatedUser = { 
      ...user, 
      profilePhoto: null,
      profilePicture: null
    };
    
    await updateUser(updatedUser);
    
    // Update local component state
    setUserProfile(prev => ({
      ...prev,
      profilePicture: null
    }));

    // Clear from localStorage 
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    userData.profilePhoto = null;
    userData.profilePicture = null;
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    showNotification('Business logo removed successfully!', 'success');
  } catch (error) {
    console.error('Error removing merchant logo:', error);
    showNotification('Failed to remove business logo', 'error');
  }
};


  const handleProfilePhotoUpload = async (uploadResponse) => {
    try {
      console.log('Profile upload response:', uploadResponse);
      
      if (uploadResponse && uploadResponse.imageUrl) {
        // Update user context with new profile photo
    const updatedUser = {
      ...user,
      profilePhoto: uploadResponse.filename, // Database field only
      // Remove profilePhotoUrl from context - let useImageUrl construct URLs
    };
    await updateUser(updatedUser);

    // Update localStorage with database field only
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    userData.profilePhoto = uploadResponse.filename;
    // Remove profilePhotoUrl from localStorage
    localStorage.setItem('user_data', JSON.stringify(userData));

    // Update local state with filename only - let useImageUrl construct URL
    setUserProfile(prev => ({
      ...prev,
      profilePicture: uploadResponse.filename // Store filename only
    }));

        showNotification('Profile photo updated successfully!', 'success');
      } else {
        throw new Error('Upload response missing image URL');
      }
    } catch (error) {
      console.error('Error updating profile photo:', error);
      showNotification('Failed to update profile photo', 'error');
    }
  };


  const TabNavigation = () => {
    const availableTabs = [];
    
    if (isMerchant) {
      // For merchants we should NOT show the Profile Information tab
      availableTabs.push(
        { id: 'business', label: 'Business Settings', icon: '🏢' },
        { id: 'security', label: 'Security Settings', icon: '🔒' }
        // Note: Profile tab intentionally removed for merchants
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
            <SmartImage
              src={getMerchantLogoUrl(user)}
              fallback={<DefaultAvatar name={user?.fullName || ''} size={120} />}
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
              currentImage={getMerchantLogoUrl(user)}
              onUploadSuccess={handleMerchantLogoUpload}
              onUploadError={(error) => showNotification('Upload failed', 'error')}
              className="merchant-logo-upload"
              label="Upload Business Logo"
              description="Upload your business logo"
              aspectRatio="1:1"
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
          <div className="profile-header-content">
            <div className="profile-header-text">
              <h2 className="user-profile-section-title">
                {isMerchant ? 'Basic Profile Information' : 'Profile Information'}
              </h2>
              <p className="user-profile-section-description">
                Update your personal information and membership details
              </p>
            </div>
            <div className="profile-header-actions">
              {console.log('About to render edit button')}
              <button 
                className="edit-profile-btn"
                onClick={openEditModal}
                type="button"
                 style={{
                  display: 'block !important',
                  visibility: 'visible !important',
                  opacity: '1 !important',
                  position: 'relative !important',
                  width: 'auto !important',
                  height: 'auto !important',
                  backgroundColor: 'red !important',  // Make it obvious
                  color: 'white !important',
                  padding: '10px !important',
                  border: '2px solid black !important'
                }}
                >
                <i className="fas fa-edit"></i>
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Profile Photo Section - Only for non-merchants */}
        {!isMerchant && (
          <div className="user-profile-photo-section">
            <div className="profile-photo-container">
            <SmartImage
              src={getProfileImageUrl(user)}
              fallback={<DefaultAvatar name={user?.fullName || ''} size={120} />}
              alt="Profile"
              className="profile-photo-display"
            />
              <div className="photo-upload-controls">
                  <ImageUpload
                  type="profile"
                  entityId={user?.id}
                  currentImage={getProfileImageUrl(user)}
                  onUploadSuccess={handleProfilePhotoUpload}
                  onUploadError={(error) => showNotification('Upload failed', 'error')}
                  className="profile-photo-upload"
                  label="Upload Profile Photo"
                  description="Upload your profile photo"
                  aspectRatio="1:1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Basic Information (read-only for all, limited for merchants) */}
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

            {/* Hide personal details for merchants in read-only view but show in edit modal */}
            {!isMerchant && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Address Information - Only for non-merchants in read-only view but show in edit modal */}
        {!isMerchant && (
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
        )}

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

const RedemptionHistoryTab = () => {
  // Calculate redemption stats for this month
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
  const thisMonthRedemptions = userRedemptions.filter(redemption => {
    // support both camelCase (redeemedAt) and snake_case (redeemed_at) coming from different endpoints
    const redeemedTimestamp = redemption.redeemedAt || redemption.redeemed_at;
    if (!redeemedTimestamp) return false;

    const redemptionMonth = new Date(redeemedTimestamp).toISOString().slice(0, 7);
    const status = String(redemption.status || '').toLowerCase();
    return redemptionMonth === currentMonth && status === 'approved';
  });

  // Get user redemption limit info
  // Priority: customRedemptionLimit (admin override) -> planMaxDealRedemptions (from plan) -> fallback values
  const userRedemptionLimit = user?.customRedemptionLimit || 
                              userProfile?.customRedemptionLimit || 
                              user?.planMaxDealRedemptions || 
                              userProfile?.planMaxDealRedemptions ||
                              userProfile?.maxRedemptionsPerMonth || 
                              userProfile?.maxRedemptions || 
                              // Default fallback based on plan type
                              (userProfile?.membershipType === 'platinum' ? 3 : 
                               userProfile?.membershipType === 'gold' ? 2 : 1);
  const isCustomLimit = !!(user?.customRedemptionLimit || userProfile?.customRedemptionLimit);
  const planName = userProfile?.membershipType || userProfile?.membership || 'Basic';
  const redemptionsUsed = thisMonthRedemptions.length;

  // Prefer backend-provided remaining/count/limit values when available to avoid discrepancies
  const backendRemaining = (user?.monthlyRedemptionsRemaining !== undefined && user?.monthlyRedemptionsRemaining !== null) ? user.monthlyRedemptionsRemaining :
                           (userProfile?.monthlyRedemptionsRemaining !== undefined && userProfile?.monthlyRedemptionsRemaining !== null) ? userProfile.monthlyRedemptionsRemaining : undefined;
  const backendUsed = (user?.monthlyRedemptionCount !== undefined && user?.monthlyRedemptionCount !== null) ? user.monthlyRedemptionCount :
                      (userProfile?.monthlyRedemptionCount !== undefined && userProfile?.monthlyRedemptionCount !== null) ? userProfile.monthlyRedemptionCount : undefined;
  const backendLimit = (user?.monthlyRedemptionLimit !== undefined && user?.monthlyRedemptionLimit !== null) ? user.monthlyRedemptionLimit :
                       (userProfile?.monthlyRedemptionLimit !== undefined && userProfile?.monthlyRedemptionLimit !== null) ? userProfile.monthlyRedemptionLimit : undefined;

  const redemptionsRemaining = backendRemaining !== undefined ? (backendRemaining === -1 ? 'Unlimited' : Math.max(0, backendRemaining)) : (userRedemptionLimit === -1 ? 'Unlimited' : Math.max(0, userRedemptionLimit - redemptionsUsed));

  // canRedeem should prefer backendRemaining when available
  const canRedeem = backendRemaining !== undefined ? (backendRemaining === -1 || backendRemaining > 0) : (userRedemptionLimit === -1 || redemptionsUsed < userRedemptionLimit);

  // compute progress width as a string to avoid inline template parsing issues
  // Prefer server-provided used/limit if available
  const usedForProgress = backendUsed !== undefined ? backendUsed : redemptionsUsed;
  const limitForProgress = backendLimit !== undefined ? backendLimit : userRedemptionLimit;
  const progressWidth = limitForProgress === -1 ? '0%' : `${Math.min(100, (usedForProgress / Math.max(limitForProgress, 1)) * 100)}%`;

  return (
    <div className="user-settings-tab-content">
      <div className="user-profile-header">
        <h2 className="user-profile-title">Redemption History</h2>
        <p className="user-profile-section-description">
          View your redeemed deals and track your monthly redemption limits
        </p>
      </div>

      {/* Redemption Limit Info Card - Similar to Merchant Plan Info Card */}
      <div className="plan-info-card redemption-limit-card">
        <div className="card-header">
          <h2><i className="fas fa-ticket-alt"></i> Redemption Limits</h2>
          {!canRedeem && (
            <span className="limit-warning">
              <i className="fas fa-exclamation-triangle"></i> Limit Reached
            </span>
          )}
        </div>
        <div className="plan-details">
          <div className="plan-name">
            <h3>{planName.charAt(0).toUpperCase() + planName.slice(1)} Plan</h3>
            <span className="plan-key">{planName}</span>
          </div>
          <div className="plan-limits">
            <div className="limit-item">
              <strong>
                Redemptions This Month:
                {isCustomLimit && (
                  <span className="custom-limit-badge" title="Custom limit set by admin">
                    <i className="fas fa-star"></i> Custom
                  </span>
                )}
              </strong>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: progressWidth }}
                ></div>
              </div>
              <span className="progress-text">
                {usedForProgress} / {userRedemptionLimit === -1 ? 'Unlimited' : userRedemptionLimit}
              </span>
              {isCustomLimit && (
                <small className="limit-explanation">
                  Custom limit: {userRedemptionLimit === -1 ? 'Unlimited' : userRedemptionLimit} redemptions/month
                </small>
              )}
            </div>
            <div className="limit-item">
              <strong>Remaining:</strong>
              <span className="remaining-count">
                {redemptionsRemaining} {userRedemptionLimit === -1 ? '' : 'redemptions'}
              </span>
            </div>
            <div className="limit-item">
              <strong>Next Reset:</strong>
              <span className="reset-date">
                {new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
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
                    {redemption.redeemed_at ? new Date(redemption.redeemed_at).toLocaleDateString() : 'Date not available'}
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

                  {/* Robust rejection reason display: handle snake_case/camelCase and variant status values */}
                  {(['rejected','declined','rejected_by_admin','rejected_by_merchant'].includes((redemption.status || '').toLowerCase())) && (
                    <div className="rejection-reason">
                      <small>
                        Reason: {redemption.rejectionReason || redemption.rejection_reason || redemption.rejection || 'Not provided'}
                      </small>
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
};


const renderTabContent = () => {
  // If a merchant somehow has 'profile' active, show business tab instead
  if (currentActiveTab === 'profile' && isMerchant) {
    return <BusinessSettingsTab />;
  }

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
                  <PasswordStrengthIndicator password={passwordFormData.newPassword} showCriteria={true} />
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="edit-profile-modal">
            <div className="modal-header">
              <h3>
                <i className="fas fa-user-edit"></i>
                Edit Profile Information
              </h3>
              <button 
                className="close-btn" 
                onClick={closeEditModal}
                type="button"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }}>
                <div className="edit-form-grid">
                  <div className="form-section">
                    <h4>Personal Information</h4>
                    
                    <div className="form-group">
                      <label htmlFor="edit-fullName">Full Name <span className="required">*</span></label>
                      <input
                        type="text"
                        id="edit-fullName"
                        name="fullName"
                        value={editFormData.fullName}
                        onChange={handleEditFormChange}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-row">
                      {/* Removed firstName/lastName fields to match backend schema */}
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-phone">Phone Number</label>
                      <input
                        type="tel"
                        id="edit-phone"
                        name="phone"
                        value={editFormData.phone}
                        onChange={handleEditFormChange}
                        className="form-input"
                        placeholder="+233 XX XXX XXXX"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-email">Email Address</label>
                      <input
                        type="email"
                        id="edit-email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditFormChange}
                        className="form-input"
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit-dob">Date of Birth</label>
                        <input
                          type="date"
                          id="edit-dob"
                          name="dob"
                          value={editFormData.dob}
                          onChange={handleEditFormChange}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit-bloodGroup">Blood Group</label>
                        <select
                          id="edit-bloodGroup"
                          name="bloodGroup"
                          value={editFormData.bloodGroup}
                          onChange={handleEditFormChange}
                          className="form-input"
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
                      
                      <div className="form-group">
                        <label htmlFor="edit-community">Community</label>
                        <div className="select-with-icon" style={{ position: 'relative' }}>
                        <select
                          id="edit-community"
                          name="community"
                          value={editFormData.community}
                          onChange={handleEditFormChange}
                          className="form-input"
                          style={{ paddingRight: '36px' }}
                        >
                          <option value="">Select your community</option>
                          {fieldsLoading ? (
                            <option disabled>Loading communities...</option>
                          ) : getCommunityOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h4>Address Information</h4>
                    
                    <div className="form-group">
                      <label htmlFor="edit-address-street">Street Address</label>
                      <input
                        type="text"
                        id="edit-address-street"
                        name="address.street"
                        value={editFormData.address.street}
                        onChange={handleEditFormChange}
                        className="form-input"
                        placeholder="Enter your street address"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit-country">Country</label>
                        <select
                          id="edit-country"
                          name="country"
                          value={editFormData.country}
                          onChange={handleEditFormChange}
                          className="form-input"
                        >
                          <option value="Ghana">Ghana</option>
                          <option value="India">India</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={closeEditModal}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSaveChanges}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
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
          </div>
        </div>
      )}
    </div>
  </div>
);

}; 

export default UserSettings;
