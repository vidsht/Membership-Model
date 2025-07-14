import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false, requireMerchant = false }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading...</p>
        </div>
      </div>
    );
  } 
  if (!isAuthenticated) {
    // Instead of redirecting, render children (or null) so unauthenticated users see nothing or a fallback
    return null;
  }

  if (requireAdmin && !user?.isAdmin) {
    return (
      <div className="error-container">
        <div className="error-message">
          <i className="fas fa-shield-alt"></i>
          <h3>Admin Access Required</h3>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (requireMerchant && !user?.isMerchant && !user?.isAdmin) {
    return (
      <div className="error-container">
        <div className="error-message">
          <i className="fas fa-store"></i>
          <h3>Merchant Access Required</h3>
          <p>You need to be a registered merchant to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
