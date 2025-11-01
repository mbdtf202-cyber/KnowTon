"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
describe("CopyrightRegistry", function () {
    let copyrightRegistry;
    let owner;
    let creator;
    let buyer;
    const MINTER_ROLE = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("MINTER_ROLE"));
    const mockMetadata = {
        metadataURI: "ipfs://QmTest123",
        contentHash: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test-content")),
        aiFingerprint: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test-fingerprint")),
        category: 0, // Music
        royaltyPercentage: 1000, // 10%
    };
    beforeEach(async function () {
        [owner, creator, buyer] = await hardhat_1.ethers.getSigners();
        const CopyrightRegistry = await hardhat_1.ethers.getContractFactory("CopyrightRegistry");
        copyrightRegistry = await hardhat_1.upgrades.deployProxy(CopyrightRegistry, [], { initializer: "initialize" });
        await copyrightRegistry.waitForDeployment();
    });
    describe("Initialization", function () {
        it("Should set the correct name and symbol", async function () {
            (0, chai_1.expect)(await copyrightRegistry.name()).to.equal("KnowTon IP-NFT");
            (0, chai_1.expect)(await copyrightRegistry.symbol()).to.equal("IPNFT");
        });
        it("Should grant roles to deployer", async function () {
            (0, chai_1.expect)(await copyrightRegistry.hasRole(MINTER_ROLE, owner.address)).to.be.true;
        });
    });
    describe("Minting", function () {
        it("Should mint IP-NFT successfully", async function () {
            const tx = await copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            await (0, chai_1.expect)(tx)
                .to.emit(copyrightRegistry, "IPNFTMinted")
                .withArgs(1, creator.address, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            (0, chai_1.expect)(await copyrightRegistry.ownerOf(1)).to.equal(creator.address);
            (0, chai_1.expect)(await copyrightRegistry.tokenURI(1)).to.equal(mockMetadata.metadataURI);
        });
        it("Should prevent duplicate content registration", async function () {
            await copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            await (0, chai_1.expect)(copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage)).to.be.revertedWith("Content already registered");
        });
        it("Should reject royalty percentage above maximum", async function () {
            await (0, chai_1.expect)(copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, 6000 // 60% - above max
            )).to.be.revertedWith("Royalty too high");
        });
        it("Should only allow minter role to mint", async function () {
            await (0, chai_1.expect)(copyrightRegistry.connect(buyer).mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage)).to.be.revertedWith("Caller is not a minter");
        });
    });
    describe("Batch Minting", function () {
        it("Should batch mint multiple IP-NFTs", async function () {
            const recipients = [creator.address, buyer.address];
            const metadataURIs = ["ipfs://QmTest1", "ipfs://QmTest2"];
            const contentHashes = [
                hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("content1")),
                hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("content2")),
            ];
            const aiFingerprints = [
                hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("fingerprint1")),
                hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("fingerprint2")),
            ];
            const categories = [0, 1];
            const royalties = [1000, 1500];
            const tokenIds = await copyrightRegistry.batchMintIPNFT.staticCall(recipients, metadataURIs, contentHashes, aiFingerprints, categories, royalties);
            await copyrightRegistry.batchMintIPNFT(recipients, metadataURIs, contentHashes, aiFingerprints, categories, royalties);
            (0, chai_1.expect)(tokenIds.length).to.equal(2);
            (0, chai_1.expect)(await copyrightRegistry.ownerOf(tokenIds[0])).to.equal(creator.address);
            (0, chai_1.expect)(await copyrightRegistry.ownerOf(tokenIds[1])).to.equal(buyer.address);
        });
    });
    describe("IP Verification", function () {
        it("Should verify IP-NFT", async function () {
            await copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            await (0, chai_1.expect)(copyrightRegistry.verifyIP(1))
                .to.emit(copyrightRegistry, "IPVerified")
                .withArgs(1, owner.address);
            const metadata = await copyrightRegistry.getIPMetadata(1);
            (0, chai_1.expect)(metadata.isVerified).to.be.true;
        });
    });
    describe("Royalty Management", function () {
        beforeEach(async function () {
            await copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
        });
        it("Should update royalty configuration", async function () {
            const newRoyalty = 1500; // 15%
            const newRecipient = buyer.address;
            await (0, chai_1.expect)(copyrightRegistry.connect(creator).updateRoyalty(1, newRoyalty, newRecipient))
                .to.emit(copyrightRegistry, "RoyaltyUpdated")
                .withArgs(1, newRoyalty, newRecipient);
            const metadata = await copyrightRegistry.getIPMetadata(1);
            (0, chai_1.expect)(metadata.royaltyPercentage).to.equal(newRoyalty);
            (0, chai_1.expect)(metadata.royaltyRecipient).to.equal(newRecipient);
        });
        it("Should return correct royalty info (ERC-2981)", async function () {
            const salePrice = hardhat_1.ethers.parseEther("1");
            const [receiver, royaltyAmount] = await copyrightRegistry.royaltyInfo(1, salePrice);
            (0, chai_1.expect)(receiver).to.equal(creator.address);
            (0, chai_1.expect)(royaltyAmount).to.equal(hardhat_1.ethers.parseEther("0.1")); // 10% of 1 ETH
        });
        it("Should only allow owner to update royalty", async function () {
            await (0, chai_1.expect)(copyrightRegistry.connect(buyer).updateRoyalty(1, 1500, buyer.address)).to.be.revertedWith("Not token owner");
        });
    });
    describe("Content Discovery", function () {
        it("Should check if content is registered", async function () {
            (0, chai_1.expect)(await copyrightRegistry.isContentRegistered(mockMetadata.contentHash)).to.be.false;
            await copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            (0, chai_1.expect)(await copyrightRegistry.isContentRegistered(mockMetadata.contentHash)).to.be.true;
        });
        it("Should find similar content by fingerprint", async function () {
            await copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            const similarTokens = await copyrightRegistry.findSimilarContent(mockMetadata.aiFingerprint);
            (0, chai_1.expect)(similarTokens.length).to.equal(1);
            (0, chai_1.expect)(similarTokens[0]).to.equal(1);
        });
        it("Should get creator's tokens", async function () {
            await copyrightRegistry.mintIPNFT(creator.address, mockMetadata.metadataURI, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            const contentHash2 = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("content2"));
            await copyrightRegistry.mintIPNFT(creator.address, "ipfs://QmTest2", contentHash2, mockMetadata.aiFingerprint, mockMetadata.category, mockMetadata.royaltyPercentage);
            const creatorTokens = await copyrightRegistry.getCreatorTokens(creator.address);
            (0, chai_1.expect)(creatorTokens.length).to.equal(2);
        });
    });
});
//# sourceMappingURL=CopyrightRegistry.test.js.map