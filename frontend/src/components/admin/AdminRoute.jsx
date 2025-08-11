import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

/**
 * AdminRoute is a wrapper component that protects admin routes
 * Only users with admin role can access routes wrapped with this component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if access is allowed
 * @returns {React.ReactNode} - The protected route
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const location = useLocation();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    showNotification('Please log in to access the admin panel.', 'warning');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has admin role
  if (!user?.userType || user.userType !== 'admin') {
    showNotification('You do not have permission to access the admin panel.', 'error');
    return <Navigate to="/" replace />;
  }

  // If authenticated and has admin role, render the protected route
  return children;
};

export default AdminRoute;
