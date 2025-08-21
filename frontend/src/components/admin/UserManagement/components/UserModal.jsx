  // UserModal.jsx - COMPLETE FIX for Dropdown and Warning Boxes
  import React, { useState, useEffect, useMemo } from 'react';
  import './UserModal.css';

  const UserModal = ({ 
    type, 
    user, 
    title, 
    referenceData, 
    selectedUsers = [], 
    onClose, 
    onSubmit, 
    planAssignmentState,
    getPlansForUserType 
  }) => {
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

    const [planFormData, setPlanFormData] = useState({
      planKey: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    // Initialize form data when modal opens
    useEffect(() => {
      if (type === 'edit' || type === 'view') {
        setFormData({
          fullName: user?.fullName || '',
          email: user?.email || '',
          phone: user?.phone || '',
          address: typeof user?.address === 'string' ? user.address : 
                  typeof user?.address === 'object' ? JSON.stringify(user.address) : '',
          dob: user?.dob ? user.dob.split('T')[0] : '',
          community: user?.community || '',
          country: user?.country || 'Ghana',
          state: user?.state || '',
          city: user?.city || '',
          userType: user?.userType || 'user',
          membershipType: user?.membershipType || 'community',
          status: user?.status || 'approved'
        });
      } else if (type === 'add') {
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
      } else if (type === 'assignPlan') {
        setPlanFormData({
          planKey: user?.membershipType || ''
        });
      }
      setErrors({});
      setShowWarning(false);
    }, [type, user]);

    const handleInputChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: null }));
      }
    };

    const handlePlanInputChange = (field, value) => {
      setPlanFormData(prev => ({ ...prev, [field]: value }));
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

    const validatePlanForm = () => {
      const newErrors = {};
      
      if (!planFormData.planKey) {
        newErrors.planKey = 'Please select a plan';
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // FIXED: Show warning for destructive actions
      if ((type === 'delete' || type === 'bulkDelete' || 
          (type === 'assignPlan' && planFormData.planKey !== user?.membershipType)) && !showWarning) {
        setShowWarning(true);
        return;
      }
      
      if (type === 'assignPlan') {
        if (!validatePlanForm()) return;
      } else if (type !== 'delete' && type !== 'bulkDelete') {
        if (!validateForm()) return;
      }

      setLoading(true);
      try {
        let submitData;
        
        if (type === 'assignPlan') {
          submitData = planFormData;
        } else if (type === 'delete') {
          submitData = user.id;
        } else if (type === 'bulkDelete') {
          submitData = undefined;
        } else {
          submitData = { ...formData };
          if (type === 'edit') {
            submitData.id = user.id;
          }
        }
        
        await onSubmit(submitData);
        setShowWarning(false);
      } catch (error) {
        console.error('Error submitting form:', error);
      } finally {
        setLoading(false);
      }
    };

    const getModalTitle = () => {
      if (title) return title;
      switch (type) {
        case 'add': return 'Add New User';
        case 'edit': return 'Edit User';
        case 'view': return 'User Details';
        case 'delete': return 'Delete User';
        case 'bulkDelete': return `Delete ${selectedUsers.length} Users`;
        case 'assignPlan': return `Assign Plan to ${user?.fullName || 'User'}`;
        default: return 'User';
      }
    };

    const isReadOnly = type === 'view';

    // FIXED: Memoized available plans to prevent infinite re-renders
    const availablePlans = useMemo(() => {
      if (type !== 'assignPlan' || !user) {
        return [];
      }

      console.log('🔍 Getting available plans for modal:', {
        userType: user.userType,
        planAssignmentStateLength: planAssignmentState?.availablePlans?.length,
        planAssignmentUserType: planAssignmentState?.userType,
        referenceDataPlans: referenceData?.plans?.length
      });

      // CRITICAL FIX: Use planAssignmentState first - but check userType match
      if (planAssignmentState?.availablePlans?.length > 0 && 
          planAssignmentState.userType === user.userType) {
        console.log('✅ Using planAssignmentState plans:', planAssignmentState.availablePlans);
        return planAssignmentState.availablePlans;
      } 
      
      // Fallback to getPlansForUserType function
      if (getPlansForUserType) {
        const plans = getPlansForUserType(user.userType);
        console.log('✅ Using getPlansForUserType plans:', plans);
        return plans;
      }

      // Last fallback - filter from all plans
      if (referenceData?.plans?.length > 0) {
        const filtered = referenceData.plans.filter(plan => {
          if (user.userType === 'merchant') {
            return plan.type === 'merchant';
          } else {
            return plan.type === 'user';
          }
        });
        console.log('✅ Using filtered reference plans:', filtered);
        return filtered;
      }

      return [];
    }, [type, user?.userType, planAssignmentState?.availablePlans, planAssignmentState?.userType, getPlansForUserType, referenceData?.plans]);

    // FIXED: Get warning message based on action type
    const getWarningMessage = () => {
      switch (type) {
        case 'delete':
          return {
            title: 'Delete User',
            message: `Are you sure you want to delete ${user?.fullName}?`,
            details: 'This action will permanently remove the user and all associated data. This cannot be undone.',
            icon: 'fa-trash',
            color: 'danger'
          };
        case 'bulkDelete':
          return {
            title: 'Delete Multiple Users',
            message: `Are you sure you want to delete ${selectedUsers.length} selected users?`,
            details: 'This action will permanently remove all selected users and their associated data. This cannot be undone.',
            icon: 'fa-trash',
            color: 'danger'
          };
        case 'assignPlan':
          const planName = availablePlans.find(p => p.key === planFormData.planKey)?.name || 'selected plan';
          return {
            title: 'Assign Plan',
            message: `Assign "${planName}" to ${user?.fullName}?`,
            details: 'This will change the user\'s current plan and may affect their access permissions.',
            icon: 'fa-crown',
            color: 'warning'
          };
        default:
          return null;
      }
    };

    const warningInfo = getWarningMessage();

    console.log('📋 Modal render - Available plans:', availablePlans.length, 'for user type:', user?.userType);

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{getModalTitle()}</h2>
            <button onClick={onClose} className="modal-close">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="modal-body">
            {/* FIXED: Boxed Warning for Destructive Actions */}
            {showWarning && warningInfo && (
              <div className={`warning-box warning-${warningInfo.color}`}>
                <div className="warning-icon">
                  <i className={`fas ${warningInfo.icon}`}></i>
                </div>
                <div className="warning-content">
                  <h3>{warningInfo.title}</h3>
                  <p className="warning-message">{warningInfo.message}</p>
                  <p className="warning-details">{warningInfo.details}</p>
                </div>
                <div className="warning-actions">
                  <button 
                    onClick={() => setShowWarning(false)} 
                    className="btn btn-secondary"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`btn btn-${warningInfo.color}`}
                    type="button"
                  >
                    {loading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}

            {/* FIXED: Plan Assignment Form with Enhanced Dropdown */}
            {type === 'assignPlan' && !showWarning && (
              <form onSubmit={handleSubmit} className="plan-assignment-form">
                <div className="user-info">
                  <h3>Assigning plan to: {user?.fullName}</h3>
                  <div className="user-details">
                    <p><strong>User Type:</strong> <span className="user-type-badge">{user?.userType}</span></p>
                    <p><strong>Current Plan:</strong> <span className="current-plan">{user?.membershipType || 'None'}</span></p>
                    <p><strong>Email:</strong> {user?.email}</p>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="planKey">Select New Plan *</label>
                  <select
                    id="planKey"
                    name="planKey"
                    value={planFormData.planKey}
                    onChange={(e) => handlePlanInputChange('planKey', e.target.value)}
                    disabled={loading || planAssignmentState?.isLoading}
                    required
                    className="plan-select"
                  >
                    <option value="">-- Select a plan --</option>
                    {availablePlans && availablePlans.length > 0 && availablePlans.map(plan => (
                      <option key={plan.key || plan.id} value={plan.key}>
                        {plan.name} - {plan.price && parseFloat(plan.price) > 0 ? `${plan.currency || 'GHS'} ${plan.price}` : 'Free'}
                        {plan.billingCycle && plan.billingCycle !== 'one-time' && ` (${plan.billingCycle})`}
                      </option>
                    ))}
                  </select>
                  {errors.planKey && <span className="error-message">{errors.planKey}</span>}
                  
                  {/* Enhanced status messages */}
                  {planAssignmentState?.isLoading && (
                    <div className="loading-message">
                      <i className="fas fa-spinner fa-spin"></i>
                      Loading available plans for {user?.userType} users...
                    </div>
                  )}
                  
                  {!planAssignmentState?.isLoading && (!availablePlans || availablePlans.length === 0) && (
                    <div className="no-plans-message">
                      <i className="fas fa-exclamation-triangle"></i>
                      No plans available for {user?.userType} users. Please contact administrator.
                    </div>
                  )}

                  {availablePlans && availablePlans.length > 0 && (
                    <div className="plans-info">
                      <small className="text-muted">
                        {availablePlans.length} plan(s) available for {user?.userType} users
                      </small>
                    </div>
                  )}
                </div>

                <div className="action-buttons">
                  <button type="button" onClick={onClose} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || planAssignmentState?.isLoading || !availablePlans || availablePlans.length === 0 || !planFormData.planKey}
                    className="btn btn-primary"
                  >
                    {loading ? 'Assigning...' : 'Assign Plan'}
                  </button>
                </div>
              </form>
            )}

            {/* User Form (Add/Edit/View) */}
            {(type === 'add' || type === 'edit' || type === 'view') && !showWarning && (
              <form onSubmit={handleSubmit} className="user-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name *</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      disabled={isReadOnly || loading}
                      placeholder="Enter full name"
                      required
                    />
                    {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={isReadOnly || loading}
                      placeholder="Enter email address"
                      required
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
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={isReadOnly || loading}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && <span className="error-message">{errors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="dob">Date of Birth</label>
                    <input
                      type="date"
                      id="dob"
                      name="dob"
                      value={formData.dob}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      disabled={isReadOnly || loading}
                    />
                    {errors.dob && <span className="error-message">{errors.dob}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="userType">User Type</label>
                    <select
                      id="userType"
                      name="userType"
                      value={formData.userType}
                      onChange={(e) => handleInputChange('userType', e.target.value)}
                      disabled={isReadOnly || loading}
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
                      name="membershipType"
                      value={formData.membershipType}
                      onChange={(e) => handleInputChange('membershipType', e.target.value)}
                      disabled={isReadOnly || loading}
                    >
                      <option value="community">Community</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="basic_business">Basic Business</option>
                      <option value="premium_business">Premium Business</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="community">Community</label>
                    <select
                      id="community"
                      name="community"
                      value={formData.community}
                      onChange={(e) => handleInputChange('community', e.target.value)}
                      disabled={isReadOnly || loading}
                    >
                      <option value="">-- Select Community --</option>
                      {referenceData?.communities?.map((community, index) => (
                        <option key={index} value={community.name || community}>
                          {community.name || community}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      disabled={isReadOnly || loading}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      disabled={isReadOnly || loading}
                      placeholder="Enter country"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="state">State/Region</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      disabled={isReadOnly || loading}
                      placeholder="Enter state or region"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      disabled={isReadOnly || loading}
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={isReadOnly || loading}
                      placeholder="Enter address"
                    />
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="action-buttons">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      {loading ? 
                        (type === 'add' ? 'Creating...' : 'Updating...') : 
                        (type === 'add' ? 'Create User' : 'Update User')
                      }
                    </button>
                  </div>
                )}

                {isReadOnly && (
                  <div className="action-buttons">
                    <button type="button" onClick={onClose} className="btn btn-secondary">
                      Close
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  export default UserModal;
