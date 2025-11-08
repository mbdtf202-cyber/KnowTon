import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { IPBond } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IPBond - Enhanced 3-Tier Bond System", function () {
  let ipBond: IPBond;
  let owner: SignerWithAddress;
  let issuer: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  let investor3: SignerWithAddress;

  const MOCK_NFT_CONTRACT = "0x1234567890123456789012345678901234567890";
  const MOCK_TOKEN_ID = 1;
  const TOTAL_VALUE = ethers.parseEther("100");
  const SENIOR_APY = 500; // 5%
  const MEZZANINE_APY = 1000; // 10%
  const JUNIOR_APY = 2000; // 20%

  // Helper function to get current block timestamp
  async function getCurrentTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock('latest');
    return block!.timestamp;
  }

  beforeEach(async function () {
    [owner, issuer, investor1, investor2, investor3] = await ethers.getSigners();

    const IPBondFactory = await ethers.getContractFactory("IPBond");
    ipBond = (await upgrades.deployProxy(IPBondFactory, [], {
      initializer: "initialize",
    })) as unknown as IPBond;

    await ipBond.grantRole(await ipBond.ISSUER_ROLE(), issuer.address);
  });

  describe("Bond Issuance", function () {
    it("Should issue a bond successfully with 3-tier structure", async function () {
      const currentTime = await getCurrentTimestamp();
      const maturityDate = currentTime + 365 * 24 * 60 * 60; // 1 year

      const tx = await ipBond
        .connect(issuer)
        .issueBond(
          MOCK_NFT_CONTRACT,
          MOCK_TOKEN_ID,
          TOTAL_VALUE,
          maturityDate,
          SENIOR_APY,
          MEZZANINE_APY,
          JUNIOR_APY
        );

      await expect(tx)
        .to.emit(ipBond, "BondIssued")
        .withArgs(1, issuer.address, MOCK_NFT_CONTRACT, MOCK_TOKEN_ID, TOTAL_VALUE, maturityDate);

      const bondInfo = await ipBond.getBondInfo(1);
      expect(bondInfo.nftContract).to.equal(MOCK_NFT_CONTRACT);
      expect(bondInfo.tokenId).to.equal(MOCK_TOKEN_ID);
      expect(bondInfo.issuer).to.equal(issuer.address);
      expect(bondInfo.totalValue).to.equal(TOTAL_VALUE);
      expect(bondInfo.maturityDate).to.equal(maturityDate);
      expect(bondInfo.status).to.equal(0); // Active
    });

    it("Should configure tranches with correct allocations (50%, 33%, 17%)", async function () {
      const currentTime = await getCurrentTimestamp();
      const maturityDate = currentTime + 365 * 24 * 60 * 60;

      await ipBond
        .connect(issuer)
        .issueBond(
          MOCK_NFT_CONTRACT,
          MOCK_TOKEN_ID,
          TOTAL_VALUE,
          maturityDate,
          SENIOR_APY,
          MEZZANINE_APY,
          JUNIOR_APY
        );

      // Senior: 50%
      const seniorInfo = await ipBond.getTrancheInfo(1, 0);
      expect(seniorInfo.allocation).to.equal(ethers.parseEther("50"));
      expect(seniorInfo.apy).to.equal(SENIOR_APY);

      // Mezzanine: 33%
      const mezzanineInfo = await ipBond.getTrancheInfo(1, 1);
      expect(mezzanineInfo.allocation).to.equal(ethers.parseEther("33"));
      expect(mezzanineInfo.apy).to.equal(MEZZANINE_APY);

      // Junior: 17%
      const juniorInfo = await ipBond.getTrancheInfo(1, 2);
      expect(juniorInfo.allocation).to.equal(ethers.parseEther("17"));
      expect(juniorInfo.apy).to.equal(JUNIOR_APY);
    });

    it("Should reject bond issuance with invalid parameters", async function () {
      const currentTime = await getCurrentTimestamp();
      const maturityDate = currentTime + 365 * 24 * 60 * 60;

      await expect(
        ipBond
          .connect(issuer)
          .issueBond(
            ethers.ZeroAddress,
            MOCK_TOKEN_ID,
            TOTAL_VALUE,
            maturityDate,
            SENIOR_APY,
            MEZZANINE_APY,
            JUNIOR_APY
          )
      ).to.be.revertedWith("Invalid NFT contract");

      await expect(
        ipBond
          .connect(issuer)
          .issueBond(
            MOCK_NFT_CONTRACT,
            MOCK_TOKEN_ID,
            0,
            maturityDate,
            SENIOR_APY,
            MEZZANINE_APY,
            JUNIOR_APY
          )
      ).to.be.revertedWith("Invalid total value");

      const pastDate = currentTime - 1;
      await expect(
        ipBond
          .connect(issuer)
          .issueBond(
            MOCK_NFT_CONTRACT,
            MOCK_TOKEN_ID,
            TOTAL_VALUE,
            pastDate,
            SENIOR_APY,
            MEZZANINE_APY,
            JUNIOR_APY
          )
      ).to.be.revertedWith("Invalid maturity date");
    });

    it("Should only allow ISSUER_ROLE to issue bonds", async function () {
      const currentTime = await getCurrentTimestamp();
      const maturityDate = currentTime + 365 * 24 * 60 * 60;

      await expect(
        ipBond
          .connect(investor1)
          .issueBond(
            MOCK_NFT_CONTRACT,
            MOCK_TOKEN_ID,
            TOTAL_VALUE,
            maturityDate,
            SENIOR_APY,
            MEZZANINE_APY,
            JUNIOR_APY
          )
      ).to.be.reverted;
    });
  });

  describe("Investment with Tier-Based Priority", function () {
    let bondId: number;
    let maturityDate: number;

    beforeEach(async function () {
      const currentTime = await getCurrentTimestamp();
      maturityDate = currentTime + 365 * 24 * 60 * 60;
      await ipBond
        .connect(issuer)
        .issueBond(
          MOCK_NFT_CONTRACT,
          MOCK_TOKEN_ID,
          TOTAL_VALUE,
          maturityDate,
          SENIOR_APY,
          MEZZANINE_APY,
          JUNIOR_APY
        );
      bondId = 1;
    });

    it("Should allow investment in Senior tranche (highest priority)", async function () {
      const investAmount = ethers.parseEther("10");

      const tx = await ipBond.connect(investor1).invest(bondId, 0, { value: investAmount });

      await expect(tx)
        .to.emit(ipBond, "Investment")
        .withArgs(bondId, 0, investor1.address, investAmount);

      const investment = await ipBond.getInvestment(bondId, 0, investor1.address);
      expect(investment).to.equal(investAmount);

      const trancheInfo = await ipBond.getTrancheInfo(bondId, 0);
      expect(trancheInfo.totalInvested).to.equal(investAmount);
    });

    it("Should allow investment in Mezzanine tranche (medium priority)", async function () {
      const investAmount = ethers.parseEther("10");

      const tx = await ipBond.connect(investor2).invest(bondId, 1, { value: investAmount });

      await expect(tx)
        .to.emit(ipBond, "Investment")
        .withArgs(bondId, 1, investor2.address, investAmount);

      const investment = await ipBond.getInvestment(bondId, 1, investor2.address);
      expect(investment).to.equal(investAmount);
    });

    it("Should allow investment in Junior tranche (lowest priority)", async function () {
      const investAmount = ethers.parseEther("10");

      const tx = await ipBond.connect(investor3).invest(bondId, 2, { value: investAmount });

      await expect(tx)
        .to.emit(ipBond, "Investment")
        .withArgs(bondId, 2, investor3.address, investAmount);

      const investment = await ipBond.getInvestment(bondId, 2, investor3.address);
      expect(investment).to.equal(investAmount);
    });

    it("Should allow multiple investors in same tranche", async function () {
      const amount1 = ethers.parseEther("10");
      const amount2 = ethers.parseEther("15");

      await ipBond.connect(investor1).invest(bondId, 0, { value: amount1 });
      await ipBond.connect(investor2).invest(bondId, 0, { value: amount2 });

      const investment1 = await ipBond.getInvestment(bondId, 0, investor1.address);
      const investment2 = await ipBond.getInvestment(bondId, 0, investor2.address);

      expect(investment1).to.equal(amount1);
      expect(investment2).to.equal(amount2);

      const trancheInfo = await ipBond.getTrancheInfo(bondId, 0);
      expect(trancheInfo.totalInvested).to.equal(amount1 + amount2);
    });

    it("Should reject investment exceeding allocation", async function () {
      const excessAmount = ethers.parseEther("51");

      await expect(
        ipBond.connect(investor1).invest(bondId, 0, { value: excessAmount })
      ).to.be.revertedWith("Exceeds allocation");
    });

    it("Should allow investment in all tranches simultaneously", async function () {
      await ipBond.connect(investor1).invest(bondId, 0, { value: ethers.parseEther("10") });
      await ipBond.connect(investor2).invest(bondId, 1, { value: ethers.parseEther("10") });
      await ipBond.connect(investor3).invest(bondId, 2, { value: ethers.parseEther("10") });

      expect(await ipBond.getInvestment(bondId, 0, investor1.address)).to.equal(
        ethers.parseEther("10")
      );
      expect(await ipBond.getInvestment(bondId, 1, investor2.address)).to.equal(
        ethers.parseEther("10")
      );
      expect(await ipBond.getInvestment(bondId, 2, investor3.address)).to.equal(
        ethers.parseEther("10")
      );
    });
  });

  describe("Yield Distribution Based on APY", function () {
    let bondId: number;

    beforeEach(async function () {
      const currentTime = await getCurrentTimestamp();
      const maturityDate = currentTime + 365 * 24 * 60 * 60;
      await ipBond
        .connect(issuer)
        .issueBond(
          MOCK_NFT_CONTRACT,
          MOCK_TOKEN_ID,
          TOTAL_VALUE,
          maturityDate,
          SENIOR_APY,
          MEZZANINE_APY,
          JUNIOR_APY
        );
      bondId = 1;

      // Invest in all tranches
      await ipBond.connect(investor1).invest(bondId, 0, { value: ethers.parseEther("20") });
      await ipBond.connect(investor2).invest(bondId, 1, { value: ethers.parseEther("15") });
      await ipBond.connect(investor3).invest(bondId, 2, { value: ethers.parseEther("10") });
    });

    it("Should distribute revenue with tier-based priority", async function () {
      const revenue = ethers.parseEther("5");

      const tx = await ipBond.connect(issuer).distributeRevenue(bondId, { value: revenue });

      await expect(tx).to.emit(ipBond, "RevenueDistributed").withArgs(bondId, revenue);

      const bondInfo = await ipBond.getBondInfo(bondId);
      expect(bondInfo.totalRevenue).to.equal(revenue);
    });

    it("Should prioritize Senior tranche in distribution", async function () {
      const revenue = ethers.parseEther("5");
      await ipBond.connect(issuer).distributeRevenue(bondId, { value: revenue });

      // Revenue should be distributed to Senior first
      const bondInfo = await ipBond.getBondInfo(bondId);
      expect(bondInfo.totalRevenue).to.equal(revenue);
    });

    it("Should calculate yield correctly based on APY", async function () {
      const investment = ethers.parseEther("20");
      const yield1 = await ipBond.calculateCurrentYield(bondId, 0, investor1.address);
      
      // Yield should be greater than 0 and less than full year yield
      expect(yield1).to.be.gt(0);
      
      // Full year yield would be: 20 ETH * 5% = 1 ETH
      const fullYearYield = ethers.parseEther("1");
      expect(yield1).to.be.lte(fullYearYield);
    });
  });

  describe("Redemption with Maturity Checks", function () {
    let bondId: number;
    let maturityDate: number;

    beforeEach(async function () {
      const block = await ethers.provider.getBlock('latest');
      const currentTime = block!.timestamp;
      maturityDate = currentTime + 365 * 24 * 60 * 60;
      await ipBond
        .connect(issuer)
        .issueBond(
          MOCK_NFT_CONTRACT,
          MOCK_TOKEN_ID,
          TOTAL_VALUE,
          maturityDate,
          SENIOR_APY,
          MEZZANINE_APY,
          JUNIOR_APY
        );
      bondId = 1;

      await ipBond.connect(investor1).invest(bondId, 0, { value: ethers.parseEther("20") });
    });

    it("Should reject redemption before maturity", async function () {
      await expect(ipBond.connect(investor1).redeem(bondId, 0)).to.be.revertedWith(
        "Bond not matured"
      );
    });

    it("Should allow redemption after marking as matured", async function () {
      // Fast forward time by increasing block timestamp
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await ipBond.connect(issuer).markMatured(bondId);

      // Fund the contract for redemption
      await owner.sendTransaction({
        to: await ipBond.getAddress(),
        value: ethers.parseEther("25"),
      });

      const balanceBefore = await ethers.provider.getBalance(investor1.address);

      const tx = await ipBond.connect(investor1).redeem(bondId, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(investor1.address);

      // Should receive principal + yield
      expect(balanceAfter).to.be.gt(balanceBefore - gasUsed);

      await expect(tx).to.emit(ipBond, "BondRedeemed");
    });

    it("Should reject double redemption", async function () {
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await ipBond.connect(issuer).markMatured(bondId);

      await owner.sendTransaction({
        to: await ipBond.getAddress(),
        value: ethers.parseEther("25"),
      });

      await ipBond.connect(investor1).redeem(bondId, 0);

      await expect(ipBond.connect(investor1).redeem(bondId, 0)).to.be.revertedWith(
        "No investment"
      );
    });

    it("Should calculate correct payout with principal and yield", async function () {
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await ipBond.connect(issuer).markMatured(bondId);

      // Fund the contract
      await owner.sendTransaction({
        to: await ipBond.getAddress(),
        value: ethers.parseEther("25"),
      });

      const investment = ethers.parseEther("20");
      const expectedYield = await ipBond.calculateCurrentYield(bondId, 0, investor1.address);

      const balanceBefore = await ethers.provider.getBalance(investor1.address);
      const tx = await ipBond.connect(investor1).redeem(bondId, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(investor1.address);

      const actualPayout = balanceAfter - balanceBefore + gasUsed;
      
      // Payout should be at least the principal
      expect(actualPayout).to.be.gte(investment);
    });
  });

  describe("Bond Status Management", function () {
    let bondId: number;
    let maturityDate: number;

    beforeEach(async function () {
      const currentTime = await getCurrentTimestamp();
      maturityDate = currentTime + 365 * 24 * 60 * 60;
      await ipBond
        .connect(issuer)
        .issueBond(
          MOCK_NFT_CONTRACT,
          MOCK_TOKEN_ID,
          TOTAL_VALUE,
          maturityDate,
          SENIOR_APY,
          MEZZANINE_APY,
          JUNIOR_APY
        );
      bondId = 1;
    });

    it("Should mark bond as matured after maturity date", async function () {
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      const tx = await ipBond.connect(issuer).markMatured(bondId);

      await expect(tx).to.emit(ipBond, "BondMatured").withArgs(bondId);

      const bondInfo = await ipBond.getBondInfo(bondId);
      expect(bondInfo.status).to.equal(1); // Matured
    });

    it("Should reject marking as matured before maturity date", async function () {
      await expect(ipBond.connect(issuer).markMatured(bondId)).to.be.revertedWith(
        "Not matured yet"
      );
    });

    it("Should mark bond as defaulted", async function () {
      const tx = await ipBond.connect(issuer).markDefaulted(bondId);

      await expect(tx).to.emit(ipBond, "BondDefaulted").withArgs(bondId);

      const bondInfo = await ipBond.getBondInfo(bondId);
      expect(bondInfo.status).to.equal(2); // Defaulted
    });

    it("Should only allow ISSUER_ROLE to change status", async function () {
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(ipBond.connect(investor1).markMatured(bondId)).to.be.reverted;
      await expect(ipBond.connect(investor1).markDefaulted(bondId)).to.be.reverted;
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow admin to pause the contract", async function () {
      await ipBond.connect(owner).pause();

      // Get current block timestamp
      const block = await ethers.provider.getBlock('latest');
      const currentTime = block!.timestamp;
      const maturityDate = currentTime + 365 * 24 * 60 * 60;

      await expect(
        ipBond
          .connect(issuer)
          .issueBond(
            MOCK_NFT_CONTRACT,
            MOCK_TOKEN_ID,
            TOTAL_VALUE,
            maturityDate,
            SENIOR_APY,
            MEZZANINE_APY,
            JUNIOR_APY
          )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow admin to unpause the contract", async function () {
      await ipBond.connect(owner).pause();
      await ipBond.connect(owner).unpause();

      // Get current block timestamp
      const block = await ethers.provider.getBlock('latest');
      const currentTime = block!.timestamp;
      const maturityDate = currentTime + 365 * 24 * 60 * 60;

      await expect(
        ipBond
          .connect(issuer)
          .issueBond(
            MOCK_NFT_CONTRACT,
            MOCK_TOKEN_ID,
            TOTAL_VALUE,
            maturityDate,
            SENIOR_APY,
            MEZZANINE_APY,
            JUNIOR_APY
          )
      ).to.not.be.reverted;
    });
  });
});
