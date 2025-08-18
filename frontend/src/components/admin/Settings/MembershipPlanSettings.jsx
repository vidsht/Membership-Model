import React from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import './MembershipPlanSettings.css';

/**
 * MembershipPlanSettings component for managing membership plan configurations
 * @param {Object} props - Component props
 * @param {Object} props.settings - Current settings object
 * @param {Function} props.onSettingChange - Callback for setting changes
 * @returns {React.ReactElement} The membership plan settings component
 */
const MembershipPlanSettings = ({ settings, onSettingChange }) => {
  const { showNotification } = useNotification();

  const handleToggleFeature = (enabled) => {
    onSettingChange('featureToggles', 'showMembershipPlans', enabled);
    if (!enabled) {
      // Clear membershipPlanRequirements when disabling
      onSettingChange('membershipPlanRequirements', '', {});
      showNotification('Membership plan fields disabled and requirements cleared.', 'info');
    } else {
      showNotification('Membership plan fields enabled in forms', 'success');
    }
  };

  const handleSectionSettingChange = (key, value) => {
    onSettingChange('membershipPlanRequirements', key, value);
  };

  return (
    <div className="membership-plan-settings">
      {/* Feature Toggle */}
      <div className="setting-group">
        <div className="setting-header">
          <h3><i className="fas fa-credit-card"></i> Membership Plan Fields</h3>
          <p>Control the display of membership plan selection in registration forms</p>
        </div>
        <div className="toggle-setting">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings?.featureToggles?.showMembershipPlans ?? true}
              onChange={(e) => handleToggleFeature(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">
            {settings?.featureToggles?.showMembershipPlans ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Section Content Settings */}
      {settings?.featureToggles?.showMembershipPlans && (
        <div className="setting-group">
          <div className="setting-header">
            <h3><i className="fas fa-heading"></i> Plan Selection Content</h3>
            <p>Configure the title and subtitle for the membership plan section</p>
          </div>
          <div className="input-group">
            <label htmlFor="section-title">Section Title</label>
            <input
              type="text"
              id="section-title"
              value={settings?.membershipPlanRequirements?.section_title || ''}
              onChange={(e) => handleSectionSettingChange('section_title', e.target.value)}
              placeholder="Choose Your Membership Plan"
            />
          </div>
          <div className="input-group">
            <label htmlFor="section-subtitle">Section Subtitle</label>
            <textarea
              id="section-subtitle"
              value={settings?.membershipPlanRequirements?.section_subtitle || ''}
              onChange={(e) => handleSectionSettingChange('section_subtitle', e.target.value)}
              placeholder="Select the membership plan that best fits your needs"
              rows="2"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MembershipPlanSettings;
