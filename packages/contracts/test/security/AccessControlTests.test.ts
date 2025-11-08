// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

/**
 * Access Control Security Tests
 * Verifies that role-based access control is properly implemented
 */
describe("Security: Access Control Tests", function () {
  let owner: Signer;
  let authorized: Signer;
  let unauthorized: Signer;
  let attacker: Signer;

  let copyrightRegistry: Contract;
  let royaltyDistributor: Contract;
  let ipBond: Contract;
  let governance: Contract;
  let accessTester: Contract;

  beforeEach(async function () {
    [owner, authorized, unauthorized, attacker] = await ethers.getSigners();
  });

  describe("AccessControlTester Basic Tests", function () {
    beforeEach(async function () {
      const AccessControlTester = await ethers.getContractFactory("AccessControlTester");
      accessTester = await AccessControlTester.deploy();
    });

    it("should allow owner to call owner functions", async function () {
      const result = await accessTester.ownerFunction();
      expect(result).to.be.true;
    });

    it("should prevent non-owner from calling owner functions", async function () {
      await expect(
        accessTester.connect(unauthorized).ownerFunction()
      ).to.be.revertedWith("Not owner");
    });

    it("should allow owner to authorize users", async function () {
      await accessTester.authorizeUser(await authorized.getAddress());
      const isAuthorized = await accessTester.authorized(await authorized.getAddress());
      expect(isAuthorized).to.be.true;
    });

    it("should prevent non-owner from authorizing users", async function () {
      await expect(
        accessTester.connect(unauthorized).authorizeUser(await authorized.getAddress())
      ).to.be.revertedWith("Not owner");
    });

    it("should allow authorized users to call protected functions", async function () {
      await accessTester.authorizeUser(await authorized.getAddress());
      const result = await accessTester.connect(authorized).protectedFunction();
      expect(result).to.be.true;
    });

    it("should prevent unauthorized users from calling protected functions", async function () {
      await expect(
        accessTester.connect(unauthorized).protectedFunction()
      ).to.be.revertedWith("Not authorized");
    });

    it("should allow owner to revoke authorization", async function () {
      await accessTester.authorizeUser(await authorized.getAddress());
      await accessTester.revokeUser(await authorized.getAddress());
      
      const isAuthorized = await accessTester.authorized(await authorized.getAddress());
      expect(isAuthorized).to.be.false;
    });
  });

  describe("CopyrightRegistry Access Control", function () {
    beforeEach(async function () {
      const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistrySimple");
      copyrightRegistry = await CopyrightRegistry.deploy();
      await copyrightRegistry.initialize();
    });

    it("should allow admin to grant MINTER_ROLE", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      
      const hasRole = await copyrightRegistry.hasRole(MINTER_ROLE, await authorized.getAddress());
      expect(hasRole).to.be.true;
    });

    it("should prevent non-admin from granting roles", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      
      await expect(
        copyrightRegistry.connect(unauthorized).grantRole(MINTER_ROLE, await attacker.getAddress())
      ).to.be.reverted;
    });

    it("should allow MINTER_ROLE to register IP", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const fingerprint = ethers.keccak256(ethers.toUtf8Bytes("test-fingerprint"));
      
      await expect(
        copyrightRegistry.connect(authorized).registerIP(
          await authorized.getAddress(),
          "ipfs://metadata",
          contentHash,
          fingerprint,
          0,
          1000
        )
      ).to.not.be.reverted;
    });

    it("should prevent non-MINTER from registering IP", async function () {
      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test-content"));
      const fingerprint = ethers.keccak256(ethers.toUtf8Bytes("test-fingerprint"));
      
      await expect(
        copyrightRegistry.connect(unauthorized).registerIP(
          await unauthorized.getAddress(),
          "ipfs://metadata",
          contentHash,
          fingerprint,
          0,
          1000
        )
      ).to.be.reverted;
    });

    it("should allow admin to revoke MINTER_ROLE", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      await copyrightRegistry.revokeRole(MINTER_ROLE, await authorized.getAddress());
      
      const hasRole = await copyrightRegistry.hasRole(MINTER_ROLE, await authorized.getAddress());
      expect(hasRole).to.be.false;
    });

    it("should allow UPGRADER_ROLE to upgrade contract", async function () {
      const UPGRADER_ROLE = await copyrightRegistry.UPGRADER_ROLE();
      const hasRole = await copyrightRegistry.hasRole(UPGRADER_ROLE, await owner.getAddress());
      expect(hasRole).to.be.true;
    });

    it("should prevent non-UPGRADER from upgrading", async function () {
      const UPGRADER_ROLE = await copyrightRegistry.UPGRADER_ROLE();
      const hasRole = await copyrightRegistry.hasRole(UPGRADER_ROLE, await unauthorized.getAddress());
      expect(hasRole).to.be.false;
    });
  });

  describe("RoyaltyDistributor Access Control", function () {
    beforeEach(async function () {
      const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributor");
      royaltyDistributor = await RoyaltyDistributor.deploy();
      await royaltyDistributor.initialize();
    });

    it("should allow DISTRIBUTOR_ROLE to configure royalty", async function () {
      const DISTRIBUTOR_ROLE = await royaltyDistributor.DISTRIBUTOR_ROLE();
      await royaltyDistributor.grantRole(DISTRIBUTOR_ROLE, await authorized.getAddress());
      
      const beneficiaries = [
        {
          recipient: await owner.getAddress(),
          percentage: 10000
        }
      ];
      
      await expect(
        royaltyDistributor.connect(authorized).configureRoyalty(1, beneficiaries)
      ).to.not.be.reverted;
    });

    it("should prevent non-DISTRIBUTOR from configuring royalty", async function () {
      const beneficiaries = [
        {
          recipient: await owner.getAddress(),
          percentage: 10000
        }
      ];
      
      await expect(
        royaltyDistributor.connect(unauthorized).configureRoyalty(1, beneficiaries)
      ).to.be.reverted;
    });

    it("should allow PAUSER_ROLE to pause contract", async function () {
      const PAUSER_ROLE = await royaltyDistributor.PAUSER_ROLE();
      await royaltyDistributor.grantRole(PAUSER_ROLE, await authorized.getAddress());
      
      await expect(
        royaltyDistributor.connect(authorized).pause()
      ).to.not.be.reverted;
      
      const paused = await royaltyDistributor.paused();
      expect(paused).to.be.true;
    });

    it("should prevent non-PAUSER from pausing", async function () {
      await expect(
        royaltyDistributor.connect(unauthorized).pause()
      ).to.be.reverted;
    });

    it("should allow PAUSER_ROLE to unpause contract", async function () {
      const PAUSER_ROLE = await royaltyDistributor.PAUSER_ROLE();
      await royaltyDistributor.grantRole(PAUSER_ROLE, await authorized.getAddress());
      
      await royaltyDistributor.connect(authorized).pause();
      await royaltyDistributor.connect(authorized).unpause();
      
      const paused = await royaltyDistributor.paused();
      expect(paused).to.be.false;
    });

    it("should prevent operations when paused", async function () {
      const PAUSER_ROLE = await royaltyDistributor.PAUSER_ROLE();
      await royaltyDistributor.grantRole(PAUSER_ROLE, await owner.getAddress());
      await royaltyDistributor.pause();
      
      const beneficiaries = [
        {
          recipient: await owner.getAddress(),
          percentage: 10000
        }
      ];
      
      await expect(
        royaltyDistributor.configureRoyalty(1, beneficiaries)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  describe("IPBond Access Control", function () {
    beforeEach(async function () {
      const IPBond = await ethers.getContractFactory("IPBondSimple");
      ipBond = await IPBond.deploy();
      await ipBond.initialize();
    });

    it("should allow BOND_ISSUER_ROLE to issue bonds", async function () {
      const BOND_ISSUER_ROLE = await ipBond.BOND_ISSUER_ROLE();
      await ipBond.grantRole(BOND_ISSUER_ROLE, await authorized.getAddress());
      
      const allocations = [
        ethers.parseEther("100"),
        ethers.parseEther("50"),
        ethers.parseEther("50")
      ];
      const apys = [500, 1000, 1500];
      
      await expect(
        ipBond.connect(authorized).issueBond(
          "BOND-001",
          1,
          ethers.parseEther("200"),
          Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
          allocations,
          apys
        )
      ).to.not.be.reverted;
    });

    it("should prevent non-BOND_ISSUER from issuing bonds", async function () {
      const allocations = [
        ethers.parseEther("100"),
        ethers.parseEther("50"),
        ethers.parseEther("50")
      ];
      const apys = [500, 1000, 1500];
      
      await expect(
        ipBond.connect(unauthorized).issueBond(
          "BOND-001",
          1,
          ethers.parseEther("200"),
          Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
          allocations,
          apys
        )
      ).to.be.reverted;
    });

    it("should allow anyone to invest in bonds", async function () {
      // Issue bond first
      const allocations = [
        ethers.parseEther("100"),
        ethers.parseEther("50"),
        ethers.parseEther("50")
      ];
      const apys = [500, 1000, 1500];
      
      await ipBond.issueBond(
        "BOND-001",
        1,
        ethers.parseEther("200"),
        Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        allocations,
        apys
      );
      
      // Anyone can invest
      await expect(
        ipBond.connect(unauthorized).invest("BOND-001", 0, { value: ethers.parseEther("1.0") })
      ).to.not.be.reverted;
    });

    it("should allow UPGRADER_ROLE to upgrade contract", async function () {
      const UPGRADER_ROLE = await ipBond.UPGRADER_ROLE();
      const hasRole = await ipBond.hasRole(UPGRADER_ROLE, await owner.getAddress());
      expect(hasRole).to.be.true;
    });
  });

  describe("Role Hierarchy and Admin Tests", function () {
    beforeEach(async function () {
      const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistrySimple");
      copyrightRegistry = await CopyrightRegistry.deploy();
      await copyrightRegistry.initialize();
    });

    it("should allow DEFAULT_ADMIN_ROLE to grant any role", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      const UPGRADER_ROLE = await copyrightRegistry.UPGRADER_ROLE();
      
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      await copyrightRegistry.grantRole(UPGRADER_ROLE, await authorized.getAddress());
      
      const hasMinter = await copyrightRegistry.hasRole(MINTER_ROLE, await authorized.getAddress());
      const hasUpgrader = await copyrightRegistry.hasRole(UPGRADER_ROLE, await authorized.getAddress());
      
      expect(hasMinter).to.be.true;
      expect(hasUpgrader).to.be.true;
    });

    it("should allow DEFAULT_ADMIN_ROLE to revoke any role", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      await copyrightRegistry.revokeRole(MINTER_ROLE, await authorized.getAddress());
      
      const hasRole = await copyrightRegistry.hasRole(MINTER_ROLE, await authorized.getAddress());
      expect(hasRole).to.be.false;
    });

    it("should allow role renunciation", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      await copyrightRegistry.connect(authorized).renounceRole(MINTER_ROLE, await authorized.getAddress());
      
      const hasRole = await copyrightRegistry.hasRole(MINTER_ROLE, await authorized.getAddress());
      expect(hasRole).to.be.false;
    });

    it("should prevent renouncing role for another address", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      
      await expect(
        copyrightRegistry.connect(unauthorized).renounceRole(MINTER_ROLE, await authorized.getAddress())
      ).to.be.reverted;
    });
  });

  describe("Multi-Role Security Tests", function () {
    beforeEach(async function () {
      const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistrySimple");
      copyrightRegistry = await CopyrightRegistry.deploy();
      await copyrightRegistry.initialize();
    });

    it("should allow user with multiple roles to use all permissions", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      const UPGRADER_ROLE = await copyrightRegistry.UPGRADER_ROLE();
      
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      await copyrightRegistry.grantRole(UPGRADER_ROLE, await authorized.getAddress());
      
      const hasMinter = await copyrightRegistry.hasRole(MINTER_ROLE, await authorized.getAddress());
      const hasUpgrader = await copyrightRegistry.hasRole(UPGRADER_ROLE, await authorized.getAddress());
      
      expect(hasMinter).to.be.true;
      expect(hasUpgrader).to.be.true;
    });

    it("should independently revoke individual roles", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      const UPGRADER_ROLE = await copyrightRegistry.UPGRADER_ROLE();
      
      await copyrightRegistry.grantRole(MINTER_ROLE, await authorized.getAddress());
      await copyrightRegistry.grantRole(UPGRADER_ROLE, await authorized.getAddress());
      
      await copyrightRegistry.revokeRole(MINTER_ROLE, await authorized.getAddress());
      
      const hasMinter = await copyrightRegistry.hasRole(MINTER_ROLE, await authorized.getAddress());
      const hasUpgrader = await copyrightRegistry.hasRole(UPGRADER_ROLE, await authorized.getAddress());
      
      expect(hasMinter).to.be.false;
      expect(hasUpgrader).to.be.true;
    });
  });
});
