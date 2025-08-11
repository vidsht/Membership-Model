import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import './MerchantManagementEnhanced.css';

const MerchantManagementEnhanced = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [viewMode, setViewMode] = useState('cards'); // 'table' or 'cards'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [showMerchantDetails, setShowMerchantDetails] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    userInfo: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      community: '',
      status: 'pending',
    },
    businessInfo: {
      businessName: '',
      businessDescription: '',
      businessCategory: '',
      businessAddress: '',
      businessPhone: '',
      businessEmail: '',
      website: '',
      customDealLimit: ''
    }
  });
  const [selectedMerchants, setSelectedMerchants] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    membershipType: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Removed confirmDialog state (delete functionality)
  useEffect(() => {
    // Only fetch data on initial load and when viewMode changes
    if (viewMode === 'cards') {
      fetchBusinesses();
    } else {
      fetchMerchants();
    }
  }, [viewMode]); // Simplified dependencies
  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
  const response = await api.get('/admin/partners');
  setBusinesses(response.data?.merchants || []);
    } catch (err) {
      setError('Failed to fetch businesses');
      showNotification('Error loading businesses', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const fetchMerchants = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        ...filters
      });
      const response = await api.get(`/admin/partners?${params}`);
      if (response.data.success) {
        setMerchants(response.data.merchants || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.merchants?.length || 0,
          pages: Math.ceil((response.data.merchants?.length || 0) / pagination.limit)
        }));
      }
    } catch (err) {
      setError('Failed to fetch merchants');
      showNotification('Error loading merchants', 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, filters, showNotification]);


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Returns { label, className, daysLeft } for validity
  const calculateValidityInfo = (merchant) => {
    const baseDate = merchant.planAssignedAt || merchant.createdAt;
    if (!baseDate) return { label: 'N/A', className: 'validity-none', daysLeft: null };
    const assignedDate = new Date(baseDate);
    if (isNaN(assignedDate.getTime())) return { label: 'Invalid date', className: 'validity-error', daysLeft: null };
    const billingCycle = merchant.billingCycle || 'yearly';
    let validityDate = new Date(assignedDate);
    switch (billingCycle.toLowerCase()) {
      case 'monthly':
        validityDate.setMonth(validityDate.getMonth() + 1);
        break;
      case 'quarterly':
        validityDate.setMonth(validityDate.getMonth() + 3);
        break;
      case 'yearly':
      case 'annual':
        validityDate.setFullYear(validityDate.getFullYear() + 1);
        break;
      case 'lifetime':
        return { label: 'Lifetime', className: 'validity-active', daysLeft: null };
      case 'weekly':
        validityDate.setDate(validityDate.getDate() + 7);
        break;
      default:
        validityDate.setFullYear(validityDate.getFullYear() + 1);
        break;
    }
    const now = new Date();
    const diffTime = validityDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let className = 'validity-active';
    if (daysLeft < 0) {
      className = 'validity-expired';
    } else if (daysLeft <= 7) {
      className = 'validity-expiring-soon';
    } else if (daysLeft <= 14) {
      className = 'validity-expiring';
    }
    return {
      label: formatDate(validityDate),
      className,
      daysLeft: daysLeft >= 0 ? daysLeft : 0
    };
  };

  const handleMerchantSelect = (merchantId) => {
    setSelectedMerchants(prev => 
      prev.includes(merchantId) 
        ? prev.filter(id => id !== merchantId)
        : [...prev, merchantId]
    );
  };

  const handleSelectAll = () => {
    setSelectedMerchants(
      selectedMerchants.length === merchants.length 
        ? [] 
        : merchants.map(merchant => merchant.id)
    );
  };

  // Inline edit for custom deal limits - now using route
  const handleInlineEdit = async (merchant) => {
    try {
      // Navigate to quick edit route
      navigate(`/admin/partners/${merchant.id}/quick-edit`);
    } catch (error) {
      console.error('Error navigating to quick edit:', error);
      showNotification('Failed to load quick edit. Please try again.', 'error');
    }
  };

  // Route-based edit (like user management) - navigate to edit route
  const handleEditMerchant = useCallback((merchant) => {
    if (!merchant || !merchant.id) {
      showNotification('Invalid merchant data', 'error');
      return;
    }
    // Navigate to edit route
    navigate(`/admin/partners/${merchant.id}/edit`);
  }, [navigate, showNotification]);

  const handleEditSubmit = async (updatedMerchant) => {
    try {
      const response = await api.put(`/admin/partners/${updatedMerchant.id}`, updatedMerchant);
      
      showNotification('Merchant details updated successfully.', 'success');
      
      // Update the merchant in the list
      setMerchants(merchants.map(m => 
        m.id === updatedMerchant.id ? { ...m, ...updatedMerchant } : m
      ));
      
      setShowEditModal(false);
      setEditingMerchant(null);
    } catch (error) {
      console.error('Error updating merchant:', error);
      showNotification('Failed to update merchant details. Please try again.', 'error');
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingMerchant(null);
  };

  const handleViewDetails = useCallback((merchant) => {
    // Navigate to details route
    navigate(`/admin/partners/${merchant.id}`);
  }, [navigate]);

  const handleAddMerchant = useCallback(() => {
    // Navigate to registration route
    navigate('/admin/partners/register');
  }, [navigate]);

  // Handle modal cancel - UserManagement style
  const handleCancelEdit = () => {
    setShowAddMerchant(false);
    setEditingMerchant(null);
    setFormErrors({});
    setFormData({
      userInfo: {
        fullName: '', email: '', phone: '', address: '', community: '', status: 'pending',
      },
      businessInfo: {
        businessName: '', businessDescription: '', businessCategory: '',
        businessAddress: '', businessPhone: '', businessEmail: '', website: '', 
        customDealLimit: ''
      }
    });
  };
  
  // Validate form - UserManagement style
  const validateForm = () => {
    const newErrors = {};
    
    // User info validation
    if (!formData.userInfo.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.userInfo.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.userInfo.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (formData.userInfo.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.userInfo.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }
    
    // Business info validation
    if (!formData.businessInfo.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    
    if (formData.businessInfo.businessEmail && !/\S+@\S+\.\S+/.test(formData.businessInfo.businessEmail)) {
      newErrors.businessEmail = 'Business email is invalid';
    }
    
    if (formData.businessInfo.website && !/^https?:\/\/.+/.test(formData.businessInfo.website)) {
      newErrors.website = 'Website must be a valid URL (starting with http:// or https://)';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Unified submit handler for add/edit - UserManagement style
  const handleMerchantFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setFormLoading(true);
    try {
      let response;
      const isEditMode = Boolean(editingMerchant);
      // Always send membershipType as part of userInfo
      const userInfoWithMembership = {
        ...formData.userInfo,
        membershipType: formData.userInfo.membershipType || '',
      };
      if (isEditMode) {
        response = await api.put(`/admin/partners/${editingMerchant.id}`, {
          ...userInfoWithMembership,
          businessInfo: formData.businessInfo,
        });
      } else {
        response = await api.post('/admin/partners', {
          ...userInfoWithMembership,
          userType: 'merchant',
          status: formData.userInfo.status || 'approved',
          termsAccepted: true,
          businessInfo: formData.businessInfo,
        });
      }
      
      if (response.data.success) {
        let message = `Merchant ${isEditMode ? 'updated' : 'created'} successfully`;
        if (!isEditMode && response.data.businessId) {
          message += ` (Business ID: ${response.data.businessId})`;
        }
        showNotification(message, 'success');
        setShowAddMerchant(false);
        setEditingMerchant(null);
        setFormData({
          userInfo: {
            fullName: '', email: '', phone: '', address: '', community: '', status: 'pending',
          },
          businessInfo: {
            businessName: '', businessDescription: '', businessCategory: '',
            businessAddress: '', businessPhone: '', businessEmail: '', website: ''
          }
        });
        setFormErrors({});
        fetchMerchants(); // Refresh the list
      } else {
        throw new Error(response.data.message || `Failed to ${isEditMode ? 'update' : 'create'} merchant`);
      }
    } catch (err) {
      const message = err.response?.data?.message || `Failed to ${editingMerchant ? 'update' : 'create'} merchant`;
      showNotification(message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (merchantId, newStatus) => {
    try {
      // Use dedicated endpoints for approve/reject, otherwise use status update
      if (newStatus === 'approved') {
        await api.post(`/admin/partners/${merchantId}/approve`);
      } else if (newStatus === 'rejected') {
        await api.post(`/admin/partners/${merchantId}/reject`);
      } else {
        // For other status changes (suspended, pending), use the status endpoint
        await api.put(`/admin/partners/${merchantId}/status`, { status: newStatus });
      }
      showNotification(`Partner ${newStatus} successfully`, 'success');
      fetchMerchants();
    } catch (err) {
      console.error('Error updating merchant status:', err);
      showNotification('Error updating merchant status', 'error');
    }
  };

  // Dedicated approve handler
  const handleApproveMerchant = async (merchantId) => {
    try {
      await api.post(`/admin/partners/${merchantId}/approve`);
      showNotification('Partner approved successfully', 'success');
      fetchMerchants();
    } catch (err) {
      console.error('Error approving merchant:', err);
      showNotification('Error approving partner', 'error');
    }
  };

  // Dedicated reject handler
  const handleRejectMerchant = async (merchantId) => {
    try {
      await api.post(`/admin/partners/${merchantId}/reject`);
      showNotification('Partner rejected successfully', 'success');
      fetchMerchants();
    } catch (err) {
      console.error('Error rejecting merchant:', err);
      showNotification('Error rejecting partner', 'error');
    }
  };

  // Removed handleDeleteMerchant (delete functionality)


  // Removed confirmAction (delete functionality)

  // Removed handleBulkAction (delete functionality)

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Single useEffect for component mounting (reduced logging)
  useEffect(() => {
  }, []);

  if (loading) {
    return (
      <div className="merchant-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading merchants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="merchant-management-error">
        <p>{error}</p>
        <button onClick={fetchMerchants} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="merchant-management-enhanced">
      <div className="merchant-management-header">
        <h2>Business Partner Management</h2>
        <div className="header-actions">
          <div className="view-toggle">
            <button className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('cards')}>
              <i className="fas fa-th-large"></i> Cards View
            </button>
            <button className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('table')}>
              <i className="fas fa-table"></i> Table View
            </button>
          </div>
          {viewMode === 'table' && (
            <>
              <button className="btn btn-primary" onClick={handleAddMerchant}>
                <i className="fas fa-plus"></i> Add Partner
              </button>
              {selectedMerchants.length > 0 && (
                <button className="btn btn-secondary" onClick={() => setShowBulkActions(!showBulkActions)}>
                  <i className="fas fa-tasks"></i> Bulk Actions ({selectedMerchants.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Merchant Add/Edit Modal */}
      {showAddMerchant && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content merchant-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMerchant ? 'Edit Merchant' : 'Add Merchant'}</h3>
              <button className="close-btn" onClick={handleCancelEdit}>×</button>
            </div>
            <form onSubmit={handleMerchantFormSubmit} className="merchant-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={formData.userInfo.fullName} onChange={e => setFormData(f => ({ ...f, userInfo: { ...f.userInfo, fullName: e.target.value } }))} className={formErrors.fullName ? 'error' : ''} />
                {formErrors.fullName && <div className="error-message">{formErrors.fullName}</div>}
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={formData.userInfo.email} onChange={e => setFormData(f => ({ ...f, userInfo: { ...f.userInfo, email: e.target.value } }))} className={formErrors.email ? 'error' : ''} />
                {formErrors.email && <div className="error-message">{formErrors.email}</div>}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={formData.userInfo.phone} onChange={e => setFormData(f => ({ ...f, userInfo: { ...f.userInfo, phone: e.target.value } }))} className={formErrors.phone ? 'error' : ''} />
                {formErrors.phone && <div className="error-message">{formErrors.phone}</div>}
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" value={formData.userInfo.address} onChange={e => setFormData(f => ({ ...f, userInfo: { ...f.userInfo, address: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label>Community</label>
                <input type="text" value={formData.userInfo.community} onChange={e => setFormData(f => ({ ...f, userInfo: { ...f.userInfo, community: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={formData.userInfo.status} onChange={e => setFormData(f => ({ ...f, userInfo: { ...f.userInfo, status: e.target.value } }))}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="form-group">
                <label>Membership Plan</label>
                <select value={formData.userInfo.membershipType || ''} onChange={e => setFormData(f => ({ ...f, userInfo: { ...f.userInfo, membershipType: e.target.value } }))}>
                  <option value="">Select Plan</option>
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="business">Business</option>
                </select>
              </div>
              {/* Business Info Fields */}
              <div className="form-group">
                <label>Business Name *</label>
                <input type="text" value={formData.businessInfo.businessName} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, businessName: e.target.value } }))} className={formErrors.businessName ? 'error' : ''} />
                {formErrors.businessName && <div className="error-message">{formErrors.businessName}</div>}
              </div>
              <div className="form-group">
                <label>Business Description</label>
                <input type="text" value={formData.businessInfo.businessDescription} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, businessDescription: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label>Business Category</label>
                <input type="text" value={formData.businessInfo.businessCategory} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, businessCategory: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label>Business Address</label>
                <input type="text" value={formData.businessInfo.businessAddress} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, businessAddress: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label>Business Phone</label>
                <input type="text" value={formData.businessInfo.businessPhone} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, businessPhone: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label>Business Email</label>
                <input type="email" value={formData.businessInfo.businessEmail} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, businessEmail: e.target.value } }))} className={formErrors.businessEmail ? 'error' : ''} />
                {formErrors.businessEmail && <div className="error-message">{formErrors.businessEmail}</div>}
              </div>
              <div className="form-group">
                <label>Website</label>
                <input type="text" value={formData.businessInfo.website} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, website: e.target.value } }))} className={formErrors.website ? 'error' : ''} />
                {formErrors.website && <div className="error-message">{formErrors.website}</div>}
              </div>
              
              <div className="form-group">
                <label>Custom Deal Limit (per month)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={formData.businessInfo.customDealLimit} 
                  onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, customDealLimit: e.target.value } }))} 
                  placeholder="Leave empty to use plan default"
                />
                <small className="field-hint">Override the default monthly deal limit for this business. Leave empty to use their plan's default limit.</small>
              </div>
              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : (editingMerchant ? 'Update Merchant' : 'Add Merchant')}</button>
                <button className="btn btn-secondary" type="button" onClick={handleCancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        <>
          {/* Filters */}
          <div className="filters-section">
            <div className="filters-row">
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="Search merchants..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-group">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="filter-group">
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="retail">Retail</option>
                  <option value="services">Services</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="healthcare">Healthcare</option>
                </select>
              </div>
              <div className="filter-group">
                <select
                  value={filters.membershipType}
                  onChange={(e) => handleFilterChange('membershipType', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Plans</option>
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="business">Business</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && selectedMerchants.length > 0 && (
        <div className="bulk-actions-panel">
          <h4>Bulk Actions for {selectedMerchants.length} merchants:</h4>
          <div className="bulk-actions-buttons">
            <button 
              className="btn btn-success"
              onClick={() => {/* approve logic here */}}
            >
              <i className="fas fa-check"></i> Approve
            </button>
            <button 
              className="btn btn-warning"
              onClick={() => {/* reject logic here */}}
            >
              <i className="fas fa-times"></i> Reject
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => {/* suspend logic here */}}
            >
              <i className="fas fa-pause"></i> Suspend
            </button>
          </div>
        </div>
      )}

      {/* Merchants Table */}
      <div className="merchants-table-container">
        <table className="merchants-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedMerchants.length === merchants.length && merchants.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Business</th>
              <th>Owner</th>
              <th>Contact</th>
              <th>Category</th>
              <th>Plan</th>
              <th>Deal Limit</th>
              <th>Valid Till</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map(merchant => (
              <tr key={merchant.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedMerchants.includes(merchant.id)}
                    onChange={() => handleMerchantSelect(merchant.id)}
                  />
                </td>
                <td>
                  <div className="business-info">
                    <div className="business-name">{merchant.businessName || 'N/A'}</div>
                    <div className="business-desc">{merchant.businessDescription || ''}</div>
                  </div>
                </td>
                <td>
                  <div className="owner-info">
                    <div className="owner-name">{merchant.fullName}</div>
                    <div className="membership-type">{merchant.membershipType || 'free'}</div>
                  </div>
                </td>
                <td>
                  <div className="contact-info">
                    <div className="email">{merchant.email}</div>
                    <div className="phone">{merchant.phone || 'N/A'}</div>
                  </div>
                </td>
                <td>
                  <span className={`category-badge ${merchant.businessCategory}`}>
                    {merchant.businessCategory || 'N/A'}
                  </span>
                </td>
                <td>
                  <span className={`plan-badge ${merchant.membershipType || 'community'}`}>
                    {merchant.planName || merchant.membershipType ? 
                      (merchant.planName || merchant.membershipType.charAt(0).toUpperCase() + merchant.membershipType.slice(1)) :
                      'Community'
                    }
                  </span>
                </td>
                <td>
                  <div className="deal-limit-info">
                    {merchant.customDealLimit ? (
                      <span className="custom-limit" title="Custom limit set by admin">
                        <i className="fas fa-star"></i> {merchant.customDealLimit}/month
                      </span>
                    ) : (
                      <span className="plan-limit" title="Using plan default">
                        Plan Default
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {(() => {
                    const validity = calculateValidityInfo(merchant);
                    return (
                      <span className={`validity-date ${validity.className}`}>
                        {validity.label}
                        {typeof validity.daysLeft === 'number' && validity.className !== 'validity-expired' && validity.className !== 'validity-none' && (
                          <span className="days-remaining">{validity.daysLeft} day{validity.daysLeft !== 1 ? 's' : ''} left</span>
                        )}
                        {validity.className === 'validity-expired' && (
                          <span className="days-remaining">Expired</span>
                        )}
                      </span>
                    );
                  })()}
                </td>
                <td>
                  <span className={`status-badge ${merchant.status}`}>
                    {merchant.status}
                  </span>
                </td>
                <td>{formatDate(merchant.createdAt)}</td>                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleViewDetails(merchant);
                      }}
                      title="View Details"
                      type="button"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditMerchant(merchant);
                      }}
                      title="Edit"
                      type="button"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleInlineEdit(merchant);
                      }}
                      title="Quick Edit Deal Limit"
                      type="button"
                    >
                      <i className="fas fa-bolt"></i>
                    </button>
                    {merchant.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleApproveMerchant(merchant.id);
                          }}
                          title="Approve"
                          type="button"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRejectMerchant(merchant.id);
                          }}
                          title="Reject"
                          type="button"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                    {merchant.status === 'approved' && (
                      <button
                        className="btn btn-sm btn-suspend"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStatusChange(merchant.id, 'suspended');
                        }}
                        title="Suspend"
                        type="button"
                      >
                        <i className="fas fa-ban"></i>
                      </button>
                    )}
                    {merchant.status === 'suspended' && (
                      <button
                        className="btn btn-sm btn-activate"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStatusChange(merchant.id, 'approved');
                        }}
                        title="Activate"
                        type="button"
                      >
                        <i className="fas fa-check-circle"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {merchants.length === 0 && (
          <div className="no-merchants">
            <i className="fas fa-store fa-3x"></i>
            <h3>No business partners found</h3>
            <p>No merchants match your current filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {merchants.length > 0 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} merchants
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-sm btn-secondary"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </button>
            <span className="page-info">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="btn btn-sm btn-secondary"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </button>
          </div>
        </div>      )}
        </>
      )}

      {/* Business Cards View */}
      {viewMode === 'cards' && (
        <div className="business-cards-container">
          <div className="business-cards-header">
            <h3>
              <i className="fas fa-th-large"></i>
              Active Business Partners ({businesses.length})
            </h3>
            <p>Explore our verified business partners directory</p>
          </div>
          
          {businesses.length > 0 ? (
            <div className="business-grid">
              {businesses.map((business, index) => (
                <div key={business.id || index} className="business-card">
                  <div className="business-card-inner">
                    <div className="business-card-front">
                      <div className="business-logo">
                        {business.logo ? (
                          <img src={business.logo} alt={business.name} />
                        ) : (
                          <div className="business-placeholder">
                            <i className="fas fa-store"></i>
                          </div>
                        )}
                      </div>
                      <div className="business-info">
                        <h3 className="business-name">{business.name}</h3>
                        <p className="business-category">{business.sector}</p>
                        <p className="business-description">
                          {business.description ? 
                            `${business.description.substring(0, 100)}...` : 
                            'Premium business partner in our community'
                          }
                        </p>
                        <div className="business-contact">
                          {business.phone && (
                            <a href={`tel:${business.phone}`} className="contact-link" title="Call">
                              <i className="fas fa-phone"></i>
                            </a>
                          )}
                          {business.email && (
                            <a href={`mailto:${business.email}`} className="contact-link" title="Email">
                              <i className="fas fa-envelope"></i>
                            </a>
                          )}
                          {business.website && (
                            <a href={business.website} target="_blank" rel="noopener noreferrer" className="contact-link" title="Website">
                              <i className="fas fa-globe"></i>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="business-badge">
                        <i className="fas fa-certificate" title="Verified Partner"></i>
                      </div>
                    </div>
                    <div className="business-card-back">
                      <div className="card-back-content">
                        <h4>{business.name}</h4>
                        <div className="business-details">
                          <div className="detail-item">
                            <i className="fas fa-tag"></i>
                            <span>{business.sector}</span>
                          </div>
                          {business.address && (
                            <div className="detail-item">
                              <i className="fas fa-map-marker-alt"></i>
                              <span>{business.address}</span>
                            </div>
                          )}
                          {business.isVerified && (
                            <div className="detail-item">
                              <i className="fas fa-check-circle"></i>
                              <span>Verified Business</span>
                            </div>
                          )}
                          {business.membershipLevel && (
                            <div className="detail-item">
                              <i className="fas fa-crown"></i>
                              <span>{business.membershipLevel} Member</span>
                            </div>
                          )}
                          {business.ownerName && (
                            <div className="detail-item">
                              <i className="fas fa-user"></i>
                              <span>Owner: {business.ownerName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-businesses">
              <i className="fas fa-store-slash fa-4x"></i>
              <h3>No Active Businesses Found</h3>
              <p>There are currently no active business partners to display.</p>
            </div>
          )}
        </div>
      )}

      {/* Merchant Details Modal */}
      {showMerchantDetails && selectedMerchant && (
        <div className="modal-overlay" onClick={() => setShowMerchantDetails(false)}>
          <div className="modal-content merchant-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Merchant Details</h3>
              <button className="close-btn" onClick={() => setShowMerchantDetails(false)}>×</button>
            </div>            <div className="modal-body">
              {/* Business ID Header */}
              <div className="business-id-header">
                <h3>Business ID: <span className="business-id">{selectedMerchant.businessId || 'N/A'}</span></h3>
                <div className="business-status">
                  <span className={`status-badge ${selectedMerchant.businessStatus || selectedMerchant.status}`}>
                    {selectedMerchant.businessStatus || selectedMerchant.status}
                  </span>
                </div>
              </div>
              
              <div className="merchant-details-grid">
                <div className="detail-section">
                  <h4>Personal Information</h4>
                  <div className="detail-item">
                    <label>Full Name:</label>
                    <span>{selectedMerchant.fullName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedMerchant.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedMerchant.phone || 'N/A'}</span>
                  </div>                  <div className="detail-item">
                    <label>Community:</label>
                    <span>{selectedMerchant.community || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Membership:</label>
                    <span>{selectedMerchant.membershipType || 'free'}</span>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Business Information</h4>
                  <div className="detail-item">
                    <label>Business Name:</label>
                    <span>{selectedMerchant.businessName || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Description:</label>
                    <span>{selectedMerchant.businessDescription || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Category:</label>
                    <span>{selectedMerchant.businessCategory || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Business Address:</label>
                    <span>{selectedMerchant.businessAddress || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Business Phone:</label>
                    <span>{selectedMerchant.businessPhone || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Business Email:</label>
                    <span>{selectedMerchant.businessEmail || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Website:</label>
                    <span>{selectedMerchant.website || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Business License:</label>
                    <span>{selectedMerchant.businessLicense || 'N/A'}</span>
                  </div>                  <div className="detail-item">
                    <label>Tax ID:</label>
                    <span>{selectedMerchant.taxId || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowMerchantDetails(false);
                  handleEditMerchant(selectedMerchant);
                }}
              >
                Edit Merchant
              </button>
              <button className="btn btn-secondary" onClick={() => setShowMerchantDetails(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
  {/* Delete confirmation dialog removed */}

      {/* Edit Modal for Custom Deal Limits */}
      {showEditModal && editingMerchant && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Edit Deal Limit - {editingMerchant.businessName || editingMerchant.fullName}</h3>
              <button 
                className="modal-close" 
                onClick={handleEditCancel}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleEditSubmit(editingMerchant);
              }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Business Name</label>
                    <input
                      type="text"
                      value={editingMerchant.businessName || ''}
                      onChange={(e) => setEditingMerchant({
                        ...editingMerchant,
                        businessName: e.target.value
                      })}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Owner Name</label>
                    <input
                      type="text"
                      value={editingMerchant.fullName || ''}
                      onChange={(e) => setEditingMerchant({
                        ...editingMerchant,
                        fullName: e.target.value
                      })}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={editingMerchant.email || ''}
                      onChange={(e) => setEditingMerchant({
                        ...editingMerchant,
                        email: e.target.value
                      })}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={editingMerchant.status || ''}
                      onChange={(e) => setEditingMerchant({
                        ...editingMerchant,
                        status: e.target.value
                      })}
                      className="form-control"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Custom Deal Limit (per month)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editingMerchant.customDealLimit || ''}
                      onChange={(e) => setEditingMerchant({
                        ...editingMerchant,
                        customDealLimit: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="form-control"
                      placeholder="Leave empty to use plan default"
                    />
                    <small className="form-text text-muted">
                      Override the default monthly deal limit for this business. Leave empty to use their plan's default limit.
                    </small>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleEditCancel}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MerchantManagementEnhanced;