import React from 'react';
import './PasswordStrengthIndicator.css';

const PasswordStrengthIndicator = ({ password, showCriteria = true }) => {
  const checkStrength = (password) => {
    if (!password) {
      return {
        isValid: false,
        strength: 'none',
        score: 0,
        criteria: {},
        message: ''
      };
    }

    const criteria = {
      hasMinLength: password.length >= 6,
      hasMaxLength: password.length <= 20,
      hasNumber: /\d/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      onlyLatin: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/.test(password)
    };

    const passedCriteria = Object.values(criteria).filter(Boolean).length;
    
    // All criteria must be met for a valid password
    const isValid = Object.values(criteria).every(Boolean);
    
    let strength = 'weak';
    if (passedCriteria >= 6 && isValid) {
      strength = 'strong';
    } else if (passedCriteria >= 4) {
      strength = 'medium';
    }

    let message = '';
    if (isValid) {
      message = 'Strong password';
    } else if (password.length > 0) {
      message = 'Weak password';
    }

    return {
      isValid,
      strength,
      score: passedCriteria,
      criteria,
      message,
      passedCriteria,
      totalCriteria: 7
    };
  };

  const result = checkStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className="password-strength-indicator">
      <div className={`strength-bar strength-${result.strength}`}>
        <div className="strength-text">
          {result.message}
        </div>
      </div>
      
      {showCriteria && (
        <div className="password-criteria">
          <div className="criteria-title">Password requirements:</div>
          <ul className="criteria-list">
            <li className={result.criteria.hasMinLength ? 'valid' : 'invalid'}>
              <span className="criteria-icon">{result.criteria.hasMinLength ? '✓' : '✗'}</span>
              Use 6-20 characters
            </li>
            <li className={result.criteria.hasNumber ? 'valid' : 'invalid'}>
              <span className="criteria-icon">{result.criteria.hasNumber ? '✓' : '✗'}</span>
              One number
            </li>
            <li className={result.criteria.hasSymbol ? 'valid' : 'invalid'}>
              <span className="criteria-icon">{result.criteria.hasSymbol ? '✓' : '✗'}</span>
              One symbol
            </li>
            <li className={result.criteria.hasLowercase ? 'valid' : 'invalid'}>
              <span className="criteria-icon">{result.criteria.hasLowercase ? '✓' : '✗'}</span>
              One lowercase letter
            </li>
            <li className={result.criteria.hasUppercase ? 'valid' : 'invalid'}>
              <span className="criteria-icon">{result.criteria.hasUppercase ? '✓' : '✗'}</span>
              One uppercase letter
            </li>
            <li className={result.criteria.onlyLatin ? 'valid' : 'invalid'}>
              <span className="criteria-icon">{result.criteria.onlyLatin ? '✓' : '✗'}</span>
              Only Latin letters
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
