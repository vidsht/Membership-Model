import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/global.css';
const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 3000);
  };

  const handleLogout = async () => {
    try {
      const response = await logout();
      showNotification(response.message || 'Logged out successfully!', 'success');
      navigate('/');
    } catch (error) {
      showNotification('Error logging out. Please try again.', 'error');
    }
  };

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <header className={scrolled ? 'scrolled' : ''}>
      <div className="header-content">
        <div className="logo">
          <img 
            src="/logo1.jpeg" 
            alt="logo" 
            className="logo-img"
          />
        </div>
            
        <nav className="main-nav">
          <ul>
            <li><Link to="/" className={isActive('/')}>Home</Link></li>
            <li><Link to="/deals" className={isActive('/deals')}><i className="fas fa-tags nav-icon"></i> Deals</Link></li>
            {isAuthenticated && (
              <>
                <li><Link to="/dashboard" className={isActive('/dashboard')}>
                  <i className="fas fa-columns nav-icon"></i> Dashboard
                </Link></li>
                <li><Link to="/settings" className={isActive('/settings')}>
                  <i className="fas fa-user-cog nav-icon"></i> Settings
                </Link></li>
              </>
            )}
            {/* Business Directory and Merchant options */}
            <li className="dropdown">
              <div className="dropdown">
                <i className="fas fa-store nav-icon"></i> Business <i className="fas fa-chevron-down dropdown-arrow"></i>
              </div>
              <ul className="dropdown-menu">
                <li><Link to="/business-directory"><i className="fas fa-building"></i> Business Directory</Link></li>
                {!isAuthenticated && (
                  <>
                    <li><Link to="/login"><i className="fas fa-sign-in-alt"></i> Business Login</Link></li>
                    <li><Link to="/unified-registration"><i className="fas fa-plus-circle"></i> Register Business</Link></li>
                  </>
                )}
              </ul>
            </li>

            <li><Link to="/about" className={isActive('/about')}>About Us</Link></li>
            <li><Link to="/contact" className={isActive('/contact')}>Contact</Link></li>
            
            {/* Admin/Merchant specific links */}
            {isAuthenticated && user?.userType === 'merchant' && (
              <li><Link to="/merchant-dashboard" className={`${isActive('/merchant-dashboard')} merchant-link`}>
                <i className="fas fa-store-alt nav-icon"></i> Merchant Panel
              </Link></li>
            )}
            {isAuthenticated && user?.userType === 'admin' && (
              <li><Link to="/admin" className={`${isActive('/admin')} admin-link`}>
                <i className="fas fa-shield-alt nav-icon"></i> Admin Panel
              </Link></li>
            )}
          </ul>
        </nav>
        
        <div className="auth-buttons">
          {isAuthenticated ? (
            <div className="auth-btn logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </div>
          ) : (
            <Link to="/login" className="auth-btn login-btn">
              <i className="fas fa-sign-in-alt"></i> Member Login
            </Link>
          )}
        </div>
      </div>
      
      {/* Notification */}
      {notification.message && (
        <div className={`notification show ${notification.type}`}>
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : notification.type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
          {notification.message}
        </div>
      )}
    </header>
  );
};

export default Header;
