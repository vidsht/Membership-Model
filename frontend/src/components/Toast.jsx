import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import './Toast.css';

const Toast = () => {
  const { notifications, hideNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="toast-container">
      {notifications.map(notification => (
        <div key={notification.id} className={`toast toast-${notification.type}`}>
          <div className="toast-icon">
            {notification.type === 'success' && <i className="fas fa-check-circle"></i>}
            {notification.type === 'error' && <i className="fas fa-exclamation-circle"></i>}
            {notification.type === 'info' && <i className="fas fa-info-circle"></i>}
            {notification.type === 'warning' && <i className="fas fa-exclamation-triangle"></i>}
          </div>
          <div className="toast-content">{notification.message}</div>
          <button 
            className="toast-close" 
            onClick={() => hideNotification(notification.id)}
            aria-label="Close notification"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
