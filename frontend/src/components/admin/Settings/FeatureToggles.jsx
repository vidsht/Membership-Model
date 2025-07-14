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
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.userRegistrationEnabled !== false}
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
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.autoApproveFree !== false}
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
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.requireApproval !== false}
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
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.emailNotifications !== false}
              onChange={(e) => onSettingChange(null, 'emailNotifications', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Show Statistics</span>
            <div className="toggle-description">
              Display system statistics on the admin dashboard
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.showStats !== false}
              onChange={(e) => onSettingChange(null, 'showStats', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Social Media Requirements</h3>
          <p>Configure which social media platforms are required for registration</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Facebook Required</span>
            <div className="toggle-description">
              Users must provide their Facebook profile link during registration
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.socialMediaRequirements?.facebook?.required || false}
              onChange={(e) => onSettingChange('socialMediaRequirements', 'facebook.required', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Instagram Required</span>
            <div className="toggle-description">
              Users must provide their Instagram profile link during registration
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.socialMediaRequirements?.instagram?.required || false}
              onChange={(e) => onSettingChange('socialMediaRequirements', 'instagram.required', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">YouTube Required</span>
            <div className="toggle-description">
              Users must provide their YouTube channel link during registration
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.socialMediaRequirements?.youtube?.required || false}
              onChange={(e) => onSettingChange('socialMediaRequirements', 'youtube.required', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">WhatsApp Channel Required</span>
            <div className="toggle-description">
              Users must follow your WhatsApp channel during registration
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.socialMediaRequirements?.whatsappChannel?.required || false}
              onChange={(e) => onSettingChange('socialMediaRequirements', 'whatsappChannel.required', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">WhatsApp Group Required</span>
            <div className="toggle-description">
              Users must join your WhatsApp group during registration
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.socialMediaRequirements?.whatsappGroup?.required || false}
              onChange={(e) => onSettingChange('socialMediaRequirements', 'whatsappGroup.required', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Membership Card Settings</h3>
          <p>Configure membership card display options</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Show QR Code</span>
            <div className="toggle-description">
              Display QR codes on membership cards
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.cardSettings?.showQRCode !== false}
              onChange={(e) => onSettingChange('cardSettings', 'showQRCode', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Show Barcode</span>
            <div className="toggle-description">
              Display barcodes on membership cards
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.cardSettings?.showBarcode !== false}
              onChange={(e) => onSettingChange('cardSettings', 'showBarcode', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="form-group">
          <label htmlFor="cardLayout">Card Layout</label>
          <select
            id="cardLayout"
            value={settings.cardSettings?.layout || 'default'}
            onChange={(e) => onSettingChange('cardSettings', 'layout', e.target.value)}
          >
            <option value="default">Default</option>
            <option value="modern">Modern</option>
            <option value="classic">Classic</option>
          </select>
          <div className="form-description">
            Choose the layout style for membership cards
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="cardExpiryPeriod">Card Expiry Period (months)</label>
          <input
            type="number"
            id="cardExpiryPeriod"
            min="1"
            max="60"
            value={settings.cardSettings?.expiryPeriod || 12}
            onChange={(e) => onSettingChange('cardSettings', 'expiryPeriod', parseInt(e.target.value, 10))}
          />
          <div className="form-description">
            Number of months before membership cards expire
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <h3>System Maintenance</h3>
          <p>System-wide maintenance and emergency settings</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Maintenance Mode</span>
            <div className="toggle-description">
              Enable maintenance mode to prevent user access (admins can still access)
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.maintenanceMode || false}
              onChange={(e) => onSettingChange(null, 'maintenanceMode', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        {settings.maintenanceMode && (
          <div className="maintenance-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <strong>Warning:</strong> Maintenance mode is currently enabled. Regular users cannot access the system.
          </div>        )}
      </div>
    </div>
  );
};

export default FeatureToggles;
