// scripts/deployCheck.js

const Web3 = require("web3");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../.env') }); // Load .env from backend folder

async function getBlockchainDrugEvents() {
    // --- Web3 Setup ---
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress || contractAddress === "0xYourDeployedContractAddress") {
        console.error("❌ CONTRACT_ADDRESS not set in backend/.env. Please deploy your contract and update the .env file.");
        process.exit(1);
    }

    const contractABIPath = path.resolve(__dirname, '../../artifacts/contracts/DrugSupplyChain.sol/DrugSupplyChain.json');
    if (!fs.existsSync(contractABIPath)) {
        console.error(`❌ Contract ABI not found at: ${contractABIPath}. Make sure your contract is compiled.`);
        process.exit(1);
    }
    const contractABI = JSON.parse(fs.readFileSync(contractABIPath, "utf8")).abi;

    const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://127.0.0.1:8545'));
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    try {
        console.log("Fetching all DrugAdded events from the blockchain...");

        const events = await contract.getPastEvents('allEvents', {
            fromBlock: 0,
            toBlock: 'latest'
        });
        console.log("📦 All Events:", events);


        // Get all past events from the contract
       

        if (events.length === 0) {
            console.log("No DrugAdded events found on the blockchain.");
            return;
        }

        console.log(`Found ${events.length} DrugAdded events.`);
        const blockchainDrugs = new Map(); // Use a Map to store unique drugs by ID

        for (const event of events) {
            const drugId = event.returnValues.id;
            const drugName = event.returnValues.name;
            const manufacturer = event.returnValues.manufacturer;
            const blockNumber = event.blockNumber;
            const transactionHash = event.transactionHash;

            // Store the latest information for each drug ID
            blockchainDrugs.set(drugId, {
                id: drugId,
                name: drugName,
                manufacturer: manufacturer,
                blockNumber: blockNumber,
                transactionHash: transactionHash
            });
        }

        console.log("\n--- Drugs Present on Blockchain (from DrugAdded events) ---");
        if (blockchainDrugs.size > 0) {
            blockchainDrugs.forEach(drug => {
                console.log(`ID: ${drug.id}, Name: ${drug.name}, Manufacturer: ${drug.manufacturer}, Block: ${drug.blockNumber}, TxHash: ${drug.transactionHash.substring(0, 10)}...`);
            });
        } else {
            console.log("No unique drugs found from events.");
        }

    } catch (error) {
        console.error("🚨 An error occurred while fetching events:", error);
    }
}

getBlockchainDrugEvents();
