// BulkActions.jsx - Complete Bulk Actions Component
import React, { useState } from 'react';
import './BulkActions.css';

const BulkActions = ({ selectedCount, onBulkAction, onClearSelection }) => {
  const [loading, setLoading] = useState(false);

  const handleBulkAction = async (action) => {
    if (selectedCount === 0) return;
    if (window.confirm(`Are you sure you want to ${action} ${selectedCount} selected user(s)?`)) {
      setLoading(true);
      try {
        await onBulkAction(action);
      } catch (error) {
        console.error('Bulk action error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const bulkActions = [
    {
      key: 'approve',
      label: 'Approve Selected',
      icon: 'fa-check',
      className: 'btn-success',
      description: 'Approve all selected users'
    },
    {
      key: 'reject',
      label: 'Reject Selected',
      icon: 'fa-times',
      className: 'btn-danger',
      description: 'Reject all selected users'
    },
    {
      key: 'suspend',
      label: 'Suspend Selected',
      icon: 'fa-ban',
      className: 'btn-warning',
      description: 'Suspend all selected users'
    }
  ];

  return (
    <div className="bulk-actions">
      <div className="bulk-actions-header">
        <div className="selection-info">
          <i className="fas fa-check-circle"></i>
          <span>{selectedCount} user{selectedCount !== 1 ? 's' : ''} selected</span>
        </div>
        
        <div className="bulk-actions-controls">
          <div className="left-group">
            <button
              className="bulk-action-btn primary"
              onClick={() => handleBulkAction('approve')}
              disabled={loading || selectedCount === 0}
              title="Approve selected users"
            >
              <i className="fas fa-check"></i>
              Approve
            </button>

            <button
              className="bulk-action-btn warning"
              onClick={() => handleBulkAction('suspend')}
              disabled={loading || selectedCount === 0}
              title="Suspend selected users"
            >
              <i className="fas fa-ban"></i>
              Suspend
            </button>

            <button
              className="bulk-action-btn danger"
              onClick={() => handleBulkAction('reject')}
              disabled={loading || selectedCount === 0}
              title="Reject selected users"
            >
              <i className="fas fa-times"></i>
              Reject
            </button>
          </div>

          <div className="right-group">
            <button
              onClick={() => onClearSelection && onClearSelection()}
              className="bulk-btn"
              disabled={loading}
            >
              <i className="fas fa-times"></i>
              Clear Selection
            </button>
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="bulk-actions-loading">
          <div className="loading-spinner"></div>
          <span>Processing bulk action...</span>
        </div>
      )}
    </div>
  );
};

export default BulkActions;
