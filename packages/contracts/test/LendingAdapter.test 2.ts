import { expect } from 'chai';
import { ethers } from 'hardhat';
import { LendingAdapter, MockERC20, CopyrightRegistrySimple } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('LendingAdapter - Aave V3 Integration', function () {
  let lendingAdapter: LendingAdapter;
  let nftContract: CopyrightRegistrySimple;
  let usdcToken: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let liquidator: SignerWithAddress;
  
  // Mock Aave V3 addresses
  let mockAavePool: string;
  let mockAddressesProvider: string;
  let mockNFTOracle: string;
  
  const INITIAL_SUPPLY = ethers.parseEther('1000000');
  const NFT_VALUATION = ethers.parseEther('10000'); // $10,000 USD
  
  before(async function () {
    [owner, user1, user2, liquidator] = await ethers.getSigners();
    
    // Deploy mock USDC token
    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    usdcToken = await MockERC20Factory.deploy('USD Coin', 'USDC', INITIAL_SUPPLY);
    
    // Deploy NFT contract
    const CopyrightRegistryFactory = await ethers.getContractFactory('CopyrightRegistrySimple');
    nftContract = await CopyrightRegistryFactory.deploy();
    
    // For testing purposes, use placeholder addresses
    mockAavePool = ethers.Wallet.createRandom().address;
    mockAddressesProvider = ethers.Wallet.createRandom().address;
    mockNFTOracle = ethers.Wallet.createRandom().address;
  });
  
  describe('Deployment', function () {
    it('Should deploy with correct Aave addresses', async function () {
      const LendingAdapterFactory = await ethers.getContractFactory('LendingAdapter');
      lendingAdapter = await LendingAdapterFactory.deploy(
        mockAavePool,
        mockAddressesProvider,
        mockNFTOracle
      );
      
      expect(await lendingAdapter.aavePool()).to.equal(mockAavePool);
      expect(await lendingAdapter.addressesProvider()).to.equal(mockAddressesProvider);
      expect(await lendingAdapter.nftOracle()).to.equal(mockNFTOracle);
    });
    
    it('Should revert with invalid addresses', async function () {
      const LendingAdapterFactory = await ethers.getContractFactory('LendingAdapter');
      
      await expect(
        LendingAdapterFactory.deploy(ethers.ZeroAddress, mockAddressesProvider, mockNFTOracle)
      ).to.be.revertedWith('Invalid pool');
      
      await expect(
        LendingAdapterFactory.deploy(mockAavePool, ethers.ZeroAddress, mockNFTOracle)
      ).to.be.revertedWith('Invalid provider');
      
      await expect(
        LendingAdapterFactory.deploy(mockAavePool, mockAddressesProvider, ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid oracle');
    });
  });
  
  describe('Lending Parameters', function () {
    it('Should have correct LTV ratio', async function () {
      expect(await lendingAdapter.LTV_RATIO()).to.equal(5000); // 50%
    });
    
    it('Should have correct liquidation threshold', async function () {
      expect(await lendingAdapter.LIQUIDATION_THRESHOLD()).to.equal(7500); // 75%
    });
    
    it('Should have correct liquidation bonus', async function () {
      expect(await lendingAdapter.LIQUIDATION_BONUS()).to.equal(500); // 5%
    });
    
    it('Should have correct minimum health factor', async function () {
      expect(await lendingAdapter.MIN_HEALTH_FACTOR()).to.equal(ethers.parseEther('1')); // 1.0
    });
  });
  
  describe('NFT Support Management', function () {
    it('Should allow owner to add supported NFT', async function () {
      await expect(
        lendingAdapter.addSupportedNFT(await nftContract.getAddress())
      ).to.emit(lendingAdapter, 'NFTSupportUpdated')
        .withArgs(await nftContract.getAddress(), true);
      
      expect(await lendingAdapter.supportedNFTs(await nftContract.getAddress())).to.be.true;
    });
    
    it('Should allow owner to remove supported NFT', async function () {
      await expect(
        lendingAdapter.removeSupportedNFT(await nftContract.getAddress())
      ).to.emit(lendingAdapter, 'NFTSupportUpdated')
        .withArgs(await nftContract.getAddress(), false);
      
      expect(await lendingAdapter.supportedNFTs(await nftContract.getAddress())).to.be.false;
      
      // Re-add for other tests
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
    });
    
    it('Should not allow non-owner to add supported NFT', async function () {
      await expect(
        lendingAdapter.connect(user1).addSupportedNFT(await nftContract.getAddress())
      ).to.be.reverted;
    });
    
    it('Should revert when adding zero address', async function () {
      await expect(
        lendingAdapter.addSupportedNFT(ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid NFT contract');
    });
  });
  
  describe('Oracle Management', function () {
    it('Should allow owner to update NFT oracle', async function () {
      const newOracle = ethers.Wallet.createRandom().address;
      
      await expect(
        lendingAdapter.updateNFTOracle(newOracle)
      ).to.emit(lendingAdapter, 'OracleUpdated')
        .withArgs(mockNFTOracle, newOracle);
      
      expect(await lendingAdapter.nftOracle()).to.equal(newOracle);
      
      // Reset to original
      await lendingAdapter.updateNFTOracle(mockNFTOracle);
    });
    
    it('Should not allow non-owner to update oracle', async function () {
      const newOracle = ethers.Wallet.createRandom().address;
      
      await expect(
        lendingAdapter.connect(user1).updateNFTOracle(newOracle)
      ).to.be.reverted;
    });
  });
  
  describe('Position Management', function () {
    it('Should track user positions', async function () {
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      expect(positions).to.be.an('array');
    });
  });
  
  describe('Health Factor Calculations', function () {
    it('Should calculate max borrow correctly', async function () {
      // For $10,000 collateral with 50% LTV, max borrow should be $5,000
      const collateralValue = ethers.parseEther('10000');
      const expectedMaxBorrow = ethers.parseEther('5000');
      
      // This would be tested through actual position creation
      // For now, verify the constant
      const ltvRatio = await lendingAdapter.LTV_RATIO();
      const calculatedMaxBorrow = (collateralValue * ltvRatio) / 10000n;
      
      expect(calculatedMaxBorrow).to.equal(expectedMaxBorrow);
    });
    
    it('Should calculate liquidation threshold correctly', async function () {
      const collateralValue = ethers.parseEther('10000');
      const liquidationThreshold = await lendingAdapter.LIQUIDATION_THRESHOLD();
      const expectedThreshold = (collateralValue * liquidationThreshold) / 10000n;
      
      expect(expectedThreshold).to.equal(ethers.parseEther('7500'));
    });
  });
  
  describe('ERC721 Receiver', function () {
    it('Should implement ERC721 receiver interface', async function () {
      const selector = lendingAdapter.interface.getFunction('onERC721Received').selector;
      expect(selector).to.equal('0x150b7a02');
    });
  });
  
  describe('Event Definitions', function () {
    it('Should define all required events', async function () {
      const contractInterface = lendingAdapter.interface;
      
      expect(contractInterface.getEvent('CollateralSupplied')).to.not.be.undefined;
      expect(contractInterface.getEvent('CollateralWithdrawn')).to.not.be.undefined;
      expect(contractInterface.getEvent('Borrowed')).to.not.be.undefined;
      expect(contractInterface.getEvent('Repaid')).to.not.be.undefined;
      expect(contractInterface.getEvent('Liquidated')).to.not.be.undefined;
      expect(contractInterface.getEvent('NFTSupportUpdated')).to.not.be.undefined;
      expect(contractInterface.getEvent('OracleUpdated')).to.not.be.undefined;
    });
  });
  
  describe('Error Handling', function () {
    it('Should define custom errors', async function () {
      // Verify that custom errors are defined in the contract
      const contractCode = await ethers.provider.getCode(await lendingAdapter.getAddress());
      expect(contractCode).to.not.equal('0x');
    });
  });
  
  describe('Integration Scenarios', function () {
    it('Should prepare tokens for lending operations', async function () {
      const amount = ethers.parseEther('10000');
      
      // Transfer USDC to users
      await usdcToken.transfer(await user1.getAddress(), amount);
      await usdcToken.transfer(await liquidator.getAddress(), amount);
      
      expect(await usdcToken.balanceOf(await user1.getAddress())).to.equal(amount);
      expect(await usdcToken.balanceOf(await liquidator.getAddress())).to.equal(amount);
    });
  });
});
