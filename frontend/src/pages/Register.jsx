import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator/PasswordStrengthIndicator';
import { useDynamicFields } from '../hooks/useDynamicFields';

function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    dob: '',
    community: '',
    country: 'Ghana',
    state: '',
    city: '',
    userCategory: '',
    plan: 'community',
    profilePhoto: ''
  });
  
  // Dynamic data from backend
  const [communities, setCommunities] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  
  // Use dynamic fields hook
  const { 
    dynamicFields, 
    isLoading: fieldsLoading, 
    getCommunityOptions, 
    getCountryOptions, 
    getStateOptions 
  } = useDynamicFields();
  // Social media tracking
  const [socialMedia, setSocialMedia] = useState({});
  const [socialMediaSettings, setSocialMediaSettings] = useState({});
  
  // Terms and conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const { register, isAuthenticated, error, clearError } = useAuth();
  const navigate = useNavigate();
  // Load dynamic data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch communities
        const communitiesResponse = await api.get('/admin/communities');
        setCommunities(communitiesResponse.data.communities || []);
        
        // Fetch membership plans
        const plansResponse = await api.get('/admin/plans');
        const plansData = {};
        if (plansResponse.data.plans) {
          plansResponse.data.plans.forEach(plan => {
            plansData[plan.type] = {
              name: plan.name,
              price: plan.price,
              currency: plan.currency,
              features: plan.features ? plan.features.split(',') : [],
              dealAccess: plan.dealAccess,
              duration: plan.duration
            };
          });
          setMembershipPlans(plansData);
        }

        // Fetch social media settings
        const socialResponse = await api.get('/admin/settings/public');
        if (socialResponse.data.success) {
          setSocialMediaSettings(socialResponse.data.settings.socialMediaRequirements || {});
          
          // Initialize social media state based on required platforms
          const initialSocialState = {};
          const socialReqs = socialResponse.data.settings.socialMediaRequirements || {};
          Object.keys(socialReqs).forEach(platform => {
            if (socialReqs[platform] && typeof socialReqs[platform] === 'object' && socialReqs[platform].url) {
              initialSocialState[platform] = false;
            }
          });
          setSocialMedia(initialSocialState);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading registration data. Using defaults.', 'warning');
        
        // Fallback to hardcoded values
        setCommunities(['Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Other']);
        setMembershipPlans({
          community: { 
            name: 'Community Plan', 
            price: 0, 
            currency: 'FREE',
            features: ['Basic directory access', 'Community updates', 'Basic support'],
            dealAccess: 'Limited community deals'
          },
          silver: { 
            name: 'Silver Plan', 
            price: 50, 
            currency: 'GHS',
            features: ['All community features', 'Priority support', 'Exclusive deals', 'Event notifications'],
            dealAccess: 'Silver + Community deals'
          },
          gold: { 
            name: 'Gold Plan', 
            price: 150, 
            currency: 'GHS',
            features: ['All silver features', 'VIP events', 'Premium support', 'Business networking', 'Priority customer service'],
            dealAccess: 'All exclusive deals'
          }
        });
      } finally {
        setLoadingData(false);
      }
    };
    
    loadData();
  }, []);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  // Clear errors when component mounts
  useEffect(() => {
    if (clearError) {
      clearError();
    }
  }, [clearError]); // Include clearError since it's now stable with useCallback

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

  const handleSocialMediaChange = (platform) => {
    setSocialMedia({
      ...socialMedia,
      [platform]: !socialMedia[platform]
    });
  };

  const handlePlanChange = (planType) => {
    setFormData({
      ...formData,
      plan: planType
    });
  };  const validateForm = () => {
    // Basic field validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.phone || !formData.address) {
      showNotification('Please fill in all required fields.', 'error');
      return false;
    }

    // User category validation
    if (!formData.userCategory) {
      showNotification('Please select your category.', 'error');
      return false;
    }

    // Date of birth validation
    if (!formData.dob) {
      showNotification('Please enter your date of birth.', 'error');
      return false;
    }

    // Community validation
    if (!formData.community) {
      showNotification('Please select your community.', 'error');
      return false;
    }

    // Location validation
    if (!formData.city || !formData.state) {
      showNotification('Please enter your city and state/region.', 'error');
      return false;
    }

    // Password validation
    const passwordCriteria = {
      hasMinLength: formData.password.length >= 6,
      hasMaxLength: formData.password.length <= 20,
      hasNumber: /\d/.test(formData.password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
      hasLowercase: /[a-z]/.test(formData.password),
      hasUppercase: /[A-Z]/.test(formData.password),
      onlyLatin: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(formData.password)
    };
    
    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
    
    if (!isPasswordValid) {
      const failedCriteria = [];
      if (!passwordCriteria.hasMinLength) failedCriteria.push('At least 6 characters');
      if (!passwordCriteria.hasMaxLength) failedCriteria.push('Maximum 20 characters');
      if (!passwordCriteria.hasNumber) failedCriteria.push('One number');
      if (!passwordCriteria.hasSymbol) failedCriteria.push('One symbol');
      if (!passwordCriteria.hasLowercase) failedCriteria.push('One lowercase letter');
      if (!passwordCriteria.hasUppercase) failedCriteria.push('One uppercase letter');
      if (!passwordCriteria.onlyLatin) failedCriteria.push('Only Latin letters and symbols');
      
      showNotification(`Password requirements: ${failedCriteria.join(', ')}`, 'error');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showNotification('Please enter a valid email address.', 'error');
      return false;
    }

    // Age validation (must be 18 or older)
    const birthDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      showNotification('You must be at least 18 years old to register.', 'error');
      return false;
    }

    // Terms validation
    if (!termsAccepted) {
      showNotification('Please accept the terms and conditions to continue.', 'error');
      return false;
    }

    // Social media validation (at least one must be followed)
    const followedCount = Object.values(socialMedia).filter(Boolean).length;
    if (followedCount === 0) {
      showNotification('Please follow at least one of our social media channels to join the community.', 'error');
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
      // Prepare registration data
      const registrationData = {
        ...formData,
        socialMediaFollowed: socialMedia
      };

      const result = await register(registrationData);
      if (result.success) {
        showNotification('Registration successful! Your account is pending approval.', 'success');
        setTimeout(() => navigate('/'), 2000);
      } else {
        showNotification(result.error, 'error');
      }
    } catch (error) {
      showNotification('An error occurred during registration. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page active unified-register-page">
      <div className="registration-card unified-registration-card">
        <div className="registration-tabs unified-tabs">
          <button 
            className="tab-btn active"
            onClick={() => {}}
          >
            <i className="fas fa-user"></i> Member Registration
          </button>
          <Link to="/merchant/register" className="tab-btn">
            <i className="fas fa-store"></i> Merchant Registration
          </Link>
          <div className="slider member"></div>
        </div>
        <div className="registration-content member unified-content">
          <div className="registration-panels-container unified-panels">
            <div className="registration-panel unified-panel">
              <div className="registration-form-header unified-form-header">
                <h2><i className="fas fa-user-plus"></i> Join Our Community</h2>
                <p>Become a member of the Indians in Ghana community</p>
              </div>
              <div className="registration-image-container unified-image-container">
                <img 
                  src="https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" 
                  alt="Member Registration" 
                  className="registration-image unified-image"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/600x400?text=Member+Registration';
                  }}
                />
                <div className="benefits-box unified-benefits-box">
                  <h3>Member Benefits</h3>
                  <ul>
                    <li><i className="fas fa-id-card"></i> Digital membership card</li>
                    <li><i className="fas fa-tags"></i> Exclusive deals and discounts</li>
                    <li><i className="fas fa-calendar-alt"></i> Priority access to events</li>
                    <li><i className="fas fa-handshake"></i> Business networking opportunities</li>
                  </ul>
                </div>
              </div>

              {/* Notification */}
              {(notification.message || error) && (
                <div className={`notification ${notification.type || 'error'}`}>
                  <span>{notification.message || error}</span>
                  <button onClick={() => {
                    setNotification({ message: '', type: '' });
                    if (clearError) {
                      clearError();
                    }
                  }}>×</button>
                </div>
              )}

              <p style={{ marginBottom: '20px' }}>
                Join our growing community of members to access exclusive benefits and connect with fellow Indians in Ghana.
              </p>
              
              <form onSubmit={handleSubmit}>
                {/* Basic Information */}                <div className="form-section unified-form-section">
                  <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>
                    <i className="fas fa-user"></i> Personal Information
                  </h3>
                  
                  <div className="form-group">
                    <label htmlFor="userCategory">I'm a *</label>
                    <select 
                      id="userCategory" 
                      value={formData.userCategory}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="student">Student</option>
                      <option value="housewife">Housewife</option>
                      <option value="working_professional">Working Professional</option>
                      <option value="others">Others</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name *</label>
                    <input 
                      type="text" 
                      id="fullName" 
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name" 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input 
                      type="email" 
                      id="email" 
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email address" 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Create Password *</label>
                    <input 
                      type="password" 
                      id="password" 
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a strong password" 
                      required 
                    />
                    <PasswordStrengthIndicator 
                      password={formData.password} 
                      showCriteria={true} 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Mobile Number (Ghana) *</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g., +233 24 123 4567" 
                      required 
                    />
                  </div>                  <div className="form-group">
                    <label htmlFor="address">Ghana Address *</label>
                    <input 
                      type="text" 
                      id="address" 
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your full address in Ghana" 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dob">Date of Birth *</label>
                    <input 
                      type="date" 
                      id="dob" 
                      value={formData.dob}
                      onChange={handleInputChange}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      required 
                    />
                    <small style={{ color: '#666' }}>You must be at least 18 years old</small>
                  </div>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="city">City *</label>
                      <input 
                        type="text" 
                        id="city" 
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="e.g., Accra, Kumasi, Tamale" 
                        required 
                      />
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="state">State/Region *</label>
                      <select 
                        id="state" 
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        disabled={fieldsLoading}
                      >
                        <option value="">
                          {fieldsLoading ? 'Loading states...' : 'Select State/Region'}
                        </option>
                        {getStateOptions().map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '15px' }}>                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="community">Community/Background *</label>
                      <select 
                        id="community" 
                        value={formData.community}
                        onChange={handleInputChange}
                        required
                        disabled={fieldsLoading}
                      >
                        <option value="">
                          {fieldsLoading ? 'Loading communities...' : 'Select Community'}
                        </option>
                        {getCommunityOptions().map((community) => (
                          <option key={community.value} value={community.value}>
                            {community.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="country">Country *</label>
                      <select 
                        id="country" 
                        value={formData.country}
                        onChange={handleInputChange}
                        required
                        disabled={fieldsLoading}
                      >
                        <option value="">
                          {fieldsLoading ? 'Loading countries...' : 'Select Country'}
                        </option>
                        {getCountryOptions().map((country) => (
                          <option key={country.value} value={country.value}>
                            {country.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="profilePhoto">Profile Photo URL (Optional)</label>
                    <input 
                      type="url" 
                      id="profilePhoto" 
                      value={formData.profilePhoto}
                      onChange={handleInputChange}
                      placeholder="Enter profile photo URL" 
                    />
                    <small style={{ color: '#666' }}>You can upload a photo and paste the URL here</small>
                  </div>
                </div>                {/* Social Media Section */}
                {Object.keys(socialMediaSettings).length > 0 && (
                  <div className="form-section" style={{ marginTop: '30px' }}>
                    <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>
                      <i className="fas fa-share-alt"></i> Community Connection (Required)
                    </h3>
                    <p style={{ marginBottom: '15px', color: '#666', fontSize: '0.9em' }}>
                      Please follow all of our social media channels to stay connected with the community. Check the box after following each platform.
                    </p>
                    
                    {Object.entries(socialMediaSettings).map(([platform, settings]) => {
                      if (!settings || !settings.url) return null;
                      
                      const getIcon = (platform) => {
                        switch(platform) {
                          case 'facebook': return 'fab fa-facebook';
                          case 'instagram': return 'fab fa-instagram';
                          case 'youtube': return 'fab fa-youtube';
                          case 'whatsapp_channel': return 'fab fa-whatsapp';
                          case 'whatsappChannel': return 'fab fa-whatsapp';
                          case 'whatsappGroup': return 'fab fa-whatsapp';
                          default: return 'fas fa-link';
                        }
                      };

                      const getName = (platform, settings) => {
                        return settings.display?.name || platform.charAt(0).toUpperCase() + platform.slice(1);
                      };

                      return (
                        <div key={platform} className="social-media-item" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          marginBottom: '10px', 
                          padding: '10px', 
                          border: '1px solid #ddd', 
                          borderRadius: '5px',
                          backgroundColor: socialMedia[platform] ? '#e8f5e8' : '#f9f9f9'
                        }}>
                          <input 
                            type="checkbox" 
                            id={platform}
                            checked={socialMedia[platform] || false}
                            onChange={() => handleSocialMediaChange(platform)}
                            style={{ marginRight: '10px' }}
                          />
                          <i className={getIcon(platform)} style={{ marginRight: '10px', color: '#3b82f6', fontSize: '1.2em' }}></i>
                          <label htmlFor={platform} style={{ flex: 1, margin: 0, cursor: 'pointer' }}>
                            {getName(platform, settings)}
                          </label>
                          <a 
                            href={settings.url} 
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
                      );
                    })}
                    <small style={{ color: '#e74c3c', fontSize: '0.8em' }}>
                      * You must follow all our social media channels to join our community
                    </small>
                  </div>
                )}

                {/* Membership Plan Selection */}
                <div className="form-section" style={{ marginTop: '30px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>
                    <i className="fas fa-crown"></i> Select Membership Plan
                  </h3>
                    <div className="plan-selection">
                    {loadingData ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        <i className="fas fa-spinner fa-spin"></i> Loading membership plans...
                      </div>
                    ) : Object.keys(membershipPlans).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c' }}>
                        <i className="fas fa-exclamation-triangle"></i> No membership plans available
                      </div>
                    ) : (
                      Object.entries(membershipPlans).map(([planType, plan]) => (
                      <div key={planType} className="plan-option" style={{
                        border: formData.plan === planType ? '2px solid #3b82f6' : '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '15px',
                        cursor: 'pointer',
                        backgroundColor: formData.plan === planType ? '#f0f7ff' : 'white',
                        transition: 'all 0.3s ease'
                      }} onClick={() => handlePlanChange(planType)}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                          <input 
                            type="radio" 
                            name="plan"
                            value={planType}
                            checked={formData.plan === planType}
                            onChange={() => handlePlanChange(planType)}
                            style={{ marginRight: '10px' }}
                          />
                          <h4 style={{ margin: 0, color: '#2c3e50' }}>{plan.name}</h4>
                          <span style={{ 
                            marginLeft: 'auto', 
                            fontSize: '1.2em', 
                            fontWeight: 'bold',
                            color: plan.price === 0 ? '#27ae60' : '#e74c3c'
                          }}>
                            {plan.price === 0 ? plan.currency : `${plan.currency} ${plan.price}`}
                          </span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Features:</strong>
                          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                            {plan.features.map((feature, index) => (
                              <li key={index} style={{ fontSize: '0.9em', color: '#666' }}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#3b82f6' }}>
                          <strong>Deal Access:</strong> {plan.dealAccess}
                        </div>
                        {plan.price > 0 && (
                          <div style={{ fontSize: '0.8em', color: '#e74c3c', marginTop: '5px' }}>                            * Payment required after registration
                          </div>
                        )}
                      </div>
                    )))}
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="form-section" style={{ marginTop: '30px' }}>
                  <div className="checkbox-container">
                    <input 
                      type="checkbox" 
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      required
                    />
                    <span className="checkmark"></span>
                    <label htmlFor="terms" style={{ flex: 1, margin: 0, cursor: 'pointer', fontSize: '0.9em' }}>
                      I agree to the <a href="/terms" target="_blank" style={{ color: '#3b82f6' }}>Terms and Conditions</a> and 
                      <a href="/privacy" target="_blank" style={{ color: '#3b82f6' }}> Privacy Policy</a>. 
                      I understand that my account will be reviewed and approved by an administrator before activation.
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px', fontSize: '0.9em' }}>
                  <i className="fas fa-info-circle" style={{ color: '#1976d2', marginRight: '5px' }}></i>
                  <strong>What happens next?</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>Your account will be created and pending approval</li>
                    <li>An administrator will review your registration</li>
                    <li>You'll receive an email notification when approved</li>
                    <li>For paid plans, payment instructions will be provided</li>
                    <li>Once approved and payment is confirmed, you'll receive your digital membership card</li>
                  </ul>
                </div>

                <button type="submit" className="btn btn-success btn-block" disabled={loading} style={{ marginTop: '25px' }}>
                  <i className="fas fa-check-circle"></i> {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>

                <div className="form-footer" style={{ marginTop: '15px', textAlign: 'center' }}>
                  <p>Already have an account? <Link to="/login">Login here</Link></p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
