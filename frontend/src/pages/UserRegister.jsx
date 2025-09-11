import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFormValidation, validationSchemas } from '../hooks/useFormValidation';
import FormField from '../components/common/FormField';
import FormErrorSummary from '../components/common/FormErrorSummary';
import '../styles/registration.css';
import '../styles/FormValidation.css';

const UserRegister = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    plan: 'community',
    bloodGroup: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Initialize form validation
  const {
    errors,
    touchedFields,
    hasErrors,
    validateForm,
    validateField,
    markFieldTouched,
    clearAllErrors,
    getFieldClass
  } = useFormValidation();

  // Custom validation schema for user registration
  const userRegValidationSchema = {
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
    phone: {
      rules: ['required', 'phone'],
      displayName: 'Phone Number'
    },
    address: {
      rules: [],
      displayName: 'Address'
    },
    bloodGroup: {
      rules: [],
      displayName: 'Blood Group'
    },
    plan: {
      rules: ['required'],
      displayName: 'Membership Plan'
    }
  };

  const fieldLabels = {
    fullName: 'Full Name',
    email: 'Email Address',
    password: 'Password',
    phone: 'Phone Number',
    address: 'Address',
    bloodGroup: 'Blood Group',
    plan: 'Membership Plan'
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate field on change if it was already touched
    if (touchedFields[name]) {
      validateField(name, value, userRegValidationSchema[name]?.rules || [], fieldLabels[name]);
    }
  };

  const handleFieldBlur = (e) => {
    const { name, value } = e.target;
    markFieldTouched(name);
    validateField(name, value, userRegValidationSchema[name]?.rules || [], fieldLabels[name]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate entire form
    const isValid = validateForm(formData, userRegValidationSchema);
    
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
      const result = await register(formData);
      
      if (result.success) {
        showNotification('Registration successful!', 'success');
        clearAllErrors();
        // setTimeout(() => navigate('/login'), 2000); // Removed redirect to login after registration
      } else {
        showNotification(result.message || 'Registration failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showNotification('Registration failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-wrapper">
        <div className="register-header">
          <h2>Join Indians in Ghana</h2>
          <p>Register for your membership and join our vibrant community</p>
        </div>
        
        <div className="register-content">
          <div className="register-form-container">
            {notification.message && (
              <div className={`notification ${notification.type}`}>
                {notification.message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="register-form">
              <FormErrorSummary 
                errors={errors} 
                fieldLabels={fieldLabels}
                show={hasErrors && Object.keys(touchedFields).length > 0}
              />
              
              <div className="form-section">
                <h3>Personal Information</h3>
                
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
                  placeholder="Enter your full name"
                />

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
                  placeholder="Enter your email address"
                />

                <FormField
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  error={errors.password}
                  touched={touchedFields.password}
                  required={true}
                  placeholder="Create a strong password"
                />

                <FormField
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  error={errors.phone}
                  touched={touchedFields.phone}
                  required={true}
                  placeholder="Enter your phone number"
                />

                <FormField
                  label="Address"
                  name="address"
                  type="textarea"
                  value={formData.address}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  error={errors.address}
                  touched={touchedFields.address}
                  placeholder="Enter your address"
                  rows={3}
                />

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

                <FormField
                  label="Membership Plan"
                  name="plan"
                  type="select"
                  value={formData.plan}
                  onChange={handleInputChange}
                  onBlur={handleFieldBlur}
                  error={errors.plan}
                  touched={touchedFields.plan}
                  required={true}
                  options={[
                    { value: 'community', label: 'Community (Free)' },
                    { value: 'silver', label: 'Silver (50 GHS)' },
                    { value: 'gold', label: 'Gold (150 GHS)' }
                  ]}
                />
              </div>

              <div className="form-section">
                <div className="form-group">
                  <div className="terms-checkbox">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
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
                  className={`register-button ${loading ? 'loading' : ''} ${hasErrors ? 'has-errors' : ''}`}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;
