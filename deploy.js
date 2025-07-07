// backend/scripts/deploy.js

const hre = require("hardhat");

async function main() {
  const Drug = await hre.ethers.getContractFactory("DrugSupplyChain"); // Replace with your contract name
  const drug = await Drug.deploy(); // Deploy the contract

  await drug.waitForDeployment(); // Await deployment confirmation

  console.log("✅ Contract deployed to:", await drug.getAddress()); // Get the deployed address
}

main().catch((error) => {
  console.error("🚨 Deployment error:", error);
  process.exitCode = 1;
});
