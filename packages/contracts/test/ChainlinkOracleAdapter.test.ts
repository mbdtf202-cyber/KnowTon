import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ChainlinkOracleAdapter } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('ChainlinkOracleAdapter - Chainlink Integration', function () {
  let oracleAdapter: ChainlinkOracleAdapter;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let oracleOperator: SignerWithAddress;
  
  // Mock Chainlink addresses
  let mockVRFCoordinator: string;
  let mockPriceFeed: string;
  const subscriptionId = 1;
  const keyHash = ethers.encodeBytes32String('test-key-hash');
  
  before(async function () {
    [owner, user1, user2, oracleOperator] = await ethers.getSigners();
    
    // For testing purposes, use placeholder addresses
    mockVRFCoordinator = ethers.Wallet.createRandom().address;
    mockPriceFeed = ethers.Wallet.createRandom().address;
  });
  
  describe('Deployment', function () {
    it('Should deploy with correct VRF configuration', async function () {
      const OracleAdapterFactory = await ethers.getContractFactory('ChainlinkOracleAdapter');
      oracleAdapter = await OracleAdapterFactory.deploy(
        mockVRFCoordinator,
        subscriptionId,
        keyHash
      );
      
      expect(await oracleAdapter.vrfCoordinator()).to.equal(mockVRFCoordinator);
      expect(await oracleAdapter.subscriptionId()).to.equal(subscriptionId);
      expect(await oracleAdapter.keyHash()).to.equal(keyHash);
    });
    
    it('Should have default VRF parameters', async function () {
      expect(await oracleAdapter.callbackGasLimit()).to.equal(100000);
      expect(await oracleAdapter.requestConfirmations()).to.equal(3);
      expect(await oracleAdapter.numWords()).to.equal(1);
    });
    
    it('Should revert with invalid VRF coordinator', async function () {
      const OracleAdapterFactory = await ethers.getContractFactory('ChainlinkOracleAdapter');
      
      await expect(
        OracleAdapterFactory.deploy(ethers.ZeroAddress, subscriptionId, keyHash)
      ).to.be.revertedWith('Invalid VRF coordinator');
    });
  });
  
  describe('Price Feed Management', function () {
    const tokenAddress = ethers.Wallet.createRandom().address;
    
    it('Should allow owner to set price feed', async function () {
      await expect(
        oracleAdapter.setPriceFeed(tokenAddress, mockPriceFeed)
      ).to.emit(oracleAdapter, 'PriceFeedUpdated')
        .withArgs(tokenAddress, mockPriceFeed);
      
      expect(await oracleAdapter.priceFeeds(tokenAddress)).to.equal(mockPriceFeed);
    });
    
    it('Should not allow non-owner to set price feed', async function () {
      await expect(
        oracleAdapter.connect(user1).setPriceFeed(tokenAddress, mockPriceFeed)
      ).to.be.reverted;
    });
    
    it('Should revert with invalid token address', async function () {
      await expect(
        oracleAdapter.setPriceFeed(ethers.ZeroAddress, mockPriceFeed)
      ).to.be.revertedWith('Invalid token');
    });
    
    it('Should revert with invalid price feed address', async function () {
      await expect(
        oracleAdapter.setPriceFeed(tokenAddress, ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid price feed');
    });
  });
  
  describe('VRF Configuration', function () {
    it('Should allow owner to update VRF config', async function () {
      await oracleAdapter.updateVRFConfig(200000, 5, 2);
      
      expect(await oracleAdapter.callbackGasLimit()).to.equal(200000);
      expect(await oracleAdapter.requestConfirmations()).to.equal(5);
      expect(await oracleAdapter.numWords()).to.equal(2);
      
      // Reset to defaults
      await oracleAdapter.updateVRFConfig(100000, 3, 1);
    });
    
    it('Should not allow non-owner to update VRF config', async function () {
      await expect(
        oracleAdapter.connect(user1).updateVRFConfig(200000, 5, 2)
      ).to.be.reverted;
    });
    
    it('Should revert with invalid gas limit', async function () {
      await expect(
        oracleAdapter.updateVRFConfig(0, 3, 1)
      ).to.be.revertedWith('Invalid gas limit');
    });
    
    it('Should revert with invalid confirmations', async function () {
      await expect(
        oracleAdapter.updateVRFConfig(100000, 0, 1)
      ).to.be.revertedWith('Invalid confirmations');
    });
    
    it('Should revert with invalid num words', async function () {
      await expect(
        oracleAdapter.updateVRFConfig(100000, 3, 0)
      ).to.be.revertedWith('Invalid num words');
    });
  });
  
  describe('Automation Task Management', function () {
    const targetContract = ethers.Wallet.createRandom().address;
    const callData = ethers.id('test()').slice(0, 10); // Function selector
    const interval = 3600; // 1 hour
    
    let taskId: string;
    
    it('Should allow owner to create automation task', async function () {
      const tx = await oracleAdapter.createAutomationTask(
        targetContract,
        callData,
        interval
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'AutomationTaskCreated'
      );
      
      expect(event).to.not.be.undefined;
      
      // Get task ID from event or calculate it
      taskId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'bytes', 'uint256'],
          [targetContract, callData, (await ethers.provider.getBlock('latest'))?.timestamp]
        )
      );
    });
    
    it('Should not allow non-owner to create automation task', async function () {
      await expect(
        oracleAdapter.connect(user1).createAutomationTask(targetContract, callData, interval)
      ).to.be.reverted;
    });
    
    it('Should revert with invalid target', async function () {
      await expect(
        oracleAdapter.createAutomationTask(ethers.ZeroAddress, callData, interval)
      ).to.be.revertedWith('Invalid target');
    });
    
    it('Should revert with interval too short', async function () {
      await expect(
        oracleAdapter.createAutomationTask(targetContract, callData, 30)
      ).to.be.revertedWith('Interval too short');
    });
    
    it('Should get active task IDs', async function () {
      const activeTaskIds = await oracleAdapter.getActiveTaskIds();
      expect(activeTaskIds).to.be.an('array');
      expect(activeTaskIds.length).to.be.greaterThan(0);
    });
    
    it('Should allow owner to cancel automation task', async function () {
      // Create a new task to cancel
      const tx = await oracleAdapter.createAutomationTask(
        targetContract,
        callData,
        interval
      );
      await tx.wait();
      
      const activeTaskIds = await oracleAdapter.getActiveTaskIds();
      const taskToCancel = activeTaskIds[activeTaskIds.length - 1];
      
      await expect(
        oracleAdapter.cancelAutomationTask(taskToCancel)
      ).to.emit(oracleAdapter, 'AutomationTaskCancelled')
        .withArgs(taskToCancel);
    });
  });
  
  describe('NFT Valuation Oracle', function () {
    const nftContract = ethers.Wallet.createRandom().address;
    const tokenId = 1;
    const value = ethers.parseEther('10000'); // $10,000
    const confidence = 85; // 85%
    
    it('Should allow submission of NFT valuation', async function () {
      await expect(
        oracleAdapter.connect(oracleOperator).submitValuation(
          nftContract,
          tokenId,
          value,
          confidence
        )
      ).to.emit(oracleAdapter, 'ValuationSubmitted')
        .withArgs(nftContract, tokenId, value, confidence, await oracleOperator.getAddress());
    });
    
    it('Should retrieve NFT valuation', async function () {
      const valuation = await oracleAdapter.getValuation(nftContract, tokenId);
      
      expect(valuation.value).to.equal(value);
      expect(valuation.confidence).to.equal(confidence);
      expect(valuation.oracle).to.equal(await oracleOperator.getAddress());
    });
    
    it('Should check if valuation is stale', async function () {
      const maxAge = 3600; // 1 hour
      const isStale = await oracleAdapter.isValuationStale(nftContract, tokenId, maxAge);
      
      // Should not be stale immediately after submission
      expect(isStale).to.be.false;
    });
    
    it('Should revert with invalid NFT contract', async function () {
      await expect(
        oracleAdapter.submitValuation(ethers.ZeroAddress, tokenId, value, confidence)
      ).to.be.revertedWith('Invalid NFT contract');
    });
    
    it('Should revert with invalid value', async function () {
      await expect(
        oracleAdapter.submitValuation(nftContract, tokenId, 0, confidence)
      ).to.be.revertedWith('Invalid value');
    });
    
    it('Should revert with invalid confidence', async function () {
      await expect(
        oracleAdapter.submitValuation(nftContract, tokenId, value, 101)
      ).to.be.revertedWith('Invalid confidence');
    });
    
    it('Should revert when getting non-existent valuation', async function () {
      const nonExistentNFT = ethers.Wallet.createRandom().address;
      
      await expect(
        oracleAdapter.getValuation(nonExistentNFT, 999)
      ).to.be.revertedWith('Valuation not found');
    });
  });
  
  describe('Event Definitions', function () {
    it('Should define all required events', async function () {
      const contractInterface = oracleAdapter.interface;
      
      expect(contractInterface.getEvent('PriceFeedUpdated')).to.not.be.undefined;
      expect(contractInterface.getEvent('PriceRequested')).to.not.be.undefined;
      expect(contractInterface.getEvent('RandomnessRequested')).to.not.be.undefined;
      expect(contractInterface.getEvent('RandomnessFulfilled')).to.not.be.undefined;
      expect(contractInterface.getEvent('AutomationTaskCreated')).to.not.be.undefined;
      expect(contractInterface.getEvent('AutomationTaskExecuted')).to.not.be.undefined;
      expect(contractInterface.getEvent('AutomationTaskCancelled')).to.not.be.undefined;
      expect(contractInterface.getEvent('ValuationSubmitted')).to.not.be.undefined;
    });
  });
  
  describe('Integration Scenarios', function () {
    it('Should support multiple price feeds', async function () {
      const token1 = ethers.Wallet.createRandom().address;
      const token2 = ethers.Wallet.createRandom().address;
      const feed1 = ethers.Wallet.createRandom().address;
      const feed2 = ethers.Wallet.createRandom().address;
      
      await oracleAdapter.setPriceFeed(token1, feed1);
      await oracleAdapter.setPriceFeed(token2, feed2);
      
      expect(await oracleAdapter.priceFeeds(token1)).to.equal(feed1);
      expect(await oracleAdapter.priceFeeds(token2)).to.equal(feed2);
    });
    
    it('Should support multiple NFT valuations', async function () {
      const nft1 = ethers.Wallet.createRandom().address;
      const nft2 = ethers.Wallet.createRandom().address;
      
      await oracleAdapter.submitValuation(nft1, 1, ethers.parseEther('5000'), 90);
      await oracleAdapter.submitValuation(nft2, 1, ethers.parseEther('8000'), 85);
      
      const val1 = await oracleAdapter.getValuation(nft1, 1);
      const val2 = await oracleAdapter.getValuation(nft2, 1);
      
      expect(val1.value).to.equal(ethers.parseEther('5000'));
      expect(val2.value).to.equal(ethers.parseEther('8000'));
    });
  });
});
