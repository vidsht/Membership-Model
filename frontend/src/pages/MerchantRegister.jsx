import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator/PasswordStrengthIndicator';
import { useDynamicFields } from '../hooks/useDynamicFields';
import { useFormValidation } from '../hooks/useFormValidation';
import FormField from '../components/common/FormField';
import FormErrorSummary from '../components/common/FormErrorSummary';
import '../styles/registration.css';
import '../styles/FormValidation.css';

const MerchantRegister = () => {
  // Use dynamic fields hook
  const { 
    getStateOptions, 
    getCountryOptions,
    isLoading: fieldsLoading 
  } = useDynamicFields();

  // Initialize form validation
  const {
    errors,
    touchedFields,
    hasErrors,
    validateForm: validateFormData,
    validateField,
    markFieldTouched,
    clearAllErrors,
    setFieldError
  } = useFormValidation();

  // Merchant registration validation schema
  const merchantValidationSchema = {
    fullName: {
      rules: ['required', { type: 'minLength', minLength: 2 }],
      displayName: 'Full Name'
    },
    email: {
      rules: ['required', 'email'],
      displayName: 'Email'
    },
    password: {
      rules: ['required', 'passwordStrength'],
      displayName: 'Password'
    },
    confirmPassword: {
      rules: ['required'],
      displayName: 'Confirm Password'
    },
    businessName: {
      rules: ['required', 'businessName'],
      displayName: 'Business Name'
    },
    businessCategory: {
      rules: ['required'],
      displayName: 'Business Category'
    },
    phone: {
      rules: ['phone'],
      displayName: 'Phone Number'
    },
    businessPhone: {
      rules: ['phone'],
      displayName: 'Business Phone'
    },
    businessEmail: {
      rules: ['email'],
      displayName: 'Business Email'
    },
    website: {
      rules: ['url'],
      displayName: 'Website'
    },
    taxId: {
      rules: ['taxId'],
      displayName: 'Tax ID'
    }
  };

  const fieldLabels = {
    fullName: 'Full Name',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    phone: 'Phone Number',
    bloodGroup: 'Blood Group',
    businessName: 'Business Name',
    businessDescription: 'Business Description',
    businessCategory: 'Business Category',
    businessPhone: 'Business Phone',
    businessEmail: 'Business Email',
    website: 'Website',
    businessLicense: 'Business License',
    taxId: 'Tax ID',
    businessStreet: 'Street Address',
    businessCity: 'City',
    businessState: 'State/Region',
    businessZipCode: 'Postal Code',
    businessCountry: 'Country'
  };
  
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
    businessZipCode: '',
    businessCountry: ''
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
    const fieldName = e.target.id;
    const value = e.target.value;
    
    setFormData({
      ...formData,
      [fieldName]: value
    });

    // Validate field on change if it was already touched
    if (touchedFields[fieldName]) {
      validateField(fieldName, value, merchantValidationSchema[fieldName]?.rules || [], fieldLabels[fieldName]);
    }
  };

  const handleFieldBlur = (e) => {
    const fieldName = e.target.id;
    const value = e.target.value;
    
    markFieldTouched(fieldName);
    validateField(fieldName, value, merchantValidationSchema[fieldName]?.rules || [], fieldLabels[fieldName]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Custom validation for password match
    if (formData.password !== formData.confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match');
      showNotification('Passwords do not match', 'error');
      return;
    }

    // Validate entire form
    const isValid = validateFormData(formData, merchantValidationSchema);
    
    if (!isValid) {
      showNotification('Please correct the errors below before submitting', 'error');
      return;
    }
    
    if (!termsAccepted) {
      showNotification('Please accept the terms and conditions', 'error');
      return;
    }

    setLoading(true);

    try {
      const merchantData = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        bloodGroup: formData.bloodGroup,
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
            country: formData.businessCountry || 'Ghana'
          }
        }
      };      
      const response = await merchantRegister(merchantData);
      
      const successMessage = response.message || 'Merchant account created successfully! Welcome to the platform.';
      showNotification(successMessage, 'success');
      clearAllErrors();
      
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
          <Link to="/unified-registration" className="tab-btn">
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
                <FormErrorSummary 
                  errors={errors} 
                  fieldLabels={fieldLabels}
                  show={hasErrors && Object.keys(touchedFields).length > 0}
                />

                {/* Personal Information */}
                <div className="form-section">
                  <h3><i className="fas fa-user"></i> Personal Information</h3>
                  
                  <FormField
                    label="Full Name"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    error={errors.fullName}
                    touched={touchedFields.fullName}
                    required={true}
                    placeholder="Your full name"
                    inputProps={{ id: 'fullName' }}
                  />

                  <div className="form-row">
                    <div className="form-group">
                      <FormField
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.email}
                        touched={touchedFields.email}
                        required={true}
                        placeholder="your@email.com"
                        inputProps={{ id: 'email' }}
                      />
                    </div>
                    <div className="form-group">
                      <FormField
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.phone}
                        touched={touchedFields.phone}
                        placeholder="+233 XX XXX XXXX"
                        inputProps={{ id: 'phone' }}
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
                        onBlur={handleFieldBlur}
                        className={errors.password && touchedFields.password ? 'field-error' : ''}
                        placeholder="Create a strong password" 
                        required 
                      />
                      {errors.password && touchedFields.password && (
                        <div className="error-message">{errors.password}</div>
                      )}
                      <PasswordStrengthIndicator 
                        password={formData.password} 
                        showCriteria={true} 
                      />
                    </div>
                    <div className="form-group">
                      <FormField
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.confirmPassword}
                        touched={touchedFields.confirmPassword}
                        required={true}
                        placeholder="Confirm your password"
                        inputProps={{ id: 'confirmPassword' }}
                      />
                    </div>
                  </div>

                  <FormField
                    label="Blood Group"
                    name="bloodGroup"
                    type="select"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    error={errors.bloodGroup}
                    touched={touchedFields.bloodGroup}
                    placeholder="Select blood group (optional)"
                    inputProps={{ id: 'bloodGroup' }}
                    options={[
                      { value: 'A+', label: 'A+' },
                      { value: 'A-', label: 'A-' },
                      { value: 'B+', label: 'B+' },
                      { value: 'B-', label: 'B-' },
                      { value: 'AB+', label: 'AB+' },
                      { value: 'AB-', label: 'AB-' },
                      { value: 'O+', label: 'O+' },
                      { value: 'O-', label: 'O-' }
                    ]}
                  />
                </div>

                {/* Business Information */}
                <div className="form-section">
                  <h3><i className="fas fa-building"></i> Business Information</h3>
                  
                  <FormField
                    label="Business Name"
                    name="businessName"
                    type="text"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    error={errors.businessName}
                    touched={touchedFields.businessName}
                    required={true}
                    placeholder="Your business name"
                    inputProps={{ id: 'businessName' }}
                  />

                  <FormField
                    label="Business Description"
                    name="businessDescription"
                    type="textarea"
                    value={formData.businessDescription}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                    error={errors.businessDescription}
                    touched={touchedFields.businessDescription}
                    placeholder="Brief description of your business"
                    rows={3}
                    inputProps={{ id: 'businessDescription' }}
                  />

                  <div className="form-row">
                    <div className="form-group">
                      <FormField
                        label="Business Category"
                        name="businessCategory"
                        type="select"
                        value={formData.businessCategory}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.businessCategory}
                        touched={touchedFields.businessCategory}
                        required={true}
                        placeholder="Select Category"
                        inputProps={{ id: 'businessCategory' }}
                        options={[
                          { value: 'restaurant', label: 'Restaurant & Food' },
                          { value: 'retail', label: 'Retail & Shopping' },
                          { value: 'services', label: 'Professional Services' },
                          { value: 'healthcare', label: 'Healthcare' },
                          { value: 'technology', label: 'Technology' },
                          { value: 'other', label: 'Other' }
                        ]}
                      />
                    </div>
                    <div className="form-group">
                      <FormField
                        label="Business Phone"
                        name="businessPhone"
                        type="tel"
                        value={formData.businessPhone}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.businessPhone}
                        touched={touchedFields.businessPhone}
                        placeholder="Business phone number"
                        inputProps={{ id: 'businessPhone' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <FormField
                        label="Business Email"
                        name="businessEmail"
                        type="email"
                        value={formData.businessEmail}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.businessEmail}
                        touched={touchedFields.businessEmail}
                        placeholder="business@example.com"
                        inputProps={{ id: 'businessEmail' }}
                      />
                    </div>
                    <div className="form-group">
                      <FormField
                        label="Website (Optional)"
                        name="website"
                        type="url"
                        value={formData.website}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.website}
                        touched={touchedFields.website}
                        placeholder="https://yourwebsite.com"
                        inputProps={{ id: 'website' }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <FormField
                        label="Business License # (Optional)"
                        name="businessLicense"
                        type="text"
                        value={formData.businessLicense}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.businessLicense}
                        touched={touchedFields.businessLicense}
                        placeholder="Business license number"
                        inputProps={{ id: 'businessLicense' }}
                      />
                    </div>
                    <div className="form-group">
                      <FormField
                        label="Tax ID (Optional)"
                        name="taxId"
                        type="text"
                        value={formData.taxId}
                        onChange={handleInputChange}
                        onBlur={handleFieldBlur}
                        error={errors.taxId}
                        touched={touchedFields.taxId}
                        placeholder="Business tax ID"
                        inputProps={{ id: 'taxId' }}
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
                      <select 
                        id="businessState" 
                        value={formData.businessState}
                        onChange={handleInputChange}
                        disabled={fieldsLoading}
                      >
                        <option value="">Select State/Region</option>
                        {getStateOptions().map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
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
                  
                  <div className="form-group">
                    <label htmlFor="businessCountry">Country</label>
                    <select 
                      id="businessCountry" 
                      value={formData.businessCountry}
                      onChange={handleInputChange}
                      disabled={fieldsLoading}
                    >
                      <option value="">Select Country</option>
                      {getCountryOptions().map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
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
                    I agree to <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/disclaimer" target="_blank">Disclaimer</Link> for merchants
                  </label>

                  <button 
                    type="submit" 
                    className={`register-btn ${hasErrors ? 'has-errors' : ''}`}
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
