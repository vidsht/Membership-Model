import React from 'react';
import '../styles/FormValidation.css';

/**
 * FormErrorSummary Component - Displays all form errors in a summary box
 * @param {Object} props - Component props
 * @param {Object} props.errors - Object containing all form errors
 * @param {Object} props.fieldLabels - Object mapping field names to display labels
 * @param {string} props.title - Title for the error summary
 * @param {boolean} props.show - Whether to show the summary
 * @returns {JSX.Element|null} FormErrorSummary component
 */
const FormErrorSummary = ({ 
  errors = {}, 
  fieldLabels = {}, 
  title = "Please correct the following errors:",
  show = true 
}) => {
  const errorKeys = Object.keys(errors);
  
  if (!show || errorKeys.length === 0) {
    return null;
  }

  const getFieldLabel = (fieldName) => {
    return fieldLabels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  return (
    <div className="form-errors-summary" role="alert" aria-live="polite">
      <h4>{title}</h4>
      <ul>
        {errorKeys.map(fieldName => (
          <li key={fieldName}>
            <strong>{getFieldLabel(fieldName)}:</strong> {errors[fieldName]}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FormErrorSummary;
