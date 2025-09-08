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
  const [activePlans, setActivePlans] = useState([]);
  const [stats, setStats] = useState({ 
    activeDeals: 0, 
    totalDeals: 0, 
    totalRedemptions: 0,
    expiredDeals: 0,
    pendingDeals: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
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
    fetchDealStats(); // Fetch full statistics separately
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [filters, pagination.page, pagination.limit]);

  const fetchDealStats = async () => {
    try {
      const response = await api.get('/admin/deals/statistics');
      if (response.data.success) {
        setStats(response.data.statistics || {
          activeDeals: 0,
          totalDeals: 0,
          totalRedemptions: 0,
          expiredDeals: 0,
          pendingDeals: 0
        });
      }
    } catch (error) {
      console.error('Error fetching deal statistics:', error);
      // Keep existing stats on error
    }
  };

  const fetchInitialData = async () => {
    try {
      const [dealsResponse, businessesResponse, plansResponse] = await Promise.all([
        api.get('/admin/deals'),
        api.get('/admin/partners'),
        api.get('/admin/plans/active')
      ]);
      
      setDeals(dealsResponse.data.deals  || []);
      setBusinesses(businessesResponse.data.merchants?.map(m => ({
        businessId: m.businessId,
        businessName: m.businessName
      })) || []);
      setActivePlans(plansResponse.data.plans || []);
      
      // Stats are now fetched separately via fetchDealStats()
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
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
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
      const paginationData = response.data;
      
      setDeals(dealsData);
      setPagination(prev => ({
        ...prev,
        total: paginationData.total || 0,
        totalPages: Math.ceil((paginationData.total || 0) / pagination.limit)
      }));
      // Stats are now fetched separately, don't calculate from paginated data
    } catch (error) {
      console.error('Error fetching deals:', error);
      showNotification('Error loading deals. Please try again.', 'error');
      setDeals([]);
      setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filters change
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (limit) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }));
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on search
    fetchDeals();
  };
  
  const handleStatusChange = async (dealId, newStatus) => {
    try {      
      await api.patch(`/admin/deals/${dealId}/status`, { status: newStatus });
      // Update local state
      setDeals((deals || []).map(deal => 
        deal.id === dealId ? { ...deal, status: newStatus } : deal
      ));
      
      showNotification(`Deal ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
      // Refresh full statistics
      fetchDealStats();
    } catch (error) {
      console.error('Error updating deal status:', error);
      showNotification('Failed to update deal status', 'error');
    }
  };

  const handleApproveDeal = async (dealId, minPlanPriority = null) => {
    try {
      const approvalData = minPlanPriority !== null ? { minPlanPriority } : {};
      await api.patch(`/admin/deals/${dealId}/approve`, approvalData);
      
      // Update the deal in the local state
      setDeals((deals || []).map(deal => 
        deal.id === dealId ? { 
          ...deal, 
          status: 'active',
          ...(minPlanPriority !== null && { minPlanPriority, requiredPlanPriority: minPlanPriority })
        } : deal
      ));
      
      const selectedPlan = activePlans.find(plan => plan.priority === minPlanPriority);
      const message = minPlanPriority !== null 
        ? `Deal approved successfully - accessible to ${selectedPlan?.name || 'Unknown'} plan and higher priority plans` 
        : 'Deal approved successfully';
      showNotification(message, 'success');
      
      // Refresh full statistics
      fetchDealStats();
    } catch (error) {
      console.error('Error approving deal:', error);
      showNotification('Error approving deal. Please try again.', 'error');
    }
  };

  const handleApproveWithAccessLevel = async (dealId, dealTitle, currentMinPriority) => {
    // Show a custom modal to select access level based on plan priority
    const minPlanPriority = await showPlanAccessModal(
      'Approve Deal', 
      `Approve "${dealTitle}" - Select minimum plan required to access this deal:`,
      currentMinPriority
    );
    
    if (minPlanPriority !== null) { // User didn't cancel
      await handleApproveDeal(dealId, minPlanPriority);
    }
  };

  const showPlanAccessModal = (title, message, currentMinPriority) => {
    return new Promise((resolve) => {
      const modalContainer = document.createElement('div');
      modalContainer.className = 'modal-overlay modal-open';
      
      // Generate options from active plans
      const planOptions = activePlans
        .filter(plan => plan.type === 'user') // Only user plans for deal access
        .sort((a, b) => a.priority - b.priority) // Sort by priority (lower = higher tier)
        .map(plan => `
          <option value="${plan.priority}" ${currentMinPriority === plan.priority ? 'selected' : ''}>
            ${plan.name} (Priority ${plan.priority}) - Only ${plan.name} and higher priority plans can access
          </option>
        `).join('');

      modalContainer.innerHTML = `
        <div class="modal-container modal-info">
          <div class="modal-header">
            <div class="modal-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <h3 class="modal-title">${title}</h3>
          </div>
          <div class="modal-body">
            <p class="modal-message">${message}</p>
            <div style="margin: 15px 0;">
              <label for="plan-priority-select" style="display: block; margin-bottom: 5px; font-weight: bold;">Minimum Plan Required:</label>
              <select 
                id="plan-priority-select" 
                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
              >
                <option value="">Select Plan Access Level</option>
                ${planOptions}
              </select>
              <small style="color: #666; margin-top: 5px; display: block;">
                Users with the selected plan or higher priority plans will be able to access this deal.
                Higher priority numbers = higher tier plans (Platinum=3, Gold=2, Silver=1).
              </small>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
            <button class="btn btn-success" id="approve-btn">Approve Deal</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modalContainer);
      document.body.style.overflow = 'hidden';
      
      const cancelBtn = modalContainer.querySelector('#cancel-btn');
      const approveBtn = modalContainer.querySelector('#approve-btn');
      const selectElement = modalContainer.querySelector('#plan-priority-select');
      
      const cleanup = () => {
        document.body.removeChild(modalContainer);
        document.body.style.overflow = 'unset';
      };
      
      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });
      
      approveBtn.addEventListener('click', () => {
        const selectedPriority = selectElement.value;
        cleanup();
        resolve(selectedPriority ? parseInt(selectedPriority) : null);
      });
      
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
          cleanup();
          resolve(null);
        }
      });

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  };

  const handleRejectDeal = async (dealId, rejectionReason = '') => {
    try {
      await api.patch(`/admin/deals/${dealId}/reject`, { rejectionReason });
      
      // Update the deal in the local state
      setDeals((deals || []).map(deal => 
        deal.id === dealId ? { ...deal, status: 'rejected', rejection_reason: rejectionReason } : deal
      ));
      
      showNotification('Deal rejected successfully', 'success');
      // Refresh full statistics  
      fetchDealStats();
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
        fetchDealStats(); // Refresh full statistics
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
                    <td data-label="Deal Title">
                      <Link to={`/admin/deals/${deal.id}`} className="deal-title-link">
                        {deal.title}
                      </Link>
                      <div className="deal-description-preview">
                        {deal.description && deal.description.length > 60 
                          ? `${deal.description.substring(0, 60)}...` 
                          : deal.description || 'No description'}
                      </div>
                    </td>
                    <td data-label="Business">
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
                    <td data-label="Category">
                      <span className={`category-badge ${deal.category}`}>
                        {deal.category}
                      </span>
                    </td>
                    <td data-label="Discount">
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
                    <td data-label="Expires">
                      {deal.validUntil ? (
                        <div className="validity-period">
                          <span className={isExpired ? 'expired-date' : 'valid-date'}>
                            {new Date(deal.validUntil).toLocaleDateString('en-GB', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                          {deal.validFrom && (
                            <div className="valid-from">
                              From: {new Date(deal.validFrom).toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        'No expiry'
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge ${deal.status} ${isExpired ? 'expired' : ''}`}>
                        {isExpired && deal.status === 'active' ? 'Expired' : deal.status}
                      </span>
                    </td>
                    <td data-label="Redemptions">
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
                    <td data-label="Views">
                      <div className="views-info">
                        {deal.views || 0} views
                        {deal.views > 0 && deal.redemptionCount > 0 && (
                          <div className="conversion-rate">
                            {Math.round((deal.redemptionCount / deal.views) * 100)}% conversion
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="actions-cell" data-label="Actions">
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
                              onClick={() => handleApproveWithAccessLevel(deal.id, deal.title, deal.accessLevel)}
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
      
      {/* Pagination */}
      {pagination && (
        (() => {
          const total = (typeof pagination.total === 'number' ? pagination.total : (deals && deals.length) || 0);
          const limit = pagination.limit || 20;
          let totalPages = pagination.totalPages || Math.max(1, Math.ceil(total / limit));
          if (totalPages < 1) totalPages = 1;
          const currentPage = Math.min(Math.max(1, pagination.page || 1), totalPages);
          const startPage = Math.max(1, currentPage - 2);
          const endPage = Math.min(totalPages, currentPage + 2);
  
          const pageButtons = [];
          if (startPage > 1) {
            pageButtons.push(
              <button key={1} onClick={() => handlePageChange(1)} className="pagination-btn btn btn-sm btn-secondary" disabled={total === 0}>1</button>
            );
            if (startPage > 2) pageButtons.push(<span key="dots1" className="pagination-dots">...</span>);
          }
          for (let i = startPage; i <= endPage; i++) {
            pageButtons.push(
              <button
                key={i}
                onClick={() => handlePageChange(i)}
                className={`pagination-btn btn btn-sm ${i === currentPage ? 'btn-primary active' : 'btn-secondary'}`}
                disabled={total === 0}
              >
                {i}
              </button>
            );
          }
          if (endPage < totalPages) {
            if (endPage < totalPages - 1) pageButtons.push(<span key="dots2" className="pagination-dots">...</span>);
            pageButtons.push(
              <button key={totalPages} onClick={() => handlePageChange(totalPages)} className="pagination-btn btn btn-sm btn-secondary" disabled={total === 0}>{totalPages}</button>
            );
          }
  
          return (
            <div className="table-pagination pagination-container">
              <div className="pagination-info">
                {total === 0
                  ? 'No deals to display.'
                  : `Showing ${((currentPage - 1) * limit) + 1} to ${Math.min(currentPage * limit, total)} of ${total} deals`}
              </div>
              <div className="pagination-controls">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1 || total === 0}
                  className="pagination-btn btn btn-sm btn-secondary"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
  
                {pageButtons}
  
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages || total === 0}
                  className="pagination-btn btn btn-sm btn-secondary"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
              <div className="page-size-selector">
                <select
                  value={limit}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  disabled={total === 0}
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>
          );
        })()
      )}
      
      {/* Modal for delete confirmations only */}
      {modalState.isOpen && (modalState.type === 'confirm' || modalState.type === 'warning') && (
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
