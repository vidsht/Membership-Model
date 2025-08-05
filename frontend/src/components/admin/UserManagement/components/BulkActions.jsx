// BulkActions.jsx - Bulk actions component for User Management
import React, { useState } from 'react';

const BulkActions = ({ selectedCount, onBulkAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBulkAction = async (action) => {
    if (window.confirm(`Are you sure you want to ${action} ${selectedCount} selected user(s)?`)) {
      setLoading(true);
      try {
        await onBulkAction(action);
        setIsOpen(false);
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
    },
    {
      key: 'activate',
      label: 'Activate Selected',
      icon: 'fa-check-circle', 
      className: 'btn-info',
      description: 'Activate all selected users'
    }
  ];

  return (
    <div className="bulk-actions">
      <div className="bulk-actions-header">
        <div className="selection-info">
          <i className="fas fa-users"></i>
          <span>{selectedCount} user{selectedCount !== 1 ? 's' : ''} selected</span>
        </div>
        
        <div className="bulk-actions-controls">
          <button
            className={`btn btn-primary ${isOpen ? 'active' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            disabled={loading}
          >
            <i className="fas fa-tasks"></i>
            Bulk Actions
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="bulk-actions-menu">
          <div className="bulk-actions-grid">
            {bulkActions.map(action => (
              <button
                key={action.key}
                className={`bulk-action-item ${action.className}`}
                onClick={() => handleBulkAction(action.key)}
                disabled={loading}
                title={action.description}
              >
                <i className={`fas ${action.icon}`}></i>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
          
          <div className="bulk-actions-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <span>Bulk actions will be applied to all {selectedCount} selected user(s)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkActions;
