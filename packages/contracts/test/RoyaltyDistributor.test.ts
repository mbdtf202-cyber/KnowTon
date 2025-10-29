import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { RoyaltyDistributor } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RoyaltyDistributor", function () {
  let royaltyDistributor: RoyaltyDistributor;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let beneficiary1: SignerWithAddress;
  let beneficiary2: SignerWithAddress;
  let payer: SignerWithAddress;

  const tokenId = 1;

  beforeEach(async function () {
    [owner, creator, beneficiary1, beneficiary2, payer] = await ethers.getSigners();

    const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributor");
    royaltyDistributor = await upgrades.deployProxy(
      RoyaltyDistributor,
      [],
      { initializer: "initialize" }
    ) as unknown as RoyaltyDistributor;
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
        { recipient: beneficiary1.address, percentage: 7000 },
      ];
      await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

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
});
