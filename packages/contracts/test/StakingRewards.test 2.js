"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
describe("StakingRewards", function () {
    let stakingRewards;
    let stakingToken;
    let rewardToken;
    let owner;
    let staker1;
    let staker2;
    const INITIAL_SUPPLY = hardhat_1.ethers.parseEther("1000000");
    const STAKE_AMOUNT = hardhat_1.ethers.parseEther("1000");
    beforeEach(async function () {
        [owner, staker1, staker2] = await hardhat_1.ethers.getSigners();
        // Deploy mock ERC20 tokens
        const ERC20Factory = await hardhat_1.ethers.getContractFactory("MockERC20");
        stakingToken = await ERC20Factory.deploy("Staking Token", "STK", INITIAL_SUPPLY);
        rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", INITIAL_SUPPLY);
        // Deploy StakingRewards
        const StakingRewardsFactory = await hardhat_1.ethers.getContractFactory("StakingRewards");
        stakingRewards = (await hardhat_1.upgrades.deployProxy(StakingRewardsFactory, [await stakingToken.getAddress(), await rewardToken.getAddress()], {
            initializer: "initialize",
        }));
        // Transfer tokens to stakers
        await stakingToken.transfer(staker1.address, hardhat_1.ethers.parseEther("10000"));
        await stakingToken.transfer(staker2.address, hardhat_1.ethers.parseEther("10000"));
        // Transfer reward tokens to contract
        await rewardToken.transfer(await stakingRewards.getAddress(), hardhat_1.ethers.parseEther("100000"));
        // Approve staking
        await stakingToken.connect(staker1).approve(await stakingRewards.getAddress(), hardhat_1.ethers.MaxUint256);
        await stakingToken.connect(staker2).approve(await stakingRewards.getAddress(), hardhat_1.ethers.MaxUint256);
    });
    describe("Initialization", function () {
        it("Should initialize with correct tokens", async function () {
            (0, chai_1.expect)(await stakingRewards.stakingToken()).to.equal(await stakingToken.getAddress());
            (0, chai_1.expect)(await stakingRewards.rewardToken()).to.equal(await rewardToken.getAddress());
        });
        it("Should have default APY configurations", async function () {
            (0, chai_1.expect)(await stakingRewards.lockPeriodToAPY(30 * 24 * 60 * 60)).to.equal(500); // 5%
            (0, chai_1.expect)(await stakingRewards.lockPeriodToAPY(90 * 24 * 60 * 60)).to.equal(1000); // 10%
            (0, chai_1.expect)(await stakingRewards.lockPeriodToAPY(180 * 24 * 60 * 60)).to.equal(1500); // 15%
            (0, chai_1.expect)(await stakingRewards.lockPeriodToAPY(365 * 24 * 60 * 60)).to.equal(2000); // 20%
        });
    });
    describe("Staking", function () {
        it("Should stake tokens successfully", async function () {
            const lockPeriod = 30 * 24 * 60 * 60; // 30 days
            const tx = await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
            await (0, chai_1.expect)(tx)
                .to.emit(stakingRewards, "Staked")
                .withArgs(staker1.address, STAKE_AMOUNT, lockPeriod, 500);
            (0, chai_1.expect)(await stakingRewards.totalStaked()).to.equal(STAKE_AMOUNT);
            (0, chai_1.expect)(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(1);
            (0, chai_1.expect)(await stakingRewards.getUserTotalStaked(staker1.address)).to.equal(STAKE_AMOUNT);
        });
        it("Should reject staking with invalid lock period", async function () {
            const invalidLockPeriod = 15 * 24 * 60 * 60; // 15 days (not configured)
            await (0, chai_1.expect)(stakingRewards.connect(staker1).stake(STAKE_AMOUNT, invalidLockPeriod)).to.be.revertedWith("Invalid lock period");
        });
        it("Should reject staking zero amount", async function () {
            const lockPeriod = 30 * 24 * 60 * 60;
            await (0, chai_1.expect)(stakingRewards.connect(staker1).stake(0, lockPeriod)).to.be.revertedWith("Cannot stake 0");
        });
        it("Should allow multiple stakes from same user", async function () {
            const lockPeriod1 = 30 * 24 * 60 * 60;
            const lockPeriod2 = 90 * 24 * 60 * 60;
            await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod1);
            await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod2);
            (0, chai_1.expect)(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(2);
            (0, chai_1.expect)(await stakingRewards.getUserTotalStaked(staker1.address)).to.equal(STAKE_AMOUNT * 2n);
        });
        it("Should allow multiple users to stake", async function () {
            const lockPeriod = 30 * 24 * 60 * 60;
            await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
            await stakingRewards.connect(staker2).stake(STAKE_AMOUNT, lockPeriod);
            (0, chai_1.expect)(await stakingRewards.totalStaked()).to.equal(STAKE_AMOUNT * 2n);
        });
    });
    describe("Rewards Calculation", function () {
        beforeEach(async function () {
            const lockPeriod = 365 * 24 * 60 * 60; // 1 year, 20% APY
            await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
        });
        it("Should calculate rewards correctly after time passes", async function () {
            // Fast forward 6 months
            await hardhat_network_helpers_1.time.increase(182 * 24 * 60 * 60);
            const rewards = await stakingRewards.calculateRewards(staker1.address, 0);
            // Expected: 1000 * 20% * 0.5 year = 100 tokens
            const expectedRewards = hardhat_1.ethers.parseEther("100");
            const tolerance = hardhat_1.ethers.parseEther("1"); // 1 token tolerance
            (0, chai_1.expect)(rewards).to.be.closeTo(expectedRewards, tolerance);
        });
        it("Should calculate full year rewards correctly", async function () {
            // Fast forward 1 year
            await hardhat_network_helpers_1.time.increase(365 * 24 * 60 * 60);
            const rewards = await stakingRewards.calculateRewards(staker1.address, 0);
            // Expected: 1000 * 20% = 200 tokens
            const expectedRewards = hardhat_1.ethers.parseEther("200");
            const tolerance = hardhat_1.ethers.parseEther("1");
            (0, chai_1.expect)(rewards).to.be.closeTo(expectedRewards, tolerance);
        });
        it("Should calculate rewards for different APYs correctly", async function () {
            // Stake with 30 days lock (5% APY)
            const lockPeriod = 30 * 24 * 60 * 60;
            await stakingRewards.connect(staker2).stake(STAKE_AMOUNT, lockPeriod);
            // Fast forward 30 days
            await hardhat_network_helpers_1.time.increase(30 * 24 * 60 * 60);
            const rewards = await stakingRewards.calculateRewards(staker2.address, 0);
            // Expected: 1000 * 5% * (30/365) ≈ 4.11 tokens
            const expectedRewards = hardhat_1.ethers.parseEther("4.1");
            const tolerance = hardhat_1.ethers.parseEther("0.5");
            (0, chai_1.expect)(rewards).to.be.closeTo(expectedRewards, tolerance);
        });
    });
    describe("Claiming Rewards", function () {
        beforeEach(async function () {
            const lockPeriod = 365 * 24 * 60 * 60;
            await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
        });
        it("Should claim rewards successfully", async function () {
            // Fast forward 6 months
            await hardhat_network_helpers_1.time.increase(182 * 24 * 60 * 60);
            const balanceBefore = await rewardToken.balanceOf(staker1.address);
            const tx = await stakingRewards.connect(staker1).claimRewards(0);
            await (0, chai_1.expect)(tx).to.emit(stakingRewards, "RewardsClaimed");
            const balanceAfter = await rewardToken.balanceOf(staker1.address);
            (0, chai_1.expect)(balanceAfter).to.be.gt(balanceBefore);
        });
        it("Should update claimed rewards correctly", async function () {
            await hardhat_network_helpers_1.time.increase(182 * 24 * 60 * 60);
            await stakingRewards.connect(staker1).claimRewards(0);
            const stakes = await stakingRewards.getUserStakes(staker1.address);
            (0, chai_1.expect)(stakes[0].rewardsClaimed).to.be.gt(0);
        });
        it("Should reject claiming when no rewards available", async function () {
            await (0, chai_1.expect)(stakingRewards.connect(staker1).claimRewards(0)).to.be.revertedWith("No rewards to claim");
        });
        it("Should allow claiming multiple times", async function () {
            // Claim after 3 months
            await hardhat_network_helpers_1.time.increase(91 * 24 * 60 * 60);
            await stakingRewards.connect(staker1).claimRewards(0);
            const balanceAfterFirst = await rewardToken.balanceOf(staker1.address);
            // Claim after another 3 months
            await hardhat_network_helpers_1.time.increase(91 * 24 * 60 * 60);
            await stakingRewards.connect(staker1).claimRewards(0);
            const balanceAfterSecond = await rewardToken.balanceOf(staker1.address);
            (0, chai_1.expect)(balanceAfterSecond).to.be.gt(balanceAfterFirst);
        });
    });
    describe("Unstaking", function () {
        beforeEach(async function () {
            const lockPeriod = 30 * 24 * 60 * 60;
            await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
        });
        it("Should reject unstaking before lock period ends", async function () {
            await (0, chai_1.expect)(stakingRewards.connect(staker1).unstake(0)).to.be.revertedWith("Still locked");
        });
        it("Should unstake successfully after lock period", async function () {
            // Fast forward past lock period
            await hardhat_network_helpers_1.time.increase(31 * 24 * 60 * 60);
            const stakingBalanceBefore = await stakingToken.balanceOf(staker1.address);
            const rewardBalanceBefore = await rewardToken.balanceOf(staker1.address);
            const tx = await stakingRewards.connect(staker1).unstake(0);
            await (0, chai_1.expect)(tx).to.emit(stakingRewards, "Unstaked");
            const stakingBalanceAfter = await stakingToken.balanceOf(staker1.address);
            const rewardBalanceAfter = await rewardToken.balanceOf(staker1.address);
            // Should receive staked tokens back
            (0, chai_1.expect)(stakingBalanceAfter - stakingBalanceBefore).to.equal(STAKE_AMOUNT);
            // Should receive rewards
            (0, chai_1.expect)(rewardBalanceAfter).to.be.gt(rewardBalanceBefore);
            // Stake should be removed
            (0, chai_1.expect)(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(0);
            (0, chai_1.expect)(await stakingRewards.totalStaked()).to.equal(0);
        });
        it("Should handle multiple stakes correctly when unstaking", async function () {
            const lockPeriod = 30 * 24 * 60 * 60;
            await stakingRewards.connect(staker1).stake(STAKE_AMOUNT, lockPeriod);
            (0, chai_1.expect)(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(2);
            await hardhat_network_helpers_1.time.increase(31 * 24 * 60 * 60);
            await stakingRewards.connect(staker1).unstake(0);
            (0, chai_1.expect)(await stakingRewards.getUserStakeCount(staker1.address)).to.equal(1);
        });
    });
    describe("APY Management", function () {
        it("Should allow admin to update APY", async function () {
            const lockPeriod = 30 * 24 * 60 * 60;
            const newAPY = 800; // 8%
            const tx = await stakingRewards.connect(owner).updateAPY(lockPeriod, newAPY);
            await (0, chai_1.expect)(tx).to.emit(stakingRewards, "APYUpdated").withArgs(lockPeriod, newAPY);
            (0, chai_1.expect)(await stakingRewards.lockPeriodToAPY(lockPeriod)).to.equal(newAPY);
        });
        it("Should reject APY above 100%", async function () {
            const lockPeriod = 30 * 24 * 60 * 60;
            const invalidAPY = 10001; // 100.01%
            await (0, chai_1.expect)(stakingRewards.connect(owner).updateAPY(lockPeriod, invalidAPY)).to.be.revertedWith("APY too high");
        });
        it("Should reject APY update from non-admin", async function () {
            const lockPeriod = 30 * 24 * 60 * 60;
            const newAPY = 800;
            await (0, chai_1.expect)(stakingRewards.connect(staker1).updateAPY(lockPeriod, newAPY)).to.be.reverted;
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
            (0, chai_1.expect)(stakes.length).to.equal(2);
            (0, chai_1.expect)(stakes[0].amount).to.equal(STAKE_AMOUNT);
            (0, chai_1.expect)(stakes[1].amount).to.equal(STAKE_AMOUNT * 2n);
        });
        it("Should return correct total staked", async function () {
            const totalStaked = await stakingRewards.getUserTotalStaked(staker1.address);
            (0, chai_1.expect)(totalStaked).to.equal(STAKE_AMOUNT * 3n);
        });
        it("Should return correct pending rewards", async function () {
            await hardhat_network_helpers_1.time.increase(91 * 24 * 60 * 60);
            const pendingRewards = await stakingRewards.getUserTotalPendingRewards(staker1.address);
            (0, chai_1.expect)(pendingRewards).to.be.gt(0);
        });
    });
    describe("Emergency Withdraw", function () {
        it("Should allow admin to emergency withdraw", async function () {
            const withdrawAmount = hardhat_1.ethers.parseEther("1000");
            await stakingRewards
                .connect(owner)
                .emergencyWithdraw(await rewardToken.getAddress(), withdrawAmount);
            (0, chai_1.expect)(await rewardToken.balanceOf(owner.address)).to.be.gte(withdrawAmount);
        });
        it("Should reject emergency withdraw from non-admin", async function () {
            const withdrawAmount = hardhat_1.ethers.parseEther("1000");
            await (0, chai_1.expect)(stakingRewards
                .connect(staker1)
                .emergencyWithdraw(await rewardToken.getAddress(), withdrawAmount)).to.be.reverted;
        });
    });
});
//# sourceMappingURL=StakingRewards.test.js.map