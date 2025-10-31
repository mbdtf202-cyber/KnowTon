"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function main() {
    console.log("🚀 Starting KnowTon Smart Contracts Deployment...\n");
    const [deployer] = await hardhat_1.ethers.getSigners();
    const network = await hardhat_1.ethers.provider.getNetwork();
    console.log("📋 Deployment Info:");
    console.log("  Network:", network.name, `(Chain ID: ${network.chainId})`);
    console.log("  Deployer:", deployer.address);
    console.log("  Balance:", hardhat_1.ethers.formatEther(await hardhat_1.ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("");
    const deployedContracts = {};
    // 1. Deploy MockERC20 (Test Token)
    console.log("1️⃣  Deploying MockERC20...");
    const MockERC20 = await hardhat_1.ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock USDC", "mUSDC", hardhat_1.ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    const mockTokenAddress = await mockToken.getAddress();
    deployedContracts.MockERC20 = mockTokenAddress;
    console.log("   ✅ MockERC20 deployed to:", mockTokenAddress);
    console.log("");
    // 2. Deploy GovernanceTokenSimple
    console.log("2️⃣  Deploying GovernanceTokenSimple...");
    const GovernanceToken = await hardhat_1.ethers.getContractFactory("GovernanceTokenSimple");
    const govToken = await GovernanceToken.deploy();
    await govToken.waitForDeployment();
    const govTokenAddress = await govToken.getAddress();
    deployedContracts.GovernanceToken = govTokenAddress;
    console.log("   ✅ GovernanceTokenSimple deployed to:", govTokenAddress);
    console.log("");
    // 3. Deploy CopyrightRegistrySimple (IP-NFT)
    console.log("3️⃣  Deploying CopyrightRegistrySimple...");
    const CopyrightRegistry = await hardhat_1.ethers.getContractFactory("CopyrightRegistrySimple");
    const copyrightRegistry = await CopyrightRegistry.deploy();
    await copyrightRegistry.waitForDeployment();
    const copyrightRegistryAddress = await copyrightRegistry.getAddress();
    deployedContracts.CopyrightRegistry = copyrightRegistryAddress;
    console.log("   ✅ CopyrightRegistry deployed to:", copyrightRegistryAddress);
    console.log("");
    // 4. Deploy IPBondBasic
    console.log("4️⃣  Deploying IPBondBasic...");
    const IPBond = await hardhat_1.ethers.getContractFactory("IPBondBasic");
    const ipBond = await IPBond.deploy(mockTokenAddress);
    await ipBond.waitForDeployment();
    const ipBondAddress = await ipBond.getAddress();
    deployedContracts.IPBond = ipBondAddress;
    console.log("   ✅ IPBondBasic deployed to:", ipBondAddress);
    console.log("");
    // 5. Deploy FractionalToken (Fractional Token Template)
    console.log("5️⃣  Deploying FractionalToken...");
    const FractionalToken = await hardhat_1.ethers.getContractFactory("FractionalToken");
    const fractionalToken = await FractionalToken.deploy("Fractional Token", "FRAC", hardhat_1.ethers.parseEther("1000000"));
    await fractionalToken.waitForDeployment();
    const fractionalTokenAddress = await fractionalToken.getAddress();
    deployedContracts.FractionalToken = fractionalTokenAddress;
    console.log("   ✅ FractionalToken deployed to:", fractionalTokenAddress);
    console.log("");
    // Save deployment info
    const deploymentInfo = {
        network: network.name,
        chainId: Number(network.chainId),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployedContracts,
    };
    const deploymentsDir = path_1.default.join(__dirname, "../deployments");
    if (!fs_1.default.existsSync(deploymentsDir)) {
        fs_1.default.mkdirSync(deploymentsDir, { recursive: true });
    }
    const filename = `${network.name}-${Date.now()}.json`;
    const filepath = path_1.default.join(deploymentsDir, filename);
    fs_1.default.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    // Also save as latest
    const latestPath = path_1.default.join(deploymentsDir, `${network.name}-latest.json`);
    fs_1.default.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ Deployment Complete!");
    console.log("═══════════════════════════════════════════════════");
    console.log("");
    console.log("📝 Deployed Contracts:");
    Object.entries(deployedContracts).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });
    console.log("");
    console.log("💾 Deployment info saved to:");
    console.log(`   ${filepath}`);
    console.log(`   ${latestPath}`);
    console.log("");
    // Generate .env update
    console.log("📋 Update your .env file with:");
    console.log("─────────────────────────────────────────────────");
    console.log(`VITE_IP_NFT_ADDRESS=${copyrightRegistryAddress}`);
    console.log(`VITE_GOVERNANCE_TOKEN_ADDRESS=${govTokenAddress}`);
    console.log(`VITE_IP_BOND_ADDRESS=${ipBondAddress}`);
    console.log(`VITE_MOCK_TOKEN_ADDRESS=${mockTokenAddress}`);
    console.log(`VITE_FRACTIONAL_TOKEN_ADDRESS=${fractionalTokenAddress}`);
    console.log("─────────────────────────────────────────────────");
    console.log("");
    // Verify contracts (if on testnet/mainnet)
    if (network.chainId !== 31337n) {
        console.log("🔍 To verify contracts on Arbiscan, run:");
        console.log("─────────────────────────────────────────────────");
        console.log(`npx hardhat verify --network ${network.name} ${copyrightRegistryAddress}`);
        console.log(`npx hardhat verify --network ${network.name} ${govTokenAddress}`);
        console.log(`npx hardhat verify --network ${network.name} ${ipBondAddress} ${mockTokenAddress}`);
        console.log(`npx hardhat verify --network ${network.name} ${mockTokenAddress} "Mock USDC" "mUSDC" ${hardhat_1.ethers.parseEther("1000000")}`);
        console.log(`npx hardhat verify --network ${network.name} ${fractionalTokenAddress} "Fractional Token" "FRAC" ${hardhat_1.ethers.parseEther("1000000")}`);
        console.log("─────────────────────────────────────────────────");
    }
    console.log("");
    console.log("🎉 Deployment successful!");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
});
//# sourceMappingURL=deploy.js.map