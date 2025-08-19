import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import PlanExpiryBanner from '../components/PlanExpiryBanner';
import ImageUpload from '../components/common/ImageUpload';
import { useImageUrl } from '../hooks/useImageUrl.jsx';
import api from '../services/api';
import Modal from '../components/shared/Modal';
import { useModal } from '../hooks/useModal';
import '../styles/user-settings.css';

const UserSettings = () => {
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const { modal, showDeleteConfirm, hideModal } = useModal();
  const { getProfileImageUrl } = useImageUrl();
  const [formData, setFormData] = useState({
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    community: '',
    address: '',
    country: 'Ghana',
    state: '',
    city: '',
    profilePicture: '',
    membershipType: '',
    membershipNumber: '',
    socialMediaFollowed: {},
    preferences: {
      newsletter: true,
      eventNotifications: true,
      memberDirectory: true,
      emailNotifications: true,
      smsNotifications: false
    }
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Normalize address: backend may return string or object
      let normalizedAddress = { street: '', city: '', state: '', zipCode: '' };
      if (user.address) {
        if (typeof user.address === 'object') {
          normalizedAddress = {
            street: user.address.street || user.address.address || '',
            city: user.address.city || '',
            state: user.address.state || '',
            zipCode: user.address.zipCode || user.address.zip || ''
          };
        } else if (typeof user.address === 'string') {
          // Try to parse JSON string, otherwise place the whole string into street
          try {
            const parsed = JSON.parse(user.address);
            normalizedAddress = {
              street: parsed.street || parsed.address || user.address || '',
              city: parsed.city || '',
              state: parsed.state || '',
              zipCode: parsed.zipCode || parsed.zip || ''
            };
          } catch (e) {
            normalizedAddress = { street: user.address, city: '', state: '', zipCode: '' };
          }
        }
      }

      setFormData({
        fullName: user.fullName || '',
        // alias used by some inputs which expect `name`
        name: user.fullName || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        dob: user.dob ? user.dob.split('T')[0] : '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        community: user.community || '',
        address: normalizedAddress,
        country: user.country || 'Ghana',
        state: user.state || '',
        city: user.city || '',
        profilePicture: user.profilePicture || '',
        membershipType: user.membershipType || user.membership || '',
        membershipNumber: user.membershipNumber || '',
        socialMediaFollowed: user.socialMediaFollowed || {},
        preferences: {
          newsletter: user.preferences?.newsletter ?? true,
          eventNotifications: user.preferences?.eventNotifications ?? true,
          memberDirectory: user.preferences?.memberDirectory ?? true,
          emailNotifications: user.preferences?.emailNotifications ?? true,
          smsNotifications: user.preferences?.smsNotifications ?? false
        }
      });
    }
  }, [user]);

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
    <div className="page active">
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
                className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
                onClick={() => setActiveTab('preferences')}
              >
                <i className="fas fa-cog"></i> Preferences
              </button>
              <button 
                className={`tab ${activeTab === 'redemptions' ? 'active' : ''}`}
                onClick={() => setActiveTab('redemptions')}
              >
                <i className="fas fa-ticket-alt"></i> Redemptions
              </button>
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
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

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="settings-section">
                <h2>Notification Preferences</h2>
                <form onSubmit={handleProfileUpdate} className="settings-form">
                  <div className="preferences-grid">
                    <div className="preference-item">
                      <div className="preference-info">
                        <h4>Newsletter Subscription</h4>
                        <p>Receive monthly community updates and announcements</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          name="preferences.newsletter"
                          checked={formData.preferences.newsletter}
                          onChange={handleInputChange}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Preferences'}
                  </button>
                </form>

                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="info-item">
                        <strong>Member ID:</strong>
                        <span className="ms-2">{user?.memberId || 'IIG-' + user?._id?.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="info-item">
                        <strong>Account Status:</strong>
                        <span className={`badge ms-2 ${user?.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                          {user?.status || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="row mt-3">
                    <div className="col-md-6">
                      <div className="info-item">
                        <strong>Member Since:</strong>
                        <span className="ms-2">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="info-item">
                        <strong>Account Type:</strong>
                        <span className={`badge ms-2 ${user?.role === 'admin' ? 'bg-danger' : user?.role === 'merchant' ? 'bg-warning' : 'bg-primary'}`}>
                          {user?.role || 'User'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
