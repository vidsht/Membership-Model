import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import ImageUpload from '../../common/ImageUpload';
import { SmartImage } from '../../../hooks/useImageUrl.jsx';
import api from '../../../services/api';
import './HeroBackgroundUpload.css';

/**
 * HeroBackgroundUpload component for admin settings
 * Allows admins to upload and manage the hero section background image with editing capabilities
 */
const HeroBackgroundUpload = () => {
  const { showNotification } = useNotification();
  const [currentImage, setCurrentImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Image editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [imageMetadata, setImageMetadata] = useState(null);
  const [editorSettings, setEditorSettings] = useState({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    width: null,
    height: null,
    quality: 90,
    position: 'centre',
    fit: 'cover'
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const previewTimeoutRef = useRef(null);

  useEffect(() => {
    fetchCurrentImage();
  }, []);

  const fetchCurrentImage = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/hero-background');
      if (response.data.success) {
        setCurrentImage(response.data.filename);
        setImageUrl(response.data.imageUrl);
      }
    } catch (error) {
      console.error('Error fetching hero background:', error);
      showNotification('Failed to load current hero background', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchImageMetadata = async () => {
    try {
      const response = await api.get('/admin/hero-background/metadata');
      if (response.data.success) {
        setImageMetadata(response.data.metadata);
        setEditorSettings(prev => ({
          ...prev,
          width: response.data.metadata.width,
          height: response.data.metadata.height
        }));
      } else {
        console.warn('No metadata available:', response.data.message);
        // Set default metadata if none available
        setImageMetadata({
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 0
        });
        setEditorSettings(prev => ({
          ...prev,
          width: 1920,
          height: 1080
        }));
      }
    } catch (error) {
      console.error('Error fetching image metadata:', error);
      // Don't show error notification for missing metadata - it's expected when no image is set
      if (error.response?.status !== 404) {
        showNotification('Failed to load image metadata', 'error');
      }
      // Set fallback metadata
      setImageMetadata({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        size: 0
      });
      setEditorSettings(prev => ({
        ...prev,
        width: 1920,
        height: 1080
      }));
    }
  };

  const generatePreview = useCallback(async (settings) => {
    if (!currentImage) return;

    // Clear previous timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Debounce preview generation
    previewTimeoutRef.current = setTimeout(async () => {
      try {
        setIsGeneratingPreview(true);
        const response = await api.post('/admin/hero-background/preview', settings);
        if (response.data.success) {
          // Add cache-busting parameter to ensure fresh preview
          const cacheBustUrl = `${response.data.previewUrl}?t=${Date.now()}`;
          setPreviewUrl(cacheBustUrl);
          console.log('Preview generated:', cacheBustUrl);
        } else {
          console.error('Preview generation failed:', response.data.message);
          showNotification('Failed to generate preview', 'error');
        }
      } catch (error) {
        console.error('Error generating preview:', error);
        showNotification('Failed to generate preview', 'error');
      } finally {
        setIsGeneratingPreview(false);
      }
    }, 500);
  }, [currentImage, showNotification]);

  const handleEditorSettingChange = (key, value) => {
    const newSettings = { ...editorSettings, [key]: value };
    setEditorSettings(newSettings);
    setHasChanges(true);
    
    console.log(`Editor setting changed: ${key} = ${value}`, newSettings);
    
    // Generate preview with new settings
    generatePreview(newSettings);
  };

  const handleStartEditing = async () => {
    if (!currentImage || !imageUrl) {
      showNotification('No image available to edit', 'warning');
      return;
    }
    
    setIsEditing(true);
    setEditingImage(imageUrl);
    await fetchImageMetadata();
    // Generate initial preview with current settings
    generatePreview(editorSettings);
  };

  const handleSaveEdits = async () => {
    try {
      setIsSaving(true);
      const response = await api.post('/admin/hero-background/edit', editorSettings);
      
      if (response.data.success) {
        setCurrentImage(response.data.filename);
        setImageUrl(response.data.imageUrl);
        setIsEditing(false);
        setHasChanges(false);
        setPreviewUrl(null);
        showNotification('Image edited successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      showNotification('Failed to save image edits', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditingImage(null);
    setPreviewUrl(null);
    setHasChanges(false);
    setEditorSettings({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      width: imageMetadata?.width || null,
      height: imageMetadata?.height || null,
      quality: 90,
      position: 'centre',
      fit: 'cover'
    });
  };

  const handleResetSettings = () => {
    if (imageMetadata) {
      const resetSettings = {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        width: imageMetadata.width,
        height: imageMetadata.height,
        quality: 90,
        position: 'centre',
        fit: 'cover'
      };
      setEditorSettings(resetSettings);
      setHasChanges(true);
      generatePreview(resetSettings);
    }
  };

  const handleUploadSuccess = async (uploadResponse) => {
    try {
      if (uploadResponse && uploadResponse.imageUrl) {
        setCurrentImage(uploadResponse.filename);
        setImageUrl(uploadResponse.imageUrl);
        showNotification('Hero background updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error updating hero background:', error);
      showNotification('Failed to update hero background', 'error');
    }
  };

  const handleUploadError = (error) => {
    console.error('Hero background upload error:', error);
    showNotification('Failed to upload hero background image', 'error');
  };

  const handleRemoveImage = async () => {
    try {
      setUploading(true);
      const response = await api.delete('/admin/hero-background');
      if (response.data.success) {
        setCurrentImage(null);
        setImageUrl(null);
        setIsEditing(false);
        showNotification('Hero background removed successfully!', 'success');
      }
    } catch (error) {
      console.error('Error removing hero background:', error);
      showNotification('Failed to remove hero background', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="hero-background-upload loading">
        <div className="loading-spinner"></div>
        <p>Loading current background...</p>
      </div>
    );
  }

  return (
    <div className="hero-background-upload">
      {currentImage && imageUrl ? (
        <div className="current-background-section">
          <div className="background-preview">
            <SmartImage
              src={isEditing && previewUrl ? previewUrl : imageUrl}
              alt="Current hero background"
              className="background-image"
              crossOrigin="anonymous"
              loading="lazy"
              onError={(e) => {
                console.error('Image load error:', e.target.src);
                // Fallback to original image if preview fails
                if (isEditing && previewUrl && e.target.src.includes('preview_')) {
                  e.target.src = imageUrl;
                }
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', isEditing && previewUrl ? previewUrl : imageUrl);
              }}
            />
            <div className="preview-overlay">
              <div className="preview-info">
                <h4>{isEditing ? 'Preview' : 'Current Hero Background'}</h4>
                <p>{currentImage}</p>
                {isGeneratingPreview && <span className="preview-loading">Generating preview...</span>}
              </div>
            </div>
          </div>
          
          {!isEditing ? (
            <div className="background-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStartEditing}
              >
                <i className="fas fa-edit"></i>
                Edit Image
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleRemoveImage}
                disabled={uploading}
              >
                <i className="fas fa-trash"></i>
                {uploading ? 'Removing...' : 'Remove Background'}
              </button>
            </div>
          ) : (
            <div className="image-editor">
              <div className="editor-header">
                <h4>Image Editor</h4>
                <div className="editor-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleCancelEditing}
                  >
                    <i className="fas fa-times"></i>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveEdits}
                    disabled={!hasChanges || isSaving}
                  >
                    <i className="fas fa-save"></i>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              <div className="editor-controls">
                <div className="control-group">
                  <label>Zoom</label>
                  <div className="control-input">
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={editorSettings.zoom}
                      onChange={(e) => handleEditorSettingChange('zoom', parseFloat(e.target.value))}
                    />
                    <span className="control-value">{editorSettings.zoom}x</span>
                  </div>
                </div>

                <div className="control-group">
                  <label>Horizontal Position</label>
                  <div className="control-input">
                    <input
                      type="range"
                      min="-200"
                      max="200"
                      step="5"
                      value={editorSettings.offsetX}
                      onChange={(e) => handleEditorSettingChange('offsetX', parseInt(e.target.value))}
                    />
                    <span className="control-value">{editorSettings.offsetX}px</span>
                  </div>
                </div>

                <div className="control-group">
                  <label>Vertical Position</label>
                  <div className="control-input">
                    <input
                      type="range"
                      min="-200"
                      max="200"
                      step="5"
                      value={editorSettings.offsetY}
                      onChange={(e) => handleEditorSettingChange('offsetY', parseInt(e.target.value))}
                    />
                    <span className="control-value">{editorSettings.offsetY}px</span>
                  </div>
                </div>

                <div className="control-group">
                  <label>Output Width</label>
                  <div className="control-input">
                    <input
                      type="number"
                      min="300"
                      max="2048"
                      value={editorSettings.width || ''}
                      onChange={(e) => handleEditorSettingChange('width', parseInt(e.target.value) || null)}
                      placeholder="Auto"
                    />
                    <span className="control-unit">px</span>
                  </div>
                </div>

                <div className="control-group">
                  <label>Output Height</label>
                  <div className="control-input">
                    <input
                      type="number"
                      min="200"
                      max="1536"
                      value={editorSettings.height || ''}
                      onChange={(e) => handleEditorSettingChange('height', parseInt(e.target.value) || null)}
                      placeholder="Auto"
                    />
                    <span className="control-unit">px</span>
                  </div>
                </div>

                <div className="control-group">
                  <label>Quality</label>
                  <div className="control-input">
                    <input
                      type="range"
                      min="60"
                      max="100"
                      step="5"
                      value={editorSettings.quality}
                      onChange={(e) => handleEditorSettingChange('quality', parseInt(e.target.value))}
                    />
                    <span className="control-value">{editorSettings.quality}%</span>
                  </div>
                </div>

                <div className="control-group">
                  <label>Fit Mode</label>
                  <select
                    value={editorSettings.fit}
                    onChange={(e) => handleEditorSettingChange('fit', e.target.value)}
                    className="control-select"
                  >
                    <option value="cover">Cover (crop to fill)</option>
                    <option value="contain">Contain (fit within bounds)</option>
                    <option value="fill">Fill (stretch to exact size)</option>
                    <option value="inside">Inside (shrink if needed)</option>
                    <option value="outside">Outside (enlarge if needed)</option>
                  </select>
                </div>

                <div className="control-group">
                  <label>Position</label>
                  <select
                    value={editorSettings.position}
                    onChange={(e) => handleEditorSettingChange('position', e.target.value)}
                    className="control-select"
                  >
                    <option value="centre">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div className="editor-tools">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleResetSettings}
                  >
                    <i className="fas fa-undo"></i>
                    Reset to Original
                  </button>
                </div>
              </div>

              {imageMetadata && (
                <div className="image-info">
                  <h5>Original Image Info</h5>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Dimensions:</span>
                      <span className="info-value">{imageMetadata.width} × {imageMetadata.height}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Format:</span>
                      <span className="info-value">{imageMetadata.format?.toUpperCase()}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Size:</span>
                      <span className="info-value">{(imageMetadata.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="no-background-section">
          <div className="empty-state">
            <i className="fas fa-mountain"></i>
            <h4>No Background Image</h4>
            <p>Upload a background image for the hero section</p>
          </div>
        </div>
      )}

      {!isEditing && (
        <div className="upload-section">
          <h5>{currentImage ? 'Change Background Image' : 'Upload Background Image'}</h5>
          <ImageUpload
            type="hero"
            context="hero-background"
            currentImage={imageUrl}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            className="hero-background-uploader"
            label={currentImage ? "Upload New Background" : "Upload Background Image"}
            description="Upload a high-quality background image for the hero section"
            acceptedFormats={['JPEG', 'PNG', 'GIF']}
            maxSize="10MB"
            recommendedSize="1920x1080 pixels"
            aspectRatio="16:9"
          />
        </div>
      )}
    </div>
  );
};

export default HeroBackgroundUpload;