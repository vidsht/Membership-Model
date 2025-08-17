
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import SystemSettings from './SystemSettings';
import FeatureToggles from './FeatureToggles';
import SocialMediaSettings from './SocialMediaSettings';
import Modal from '../../shared/Modal';
import { useModal } from '../../../hooks/useModal';
import './AdminSettings.css';

/**
 * AdminSettings component for configuring various system settings
 * @returns {React.ReactElement} The admin settings component
 */
const AdminSettings = () => {
  const { showNotification } = useNotification();
  const { modal, showConfirm, hideModal } = useModal();  const [settings, setSettings] = useState({
    socialMediaRequirements: {},
    featureToggles: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [activeTab, setActiveTab] = useState('system');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    fetchSettings();
  }, []);    const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/settings');
      setSettings(response.data);
      setHasLoadedInitialData(true);
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
      // Defensive: ensure prevSettings is not null
      const newSettings = { ...(prevSettings || {}) };
      
      if (section) {
        // Ensure the section exists
        if (!newSettings[section]) {
          newSettings[section] = {};
        }
        
        // Handle nested settings like socialMediaRequirements.facebook.required
        if (key.includes('.')) {
          const [subKey, nestedKey] = key.split('.');
          newSettings[section] = {
            ...newSettings[section],
            [subKey]: {
              ...(newSettings[section][subKey] || {}), // Defensive: provide empty object if undefined
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
      // Ensure payload is { settings }
      await api.put('/admin/settings', { settings });
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
        </div>
      </div>
    );
  }
    if (!hasLoadedInitialData && !isLoading) {
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
  }    const renderActiveTab = () => {
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
        );
      case 'social':
        return (
          <SocialMediaSettings 
            settings={settings}
            onSettingChange={handleSettingChange} 
          />
        );
      case 'terms':
        return (
          <div className="settings-section">
            <div className="settings-section-header">
              <h3>Terms and Policies</h3>
              <p>Manage terms of service and privacy policy content</p>
            </div>
            <div className="form-group">
              <label>Terms of Service URL</label>
              <input
                type="url"
                value={settings.content?.termsUrl || ''}
                onChange={(e) => handleSettingChange('content', 'termsUrl', e.target.value)}
                placeholder="https://yoursite.com/terms"
              />
            </div>
            <div className="form-group">
              <label>Privacy Policy URL</label>
              <input
                type="url"
                value={settings.content?.privacyUrl || ''}
                onChange={(e) => handleSettingChange('content', 'privacyUrl', e.target.value)}
                placeholder="https://yoursite.com/privacy"
              />
            </div>
          </div>
        );
      default:
        return <div>Select a tab to view settings</div>;
    }  };
  
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
              <span>Feature Toggles</span>            </li>
            <li 
              className={activeTab === 'social' ? 'active' : ''}
              onClick={() => setActiveTab('social')}
            >
              <i className="fas fa-share-alt"></i>
              <span>Social Media</span>
            </li>
            <li 
              className={activeTab === 'terms' ? 'active' : ''}
              onClick={() => setActiveTab('terms')}
            >
              <i className="fas fa-file-contract"></i>
              <span>Terms & Policies</span>
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
