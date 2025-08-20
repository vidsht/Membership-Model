// BulkActions.jsx - Complete Bulk Actions Component
import React, { useState } from 'react';

const BulkActions = ({ selectedCount, onBulkAction, onBulkDelete }) => {
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

  const handleBulkDelete = async () => {
    if (onBulkDelete) {
      try {
        setLoading(true);
        await onBulkDelete();
        setIsOpen(false);
      } catch (error) {
        console.error('Bulk delete error:', error);
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
          <div className="dropdown">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="btn btn-primary dropdown-toggle"
              disabled={loading || selectedCount === 0}
            >
              <i className="fas fa-cog"></i>
              Bulk Actions
              <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
            </button>
            
            {isOpen && (
              <div className="dropdown-menu show">
                <div className="dropdown-header">
                  Choose an action for {selectedCount} selected user{selectedCount !== 1 ? 's' : ''}
                </div>
                
                {bulkActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleBulkAction(action.key)}
                    className={`dropdown-item ${action.className}`}
                    disabled={loading}
                    title={action.description}
                  >
                    <i className={`fas ${action.icon}`}></i>
                    {action.label}
                  </button>
                ))}
                
                <div className="dropdown-divider"></div>
                
                {/* Delete Selected button removed to prevent user deletion from admin bulk actions */}
              </div>
            )}
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="btn btn-secondary"
            disabled={loading}
          >
            <i className="fas fa-times"></i>
            Clear Selection
          </button>
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
