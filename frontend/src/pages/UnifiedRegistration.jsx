

import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/registration.css'; 



const UnifiedRegistration = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('member');

  // User Registration State
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    plan: 'community',
    socialMediaFollowed: {
      facebook: false,
      instagram: false,
      youtube: false,
      whatsappChannel: false,
      whatsappGroup: false
    }
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userNotification, setUserNotification] = useState({ message: '', type: '' }); // legacy, remove after migration
  const { showNotification } = useNotification();
  const [userTermsAccepted, setUserTermsAccepted] = useState(false);

  // Merchant Registration State
  const [merchantForm, setMerchantForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: '',
    businessDescription: '',
    businessCategory: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    businessLicense: '',
    taxId: '',
    businessStreet: '',
    businessCity: '',
    businessState: '',
    businessZipCode: '',
    socialMediaFollowed: {
      facebook: false,
      instagram: false,
      youtube: false,
      whatsappChannel: false,
      whatsappGroup: false
    }
  });
  // Social media links config
  const socialMediaLinks = {
    facebook: {
      url: 'https://facebook.com/indiansinghana',
      name: 'Facebook Page',
      icon: 'fab fa-facebook'
    },
    instagram: {
      url: 'https://instagram.com/indians_in_ghana',
      name: 'Instagram',
      icon: 'fab fa-instagram'
    },
    youtube: {
      url: 'https://youtube.com/indiansinghana',
      name: 'YouTube Channel',
      icon: 'fab fa-youtube'
    },
    whatsappChannel: {
      url: 'https://whatsapp.com/channel/indiansinghana',
      name: 'WhatsApp Channel',
      icon: 'fab fa-whatsapp'
    },
    whatsappGroup: {
      url: 'https://chat.whatsapp.com/indiansinghana',
      name: 'WhatsApp Group',
      icon: 'fab fa-whatsapp'
    }
  };

  // Social media handlers
  const handleUserSocialChange = (platform) => {
    setUserForm(prev => ({
      ...prev,
      socialMediaFollowed: {
        ...prev.socialMediaFollowed,
        [platform]: !prev.socialMediaFollowed[platform]
      }
    }));
  };
  const handleMerchantSocialChange = (platform) => {
    setMerchantForm(prev => ({
      ...prev,
      socialMediaFollowed: {
        ...prev.socialMediaFollowed,
        [platform]: !prev.socialMediaFollowed[platform]
      }
    }));
  };
  const [merchantLoading, setMerchantLoading] = useState(false);
  // Removed legacy merchant notification state (migrated to global notification)
  const [merchantTermsAccepted, setMerchantTermsAccepted] = useState(false);

  const { register, merchantRegister } = useAuth();
  const navigate = useNavigate();

  // User Registration Handlers
  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userForm.fullName || !userForm.email || !userForm.password || !userForm.phone) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    // At least one social media must be followed
    const followedCount = Object.values(userForm.socialMediaFollowed).filter(Boolean).length;
    if (followedCount === 0) {
      showNotification('Please follow at least one of our social media channels to join the community.', 'error');
      return;
    }
    if (!userTermsAccepted) {
      showNotification('Please accept the terms and conditions', 'error');
      return;
    }
    setUserLoading(true);
    try {
      const result = await register({
        ...userForm,
        termsAccepted: userTermsAccepted
      });
      if (result.success) {
        showNotification('Registration successful!', 'success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        showNotification(result.message || 'Registration failed. Please try again.', 'error');
      }
    } catch (error) {
      showNotification('Registration failed. Please try again.', 'error');
    } finally {
      setUserLoading(false);
    }
  };

  // Merchant Registration Handlers
  const handleMerchantInputChange = (e) => {
    setMerchantForm({ ...merchantForm, [e.target.id]: e.target.value });
  };
  const validateMerchantForm = () => {
    if (!merchantForm.fullName || !merchantForm.email || !merchantForm.password) {
      showNotification('Please fill in all required personal information', 'error');
      return false;
    }
    if (!merchantForm.businessName || !merchantForm.businessCategory) {
      showNotification('Please fill in required business information', 'error');
      return false;
    }
    if (merchantForm.password !== merchantForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return false;
    }
    if (merchantForm.password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return false;
    }
    // At least one social media must be followed
    const followedCount = Object.values(merchantForm.socialMediaFollowed).filter(Boolean).length;
    if (followedCount === 0) {
      showNotification('Please follow at least one of our social media channels to register as a merchant.', 'error');
      return false;
    }
    if (!merchantTermsAccepted) {
      showNotification('Please accept the terms and conditions', 'error');
      return false;
    }
    return true;
  };
  const handleMerchantSubmit = async (e) => {
    e.preventDefault();
    if (!validateMerchantForm()) return;
    setMerchantLoading(true);
    try {
      // Compose business address as a string for DB
      const businessAddress = [
        merchantForm.businessStreet,
        merchantForm.businessCity,
        merchantForm.businessState,
        merchantForm.businessZipCode,
        'Ghana'
      ].filter(Boolean).join(', ');

      // Convert socialMediaFollowed object to array of followed platforms for backend
      const followedPlatforms = Object.entries(merchantForm.socialMediaFollowed)
        .filter(([_, followed]) => followed)
        .map(([platform]) => platform);

      const merchantData = {
        fullName: merchantForm.fullName,
        email: merchantForm.email,
        password: merchantForm.password,
        phone: merchantForm.phone,
        // Send as array for backend compatibility
        socialMediaFollowed: followedPlatforms,
        businessInfo: {
          businessName: merchantForm.businessName,
          businessDescription: merchantForm.businessDescription,
          businessCategory: merchantForm.businessCategory,
          businessPhone: merchantForm.businessPhone || merchantForm.phone,
          businessEmail: merchantForm.businessEmail || merchantForm.email,
          website: merchantForm.website,
          businessLicense: merchantForm.businessLicense,
          taxId: merchantForm.taxId,
          businessAddress // as string
        }
      };
      const response = await merchantRegister(merchantData);
      showNotification(response.message || 'Merchant account created successfully! Welcome to the platform.', 'success');
      setTimeout(() => {
        navigate('/merchant/dashboard');
      }, 1200);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setMerchantLoading(false);
    }
  };



  // Only user registration form is rendered (merchant login removed)
  return (
    <div className="registration-card unified-registration-card">
      <div className="registration-tabs unified-tabs">
        <button
          className={`tab-btn${activeTab === 'member' ? ' active' : ''}`}
          onClick={() => setActiveTab('member')}
        >
          <i className="fas fa-user"></i> Member Registration
        </button>
        <button
          className={`tab-btn${activeTab === 'merchant' ? ' active' : ''}`}
          onClick={() => setActiveTab('merchant')}
        >
          <i className="fas fa-store"></i> Merchant Registration
        </button>
        <div className={`slider ${activeTab}`}></div>
      </div>
      <div className={`registration-content ${activeTab}`}>
        <div className="registration-panels-container unified-panels">
          {/* Member Panel */}
          <div className="registration-panel unified-panel">
            <div className="registration-form-header unified-form-header">
              <h2><i className="fas fa-user-plus"></i> Join Our Community</h2>
              <p>Become a member of the Indians in Ghana community</p>
            </div>
            <div className="benefits-box unified-benefits-box">
              <h3>Member Benefits</h3>
              <ul>
                <li><i className="fas fa-id-card"></i> Digital membership card</li>
                <li><i className="fas fa-gift"></i> Access to exclusive deals</li>
                <li><i className="fas fa-users"></i> Community events & networking</li>
                <li><i className="fas fa-briefcase"></i> Business directory access</li>
              </ul>
            </div>
          </div>
          {/* Merchant Panel */}
          <div className="registration-panel unified-panel">
            <div className="registration-form-header unified-form-header">
              <h2><i className="fas fa-store"></i> Register Your Business</h2>
              <p>Connect with the Indian community and offer exclusive deals</p>
            </div>
            <div className="benefits-box unified-benefits-box">
              <h3>Business Benefits</h3>
              <ul>
                <li><i className="fas fa-users"></i> Direct access to community members</li>
                <li><i className="fas fa-tags"></i> Create and manage exclusive deals</li>
                <li><i className="fas fa-chart-line"></i> Business analytics and insights</li>
                <li><i className="fas fa-star"></i> Featured business listings</li>
                <li><i className="fas fa-headset"></i> Priority customer support</li>
              </ul>
            </div>
          </div>
        </div>
        {/* Animated Form Container */}
        <div className="registration-form-container unified-form-container">
          {activeTab === 'member' ? (
            <form onSubmit={handleUserSubmit} className="register-form">
              {/* Notification handled by Toast/NotificationContext */}
              <div className="form-section">
                <h3>Personal Information</h3>
                <div className="form-group">
                  <label htmlFor="fullName">Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={userForm.fullName}
                    onChange={handleUserInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address <span className="required">*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={userForm.email}
                    onChange={handleUserInputChange}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password <span className="required">*</span></label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={userForm.password}
                    onChange={handleUserInputChange}
                    placeholder="Create a strong password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number <span className="required">*</span></label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={userForm.phone}
                    onChange={handleUserInputChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={userForm.address}
                    onChange={handleUserInputChange}
                    placeholder="Enter your address"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="plan">Membership Plan</label>
                  <select
                    id="plan"
                    name="plan"
                    value={userForm.plan}
                    onChange={handleUserInputChange}
                  >
                    <option value="community">Community (Free)</option>
                    <option value="silver">Silver (50 GHS)</option>
                    <option value="gold">Gold (150 GHS)</option>
                  </select>
                </div>
              </div>
              {/* Social Media Section */}
              <div className="form-section">
                <h3><i className="fas fa-share-alt"></i> Community Connection (Required)</h3>
                <p style={{ marginBottom: '15px', color: '#666', fontSize: '0.9em' }}>
                  Please follow all of our social media channels to stay connected with the community. Check the box after following each platform.
                </p>
                {Object.entries(socialMediaLinks).map(([platform, info]) => (
                  <div key={platform} className="social-media-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    backgroundColor: userForm.socialMediaFollowed[platform] ? '#e8f5e8' : '#f9f9f9'
                  }}>
                    <input
                      type="checkbox"
                      id={platform}
                      checked={userForm.socialMediaFollowed[platform]}
                      onChange={() => handleUserSocialChange(platform)}
                      style={{ marginRight: '10px' }}
                    />
                    <i className={info.icon} style={{ marginRight: '10px', color: '#3b82f6', fontSize: '1.2em' }}></i>
                    <label htmlFor={platform} style={{ flex: 1, margin: 0, cursor: 'pointer' }}>
                      {info.name}
                    </label>
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '3px',
                        fontSize: '0.8em'
                      }}
                    >
                      Follow <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>
                ))}
                <small style={{ color: '#e74c3c', fontSize: '0.8em' }}>
                  * You must follow at least one social media channel to join our community
                </small>
              </div>
              <div className="form-section">
                <div className="form-group">
                  <div className="terms-checkbox">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={userTermsAccepted}
                      onChange={e => setUserTermsAccepted(e.target.checked)}
                      required
                    />
                    <label htmlFor="terms">
                      I accept the{' '}
                      <Link to="/terms" target="_blank" className="terms-link">
                        Terms and Conditions
                      </Link>
                      <span className="required">*</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className={`register-button ${userLoading ? 'loading' : ''}`}
                  disabled={userLoading}
                >
                  {userLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
              <div className="form-footer">
                <p>
                  Already have an account?{' '}
                  <Link to="/login" className="login-link">
                    Login here
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMerchantSubmit} className="register-form">
              {/* Notification handled by Toast/NotificationContext */}
              {/* Personal Information */}
              <div className="form-section">
                <h3><i className="fas fa-user"></i> Personal Information</h3>
                <div className="form-group">
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    value={merchantForm.fullName}
                    onChange={handleMerchantInputChange}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      value={merchantForm.email}
                      onChange={handleMerchantInputChange}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      value={merchantForm.phone}
                      onChange={handleMerchantInputChange}
                      placeholder="+233 XX XXX XXXX"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="password">Password *</label>
                    <input
                      type="password"
                      id="password"
                      value={merchantForm.password}
                      onChange={handleMerchantInputChange}
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password *</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={merchantForm.confirmPassword}
                      onChange={handleMerchantInputChange}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>
              </div>
              {/* Social Media Section */}
              <div className="form-section">
                <h3><i className="fas fa-share-alt"></i> Community Connection (Required)</h3>
                <p style={{ marginBottom: '15px', color: '#666', fontSize: '0.9em' }}>
                  Please follow all of our social media channels to stay connected with the community. Check the box after following each platform.
                </p>
                {Object.entries(socialMediaLinks).map(([platform, info]) => (
                  <div key={platform} className="social-media-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    backgroundColor: merchantForm.socialMediaFollowed[platform] ? '#e8f5e8' : '#f9f9f9'
                  }}>
                    <input
                      type="checkbox"
                      id={platform}
                      checked={merchantForm.socialMediaFollowed[platform]}
                      onChange={() => handleMerchantSocialChange(platform)}
                      style={{ marginRight: '10px' }}
                    />
                    <i className={info.icon} style={{ marginRight: '10px', color: '#3b82f6', fontSize: '1.2em' }}></i>
                    <label htmlFor={platform} style={{ flex: 1, margin: 0, cursor: 'pointer' }}>
                      {info.name}
                    </label>
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '3px',
                        fontSize: '0.8em'
                      }}
                    >
                      Follow <i className="fas fa-external-link-alt"></i>
                    </a>
                  </div>
                ))}
                <small style={{ color: '#e74c3c', fontSize: '0.8em' }}>
                  * You must follow at least one social media channel to register as a merchant
                </small>
              </div>
              {/* Business Information */}
              <div className="form-section">
                <h3><i className="fas fa-building"></i> Business Information</h3>
                <div className="form-group">
                  <label htmlFor="businessName">Business Name *</label>
                  <input
                    type="text"
                    id="businessName"
                    value={merchantForm.businessName}
                    onChange={handleMerchantInputChange}
                    placeholder="Your business name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="businessDescription">Business Description</label>
                  <textarea
                    id="businessDescription"
                    value={merchantForm.businessDescription}
                    onChange={handleMerchantInputChange}
                    placeholder="Brief description of your business"
                    rows="3"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="businessCategory">Business Category *</label>
                    <select
                      id="businessCategory"
                      value={merchantForm.businessCategory}
                      onChange={handleMerchantInputChange}
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="restaurant">Restaurant & Food</option>
                      <option value="retail">Retail & Shopping</option>
                      <option value="services">Professional Services</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="technology">Technology</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="businessPhone">Business Phone</label>
                    <input
                      type="tel"
                      id="businessPhone"
                      value={merchantForm.businessPhone}
                      onChange={handleMerchantInputChange}
                      placeholder="Business phone number"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="businessEmail">Business Email</label>
                    <input
                      type="email"
                      id="businessEmail"
                      value={merchantForm.businessEmail}
                      onChange={handleMerchantInputChange}
                      placeholder="business@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="website">Website (Optional)</label>
                    <input
                      type="url"
                      id="website"
                      value={merchantForm.website}
                      onChange={handleMerchantInputChange}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="businessLicense">Business License # (Optional)</label>
                    <input
                      type="text"
                      id="businessLicense"
                      value={merchantForm.businessLicense}
                      onChange={handleMerchantInputChange}
                      placeholder="Business license number"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="taxId">Tax ID (Optional)</label>
                    <input
                      type="text"
                      id="taxId"
                      value={merchantForm.taxId}
                      onChange={handleMerchantInputChange}
                      placeholder="Business tax ID"
                    />
                  </div>
                </div>
              </div>
              {/* Business Address */}
              <div className="form-section">
                <h3><i className="fas fa-map-marker-alt"></i> Business Address</h3>
                <div className="form-group">
                  <label htmlFor="businessStreet">Street Address</label>
                  <input
                    type="text"
                    id="businessStreet"
                    value={merchantForm.businessStreet}
                    onChange={handleMerchantInputChange}
                    placeholder="Street address"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="businessCity">City</label>
                    <input
                      type="text"
                      id="businessCity"
                      value={merchantForm.businessCity}
                      onChange={handleMerchantInputChange}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="businessState">State/Region</label>
                    <input
                      type="text"
                      id="businessState"
                      value={merchantForm.businessState}
                      onChange={handleMerchantInputChange}
                      placeholder="State or Region"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="businessZipCode">Postal Code</label>
                    <input
                      type="text"
                      id="businessZipCode"
                      value={merchantForm.businessZipCode}
                      onChange={handleMerchantInputChange}
                      placeholder="Postal/Zip code"
                    />
                  </div>
                </div>
              </div>
              {/* Terms and Conditions */}
              <div className="form-section">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={merchantTermsAccepted}
                    onChange={e => setMerchantTermsAccepted(e.target.checked)}
                    required
                  />
                  <span className="checkmark"></span>
                  I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link> for merchants
                </label>
                <button
                  type="submit"
                  className="register-btn"
                  disabled={merchantLoading}
                >
                  <i className="fas fa-store"></i> {merchantLoading ? 'Creating Account...' : 'Register as Merchant'}
                </button>
                <p style={{ textAlign: 'center', marginTop: '20px' }}>
                  Already have a merchant account? <Link to="/login">Login here</Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedRegistration;
