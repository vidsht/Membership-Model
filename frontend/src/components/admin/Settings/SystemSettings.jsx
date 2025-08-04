import React, { useState } from 'react';

/**
 * SystemSettings component for general system configuration
 * @param {Object} props - Component props
 * @param {Object} props.settings - Current system settings
 * @param {Function} props.onSettingChange - Handler for setting changes
 * @returns {React.ReactElement} The system settings component
 */
const SystemSettings = ({ settings, onSettingChange }) => {
  const [imagePreview, setImagePreview] = useState(settings?.loginImageUrl || '');

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setImagePreview(url);
    onSettingChange(null, 'loginImageUrl', url);
  };

  const handleFileUploadChange = (field, value) => {
    onSettingChange('fileUpload', field, value);
  };
  const addAllowedFileType = () => {
    const fileTypes = [...(settings?.fileUpload?.allowedFileTypes || [])];
    fileTypes.push('');
    onSettingChange('fileUpload', 'allowedFileTypes', fileTypes);
  };
  const removeAllowedFileType = (index) => {
    const fileTypes = [...(settings?.fileUpload?.allowedFileTypes || [])];
    fileTypes.splice(index, 1);
    onSettingChange('fileUpload', 'allowedFileTypes', fileTypes);
  };
  const updateAllowedFileType = (index, value) => {
    const fileTypes = [...(settings?.fileUpload?.allowedFileTypes || [])];
    fileTypes[index] = value;
    onSettingChange('fileUpload', 'allowedFileTypes', fileTypes);
  };

  return (
    <div className="system-settings">
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>General Information</h3>
          <p>Basic information about your system</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="systemName">System Name</label>
          <input
            type="text"
            id="systemName"
            value={settings?.systemName || ''}
            onChange={(e) => onSettingChange(null, 'systemName', e.target.value)}
            placeholder="Enter system name"
          />
          <div className="form-description">
            The name of your system that will appear throughout the application
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="adminEmail">Admin Email</label>
          <input
            type="email"
            id="adminEmail"
            value={settings?.adminEmail || ''}
            onChange={(e) => onSettingChange(null, 'adminEmail', e.target.value)}
            placeholder="admin@example.com"
          />
          <div className="form-description">
            Primary email address for admin notifications
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="loginImageUrl">Login Page Image URL</label>
          <input
            type="text"
            id="loginImageUrl"
            value={settings?.loginImageUrl || ''}
            onChange={handleImageUrlChange}
            placeholder="https://example.com/image.jpg"
          />
          <div className="form-description">
            URL of the image to display on the login page
          </div>
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Login Preview" style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'cover', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="language">Default Language</label>
          <select
            id="language"
            value={settings?.language || 'en'}
            onChange={(e) => onSettingChange(null, 'language', e.target.value)}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="gu">Gujarati</option>
            <option value="ta">Tamil</option>
          </select>
          <div className="form-description">
            Default language for the application
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="theme">Theme</label>
          <select
            id="theme"
            value={settings?.theme || 'light'}
            onChange={(e) => onSettingChange(null, 'theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </select>
          <div className="form-description">
            Default theme for the application
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3>File Upload Settings</h3>
          <p>Configure file upload restrictions</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="maxUploadSize">Maximum Upload Size (MB)</label>
          <input
            type="number"
            id="maxUploadSize"
            min="1"
            max="100"
            value={settings?.fileUpload?.maxUploadSize || 5}
            onChange={(e) => handleFileUploadChange('maxUploadSize', parseInt(e.target.value, 10))}
          />
          <div className="form-description">
            Maximum file size allowed for uploads in megabytes
          </div>
        </div>
        
        <div className="form-group">
          <label>Allowed File Types</label>
          <div className="file-types-list">
            {(settings?.fileUpload?.allowedFileTypes || []).map((type, index) => (
              <div key={index} className="file-type-item">
                <input
                  type="text"
                  value={type}
                  onChange={(e) => updateAllowedFileType(index, e.target.value)}
                  placeholder="e.g., jpg"
                />
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeAllowedFileType(index)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-add"
              onClick={addAllowedFileType}
            >
              <i className="fas fa-plus"></i>
              Add File Type
            </button>
          </div>
          <div className="form-description">
            File extensions that are allowed for upload (without the dot)
          </div>
        </div>      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Terms and Conditions</h3>
          <p>Legal text that users must accept</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="termsConditions">Terms and Conditions</label>
          <textarea
            id="termsConditions"
            rows="6"
            value={settings?.termsConditions || ''}
            onChange={(e) => onSettingChange(null, 'termsConditions', e.target.value)}
            placeholder="Enter terms and conditions text..."
          />
          <div className="form-description">
            Legal terms that users must accept during registration
          </div>        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
