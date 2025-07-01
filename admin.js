// routes/admin.js
const express = require('express');
const router = express.Router();
const { ensureLoggedIn, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Drug = require('../models/Drug');
const DrugModel = require('../models/Drug'); // Adjust path as needed
const AuditLog = require('../models/AuditLog'); // Adjust path

router.use(ensureLoggedIn);
router.use(requireRole('admin'));

// Manage users page
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.render('admin/users', { users });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// View all drugs page
router.get('/drugs', async (req, res) => {
  try {
    const drugs = await Drug.find();
    res.render('admin/drugs', { drugs });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Add these new admin pages:

router.get('/verify', (req, res) => {
  res.render('admin-verify', { user: req.user, result: null }); 
});

// 🔽 Add this block just below the GET route to handle form submission (POST)
router.post('/verify', async (req, res) => {
  try {
    const drugId = req.body.batchId.toString(); // convert input to string
     if (!drugId) {
      return res.render('admin-verify', {
        user: req.user,
        result: '❌ Please enter a valid Batch ID.'
      });
    }
    const drug = await DrugModel.findOne({ id: drugId }); // use 'id' field as in schema
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

    res.render('admin-verify', { user: req.user, result });
  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/flagged', (req, res) => {
  const flaggedBatches = []; // or fetch from DB/smart contract
  res.render('admin-flagged', { user: req.user, flaggedBatches });
});

router.get('/audit', async (req, res) => {
  try {
    // Fetch all audit logs from DB, sorted by newest first
    const auditLogs = await AuditLog.find().sort({ timestamp: -1 }).lean();

    // Render the page with actual audit logs
    res.render('admin-audit', { user: req.user, auditLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/reports', async (req, res) => {
  try {
    const totalDrugs = await DrugModel.countDocuments({});
    const totalTransfers = await AuditLog.countDocuments({ action: 'transfer' }); // adjust 'transfer' if needed
    const flaggedBatches = await DrugModel.countDocuments({ isFlagged: true });

    const stats = {
      totalDrugs,
      totalTransfers,
      flaggedBatches
    };

    res.render('admin-reports', { user: req.user, stats });
  } catch (err) {
    console.error('Error generating report stats:', err);
    res.status(500).send('Error generating reports');
  }
});


module.exports = router;

