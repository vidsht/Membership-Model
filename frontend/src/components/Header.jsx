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
  const [headerHidden, setHeaderHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);

  useEffect(() => {
    let lastScroll = window.pageYOffset || 0;
    let ticking = false;

    const onScroll = () => {
      const current = window.pageYOffset || 0;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          // small threshold to avoid jitter
          const delta = Math.abs(current - lastScroll);
          if (delta > 5) {
            // if scrolling down and passed a small threshold, hide header
            if (current > lastScroll && current > 100) {
              setHeaderHidden(true);
            } else {
              // scrolling up -> show header
              setHeaderHidden(false);
            }

            // simple scrolled state for styling when page is not at top
            setScrolled(current > 10);
            lastScroll = current <= 0 ? 0 : current;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menus when navigating
  useEffect(() => {
    setMobileOpen(false);
    setBusinessOpen(false);
  }, [location.pathname]);

  const toggleMobile = () => {
    setMobileOpen(prev => !prev);
  };

  const toggleBusiness = (e) => {
    // On mobile, toggle dropdown on click. On desktop, keep hover behavior.
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      e.stopPropagation();
      setBusinessOpen(prev => !prev);
    }
  };

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
    <header className={`${scrolled ? 'scrolled' : ''} ${headerHidden ? 'header--hidden' : 'header--visible'}`.trim()}>
      <div className="header-content">
        <div className="logo">
          <Link to="/" aria-label="Home">
            <img 
              src="/logo1.png" 
              alt="logo" 
              className="logo-img"
            />
          </Link>
        </div>
            
        {/* Centered auth on mobile; stays to the right on desktop */}
        <div className="auth-buttons">
          {isAuthenticated ? (
            <div className="logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </div>
          ) : (
            <Link to="/login" className="auth-btn login-btn">
              <i className="fas fa-sign-in-alt"></i> Member Login
            </Link>
          )}
        </div>

        {/* Hamburger for mobile - visible via CSS on small screens */}
        <button className={`hamburger ${mobileOpen ? 'open' : ''}`} aria-label="Toggle navigation" onClick={toggleMobile}>
          <span className="line" />
          <span className="line" />
          <span className="line" />
        </button>
        
        <nav className={`main-nav ${mobileOpen ? 'open' : ''}`}>
          <ul>
            <li><Link to="/" className={isActive('/')}>Home</Link></li>
            <li><Link to="/deals" className={isActive('/deals')}><i className="fas fa-tags nav-icon"></i> Deals</Link></li>
            {/* Business Directory link (no dropdown) */}
            <li>
              <Link to="/business-directory" className={isActive('/business-directory')}>
                <i className="fas fa-store nav-icon"></i> Business
              </Link>
            </li>
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

            {/* <li><Link to="/about" className={isActive('/about')}>About Us</Link></li>
            <li><Link to="/contact" className={isActive('/contact')}>Contact</Link></li> */}
            
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
        
        {/* end header-content children */}
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
