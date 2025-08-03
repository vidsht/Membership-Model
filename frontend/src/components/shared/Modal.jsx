import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';

/**
 * Confirmation Modal Component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal message
 * @param {string} props.type - Modal type: 'success', 'warning', 'error', 'info', 'confirm'
 * @param {Function} props.onConfirm - Confirm callback
 * @param {Function} props.onCancel - Cancel callback
 * @param {string} props.confirmText - Confirm button text
 * @param {string} props.cancelText - Cancel button text
 * @param {boolean} props.showCancel - Whether to show cancel button
 */
const Modal = ({
  isOpen,
  title,
  message,
  type = 'info',
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !showCancel) {
      handleConfirm();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, showCancel]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'error':
        return 'fas fa-times-circle';
      case 'confirm':
        return 'fas fa-question-circle';
      case 'info':
      default:
        return 'fas fa-info-circle';
    }
  };

  const modalContent = (
    <div className={`modal-overlay ${isOpen ? 'modal-open' : ''}`} onClick={handleBackdropClick}>
      <div className={`modal-container modal-${type}`}>
        <div className="modal-header">
          <div className="modal-icon">
            <i className={getIcon()}></i>
          </div>
          {title && <h3 className="modal-title">{title}</h3>}
        </div>
        
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        
        <div className="modal-footer">
          {showCancel && (
            <button 
              className="btn btn-secondary modal-cancel-btn"
              onClick={handleCancel}
              autoFocus={type === 'confirm'}
            >
              {cancelText}
            </button>
          )}
          <button 
            className={`btn btn-${type === 'error' || type === 'warning' ? 'primary' : type === 'success' ? 'success' : 'primary'} modal-confirm-btn`}
            onClick={handleConfirm}
            autoFocus={!showCancel}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;

  return ReactDOM.createPortal(modalContent, document.body);
};

export default Modal;
