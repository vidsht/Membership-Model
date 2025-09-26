import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './ExpiredSection.css';

const ExpiredSection = () => {
  const { showNotification } = useNotification();
  const [expiredData, setExpiredData] = useState({
    users: [],
    merchants: []
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [userType, setUserType] = useState('users');
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 12,
    totalPages: 1,
    totalItems: 0
  });

  // Email templates for different scenarios
  const getEmailTemplate = (type, days, name) => {
    const templates = {
      users: {
        0: `Subject: Your Membership Has Expired - Immediate Renewal Required

Dear ${name},

We hope this message finds you well. We're writing to inform you that your membership with Indians in Ghana has expired.

Your membership benefits have been suspended, and you'll no longer have access to:
- Exclusive member deals and discounts
- Business directory privileges
- Community events and notifications

To restore your membership and continue enjoying these benefits, please contact us immediately.

Best regards,
Indians in Ghana Team
Contact: cards@indiansinghana.com`,
        
        7: `Subject: Your Membership Expires in 7 Days - Action Required

Dear ${name},

This is an important reminder that your membership with Indians in Ghana will expire in 7 days.

Don't miss out on:
- Exclusive deals and discounts
- Access to our business directory
- Community events and networking opportunities

Please renew your membership before it expires to maintain uninterrupted access.

Best regards,
Indians in Ghana Team
Contact: cards@indiansinghana.com`,
        
        15: `Subject: Your Membership Expires in 15 Days - Renewal Reminder

Dear ${name},

We wanted to remind you that your membership with Indians in Ghana will expire in 15 days.

Take advantage of your remaining time to:
- Browse exclusive member deals
- Connect with community businesses
- Participate in upcoming events

Contact us to renew your membership and continue being part of our vibrant community.

Best regards,
Indians in Ghana Team
Contact: cards@indiansinghana.com`,
        
        30: `Subject: Your Membership Expires in 30 Days - Early Renewal Notice

Dear ${name},

This is a friendly reminder that your membership with Indians in Ghana will expire in 30 days.

We value your membership and want to ensure you continue enjoying:
- Exclusive deals and discounts
- Business directory access
- Community networking opportunities

Consider renewing early to avoid any interruption in your membership benefits.

Best regards,
Indians in Ghana Team
Contact: cards@indiansinghana.com`
      },
      merchants: {
        0: `Subject: Your Business Membership Has Expired - Immediate Action Required

Dear ${name},

We're writing to inform you that your business membership with Indians in Ghana has expired.

Your business listing and promotional privileges have been suspended. This affects:
- Business directory visibility
- Deal posting capabilities
- Featured listing benefits
- Customer reach and engagement

To restore your business profile and continue reaching our community, please contact us immediately.

Best regards,
Indians in Ghana Team
Contact: cards@indiansinghana.com`,
        
        7: `Subject: Your Business Membership Expires in 7 Days - Urgent Renewal Required

Dear ${name},

Your business membership with Indians in Ghana will expire in 7 days.

Don't lose access to:
- Business directory listing
- Deal posting and promotions
- Featured placement opportunities
- Direct customer engagement

Renew now to maintain your business presence in our community.

Best regards,
Indians in Ghana Team
Contact: cards@indiansinghana.com`,
        
        15: `Subject: Your Business Membership Expires in 15 Days - Renewal Notice

Dear ${name},

This is a reminder that your business membership will expire in 15 days.

Ensure continuous:
- Business visibility in our directory
- Promotional deal opportunities
- Customer engagement capabilities
- Community networking benefits

Contact us to renew and keep your business thriving with our community.

Best regards,
Indians in Ghana Team
Contact: cards@indiansinghana.com`,
        
        30: `Subject: Your Business Membership Expires in 30 Days - Early Renewal Available

Dear ${name},

Your business membership with Indians in Ghana will expire in 30 days.

Maintain your competitive edge with:
- Enhanced business directory presence
- Unlimited deal posting capabilities
- Priority customer visibility
- Community networking opportunities

Renew early to ensure uninterrupted business benefits.

Best regards,
Indians in Ghana Team
Contact: cards@indiansinghana.com`
      }
    };
    
    return templates[type][days] || templates[type][0];
  };

  const fetchExpiredData = async () => {
    try {
      setLoading(true);
      const [usersRes, merchantsRes] = await Promise.all([
        api.get('/admin/expired-users'),
        api.get('/admin/expired-merchants')
      ]);

      setExpiredData({
        users: usersRes.data.users || [],
        merchants: merchantsRes.data.merchants || []
      });
    } catch (error) {
      console.error('Error fetching expired data:', error);
      showNotification('Failed to load expired members data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiredData();
  }, []);

  const getFilteredData = () => {
    const data = expiredData[userType];
    if (activeFilter === 'all') return data;
    
    return data.filter(item => {
      const expiryDate = new Date(item.planExpiryDate || item.validationDate);
      const now = new Date();
      const diffTime = expiryDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (activeFilter) {
        case 'expired': return diffDays <= 0;
        case '7days': return diffDays > 0 && diffDays <= 7;
        case '15days': return diffDays > 0 && diffDays <= 15;
        case '30days': return diffDays > 0 && diffDays <= 30;
        default: return true;
      }
    });
  };

  // Get paginated data
  const getPaginatedData = () => {
    const filteredData = getFilteredData();
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredData.slice(startIndex, endIndex);
  };

  // Update pagination when data or filters change
  useEffect(() => {
    const filteredData = getFilteredData();
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pagination.pageSize);
    
    setPagination(prev => ({
      ...prev,
      totalItems,
      totalPages,
      currentPage: Math.min(prev.currentPage, Math.max(1, totalPages))
    }));
  }, [expiredData, userType, activeFilter, pagination.pageSize]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        currentPage: newPage
      }));
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1
    }));
  };

  const handleSendEmail = (member, days) => {
    const emailTemplate = getEmailTemplate(userType, days, member.fullName || member.businessName);
    const recipient = 'cards@indiansinghana.com';
    const subject = emailTemplate.split('\n')[0].replace('Subject: ', '');
    const body = emailTemplate.split('\n').slice(2).join('\n');
    
    // Create mailto link
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open default email client
    window.open(mailtoLink);
    
    showNotification(`Email template opened for ${member.fullName || member.businessName}`, 'success');
  };

  const handleWhatsAppMessage = (member) => {
    const name = member.fullName || member.businessName;
    const expiryDate = new Date(member.planExpiryDate || member.validationDate);
    const now = new Date();
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let message = '';
    
    if (userType === 'users') {
      if (diffDays <= 0) {
        message = `Hello ${name},\n\nYour Indians in Ghana membership has expired ${Math.abs(diffDays)} days ago (${expiryDate.toLocaleDateString('en-GB')}).\n\nPlease renew your membership to continue enjoying exclusive deals, business directory access, and community events.\n\nContact us for renewal: cards@indiansinghana.com\n\nBest regards,\nIndians in Ghana Team`;
      } else {
        message = `Hello ${name},\n\nYour Indians in Ghana membership expires in ${diffDays} days (${expiryDate.toLocaleDateString('en-GB')}).\n\nRenew now to avoid interruption of your membership benefits including exclusive deals, business directory access, and community events.\n\nContact us for renewal: cards@indiansinghana.com\n\nBest regards,\nIndians in Ghana Team`;
      }
    } else {
      if (diffDays <= 0) {
        message = `Hello ${name},\n\nYour Indians in Ghana business membership has expired ${Math.abs(diffDays)} days ago (${expiryDate.toLocaleDateString('en-GB')}).\n\nYour business listing and promotional capabilities have been suspended. Please renew immediately to restore your business presence in our community.\n\nContact us for renewal: cards@indiansinghana.com\n\nBest regards,\nIndians in Ghana Team`;
      } else {
        message = `Hello ${name},\n\nYour Indians in Ghana business membership expires in ${diffDays} days (${expiryDate.toLocaleDateString('en-GB')}).\n\nRenew now to maintain your business listing, deal posting capabilities, and customer engagement opportunities.\n\nContact us for renewal: cards@indiansinghana.com\n\nBest regards,\nIndians in Ghana Team`;
      }
    }
    
    // Format phone number for WhatsApp (remove any non-digits and add country code if needed)
    let phoneNumber = member.phone || '';
    if (phoneNumber) {
      // Remove all non-digit characters
      phoneNumber = phoneNumber.replace(/\D/g, '');
      
      // If phone doesn't start with country code, assume Ghana (+233) and add it
      if (phoneNumber.length === 10 && phoneNumber.startsWith('0')) {
        phoneNumber = '233' + phoneNumber.substring(1);
      } else if (phoneNumber.length === 9) {
        phoneNumber = '233' + phoneNumber;
      } else if (!phoneNumber.startsWith('233') && phoneNumber.length >= 9) {
        phoneNumber = '233' + phoneNumber;
      }
      
      // Open WhatsApp with specific number and pre-filled message
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      showNotification(`WhatsApp message sent to ${name} (${member.phone})`, 'success');
    } else {
      // Fallback to generic WhatsApp if no phone number
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      showNotification(`WhatsApp message prepared for ${name} (no phone number available)`, 'warning');
    }
  };

  const getExpiryStatus = (member) => {
    const expiryDate = new Date(member.planExpiryDate || member.validationDate);
    const now = new Date();
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { status: 'expired', days: Math.abs(diffDays), color: 'danger' };
    } else if (diffDays <= 7) {
      return { status: 'expires-soon', days: diffDays, color: 'warning' };
    } else if (diffDays <= 15) {
      return { status: 'expires-medium', days: diffDays, color: 'info' };
    } else if (diffDays <= 30) {
      return { status: 'expires-later', days: diffDays, color: 'light' };
    }
    return { status: 'active', days: diffDays, color: 'success' };
  };

  if (loading) {
    return (
      <div className="expired-section">
        <div className="loading-container">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading expired members data...</p>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();
  const paginatedData = getPaginatedData();

  return (
    <div className="expired-section">
      <div className="section-header">
        <h2><i className="fas fa-calendar-times"></i> Expiry Memberships</h2>
        <p>Manage and communicate with members whose plans have expiry or are expiring soon</p>
      </div>

      {/* Type Selector */}
      <div className="type-selector">
        <button 
          className={`type-btn ${userType === 'users' ? 'active' : ''}`}
          onClick={() => setUserType('users')}
        >
          <i className="fas fa-users"></i>
          Users ({expiredData.users.length})
        </button>
        <button 
          className={`type-btn ${userType === 'merchants' ? 'active' : ''}`}
          onClick={() => setUserType('merchants')}
        >
          <i className="fas fa-store"></i>
          Merchants ({expiredData.merchants.length})
        </button>
      </div>

      {/* Pagination Controls Top */}
      {filteredData.length > 0 && (
        <div className="pagination-controls top">
          <div className="pagination-info">
            <span>
              Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
              {pagination.totalItems} {userType}
            </span>
          </div>
          <div className="pagination-actions">
            <select 
              value={pagination.pageSize} 
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="page-size-selector"
            >
              <option value={6}>6 per page</option>
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={48}>48 per page</option>
            </select>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-tab ${activeFilter === 'expired' ? 'active' : ''}`}
          onClick={() => setActiveFilter('expired')}
        >
          Expiry (0 days)
        </button>
        <button 
          className={`filter-tab ${activeFilter === '7days' ? 'active' : ''}`}
          onClick={() => setActiveFilter('7days')}
        >
          Expires in 7 days
        </button>
        <button 
          className={`filter-tab ${activeFilter === '15days' ? 'active' : ''}`}
          onClick={() => setActiveFilter('15days')}
        >
          Expires in 15 days
        </button>
        <button 
          className={`filter-tab ${activeFilter === '30days' ? 'active' : ''}`}
          onClick={() => setActiveFilter('30days')}
        >
          Expires in 30 days
        </button>
      </div>

      {/* Members List */}
      <div className="expired-members-list">
        {filteredData.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-check-circle"></i>
            <h3>No {userType} found</h3>
            <p>No {userType} match the selected expiry criteria.</p>
          </div>
        ) : (
          <>
            <div className="members-grid">
              {paginatedData.map(member => {
                const expiryInfo = getExpiryStatus(member);
                return (
                  <div key={member.id} className={`member-card ${expiryInfo.color}`}>
                    <div className="member-info">
                      <div className="member-avatar">
                        <i className={`fas ${userType === 'users' ? 'fa-user' : 'fa-store'}`}></i>
                      </div>
                      <div className="member-details">
                        <h4>{member.fullName || member.businessName}</h4>
                        <p className="member-email">{member.email}</p>
                        <p className="member-plan">{member.membershipType || member.planName || 'No Plan'}</p>
                        <div className={`expiry-status ${expiryInfo.color}`}>
                          <div className="expiry-days">
                            {expiryInfo.status === 'expired' 
                              ? `Expired ${expiryInfo.days} days ago`
                              : `Expires in ${expiryInfo.days} days`
                            }
                          </div>
                          <div className="expiry-date">
                            {new Date(member.planExpiryDate || member.validationDate).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="member-actions">
                      <div className="quick-email-actions">
                        <button 
                          className="email-btn expired"
                          onClick={() => handleSendEmail(member, 0)}
                          title="Send expiry notice"
                        >
                          <i className="fas fa-exclamation-circle"></i>
                          Expiry
                        </button>
                        <button 
                          className="email-btn warning-7"
                          onClick={() => handleSendEmail(member, 7)}
                          title="Send 7-day warning"
                        >
                          <i className="fas fa-clock"></i>
                          7 Days
                        </button>
                        <button 
                          className="email-btn warning-15"
                          onClick={() => handleSendEmail(member, 15)}
                          title="Send 15-day notice"
                        >
                          <i className="fas fa-calendar"></i>
                          15 Days
                        </button>
                        <button 
                          className="email-btn warning-30"
                          onClick={() => handleSendEmail(member, 30)}
                          title="Send 30-day notice"
                        >
                          <i className="fas fa-bell"></i>
                          30 Days
                        </button>
                        <button 
                          className="whatsapp-btn"
                          onClick={() => handleWhatsAppMessage(member)}
                          title="Send WhatsApp message"
                        >
                          <i className="fab fa-whatsapp"></i>
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Bottom */}
            {pagination.totalPages > 1 && (
              <div className="pagination-controls bottom">
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.currentPage === 1}
                  title="First page"
                >
                  <i className="fas fa-angle-double-left"></i>
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  title="Previous page"
                >
                  <i className="fas fa-angle-left"></i>
                </button>
                
                <div className="page-numbers">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      const current = pagination.currentPage;
                      return page === 1 || 
                             page === pagination.totalPages || 
                             (page >= current - 2 && page <= current + 2);
                    })
                    .map((page, index, filteredPages) => (
                      <React.Fragment key={page}>
                        {index > 0 && filteredPages[index - 1] < page - 1 && (
                          <span className="page-ellipsis">...</span>
                        )}
                        <button
                          className={`page-btn ${pagination.currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  title="Next page"
                >
                  <i className="fas fa-angle-right"></i>
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  title="Last page"
                >
                  <i className="fas fa-angle-double-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpiredSection;