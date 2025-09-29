import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import ImageUpload from '../../common/ImageUpload';
import { SmartImage } from '../../../hooks/useImageUrl.jsx';
import api from '../../../services/api';
import './HeroBackgroundUpload.css';

/**
 * HeroBackgroundUpload component for admin settings
 * Allows admins to upload and manage the hero section background image
 */
const HeroBackgroundUpload = () => {
  const { showNotification } = useNotification();
  const [currentImage, setCurrentImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
              src={imageUrl}
              alt="Current hero background"
              className="background-image"
            />
            <div className="preview-overlay">
              <div className="preview-info">
                <h4>Current Hero Background</h4>
                <p>{currentImage}</p>
              </div>
            </div>
          </div>
          
          <div className="background-actions">
            <button
              className="btn btn-danger btn-sm"
              onClick={handleRemoveImage}
              disabled={uploading}
            >
              <i className="fas fa-trash"></i>
              {uploading ? 'Removing...' : 'Remove Background'}
            </button>
          </div>
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
    </div>
  );
};

export default HeroBackgroundUpload;