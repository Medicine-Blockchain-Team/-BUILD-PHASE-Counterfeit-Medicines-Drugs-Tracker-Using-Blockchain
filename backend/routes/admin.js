const express = require('express');
const router = express.Router();
const { ensureLoggedIn, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Drug = require('../models/Drug');
const AuditLog = require('../models/AuditLog');
const { web3, contract } = require('../config/web3'); // Import web3 and contract

router.use(ensureLoggedIn);
router.use(requireRole('admin'));

// Manage users page
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.render('admin-users', { users, user: req.session.user }); // Pass user to template
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// View all drugs page
router.get('/drugs', async (req, res) => {
  try {
    const drugs = await Drug.find();
    res.render('admin-drugs', { drugs, user: req.session.user }); // Pass user to template
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Admin: Verify Drug Authenticity Page (GET)
router.get('/verify', (req, res) => {
  res.render('admin-verify', { user: req.session.user, result: null });
});

// Admin: Verify Drug Authenticity (POST) - Enhanced with blockchain check and flagging
router.post('/verify', async (req, res) => {
  const user = req.session.user;
  let { batchId } = req.body; // Renamed from drugId to batchId for consistency with form

  try {
    if (!batchId || batchId.trim() === "") {
      return res.render('admin-verify', { user, result: '❌ Please enter a valid Batch ID.' });
    }

    batchId = batchId.trim();
    console.log("Admin verifying Drug ID:", batchId);

    // 1. Fetch drug from MongoDB
    let drug = await Drug.findOne({ id: batchId });
    let result;

    if (!drug) {
      result = `❌ Drug ${batchId} not found in MongoDB.`;
      // No need to flag if not in DB, but log it
      const auditEntry = new AuditLog({
        userName: user.name,
        action: 'Admin Verify Drug (Not Found)',
        details: `Attempted to verify non-existent Drug ID: ${batchId}`,
        status: 'Failed'
      });
      await auditEntry.save();
      return res.render('admin-verify', { user, result });
    }

    // 2. Fetch drug details from the blockchain
    const blockchainDrug = await contract.methods.getDrug(batchId).call();
    const blockchainDrugId = blockchainDrug[0];

    if (blockchainDrugId == 0 || blockchainDrugId.toString() !== batchId) {
      // Drug found in MongoDB but not on blockchain, or ID mismatch
      drug.isFlagged = true; // Mark as flagged
      await drug.save(); // Save the updated status to MongoDB

      result = `⚠️ Drug ${batchId} found in DB but NOT on blockchain. Marked as FLAGGED.`;
      const auditEntry = new AuditLog({
        userName: user.name,
        action: 'Admin Verify Drug (Flagged)',
        details: `Drug ID: ${batchId} - Not found on blockchain.`,
        status: 'Flagged'
      });
      await auditEntry.save();
    } else {
      // Drug found on blockchain, mark as not flagged (unless admin explicitly flags it later)
      drug.isFlagged = false; // Unflag if it was previously flagged by patient
      await drug.save(); // Save the updated status to MongoDB

      result = `✅ Drug ${batchId} verified as authentic on blockchain. Unflagged if previously flagged.`;
      const auditEntry = new AuditLog({
        userName: user.name,
        action: 'Admin Verify Drug (Authentic)',
        details: `Drug ID: ${batchId} - Verified on blockchain.`,
        status: 'Success'
      });
      await auditEntry.save();
    }

    res.render('admin-verify', { user, result });

  } catch (error) {
    console.error('🚨 Admin Verification Error:', error);
    const auditEntry = new AuditLog({
      userName: user.name,
      action: 'Admin Verify Drug (Error)',
      details: `Error verifying Drug ID: ${batchId} - ${error.message}`,
      status: 'Error'
    });
    await auditEntry.save();
    res.status(500).send('Internal Server Error during verification.');
  }
});

// Admin: Manually Flag a Drug (New Route)
router.post('/flag-drug', async (req, res) => {
  const user = req.session.user;
  const { drugIdToFlag, reason } = req.body;

  try {
    if (!drugIdToFlag || drugIdToFlag.trim() === "") {
      return res.status(400).json({ message: "Drug ID to flag is required." });
    }

    const drug = await Drug.findOne({ id: drugIdToFlag.trim() });
    if (!drug) {
      return res.status(404).json({ message: "Drug not found in database." });
    }

    drug.isFlagged = true;
    // Optionally, you could add the reason to the drug's history or a separate field
    // drug.history.push({ status: "Flagged by Admin", updatedBy: user.name, owner: user.name, timestamp: Date.now(), details: reason });
    await drug.save();

    const auditEntry = new AuditLog({
      userName: user.name,
      action: 'Admin Manually Flagged Drug',
      details: `Drug ID: ${drugIdToFlag}, Reason: ${reason || 'No reason provided'}`,
      status: 'Flagged'
    });
    await auditEntry.save();

    res.json({ message: `Drug ${drugIdToFlag} has been manually flagged.` });

  } catch (error) {
    console.error('🚨 Admin Flag Drug Error:', error);
    res.status(500).json({ message: 'Internal Server Error during flagging.' });
  }
});


// View all flagged drugs page
router.get('/flagged', async (req, res) => {
  try {
    const flaggedBatches = await Drug.find({ isFlagged: true }); // Fetch only flagged drugs
    res.render('admin-flagged', { user: req.session.user, flaggedBatches });
  } catch (err) {
    console.error('Error fetching flagged batches:', err);
    res.status(500).send("Server error");
  }
});

router.get('/audit', async (req, res) => {
  try {
    const auditLogs = await AuditLog.find().sort({ timestamp: -1 }).lean();
    res.render('admin-audit', { user: req.session.user, auditLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/reports', async (req, res) => {
  try {
    const totalDrugs = await Drug.countDocuments({});
    const totalTransfers = await AuditLog.countDocuments({ action: 'transfer' }); // adjust 'transfer' if needed
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
