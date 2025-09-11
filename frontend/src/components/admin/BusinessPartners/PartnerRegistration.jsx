import React, { useState, useEffect } from 'react';
import { useDynamicFields } from '../../../hooks/useDynamicFields';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import FormField from '../../common/FormField';
import FormErrorSummary from '../../common/FormErrorSummary';
import adminApi from '../../../services/adminApi';
import api from '../../../services/api';
import './PartnerRegistration.css';
import '../../../styles/FormValidation.css';

/**
 * PartnerRegistration component for registering new business partners
 * @returns {React.ReactElement} The partner registration component
 */
const PartnerRegistration = () => {
  const { getBusinessCategoryOptions, getStateOptions, isLoading: fieldsLoading } = useDynamicFields();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { id: partnerId } = useParams();

  // Initialize form validation
  const {
    errors,
    touchedFields,
    hasErrors,
    validateForm,
    validateField,
    markFieldTouched,
    clearAllErrors,
    setFieldError,
    clearFieldError
  } = useFormValidation();

  // Partner validation schema for different steps
  const partnerValidationSchema = {
    // Step 1: Basic Information
    businessName: {
      rules: ['required', 'businessName'],
      displayName: 'Business Name'
    },
    category: {
      rules: ['required'],
      displayName: 'Business Category'
    },
    planType: {
      rules: ['required'],
      displayName: 'Business Plan'
    },
    ownerName: {
      rules: ['required', { type: 'minLength', minLength: 2 }],
      displayName: 'Owner Name'
    },
    email: {
      rules: ['required', 'email'],
      displayName: 'Email'
    },
    phone: {
      rules: ['required', 'phone'],
      displayName: 'Phone Number'
    },
    // Step 2: Address Information
    address: {
      rules: ['required'],
      displayName: 'Address'
    },
    city: {
      rules: ['required'],
      displayName: 'City'
    },
    state: {
      rules: ['required'],
      displayName: 'State'
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
    businessName: 'Business Name',
    category: 'Business Category',
    planType: 'Business Plan',
    ownerName: 'Owner Name',
    email: 'Email',
    phone: 'Phone Number',
    address: 'Address',
    city: 'City',
    state: 'State',
    zipCode: 'ZIP Code',
    website: 'Website',
    description: 'Description',
    businessLicense: 'Business License',
    taxId: 'Tax ID',
    logoFile: 'Logo File',
    bloodGroup: 'Blood Group'
  };
  const [formData, setFormData] = useState({
    businessName: '',
    category: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    description: '',
    businessLicense: null,
    taxId: '',
    logoFile: null,
    hasAgreedToTerms: false,
    planType: 'basic_business', // Default to basic business plan
    bloodGroup: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [merchantPlans, setMerchantPlans] = useState([]);
  const totalSteps = 3;

  // Normalize website input: strip http(s):// and ensure www. prefix when non-empty
  const sanitizeWebsite = (value) => {
    if (!value) return '';
    let v = String(value).trim();
    if (v.startsWith('https://')) v = v.slice(8);
    if (v.startsWith('http://')) v = v.slice(7);
    if (v && !v.startsWith('www.')) v = 'www.' + v;
    return v;
  };

  // Fetch merchant plans on component mount
  useEffect(() => {
    const fetchMerchantPlans = async () => {
      try {
        // Use the same endpoint and logic as UnifiedRegistration.jsx
        const API_BASE = 'https://membership-model.onrender.com/api';

        const plansRes = await fetch(`${API_BASE}/plans?type=merchant&isActive=true`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (plansRes.ok) {
          const plansJson = await plansRes.json();
          setMerchantPlans(plansJson.plans || []);
          // Set default planType to first available merchant plan if not already set
          if (plansJson.plans && plansJson.plans.length > 0) {
            setFormData(prev => ({ ...prev, planType: prev.planType || plansJson.plans[0].key }));
          }
        } else {
          setMerchantPlans([]);
          showNotification('Error loading merchant plans', 'error');
        }
      } catch (error) {
        console.error('Error fetching merchant plans:', error);
        setMerchantPlans([]);
        showNotification('Error loading merchant plans', 'error');
      }
    };
    fetchMerchantPlans();
  }, [showNotification]);

  // Fetch merchant data for edit mode
  useEffect(() => {
    if (partnerId) {
      setIsEditMode(true);
      const fetchMerchant = async () => {
        try {
          console.log('🔍 PartnerRegistration: Fetching merchant for edit, ID:', partnerId);
          setIsLoading(true);
          
          const response = await adminApi.getPartner(partnerId);
          console.log('📄 PartnerRegistration: AdminAPI response:', response);
          
          if (response && response.merchant) {
            const m = response.merchant;
            console.log('✅ PartnerRegistration: Merchant data for edit:', m);
            
            setFormData({
              businessName: m.businessName || '',
              category: m.businessCategory || m.category || '',
              ownerName: m.ownerName || m.fullName || '',
              email: m.businessEmail || m.email || '',
              phone: m.businessPhone || m.phone || '',
              address: m.businessAddress || m.address || '',
              city: m.city || '',
              state: m.state || '',
              zipCode: m.zipCode || '',
              website: sanitizeWebsite(m.website || ''),
              description: m.businessDescription || m.description || '',
              businessLicense: m.businessLicense || null,
              taxId: m.taxId || '',
              logoFile: null, // File input cannot be pre-filled
              hasAgreedToTerms: true, // Assume true for edit
              planType: m.plan || m.planType || m.membershipType || 'basic_business',
            });
            console.log('✅ PartnerRegistration: Form data set for edit mode');
          } else {
            console.error('❌ PartnerRegistration: Failed to load merchant details:', response);
            showNotification('Failed to load merchant details for editing.', 'error');
            navigate('/admin', { state: { activeTab: 'merchants' } });
          }
        } catch (error) {
          console.error('❌ PartnerRegistration: Error fetching merchant for edit:', error);
          showNotification('Failed to load merchant details for editing.', 'error');
          navigate('/admin', { state: { activeTab: 'merchants' } });
        } finally {
          setIsLoading(false);
        }
      };
      fetchMerchant();
    } else {
      setIsEditMode(false);
    }
  }, [partnerId, navigate, showNotification]);
  
  const handleChange = (e) => {
     const { name, value, type, checked } = e.target;
     
     if (type === 'checkbox') {
       setFormData({ ...formData, [name]: checked });
     } else {
      // Allow free typing; we'll normalize on blur and before submit
      setFormData({ ...formData, [name]: value });
     }
     
     // Validate field on change if it was already touched
     if (touchedFields[name]) {
       validateField(name, type === 'checkbox' ? checked : value, partnerValidationSchema[name]?.rules || [], fieldLabels[name]);
     }
   };

  const handleFieldBlur = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    markFieldTouched(name);
    validateField(name, fieldValue, partnerValidationSchema[name]?.rules || [], fieldLabels[name]);
  };
  
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    
    if (files && files[0]) {
      // Validate file size (max 5MB)
      if (files[0].size > 5 * 1024 * 1024) {
        setFieldError(name, 'File size must be less than 5MB');
        return;
      }
      
      setFormData({ ...formData, [name]: files[0] });
      clearFieldError(name);
    }
  };

  const validateStep = (currentStep) => {
    const stepFields = getStepFields(currentStep);
    let isStepValid = true;
    
    // Create validation schema for current step only
    const stepValidationSchema = {};
    stepFields.forEach(fieldName => {
      if (partnerValidationSchema[fieldName]) {
        stepValidationSchema[fieldName] = partnerValidationSchema[fieldName];
      }
    });
    
    // Get only the data for this step
    const stepData = {};
    stepFields.forEach(fieldName => {
      stepData[fieldName] = formData[fieldName];
    });
    
    // Validate step data
    const stepIsValid = validateForm(stepData, stepValidationSchema);
    
    if (!stepIsValid) {
      showNotification(`Please correct the errors in step ${currentStep} before proceeding`, 'error');
      return false;
    }
    
    return true;
  };

  const getStepFields = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return ['businessName', 'category', 'planType', 'ownerName', 'email', 'phone'];
      case 2:
        return ['address', 'city', 'state', 'website', 'taxId'];
      case 3:
        return []; // Final step, no additional validation needed
      default:
        return [];
    }
  };
  
  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };
  
  const handlePreviousStep = () => {
    setStep(step - 1);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate final step
    if (!validateStep(step)) {
      return;
    }
    
    // Validate terms agreement
    if (!formData.hasAgreedToTerms) {
      setFieldError('hasAgreedToTerms', 'You must agree to the terms and conditions');
      showNotification('You must agree to the terms and conditions', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      const businessAddress = `${formData.address}, ${formData.city}, ${formData.state}, ${formData.zipCode}`;
      if (isEditMode && partnerId) {
        // Edit mode: update existing merchant
        const payload = {
          businessName: formData.businessName,
          businessCategory: formData.category,
          ownerName: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          website: sanitizeWebsite(formData.website),
          description: formData.description,
          businessLicense: formData.businessLicense,
          taxId: formData.taxId,
          planType: formData.planType,
        };
        const response = await adminApi.updatePartner(partnerId, payload);
        showNotification('Partner details updated successfully.', 'success');
        navigate('/admin', { state: { activeTab: 'merchants' } });
      } else {
        // Add mode: register new merchant
        const payload = {
          fullName: formData.ownerName, // Use ownerName as fullName
          email: formData.email,
          password: 'tempPassword123', // Admin creates account with temp password
          phone: formData.phone,
          plan: formData.planType,
          membershipType: formData.planType, // <-- ensure this is sent for backend
          bloodGroup: formData.bloodGroup,
          socialMediaFollowed: [], // Empty for admin-created accounts
          businessInfo: {
            businessName: formData.businessName,
            businessDescription: formData.description,
            businessCategory: formData.category,
            businessPhone: formData.phone,
            businessEmail: formData.email,
            website: sanitizeWebsite(formData.website),
            businessLicense: formData.businessLicense,
            taxId: formData.taxId,
            businessAddress
          }
        };
        const response = await adminApi.createPartner(payload);
        showNotification('Partner created successfully', 'success');
        navigate('/admin', { state: { activeTab: 'merchants' } });
      }
    } catch (error) {
      console.error('Error submitting partner:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        showNotification(error.response.data.message, 'error');
      } else {
        showNotification('Failed to submit partner registration. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderStepIndicator = () => {
    return (
      <div className="step-indicator">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div 
            key={i} 
            className={`step ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}`}
          >
            <div className="step-number">
              {i + 1 < step ? <i className="fas fa-check"></i> : i + 1}
            </div>
            <div className="step-title">
              {i === 0 ? 'Basic Information' : i === 1 ? 'Business Details' : 'Review & Submit'}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderFormStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="form-step">
            <h3>Basic Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessName">Business Name *</label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className={formErrors.businessName ? 'error' : ''}
                />
                {formErrors.businessName && <div className="error-message">{formErrors.businessName}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="category">Business Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={formErrors.category ? 'error' : ''}
                >
                  <option value="">Select a category</option>
                  {getBusinessCategoryOptions().map(category => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
                {formErrors.category && <div className="error-message">{formErrors.category}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="planType">Business Plan *</label>
                <select
                  id="planType"
                  name="planType"
                  value={formData.planType}
                  onChange={handleChange}
                  className={formErrors.planType ? 'error' : ''}
                >
                  <option value="">Select a plan</option>
                  {(Array.isArray(merchantPlans) ? merchantPlans : []).map(plan => (
                    <option key={plan.key} value={plan.key}>
                      {plan.name} - {plan.price > 0 ? `${plan.currency} ${plan.price}/${plan.billingCycle}` : 'Free'}
                    </option>
                  ))}
                </select>
                {formErrors.planType && <div className="error-message">{formErrors.planType}</div>}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="ownerName">Owner Name *</label>
              <input
                type="text"
                id="ownerName"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                className={formErrors.ownerName ? 'error' : ''}
              />
              {formErrors.ownerName && <div className="error-message">{formErrors.ownerName}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="bloodGroup">Owner Blood Group</label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
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
                <label htmlFor="email">Business Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={formErrors.email ? 'error' : ''}
                />
                {formErrors.email && <div className="error-message">{formErrors.email}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="phone">Business Phone *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={formErrors.phone ? 'error' : ''}
                />
                {formErrors.phone && <div className="error-message">{formErrors.phone}</div>}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="website">Business Website</label>
              <input
                type="url"
                id="website"
                name="website"
                placeholder="www.example.com"
                value={formData.website}
                onChange={handleChange}
                onBlur={(e) => setFormData(prev => ({ ...prev, website: sanitizeWebsite(prev.website) }))}
              />
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="form-step">
            <h3>Business Details</h3>
            
            <div className="form-group">
              <label htmlFor="address">Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={formErrors.address ? 'error' : ''}
              />
              {formErrors.address && <div className="error-message">{formErrors.address}</div>}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={formErrors.city ? 'error' : ''}
                />
                {formErrors.city && <div className="error-message">{formErrors.city}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="state">State/Region</label>
                <div className="select-with-icon" style={{ position: 'relative' }}>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
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
              
              <div className="form-group">
                <label htmlFor="zipCode">Postal Code</label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="taxId">Tax ID / Business Registration Number *</label>
              <input
                type="text"
                id="taxId"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
                className={formErrors.taxId ? 'error' : ''}
              />
              {formErrors.taxId && <div className="error-message">{formErrors.taxId}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="businessLicense">Business License / Registration Document (optional)</label>
              <input
                type="businessLicense"
                id="businessLicense"
                name="businessLicense"
                value={formData.businessLicense}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Business Description</label>
              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your business, products, and services..."
              ></textarea>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="form-step">
            <h3>Review & Submit</h3>
            
            <div className="review-section">
              <h4>Business Information</h4>
              <div className="review-row">
                <div className="review-label">Business Name:</div>
                <div className="review-value">{formData.businessName}</div>
              </div>              <div className="review-row">
                <div className="review-label">Category:</div>
                <div className="review-value">{formData.category}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Business Plan:</div>
                <div className="review-value">
                  {(Array.isArray(merchantPlans) ? merchantPlans : []).find(plan => plan.key === formData.planType)?.name || formData.planType}
                </div>
              </div>
              <div className="review-row">
                <div className="review-label">Owner Name:</div>
                <div className="review-value">{formData.ownerName}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Email:</div>
                <div className="review-value">{formData.email}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Phone:</div>
                <div className="review-value">{formData.phone}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Website:</div>
                <div className="review-value">{formData.website || 'Not provided'}</div>
              </div>
            </div>
            
            <div className="review-section">
              <h4>Business Details</h4>
              <div className="review-row">
                <div className="review-label">Address:</div>
                <div className="review-value">{formData.address}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Location:</div>
                <div className="review-value">{`${formData.city}${formData.state ? ', ' + formData.state : ''}${formData.zipCode ? ' ' + formData.zipCode : ''}`}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Tax ID / Registration:</div>
                <div className="review-value">{formData.taxId}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Business License:</div>
                <div className="review-value">{formData.businessLicense ? formData.businessLicense.name : 'Not provided'}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Logo:</div>
                <div className="review-value">{formData.logoFile ? formData.logoFile.name : 'Not provided'}</div>
              </div>
            </div>
            
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="hasAgreedToTerms"
                name="hasAgreedToTerms"
                checked={formData.hasAgreedToTerms}
                onChange={handleChange}
              />
              <label htmlFor="hasAgreedToTerms">
                I confirm that all information provided is accurate and I agree to the <a href="#" target="_blank">terms and conditions</a> for business partners.
              </label>
              {formErrors.hasAgreedToTerms && <div className="error-message">{formErrors.hasAgreedToTerms}</div>}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="partner-registration">
      <div className="registration-header">
        <h2>
          <i className="fas fa-store"></i>
          {isEditMode ? 'Edit Business Partner' : 'Business Partner Registration'}
        </h2>
      </div>
      {renderStepIndicator()}
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        {renderFormStep()}
        <div className="form-actions">
          {step > 1 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={handlePreviousStep}
              disabled={isLoading}
            >
              <i className="fas fa-arrow-left"></i> Previous
            </button>
          )}
          {step < totalSteps ? (
            <button
              type="button"
              className="button button-primary"
              onClick={handleNextStep}
              disabled={isLoading}
            >
              Next <i className="fas fa-arrow-right"></i>
            </button>
          ) : (
            <button
              type="submit"
              className="button button-success"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> {isEditMode ? 'Saving...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i> {isEditMode ? 'Save Changes' : 'Submit Registration'}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PartnerRegistration;
