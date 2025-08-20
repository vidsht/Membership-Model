import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useDynamicFields } from '../hooks/useDynamicFields';
import { merchantApi } from '../services/api';
import api from '../services/api';
import ImageUpload from './common/ImageUpload';
import { useImageUrl } from '../hooks/useImageUrl.jsx';
import './MerchantDealForm.css';

const MerchantDealForm = ({ deal, onDealCreated, onClose, isEditing = false }) => {
  const { showNotification } = useNotification();
  const { getDealCategoryOptions } = useDynamicFields();
  const { getDealBannerUrl } = useImageUrl();
  const [isSaving, setIsSaving] = useState(false);
  const [userPlans, setUserPlans] = useState([]);
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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
    featuredImage: null
  });
    const [formErrors, setFormErrors] = useState({});
  
  const fetchUserPlans = async () => {
    try {
      const response = await api.get('/plans/user-plans');
      setUserPlans(response.data.plans || []);
      
      // Set default required plan priority to the lowest priority plan if no data is loaded
      if (response.data.plans && response.data.plans.length > 0) {
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

  // Set default dates for new deals and fetch user plans
  React.useEffect(() => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    setFormData(prev => ({
      ...prev,
      validFrom: formatDateForInput(today),
      validUntil: formatDateForInput(nextMonth)
    }));
    
    fetchUserPlans();
  }, []);

  // Populate form when editing
  React.useEffect(() => {
    if (isEditing && deal) {
      setFormData({
        title: deal.title || '',
        description: deal.description || '',
        discount: deal.discount || '',
        discountType: deal.discountType || 'percentage',
        originalPrice: deal.originalPrice || '',
        discountedPrice: deal.discountedPrice || '',
        category: deal.category || '',
        validFrom: deal.validFrom ? formatDateForInput(new Date(deal.validFrom)) : '',
        validUntil: deal.validUntil ? formatDateForInput(new Date(deal.validUntil)) : '',
        requiredPlanPriority: deal.requiredPlanPriority || 1,
        termsConditions: deal.termsConditions || '',
        couponCode: deal.couponCode || '',
        featuredImage: null // Don't populate image for editing
      });
    }
  }, [isEditing, deal]);
  
  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
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
        const discountValue = parseFloat(newFormData.discount);
        
        if (!isNaN(originalPrice) && !isNaN(discountValue)) {
          let discountedPrice;
          
          if (newFormData.discountType === 'percentage') {
            discountedPrice = originalPrice - (originalPrice * discountValue / 100);
          } else {
            discountedPrice = originalPrice - discountValue;
          }
          
          newFormData.discountedPrice = Math.max(0, discountedPrice).toFixed(2);
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
  };

  const handleBannerImageUpload = (file) => {
    setBannerImageFile(file);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    try {
      setIsSaving(true);
      // Send JSON only for deal creation/update
      const dealData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        discount: formData.discount,
        discountType: formData.discountType,
        originalPrice: formData.originalPrice,
        discountedPrice: formData.discountedPrice,
        termsConditions: formData.termsConditions,
        expiration_date: formData.validUntil,
        couponCode: formData.couponCode,
        requiredPlanPriority: parseInt(formData.requiredPlanPriority)
      };

      let dealId;
      let createdDeal;

      if (isEditing && deal) {
        // Update existing deal
        const response = await merchantApi.updateDeal(deal.id, dealData);
        dealId = deal.id;
        createdDeal = { ...deal, ...dealData };
        showNotification('Deal updated successfully! It will be reviewed by admin before going live.', 'success');
      } else {
        // Create new deal
        const response = await merchantApi.createDeal(dealData);
        dealId = response.data?.deal?.id || response.data?.id;
        createdDeal = response.data?.deal || response.data;
        showNotification('Deal submitted successfully! It will be reviewed by admin before going live.', 'success');
      }

      // Upload banner image if one was selected
      if (bannerImageFile && dealId) {
        try {
          const formData = new FormData();
          formData.append('dealBanner', bannerImageFile);
          
          const uploadResponse = await api.post(`/upload/deal-banner/${dealId}`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          if (uploadResponse.data.success) {
            console.log('✅ Banner image uploaded successfully:', uploadResponse.data.filename);
          }
        } catch (uploadError) {
          console.error('❌ Banner image upload failed:', uploadError);
          showNotification('Deal created but banner image upload failed. You can add it later.', 'warning');
        }
      }
      
      if (onDealCreated) {
        onDealCreated(createdDeal);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      // Enhanced error handling for merchant status
      if (error.response && error.response.status === 403) {
        const msg = error.response.data && error.response.data.message;
        if (msg === 'Profile is not accepted by the admin') {
          // Try to get the user's status from the backend error (if available)
          // But backend only sends generic message, so show based on status if possible
          // Optionally, you could enhance backend to send the actual status in the error
          // For now, try to infer from a second API call (not implemented here)
          // Default to generic message
          showNotification('Your profile is not accepted by the admin.', 'error');
        } else if (msg && msg.toLowerCase().includes('rejected')) {
          showNotification('Your profile is rejected by admin.', 'error');
        } else if (msg && msg.toLowerCase().includes('suspend')) {
          showNotification('Your profile is temporarily suspended by admin.', 'error');
        } else {
          showNotification(msg || 'Failed to create deal. Please try again.', 'error');
        }
      } else {
        console.error('Error creating deal:', error);
        showNotification('Failed to create deal. Please try again.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="merchant-deal-form-container">
      <div className="form-header">
        <h2>{isEditing ? 'Edit Deal' : 'Create New Deal'}</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>
      
      <form className="merchant-deal-form" onSubmit={handleSubmit}>
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
          <label htmlFor="description">Description <span className="required">*</span></label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={formErrors.description ? 'error' : ''}
            placeholder="Describe your deal in detail..."
            rows={4}
          />
          {formErrors.description && <span className="error-message">{formErrors.description}</span>}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="discount">Discount Value <span className="required">*</span></label>
            <input
              type="number"
              id="discount"
              name="discount"
              value={formData.discount}
              onChange={handleChange}
              className={formErrors.discount ? 'error' : ''}
              placeholder="e.g., 20"
              min="0"
              step="0.01"
            />
            {formErrors.discount && <span className="error-message">{formErrors.discount}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="discountType">Discount Type</label>
            <select
              id="discountType"
              name="discountType"
              value={formData.discountType}
              onChange={handleChange}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (GHS)</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="originalPrice">Original Price (GHS) <span className="required">*</span></label>
            <input
              type="number"
              id="originalPrice"
              name="originalPrice"
              value={formData.originalPrice}
              onChange={handleChange}
              className={formErrors.originalPrice ? 'error' : ''}
              placeholder="e.g., 100.00"
              min="0"
              step="0.01"
            />
            {formErrors.originalPrice && <span className="error-message">{formErrors.originalPrice}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="discountedPrice">Discounted Price (GHS) <span className="required">*</span></label>
            <input
              type="number"
              id="discountedPrice"
              name="discountedPrice"
              value={formData.discountedPrice}
              onChange={handleChange}
              className={formErrors.discountedPrice ? 'error' : ''}
              placeholder="e.g., 80.00"
              min="0"
              step="0.01"
            />
            {formErrors.discountedPrice && <span className="error-message">{formErrors.discountedPrice}</span>}
            <span className="help-text">This will be automatically calculated when you enter discount</span>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category <span className="required">*</span></label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={formErrors.category ? 'error' : ''}
            >
              <option value="">Select a category</option>
              {getDealCategoryOptions().map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {formErrors.category && <span className="error-message">{formErrors.category}</span>}          </div>
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
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="couponCode">Coupon Code</label>
            <input
              type="text"
              id="couponCode"
              name="couponCode"              value={formData.couponCode}
              onChange={handleChange}
              placeholder="e.g., SAVE20"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="termsConditions">Terms & Conditions</label>
          <textarea
            id="termsConditions"
            name="termsConditions"
            value={formData.termsConditions}
            onChange={handleChange}
            placeholder="Enter terms and conditions for this deal..."
            rows={3}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="bannerImage">
            <i className="fas fa-image"></i>
            Deal Banner Image
          </label>
          <input
            type="file"
            id="bannerImage"
            name="bannerImage"
            onChange={(e) => handleBannerImageUpload(e.target.files[0])}
            accept="image/*"
          />
          <small className="form-hint">Upload a banner image for your deal (recommended: 800x400px, max 8MB)</small>
          {bannerImageFile && (
            <div className="image-preview">
              <p><i className="fas fa-check-circle text-success"></i> Selected: {bannerImageFile.name}</p>
            </div>
          )}
          {isEditing && deal?.bannerImage && !bannerImageFile && (
            <div className="current-image-info">
              <p><i className="fas fa-info-circle text-info"></i> Current banner: {deal.bannerImage}</p>
              <small>Select a new file to replace it</small>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          {onClose && (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Deal' : 'Create Deal')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default MerchantDealForm;
