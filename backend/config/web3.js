// backend/config/web3.js

const Web3 = require("web3");
const fs = require("fs");
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://127.0.0.1:8545'));

require("dotenv").config();

const contractAddress = process.env.CONTRACT_ADDRESS;

// Load the ABI
const contractABI = JSON.parse(
  fs.readFileSync(
    __dirname + "/../../artifacts/contracts/DrugSupplyChain.sol/DrugSupplyChain.json",
    "utf8"
  )
).abi;

// Create Web3 instance and contract object
//const web3 = new Web3("http://127.0.0.1:8545");
const contract = new web3.eth.Contract(contractABI, contractAddress);

module.exports = { web3, contract };
