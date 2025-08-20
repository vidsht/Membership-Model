import React, { useState, useRef, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../services/api';
import './ImageUpload.css';

const ImageUpload = ({ 
  type, 
  entityId, 
  currentImage, 
  onUploadSuccess, 
  onUploadError,
  className = '',
  disabled = false,
  label = 'Upload Image',
  description = '',
  showPreview = true,
  aspectRatio = '1:1', // '1:1', '16:9', '4:3', etc.
  // optional overrides when `type` is not provided or custom behavior is needed
  accept,
  maxSize: propMaxSize,
  dimensions: propDimensions,
  allowedTypes: propAllowedTypes,
  endpoint: propEndpoint,
  fieldName: propFieldName,
  // legacy/alternate props kept for backward compatibility
  context, // old prop name used across the codebase
  onUpload // legacy callback name
}) => {
  // Map some common legacy context values to the new type keys
  const contextTypeMap = {
    'profile-photo': 'profile',
    'merchant-logo': 'merchant',
    'deal-banner': 'deal',
    'profile': 'profile',
    'merchant': 'merchant',
    'deal': 'deal'
  };

  // Determine final type and upload callback (support old and new prop names)
  const finalType = type || contextTypeMap[context] || context || null;
  const uploadCallback = onUploadSuccess || onUpload;

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { showNotification } = useNotification();

  // Configuration for different upload types
  const uploadConfigs = {
    profile: {
      maxSize: 5, // MB
      dimensions: '500x500px',
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
      endpoint: `/upload/profile-photo/${entityId}`,
      fieldName: 'profilePhoto'
    },
    merchant: {
      maxSize: 3, // MB
      dimensions: '300x300px',
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
      endpoint: `/upload/merchant-logo/${entityId}`,
      fieldName: 'merchantLogo'
    },
    deal: {
      maxSize: 8, // MB
      dimensions: '800x400px',
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
      endpoint: `/upload/deal-banner/${entityId}`,
      fieldName: 'dealBanner'
    }
  };

  // Build a safe config: prefer explicit props, then type-based config, then sensible defaults
  const baseConfig = (finalType && uploadConfigs[finalType]) ? uploadConfigs[finalType] : {};
  
  // Handle accept prop properly - convert "image/*" to specific MIME types
  let parsedAllowedTypes = baseConfig.allowedTypes || ['image/jpeg', 'image/png', 'image/gif'];
  if (accept) {
    if (accept === 'image/*') {
      parsedAllowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    } else {
      parsedAllowedTypes = accept.split(',').map(s => s.trim());
    }
  }
  if (propAllowedTypes) {
    parsedAllowedTypes = propAllowedTypes;
  }
  
  const config = {
    maxSize: propMaxSize || baseConfig.maxSize || 5,
    dimensions: propDimensions || baseConfig.dimensions || '500x500px',
    allowedTypes: parsedAllowedTypes,
    endpoint: propEndpoint || baseConfig.endpoint || (entityId ? `/upload/image/${entityId}` : '/upload/image'),
    fieldName: propFieldName || baseConfig.fieldName || 'image'
  };

  const validateFile = (file) => {
    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed: ${config.allowedTypes.join(', ')}`);
    }

    // Check file size
    const maxSizeBytes = config.maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`File too large. Maximum size: ${config.maxSize}MB`);
    }

    return true;
  };

  const handleFileSelect = useCallback(async (file) => {
    try {
      validateFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);

      // If legacy onUpload prop is provided, delegate the upload to the parent and skip internal upload
      if (onUpload) {
        try {
          onUpload(file);
          showNotification('Image ready for upload', 'info');
        } catch (err) {
          console.warn('Legacy onUpload handler threw an error:', err);
        }
        return;
      }

      // Upload file (internal flow)
      setUploading(true);
      
      const formData = new FormData();
      formData.append(config.fieldName, file);

      const response = await api.post(config.endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        showNotification('Image uploaded successfully!', 'success');
        setPreview(response.data.imageUrl);
        // Call modern callback with upload response
        onUploadSuccess && onUploadSuccess(response.data);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification(error.message || 'Failed to upload image', 'error');
      onUploadError && onUploadError(error);
      setPreview(currentImage); // Reset to current image
    } finally {
      setUploading(false);
    }
  }, [config, entityId, currentImage, onUpload, onUploadSuccess, onUploadError, showNotification]);

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [disabled, uploading, handleFileSelect]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = async () => {
    try {
      setUploading(true);
      
      // If legacy onUpload handler exists, inform parent removal instead of internal delete
      if (onUpload) {
        try {
          onUpload(null);
          showNotification('Image removal requested', 'info');
        } catch (err) {
          console.warn('Legacy onUpload handler threw an error on remove:', err);
        }
        setPreview(null);
        return;
      }
      
      // Ensure we have both type and entityId for the delete endpoint
      if (!finalType || !entityId) {
        throw new Error('Type and entity ID are required for image deletion');
      }
      
      const response = await api.delete(`/upload/image/${finalType}/${entityId}`);
      
      if (response.data.success) {
        showNotification('Image removed successfully!', 'success');
        setPreview(null);
        uploadCallback && uploadCallback({ imageUrl: null });
      } else {
        throw new Error(response.data.message || 'Failed to remove image');
      }
    } catch (error) {
      console.error('Remove error:', error);
      showNotification(error.message || 'Failed to remove image', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`image-upload ${className}`}>
      {label && (
        <label className="image-upload-label">
          {label}
          {description && <span className="image-upload-description">{description}</span>}
        </label>
      )}
      
      <div className="image-upload-info">
        <small>
          Max size: {config.maxSize}MB | Recommended: {config.dimensions} | 
          Formats: {config.allowedTypes.map(type => type.split('/')[1]).join(', ')}
        </small>
      </div>

      <div 
        className={`image-upload-zone ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onClick={handleClick}
        style={{ aspectRatio: aspectRatio }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={config.allowedTypes.join(',')}
          onChange={handleInputChange}
          disabled={disabled || uploading}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-progress">
            <div className="spinner"></div>
            <span>Uploading...</span>
          </div>
        ) : preview ? (
          <div className="image-preview">
            <img src={preview} alt="Preview" />
            <div className="image-overlay">
              <button 
                type="button" 
                className="btn-change"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                disabled={disabled}
              >
                <i className="fas fa-edit"></i>
                Change
              </button>
              <button 
                type="button" 
                className="btn-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled}
              >
                <i className="fas fa-trash"></i>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <i className="fas fa-cloud-upload-alt"></i>
            <h4>{label}</h4>
            <p>Drag and drop or click to browse</p>
            <small>Recommended: {config.dimensions}</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
