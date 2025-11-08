import { expect } from 'chai';
import { ethers } from 'hardhat';
import { EnterpriseLicensing } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('EnterpriseLicensing', function () {
  let enterpriseLicensing: EnterpriseLicensing;
  let owner: SignerWithAddress;
  let enterprise: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const CONTENT_ID = 1;
  const SEATS = 5;
  const DURATION = 365 * 24 * 60 * 60; // 1 year in seconds
  const PRICE_PER_SEAT = ethers.parseEther('0.1');
  const TOTAL_COST = PRICE_PER_SEAT * BigInt(SEATS);

  beforeEach(async function () {
    [owner, enterprise, user1, user2, user3] = await ethers.getSigners();

    const EnterpriseLicensingFactory = await ethers.getContractFactory('EnterpriseLicensing');
    enterpriseLicensing = await EnterpriseLicensingFactory.deploy();
    await enterpriseLicensing.waitForDeployment();
  });

  describe('License Issuance', function () {
    it('Should issue a new license successfully', async function () {
      const tx = await enterpriseLicensing.issueLicense(
        CONTENT_ID,
        enterprise.address,
        SEATS,
        DURATION,
        { value: TOTAL_COST }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return enterpriseLicensing.interface.parseLog(log)?.name === 'LicenseIssued';
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      const parsedEvent = enterpriseLicensing.interface.parseLog(event as any);
      const licenseId = parsedEvent?.args[0];

      const license = await enterpriseLicensing.getLicense(licenseId);
      expect(license.contentId).to.equal(CONTENT_ID);
      expect(license.enterprise).to.equal(enterprise.address);
      expect(license.seats).to.equal(SEATS);
      expect(license.usedSeats).to.equal(0);
      expect(license.isActive).to.be.true;
    });

    it('Should fail to issue license with zero seats', async function () {
      await expect(
        enterpriseLicensing.issueLicense(CONTENT_ID, enterprise.address, 0, DURATION, {
          value: TOTAL_COST,
        })
      ).to.be.revertedWith('Seats must be greater than 0');
    });

    it('Should fail to issue license with zero duration', async function () {
      await expect(
        enterpriseLicensing.issueLicense(CONTENT_ID, enterprise.address, SEATS, 0, {
          value: TOTAL_COST,
        })
      ).to.be.revertedWith('Duration must be greater than 0');
    });

    it('Should fail to issue license with insufficient payment', async function () {
      await expect(
        enterpriseLicensing.issueLicense(CONTENT_ID, enterprise.address, SEATS, DURATION, {
          value: ethers.parseEther('0.1'),
        })
      ).to.be.revertedWith('Insufficient payment');
    });

    it('Should fail to issue license with invalid enterprise address', async function () {
      await expect(
        enterpriseLicensing.issueLicense(
          CONTENT_ID,
          ethers.ZeroAddress,
          SEATS,
          DURATION,
          { value: TOTAL_COST }
        )
      ).to.be.revertedWith('Invalid enterprise address');
    });
  });

  describe('License Verification', function () {
    let licenseId: string;

    beforeEach(async function () {
      const tx = await enterpriseLicensing.issueLicense(
        CONTENT_ID,
        enterprise.address,
        SEATS,
        DURATION,
        { value: TOTAL_COST }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return enterpriseLicensing.interface.parseLog(log)?.name === 'LicenseIssued';
        } catch {
          return false;
        }
      });

      const parsedEvent = enterpriseLicensing.interface.parseLog(event as any);
      licenseId = parsedEvent?.args[0];
    });

    it('Should verify valid license', async function () {
      const isValid = await enterpriseLicensing.verifyLicense(licenseId);
      expect(isValid).to.be.true;
    });

    it('Should not verify expired license', async function () {
      // Fast forward time beyond expiration
      await time.increase(DURATION + 1);

      const isValid = await enterpriseLicensing.verifyLicense(licenseId);
      expect(isValid).to.be.false;
    });

    it('Should not verify suspended license', async function () {
      await enterpriseLicensing.suspendLicense(licenseId);

      const isValid = await enterpriseLicensing.verifyLicense(licenseId);
      expect(isValid).to.be.false;
    });
  });

  describe('License Renewal', function () {
    let licenseId: string;

    beforeEach(async function () {
      const tx = await enterpriseLicensing.issueLicense(
        CONTENT_ID,
        enterprise.address,
        SEATS,
        DURATION,
        { value: TOTAL_COST }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return enterpriseLicensing.interface.parseLog(log)?.name === 'LicenseIssued';
        } catch {
          return false;
        }
      });

      const parsedEvent = enterpriseLicensing.interface.parseLog(event as any);
      licenseId = parsedEvent?.args[0];
    });

    it('Should renew license successfully', async function () {
      const licenseBefore = await enterpriseLicensing.getLicense(licenseId);
      const expiresAtBefore = licenseBefore.expiresAt;

      await enterpriseLicensing.renewLicense(licenseId, DURATION, { value: TOTAL_COST });

      const licenseAfter = await enterpriseLicensing.getLicense(licenseId);
      expect(licenseAfter.expiresAt).to.be.greaterThan(expiresAtBefore);
    });

    it('Should fail to renew with insufficient payment', async function () {
      await expect(
        enterpriseLicensing.renewLicense(licenseId, DURATION, {
          value: ethers.parseEther('0.1'),
        })
      ).to.be.revertedWith('Insufficient payment for renewal');
    });

    it('Should fail to renew non-existent license', async function () {
      const fakeLicenseId = ethers.keccak256(ethers.toUtf8Bytes('fake'));
      await expect(
        enterpriseLicensing.renewLicense(fakeLicenseId, DURATION, { value: TOTAL_COST })
      ).to.be.revertedWith('License does not exist');
    });
  });

  describe('Seat Management', function () {
    let licenseId: string;

    beforeEach(async function () {
      const tx = await enterpriseLicensing.issueLicense(
        CONTENT_ID,
        enterprise.address,
        SEATS,
        DURATION,
        { value: TOTAL_COST }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return enterpriseLicensing.interface.parseLog(log)?.name === 'LicenseIssued';
        } catch {
          return false;
        }
      });

      const parsedEvent = enterpriseLicensing.interface.parseLog(event as any);
      licenseId = parsedEvent?.args[0];
    });

    it('Should assign seat to user', async function () {
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user1.address);

      const hasSeat = await enterpriseLicensing.hasSeat(licenseId, user1.address);
      expect(hasSeat).to.be.true;

      const license = await enterpriseLicensing.getLicense(licenseId);
      expect(license.usedSeats).to.equal(1);
    });

    it('Should assign multiple seats', async function () {
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user1.address);
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user2.address);
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user3.address);

      const license = await enterpriseLicensing.getLicense(licenseId);
      expect(license.usedSeats).to.equal(3);
    });

    it('Should fail to assign seat when all seats are used', async function () {
      // Assign all seats
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user1.address);
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user2.address);
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user3.address);
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, owner.address);
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, enterprise.address);

      // Try to assign one more
      await expect(
        enterpriseLicensing.connect(enterprise).assignSeat(licenseId, ethers.Wallet.createRandom().address)
      ).to.be.revertedWith('No available seats');
    });

    it('Should fail to assign seat to same user twice', async function () {
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user1.address);

      await expect(
        enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user1.address)
      ).to.be.revertedWith('Seat already assigned to user');
    });

    it('Should revoke seat from user', async function () {
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user1.address);

      await enterpriseLicensing.connect(enterprise).revokeSeat(licenseId, user1.address);

      const hasSeat = await enterpriseLicensing.hasSeat(licenseId, user1.address);
      expect(hasSeat).to.be.false;

      const license = await enterpriseLicensing.getLicense(licenseId);
      expect(license.usedSeats).to.equal(0);
    });

    it('Should fail to revoke seat from user without seat', async function () {
      await expect(
        enterpriseLicensing.connect(enterprise).revokeSeat(licenseId, user1.address)
      ).to.be.revertedWith('Seat not assigned to user');
    });

    it('Should fail to assign seat without authorization', async function () {
      await expect(
        enterpriseLicensing.connect(user1).assignSeat(licenseId, user2.address)
      ).to.be.revertedWith('Not authorized');
    });
  });

  describe('Usage Tracking', function () {
    let licenseId: string;

    beforeEach(async function () {
      const tx = await enterpriseLicensing.issueLicense(
        CONTENT_ID,
        enterprise.address,
        SEATS,
        DURATION,
        { value: TOTAL_COST }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return enterpriseLicensing.interface.parseLog(log)?.name === 'LicenseIssued';
        } catch {
          return false;
        }
      });

      const parsedEvent = enterpriseLicensing.interface.parseLog(event as any);
      licenseId = parsedEvent?.args[0];

      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user1.address);
    });

    it('Should track usage for assigned seat', async function () {
      await enterpriseLicensing.trackUsage(licenseId, user1.address);

      const lastUsage = await enterpriseLicensing.getLastUsage(licenseId, user1.address);
      expect(lastUsage).to.be.greaterThan(0);
    });

    it('Should fail to track usage for unassigned seat', async function () {
      await expect(
        enterpriseLicensing.trackUsage(licenseId, user2.address)
      ).to.be.revertedWith('User does not have assigned seat');
    });

    it('Should fail to track usage for expired license', async function () {
      await time.increase(DURATION + 1);

      await expect(
        enterpriseLicensing.trackUsage(licenseId, user1.address)
      ).to.be.revertedWith('License has expired');
    });
  });

  describe('Seat Increase', function () {
    let licenseId: string;

    beforeEach(async function () {
      const tx = await enterpriseLicensing.issueLicense(
        CONTENT_ID,
        enterprise.address,
        SEATS,
        DURATION,
        { value: TOTAL_COST }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return enterpriseLicensing.interface.parseLog(log)?.name === 'LicenseIssued';
        } catch {
          return false;
        }
      });

      const parsedEvent = enterpriseLicensing.interface.parseLog(event as any);
      licenseId = parsedEvent?.args[0];
    });

    it('Should increase seats successfully', async function () {
      const additionalSeats = 3;
      const additionalCost = PRICE_PER_SEAT * BigInt(additionalSeats);

      await enterpriseLicensing
        .connect(enterprise)
        .increaseSeats(licenseId, additionalSeats, { value: additionalCost });

      const license = await enterpriseLicensing.getLicense(licenseId);
      expect(license.seats).to.equal(SEATS + additionalSeats);
    });

    it('Should fail to increase seats with insufficient payment', async function () {
      await expect(
        enterpriseLicensing.connect(enterprise).increaseSeats(licenseId, 3, {
          value: ethers.parseEther('0.1'),
        })
      ).to.be.revertedWith('Insufficient payment');
    });

    it('Should fail to increase seats without authorization', async function () {
      await expect(
        enterpriseLicensing.connect(user1).increaseSeats(licenseId, 3, {
          value: PRICE_PER_SEAT * BigInt(3),
        })
      ).to.be.revertedWith('Not authorized');
    });
  });

  describe('License Suspension', function () {
    let licenseId: string;

    beforeEach(async function () {
      const tx = await enterpriseLicensing.issueLicense(
        CONTENT_ID,
        enterprise.address,
        SEATS,
        DURATION,
        { value: TOTAL_COST }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return enterpriseLicensing.interface.parseLog(log)?.name === 'LicenseIssued';
        } catch {
          return false;
        }
      });

      const parsedEvent = enterpriseLicensing.interface.parseLog(event as any);
      licenseId = parsedEvent?.args[0];
    });

    it('Should suspend license', async function () {
      await enterpriseLicensing.suspendLicense(licenseId);

      const license = await enterpriseLicensing.getLicense(licenseId);
      expect(license.isActive).to.be.false;
    });

    it('Should reactivate suspended license', async function () {
      await enterpriseLicensing.suspendLicense(licenseId);
      await enterpriseLicensing.reactivateLicense(licenseId);

      const license = await enterpriseLicensing.getLicense(licenseId);
      expect(license.isActive).to.be.true;
    });

    it('Should fail to suspend license without admin rights', async function () {
      await expect(
        enterpriseLicensing.connect(enterprise).suspendLicense(licenseId)
      ).to.be.revertedWithCustomError(enterpriseLicensing, 'OwnableUnauthorizedAccount');
    });
  });

  describe('Query Functions', function () {
    let licenseId: string;

    beforeEach(async function () {
      const tx = await enterpriseLicensing.issueLicense(
        CONTENT_ID,
        enterprise.address,
        SEATS,
        DURATION,
        { value: TOTAL_COST }
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return enterpriseLicensing.interface.parseLog(log)?.name === 'LicenseIssued';
        } catch {
          return false;
        }
      });

      const parsedEvent = enterpriseLicensing.interface.parseLog(event as any);
      licenseId = parsedEvent?.args[0];
    });

    it('Should get enterprise licenses', async function () {
      const licenses = await enterpriseLicensing.getEnterpriseLicenses(enterprise.address);
      expect(licenses.length).to.equal(1);
      expect(licenses[0]).to.equal(licenseId);
    });

    it('Should get available seats', async function () {
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user1.address);
      await enterpriseLicensing.connect(enterprise).assignSeat(licenseId, user2.address);

      const availableSeats = await enterpriseLicensing.getAvailableSeats(licenseId);
      expect(availableSeats).to.equal(SEATS - 2);
    });
  });

  describe('Admin Functions', function () {
    it('Should pause contract', async function () {
      await enterpriseLicensing.pause();

      await expect(
        enterpriseLicensing.issueLicense(CONTENT_ID, enterprise.address, SEATS, DURATION, {
          value: TOTAL_COST,
        })
      ).to.be.revertedWithCustomError(enterpriseLicensing, 'EnforcedPause');
    });

    it('Should unpause contract', async function () {
      await enterpriseLicensing.pause();
      await enterpriseLicensing.unpause();

      await expect(
        enterpriseLicensing.issueLicense(CONTENT_ID, enterprise.address, SEATS, DURATION, {
          value: TOTAL_COST,
        })
      ).to.not.be.reverted;
    });

    it('Should withdraw contract balance', async function () {
      await enterpriseLicensing.issueLicense(CONTENT_ID, enterprise.address, SEATS, DURATION, {
        value: TOTAL_COST,
      });

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await enterpriseLicensing.withdraw();
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
  });
});
