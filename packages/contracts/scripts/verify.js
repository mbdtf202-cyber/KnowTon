"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function main() {
    console.log("🔍 Starting contract verification on Arbiscan...\n");
    // Read latest deployment
    const network = process.env.HARDHAT_NETWORK || "arbitrumSepolia";
    const deploymentPath = path_1.default.join(__dirname, "../deployments", `${network}-latest.json`);
    if (!fs_1.default.existsSync(deploymentPath)) {
        console.error(`❌ No deployment found for network: ${network}`);
        console.error(`   Looking for: ${deploymentPath}`);
        process.exit(1);
    }
    const deployment = JSON.parse(fs_1.default.readFileSync(deploymentPath, "utf-8"));
    const contracts = deployment.contracts;
    console.log("📋 Verifying contracts on:", network);
    console.log("");
    // Verify MockERC20
    try {
        console.log("1️⃣  Verifying MockERC20...");
        await (0, hardhat_1.run)("verify:verify", {
            address: contracts.MockERC20,
            constructorArguments: ["Mock USDC", "mUSDC", "1000000000000000000000000"],
        });
        console.log("   ✅ MockERC20 verified");
    }
    catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("   ℹ️  MockERC20 already verified");
        }
        else {
            console.error("   ❌ MockERC20 verification failed:", error.message);
        }
    }
    console.log("");
    // Verify GovernanceToken
    try {
        console.log("2️⃣  Verifying GovernanceTokenSimple...");
        await (0, hardhat_1.run)("verify:verify", {
            address: contracts.GovernanceToken,
            constructorArguments: [],
        });
        console.log("   ✅ GovernanceToken verified");
    }
    catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("   ℹ️  GovernanceToken already verified");
        }
        else {
            console.error("   ❌ GovernanceToken verification failed:", error.message);
        }
    }
    console.log("");
    // Verify CopyrightRegistry
    try {
        console.log("3️⃣  Verifying CopyrightRegistrySimple...");
        await (0, hardhat_1.run)("verify:verify", {
            address: contracts.CopyrightRegistry,
            constructorArguments: [],
        });
        console.log("   ✅ CopyrightRegistry verified");
    }
    catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("   ℹ️  CopyrightRegistry already verified");
        }
        else {
            console.error("   ❌ CopyrightRegistry verification failed:", error.message);
        }
    }
    console.log("");
    // Verify IPBond
    try {
        console.log("4️⃣  Verifying IPBondBasic...");
        await (0, hardhat_1.run)("verify:verify", {
            address: contracts.IPBond,
            constructorArguments: [contracts.MockERC20],
        });
        console.log("   ✅ IPBond verified");
    }
    catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("   ℹ️  IPBond already verified");
        }
        else {
            console.error("   ❌ IPBond verification failed:", error.message);
        }
    }
    console.log("");
    // Verify FractionalToken
    try {
        console.log("5️⃣  Verifying FractionalToken...");
        await (0, hardhat_1.run)("verify:verify", {
            address: contracts.FractionalToken,
            constructorArguments: ["Fractional Token", "FRAC", "1000000000000000000000000"],
        });
        console.log("   ✅ FractionalToken verified");
    }
    catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("   ℹ️  FractionalToken already verified");
        }
        else {
            console.error("   ❌ FractionalToken verification failed:", error.message);
        }
    }
    console.log("");
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ Verification Complete!");
    console.log("═══════════════════════════════════════════════════");
    console.log("");
    console.log("🔗 View contracts on Arbiscan:");
    console.log(`   CopyrightRegistry: https://sepolia.arbiscan.io/address/${contracts.CopyrightRegistry}`);
    console.log(`   GovernanceToken: https://sepolia.arbiscan.io/address/${contracts.GovernanceToken}`);
    console.log(`   IPBond: https://sepolia.arbiscan.io/address/${contracts.IPBond}`);
    console.log(`   MockERC20: https://sepolia.arbiscan.io/address/${contracts.MockERC20}`);
    console.log(`   FractionalToken: https://sepolia.arbiscan.io/address/${contracts.FractionalToken}`);
    console.log("");
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
});
//# sourceMappingURL=verify.js.map