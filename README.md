# 🧪 Blockchain Medicine Tracker

A decentralized medicine tracking system using **Blockchain**, **MongoDB**, and **Node.js** to verify drug authenticity and prevent counterfeit drugs in the pharmaceutical supply chain.

---

## 🚀 Features

- ✅ Add drugs to the blockchain with a unique ID and name
- ✅ Store drug history in MongoDB
- ✅ Interact with Ethereum smart contract
- ✅ Simple web interface to submit drug data
- ✅ Extendable for roles like CDSCO, Manufacturer, Distributor

---

## 🛠️ Tech Stack

| Layer           | Technology              |
|----------------|--------------------------|
| Frontend        | EJS, HTML, CSS           |
| Backend         | Node.js, Express.js      |
| Blockchain      | Solidity (Smart Contract), Web3.js |
| Database        | MongoDB                  |
| Deployment Ready | Vercel, Railway, Polygon Mumbai Testnet |

---

## 📂 Folder Structure
Blockchain-Medicine-Tracker/
├── backend/
│ ├── server.js
│ ├── models/
│ │ └── Drug.js
│ ├── config/
│ │ └── web3.js
│ └── contracts/
│ └── Medicine.sol
├── frontend/
│ ├── app.js
│ ├── views/
│ │ └── index.ejs
├── .env
├── package.json
├── README.md

## ⚙️ Installation & Setup

1. **Clone this repository**
```bash
git clone https://github.com/your-username/Blockchain-Medicine-Tracker.git
cd Blockchain-Medicine-Tracker

2. **Install dependencies**
cd backend
npm install

cd ../frontend
npm install

3. **Configure .env in backend/**
PORT=5000
MONGO_URI=your_mongodb_connection_string
INFURA_API_KEY=your_infura_key
CONTRACT_ADDRESS=your_smart_contract_address

4. **Run MongoDB (local or cloud like MongoDB Atlas)**

5. **Start Backend Server**
cd backend
node server.js

6. **Start Frontend Server**
cd frontend
node app.js

7. **Visit the app**
Open your browser and go to:
http://localhost:3000

🔗 Smart Contract Overview
// Medicine.sol
function addDrug(uint256 _id, string memory _name) public {
    require(!drugExists[_id], "Drug already exists.");
    drugs[_id] = Drug(_id, _name);
    drugExists[_id] = true;
    emit DrugAdded(_id, _name);
}


---

## 📌 TalentForm.ai Checkpoints

**IMPORTANT FOR REVIEWERS:**

✅ **Checkpoint 1 submission:**  
Please review the `checkpoint1` branch for the exact code as originally submitted for Checkpoint 1.  

✅ **Checkpoint 2 development:**  
The `main` branch contains the ongoing code changes for Checkpoint 2 and beyond.  

---

👉 How to switch branches on GitHub:  
- Click the **branch selector** dropdown at the top-left of the repo.  
- Choose **checkpoint1** to see the submission for Checkpoint 1.  
- Choose **main** to see current work.

Thank you for reviewing!

