# 💊 Blockchain Medicine Tracker

A decentralized system to track and verify medicines using **Blockchain** and **MongoDB**, preventing counterfeit drugs in the pharmaceutical supply chain.

---

## 🚀 Features

✅ Add drugs to the blockchain with unique IDs  
✅ Store immutable drug history in MongoDB  
✅ Integrate with Ethereum smart contracts (Solidity)  
✅ Role-based workflow support (CDSCO, Manufacturer, Distributor)  
✅ Simple web UI (EJS) for adding/viewing drugs  
✅ Improved frontend/backend integration (Checkpoint 2)

---

## 🛠️ Tech Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Frontend   | EJS, HTML, CSS                               |
| Backend    | Node.js, Express.js                          |
| Blockchain | Solidity Smart Contracts, Hardhat, Web3.js   |
| Database   | MongoDB                                      |
| Deployment | Vercel (frontend), Railway (backend), Polygon Mumbai Testnet |

---

## 📂 Folder Structure
blockchain-medicine-tracker/
├── backend/
│ ├── config/
│ ├── middleware/
│ ├── models/
│ ├── public/
│ ├── routes/
│ ├── views/
│ ├── server.js
│ ├── package.json
│ └── .env
├── frontend/
│ ├── views/
│ ├── app.js
│ ├── package.json
├── contracts/
│ └── DrugSupplyChain.sol
├── scripts/
├── test/
├── hardhat.config.js
└── README.md

1️⃣ Install dependencies:
cd backend
npm install

cd ../frontend
npm install

2️⃣ Configure .env in backend/:
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_infura_key
CONTRACT_ADDRESS=your_smart_contract_address

3️⃣ Start MongoDB (local or Atlas).

4️⃣ Start the backend:
cd backend
node server.js

5️⃣ Visit the app at:
http://localhost:5000


