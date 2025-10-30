import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimpleERC20", function () {
  let token: SimpleERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  
  const TOKEN_NAME = "KnowTon Token";
  const TOKEN_SYMBOL = "KTN";
  const TOKEN_DECIMALS = 18;
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const SimpleERC20 = await ethers.getContractFactory("SimpleERC20");
    token = await SimpleERC20.deploy() as unknown as SimpleERC20;
    await token.waitForDeployment();
    
    await token.initialize(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_DECIMALS,
      INITIAL_SUPPLY,
      owner.address
    );
  });

  describe("Deployment", function () {
    it("Should set the correct token details", async function () {
      expect(await token.name()).to.equal(TOKEN_NAME);
      expect(await token.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await token.decimals()).to.equal(TOKEN_DECIMALS);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should assign initial supply to owner", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should set correct roles", async function () {
      const adminRole = await token.DEFAULT_ADMIN_ROLE();
      expect(await token.hasRole(adminRole, owner.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(BURNER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Basic Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await token.transfer(user1.address, transferAmount);
      
      expect(await token.balanceOf(user1.address)).to.equal(transferAmount);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
    });

    it("Should fail to transfer to zero address", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(
        token.transfer(ethers.ZeroAddress, transferAmount)
      ).to.be.revertedWith("Transfer to zero address");
    });

    it("Should fail to transfer zero amount", async function () {
      await expect(
        token.transfer(user1.address, 0)
      ).to.be.revertedWith("Transfer amount must be greater than zero");
    });

    it("Should fail to transfer more than balance", async function () {
      const transferAmount = INITIAL_SUPPLY + ethers.parseEther("1");
      
      await expect(
        token.transfer(user1.address, transferAmount)
      ).to.be.reverted;
    });
  });

  describe("Allowances", function () {
    it("Should approve and transferFrom", async function () {
      const approveAmount = ethers.parseEther("100");
      const transferAmount = ethers.parseEther("50");
      
      await token.approve(user1.address, approveAmount);
      expect(await token.allowance(owner.address, user1.address)).to.equal(approveAmount);
      
      await token.connect(user1).transferFrom(owner.address, user2.address, transferAmount);
      
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
      expect(await token.allowance(owner.address, user1.address)).to.equal(approveAmount - transferAmount);
    });

    it("Should fail transferFrom without allowance", async function () {
      const transferAmount = ethers.parseEther("100");
      
      await expect(
        token.connect(user1).transferFrom(owner.address, user2.address, transferAmount)
      ).to.be.reverted;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(token.mint(user1.address, mintAmount))
        .to.emit(token, "TokensMinted")
        .withArgs(user1.address, mintAmount);
      
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("Should not allow non-minter to mint", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(
        token.connect(user1).mint(user2.address, mintAmount)
      ).to.be.reverted;
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Give user1 some tokens to burn
      await token.transfer(user1.address, ethers.parseEther("1000"));
    });

    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await token.balanceOf(user1.address);
      
      await expect(token.connect(user1).burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(user1.address, burnAmount);
      
      expect(await token.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should allow burner role to burn from any account", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await token.balanceOf(user1.address);
      
      await expect(token.burnFrom(user1.address, burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(user1.address, burnAmount);
      
      expect(await token.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should not allow non-burner to burn from other accounts", async function () {
      const burnAmount = ethers.parseEther("100");
      
      await expect(
        token.connect(user2).burnFrom(user1.address, burnAmount)
      ).to.be.reverted;
    });
  });

  describe("Batch Transfer", function () {
    it("Should transfer to multiple recipients", async function () {
      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
      
      await token.batchTransfer(recipients, amounts);
      
      expect(await token.balanceOf(user1.address)).to.equal(amounts[0]);
      expect(await token.balanceOf(user2.address)).to.equal(amounts[1]);
    });

    it("Should fail with mismatched array lengths", async function () {
      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("100")]; // Only one amount
      
      await expect(
        token.batchTransfer(recipients, amounts)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should fail with empty arrays", async function () {
      await expect(
        token.batchTransfer([], [])
      ).to.be.revertedWith("Empty arrays");
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant roles", async function () {
      await token.grantRole(MINTER_ROLE, user1.address);
      
      expect(await token.hasRole(MINTER_ROLE, user1.address)).to.be.true;
      
      // user1 should now be able to mint
      await token.connect(user1).mint(user2.address, ethers.parseEther("100"));
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("100"));
    });

    it("Should allow admin to revoke roles", async function () {
      await token.grantRole(MINTER_ROLE, user1.address);
      await token.revokeRole(MINTER_ROLE, user1.address);
      
      expect(await token.hasRole(MINTER_ROLE, user1.address)).to.be.false;
      
      // user1 should no longer be able to mint
      await expect(
        token.connect(user1).mint(user2.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });
  });
});