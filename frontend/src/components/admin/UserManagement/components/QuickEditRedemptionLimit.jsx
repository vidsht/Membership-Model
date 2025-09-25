import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../../contexts/NotificationContext';
import api from '../../../../services/api';
import './QuickEditRedemptionLimit.css';

const QuickEditRedemptionLimit = ({ 
  user, 
  isOpen, 
  onClose, 
  onUpdate 
}) => {
  const { showNotification } = useNotification();
  const [customRedemptionLimit, setCustomRedemptionLimit] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setCustomRedemptionLimit(user.customRedemptionLimit || '');
    }
  }, [user, isOpen]);

  const handleClose = () => {
    setCustomRedemptionLimit('');
    onClose();
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      console.log('💾 QuickEdit: Saving custom redemption limit:', customRedemptionLimit, 'for user:', user.id);
      
      let parsedLimit = null;
      if (customRedemptionLimit !== '' && customRedemptionLimit !== null && customRedemptionLimit !== undefined) {
        const trimmedValue = String(customRedemptionLimit).trim();
        if (trimmedValue !== '') {
          const numValue = parseInt(trimmedValue, 10);
          if (!isNaN(numValue) && isFinite(numValue)) {
            parsedLimit = numValue;
          }
        }
      }
      
      const payload = {
        customRedemptionLimit: parsedLimit
      };
      
      console.log('💾 QuickEdit: Parsed limit value:', parsedLimit, 'from input:', customRedemptionLimit, 'typeof:', typeof customRedemptionLimit);
      
      const response = await api.put(`/admin/users/${user.id}`, payload);
      console.log('✅ QuickEdit: Redemption limit update response:', response);
      
      if (response.data.success) {
        showNotification('Custom redemption limit updated successfully', 'success');
        handleClose();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(response.data.message || 'Failed to update redemption limit');
      }
    } catch (error) {
      console.error('❌ QuickEdit: Error updating redemption limit:', error);
      if (error.response && error.response.data && error.response.data.message) {
        showNotification(error.response.data.message, 'error');
      } else {
        showNotification('Failed to update custom redemption limit. Please try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetToPlanDefault = async () => {
    try {
      setSaving(true);
      console.log('🔄 QuickEdit: Resetting redemption limit to plan default for user:', user.id);
      
      const payload = {
        customRedemptionLimit: null // null means use plan default
      };
      
      const response = await api.put(`/admin/users/${user.id}`, payload);
      console.log('✅ QuickEdit: Redemption limit reset response:', response);
      
      if (response.data.success) {
        showNotification('Redemption limit reset to plan default successfully', 'success');
        setCustomRedemptionLimit(''); // Clear the input field
        handleClose();
        if (onUpdate) {
          onUpdate();
        }
      } else {
        throw new Error(response.data.message || 'Failed to reset redemption limit');
      }
    } catch (error) {
      console.error('❌ QuickEdit: Error resetting redemption limit:', error);
      if (error.response && error.response.data && error.response.data.message) {
        showNotification(error.response.data.message, 'error');
      } else {
        showNotification('Failed to reset redemption limit to plan default. Please try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content quick-edit-redemption-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Quick Edit Redemption Limit</h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="user-info-section">
            <h4>{user.fullName}</h4>
            <div className="user-details-grid">
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{user.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Plan:</span>
                <span className="info-value">{user.membershipType || user.planName || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Current Custom Limit:</span>
                <span className="info-value">
                  {user.customRedemptionLimit ? (
                    <span className="custom-limit">
                      <i className="fas fa-star"></i> {user.customRedemptionLimit}/month
                    </span>
                  ) : (
                    <span className="plan-limit">Using plan default</span>
                  )}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="customRedemptionLimit">Custom Redemption Limit (per month)</label>
              <input
                type="number"
                id="customRedemptionLimit"
                min="0"
                max="100"
                value={customRedemptionLimit}
                onChange={(e) => setCustomRedemptionLimit(e.target.value)}
                placeholder="Leave empty for plan default"
                className="form-control"
              />
              <small className="form-hint">
                Enter a number between 0-100, or leave empty to use plan default. Set to -1 for unlimited.
              </small>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-warning" 
            onClick={handleResetToPlanDefault}
            disabled={saving}
            title="Reset custom limit and use plan default"
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Resetting...
              </>
            ) : (
              <>
                <i className="fas fa-undo"></i> Reset to Plan Default
              </>
            )}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Update Limit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickEditRedemptionLimit;
