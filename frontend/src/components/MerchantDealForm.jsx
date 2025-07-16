import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { merchantApi } from '../services/api';
import './MerchantDealForm.css';

const MerchantDealForm = ({ onDealCreated, onClose }) => {
  const { showNotification } = useNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount: '',
    discountType: 'percentage',
    category: '',
    validFrom: '',
    validUntil: '',
    accessLevel: 'basic',
    termsConditions: '',
    couponCode: '',
    maxRedemptions: '',
    featuredImage: null
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  // Set default dates for new deals
  React.useEffect(() => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    setFormData(prev => ({
      ...prev,
      validFrom: formatDateForInput(today),
      validUntil: formatDateForInput(nextMonth)
    }));
  }, []);
  
  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.discount) errors.discount = 'Discount value is required';
    if (!formData.category.trim()) errors.category = 'Category is required';
    if (!formData.validFrom) errors.validFrom = 'Start date is required';
    if (!formData.validUntil) errors.validUntil = 'End date is required';
    
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
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    try {
      setIsSaving(true);
      

      // Send JSON only (no file upload)
      // Map validUntil to expiration_date and only send required fields
      const businessId = localStorage.getItem('merchantBusinessId');
      const dealData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        expiration_date: formData.validUntil,
        businessId,
        accessLevel: formData.accessLevel,
        discount: formData.discount,
        discountType: formData.discountType,
        termsConditions: formData.termsConditions
      };
      await merchantApi.createDeal(dealData);
      showNotification('Deal created successfully!', 'success');
      
      if (onDealCreated) {
        onDealCreated();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      showNotification('Failed to create deal. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const dealCategories = [
    'Restaurant', 'Retail', 'Electronics', 'Fashion', 
    'Health & Wellness', 'Entertainment', 'Travel',
    'Education', 'Home & Garden', 'Services', 'Other'
  ];
  
  return (
    <div className="merchant-deal-form-container">
      <div className="form-header">
        <h2>Create New Deal</h2>
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
              <option value="fixed">Fixed Amount</option>
              <option value="buyOneGetOne">Buy One Get One</option>
              <option value="freeItem">Free Item</option>
            </select>
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
              {dealCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            {formErrors.category && <span className="error-message">{formErrors.category}</span>}
          </div>
            <div className="form-group">
            <label htmlFor="accessLevel">Access Level</label>
            <select
              id="accessLevel"
              name="accessLevel"
              value={formData.accessLevel}
              onChange={handleChange}
            >
              <option value="community">Community</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
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
              name="couponCode"
              value={formData.couponCode}
              onChange={handleChange}
              placeholder="e.g., SAVE20"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="maxRedemptions">Max Redemptions</label>
            <input
              type="number"
              id="maxRedemptions"
              name="maxRedemptions"
              value={formData.maxRedemptions}
              onChange={handleChange}
              placeholder="Leave blank for unlimited"
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
          <label htmlFor="featuredImage">Featured Image</label>
          <input
            type="file"
            id="featuredImage"
            name="featuredImage"
            onChange={handleChange}
            accept="image/*"
          />
          <small className="form-hint">Upload an image for your deal (max 5MB)</small>
        </div>
        
        <div className="form-actions">
          {onClose && (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create Deal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MerchantDealForm;
