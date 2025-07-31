// Redeem a deal
router.post('/:id/redeem', auth, (req, res) => {
  const userId = req.session.userId;
  const dealId = req.params.id;
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  // Check if deal exists
  db.query('SELECT * FROM deals WHERE id = ?', [dealId], (err, dealResults) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!dealResults.length) return res.status(404).json({ message: 'Deal not found' });
    // Check if already redeemed
    db.query('SELECT * FROM deal_redemptions WHERE dealId = ? AND userId = ?', [dealId, userId], (err2, redemptionResults) => {
      if (err2) return res.status(500).json({ message: 'Server error' });
      if (redemptionResults.length) return res.status(400).json({ message: 'Already redeemed' });
      // Insert redemption
      db.query('INSERT INTO deal_redemptions (dealId, userId, redeemedAt) VALUES (?, ?, NOW())', [dealId, userId], (err3) => {
        if (err3) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Deal redeemed' });
      });
    });
  });
});

// Get all users who redeemed a deal (for merchant dashboard)
router.get('/:id/redemptions', auth, (req, res) => {
  const dealId = req.params.id;
  db.query(`
    SELECT users.id, users.name, users.email, deal_redemptions.redeemedAt
    FROM deal_redemptions
    JOIN users ON deal_redemptions.userId = users.id
    WHERE deal_redemptions.dealId = ?
    ORDER BY deal_redemptions.redeemedAt DESC
  `, [dealId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(results);
  });
});
const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads/deals');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Get all deals (public)
router.get('/', (req, res) => {
  // Join deals with businesses to get business details
  db.query(`
    SELECT deals.*, businesses.businessName, businesses.businessDescription, businesses.businessCategory, businesses.businessAddress, businesses.businessPhone, businesses.businessEmail, businesses.website, businesses.businessLicense, businesses.taxId, businesses.isVerified, businesses.verificationDate, businesses.membershipLevel, businesses.status, businesses.created_at, businesses.socialMediaFollowed
    FROM deals
    LEFT JOIN businesses ON deals.businessId = businesses.businessId
  `, (err, results) => {
    if (err) {
      console.error('SQL error in /api/deals:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
    res.json(results);
  });
});

// Get deal by ID
router.get('/:id', auth, (req, res) => {
  db.query('SELECT * FROM deals WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!results.length) return res.status(404).json({ message: 'Deal not found' });
    res.json(results[0]);
  });
});

// Get business details by businessId
router.get('/business/:businessId', auth, (req, res) => {
  db.query('SELECT * FROM businesses WHERE businessId = ?', [req.params.businessId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!results.length) return res.status(404).json({ message: 'Business not found' });
    res.json(results[0]);
  });
  });


// Create a new deal
router.post('/', auth, (req, res) => {
  const { title, description, category, expiration_date, accessLevel, discount, discountType, termsConditions } = req.body;
  // Get businessId from merchant's business
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  db.query('SELECT businessId FROM businesses WHERE userId = ?', [userId], (err, businessResults) => {
    if (err) return res.status(500).json({ message: 'Server error (business lookup)' });
    if (!businessResults.length) return res.status(404).json({ message: 'Business not found for this merchant' });
    const businessId = businessResults[0].businessId;
    if (!title || !description || !category || !expiration_date || !accessLevel || !discount || !discountType) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    db.query(
      'INSERT INTO deals (title, description, category, expiration_date, businessId, accessLevel, discount, discountType, termsConditions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, category, expiration_date, businessId, accessLevel, discount, discountType, termsConditions],
      (err2, result) => {
        if (err2) {
          console.error('DB error creating deal:', err2);
          return res.status(500).json({ message: 'Server error', error: err2.message });
        }
        res.status(201).json({ message: 'Deal created', id: result.insertId, businessId });
      }
    );
  });
});

// Update a deal
router.put('/:id', auth, (req, res) => {
  const { title, description, category, expiration_date, accessLevel, discount, discountType, termsConditions } = req.body;
  db.query(
    'UPDATE deals SET title=?, description=?, category=?, expiration_date=?, accessLevel=?, discount=?, discountType=?, termsConditions=? WHERE id=?',
    [title, description, category, expiration_date, accessLevel, discount, discountType, termsConditions, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Deal updated' });
    }
  );
});

// Delete a deal
router.delete('/:id', auth, (req, res) => {
  db.query('DELETE FROM deals WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json({ message: 'Deal deleted' });
  });
});

// Redeem a deal
router.post('/:id/redeem', auth, (req, res) => {
  const userId = req.session.userId;
  const dealId = req.params.id;
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  // Check if deal exists
  db.query('SELECT * FROM deals WHERE id = ?', [dealId], (err, dealResults) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!dealResults.length) return res.status(404).json({ message: 'Deal not found' });
    // Check if already redeemed
    db.query('SELECT * FROM deal_redemptions WHERE dealId = ? AND userId = ?', [dealId, userId], (err2, redemptionResults) => {
      if (err2) return res.status(500).json({ message: 'Server error' });
      if (redemptionResults.length) return res.status(400).json({ message: 'Already redeemed' });
      // Insert redemption
      db.query('INSERT INTO deal_redemptions (dealId, userId, redeemedAt) VALUES (?, ?, NOW())', [dealId, userId], (err3) => {
        if (err3) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Deal redeemed' });
      });
    });
  });
});

// Get all users who redeemed a deal (for merchant dashboard)
router.get('/:id/redemptions', auth, (req, res) => {
  const dealId = req.params.id;
  db.query(`
    SELECT users.id, users.name, users.email, deal_redemptions.redeemedAt
    FROM deal_redemptions
    JOIN users ON deal_redemptions.userId = users.id
    WHERE deal_redemptions.dealId = ?
    ORDER BY deal_redemptions.redeemedAt DESC
  `, [dealId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(results);
  });
});

module.exports = router;
