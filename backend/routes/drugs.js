const express = require("express");
const router = express.Router();
const Drug = require("../models/Drug");
const { ensureLoggedIn, requireRole } = require("../middleware/auth");
const { web3, contract } = require("../config/web3");
const AuditLog = require("../models/AuditLog"); // Import AuditLog model

// Utility middleware for multiple roles
function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (req.session?.user && roles.includes(req.session.user.role)) {
      next();
    } else {
      res.status(403).json({ error: "Forbidden" });
    }
  };
}

// ✅ Updated: Add new drug (Manufacturer) - Uses upsert to avoid duplicates
router.post("/add", ensureLoggedIn, requireRole("manufacturer"), async (req, res) => {
  const { id, name } = req.body;
  const manufacturer = req.session.user.name;
  const user = req.session.user;

  try {
    const sender = user.walletAddress || (await web3.eth.getAccounts())[0];
    if (!sender) throw new Error("Sender wallet address not found.");

    const tx = await contract.methods.addDrug(id, name).send({ from: sender, gas: 3000000 });

    await Drug.updateOne(
      { id },
      {
        $set: {
          name,
          manufacturer,
          currentOwner: manufacturer,
          status: "Manufactured",
          isVerified: true,
          isFlagged: false
        },
        $push: {
          history: {
            status: "Manufactured",
            updatedBy: "manufacturer",
            owner: manufacturer,
            timestamp: Date.now()
          }
        }
      },
      { upsert: true }
    );

    const auditEntry = new AuditLog({
      userName: user.name,
      action: 'Add Drug',
      details: `Drug ID: ${id}, Name: ${name}`,
      txHash: tx.transactionHash,
      status: 'Success'
    });
    await auditEntry.save();

    res.json({ message: "Drug added successfully!", txHash: tx.transactionHash });
  } catch (err) {
    console.error("🚨 Add drug error:", err);
    const auditEntry = new AuditLog({
      userName: user.name,
      action: 'Add Drug',
      details: `Failed to add Drug ID: ${id}, Name: ${name} - ${err.message}`,
      status: 'Failed'
    });
    await auditEntry.save();
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update status for a drug (blockchain + MongoDB)
router.put(
  "/update-status/:id",
  ensureLoggedIn,
  requireAnyRole("distributor_primary", "distributor_secondary", "supplier", "hospital", "repackager", "regulator"),
  async (req, res) => {
    const { status } = req.body;
    const user = req.session.user;
    const updatedBy = user.role;
    const owner = user.name;
    const drugId = req.params.id;

    try {
      const drug = await Drug.findOne({ id: drugId });
      if (!drug) {
        await new AuditLog({
          userName: user.name,
          action: 'Update Drug Status',
          details: `Attempted to update status for non-existent Drug ID: ${drugId}`,
          status: 'Failed'
        }).save();
        return res.status(404).json({ error: "Drug not found" });
      }

      const sender = user.walletAddress || (await web3.eth.getAccounts())[0];
      if (!sender) throw new Error("Sender wallet address not found.");

      const eventDetail = `${status} by ${owner} (${updatedBy})`;

      const tx = await contract.methods.updateHistory(drugId, eventDetail).send({ from: sender, gas: 3000000 });

      drug.status = status;
      drug.currentOwner = owner;
      drug.history.push({ status, updatedBy, owner, timestamp: Date.now() });
      await drug.save();

      await new AuditLog({
        userName: user.name,
        action: 'Update Drug Status',
        details: `Drug ID: ${drugId}, New Status: ${status}`,
        txHash: tx.transactionHash,
        status: 'Success'
      }).save();

      res.json({ message: "Status updated successfully!", txHash: tx.transactionHash });
    } catch (err) {
      console.error("🚨 Update status error:", err);
      await new AuditLog({
        userName: user.name,
        action: 'Update Drug Status',
        details: `Failed to update status for Drug ID: ${drugId}, Status: ${status} - ${err.message}`,
        status: 'Failed'
      }).save();
      res.status(500).json({ error: err.message });
    }
  }
);

// ✅ Get drug details from MongoDB
router.get("/:id", ensureLoggedIn, async (req, res) => {
  try {
    const drug = await Drug.findOne({ id: req.params.id });
    if (!drug) return res.status(404).json({ error: "Not found" });
    res.json(drug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

