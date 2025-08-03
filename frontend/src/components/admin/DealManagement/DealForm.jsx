import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './DealForm.css';

const DealForm = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const isEditMode = Boolean(dealId);
    const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [userPlans, setUserPlans] = useState([]);  const [formData, setFormData] = useState({
    title: '',
    description: '',
    businessId: '',
    discount: '',
    discountType: 'percentage',
    originalPrice: '',
    discountedPrice: '',
    category: '',
    validFrom: '',
    validUntil: '',
    requiredPlanPriority: 1, // Default to lowest priority
    termsConditions: '',
    couponCode: '',
    featuredImage: null,
    status: 'active'
  });
  
  const [formErrors, setFormErrors] = useState({});
    useEffect(() => {
    fetchBusinesses();
    fetchUserPlans();
    fetchUserPlans();
    
    if (isEditMode) {
      fetchDealData();
    } else {
      // Set default dates for new deals
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      setFormData(prev => ({
        ...prev,
        validFrom: formatDateForInput(today),
        validUntil: formatDateForInput(nextMonth)
      }));
    }
  }, [dealId]);  const fetchBusinesses = async () => {
    try {
      const response = await api.get('/admin/businesses');
      setBusinesses(response.data.businesses || []);
      
      // If there's at least one business and we're not in edit mode, select the first one
      if (response.data.businesses && response.data.businesses.length > 0 && !isEditMode) {
        setFormData(prev => ({
          ...prev,
          businessId: response.data.businesses[0].businessId
        }));
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
      showNotification('Could not load businesses. Please try again.', 'error');
    }
  };
    const fetchUserPlans = async () => {
    try {
      const response = await api.get('/plans/user-plans');
      setUserPlans(response.data.plans || []);
      
      // Set default required plan priority to the lowest priority plan if no data is loaded
      if (response.data.plans && response.data.plans.length > 0 && !isEditMode) {
        const lowestPriorityPlan = response.data.plans.reduce((min, plan) => 
          plan.priority < min.priority ? plan : min
        );
        setFormData(prev => ({
          ...prev,
          requiredPlanPriority: lowestPriorityPlan.priority
        }));
      }
    } catch (error) {
      console.error('Error fetching user plans:', error);
      showNotification('Could not load membership plans. Please try again.', 'error');
    }
  };
    const fetchDealData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/admin/deals/${dealId}`);
      
      // Format dates for form inputs
      const deal = response.data.deal;
      deal.validFrom = formatDateForInput(new Date(deal.validFrom));
      deal.validUntil = formatDateForInput(new Date(deal.validUntil));
      
      setFormData(deal);
    } catch (error) {
      console.error('Error fetching deal:', error);
      showNotification('Could not load deal details. Please try again.', 'error');
      navigate('/admin/deals');
    } finally {
      setIsLoading(false);
    }
  };
    const formatDateForInput = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  };
    const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.businessId) errors.businessId = 'Business is required';
    if (!formData.discount) errors.discount = 'Discount value is required';
    if (!formData.originalPrice) errors.originalPrice = 'Original price is required';
    if (!formData.discountedPrice) errors.discountedPrice = 'Discounted price is required';
    if (!formData.category.trim()) errors.category = 'Category is required';
    if (!formData.validFrom) errors.validFrom = 'Start date is required';
    if (!formData.validUntil) errors.validUntil = 'End date is required';
    
    // Validate prices
    if (formData.originalPrice) {
      const originalPrice = parseFloat(formData.originalPrice);
      if (isNaN(originalPrice) || originalPrice <= 0) {
        errors.originalPrice = 'Original price must be greater than 0';
      }
    }
    
    if (formData.discountedPrice) {
      const discountedPrice = parseFloat(formData.discountedPrice);
      if (isNaN(discountedPrice) || discountedPrice < 0) {
        errors.discountedPrice = 'Discounted price must be 0 or greater';
      }
    }
    
    // Validate that discounted price is less than original price
    if (formData.originalPrice && formData.discountedPrice) {
      const originalPrice = parseFloat(formData.originalPrice);
      const discountedPrice = parseFloat(formData.discountedPrice);
      
      if (!isNaN(originalPrice) && !isNaN(discountedPrice) && discountedPrice >= originalPrice) {
        errors.discountedPrice = 'Discounted price must be less than original price';
      }
    }
    
    // Check if end date is after start date
    if (formData.validFrom && formData.validUntil) {
      const startDate = new Date(formData.validFrom);
      const endDate = new Date(formData.validUntil);
      
      if (endDate <= startDate) {
        errors.validUntil = 'End date must be after start date';
      }
    }
    
    // Validate discount based on type
    if (formData.discountType === 'percentage') {
      const discountValue = parseFloat(formData.discount);
      if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
        errors.discount = 'Percentage discount must be between 1 and 100';
      }
    } else if (formData.discountType === 'fixed') {
      const discountValue = parseFloat(formData.discount);
      if (isNaN(discountValue) || discountValue <= 0) {
        errors.discount = 'Fixed discount amount must be greater than 0';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
    const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: e.target.files[0]
      }));
    } else {
      const newFormData = {
        ...formData,
        [name]: value
      };
      
      // Auto-calculate discounted price when original price or discount changes
      if ((name === 'originalPrice' || name === 'discount' || name === 'discountType') 
          && newFormData.originalPrice && newFormData.discount && newFormData.discountType) {
        const originalPrice = parseFloat(newFormData.originalPrice);
        const discount = parseFloat(newFormData.discount);
        
        if (!isNaN(originalPrice) && !isNaN(discount)) {
          if (newFormData.discountType === 'percentage') {
            newFormData.discountedPrice = (originalPrice * (1 - discount / 100)).toFixed(2);
          } else if (newFormData.discountType === 'fixed') {
            newFormData.discountedPrice = Math.max(0, originalPrice - discount).toFixed(2);
          }
        }
      }
      
      setFormData(newFormData);
    }
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Prepare data for submission
      const submitData = { ...formData };      // Remove fields that shouldn't be sent to backend
      delete submitData.featuredImage; // Handle file uploads separately if needed
      
      // Ensure requiredPlanPriority is included
      submitData.requiredPlanPriority = parseInt(submitData.requiredPlanPriority);
      
      // Add calculated fields if needed
      if (submitData.discount && submitData.discountType === 'percentage') {
        // Backend might expect originalPrice and discountedPrice
        // For now, we'll send the discount value and type
      }
      
      // Add debug logging (remove after testing)
      console.log('Submitting deal data:', submitData);
      
      if (isEditMode) {
        await api.put(`/admin/deals/${dealId}`, submitData);
        showNotification('Deal updated successfully', 'success');
      } else {
        await api.post('/admin/deals', submitData);
        showNotification('Deal created successfully', 'success');
      }
      
      navigate('/admin/deals');
    } catch (error) {
      console.error('Error saving deal:', error);
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.msg).join(', ');
        showNotification(`Validation errors: ${errorMessages}`, 'error');
      } else if (error.response?.data?.message) {
        showNotification(error.response.data.message, 'error');
      } else {
        showNotification('Failed to save deal. Please try again.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const dealCategories = [
    'Restaurant', 'Retail', 'Electronics', 'Fashion', 
    'Health & Wellness', 'Entertainment', 'Travel',
    'Education', 'Home & Garden', 'Services', 'Other'
  ];
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading deal data...</p>
      </div>
    );
  }
  
  return (
    <div className="admin-deal-form">
      <div className="page-header">
        <h1>{isEditMode ? 'Edit Deal' : 'Create New Deal'}</h1>
        <button 
          className="btn-secondary" 
          onClick={() => navigate('/admin/deals')}
        >
          <i className="fas fa-arrow-left"></i> Back to Deals
        </button>
      </div>
      
      <form className="deal-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-section">
            <h2>Basic Information</h2>
            
            <div className="form-group">
              <label htmlFor="title">Deal Title <span className="required">*</span></label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={formErrors.title ? 'error' : ''}
                placeholder="e.g., '20% Off on All Electronics'"
              />
              {formErrors.title && <span className="error-message">{formErrors.title}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="businessId">Business <span className="required">*</span></label>
              <select
                id="businessId"
                name="businessId"
                value={formData.businessId}
                onChange={handleChange}
                className={formErrors.businessId ? 'error' : ''}              >                <option key="select-business" value="">Select Business</option>
                {businesses.map(business => (
                  <option key={business.businessId} value={business.businessId}>
                    {business.businessName}
                  </option>
                ))}
              </select>
              {formErrors.businessId && <span className="error-message">{formErrors.businessId}</span>}
              {businesses.length === 0 && (
                <span className="info-message">
                  No businesses found. <a href="/admin/partners/register">Add a business partner</a>
                </span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="category">Category <span className="required">*</span></label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={formErrors.category ? 'error' : ''}              >
                <option key="select-category" value="">Select Category</option>
                {dealCategories.map(category => (
                  <option key={category} value={category.toLowerCase()}>
                    {category}
                  </option>
                ))}
              </select>
              {formErrors.category && <span className="error-message">{formErrors.category}</span>}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="discountType">Discount Type <span className="required">*</span></label>              <select
                id="discountType"
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
              >
                <option key="percentage" value="percentage">Percentage (%)</option>
                <option key="fixed" value="fixed">Fixed Amount (GHS)</option>
                <option key="buyOneGetOne" value="buyOneGetOne">Buy One Get One Free</option>
                <option key="freeItem" value="freeItem">Free Item</option>
              </select>
              </div>
                <div className="form-group">
                <label htmlFor="discount">Discount Value <span className="required">*</span></label>
                <div className="input-with-suffix">
                  <input
                    type="text"
                    id="discount"
                    name="discount"
                    value={formData.discount}
                    onChange={handleChange}
                    className={formErrors.discount ? 'error' : ''}
                    placeholder={formData.discountType === 'percentage' ? '20' : '50'}
                    disabled={['buyOneGetOne', 'freeItem'].includes(formData.discountType)}
                  />
                  <span className="input-suffix">
                    {formData.discountType === 'percentage' ? '%' : 'GHS'}
                  </span>
                </div>
                {formErrors.discount && <span className="error-message">{formErrors.discount}</span>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="originalPrice">Original Price <span className="required">*</span></label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    id="originalPrice"
                    name="originalPrice"
                    value={formData.originalPrice}
                    onChange={handleChange}
                    className={formErrors.originalPrice ? 'error' : ''}
                    placeholder="100.00"
                    step="0.01"
                    min="0"
                  />
                  <span className="input-suffix">GHS</span>
                </div>
                {formErrors.originalPrice && <span className="error-message">{formErrors.originalPrice}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="discountedPrice">Discounted Price <span className="required">*</span></label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    id="discountedPrice"
                    name="discountedPrice"
                    value={formData.discountedPrice}
                    onChange={handleChange}
                    className={formErrors.discountedPrice ? 'error' : ''}
                    placeholder="80.00"
                    step="0.01"
                    min="0"
                  />
                  <span className="input-suffix">GHS</span>
                </div>
                {formErrors.discountedPrice && <span className="error-message">{formErrors.discountedPrice}</span>}
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h2>Deal Details</h2>
            
            <div className="form-group">
              <label htmlFor="description">Description <span className="required">*</span></label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className={formErrors.description ? 'error' : ''}
                placeholder="Provide detailed information about this deal..."
              ></textarea>
              {formErrors.description && <span className="error-message">{formErrors.description}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="termsConditions">Terms & Conditions</label>
              <textarea
                id="termsConditions"
                name="termsConditions"
                value={formData.termsConditions}
                onChange={handleChange}
                rows="3"
                placeholder="Any specific terms, conditions, or limitations for this deal..."
              ></textarea>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="validFrom">Valid From <span className="required">*</span></label>
                <input
                  type="date"
                  id="validFrom"
                  name="validFrom"
                  value={formData.validFrom}
                  onChange={handleChange}
                  className={formErrors.validFrom ? 'error' : ''}
                />
                {formErrors.validFrom && <span className="error-message">{formErrors.validFrom}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="validUntil">Valid Until <span className="required">*</span></label>
                <input
                  type="date"
                  id="validUntil"
                  name="validUntil"
                  value={formData.validUntil}
                  onChange={handleChange}
                  className={formErrors.validUntil ? 'error' : ''}
                />
                {formErrors.validUntil && <span className="error-message">{formErrors.validUntil}</span>}
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h2>Deal Configuration</h2>
              <div className="form-group">
              <label htmlFor="requiredPlanPriority">Membership Access Level <span className="required">*</span></label>
              <select
                id="requiredPlanPriority"
                name="requiredPlanPriority"
                value={formData.requiredPlanPriority}
                onChange={handleChange}
              >
                {userPlans.map((plan) => (
                  <option key={plan.id} value={plan.priority}>
                    {plan.name} (Priority: {plan.priority})
                  </option>
                ))}
              </select>
              <span className="help-text">
                Which membership tiers can access this deal (users with this priority or higher)
              </span>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="couponCode">Coupon Code</label>
                <input
                  type="text"
                  id="couponCode"
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleChange}
                  placeholder="e.g., SUMMER2025"                />
                <span className="help-text">Optional redemption code</span>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="featuredImage">Featured Image</label>
              <input
                type="file"
                id="featuredImage"
                name="featuredImage"
                onChange={handleChange}
                accept="image/*"
              />
              <span className="help-text">
                Recommended size: 800×450px (16:9 ratio)
              </span>
              
              {formData.imageUrl && (
                <div className="current-image">
                  <p>Current image:</p>
                  <img src={formData.imageUrl} alt="Deal featured image" />
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="status">Status</label>              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option key="active" value="active">Active</option>
                <option key="inactive" value="inactive">Inactive</option>
                <option key="scheduled" value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => navigate('/admin/deals')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span className="sr-only">Saving...</span>
              </>
            ) : isEditMode ? 'Update Deal' : 'Create Deal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DealForm;
