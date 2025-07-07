const express = require('express');
const router = express.Router();
const Drug = require('../models/Drug'); // Import your Mongoose Drug model
const { web3, contract } = require('../config/web3'); // Import web3 and contract instance

// Middleware to ensure only patients can access
const ensurePatient = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'patient') {
    next();
  } else {
    res.redirect('/login');
  }
};

// GET route for verify drug page
router.get('/verify-drug', ensurePatient, (req, res) => {
  res.render('verify-drug', { user: req.session.user, message: null }); // Pass message as null initially
});

// POST route to verify the drug ID
router.post('/verify-drug', ensurePatient, async (req, res) => {
  const { drugId } = req.body;
  const user = req.session.user; // Get the current user from session

  try {
    if (!drugId || drugId.trim() === "") {
      return res.render("verify-drug", { user, message: "⚠️ Please enter a Drug ID." });
    }

    const trimmedDrugId = drugId.trim();
    console.log("Patient verifying Drug ID:", trimmedDrugId);

    // 1. Fetch drug from MongoDB
    let drug = await Drug.findOne({ id: trimmedDrugId });

    if (!drug) {
      // If not found in MongoDB, it's definitely not authentic in our system
      return res.render('verify-result', { user, drug: null, message: "❌ Drug not found in our system." });
    }

    // 2. Fetch drug details from the blockchain
    // Note: Smart contract IDs are uint, so ensure conversion if needed.
    // Assuming drug.id from MongoDB is a string that can be converted to uint.
    const blockchainDrug = await contract.methods.getDrug(trimmedDrugId).call();

    // The getDrug function returns a tuple: (id, name, manufacturer, history)
    // If the drug doesn't exist on the blockchain, the id will be 0 (default uint value)
    const blockchainDrugId = blockchainDrug[0]; // The first element is the ID

    // 3. Check authenticity and potentially flag
    if (blockchainDrugId == 0 || blockchainDrugId.toString() !== trimmedDrugId) {
      // Drug found in MongoDB but not on blockchain, or ID mismatch
      drug.isFlagged = true; // Mark as flagged
      await drug.save(); // Save the updated status to MongoDB
      console.log(`Drug ID ${trimmedDrugId} flagged: Not found on blockchain or ID mismatch.`);
      return res.render('verify-result', { user, drug, message: "⚠️ This drug is flagged as potentially counterfeit or unauthentic. Please contact support." });
    } else {
      // Drug found on blockchain, confirm it's not flagged (unless manually flagged by admin)
      if (drug.isFlagged) {
        // If it was manually flagged by admin, keep it flagged.
        return res.render('verify-result', { user, drug, message: "⚠️ This drug has been flagged by an administrator. Please contact support." });
      } else {
        // If found on blockchain and not manually flagged, it's authentic
        drug.isFlagged = false; // Ensure it's not flagged if it was previously
        await drug.save(); // Save the updated status to MongoDB
        return res.render('verify-result', { user, drug, message: "✅ Drug verified as authentic." });
      }
    }

  } catch (err) {
    console.error("🚨 Patient verify drug error:", err);
    res.render('verify-drug', { user, drug: null, message: "⚠️ Server error during verification. Please ensure the blockchain node is running." });
  }
});

module.exports = router;
