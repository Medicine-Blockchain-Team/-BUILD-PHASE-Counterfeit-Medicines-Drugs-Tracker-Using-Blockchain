// app.js (frontend)
const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index", { message: null });
});

app.post("/add-drug", async (req, res) => {
  const { id, name } = req.body;

  try {
    const response = await fetch("http://localhost:5000/add-drug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });

    const message = response.ok
      ? "✅ Drug added successfully."
      : "❌ Failed to add drug.";

    res.render("index", { message });
  } catch (err) {
    console.error("Error:", err);
    res.render("index", { message: "⚠️ Server error." });
  }
});

app.listen(3000, () => {
  console.log("Frontend running on port 3000");
});
