/**
 * Password Strength Validator for Backend
 * Validates password strength on the server side
 */

const passwordCriteria = {
  minLength: 6,
  maxLength: 20,
  hasNumber: /\d/,
  hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  hasLowercase: /[a-z]/,
  hasUppercase: /[A-Z]/,
  onlyLatin: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required'
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

  const isValid = Object.values(criteria).every(Boolean);

  if (!isValid) {
    const failedCriteria = [];
    if (!criteria.hasMinLength) failedCriteria.push(`At least ${passwordCriteria.minLength} characters`);
    if (!criteria.hasMaxLength) failedCriteria.push(`Maximum ${passwordCriteria.maxLength} characters`);
    if (!criteria.hasNumber) failedCriteria.push('One number');
    if (!criteria.hasSymbol) failedCriteria.push('One symbol');
    if (!criteria.hasLowercase) failedCriteria.push('One lowercase letter');
    if (!criteria.hasUppercase) failedCriteria.push('One uppercase letter');
    if (!criteria.onlyLatin) failedCriteria.push('Only Latin letters and symbols');
    
    return {
      isValid: false,
      message: `Password must include: ${failedCriteria.join(', ')}`
    };
  }

  return {
    isValid: true,
    message: 'Password meets all requirements'
  };
};

module.exports = {
  validatePassword,
  passwordCriteria
};
