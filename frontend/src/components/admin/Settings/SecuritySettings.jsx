import React from 'react';

/**
 * SecuritySettings component for configuring security-related options
 * @param {Object} props - Component props
 * @param {Object} props.settings - Current system settings
 * @param {Function} props.onSettingChange - Handler for setting changes
 * @returns {React.ReactElement} The security settings component
 */
const SecuritySettings = ({ settings, onSettingChange }) => {
  // Get security settings with defaults
  const security = settings.security || {};
  
  return (
    <div className="security-settings">
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Password Policy</h3>
          <p>Configure password requirements for users</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="minPasswordLength">Minimum Password Length</label>
          <input
            type="number"
            id="minPasswordLength"
            min="6"
            max="32"
            value={security.minPasswordLength || 8}
            onChange={(e) => onSettingChange('security', 'minPasswordLength', parseInt(e.target.value, 10))}
          />
          <div className="form-description">
            Minimum number of characters required for passwords
          </div>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Require Uppercase Letters</span>
            <div className="toggle-description">
              Passwords must contain at least one uppercase letter
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.requireUppercase !== false}
              onChange={(e) => onSettingChange('security', 'requireUppercase', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Require Lowercase Letters</span>
            <div className="toggle-description">
              Passwords must contain at least one lowercase letter
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.requireLowercase !== false}
              onChange={(e) => onSettingChange('security', 'requireLowercase', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Require Numbers</span>
            <div className="toggle-description">
              Passwords must contain at least one number
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.requireNumbers !== false}
              onChange={(e) => onSettingChange('security', 'requireNumbers', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Require Special Characters</span>
            <div className="toggle-description">
              Passwords must contain at least one special character (e.g., !@#$%^&*)
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.requireSpecialChars !== false}
              onChange={(e) => onSettingChange('security', 'requireSpecialChars', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Session Security</h3>
          <p>Configure session timeouts and security settings</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="sessionTimeout">Session Timeout (minutes)</label>
          <input
            type="number"
            id="sessionTimeout"
            min="15"
            max="1440"
            value={security.sessionTimeout || 60}
            onChange={(e) => onSettingChange('security', 'sessionTimeout', parseInt(e.target.value, 10))}
          />
          <div className="form-description">
            How long users can remain inactive before being logged out
          </div>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Remember Me Feature</span>
            <div className="toggle-description">
              Allow users to stay logged in across browser sessions
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.allowRememberMe !== false}
              onChange={(e) => onSettingChange('security', 'allowRememberMe', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="form-group">
          <label htmlFor="maxLoginAttempts">Maximum Login Attempts</label>
          <input
            type="number"
            id="maxLoginAttempts"
            min="3"
            max="10"
            value={security.maxLoginAttempts || 5}
            onChange={(e) => onSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value, 10))}
          />
          <div className="form-description">
            Number of failed login attempts before account lockout
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="lockoutDuration">Account Lockout Duration (minutes)</label>
          <input
            type="number"
            id="lockoutDuration"
            min="5"
            max="1440"
            value={security.lockoutDuration || 30}
            onChange={(e) => onSettingChange('security', 'lockoutDuration', parseInt(e.target.value, 10))}
          />
          <div className="form-description">
            How long accounts remain locked after too many failed login attempts
          </div>
        </div>
      </div>
      
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Admin Security</h3>
          <p>Configure special security settings for admin accounts</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Admin IP Restriction</span>
            <div className="toggle-description">
              Restrict admin access to specific IP addresses
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.enableIpRestriction === true}
              onChange={(e) => onSettingChange('security', 'enableIpRestriction', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        {security.enableIpRestriction && (
          <div className="form-group">
            <label htmlFor="allowedIps">Allowed IP Addresses</label>
            <textarea
              id="allowedIps"
              rows="4"
              value={security.allowedIps?.join('\n') || ''}
              onChange={(e) => {
                const ips = e.target.value.split('\n').filter(ip => ip.trim());
                onSettingChange('security', 'allowedIps', ips);
              }}
              placeholder="Enter one IP address per line"
            ></textarea>
            <div className="form-description">
              Only these IP addresses will be allowed to access admin pages
            </div>
          </div>
        )}
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Admin Action Logging</span>
            <div className="toggle-description">
              Log all admin actions for audit purposes
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.adminActionLogging !== false}
              onChange={(e) => onSettingChange('security', 'adminActionLogging', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Enhanced Admin Security</span>
            <div className="toggle-description">
              Require additional verification for sensitive admin actions
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.enhancedAdminSecurity === true}
              onChange={(e) => onSettingChange('security', 'enhancedAdminSecurity', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Email Security</h3>
          <p>Configure email verification and notification settings</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Require Email Verification</span>
            <div className="toggle-description">
              Require users to verify their email address upon registration
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.requireEmailVerification !== false}
              onChange={(e) => onSettingChange('security', 'requireEmailVerification', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Email Change Verification</span>
            <div className="toggle-description">
              Require verification when users change their email address
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.emailChangeVerification !== false}
              onChange={(e) => onSettingChange('security', 'emailChangeVerification', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Notify on Password Reset</span>
            <div className="toggle-description">
              Send notification emails when password reset is requested
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={security.notifyPasswordReset !== false}
              onChange={(e) => onSettingChange('security', 'notifyPasswordReset', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
