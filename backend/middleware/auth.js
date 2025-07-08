// ==================== Updated Middleware ====================

// middleware/auth.js

function ensureLoggedIn(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (user && roles.includes(user.role)) return next();
    return res.status(403).send("Access denied");
  };
}

module.exports = { ensureLoggedIn, requireRole };
