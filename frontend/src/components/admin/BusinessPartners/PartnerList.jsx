import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import './PartnerList.css';
import PartnerDetail from './PartnerDetail';
import ConfirmationDialog from '../../common/ConfirmationDialog';
import PlanAssignment from '../PlanManagement/PlanAssignment';

/**
 * PartnerList component for displaying and managing business partners
 * @returns {React.ReactElement} The partner list component
 */
const PartnerList = () => {
  const { showNotification } = useNotification();
  const { validateSession, handleSessionExpired } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [showPlanAssignmentModal, setShowPlanAssignmentModal] = useState(false);
  const [planAssignmentUserId, setPlanAssignmentUserId] = useState(null);
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [editingPartner, setEditingPartner] = useState(null);
  const [confirmationDialog, setConfirmationDialog] = useState({
    show: false,
    action: '',
    partnerId: '',
    partnerName: ''
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'all',
    category: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalPartners: 0
  });
  useEffect(() => {
    fetchPartners();
  }, [filters.status, filters.category, pagination.currentPage, pagination.pageSize]);
  const fetchPartners = async () => {
    try {
      setIsLoading(true);
      
      const queryParams = new URLSearchParams({
        status: filters.status,
        category: filters.category !== 'all' ? filters.category : '',
        search: filters.search,
        page: pagination.currentPage,
        limit: pagination.pageSize
      });
      
      if (filters.dateFrom) {
        queryParams.append('dateFrom', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        queryParams.append('dateTo', filters.dateTo);
      }
      
      const response = await api.get(`/admin/partners?${queryParams}`);
      
      setPartners(response.data.merchants || []);
      setPagination({
        ...pagination,
        totalPages: Math.ceil((response.data.totalMerchants || 0) / pagination.pageSize),
        totalPartners: response.data.totalMerchants || 0
      });
    } catch (error) {
      console.error('Error fetching partners:', error);
      console.error('Error response:', error.response?.data);
      showNotification('Error loading business partners. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
    setPagination({ ...pagination, currentPage: 1 });
    
    // Update URL params for status filter
    if (newFilters.status && newFilters.status !== 'all') {
      setSearchParams({ status: newFilters.status });
    } else {
      setSearchParams({});
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    fetchPartners();
  };
  
  const handlePageChange = (page) => {
    setPagination({ ...pagination, currentPage: page });
  };
  
  const handlePageSizeChange = (size) => {
    setPagination({
      ...pagination,
      pageSize: size,
      currentPage: 1
    });
  };
    const handlePartnerAction = async (partnerId, action) => {
    // Show confirmation for destructive actions
    if (action === 'suspend' || action === 'reject') {
      const partner = partners.find(p => p.id === partnerId);
      setConfirmationDialog({
        show: true,
        action: action,
        partnerId: partnerId,
        partnerName: partner?.fullName || 'this partner'
      });
      return;
    }
    
    // Execute the action directly for non-destructive actions
    await executePartnerAction(partnerId, action);
  };
  
  const executePartnerAction = async (partnerId, action) => {
    const statusMapping = {
      'approve': 'approved',
      'reject': 'rejected',
      'suspend': 'suspended',
      'activate': 'approved'
    };
    
    const newStatus = statusMapping[action] || action;
    
    try {
      // First validate the session
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      const response = await api.put(`/admin/partners/${partnerId}/status`, { status: newStatus });
      
      showNotification(`Partner ${action}d successfully.`, 'success');
      setPartners(partners.map(partner => 
        partner.id === partnerId ? { ...partner, status: newStatus } : partner
      ));
    } catch (error) {
      console.error('Error updating partner status:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      
      showNotification(`Failed to ${action} partner. Please try again.`, 'error');
    }
  };
  
  const handleConfirmAction = async () => {
    const { partnerId, action } = confirmationDialog;
    
    if (action === 'delete') {
      await executeDeletePartner(partnerId);
    } else {
      await executePartnerAction(partnerId, action);
    }
    
    setConfirmationDialog({
      show: false,
      action: '',
      partnerId: '',
      partnerName: ''
    });
  };
  
  const handleCancelAction = () => {
    setConfirmationDialog({
      show: false,
      action: '',
      partnerId: '',
      partnerName: ''
    });
  };
  
  const handleStatusChange = async (partnerId, newStatus) => {
    // For backward compatibility, map status to action
    const actionMapping = {
      'approved': 'approve',
      'rejected': 'reject',
      'suspended': 'suspend'
    };
    
    const action = actionMapping[newStatus] || newStatus;
    await handlePartnerAction(partnerId, action);
  };

  const handlePlanChange = (partnerId) => {
    setPlanAssignmentUserId(partnerId);
    setShowPlanAssignmentModal(true);
  };

  const handlePlanAssignmentClose = () => {
    setShowPlanAssignmentModal(false);
    setPlanAssignmentUserId(null);
    // Refresh the partner list to show updated plan information
    fetchPartners();
  };
    
  const handleBulkAction = async (action, partnerIds) => {
    try {
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      const response = await api.post(`/admin/partners/bulk-action`, { action, merchantIds: partnerIds });
      showNotification(`Successfully ${action}ed ${partnerIds.length} partners.`, 'success');
      setShowBulkActionModal(false);
      setSelectedPartners([]);
      fetchPartners();
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      showNotification(`Failed to ${action} partners. Please try again.`, 'error');
    }
  };
    const toggleSelectPartner = (partnerId) => {
    setSelectedPartners(prev => 
      prev.includes(partnerId) 
        ? prev.filter(id => id !== partnerId)
        : [...prev, partnerId]
    );
  };
  
  const toggleSelectAll = () => {
    if (selectedPartners.length === partners.length) {
      setSelectedPartners([]);
    } else {
      setSelectedPartners(partners.map(p => p.id || p._id));
    }
  };
  
  const handlePartnerEdit = async (partner) => {
    try {
      // Fetch fresh partner data from backend
      const response = await api.get(`/admin/partners/${partner.id}`);
      if (response.data.success) {
        setEditingPartner(response.data.merchant);
        setShowEditModal(true);
      } else {
        showNotification('Failed to load partner details for editing.', 'error');
      }
    } catch (error) {
      console.error('Error fetching partner details for edit:', error);
      showNotification('Failed to load partner details. Please try again.', 'error');
    }
  };

  const handleEditSubmit = async (updatedPartner) => {
    try {
      const response = await api.put(`/admin/partners/${updatedPartner.id}`, updatedPartner);
      
      showNotification('Partner details updated successfully.', 'success');
      
      // Update the partner in the list
      setPartners(partners.map(p => 
        p.id === updatedPartner.id ? { ...p, ...updatedPartner } : p
      ));
      
      setShowEditModal(false);
      setEditingPartner(null);
    } catch (error) {
      console.error('Error updating partner:', error);
      showNotification('Failed to update partner details. Please try again.', 'error');
    }
  };
  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingPartner(null);
  };

  const handlePartnerDelete = async (partnerId, partnerName) => {
    setConfirmationDialog({
      show: true,
      action: 'delete',
      partnerId: partnerId,
      partnerName: partnerName
    });
  };

  const executeDeletePartner = async (partnerId) => {
    try {
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      await api.delete(`/admin/partners/${partnerId}`);
      
      showNotification('Partner deleted successfully.', 'success');
      
      // Remove the partner from the list
      setPartners(partners.filter(p => p.id !== partnerId));
      
      // Clear selection if deleted partner was selected
      setSelectedPartners(selectedPartners.filter(id => id !== partnerId));
      
    } catch (error) {
      console.error('Error deleting partner:', error);
      if (error.response?.status === 401) {
        handleSessionExpired();
      } else {
        showNotification('Failed to delete partner. Please try again.', 'error');
      }
    }
  };
  
  const handleAddPartner = async (partnerData) => {
    try {
      // Check if all required fields are present
      if (!partnerData.fullName || !partnerData.email || !partnerData.businessName || !partnerData.businessCategory) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }
      
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      const response = await api.post('/admin/partners', partnerData);
      
      showNotification('Partner added successfully!', 'success');
      setShowAddModal(false);
      fetchPartners();
    } catch (error) {
      console.error('Error adding partner:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      const errorMessage = error.response?.data?.message || 'Failed to add partner. Please try again.';
      showNotification(errorMessage, 'error');
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
  
  const calculateValidityDate = (partner) => {
    // Use plan assignment date if available, otherwise use created date
    const baseDate = partner.planAssignedAt || partner.createdAt;
    if (!baseDate) return 'N/A';
    
    const assignedDate = new Date(baseDate);
    if (isNaN(assignedDate.getTime())) return 'N/A';
    
    // Get billing cycle from partner data
    const billingCycle = partner.billingCycle || 'yearly';
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
        return 'Lifetime';
      case 'weekly':
        validityDate.setDate(validityDate.getDate() + 7);
        break;
      default:
        // Default to 1 year if unknown billing cycle
        validityDate.setFullYear(validityDate.getFullYear() + 1);
        break;
    }
    
    return formatDate(validityDate);
  };
  
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-badge approved';
      case 'pending':
        return 'status-badge pending';
      case 'rejected':
        return 'status-badge rejected';
      case 'suspended':
        return 'status-badge suspended';
      default:
        return 'status-badge';
    }
  };
  if (isLoading && partners.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading partners...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="user-management">
      <div className="section-header">
        <div className="header-content">
          <h2>Business Partners</h2>
          <p>View and manage all business partners in the system</p>
        </div>
        <div className="header-actions">
          <button 
            className="button primary"
            onClick={() => setShowAddModal(true)}
          >
            <i className="fas fa-plus"></i>
            Add Partner
          </button>
          {selectedPartners.length > 0 && (
            <button 
              className="button secondary"
              onClick={() => setShowBulkActionModal(true)}
            >
              <i className="fas fa-tasks"></i>
              Bulk Actions ({selectedPartners.length})
            </button>
          )}
          <Link to="/admin" className="btn-secondary" style={{marginLeft: '0.5rem'}}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
        </div>
      </div>
      
      <div className="user-filters">
        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by name, email, or business name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
            <button type="submit">
              <i className="fas fa-search"></i>
            </button>
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value })}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
              <div className="filter-group">
              <label>Category:</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange({ category: e.target.value })}
              >
                <option value="all">All Categories</option>
                <option value="restaurant">Restaurant</option>
                <option value="retail">Retail</option>
                <option value="services">Services</option>
                <option value="healthcare">Healthcare</option>
                <option value="technology">Technology</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="date-range">
              <div className="filter-group">
                <label>From:</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              
              <div className="filter-group">
                <label>To:</label>
                <input
                  type="date"
                  value={filters.dateTo}                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
            </div>
            
            <div className="filter-actions">
              <button 
                type="button" 
                className="btn-clear"
                onClick={() => handleFilterChange({ status: 'all', category: 'all', search: '', dateFrom: '', dateTo: '' })}
              >
                <i className="fas fa-times"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </form>
      </div>      <div className="user-list-container">
        {isLoading ? (
          <div className="loading-table">
            <div className="loading-row header"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="loading-row"></div>
            ))}
          </div>
        ) : (partners && partners.length > 0) ? (
          <>
            <table className="user-table">
              <thead>
                <tr>                  <th>
                    <input
                      type="checkbox"
                      checked={partners.length > 0 && selectedPartners.length === partners.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Business Name</th>
                  <th>Owner</th>
                  <th>Contact</th>
                  <th>Category</th>
                  <th>Plan</th>
                  <th>Valid Till</th>
                  <th>Status</th>
                  <th>Registration Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(partner => (
                  <tr key={partner.id}>                    <td>
                      <input
                        type="checkbox"
                        checked={selectedPartners.includes(partner.id || partner._id)}
                        onChange={() => toggleSelectPartner(partner.id || partner._id)}
                      />
                    </td>                    <td>
                      <div className="user-name-cell">
                        <div className="user-avatar">
                          <div className="user-initials">
                            {partner.businessName ? 
                              partner.businessName.split(' ').map(n => n[0]).join('') : 
                              'B'
                            }
                          </div>
                        </div>
                        <span>{partner.businessName}</span>
                      </div>
                    </td>
                    <td>{partner.ownerName}</td>
                    <td>
                      <div className="contact-info">
                        <div>{partner.email}</div>
                        <div className="phone-small">{partner.phone}</div>
                      </div>
                    </td>
                    <td>{partner.businessCategory}</td>
                    <td>
                      <span className={`plan-badge ${partner.membershipType || 'community'}`}>
                        {partner.planName || partner.membershipType ? 
                          (partner.planName || partner.membershipType.charAt(0).toUpperCase() + partner.membershipType.slice(1)) :
                          'Community'
                        }
                      </span>
                    </td>
                    <td>
                      <span className="validity-date">
                        {calculateValidityDate(partner)}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(partner.status)}>
                        {partner.status ? 
                          (partner.status.charAt(0).toUpperCase() + partner.status.slice(1)) : 
                          'Pending'
                        }
                      </span>
                    </td>
                    <td>{formatDate(partner.createdAt)}</td>
                    <td>
                      <div className="user-actions">
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedPartner(partner)}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        
                        <button
                          className="btn-icon edit"
                          onClick={() => handlePartnerEdit(partner)}
                          title="Edit Partner"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        
                        <button
                          className="btn-icon plan-change"
                          onClick={() => handlePlanChange(partner.id)}
                          title="Change Plan"
                        >
                          <i className="fas fa-id-card"></i>
                        </button>
                          {partner.status === 'pending' && (
                          <>
                            <button
                              className="btn-icon approve"
                              onClick={() => handlePartnerAction(partner.id, 'approve')}
                              title="Approve Partner"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              className="btn-icon reject"
                              onClick={() => handlePartnerAction(partner.id, 'reject')}
                              title="Reject Partner"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                        
                        {partner.status !== 'pending' && partner.status !== 'suspended' && (
                          <button
                            className="btn-icon suspend"
                            onClick={() => handlePartnerAction(partner.id, 'suspend')}
                            title="Suspend Partner"
                          >
                            <i className="fas fa-ban"></i>
                          </button>
                        )}
                        
                        {partner.status === 'suspended' && (
                          <button
                            className="btn-icon activate"
                            onClick={() => handlePartnerAction(partner.id, 'activate')}
                            title="Activate Partner"
                          >
                            <i className="fas fa-check-circle"></i>
                          </button>
                        )}

                        <button
                          className="btn-icon delete"
                          onClick={() => handlePartnerDelete(partner.id, partner.businessName || partner.fullName)}
                          title="Delete Partner"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="empty-state">
            <i className="fas fa-handshake"></i>
            <p>No partners found matching the current filters</p>
            <button 
              className="btn-outline" 
              onClick={() => handleFilterChange({ status: 'all', category: 'all', search: '', dateFrom: '', dateTo: '' })}
            >
              Clear Filters
            </button>
          </div>        )}
      </div>
              <div className="pagination">
              <div className="pagination-info">
                <span>
                  Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalPartners)} of{' '}
                  {pagination.totalPartners} partners
                </span>
                
                <div className="page-size-selector">
                  <label>Show:</label>
                  <select 
                    value={pagination.pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              
              <div className="pagination-controls">
                <button 
                  className="btn-page" 
                  disabled={pagination.currentPage === 1}
                  onClick={() => handlePageChange(1)}
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button 
                  className="btn-page" 
                  disabled={pagination.currentPage === 1}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  <i className="fas fa-angle-left"></i>
                </button>
                
                {/* Page numbers */}
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === pagination.totalPages ||
                    (pageNum >= pagination.currentPage - 1 && pageNum <= pagination.currentPage + 1)
                  ) {
                    return (
                      <button 
                        key={pageNum}
                        className={`btn-page ${pageNum === pagination.currentPage ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    (pageNum === pagination.currentPage - 2 && pagination.currentPage > 3) ||
                    (pageNum === pagination.currentPage + 2 && pagination.currentPage < pagination.totalPages - 2)
                  ) {
                    return <span key={pageNum} className="pagination-ellipsis">...</span>;
                  }
                  return null;
                })}
                
                <button 
                  className="btn-page" 
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  <i className="fas fa-angle-right"></i>
                </button>
                <button 
                  className="btn-page" 
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.totalPages)}
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            </div>
      
      {/* Add Partner Detail Modal here */}
      {selectedPartner && (
        <PartnerDetail partner={selectedPartner} onClose={() => setSelectedPartner(null)} />
      )}
      
      {/* Edit Partner Modal */}
      {showEditModal && editingPartner && (        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>Edit Partner Details</h3>
              <button 
                className="modal-close" 
                onClick={handleEditCancel}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleEditSubmit(editingPartner); }}>
                <div className="form-group">
                  <label>Business Name:</label>
                  <input
                    type="text"
                    value={editingPartner.businessName}
                    onChange={(e) => setEditingPartner({ ...editingPartner, businessName: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Category:</label>
                  <select
                    value={editingPartner.category}
                    onChange={(e) => setEditingPartner({ ...editingPartner, category: e.target.value })}
                    required
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="retail">Retail</option>
                    <option value="service">Service</option>
                    <option value="professional">Professional</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Owner Name:</label>
                  <input
                    type="text"
                    value={editingPartner.ownerName}
                    onChange={(e) => setEditingPartner({ ...editingPartner, ownerName: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Email:</label>
                  <input
                    type="email"
                    value={editingPartner.email}
                    onChange={(e) => setEditingPartner({ ...editingPartner, email: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone:</label>
                  <input
                    type="text"
                    value={editingPartner.phone}
                    onChange={(e) => setEditingPartner({ ...editingPartner, phone: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Address:</label>
                  <input
                    type="text"
                    value={editingPartner.address}
                    onChange={(e) => setEditingPartner({ ...editingPartner, address: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="button button-primary">
                    <i className="fas fa-save"></i> Save Changes
                  </button>
                  
                  <button 
                    type="button" 
                    className="button button-secondary"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>          </div>
        </div>
      )}
      
      {/* Edit Partner Modal */}
      {showEditModal && editingPartner && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Partner Details</h2>
              <button className="modal-close" onClick={handleEditCancel}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleEditSubmit(editingPartner);
              }}>
                <div className="form-group">
                  <label>Business Name (Read-only)</label>
                  <input
                    type="text"
                    value={editingPartner.businessName}
                    disabled
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Owner Name (Read-only)</label>
                  <input
                    type="text"
                    value={editingPartner.ownerName}
                    disabled
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Business Category</label>
                  <select
                    value={editingPartner.businessCategory}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      businessCategory: e.target.value
                    })}
                    className="form-control"
                  >
                    <option value="retail">Retail</option>
                    <option value="food">Food & Beverage</option>
                    <option value="services">Services</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="technology">Technology</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Business Description</label>
                  <textarea
                    value={editingPartner.businessDescription}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      businessDescription: e.target.value
                    })}
                    className="form-control"
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label>Business Phone</label>
                  <input
                    type="text"
                    value={editingPartner.businessPhone}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      businessPhone: e.target.value
                    })}
                    className="form-control"
                  />
                </div>
                
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="url"
                    value={editingPartner.website}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
                      website: e.target.value
                    })}
                    className="form-control"
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingPartner.status}
                    onChange={(e) => setEditingPartner({
                      ...editingPartner,
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
                  <label>
                    <input
                      type="checkbox"
                      checked={editingPartner.isVerified}
                      onChange={(e) => setEditingPartner({
                        ...editingPartner,
                        isVerified: e.target.checked
                      })}
                    />
                    Verified Business
                  </label>
                </div>
                  <div className="modal-actions">
                  <button type="button" className="button secondary" onClick={handleEditCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="button primary">
                    Update Partner
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}      {/* Add Partner Modal */}
      {showAddModal && (
        <AddPartnerModal 
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddPartner}
          showNotification={showNotification}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.show}
        type={confirmationDialog.action === 'suspend' ? 'warning' : 'danger'}
        title={`Confirm ${
          confirmationDialog.action === 'suspend' ? 'Suspension' : 
          confirmationDialog.action === 'delete' ? 'Deletion' : 
          'Rejection'
        }`}
        message={`Are you sure you want to ${confirmationDialog.action} ${confirmationDialog.partnerName}?`}
        details={
          confirmationDialog.action === 'suspend' 
            ? 'This will prevent the partner from accessing their account until they are reactivated.'
            : confirmationDialog.action === 'delete'
            ? 'This action cannot be undone. All partner data and associated information will be permanently removed.'
            : 'This will permanently reject the partner\'s registration request.'
        }
        confirmText={
          confirmationDialog.action === 'suspend' ? 'Suspend Partner' : 
          confirmationDialog.action === 'delete' ? 'Delete Partner' : 
          'Reject Partner'
        }
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />

      {/* Bulk Action Modal */}
      {showBulkActionModal && (
        <BulkActionModal 
          partners={selectedPartners.map(id => partners.find(p => (p.id || p._id) === id)).filter(Boolean)}
          onClose={() => setShowBulkActionModal(false)}
          onSubmit={handleBulkAction}
        />
      )}

      {/* Plan Assignment Modal */}
      {showPlanAssignmentModal && planAssignmentUserId && (
        <div className="modal-overlay">
          <div className="modal-content plan-assignment-modal">
            <PlanAssignment 
              userId={planAssignmentUserId}
              onClose={handlePlanAssignmentClose}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Add Partner Modal Component
const AddPartnerModal = ({ onClose, onSubmit, showNotification }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessName: '',
    businessCategory: '',
    businessDescription: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    businessLicense: '',
    taxId: '',
    businessAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Ghana'
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('businessAddress.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        businessAddress: {
          ...prev.businessAddress,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.businessName || !formData.businessCategory) {
      showNotification('Please fill in all required fields: Full Name, Email, Business Name, and Business Category', 'error');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>Add New Partner</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h4>Personal Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Business Information</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessName">Business Name *</label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="businessCategory">Business Category *</label>
                <select
                  id="businessCategory"
                  name="businessCategory"
                  value={formData.businessCategory}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="retail">Retail</option>
                  <option value="services">Services</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="technology">Technology</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessDescription">Business Description</label>
                <textarea
                  id="businessDescription"
                  name="businessDescription"
                  value={formData.businessDescription}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessPhone">Business Phone</label>
                <input
                  type="tel"
                  id="businessPhone"
                  name="businessPhone"
                  value={formData.businessPhone}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="businessEmail">Business Email</label>
                <input
                  type="email"
                  id="businessEmail"
                  name="businessEmail"
                  value={formData.businessEmail}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="website">Website</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="businessLicense">Business License</label>
                <input
                  type="text"
                  id="businessLicense"
                  name="businessLicense"
                  value={formData.businessLicense}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Business Address</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessAddress.street">Street</label>
                <input
                  type="text"
                  id="businessAddress.street"
                  name="businessAddress.street"
                  value={formData.businessAddress.street}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="businessAddress.city">City</label>
                <input
                  type="text"
                  id="businessAddress.city"
                  name="businessAddress.city"
                  value={formData.businessAddress.city}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessAddress.state">State</label>
                <input
                  type="text"
                  id="businessAddress.state"
                  name="businessAddress.state"
                  value={formData.businessAddress.state}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="businessAddress.zipCode">Zip Code</label>
                <input
                  type="text"
                  id="businessAddress.zipCode"
                  name="businessAddress.zipCode"
                  value={formData.businessAddress.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button primary">
              Add Partner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bulk Action Modal Component
const BulkActionModal = ({ partners, onClose, onSubmit }) => {
  const [action, setAction] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (partners.length === 0) {
      return;
    }
    onSubmit(action, partners.map(p => p.id || p._id));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Bulk Actions</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Select Action</label>
            <select 
              value={action} 
              onChange={(e) => setAction(e.target.value)}
              required
            >
              <option value="">Choose Action</option>
              <option value="approve">Approve Selected</option>
              <option value="suspend">Suspend Selected</option>
              <option value="reject">Reject Selected</option>
            </select>
          </div>

          <div className="user-selection">
            <div className="selection-header">
              <h4>Selected Partners ({partners.length})</h4>
            </div>
            <div className="user-list">
              {partners.map(partner => (
                <div key={partner.id || partner._id} className="user-item">
                  <div className="user-info">
                    <strong>{partner.businessName}</strong>
                    <span>{partner.ownerName} - {partner.ownerEmail}</span>
                    <span className={`status ${partner.status}`}>{partner.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="button primary"
              disabled={partners.length === 0 || !action}
            >
              {action === 'approve' ? 'Approve' : 
               action === 'suspend' ? 'Suspend' : 
               action === 'reject' ? 'Reject' : 'Execute'} ({partners.length})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartnerList;
