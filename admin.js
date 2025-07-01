// routes/admin.js
const express = require('express');
const router = express.Router();

const { ensureLoggedIn, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Drug = require('../models/Drug');
const AuditLog = require('../models/AuditLog');

// Apply middleware to everything under /admin
router.use(ensureLoggedIn);
router.use(requireRole('admin'));

// Redirect /admin -> /admin/users
router.get('/', (req, res) => {
  res.redirect('/admin/users');
});

// Manage users page
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.render('admin/users', { user: req.session.user, users });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// View all drugs page
router.get('/drugs', async (req, res) => {
  try {
    const drugs = await Drug.find();
    res.render('admin/drugs', { user: req.session.user, drugs });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Verify drug page (GET)
router.get('/verify', (req, res) => {
  res.render('admin-verify', { user: req.session.user, result: null });
});

// Verify drug submission (POST)
router.post('/verify', async (req, res) => {
  try {
    const drugId = req.body.batchId?.toString().trim();

    if (!drugId) {
      return res.render('admin-verify', {
        user: req.session.user,
        result: '❌ Please enter a valid Batch ID.'
      });
    }

    const drug = await Drug.findOne({ id: drugId });

    let result;
    if (drug) {
      if (!drug.isVerified) {
        drug.isVerified = true;
        await drug.save();
      }
      result = `✅ Drug ${drugId} has been verified successfully.`;
    } else {
      result = `❌ Drug ${drugId} is NOT valid or flagged as counterfeit.`;
    }

    res.render('admin-verify', { user: req.session.user, result });
  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Flagged batches page
router.get('/flagged', async (req, res) => {
  try {
    const flaggedBatches = await Drug.find({ isFlagged: true });
    res.render('admin-flagged', { user: req.session.user, flaggedBatches });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Audit log page
router.get('/audit', async (req, res) => {
  try {
    const auditLogs = await AuditLog.find().sort({ timestamp: -1 }).lean();
    res.render('admin-audit', { user: req.session.user, auditLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Reports page
router.get('/reports', async (req, res) => {
  try {
    const totalDrugs = await Drug.countDocuments();
    const totalTransfers = await AuditLog.countDocuments({ action: 'transfer' });
    const flaggedBatches = await Drug.countDocuments({ isFlagged: true });

    const stats = {
      totalDrugs,
      totalTransfers,
      flaggedBatches
    };

    res.render('admin-reports', { user: req.session.user, stats });
  } catch (err) {
    console.error('Error generating report stats:', err);
    res.status(500).send('Error generating reports');
  }
});

module.exports = router;
