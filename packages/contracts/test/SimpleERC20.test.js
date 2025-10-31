"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
describe("SimpleERC20", function () {
    let token;
    let owner;
    let user1;
    let user2;
    const MINTER_ROLE = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("MINTER_ROLE"));
    const BURNER_ROLE = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("BURNER_ROLE"));
    const TOKEN_NAME = "KnowTon Token";
    const TOKEN_SYMBOL = "KTN";
    const TOKEN_DECIMALS = 18;
    const INITIAL_SUPPLY = hardhat_1.ethers.parseEther("1000000"); // 1M tokens
    beforeEach(async function () {
        [owner, user1, user2] = await hardhat_1.ethers.getSigners();
        const SimpleERC20 = await hardhat_1.ethers.getContractFactory("SimpleERC20");
        token = await SimpleERC20.deploy();
        await token.waitForDeployment();
        await token.initialize(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS, INITIAL_SUPPLY, owner.address);
    });
    describe("Deployment", function () {
        it("Should set the correct token details", async function () {
            (0, chai_1.expect)(await token.name()).to.equal(TOKEN_NAME);
            (0, chai_1.expect)(await token.symbol()).to.equal(TOKEN_SYMBOL);
            (0, chai_1.expect)(await token.decimals()).to.equal(TOKEN_DECIMALS);
            (0, chai_1.expect)(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
        });
        it("Should assign initial supply to owner", async function () {
            (0, chai_1.expect)(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
        });
        it("Should set correct roles", async function () {
            const adminRole = await token.DEFAULT_ADMIN_ROLE();
            (0, chai_1.expect)(await token.hasRole(adminRole, owner.address)).to.be.true;
            (0, chai_1.expect)(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
            (0, chai_1.expect)(await token.hasRole(BURNER_ROLE, owner.address)).to.be.true;
        });
    });
    describe("Basic Transfers", function () {
        it("Should transfer tokens between accounts", async function () {
            const transferAmount = hardhat_1.ethers.parseEther("100");
            await token.transfer(user1.address, transferAmount);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(transferAmount);
            (0, chai_1.expect)(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
        });
        it("Should fail to transfer to zero address", async function () {
            const transferAmount = hardhat_1.ethers.parseEther("100");
            await (0, chai_1.expect)(token.transfer(hardhat_1.ethers.ZeroAddress, transferAmount)).to.be.revertedWith("Transfer to zero address");
        });
        it("Should fail to transfer zero amount", async function () {
            await (0, chai_1.expect)(token.transfer(user1.address, 0)).to.be.revertedWith("Transfer amount must be greater than zero");
        });
        it("Should fail to transfer more than balance", async function () {
            const transferAmount = INITIAL_SUPPLY + hardhat_1.ethers.parseEther("1");
            await (0, chai_1.expect)(token.transfer(user1.address, transferAmount)).to.be.reverted;
        });
    });
    describe("Allowances", function () {
        it("Should approve and transferFrom", async function () {
            const approveAmount = hardhat_1.ethers.parseEther("100");
            const transferAmount = hardhat_1.ethers.parseEther("50");
            await token.approve(user1.address, approveAmount);
            (0, chai_1.expect)(await token.allowance(owner.address, user1.address)).to.equal(approveAmount);
            await token.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
            (0, chai_1.expect)(await token.balanceOf(user2.address)).to.equal(transferAmount);
            (0, chai_1.expect)(await token.allowance(owner.address, user1.address)).to.equal(approveAmount - transferAmount);
        });
        it("Should fail transferFrom without allowance", async function () {
            const transferAmount = hardhat_1.ethers.parseEther("100");
            await (0, chai_1.expect)(token.connect(user1).transferFrom(owner.address, user2.address, transferAmount)).to.be.reverted;
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
        it("Should not allow non-minter to mint", async function () {
            const mintAmount = hardhat_1.ethers.parseEther("1000");
            await (0, chai_1.expect)(token.connect(user1).mint(user2.address, mintAmount)).to.be.reverted;
        });
    });
    describe("Burning", function () {
        beforeEach(async function () {
            // Give user1 some tokens to burn
            await token.transfer(user1.address, hardhat_1.ethers.parseEther("1000"));
        });
        it("Should allow users to burn their own tokens", async function () {
            const burnAmount = hardhat_1.ethers.parseEther("100");
            const initialBalance = await token.balanceOf(user1.address);
            await (0, chai_1.expect)(token.connect(user1).burn(burnAmount))
                .to.emit(token, "TokensBurned")
                .withArgs(user1.address, burnAmount);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
        });
        it("Should allow burner role to burn from any account", async function () {
            const burnAmount = hardhat_1.ethers.parseEther("100");
            const initialBalance = await token.balanceOf(user1.address);
            await (0, chai_1.expect)(token.burnFrom(user1.address, burnAmount))
                .to.emit(token, "TokensBurned")
                .withArgs(user1.address, burnAmount);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
        });
        it("Should not allow non-burner to burn from other accounts", async function () {
            const burnAmount = hardhat_1.ethers.parseEther("100");
            await (0, chai_1.expect)(token.connect(user2).burnFrom(user1.address, burnAmount)).to.be.reverted;
        });
    });
    describe("Batch Transfer", function () {
        it("Should transfer to multiple recipients", async function () {
            const recipients = [user1.address, user2.address];
            const amounts = [hardhat_1.ethers.parseEther("100"), hardhat_1.ethers.parseEther("200")];
            await token.batchTransfer(recipients, amounts);
            (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(amounts[0]);
            (0, chai_1.expect)(await token.balanceOf(user2.address)).to.equal(amounts[1]);
        });
        it("Should fail with mismatched array lengths", async function () {
            const recipients = [user1.address, user2.address];
            const amounts = [hardhat_1.ethers.parseEther("100")]; // Only one amount
            await (0, chai_1.expect)(token.batchTransfer(recipients, amounts)).to.be.revertedWith("Arrays length mismatch");
        });
        it("Should fail with empty arrays", async function () {
            await (0, chai_1.expect)(token.batchTransfer([], [])).to.be.revertedWith("Empty arrays");
        });
    });
    describe("Role Management", function () {
        it("Should allow admin to grant roles", async function () {
            await token.grantRole(MINTER_ROLE, user1.address);
            (0, chai_1.expect)(await token.hasRole(MINTER_ROLE, user1.address)).to.be.true;
            // user1 should now be able to mint
            await token.connect(user1).mint(user2.address, hardhat_1.ethers.parseEther("100"));
            (0, chai_1.expect)(await token.balanceOf(user2.address)).to.equal(hardhat_1.ethers.parseEther("100"));
        });
        it("Should allow admin to revoke roles", async function () {
            await token.grantRole(MINTER_ROLE, user1.address);
            await token.revokeRole(MINTER_ROLE, user1.address);
            (0, chai_1.expect)(await token.hasRole(MINTER_ROLE, user1.address)).to.be.false;
            // user1 should no longer be able to mint
            await (0, chai_1.expect)(token.connect(user1).mint(user2.address, hardhat_1.ethers.parseEther("100"))).to.be.reverted;
        });
    });
});
//# sourceMappingURL=SimpleERC20.test.js.map