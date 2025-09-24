// Enhanced Download Service for Membership Cards and Certificates
import api from './api';

class DownloadService {
  /**
   * Download membership card using server-side generation
   * This approach avoids HTML2Canvas issues with white backgrounds and CSS problems
   */
  async downloadMembershipCard(user, options = {}) {
    try {
      const response = await api.post('/api/download/membership-card', {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          membershipNumber: user.membershipNumber,
          membershipType: user.membershipType,
          planName: user.planName,
          userType: user.userType,
          bloodGroup: user.bloodGroup,
          validationDate: user.validationDate,
          statusUpdatedAt: user.statusUpdatedAt,
          created_at: user.created_at,
          profilePicture: user.profilePicture
        },
        format: options.format || 'png', // 'png', 'pdf', 'jpeg'
        quality: options.quality || 'high', // 'low', 'medium', 'high'
        size: options.size || 'card' // 'card', 'a4', 'letter'
      }, {
        responseType: 'blob',
        timeout: 30000 // 30 second timeout for server processing
      });

      // Create download link
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'image/png' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `membership-card-${user.membershipNumber || user.id}.${options.format || 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Card downloaded successfully!' };
    } catch (error) {
      console.error('Server-side download failed:', error);
      
      // Fallback to client-side HTML2Canvas method
      return this.fallbackDownloadCard(user, options);
    }
  }

  /**
   * Download merchant certificate using server-side generation
   */
  async downloadMerchantCertificate(user, businessInfo, options = {}) {
    try {
      const response = await api.post('/api/download/merchant-certificate', {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          membershipNumber: user.membershipNumber,
          userType: user.userType,
          validationDate: user.validationDate,
          statusUpdatedAt: user.statusUpdatedAt,
          created_at: user.created_at
        },
        businessInfo: {
          businessId: businessInfo.businessId,
          businessName: businessInfo.businessName,
          businessDescription: businessInfo.businessDescription,
          businessCategory: businessInfo.businessCategory,
          businessAddress: businessInfo.businessAddress,
          businessPhone: businessInfo.businessPhone,
          businessEmail: businessInfo.businessEmail,
          website: businessInfo.website
        },
        format: options.format || 'pdf', // 'png', 'pdf', 'jpeg'
        quality: options.quality || 'high',
        size: options.size || 'a4'
      }, {
        responseType: 'blob',
        timeout: 30000
      });

      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/pdf' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merchant-certificate-${businessInfo.businessId || user.id}.${options.format || 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: 'Certificate downloaded successfully!' };
    } catch (error) {
      console.error('Server-side certificate download failed:', error);
      
      // Fallback to client-side method
      return this.fallbackDownloadCertificate(user, businessInfo, options);
    }
  }

  /**
   * Improved client-side fallback using HTML2Canvas with better settings
   */
  async fallbackDownloadCard(user, options = {}) {
    try {
      // Wait for DOM to be ready
      await this.waitForDOM();

      const cardElement = document.querySelector('.membership-card-new');
      if (!cardElement) {
        throw new Error('Membership card element not found');
      }

      // Prepare element for capture
      this.prepareElementForCapture(cardElement);

      // Import html2canvas with improved settings
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(cardElement, {
        scale: 3, // Higher scale for better quality
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true,
        letterRendering: true,
        logging: false,
        width: cardElement.offsetWidth,
        height: cardElement.offsetHeight,
        windowWidth: cardElement.scrollWidth,
        windowHeight: cardElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
      });

      // Clean up element
      this.cleanupElementAfterCapture(cardElement);

      // Convert to high-quality image
      const format = options.format || 'png';
      const quality = this.getImageQuality(options.quality);
      const dataUrl = canvas.toDataURL(`image/${format}`, quality);

      // Download
      const link = document.createElement('a');
      link.download = `membership-card-${user.membershipNumber || user.id}.${format}`;
      link.href = dataUrl;
      link.click();

      return { success: true, message: 'Card downloaded successfully!' };
    } catch (error) {
      console.error('Fallback download failed:', error);
      return { success: false, message: 'Failed to download card. Please try again.' };
    }
  }

  /**
   * Improved client-side fallback for certificate
   */
  async fallbackDownloadCertificate(user, businessInfo, options = {}) {
    try {
      await this.waitForDOM();

      const certElement = document.querySelector('.merchant-certificate-a4');
      if (!certElement) {
        throw new Error('Certificate element not found');
      }

      this.prepareElementForCapture(certElement);

      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(certElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true,
        letterRendering: true,
        logging: false,
        width: 700,
        height: 990
      });

      this.cleanupElementAfterCapture(certElement);

      const format = options.format || 'png';
      const quality = this.getImageQuality(options.quality);
      const dataUrl = canvas.toDataURL(`image/${format}`, quality);

      const link = document.createElement('a');
      link.download = `merchant-certificate-${businessInfo.businessId || user.id}.${format}`;
      link.href = dataUrl;
      link.click();

      return { success: true, message: 'Certificate downloaded successfully!' };
    } catch (error) {
      console.error('Fallback certificate download failed:', error);
      return { success: false, message: 'Failed to download certificate. Please try again.' };
    }
  }

  /**
   * Share card/certificate with improved image generation
   */
  async shareWithImage(element, title, text, filename) {
    try {
      if (!element) throw new Error('Element not found for sharing');

      this.prepareElementForCapture(element);

      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: true,
        letterRendering: true,
        logging: false
      });

      this.cleanupElementAfterCapture(element);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob && navigator.share && navigator.canShare && 
              navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
            const file = new File([blob], filename, { type: 'image/png' });
            navigator.share({
              title,
              text,
              files: [file]
            }).then(() => {
              resolve({ success: true, message: 'Shared successfully!' });
            }).catch(() => {
              resolve(this.fallbackShare(text));
            });
          } else {
            resolve(this.fallbackShare(text));
          }
        }, 'image/png', 0.95);
      });
    } catch (error) {
      console.error('Share with image failed:', error);
      return this.fallbackShare(text);
    }
  }

  /**
   * Utility methods
   */
  async waitForDOM() {
    return new Promise(resolve => {
      if (document.readyState === 'complete') {
        setTimeout(resolve, 100); // Small delay for rendering
      } else {
        window.addEventListener('load', () => setTimeout(resolve, 100));
      }
    });
  }

  prepareElementForCapture(element) {
    // Add capture-specific classes and styles
    element.classList.add('capture-mode', 'download-mode');
    
    // Force specific styles for capture
    const style = element.style;
    style.setProperty('background-color', '#ffffff', 'important');
    style.setProperty('transform', 'none', 'important');
    style.setProperty('box-shadow', 'none', 'important');
    
    // Ensure all images are loaded
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.complete) {
        img.onload = () => console.log('Image loaded for capture');
      }
    });
  }

  cleanupElementAfterCapture(element) {
    element.classList.remove('capture-mode', 'download-mode');
    element.style.removeProperty('background-color');
    element.style.removeProperty('transform');
    element.style.removeProperty('box-shadow');
  }

  getImageQuality(quality) {
    switch (quality) {
      case 'low': return 0.7;
      case 'medium': return 0.85;
      case 'high': return 0.95;
      default: return 0.95;
    }
  }

  fallbackShare(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => ({
        success: true,
        message: 'Share text copied to clipboard!'
      })).catch(() => ({
        success: false,
        message: 'Failed to copy share text'
      }));
    } else {
      // Legacy clipboard method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return Promise.resolve({
        success,
        message: success ? 'Share text copied to clipboard!' : 'Failed to copy share text'
      });
    }
  }
}

export default new DownloadService();