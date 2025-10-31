"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
describe("SimpleTest", function () {
    let simpleTest;
    let owner;
    let user;
    beforeEach(async function () {
        [owner, user] = await hardhat_1.ethers.getSigners();
        const SimpleTest = await hardhat_1.ethers.getContractFactory("SimpleTest");
        simpleTest = await SimpleTest.deploy();
        await simpleTest.initialize("TestContract");
    });
    describe("Deployment", function () {
        it("Should set the correct name", async function () {
            (0, chai_1.expect)(await simpleTest.name()).to.equal("TestContract");
        });
        it("Should set the deployer as admin", async function () {
            const adminRole = await simpleTest.DEFAULT_ADMIN_ROLE();
            (0, chai_1.expect)(await simpleTest.hasRole(adminRole, owner.address)).to.be.true;
        });
    });
    describe("Value Management", function () {
        it("Should allow admin to set value", async function () {
            await simpleTest.setValue(42);
            (0, chai_1.expect)(await simpleTest.getValue()).to.equal(42);
        });
        it("Should emit ValueSet event", async function () {
            await (0, chai_1.expect)(simpleTest.setValue(100))
                .to.emit(simpleTest, "ValueSet")
                .withArgs(100);
        });
        it("Should not allow non-admin to set value", async function () {
            await (0, chai_1.expect)(simpleTest.connect(user).setValue(42))
                .to.be.reverted;
        });
    });
});
//# sourceMappingURL=SimpleTest.test.js.map