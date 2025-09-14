import { useState, useEffect } from 'react';

/**
 * Custom hook for persisting filter state in localStorage
 * @param {string} key - Unique key for localStorage
 * @param {Object} defaultFilters - Default filter values
 * @returns {Array} [filters, setFilters, resetFilters]
 */
export const useFilterPersistence = (key, defaultFilters) => {
  // Initialize filters from localStorage or use default
  const [filters, setFilters] = useState(() => {
    try {
      const savedFilters = localStorage.getItem(key);
      if (savedFilters) {
        const parsed = JSON.parse(savedFilters);
        // Merge with defaults to ensure all required fields exist
        return { ...defaultFilters, ...parsed };
      }
    } catch (error) {
      console.warn(`Failed to load filters from localStorage for key: ${key}`, error);
    }
    return defaultFilters;
  });

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(filters));
    } catch (error) {
      console.warn(`Failed to save filters to localStorage for key: ${key}`, error);
    }
  }, [key, filters]);

  // Reset filters to default values
  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return [filters, setFilters, resetFilters];
};

export default useFilterPersistence;
