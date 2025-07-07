const express = require('express');
const router = express.Router();
const { ensureLoggedIn, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Drug = require('../models/Drug');
const AuditLog = require('../models/AuditLog');
const { web3, contract } = require('../config/web3');

// This middleware ensures all routes in this file are accessed only by logged-in admins.
router.use(ensureLoggedIn);
router.use(requireRole('admin'));

// Manage users page
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.render('admin-users', { users, user: req.session.user });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Server error");
  }
});

// View all drugs page
router.get('/drugs', async (req, res) => {
  try {
    const drugs = await Drug.find();
    res.render('admin-drugs', { drugs, user: req.session.user });
  } catch (err) {
    console.error("Error fetching drugs:", err);
    res.status(500).send("Server error");
  }
});

// Admin: Verify Drug Authenticity Page (GET)
router.get('/verify', (req, res) => {
  res.render('admin-verify', { user: req.session.user, result: null });
});

// Admin: Verify Drug Authenticity (POST) - This is where drugs can be automatically flagged.
router.post('/verify', async (req, res) => {
  const user = req.session.user;
  let { batchId } = req.body;

  try {
    if (!batchId || batchId.trim() === "") {
      return res.render('admin-verify', { user, result: '❌ Please enter a valid Batch ID.' });
    }

    batchId = batchId.trim();
    console.log("Admin verifying Drug ID:", batchId);

    let drug = await Drug.findOne({ id: batchId });
    let result;

    if (!drug) {
      result = `❌ Drug ${batchId} not found in MongoDB.`;
      await new AuditLog({ userName: user.name, action: 'Admin Verify (Not Found)', details: `ID: ${batchId}` }).save();
      return res.render('admin-verify', { user, result });
    }

    const blockchainDrug = await contract.methods.getDrug(batchId).call();
    const blockchainDrugId = blockchainDrug[0];

    if (blockchainDrugId == 0 || blockchainDrugId.toString() !== batchId) {
      drug.isFlagged = true;
      await drug.save();
      result = `⚠️ Drug ${batchId} found in DB but NOT on blockchain. Marked as FLAGGED.`;
      await new AuditLog({ userName: user.name, action: 'Admin Verify (Flagged)', details: `ID: ${batchId}` }).save();
    } else {
      drug.isFlagged = false;
      await drug.save();
      result = `✅ Drug ${batchId} verified as authentic on blockchain. Unflagged if previously flagged.`;
      await new AuditLog({ userName: user.name, action: 'Admin Verify (Authentic)', details: `ID: ${batchId}` }).save();
    }

    res.render('admin-verify', { user, result });

  } catch (error) {
    console.error('🚨 Admin Verification Error:', error);
    await new AuditLog({ userName: user.name, action: 'Admin Verify (Error)', details: `ID: ${batchId} - ${error.message}` }).save();
    res.status(500).send('Internal Server Error during verification.');
  }
});

// Admin: Manually Flag a Drug (Example of a route for future use)
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
    await drug.save();
    await new AuditLog({ userName: user.name, action: 'Admin Manually Flagged Drug', details: `ID: ${drugIdToFlag}, Reason: ${reason || 'N/A'}` }).save();
    res.json({ message: `Drug ${drugIdToFlag} has been manually flagged.` });
  } catch (error) {
    console.error('🚨 Admin Flag Drug Error:', error);
    res.status(500).json({ message: 'Internal Server Error during flagging.' });
  }
});

// View all flagged drugs page
router.get('/flagged', async (req, res) => {
  try {
    const flaggedDrugs = await Drug.find({ isFlagged: true }); // Renamed from flaggedBatches for clarity
    res.render('admin-flagged', {
      user: req.session.user,
      flaggedDrugs: flaggedDrugs // Pass the fetched data to the template
    });
  } catch (err) {
    console.error('Error fetching flagged drugs:', err);
    res.status(500).send("Server error while fetching flagged drugs.");
  }
});

// =================================================================
// **NEW ROUTE TO HANDLE THE UNFLAG ACTION**
// =================================================================
router.post('/unflag-drug', async (req, res) => {
  try {
    const { drug_id } = req.body; // Get the MongoDB _id from the form's hidden input

    if (!drug_id) {
      return res.status(400).send("Drug ID not provided.");
    }

    // Find the drug by its unique MongoDB _id and update it.
    // Setting 'isFlagged' to false effectively unflags it.
    const updatedDrug = await Drug.findByIdAndUpdate(
      drug_id,
      { $set: { isFlagged: false } },
      { new: true } // This option returns the document after the update
    );

    if (!updatedDrug) {
      return res.status(404).send("Drug not found.");
    }

    // Log this administrative action
    await new AuditLog({
      userName: req.session.user.name,
      action: 'Admin Unflagged Drug',
      details: `Drug ID: ${updatedDrug.id} was unflagged.`,
      status: 'Success'
    }).save();

    // Redirect the admin back to the flagged drugs page.
    // The drug that was just unflagged will no longer appear in the list.
    res.redirect('/admin/flagged');

  } catch (err) {
    console.error("Error unflagging drug:", err);
    res.status(500).send("Server error while unflagging drug.");
  }
});


// View audit logs page
router.get('/audit', async (req, res) => {
  try {
    const auditLogs = await AuditLog.find().sort({ timestamp: -1 }).lean();
    res.render('admin-audit', { user: req.session.user, auditLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).send('Internal Server Error');
  }
});

// View reports page
router.get('/reports', async (req, res) => {
  try {
    const totalDrugs = await Drug.countDocuments({});
    const totalTransfers = await AuditLog.countDocuments({ action: 'transfer' });
    const flaggedBatches = await Drug.countDocuments({ isFlagged: true });

    const stats = { totalDrugs, totalTransfers, flaggedBatches };
    res.render('admin-reports', { user: req.session.user, stats });
  } catch (err) {
    console.error('Error generating report stats:', err);
    res.status(500).send('Error generating reports');
  }
});

module.exports = router;
