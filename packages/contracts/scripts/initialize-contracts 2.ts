import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔧 Initializing KnowTon Contracts...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📋 Initialization Info:");
  console.log("  Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("  Deployer:", deployer.address);
  console.log("");

  // Read deployment info
  const deploymentPath = path.join(__dirname, "../deployments", `${network.name}-latest.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found for this network");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const contracts = deployment.contracts;

  // Initialize CopyrightRegistry
  console.log("1️⃣  Initializing CopyrightRegistry...");
  const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistrySimple");
  const copyrightRegistry = CopyrightRegistry.attach(contracts.CopyrightRegistry);

  try {
    const tx = await copyrightRegistry.initialize();
    await tx.wait();
    console.log("   ✅ CopyrightRegistry initialized");
  } catch (error: any) {
    if (error.message.includes("already initialized")) {
      console.log("   ℹ️  CopyrightRegistry already initialized");
    } else {
      console.error("   ❌ Initialization failed:", error.message);
    }
  }
  console.log("");

  // Grant MINTER_ROLE to deployer (for testing)
  console.log("2️⃣  Granting MINTER_ROLE...");
  try {
    const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
    const hasRole = await copyrightRegistry.hasRole(MINTER_ROLE, deployer.address);
    
    if (!hasRole) {
      const tx = await copyrightRegistry.grantRole(MINTER_ROLE, deployer.address);
      await tx.wait();
      console.log("   ✅ MINTER_ROLE granted to:", deployer.address);
    } else {
      console.log("   ℹ️  MINTER_ROLE already granted");
    }
  } catch (error: any) {
    console.error("   ❌ Role grant failed:", error.message);
  }
  console.log("");

  console.log("═══════════════════════════════════════════════════");
  console.log("✅ Initialization Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("📝 Contract Status:");
  console.log(`   CopyrightRegistry: ${contracts.CopyrightRegistry}`);
  console.log(`   GovernanceToken: ${contracts.GovernanceToken}`);
  console.log(`   IPBond: ${contracts.IPBond}`);
  console.log(`   MockERC20: ${contracts.MockERC20}`);
  console.log(`   FractionalToken: ${contracts.FractionalToken}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  });
