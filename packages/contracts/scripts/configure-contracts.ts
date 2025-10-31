import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("⚙️  Configuring KnowTon Contracts...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📋 Configuration Info:");
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

  // Configure CopyrightRegistry
  console.log("1️⃣  Configuring CopyrightRegistry...");
  const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistrySimple");
  const copyrightRegistry = CopyrightRegistry.attach(contracts.CopyrightRegistry);

  try {
    // Initialize if not already done
    try {
      const tx = await copyrightRegistry.initialize();
      await tx.wait();
      console.log("   ✅ Contract initialized");
    } catch (error: any) {
      if (error.message.includes("already initialized")) {
        console.log("   ℹ️  Already initialized");
      } else {
        throw error;
      }
    }

    // Grant MINTER_ROLE to deployer
    const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
    const hasRole = await copyrightRegistry.hasRole(MINTER_ROLE, deployer.address);
    
    if (!hasRole) {
      const tx = await copyrightRegistry.grantRole(MINTER_ROLE, deployer.address);
      await tx.wait();
      console.log("   ✅ MINTER_ROLE granted to deployer");
    } else {
      console.log("   ℹ️  MINTER_ROLE already granted");
    }

    // Check total supply
    const totalSupply = await copyrightRegistry.totalSupply();
    console.log(`   📊 Total NFTs minted: ${totalSupply}`);
  } catch (error: any) {
    console.error("   ❌ Configuration failed:", error.message);
  }
  console.log("");

  // Configure IPBond
  console.log("2️⃣  Configuring IPBondBasic...");
  const IPBond = await ethers.getContractFactory("IPBondBasic");
  const ipBond = IPBond.attach(contracts.IPBond);

  try {
    const paymentToken = await ipBond.paymentToken();
    const nextBondId = await ipBond.nextBondId();
    console.log(`   📊 Payment Token: ${paymentToken}`);
    console.log(`   📊 Next Bond ID: ${nextBondId}`);
    console.log("   ✅ IPBond configured");
  } catch (error: any) {
    console.error("   ❌ Configuration failed:", error.message);
  }
  console.log("");

  // Configure MockERC20 (mint some tokens for testing)
  console.log("3️⃣  Configuring MockERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = MockERC20.attach(contracts.MockERC20);

  try {
    const balance = await mockToken.balanceOf(deployer.address);
    const decimals = await mockToken.decimals();
    const symbol = await mockToken.symbol();
    console.log(`   📊 Deployer balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    console.log("   ✅ MockERC20 configured");
  } catch (error: any) {
    console.error("   ❌ Configuration failed:", error.message);
  }
  console.log("");

  console.log("═══════════════════════════════════════════════════");
  console.log("✅ Configuration Complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("📝 Contract Addresses:");
  console.log(`   CopyrightRegistry: ${contracts.CopyrightRegistry}`);
  console.log(`   GovernanceToken: ${contracts.GovernanceToken}`);
  console.log(`   IPBond: ${contracts.IPBond}`);
  console.log(`   MockERC20: ${contracts.MockERC20}`);
  console.log(`   FractionalToken: ${contracts.FractionalToken}`);
  console.log("");
  console.log("🔗 View on Explorer:");
  if (network.chainId === 421614n) {
    console.log(`   https://sepolia.arbiscan.io/address/${contracts.CopyrightRegistry}`);
  } else if (network.chainId === 42161n) {
    console.log(`   https://arbiscan.io/address/${contracts.CopyrightRegistry}`);
  }
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration failed:", error);
    process.exit(1);
  });
