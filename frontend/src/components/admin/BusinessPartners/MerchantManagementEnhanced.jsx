import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import './MerchantManagementEnhanced.css';

const MerchantManagementEnhanced = () => {
  const { showNotification } = useNotification();
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [showMerchantDetails, setShowMerchantDetails] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState(null);
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
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    action: '',
    merchantId: null,
    merchantName: ''
  });

  useEffect(() => {
    fetchMerchants();
  }, [filters, pagination.page]);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        ...filters
      });
      
      const response = await api.get(`/admin/merchants?${params}`);
      if (response.data.success) {
        setMerchants(response.data.merchants || []);
        // Note: Backend doesn't return pagination info yet, so we'll estimate
        setPagination(prev => ({
          ...prev,
          total: response.data.merchants?.length || 0,
          pages: Math.ceil((response.data.merchants?.length || 0) / pagination.limit)
        }));
      }
    } catch (err) {
      setError('Failed to fetch merchants');
      console.error('Error fetching merchants:', err);
      showNotification('Error loading merchants', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const handleEditMerchant = (merchant) => {
    setEditingMerchant({
      id: merchant.id,
      userInfo: {
        fullName: merchant.fullName || '',
        email: merchant.email || '',
        phone: merchant.phone || '',
        address: merchant.address || '',
        community: merchant.community || '',
        membershipType: merchant.membershipType || '',
        status: merchant.status || ''
      },
      businessInfo: {
        businessName: merchant.businessName || '',
        businessDescription: merchant.businessDescription || '',
        businessCategory: merchant.businessCategory || '',
        businessAddress: merchant.businessAddress || '',
        businessPhone: merchant.businessPhone || '',
        businessEmail: merchant.businessEmail || '',
        website: merchant.website || ''
      }
    });
    setShowAddMerchant(true);
  };

  const handleViewDetails = (merchant) => {
    setSelectedMerchant(merchant);
    setShowMerchantDetails(true);
  };
  const handleSaveMerchant = async (merchantData) => {
    try {
      if (editingMerchant) {
        await api.put(`/admin/merchants/${editingMerchant.id}`, merchantData);
        showNotification('Merchant updated successfully', 'success');
      } else {
        // Add new merchant through admin registration
        const newMerchantData = {
          ...merchantData.userInfo,
          userType: 'merchant',
          status: 'approved', // Admin can approve directly
          termsAccepted: true,
          businessInfo: merchantData.businessInfo
        };
        await api.post('/admin/merchants/create', newMerchantData);
        showNotification('New merchant added successfully', 'success');
      }
      setShowAddMerchant(false);
      setEditingMerchant(null);
      fetchMerchants();
    } catch (err) {
      console.error('Error saving merchant:', err);
      const errorMessage = err.response?.data?.message || 'Error saving merchant';
      showNotification(errorMessage, 'error');
    }
  };

  const handleStatusChange = async (merchantId, newStatus) => {
    try {
      if (newStatus === 'approved') {
        await api.post(`/admin/merchants/${merchantId}/approve`);
      } else if (newStatus === 'rejected') {
        await api.post(`/admin/merchants/${merchantId}/reject`);
      }
      showNotification(`Merchant ${newStatus} successfully`, 'success');
      fetchMerchants();
    } catch (err) {
      console.error('Error updating merchant status:', err);
      showNotification('Error updating merchant status', 'error');
    }
  };

  const handleDeleteMerchant = (merchantId, merchantName) => {
    setConfirmDialog({
      show: true,
      action: 'delete',
      merchantId,
      merchantName
    });
  };

  const confirmAction = async () => {
    try {
      const { action, merchantId } = confirmDialog;
      
      if (action === 'delete') {
        await api.delete(`/admin/merchants/${merchantId}`);
        showNotification('Merchant deleted successfully', 'success');
        fetchMerchants();
      }
      
      setConfirmDialog({ show: false, action: '', merchantId: null, merchantName: '' });
    } catch (err) {
      console.error('Error performing action:', err);
      showNotification('Error performing action', 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedMerchants.length === 0) {
      showNotification('Please select merchants first', 'warning');
      return;
    }

    try {
      await api.post('/admin/merchants/bulk-action', {
        action,
        merchantIds: selectedMerchants
      });
      
      showNotification(`Bulk ${action} completed successfully`, 'success');
      setSelectedMerchants([]);
      setShowBulkActions(false);
      fetchMerchants();
    } catch (err) {
      console.error('Error performing bulk action:', err);
      showNotification('Error performing bulk action', 'error');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

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
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingMerchant(null);
              setShowAddMerchant(true);
            }}
          >
            <i className="fas fa-plus"></i>
            Add Partner
          </button>
          {selectedMerchants.length > 0 && (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowBulkActions(!showBulkActions)}
            >
              <i className="fas fa-tasks"></i>
              Bulk Actions ({selectedMerchants.length})
            </button>
          )}
        </div>
      </div>

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
              onClick={() => handleBulkAction('approve')}
            >
              <i className="fas fa-check"></i> Approve
            </button>
            <button 
              className="btn btn-warning"
              onClick={() => handleBulkAction('reject')}
            >
              <i className="fas fa-times"></i> Reject
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => handleBulkAction('suspend')}
            >
              <i className="fas fa-pause"></i> Suspend
            </button>
            <button 
              className="btn btn-danger"
              onClick={() => handleBulkAction('delete')}
            >
              <i className="fas fa-trash"></i> Delete
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
                  <span className={`status-badge ${merchant.status}`}>
                    {merchant.status}
                  </span>
                </td>
                <td>{formatDate(merchant.createdAt)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleViewDetails(merchant)}
                      title="View Details"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEditMerchant(merchant)}
                      title="Edit"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    {merchant.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleStatusChange(merchant.id, 'approved')}
                          title="Approve"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleStatusChange(merchant.id, 'rejected')}
                          title="Reject"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    )}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteMerchant(merchant.id, merchant.businessName || merchant.fullName)}
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
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

      {/* Add/Edit Merchant Modal */}
      {showAddMerchant && (
        <MerchantForm
          merchant={editingMerchant}
          onSave={handleSaveMerchant}
          onCancel={() => {
            setShowAddMerchant(false);
            setEditingMerchant(null);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.show && (
        <div className="modal-overlay">
          <div className="modal-content confirm-dialog">
            <div className="modal-header">
              <h3>Confirm Action</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to {confirmDialog.action} the merchant "{confirmDialog.merchantName}"?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={confirmAction}>
                Confirm {confirmDialog.action}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setConfirmDialog({ show: false, action: '', merchantId: null, merchantName: '' })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Merchant Form Component
const MerchantForm = ({ merchant, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    userInfo: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      community: '',
      membershipType: 'free',
      status: 'pending'
    },
    businessInfo: {
      businessName: '',
      businessDescription: '',
      businessCategory: '',
      businessAddress: '',
      businessPhone: '',
      businessEmail: '',
      website: ''
    }
  });

  useEffect(() => {
    if (merchant) {
      setFormData(merchant);
    }
  }, [merchant]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content merchant-form-modal">
        <div className="modal-header">
          <h3>{merchant ? 'Edit Merchant' : 'Add Merchant'}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-sections">
              <div className="form-section">
                <h4>Personal Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={formData.userInfo.fullName}
                      onChange={(e) => handleInputChange('userInfo', 'fullName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.userInfo.email}
                      onChange={(e) => handleInputChange('userInfo', 'email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formData.userInfo.phone}
                      onChange={(e) => handleInputChange('userInfo', 'phone', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      value={formData.userInfo.address}
                      onChange={(e) => handleInputChange('userInfo', 'address', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Community</label>
                    <input
                      type="text"
                      value={formData.userInfo.community}
                      onChange={(e) => handleInputChange('userInfo', 'community', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.userInfo.status}
                      onChange={(e) => handleInputChange('userInfo', 'status', e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>Business Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Business Name *</label>
                    <input
                      type="text"
                      value={formData.businessInfo.businessName}
                      onChange={(e) => handleInputChange('businessInfo', 'businessName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Business Description</label>
                    <textarea
                      value={formData.businessInfo.businessDescription}
                      onChange={(e) => handleInputChange('businessInfo', 'businessDescription', e.target.value)}
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={formData.businessInfo.businessCategory}
                      onChange={(e) => handleInputChange('businessInfo', 'businessCategory', e.target.value)}
                    >
                      <option value="">Select Category</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="retail">Retail</option>
                      <option value="services">Services</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="healthcare">Healthcare</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Business Address</label>
                    <input
                      type="text"
                      value={formData.businessInfo.businessAddress}
                      onChange={(e) => handleInputChange('businessInfo', 'businessAddress', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Business Phone</label>
                    <input
                      type="tel"
                      value={formData.businessInfo.businessPhone}
                      onChange={(e) => handleInputChange('businessInfo', 'businessPhone', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Business Email</label>
                    <input
                      type="email"
                      value={formData.businessInfo.businessEmail}
                      onChange={(e) => handleInputChange('businessInfo', 'businessEmail', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      value={formData.businessInfo.website}
                      onChange={(e) => handleInputChange('businessInfo', 'website', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              {merchant ? 'Update Merchant' : 'Add Merchant'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MerchantManagementEnhanced;
