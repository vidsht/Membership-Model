import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Keys for localStorage
  const USER_STORAGE_KEY = 'user_data';
  const AUTH_REMEMBERED_KEY = 'authRemembered';
  
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Enhanced updateUser function with persistence
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    // Persist user data to localStorage (excluding sensitive data)
    if (updatedUser) {
      const userDataToPersist = {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profilePicture: updatedUser.profilePicture,
        profilePhoto: updatedUser.profilePhoto,
        profilePhotoUrl: updatedUser.profilePhotoUrl,
        membershipType: updatedUser.membershipType,
        membershipNumber: updatedUser.membershipNumber,
        role: updatedUser.role,
        userType: updatedUser.userType,
        business: updatedUser.business, // Include business data for merchants
        // Add other non-sensitive fields as needed
        dob: updatedUser.dob,
        bloodGroup: updatedUser.bloodGroup,
        community: updatedUser.community,
        address: updatedUser.address,
        country: updatedUser.country,
        status: updatedUser.status,
        created_at: updatedUser.created_at
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userDataToPersist));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  // Load persisted user data
  const loadPersistedUser = () => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser;
      }
    } catch (error) {
      console.error('Error loading persisted user data:', error);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    return null;
  };

  // Setup a default notification function
  const showToast = (message, type) => {
    // Create a toast notification
    const notification = document.createElement('div');
    notification.className = `notification ${type || 'info'}`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '5px';
    notification.style.backgroundColor = type === 'error' ? '#f44336' : 
                                        type === 'success' ? '#4caf50' : 
                                        type === 'warning' ? '#ff9800' : '#2196f3';
    notification.style.color = 'white';
    notification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    notification.style.maxWidth = '400px';
    
    notification.innerHTML = `
      <strong>${type === 'error' ? 'Error' : 
                type === 'success' ? 'Success' : 
                type === 'warning' ? 'Warning' : 'Information'}</strong>
      <p>${message}</p>
      <button style="background: white; color: ${
        type === 'error' ? '#f44336' : 
        type === 'success' ? '#4caf50' : 
        type === 'warning' ? '#ff9800' : '#2196f3'
      }; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-top: 10px;">
        Dismiss
      </button>
    `;
    
    document.body.appendChild(notification);
    
    // Add event listener for the dismiss button
    const dismissButton = notification.querySelector('button');
    if (dismissButton) {
      dismissButton.addEventListener('click', () => {
        document.body.removeChild(notification);
      });
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  };
  
  // Use ref to prevent multiple simultaneous auth checks
  const authCheckRunning = useRef(false);
  
  // Ref for refresh timer
  const refreshTimerRef = useRef(null);
  
  // Setup token refresh timer
  const setupRefreshTimer = () => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    // Set timer to refresh session every 15 minutes
    refreshTimerRef.current = setTimeout(async () => {
      try {
        await authApi.refreshSession();
        setupRefreshTimer(); // Reset the timer after successful refresh
      } catch (error) {
        // If refresh fails, the session might be expired
        if (error.response?.status === 401) {
          handleSessionExpired();
        } else {
          console.error('Session refresh error:', error);
          // Try again in 60 seconds
          refreshTimerRef.current = setTimeout(setupRefreshTimer, 60000);
        }
      }
    }, 15 * 60 * 1000); // 15 minutes
  };

  // Handle session expiration
  const handleSessionExpired = () => {
    setSessionExpired(true);
    setIsAuthenticated(false);
    
    // Clear auth remembered but keep user data for profile images
    localStorage.removeItem(AUTH_REMEMBERED_KEY);
    
    // Show session expired notification
    showToast('Your session has expired. Please login again to continue.', 'error');
  };

  // Validate current session
  const validateSession = async () => {
    try {
      const response = await authApi.me();
      if (response.user) {
        // Merge server data with persisted data
        const persistedUser = loadPersistedUser();
        const mergedUser = { ...persistedUser, ...response.user };
        updateUser(mergedUser);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      return false;
    }
  };

  const checkAuthStatus = async () => {
    // Prevent multiple simultaneous calls
    if (authCheckRunning.current) {
      return;
    }

    try {
      authCheckRunning.current = true;
      setIsLoading(true);
      
      // Load persisted user data first
      const persistedUser = loadPersistedUser();
      if (persistedUser) {
        setUser(persistedUser);
      }
      
      // Then validate with server
      const response = await authApi.me();
      
      // Merge server response with persisted data
      const mergedUser = { ...persistedUser, ...response.user };
      updateUser(mergedUser);
      setIsAuthenticated(true);
      
      // Setup refresh timer if authenticated
      setupRefreshTimer();
    } catch (error) {
      // If server validation fails but we have persisted data, keep it for profile images
      const persistedUser = loadPersistedUser();
      if (persistedUser) {
        setUser(persistedUser);
      } else {
        setUser(null);
      }
      setIsAuthenticated(false);
      
      // Only log non-401 errors as 401 is expected when not logged in
      if (error.response?.status !== 401) {
        console.error('Auth check error:', error.response?.data?.message || error.message);
      }
    } finally {
      setIsLoading(false);
      authCheckRunning.current = false;
    }
  };

  // Run on mount and clean up on unmount
  useEffect(() => {
    checkAuthStatus();
    
    // Cleanup function to clear timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []); // Empty dependency array - runs only once

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      // Pass the rememberMe flag to the API
      const response = await authApi.login(credentials);
      
      // Store additional info if rememberMe is true
      if (credentials.rememberMe) {
        localStorage.setItem(AUTH_REMEMBERED_KEY, 'true');
      } else {
        localStorage.removeItem(AUTH_REMEMBERED_KEY);
      }
      
      // Merge with any existing persisted data
      const persistedUser = loadPersistedUser();
      const mergedUser = { ...persistedUser, ...response.user };
      updateUser(mergedUser);
      setIsAuthenticated(true);
      
      // Setup refresh timer when authenticated
      setupRefreshTimer();
      
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const merchantLogin = async (credentials) => {
    try {
      setIsLoading(true);
      const response = await authApi.merchantLogin(credentials);
      
      // Merge with any existing persisted data
      const persistedUser = loadPersistedUser();
      const mergedUser = { ...persistedUser, ...response.user };
      updateUser(mergedUser);
      setIsAuthenticated(true);
      
      // Setup refresh timer when merchant is authenticated
      setupRefreshTimer();
      
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const merchantRegister = async (userData) => {
    try {
      setIsLoading(true);
      const response = await authApi.merchantRegister(userData);
      updateUser(response.user);
      setIsAuthenticated(true);
      
      // Setup refresh timer when merchant is registered and authenticated
      setupRefreshTimer();
      
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await authApi.register(userData);
      updateUser(response.user);
      setIsAuthenticated(true);
      
      // Setup refresh timer when user is registered and authenticated
      setupRefreshTimer();
      
      return response;
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Clear any refresh timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    try {
      const response = await authApi.logout();

      // Clear auth state but keep user data for profile images
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpired(false);

      // Clear only the auth remembered flag, keep user data
      localStorage.removeItem(AUTH_REMEMBERED_KEY);

      // Show success notification
      showToast('You have been logged out successfully', 'success');

      // Return response so components can show the success message
      return response;
    } catch (error) {
      console.error('Logout error:', error);

      // Ensure local auth state is cleared even if server logout failed
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpired(false);
      localStorage.removeItem(AUTH_REMEMBERED_KEY);

      // Informational notification (only when an actual error occurred)
      showToast('There was an issue logging out, but you have been logged out of this device', 'info');

      // Return a consistent response object instead of throwing so callers can continue (e.g., navigate to home)
      return { message: 'There was an issue logging out, but you have been logged out of this device' };
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    sessionExpired,
    login,
    merchantLogin,
    merchantRegister,
    register,
    logout,
    checkAuthStatus,
    validateSession,
    handleSessionExpired,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
