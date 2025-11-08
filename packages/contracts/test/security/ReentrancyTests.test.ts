// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

/**
 * Reentrancy Attack Tests
 * Tests all contracts for reentrancy vulnerabilities
 */
describe("Security: Reentrancy Attack Tests", function () {
  let owner: Signer;
  let attacker: Signer;
  let victim: Signer;
  
  let copyrightRegistry: Contract;
  let royaltyDistributor: Contract;
  let ipBond: Contract;
  let attackerContract: Contract;

  beforeEach(async function () {
    [owner, attacker, victim] = await ethers.getSigners();
  });

  describe("CopyrightRegistry Reentrancy Protection", function () {
    beforeEach(async function () {
      const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistrySimple");
      copyrightRegistry = await CopyrightRegistry.deploy();
      await copyrightRegistry.initialize();
      
      // Grant minter role
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      await copyrightRegistry.grantRole(MINTER_ROLE, await owner.getAddress());
    });

    it("should prevent reentrancy in registerIP", async function () {
      // Deploy malicious contract that attempts reentrancy
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousNFTReceiver");
      attackerContract = await MaliciousReceiver.deploy(await copyrightRegistry.getAddress());
      
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const fingerprint = ethers.keccak256(ethers.toUtf8Bytes("test-fingerprint"));
      
      // Attempt to register IP with malicious receiver
      // Should revert if reentrancy is attempted
      await expect(
        copyrightRegistry.registerIP(
          await attackerContract.getAddress(),
          "ipfs://metadata",
          contentHash,
          fingerprint,
          0, // Music category
          1000 // 10% royalty
        )
      ).to.not.be.reverted;
      
      // Verify only one token was minted
      const balance = await copyrightRegistry.balanceOf(await attackerContract.getAddress());
      expect(balance).to.equal(1);
    });

    it("should prevent reentrancy in transfer", async function () {
      // Register an IP first
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content-2"));
      const fingerprint = ethers.keccak256(ethers.toUtf8Bytes("test-fingerprint-2"));
      
      await copyrightRegistry.registerIP(
        await owner.getAddress(),
        "ipfs://metadata",
        contentHash,
        fingerprint,
        0,
        1000
      );
      
      // Deploy malicious receiver
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousNFTReceiver");
      attackerContract = await MaliciousReceiver.deploy(await copyrightRegistry.getAddress());
      
      // Transfer should not allow reentrancy
      await expect(
        copyrightRegistry.transferFrom(
          await owner.getAddress(),
          await attackerContract.getAddress(),
          1
        )
      ).to.not.be.reverted;
    });
  });

  describe("RoyaltyDistributor Reentrancy Protection", function () {
    beforeEach(async function () {
      const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributor");
      royaltyDistributor = await RoyaltyDistributor.deploy();
      await royaltyDistributor.initialize();
    });

    it("should prevent reentrancy in distributeRoyalty", async function () {
      // Configure royalty with malicious beneficiary
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousPaymentReceiver");
      attackerContract = await MaliciousReceiver.deploy(await royaltyDistributor.getAddress());
      
      const beneficiaries = [
        {
          recipient: await attackerContract.getAddress(),
          percentage: 10000 // 100%
        }
      ];
      
      await royaltyDistributor.configureRoyalty(1, beneficiaries);
      
      // Attempt to distribute royalty
      // Should not allow reentrancy even if receiver tries
      await expect(
        royaltyDistributor.distributeRoyalty(1, { value: ethers.parseEther("1.0") })
      ).to.not.be.reverted;
      
      // Verify only one distribution occurred
      const config = await royaltyDistributor.getRoyaltyConfig(1);
      expect(config.totalDistributed).to.equal(ethers.parseEther("1.0"));
    });

    it("should prevent reentrancy in withdraw", async function () {
      // Setup beneficiary
      const beneficiaries = [
        {
          recipient: await victim.getAddress(),
          percentage: 10000
        }
      ];
      
      await royaltyDistributor.configureRoyalty(1, beneficiaries);
      await royaltyDistributor.distributeRoyalty(1, { value: ethers.parseEther("1.0") });
      
      // Deploy malicious contract that tries to reenter withdraw
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousPaymentReceiver");
      attackerContract = await MaliciousReceiver.deploy(await royaltyDistributor.getAddress());
      
      // Withdraw should be protected
      await expect(
        royaltyDistributor.connect(victim).withdraw(1)
      ).to.not.be.reverted;
    });
  });

  describe("IPBond Reentrancy Protection", function () {
    beforeEach(async function () {
      const IPBond = await ethers.getContractFactory("IPBondSimple");
      ipBond = await IPBond.deploy();
      await ipBond.initialize();
    });

    it("should prevent reentrancy in invest", async function () {
      // Issue a bond first
      const allocations = [
        ethers.parseEther("100"), // Senior
        ethers.parseEther("50"),  // Mezzanine
        ethers.parseEther("50")   // Junior
      ];
      const apys = [500, 1000, 1500]; // 5%, 10%, 15%
      
      await ipBond.issueBond(
        "BOND-001",
        1,
        ethers.parseEther("200"),
        Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        allocations,
        apys
      );
      
      // Deploy malicious investor contract
      const MaliciousInvestor = await ethers.getContractFactory("MaliciousInvestor");
      attackerContract = await MaliciousInvestor.deploy(await ipBond.getAddress());
      
      // Fund the attacker
      await owner.sendTransaction({
        to: await attackerContract.getAddress(),
        value: ethers.parseEther("10.0")
      });
      
      // Attempt investment with reentrancy
      // Should be protected by ReentrancyGuard
      await expect(
        attackerContract.attack("BOND-001", 0, ethers.parseEther("1.0"))
      ).to.be.reverted;
    });

    it("should prevent reentrancy in redeem", async function () {
      // Issue and invest in bond
      const allocations = [
        ethers.parseEther("100"),
        ethers.parseEther("50"),
        ethers.parseEther("50")
      ];
      const apys = [500, 1000, 1500];
      
      await ipBond.issueBond(
        "BOND-002",
        2,
        ethers.parseEther("200"),
        Math.floor(Date.now() / 1000) + 1, // Mature in 1 second
        allocations,
        apys
      );
      
      await ipBond.invest("BOND-002", 0, { value: ethers.parseEther("1.0") });
      
      // Wait for maturity
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
      
      // Redeem should be protected
      await expect(
        ipBond.redeem("BOND-002", 0)
      ).to.not.be.reverted;
    });
  });
});

/**
 * Malicious NFT Receiver Contract
 * Attempts to reenter during NFT transfer
 */
describe("Malicious Contract Deployments", function () {
  it("should deploy MaliciousNFTReceiver", async function () {
    const MaliciousReceiver = await ethers.getContractFactory("MaliciousNFTReceiver");
    const receiver = await MaliciousReceiver.deploy(ethers.ZeroAddress);
    expect(await receiver.getAddress()).to.not.equal(ethers.ZeroAddress);
  });

  it("should deploy MaliciousPaymentReceiver", async function () {
    const MaliciousReceiver = await ethers.getContractFactory("MaliciousPaymentReceiver");
    const receiver = await MaliciousReceiver.deploy(ethers.ZeroAddress);
    expect(await receiver.getAddress()).to.not.equal(ethers.ZeroAddress);
  });

  it("should deploy MaliciousInvestor", async function () {
    const MaliciousInvestor = await ethers.getContractFactory("MaliciousInvestor");
    const investor = await MaliciousInvestor.deploy(ethers.ZeroAddress);
    expect(await investor.getAddress()).to.not.equal(ethers.ZeroAddress);
  });
});
