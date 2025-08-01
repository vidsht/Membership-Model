import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './DealList.css';

const DealList = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState({ activeDeals: 0, totalDeals: 0, totalRedemptions: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  useEffect(() => {
    fetchDeals();
  }, [filterStatus, sortBy, sortOrder]);
  
  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/admin/deals`, {
        params: { 
          status: filterStatus !== 'all' ? filterStatus : undefined,
          sortBy,
          sortOrder
        }
      });
      setDeals(response.data.deals || []);
      setStats(response.data.stats || { activeDeals: 0, totalDeals: 0, totalRedemptions: 0 });
    } catch (error) {
      console.error('Error fetching deals:', error);
      showNotification('Error loading deals. Please try again.', 'error');
      setDeals([]); // Ensure deals is always an array
      setStats({ activeDeals: 0, totalDeals: 0, totalRedemptions: 0 });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (dealId, newStatus) => {
    try {      await api.patch(`/admin/deals/${dealId}/status`, { status: newStatus });
        // Update local state
      setDeals((deals || []).map(deal => 
        deal.id === dealId ? { ...deal, status: newStatus } : deal
      ));
      
      showNotification(`Deal ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (error) {
      console.error('Error updating deal status:', error);
      showNotification('Failed to update deal status', 'error');
    }
  };
  
  const handleDeleteDeal = async (dealId) => {
    if (window.confirm('Are you sure you want to delete this deal?')) {
      try {
        await api.delete(`/admin/deals/${dealId}`);
        setDeals((deals || []).filter(deal => deal.id !== dealId));
        showNotification('Deal deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting deal:', error);
        showNotification('Failed to delete deal', 'error');
      }
    }
  };
    const filteredDeals = (deals || []).filter(deal => {
    const matchesSearch = 
      deal?.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      deal?.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal?.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesSearch;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  return (
    <div className="admin-deal-management">
      <div className="page-header">
        <h1>Deal Management</h1>
        <button 
          className="btn-primary" 
          onClick={() => navigate('/admin/deals/create')}
        >
          <i className="fas fa-plus"></i> Create New Deal
        </button>
      </div>

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
      </div>

      <div className="filter-controls">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Search deals..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Deals</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading deals...</p>
        </div>
      ) : filteredDeals.length > 0 ? (
        <div className="deals-table-container">
          <table className="deals-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('title')}>
                  Deal Title
                  {sortBy === 'title' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th onClick={() => handleSort('businessName')}>
                  Business
                  {sortBy === 'businessName' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th onClick={() => handleSort('category')}>
                  Category
                  {sortBy === 'category' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th onClick={() => handleSort('discount')}>
                  Discount
                  {sortBy === 'discount' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th onClick={() => handleSort('validUntil')}>
                  Expires
                  {sortBy === 'validUntil' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th onClick={() => handleSort('accessLevel')}>
                  Plan Access
                  {sortBy === 'accessLevel' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th onClick={() => handleSort('status')}>
                  Status
                  {sortBy === 'status' && (
                    <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map(deal => (                <tr key={deal.id} className={`deal-row ${deal.status}`}>
                  <td>
                    <Link to={`/admin/deals/${deal.id}`}>
                      {deal.title}
                    </Link>
                  </td>
                  <td>{deal.businessName}</td>
                  <td>{deal.category}</td>
                  <td>{deal.discount}</td>
                  <td>
                    {new Date(deal.validUntil).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`access-level ${deal.accessLevel}`}>
                      {deal.accessLevel}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${deal.status}`}>
                      {deal.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-icon" 
                      title="Edit"
                      onClick={() => navigate(`/admin/deals/${deal.id}/edit`)}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    
                    {deal.status === 'active' ? (
                      <button 
                        className="btn-icon" 
                        title="Deactivate"
                        onClick={() => handleStatusChange(deal.id, 'inactive')}
                      >
                        <i className="fas fa-toggle-on active"></i>
                      </button>
                    ) : (
                      <button 
                        className="btn-icon" 
                        title="Activate"
                        onClick={() => handleStatusChange(deal.id, 'active')}
                      >
                        <i className="fas fa-toggle-off inactive"></i>
                      </button>
                    )}
                    
                    <button 
                      className="btn-icon delete" 
                      title="Delete"
                      onClick={() => handleDeleteDeal(deal.id)}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <i className="fas fa-tag fa-3x"></i>
          <h2>No deals found</h2>
          <p>
            {searchTerm || filterStatus !== 'all' 
              ? "Try adjusting your filters or search terms" 
              : "Create your first deal by clicking the button above"}
          </p>
        </div>
      )}
    </div>
  );
};

export default DealList;
