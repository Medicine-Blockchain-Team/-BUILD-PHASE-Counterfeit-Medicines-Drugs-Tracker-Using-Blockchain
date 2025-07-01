const express = require("express");
const router = express.Router();
const Drug = require("../models/Drug");
const { ensureLoggedIn, requireRole } = require("../middleware/auth");
const { web3, contract } = require("../config/web3");

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

// Add new drug (Manufacturer)
router.post("/add", ensureLoggedIn, requireRole("manufacturer"), async (req, res) => {
  const { id, name } = req.body;
  const manufacturer = req.session.user.name;
  try {
    const existing = await Drug.findOne({ id });
    if (existing) return res.status(400).json({ error: "Drug ID already exists" });

    await contract.methods.addDrug(id, name).send({ from: (await web3.eth.getAccounts())[0], gas: 3000000 });

    const drug = new Drug({
      id,
      name,
      manufacturer,
      currentOwner: manufacturer,
      status: "Manufactured",
      history: [{ status: "Manufactured", updatedBy: "manufacturer", owner: manufacturer, timestamp: Date.now() }]
    });
    await drug.save();
    res.json({ message: "Drug added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update status (Distributor, Supplier, etc)
router.put(
  "/update-status/:id",
  ensureLoggedIn,
  requireAnyRole("distributor_primary", "distributor_secondary", "supplier", "hospital", "repackager", "regulator"),
  async (req, res) => {
    const { status } = req.body;
    const updatedBy = req.session.user.role;
    const owner = req.session.user.name;

    try {
      const drug = await Drug.findOne({ id: req.params.id });
      if (!drug) return res.status(404).json({ error: "Drug not found" });

      drug.status = status;
      drug.currentOwner = owner;
      drug.history.push({ status, updatedBy, owner, timestamp: Date.now() });
      await drug.save();

      // Optional blockchain recording can be added here
      res.json({ message: "Status updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get drug info
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
