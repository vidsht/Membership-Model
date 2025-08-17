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
    dealCategories: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDynamicFields = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch from multiple endpoints for backward compatibility
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
      label: community.name,
      description: community.description
    }));
  };

  const getUserTypeOptions = () => {
    return dynamicFields.userTypes.map(userType => ({
      value: userType.name,
      label: userType.name,
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
    getDealCategoryOptions
  };
};
