require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const Drug = require("./models/Drug");
const User = require("./models/User");
const { ensureLoggedIn, requireRole } = require("./middleware/auth");
const { startListening } = require('./services/blockchainListener'); // Import the listener

const app = express();

// ========== Middleware ==========
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.static(path.join(__dirname, "public")));

// ========== View Engine ==========
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// ========== Session Setup ==========
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 24 * 60 * 60,
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false, // true only for HTTPS
    },
  })
);

// ========== Web Routes ==========
app.get('/', (req, res) => {
  res.redirect('/login');  // Redirect homepage to /login or render login directly
});

app.get('/login', (req, res) => {
  res.render('login'); // render views/login.ejs
});

app.get('/register', (req, res) => {
  res.render('register'); // render views/register.ejs
});


// ========== Dashboards ==========
app.get("/dashboard", ensureLoggedIn, async (req, res) => {
  const user = req.session.user;
  if (!user?.role) return res.redirect("/login");

  try {
    if (user.role === "admin") {
      const [users, drugs] = await Promise.all([User.find(), Drug.find()]);
      return res.render("admin-dashboard", { user, users, drugs });
    }

    if (user.role === "manufacturer") {
      const drugs = await Drug.find({ manufacturer: user.name });
      return res.render("manufacturer-dashboard", { user, drugs, message: null });
    }

    if (user.role === "patient") {
      return res.render("patient-dashboard", { user, drug: null, message: null });
    }

    return res.render("handler-dashboard", { user });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Internal server error.");
  }
});

// ========== Admin Views ==========
app.get("/admin/users", ensureLoggedIn, requireRole("admin"), async (req, res) => {
  const users = await User.find();
  res.render("admin-users", { user: req.session.user, users });
});

app.get("/admin/drugs", ensureLoggedIn, requireRole("admin"), async (req, res) => {
  const drugs = await Drug.find();
  res.render("admin-drugs", { user: req.session.user, drugs });
});

// ========== Logout ==========
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.redirect("/login");
  });
});

// ========== Patient: Verify Drug ==========
app.get("/verify-drug", ensureLoggedIn, requireRole("patient"), (req, res) => {
  res.render("verify-drug", { user: req.session.user, message: null });
});

app.post("/verify-drug", ensureLoggedIn, requireRole("patient"), async (req, res) => {
  const user = req.session.user;
  try {
    let { drugId } = req.body;
    if (!drugId || drugId.trim() === "") {
      return res.render("verify-drug", { user, message: "⚠️ Please enter a Drug ID." });
    }

    drugId = drugId.trim();
    console.log("Verifying Drug ID:", drugId);

    const drug = await Drug.findOne({ id: drugId });

    if (!drug) {
      return res.render("verify-drug", { user, message: "❌ Drug not found!" });
    }

    res.render("verify-result", { user, drug, message: "✅ Drug found." });
  } catch (err) {
    console.error("Verify drug error:", err);
    res.render("verify-drug", { user, message: "⚠️ Server error." });
  }
});

// ========== API Routes ==========
function safeUseRoute(path, routeModule) {
  if (typeof routeModule === "function") {
    app.use(path, routeModule);
  } else {
    console.error(`❌ Route at '${path}' is not a function. Check your export.`);
  }
}

try {
  const authRoutes = require("./routes/auth");
  safeUseRoute("/api/auth", authRoutes);
} catch (err) {
  console.error("❌ Failed to load authRoutes:", err);
}

try {
  const adminRoutes = require("./routes/admin");
  app.use("/admin", adminRoutes);
} catch (err) {
  console.error("❌ Failed to load adminRoutes:", err);
}

try {
  const drugRoutes = require("./routes/drugs");
  safeUseRoute("/api/drugs", drugRoutes);
} catch (err) {
  console.error("❌ Failed to load drugRoutes:", err);
}

try {
  const manufacturerRoutes = require("./routes/manufacturer");
  safeUseRoute("/manufacturer", manufacturerRoutes);
} catch (err) {
  console.error("❌ Failed to load manufacturerRoutes:", err);
}

// ========== Health Check ==========
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// ========== DB Connect & Start ==========
mongoose
  .connect(process.env.MONGO_URI, {
    //useNewUrlParser: true,
    //useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        startListening(); // Call the function to start listening
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
