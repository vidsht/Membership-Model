import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import api from '../services/api';

const UserSettings = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Ghana'
    },
    profilePicture: '',
    preferences: {
      newsletter: true,
      eventNotifications: true,
      memberDirectory: true
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

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'Ghana'
        },
        profilePicture: user.profilePicture || '',
        preferences: {
          newsletter: user.preferences?.newsletter ?? true,
          eventNotifications: user.preferences?.eventNotifications ?? true,
          memberDirectory: user.preferences?.memberDirectory ?? true
        }
      });
    }
  }, [user]);

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
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const { showNotification } = useNotification();

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
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await api.delete('/users/account');
        alert('Account deleted successfully');
        // This would typically redirect to login page
        window.location.href = '/login';
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete account');
      }
    }
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
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="profilePicture">
                              <i className="fas fa-image"></i> Profile Picture URL
                            </label>
                            <input
                              type="url"
                              id="profilePicture"
                              name="profilePicture"
                              value={formData.profilePicture}
                              onChange={handleInputChange}
                              placeholder="https://example.com/your-photo.jpg"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
