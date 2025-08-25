/**
 * Password Strength Utility
 * Checks password strength based on specified criteria
 */

export const passwordCriteria = {
  minLength: 6,
  maxLength: 20,
  hasNumber: /\d/,
  hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  hasLowercase: /[a-z]/,
  hasUppercase: /[A-Z]/,
  onlyLatin: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/
};

export const checkPasswordStrength = (password) => {
  if (!password) {
    return {
      isValid: false,
      strength: 'none',
      score: 0,
      criteria: {},
      message: 'Please enter a password'
    };
  }

  const criteria = {
    hasMinLength: password.length >= passwordCriteria.minLength,
    hasMaxLength: password.length <= passwordCriteria.maxLength,
    hasNumber: passwordCriteria.hasNumber.test(password),
    hasSymbol: passwordCriteria.hasSymbol.test(password),
    hasLowercase: passwordCriteria.hasLowercase.test(password),
    hasUppercase: passwordCriteria.hasUppercase.test(password),
    onlyLatin: passwordCriteria.onlyLatin.test(password)
  };

  const passedCriteria = Object.values(criteria).filter(Boolean).length;
  const totalCriteria = Object.keys(criteria).length;
  
  let strength = 'weak';
  let score = passedCriteria;
  
  // All criteria must be met for a valid password
  const isValid = Object.values(criteria).every(Boolean);
  
  // Determine strength
  if (passedCriteria >= 6 && isValid) {
    strength = 'strong';
  } else if (passedCriteria >= 4) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  let message = '';
  if (isValid) {
    message = 'Strong password';
  } else {
    const failedCriteria = [];
    if (!criteria.hasMinLength) failedCriteria.push(`At least ${passwordCriteria.minLength} characters`);
    if (!criteria.hasMaxLength) failedCriteria.push(`Maximum ${passwordCriteria.maxLength} characters`);
    if (!criteria.hasNumber) failedCriteria.push('One number');
    if (!criteria.hasSymbol) failedCriteria.push('One symbol');
    if (!criteria.hasLowercase) failedCriteria.push('One lowercase letter');
    if (!criteria.hasUppercase) failedCriteria.push('One uppercase letter');
    if (!criteria.onlyLatin) failedCriteria.push('Only Latin letters and symbols');
    
    message = `Required: ${failedCriteria.join(', ')}`;
  }

  return {
    isValid,
    strength,
    score,
    criteria,
    message,
    passedCriteria,
    totalCriteria
  };
};

export default {
  checkPasswordStrength,
  passwordCriteria
};
