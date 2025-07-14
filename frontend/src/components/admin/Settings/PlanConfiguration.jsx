import React, { useState } from 'react';

/**
 * PlanConfiguration component for managing membership plans
 * @param {Object} props - Component props
 * @param {Object} props.settings - Current system settings
 * @param {Function} props.onSettingChange - Handler for setting changes
 * @returns {React.ReactElement} The plan configuration component
 */
const PlanConfiguration = ({ settings, onSettingChange }) => {
  const [activeTab, setActiveTab] = useState('community');
  
  const handleFeatureChange = (plan, index, value) => {
    const features = [...settings.membershipPlans[plan].features];
    features[index] = value;
    
    onSettingChange('membershipPlans', `${plan}.features`, features);
  };
  
  const addFeature = (plan) => {
    const features = [...settings.membershipPlans[plan].features, ''];
    onSettingChange('membershipPlans', `${plan}.features`, features);
  };
  
  const removeFeature = (plan, index) => {
    const features = [...settings.membershipPlans[plan].features];
    features.splice(index, 1);
    
    onSettingChange('membershipPlans', `${plan}.features`, features);
  };
  
  const renderPlanTab = (plan) => {
    const planData = settings.membershipPlans[plan];
    
    return (
      <div className="plan-configuration">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`${plan}Name`}>Plan Name</label>
            <input
              type="text"
              id={`${plan}Name`}
              value={planData?.name || ''}
              onChange={(e) => onSettingChange('membershipPlans', `${plan}.name`, e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor={`${plan}Price`}>Price (USD)</label>
            <input
              type="number"
              id={`${plan}Price`}
              min="0"
              step="1"
              value={planData?.price || 0}
              onChange={(e) => onSettingChange('membershipPlans', `${plan}.price`, parseInt(e.target.value, 10))}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Deal Access Level</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name={`${plan}DealAccess`}
                value="none"
                checked={planData?.dealAccess === 'none'}
                onChange={() => onSettingChange('membershipPlans', `${plan}.dealAccess`, 'none')}
              />
              None
            </label>
            
            <label className="radio-label">
              <input
                type="radio"
                name={`${plan}DealAccess`}
                value="basic"
                checked={planData?.dealAccess === 'basic'}
                onChange={() => onSettingChange('membershipPlans', `${plan}.dealAccess`, 'basic')}
              />
              Basic
            </label>
            
            <label className="radio-label">
              <input
                type="radio"
                name={`${plan}DealAccess`}
                value="intermediate"
                checked={planData?.dealAccess === 'intermediate'}
                onChange={() => onSettingChange('membershipPlans', `${plan}.dealAccess`, 'intermediate')}
              />
              Intermediate
            </label>
            
            <label className="radio-label">
              <input
                type="radio"
                name={`${plan}DealAccess`}
                value="full"
                checked={planData?.dealAccess === 'full'}
                onChange={() => onSettingChange('membershipPlans', `${plan}.dealAccess`, 'full')}
              />
              Full
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <div className="toggle-control">
            <div>
              <span className="toggle-label">Event Access</span>
              <div className="toggle-description">
                Allow members of this plan to access community events
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={planData?.eventAccess !== false}
                onChange={(e) => onSettingChange('membershipPlans', `${plan}.eventAccess`, e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label>Plan Features</label>
          <div className="features-list">
            {planData?.features?.map((feature, index) => (
              <div key={index} className="feature-item">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => handleFeatureChange(plan, index, e.target.value)}
                  placeholder="Enter feature description"
                />
                <button
                  type="button"
                  className="button button-icon button-danger"
                  onClick={() => removeFeature(plan, index)}
                  title="Remove feature"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            ))}
            
            <button
              type="button"
              className="button button-secondary button-sm"
              onClick={() => addFeature(plan)}
            >
              <i className="fas fa-plus"></i> Add Feature
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="plan-configuration-container">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          Community Plan
        </button>
        
        <button
          className={`tab-button ${activeTab === 'silver' ? 'active' : ''}`}
          onClick={() => setActiveTab('silver')}
        >
          Silver Plan
        </button>
        
        <button
          className={`tab-button ${activeTab === 'gold' ? 'active' : ''}`}
          onClick={() => setActiveTab('gold')}
        >
          Gold Plan
        </button>
      </div>
      
      <div className="tabs-content">
        {activeTab === 'community' && renderPlanTab('community')}
        {activeTab === 'silver' && renderPlanTab('silver')}
        {activeTab === 'gold' && renderPlanTab('gold')}
      </div>
      
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Plan Upgrade Settings</h3>
          <p>Configure how plan upgrades are handled</p>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Allow Plan Upgrades</span>
            <div className="toggle-description">
              Allow users to upgrade their membership plan
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.allowPlanUpgrades !== false}
              onChange={(e) => onSettingChange(null, 'allowPlanUpgrades', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Allow Plan Downgrades</span>
            <div className="toggle-description">
              Allow users to downgrade their membership plan
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.allowPlanDowngrades !== false}
              onChange={(e) => onSettingChange(null, 'allowPlanDowngrades', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="toggle-control">
          <div>
            <span className="toggle-label">Prorate Plan Changes</span>
            <div className="toggle-description">
              Apply prorated charges when users change plans
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.proratePlanChanges !== false}
              onChange={(e) => onSettingChange(null, 'proratePlanChanges', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default PlanConfiguration;
