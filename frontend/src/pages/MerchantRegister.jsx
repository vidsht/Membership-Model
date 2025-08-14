import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/registration.css';

const MerchantRegister = () => {
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    bloodGroup: '',
    
    // Business Information
    businessName: '',
    businessDescription: '',
    businessCategory: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    businessLicense: '',
    taxId: '',
    
    // Business Address
    businessStreet: '',
    businessCity: '',
    businessState: '',
    businessZipCode: ''
  });
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const { merchantRegister, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      showNotification('Please fill in all required personal information', 'error');
      return false;
    }

    if (!formData.businessName || !formData.businessCategory) {
      showNotification('Please fill in required business information', 'error');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return false;
    }

    if (formData.password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return false;
    }

    if (!termsAccepted) {
      showNotification('Please accept the terms and conditions', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const merchantData = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        businessInfo: {
          businessName: formData.businessName,
          businessDescription: formData.businessDescription,
          businessCategory: formData.businessCategory,
          businessPhone: formData.businessPhone || formData.phone,
          businessEmail: formData.businessEmail || formData.email,
          website: formData.website,
          businessLicense: formData.businessLicense,
          taxId: formData.taxId,
          businessAddress: {
            street: formData.businessStreet,
            city: formData.businessCity,
            state: formData.businessState,
            zipCode: formData.businessZipCode,
            country: 'Ghana'
          }
        }
      };      
      const response = await merchantRegister(merchantData);
      
      const successMessage = response.message || 'Merchant account created successfully! Welcome to the platform.';
      showNotification(successMessage, 'success');
      
      // Redirect after successful registration
      setTimeout(() => {
        navigate('/merchant/dashboard');
      }, 2000);

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page active">
      <div className="registration-card">
        <div className="registration-tabs">
          <Link to="/register" className="tab-btn">
            <i className="fas fa-user"></i> Member Registration
          </Link>
          <button 
            className="tab-btn active"
            onClick={() => {}}
          >
            <i className="fas fa-store"></i> Merchant Registration
          </button>
          <div className="slider merchant"></div>
        </div>
        
        <div className="registration-content merchant">
          <div className="registration-panels-container">
            <div className="registration-panel">
              <div className="registration-form-header">
                <h2><i className="fas fa-user-plus"></i> Join Our Community</h2>
                <p>Become a member of the Indians in Ghana community</p>
              </div>
            </div>
            
            <div className="registration-panel">
              <div className="registration-form-header">
                <h2><i className="fas fa-store"></i> Register Your Business</h2>
                <p>Connect with the Indian community and offer exclusive deals</p>
              </div>
              
              <div className="registration-image-container">
                <img 
                  src="https://images.unsplash.com/photo-1521791055366-0d553872125f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1169&q=80" 
                  alt="Merchant Registration" 
                  className="registration-image"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/600x400?text=Business+Registration';
                  }}
                />
                
                <div className="benefits-box">
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
          </div>
          
          <div className="registration-form-container">
            {/* Notification */}
            {notification.message && (
              <div className={`notification ${notification.type || 'info'}`}>
                <span>{notification.message}</span>
                <button onClick={() => setNotification({ message: '', type: '' })}>×</button>
              </div>
            )}

            <div className="merchant-form-container">
              <form onSubmit={handleSubmit}>
                {/* Personal Information */}
                <div className="form-section">
                  <h3><i className="fas fa-user"></i> Personal Information</h3>
                  
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name *</label>
                    <input 
                      type="text" 
                      id="fullName" 
                      value={formData.fullName}
                      onChange={handleInputChange}
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
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com" 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input 
                        type="tel" 
                        id="phone" 
                        value={formData.phone}
                        onChange={handleInputChange}
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
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="At least 6 characters" 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm Password *</label>
                      <input 
                        type="password" 
                        id="confirmPassword" 
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your password" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="bloodGroup">Blood Group</label>
                    <select
                      id="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleInputChange}
                    >
                      <option value="">Select blood group (optional)</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                {/* Business Information */}
                <div className="form-section">
                  <h3><i className="fas fa-building"></i> Business Information</h3>
                  
                  <div className="form-group">
                    <label htmlFor="businessName">Business Name *</label>
                    <input 
                      type="text" 
                      id="businessName" 
                      value={formData.businessName}
                      onChange={handleInputChange}
                      placeholder="Your business name" 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="businessDescription">Business Description</label>
                    <textarea 
                      id="businessDescription" 
                      value={formData.businessDescription}
                      onChange={handleInputChange}
                      placeholder="Brief description of your business"
                      rows="3"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="businessCategory">Business Category *</label>
                      <select 
                        id="businessCategory" 
                        value={formData.businessCategory}
                        onChange={handleInputChange}
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
                        value={formData.businessPhone}
                        onChange={handleInputChange}
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
                        value={formData.businessEmail}
                        onChange={handleInputChange}
                        placeholder="business@example.com" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="website">Website (Optional)</label>
                      <input 
                        type="url" 
                        id="website" 
                        value={formData.website}
                        onChange={handleInputChange}
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
                        value={formData.businessLicense}
                        onChange={handleInputChange}
                        placeholder="Business license number" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="taxId">Tax ID (Optional)</label>
                      <input 
                        type="text" 
                        id="taxId" 
                        value={formData.taxId}
                        onChange={handleInputChange}
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
                      value={formData.businessStreet}
                      onChange={handleInputChange}
                      placeholder="Street address" 
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="businessCity">City</label>
                      <input 
                        type="text" 
                        id="businessCity" 
                        value={formData.businessCity}
                        onChange={handleInputChange}
                        placeholder="City" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="businessState">State/Region</label>
                      <input 
                        type="text" 
                        id="businessState" 
                        value={formData.businessState}
                        onChange={handleInputChange}
                        placeholder="State or Region" 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="businessZipCode">Postal Code</label>
                      <input 
                        type="text" 
                        id="businessZipCode" 
                        value={formData.businessZipCode}
                        onChange={handleInputChange}
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
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      required 
                    />
                    <span className="checkmark"></span>
                    I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link> for merchants
                  </label>

                  <button 
                    type="submit" 
                    className="register-btn" 
                    disabled={loading}
                  >
                    <i className="fas fa-store"></i> {loading ? 'Creating Account...' : 'Register as Merchant'}
                  </button>
                  
                  <p style={{ textAlign: 'center', marginTop: '20px' }}>
                    Already have a merchant account? <Link to="/login">Login here</Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantRegister;
