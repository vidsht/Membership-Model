// frontend/src/components/deals/DealForm.jsx
import React, { useState, useEffect } from 'react';
import ImageUpload from '../common/ImageUpload';
import './DealForm.css';
import { useImageUrl, SmartImage } from '../hooks/useImageUrl.jsx';

const DealForm = ({ 
  deal = null, 
  onSubmit, 
  onCancel, 
  loading = false,
  mode = 'create' // 'create' or 'edit'
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    originalPrice: '',
    discountedPrice: '',
    discountPercentage: '',
    category: '',
    validUntil: '',
    termsConditions: '',
    bannerImage: null
  });

  const [errors, setErrors] = useState({});
  const [bannerPreview, setBannerPreview] = useState(null);
  const { getDealBannerUrl } = useImageUrl();

  // Initialize form data when editing
  useEffect(() => {
    if (mode === 'edit' && deal) {
      setFormData({
        title: deal.title || '',
        description: deal.description || '',
        originalPrice: deal.originalPrice || '',
        discountedPrice: deal.discountedPrice || '',
        discountPercentage: deal.discountPercentage || '',
        category: deal.category || '',
        validUntil: deal.validUntil ? new Date(deal.validUntil).toISOString().split('T')[0] : '',
        termsConditions: deal.termsConditions || '',
        bannerImage: null // Reset for new upload
      });
      
      // Set banner preview if deal has existing banner
      if (deal.bannerImage) {
      setBannerPreview(getDealBannerUrl(deal));
      }
    }
  }, [deal, mode, getDealBannerUrl]);

  // Auto-calculate discount percentage
  useEffect(() => {
    const original = parseFloat(formData.originalPrice);
    const discounted = parseFloat(formData.discountedPrice);
    
    if (original && discounted && original > discounted) {
      const percentage = Math.round(((original - discounted) / original) * 100);
      setFormData(prev => ({
        ...prev,
        discountPercentage: percentage.toString()
      }));
    }
  }, [formData.originalPrice, formData.discountedPrice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (fileOrResponse) => {
    // Accept either a File (from input) or an upload response (from ImageUpload onUploadSuccess)
    if (!fileOrResponse) {
      setFormData(prev => ({ ...prev, bannerImage: null }));
      setBannerPreview(deal?.bannerImage || null);
      return;
    }

    // If it's a File object
    if (fileOrResponse instanceof File) {
      const file = fileOrResponse;
      setFormData(prev => ({ ...prev, bannerImage: file }));

      const reader = new FileReader();
      reader.onload = (e) => setBannerPreview(e.target.result);
      reader.readAsDataURL(file);
      return;
    }

    // Otherwise assume it's an upload response with imageUrl/filename
    const resp = fileOrResponse;
    const imageUrl = resp.imageUrl || resp.url || null;
    const filename = resp.filename || resp.fileName || null;
    setFormData(prev => ({ ...prev, bannerImage: filename || imageUrl }));
    if (imageUrl) setBannerPreview(imageUrl);
    else setBannerPreview(deal?.bannerImage || null);
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.title.trim()) newErrors.title = 'Deal title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.originalPrice) newErrors.originalPrice = 'Original price is required';
    if (!formData.discountedPrice) newErrors.discountedPrice = 'Discounted price is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.validUntil) newErrors.validUntil = 'Valid until date is required';

    // Price validation
    const original = parseFloat(formData.originalPrice);
    const discounted = parseFloat(formData.discountedPrice);
    
    if (original && discounted && discounted >= original) {
      newErrors.discountedPrice = 'Discounted price must be less than original price';
    }

    // Date validation
    if (formData.validUntil) {
      const selectedDate = new Date(formData.validUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.validUntil = 'Valid until date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare form data for submission
    const submitData = new FormData();
    
    // Add all form fields
    Object.keys(formData).forEach(key => {
      if (key !== 'bannerImage' && formData[key] !== null && formData[key] !== '') {
        submitData.append(key, formData[key]);
      }
    });

    // Add banner image if selected
    if (formData.bannerImage) {
      submitData.append('bannerImage', formData.bannerImage);
    }

    onSubmit(submitData);
  };

  const categories = [
    'Food & Dining',
    'Shopping',
    'Entertainment',
    'Health & Wellness',
    'Travel',
    'Services',
    'Education',
    'Sports & Fitness',
    'Beauty & Personal Care',
    'Home & Garden',
    'Electronics',
    'Other'
  ];

  return (
    <div className="deal-form">
      <div className="form-header">
        <h3>
          <i className="fas fa-tag"></i>
          {mode === 'create' ? 'Create New Deal' : 'Edit Deal'}
        </h3>
        <p>Fill in the details to {mode === 'create' ? 'create' : 'update'} your exclusive deal</p>
      </div>

      <form onSubmit={handleSubmit} className="deal-form-content">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              <i className="fas fa-heading"></i>
              Deal Title 
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`form-control ${errors.title ? 'error' : ''}`}
              placeholder="Enter deal title"
              maxLength="100"
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              <i className="fas fa-align-left"></i>
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`form-control ${errors.description ? 'error' : ''}`}
              placeholder="Describe your deal in detail"
              rows="4"
              maxLength="500"
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category" className="form-label">
              <i className="fas fa-list"></i>
              Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`form-control ${errors.category ? 'error' : ''}`}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>
        </div>

        <div className="form-row price-row">
          <div className="form-group">
            <label htmlFor="originalPrice" className="form-label">
              <i className="fas fa-dollar-sign"></i>
              Original Price *
            </label>
            <input
              type="number"
              id="originalPrice"
              name="originalPrice"
              value={formData.originalPrice}
              onChange={handleChange}
              className={`form-control ${errors.originalPrice ? 'error' : ''}`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.originalPrice && <span className="error-message">{errors.originalPrice}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="discountedPrice" className="form-label">
              <i className="fas fa-tag"></i>
              Discounted Price *
            </label>
            <input
              type="number"
              id="discountedPrice"
              name="discountedPrice"
              value={formData.discountedPrice}
              onChange={handleChange}
              className={`form-control ${errors.discountedPrice ? 'error' : ''}`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.discountedPrice && <span className="error-message">{errors.discountedPrice}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="discountPercentage" className="form-label">
              <i className="fas fa-percentage"></i>
              Discount %
            </label>
            <input
              type="text"
              id="discountPercentage"
              name="discountPercentage"
              value={formData.discountPercentage}
              className="form-control"
              placeholder="Auto-calculated"
              readOnly
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="validUntil" className="form-label">
              <i className="fas fa-calendar"></i>
              Valid Until *
            </label>
            <input
              type="date"
              id="validUntil"
              name="validUntil"
              value={formData.validUntil}
              onChange={handleChange}
              className={`form-control ${errors.validUntil ? 'error' : ''}`}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.validUntil && <span className="error-message">{errors.validUntil}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="termsConditions" className="form-label">
              <i className="fas fa-file-contract"></i>
              Terms & Conditions
            </label>
            <textarea
              id="termsConditions"
              name="termsConditions"
              value={formData.termsConditions}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter any terms and conditions for this deal"
              rows="3"
              maxLength="300"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-image"></i>
              Deal Banner Image
            </label>
            <ImageUpload
              type="deal"
              entityId={deal?.id || 'new'}
              currentImage={bannerPreview}
              onUploadSuccess={handleImageUpload}
              onUpload={handleImageUpload}
              className="deal-banner-upload"
              label="Upload Deal Banner"
              aspectRatio="16:9"
            />
            <small className="form-help">
              Recommended: 1200x600px, max 5MB. Supports JPG, PNG, GIF
            </small>
              {bannerPreview && (
              <div className="banner-preview">
                <SmartImage 
                  src={bannerPreview} 
                  alt="Deal banner preview" 
                  className="deal-banner-preview-image"
                  fallbackClass="deal-banner-placeholder"
                />
              </div>
              )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            <i className="fas fa-times"></i>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner spinner-border-sm"></div>
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <i className={`fas fa-${mode === 'create' ? 'plus' : 'save'}`}></i>
                {mode === 'create' ? 'Create Deal' : 'Update Deal'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DealForm;
