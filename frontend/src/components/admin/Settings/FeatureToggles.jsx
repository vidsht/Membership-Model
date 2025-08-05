import React from 'react';

/**
 * FeatureToggles component for enabling/disabling system features
 * @param {Object} props - Component props
 * @param {Object} props.settings - Current system settings
 * @param {Function} props.onSettingChange - Handler for setting changes
 * @returns {React.ReactElement} The feature toggles component
 */
const FeatureToggles = ({ settings, onSettingChange }) => {
  const handleToggleChange = (field, value) => {
    onSettingChange(null, field, value);
  };

  return (
    <div className="feature-toggles">
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Registration Features</h3>
          <p>Control which registration features are enabled</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">User Registration</span>
            <div className="toggle-description">
              Allow new users to register for the platform
            </div>
          </div>          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.userRegistrationEnabled !== false}
              onChange={(e) => onSettingChange(null, 'userRegistrationEnabled', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Auto-Approve Free Members</span>
            <div className="toggle-description">
              Automatically approve users who register for the free Community plan
            </div>
          </div>          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.autoApproveFree !== false}
              onChange={(e) => onSettingChange(null, 'autoApproveFree', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Require Manual Approval</span>
            <div className="toggle-description">
              Require admin approval for new user registrations (except auto-approved)
            </div>
          </div>          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.requireApproval !== false}
              onChange={(e) => onSettingChange(null, 'requireApproval', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Email Notifications</span>
            <div className="toggle-description">
              Send email notifications for important events
            </div>
          </div>          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.emailNotifications !== false}
              onChange={(e) => onSettingChange(null, 'emailNotifications', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Home Page Features</h3>
          <p>Control features displayed on the home page</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Show Hero Section</span>
            <div className="toggle-description">
              Display the hero section at the top of the home page
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.featureToggles?.showHeroSection !== false}
              onChange={(e) => onSettingChange('featureToggles', 'showHeroSection', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Show Social Media Home Section</span>
            <div className="toggle-description">
              Display social media section on the home page for community engagement
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.featureToggles?.showSocialMediaHome !== false}
              onChange={(e) => onSettingChange('featureToggles', 'showSocialMediaHome', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FeatureToggles;
