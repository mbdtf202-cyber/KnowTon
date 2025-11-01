"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
describe("RoyaltyDistributor", function () {
    let royaltyDistributor;
    let owner;
    let creator;
    let beneficiary1;
    let beneficiary2;
    let payer;
    const tokenId = 1;
    beforeEach(async function () {
        [owner, creator, beneficiary1, beneficiary2, payer] = await hardhat_1.ethers.getSigners();
        const RoyaltyDistributor = await hardhat_1.ethers.getContractFactory("RoyaltyDistributor");
        royaltyDistributor = await hardhat_1.upgrades.deployProxy(RoyaltyDistributor, [], { initializer: "initialize" });
        await royaltyDistributor.waitForDeployment();
    });
    describe("Configuration", function () {
        it("Should configure royalty split", async function () {
            const beneficiaries = [
                { recipient: beneficiary1.address, percentage: 7000 }, // 70%
                { recipient: beneficiary2.address, percentage: 3000 }, // 30%
            ];
            await (0, chai_1.expect)(royaltyDistributor.configureRoyalty(tokenId, beneficiaries))
                .to.emit(royaltyDistributor, "RoyaltyConfigured");
            const [configBeneficiaries, totalDistributed, isActive] = await royaltyDistributor.getRoyaltyConfig(tokenId);
            (0, chai_1.expect)(configBeneficiaries.length).to.equal(2);
            (0, chai_1.expect)(configBeneficiaries[0].percentage).to.equal(7000);
            (0, chai_1.expect)(isActive).to.be.true;
        });
        it("Should reject invalid percentage total", async function () {
            const beneficiaries = [
                { recipient: beneficiary1.address, percentage: 6000 },
                { recipient: beneficiary2.address, percentage: 3000 },
            ];
            await (0, chai_1.expect)(royaltyDistributor.configureRoyalty(tokenId, beneficiaries)).to.be.revertedWith("Total must be 100%");
        });
        it("Should reject zero address beneficiary", async function () {
            const beneficiaries = [
                { recipient: hardhat_1.ethers.ZeroAddress, percentage: 10000 },
            ];
            await (0, chai_1.expect)(royaltyDistributor.configureRoyalty(tokenId, beneficiaries)).to.be.revertedWith("Invalid recipient");
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
            const amount = hardhat_1.ethers.parseEther("1");
            await (0, chai_1.expect)(royaltyDistributor.connect(payer).distributeRoyalty(tokenId, { value: amount }))
                .to.emit(royaltyDistributor, "RoyaltyDistributed")
                .withArgs(tokenId, amount, payer.address);
            const pending1 = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary1.address);
            const pending2 = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary2.address);
            (0, chai_1.expect)(pending1).to.equal(hardhat_1.ethers.parseEther("0.7")); // 70%
            (0, chai_1.expect)(pending2).to.equal(hardhat_1.ethers.parseEther("0.3")); // 30%
        });
        it("Should reject distribution without payment", async function () {
            await (0, chai_1.expect)(royaltyDistributor.connect(payer).distributeRoyalty(tokenId, { value: 0 })).to.be.revertedWith("No payment");
        });
        it("Should reject distribution for unconfigured token", async function () {
            await (0, chai_1.expect)(royaltyDistributor.connect(payer).distributeRoyalty(999, {
                value: hardhat_1.ethers.parseEther("1"),
            })).to.be.revertedWith("Royalty not configured");
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
                .distributeRoyalty(tokenId, { value: hardhat_1.ethers.parseEther("1") });
        });
        it("Should allow beneficiary to withdraw", async function () {
            const balanceBefore = await hardhat_1.ethers.provider.getBalance(beneficiary1.address);
            const tx = await royaltyDistributor.connect(beneficiary1).withdraw(tokenId);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const balanceAfter = await hardhat_1.ethers.provider.getBalance(beneficiary1.address);
            (0, chai_1.expect)(balanceAfter - balanceBefore + gasUsed).to.equal(hardhat_1.ethers.parseEther("0.7"));
        });
        it("Should emit withdrawal event", async function () {
            await (0, chai_1.expect)(royaltyDistributor.connect(beneficiary1).withdraw(tokenId))
                .to.emit(royaltyDistributor, "RoyaltyWithdrawn")
                .withArgs(beneficiary1.address, hardhat_1.ethers.parseEther("0.7"));
        });
        it("Should reject withdrawal with no pending amount", async function () {
            await (0, chai_1.expect)(royaltyDistributor.connect(creator).withdraw(tokenId)).to.be.revertedWith("No pending withdrawals");
        });
        it("Should clear pending withdrawal after withdrawal", async function () {
            await royaltyDistributor.connect(beneficiary1).withdraw(tokenId);
            const pending = await royaltyDistributor.getPendingWithdrawal(tokenId, beneficiary1.address);
            (0, chai_1.expect)(pending).to.equal(0);
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
                .distributeRoyalty(1, { value: hardhat_1.ethers.parseEther("1") });
            await royaltyDistributor
                .connect(payer)
                .distributeRoyalty(2, { value: hardhat_1.ethers.parseEther("2") });
        });
        it("Should batch withdraw from multiple tokens", async function () {
            const balanceBefore = await hardhat_1.ethers.provider.getBalance(beneficiary1.address);
            const tx = await royaltyDistributor.connect(beneficiary1).batchWithdraw([1, 2]);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;
            const balanceAfter = await hardhat_1.ethers.provider.getBalance(beneficiary1.address);
            (0, chai_1.expect)(balanceAfter - balanceBefore + gasUsed).to.equal(hardhat_1.ethers.parseEther("3"));
        });
    });
    describe("Beneficiary Management", function () {
        it("Should add beneficiary", async function () {
            const beneficiaries = [
                { recipient: beneficiary1.address, percentage: 7000 },
            ];
            await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);
            await (0, chai_1.expect)(royaltyDistributor.addBeneficiary(tokenId, beneficiary2.address, 3000))
                .to.emit(royaltyDistributor, "BeneficiaryAdded")
                .withArgs(tokenId, beneficiary2.address, 3000);
        });
        it("Should remove beneficiary", async function () {
            const beneficiaries = [
                { recipient: beneficiary1.address, percentage: 7000 },
                { recipient: beneficiary2.address, percentage: 3000 },
            ];
            await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);
            await (0, chai_1.expect)(royaltyDistributor.removeBeneficiary(tokenId, beneficiary2.address))
                .to.emit(royaltyDistributor, "BeneficiaryRemoved")
                .withArgs(tokenId, beneficiary2.address);
        });
        it("Should reject adding beneficiary exceeding 100%", async function () {
            const beneficiaries = [
                { recipient: beneficiary1.address, percentage: 10000 },
            ];
            await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);
            await (0, chai_1.expect)(royaltyDistributor.addBeneficiary(tokenId, beneficiary2.address, 1000)).to.be.revertedWith("Exceeds 100%");
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
                .distributeRoyalty(tokenId, { value: hardhat_1.ethers.parseEther("1") });
            await royaltyDistributor
                .connect(payer)
                .distributeRoyalty(tokenId, { value: hardhat_1.ethers.parseEther("2") });
            const totalEarned = await royaltyDistributor.getTotalEarned(beneficiary1.address);
            (0, chai_1.expect)(totalEarned).to.equal(hardhat_1.ethers.parseEther("3"));
        });
    });
});
//# sourceMappingURL=RoyaltyDistributor.test.js.map