import React, { useState } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import './SocialMediaSettings.css';

/**
 * SocialMediaSettings component for managing social media configurations
 * @param {Object} props - Component props
 * @param {Object} props.settings - Current settings object
 * @param {Function} props.onSettingChange - Callback for setting changes
 * @returns {React.ReactElement} The social media settings component
 */
const SocialMediaSettings = ({ settings, onSettingChange }) => {
  const { showNotification } = useNotification();
  const [expandedPlatform, setExpandedPlatform] = useState(null);
  
  const socialPlatforms = [
    {
      key: 'whatsapp_channel',
      name: 'WhatsApp Channel',
      icon: 'fab fa-whatsapp',
      color: '#25d366'
    },
    {
      key: 'facebook',
      name: 'Facebook',
      icon: 'fab fa-facebook-f',
      color: '#1877f2'
    },
    {
      key: 'instagram',
      name: 'Instagram',
      icon: 'fab fa-instagram',
      color: '#e4405f'
    },
    {
      key: 'youtube',
      name: 'YouTube',
      icon: 'fab fa-youtube',
      color: '#ff0000'
    }
  ];

  const handleSectionSettingChange = (key, value) => {
    onSettingChange('socialMediaRequirements', key, value);
  };

  const handlePlatformSettingChange = (platform, key, value) => {
    const currentPlatform = settings?.socialMediaRequirements?.[platform] || {};
    const updatedPlatform = { ...currentPlatform, [key]: value };
    onSettingChange('socialMediaRequirements', platform, updatedPlatform);
  };

  const handleDisplaySettingChange = (platform, displayKey, value) => {
    const currentPlatform = settings?.socialMediaRequirements?.[platform] || {};
    const currentDisplay = currentPlatform.display || {};
    const updatedDisplay = { ...currentDisplay, [displayKey]: value };
    const updatedPlatform = { ...currentPlatform, display: updatedDisplay };
    onSettingChange('socialMediaRequirements', platform, updatedPlatform);
  };

  const handleToggleFeature = (enabled) => {
    onSettingChange('featureToggles', 'showSocialMediaHome', enabled);
    if (!enabled) {
      // Clear socialMediaRequirements when disabling
      onSettingChange('socialMediaRequirements', '', {});
      showNotification('Social media section disabled and requirements cleared.', 'info');
    } else {
      showNotification('Social media section enabled on home page', 'success');
    }
  };
  return (
    <div className="social-media-settings">
      {/* Feature Toggle */}
      <div className="setting-group">
        <div className="setting-header">
          <h3><i className="fas fa-share-alt"></i> Social Media Home Section</h3>
          <p>Control the social media section display on the home page</p>
        </div>
        <div className="toggle-setting">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.featureToggles?.showSocialMediaHome ?? true}
              onChange={(e) => handleToggleFeature(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">
            {settings?.featureToggles?.showSocialMediaHome ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Section Content Settings */}
      {settings?.featureToggles?.showSocialMediaHome && (
        <>
          <div className="setting-group">
            <div className="setting-header">
              <h3><i className="fas fa-heading"></i> Section Content</h3>
              <p>Configure the title and subtitle for the social media section</p>
            </div>
            <div className="input-group">
              <label htmlFor="section-title">Section Title</label>
              <input
                type="text"
                id="section-title"
                value={settings?.socialMediaRequirements?.home_section_title || 'Join Our Community'}
                onChange={(e) => handleSectionSettingChange('home_section_title', e.target.value)}
                placeholder="Join Our Community"
              />
            </div>
            <div className="input-group">
              <label htmlFor="section-subtitle">Section Subtitle</label>
              <textarea
                id="section-subtitle"
                value={settings?.socialMediaRequirements?.home_section_subtitle || 'Stay connected with the Indians in Ghana community through our social channels'}
                onChange={(e) => handleSectionSettingChange('home_section_subtitle', e.target.value)}
                placeholder="Stay connected with the Indians in Ghana community through our social channels"
                rows="3"
              />
            </div>
          </div>

          {/* Platform Settings */}
          <div className="setting-group">
            <div className="setting-header">
              <h3><i className="fas fa-cog"></i> Platform Settings</h3>
              <p>Configure individual social media platforms</p>
            </div>
            
            {socialPlatforms.map((platform) => {
              const platformData = settings?.socialMediaRequirements?.[platform.key] || {};
              const isExpanded = expandedPlatform === platform.key;
              
              return (
                <div key={platform.key} className="platform-setting">
                  <div 
                    className="platform-header" 
                    onClick={() => setExpandedPlatform(isExpanded ? null : platform.key)}
                  >
                    <div className="platform-info">
                      <i className={platform.icon} style={{ color: platform.color }}></i>
                      <span>{platform.name}</span>
                      <span className={`status ${platformData.required ? 'enabled' : 'disabled'}`}>
                        {platformData.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} chevron-icon`}></i>
                  </div>
                  
                  {isExpanded && (
                    <div className="platform-details">
                      <div className="input-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={platformData.required || false}
                            onChange={(e) => handlePlatformSettingChange(platform.key, 'required', e.target.checked)}
                          />
                          Required for registration
                        </label>
                      </div>
                      
                      <div className="input-group">
                        <label htmlFor={`${platform.key}-url`}>Platform URL</label>
                        <input
                          type="url"
                          id={`${platform.key}-url`}
                          value={platformData.url || ''}
                          onChange={(e) => handlePlatformSettingChange(platform.key, 'url', e.target.value)}
                          placeholder={`https://${platform.key === 'whatsapp_channel' ? 'whatsapp.com/channel' : platform.key}.com/...`}
                        />
                      </div>
                      
                      <div className="display-settings">
                        <h4>Display Settings</h4>
                        <div className="input-group">
                          <label htmlFor={`${platform.key}-display-name`}>Display Name</label>
                          <input
                            type="text"
                            id={`${platform.key}-display-name`}
                            value={platformData.display?.name || platform.name}
                            onChange={(e) => handleDisplaySettingChange(platform.key, 'name', e.target.value)}
                            placeholder={platform.name}
                          />
                        </div>
                        
                        <div className="input-group">
                          <label htmlFor={`${platform.key}-display-description`}>Description</label>
                          <textarea
                            id={`${platform.key}-display-description`}
                            value={platformData.display?.description || ''}
                            onChange={(e) => handleDisplaySettingChange(platform.key, 'description', e.target.value)}
                            placeholder="Brief description of what users can expect"
                            rows="2"
                          />
                        </div>
                        
                        <div className="input-group">
                          <label htmlFor={`${platform.key}-display-button`}>Button Text</label>
                          <input
                            type="text"
                            id={`${platform.key}-display-button`}
                            value={platformData.display?.button || 'Follow'}
                            onChange={(e) => handleDisplaySettingChange(platform.key, 'button', e.target.value)}
                            placeholder="Follow"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SocialMediaSettings;
