import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleTest } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("SimpleTest", function () {
  let simpleTest: SimpleTest;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const SimpleTest = await ethers.getContractFactory("SimpleTest");
    simpleTest = await SimpleTest.deploy() as unknown as SimpleTest;
    await simpleTest.initialize("TestContract");
  });

  describe("Deployment", function () {
    it("Should set the correct name", async function () {
      expect(await simpleTest.name()).to.equal("TestContract");
    });

    it("Should set the deployer as admin", async function () {
      const adminRole = await simpleTest.DEFAULT_ADMIN_ROLE();
      expect(await simpleTest.hasRole(adminRole, owner.address)).to.be.true;
    });
  });

  describe("Value Management", function () {
    it("Should allow admin to set value", async function () {
      await simpleTest.setValue(42);
      expect(await simpleTest.getValue()).to.equal(42);
    });

    it("Should emit ValueSet event", async function () {
      await expect(simpleTest.setValue(100))
        .to.emit(simpleTest, "ValueSet")
        .withArgs(100);
    });

    it("Should not allow non-admin to set value", async function () {
      await expect(simpleTest.connect(user).setValue(42))
        .to.be.reverted;
    });
  });
});