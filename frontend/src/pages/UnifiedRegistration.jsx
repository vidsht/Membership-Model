import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/registration.css';



const UnifiedRegistration = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('member');

  // User Registration State
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    dob: '',
    userCategory: '', // "I'm a *" field
    community: '',
    country: 'Ghana',
    state: '',
    city: '',
    plan: '',
    bloodGroup: '',
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
  
  // Dynamic dropdown options and settings
  const [communities, setCommunities] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [userPlans, setUserPlans] = useState([]);
  const [merchantPlans, setMerchantPlans] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [adminSettings, setAdminSettings] = useState({
    socialMediaRequirements: {},
    content: { terms_conditions: '' },
    features: {},
    cardSettings: {}
  });

  // Merchant Registration State
  const [merchantForm, setMerchantForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    plan: '', // Add plan selection for merchants
    bloodGroup: '',
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
  
  // Social media links config - now dynamic from admin settings
  const getSocialMediaLinks = () => {
    const links = {};
    const requirements = adminSettings.socialMediaRequirements || {};
    
    Object.keys(requirements).forEach(platform => {
      if (requirements[platform].url) {
        links[platform] = {
          url: requirements[platform].url,
          name: getSocialPlatformName(platform),
          icon: getSocialPlatformIcon(platform),
          required: requirements[platform].required || false
        };
      }
    });
    
    return links;
  };
  
  const getSocialPlatformName = (platform) => {
    const names = {
      facebook: 'Facebook Page',
      instagram: 'Instagram',
      youtube: 'YouTube Channel',
      whatsappChannel: 'WhatsApp Channel',
      whatsappGroup: 'WhatsApp Group'
    };
    return names[platform] || platform;
  };
    const getSocialPlatformIcon = (platform) => {
    const icons = {
      facebook: 'fab fa-facebook',
      instagram: 'fab fa-instagram',
      youtube: 'fab fa-youtube',
      whatsappChannel: 'fab fa-whatsapp',
      whatsappGroup: 'fab fa-whatsapp'
    };
    return icons[platform] || 'fas fa-link';
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
  };  // Fetch dropdown options on component mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        const [communitiesResponse, userTypesResponse, userPlansResponse, merchantPlansResponse, publicSettingsResponse] = await Promise.all([
          fetch('/api/auth/communities', { credentials: 'include' }),
          fetch('/api/auth/user-types', { credentials: 'include' }),
          fetch('/api/plans?type=user&isActive=true', { credentials: 'include' }),
          fetch('/api/plans?type=merchant&isActive=true', { credentials: 'include' }),
          fetch('/api/admin/settings/public', { credentials: 'include' })
        ]);
        
        if (communitiesResponse.ok) {
          const communitiesData = await communitiesResponse.json();
          setCommunities(communitiesData.communities || []);
        }
        
        if (userTypesResponse.ok) {
          const userTypesData = await userTypesResponse.json();
          setUserTypes(userTypesData.userTypes || []);
        }
          if (userPlansResponse.ok) {
          const userPlansData = await userPlansResponse.json();
          setUserPlans(userPlansData.plans || []);
          // Set default plan to the first available plan or community plan
          if (userPlansData.plans && userPlansData.plans.length > 0) {
            const defaultPlan = userPlansData.plans.find(p => p.key === 'community') || userPlansData.plans[0];
            setUserForm(prev => ({ ...prev, plan: defaultPlan.key }));
          }
        }
        
        if (merchantPlansResponse.ok) {
          const merchantPlansData = await merchantPlansResponse.json();
          setMerchantPlans(merchantPlansData.plans || []);
          // Set default plan to the first available merchant plan
          if (merchantPlansData.plans && merchantPlansData.plans.length > 0) {
            setMerchantForm(prev => ({ ...prev, plan: merchantPlansData.plans[0].key }));
          }
        }

        if (publicSettingsResponse.ok) {
          const settingsData = await publicSettingsResponse.json();
          setAdminSettings(settingsData.settings || {});
        }
      } catch (error) {
        console.error('Error fetching dropdown options:', error);
        showNotification('Failed to load form options', 'error');
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, [showNotification]);

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
    const { name, value, id } = e.target;
    const fieldName = name || id; // Support both name and id attributes
    
    setUserForm(prev => {
      const newForm = { ...prev, [fieldName]: value };
      
      // Combine firstName and lastName into fullName
      if (fieldName === 'firstName' || fieldName === 'lastName') {
        const firstName = fieldName === 'firstName' ? value : prev.firstName;
        const lastName = fieldName === 'lastName' ? value : prev.lastName;
        newForm.fullName = `${firstName} ${lastName}`.trim();
      }
      
      return newForm;
    });
  };  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!userForm.firstName || !userForm.lastName || !userForm.email || !userForm.password || !userForm.phone) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    if (!userForm.userCategory) {
      showNotification('Please select what type of member you are', 'error');
      return;
    }
    
    if (!userForm.community) {
      showNotification('Please select your community', 'error');
      return;
    }
    
    if (!userForm.country || !userForm.city) {
      showNotification('Please fill in location information', 'error');
      return;
    }
    
    if (userForm.password !== userForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }    
    if (userForm.password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    
    // Check required social media follows
    const socialLinks = getSocialMediaLinks();
    const requiredPlatforms = Object.entries(socialLinks).filter(([_, info]) => info.required).map(([platform, _]) => platform);
    const missingRequired = requiredPlatforms.filter(platform => !userForm.socialMediaFollowed[platform]);
    
    if (missingRequired.length > 0) {
      const platformNames = missingRequired.map(platform => getSocialPlatformName(platform)).join(', ');
      showNotification(`Please follow these required social media channels: ${platformNames}`, 'error');
      return;
    }
    
    // At least one social media must be followed if any exist
    const followedCount = Object.values(userForm.socialMediaFollowed).filter(Boolean).length;
    if (Object.keys(socialLinks).length > 0 && followedCount === 0) {
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
      return false;    }
    if (merchantForm.password !== merchantForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return false;
    }
    if (merchantForm.password.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return false;
    }
    
    // Check required social media follows
    const socialLinks = getSocialMediaLinks();
    const requiredPlatforms = Object.entries(socialLinks).filter(([_, info]) => info.required).map(([platform, _]) => platform);
    const missingRequired = requiredPlatforms.filter(platform => !merchantForm.socialMediaFollowed[platform]);
    
    if (missingRequired.length > 0) {
      const platformNames = missingRequired.map(platform => getSocialPlatformName(platform)).join(', ');
      showNotification(`Please follow these required social media channels: ${platformNames}`, 'error');
      return false;
    }
    
    // At least one social media must be followed if any exist
    const followedCount = Object.values(merchantForm.socialMediaFollowed).filter(Boolean).length;
    if (Object.keys(socialLinks).length > 0 && followedCount === 0) {
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
        navigate('/merchant-dashboard');
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
        {/* Back to Home floating button */}
        <Link to="/" style={{
          position: 'fixed',
          top: '18px',
          right: '24px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.95)',
          color: '#667eea',
          borderRadius: '50px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: '8px 16px',
          fontWeight: 600,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          textDecoration: 'none',
          border: '1px solid #e2e8f0',
          transition: 'background 0.2s'
        }}>
          <i className="fas fa-home" style={{ fontSize: '1.1rem', marginRight: '2px' }}></i>
          Home
        </Link>
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
              {/* Notification handled by Toast/NotificationContext */}              <div className="form-section">
                <h3>Personal Information</h3>
                
                {/* I'm a * field */}
                <div className="form-group">
                  <label htmlFor="userCategory">I'm a <span className="required">*</span></label>
                  <select
                    id="userCategory"
                    name="userCategory"
                    value={userForm.userCategory}
                    onChange={handleUserInputChange}
                    required
                  >
                    <option value="">Select an option</option>
                    {loadingOptions ? (
                      <option disabled>Loading...</option>
                    ) : (
                      userTypes.map((type) => (
                        <option key={type.name} value={type.name}>
                          {type.name}
                        </option>
                      ))
                    )
                  }
                  </select>
                </div>

                {/* First Name */}
                <div className="form-group">
                  <label htmlFor="firstName">First Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={userForm.firstName}
                    onChange={handleUserInputChange}
                    placeholder="Enter your first name"
                    required
                  />
                </div>

                {/* Last Name */}
                <div className="form-group">
                  <label htmlFor="lastName">Last Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={userForm.lastName}
                    onChange={handleUserInputChange}
                    placeholder="Enter your last name"
                    required
                  />
                </div>

                {/* Community Selection */}
                <div className="form-group">
                  <label htmlFor="community">Select Your Community (I belong from) <span className="required">*</span></label>
                  <select
                    id="community"
                    name="community"
                    value={userForm.community}
                    onChange={handleUserInputChange}
                    required
                  >
                    <option value="">Select your community</option>
                    {loadingOptions ? (
                      <option disabled>Loading communities...</option>
                    ) : (
                      communities.map((community) => (
                        <option key={community.name} value={community.name}>
                          {community.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Date of Birth */}
                <div className="form-group">
                  <label htmlFor="dob">Date of Birth (Optional)</label>
                  <input
                    type="date"
                    id="dob"
                    name="dob"
                    value={userForm.dob}
                    onChange={handleUserInputChange}
                    placeholder="Enter Your Date of Birth"
                  />
                </div>

                {/* WhatsApp Number */}
                <div className="form-group">
                  <label htmlFor="phone">WhatsApp No. (Add Country Code) <span className="required">*</span></label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={userForm.phone}
                    onChange={handleUserInputChange}
                    placeholder="Enter Your Mobile No."
                    required
                  />
                </div>

                {/* Email */}
                <div className="form-group">
                  <label htmlFor="email">User Email <span className="required">*</span></label>
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

                {/* Country */}
                <div className="form-group">
                  <label htmlFor="country">Country <span className="required">*</span></label>
                  <select
                    id="country"
                    name="country"
                    value={userForm.country}
                    onChange={handleUserInputChange}
                    required
                  >
                    <option value="">Select a country</option>
                    <option value="Ghana">Ghana</option>
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                {/* State (India) */}
                <div className="form-group">
                  <label htmlFor="state">State (India) <span className="required">*</span></label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={userForm.state}
                    onChange={handleUserInputChange}
                    placeholder="Enter your state in India"
                    required
                  />
                </div>

                {/* City (India) */}
                <div className="form-group">
                  <label htmlFor="city">City (India) <span className="required">*</span></label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={userForm.city}
                    onChange={handleUserInputChange}
                    placeholder="Enter your city in India"
                    required
                  />
                </div>

                {/* Current Location in Ghana */}
                <div className="form-group">
                  <label htmlFor="address">Current Location In (Ghana) <span className="required">*</span></label>
                  <textarea
                    id="address"
                    name="address"
                    value={userForm.address}
                    onChange={handleUserInputChange}
                    placeholder="Enter your current location in Ghana"
                    rows="2"
                    required
                  />
                </div>

                {/* Blood Group */}
                <div className="form-group">
                  <label htmlFor="bloodGroup">Blood Group</label>
                  <select
                    id="bloodGroup"
                    name="bloodGroup"
                    value={userForm.bloodGroup}
                    onChange={handleUserInputChange}
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

                {/* Password */}
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

                {/* Confirm Password */}
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password <span className="required">*</span></label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={userForm.confirmPassword}
                    onChange={handleUserInputChange}
                    placeholder="Confirm your password"
                    required
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
                    <option value="">Select a Plan</option>
                    {userPlans.map(plan => (
                      <option key={plan.id} value={plan.key}>
                        {plan.name} ({plan.price === 0 ? 'Free' : `${plan.currency} ${plan.price}`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>              {/* Social Media Section */}
              <div className="form-section">
                <h3><i className="fas fa-share-alt"></i> Community Connection {Object.values(getSocialMediaLinks()).some(link => link.required) && '(Required)'}</h3>
                <p style={{ marginBottom: '15px', color: '#666', fontSize: '0.9em' }}>
                  {Object.values(getSocialMediaLinks()).some(link => link.required) 
                    ? 'Please follow our required social media channels to stay connected with the community. Check the box after following each platform.'
                    : 'Follow our social media channels to stay connected with the community. Check the box after following each platform.'
                  }
                </p>
                {Object.entries(getSocialMediaLinks()).map(([platform, info]) => (
                  <div key={platform} className="social-media-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    padding: '10px',
                    border: info.required ? '2px solid #ff6b6b' : '1px solid #ddd',
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
                      {info.name} {info.required && <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>*</span>}
                    </label>
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '5px 10px',
                        backgroundColor: info.required ? '#ff6b6b' : '#3b82f6',
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

                <div className="form-group">
                  <label htmlFor="bloodGroup">Blood Group</label>
                  <select
                    id="bloodGroup"
                    name="bloodGroup"
                    value={merchantForm.bloodGroup}
                    onChange={handleMerchantInputChange}
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
                  </div>                  <div className="form-group">
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
                
                <div className="form-group">
                  <label htmlFor="plan">Business Plan</label>
                  <select
                    id="plan"
                    name="plan"
                    value={merchantForm.plan}
                    onChange={handleMerchantInputChange}
                  >
                    <option value="">Select a Plan</option>
                    {merchantPlans.map(plan => (
                      <option key={plan.id} value={plan.key}>
                        {plan.name} ({plan.price === 0 ? 'Free' : `${plan.currency} ${plan.price}`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>              {/* Social Media Section */}
              <div className="form-section">
                <h3><i className="fas fa-share-alt"></i> Community Connection {Object.values(getSocialMediaLinks()).some(link => link.required) && '(Required)'}</h3>
                <p style={{ marginBottom: '15px', color: '#666', fontSize: '0.9em' }}>
                  {Object.values(getSocialMediaLinks()).some(link => link.required) 
                    ? 'Please follow our required social media channels to stay connected with the community. Check the box after following each platform.'
                    : 'Follow our social media channels to stay connected with the community. Check the box after following each platform.'
                  }
                </p>
                {Object.entries(getSocialMediaLinks()).map(([platform, info]) => (
                  <div key={platform} className="social-media-item" style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    padding: '10px',
                    border: info.required ? '2px solid #ff6b6b' : '1px solid #ddd',
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
                      {info.name} {info.required && <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>*</span>}
                    </label>
                    <a
                      href={info.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '5px 10px',
                        backgroundColor: info.required ? '#ff6b6b' : '#3b82f6',
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