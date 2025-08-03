
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import SystemSettings from './SystemSettings';
import FeatureToggles from './FeatureToggles';
import SecuritySettings from './SecuritySettings';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './AdminSettings.css';

/**
 * AdminSettings component for configuring various system settings
 * @returns {React.ReactElement} The admin settings component
 */
const AdminSettings = () => {
  const { showNotification } = useNotification();
  const { modal, showConfirm, hideModal } = useModal();
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('system');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    fetchSettings();
  }, []);
    const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/settings');
      setSettings(response.data);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      if (error.response?.status === 401) {
        showNotification('Session expired. Please log in again.', 'error');
        // Redirect to login or handle session expiry
        window.location.href = '/login';
        return;
      }
      showNotification('Error loading settings. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSettingChange = (section, key, value) => {
    setSettings(prevSettings => {
      const newSettings = { ...prevSettings };
      
      if (section) {
        // Handle nested settings like socialMediaRequirements.facebook.required
        if (key.includes('.')) {
          const [subKey, nestedKey] = key.split('.');
          newSettings[section] = {
            ...newSettings[section],
            [subKey]: {
              ...newSettings[section][subKey],
              [nestedKey]: value
            }
          };
        } else {
          // Handle simple nested settings like cardSettings.layout
          newSettings[section] = {
            ...newSettings[section],
            [key]: value
          };
        }
      } else {
        // Handle top-level settings
        newSettings[key] = value;
      }
      
      return newSettings;
    });
    
    setHasChanges(true);
  };
  
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      await api.put('/admin/settings', settings);
      showNotification('Settings saved successfully.', 'success');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };
    const resetSettings = async () => {
    const confirmed = await showConfirm(
      'Reset Settings',
      'Are you sure you want to reset all changes?',
      'Reset Changes'
    );
    
    if (confirmed) {
      fetchSettings();
      showNotification('Settings have been reset.', 'info');
    }
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }
  
  if (!settings) {
    return (
      <div className="empty-state">
        <i className="fas fa-exclamation-triangle"></i>
        <p>Could not load settings. Please try again.</p>
        <button
          className="button button-primary"
          onClick={fetchSettings}
        >
          Retry
        </button>
      </div>
    );
  }
    const renderActiveTab = () => {
    switch (activeTab) {
      case 'system':
        return (
          <SystemSettings 
            settings={settings} 
            onSettingChange={handleSettingChange}
          />
        );
      case 'features':
        return (
          <FeatureToggles 
            settings={settings}
            onSettingChange={handleSettingChange} 
          />
        ); // Plan management tab removed
      case 'security':
        return (
          <SecuritySettings 
            settings={settings}
            onSettingChange={handleSettingChange} 
          />
        );      case 'social':
        return (
          <div className="settings-section">
            <div className="settings-section-header">
              <h3>Social Media Requirements</h3>
              <p>Configure which social media platforms are required for registration and set links</p>
            </div>
            
            <div className="social-platform-config">
              <h4>Facebook</h4>
              <div className="platform-settings">
                <div className="form-group">
                  <label htmlFor="facebook-url">Facebook Page URL</label>
                  <input
                    type="url"
                    id="facebook-url"
                    value={settings.socialMediaRequirements?.facebook?.url || ''}
                    onChange={(e) => handleSettingChange('socialMediaRequirements', 'facebook.url', e.target.value)}
                    placeholder="https://facebook.com/yourpage"
                  />
                </div>
                <div className="toggle-control">
                  <div>
                    <span className="toggle-label">Required for Registration</span>
                    <div className="toggle-description">
                      Users must follow this Facebook page during registration
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.socialMediaRequirements?.facebook?.required || false}
                      onChange={(e) => handleSettingChange('socialMediaRequirements', 'facebook.required', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="social-platform-config">
              <h4>Instagram</h4>
              <div className="platform-settings">
                <div className="form-group">
                  <label htmlFor="instagram-url">Instagram Profile URL</label>
                  <input
                    type="url"
                    id="instagram-url"
                    value={settings.socialMediaRequirements?.instagram?.url || ''}
                    onChange={(e) => handleSettingChange('socialMediaRequirements', 'instagram.url', e.target.value)}
                    placeholder="https://instagram.com/youraccount"
                  />
                </div>
                <div className="toggle-control">
                  <div>
                    <span className="toggle-label">Required for Registration</span>
                    <div className="toggle-description">
                      Users must follow this Instagram account during registration
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.socialMediaRequirements?.instagram?.required || false}
                      onChange={(e) => handleSettingChange('socialMediaRequirements', 'instagram.required', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="social-platform-config">
              <h4>YouTube</h4>
              <div className="platform-settings">
                <div className="form-group">
                  <label htmlFor="youtube-url">YouTube Channel URL</label>
                  <input
                    type="url"
                    id="youtube-url"
                    value={settings.socialMediaRequirements?.youtube?.url || ''}
                    onChange={(e) => handleSettingChange('socialMediaRequirements', 'youtube.url', e.target.value)}
                    placeholder="https://youtube.com/yourchannel"
                  />
                </div>
                <div className="toggle-control">
                  <div>
                    <span className="toggle-label">Required for Registration</span>
                    <div className="toggle-description">
                      Users must subscribe to this YouTube channel during registration
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.socialMediaRequirements?.youtube?.required || false}
                      onChange={(e) => handleSettingChange('socialMediaRequirements', 'youtube.required', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="social-platform-config">
              <h4>WhatsApp Channel</h4>
              <div className="platform-settings">
                <div className="form-group">
                  <label htmlFor="whatsapp-channel-url">WhatsApp Channel URL</label>
                  <input
                    type="url"
                    id="whatsapp-channel-url"
                    value={settings.socialMediaRequirements?.whatsapp_channel?.url || ''}
                    onChange={(e) => handleSettingChange('socialMediaRequirements', 'whatsapp_channel.url', e.target.value)}
                    placeholder="https://whatsapp.com/channel/..."
                  />
                </div>
                <div className="toggle-control">
                  <div>
                    <span className="toggle-label">Required for Registration</span>
                    <div className="toggle-description">
                      Users must follow this WhatsApp channel during registration
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.socialMediaRequirements?.whatsapp_channel?.required || false}
                      onChange={(e) => handleSettingChange('socialMediaRequirements', 'whatsapp_channel.required', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <div className="social-platform-config">
              <h4>WhatsApp Group</h4>
              <div className="platform-settings">
                <div className="form-group">
                  <label htmlFor="whatsapp-group-url">WhatsApp Group URL</label>
                  <input
                    type="url"
                    id="whatsapp-group-url"
                    value={settings.socialMediaRequirements?.whatsapp_group?.url || ''}
                    onChange={(e) => handleSettingChange('socialMediaRequirements', 'whatsapp_group.url', e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </div>
                <div className="toggle-control">
                  <div>
                    <span className="toggle-label">Required for Registration</span>
                    <div className="toggle-description">
                      Users must join this WhatsApp group during registration
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.socialMediaRequirements?.whatsapp_group?.required || false}
                      onChange={(e) => handleSettingChange('socialMediaRequirements', 'whatsapp_group.required', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      case 'card':
        return (
          <div className="settings-section">
            <div className="settings-section-header">
              <h3>Membership Card Settings</h3>
              <p>Configure the appearance and functionality of membership cards</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="cardLayout">Card Layout</label>
              <select
                id="cardLayout"
                value={settings.cardSettings?.layout || 'default'}
                onChange={(e) => handleSettingChange('cardSettings', 'layout', e.target.value)}
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
                onChange={(e) => handleSettingChange('cardSettings', 'expiryPeriod', parseInt(e.target.value, 10))}
              />
              <div className="form-description">
                Number of months before membership cards expire
              </div>
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
                  onChange={(e) => handleSettingChange('cardSettings', 'showQRCode', e.target.checked)}
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
                  onChange={(e) => handleSettingChange('cardSettings', 'showBarcode', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        );
      case 'terms':
        return (
          <div className="settings-section">
            <div className="settings-section-header">
              <h3>Terms & Conditions</h3>
              <p>Legal terms and conditions for users</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="termsConditions">Terms & Conditions Text</label>
              <textarea
                id="termsConditions"
                rows="15"
                value={settings.termsConditions || ''}
                onChange={(e) => handleSettingChange(null, 'termsConditions', e.target.value)}
                placeholder="Enter your terms and conditions here..."
              />
              <div className="form-description">
                Terms and conditions that users must accept during registration
              </div>
            </div>
          </div>
        );
      default:
        return <div>Select a settings category</div>;
    }
  };
  
  return (
    <div className="admin-settings">
      <div className="settings-header">
        <h2>
          <i className="fas fa-cog"></i>
          Admin Settings
        </h2>
        <div className="settings-actions">
          <button
            className="button button-secondary"
            onClick={resetSettings}
            disabled={!hasChanges || isSaving}
          >
            Reset Changes
          </button>
          <button
            className="button button-primary"
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> Save Changes
              </>
            )}
          </button>
          <Link to="/admin" className="btn-secondary" style={{marginLeft: '0.5rem'}}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
        </div>
      </div>
      
      <div className="settings-container">
        <div className="settings-sidebar">
          <ul className="settings-menu">
            <li 
              className={activeTab === 'system' ? 'active' : ''}
              onClick={() => setActiveTab('system')}
            >
              <i className="fas fa-sliders-h"></i>
              <span>System Settings</span>
            </li>
            <li 
              className={activeTab === 'features' ? 'active' : ''}
              onClick={() => setActiveTab('features')}
            >
              <i className="fas fa-toggle-on"></i>
              <span>Feature Toggles</span>
            </li>            {/* Plan Management tab removed */}            <li 
              className={activeTab === 'security' ? 'active' : ''}
              onClick={() => setActiveTab('security')}
            >
              <i className="fas fa-shield-alt"></i>
              <span>Security Settings</span>
            </li>
            <li 
              className={activeTab === 'social' ? 'active' : ''}
              onClick={() => setActiveTab('social')}
            >
              <i className="fas fa-share-alt"></i>
              <span>Social Media</span>
            </li>
            <li 
              className={activeTab === 'card' ? 'active' : ''}
              onClick={() => setActiveTab('card')}
            >
              <i className="fas fa-id-card"></i>
              <span>Card Settings</span>
            </li>
            <li 
              className={activeTab === 'terms' ? 'active' : ''}
              onClick={() => setActiveTab('terms')}
            >
              <i className="fas fa-file-contract"></i>
              <span>Terms & Conditions</span>
            </li>
          </ul>
        </div>
        
        <div className="settings-content">
          {renderActiveTab()}
        </div>
      </div>
      
      {hasChanges && (
        <div className="unsaved-changes-alert">
          <i className="fas fa-exclamation-circle"></i>
          <span>You have unsaved changes</span>
          <div className="alert-actions">
            <button
              className="button button-small button-light"
              onClick={resetSettings}
            >
              Reset
            </button>
            <button
              className="button button-small button-primary"
              onClick={saveSettings}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>        </div>
      )}
      <Modal modal={modal} onClose={hideModal} />
    </div>
  );
};

export default AdminSettings;
