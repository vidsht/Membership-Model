import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllDeals, redeemDeal } from '../services/api';
import DealFilters from '../components/deals/DealFilters';
import '../styles/deals.css';

/**
 * Determines if a user can redeem a deal based on membership and deal access level.
 * @param {Object} user - The user object
 * @param {string} accessLevel - The deal's access level
 * @returns {boolean}
 */
function canRedeem(user, accessLevel) {
  if (!user || !accessLevel) return false;
  if (user.membership === 'gold') return true; // Gold can redeem all
  if (user.membership === 'silver') return accessLevel === 'silver' || accessLevel === 'community';
  if (user.membership === 'community') return accessLevel === 'community';
  return false;
}

const Deals = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    membershipLevel: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [loading, setLoading] = useState(true);
  const [redeemStatus, setRedeemStatus] = useState({});

  useEffect(() => {
    fetchDeals();
  }, []);

  useEffect(() => {
    let result = deals;
    // Status filter
    if (filters.status !== 'all') {
      result = result.filter(deal => {
        if (filters.status === 'active') return new Date(deal.expiration_date) > new Date() && (!deal.start_date || new Date(deal.start_date) <= new Date());
        if (filters.status === 'expired') return new Date(deal.expiration_date) < new Date();
        if (filters.status === 'upcoming') return deal.start_date && new Date(deal.start_date) > new Date();
        return true;
      });
    }
    // Category filter
    if (filters.category !== 'all') {
      result = result.filter(deal => deal.category === filters.category);
    }
    // Membership Level filter
    if (filters.membershipLevel !== 'all') {
      result = result.filter(deal => deal.accessLevel === filters.membershipLevel);
    }
    // Date filters
    if (filters.dateFrom) {
      result = result.filter(deal => new Date(deal.expiration_date) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      result = result.filter(deal => new Date(deal.expiration_date) <= new Date(filters.dateTo));
    }
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(deal =>
        (deal.title && deal.title.toLowerCase().includes(search)) ||
        (deal.businessName && deal.businessName.toLowerCase().includes(search)) ||
        (deal.category && deal.category.toLowerCase().includes(search))
      );
    }
    setFilteredDeals(result);
  }, [filters, deals]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const data = await getAllDeals();
      setDeals(data);
    } catch (error) {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (dealId, accessLevel) => {
    if (!user) {
      setRedeemStatus({ ...redeemStatus, [dealId]: 'Please log in to redeem.' });
      return;
    }
    if (!canRedeem(user, accessLevel)) {
      setRedeemStatus({ ...redeemStatus, [dealId]: 'This deal is not available for your membership plan.' });
      return;
    }
    try {
      await redeemDeal(dealId);
      setRedeemStatus({ ...redeemStatus, [dealId]: 'Redeemed!' });
    } catch (error) {
      setRedeemStatus({ ...redeemStatus, [dealId]: 'Failed to redeem. Try again.' });
    }
  };

  return (
    <div className="deals-page">
      <h1>Exclusive Deals</h1>
      <DealFilters
        filters={filters}
        onFilterChange={update => setFilters(prev => ({ ...prev, ...update }))}
        onSearch={search => setFilters(prev => ({ ...prev, search }))}
      />
      {loading ? (
        <div className="loading">Loading deals...</div>
      ) : filteredDeals.length === 0 ? (
        <div className="no-deals">No deals available.</div>
      ) : (
        <div className="deals-grid">
          {filteredDeals.map(deal => (
            <div className="deal-card" key={deal.id}>
              {/* Business Info */}
              <div className="deal-business-info">
                <h3 className="business-name">{deal.businessName}</h3>
                {deal.businessDescription && <p className="business-desc">{deal.businessDescription}</p>}
                <div className="business-meta">
                  {deal.businessCategory && <span className="business-category">{deal.businessCategory}</span>}
                  {deal.businessAddress && <span className="business-address">{deal.businessAddress}</span>}
                  {deal.businessPhone && <span className="business-phone">{deal.businessPhone}</span>}
                  {deal.businessEmail && <span className="business-email">{deal.businessEmail}</span>}
                  {deal.website && <span className="business-website"><a href={deal.website} target="_blank" rel="noopener noreferrer">Website</a></span>}
                </div>
              </div>
              {/* Deal Info */}
              <h2>{deal.title}</h2>
              <p className="deal-desc">{deal.description}</p>
              <div className="deal-meta">
                <span className="deal-category">{deal.category}</span>
                <span className="deal-expiry">Expires: {deal.expiration_date ? new Date(deal.expiration_date).toLocaleDateString() : ''}</span>
                {/* Access Level Badge */}
                {deal.accessLevel === 'community' && <span className="deal-badge community">for every community user</span>}
                {deal.accessLevel === 'silver' && <span className="deal-badge silver">only silver members</span>}
                {deal.accessLevel === 'gold' && <span className="deal-badge gold">premium gold deal</span>}
                {/* Discount Info */}
                {deal.discount && <span className="deal-discount">Discount: {deal.discount} {deal.discountType === 'percentage' ? '%' : deal.discountType === 'fixed' ? 'GHS' : deal.discountType}</span>}
                {/* Terms & Conditions */}
                {deal.termsConditions && <span className="deal-terms">Terms: {deal.termsConditions}</span>}
              </div>
              <button
                className="btn-redeem"
                disabled={!user || !canRedeem(user, deal.accessLevel)}
                onClick={() => handleRedeem(deal.id, deal.accessLevel)}
              >
                Redeem
              </button>
              {/* Upgrade toggle logic */}
              {user && !canRedeem(user, deal.accessLevel) && (
                <div className="upgrade-toggle">
                  {deal.accessLevel === 'silver' && user.membership === 'community' && (
                    <button className="btn-upgrade">Upgrade to Silver Plan</button>
                  )}
                  {deal.accessLevel === 'gold' && user.membership === 'community' && (
                    <button className="btn-upgrade">Upgrade to Gold Plan</button>
                  )}
                  {deal.accessLevel === 'gold' && user.membership === 'silver' && (
                    <button className="btn-upgrade">Upgrade to Gold Plan</button>
                  )}
                </div>
              )}
              {redeemStatus[deal.id] && <div className="redeem-status">{redeemStatus[deal.id]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Deals;
