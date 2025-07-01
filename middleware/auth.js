const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");

// Register route
router.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // For frontend form rendered with EJS, you might want to render a view with message.
      // But since your login returns JSON, let's keep consistent JSON here.
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      username,
      email,
      passwordHash,
      role,
    });

    await newUser.save();

    // After success, you can redirect or respond with JSON
    // Since your frontend is EJS views, let's redirect to login page
    return res.redirect("/login");
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Server error during registration" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password with passwordHash
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Store session info
    req.session.user = {
      id: user._id,
      name: user.username,
      email: user.email,
      role: user.role,
    };

    return res.json({ message: "Login successful", user: req.session.user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Optional admin check middleware (recommended)
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    next();
  } else {
    res.status(403).send("Access denied");
  }
}

// Admin: Verify authenticity page
router.get("/admin/verify", isAdmin, (req, res) => {
  res.render("admin-verify");
});

// Admin: Flagged batches page
router.get("/admin/flagged", isAdmin, (req, res) => {
  res.render("admin-flagged");
});

// Admin: Audit logs page
router.get("/admin/audit", isAdmin, (req, res) => {
  res.render("admin-audit");
});

// Admin: Reports page
router.get("/admin/reports", isAdmin, (req, res) => {
  res.render("admin-reports");
});

module.exports = router;
