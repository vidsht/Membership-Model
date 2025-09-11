import { useState, useCallback } from 'react';

/**
 * Custom hook for comprehensive form validation with error highlighting
 * @returns {Object} Validation utilities and state
 */
export const useFormValidation = () => {
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Clear errors for a specific field
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouchedFields({});
  }, []);

  // Mark field as touched
  const markFieldTouched = useCallback((fieldName) => {
    setTouchedFields(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, []);

  // Set error for a specific field
  const setFieldError = useCallback((fieldName, errorMessage) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));
  }, []);

  // Set multiple errors at once
  const setMultipleErrors = useCallback((errorObject) => {
    setErrors(prev => ({
      ...prev,
      ...errorObject
    }));
  }, []);

  // Validation rules
  const validationRules = {
    required: (value, fieldName) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} is required`;
      }
      return null;
    },

    email: (value) => {
      if (!value) return null;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) ? null : 'Please enter a valid email address';
    },

    phone: (value) => {
      if (!value) return null;
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
      return phoneRegex.test(value.replace(/\s/g, '')) ? null : 'Please enter a valid phone number';
    },

    minLength: (value, minLength) => {
      if (!value) return null;
      return value.length >= minLength ? null : `Must be at least ${minLength} characters long`;
    },

    maxLength: (value, maxLength) => {
      if (!value) return null;
      return value.length <= maxLength ? null : `Must be no more than ${maxLength} characters long`;
    },

    url: (value) => {
      if (!value) return null;
      try {
        new URL(value.startsWith('http') ? value : `https://${value}`);
        return null;
      } catch {
        return 'Please enter a valid URL';
      }
    },

    passwordStrength: (value) => {
      if (!value) return null;
      const hasMinLength = value.length >= 8;
      const hasUpperCase = /[A-Z]/.test(value);
      const hasLowerCase = /[a-z]/.test(value);
      const hasNumbers = /\d/.test(value);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      if (!hasMinLength) return 'Password must be at least 8 characters long';
      if (!hasUpperCase) return 'Password must contain at least one uppercase letter';
      if (!hasLowerCase) return 'Password must contain at least one lowercase letter';
      if (!hasNumbers) return 'Password must contain at least one number';
      if (!hasSpecialChar) return 'Password must contain at least one special character';
      
      return null;
    },

    passwordMatch: (value, confirmValue) => {
      if (!value || !confirmValue) return null;
      return value === confirmValue ? null : 'Passwords do not match';
    },

    date: (value) => {
      if (!value) return null;
      const date = new Date(value);
      return isNaN(date.getTime()) ? 'Please enter a valid date' : null;
    },

    dateOfBirth: (value) => {
      if (!value) return null;
      const date = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      
      if (isNaN(date.getTime())) return 'Please enter a valid date';
      if (date > today) return 'Date of birth cannot be in the future';
      if (age < 13) return 'Must be at least 13 years old';
      if (age > 120) return 'Please enter a valid date of birth';
      
      return null;
    },

    businessName: (value) => {
      if (!value || value.trim() === '') return 'Business name is required';
      if (value.trim().length < 2) return 'Business name must be at least 2 characters long';
      if (value.trim().length > 100) return 'Business name must be less than 100 characters';
      return null;
    },

    taxId: (value) => {
      if (!value) return null;
      // Basic validation for tax ID format
      const cleanValue = value.replace(/[\s\-]/g, '');
      if (cleanValue.length < 8) return 'Tax ID must be at least 8 characters long';
      return null;
    },

    zipCode: (value) => {
      if (!value) return null;
      const zipRegex = /^[0-9]{5}(-[0-9]{4})?$/;
      return zipRegex.test(value) ? null : 'Please enter a valid zip code';
    }
  };

  // Validate a single field against specified rules
  const validateField = useCallback((fieldName, value, rules, displayName = null) => {
    const fieldDisplayName = displayName || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    
    for (const rule of rules) {
      let error = null;
      
      if (typeof rule === 'string') {
        // Simple rule name
        if (validationRules[rule]) {
          error = validationRules[rule](value, fieldDisplayName);
        }
      } else if (typeof rule === 'object') {
        // Rule with parameters
        const { type, ...params } = rule;
        if (validationRules[type]) {
          error = validationRules[type](value, ...Object.values(params));
        }
      } else if (typeof rule === 'function') {
        // Custom validation function
        error = rule(value, fieldDisplayName);
      }
      
      if (error) {
        setFieldError(fieldName, error);
        return false;
      }
    }
    
    clearFieldError(fieldName);
    return true;
  }, [setFieldError, clearFieldError]);

  // Validate entire form against validation schema
  const validateForm = useCallback((formData, validationSchema) => {
    let isValid = true;
    const newErrors = {};

    Object.keys(validationSchema).forEach(fieldName => {
      const { rules, displayName } = validationSchema[fieldName];
      const value = formData[fieldName];
      
      for (const rule of rules) {
        let error = null;
        const fieldDisplayName = displayName || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        
        if (typeof rule === 'string') {
          if (validationRules[rule]) {
            error = validationRules[rule](value, fieldDisplayName);
          }
        } else if (typeof rule === 'object') {
          const { type, ...params } = rule;
          if (validationRules[type]) {
            error = validationRules[type](value, ...Object.values(params));
          }
        } else if (typeof rule === 'function') {
          error = rule(value, fieldDisplayName);
        }
        
        if (error) {
          newErrors[fieldName] = error;
          isValid = false;
          break;
        }
      }
    });

    setMultipleErrors(newErrors);
    
    // Mark all fields as touched for error display
    const allFieldNames = Object.keys(validationSchema);
    const touchedObject = {};
    allFieldNames.forEach(name => {
      touchedObject[name] = true;
    });
    setTouchedFields(touchedObject);
    
    return isValid;
  }, [setMultipleErrors]);

  // Get CSS class for field highlighting
  const getFieldClass = useCallback((fieldName, baseClass = '') => {
    const hasError = errors[fieldName] && touchedFields[fieldName];
    return `${baseClass} ${hasError ? 'field-error' : ''}`.trim();
  }, [errors, touchedFields]);

  // Check if form has any errors
  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    touchedFields,
    hasErrors,
    clearFieldError,
    clearAllErrors,
    markFieldTouched,
    setFieldError,
    setMultipleErrors,
    validateField,
    validateForm,
    getFieldClass,
    validationRules
  };
};

