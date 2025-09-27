import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { useImageUrl, SmartImage, DefaultAvatar } from '../../../hooks/useImageUrl.jsx';
import ImageUpload from '../../common/ImageUpload';
import { useDynamicFields } from '../../../hooks/useDynamicFields';
import api from '../../../services/api';
import './MerchantDetailEdit.css';

const MerchantDetailEdit = () => {
  const { id: merchantId } = useParams();
  const navigate = useNavigate();
  const { validateSession, handleSessionExpired } = useAuth();
  const { showNotification } = useNotification();
  const { getProfileImageUrl, getMerchantLogoUrl } = useImageUrl();
  const { getCommunityOptions, getBusinessCategoryOptions, isLoading: fieldsLoading } = useDynamicFields();

  // State Management
  const [merchant, setMerchant] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [logoImage, setLogoImage] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    // User Information
    fullName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    community: '',
    country: 'Ghana',
    state: '',
    city: '',
    userType: 'merchant',
    membershipType: 'basic_business',
    status: 'approved',
    bloodGroup: '',
    userCategory: '',
    profilePhoto: null,
    
    // Business Information
    businessName: '',
    businessDescription: '',
    businessCategory: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    website: '',
    customDealLimit: '',
    logo: null,
    taxId: '',
    businessLicense: '',
    socialMediaLinks: ''
  });

  // Reference data
  const [referenceData, setReferenceData] = useState({
    communities: [],
    plans: [],
    merchantPlans: [],
    businessCategories: []
  });

  // Fallback plans
  const fallbackPlans = useMemo(() => [
    { id: 4, key: 'basic_business', name: 'Basic Business', type: 'merchant', price: 100, currency: 'GHS', billingCycle: 'monthly' },
    { id: 5, key: 'premium_business', name: 'Premium Business', type: 'merchant', price: 200, currency: 'GHS', billingCycle: 'monthly' }
  ], []);

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [communitiesRes, merchantPlansRes, businessCategoriesRes] = await Promise.allSettled([
        api.get('/admin/communities'),
        api.get('/admin/plans?userType=merchant'),
        api.get('/admin/business-categories')
      ]);

      let communities = [];
      if (communitiesRes.status === 'fulfilled' && communitiesRes.value?.data?.success) {
        communities = communitiesRes.value.data.communities || [];
      } else {
        communities = [
          'Gujarati', 'Bengali', 'Tamil', 'Punjabi', 'Hindi', 'Marathi', 'Telugu', 
          'Kannada', 'Malayalam', 'Sindhi', 'Rajasthani', 'Other Indian', 'Mixed Heritage'
        ].map(name => ({ name, isActive: true }));
      }

      let merchantPlans = [];
      if (merchantPlansRes.status === 'fulfilled' && merchantPlansRes.value?.data?.success) {
        merchantPlans = merchantPlansRes.value.data.plans.filter(plan => plan.type === 'merchant') || [];
      } else {
        merchantPlans = fallbackPlans;
      }

      let businessCategories = [];
      if (businessCategoriesRes.status === 'fulfilled' && businessCategoriesRes.value?.data?.success) {
        businessCategories = businessCategoriesRes.value.data.categories || [];
      } else {
        businessCategories = [
          'Restaurant', 'Retail', 'Services', 'Healthcare', 'Education', 'Technology',
          'Entertainment', 'Travel', 'Real Estate', 'Automotive', 'Finance', 'Other'
        ].map(name => ({ name, isActive: true }));
      }

      setReferenceData({ communities, plans: merchantPlans, merchantPlans, businessCategories });
    } catch (err) {
      console.error('Error fetching reference data:', err);
      setReferenceData({
        communities: [{ name: 'General', isActive: true }],
        plans: fallbackPlans,
        merchantPlans: fallbackPlans,
        businessCategories: [{ name: 'General', isActive: true }]
      });
    }
  }, [fallbackPlans]);

  // Fetch merchant data
  const fetchMerchantData = useCallback(async () => {
    try {
      setLoading(true);
      const [userResponse, businessResponse] = await Promise.allSettled([
        api.get(`/admin/users/${merchantId}`),
        api.get(`/admin/businesses/${merchantId}`)
      ]);
      
      let userData = null;
      let businessData = null;

      if (userResponse.status === 'fulfilled' && userResponse.value?.data?.success) {
        userData = userResponse.value.data.user;
        setMerchant(userData);

        // Set profile image
        if (userData.profilePhoto || userData.profilePicture) {
          setProfileImage(getProfileImageUrl({ profilePicture: userData.profilePhoto || userData.profilePicture }));
        }
      }

      if (businessResponse.status === 'fulfilled' && businessResponse.value?.data?.success) {
        businessData = businessResponse.value.data.business;
        setBusiness(businessData);

        // Set logo image
        if (businessData.logo) {
          setLogoImage(getMerchantLogoUrl(businessData));
        }
      }

      if (!userData) {
        throw new Error('Merchant not found');
      }

      // Set form data
      setFormData({
        // User Information
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: typeof userData.address === 'string' ? userData.address : JSON.stringify(userData.address || ''),
        dob: userData.dob ? userData.dob.split('T')[0] : '',
        community: userData.community || '',
        country: userData.country || 'Ghana',
        state: userData.state || '',
        city: userData.city || '',
        userType: userData.userType || 'merchant',
        membershipType: userData.membershipType || 'basic_business',
        status: userData.status || 'approved',
        bloodGroup: userData.bloodGroup || '',
        userCategory: userData.userCategory || '',
        profilePhoto: userData.profilePhoto || null,
        
        // Business Information
        businessName: businessData?.businessName || '',
        businessDescription: businessData?.businessDescription || '',
        businessCategory: businessData?.businessCategory || '',
        businessAddress: businessData?.businessAddress || '',
        businessPhone: businessData?.businessPhone || '',
        businessEmail: businessData?.businessEmail || '',
        website: businessData?.website || '',
        customDealLimit: businessData?.customDealLimit || '',
        logo: businessData?.logo || null,
        taxId: businessData?.taxId || '',
        businessLicense: businessData?.businessLicense || '',
        socialMediaLinks: businessData?.socialMediaLinks ? JSON.stringify(businessData.socialMediaLinks) : ''
      });

    } catch (err) {
      console.error('Error fetching merchant data:', err);
      if (err.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      if (err.response?.status === 404) {
        showNotification('Merchant not found', 'error');
        navigate('/admin', { state: { activeTab: 'merchants' } });
        return;
      }
      showNotification('Failed to load merchant data', 'error');
    } finally {
      setLoading(false);
    }
  }, [merchantId, getProfileImageUrl, getMerchantLogoUrl, handleSessionExpired, showNotification, navigate]);

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        const sessionValid = await validateSession();
        if (!sessionValid) {
          handleSessionExpired();
          return;
        }

        await Promise.all([fetchReferenceData(), fetchMerchantData()]);
      } catch (err) {
        console.error('Error initializing component:', err);
        showNotification('Failed to initialize page', 'error');
      }
    };

    initializeComponent();
  }, []);

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle profile image upload
  const handleProfileImageUpload = async (file) => {
    try {
      const formDataObj = new FormData();
      formDataObj.append('profilePhoto', file);
      formDataObj.append('userId', merchantId);

      const response = await api.post('/upload/profile-photo', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const newImageUrl = response.data.imageUrl;
        setProfileImage(newImageUrl);
        setFormData(prev => ({ ...prev, profilePhoto: response.data.filename }));
        setMerchant(prev => ({ ...prev, profilePhoto: response.data.filename }));
        showNotification('Profile photo updated successfully', 'success');
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading profile photo:', err);
      showNotification(err.response?.data?.message || 'Failed to upload profile photo', 'error');
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (file) => {
    try {
      const formDataObj = new FormData();
      formDataObj.append('merchantLogo', file);
      formDataObj.append('merchantId', merchantId);

      const response = await api.post('/upload/merchant-logo', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const newImageUrl = response.data.imageUrl;
        setLogoImage(newImageUrl);
        setFormData(prev => ({ ...prev, logo: response.data.filename }));
        setBusiness(prev => ({ ...prev, logo: response.data.filename }));
        showNotification('Business logo updated successfully', 'success');
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      showNotification(err.response?.data?.message || 'Failed to upload logo', 'error');
    }
  };

  // Handle save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare user data
      const unifiedPayload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        dob: formData.dob,
        community: formData.community,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        userType: formData.userType,
        membershipType: formData.membershipType,
        status: formData.status,
        bloodGroup: formData.bloodGroup,
        userCategory: formData.userCategory,
        profilePhoto: formData.profilePhoto,

        businessInfo: {
          businessName: formData.businessName,
          businessDescription: formData.businessDescription,
          businessCategory: formData.businessCategory,
          businessAddress: formData.businessAddress,
          businessPhone: formData.businessPhone,
          businessEmail: formData.businessEmail,
          website: formData.website,
          customDealLimit: formData.customDealLimit,
          logo: formData.logo,
          taxId: formData.taxId,
          businessLicense: formData.businessLicense,
          socialMediaLinks: formData.socialMediaLinks ? JSON.parse(formData.socialMediaLinks) : null,
          userId: merchantId
         }
      };

      // Prepare business data
      // const businessData = {
      //   businessName: formData.businessName,
      //   businessDescription: formData.businessDescription,
      //   businessCategory: formData.businessCategory,
      //   businessAddress: formData.businessAddress,
      //   businessPhone: formData.businessPhone,
      //   businessEmail: formData.businessEmail,
      //   website: formData.website,
      //   customDealLimit: formData.customDealLimit,
      //   logo: formData.logo,
      //   establishedYear: formData.establishedYear,
      //   businessRegistrationNumber: formData.businessRegistrationNumber,
      //   taxId: formData.taxId,
      //   operatingHours: formData.operatingHours,
      //   socialMediaLinks: formData.socialMediaLinks ? JSON.parse(formData.socialMediaLinks) : null,
      //   userId: merchantId
      // };

      // // Update user information
      // const userResponse = await api.put(`/admin/users/${merchantId}`, userData);
      // if (!userResponse.data.success) {
      //   throw new Error(userResponse.data.message || 'Failed to update user information');
      // }

      // // Update business information
      // const businessResponse = await api.put(`/admin/partners/${merchantId}`, businessData);
      // if (!businessResponse.data.success) {
      //   throw new Error(businessResponse.data.message || 'Failed to update business information');
      // }

      // Single API call to unified partner endpoint
    const response = await api.put(`/admin/partners/${merchantId}`, unifiedPayload);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to update merchant');
    }

    // Update local state with the unified payload data
    setMerchant(prev => ({ ...prev, ...unifiedPayload }));
    setBusiness(prev => ({ ...prev, ...unifiedPayload.businessInfo }));
    setEditMode(false);
    showNotification('Merchant updated successfully', 'success');
      
      // Refresh merchant data to get latest info
      await fetchMerchantData();
      } catch (err) {
        console.error('Error updating merchant:', err);
        showNotification(err.response?.data?.message || 'Failed to update merchant', 'error');
      } finally {
        setSaving(false);
      }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditMode(false);
    // Reset form data to original values
    if (merchant && business) {
      setFormData({
        // User Information
        fullName: merchant.fullName || '',
        email: merchant.email || '',
        phone: merchant.phone || '',
        address: typeof merchant.address === 'string' ? merchant.address : JSON.stringify(merchant.address || ''),
        dob: merchant.dob ? merchant.dob.split('T')[0] : '',
        community: merchant.community || '',
        country: merchant.country || 'Ghana',
        state: merchant.state || '',
        city: merchant.city || '',
        userType: merchant.userType || 'merchant',
        membershipType: merchant.membershipType || 'basic_business',
        status: merchant.status || 'approved',
        bloodGroup: merchant.bloodGroup || '',
        userCategory: merchant.userCategory || '',
        profilePhoto: merchant.profilePhoto || null,
        
        // Business Information
        businessName: business.businessName || '',
        businessDescription: business.businessDescription || '',
        businessCategory: business.businessCategory || '',
        businessAddress: business.businessAddress || '',
        businessPhone: business.businessPhone || '',
        businessEmail: business.businessEmail || '',
        website: business.website || '',
        customDealLimit: business.customDealLimit || '',
        logo: business.logo || null,
        taxId: business.taxId || '',
        businessLicense: business.businessLicense || '',
        socialMediaLinks: business.socialMediaLinks ? JSON.stringify(business.socialMediaLinks) : ''
      });
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'suspended': return 'status-suspended';
      default: return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="merchant-detail-edit-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading merchant details...</p>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="merchant-detail-edit-container">
        <div className="error-state">
          <i className="fas fa-store-slash"></i>
          <h3>Merchant Not Found</h3>
          <p>The requested merchant could not be found.</p>
          <button onClick={() => navigate('/admin', { state: { activeTab: 'merchants' } })} className="btn btn-primary">
            Back to Merchants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-detail-edit-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <button
              onClick={() => navigate('/admin', { state: { activeTab: 'merchants' } })}
              className="btn-back"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div className="header-info">
              <h1>{merchant.fullName || 'Unknown Merchant'}</h1>
              <span className="merchant-id">ID: {merchant.id}</span>
              {business?.businessName && (
                <span className="business-name">{business.businessName}</span>
              )}
            </div>
          </div>
          <div className="header-actions">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="btn btn-primary"
              >
                <i className="fas fa-edit"></i>
                Edit Merchant
              </button>
            ) : (
              <div className="edit-actions">
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  <i className="fas fa-times"></i>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-success"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="btn-spinner"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="merchant-detail-content">
        {/* Profile Section */}
        <div className="profile-section">
          <div className="profile-card">
            <div className="profile-header">
              
              <div className="profile-info">
                <div className="merchant-name-section">
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="edit-input name-input"
                      placeholder="Full Name"
                    />
                  ) : (
                    <h2 className="merchant-name">{merchant.fullName || 'Unknown Merchant'}</h2>
                  )}
                </div>
                
                <div className="business-name-section">
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className="edit-input business-name-input"
                      placeholder="Business Name"
                    />
                  ) : (
                    <h3 className="business-name">{business?.businessName || 'No Business Name'}</h3>
                  )}
                </div>
                
                <div className="merchant-meta">
                  <span className={`status-badge ${getStatusBadgeClass(merchant.status)}`}>
                    {merchant.status ? merchant.status.charAt(0).toUpperCase() + merchant.status.slice(1) : 'Unknown'}
                  </span>
                  <span className="user-type-badge">
                    Merchant
                  </span>
                </div>

                <div className="quick-stats">
                  <div className="stat-item">
                    <i className="fas fa-calendar-plus"></i>
                    <span>Joined {formatDate(merchant.createdAt)}</span>
                  </div>
                  {merchant.lastLogin && (
                    <div className="stat-item">
                      <i className="fas fa-clock"></i>
                      <span>Last seen {formatDate(merchant.lastLogin)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Sections */}
        <div className="details-sections">
          {/* Personal Information */}
          <div className="detail-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-user"></i>
                Personal Information
              </h3>
            </div>
            <div className="section-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Email Address</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="edit-input"
                      placeholder="Email address"
                    />
                  ) : (
                    <span>{merchant.email || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Phone Number</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="edit-input"
                      placeholder="Phone number"
                    />
                  ) : (
                    <span>{merchant.phone || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Date of Birth</label>
                  {editMode ? (
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{merchant.dob ? formatDate(merchant.dob) : 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item full-width">
                  <label>Personal Address</label>
                  {editMode ? (
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="edit-input"
                      placeholder="Personal address"
                      rows="3"
                    />
                  ) : (
                    <span>{merchant.address || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="detail-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-store"></i>
                Business Information
              </h3>
            </div>
            <div className="section-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Business Category</label>
                  {editMode ? (
                    <select
                      value={formData.businessCategory}
                      onChange={(e) => handleInputChange('businessCategory', e.target.value)}
                      className="edit-input"
                    >
                      <option value="">Select category</option>
                      {fieldsLoading ? (
                        <option disabled>Loading categories...</option>
                      ) : (
                        getBusinessCategoryOptions().map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <span>{business?.businessCategory || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Business Phone</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                      className="edit-input"
                      placeholder="Business phone"
                    />
                  ) : (
                    <span>{business?.businessPhone || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Business Email</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                      className="edit-input"
                      placeholder="Business email"
                    />
                  ) : (
                    <span>{business?.businessEmail || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Website</label>
                  {editMode ? (
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="edit-input"
                      placeholder="https://example.com"
                    />
                  ) : (
                    <span>
                      {business?.website ? (
                        <a href={business.website} target="_blank" rel="noopener noreferrer">
                          {business.website}
                        </a>
                      ) : 'N/A'}
                    </span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Tax ID</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      className="edit-input"
                      placeholder="Tax identification number"
                    />
                  ) : (
                    <span>{business?.taxId || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Business License</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.businessLicense}
                      onChange={(e) => handleInputChange('businessLicense', e.target.value)}
                      className="edit-input"
                      placeholder="Enter business license number"
                    />
                  ) : (
                    <span>{business?.businessLicense || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item full-width">
                  <label>Business Description</label>
                  {editMode ? (
                    <textarea
                      value={formData.businessDescription}
                      onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                      className="edit-input"
                      placeholder="Describe your business"
                      rows="4"
                    />
                  ) : (
                    <span>{business?.businessDescription || 'N/A'}</span>
                  )}
                </div>

                <div className="detail-item full-width">
                  <label>Business Address</label>
                  {editMode ? (
                    <textarea
                      value={formData.businessAddress}
                      onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                      className="edit-input"
                      placeholder="Business address"
                      rows="3"
                    />
                  ) : (
                    <span>{business?.businessAddress || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="detail-section">
            <div className="section-header">
              <h3>
                <i className="fas fa-cog"></i>
                Account Settings
              </h3>
            </div>
            <div className="section-content">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Membership Plan</label>
                  {editMode ? (
                    <select
                      value={formData.membershipType}
                      onChange={(e) => handleInputChange('membershipType', e.target.value)}
                      className="edit-input"
                    >
                      {referenceData.merchantPlans.map((plan) => (
                        <option key={plan.key} value={plan.key}>
                          {plan.name} - {plan.currency === 'FREE' ? 'FREE' : `${plan.currency} ${plan.price}/${plan.billingCycle}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>
                      {merchant.membershipType ? 
                        merchant.membershipType.charAt(0).toUpperCase() + merchant.membershipType.slice(1) : 
                        'None'
                      }
                    </span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Account Status</label>
                  {editMode ? (
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="edit-input"
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  ) : (
                    <span className={`status-badge ${getStatusBadgeClass(merchant.status)}`}>
                      {merchant.status ? merchant.status.charAt(0).toUpperCase() + merchant.status.slice(1) : 'Unknown'}
                    </span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Deal Limit</label>
                  {editMode ? (
                    <input
                      type="number"
                      value={formData.customDealLimit}
                      onChange={(e) => handleInputChange('customDealLimit', e.target.value)}
                      className="edit-input"
                      placeholder="Custom deal limit"
                      min="0"
                    />
                  ) : (
                    <span>{business?.customDealLimit || 'Default'}</span>
                  )}
                </div>

                <div className="detail-item">
                  <label>Plan Valid Until</label>
                  <span>
                    {merchant.validationDate ? 
                      formatDate(merchant.validationDate) : 
                      'No expiry date set'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MerchantDetailEdit;
