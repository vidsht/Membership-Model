import React from 'react';

/**
 * SystemSettings component for general system configuration
 * @param {Object} props - Component props
 * @param {Object} props.settings - Current system settings
 * @param {Function} props.onSettingChange - Handler for setting changes
 * @returns {React.ReactElement} The system settings component
 */
const SystemSettings = ({ settings, onSettingChange }) => {
  return (
    <div className="system-settings">
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>System Configuration</h3>
          <p>Basic system configuration settings</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">User Registration</span>
            <div className="toggle-description">
              Allow new users to register for accounts
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.systemSettings?.registrationEnabled !== false}
              onChange={(e) => onSettingChange('systemSettings', 'registrationEnabled', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
