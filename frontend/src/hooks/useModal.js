import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal state and operations
 * Provides easy-to-use functions for showing different types of modals
 */
export const useModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
    onConfirm: null,
    onCancel: null
  });

  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
      title: '',
      message: '',
      type: 'info',
      confirmText: 'OK',
      cancelText: 'Cancel',
      showCancel: false,
      onConfirm: null,
      onCancel: null
    });
  }, []);

  const showModal = useCallback((config) => {
    setModalState({
      isOpen: true,
      title: config.title || '',
      message: config.message || '',
      type: config.type || 'info',
      confirmText: config.confirmText || 'OK',
      cancelText: config.cancelText || 'Cancel',
      showCancel: config.showCancel || false,
      onConfirm: config.onConfirm || closeModal,
      onCancel: config.onCancel || closeModal
    });
  }, [closeModal]);

  // Convenience methods for different modal types
  const showSuccess = useCallback((message, title = 'Success') => {
    showModal({
      type: 'success',
      title,
      message,
      confirmText: 'OK'
    });
  }, [showModal]);

  const showError = useCallback((message, title = 'Error') => {
    showModal({
      type: 'error',
      title,
      message,
      confirmText: 'OK'
    });
  }, [showModal]);

  const showWarning = useCallback((message, title = 'Warning') => {
    showModal({
      type: 'warning',
      title,
      message,
      confirmText: 'OK'
    });
  }, [showModal]);

  const showInfo = useCallback((message, title = 'Information') => {
    showModal({
      type: 'info',
      title,
      message,
      confirmText: 'OK'
    });
  }, [showModal]);

  const showConfirm = useCallback((message, onConfirm, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      showModal({
        type: 'confirm',
        title,
        message,
        confirmText: 'Yes',
        cancelText: 'No',
        showCancel: true,
        onConfirm: () => {
          resolve(true);
          closeModal();
          if (onConfirm) onConfirm();
        },
        onCancel: () => {
          resolve(false);
          closeModal();
        }
      });
    });
  }, [showModal, closeModal]);

  const showDeleteConfirm = useCallback((itemName) => {
    return new Promise((resolve) => {
      showModal({
        type: 'warning',
        title: 'Delete Confirmation',
        message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        showCancel: true,
        onConfirm: () => {
          resolve(true);
          closeModal();
        },
        onCancel: () => {
          resolve(false);
          closeModal();
        }
      });
    });
  }, [showModal, closeModal]);

  return {
    modal: modalState, // Keep backward compatibility
    modalState,
    showModal,
    closeModal,
    hideModal: closeModal, // Keep backward compatibility
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showDeleteConfirm
  };
};
