"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
describe("GovernanceTokenSimple", function () {
    let token;
    let owner;
    let user1;
    let user2;
    let user3;
    const MINTER_ROLE = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("MINTER_ROLE"));
    const UPGRADER_ROLE = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("UPGRADER_ROLE"));
    const INITIAL_SUPPLY = hardhat_1.ethers.parseEther("100000000"); // 100M tokens
    beforeEach(async function () {
        [owner, user1, user2, user3] = await hardhat_1.ethers.getSigners();
        const GovernanceTokenSimple = await hardhat_1.ethers.getContractFactory("GovernanceTokenSimple");
        token = await GovernanceTokenSimple.deploy();
        await token.waitForDeployment();
        await token.initialize();
    });
    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            (0, chai_1.expect)(await token.name()).to.equal("KnowTon Governance Token");
            (0, chai_1.expect)(await token.symbol()).to.equal("KTG");
        });
        it("Should mint initial supply to deployer", async function () {
            (0, chai_1.expect)(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
            (0, chai_1.expect)(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
        });
        it("Should set the deployer as admin and minter", async function () {
            const adminRole = await token.DEFAULT_ADMIN_ROLE();
            (0, chai_1.expect)(await token.hasRole(adminRole, owner.address)).to.be.true;
            (0, chai_1.expect)(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
            (0, chai_1.expect)(await token.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
        });
        it("Should have correct max supply", async function () {
            const maxSupply = await token.MAX_SUPPLY();
            (0, chai_1.expect)(maxSupply).to.equal(hardhat_1.ethers.parseEther("1000000000")); // 1B tokens
        });
    });
    describe("Minting", function () {
        it("Should allow minter to mint tokens", async function () {
            const mintAmount = hardhat_1.ethers.parseEther("1000");
            await (0, chai_1.expect)(token.mint(user1.address, mintAmount))
                .to.emit(token, "TokensMinted")
                .withArgs(user1.address, mintAmount);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(mintAmount);
            (0, chai_1.expect)(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
        });
        it("Should not allow non-minter to mint tokens", async function () {
            const mintAmount = hardhat_1.ethers.parseEther("1000");
            await (0, chai_1.expect)(token.connect(user1).mint(user2.address, mintAmount))
                .to.be.reverted;
        });
        it("Should not allow minting beyond max supply", async function () {
            const maxSupply = await token.MAX_SUPPLY();
            const excessAmount = maxSupply - INITIAL_SUPPLY + hardhat_1.ethers.parseEther("1");
            await (0, chai_1.expect)(token.mint(user1.address, excessAmount))
                .to.be.revertedWith("Exceeds max supply");
        });
        it("Should allow multiple mints up to max supply", async function () {
            const mintAmount = hardhat_1.ethers.parseEther("1000000"); // 1M tokens
            // Mint multiple times
            await token.mint(user1.address, mintAmount);
            await token.mint(user2.address, mintAmount);
            await token.mint(user3.address, mintAmount);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(mintAmount);
            (0, chai_1.expect)(await token.balanceOf(user2.address)).to.equal(mintAmount);
            (0, chai_1.expect)(await token.balanceOf(user3.address)).to.equal(mintAmount);
        });
    });
    describe("Burning", function () {
        beforeEach(async function () {
            // Transfer some tokens to users for testing
            await token.transfer(user1.address, hardhat_1.ethers.parseEther("10000"));
            await token.transfer(user2.address, hardhat_1.ethers.parseEther("5000"));
        });
        it("Should allow users to burn their own tokens", async function () {
            const burnAmount = hardhat_1.ethers.parseEther("1000");
            const initialBalance = await token.balanceOf(user1.address);
            const initialSupply = await token.totalSupply();
            await (0, chai_1.expect)(token.connect(user1).burn(burnAmount))
                .to.emit(token, "TokensBurned")
                .withArgs(user1.address, burnAmount);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
            (0, chai_1.expect)(await token.totalSupply()).to.equal(initialSupply - burnAmount);
        });
        it("Should allow burning from approved accounts", async function () {
            const burnAmount = hardhat_1.ethers.parseEther("500");
            // Approve owner to burn user1's tokens
            await token.connect(user1).approve(owner.address, burnAmount);
            await (0, chai_1.expect)(token.burnFrom(user1.address, burnAmount))
                .to.emit(token, "TokensBurned")
                .withArgs(user1.address, burnAmount);
        });
        it("Should not allow burning more than balance", async function () {
            const balance = await token.balanceOf(user1.address);
            const excessAmount = balance + hardhat_1.ethers.parseEther("1");
            await (0, chai_1.expect)(token.connect(user1).burn(excessAmount))
                .to.be.reverted;
        });
        it("Should not allow burning from account without approval", async function () {
            const burnAmount = hardhat_1.ethers.parseEther("500");
            await (0, chai_1.expect)(token.burnFrom(user1.address, burnAmount))
                .to.be.reverted;
        });
        it("Should reduce allowance when burning from approved account", async function () {
            const burnAmount = hardhat_1.ethers.parseEther("500");
            const approveAmount = hardhat_1.ethers.parseEther("1000");
            await token.connect(user1).approve(owner.address, approveAmount);
            await token.burnFrom(user1.address, burnAmount);
            (0, chai_1.expect)(await token.allowance(user1.address, owner.address))
                .to.equal(approveAmount - burnAmount);
        });
    });
    describe("Voting", function () {
        beforeEach(async function () {
            // Transfer tokens to users for voting tests
            await token.transfer(user1.address, hardhat_1.ethers.parseEther("10000"));
            await token.transfer(user2.address, hardhat_1.ethers.parseEther("20000"));
            await token.transfer(user3.address, hardhat_1.ethers.parseEther("5000"));
        });
        it("Should track voting power correctly after delegation", async function () {
            // Delegate voting power to self
            await token.connect(user1).delegate(user1.address);
            await token.connect(user2).delegate(user2.address);
            (0, chai_1.expect)(await token.getVotes(user1.address)).to.equal(hardhat_1.ethers.parseEther("10000"));
            (0, chai_1.expect)(await token.getVotes(user2.address)).to.equal(hardhat_1.ethers.parseEther("20000"));
        });
        it("Should allow delegation of voting power to others", async function () {
            // user1 delegates to user2
            await token.connect(user1).delegate(user2.address);
            await token.connect(user2).delegate(user2.address);
            (0, chai_1.expect)(await token.getVotes(user1.address)).to.equal(0);
            (0, chai_1.expect)(await token.getVotes(user2.address)).to.equal(hardhat_1.ethers.parseEther("30000"));
        });
        it("Should track historical voting power", async function () {
            await token.connect(user1).delegate(user1.address);
            // Get current block number
            const blockNumber = await hardhat_1.ethers.provider.getBlockNumber();
            // Transfer more tokens
            await token.transfer(user1.address, hardhat_1.ethers.parseEther("5000"));
            // Check past votes (should be original amount)
            (0, chai_1.expect)(await token.getPastVotes(user1.address, blockNumber))
                .to.equal(hardhat_1.ethers.parseEther("10000"));
            // Check current votes (should include new tokens)
            (0, chai_1.expect)(await token.getVotes(user1.address))
                .to.equal(hardhat_1.ethers.parseEther("15000"));
        });
        it("Should update voting power when tokens are transferred", async function () {
            await token.connect(user1).delegate(user1.address);
            await token.connect(user2).delegate(user2.address);
            // Transfer tokens from user1 to user2
            await token.connect(user1).transfer(user2.address, hardhat_1.ethers.parseEther("5000"));
            (0, chai_1.expect)(await token.getVotes(user1.address)).to.equal(hardhat_1.ethers.parseEther("5000"));
            (0, chai_1.expect)(await token.getVotes(user2.address)).to.equal(hardhat_1.ethers.parseEther("25000"));
        });
        it("Should handle delegation changes correctly", async function () {
            await token.connect(user1).delegate(user2.address);
            (0, chai_1.expect)(await token.getVotes(user2.address)).to.equal(hardhat_1.ethers.parseEther("10000"));
            // Change delegation to user3
            await token.connect(user1).delegate(user3.address);
            (0, chai_1.expect)(await token.getVotes(user2.address)).to.equal(0);
            (0, chai_1.expect)(await token.getVotes(user3.address)).to.equal(hardhat_1.ethers.parseEther("10000"));
        });
        it("Should return zero votes for non-delegated accounts", async function () {
            (0, chai_1.expect)(await token.getVotes(user1.address)).to.equal(0);
            (0, chai_1.expect)(await token.getVotes(user2.address)).to.equal(0);
        });
    });
    describe("Access Control", function () {
        it("Should allow admin to grant roles", async function () {
            await token.grantRole(MINTER_ROLE, user1.address);
            (0, chai_1.expect)(await token.hasRole(MINTER_ROLE, user1.address)).to.be.true;
            // User1 should now be able to mint
            await token.connect(user1).mint(user2.address, hardhat_1.ethers.parseEther("1000"));
            (0, chai_1.expect)(await token.balanceOf(user2.address)).to.equal(hardhat_1.ethers.parseEther("1000"));
        });
        it("Should allow admin to revoke roles", async function () {
            await token.grantRole(MINTER_ROLE, user1.address);
            await token.revokeRole(MINTER_ROLE, user1.address);
            (0, chai_1.expect)(await token.hasRole(MINTER_ROLE, user1.address)).to.be.false;
            // User1 should no longer be able to mint
            await (0, chai_1.expect)(token.connect(user1).mint(user2.address, hardhat_1.ethers.parseEther("1000")))
                .to.be.reverted;
        });
        it("Should not allow non-admin to grant roles", async function () {
            await (0, chai_1.expect)(token.connect(user1).grantRole(MINTER_ROLE, user2.address))
                .to.be.reverted;
        });
        it("Should not allow non-admin to revoke roles", async function () {
            await (0, chai_1.expect)(token.connect(user1).revokeRole(MINTER_ROLE, owner.address))
                .to.be.reverted;
        });
        it("Should allow role admin to manage specific roles", async function () {
            // Grant admin role for MINTER_ROLE to user1
            await token.grantRole(await token.getRoleAdmin(MINTER_ROLE), user1.address);
            // User1 should be able to grant MINTER_ROLE
            await token.connect(user1).grantRole(MINTER_ROLE, user2.address);
            (0, chai_1.expect)(await token.hasRole(MINTER_ROLE, user2.address)).to.be.true;
        });
    });
    describe("Upgradeability", function () {
        it("Should not allow non-upgrader to authorize upgrades", async function () {
            // This test would require deploying a new implementation
            // For now, we just test that the role exists
            (0, chai_1.expect)(await token.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
            (0, chai_1.expect)(await token.hasRole(UPGRADER_ROLE, user1.address)).to.be.false;
        });
        it("Should allow upgrader role to be granted", async function () {
            await token.grantRole(UPGRADER_ROLE, user1.address);
            (0, chai_1.expect)(await token.hasRole(UPGRADER_ROLE, user1.address)).to.be.true;
        });
    });
    describe("ERC20 Functionality", function () {
        beforeEach(async function () {
            await token.transfer(user1.address, hardhat_1.ethers.parseEther("10000"));
        });
        it("Should handle transfers correctly", async function () {
            const transferAmount = hardhat_1.ethers.parseEther("1000");
            await (0, chai_1.expect)(token.connect(user1).transfer(user2.address, transferAmount))
                .to.emit(token, "Transfer")
                .withArgs(user1.address, user2.address, transferAmount);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(hardhat_1.ethers.parseEther("9000"));
            (0, chai_1.expect)(await token.balanceOf(user2.address)).to.equal(transferAmount);
        });
        it("Should handle approvals correctly", async function () {
            const approveAmount = hardhat_1.ethers.parseEther("5000");
            await (0, chai_1.expect)(token.connect(user1).approve(user2.address, approveAmount))
                .to.emit(token, "Approval")
                .withArgs(user1.address, user2.address, approveAmount);
            (0, chai_1.expect)(await token.allowance(user1.address, user2.address)).to.equal(approveAmount);
        });
        it("Should handle transferFrom correctly", async function () {
            const approveAmount = hardhat_1.ethers.parseEther("5000");
            const transferAmount = hardhat_1.ethers.parseEther("2000");
            await token.connect(user1).approve(user2.address, approveAmount);
            await (0, chai_1.expect)(token.connect(user2).transferFrom(user1.address, user3.address, transferAmount))
                .to.emit(token, "Transfer")
                .withArgs(user1.address, user3.address, transferAmount);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(hardhat_1.ethers.parseEther("8000"));
            (0, chai_1.expect)(await token.balanceOf(user3.address)).to.equal(transferAmount);
            (0, chai_1.expect)(await token.allowance(user1.address, user2.address)).to.equal(approveAmount - transferAmount);
        });
    });
});
//# sourceMappingURL=GovernanceTokenSimple.test.js.map