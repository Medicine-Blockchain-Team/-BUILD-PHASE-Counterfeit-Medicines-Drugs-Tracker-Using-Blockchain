🧪 Blockchain Medicine Tracker
A decentralized medicine tracking system built with Blockchain, MongoDB, and Node.js to verify drug authenticity and combat counterfeit pharmaceuticals in the supply chain.

🚀 Key Features
✅ Add drugs with unique IDs to the blockchain

✅ Track drug status and history across supply chain roles

✅ Store drug metadata securely in MongoDB

✅ Interact with Ethereum smart contracts using Web3.js

✅ Simple web interface (EJS, HTML, CSS)

✅ Role-based architecture: CDSCO, Manufacturer, Distributors, Supplier

✅ Extendable and scalable design

🛠️ Tech Stack
Layer	Technology
Frontend	EJS, HTML, CSS
Backend	Node.js, Express.js
Blockchain	Solidity (Smart Contracts), Web3.js
Database	MongoDB
Deployment	Vercel, Railway, Polygon Mumbai Testnet

⚙️ Installation & Setup
1. Clone the repository
   https://github.com/Medicine-Blockchain-Team/Blockchain-Medicine-Tracker
   
2. Install dependencies
   cd backend
    npm install

    cd ../frontend
    npm install

3. Configure environment variables (.env in /backend)
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    INFURA_API_KEY=your_infura_key
    CONTRACT_ADDRESS=your_smart_contract_address

4. Run MongoDB (locally or via MongoDB Atlas)

5. Start backend server
    cd backend
    node server.js

6. Start frontend server
   cd frontend
    node app.js

7. Visit the app
   Open: http://localhost:5000

🔗 Smart Contract Example
    function addDrug(uint256 _id, string memory _name) public {
        require(!drugExists[_id], "Drug already exists.");
        drugs[_id] = Drug(_id, _name);
        drugExists[_id] = true;
        emit DrugAdded(_id, _name);
    }
📌 TalentForm.ai Checkpoints
✅ Checkpoint 1 Submission: Please review the checkpoint1 branch for the original submitted code.

✅ Checkpoint 2 Submission: Please review the checkpoint2 branch for the development submitted code.

✅ Ongoing Development: Active work is on the main branch.

ℹ️ Switching Branches on GitHub:
Click the branch selector dropdown (top-left)

Choose checkpoint1 to view the submitted version

Choose checkpoint2 to view the development version

Choose main to see the latest updates



