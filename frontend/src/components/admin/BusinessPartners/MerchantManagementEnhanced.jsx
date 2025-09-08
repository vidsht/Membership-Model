import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import { useDynamicFields } from '../../../hooks/useDynamicFields';
import useImageUrl from '../../../hooks/useImageUrl';
import QuickChangePassword from './QuickChangePassword';
import MerchantFilters from './components/MerchantFilters';
import './MerchantManagementEnhanced.css';

const MerchantManagementEnhanced = () => {
  const { showNotification } = useNotification();
  const { getMerchantLogoUrl } = useImageUrl();
  const navigate = useNavigate();
  const { getCommunityOptions, getBusinessCategoryOptions, getStateOptions } = useDynamicFields();
  const [merchants, setMerchants] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // Only table view
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Stats state - fetched from backend for full statistics
  const [stats, setStats] = useState({
    totalMerchants: 0,
    pendingApprovals: 0,
    activeMerchants: 0,
    suspendedMerchants: 0,
    rejectedMerchants: 0
  });
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showAddMerchant, setShowAddMerchant] = useState(false);
  const [showMerchantDetails, setShowMerchantDetails] = useState(false);
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [quickEditMerchant, setQuickEditMerchant] = useState(null);
  const [quickChangePasswordState, setQuickChangePasswordState] = useState({
    isOpen: false,
    user: null
  });
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
      state: '',
      customDealLimit: ''
    }
  });
  const [selectedMerchants, setSelectedMerchants] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    community: 'all',
    state: 'all',
    membershipType: 'all',
    dateFrom: '',
    dateTo: '',
    planStatus: 'all',
    dealLimit: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Removed confirmDialog state (delete functionality)

  // Fetch stats only once on mount
  useEffect(() => {
    fetchMerchantStats();
  }, []);

  // Fetch merchants when filters, page, or limit change
  useEffect(() => {
    fetchMerchants();
  }, [filters, pagination.page, pagination.limit]);

  const fetchMerchantStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/partners/statistics');
      if (response.data.success) {
        setStats(response.data.statistics || {
          totalMerchants: 0,
          pendingApprovals: 0,
          activeMerchants: 0,
          suspendedMerchants: 0,
          rejectedMerchants: 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch merchant statistics:', err);
      // Keep existing stats on error
    }
  }, []);

  const fetchMerchants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && (typeof value !== 'string' || value.trim() !== '')) {
          params.set(key, value);
        }
      });
      const response = await api.get(`/admin/partners?${params}`);
      if (response.data.success) {
        setMerchants(response.data.merchants || []);
        const pag = response.data.pagination || {};
        const total = pag.total || response.data.total || 0;
        const limit = pag.limit || response.data.limit || pagination.limit || 10;
        let totalPages = pag.totalPages || response.data.totalPages;
        if (!totalPages) {
          totalPages = Math.ceil(total / limit) || 1;
        }
        setPagination(prev => ({
          ...prev,
          total,
          totalPages: totalPages < 1 ? 1 : totalPages
        }));
      } else {
        throw new Error(response.data.message || 'Failed to fetch merchants');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load merchants');
      showNotification('Error loading merchants', 'error');
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, showNotification]);


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

  // Returns { label, className, daysLeft } for validity
  const calculateValidityInfo = (merchant) => {
    // First priority: use validationDate if available (custom expiry from plan management)
    if (merchant.validationDate) {
      try {
        const validationDate = new Date(merchant.validationDate);
        const now = new Date();
        if (isNaN(validationDate.getTime())) {
          return { label: 'Invalid date', className: 'validity-error', daysLeft: null };
        }
        
        const diffTime = validationDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let className = 'validity-active';
        
        if (daysLeft < 0) {
          className = 'validity-expired';
          return { label: 'Expired', className, daysLeft: 0 };
        } else if (daysLeft <= 7) {
          className = 'validity-expiring-soon';
        } else if (daysLeft <= 14) {
          className = 'validity-expiring';
        }
        
        return {
          label: validationDate.toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }),
          className,
          daysLeft
        };
      } catch (error) {
        return { label: 'Invalid date', className: 'validity-error', daysLeft: null };
      }
    }
    
    // Fallback: calculate based on planAssignedAt and billing cycle
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

  // Format valid-till display to match UserManagement logic
  const formatValidTill = (merchant) => {
    const validity = calculateValidityInfo(merchant);
    const label = validity?.label;

    if (!label || label === 'No validity set' || label === 'N/A') {
      return <span className="validity-none">No validity set</span>;
    }

    if (label === 'Expired') {
      return <span className="validity-expired">Expired</span>;
    }

    if (label === 'Lifetime') {
      return <span className="validity-lifetime">Lifetime</span>;
    }

    if (label === 'Invalid date') {
      return <span className="validity-error">Invalid date</span>;
    }

    // Otherwise show formatted date similar to users
    return (
      <span className={`validity-active`}>
        {label}
        {typeof validity.daysLeft === 'number' && validity.className !== 'validity-expired' && (
          <span className="days-remaining">{validity.daysLeft}d</span>
        )}
      </span>
    );
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

  // Inline edit for custom deal limits - navigate to route
  const handleInlineEdit = async (merchant) => {
    try {
      // Navigate to quick edit route - this will render QuickEditDealLimit component
      navigate(`/admin/partners/${merchant.id}/quick-edit`);
    } catch (error) {
      console.error('Error navigating to quick edit:', error);
      showNotification('Failed to load quick edit. Please try again.', 'error');
    }
  };

  const handleInlineEditModal = async (merchant) => {
    try {
      // Open quick edit modal instead of navigation (alternative option)
      setQuickEditMerchant(merchant);
      setShowQuickEditModal(true);
    } catch (error) {
      console.error('Error opening quick edit modal:', error);
      showNotification('Failed to open quick edit. Please try again.', 'error');
    }
  };

  // Route-based edit (like user management) - navigate to detail-edit route
  const handleEditMerchant = useCallback((merchant) => {
    if (!merchant || !merchant.id) {
      showNotification('Invalid merchant data', 'error');
      return;
    }
    // Navigate to detail-edit route - this will render MerchantDetailEdit component
    navigate(`/admin/partners/${merchant.id}/detail-edit`);
  }, [navigate, showNotification]);

  const handleEditMerchantModal = useCallback((merchant) => {
    if (!merchant || !merchant.id) {
      showNotification('Invalid merchant data', 'error');
      return;
    }
    // Open edit modal instead of navigation (alternative option)
    setEditingMerchant(merchant);
    setShowEditModal(true);
  }, [showNotification]);

  const handleQuickChangePassword = useCallback((merchant) => {
    setQuickChangePasswordState({
      isOpen: true,
      user: merchant
    });
  }, []);

  const closeQuickChangePassword = useCallback(() => {
    setQuickChangePasswordState({
      isOpen: false,
      user: null
    });
  }, []);

  const handlePasswordChangeUpdate = useCallback(() => {
    // Close the modal after successful password change
    closeQuickChangePassword();
    // Optionally refresh merchants data if needed
    // fetchMerchants();
  }, []);

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
    // Navigate to details route - this will render PartnerDetail component
    navigate(`/admin/partners/${merchant.id}/details`);
  }, [navigate]);

  const handleViewDetailsModal = useCallback((merchant) => {
    // Open modal instead of navigation (alternative option)
    setSelectedMerchant(merchant);
    setShowMerchantDetails(true);
  }, []);

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
        businessAddress: '', businessPhone: '', businessEmail: '', website: '', country: '', state: ''
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

    // Accept websites that start with http(s):// or with www. (we store as www.example.com by default)
    if (formData.businessInfo.website && !/^(https?:\/\/.+|www\..+)/.test(formData.businessInfo.website)) {
      newErrors.website = 'Website must be a valid URL (start with www. or http(s)://)';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Normalize website input: strip http(s):// and ensure www. prefix when non-empty
  const sanitizeWebsite = (value) => {
    if (!value) return '';
    let v = String(value).trim();
    if (v.startsWith('https://')) v = v.slice(8);
    if (v.startsWith('http://')) v = v.slice(7);
    if (v && !v.startsWith('www.')) v = 'www.' + v;
    return v;
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
        // Show temp password notification if present (like user creation)
        if (!isEditMode && response.data.tempPassword) {
          showNotification(
            `Temporary password: ${response.data.tempPassword}. Please share this securely.`,
            'info',
            10000
          );
        }
        setShowAddMerchant(false);
        setEditingMerchant(null);
        setFormData({
          userInfo: {
            fullName: '', email: '', phone: '', address: '', community: '', status: 'pending',
          },
          businessInfo: {
            businessName: '', businessDescription: '', businessCategory: '',
            businessAddress: '', businessPhone: '', businessEmail: '', website: '', country: '', state: ''
          }
        });
        setFormErrors({});
        fetchMerchants(); // Refresh the list
        fetchMerchantStats(); // Refresh stats
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
      // Validate session first (if available)
      const sessionValid = true; // Add session validation if available
      if (!sessionValid) {
        showNotification('Your session has expired. Please log in again.', 'error');
        return;
      }

      // Use dedicated endpoints for approve/reject, but try both users and partners
      if (newStatus === 'approved') {
        const [partnersRes, usersRes] = await Promise.allSettled([
          api.post(`/admin/partners/${merchantId}/approve`),
          api.put(`/admin/users/${merchantId}/status`, { status: 'approved' })
        ]);
        
        const partnersSuccess = partnersRes.status === 'fulfilled' && partnersRes.value?.data?.success;
        const usersSuccess = usersRes.status === 'fulfilled' && usersRes.value?.data?.success;
        
        if (!partnersSuccess && !usersSuccess) {
          throw new Error('Failed to approve partner');
        }
      } else if (newStatus === 'rejected') {
        const [partnersRes, usersRes] = await Promise.allSettled([
          api.post(`/admin/partners/${merchantId}/reject`),
          api.put(`/admin/users/${merchantId}/status`, { status: 'rejected' })
        ]);
        
        const partnersSuccess = partnersRes.status === 'fulfilled' && partnersRes.value?.data?.success;
        const usersSuccess = usersRes.status === 'fulfilled' && usersRes.value?.data?.success;
        
        if (!partnersSuccess && !usersSuccess) {
          throw new Error('Failed to reject partner');
        }
      } else {
        // For other status changes (suspended, pending), try both endpoints
        const [partnersRes, usersRes] = await Promise.allSettled([
          api.put(`/admin/partners/${merchantId}/status`, { status: newStatus }),
          api.put(`/admin/users/${merchantId}/status`, { status: newStatus })
        ]);
        
        const partnersSuccess = partnersRes.status === 'fulfilled' && partnersRes.value?.data?.success;
        const usersSuccess = usersRes.status === 'fulfilled' && usersRes.value?.data?.success;
        
        if (!partnersSuccess && !usersSuccess) {
          throw new Error(`Failed to update partner status to ${newStatus}`);
        }
      }
      
      showNotification(`Partner ${newStatus} successfully`, 'success');
      fetchMerchants();
      fetchMerchantStats(); // Refresh stats after status change
    } catch (err) {
      console.error('Error updating merchant status:', err);
      const message = err.response?.data?.message || err.message || 'Error updating merchant status';
      showNotification(message, 'error');
    }
  };

  // Dedicated approve handler
  const handleApproveMerchant = async (merchantId) => {
    try {
      await api.post(`/admin/partners/${merchantId}/approve`);
      showNotification('Partner approved successfully', 'success');
      fetchMerchants();
      fetchMerchantStats(); // Refresh stats after approval
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
      fetchMerchantStats(); // Refresh stats after rejection
    } catch (err) {
      console.error('Error rejecting merchant:', err);
      showNotification('Error rejecting partner', 'error');
    }
  };

  // Removed handleDeleteMerchant (delete functionality)


  // Removed confirmAction (delete functionality)

  // Bulk action handler for approve, reject, suspend operations
  const handleBulkAction = async (action) => {
    if (selectedMerchants.length === 0) {
      showNotification('No merchants selected', 'warning');
      return;
    }

    try {
      const promises = selectedMerchants.map(merchantId => {
        switch (action) {
          case 'approve':
            return api.post(`/admin/partners/${merchantId}/approve`);
          case 'reject':
            return api.post(`/admin/partners/${merchantId}/reject`);
          case 'suspend':
            return api.put(`/admin/partners/${merchantId}/status`, { status: 'suspended' });
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      
      showNotification(`Successfully ${action}d ${selectedMerchants.length} merchant(s)`, 'success');
      
      // Reset selections and refresh data
      setSelectedMerchants([]);
      setShowBulkActions(false);
      
      // Refresh the merchants list and stats
      fetchMerchants();
      fetchMerchantStats();
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      showNotification(`Failed to ${action} merchants`, 'error');
    }
  };

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: 'all',
      category: 'all',
      community: 'all',
      state: 'all',
      membershipType: 'all',
      dateFrom: '',
      dateTo: '',
      planStatus: 'all',
      dealLimit: 'all'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // CSV Export functionality
  const handleExportMerchants = useCallback(async () => {
    try {
      showNotification('Preparing merchant export...', 'info');

      // Only send supported filters to backend
      const allowedFilters = [
        'status', 'category', 'membershipType', 'planStatus', 'dealLimit', 'search', 'dateFrom', 'dateTo'
      ];
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (
          allowedFilters.includes(key) &&
          value && value !== 'all' && (typeof value !== 'string' || value.trim() !== '')
        ) {
          queryParams.set(key, value);
        }
      });

      const url = `/admin/partners/export?${queryParams}`;

      const response = await api.get(url, {
        responseType: 'blob'
      });

      // If backend returned JSON (error) as a blob, parse and surface message
      if (response.data && response.data.type && response.data.type.includes('application/json')) {
        try {
          const text = await response.data.text();
          const json = JSON.parse(text);
          const msg = json?.message || json?.error || 'Failed to export merchants';
          showNotification(msg, 'error');
          // Log full error for debugging
          console.error('Export error (json blob):', json);
          return;
        } catch (e) {
          console.error('Failed to parse JSON error blob from export response', e);
          showNotification('Failed to export merchants', 'error');
          return;
        }
      }

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `merchants-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      showNotification('Merchants exported successfully', 'success');
    } catch (err) {
      // Enhanced error logging for debugging
      console.error('Export error (catch):', err, err?.response);
      try {
        const errData = err.response?.data;
        if (errData && typeof errData.text === 'function') {
          const text = await errData.text();
          try {
            const json = JSON.parse(text);
            const message = json?.message || json?.error || 'Failed to export merchants';
            showNotification(message, 'error');
            // Log full error for debugging
            console.error('Export error (json blob in catch):', json);
            return;
          } catch (parseErr) {
            showNotification('Failed to export merchants', 'error');
            console.error('Export error (parseErr):', parseErr, text);
            return;
          }
        }
      } catch (e) {
        console.error('Export error (parsing catch):', e);
      }

      const message = err.response?.data?.message || 'Failed to export merchants';
      showNotification(message, 'error');
      // Log any other error details
      if (err.response) {
        console.error('Export error (response):', err.response);
      }
    }
  }, [showNotification, filters]);

  // Single useEffect for component mounting (reduced logging)
  useEffect(() => {
  }, []);

  if (loading) {
    return (
      <div className="merchant-management-loading">
        <div className="loading-spinner"></div>
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
          <button className="btn btn-primary" onClick={handleAddMerchant}>
            <i className="fas fa-plus"></i> Add Partner
          </button>
          <button className="btn btn-secondary" onClick={handleExportMerchants}>
            <i className="fas fa-download"></i> Export CSV
          </button>
          {selectedMerchants.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowBulkActions(!showBulkActions)}>
              <i className="fas fa-tasks"></i> Bulk Actions ({selectedMerchants.length})
            </button>
          )}
        </div>
      </div>

      {/* Merchant Statistics Bar - Matching User Management Style */}
      <div className="merchant-stats-bar">
        <div className="merchant-stat">
          <div className="stat-label">Total Merchants</div>
          <div className="stat-value">{stats.totalMerchants}</div>
        </div>
        <div className="merchant-stat">
          <div className="stat-label">Pending Approvals</div>
          <div className="stat-value">{stats.pendingApprovals}</div>
        </div>
        <div className="merchant-stat">
          <div className="stat-label">Active Merchants</div>
          <div className="stat-value">{stats.activeMerchants}</div>
        </div>
        <div className="merchant-stat">
          <div className="stat-label">Suspended</div>
          <div className="stat-value">{stats.suspendedMerchants}</div>
        </div>
        <div className="merchant-stat">
          <div className="stat-label">Rejected</div>
          <div className="stat-value">{stats.rejectedMerchants}</div>
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
                <select value={formData.userInfo.community} onChange={e => setFormData(f => ({ ...f, userInfo: { ...f.userInfo, community: e.target.value } }))}>
                  <option value="">Select Community</option>
                  {getCommunityOptions().map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
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
                <select value={formData.businessInfo.businessCategory} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, businessCategory: e.target.value } }))}>
                  <option value="">Select Category</option>
                  {getBusinessCategoryOptions().map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Business Address</label>
                <input type="text" value={formData.businessInfo.businessAddress} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, businessAddress: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label>State</label>
                <select value={formData.businessInfo.state} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, state: e.target.value } }))}>
                  <option value="">Select State</option>
                  {getStateOptions().map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
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
-                <input type="text" value={formData.businessInfo.website} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, website: e.target.value } }))} className={formErrors.website ? 'error' : ''} />
+                <input type="text" value={formData.businessInfo.website} onChange={e => setFormData(f => ({ ...f, businessInfo: { ...f.businessInfo, website: sanitizeWebsite(e.target.value) } }))} className={formErrors.website ? 'error' : ''} />
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
          {/* New Merchant Filters Component */}
          <MerchantFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            onExport={handleExportMerchants}
            loading={loading}
            referenceData={{
              plans: [] // TODO: pass actual merchant plans if available, else fallback to []
            }}
          />

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
          </div>
        </div>
      )}

      {/* Merchants Table */}
      <div className="merchants-table-container">
        <table className="merchants-table compact-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={selectedMerchants.length === merchants.length && merchants.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="serial-column">S.No</th>
              <th className="business-column">Business & Owner</th>
              <th className="contact-column">Contact</th>
              <th className="category-column">Category</th>
              <th className="plan-column">Plan & Status</th>
              <th className="limit-column">Deal Limit</th>
              <th className="validity-column">Valid Till</th>
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((merchant, index) => (
              <tr key={merchant.id}>
                <td className="checkbox-cell" data-label="Select">
                  <input
                    type="checkbox"
                    checked={selectedMerchants.includes(merchant.id)}
                    onChange={() => handleMerchantSelect(merchant.id)}
                  />
                </td>
                <td className="serial-number" data-label="S.No">
                  {((pagination?.page || 1) - 1) * (pagination?.limit || 10) + index + 1}
                </td>
                <td className="business-cell" data-label="Business & Owner">
                  <div className="business-info-compact">
                    <div className="business-name">{merchant.businessName || 'N/A'}</div>
                    <div className="business-desc">{merchant.businessDescription || ''}</div>
                    <div className="owner-name">{merchant.fullName}</div>
                    <div className="joined-date">{formatDate(merchant.createdAt)}</div>
                  </div>
                </td>
                <td className="contact-cell" data-label="Contact">
                  <div className="contact-info-stacked">
                    <div className="email">{merchant.email}</div>
                    <div className="phone">{merchant.phone || 'N/A'}</div>
                  </div>
                </td>
                <td className="category-cell" data-label="Category">
                  <span className={`category-badge ${merchant.businessCategory}`}>
                    {merchant.businessCategory || 'N/A'}
                  </span>
                </td>
                <td className="plan-cell" data-label="Plan & Status">
                  <div className="plan-status-info">
                    <span className={`plan-badge ${merchant.membershipType || 'community'}`}>
                      {merchant.planName || merchant.membershipType ? 
                        (merchant.planName || merchant.membershipType.charAt(0).toUpperCase() + merchant.membershipType.slice(1)) :
                        'Community'
                      }
                    </span>
                    <span className={`status-badge ${merchant.status}`}>
                      {merchant.status}
                    </span>
                  </div>
                </td>
                <td className="limit-cell" data-label="Deal Limit">
                  <div className="deal-limit-info-compact">
                    {merchant.customDealLimit ? (
                      <span className="custom-limit" title="Custom limit set by admin">
                        <i className="fas fa-star"></i> {merchant.customDealLimit}/m
                      </span>
                    ) : (
                      <span className="plan-limit" title="Using plan default">
                        {merchant.planMaxDeals ? `${merchant.planMaxDeals}/m` : 'Unlimited'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="validity-cell" data-label="Valid Till">
                  {(() => {
                    const validity = calculateValidityInfo(merchant);
                    return (
                      <span className={`validity-date-compact ${validity.className}`}>
                        {validity.label}
                        {typeof validity.daysLeft === 'number' && validity.className !== 'validity-expired' && validity.className !== 'validity-none' && (
                          <span className="days-remaining">{validity.daysLeft}d</span>
                        )}
                        {validity.className === 'validity-expired' && (
                          <span className="days-remaining">Expired</span>
                        )}
                      </span>
                    );
                  })()}
                </td>                <td className="actions-cell" data-label="Actions">
                  <div className="action-buttons-compact">
                    <button
                      className="btn-compact btn-info"
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
                      className="btn-compact btn-primary"
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
                      className="btn-compact btn-warning"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickChangePassword(merchant);
                      }}
                      title="Change Password"
                      type="button"
                    >
                      <i className="fas fa-key"></i>
                    </button>
                    <button
                      className="btn-compact btn-warning"
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
                          className="btn-compact btn-success"
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
                          className="btn-compact btn-danger"
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
                        className="btn-compact btn-suspend"
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
                        className="btn-compact btn-activate"
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
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </button>
            <span className="page-info">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              className="btn btn-sm btn-secondary"
              disabled={pagination.page === (pagination.totalPages || 1)}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </button>
            <select
              className="pagination-size-select"
              value={pagination.limit}
              onChange={e => handlePageSizeChange(Number(e.target.value))}
              style={{ marginLeft: '1rem' }}
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
          </div>
        </div>
      )}
        </>
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
                  <span className={`status-badge ${selectedMerchant.status}`}>
                    {selectedMerchant.status}
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

      {/* Quick Edit Deal Limit Modal */}
      {showQuickEditModal && quickEditMerchant && (
        <div className="modal-overlay" onClick={() => setShowQuickEditModal(false)}>
          <div className="modal-content quick-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quick Edit Deal Limit</h3>
              <button className="close-btn" onClick={() => setShowQuickEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="quick-edit-info">
                <h4>{quickEditMerchant.businessName || quickEditMerchant.fullName}</h4>
                <p>Current Plan: {quickEditMerchant.planName || quickEditMerchant.membershipType || 'N/A'}</p>
                <p>Plan Deal Limit: {quickEditMerchant.planMaxDeals || 'N/A'}</p>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const formData = new FormData(e.target);
                  const customDealLimit = formData.get('customDealLimit');
                  
                  const response = await api.put(`/admin/partners/${quickEditMerchant.id}`, {
                    customDealLimit: customDealLimit ? parseInt(customDealLimit) : null
                  });
                  
                  if (response.data.success) {
                    showNotification('Deal limit updated successfully', 'success');
                    setShowQuickEditModal(false);
                    setQuickEditMerchant(null);
                    // Refresh the merchants list
                    fetchMerchants();
                  } else {
                    throw new Error(response.data.message || 'Failed to update deal limit');
                  }
                } catch (error) {
                  console.error('Error updating deal limit:', error);
                  showNotification('Failed to update deal limit', 'error');
                }
              }}>
                <div className="form-group">
                  <label htmlFor="customDealLimit">Custom Deal Limit:</label>
                  <input
                    type="number"
                    id="customDealLimit"
                    name="customDealLimit"
                    min="0"
                    max="100"
                    defaultValue={quickEditMerchant.customDealLimit || ''}
                    className="form-control"
                    placeholder="Leave empty to use plan default"
                  />
                  <small className="form-text text-muted">
                    Override the default monthly deal limit for this business. Leave empty to use their plan's default limit.
                  </small>
                </div>
                
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">
                    Update Deal Limit
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowQuickEditModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Quick Change Password Modal */}
      <QuickChangePassword
        user={quickChangePasswordState.user}
        isOpen={quickChangePasswordState.isOpen}
        onClose={closeQuickChangePassword}
        onUpdate={handlePasswordChangeUpdate}
      />

    </div>
  );
};

export default MerchantManagementEnhanced;