import React from 'react';
import './ConfirmationDialog.css';

const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  type = 'warning' // warning, danger, info
}) => {
  if (!isOpen) return null;

  const getIconClass = () => {
    switch (type) {
      case 'danger':
        return 'fas fa-exclamation-triangle text-danger';
      case 'info':
        return 'fas fa-info-circle text-info';
      case 'warning':
      default:
        return 'fas fa-exclamation-triangle text-warning';
    }
  };

  return (
    <div className="confirmation-overlay">
      <div className="confirmation-dialog">
        <div className="confirmation-header">
          <div className="confirmation-icon">
            <i className={getIconClass()}></i>
          </div>
          <h3>{title}</h3>
        </div>
        
        <div className="confirmation-body">
          <p>{message}</p>
        </div>
        
        <div className="confirmation-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-warning'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
