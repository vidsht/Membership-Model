import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './PartnerRegistration.css';

/**
 * PartnerRegistration component for registering new business partners
 * @returns {React.ReactElement} The partner registration component
 */
const PartnerRegistration = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
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
    establishedYear: '',
    employeeCount: '',
    businessLicense: null,
    taxId: '',
    logoFile: null,
    hasAgreedToTerms: false,
    planType: 'basic_business' // Default to basic business plan
  });
    const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [merchantPlans, setMerchantPlans] = useState([]);
  const totalSteps = 3;
  
  // Fetch merchant plans on component mount
  useEffect(() => {
    const fetchMerchantPlans = async () => {
      try {
        const response = await api.get('/admin/plans?userType=merchant');
        const plans = response.data || [];
        setMerchantPlans(plans);
      } catch (error) {
        console.error('Error fetching merchant plans:', error);
        showNotification('Error loading merchant plans', 'error');
      }
    };
    
    fetchMerchantPlans();
  }, [showNotification]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };
  
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    
    if (files && files[0]) {
      // Validate file size (max 5MB)
      if (files[0].size > 5 * 1024 * 1024) {
        setFormErrors({
          ...formErrors,
          [name]: 'File size must be less than 5MB'
        });
        return;
      }
      
      setFormData({ ...formData, [name]: files[0] });
      
      // Clear error when field is edited
      if (formErrors[name]) {
        setFormErrors({ ...formErrors, [name]: '' });
      }
    }
  };
  
  const validateStep = (currentStep) => {
    const newErrors = {};
    
    if (currentStep === 1) {
      if (!formData.businessName.trim()) {
        newErrors.businessName = 'Business name is required';
      }
        if (!formData.category) {
        newErrors.category = 'Category is required';
      }
      
      if (!formData.planType) {
        newErrors.planType = 'Business plan is required';
      }
      
      if (!formData.ownerName.trim()) {
        newErrors.ownerName = 'Owner name is required';
      }
      
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(formData.email)) {
        newErrors.email = 'Invalid email address';
      }
      
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
    } else if (currentStep === 2) {
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
      }
      
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
      
      if (!formData.taxId.trim()) {
        newErrors.taxId = 'Tax ID / Business Registration Number is required';
      }
      
      if (!formData.businessLicense) {
        newErrors.businessLicense = 'Business license document is required';
      }
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      setFormErrors({
        ...formErrors,
        hasAgreedToTerms: 'You must agree to the terms and conditions'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create FormData object for file uploads
      const formDataObj = new FormData();
      
      // Append all text fields
      Object.keys(formData).forEach(key => {
        if (key !== 'businessLicense' && key !== 'logoFile') {
          formDataObj.append(key, formData[key]);
        }
      });
      
      // Append files
      if (formData.businessLicense) {
        formDataObj.append('businessLicense', formData.businessLicense);
      }
      
      if (formData.logoFile) {
        formDataObj.append('logoFile', formData.logoFile);
      }
      
      const response = await api.post('/admin/partners/register', formDataObj);
      
      showNotification('Partner registration submitted successfully. It will be reviewed shortly.', 'success');
      navigate('/admin/partners');
    } catch (error) {
      console.error('Error registering partner:', error);
      
      // Handle validation errors from server
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
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
                  <option value="restaurant">Restaurant</option>
                  <option value="retail">Retail</option>
                  <option value="service">Service</option>
                  <option value="professional">Professional</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>                </select>
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
                  {merchantPlans.map(plan => (
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
                placeholder="https://example.com"
                value={formData.website}
                onChange={handleChange}
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
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                />
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
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="establishedYear">Year Established</label>
                <input
                  type="number"
                  id="establishedYear"
                  name="establishedYear"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.establishedYear}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="employeeCount">Number of Employees</label>
                <input
                  type="number"
                  id="employeeCount"
                  name="employeeCount"
                  min="1"
                  value={formData.employeeCount}
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
              <label htmlFor="businessLicense">Business License / Registration Document *</label>
              <input
                type="file"
                id="businessLicense"
                name="businessLicense"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className={formErrors.businessLicense ? 'error' : ''}
              />
              <small>Allowed formats: PDF, JPG, PNG (Max: 5MB)</small>
              {formErrors.businessLicense && <div className="error-message">{formErrors.businessLicense}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="logoFile">Business Logo</label>
              <input
                type="file"
                id="logoFile"
                name="logoFile"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileChange}
                className={formErrors.logoFile ? 'error' : ''}
              />
              <small>Allowed formats: JPG, PNG (Max: 5MB)</small>
              {formErrors.logoFile && <div className="error-message">{formErrors.logoFile}</div>}
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
                  {merchantPlans.find(plan => plan.key === formData.planType)?.name || formData.planType}
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
                <div className="review-label">Year Established:</div>
                <div className="review-value">{formData.establishedYear || 'Not provided'}</div>
              </div>
              <div className="review-row">
                <div className="review-label">Number of Employees:</div>
                <div className="review-value">{formData.employeeCount || 'Not provided'}</div>
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
          Business Partner Registration
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
                  <i className="fas fa-spinner fa-spin"></i> Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i> Submit Registration
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
