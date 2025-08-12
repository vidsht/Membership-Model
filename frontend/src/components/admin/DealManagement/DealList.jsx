import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import DealFilters from './DealFilters';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './DealList.css';

const DealList = ({ onTabChange }) => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const { modalState, closeModal, showDeleteConfirm } = useModal();
  
  // Check if we're in the admin dashboard context
  const isInDashboard = location.pathname === '/admin';
  
  const [deals, setDeals] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState({ 
    activeDeals: 0, 
    totalDeals: 0, 
    totalRedemptions: 0,
    expiredDeals: 0,
    pendingDeals: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    businessId: 'all',
    discountType: 'all',
    search: '',
    validFrom: '',
    validTo: '',
    minDiscount: '',
    maxDiscount: '',
    hasRedemptions: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [dealsResponse, businessesResponse] = await Promise.all([
        api.get('/admin/deals'),
        api.get('/admin/partners')
      ]);
      
      setDeals(dealsResponse.data.deals  || []);
      setBusinesses(businessesResponse.data.merchants?.map(m => ({
        businessId: m.businessId,
        businessName: m.businessName
      })) || []);
      
      // Calculate stats from deals
      calculateStats(dealsResponse.data.deals || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showNotification('Error loading data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      const params = {};
      
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.businessId !== 'all') params.businessId = filters.businessId;
      if (filters.search) params.search = filters.search;
      if (filters.validFrom) params.validFrom = filters.validFrom;
      if (filters.validTo) params.validTo = filters.validTo;
      if (filters.discountType !== 'all') params.discountType = filters.discountType;
      if (filters.minDiscount) params.minDiscount = filters.minDiscount;
      if (filters.maxDiscount) params.maxDiscount = filters.maxDiscount;
      if (filters.hasRedemptions !== 'all') params.hasRedemptions = filters.hasRedemptions;
      
      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder;
      
      const response = await api.get('/admin/deals', { params });
      const dealsData = response.data.deals || [];
      setDeals(dealsData);
      calculateStats(dealsData);
    } catch (error) {
      console.error('Error fetching deals:', error);
      showNotification('Error loading deals. Please try again.', 'error');
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (dealsData) => {
    const now = new Date();
    const stats = {
      totalDeals: dealsData.length,
      activeDeals: dealsData.filter(deal => deal.status === 'active' && new Date(deal.validUntil) > now).length,
      expiredDeals: dealsData.filter(deal => new Date(deal.validUntil) <= now).length,
      pendingDeals: dealsData.filter(deal => deal.status === 'pending').length,
      totalRedemptions: dealsData.reduce((sum, deal) => sum + (deal.redemptionCount || 0), 0)
    };
    setStats(stats);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSearch = () => {
    fetchDeals();  };
  
  const handleStatusChange = async (dealId, newStatus) => {
    try {      
      await api.patch(`/admin/deals/${dealId}/status`, { status: newStatus });
      // Update local state
      setDeals((deals || []).map(deal => 
        deal.id === dealId ? { ...deal, status: newStatus } : deal
      ));
      
      showNotification(`Deal ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
      // Recalculate stats
      calculateStats(deals.map(deal => 
        deal.id === dealId ? { ...deal, status: newStatus } : deal
      ));
    } catch (error) {
      console.error('Error updating deal status:', error);
      showNotification('Failed to update deal status', 'error');
    }
  };

  const handleApproveDeal = async (dealId) => {
    try {
      await api.patch(`/admin/deals/${dealId}/approve`);
      
      // Update the deal in the local state
      setDeals((deals || []).map(deal => 
        deal.id === dealId ? { ...deal, status: 'active' } : deal
      ));
      
      showNotification('Deal approved successfully', 'success');
      // Recalculate stats
      calculateStats(deals.map(deal => 
        deal.id === dealId ? { ...deal, status: 'active' } : deal
      ));
    } catch (error) {
      console.error('Error approving deal:', error);
      showNotification('Error approving deal. Please try again.', 'error');
    }
  };

  const handleRejectDeal = async (dealId, reason = '') => {
    try {
      await api.patch(`/admin/deals/${dealId}/reject`, { reason });
      
      // Update the deal in the local state
      setDeals((deals || []).map(deal => 
        deal.id === dealId ? { ...deal, status: 'rejected' } : deal
      ));
      
      showNotification('Deal rejected successfully', 'success');
      // Recalculate stats
      calculateStats(deals.map(deal => 
        deal.id === dealId ? { ...deal, status: 'rejected' } : deal
      ));
    } catch (error) {
      console.error('Error rejecting deal:', error);
      showNotification('Error rejecting deal. Please try again.', 'error');
    }
  };

  const handleRejectDealWithReason = async (dealId, dealTitle) => {
    // Show a custom modal to collect rejection reason
    const reason = await showReasonModal(
      'Reject Deal', 
      `Please provide a reason for rejecting "${dealTitle}":`,
      'Enter rejection reason...'
    );
    
    if (reason !== null) { // User didn't cancel
      await handleRejectDeal(dealId, reason);
    }
  };

  const showReasonModal = (title, message, placeholder) => {
    return new Promise((resolve) => {
      const modalContainer = document.createElement('div');
      modalContainer.className = 'modal-overlay modal-open';
      modalContainer.innerHTML = `
        <div class="modal-container modal-info">
          <div class="modal-header">
            <div class="modal-icon">
              <i class="fas fa-comment-alt"></i>
            </div>
            <h3 class="modal-title">${title}</h3>
          </div>
          <div class="modal-body">
            <p class="modal-message">${message}</p>
            <textarea 
              id="reason-input" 
              placeholder="${placeholder}"
              style="width: 100%; min-height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical; font-family: inherit;"
            ></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="confirm-btn">Reject Deal</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalContainer);
      document.body.style.overflow = 'hidden';

      const reasonInput = modalContainer.querySelector('#reason-input');
      const cancelBtn = modalContainer.querySelector('#cancel-btn');
      const confirmBtn = modalContainer.querySelector('#confirm-btn');

      reasonInput.focus();

      const cleanup = () => {
        document.body.removeChild(modalContainer);
        document.body.style.overflow = 'unset';
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };

      confirmBtn.onclick = () => {
        const reason = reasonInput.value.trim();
        cleanup();
        resolve(reason);
      };

      modalContainer.onclick = (e) => {
        if (e.target === modalContainer) {
          cleanup();
          resolve(null);
        }
      };

      document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escapeHandler);
          cleanup();
          resolve(null);
        }
      });
    });
  };
  const handleDeleteDeal = async (dealId, dealTitle) => {
    try {
      const confirmed = await showDeleteConfirm(dealTitle);
      
      if (confirmed) {
        await api.delete(`/admin/deals/${dealId}`);
        const updatedDeals = deals.filter(deal => deal.id !== dealId);
        setDeals(updatedDeals);
        calculateStats(updatedDeals);
        showNotification('Deal deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
      showNotification('Failed to delete deal', 'error');
    }
  };
  return (
    <div className="admin-deal-management">
      {!isInDashboard && (
        <div className="page-header">
          <h1>Deal Management</h1>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/admin/deals/create')}
          >
            <i className="fas fa-plus"></i> Create New Deal
          </button>
        </div>
      )}

      {isInDashboard && (
        <div className="page-header">
          <div className="header-actions">
            <button 
              className="btn-primary" 
              onClick={() => navigate('/admin/deals/create')}
            >
              <i className="fas fa-plus"></i> Create New Deal
            </button>
          </div>
        </div>
      )}

      {/* Deal statistics */}
      <div className="deal-stats-bar">
        <div className="deal-stat">
          <span className="stat-label">Active Deals</span>
          <span className="stat-value">{stats.activeDeals}</span>
        </div>
        <div className="deal-stat">
          <span className="stat-label">Total Deals</span>
          <span className="stat-value">{stats.totalDeals}</span>
        </div>
        <div className="deal-stat">
          <span className="stat-label">Total Redemptions</span>
          <span className="stat-value">{stats.totalRedemptions}</span>
        </div>
        <div className="deal-stat">
          <span className="stat-label">Expired Deals</span>
          <span className="stat-value">{stats.expiredDeals}</span>
        </div>
        <div className="deal-stat">
          <span className="stat-label">Pending Deals</span>
          <span className="stat-value">{stats.pendingDeals}</span>
        </div>
      </div>      {/* Deal Filters */}
      <DealFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        businesses={businesses}
      />
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading deals...</p>
        </div>
      ) : deals.length > 0 ? (
        <div className="deals-table-container">
          <table className="deals-table">            <thead>
              <tr>
                <th>Deal Title</th>
                <th>Business</th>
                <th>Category</th>
                <th>Discount</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Redemptions</th>
                <th>Views</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map(deal => {
                const isExpired = new Date(deal.validUntil) < new Date();
                return (                  <tr key={deal.id}>
                    <td>
                      <Link to={`/admin/deals/${deal.id}`} className="deal-title-link">
                        {deal.title}
                      </Link>
                      <div className="deal-description-preview">
                        {deal.description && deal.description.length > 60 
                          ? `${deal.description.substring(0, 60)}...` 
                          : deal.description || 'No description'}
                      </div>
                    </td>
                    <td>
                      <div className="business-info">
                        <div className="business-name">{deal.businessName || 'N/A'}</div>
                        {deal.businessCategory && (
                          <div className="business-category">{deal.businessCategory}</div>
                        )}
                        {deal.merchantName && (
                          <div className="merchant-name">by {deal.merchantName}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`category-badge ${deal.category}`}>
                        {deal.category}
                      </span>
                    </td>
                    <td>
                      <div className="discount-info">
                        <div className="discount-amount">
                          {deal.discountType === 'percentage' ? `${deal.discount}%` : `GHS ${deal.discount}`}
                        </div>
                        {deal.originalPrice && (
                          <div className="price-info">
                            <span className="original-price">GHS {deal.originalPrice}</span>
                            {deal.discountedPrice && (
                              <span className="discounted-price">GHS {deal.discountedPrice}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {deal.validUntil ? (
                        <div className="validity-period">
                          <span className={isExpired ? 'expired-date' : 'valid-date'}>
                            {new Date(deal.validUntil).toLocaleDateString()}
                          </span>
                          {deal.validFrom && (
                            <div className="valid-from">
                              From: {new Date(deal.validFrom).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        'No expiry'
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${deal.status} ${isExpired ? 'expired' : ''}`}>
                        {isExpired && deal.status === 'active' ? 'Expired' : deal.status}
                      </span>
                    </td>
                    <td>
                      <div className="redemption-stats">
                        <div className="total-redemptions">{deal.redemptionCount || 0}</div>
                        {deal.monthlyRedemptions !== undefined && (
                          <div className="monthly-redemptions">
                            {deal.monthlyRedemptions} this month
                          </div>
                        )}
                        {deal.maxRedemptions && (
                          <div className="max-redemptions">
                            / {deal.maxRedemptions} max
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="views-info">
                        {deal.views || 0} views
                        {deal.views > 0 && deal.redemptionCount > 0 && (
                          <div className="conversion-rate">
                            {Math.round((deal.redemptionCount / deal.views) * 100)}% conversion
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <Link 
                          to={`/admin/deals/${deal.id}`}
                          className="btn-sm btn-primary"
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </Link>
                        
                        {deal.status === 'pending_approval' ? (
                          <>
                            <button
                              className="btn-sm btn-success"
                              onClick={() => handleApproveDeal(deal.id)}
                              title="Approve Deal"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              className="btn-sm btn-danger"
                              onClick={() => handleRejectDealWithReason(deal.id, deal.title)}
                              title="Reject Deal"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        ) : (
                          <>
                            <Link 
                              to={`/admin/deals/${deal.id}/edit`}
                              className="btn-sm btn-secondary"
                              title="Edit Deal"
                            >
                              <i className="fas fa-edit"></i>
                            </Link>
                            {(deal.status === 'active' || deal.status === 'inactive') && (
                              <button
                                className={`btn-sm ${deal.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                                onClick={() => handleStatusChange(deal.id, deal.status === 'active' ? 'inactive' : 'active')}
                                title={deal.status === 'active' ? 'Deactivate' : 'Activate'}
                              >
                                <i className={`fas fa-${deal.status === 'active' ? 'pause' : 'play'}`}></i>
                              </button>
                            )}
                          </>
                        )}
                        
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => handleDeleteDeal(deal.id, deal.title)}
                          title="Delete Deal"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-deals">
          <i className="fas fa-tags"></i>
          <p>No deals found.</p>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/admin/deals/create')}
          >
            Create First Deal
          </button>        </div>
      )}
      
      {/* Modal for delete confirmations only */}
      {modalState.isOpen && modalState.type === 'confirm' && (
        <Modal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
          showCancel={modalState.showCancel}
          onConfirm={modalState.onConfirm || closeModal}
          onCancel={modalState.onCancel || closeModal}
        />
      )}
    </div>
  );
};

export default DealList;
