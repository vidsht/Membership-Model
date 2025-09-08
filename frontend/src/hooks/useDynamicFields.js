import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Custom hook for fetching and managing dynamic field options
 * @returns {Object} Dynamic fields data and utilities
 */
export const useDynamicFields = () => {
  const [dynamicFields, setDynamicFields] = useState({
  communities: [],
  userTypes: [],
  businessCategories: [],
  dealCategories: [],
  countries: [],
  states: [],
  plans: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDynamicFields = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to fetch from admin endpoint first (where admin panel saves data)
      try {
        const adminResponse = await api.get('/admin/dynamic-fields');
        if (adminResponse.data.success) {
          // Filter active options for each field type except plans
          const newDynamicFields = {};
          Object.keys(adminResponse.data.dynamicFields).forEach(fieldType => {
            if (fieldType === 'plans') {
              // plans do not have isActive property in the same way
              newDynamicFields.plans = adminResponse.data.dynamicFields.plans || [];
            } else {
              newDynamicFields[fieldType] = adminResponse.data.dynamicFields[fieldType].filter(item => item.isActive !== false);
            }
          });
          setDynamicFields(newDynamicFields);
          return; // Successfully loaded from admin endpoint
        }
      } catch (adminError) {
        console.warn('Admin endpoint not available, falling back to auth endpoints:', adminError.message);
      }
  const getPlanOptions = () => {
    return dynamicFields.plans.map(plan => ({
      value: plan.key,
      label: plan.name || plan.key
    }));
  };

      // Fallback to individual auth endpoints for backward compatibility
      const [
        communitiesResponse,
        userTypesResponse,
        businessCategoriesResponse,
        dealCategoriesResponse
      ] = await Promise.allSettled([
        api.get('/auth/communities'),
        api.get('/auth/user-types'),
        api.get('/auth/business-categories'),
        api.get('/auth/deal-categories')
      ]);

      const newDynamicFields = { ...dynamicFields };

      // Process communities
      if (communitiesResponse.status === 'fulfilled' && communitiesResponse.value.data.success) {
        newDynamicFields.communities = communitiesResponse.value.data.communities.filter(c => c.isActive !== false);
      }

      // Process user types
      if (userTypesResponse.status === 'fulfilled' && userTypesResponse.value.data.success) {
        newDynamicFields.userTypes = userTypesResponse.value.data.userTypes.filter(ut => ut.isActive !== false);
      }

      // Process business categories
      if (businessCategoriesResponse.status === 'fulfilled' && businessCategoriesResponse.value.data.success) {
        newDynamicFields.businessCategories = businessCategoriesResponse.value.data.businessCategories.filter(bc => bc.isActive !== false);
      }

      // Process deal categories
      if (dealCategoriesResponse.status === 'fulfilled' && dealCategoriesResponse.value.data.success) {
        newDynamicFields.dealCategories = dealCategoriesResponse.value.data.dealCategories.filter(dc => dc.isActive !== false);
      }

      setDynamicFields(newDynamicFields);
    } catch (err) {
      console.error('Error fetching dynamic fields:', err);
      setError(err.message || 'Failed to fetch dynamic fields');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshField = async (fieldType) => {
    try {
      // Try admin endpoint first (where admin panel saves data)
      try {
        const adminResponse = await api.get(`/admin/dynamic-fields/${fieldType}`);
        if (adminResponse.data.success && adminResponse.data[fieldType]) {
          setDynamicFields(prev => ({
            ...prev,
            [fieldType]: adminResponse.data[fieldType].filter(item => item.isActive !== false)
          }));
          return; // Successfully refreshed from admin endpoint
        }
      } catch (adminError) {
        console.warn(`Admin endpoint not available for ${fieldType}, falling back to auth endpoint:`, adminError.message);
      }

      // Fallback to auth endpoints
      let response;
      switch (fieldType) {
        case 'communities':
          response = await api.get('/auth/communities');
          if (response.data.success) {
            setDynamicFields(prev => ({
              ...prev,
              communities: response.data.communities.filter(c => c.isActive !== false)
            }));
          }
          break;
        case 'userTypes':
          response = await api.get('/auth/user-types');
          if (response.data.success) {
            setDynamicFields(prev => ({
              ...prev,
              userTypes: response.data.userTypes.filter(ut => ut.isActive !== false)
            }));
          }
          break;
        case 'businessCategories':
          response = await api.get('/auth/business-categories');
          if (response.data.success) {
            setDynamicFields(prev => ({
              ...prev,
              businessCategories: response.data.businessCategories.filter(bc => bc.isActive !== false)
            }));
          }
          break;
        case 'dealCategories':
          response = await api.get('/auth/deal-categories');
          if (response.data.success) {
            setDynamicFields(prev => ({
              ...prev,
              dealCategories: response.data.dealCategories.filter(dc => dc.isActive !== false)
            }));
          }
          break;
        default:
          console.warn('Unknown field type:', fieldType);
      }
    } catch (err) {
      console.error(`Error refreshing ${fieldType}:`, err);
    }
  };

  useEffect(() => {
    fetchDynamicFields();
  }, []);

  // Helper functions to get options for specific use cases
  const getCommunityOptions = () => {
    return dynamicFields.communities.map(community => ({
      value: community.name,
      label: community.label || community.name,
      description: community.description
    }));
  };

  const getUserTypeOptions = () => {
    return dynamicFields.userTypes.map(userType => ({
      value: userType.name,
      label: userType.label || userType.name,
      description: userType.description
    }));
  };

  const getBusinessCategoryOptions = () => {
    return dynamicFields.businessCategories.map(category => ({
      value: category.name,
      label: category.label || category.name,
      description: category.description
    }));
  };

  const getDealCategoryOptions = () => {
    return dynamicFields.dealCategories.map(category => ({
      value: category.name,
      label: category.label || category.name,
      description: category.description
    }));
  };

  const getCountryOptions = () => {
    return dynamicFields.countries.map(country => ({
      value: country.name,
      label: country.label || country.name,
      description: country.description
    }));
  };

  const getStateOptions = () => {
    return dynamicFields.states.map(state => ({
      value: state.name,
      label: state.label || state.name,
      description: state.description
    }));
  };

  return {
    dynamicFields,
    isLoading,
    error,
    fetchDynamicFields,
    refreshField,
    // Helper functions
    getCommunityOptions,
    getUserTypeOptions,
    getBusinessCategoryOptions,
    getDealCategoryOptions,
    getCountryOptions,
  getStateOptions,
  getPlanOptions
  };
};
