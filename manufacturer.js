const express = require('express');
const router = express.Router();
const { ensureLoggedIn, requireRole } = require('../middleware/auth');
const Drug = require('../models/Drug');
const { web3, contract } = require('../config/web3');
const AuditLog = require('../models/AuditLog');


// Manufacturer dashboard (GET /manufacturer/dashboard)
router.get(
  '/dashboard',
  ensureLoggedIn,
  requireRole('manufacturer'),
  async (req, res) => {
    try {
      const user = req.session.user;

      if (!user || !user.name) {
        return res.status(400).send("⚠️ Invalid session. Please log in again.");
      }

      const drugs = await Drug.find({ manufacturer: user.name });

      res.render('manufacturer-dashboard', {
        user,
        drugs,
        message: null
      });
    } catch (err) {
      console.error("Dashboard error:", {
        message: err.message,
        stack: err.stack
      });
      res.status(500).send("Server error");
    }
  }
);

// POST /manufacturer/add-drug
router.post(
  '/add-drug',
  ensureLoggedIn,
  requireRole('manufacturer'),
  async (req, res) => {
    const { id, name } = req.body;
    const user = req.session.user;

    if (!user || !user.name) {
      return res.status(400).send("⚠️ Invalid user session. Please log in again.");
    }

    const manufacturerName = user.name;

    try {
      // Basic input validation
      if (!id || !name) {
        const drugs = await Drug.find({ manufacturer: manufacturerName });
        return res.render('manufacturer-dashboard', {
          user,
          drugs,
          message: '⚠️ Please provide both Drug ID and Name.'
        });
      }

      // Check if drug ID already exists in DB
      const existingDrug = await Drug.findOne({ id });
      if (existingDrug) {
        const drugs = await Drug.find({ manufacturer: manufacturerName });
        return res.render('manufacturer-dashboard', {
          user,
          drugs,
          message: "⚠️ Drug ID already exists."
        });
      }

      // Get sender address
      const sender = user.walletAddress || (await web3.eth.getAccounts())[0];

      if (!sender) {
        throw new Error("Sender wallet address not found.");
      }

      // Interact with blockchain
      console.log("Calling contract.addDrug() with:", id, name);
      await contract.methods.addDrug(id, name).send({
        from: sender,
        gas: 3000000
      });

      // Save drug to DB
      const newDrug = new Drug({
        id,
        name,
        manufacturer: manufacturerName,
        currentOwner: manufacturerName,
        status: "Manufactured",
        history: [{
          status: "Manufactured",
          updatedBy: user.role,
          owner: manufacturerName,
          timestamp: Date.now()
        }]
      });

      await newDrug.save();
      // ✅ Define auditEntry first, then save it
      const auditEntry = new AuditLog({
        userName: manufacturerName,
        action: 'Added Drug',
        details: `Drug ID: ${id}, Name: ${name}`,
        txHash: 'N/A (web3.send() does not return hash here)',
        status: 'Success'
      });
      await auditEntry.save();
      


      const drugs = await Drug.find({ manufacturer: manufacturerName });
      res.render('manufacturer-dashboard', {
        user,
        drugs,
        message: "✅ Drug added successfully!"
      });

    } catch (err) {
      console.error("🚨 Add drug error:", {
        message: err.message,
        stack: err.stack
      });

      let errorMessage = "⚠️ Server error. Please try again.";
      if (err.message.includes('revert')) {
        errorMessage = "⚠️ Blockchain rejected the transaction.";
      } else if (err.message.includes('invalid address')) {
        errorMessage = "⚠️ Invalid wallet address.";
      } else if (err.message.includes('Sender wallet address not found')) {
        errorMessage = "⚠️ Wallet not connected. Please log in again.";
      } else if (err.message.includes('Drug validation failed')) {
        errorMessage = "⚠️ Drug creation failed due to missing fields.";
      }

      const drugs = await Drug.find({ manufacturer: manufacturerName });
      res.render('manufacturer-dashboard', {
        user,
        drugs,
        message: errorMessage
      });
    }
  }
);

module.exports = router;
