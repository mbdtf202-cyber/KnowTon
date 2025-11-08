// SPDX-License-Identifier: MIT
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

/**
 * Integer Overflow/Underflow Protection Tests
 * Verifies that Solidity 0.8+ automatic overflow protection works
 */
describe("Security: Integer Overflow/Underflow Tests", function () {
  let owner: Signer;
  let tester: Contract;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    
    const IntegerOverflowTester = await ethers.getContractFactory("IntegerOverflowTester");
    tester = await IntegerOverflowTester.deploy();
  });

  describe("Addition Overflow Protection", function () {
    it("should revert on uint256 addition overflow", async function () {
      const maxUint256 = ethers.MaxUint256;
      const one = 1n;
      
      await expect(
        tester.testAdditionOverflow(maxUint256, one)
      ).to.be.reverted;
    });

    it("should allow safe addition", async function () {
      const a = 100n;
      const b = 200n;
      
      const result = await tester.testAdditionOverflow(a, b);
      expect(result).to.equal(300n);
    });

    it("should handle edge case near max value", async function () {
      const maxUint256 = ethers.MaxUint256;
      const zero = 0n;
      
      const result = await tester.testAdditionOverflow(maxUint256, zero);
      expect(result).to.equal(maxUint256);
    });
  });

  describe("Subtraction Underflow Protection", function () {
    it("should revert on uint256 subtraction underflow", async function () {
      const zero = 0n;
      const one = 1n;
      
      await expect(
        tester.testSubtractionUnderflow(zero, one)
      ).to.be.reverted;
    });

    it("should allow safe subtraction", async function () {
      const a = 300n;
      const b = 100n;
      
      const result = await tester.testSubtractionUnderflow(a, b);
      expect(result).to.equal(200n);
    });

    it("should handle subtraction to zero", async function () {
      const a = 100n;
      const b = 100n;
      
      const result = await tester.testSubtractionUnderflow(a, b);
      expect(result).to.equal(0n);
    });
  });

  describe("Multiplication Overflow Protection", function () {
    it("should revert on uint256 multiplication overflow", async function () {
      const maxUint256 = ethers.MaxUint256;
      const two = 2n;
      
      await expect(
        tester.testMultiplicationOverflow(maxUint256, two)
      ).to.be.reverted;
    });

    it("should allow safe multiplication", async function () {
      const a = 100n;
      const b = 200n;
      
      const result = await tester.testMultiplicationOverflow(a, b);
      expect(result).to.equal(20000n);
    });

    it("should handle multiplication by zero", async function () {
      const maxUint256 = ethers.MaxUint256;
      const zero = 0n;
      
      const result = await tester.testMultiplicationOverflow(maxUint256, zero);
      expect(result).to.equal(0n);
    });

    it("should handle multiplication by one", async function () {
      const value = 12345n;
      const one = 1n;
      
      const result = await tester.testMultiplicationOverflow(value, one);
      expect(result).to.equal(value);
    });
  });

  describe("Unchecked Operations", function () {
    it("should allow overflow in unchecked block", async function () {
      const maxUint256 = ethers.MaxUint256;
      const one = 1n;
      
      // Unchecked addition should wrap around
      const result = await tester.testUncheckedAddition(maxUint256, one);
      expect(result).to.equal(0n);
    });

    it("should wrap around correctly in unchecked", async function () {
      const maxUint256 = ethers.MaxUint256;
      const ten = 10n;
      
      const result = await tester.testUncheckedAddition(maxUint256, ten);
      expect(result).to.equal(9n);
    });
  });

  describe("Contract-Specific Overflow Tests", function () {
    let copyrightRegistry: Contract;
    let royaltyDistributor: Contract;
    let ipBond: Contract;

    beforeEach(async function () {
      const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistrySimple");
      copyrightRegistry = await CopyrightRegistry.deploy();
      await copyrightRegistry.initialize();

      const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributor");
      royaltyDistributor = await RoyaltyDistributor.deploy();
      await royaltyDistributor.initialize();

      const IPBond = await ethers.getContractFactory("IPBondSimple");
      ipBond = await IPBond.deploy();
      await ipBond.initialize();
    });

    it("should prevent royalty percentage overflow", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      await copyrightRegistry.grantRole(MINTER_ROLE, await owner.getAddress());

      const contentHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
      const fingerprint = ethers.keccak256(ethers.toUtf8Bytes("fingerprint"));
      
      // Try to set royalty > 50% (5000 basis points)
      await expect(
        copyrightRegistry.registerIP(
          await owner.getAddress(),
          "ipfs://metadata",
          contentHash,
          fingerprint,
          0,
          10001 // > 100%
        )
      ).to.be.revertedWith("Royalty too high");
    });

    it("should prevent beneficiary percentage overflow", async function () {
      const beneficiaries = [
        {
          recipient: await owner.getAddress(),
          percentage: 10001 // > 100%
        }
      ];
      
      await expect(
        royaltyDistributor.configureRoyalty(1, beneficiaries)
      ).to.be.revertedWith("Total must be 100%");
    });

    it("should prevent bond allocation overflow", async function () {
      const allocations = [
        ethers.parseEther("100"),
        ethers.parseEther("50"),
        ethers.parseEther("51") // Total > totalValue
      ];
      const apys = [500, 1000, 1500];
      
      await expect(
        ipBond.issueBond(
          "BOND-001",
          1,
          ethers.parseEther("200"),
          Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
          allocations,
          apys
        )
      ).to.be.revertedWith("Invalid allocations");
    });

    it("should handle large token ID increments safely", async function () {
      const MINTER_ROLE = await copyrightRegistry.MINTER_ROLE();
      await copyrightRegistry.grantRole(MINTER_ROLE, await owner.getAddress());

      // Mint multiple tokens to test counter
      for (let i = 0; i < 10; i++) {
        const contentHash = ethers.keccak256(ethers.toUtf8Bytes(`content-${i}`));
        const fingerprint = ethers.keccak256(ethers.toUtf8Bytes(`fingerprint-${i}`));
        
        await copyrightRegistry.registerIP(
          await owner.getAddress(),
          `ipfs://metadata-${i}`,
          contentHash,
          fingerprint,
          0,
          1000
        );
      }
      
      // Verify counter incremented correctly
      const balance = await copyrightRegistry.balanceOf(await owner.getAddress());
      expect(balance).to.equal(10);
    });
  });

  describe("Edge Cases and Boundary Values", function () {
    it("should handle max uint256 correctly", async function () {
      const maxUint256 = ethers.MaxUint256;
      const zero = 0n;
      
      const result = await tester.testAdditionOverflow(maxUint256, zero);
      expect(result).to.equal(maxUint256);
    });

    it("should handle min uint256 (zero) correctly", async function () {
      const zero = 0n;
      const one = 1n;
      
      const result = await tester.testAdditionOverflow(zero, one);
      expect(result).to.equal(1n);
    });

    it("should handle large multiplications safely", async function () {
      const large1 = ethers.parseEther("1000000"); // 1M ETH
      const large2 = 1000n;
      
      // This should work
      const result = await tester.testMultiplicationOverflow(large1, large2);
      expect(result).to.equal(ethers.parseEther("1000000000")); // 1B ETH
    });

    it("should detect overflow in large multiplications", async function () {
      const veryLarge = ethers.parseEther("1000000000000000"); // 1 quadrillion ETH
      const multiplier = 1000000n;
      
      // This should overflow
      await expect(
        tester.testMultiplicationOverflow(veryLarge, multiplier)
      ).to.be.reverted;
    });
  });
});
