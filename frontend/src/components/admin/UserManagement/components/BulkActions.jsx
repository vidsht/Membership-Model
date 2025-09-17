// BulkActions.jsx - Minimal Bulk Actions Component
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

  return (
    <div className="bulk-actions-minimal">
      <div className="bulk-info">
        <span>{selectedCount} selected</span>
      </div>
      
      <div className="bulk-controls">
        <button
          className="bulk-btn approve"
          onClick={() => handleBulkAction('approve')}
          disabled={loading || selectedCount === 0}
          title="Approve selected"
        >
          <i className="fas fa-check"></i>
        </button>

        <button
          className="bulk-btn reject"
          onClick={() => handleBulkAction('reject')}
          disabled={loading || selectedCount === 0}
          title="Reject selected"
        >
          <i className="fas fa-times"></i>
        </button>

        <button
          onClick={() => onClearSelection && onClearSelection()}
          className="bulk-btn clear"
          disabled={loading}
          title="Clear selection"
        >
          <i className="fas fa-times-circle"></i>
        </button>
      </div>
      
      {loading && (
        <div className="bulk-loading">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      )}
    </div>
  );
};

export default BulkActions;
