// backend/routes/manufacturer.js

const express = require('express');
const router = express.Router();
const { ensureLoggedIn, requireRole } = require('../middleware/auth');
const Drug = require('../models/Drug');
const { web3, contract } = require('../config/web3');
const AuditLog = require('../models/AuditLog');

// GET /dashboard route
router.get(
  '/dashboard',
  ensureLoggedIn,
  requireRole('manufacturer'),
  async (req, res) => {
    try {
      const user = req.session.user;

      if (!user || !user.walletAddress) {
        return res.status(400).send("⚠️ Invalid session. Please log in again.");
      }

      // --- THE FIX: Perform a case-insensitive query ---
      // We create a regular expression from the user's wallet address.
      // The 'i' flag makes the search case-insensitive.
      const manufacturerAddressRegex = new RegExp(`^${user.walletAddress}$`, 'i');
      
      // Now, we use this regex to find the drugs.
      const drugs = await Drug.find({ manufacturer: manufacturerAddressRegex });
      // --- END OF FIX ---

      console.log(`Querying for manufacturer address: ${user.walletAddress}`);
      console.log(`Found ${drugs.length} drugs.`);

      res.render('manufacturer-dashboard', {
        user,
        drugs,
        message: null
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      res.status(500).send("Server error");
    }
  }
);

// POST /add-drug route (This should be correct from our previous fixes)
router.post(
  '/add-drug',
  ensureLoggedIn,
  requireRole('manufacturer'),
  async (req, res) => {
    const { id, name } = req.body;
    const user = req.session.user;
    const manufacturerName = user.name;

    try {
      if (!id || !name) {
        const drugs = await Drug.find({ manufacturer: new RegExp(`^${user.walletAddress}$`, 'i') });
        return res.render('manufacturer-dashboard', { user, drugs, message: '⚠️ Please provide both Drug ID and Name.' });
      }

      const existingDrug = await Drug.findOne({ id });
      if (existingDrug) {
        const drugs = await Drug.find({ manufacturer: new RegExp(`^${user.walletAddress}$`, 'i') });
        return res.render('manufacturer-dashboard', { user, drugs, message: "⚠️ Drug ID already exists in the database." });
      }

      const sender = user.walletAddress || (await web3.eth.getAccounts())[0];
      if (!sender) throw new Error("Sender wallet address not found.");

      console.log(`Sending 'addDrug' transaction to blockchain with ID: ${id}, Name: ${name}`);
      const tx = await contract.methods.addDrug(id, name).send({ from: sender, gas: 3000000 });

      await new AuditLog({
        userName: manufacturerName,
        action: 'Submitted Add Drug Transaction',
        details: `Drug ID: ${id}, Name: ${name}`,
        txHash: tx.transactionHash,
        status: 'Success'
      }).save();

      const drugs = await Drug.find({ manufacturer: new RegExp(`^${user.walletAddress}$`, 'i') });
      res.render('manufacturer-dashboard', {
        user,
        drugs,
        message: `✅ Transaction submitted successfully! The new drug will appear shortly. TxHash: ${tx.transactionHash.substring(0, 10)}...`
      });

    } catch (err) {
      console.error("🚨 Add drug transaction error:", { message: err.message });
      let errorMessage = "⚠️ Server error. Please try again.";
      const errString = err.message.toLowerCase();
      if (errString.includes('nonce too low') || errString.includes('replacement transaction underpriced')) {
        errorMessage = "⚠️ Transaction failed (nonce issue). Please wait a moment and try again.";
      } else if (errString.includes('revert')) {
        errorMessage = "⚠️ Blockchain rejected the transaction. The drug might already exist on-chain.";
      }
      const drugs = await Drug.find({ manufacturer: new RegExp(`^${user.walletAddress}$`, 'i') });
      res.render('manufacturer-dashboard', { user, drugs, message: errorMessage });
    }
  }
);

module.exports = router;
