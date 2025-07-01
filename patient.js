// routes/patient.js
const express = require('express');
const router = express.Router();

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
  res.render('verify-drug', { user: req.session.user });
});

// POST route to verify the drug ID
router.post('/verify-drug', ensurePatient, async (req, res) => {
  const { drugId } = req.body;

  try {
    // Replace with actual smart contract verification logic
    const isValid = drugId === "VALID-ID-123"; // Dummy verification logic

    res.render('verify-result', {
      user: req.session.user,
      drugId,
      isValid
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error verifying drug ID.');
  }
});

module.exports = router;
