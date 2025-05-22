// backend/server.js

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const Drug = require("./models/Drug");
const { web3, contract } = require("./config/web3");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Error:", err));

// API Check
app.get("/", (req, res) => {
  res.send("API is running");
});

// POST: Add Drug
app.post("/add-drug", async (req, res) => {
  const { id, name } = req.body;

  try {
    const accounts = await web3.eth.getAccounts();
    const sender = accounts[0];

    // Interact with smart contract
    await contract.methods.addDrug(id, name).send({ from: sender, gas: 3000000 });

    // Save in MongoDB
    const newDrug = new Drug({ id, name, history: ["Drug added to blockchain"] });
    await newDrug.save();

    res.status(200).send("Drug added successfully.");
  } catch (err) {
    console.error("Error adding drug:", err);
    res.status(500).send("Error adding drug.");
  }
});

// Start Server
app.listen(process.env.PORT || 5000, () => {
  console.log(`Backend running on port ${process.env.PORT || 5000}`);
});
