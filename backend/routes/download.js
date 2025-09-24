// Download Routes - Server-side PDF/Image generation for cards and certificates
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

/**
 * Generate and download membership card
 * POST /api/download/membership-card
 */
router.post('/membership-card', auth, async (req, res) => {
  try {
    const { user: userData, format = 'png', quality = 'high', size = 'card' } = req.body;
    
    // Validate user data
    if (!userData || !userData.membershipNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data provided'
      });
    }

    // Try to generate using Puppeteer (preferred method)
    try {
      const puppeteerResult = await generateCardWithPuppeteer(userData, { format, quality, size });
      if (puppeteerResult.success) {
        return sendDownloadResponse(res, puppeteerResult.buffer, format, `membership-card-${userData.membershipNumber}`);
      }
    } catch (puppeteerError) {
      console.warn('Puppeteer generation failed, trying Canvas method:', puppeteerError.message);
    }

    // Fallback to Canvas method
    try {
      const canvasResult = await generateCardWithCanvas(userData, { format, quality, size });
      if (canvasResult.success) {
        return sendDownloadResponse(res, canvasResult.buffer, format, `membership-card-${userData.membershipNumber}`);
      }
    } catch (canvasError) {
      console.error('Canvas generation failed:', canvasError.message);
    }

    // If both methods fail, return error
    res.status(500).json({
      success: false,
      message: 'Failed to generate membership card. Please try the client-side download option.'
    });

  } catch (error) {
    console.error('Error in membership card download:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during card generation'
    });
  }
});

/**
 * Generate and download merchant certificate
 * POST /api/download/merchant-certificate
 */
router.post('/merchant-certificate', auth, async (req, res) => {
  try {
    const { user: userData, businessInfo, format = 'pdf', quality = 'high', size = 'a4' } = req.body;
    
    // Validate data
    if (!userData || !businessInfo || !businessInfo.businessName) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user or business data provided'
      });
    }

    // Try Puppeteer first
    try {
      const puppeteerResult = await generateCertificateWithPuppeteer(userData, businessInfo, { format, quality, size });
      if (puppeteerResult.success) {
        return sendDownloadResponse(res, puppeteerResult.buffer, format, `merchant-certificate-${businessInfo.businessId}`);
      }
    } catch (puppeteerError) {
      console.warn('Puppeteer certificate generation failed:', puppeteerError.message);
    }

    // Fallback to Canvas/PDF method
    try {
      const canvasResult = await generateCertificateWithCanvas(userData, businessInfo, { format, quality, size });
      if (canvasResult.success) {
        return sendDownloadResponse(res, canvasResult.buffer, format, `merchant-certificate-${businessInfo.businessId}`);
      }
    } catch (canvasError) {
      console.error('Canvas certificate generation failed:', canvasError.message);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate certificate. Please try the client-side download option.'
    });

  } catch (error) {
    console.error('Error in certificate download:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during certificate generation'
    });
  }
});

/**
 * Generate membership card using Puppeteer (high quality)
 */
