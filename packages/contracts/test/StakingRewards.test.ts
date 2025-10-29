import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { StakingRewards } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("StakingRewards", function () {
  let stakingRewards: StakingRewards;
  let stakingToken: any;
  let rewardToken: any;
  let owner: SignerWithAddress;
  let staker1: SignerWithAddress;
  let staker2: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const STAKE_AMOUNT = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, staker1, staker2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", INITIAL_SUPPLY);
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", INITIAL_SUPPLY);

    // Deploy StakingRewards
    const StakingRewardsFactory = await ethers.getContractFactory("StakingRewards");
    stakingRewards = (await upgrades.deployProxy(
      StakingRewardsFactory,
      [await stakingToken.getAddress(), await rewardToken.getAddress()],
      {
        initializer: "initialize",
      }
    )) as unknown as StakingRewards;

    // Transfer tokens to stakers
    await stakingToken.transfer(staker1.address, ethers.parseEther("10000"));
    await stakingToken.transfer(staker2.address, ethers.parseEther("10000"));

    // Transfer reward tokens to contract
    await rewardToken.transfer(await stakingRewards.getAddress(), ethers.parseEther("100000"));

    // Approve staking
    await stakingToken.connect(staker1).approve(await stakingRewards.getAddress(), ethers.MaxUint256);
    await stakingToken.connect(staker2).approve(await stakingRewards.getAddress(), ethers.MaxUint256);
  });

  describe("Initialization", function () {
    it("Should initialize with correct tokens", async function () {
      expect(await stakingRewards.stakingToken()).to.equal(await stakingToken.getAddress());
      expect(await stakingRewards.rewardToken()).to.equal(await rewardToken.getAddress());
    });

    it("Should have default APY configurations", async function () {
      expect(await stakingRewards.lockPeriodToAPY(30 * 24 * 60 * 60)).to.equal(500); // 5%
      expect(await stakingRewards.lockPeriodToAPY(90 * 24 * 60 * 60)).to.equal(1000); // 10%
      expect(await stakingRewards.lockPeriodToAPY(180 * 24 * 60 * 60)).to.equal(1500); // 15%
      expect(await stakingRewards.lockPeriodToAPY(365 * 24 * 60 * 60)).to.equal(2000); // 20%
    });
  });

  describe("Staking", function () {
    it("Should stake tokens successfully", async function () {
      const lockPeriod = 30 * 24 * 60 * 60; // 30 days

      const tx = await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);

      await expect(tx)
        .to.emit(stakingRewards, "Staked")
        .withArgs(staker1.address, STAKE_AMOUNT, lockPeriod, 500);

      expect(await stakingRewards.totalStaked()).to.equal(STAKE_AMOUNT);
      expect(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(1);
      expect(await stakingRewards.getUserTotalStaked(staker1.address)).to.equal(STAKE_AMOUNT);
    });

    it("Should reject staking with invalid lock period", async function () {
      const invalidLockPeriod = 15 * 24 * 60 * 60; // 15 days (not configured)

      await expect(
        stakingRewards.connect(staker1).stake(STAKE_AMOUNT, invalidLockPeriod)
      ).to.be.revertedWith("Invalid lock period");
    });

    it("Should reject staking zero amount", async function () {
      const lockPeriod = 30 * 24 * 60 * 60;

      await expect(stakingRewards.connect(staker1).stake(0, lockPeriod)).to.be.revertedWith(
        "Cannot stake 0"
      );
    });

    it("Should allow multiple stakes from same user", async function () {
      const lockPeriod1 = 30 * 24 * 60 * 60;
      const lockPeriod2 = 90 * 24 * 60 * 60;

      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod1);
      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod2);

      expect(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(2);
      expect(await stakingRewards.getUserTotalStaked(staker1.address)).to.equal(STAKE_AMOUNT * 2n);
    });

    it("Should allow multiple users to stake", async function () {
      const lockPeriod = 30 * 24 * 60 * 60;

      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
      await stakingRewards.connect(staker2).stake(STAKE_AMOUNT, lockPeriod);

      expect(await stakingRewards.totalStaked()).to.equal(STAKE_AMOUNT * 2n);
    });
  });

  describe("Rewards Calculation", function () {
    beforeEach(async function () {
      const lockPeriod = 365 * 24 * 60 * 60; // 1 year, 20% APY
      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
    });

    it("Should calculate rewards correctly after time passes", async function () {
      // Fast forward 6 months
      await time.increase(182 * 24 * 60 * 60);

      const rewards = await stakingRewards.calculateRewards(staker1.address, 0);

      // Expected: 1000 * 20% * 0.5 year = 100 tokens
      const expectedRewards = ethers.parseEther("100");
      const tolerance = ethers.parseEther("1"); // 1 token tolerance

      expect(rewards).to.be.closeTo(expectedRewards, tolerance);
    });

    it("Should calculate full year rewards correctly", async function () {
      // Fast forward 1 year
      await time.increase(365 * 24 * 60 * 60);

      const rewards = await stakingRewards.calculateRewards(staker1.address, 0);

      // Expected: 1000 * 20% = 200 tokens
      const expectedRewards = ethers.parseEther("200");
      const tolerance = ethers.parseEther("1");

      expect(rewards).to.be.closeTo(expectedRewards, tolerance);
    });

    it("Should calculate rewards for different APYs correctly", async function () {
      // Stake with 30 days lock (5% APY)
      const lockPeriod = 30 * 24 * 60 * 60;
      await stakingRewards.connect(staker2).stake(STAKE_AMOUNT, lockPeriod);

      // Fast forward 30 days
      await time.increase(30 * 24 * 60 * 60);

      const rewards = await stakingRewards.calculateRewards(staker2.address, 0);

      // Expected: 1000 * 5% * (30/365) ≈ 4.11 tokens
      const expectedRewards = ethers.parseEther("4.1");
      const tolerance = ethers.parseEther("0.5");

      expect(rewards).to.be.closeTo(expectedRewards, tolerance);
    });
  });

  describe("Claiming Rewards", function () {
    beforeEach(async function () {
      const lockPeriod = 365 * 24 * 60 * 60;
      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
    });

    it("Should claim rewards successfully", async function () {
      // Fast forward 6 months
      await time.increase(182 * 24 * 60 * 60);

      const balanceBefore = await rewardToken.balanceOf(staker1.address);

      const tx = await stakingRewards.connect(staker1).claimRewards(0);

      await expect(tx).to.emit(stakingRewards, "RewardsClaimed");

      const balanceAfter = await rewardToken.balanceOf(staker1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should update claimed rewards correctly", async function () {
      await time.increase(182 * 24 * 60 * 60);

      await stakingRewards.connect(staker1).claimRewards(0);

      const stakes = await stakingRewards.getUserStakes(staker1.address);
      expect(stakes[0].rewardsClaimed).to.be.gt(0);
    });

    it("Should reject claiming when no rewards available", async function () {
      await expect(stakingRewards.connect(staker1).claimRewards(0)).to.be.revertedWith(
        "No rewards to claim"
      );
    });

    it("Should allow claiming multiple times", async function () {
      // Claim after 3 months
      await time.increase(91 * 24 * 60 * 60);
      await stakingRewards.connect(staker1).claimRewards(0);

      const balanceAfterFirst = await rewardToken.balanceOf(staker1.address);

      // Claim after another 3 months
      await time.increase(91 * 24 * 60 * 60);
      await stakingRewards.connect(staker1).claimRewards(0);

      const balanceAfterSecond = await rewardToken.balanceOf(staker1.address);

      expect(balanceAfterSecond).to.be.gt(balanceAfterFirst);
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      const lockPeriod = 30 * 24 * 60 * 60;
      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
    });

    it("Should reject unstaking before lock period ends", async function () {
      await expect(stakingRewards.connect(staker1).unstake(0)).to.be.revertedWith("Still locked");
    });

    it("Should unstake successfully after lock period", async function () {
      // Fast forward past lock period
      await time.increase(31 * 24 * 60 * 60);

      const stakingBalanceBefore = await stakingToken.balanceOf(staker1.address);
      const rewardBalanceBefore = await rewardToken.balanceOf(staker1.address);

      const tx = await stakingRewards.connect(staker1).unstake(0);

      await expect(tx).to.emit(stakingRewards, "Unstaked");

      const stakingBalanceAfter = await stakingToken.balanceOf(staker1.address);
      const rewardBalanceAfter = await rewardToken.balanceOf(staker1.address);

      // Should receive staked tokens back
      expect(stakingBalanceAfter - stakingBalanceBefore).to.equal(STAKE_AMOUNT);

      // Should receive rewards
      expect(rewardBalanceAfter).to.be.gt(rewardBalanceBefore);

      // Stake should be removed
      expect(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(0);
      expect(await stakingRewards.totalStaked()).to.equal(0);
    });

    it("Should handle multiple stakes correctly when unstaking", async function () {
      const lockPeriod = 30 * 24 * 60 * 60;
      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);

      expect(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(2);

      await time.increase(31 * 24 * 60 * 60);

      await stakingRewards.connect(staker1).unstake(0);

      expect(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(1);
    });
  });

  describe("APY Management", function () {
    it("Should allow admin to update APY", async function () {
      const lockPeriod = 30 * 24 * 60 * 60;
      const newAPY = 800; // 8%

      const tx = await stakingRewards.connect(owner).updateAPY(lockPeriod, newAPY);

      await expect(tx).to.emit(stakingRewards, "APYUpdated").withArgs(lockPeriod, newAPY);

      expect(await stakingRewards.lockPeriodToAPY(lockPeriod)).to.equal(newAPY);
    });

    it("Should reject APY above 100%", async function () {
      const lockPeriod = 30 * 24 * 60 * 60;
      const invalidAPY = 10001; // 100.01%

      await expect(
        stakingRewards.connect(owner).updateAPY(lockPeriod, invalidAPY)
      ).to.be.revertedWith("APY too high");
    });

    it("Should reject APY update from non-admin", async function () {
      const lockPeriod = 30 * 24 * 60 * 60;
      const newAPY = 800;

      await expect(stakingRewards.connect(staker1).updateAPY(lockPeriod, newAPY)).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const lockPeriod1 = 30 * 24 * 60 * 60;
      const lockPeriod2 = 90 * 24 * 60 * 60;

      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod1);
      await stakingRewards.connect(staker1).stake(STAKE_AMOUNT * 2n, lockPeriod2);
    });

    it("Should return correct user stakes", async function () {
      const stakes = await stakingRewards.getUserStakes(staker1.address);

      expect(stakes.length).to.equal(2);
      expect(stakes[0].amount).to.equal(STAKE_AMOUNT);
      expect(stakes[1].amount).to.equal(STAKE_AMOUNT * 2n);
    });

    it("Should return correct total staked", async function () {
      const totalStaked = await stakingRewards.getUserTotalStaked(staker1.address);
      expect(totalStaked).to.equal(STAKE_AMOUNT * 3n);
    });

    it("Should return correct pending rewards", async function () {
      await time.increase(91 * 24 * 60 * 60);

      const pendingRewards = await stakingRewards.getUserTotalPendingRewards(staker1.address);
      expect(pendingRewards).to.be.gt(0);
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow admin to emergency withdraw", async function () {
      const withdrawAmount = ethers.parseEther("1000");

      await stakingRewards
        .connect(owner)
        .emergencyWithdraw(await rewardToken.getAddress(), withdrawAmount);

      expect(await rewardToken.balanceOf(owner.address)).to.be.gte(withdrawAmount);
    });

    it("Should reject emergency withdraw from non-admin", async function () {
      const withdrawAmount = ethers.parseEther("1000");

      await expect(
        stakingRewards
          .connect(staker1)
          .emergencyWithdraw(await rewardToken.getAddress(), withdrawAmount)
      ).to.be.reverted;
    });
  });
});
