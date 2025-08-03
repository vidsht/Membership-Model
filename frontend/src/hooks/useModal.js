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
    setModalState(prev => ({ ...prev, isOpen: false }));
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
      onConfirm: config.onConfirm || (() => closeModal()),
      onCancel: config.onCancel || (() => closeModal())
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

  const showDeleteConfirm = useCallback((itemName, onConfirm) => {
    return showConfirm(
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      onConfirm,
      'Delete Confirmation'
    );
  }, [showConfirm]);

  return {
    modalState,
    showModal,
    closeModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showDeleteConfirm
  };
};
