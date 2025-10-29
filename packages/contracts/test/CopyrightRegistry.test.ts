import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { CopyrightRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CopyrightRegistry", function () {
  let copyrightRegistry: CopyrightRegistry;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  
  const mockMetadata = {
    metadataURI: "ipfs://QmTest123",
    contentHash: ethers.keccak256(ethers.toUtf8Bytes("test-content")),
    aiFingerprint: ethers.keccak256(ethers.toUtf8Bytes("test-fingerprint")),
    category: 0, // Music
    royaltyPercentage: 1000, // 10%
  };

  beforeEach(async function () {
    [owner, creator, buyer] = await ethers.getSigners();

    const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistry");
    copyrightRegistry = await upgrades.deployProxy(
      CopyrightRegistry,
      [],
      { initializer: "initialize" }
    ) as unknown as CopyrightRegistry;
    await copyrightRegistry.waitForDeployment();
  });

  describe("Initialization", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await copyrightRegistry.name()).to.equal("KnowTon IP-NFT");
      expect(await copyrightRegistry.symbol()).to.equal("IPNFT");
    });

    it("Should grant roles to deployer", async function () {
      expect(await copyrightRegistry.hasRole(MINTER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint IP-NFT successfully", async function () {
      const tx = await copyrightRegistry.mintIPNFT(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      await expect(tx)
        .to.emit(copyrightRegistry, "IPNFTMinted")
        .withArgs(
          1,
          creator.address,
          mockMetadata.contentHash,
          mockMetadata.aiFingerprint,
          mockMetadata.category,
          mockMetadata.royaltyPercentage
        );

      expect(await copyrightRegistry.ownerOf(1)).to.equal(creator.address);
      expect(await copyrightRegistry.tokenURI(1)).to.equal(mockMetadata.metadataURI);
    });

    it("Should prevent duplicate content registration", async function () {
      await copyrightRegistry.mintIPNFT(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      await expect(
        copyrightRegistry.mintIPNFT(
          creator.address,
          mockMetadata.metadataURI,
          mockMetadata.contentHash,
          mockMetadata.aiFingerprint,
          mockMetadata.category,
          mockMetadata.royaltyPercentage
        )
      ).to.be.revertedWith("Content already registered");
    });

    it("Should reject royalty percentage above maximum", async function () {
      await expect(
        copyrightRegistry.mintIPNFT(
          creator.address,
          mockMetadata.metadataURI,
          mockMetadata.contentHash,
          mockMetadata.aiFingerprint,
          mockMetadata.category,
          6000 // 60% - above max
        )
      ).to.be.revertedWith("Royalty too high");
    });

    it("Should only allow minter role to mint", async function () {
      await expect(
        copyrightRegistry.connect(buyer).mintIPNFT(
          creator.address,
          mockMetadata.metadataURI,
          mockMetadata.contentHash,
          mockMetadata.aiFingerprint,
          mockMetadata.category,
          mockMetadata.royaltyPercentage
        )
      ).to.be.revertedWith("Caller is not a minter");
    });
  });

  describe("Batch Minting", function () {
    it("Should batch mint multiple IP-NFTs", async function () {
      const recipients = [creator.address, buyer.address];
      const metadataURIs = ["ipfs://QmTest1", "ipfs://QmTest2"];
      const contentHashes = [
        ethers.keccak256(ethers.toUtf8Bytes("content1")),
        ethers.keccak256(ethers.toUtf8Bytes("content2")),
      ];
      const aiFingerprints = [
        ethers.keccak256(ethers.toUtf8Bytes("fingerprint1")),
        ethers.keccak256(ethers.toUtf8Bytes("fingerprint2")),
      ];
      const categories = [0, 1];
      const royalties = [1000, 1500];

      const tokenIds = await copyrightRegistry.batchMintIPNFT.staticCall(
        recipients,
        metadataURIs,
        contentHashes,
        aiFingerprints,
        categories,
        royalties
      );

      await copyrightRegistry.batchMintIPNFT(
        recipients,
        metadataURIs,
        contentHashes,
        aiFingerprints,
        categories,
        royalties
      );

      expect(tokenIds.length).to.equal(2);
      expect(await copyrightRegistry.ownerOf(tokenIds[0])).to.equal(creator.address);
      expect(await copyrightRegistry.ownerOf(tokenIds[1])).to.equal(buyer.address);
    });
  });

  describe("IP Verification", function () {
    it("Should verify IP-NFT", async function () {
      await copyrightRegistry.mintIPNFT(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      await expect(copyrightRegistry.verifyIP(1))
        .to.emit(copyrightRegistry, "IPVerified")
        .withArgs(1, owner.address);

      const metadata = await copyrightRegistry.getIPMetadata(1);
      expect(metadata.isVerified).to.be.true;
    });
  });

  describe("Royalty Management", function () {
    beforeEach(async function () {
      await copyrightRegistry.mintIPNFT(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );
    });

    it("Should update royalty configuration", async function () {
      const newRoyalty = 1500; // 15%
      const newRecipient = buyer.address;

      await expect(
        copyrightRegistry.connect(creator).updateRoyalty(1, newRoyalty, newRecipient)
      )
        .to.emit(copyrightRegistry, "RoyaltyUpdated")
        .withArgs(1, newRoyalty, newRecipient);

      const metadata = await copyrightRegistry.getIPMetadata(1);
      expect(metadata.royaltyPercentage).to.equal(newRoyalty);
      expect(metadata.royaltyRecipient).to.equal(newRecipient);
    });

    it("Should return correct royalty info (ERC-2981)", async function () {
      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await copyrightRegistry.royaltyInfo(1, salePrice);

      expect(receiver).to.equal(creator.address);
      expect(royaltyAmount).to.equal(ethers.parseEther("0.1")); // 10% of 1 ETH
    });

    it("Should only allow owner to update royalty", async function () {
      await expect(
        copyrightRegistry.connect(buyer).updateRoyalty(1, 1500, buyer.address)
      ).to.be.revertedWith("Not token owner");
    });
  });

  describe("Content Discovery", function () {
    it("Should check if content is registered", async function () {
      expect(await copyrightRegistry.isContentRegistered(mockMetadata.contentHash)).to.be.false;

      await copyrightRegistry.mintIPNFT(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      expect(await copyrightRegistry.isContentRegistered(mockMetadata.contentHash)).to.be.true;
    });

    it("Should find similar content by fingerprint", async function () {
      await copyrightRegistry.mintIPNFT(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      const similarTokens = await copyrightRegistry.findSimilarContent(mockMetadata.aiFingerprint);
      expect(similarTokens.length).to.equal(1);
      expect(similarTokens[0]).to.equal(1);
    });

    it("Should get creator's tokens", async function () {
      await copyrightRegistry.mintIPNFT(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      const contentHash2 = ethers.keccak256(ethers.toUtf8Bytes("content2"));
      await copyrightRegistry.mintIPNFT(
        creator.address,
        "ipfs://QmTest2",
        contentHash2,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      const creatorTokens = await copyrightRegistry.getCreatorTokens(creator.address);
      expect(creatorTokens.length).to.equal(2);
    });
  });
});
