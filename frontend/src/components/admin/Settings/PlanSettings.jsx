import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './PlanSettings.css';

/**
 * PlanSettings component for managing membership plans
 * @returns {React.ReactElement} The plan settings component
 */
const PlanSettings = () => {
  const { showNotification } = useNotification();
  const { validateSession } = useAuth();
  const { modal, showConfirm, hideModal } = useModal();
  const [plans, setPlans] = useState([]);
  const [userPlans, setUserPlans] = useState([]);
  const [merchantPlans, setMerchantPlans] = useState([]);
  const [planStats, setPlanStats] = useState({
    user: { total: 0, active: 0, subscribers: 0 },
    merchant: { total: 0, active: 0, subscribers: 0 }
  });
  const [planSubscriptionStats, setPlanSubscriptionStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSeedingPlans, setIsSeedingPlans] = useState(false);
  const [activeTab, setActiveTab] = useState('user');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchPlanStats();
    fetchPlanSubscriptionStats();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      // Use the working /plans endpoint that doesn't require admin auth for reading
      const response = await api.get('/plans');
      console.log('Plans API response:', response.data);
      // Backend returns { success: true, plans: [...] }
      const allPlans = response.data.plans || [];
      setPlans(allPlans);
      
      // Calculate stats from plans
      const userPlansData = allPlans.filter(plan => plan.type === 'user');
      const merchantPlansData = allPlans.filter(plan => plan.type === 'merchant');
      
      setUserPlans(userPlansData);
      setMerchantPlans(merchantPlansData);
      
      // Update stats based on plans
      setPlanStats(prev => ({
        ...prev,
        user: {
          ...prev.user,
          total: userPlansData.length,
          active: userPlansData.filter(p => p.isActive).length
        },
        merchant: {
          ...prev.merchant,
          total: merchantPlansData.length,
          active: merchantPlansData.filter(p => p.isActive).length
        }
      }));
    } catch (error) {
      console.error('Error fetching plans:', error);
      showNotification('Error loading plans. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlanStats = async () => {
    try {
      // Fetch subscriber counts for each plan type
      const [userStatsResponse, merchantStatsResponse] = await Promise.all([
        api.get('/admin/users?userType=user').catch(() => ({ data: { users: [] } })),
        api.get('/admin/users?userType=merchant').catch(() => ({ data: { users: [] } }))
      ]);
      
      const userSubscribers = userStatsResponse.data.users?.filter(u => u.membershipType && u.membershipType !== 'free').length || 0;
      const merchantSubscribers = merchantStatsResponse.data.users?.filter(u => u.membershipType && u.membershipType !== 'basic').length || 0;
      
      setPlanStats(prev => ({
        user: {
          ...prev.user,
          subscribers: userSubscribers
        },
        merchant: {
          ...prev.merchant,
          subscribers: merchantSubscribers
        }
      }));
    } catch (error) {
      console.error('Error fetching plan stats:', error);
      // Don't show notification for stats error as it's secondary data
    }
  };

  const fetchPlanSubscriptionStats = async () => {
    try {
      const response = await api.get('/admin/plans/statistics');
      if (response.data.success) {
        const stats = {};
        response.data.statistics.planStats.forEach(plan => {
          stats[plan.planKey] = plan.subscriberCount;
        });
        setPlanSubscriptionStats(stats);
        
        // Also update summary stats
        setPlanStats(prev => ({
          user: {
            ...prev.user,
            subscribers: response.data.statistics.summary.userPlans.totalSubscribers
          },
          merchant: {
            ...prev.merchant,
            subscribers: response.data.statistics.summary.merchantPlans.totalSubscribers
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching plan subscription stats:', error);
      // Don't show notification for stats error as it's secondary data
    }
  };

  const handleAddPlan = () => {
    setShowAddModal(true);
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowEditModal(true);
  };

  const handleDeletePlan = (plan) => {
    setDeletingPlan(plan);
    setShowDeleteModal(true);
  };

  const handleTogglePlanStatus = async (planId, isActive) => {
    try {
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      await api.put(`/admin/plans/${planId}`, { isActive: !isActive });
      showNotification('Plan status updated successfully.', 'success');
      fetchPlans();
      fetchPlanStats();
      fetchPlanSubscriptionStats();
    } catch (error) {
      console.error('Error updating plan status:', error);
      showNotification('Error updating plan status. Please try again.', 'error');
    }
  };
  const handleSeedPlans = async () => {
    try {
      setIsSeedingPlans(true);
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      // Always send force: true to overwrite existing plans
      try {
        await api.post('/admin/plans/seed', { force: true });
        showNotification('Default plans created successfully. All existing plans have been replaced.', 'success');
        fetchPlans();
        fetchPlanStats();
        fetchPlanSubscriptionStats();
      } catch (error) {
        console.error('Error seeding plans:', error);
        showNotification('Error creating default plans. Please try again.', 'error');
      }
    } catch (error) {
      // This catch is for session validation or other unexpected errors
      console.error('Error in handleSeedPlans:', error);
      showNotification('Error creating default plans. Please try again.', 'error');
    } finally {
      setIsSeedingPlans(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingPlan) return;

    try {
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      await api.delete(`/admin/plans/${deletingPlan.id || deletingPlan._id}`);
      showNotification('Plan deleted successfully.', 'success');
      setShowDeleteModal(false);
      setDeletingPlan(null);
      fetchPlans();
      fetchPlanStats();
      fetchPlanSubscriptionStats();
    } catch (error) {
      console.error('Error deleting plan:', error);
      showNotification('Error deleting plan. Please try again.', 'error');
    }
  };

  const formatPrice = (price, currency) => {
    return price === 0 ? 'Free' : `${currency} ${price}`;
  };
  const formatBillingCycle = (cycle) => {
    return cycle === 'lifetime' ? 'One-time' : cycle.charAt(0).toUpperCase() + cycle.slice(1);
  };

  // Update plan arrays whenever plans change
  useEffect(() => {
    const plansArray = Array.isArray(plans) ? plans : [];
    console.log('Filtering plans:', plansArray);
    console.log('Sample plan structure:', plansArray[0]);
    // Use 'type' field from the /plans endpoint
    const filteredUserPlans = plansArray.filter(plan => plan.type === 'user');
    const filteredMerchantPlans = plansArray.filter(plan => plan.type === 'merchant');
    console.log('User plans:', filteredUserPlans.length, filteredUserPlans);
    console.log('Merchant plans:', filteredMerchantPlans.length, filteredMerchantPlans);
    setUserPlans(filteredUserPlans);
    setMerchantPlans(filteredMerchantPlans);
  }, [plans]);

  return (
    <div className="user-management">
      <div className="section-header">
        <div className="header-content">
          <h2>Plan Settings</h2>
          <p>Manage membership plans for users and business partners</p>
          {!isLoading && (
            <div className="plan-stats">
              <span className="stat">
                <i className="fas fa-users"></i>
                {planStats.user.total} User Plans ({planStats.user.active} active)
              </span>
              <span className="stat">
                <i className="fas fa-store"></i>
                {planStats.merchant.total} Business Plans ({planStats.merchant.active} active)
              </span>
              <span className="stat">
                <i className="fas fa-crown"></i>
                {planStats.user.subscribers} User Subscribers
              </span>
              <span className="stat">
                <i className="fas fa-building"></i>
                {planStats.merchant.subscribers} Business Subscribers
              </span>
              <span className="stat">
                <i className="fas fa-chart-line"></i>
                {planStats.user.total + planStats.merchant.total} Total Plans
              </span>
            </div>
          )}
        </div>        <div className="header-actions">
          <Link to="/admin" className="btn-secondary">
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </Link>
          <button 
            className="button secondary"
            onClick={handleSeedPlans}
            disabled={isSeedingPlans}
          >
            <i className={`fas ${isSeedingPlans ? 'fa-spinner fa-spin' : 'fa-seedling'}`}></i>
            {isSeedingPlans ? 'Seeding Plans...' : 'Seed Default Plans'}
          </button>
          <button 
            className="button primary"
            onClick={handleAddPlan}
          >
            <i className="fas fa-plus"></i>
            Add New Plan
          </button>
        </div>
      </div>

      <div className="plan-tabs">
        <button
          className={`tab-button ${activeTab === 'user' ? 'active' : ''}`}          onClick={() => setActiveTab('user')}
        >
          <i className="fas fa-users"></i>
          User Plans
        </button>
        <button
          className={`tab-button ${activeTab === 'merchant' ? 'active' : ''}`}
          onClick={() => setActiveTab('merchant')}
        >
          <i className="fas fa-store"></i>
          Business Plans
        </button>
      </div>

      {/* Individual Plan Statistics */}
      {!isLoading && (
        <div className="individual-plan-stats">
          <h4>{activeTab === 'user' ? 'User Plan Subscribers' : 'Business Plan Subscribers'}</h4>
          <div className="plan-stats-grid">
            {(activeTab === 'user' ? userPlans : merchantPlans).map((plan) => (
              <div key={plan.id || plan._id} className="plan-stat-item">
                <span className="plan-stat-name">{plan.name}:</span>
                <span className="plan-stat-count">
                  {planSubscriptionStats[plan.key] || 0} {activeTab === 'user' ? 'users' : 'merchants'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-table">
          <div className="loading-row header"></div>
          <div className="loading-row"></div>
          <div className="loading-row"></div>
          <div className="loading-row"></div>
          <div className="loading-row"></div>
        </div>
      ) : (
        <div className="plans-grid">
          {(activeTab === 'user' ? userPlans : merchantPlans).map((plan) => (
            <div key={plan.id || plan._id} className={`plan-card ${!plan.isActive ? 'inactive' : ''}`}>
              <div className="plan-header">
                <div className="plan-title">
                  <h3>{plan.name}</h3>
                  <span className={`status-badge ${plan.isActive ? 'approved' : 'suspended'}`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="plan-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleTogglePlanStatus(plan.id || plan._id, plan.isActive)}
                    title={plan.isActive ? 'Deactivate' : 'Activate'}
                  >
                    <i className={`fas ${plan.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleEditPlan(plan)}
                    title="Edit Plan"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-icon reject"
                    onClick={() => handleDeletePlan(plan)}
                    title="Delete Plan"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="plan-details">
                <div className="plan-price">
                  <span className="price">{formatPrice(plan.price, plan.currency)}</span>
                  <span className="billing-cycle">/ {formatBillingCycle(plan.billingCycle)}</span>
                </div>

                {/* Plan Limits Section */}
                <div className="plan-limits">
                  {plan.type === 'merchant' && plan.max_deals_per_month !== null && plan.max_deals_per_month !== undefined && (
                    <div className="limit-badge deals">
                      <i className="fas fa-tags"></i>
                      <span>{plan.max_deals_per_month === -1 ? 'Unlimited Deals' : `${plan.max_deals_per_month} Deals/Month`}</span>
                    </div>
                  )}
                  {plan.type === 'user' && plan.maxRedemptions !== null && plan.maxRedemptions !== undefined && (
                    <div className="limit-badge redemptions">
                      <i className="fas fa-ticket-alt"></i>
                      <span>{plan.maxRedemptions === -1 ? 'Unlimited Redemptions' : `${plan.maxRedemptions} Redemptions/Month`}</span>
                    </div>
                  )}
                  {plan.maxUsers && (
                    <div className="limit-badge users">
                      <i className="fas fa-users"></i>
                      <span>{plan.maxUsers} Max Users</span>
                    </div>
                  )}
                  {/* Current Subscribers Badge */}
                  <div className="limit-badge subscribers">
                    <i className="fas fa-user-check"></i>
                    <span>{planSubscriptionStats[plan.key] || 0} Current {plan.type === 'user' ? 'Users' : 'Merchants'}</span>
                  </div>
                </div>
                
                <p className="plan-description">{plan.description}</p>
                
                <div className="plan-features">
                  <h4>Features:</h4>
                  <ul>
                    {(Array.isArray(plan.features) ? plan.features : 
                      (plan.features ? plan.features.split(',').map(f => f.trim()) : [])
                    ).map((feature, index) => (
                      <li key={index}>
                        <i className="fas fa-check"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="plan-meta">
                  <div className="meta-item">
                    <label>Plan Key:</label>
                    <span className="plan-key">{plan.key}</span>
                  </div>
                  <div className="meta-item">
                    <label>Priority:</label>
                    <span className="priority-badge">{plan.priority}</span>
                  </div>
                  {plan.maxUsers && (
                    <div className="meta-item">
                      <label>Max Users:</label>
                      <span>{plan.maxUsers}</span>
                    </div>
                  )}
                  {(plan.max_deals_per_month !== null && plan.max_deals_per_month !== undefined) && (
                    <div className="meta-item">
                      <label>Max Deals/Month:</label>
                      <span>{plan.max_deals_per_month === -1 ? 'Unlimited' : plan.max_deals_per_month}</span>
                    </div>
                  )}
                  {(plan.maxRedemptions !== null && plan.maxRedemptions !== undefined) && (
                    <div className="meta-item">
                      <label>Max Redemptions/Month:</label>
                      <span>{plan.maxRedemptions === -1 ? 'Unlimited' : plan.maxRedemptions}</span>
                    </div>
                  )}
                  {plan.dealAccess && (
                    <div className="meta-item">
                      <label>Deal Access:</label>
                      <span className="deal-access">{plan.dealAccess}</span>
                    </div>
                  )}
                  <div className="meta-item">
                    <label>Created:</label>
                    <span>{new Date(plan.createdAt || plan.created_at).toLocaleDateString()}</span>
                  </div>
                  {plan.updatedAt || plan.updated_at ? (
                    <div className="meta-item">
                      <label>Updated:</label>
                      <span>{new Date(plan.updatedAt || plan.updated_at).toLocaleDateString()}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {plans.length === 0 && !isLoading && (
        <div className="empty-state">
          <i className="fas fa-crown"></i>
          <h3>No Plans Found</h3>
          <p>Get started by creating your first {activeTab === 'user' ? 'user' : 'business'} plan or seed default plans.</p>
          <div className="empty-actions">
            <button className="btn-outline" onClick={handleSeedPlans} disabled={isSeedingPlans}>
              <i className={`fas ${isSeedingPlans ? 'fa-spinner fa-spin' : 'fa-seedling'}`}></i>
              {isSeedingPlans ? 'Seeding Plans...' : 'Seed Default Plans'}
            </button>
            <button className="button primary" onClick={handleAddPlan}>
              <i className="fas fa-plus"></i>
              Add New Plan
            </button>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showAddModal && (
        <PlanModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={() => {
            fetchPlans();
            fetchPlanStats();
            fetchPlanSubscriptionStats();
          }}
          userType={activeTab}
        />
      )}

      {/* Edit Plan Modal */}
      {showEditModal && editingPlan && (
        <PlanModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingPlan(null);
          }}
          onSubmit={() => {
            fetchPlans();
            fetchPlanStats();
            fetchPlanSubscriptionStats();
          }}
          plan={editingPlan}
          userType={activeTab}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingPlan && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <i className="fas fa-exclamation-triangle"></i>
                <p>Are you sure you want to delete the plan <strong>{deletingPlan.name}</strong>?</p>
                <p>This action cannot be undone and may affect users currently on this plan.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="button secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="button danger" onClick={confirmDelete}>
                Delete Plan
              </button>
            </div>
          </div>        </div>
      )}
      <Modal modal={modal} onClose={hideModal} />
    </div>
  );
};

// Plan Modal Component
const PlanModal = ({ isOpen, onClose, onSubmit, plan, userType }) => {
  const { showNotification } = useNotification();
  const { validateSession } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  // Default plan keys for dropdown
  const defaultPlanKeys = [
    'basic',
    'silver',
    'gold',
    'platinum',
    'premium',
    'business_basic',
    'business_premium',
    'merchant',
    'partner',
  ];

  const [planKeyType, setPlanKeyType] = useState('default'); // 'default' or 'other'
  const [customKey, setCustomKey] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    price: 0,
    currency: 'GHS',
    features: [''],
    description: '',
    isActive: true,
    maxUsers: '',
    billingCycle: 'monthly',
    priority: 0,
    userType: userType || 'user',
    max_deals_per_month: '',
    maxRedemptions: ''
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        key: plan.key || '',
        price: plan.price || 0,
        currency: plan.currency || 'GHS',
        features: plan.features ? (Array.isArray(plan.features) ? plan.features : plan.features.split(',').map(f => f.trim())) : [''],
        description: plan.description || '',
        isActive: plan.isActive !== undefined ? plan.isActive : true,
        maxUsers: plan.maxUsers || plan.max_users || '',
        billingCycle: plan.billingCycle || plan.billing_cycle || 'monthly',
        priority: plan.priority || 0,
        userType: plan.metadata?.userType || plan.type || userType || 'user',
        max_deals_per_month: plan.max_deals_per_month || '',
        maxRedemptions: plan.maxRedemptions || ''
      });
      // If editing, set planKeyType and customKey accordingly
      if (defaultPlanKeys.includes(plan.key)) {
        setPlanKeyType('default');
        setCustomKey('');
      } else {
        setPlanKeyType('other');
        setCustomKey(plan.key || '');
      }
    } else {
      setPlanKeyType('default');
      setCustomKey('');
    }
  }, [plan, userType]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // If changing plan key dropdown
    if (name === 'key') {
      setPlanKeyType('default');
      setCustomKey('');
    }
  };

  // Handle plan key dropdown change
  const handlePlanKeyDropdown = (e) => {
    const value = e.target.value;
    if (value === 'other') {
      setPlanKeyType('other');
      setFormData(prev => ({ ...prev, key: '' }));
    } else {
      setPlanKeyType('default');
      setFormData(prev => ({ ...prev, key: value }));
      setCustomKey('');
    }
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index) => {
    if (formData.features.length > 1) {
      const newFeatures = formData.features.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, features: newFeatures }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      // If "Other" is selected, use customKey as the plan key
      let planKey = formData.key;
      if (planKeyType === 'other') {
        if (!customKey.trim()) {
          showNotification('Please enter a custom plan key.', 'error');
          setIsLoading(false);
          return;
        }
        planKey = customKey.trim();
      }

      // Validate form data
      if (!formData.name || !planKey || !formData.description) {
        showNotification('Please fill in all required fields.', 'error');
        setIsLoading(false);
        return;
      }

      // Filter out empty features
      const features = formData.features.filter(feature => feature.trim() !== '');
      if (features.length === 0) {
        showNotification('Please add at least one feature.', 'error');
        setIsLoading(false);
        return;
      }

      const planData = {
        ...formData,
        key: planKey,
        features: features.join(','), // Convert to comma-separated string for backend
        price: parseFloat(formData.price),
        priority: parseInt(formData.priority) || 0,
        maxUsers: formData.maxUsers ? parseInt(formData.maxUsers) : null,
        max_deals_per_month: formData.max_deals_per_month ? parseInt(formData.max_deals_per_month) : null,
        maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : null,
        type: formData.userType, // Backend uses 'type' field
        metadata: {
          userType: formData.userType
        }
      };

      if (plan) {
        // Update existing plan
        await api.put(`/admin/plans/${plan.id || plan._id}`, planData);
        showNotification('Plan updated successfully.', 'success');
      } else {
        // Create new plan
        await api.post('/admin/plans', planData);
        showNotification('Plan created successfully.', 'success');
      }

      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error saving plan:', error);
      if (error.response?.data?.message) {
        showNotification(error.response.data.message, 'error');
      } else {
        showNotification('Error saving plan. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>{plan ? 'Edit Plan' : 'Add New Plan'}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Plan Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="key">Plan Key *</label>
              <select
                id="planKeyDropdown"
                name="planKeyDropdown"
                value={planKeyType === 'other' ? 'other' : formData.key}
                onChange={handlePlanKeyDropdown}
                required
              >
                <option value="" disabled>Select a plan key</option>
                {defaultPlanKeys.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
                <option value="other">Other (custom key)</option>
              </select>
              {planKeyType === 'other' && (
                <input
                  type="text"
                  id="customKey"
                  name="customKey"
                  value={customKey}
                  onChange={e => setCustomKey(e.target.value)}
                  placeholder="Enter custom plan key"
                  style={{ marginTop: 8 }}
                  required
                />
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Price *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="currency">Currency</label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
              >
                <option value="GHS">GHS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="billingCycle">Billing Cycle</label>
              <select
                id="billingCycle"
                name="billingCycle"
                value={formData.billingCycle}
                onChange={handleInputChange}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <input
                type="number"
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                min="0"
                placeholder="Higher numbers show first"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="userType">User Type</label>
              <select
                id="userType"
                name="userType"
                value={formData.userType}
                onChange={handleInputChange}
              >
                <option value="user">User</option>
                <option value="merchant">Business/Merchant</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="maxUsers">Max Users (Optional)</label>
              <input
                type="number"
                id="maxUsers"
                name="maxUsers"
                value={formData.maxUsers}
                onChange={handleInputChange}
                min="1"
                placeholder="Leave empty for unlimited"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="max_deals_per_month">Max Deals Per Month (Merchants)</label>
              <input
                type="number"
                id="max_deals_per_month"
                name="max_deals_per_month"
                value={formData.max_deals_per_month}
                onChange={handleInputChange}
                min="-1"
                placeholder="-1 for unlimited, empty to ignore"
                title="Maximum deals per month for merchant plans (-1 = unlimited)"
              />
            </div>
            <div className="form-group">
              <label htmlFor="maxRedemptions">Max Redemptions Per Month (Users)</label>
              <input
                type="number"
                id="maxRedemptions"
                name="maxRedemptions"
                value={formData.maxRedemptions}
                onChange={handleInputChange}
                min="-1"
                placeholder="-1 for unlimited, empty to ignore"
                title="Maximum redemptions per month for user plans (-1 = unlimited)"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>Features *</label>
            <div className="features-list">
              {formData.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    placeholder="Enter feature"
                  />
                  <button
                    type="button"
                    className="btn-icon reject"
                    onClick={() => removeFeature(index)}
                    disabled={formData.features.length === 1}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-add-feature"
                onClick={addFeature}
              >
                <i className="fas fa-plus"></i>
                Add Feature
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
              />
              <span>Active Plan</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanSettings;
