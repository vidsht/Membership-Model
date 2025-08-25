import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './DynamicFieldsSettings.css';

const DynamicFieldsSettings = ({ settings, onSettingChange }) => {
  const { showNotification } = useNotification();
  const [dynamicFields, setDynamicFields] = useState({
    communities: [],
    userTypes: [],
    businessCategories: [],
    dealCategories: [],
    countries: [],
    states: []
  });
  const [editingField, setEditingField] = useState(null);
  const [newOption, setNewOption] = useState({ name: '', label: '', description: '', isActive: true });
  const [isLoading, setIsLoading] = useState(true);
  const [editModal, setEditModal] = useState({ isOpen: false, fieldType: '', optionIndex: -1, optionData: {} });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchDynamicFields();
  }, []);

  const fetchDynamicFields = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/dynamic-fields');
      if (response.data.success) {
        setDynamicFields(response.data.dynamicFields);
        setRefreshKey(prev => prev + 1); // Force re-render
      }
    } catch (error) {
      console.error('Error fetching dynamic fields:', error);
      showNotification('Error loading dynamic fields', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOption = (fieldType) => {
    const currentOptions = dynamicFields[fieldType] || [];
    
    if (!newOption.name.trim()) {
      showNotification('Option name is required', 'error');
      return;
    }
    
    // Check for duplicates
    const exists = currentOptions.some(option => 
      option.name.toLowerCase() === newOption.name.toLowerCase()
    );
    
    if (exists) {
      showNotification('An option with this name already exists', 'error');
      return;
    }

    const updatedOptions = [
      ...currentOptions,
      {
        ...newOption,
        name: newOption.name.trim(),
        label: newOption.label || newOption.name,
        description: newOption.description || '',
        isActive: true
      }
    ];

    updateFieldOptions(fieldType, updatedOptions);
    setNewOption({ name: '', label: '', description: '', isActive: true });
  };

  const handleUpdateOption = (fieldType, index, updatedOption) => {
    const currentOptions = [...(dynamicFields[fieldType] || [])];
    currentOptions[index] = updatedOption;
    updateFieldOptions(fieldType, currentOptions);
  };

  const openEditModal = (fieldType, index, option) => {
    setEditModal({
      isOpen: true,
      fieldType,
      optionIndex: index,
      optionData: { ...option }
    });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, fieldType: '', optionIndex: -1, optionData: {} });
  };

  const handleEditModalSave = async () => {
    const { fieldType, optionIndex, optionData } = editModal;
    
    if (!optionData.name.trim()) {
      showNotification('Option name is required', 'error');
      return;
    }

    // Check for duplicates (excluding current option)
    const currentOptions = dynamicFields[fieldType] || [];
    const exists = currentOptions.some((option, index) => 
      index !== optionIndex && option.name.toLowerCase() === optionData.name.toLowerCase()
    );
    
    if (exists) {
      showNotification('An option with this name already exists', 'error');
      return;
    }

    // Preserve label behavior: if the existing option used the default label (label === name),
    // then when the name changes we should update the label to match the new name so the
    // admin list shows the updated value. If the label was customized, keep it unchanged
    // unless the admin explicitly changed the label in the modal.
    const existingOption = currentOptions[optionIndex] || {};
    let newLabel = optionData.label;
    if (!optionData.label || (existingOption.label && existingOption.label === existingOption.name)) {
      newLabel = optionData.name.trim();
    }

    const updatedOptions = [...currentOptions];
    updatedOptions[optionIndex] = {
      ...optionData,
      name: optionData.name.trim(),
      label: newLabel || optionData.name.trim()
    };

    try {
      const response = await api.put(`/admin/dynamic-fields/${fieldType}`, { options: updatedOptions });
      if (response.data.success) {
        // Update local state immediately
        setDynamicFields(prev => ({
          ...prev,
          [fieldType]: updatedOptions
        }));
        
        // Force a complete refresh from server to ensure data consistency
        await fetchDynamicFields();
        
        showNotification(`${getFieldDisplayName(fieldType)} option updated successfully`, 'success');
        closeEditModal();
        
        // Force a re-render with new key
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating dynamic field option:', error);
      showNotification('Error updating field option', 'error');
    }
  };

  const handleEditModalChange = (field, value) => {
    setEditModal(prev => ({
      ...prev,
      optionData: {
        ...prev.optionData,
        [field]: value
      }
    }));
  };

  const handleDeleteOption = (fieldType, index) => {
    const currentOptions = [...(dynamicFields[fieldType] || [])];
    currentOptions.splice(index, 1);
    updateFieldOptions(fieldType, currentOptions);
  };

  const updateFieldOptions = async (fieldType, options) => {
    try {
      const response = await api.put(`/admin/dynamic-fields/${fieldType}`, { options });
      if (response.data.success) {
        // Update local state immediately
        setDynamicFields(prev => ({
          ...prev,
          [fieldType]: options
        }));
        
        // Force a complete refresh from server to ensure data consistency
        await fetchDynamicFields();
        
        showNotification(`${getFieldDisplayName(fieldType)} updated successfully`, 'success');
        
        // Force a re-render with new key
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating dynamic field:', error);
      showNotification('Error updating field options', 'error');
    }
  };

  const getFieldDisplayName = (fieldType) => {
    const names = {
      communities: 'Communities',
      userTypes: 'User Types',
      businessCategories: 'Business Categories',
      dealCategories: 'Deal Categories',
      countries: 'Countries',
      states: 'States/Regions'
    };
    return names[fieldType] || fieldType;
  };

  const renderFieldEditor = (fieldType, options) => {
    return (
      <div className="dynamic-field-section">
        <div className="field-header">
          <h4>{getFieldDisplayName(fieldType)}</h4>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setEditingField(editingField === fieldType ? null : fieldType)}
          >
            {editingField === fieldType ? 'Cancel' : 'Add New'}
          </button>
        </div>

        {editingField === fieldType && (
          <div className="add-option-form">
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newOption.name}
                  onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                  placeholder="Option name"
                />
              </div>
              {(fieldType === 'businessCategories' || fieldType === 'dealCategories') && (
                <div className="form-group">
                  <label>Display Label</label>
                  <input
                    type="text"
                    value={newOption.label}
                    onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                    placeholder="Display label (optional)"
                  />
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={newOption.description}
                onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                placeholder="Option description (optional)"
              />
            </div>
            <div className="form-actions">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => handleAddOption(fieldType)}
              >
                Add Option
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingField(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="options-list">
          {options.map((option, index) => (
            <div key={`${fieldType}-${option.name}-${option.label}-${index}-${refreshKey}`} className={`option-item ${!option.isActive ? 'inactive' : ''}`}>
              <div className="option-content">
                <div className="option-main">
                  <strong>{option.label || option.name}</strong>
                  {option.description && <p className="option-description">{option.description}</p>}
                </div>
                <div className="option-actions">
                  <button
                    className="btn btn-info btn-sm"
                    onClick={() => openEditModal(fieldType, index, option)}
                  >
                    Edit
                  </button>
                  <button
                    className={`btn btn-sm ${option.isActive ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => handleUpdateOption(fieldType, index, { ...option, isActive: !option.isActive })}
                  >
                    {option.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteOption(fieldType, index)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {options.length === 0 && (
            <div className="empty-state">
              <p>No options available. Add some options to get started.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dynamic fields...</p>
      </div>
    );
  }

  return (
    <div className="dynamic-fields-settings">
      <div className="settings-section-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Dynamic Fields Management</h3>
            <p>Manage dropdown options for forms throughout the application</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => {
              fetchDynamicFields();
            }}
            style={{ marginLeft: 'auto' }}
          >
            <i className="fas fa-sync-alt"></i> Refresh Data
          </button>
        </div>
      </div>

      <div className="dynamic-fields-container" key={refreshKey}>
        {Object.entries(dynamicFields).map(([fieldType, options]) => (
          <div key={fieldType}>
            {renderFieldEditor(fieldType, options)}
          </div>
        ))}
      </div>

      <div className="settings-info">
        <div className="info-box">
          <h4>How Dynamic Fields Work</h4>
          <ul>
            <li><strong>Communities:</strong> Used in user registration and profile forms</li>
            <li><strong>User Types:</strong> Used in user registration to categorize users</li>
            <li><strong>Business Categories:</strong> Used when merchants register their businesses</li>
            <li><strong>Deal Categories:</strong> Used when creating deals and offers</li>
            <li><strong>Countries:</strong> Used in registration and profile forms for country selection</li>
            <li><strong>States/Regions:</strong> Used in registration and profile forms for state/region selection</li>
          </ul>
          <p className="note">
            <strong>Note:</strong> Changes to these fields will be reflected immediately across all forms in the application.
            Deactivated options will not appear in dropdowns but existing data will be preserved.
          </p>
        </div>
      </div>

      {/* Edit Option Modal */}
      {editModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                <i className="fas fa-edit"></i>
                Edit {getFieldDisplayName(editModal.fieldType)} Option
              </h3>
              <button 
                className="close-btn" 
                onClick={closeEditModal}
                type="button"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={editModal.optionData.name || ''}
                  onChange={(e) => handleEditModalChange('name', e.target.value)}
                  placeholder="Option name"
                  className="form-input"
                />
              </div>

              {(editModal.fieldType === 'businessCategories' || editModal.fieldType === 'dealCategories') && (
                <div className="form-group">
                  <label>Display Label</label>
                  <input
                    type="text"
                    value={editModal.optionData.label || ''}
                    onChange={(e) => handleEditModalChange('label', e.target.value)}
                    placeholder="Display label (optional)"
                    className="form-input"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={editModal.optionData.description || ''}
                  onChange={(e) => handleEditModalChange('description', e.target.value)}
                  placeholder="Option description (optional)"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={editModal.optionData.isActive}
                    onChange={(e) => handleEditModalChange('isActive', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Active
                </label>
                <p className="field-description">
                  {editModal.optionData.isActive 
                    ? 'This option will be available in dropdown menus' 
                    : 'This option will be hidden from dropdown menus but existing data will be preserved'
                  }
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={closeEditModal}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleEditModalSave}
              >
                <i className="fas fa-save"></i>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicFieldsSettings;
