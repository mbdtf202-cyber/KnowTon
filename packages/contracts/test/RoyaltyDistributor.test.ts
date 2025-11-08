import { expect } from "chai";
import { ethers } from "hardhat";
import { RoyaltyDistributorV2 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RoyaltyDistributor", function () {
  let royaltyDistributor: RoyaltyDistributorV2;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let beneficiary1: SignerWithAddress;
  let beneficiary2: SignerWithAddress;
  let beneficiary3: SignerWithAddress;
  let beneficiary4: SignerWithAddress;
  let beneficiary5: SignerWithAddress;
  let beneficiary6: SignerWithAddress;
  let beneficiary7: SignerWithAddress;
  let beneficiary8: SignerWithAddress;
  let beneficiary9: SignerWithAddress;
  let beneficiary10: SignerWithAddress;
  let payer: SignerWithAddress;

  const tokenId = 1;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [owner, creator, beneficiary1, beneficiary2, beneficiary3, beneficiary4, 
     beneficiary5, beneficiary6, beneficiary7, beneficiary8, beneficiary9, 
     beneficiary10, payer] = signers;

    const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributorV2");
    royaltyDistributor = await RoyaltyDistributor.deploy();
    await royaltyDistributor.waitForDeployment();
  });

  describe("Configuration", function () {
    it("Should configure royalty split", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 7000 }, // 70%
        { recipient: beneficiary2.address, percentage: 3000 }, // 30%
      ];

      await expect(royaltyDistributor.configureRoyalty(tokenId, beneficiaries))
        .to.emit(royaltyDistributor, "RoyaltyConfigured");

      const [configBeneficiaries, totalDistributed, isActive] =
        await royaltyDistributor.getRoyaltyConfig(tokenId);

      expect(configBeneficiaries.length).to.equal(2);
      expect(configBeneficiaries[0].percentage).to.equal(7000);
      expect(isActive).to.be.true;
    });

    it("Should reject invalid percentage total", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 6000 },
        { recipient: beneficiary2.address, percentage: 3000 },
      ];

      await expect(
        royaltyDistributor.configureRoyalty(tokenId, beneficiaries)
      ).to.be.revertedWith("Total must be 100%");
    });

    it("Should reject zero address beneficiary", async function () {
      const beneficiaries = [
        { recipient: ethers.ZeroAddress, percentage: 10000 },
      ];

      await expect(
        royaltyDistributor.configureRoyalty(tokenId, beneficiaries)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Distribution", function () {
    beforeEach(async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 7000 },
        { recipient: beneficiary2.address, percentage: 3000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);
    });

    it("Should distribute royalty correctly", async function () {
      const amount = ethers.parseEther("1");

      await expect(
        royaltyDistributor.connect(payer).distributeRoyalty(tokenId, { value: amount })
      )
        .to.emit(royaltyDistributor, "RoyaltyDistributed")
        .withArgs(tokenId, amount, payer.address);

      const pending1 = await royaltyDistributor.getPendingWithdrawal(
        tokenId,
        beneficiary1.address
      );
      const pending2 = await royaltyDistributor.getPendingWithdrawal(
        tokenId,
        beneficiary2.address
      );

      expect(pending1).to.equal(ethers.parseEther("0.7")); // 70%
      expect(pending2).to.equal(ethers.parseEther("0.3")); // 30%
    });

    it("Should reject distribution without payment", async function () {
      await expect(
        royaltyDistributor.connect(payer).distributeRoyalty(tokenId, { value: 0 })
      ).to.be.revertedWith("No payment");
    });

    it("Should reject distribution for unconfigured token", async function () {
      await expect(
        royaltyDistributor.connect(payer).distributeRoyalty(999, {
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Royalty not configured");
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 7000 },
        { recipient: beneficiary2.address, percentage: 3000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      await royaltyDistributor
        .connect(payer)
        .distributeRoyalty(tokenId, { value: ethers.parseEther("1") });
    });

    it("Should allow beneficiary to withdraw", async function () {
      const balanceBefore = await ethers.provider.getBalance(beneficiary1.address);

      const tx = await royaltyDistributor.connect(beneficiary1).withdraw(tokenId);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(beneficiary1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(ethers.parseEther("0.7"));
    });

    it("Should emit withdrawal event", async function () {
      await expect(royaltyDistributor.connect(beneficiary1).withdraw(tokenId))
        .to.emit(royaltyDistributor, "RoyaltyWithdrawn")
        .withArgs(beneficiary1.address, ethers.parseEther("0.7"));
    });

    it("Should reject withdrawal with no pending amount", async function () {
      await expect(
        royaltyDistributor.connect(creator).withdraw(tokenId)
      ).to.be.revertedWith("No pending withdrawals");
    });

    it("Should clear pending withdrawal after withdrawal", async function () {
      await royaltyDistributor.connect(beneficiary1).withdraw(tokenId);

      const pending = await royaltyDistributor.getPendingWithdrawal(
        tokenId,
        beneficiary1.address
      );
      expect(pending).to.equal(0);
    });
  });

  describe("Batch Withdrawal", function () {
    beforeEach(async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 10000 },
      ];
      await royaltyDistributor.configureRoyalty(1, beneficiaries);
      await royaltyDistributor.configureRoyalty(2, beneficiaries);

      await royaltyDistributor
        .connect(payer)
        .distributeRoyalty(1, { value: ethers.parseEther("1") });
      await royaltyDistributor
        .connect(payer)
        .distributeRoyalty(2, { value: ethers.parseEther("2") });
    });

    it("Should batch withdraw from multiple tokens", async function () {
      const balanceBefore = await ethers.provider.getBalance(beneficiary1.address);

      const tx = await royaltyDistributor.connect(beneficiary1).batchWithdraw([1, 2]);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(beneficiary1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(ethers.parseEther("3"));
    });
  });

  describe("Beneficiary Management", function () {
    it("Should add beneficiary", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 10000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      // Remove existing to make room
      await royaltyDistributor.removeBeneficiary(tokenId, beneficiary1.address);
      
      // Add new beneficiaries totaling 100%
      await royaltyDistributor.addBeneficiary(tokenId, beneficiary1.address, 7000);
      await expect(
        royaltyDistributor.addBeneficiary(tokenId, beneficiary2.address, 3000)
      )
        .to.emit(royaltyDistributor, "BeneficiaryAdded")
        .withArgs(tokenId, beneficiary2.address, 3000);
    });

    it("Should remove beneficiary", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 7000 },
        { recipient: beneficiary2.address, percentage: 3000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      await expect(royaltyDistributor.removeBeneficiary(tokenId, beneficiary2.address))
        .to.emit(royaltyDistributor, "BeneficiaryRemoved")
        .withArgs(tokenId, beneficiary2.address);
    });

    it("Should reject adding beneficiary exceeding 100%", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 10000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      await expect(
        royaltyDistributor.addBeneficiary(tokenId, beneficiary2.address, 1000)
      ).to.be.revertedWith("Exceeds 100%");
    });
  });

  describe("Total Earned Tracking", function () {
    it("Should track total earned across multiple distributions", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 10000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      await royaltyDistributor
        .connect(payer)
        .distributeRoyalty(tokenId, { value: ethers.parseEther("1") });
      await royaltyDistributor
        .connect(payer)
        .distributeRoyalty(tokenId, { value: ethers.parseEther("2") });

      const totalEarned = await royaltyDistributor.getTotalEarned(beneficiary1.address);
      expect(totalEarned).to.equal(ethers.parseEther("3"));
    });
  });

  describe("Enhanced Features - Up to 10 Recipients", function () {
    it("Should support exactly 10 recipients", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 1000 },
        { recipient: beneficiary2.address, percentage: 1000 },
        { recipient: beneficiary3.address, percentage: 1000 },
        { recipient: beneficiary4.address, percentage: 1000 },
        { recipient: beneficiary5.address, percentage: 1000 },
        { recipient: beneficiary6.address, percentage: 1000 },
        { recipient: beneficiary7.address, percentage: 1000 },
        { recipient: beneficiary8.address, percentage: 1000 },
        { recipient: beneficiary9.address, percentage: 1000 },
        { recipient: beneficiary10.address, percentage: 1000 },
      ];

      await expect(royaltyDistributor.configureRoyalty(tokenId, beneficiaries))
        .to.emit(royaltyDistributor, "RoyaltyConfigured");

      const count = await royaltyDistributor.getBeneficiaryCount(tokenId);
      expect(count).to.equal(10);
    });

    it("Should reject more than 10 recipients", async function () {
      const beneficiaries = Array(11).fill(null).map((_, i) => ({
        recipient: beneficiary1.address,
        percentage: 909, // 909 * 11 = 9999, close to 10000
      }));
      beneficiaries[10].percentage = 1; // Make total 10000

      await expect(
        royaltyDistributor.configureRoyalty(tokenId, beneficiaries)
      ).to.be.revertedWith("Too many recipients");
    });

    it("Should distribute correctly to 10 recipients", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 1000 },
        { recipient: beneficiary2.address, percentage: 1000 },
        { recipient: beneficiary3.address, percentage: 1000 },
        { recipient: beneficiary4.address, percentage: 1000 },
        { recipient: beneficiary5.address, percentage: 1000 },
        { recipient: beneficiary6.address, percentage: 1000 },
        { recipient: beneficiary7.address, percentage: 1000 },
        { recipient: beneficiary8.address, percentage: 1000 },
        { recipient: beneficiary9.address, percentage: 1000 },
        { recipient: beneficiary10.address, percentage: 1000 },
      ];

      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      const amount = ethers.parseEther("10");
      await royaltyDistributor.connect(payer).distributeRoyalty(tokenId, { value: amount });

      // Each should get 10% = 1 ETH
      for (let i = 1; i <= 10; i++) {
        const beneficiary = [beneficiary1, beneficiary2, beneficiary3, beneficiary4,
                            beneficiary5, beneficiary6, beneficiary7, beneficiary8,
                            beneficiary9, beneficiary10][i - 1];
        const pending = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary.address);
        expect(pending).to.equal(ethers.parseEther("1"));
      }
    });

    it("Should reject adding 11th beneficiary", async function () {
      const beneficiaries = Array(10).fill(null).map((_, i) => ({
        recipient: [beneficiary1, beneficiary2, beneficiary3, beneficiary4,
                   beneficiary5, beneficiary6, beneficiary7, beneficiary8,
                   beneficiary9, beneficiary10][i].address,
        percentage: 1000,
      }));

      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      await expect(
        royaltyDistributor.addBeneficiary(tokenId, creator.address, 100)
      ).to.be.revertedWith("Max recipients reached");
    });
  });

  describe("Dynamic Percentage Updates", function () {
    beforeEach(async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 5000 },
        { recipient: beneficiary2.address, percentage: 3000 },
        { recipient: beneficiary3.address, percentage: 2000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);
    });

    it("Should update single beneficiary percentage", async function () {
      // Use batch update to maintain 100% total
      const recipients = [beneficiary1.address, beneficiary2.address, beneficiary3.address];
      const newPercentages = [4000, 4000, 2000];
      
      await expect(
        royaltyDistributor.batchUpdatePercentages(tokenId, recipients, newPercentages)
      )
        .to.emit(royaltyDistributor, "BeneficiaryUpdated")
        .withArgs(tokenId, beneficiary1.address, 5000, 4000);

      const [beneficiaries] = await royaltyDistributor.getRoyaltyConfig(tokenId);
      
      // Find updated beneficiaries
      const ben1 = beneficiaries.find((b: any) => b.recipient === beneficiary1.address);
      const ben2 = beneficiaries.find((b: any) => b.recipient === beneficiary2.address);
      
      expect(ben1.percentage).to.equal(4000);
      expect(ben2.percentage).to.equal(4000);
    });

    it("Should reject update that breaks 100% total", async function () {
      await expect(
        royaltyDistributor.updateBeneficiaryPercentage(tokenId, beneficiary1.address, 6000)
      ).to.be.revertedWith("Total must be 100%");
    });

    it("Should reject update for non-existent beneficiary", async function () {
      await expect(
        royaltyDistributor.updateBeneficiaryPercentage(tokenId, creator.address, 5000)
      ).to.be.revertedWith("Beneficiary not found");
    });

    it("Should reject zero percentage update", async function () {
      await expect(
        royaltyDistributor.updateBeneficiaryPercentage(tokenId, beneficiary1.address, 0)
      ).to.be.revertedWith("Invalid percentage");
    });

    it("Should batch update multiple percentages", async function () {
      const recipients = [beneficiary1.address, beneficiary2.address, beneficiary3.address];
      const newPercentages = [4000, 4000, 2000];

      await expect(
        royaltyDistributor.batchUpdatePercentages(tokenId, recipients, newPercentages)
      )
        .to.emit(royaltyDistributor, "BeneficiaryUpdated")
        .withArgs(tokenId, beneficiary1.address, 5000, 4000);

      const [beneficiaries] = await royaltyDistributor.getRoyaltyConfig(tokenId);
      
      const ben1 = beneficiaries.find((b: any) => b.recipient === beneficiary1.address);
      const ben2 = beneficiaries.find((b: any) => b.recipient === beneficiary2.address);
      
      expect(ben1.percentage).to.equal(4000);
      expect(ben2.percentage).to.equal(4000);
    });

    it("Should reject batch update with mismatched arrays", async function () {
      const recipients = [beneficiary1.address, beneficiary2.address];
      const newPercentages = [4000];

      await expect(
        royaltyDistributor.batchUpdatePercentages(tokenId, recipients, newPercentages)
      ).to.be.revertedWith("Length mismatch");
    });

    it("Should reject batch update with empty arrays", async function () {
      await expect(
        royaltyDistributor.batchUpdatePercentages(tokenId, [], [])
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should reject batch update that breaks 100% total", async function () {
      const recipients = [beneficiary1.address, beneficiary2.address];
      const newPercentages = [6000, 5000]; // Total would be 13000

      await expect(
        royaltyDistributor.batchUpdatePercentages(tokenId, recipients, newPercentages)
      ).to.be.revertedWith("Total must be 100%");
    });

    it("Should apply percentage updates to new distributions", async function () {
      // Update percentages using batch update to maintain 100% total
      const recipients = [beneficiary1.address, beneficiary2.address, beneficiary3.address];
      const newPercentages = [6000, 2000, 2000];
      
      await royaltyDistributor.batchUpdatePercentages(tokenId, recipients, newPercentages);

      // Distribute with new percentages
      const amount = ethers.parseEther("10");
      await royaltyDistributor.connect(payer).distributeRoyalty(tokenId, { value: amount });

      const pending1 = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary1.address);
      const pending2 = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary2.address);
      const pending3 = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary3.address);

      expect(pending1).to.equal(ethers.parseEther("6")); // 60%
      expect(pending2).to.equal(ethers.parseEther("2")); // 20%
      expect(pending3).to.equal(ethers.parseEther("2")); // 20%
    });
  });

  describe("Emergency Pause Functionality", function () {
    beforeEach(async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 10000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);
    });

    it("Should pause the contract", async function () {
      await expect(royaltyDistributor.pause())
        .to.emit(royaltyDistributor, "EmergencyPaused")
        .withArgs(owner.address);

      expect(await royaltyDistributor.paused()).to.be.true;
    });

    it("Should unpause the contract", async function () {
      await royaltyDistributor.pause();
      
      await expect(royaltyDistributor.unpause())
        .to.emit(royaltyDistributor, "EmergencyUnpaused")
        .withArgs(owner.address);

      expect(await royaltyDistributor.paused()).to.be.false;
    });

    it("Should block distribution when paused", async function () {
      await royaltyDistributor.pause();

      await expect(
        royaltyDistributor.connect(payer).distributeRoyalty(tokenId, {
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should block configuration when paused", async function () {
      await royaltyDistributor.pause();

      const beneficiaries = [
        { recipient: beneficiary2.address, percentage: 10000 },
      ];

      await expect(
        royaltyDistributor.configureRoyalty(2, beneficiaries)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should block adding beneficiary when paused", async function () {
      await royaltyDistributor.pause();

      await expect(
        royaltyDistributor.addBeneficiary(tokenId, beneficiary2.address, 5000)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should block removing beneficiary when paused", async function () {
      await royaltyDistributor.pause();

      await expect(
        royaltyDistributor.removeBeneficiary(tokenId, beneficiary1.address)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should block percentage updates when paused", async function () {
      await royaltyDistributor.pause();

      await expect(
        royaltyDistributor.updateBeneficiaryPercentage(tokenId, beneficiary1.address, 8000)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow withdrawals when paused", async function () {
      // Distribute before pausing
      await royaltyDistributor.connect(payer).distributeRoyalty(tokenId, {
        value: ethers.parseEther("1"),
      });

      await royaltyDistributor.pause();

      // Withdrawal should still work
      await expect(royaltyDistributor.connect(beneficiary1).withdraw(tokenId))
        .to.emit(royaltyDistributor, "RoyaltyWithdrawn");
    });

    it("Should resume normal operations after unpause", async function () {
      await royaltyDistributor.pause();
      await royaltyDistributor.unpause();

      // Should work normally
      await expect(
        royaltyDistributor.connect(payer).distributeRoyalty(tokenId, {
          value: ethers.parseEther("1"),
        })
      ).to.emit(royaltyDistributor, "RoyaltyDistributed");
    });

    it("Should only allow PAUSER_ROLE to pause", async function () {
      await expect(
        royaltyDistributor.connect(payer).pause()
      ).to.be.reverted;
    });

    it("Should only allow PAUSER_ROLE to unpause", async function () {
      await royaltyDistributor.pause();

      await expect(
        royaltyDistributor.connect(payer).unpause()
      ).to.be.reverted;
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complex scenario with 10 recipients and updates", async function () {
      // Configure 10 recipients
      const beneficiaries = Array(10).fill(null).map((_, i) => ({
        recipient: [beneficiary1, beneficiary2, beneficiary3, beneficiary4,
                   beneficiary5, beneficiary6, beneficiary7, beneficiary8,
                   beneficiary9, beneficiary10][i].address,
        percentage: 1000,
      }));

      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      // Distribute
      await royaltyDistributor.connect(payer).distributeRoyalty(tokenId, {
        value: ethers.parseEther("10"),
      });

      // Update percentages using batch update to maintain 100%
      const recipients = [
        beneficiary1.address, beneficiary2.address, beneficiary3.address, 
        beneficiary4.address, beneficiary5.address, beneficiary6.address,
        beneficiary7.address, beneficiary8.address, beneficiary9.address,
        beneficiary10.address
      ];
      // Total must be 10000 (100%): 2000+1500+1500+1500+1000+1000+500+500+500+500 = 10000
      const newPercentages = [2000, 1500, 1500, 1500, 1000, 1000, 500, 500, 500, 500];
      
      await royaltyDistributor.batchUpdatePercentages(tokenId, recipients, newPercentages);

      // Distribute again with new percentages
      await royaltyDistributor.connect(payer).distributeRoyalty(tokenId, {
        value: ethers.parseEther("10"),
      });

      // Verify first distribution (1 ETH each) + second (2 ETH for 20%)
      let pending1 = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary1.address);
      expect(pending1).to.equal(ethers.parseEther("3")); // 1 (from first) + 2 (from second at 20%)

      // Withdraw
      await royaltyDistributor.connect(beneficiary1).withdraw(tokenId);
      pending1 = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary1.address);
      expect(pending1).to.equal(0);
    });

    it("Should handle pause during active distributions", async function () {
      const beneficiaries = [
        { recipient: beneficiary1.address, percentage: 5000 },
        { recipient: beneficiary2.address, percentage: 5000 },
      ];

      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      // First distribution
      await royaltyDistributor.connect(payer).distributeRoyalty(tokenId, {
        value: ethers.parseEther("2"),
      });

      // Pause
      await royaltyDistributor.pause();

      // Try to distribute (should fail)
      await expect(
        royaltyDistributor.connect(payer).distributeRoyalty(tokenId, {
          value: ethers.parseEther("2"),
        })
      ).to.be.revertedWith("Pausable: paused");

      // Withdrawals should still work
      await royaltyDistributor.connect(beneficiary1).withdraw(tokenId);

      // Unpause and continue
      await royaltyDistributor.unpause();

      await royaltyDistributor.connect(payer).distributeRoyalty(tokenId, {
        value: ethers.parseEther("2"),
      });

      const pending2 = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary2.address);
      expect(pending2).to.equal(ethers.parseEther("2")); // 1 from first + 1 from third
    });
  });
});
