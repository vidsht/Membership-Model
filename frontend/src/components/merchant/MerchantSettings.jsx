import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useDynamicFields } from '../../hooks/useDynamicFields';
import ImageUpload from '../common/ImageUpload';
import { useImageUrl } from '../../hooks/useImageUrl.jsx';
import api from '../../services/api';
import './MerchantSettings.css';

const MerchantSettings = () => {
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const { getMerchantLogoUrl } = useImageUrl();
  const { getBusinessCategoryOptions } = useDynamicFields();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    businessName: '',
    businessDescription: '',
    businessCategory: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    website: ''
  });

  useEffect(() => {
    if (user?.business) {
      setBusiness(user.business);
      setFormData({
        businessName: user.business.businessName || '',
        businessDescription: user.business.businessDescription || '',
        businessCategory: user.business.businessCategory || '',
        businessAddress: user.business.businessAddress || '',
        businessPhone: user.business.businessPhone || '',
        businessEmail: user.business.businessEmail || '',
        website: user.business.website || ''
      });
    }
  }, [user]);

  // Fetch dynamic categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryOptions = await getBusinessCategoryOptions();
        setCategories(categoryOptions);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Fallback to static categories
        setCategories([
          { value: 'restaurant', label: 'Restaurant & Food' },
          { value: 'retail', label: 'Retail & Shopping' },
          { value: 'services', label: 'Professional Services' },
          { value: 'healthcare', label: 'Healthcare' },
          { value: 'technology', label: 'Technology' },
          { value: 'finance', label: 'Finance' },
          { value: 'real-estate', label: 'Real Estate' },
          { value: 'automotive', label: 'Automotive' },
          { value: 'education', label: 'Education' },
          { value: 'entertainment', label: 'Entertainment' },
          { value: 'other', label: 'Other' }
        ]);
      }
    };

    fetchCategories();
  }, [getBusinessCategoryOptions]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle website field with special validation
    if (name === 'website') {
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
      
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.put(`/merchant/business/${business.businessId}`, formData);
      
      if (response.data.success) {
        showNotification('Business information updated successfully!', 'success');
        setBusiness(response.data.business);
        
        // Update user context with new business data
        updateUser({
          ...user,
          business: response.data.business
        });
      }
    } catch (error) {
      console.error('Update error:', error);
      showNotification(error.response?.data?.message || 'Failed to update business information', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!business) {
    return (
      <div className="merchant-settings">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading business information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-settings">
      <div className="settings-header">
        <h2>
          <i className="fas fa-store me-2"></i>
          Business Settings
        </h2>
        <p>Manage your business profile and logo</p>
      </div>

      <div className="settings-content">
        {/* Business Logo Section */}
        <div className="card mb-4">
          <div className="card-header">
            <h4 className="mb-0">
              <i className="fas fa-image me-2"></i>
              Business Logo
            </h4>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-12">
                <ImageUpload
                  type="merchant"
                  entityId={business.businessId}
                  currentImage={getMerchantLogoUrl(business)}
                  onUploadSuccess={(data) => {
                    showNotification('Business logo updated successfully!', 'success');
                    setBusiness(prev => ({
                      ...prev,
                      logo: data.filename
                    }));
                    // Update user context
                    updateUser({
                      ...user,
                      business: {
                        ...user.business,
                        logo: data.filename
                      }
                    });
                  }}
                  onUploadError={(error) => {
                    showNotification('Failed to upload business logo', 'error');
                  }}
                  label="Upload Business Logo"
                  description="This logo will be displayed in the business directory and on your business profile"
                  aspectRatio="1:1"
                  className="mb-3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Information Section */}
        <div className="card">
          <div className="card-header">
            <h4 className="mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Business Information
            </h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="fas fa-store me-1"></i>
                    Business Name *
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    className="form-control"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="fas fa-tags me-1"></i>
                    Category
                  </label>
                  <select
                    name="businessCategory"
                    className="form-control"
                    value={formData.businessCategory}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <i className="fas fa-align-left me-1"></i>
                  Business Description
                </label>
                <textarea
                  name="businessDescription"
                  className="form-control"
                  rows="4"
                  value={formData.businessDescription}
                  onChange={handleInputChange}
                  placeholder="Describe your business, services, and what makes you unique..."
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="fas fa-phone me-1"></i>
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    name="businessPhone"
                    className="form-control"
                    value={formData.businessPhone}
                    onChange={handleInputChange}
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <i className="fas fa-envelope me-1"></i>
                    Business Email
                  </label>
                  <input
                    type="email"
                    name="businessEmail"
                    className="form-control"
                    value={formData.businessEmail}
                    onChange={handleInputChange}
                    placeholder="info@yourbusiness.com"
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <i className="fas fa-map-marker-alt me-1"></i>
                  Business Address
                </label>
                <input
                  type="text"
                  name="businessAddress"
                  className="form-control"
                  value={formData.businessAddress}
                  onChange={handleInputChange}
                  placeholder="Street address, city, region"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <i className="fas fa-globe me-1"></i>
                  Website
                </label>
                <input
                  type="text"
                  name="website"
                  className="form-control"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="www.yourwebsite.com"
                />
              </div>

              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      Update Business Info
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantSettings;
