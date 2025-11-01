"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
describe("CopyrightRegistrySimple", function () {
    let registry;
    let owner;
    let creator;
    let user;
    const MINTER_ROLE = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("MINTER_ROLE"));
    const mockMetadata = {
        metadataURI: "ipfs://QmTest123",
        contentHash: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test-content")),
        aiFingerprint: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test-fingerprint")),
        category: 0, // Music
        royaltyPercentage: 1000, // 10%
    };
    beforeEach(async function () {
        [owner, creator, user] = await hardhat_1.ethers.getSigners();
        const CopyrightRegistrySimple = await hardhat_1.ethers.getContractFactory("CopyrightRegistrySimple");
        registry = await CopyrightRegistrySimple.deploy();
        await registry.waitForDeployment();
        await registry.initialize();
    });
    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            (0, chai_1.expect)(await registry.name()).to.equal("KnowTon IP Registry");
            (0, chai_1.expect)(await registry.symbol()).to.equal("KTIP");
        });
        it("Should set the deployer as admin and minter", async function () {
            const adminRole = await registry.DEFAULT_ADMIN_ROLE();
            (0, chai_1.expect)(await registry.hasRole(adminRole, owner.address)).to.be.true;
            (0, chai_1.expect)(await registry.hasRole(MINTER_ROLE, owner.address)).to.be.true;
        });
    });
    describe("IP Registration", function () {
        it("Should register IP successfully", async function () {
            const tx = await registry.registerIP(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            await (0, chai_1.expect)(tx)
                .to.emit(registry, "IPRegistered")
                .withArgs(1, creator.address, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category);
            (0, chai_1.expect)(await registry.ownerOf(1)).to.equal(creator.address);
            (0, chai_1.expect)(await registry.totalSupply()).to.equal(1);
        });
        it("Should store IP metadata correctly", async function () {
            await registry.registerIP(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            const metadata = await registry.getIPMetadata(1);
            (0, chai_1.expect)(metadata.metadataURI).to.equal(mockMetadata.metadataURI);
            (0, chai_1.expect)(metadata.contentHash).to.equal(mockMetadata.contentHash);
            (0, chai_1.expect)(metadata.aiFingerprint).to.equal(mockMetadata.aiFingerprint);
            (0, chai_1.expect)(metadata.category).to.equal(mockMetadata.category);
            (0, chai_1.expect)(metadata.royaltyPercentage).to.equal(mockMetadata.royaltyPercentage);
            (0, chai_1.expect)(metadata.creator).to.equal(creator.address);
            (0, chai_1.expect)(metadata.isVerified).to.be.false;
        });
        it("Should prevent duplicate content registration", async function () {
            await registry.registerIP(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            await (0, chai_1.expect)(registry.registerIP(user.address, "ipfs://QmTest456", mockMetadata.contentHash, // Same content hash
            hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("different-fingerprint")), 1, // Video
            500)).to.be.revertedWith("Content already registered");
        });
        it("Should prevent duplicate fingerprint registration", async function () {
            await registry.registerIP(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            await (0, chai_1.expect)(registry.registerIP(user.address, "ipfs://QmTest456", hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("different-content")), mockMetadata.aiFingerprint, // Same fingerprint
            1, // Video
            500)).to.be.revertedWith("Fingerprint already exists");
        });
        it("Should reject high royalty percentage", async function () {
            await (0, chai_1.expect)(registry.registerIP(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, 6000 // 60% - too high
            )).to.be.revertedWith("Royalty too high");
        });
        it("Should only allow minters to register IP", async function () {
            await (0, chai_1.expect)(registry.connect(user).registerIP(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage)).to.be.reverted;
        });
    });
    describe("IP Verification", function () {
        beforeEach(async function () {
            await registry.registerIP(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
        });
        it("Should allow admin to verify IP", async function () {
            await (0, chai_1.expect)(registry.verifyIP(1, true))
                .to.emit(registry, "IPVerified")
                .withArgs(1, true);
            const metadata = await registry.getIPMetadata(1);
            (0, chai_1.expect)(metadata.isVerified).to.be.true;
        });
        it("Should only allow admin to verify IP", async function () {
            await (0, chai_1.expect)(registry.connect(user).verifyIP(1, true))
                .to.be.reverted;
        });
    });
    describe("Content Lookup", function () {
        beforeEach(async function () {
            await registry.registerIP(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
        });
        it("Should find token by content hash", async function () {
            const tokenId = await registry.checkContentHash(mockMetadata.contentHash);
            (0, chai_1.expect)(tokenId).to.equal(1);
        });
        it("Should find token by fingerprint", async function () {
            const tokenId = await registry.checkFingerprint(mockMetadata.aiFingerprint);
            (0, chai_1.expect)(tokenId).to.equal(1);
        });
        it("Should return 0 for non-existent content", async function () {
            const nonExistentHash = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("non-existent"));
            const tokenId = await registry.checkContentHash(nonExistentHash);
            (0, chai_1.expect)(tokenId).to.equal(0);
        });
    });
});
//# sourceMappingURL=CopyrightRegistrySimple.test.js.map