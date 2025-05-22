
const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const Drug = await hre.ethers.getContractFactory("DrugSupplyChain");

  // Deploy the contract
  const drug = await Drug.deploy();  // Correct usage

  // Wait for deployment to complete
  await drug.waitForDeployment(); // ✅ This is required for Hardhat v2.21+ with Ethers v6+

  // Get the address
  const address = await drug.getAddress();

  console.log("DrugSupplyChain deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
