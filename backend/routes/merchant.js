

const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');


// Merchant Dashboard - returns stats and deals for the logged-in merchant
router.get('/dashboard', auth, (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Get the merchant's business
  db.query('SELECT * FROM businesses WHERE userId = ?', [userId], (err, businessResults) => {
    if (err) return res.status(500).json({ message: 'Server error (business)' });
    if (!businessResults.length) return res.status(404).json({ message: 'Business not found for this merchant' });

    const business = businessResults[0];

    // Get deals for this business (by businessId)
    db.query('SELECT * FROM deals WHERE businessId = ?', [business.businessId], (err2, dealResults) => {
      if (err2) return res.status(500).json({ message: 'Server error (deals)' });

      // Example stats (customize as needed)
      const stats = {
        totalDeals: dealResults.length,
        activeDeals: dealResults.filter(d => d.status === 'active').length,
        totalViews: dealResults.reduce((sum, d) => sum + (d.views || 0), 0),
        totalRedemptions: dealResults.reduce((sum, d) => sum + (d.redemptions || 0), 0)
      };

      res.json({
        data: {
          stats,
          deals: dealResults.map(deal => ({ ...deal, businessId: business.businessId })),
          business: {
            businessId: business.businessId,
            businessName: business.businessName
          }
        }
      });
    });
  });
});


// Get all merchants
router.get('/', auth, (req, res) => {
  db.query('SELECT * FROM businesses', (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(results);
  });
});

// Get merchant by ID
router.get('/:id', auth, (req, res) => {
  db.query('SELECT * FROM businesses WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!results.length) return res.status(404).json({ message: 'Merchant not found' });
    res.json(results[0]);
  });
});

// Create a new merchant
router.post('/', auth, (req, res) => {
  const { name, address, phone, email, category } = req.body;
  db.query('INSERT INTO businesses (name, address, phone, email, category) VALUES (?, ?, ?, ?, ?)', [name, address, phone, email, category], (err, result) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.status(201).json({ message: 'Merchant created', id: result.insertId });
  });
});

// Update a merchant
router.put('/:id', auth, (req, res) => {
  const { name, address, phone, email, category } = req.body;
  db.query('UPDATE businesses SET name=?, address=?, phone=?, email=?, category=? WHERE id=?', [name, address, phone, email, category, req.params.id], (err) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json({ message: 'Merchant updated' });
  });
});

// Delete a merchant
router.delete('/:id', auth, (req, res) => {
  db.query('DELETE FROM businesses WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json({ message: 'Merchant deleted' });
  });
});

module.exports = router;
