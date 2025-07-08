// backend/services/blockchainListener.js

const { web3, contract } = require('../config/web3');
const Drug = require('../models/Drug');
const AuditLog = require('../models/AuditLog');

const DRUG_ADDED_TOPIC = web3.utils.sha3('DrugAdded(uint256,string,address)');
const HISTORY_UPDATED_TOPIC = web3.utils.sha3('HistoryUpdated(uint256,string)');

async function startListening() {
    if (!contract.options.address) {
        console.error("🚨 Contract address not set. Cannot start blockchain listener.");
        return;
    }

    console.log(`👂 Listening for events on contract: ${contract.options.address}`);
    console.log(`   DrugAdded Topic: ${DRUG_ADDED_TOPIC}`);
    console.log(`   HistoryUpdated Topic: ${HISTORY_UPDATED_TOPIC}`);

    // Listen for DrugAdded events
    web3.eth.subscribe('logs', {
        address: contract.options.address,
        topics: [DRUG_ADDED_TOPIC]
    })
    .on('data', async (log) => {
        try {
            const decoded = web3.eth.abi.decodeLog(
                contract.options.jsonInterface.find(e => e.name === 'DrugAdded' && e.type === 'event').inputs,
                log.data,
                log.topics.slice(1)
            );

            const { id, name, manufacturer } = decoded;
            const txHash = log.transactionHash;

            console.log(`\n✨ DrugAdded Event Detected`);
            console.log(`   ID: ${id}, Name: ${name}, Manufacturer: ${manufacturer}`);

            // Use updateOne with upsert: true to create or update the document.
            // This is the single point of writing to the DB for new drugs.
            await Drug.updateOne(
                { id: id }, // Find document by this unique ID
                {
                    $set: { // Set these fields whether creating or updating
                        name: name,
                        manufacturer: manufacturer,
                        currentOwner: manufacturer,
                        status: "Manufactured (On-Chain)",
                        isVerified: true,
                        isFlagged: false,
                    },
                    $setOnInsert: { // Only add this history on initial creation
                        history: [{
                            status: "Manufactured (On-Chain)",
                            updatedBy: "Blockchain Listener",
                            owner: manufacturer,
                            timestamp: Date.now()
                        }]
                    }
                },
                { upsert: true } // This is the key: if no doc found, create it.
            );

            await new AuditLog({
                userName: 'Blockchain Listener',
                action: 'Drug Synced From Blockchain',
                details: `ID: ${id}, Name: ${name}, Manufacturer: ${manufacturer}`,
                txHash: txHash,
                status: 'Upserted'
            }).save();

            console.log(`✅ Drug synced to DB: ${id}`);

        } catch (err) {
            console.error(`🚨 Error processing DrugAdded log:`, err);
            await new AuditLog({
                userName: 'Blockchain Listener',
                action: 'Error Processing DrugAdded Log',
                details: `Error: ${err.message}`,
                txHash: log.transactionHash,
                status: 'Failed'
            }).save();
        }
    })
    .on('error', (error) => {
        console.error("🚨 Error in DrugAdded subscription:", error);
    });

    // ... (HistoryUpdated listener remains the same)
    web3.eth.subscribe('logs', {
        address: contract.options.address,
        topics: [HISTORY_UPDATED_TOPIC]
    })
    .on('data', async (log) => {
        try {
            const decoded = web3.eth.abi.decodeLog(
                contract.options.jsonInterface.find(e => e.name === 'HistoryUpdated' && e.type === 'event').inputs,
                log.data,
                log.topics.slice(1)
            );

            const { id, eventDetail } = decoded;
            const txHash = log.transactionHash;

            console.log(`\n📜 HistoryUpdated Event Detected`);
            console.log(`   Drug ID: ${id}, Detail: ${eventDetail}`);

            const drug = await Drug.findOne({ id });

            if (drug) {
                drug.history.push({
                    status: eventDetail,
                    updatedBy: "Blockchain Listener (On-Chain Event)",
                    owner: drug.currentOwner,
                    timestamp: Date.now()
                });
                await drug.save();

                await new AuditLog({
                    userName: 'Blockchain Listener',
                    action: 'Drug History Updated On-Chain',
                    details: `Drug ID: ${id}, Event: ${eventDetail}`,
                    txHash,
                    status: 'Success'
                }).save();

                console.log(`✅ History updated for Drug ID: ${id}`);
            } else {
                console.warn(`⚠️ Drug ID ${id} not found in DB for HistoryUpdated event.`);

                await new AuditLog({
                    userName: 'Blockchain Listener',
                    action: 'History Update Failed (Drug Not Found)',
                    details: `Drug ID: ${id}, Event: ${eventDetail}`,
                    txHash,
                    status: 'Failed'
                }).save();
            }
        } catch (err) {
            console.error(`🚨 Error processing HistoryUpdated log:`, err);
            await new AuditLog({
                userName: 'Blockchain Listener',
                action: 'Error Processing HistoryUpdated Log',
                details: `Error: ${err.message}`,
                txHash: log.transactionHash,
                status: 'Failed'
            }).save();
        }
    })
    .on('error', (error) => {
        console.error("🚨 Error in HistoryUpdated subscription:", error);
    });


    console.log("✅ Blockchain event listeners started successfully.");
}

module.exports = { startListening };
