import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import api from '../../../services/api';
import './PlanAssignment.css';

/**
 * PlanAssignment component for assigning plans to users
 * @returns {React.ReactElement} The plan assignment component
 */
const PlanAssignment = (props) => {
  const params = useParams();
  const userId = props.userId || params.userId;
  const navigate = useNavigate();
  const { navigateBackToAdmin } = useAdminNavigation();
  const { showNotification } = useNotification();
  
  // Defensive: warn if userId is missing
  useEffect(() => {
    if (!userId) {
      console.error('PlanAssignment: userId is undefined. Cannot fetch user or assign plan.');
      showNotification('No user ID provided. Redirecting to plan management.', 'error');
      navigateBackToAdmin('plans');
    }
  }, [userId, navigate, showNotification]);
    const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notes, setNotes] = useState('');
  
  useEffect(() => {
    if (!userId) return;
    fetchUserAndPlans();
  }, [userId]);

  const fetchUserAndPlans = async () => {
    if (!userId) {
      showNotification('No user selected for plan assignment. Please try again.', 'error');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      
      // First get user data to determine userType
      const userResponse = await api.get(`/admin/users/${userId}`);
      const userData = userResponse.data.user || userResponse.data;
      const userType = userData.userType || 'user';
      
      // Fetch plans based on user type
      let plansResponse;
      if (userType === 'merchant') {
        // Get merchant plans
        plansResponse = await api.get('/plans?type=merchant&isActive=true');
      } else {
        // Get user plans
        plansResponse = await api.get('/plans?type=user&isActive=true');
      }
      
      const plansData = plansResponse.data;
      
      // Ensure plans is always an array
      const filteredPlans = Array.isArray(plansData?.plans) ? plansData.plans : 
                          Array.isArray(plansData) ? plansData : [];
      
      setUser(userData);
      setPlans(filteredPlans);
      setSelectedPlan(userData.membershipType || '');
      
      // Set default dates
      const today = new Date();
      setEffectiveDate(today.toISOString().split('T')[0]);
      // Set expiry date to 1 year from today by default
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpiryDate(nextYear.toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error fetching user or plans:', error);
      showNotification('Error loading user or plan data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
    const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedPlan) {
      showNotification('Please select a plan to assign.', 'warning');
      return;
    }
    
    if (!effectiveDate) {
      showNotification('Please select an effective date.', 'warning');
      return;
    }
    
    if (!expiryDate) {
      showNotification('Please select an expiry date.', 'warning');
      return;
    }
      // If plan is changing, show confirmation
    if (selectedPlan !== user.membershipType && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }
      try {
      setIsSaving(true);
      
      // Find the selected plan object
      const planObj = plans.find(p => p.key === selectedPlan || p.membershipType === selectedPlan);
      
      await api.post(`/admin/users/${userId}/assign-plan`, {
        planKey: selectedPlan,
        planId: planObj?.id || planObj?._id,
        effectiveDate,
        expiryDate,
        notes: notes || `Plan ${selectedPlan !== user.membershipType ? 'changed from ' + user.membershipType + ' to ' + selectedPlan : 'assigned'} by admin.`
      });
      
      showNotification(`Plan successfully assigned to ${user.fullName}.`, 'success');
      
      // Redirect back to plan management
      navigateBackToAdmin('plans');
    } catch (error) {
      console.error('Error assigning plan:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign plan. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSaving(false);
      setShowConfirmation(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="empty-state">
        <i className="fas fa-exclamation-triangle"></i>
        <p>Could not load user data. The user may not exist.</p>
        <button
          className="button button-primary"
          onClick={() => navigateBackToAdmin('plans')}
        >
          Back to Plan Management
        </button>
      </div>
    );
  }
  
  return (
    <div className="plan-assignment">      <div className="plan-assignment-header">
        <h2>
          <i className="fas fa-id-card"></i>
          Assign Plan to {user.userType === 'merchant' ? 'Merchant' : 'User'}
        </h2>
        <button
          className="button button-secondary"
          onClick={() => navigateBackToAdmin('plans')}
        >
          <i className="fas fa-arrow-left"></i> Back to Plan Management
        </button>
      </div>
      
      <div className="user-info-card">
        <div className="user-info-header">
          <h3>{user.fullName}</h3>
          <span className={`status-badge status-${user.status || 'pending'}`}>
            {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Pending'}
          </span>
        </div>
        
        <div className="user-info-details">
          <div className="info-group">
            <span className="info-label">Email:</span>
            <span className="info-value">{user.email}</span>
          </div>
            <div className="info-group">
            <span className="info-label">Phone:</span>
            <span className="info-value">{user.phone || 'Not provided'}</span>
          </div>
          
          {user.userType === 'merchant' && user.businessInfo && (
            <div className="info-group">
              <span className="info-label">Business Name:</span>
              <span className="info-value">{user.businessInfo.businessName || 'Not provided'}</span>
            </div>
          )}
          
          {user.userType === 'merchant' && user.businessInfo && (
            <div className="info-group">
              <span className="info-label">Business Category:</span>
              <span className="info-value">{user.businessInfo.businessCategory || 'Not provided'}</span>
            </div>
          )}<div className="info-group">
            <span className="info-label">Current Plan:</span>
            <span className="info-value plan-badge">
              {user.membershipType ? 
                user.membershipType.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ') + ' Plan' : 
                'No plan'
              }
            </span>
          </div>
          
          <div className="info-group">
            <span className="info-label">Registration Date:</span>
            <span className="info-value">{new Date(user.createdAt).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}</span>
          </div>
        </div>
      </div>
      
      <div className="plan-assignment-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="selectedPlan">Select Plan *</label>            <select
              id="selectedPlan"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              required
            >
              <option value="">-- Select a plan --</option>
              {Array.isArray(plans) && plans.map(plan => (
                <option key={plan.id || plan._id || plan.key} value={plan.key || plan.membershipType}>
                  {plan.name} - {plan.currency || 'GHS'} {plan.price === 0 ? 'Free' : plan.price}/{plan.billingCycle}
                </option>
              ))}
              {(!Array.isArray(plans) || plans.length === 0) && (
                <option value="" disabled>
                  {user?.userType === 'merchant' ? 'No merchant plans available' : 'No user plans available'}
                </option>
              )}
            </select>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="effectiveDate">Effective Date *</label>
              <input
                type="date"
                id="effectiveDate"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="expiryDate">Expiry Date *</label>
              <input
                type="date"
                id="expiryDate"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={effectiveDate}
                required
              />
            </div>          </div>
          
          {/* Add a notes section instead of proration */}
          <div className="form-group">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this plan assignment..."
              rows="3"
            />
          </div>
          
          <div className="form-actions">            <button
              type="button"
              className="button button-secondary"
              onClick={() => navigateBackToAdmin('plans')}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="button button-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Assigning...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i> Assign Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {showConfirmation && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Plan Change</h3>
              <button 
                className="close-button" 
                onClick={() => setShowConfirmation(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
              <div className="modal-body">
              <p>
                Are you sure you want to change this user's plan from <strong>{user.membershipType || 'No Plan'}</strong> to <strong>{selectedPlan}</strong>?
              </p>
              
              {selectedPlan !== user.membershipType && (
                <div className="plan-change-notice">
                  <i className="fas fa-info-circle"></i>
                  <div>
                    <p>
                      This will update the user's membership level and access permissions.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="button button-secondary"
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </button>
              
              <button 
                className="button button-primary"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? 'Processing...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanAssignment;