// Common validation schemas for different forms
export const validationSchemas = {
  userRegistration: {
    fullName: {
      rules: ['required', { type: 'minLength', minLength: 2 }],
      displayName: 'Full Name'
    },
    email: {
      rules: ['required', 'email'],
      displayName: 'Email'
    },
    password: {
      rules: ['required', 'passwordStrength'],
      displayName: 'Password'
    },
    confirmPassword: {
      rules: ['required'],
      displayName: 'Confirm Password'
    },
    phone: {
      rules: ['required', 'phone'],
      displayName: 'Phone Number'
    },
    dob: {
      rules: ['required', 'dateOfBirth'],
      displayName: 'Date of Birth'
    },
    address: {
      rules: ['required'],
      displayName: 'Address'
    },
    community: {
      rules: ['required'],
      displayName: 'Community'
    }
  },

  merchantRegistration: {
    fullName: {
      rules: ['required', { type: 'minLength', minLength: 2 }],
      displayName: 'Full Name'
    },
    email: {
      rules: ['required', 'email'],
      displayName: 'Email'
    },
    password: {
      rules: ['required', 'passwordStrength'],
      displayName: 'Password'
    },
    phone: {
      rules: ['required', 'phone'],
      displayName: 'Phone Number'
    },
    businessName: {
      rules: ['required', 'businessName'],
      displayName: 'Business Name'
    },
    businessCategory: {
      rules: ['required'],
      displayName: 'Business Category'
    },
    businessAddress: {
      rules: ['required'],
      displayName: 'Business Address'
    },
    businessPhone: {
      rules: ['required', 'phone'],
      displayName: 'Business Phone'
    },
    businessEmail: {
      rules: ['required', 'email'],
      displayName: 'Business Email'
    }
  },

  partnerRegistration: {
    ownerName: {
      rules: ['required', { type: 'minLength', minLength: 2 }],
      displayName: 'Owner Name'
    },
    email: {
      rules: ['required', 'email'],
      displayName: 'Email'
    },
    phone: {
      rules: ['required', 'phone'],
      displayName: 'Phone Number'
    },
    businessName: {
      rules: ['required', 'businessName'],
      displayName: 'Business Name'
    },
    category: {
      rules: ['required'],
      displayName: 'Business Category'
    },
    address: {
      rules: ['required'],
      displayName: 'Address'
    },
    city: {
      rules: ['required'],
      displayName: 'City'
    },
    state: {
      rules: ['required'],
      displayName: 'State'
    },
    taxId: {
      rules: ['required', 'taxId'],
      displayName: 'Tax ID'
    }
  },

  dealForm: {
    title: {
      rules: ['required', { type: 'minLength', minLength: 3 }],
      displayName: 'Deal Title'
    },
    description: {
      rules: ['required', { type: 'minLength', minLength: 10 }],
      displayName: 'Description'
    },
    category: {
      rules: ['required'],
      displayName: 'Category'
    },
    discount: {
      rules: ['required', (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return 'Discount must be a valid number';
        if (num <= 0) return 'Discount must be greater than 0';
        if (num > 100) return 'Discount cannot exceed 100%';
        return null;
      }],
      displayName: 'Discount'
    },
    originalPrice: {
      rules: [(value) => {
        if (!value) return null;
        const num = parseFloat(value);
        if (isNaN(num)) return 'Original price must be a valid number';
        if (num <= 0) return 'Original price must be greater than 0';
        return null;
      }],
      displayName: 'Original Price'
    },
    validFrom: {
      rules: ['required', 'date'],
      displayName: 'Valid From Date'
    },
    validUntil: {
      rules: ['required', 'date', (value, fieldName, formData) => {
        if (!value || !formData?.validFrom) return null;
        const startDate = new Date(formData.validFrom);
        const endDate = new Date(value);
        return endDate > startDate ? null : 'End date must be after start date';
      }],
      displayName: 'Valid Until Date'
    }
  }
};

export default useFormValidation;