async function generateCardWithPuppeteer(userData, options) {
  try {
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport for card dimensions
    await page.setViewport({
      width: 800,
      height: 500,
      deviceScaleFactor: 2
    });

    // Generate HTML for membership card
    const cardHtml = generateMembershipCardHTML(userData);
    
    await page.setContent(cardHtml, { waitUntil: 'networkidle0' });
    
    let buffer;
    if (options.format === 'pdf') {
      buffer = await page.pdf({
        width: '800px',
        height: '500px',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      });
    } else {
      buffer = await page.screenshot({
        type: options.format || 'png',
        quality: options.format === 'jpeg' ? 95 : undefined,
        fullPage: false,
        clip: { x: 0, y: 0, width: 800, height: 500 }
      });
    }
    
    await browser.close();
    
    return { success: true, buffer };
  } catch (error) {
    console.error('Puppeteer card generation error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate certificate using Puppeteer
 */
async function generateCertificateWithPuppeteer(userData, businessInfo, options) {
  try {
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set A4 dimensions
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2
    });

    const certificateHtml = generateCertificateHTML(userData, businessInfo);
    
    await page.setContent(certificateHtml, { waitUntil: 'networkidle0' });
    
    let buffer;
    if (options.format === 'pdf') {
      buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      });
    } else {
      buffer = await page.screenshot({
        type: options.format || 'png',
        quality: options.format === 'jpeg' ? 95 : undefined,
        fullPage: true
      });
    }
    
    await browser.close();
    
    return { success: true, buffer };
  } catch (error) {
    console.error('Puppeteer certificate generation error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate card using Node Canvas (fallback)
 */
async function generateCardWithCanvas(userData, options) {
  try {
    const { createCanvas, loadImage, registerFont } = require('canvas');
    
    const canvas = createCanvas(800, 500);
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 500);
    
    // Add card styling and content
    await drawMembershipCard(ctx, userData, canvas);
    
    let buffer;
    if (options.format === 'pdf') {
      // For PDF, we'll need to use a PDF library like PDFKit
      buffer = await convertCanvasToPDF(canvas);
    } else {
      buffer = canvas.toBuffer(options.format === 'jpeg' ? 'image/jpeg' : 'image/png');
    }
    
    return { success: true, buffer };
  } catch (error) {
    console.error('Canvas card generation error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate certificate using Canvas
 */
async function generateCertificateWithCanvas(userData, businessInfo, options) {
  try {
    const { createCanvas, loadImage } = require('canvas');
    
    const canvas = createCanvas(794, 1123); // A4 at 72 DPI
    const ctx = canvas.getContext('2d');
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 794, 1123);
    
    await drawCertificate(ctx, userData, businessInfo, canvas);
    
    let buffer;
    if (options.format === 'pdf') {
      buffer = await convertCanvasToPDF(canvas);
    } else {
      buffer = canvas.toBuffer(options.format === 'jpeg' ? 'image/jpeg' : 'image/png');
    }
    
    return { success: true, buffer };
  } catch (error) {
    console.error('Canvas certificate generation error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to send download response
 */
function sendDownloadResponse(res, buffer, format, filename) {
  const contentTypes = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    pdf: 'application/pdf'
  };
  
  const contentType = contentTypes[format] || 'image/png';
  const extension = format === 'jpg' ? 'jpeg' : format;
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.${extension}"`);
  res.setHeader('Content-Length', buffer.length);
  
  res.send(buffer);
}

/**
 * Generate HTML template for membership card
 */
function generateMembershipCardHTML(userData) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Arial', sans-serif; 
          background: #ffffff; 
          width: 800px; 
          height: 500px; 
          overflow: hidden;
        }
        .membership-card {
          width: 800px;
          height: 500px;
          background: linear-gradient(135deg, #0c905d 0%, #17a2b8 100%);
          border-radius: 20px;
          padding: 30px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .logo { width: 60px; height: 60px; background: white; border-radius: 50%; }
        .title { font-size: 24px; font-weight: bold; text-align: center; flex: 1; }
        .member-info {
          display: flex;
          gap: 30px;
          margin-top: 20px;
        }
        .member-details { flex: 1; }
        .member-details h3 { font-size: 20px; margin-bottom: 10px; }
        .member-details p { margin: 5px 0; font-size: 14px; }
        .qr-section { text-align: center; }
        .membership-number {
          position: absolute;
          bottom: 30px;
          right: 30px;
          font-size: 18px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="membership-card">
        <div class="card-header">
          <div class="logo"></div>
          <div class="title">INDIANS IN GHANA<br><small>MEMBERSHIP CARD</small></div>
          <div class="logo"></div>
        </div>
        <div class="member-info">
          <div class="member-details">
            <h3>${userData.fullName || 'N/A'}</h3>
            <p><strong>Mobile:</strong> ${userData.phone || 'N/A'}</p>
            <p><strong>Plan:</strong> ${userData.planName || userData.membershipType || 'Community'}</p>
            <p><strong>Issue Date:</strong> ${formatDate(userData.statusUpdatedAt || userData.created_at)}</p>
            <p><strong>Expiry:</strong> ${formatDate(userData.validationDate)}</p>
            <p><strong>Blood Group:</strong> ${userData.bloodGroup || 'N/A'}</p>
          </div>
          <div class="qr-section">
            <div style="width: 100px; height: 100px; background: white; margin: 0 auto;"></div>
          </div>
        </div>
        <div class="membership-number">${userData.membershipNumber || 'N/A'}</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML template for certificate
 */
function generateCertificateHTML(userData, businessInfo) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Times New Roman', serif; 
          background: #ffffff; 
          width: 794px; 
          height: 1123px; 
          padding: 50px;
        }
        .certificate {
          border: 5px solid #2c5aa0;
          padding: 40px;
          text-align: center;
          height: 100%;
          position: relative;
        }
        .header { margin-bottom: 30px; }
        .logo { width: 80px; height: 80px; background: #2c5aa0; border-radius: 50%; margin: 0 auto 20px; }
        .main-title { font-size: 36px; color: #2c5aa0; margin-bottom: 10px; }
        .subtitle { font-size: 18px; color: #666; margin-bottom: 30px; }
        .certificate-title { font-size: 28px; color: #2c5aa0; margin-bottom: 30px; }
        .business-name { font-size: 32px; color: #0c905d; margin: 20px 0; font-weight: bold; }
        .certificate-text { font-size: 16px; line-height: 1.6; margin: 30px 0; text-align: justify; }
        .dates { margin-top: 40px; font-size: 14px; }
        .signature { position: absolute; bottom: 80px; right: 100px; text-align: center; }
        .cert-number { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">
          <div class="logo"></div>
          <h1 class="main-title">INDIANS IN GHANA</h1>
          <p class="subtitle">Bringing Community Together</p>
        </div>
        
        <h2 class="certificate-title">CERTIFICATE</h2>
        
        <p style="font-size: 18px; margin: 20px 0;">This Certificate Is Proudly Presented To</p>
        
        <h3 class="business-name">${businessInfo.businessName}</h3>
        
        <div class="certificate-text">
          <p>In recognition of your valued role as an Official Discount Partner with our membership platform, 
          we extend our sincere appreciation for your commitment to extending exclusive benefits to our community. 
          Your generosity and support are essential to the lasting success of our platform.</p>
        </div>
        
        <div class="dates">
          <p><strong>Date Of Issue:</strong> ${formatDate(userData.statusUpdatedAt || userData.created_at)}</p>
          <p><strong>Date Of Expiry:</strong> ${formatDate(userData.validationDate)}</p>
        </div>
        
        <div class="signature">
          <div style="border-top: 1px solid #333; width: 150px; margin-bottom: 5px;"></div>
          <p><strong>Sachin Hursale</strong></p>
          <p>Indians in Ghana</p>
        </div>
        
        <div class="cert-number">
          Certificate No: ${businessInfo.businessId}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Draw membership card on canvas
 */
async function drawMembershipCard(ctx, userData, canvas) {
  // Draw background gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0c905d');
  gradient.addColorStop(1, '#17a2b8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw rounded corners effect
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  
  // Draw text content
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('INDIANS IN GHANA', canvas.width / 2, 60);
  
  ctx.font = '16px Arial';
  ctx.fillText('MEMBERSHIP CARD', canvas.width / 2, 85);
  
  // Member details
  ctx.textAlign = 'left';
  ctx.font = '20px Arial';
  ctx.fillText(userData.fullName || 'N/A', 50, 150);
  
  ctx.font = '14px Arial';
  ctx.fillText(`Mobile: ${userData.phone || 'N/A'}`, 50, 180);
  ctx.fillText(`Plan: ${userData.planName || userData.membershipType || 'Community'}`, 50, 200);
  ctx.fillText(`Blood Group: ${userData.bloodGroup || 'N/A'}`, 50, 220);
  
  // Membership number
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(userData.membershipNumber || 'N/A', canvas.width - 50, canvas.height - 50);
}

/**
 * Draw certificate on canvas
 */
async function drawCertificate(ctx, userData, businessInfo, canvas) {
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Border
  ctx.strokeStyle = '#2c5aa0';
  ctx.lineWidth = 5;
  ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);
  
  // Title
  ctx.fillStyle = '#2c5aa0';
  ctx.font = 'bold 36px Times';
  ctx.textAlign = 'center';
  ctx.fillText('INDIANS IN GHANA', canvas.width / 2, 150);
  
  ctx.font = '18px Times';
  ctx.fillStyle = '#666';
  ctx.fillText('Bringing Community Together', canvas.width / 2, 180);
  
  // Certificate title
  ctx.font = 'bold 28px Times';
  ctx.fillStyle = '#2c5aa0';
  ctx.fillText('CERTIFICATE', canvas.width / 2, 250);
  
  // Business name
  ctx.font = 'bold 32px Times';
  ctx.fillStyle = '#0c905d';
  ctx.fillText(businessInfo.businessName, canvas.width / 2, 350);
  
  // Certificate text
  ctx.font = '16px Times';
  ctx.fillStyle = '#000';
  const text = 'In recognition of your valued role as an Official Discount Partner';
  ctx.fillText(text, canvas.width / 2, 450);
  
  // Signature
  ctx.font = 'bold 16px Times';
  ctx.textAlign = 'right';
  ctx.fillText('Sachin Hursale', canvas.width - 100, canvas.height - 150);
  ctx.font = '14px Times';
  ctx.fillText('Indians in Ghana', canvas.width - 100, canvas.height - 130);
}

/**
 * Convert canvas to PDF (requires PDFKit)
 */
async function convertCanvasToPDF(canvas) {
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      doc.on('error', reject);
      
      // Add canvas as image to PDF
      const imgBuffer = canvas.toBuffer('image/png');
      doc.image(imgBuffer, 0, 0, { width: doc.page.width, height: doc.page.height });
      doc.end();
    });
  } catch (error) {
    throw new Error('PDF conversion failed: ' + error.message);
  }
}

module.exports = router;