const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Image Editor Service
 * Handles image manipulation operations like resize, crop, and position adjustments
 */
class ImageEditorService {
  constructor() {
    this.defaultQuality = 90;
    this.maxDimensions = { width: 2048, height: 1536 };
  }

  /**
   * Get image dimensions and metadata
   * @param {string} imagePath - Path to the image
   * @returns {Promise<Object>} - Image metadata
   */
  async getImageMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        success: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size,
          channels: metadata.channels,
          hasAlpha: metadata.hasAlpha,
          orientation: metadata.orientation
        }
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      throw error;
    }
  }

  /**
   * Validate image dimensions and format
   * @param {string} imagePath - Path to the image
   * @returns {Promise<Object>} - Validation result
   */
  async validateImage(imagePath) {
    try {
      const metadata = await this.getImageMetadata(imagePath);
      
      if (!metadata.success) {
        return { valid: false, error: 'Could not read image metadata' };
      }

      const { width, height, format } = metadata.metadata;
      const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
      
      // Check format
      if (!supportedFormats.includes(format.toLowerCase())) {
        return { 
          valid: false, 
          error: `Unsupported format: ${format}. Supported formats: ${supportedFormats.join(', ')}` 
        };
      }

      // Check dimensions
      if (width > this.maxDimensions.width || height > this.maxDimensions.height) {
        return {
          valid: false,
          error: `Image too large: ${width}x${height}. Maximum allowed: ${this.maxDimensions.width}x${this.maxDimensions.height}`
        };
      }

      return {
        valid: true,
        metadata: metadata.metadata
      };
    } catch (error) {
      return {
        valid: false,
        error: `Image validation failed: ${error.message}`
      };
    }
  }

  /**
   * Create backup of original image
   * @param {string} originalPath - Path to original image
   * @param {string} backupPath - Path where backup will be stored
   * @returns {Promise<boolean>} - Success status
   */
  async createBackup(originalPath, backupPath) {
    try {
      await fs.promises.copyFile(originalPath, backupPath);
      return true;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  /**
   * Clean up temporary files
   * @param {Array} filePaths - Array of file paths to delete
   * @returns {Promise<void>}
   */
  async cleanupFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
    }
  }
}

module.exports = new ImageEditorService();