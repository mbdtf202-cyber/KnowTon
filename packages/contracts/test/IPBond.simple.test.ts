import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { IPBond } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IPBond - Simple Tests", function () {
  let ipBond: IPBond;
  let owner: SignerWithAddress;
  let issuer: SignerWithAddress;
  let investor1: SignerWithAddress;

  const MOCK_NFT_CONTRACT = "0x1234567890123456789012345678901234567890";
  const MOCK_TOKEN_ID = 1;
  const TOTAL_VALUE = ethers.parseEther("100");
  const SENIOR_APY = 500; // 5%
  const MEZZANINE_APY = 1000; // 10%
  const JUNIOR_APY = 2000; // 20%

  beforeEach(async function () {
    [owner, issuer, investor1] = await ethers.getSigners();

    const IPBondFactory = await ethers.getContractFactory("IPBond");
    ipBond = (await upgrades.deployProxy(IPBondFactory, [], {
      initializer: "initialize",
    })) as unknown as IPBond;

    await ipBond.grantRole(await ipBond.ISSUER_ROLE(), issuer.address);
  });

  describe("Bond Issuance", function () {
    it("Should issue a bond successfully", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
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

    it("Should configure tranches correctly", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
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
  });

  describe("Investment", function () {
    let bondId: number;
    let maturityDate: number;

    beforeEach(async function () {
      const currentTime = Math.floor(Date.now() / 1000);
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

    it("Should allow investment in Senior tranche", async function () {
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

    it("Should reject investment exceeding allocation", async function () {
      const seniorAllocation = ethers.parseEther("50");
      const excessAmount = ethers.parseEther("51");

      await expect(
        ipBond.connect(investor1).invest(bondId, 0, { value: excessAmount })
      ).to.be.revertedWith("Exceeds allocation");
    });
  });
});
