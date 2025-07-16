const db = require('../db');
const { auth } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
// Get user profile (MySQL)
router.get('/profile', auth, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT id, fullName, email, phone, address, profilePicture, preferences, membership, socialMediaFollowed, created_at FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Get profile error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!results.length) return res.status(404).json({ message: 'User not found' });
    const user = results[0];
    if (user.socialMediaFollowed) {
      try {
        user.socialMediaFollowed = JSON.parse(user.socialMediaFollowed);
      } catch (e) {
        user.socialMediaFollowed = {};
      }
    }
    res.json({ user });
  });
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
// Update user profile (MySQL)
router.put('/profile', auth, (req, res) => {
  const userId = req.user.id;
  const { fullName, email, phone, address, profilePicture, preferences, socialMediaFollowed } = req.body;
  // Serialize address and preferences if they are objects
  const addressStr = address && typeof address === 'object' ? JSON.stringify(address) : address || null;
  const preferencesStr = preferences && typeof preferences === 'object' ? JSON.stringify(preferences) : preferences || null;
  // Check if email is already taken by another user
  if (email) {
    db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (results.length) return res.status(400).json({ message: 'Email is already taken' });
      // Update user
      db.query(
        'UPDATE users SET fullName=?, email=?, phone=?, address=?, profilePicture=?, preferences=?, socialMediaFollowed=?, lastLogin=NOW() WHERE id=?',
        [fullName, email, phone, addressStr, profilePicture, preferencesStr, socialMediaFollowed ? JSON.stringify(socialMediaFollowed) : null, userId],
        (err2) => {
          if (err2) return res.status(500).json({ message: 'Server error' });
          db.query('SELECT id, fullName, email, phone, address, profilePicture, preferences, membership, socialMediaFollowed, created_at FROM users WHERE id = ?', [userId], (err3, results2) => {
            if (err3) return res.status(500).json({ message: 'Server error' });
            const user = results2[0];
            // Parse JSON fields
            if (user.address) {
              try { user.address = JSON.parse(user.address); } catch (e) { user.address = {}; }
            }
            if (user.preferences) {
              try { user.preferences = JSON.parse(user.preferences); } catch (e) { user.preferences = {}; }
            }
            if (user.socialMediaFollowed) {
              try { user.socialMediaFollowed = JSON.parse(user.socialMediaFollowed); } catch (e) { user.socialMediaFollowed = {}; }
            }
            res.json({ user });
          });
        }
      );
    });
  } else {
    db.query(
      'UPDATE users SET fullName=?, phone=?, address=?, profilePicture=?, preferences=?, socialMediaFollowed=?, lastLogin=NOW() WHERE id=?',
      [fullName, phone, addressStr, profilePicture, preferencesStr, socialMediaFollowed ? JSON.stringify(socialMediaFollowed) : null, userId],
      (err2) => {
        if (err2) return res.status(500).json({ message: 'Server error' });
        db.query('SELECT id, fullName, email, phone, address, profilePicture, preferences, membership, socialMediaFollowed, created_at FROM users WHERE id = ?', [userId], (err3, results2) => {
          if (err3) return res.status(500).json({ message: 'Server error' });
          const user = results2[0];
          // Parse JSON fields
          if (user.address) {
            try { user.address = JSON.parse(user.address); } catch (e) { user.address = {}; }
          }
          if (user.preferences) {
            try { user.preferences = JSON.parse(user.preferences); } catch (e) { user.preferences = {}; }
          }
          if (user.socialMediaFollowed) {
            try { user.socialMediaFollowed = JSON.parse(user.socialMediaFollowed); } catch (e) { user.socialMediaFollowed = {}; }
          }
          res.json({ user });
        });
      }
    );
  }
});

// @route   PUT /api/users/password
// @desc    Change user password
// @access  Private
// Change user password (MySQL)
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    db.query('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      if (!results.length) return res.status(404).json({ message: 'User not found' });
      const user = results[0];
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.query('UPDATE users SET password=? WHERE id=?', [hashedPassword, req.user.id], (err2) => {
        if (err2) return res.status(500).json({ message: 'Server error' });
        res.json({ message: 'Password updated successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
