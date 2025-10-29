import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { FractionalizationVault, CopyrightRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FractionalizationVault", function () {
  let vault: FractionalizationVault;
  let nft: CopyrightRegistry;
  let owner: SignerWithAddress;
  let curator: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let redeemer: SignerWithAddress;

  const TOTAL_SUPPLY = ethers.parseEther("1000");
  const RESERVE_PRICE = ethers.parseEther("10");

  beforeEach(async function () {
    [owner, curator, voter1, voter2, redeemer] = await ethers.getSigners();

    // Deploy NFT contract
    const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistry");
    nft = await upgrades.deployProxy(
      CopyrightRegistry,
      [],
      { initializer: "initialize" }
    ) as unknown as CopyrightRegistry;
    await nft.waitForDeployment();

    // Deploy Vault contract
    const FractionalizationVault = await ethers.getContractFactory("FractionalizationVault");
    vault = await upgrades.deployProxy(
      FractionalizationVault,
      [],
      { initializer: "initialize" }
    ) as unknown as FractionalizationVault;
    await vault.waitForDeployment();

    // Mint NFT to curator
    await nft.mintIPNFT(
      curator.address,
      "ipfs://test",
      ethers.keccak256(ethers.toUtf8Bytes("content")),
      ethers.keccak256(ethers.toUtf8Bytes("fingerprint")),
      0,
      1000
    );
  });

  describe("Vault Creation", function () {
    it("Should create vault and fractionalize NFT", async function () {
      await nft.connect(curator).approve(await vault.getAddress(), 1);

      const tx = await vault.connect(curator).createVault(
        await nft.getAddress(),
        1,
        TOTAL_SUPPLY,
        RESERVE_PRICE,
        "Fractional NFT",
        "fNFT"
      );

      await expect(tx)
        .to.emit(vault, "VaultCreated")
        .withArgs(1, await nft.getAddress(), 1, curator.address, TOTAL_SUPPLY);

      // Check NFT transferred to vault
      expect(await nft.ownerOf(1)).to.equal(await vault.getAddress());

      // Check fractional tokens minted
      expect(await vault.balanceOf(curator.address)).to.equal(TOTAL_SUPPLY);
    });

    it("Should reject invalid parameters", async function () {
      await expect(
        vault.connect(curator).createVault(
          ethers.ZeroAddress,
          1,
          TOTAL_SUPPLY,
          RESERVE_PRICE,
          "fNFT",
          "fNFT"
        )
      ).to.be.revertedWith("Invalid NFT contract");

      await expect(
        vault.connect(curator).createVault(
          await nft.getAddress(),
          1,
          0,
          RESERVE_PRICE,
          "fNFT",
          "fNFT"
        )
      ).to.be.revertedWith("Invalid supply");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await nft.connect(curator).approve(await vault.getAddress(), 1);
      await vault.connect(curator).createVault(
        await nft.getAddress(),
        1,
        TOTAL_SUPPLY,
        RESERVE_PRICE,
        "fNFT",
        "fNFT"
      );

      // Distribute tokens to voters
      await vault.connect(curator).transfer(voter1.address, ethers.parseEther("300"));
      await vault.connect(curator).transfer(voter2.address, ethers.parseEther("200"));
    });

    it("Should start redeem voting", async function () {
      const tx = await vault.connect(curator).startRedeemVoting(1);
      const block = await ethers.provider.getBlock("latest");
      const expectedEndTime = block!.timestamp + 7 * 24 * 60 * 60;

      await expect(tx)
        .to.emit(vault, "RedeemVotingStarted")
        .withArgs(1, expectedEndTime);

      const [, , , state] = await vault.getVaultInfo(1);
      expect(state).to.equal(2); // RedeemVoting
    });

    it("Should allow token holders to vote", async function () {
      await vault.connect(curator).startRedeemVoting(1);

      await expect(vault.connect(voter1).vote(1, true))
        .to.emit(vault, "VoteCast")
        .withArgs(1, voter1.address, true, ethers.parseEther("300"));

      const [, yesVotes, noVotes] = await vault.getVotingInfo(1);
      expect(yesVotes).to.equal(ethers.parseEther("300"));
      expect(noVotes).to.equal(0);
    });

    it("Should prevent double voting", async function () {
      await vault.connect(curator).startRedeemVoting(1);
      await vault.connect(voter1).vote(1, true);

      await expect(vault.connect(voter1).vote(1, true)).to.be.revertedWith("Already voted");
    });

    it("Should reject votes after voting period", async function () {
      await vault.connect(curator).startRedeemVoting(1);

      await time.increase(8 * 24 * 60 * 60); // 8 days

      await expect(vault.connect(voter1).vote(1, true)).to.be.revertedWith("Voting ended");
    });
  });

  describe("Redemption", function () {
    beforeEach(async function () {
      await nft.connect(curator).approve(await vault.getAddress(), 1);
      await vault.connect(curator).createVault(
        await nft.getAddress(),
        1,
        TOTAL_SUPPLY,
        RESERVE_PRICE,
        "fNFT",
        "fNFT"
      );

      await vault.connect(curator).transfer(voter1.address, ethers.parseEther("600"));
      await vault.connect(curator).transfer(voter2.address, ethers.parseEther("100"));

      await vault.connect(curator).startRedeemVoting(1);
      await vault.connect(voter1).vote(1, true);
      await vault.connect(voter2).vote(1, false);

      await time.increase(8 * 24 * 60 * 60);
    });

    it("Should execute redeem after successful vote", async function () {
      await expect(
        vault.connect(redeemer).executeRedeem(1, { value: RESERVE_PRICE })
      )
        .to.emit(vault, "VaultRedeemed")
        .withArgs(1, redeemer.address);

      expect(await nft.ownerOf(1)).to.equal(redeemer.address);

      const [, , , , , state] = await vault.getVaultInfo(1);
      expect(state).to.equal(3); // Redeemed
    });

    it("Should reject redeem with insufficient payment", async function () {
      await expect(
        vault.connect(redeemer).executeRedeem(1, { value: ethers.parseEther("5") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should reject redeem before voting ends", async function () {
      await vault.connect(curator).startRedeemVoting(1);

      await expect(
        vault.connect(redeemer).executeRedeem(1, { value: RESERVE_PRICE })
      ).to.be.revertedWith("Voting not ended");
    });
  });

  describe("Reserve Price", function () {
    beforeEach(async function () {
      await nft.connect(curator).approve(await vault.getAddress(), 1);
      await vault.connect(curator).createVault(
        await nft.getAddress(),
        1,
        TOTAL_SUPPLY,
        RESERVE_PRICE,
        "fNFT",
        "fNFT"
      );
    });

    it("Should update reserve price", async function () {
      const newPrice = ethers.parseEther("20");

      await expect(vault.updateReservePrice(1, newPrice))
        .to.emit(vault, "ReservePriceUpdated")
        .withArgs(1, newPrice);

      const [, , , , reservePrice] = await vault.getVaultInfo(1);
      expect(reservePrice).to.equal(newPrice);
    });
  });
});
