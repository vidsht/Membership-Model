import React from 'react';
import '../styles/FormValidation.css';

/**
 * FormField Component with built-in validation display
 * @param {Object} props - Component props
 * @param {string} props.label - Field label
 * @param {string} props.name - Field name
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {any} props.value - Field value
 * @param {function} props.onChange - Change handler
 * @param {function} props.onBlur - Blur handler
 * @param {string} props.error - Error message
 * @param {boolean} props.touched - Whether field has been touched
 * @param {boolean} props.required - Whether field is required
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether field is disabled
 * @param {Array} props.options - Options for select fields
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.inputProps - Additional input props
 * @returns {JSX.Element} FormField component
 */
const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  placeholder,
  disabled = false,
  options = [],
  className = '',
  inputProps = {},
  rows = 3,
  ...rest
}) => {
  const hasError = error && touched;
  const fieldId = `field-${name}`;

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const handleBlur = (e) => {
    if (onBlur) {
      onBlur(e);
    }
  };

  const getFieldClass = () => {
    let classes = 'form-control';
    if (hasError) {
      classes += ' field-error';
    }
    if (className) {
      classes += ` ${className}`;
    }
    return classes;
  };

  const renderInput = () => {
    const commonProps = {
      id: fieldId,
      name,
      value: value || '',
      onChange: handleChange,
      onBlur: handleBlur,
      className: getFieldClass(),
      placeholder,
      disabled,
      ...inputProps,
      ...rest
    };

    switch (type) {
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((option, index) => (
              <option 
                key={option.value || option.id || index} 
                value={option.value || option.id || option}
              >
                {option.label || option.name || option}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea 
            {...commonProps}
            rows={rows}
          />
        );

      case 'checkbox':
        return (
          <div className="form-check">
            <input
              {...commonProps}
              type="checkbox"
              className={`form-check-input ${hasError ? 'field-error' : ''}`}
              checked={!!value}
              onChange={(e) => {
                if (onChange) {
                  onChange({
                    target: {
                      name,
                      value: e.target.checked
                    }
                  });
                }
              }}
            />
            <label className="form-check-label" htmlFor={fieldId}>
              {label}
              {required && <span className="required-indicator">*</span>}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="form-check-group">
            {options.map((option, index) => {
              const radioId = `${fieldId}-${index}`;
              return (
                <div key={radioId} className="form-check">
                  <input
                    id={radioId}
                    type="radio"
                    name={name}
                    value={option.value || option}
                    checked={value === (option.value || option)}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-check-input ${hasError ? 'field-error' : ''}`}
                    disabled={disabled}
                  />
                  <label className="form-check-label" htmlFor={radioId}>
                    {option.label || option}
                  </label>
                </div>
              );
            })}
          </div>
        );

      case 'file':
        return (
          <input
            {...commonProps}
            type="file"
            onChange={(e) => {
              if (onChange) {
                onChange({
                  target: {
                    name,
                    value: e.target.files[0] || null,
                    files: e.target.files
                  }
                });
              }
            }}
          />
        );

      default:
        return <input {...commonProps} type={type} />;
    }
  };

  // For checkbox type, return early with different structure
  if (type === 'checkbox') {
    return (
      <div className={`form-group ${hasError ? 'has-error' : ''}`}>
        {renderInput()}
        {hasError && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`form-group ${hasError ? 'has-error' : ''}`}>
      {label && type !== 'checkbox' && (
        <label htmlFor={fieldId} className={`form-label ${required ? 'required' : ''}`}>
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      
      <div className="input-group-validation">
        {renderInput()}
        
        {/* Validation icon */}
        {touched && (
          <span className={`validation-icon ${hasError ? 'error' : 'success'}`}>
            {hasError ? '⚠' : '✓'}
          </span>
        )}
      </div>
      
      {hasError && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default FormField;
