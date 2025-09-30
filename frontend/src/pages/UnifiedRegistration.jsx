import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDynamicFields } from '../hooks/useDynamicFields';
import '../styles/registration.css';
import '../styles/global.css';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator/PasswordStrengthIndicator';



const UnifiedRegistration = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('member');

  // Initialize hooks
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { 
    dynamicFields, 
    isLoading: fieldsLoading, 
    getCommunityOptions, 
    getUserTypeOptions, 
    getBusinessCategoryOptions 
    , getCountryOptions, getStateOptions
  } = useDynamicFields();

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
    bloodGroupConfident: false, // New field for blood group confidence
    employerName: '',
    yearsInGhana: '',
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
  const [userTermsAccepted, setUserTermsAccepted] = useState(false);
  
  // Dynamic dropdown options and settings
  const [communities, setCommunities] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
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
    bloodGroupConfident: false, // New field for blood group confidence
    employerName: '',
    yearsInGhana: '',
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

    // Match Home page logic - check for truthy values and parse properly
    Object.keys(requirements).forEach(platform => {
      const platformData = requirements[platform];

      // Exclude empty/false values
      if (!platformData || platformData === false || platformData === 'false') return;

      let parsedData = {};

      // If platformData is a JSON string, try to parse
      if (typeof platformData === 'string' && platformData.trim().length > 0) {
        const trimmed = platformData.trim();
        if (trimmed.startsWith('{')) {
          try {
            parsedData = JSON.parse(trimmed);
          } catch (e) {
            console.warn(`Failed to parse social media data for ${platform}:`, e);
            // fallback to treat the string as a URL
            parsedData = { url: trimmed };
          }
        } else {
          // plain non-empty string -> treat as URL
          parsedData = { url: trimmed };
        }
      } else if (typeof platformData === 'object' && Object.keys(platformData).length > 0) {
        parsedData = platformData;
      } else {
        // nothing useful provided, skip this platform
        return;
      }

      // Require at least one meaningful property: url, required, name, or icon
      if (!parsedData.url && !parsedData.required && !parsedData.name && !parsedData.icon) return;

      // Use parsed URL or fallback to placeholder (placeholder only if we had meaningful metadata)
      const url = parsedData.url || `#${platform}`;

      links[platform] = {
        url: url,
        name: parsedData.name || getSocialPlatformName(platform),
        icon: parsedData.icon || getSocialPlatformIcon(platform),
        required: !!parsedData.required
      };
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
      facebook: 'fab fa-facebook-f',
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

        // The dynamic fields hook already loads communities, userTypes, businessCategories
        // We just need to sync them to our local state for backward compatibility
        if (!fieldsLoading && dynamicFields) {
          setCommunities(dynamicFields.communities || []);
          setUserTypes(dynamicFields.userTypes || []);
          setCountries(dynamicFields.countries || []);
          setStates(dynamicFields.states || []);
        }

        // FIXED: Use absolute URLs pointing to your backend
        const API_BASE = 'https://membership-model.onrender.com/api'; // Replace with your actual backend URL

        // Load other data that isn't dynamic yet
        const [userPlansResponse, merchantPlansResponse, publicSettingsResponse] = await Promise.all([
          fetch(`${API_BASE}/plans?type=user&isActive=true`, { 
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          }),
          fetch(`${API_BASE}/plans?type=merchant&isActive=true`, { 
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          }),
          fetch(`${API_BASE}/admin/settings/public`, { 
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          })
        ]);

        if (userPlansResponse.ok) {
          const contentType = userPlansResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const userPlansData = await userPlansResponse.json();
            setUserPlans(userPlansData.plans || []);
            // Set default plan to the first available plan or community plan
            if (userPlansData.plans && userPlansData.plans.length > 0) {
              const defaultPlan = userPlansData.plans.find(p => p.key === 'community') || userPlansData.plans[0];
              setUserForm(prev => ({ ...prev, plan: defaultPlan.key }));
            }
          }
        }

        if (merchantPlansResponse.ok) {
          const contentType = merchantPlansResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const merchantPlansData = await merchantPlansResponse.json();
            setMerchantPlans(merchantPlansData.plans || []);
            // Set default plan to the first available merchant plan
            if (merchantPlansData.plans && merchantPlansData.plans.length > 0) {
              setMerchantForm(prev => ({ ...prev, plan: merchantPlansData.plans[0].key }));
            }
          }
        }

        if (publicSettingsResponse.ok) {
          const contentType = publicSettingsResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const settingsData = await publicSettingsResponse.json();
            setAdminSettings(settingsData.settings || {});
          }
        }

      } catch (error) {
        showNotification('Failed to load form options', 'error');
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
    }, [showNotification, fieldsLoading, dynamicFields]); // 

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
  
  // User Registration Handlers
  // Password strength helper (matches ResetPassword criteria)
  const checkPasswordStrength = (password) => {
    const criteria = {
      hasMinLength: password && password.length >= 6,
      hasMaxLength: password && password.length <= 20,
      hasNumber: /\d/.test(password || ''),
      hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password || ''),
      hasLowercase: /[a-z]/.test(password || ''),
      hasUppercase: /[A-Z]/.test(password || ''),
      onlyLatin: /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]*$/.test(password || '')
    };

    const isValid = Object.values(criteria).every(Boolean);
    const failed = [];
    if (!criteria.hasMinLength) failed.push('At least 6 characters');
    if (!criteria.hasMaxLength) failed.push('Maximum 20 characters');
    if (!criteria.hasNumber) failed.push('One number');
    if (!criteria.hasSymbol) failed.push('One symbol');
    if (!criteria.hasLowercase) failed.push('One lowercase letter');
    if (!criteria.hasUppercase) failed.push('One uppercase letter');
    if (!criteria.onlyLatin) failed.push('Only Latin letters and symbols');

    return { isValid, failed, criteria };
  };

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
      
      // Reset blood group confidence when blood group is cleared
      if (fieldName === 'bloodGroup' && !value) {
        newForm.bloodGroupConfident = false;
      }
      
      return newForm;
    });
  };  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    // Password strength check
    const pwCheck = checkPasswordStrength(userForm.password);
    if (!pwCheck.isValid) {
      showNotification(`Password requirements: ${pwCheck.failed.join(', ')}`, 'error');
      return;
    }
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
    
    if (!userForm.password || !userForm.confirmPassword) {
      showNotification('Please provide and confirm your password', 'error');
      return;
    }
    
    if (userForm.password !== userForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }    
    // length check already covered by strength
    
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
      // Set default plan if membership plans are disabled
      const finalUserForm = { ...userForm };
      if (adminSettings.features?.showMembershipPlans !== true) {
        // Find the lowest priority plan for users (lowest number = lowest priority)
        const lowestPriorityPlan = userPlans.reduce((lowest, plan) => {
          return (lowest === null || plan.priority < lowest.priority) ? plan : lowest;
        }, null);
        finalUserForm.plan = lowestPriorityPlan ? lowestPriorityPlan.key : 'silver'; // Fallback to silver if no plans found
      }
      
      const result = await register({
        ...finalUserForm,
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
    const { id, value } = e.target;
    
    // Handle website field with special validation
    if (id === 'website') {
      let processedValue = value;
      
      // Remove https:// if user enters it
      if (processedValue.startsWith('https://')) {
        processedValue = processedValue.replace('https://', '');
      }
      
      // Remove http:// if user enters it
      if (processedValue.startsWith('http://')) {
        processedValue = processedValue.replace('http://', '');
      }
      
      // Ensure it starts with www. if not empty and doesn't already start with www.
      if (processedValue && !processedValue.startsWith('www.')) {
        processedValue = 'www.' + processedValue;
      }
      
      setMerchantForm({ ...merchantForm, [id]: processedValue });
    } else {
      const newForm = { ...merchantForm, [id]: value };
      
      // Reset blood group confidence when blood group is cleared
      if (id === 'bloodGroup' && !value) {
        newForm.bloodGroupConfident = false;
      }
      
      setMerchantForm(newForm);
    }
  };
  const validateMerchantForm = () => {
    // Merchant password strength check
    const pwCheck = checkPasswordStrength(merchantForm.password);
    if (!pwCheck.isValid) {
      showNotification(`Password requirements: ${pwCheck.failed.join(', ')}`, 'error');
      return false;
    }
    if (!merchantForm.fullName || !merchantForm.email || !merchantForm.password) {
      showNotification('Please fill in all required personal information', 'error');
      return false;
    }
    if (!merchantForm.businessName || !merchantForm.businessCategory) {
      showNotification('Please fill in required business information', 'error');
      return false;    }
    if (!merchantForm.phone) {
      showNotification('Please provide your mobile number', 'error');
      return false;
    }
    if (!merchantForm.businessDescription) {
      showNotification('Please provide a business description', 'error');
      return false;
    }
    if (!merchantForm.businessPhone) {
      showNotification('Please provide your business phone number', 'error');
      return false;
    }
    if (!merchantForm.businessEmail) {
      showNotification('Please provide your business email address', 'error');
      return false;
    }
    if (!merchantForm.businessStreet) {
      showNotification('Please provide your business street address', 'error');
      return false;
    }
    if (!merchantForm.businessCity) {
      showNotification('Please provide your business city', 'error');
      return false;
    }
    if (!merchantForm.businessState) {
      showNotification('Please provide your business region', 'error');
      return false;
    }
    if (merchantForm.password !== merchantForm.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return false;
    }
    // length and other checks covered by strength
    
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

      // Set default plan if membership plans are disabled
      const finalPlan = adminSettings.features?.showMembershipPlans !== true 
        ? (() => {
            // Find the lowest priority plan for merchants (lowest number = lowest priority)
            const lowestPriorityPlan = merchantPlans.reduce((lowest, plan) => {
              return (lowest === null || plan.priority < lowest.priority) ? plan : lowest;
            }, null);
            return lowestPriorityPlan ? lowestPriorityPlan.key : 'basic_business'; // Fallback to basic_business if no plans found
          })()
        : merchantForm.plan;

      const merchantData = {
        fullName: merchantForm.fullName,
        email: merchantForm.email,
        password: merchantForm.password,
        phone: merchantForm.phone,
        plan: finalPlan, // Include selected or default plan
        bloodGroup: merchantForm.bloodGroup, // Include blood group
        bloodGroupConfident: merchantForm.bloodGroupConfident, // Include blood group confidence
        employerName: merchantForm.employerName, // Include employer name
        yearsInGhana: merchantForm.yearsInGhana, // Include years in Ghana
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
    <>
      {/* Back to Home floating button */}
          <Link className="back-home" to="/" style={{
          position: 'fixed',
          top: '18px',
          right: '24px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.95)',
          color: '#660B05',
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
          <i className="fas fa-home home-icon" style={{ fontSize: '1.1rem', marginRight: '2px' }}></i>
          Home
        </Link>
        
    <div className="registration-card unified-registration-card">
      <div className="registration-toggle-info">
        <div className="toggle-instruction-header">
          <h3><i className="fas fa-info-circle"></i> Registration Instructions</h3>
          <p className="instruction-description">
            Choose your registration type by clicking the tabs below. Each registration type has different benefits and requirements.
          </p>
        </div>
        <p className="toggle-instruction">
          <strong>💡 Tip:</strong> Use the tabs below to switch between <strong>Member</strong> and <strong>Merchant</strong> registration forms
        </p>
      </div>
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
              {/* Notification handled by Toast/NotificationContext */}              <div className="form-section">
                <h3>Personal Information</h3>
                
                {/* I'm a * field */}
                <div className="form-group">
                  <label htmlFor="userCategory">I'm a <span className="required">*</span></label>
                  <div className="select-with-icon" style={{ position: 'relative' }}>
                    <select
                      id="userCategory"
                      name="userCategory"
                      value={userForm.userCategory}
                      onChange={handleUserInputChange}
                      required
                      style={{ paddingRight: '36px' }}
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
                    <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                  </div>
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
                  <div className="select-with-icon" style={{ position: 'relative' }}>
                    <select
                      id="community"
                      name="community"
                      value={userForm.community}
                      onChange={handleUserInputChange}
                      required
                      style={{ paddingRight: '36px' }}
                    >
                      <option value="">Select your community</option>
                      {fieldsLoading ? (
                        <option disabled>Loading communities...</option>
                      ) : (
                        getCommunityOptions().map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                    <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                  </div>
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
                  <label htmlFor="email">User Email ID<span className="required">*</span></label>
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
                  <label htmlFor="country">Home Country Name<span className="required">*</span></label>
                  <div className="select-with-icon" style={{ position: 'relative' }}>
                    <select
                      id="country"
                      name="country"
                      value={userForm.country}
                      onChange={handleUserInputChange}
                      required
                      style={{ paddingRight: '36px' }}
                    >
                      <option value="">Select your Home country</option>
                      {fieldsLoading ? (
                        <option disabled>Loading countries...</option>
                      ) : (
                        getCountryOptions().map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))
                      )}
                    </select>
                    <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                  </div>
                </div>
 
                {/* State (India) */}
                <div className="form-group">
                  <label htmlFor="state">State (India) <span className="required">*</span></label>
                  <div className="select-with-icon" style={{ position: 'relative' }}>
                    <select
                      id="state"
                      name="state"
                      value={userForm.state}
                      onChange={handleUserInputChange}
                      required
                      style={{ paddingRight: '36px' }}
                    >
                      <option value="">Select a state/region</option>
                      {fieldsLoading ? (
                        <option disabled>Loading states...</option>
                      ) : (
                        getStateOptions().map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))
                      )}
                    </select>
                    <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                  </div>
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
                  <label htmlFor="bloodGroup">Blood Group <span style={{ color: '#666', fontWeight: 'normal' }}>(Optional)</span></label>
                  <div className="select-with-icon" style={{ position: 'relative' }}>
                    <select
                      id="bloodGroup"
                      name="bloodGroup"
                      value={userForm.bloodGroup}
                      onChange={handleUserInputChange}
                      style={{ paddingRight: '36px' }}
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                    <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                  </div>
                  {/* Blood Group Confidence Checkbox */}
                  {userForm.bloodGroup ? (
                    <div className="blood-group-confidence" style={{ 
                      marginTop: '8px', 
                      display: 'flex', 
                      alignItems: 'center',
                      backgroundColor: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div className="custom-checkbox" style={{ marginRight: '8px', position: 'relative' }}>
                        <input
                          type="checkbox"
                          id="bloodGroupConfident"
                          name="bloodGroupConfident"
                          checked={userForm.bloodGroupConfident}
                          onChange={(e) => setUserForm(prev => ({ ...prev, bloodGroupConfident: e.target.checked }))}
                          style={{ 
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            opacity: 0,
                            position: 'absolute',
                            zIndex: 2
                          }}
                        />
                        <div style={{
                          width: '18px',
                          height: '18px',
                          border: '2px solid #6c757d',
                          borderRadius: '3px',
                          backgroundColor: userForm.bloodGroupConfident ? '#28a745' : 'white',
                          borderColor: userForm.bloodGroupConfident ? '#28a745' : '#6c757d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          cursor: 'pointer'
                        }}>
                          {userForm.bloodGroupConfident && (
                            <span style={{ 
                              color: 'white', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              lineHeight: '1'
                            }}>
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                      <label htmlFor="bloodGroupConfident" style={{ 
                        fontSize: '0.9em', 
                        color: '#333', 
                        margin: 0, 
                        cursor: 'pointer',
                        fontWeight: '500',
                        userSelect: 'none'
                      }}>
                        I got the blood group checked from laboratory, I am confident
                      </label>
                    </div>
                  ) : null}
                </div>

                {/* Employer Name */}
                <div className="form-group">
                  <label htmlFor="employerName">Name of Employer <span style={{ color: '#666', fontWeight: 'normal' }}>(Optional)</span></label>
                  <input
                    type="text"
                    id="employerName"
                    name="employerName"
                    value={userForm.employerName}
                    onChange={handleUserInputChange}
                    placeholder="Enter your employer's name"
                  />
                </div>

                {/* Years in Ghana */}
                <div className="form-group">
                  <label htmlFor="yearsInGhana">Number of Years in Ghana <span style={{ color: '#666', fontWeight: 'normal' }}>(Optional)</span></label>
                  <input
                    type="number"
                    id="yearsInGhana"
                    name="yearsInGhana"
                    value={userForm.yearsInGhana}
                    onChange={handleUserInputChange}
                    placeholder="Enter number of years you've been in Ghana"
                    min="0"
                    max="100"
                  />
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
                <PasswordStrengthIndicator password={userForm.password} showCriteria={true} />
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

                {/* Membership Plan Section - Conditional Display */}
                {adminSettings.features?.showMembershipPlans === true && (
                  <div className="form-group">
                    <label htmlFor="plan">
                      {adminSettings.membershipPlanRequirements?.section_title || 'Membership Plan'}
                    </label>
                    {adminSettings.membershipPlanRequirements?.section_subtitle && (
                      <p className="field-description">{adminSettings.membershipPlanRequirements.section_subtitle}</p>
                    )}
                    <div className="select-with-icon" style={{ position: 'relative' }}>
                      <select
                        id="plan"
                        name="plan"
                        value={userForm.plan}
                        onChange={handleUserInputChange}
                        style={{ paddingRight: '36px' }}
                      >
                        <option value="">Select a Plan</option>
                        {userPlans.map(plan => (
                          <option key={plan.id} value={plan.key}>
                            {plan.name} ({plan.price === 0 ? 'Free' : `${plan.currency} ${plan.price}`})
                          </option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                    </div>
                  </div>
                )}
              </div>              {/* Social Media Section */}
              {(() => {
                const showSocialRegistration = adminSettings.features?.show_social_media_home === true;
                const hasSocialPlatforms = Object.keys(adminSettings.socialMediaRequirements || {}).length > 0;
                return showSocialRegistration && hasSocialPlatforms;
              })() && (
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
                  * You must follow all our social media channels to join our community
                </small>
              </div>
              )}
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
                    <label htmlFor="email">User Email ID*</label>
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
                    <label htmlFor="phone">Phone Number <span className="required">*</span></label>
                    <input
                      type="tel"
                      id="phone"
                      value={merchantForm.phone}
                      onChange={handleMerchantInputChange}
                      placeholder="+233 XX XXX XXXX"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="bloodGroup">Blood Group <span style={{ color: '#666', fontWeight: 'normal' }}>(Optional)</span></label>
                  <div className="select-with-icon" style={{ position: 'relative' }}>
                    <select
                      id="bloodGroup"
                      name="bloodGroup"
                      value={merchantForm.bloodGroup}
                      onChange={handleMerchantInputChange}
                      style={{ paddingRight: '36px' }}
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                    <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                  </div>
                  {/* Blood Group Confidence Checkbox */}
                  {merchantForm.bloodGroup ? (
                    <div className="blood-group-confidence" style={{ 
                      marginTop: '8px', 
                      display: 'flex', 
                      alignItems: 'center',
                      backgroundColor: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      <div className="custom-checkbox" style={{ marginRight: '8px', position: 'relative' }}>
                        <input
                          type="checkbox"
                          id="merchantBloodGroupConfident"
                          name="bloodGroupConfident"
                          checked={merchantForm.bloodGroupConfident}
                          onChange={(e) => setMerchantForm(prev => ({ ...prev, bloodGroupConfident: e.target.checked }))}
                          style={{ 
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            opacity: 0,
                            position: 'absolute',
                            zIndex: 2
                          }}
                        />
                        <div style={{
                          width: '18px',
                          height: '18px',
                          border: '2px solid #6c757d',
                          borderRadius: '3px',
                          backgroundColor: merchantForm.bloodGroupConfident ? '#28a745' : 'white',
                          borderColor: merchantForm.bloodGroupConfident ? '#28a745' : '#6c757d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          cursor: 'pointer'
                        }}>
                          {merchantForm.bloodGroupConfident && (
                            <span style={{ 
                              color: 'white', 
                              fontSize: '12px', 
                              fontWeight: 'bold',
                              lineHeight: '1'
                            }}>
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                      <label htmlFor="merchantBloodGroupConfident" style={{ 
                        fontSize: '0.9em', 
                        color: '#333', 
                        margin: 0, 
                        cursor: 'pointer',
                        fontWeight: '500',
                        userSelect: 'none'
                      }}>
                        I got the blood group checked from laboratory, I am confident
                      </label>
                    </div>
                  ) : null}
                </div>

                {/* Employer Name */}
                <div className="form-group">
                  <label htmlFor="employerName">Name of Employer <span style={{ color: '#666', fontWeight: 'normal' }}>(Optional)</span></label>
                  <input
                    type="text"
                    id="employerName"
                    name="employerName"
                    value={merchantForm.employerName}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter your employer's name"
                  />
                </div>

                {/* Years in Ghana */}
                <div className="form-group">
                  <label htmlFor="yearsInGhana">Number of Years in Ghana <span style={{ color: '#666', fontWeight: 'normal' }}>(Optional)</span></label>
                  <input
                    type="number"
                    id="yearsInGhana"
                    name="yearsInGhana"
                    value={merchantForm.yearsInGhana}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter number of years you've been in Ghana"
                    min="0"
                    max="100"
                  />
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
                    <PasswordStrengthIndicator password={merchantForm.password} showCriteria={true} />
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
                
                {/* Business Plan Section - Conditional Display */}
                {adminSettings.features?.showMembershipPlans === true && (
                  <div className="form-group">
                    <label htmlFor="plan">
                      {adminSettings.membershipPlanRequirements?.section_title || 'Business Plan'}
                    </label>
                    {adminSettings.membershipPlanRequirements?.section_subtitle && (
                      <p className="field-description">{adminSettings.membershipPlanRequirements.section_subtitle}</p>
                    )}
                    <div className="select-with-icon" style={{ position: 'relative' }}>
                      <select
                        id="plan"
                        name="plan"
                        value={merchantForm.plan}
                        onChange={handleMerchantInputChange}
                        style={{ paddingRight: '36px' }}
                      >
                        <option value="">Select a Plan</option>
                        {merchantPlans.map(plan => (
                          <option key={plan.id} value={plan.key}>
                            {plan.name} ({plan.price === 0 ? 'Free' : `${plan.currency} ${plan.price}`})
                          </option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                    </div>
                  </div>
                )}
              </div>              {/* Social Media Section */}
              {(() => {
                const showSocialRegistration = adminSettings.features?.show_social_media_home === true;
                const hasSocialPlatforms = Object.keys(adminSettings.socialMediaRequirements || {}).length > 0;
                return showSocialRegistration && hasSocialPlatforms;
              })() && (
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
                  * You must follow all our social media channels to register as a merchant
                </small>
              </div>
              )}
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
                  <label htmlFor="businessDescription">Business Description <span className="required">*</span></label>
                  <textarea
                    id="businessDescription"
                    value={merchantForm.businessDescription}
                    onChange={handleMerchantInputChange}
                    placeholder="Brief description of your business"
                    rows="3"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="businessCategory">Business Category *</label>
                    <div className="select-with-icon" style={{ position: 'relative' }}>
                      <select
                        id="businessCategory"
                        value={merchantForm.businessCategory}
                        onChange={handleMerchantInputChange}
                        required
                        style={{ paddingRight: '36px' }}
                      >
                        <option value="">Select Category</option>
                        {getBusinessCategoryOptions().map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down dropdown-arrow" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}></i>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="businessPhone">Business Phone <span className="required">*</span></label>
                    <input
                      type="tel"
                      id="businessPhone"
                      value={merchantForm.businessPhone}
                      onChange={handleMerchantInputChange}
                      placeholder="Business phone number"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="businessEmail">Business Email ID <span className="required">*</span></label>
                    <input
                      type="email"
                      id="businessEmail"
                      value={merchantForm.businessEmail}
                      onChange={handleMerchantInputChange}
                      placeholder="business@example.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="website">Website (Optional)</label>
                    <input
                      type="text"
                      id="website"
                      value={merchantForm.website}
                      onChange={handleMerchantInputChange}
                      placeholder="www.yourwebsite.com"
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
                  <label htmlFor="businessStreet">Street Address <span className="required">*</span></label>
                  <input
                    type="text"
                    id="businessStreet"
                    value={merchantForm.businessStreet}
                    onChange={handleMerchantInputChange}
                    placeholder="Street address"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="businessCity">City <span className="required">*</span></label>
                    <input
                      type="text"
                      id="businessCity"
                      value={merchantForm.businessCity}
                      onChange={handleMerchantInputChange}
                      placeholder="City"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="businessState">Region <span className="required">*</span></label>
                      <input
                        type="text"
                        id="businessState"
                        value={merchantForm.businessState}
                        onChange={handleMerchantInputChange}
                        placeholder="Region"
                        required
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
                  I Accept the<Link to="/terms" target="_blank">Terms and Conditions</Link>
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
    </>
  );
};

export default UnifiedRegistration;