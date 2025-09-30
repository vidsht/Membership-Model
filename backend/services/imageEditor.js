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
   * Process image with resize and position adjustments
   * @param {string} inputPath - Path to the input image
   * @param {string} outputPath - Path where processed image will be saved
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Result object with success status and metadata
   */
  async processImage(inputPath, outputPath, options = {}) {
    try {
      const {
        width = null,
        height = null,
        quality = this.defaultQuality,
        crop = null, // { left, top, width, height }
        position = 'centre', // centre, top, bottom, left, right
        fit = 'cover', // cover, contain, fill, inside, outside
        background = { r: 255, g: 255, b: 255, alpha: 1 },
        zoom = 1,
        offsetX = 0,
        offsetY = 0
      } = options;

      // Get image metadata first
      const metadata = await sharp(inputPath).metadata();
      
      // Start with sharp instance
      let imageProcessor = sharp(inputPath);

      // Apply cropping if specified
      if (crop && crop.width > 0 && crop.height > 0) {
        imageProcessor = imageProcessor.extract({
          left: Math.max(0, Math.round(crop.left)),
          top: Math.max(0, Math.round(crop.top)),
          width: Math.min(metadata.width - Math.round(crop.left), Math.round(crop.width)),
          height: Math.min(metadata.height - Math.round(crop.top), Math.round(crop.height))
        });
      }

      // Apply zoom by resizing
      if (zoom !== 1) {
        const zoomedWidth = Math.round(metadata.width * zoom);
        const zoomedHeight = Math.round(metadata.height * zoom);
        imageProcessor = imageProcessor.resize(zoomedWidth, zoomedHeight, {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3
        });
      }

      // Apply position offset if specified
      if (offsetX !== 0 || offsetY !== 0) {
        // Sharp's extend method only accepts positive values
        // For negative offsets, we need to crop instead of extend
        const extendOptions = {
          top: Math.max(0, Math.round(offsetY)),
          bottom: Math.max(0, -Math.round(offsetY)),
          left: Math.max(0, Math.round(offsetX)),
          right: Math.max(0, -Math.round(offsetX)),
          background: background
        };
        imageProcessor = imageProcessor.extend(extendOptions);
      }

      // Apply final resize if width/height specified
      if (width || height) {
        imageProcessor = imageProcessor.resize(width, height, {
          fit: fit,
          position: position,
          background: background,
          kernel: sharp.kernel.lanczos3
        });
      }

      // Apply quality and format optimization
      const outputFormat = path.extname(outputPath).toLowerCase();
      switch (outputFormat) {
        case '.jpg':
        case '.jpeg':
          imageProcessor = imageProcessor.jpeg({ 
            quality: quality,
            progressive: true,
            mozjpeg: true
          });
          break;
        case '.png':
          imageProcessor = imageProcessor.png({ 
            quality: quality,
            progressive: true,
            compressionLevel: 9
          });
          break;
        case '.webp':
          imageProcessor = imageProcessor.webp({ 
            quality: quality,
            effort: 6
          });
          break;
        default:
          imageProcessor = imageProcessor.jpeg({ quality: quality });
      }

      // Process and save the image
      const info = await imageProcessor.toFile(outputPath);
      
      // Get final metadata
      const finalMetadata = await sharp(outputPath).metadata();

      return {
        success: true,
        info: info,
        metadata: finalMetadata,
        originalMetadata: metadata,
        processedSize: info.size,
        dimensions: {
          width: finalMetadata.width,
          height: finalMetadata.height
        }
      };
    } catch (error) {
      console.error('Image processing error:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }

  /**
   * Generate image preview with specific dimensions
   * @param {string} inputPath - Path to the input image
   * @param {string} outputPath - Path where preview will be saved
   * @param {Object} options - Preview options
   * @returns {Promise<Object>} - Result object
   */
  async generatePreview(inputPath, outputPath, options = {}) {
    try {
      const {
        width = 400,
        height = 300,
        quality = 80,
        format = 'jpeg'
      } = options;

      const imageProcessor = sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'centre'
        });

      // Apply format
      switch (format.toLowerCase()) {
        case 'png':
          imageProcessor.png({ quality: quality });
          break;
        case 'webp':
          imageProcessor.webp({ quality: quality });
          break;
        default:
          imageProcessor.jpeg({ quality: quality });
      }

      const info = await imageProcessor.toFile(outputPath);
      
      return {
        success: true,
        info: info,
        previewPath: outputPath
      };
    } catch (error) {
      console.error('Preview generation error:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
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
   * Restore image from backup
   * @param {string} backupPath - Path to backup image
   * @param {string} restorePath - Path where image will be restored
   * @returns {Promise<boolean>} - Success status
   */
  async restoreFromBackup(backupPath, restorePath) {
    try {
      await fs.promises.copyFile(backupPath, restorePath);
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
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