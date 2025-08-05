// UserModal.jsx - Modal component for User Management operations
import React, { useState, useEffect } from 'react';

const UserModal = ({ type, user, referenceData, onClose, onSubmit }) => {
  
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

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (type === 'edit' || type === 'view') {
      setFormData({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        dob: user?.dob || '',
        community: user?.community || '',
        country: user?.country || 'Ghana',
        state: user?.state || '',
        city: user?.city || '',
        userType: user?.userType || 'user',
        membershipType: user?.membershipType || 'community',
        status: user?.status || 'approved'
      });
    } else {
      // Reset form for add mode
      setFormData({
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
    }
    setErrors({});
  }, [type, user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const submitData = { ...formData };
      if (type === 'edit') {
        submitData.id = user.id || user._id;
      }
      
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${user?.fullName}? This action cannot be undone.`)) {
      setLoading(true);
      try {
        await onSubmit(user.id || user._id);
      } catch (error) {
        console.error('Error deleting user:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getModalTitle = () => {
    switch (type) {
      case 'add': return 'Add New User';
      case 'edit': return 'Edit User';
      case 'view': return 'User Details';
      case 'delete': return 'Delete User';
      default: return 'User';
    }
  };

  const isReadOnly = type === 'view';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{getModalTitle()}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {type === 'delete' ? (
          // Delete Confirmation
          <div className="modal-body">
            <div className="delete-confirmation">
              <div className="warning-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h4>Confirm Deletion</h4>
              <p>
                Are you sure you want to delete <strong>{user?.fullName}</strong>?
              </p>
              <p className="warning-text">
                This action will permanently remove the user and all associated data. 
                This cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        ) : (
          // Form for Add/Edit/View
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Personal Information */}
              <div className="form-section">
                <h4>Personal Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName">
                      Full Name {!isReadOnly && <span className="required">*</span>}
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      disabled={isReadOnly}
                      className={errors.fullName ? 'error' : ''}
                    />
                    {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">
                      Email {!isReadOnly && <span className="required">*</span>}
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={isReadOnly || type === 'edit'} // Email not editable after creation
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <span className="error-text">{errors.email}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={isReadOnly}
                      className={errors.phone ? 'error' : ''}
                    />
                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="dob">Date of Birth</label>
                    <input
                      type="date"
                      id="dob"
                      value={formData.dob}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      disabled={isReadOnly}
                      className={errors.dob ? 'error' : ''}
                    />
                    {errors.dob && <span className="error-text">{errors.dob}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="address">Address</label>
                    <textarea
                      id="address"
                      rows="3"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="form-section">
                <h4>Location</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State/Region</label>
                    <input
                      type="text"
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <input
                      type="text"
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="community">Community</label>
                    <select
                      id="community"
                      value={formData.community}
                      onChange={(e) => handleInputChange('community', e.target.value)}
                      disabled={isReadOnly}
                    >
                      <option value="">Select Community</option>
                      {referenceData.communities.map(community => (
                        <option key={community.id} value={community.name}>
                          {community.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Account Settings */}
              <div className="form-section">
                <h4>Account Settings</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="userType">User Type</label>
                    <select
                      id="userType"
                      value={formData.userType}
                      onChange={(e) => handleInputChange('userType', e.target.value)}
                      disabled={isReadOnly}
                    >
                      {referenceData.userTypes.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="membershipType">Membership Plan</label>
                    <select
                      id="membershipType"
                      value={formData.membershipType}
                      onChange={(e) => handleInputChange('membershipType', e.target.value)}
                      disabled={isReadOnly}
                    >
                      <option value="">No Plan</option>
                      {referenceData.plans.map(plan => (
                        <option key={plan.id} value={plan.key}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      disabled={isReadOnly}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {!isReadOnly && (
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (type === 'add' ? 'Adding...' : 'Saving...') : (type === 'add' ? 'Add User' : 'Save Changes')}
                </button>
              </div>
            )}

            {isReadOnly && (
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default UserModal;
