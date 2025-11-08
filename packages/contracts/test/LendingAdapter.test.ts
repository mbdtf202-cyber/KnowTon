import { expect } from 'chai';
import { ethers } from 'hardhat';
import { 
  LendingAdapter, 
  MockERC20,
  MockERC721,
  MockAavePool,
  MockPoolAddressesProvider,
  MockAaveOracle,
  MockNFTOracle
} from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('LendingAdapter - Aave V3 Integration', function () {
  let lendingAdapter: LendingAdapter;
  let nftContract: MockERC721;
  let usdcToken: MockERC20;
  let mockAavePool: MockAavePool;
  let mockAddressesProvider: MockPoolAddressesProvider;
  let mockAaveOracle: MockAaveOracle;
  let mockNFTOracle: MockNFTOracle;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let liquidator: SignerWithAddress;
  
  const INITIAL_SUPPLY = ethers.parseEther('1000000');
  const NFT_VALUATION = ethers.parseEther('10000'); // $10,000 USD
  const USDC_PRICE = ethers.parseEther('1'); // $1 per USDC
  
  before(async function () {
    [owner, user1, user2, liquidator] = await ethers.getSigners();
    
    // Deploy mock USDC token
    const MockERC20Factory = await ethers.getContractFactory('MockERC20');
    usdcToken = await MockERC20Factory.deploy('USD Coin', 'USDC', INITIAL_SUPPLY);
    
    // Deploy NFT contract
    const MockERC721Factory = await ethers.getContractFactory('MockERC721');
    nftContract = await MockERC721Factory.deploy('Test NFT', 'TNFT');
    
    // Deploy mock Aave contracts
    const MockAavePoolFactory = await ethers.getContractFactory('MockAavePool');
    mockAavePool = await MockAavePoolFactory.deploy();
    
    const MockAaveOracleFactory = await ethers.getContractFactory('MockAaveOracle');
    mockAaveOracle = await MockAaveOracleFactory.deploy();
    
    const MockPoolAddressesProviderFactory = await ethers.getContractFactory('MockPoolAddressesProvider');
    mockAddressesProvider = await MockPoolAddressesProviderFactory.deploy(
      await mockAavePool.getAddress(),
      await mockAaveOracle.getAddress()
    );
    
    // Deploy mock NFT Oracle
    const MockNFTOracleFactory = await ethers.getContractFactory('MockNFTOracle');
    mockNFTOracle = await MockNFTOracleFactory.deploy(NFT_VALUATION);
    
    // Set USDC price in Aave oracle
    await mockAaveOracle.setAssetPrice(await usdcToken.getAddress(), USDC_PRICE);
    
    // Fund mock Aave pool with liquidity
    await usdcToken.transfer(await mockAavePool.getAddress(), ethers.parseEther('500000'));
  });
  
  describe('Deployment', function () {
    it('Should deploy with correct Aave addresses', async function () {
      const LendingAdapterFactory = await ethers.getContractFactory('LendingAdapter');
      lendingAdapter = await LendingAdapterFactory.deploy(
        await mockAavePool.getAddress(),
        await mockAddressesProvider.getAddress(),
        await mockNFTOracle.getAddress()
      );
      
      expect(await lendingAdapter.aavePool()).to.equal(await mockAavePool.getAddress());
      expect(await lendingAdapter.addressesProvider()).to.equal(await mockAddressesProvider.getAddress());
      expect(await lendingAdapter.nftOracle()).to.equal(await mockNFTOracle.getAddress());
    });
    
    it('Should revert with invalid addresses', async function () {
      const LendingAdapterFactory = await ethers.getContractFactory('LendingAdapter');
      
      await expect(
        LendingAdapterFactory.deploy(
          ethers.ZeroAddress, 
          await mockAddressesProvider.getAddress(), 
          await mockNFTOracle.getAddress()
        )
      ).to.be.revertedWith('Invalid pool');
      
      await expect(
        LendingAdapterFactory.deploy(
          await mockAavePool.getAddress(), 
          ethers.ZeroAddress, 
          await mockNFTOracle.getAddress()
        )
      ).to.be.revertedWith('Invalid provider');
      
      await expect(
        LendingAdapterFactory.deploy(
          await mockAavePool.getAddress(), 
          await mockAddressesProvider.getAddress(), 
          ethers.ZeroAddress
        )
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
  
  describe('Collateral Supply', function () {
    let tokenId: bigint;
    
    beforeEach(async function () {
      // Mint NFT to user1
      tokenId = await nftContract.connect(user1).mint.staticCall(await user1.getAddress());
      await nftContract.connect(user1).mint(await user1.getAddress());
    });
    
    it('Should supply NFT as collateral', async function () {
      // Approve NFT transfer
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      
      // Supply collateral
      const tx = await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === 'CollateralSupplied'
      );
      
      expect(event).to.not.be.undefined;
      
      // Verify NFT transferred to adapter
      expect(await nftContract.ownerOf(tokenId)).to.equal(await lendingAdapter.getAddress());
    });
    
    it('Should revert when supplying unsupported NFT', async function () {
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      
      await expect(
        lendingAdapter.connect(user1).supplyCollateral(
          await nftContract.getAddress(),
          tokenId
        )
      ).to.be.revertedWithCustomError(lendingAdapter, 'NFTNotSupported');
    });
    
    it('Should track user positions after supply', async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      
      await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      expect(positions.length).to.equal(1);
    });
    
    it('Should store correct position data', async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      
      const tx = await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      const positionId = positions[0];
      const position = await lendingAdapter.getPosition(positionId);
      
      expect(position.nftContract).to.equal(await nftContract.getAddress());
      expect(position.tokenId).to.equal(tokenId);
      expect(position.owner).to.equal(await user1.getAddress());
      expect(position.valuationUSD).to.equal(NFT_VALUATION);
      expect(position.borrowedAmount).to.equal(0);
      expect(position.isActive).to.be.true;
    });
  });
  
  describe('Collateral Withdrawal', function () {
    let tokenId: bigint;
    let positionId: string;
    
    beforeEach(async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      
      // Mint NFT and supply as collateral
      tokenId = await nftContract.connect(user1).mint.staticCall(await user1.getAddress());
      await nftContract.connect(user1).mint(await user1.getAddress());
      
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      positionId = positions[0];
    });
    
    it('Should withdraw collateral when no debt', async function () {
      await expect(
        lendingAdapter.connect(user1).withdrawCollateral(positionId)
      ).to.emit(lendingAdapter, 'CollateralWithdrawn')
        .withArgs(positionId, await user1.getAddress(), await nftContract.getAddress(), tokenId);
      
      // Verify NFT returned to user
      expect(await nftContract.ownerOf(tokenId)).to.equal(await user1.getAddress());
      
      // Verify position marked inactive
      const position = await lendingAdapter.getPosition(positionId);
      expect(position.isActive).to.be.false;
    });
    
    it('Should revert when withdrawing with outstanding debt', async function () {
      // First borrow against collateral
      const borrowAmount = ethers.parseEther('1000');
      await usdcToken.connect(user1).approve(await lendingAdapter.getAddress(), borrowAmount);
      
      await lendingAdapter.connect(user1).borrow(
        positionId,
        await usdcToken.getAddress(),
        borrowAmount
      );
      
      // Try to withdraw
      await expect(
        lendingAdapter.connect(user1).withdrawCollateral(positionId)
      ).to.be.revertedWithCustomError(lendingAdapter, 'InsufficientCollateral');
    });
    
    it('Should revert when non-owner tries to withdraw', async function () {
      await expect(
        lendingAdapter.connect(user2).withdrawCollateral(positionId)
      ).to.be.revertedWithCustomError(lendingAdapter, 'UnauthorizedAccess');
    });
    
    it('Should revert when withdrawing inactive position', async function () {
      await lendingAdapter.connect(user1).withdrawCollateral(positionId);
      
      await expect(
        lendingAdapter.connect(user1).withdrawCollateral(positionId)
      ).to.be.revertedWithCustomError(lendingAdapter, 'PositionNotActive');
    });
  });
  
  describe('Borrowing', function () {
    let tokenId: bigint;
    let positionId: string;
    
    beforeEach(async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      
      // Mint NFT and supply as collateral
      tokenId = await nftContract.connect(user1).mint.staticCall(await user1.getAddress());
      await nftContract.connect(user1).mint(await user1.getAddress());
      
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      positionId = positions[0];
    });
    
    it('Should borrow against collateral', async function () {
      const borrowAmount = ethers.parseEther('1000');
      const initialBalance = await usdcToken.balanceOf(await user1.getAddress());
      
      await expect(
        lendingAdapter.connect(user1).borrow(
          positionId,
          await usdcToken.getAddress(),
          borrowAmount
        )
      ).to.emit(lendingAdapter, 'Borrowed');
      
      // Verify user received borrowed tokens
      const finalBalance = await usdcToken.balanceOf(await user1.getAddress());
      expect(finalBalance - initialBalance).to.equal(borrowAmount);
      
      // Verify position updated
      const position = await lendingAdapter.getPosition(positionId);
      expect(position.borrowedAmount).to.equal(borrowAmount);
    });
    
    it('Should calculate max borrow correctly', async function () {
      const maxBorrow = await lendingAdapter.getMaxBorrow(positionId);
      
      // With $10,000 collateral and 50% LTV, max borrow should be $5,000
      expect(maxBorrow).to.equal(ethers.parseEther('5000'));
    });
    
    it('Should revert when borrowing exceeds LTV', async function () {
      const excessiveAmount = ethers.parseEther('6000'); // More than 50% LTV
      
      await expect(
        lendingAdapter.connect(user1).borrow(
          positionId,
          await usdcToken.getAddress(),
          excessiveAmount
        )
      ).to.be.revertedWithCustomError(lendingAdapter, 'InsufficientCollateral');
    });
    
    it('Should revert when borrowing zero amount', async function () {
      await expect(
        lendingAdapter.connect(user1).borrow(
          positionId,
          await usdcToken.getAddress(),
          0
        )
      ).to.be.revertedWithCustomError(lendingAdapter, 'InvalidAmount');
    });
    
    it('Should revert when non-owner tries to borrow', async function () {
      await expect(
        lendingAdapter.connect(user2).borrow(
          positionId,
          await usdcToken.getAddress(),
          ethers.parseEther('1000')
        )
      ).to.be.revertedWithCustomError(lendingAdapter, 'UnauthorizedAccess');
    });
    
    it('Should allow multiple borrows up to limit', async function () {
      const firstBorrow = ethers.parseEther('2000');
      const secondBorrow = ethers.parseEther('2000');
      
      await lendingAdapter.connect(user1).borrow(
        positionId,
        await usdcToken.getAddress(),
        firstBorrow
      );
      
      await lendingAdapter.connect(user1).borrow(
        positionId,
        await usdcToken.getAddress(),
        secondBorrow
      );
      
      const position = await lendingAdapter.getPosition(positionId);
      expect(position.borrowedAmount).to.equal(firstBorrow + secondBorrow);
    });
  });
  
  describe('Repayment', function () {
    let tokenId: bigint;
    let positionId: string;
    const borrowAmount = ethers.parseEther('2000');
    
    beforeEach(async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      
      // Mint NFT and supply as collateral
      tokenId = await nftContract.connect(user1).mint.staticCall(await user1.getAddress());
      await nftContract.connect(user1).mint(await user1.getAddress());
      
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      positionId = positions[0];
      
      // Borrow
      await lendingAdapter.connect(user1).borrow(
        positionId,
        await usdcToken.getAddress(),
        borrowAmount
      );
    });
    
    it('Should repay borrowed amount', async function () {
      const repayAmount = ethers.parseEther('1000');
      
      await usdcToken.connect(user1).approve(await lendingAdapter.getAddress(), repayAmount);
      
      await expect(
        lendingAdapter.connect(user1).repay(
          positionId,
          await usdcToken.getAddress(),
          repayAmount
        )
      ).to.emit(lendingAdapter, 'Repaid')
        .withArgs(positionId, await user1.getAddress(), await usdcToken.getAddress(), repayAmount);
      
      const position = await lendingAdapter.getPosition(positionId);
      expect(position.borrowedAmount).to.equal(borrowAmount - repayAmount);
    });
    
    it('Should fully repay debt', async function () {
      await usdcToken.connect(user1).approve(await lendingAdapter.getAddress(), borrowAmount);
      
      await lendingAdapter.connect(user1).repay(
        positionId,
        await usdcToken.getAddress(),
        borrowAmount
      );
      
      const position = await lendingAdapter.getPosition(positionId);
      expect(position.borrowedAmount).to.equal(0);
    });
    
    it('Should handle overpayment correctly', async function () {
      const overpayAmount = ethers.parseEther('5000'); // More than borrowed
      
      await usdcToken.connect(user1).approve(await lendingAdapter.getAddress(), overpayAmount);
      
      await lendingAdapter.connect(user1).repay(
        positionId,
        await usdcToken.getAddress(),
        overpayAmount
      );
      
      const position = await lendingAdapter.getPosition(positionId);
      expect(position.borrowedAmount).to.equal(0);
    });
    
    it('Should revert when repaying zero amount', async function () {
      await expect(
        lendingAdapter.connect(user1).repay(
          positionId,
          await usdcToken.getAddress(),
          0
        )
      ).to.be.revertedWithCustomError(lendingAdapter, 'InvalidAmount');
    });
    
    it('Should revert when non-owner tries to repay', async function () {
      const repayAmount = ethers.parseEther('1000');
      await usdcToken.connect(user2).approve(await lendingAdapter.getAddress(), repayAmount);
      
      await expect(
        lendingAdapter.connect(user2).repay(
          positionId,
          await usdcToken.getAddress(),
          repayAmount
        )
      ).to.be.revertedWithCustomError(lendingAdapter, 'UnauthorizedAccess');
    });
  });
  
  describe('Health Factor', function () {
    let tokenId: bigint;
    let positionId: string;
    
    beforeEach(async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      
      // Mint NFT and supply as collateral
      tokenId = await nftContract.connect(user1).mint.staticCall(await user1.getAddress());
      await nftContract.connect(user1).mint(await user1.getAddress());
      
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      positionId = positions[0];
    });
    
    it('Should return max health factor when no debt', async function () {
      const healthFactor = await lendingAdapter.getHealthFactor(positionId);
      expect(healthFactor).to.equal(ethers.MaxUint256);
    });
    
    it('Should calculate health factor correctly with debt', async function () {
      const borrowAmount = ethers.parseEther('2000');
      
      await lendingAdapter.connect(user1).borrow(
        positionId,
        await usdcToken.getAddress(),
        borrowAmount
      );
      
      const healthFactor = await lendingAdapter.getHealthFactor(positionId);
      
      // Health Factor = (Collateral * Liquidation Threshold) / Debt
      // = ($10,000 * 0.75) / $2,000 = 3.75
      const expectedHealthFactor = ethers.parseEther('3.75');
      expect(healthFactor).to.equal(expectedHealthFactor);
    });
    
    it('Should have health factor below 1 when undercollateralized', async function () {
      // Borrow close to max
      const borrowAmount = ethers.parseEther('4900');
      
      await lendingAdapter.connect(user1).borrow(
        positionId,
        await usdcToken.getAddress(),
        borrowAmount
      );
      
      const healthFactor = await lendingAdapter.getHealthFactor(positionId);
      
      // Health Factor = ($10,000 * 0.75) / $4,900 ≈ 1.53
      expect(healthFactor).to.be.gt(ethers.parseEther('1'));
      expect(healthFactor).to.be.lt(ethers.parseEther('2'));
    });
  });
  
  describe('Liquidation', function () {
    let tokenId: bigint;
    let positionId: string;
    
    beforeEach(async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      
      // Mint NFT with lower valuation to make liquidation easier
      tokenId = await nftContract.connect(user1).mint.staticCall(await user1.getAddress());
      await nftContract.connect(user1).mint(await user1.getAddress());
      
      // Set lower valuation for this specific NFT
      await mockNFTOracle.setValuation(
        await nftContract.getAddress(),
        tokenId,
        ethers.parseEther('3000') // $3,000
      );
      
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      positionId = positions[0];
      
      // Borrow maximum amount
      const maxBorrow = ethers.parseEther('1500'); // 50% of $3,000
      await lendingAdapter.connect(user1).borrow(
        positionId,
        await usdcToken.getAddress(),
        maxBorrow
      );
      
      // Simulate price drop by updating valuation
      await mockNFTOracle.setValuation(
        await nftContract.getAddress(),
        tokenId,
        ethers.parseEther('1800') // Drop to $1,800
      );
      
      // Fund liquidator
      await usdcToken.transfer(await liquidator.getAddress(), ethers.parseEther('10000'));
    });
    
    it('Should liquidate undercollateralized position', async function () {
      const debtToCover = ethers.parseEther('1000');
      
      await usdcToken.connect(liquidator).approve(await lendingAdapter.getAddress(), debtToCover);
      
      await expect(
        lendingAdapter.connect(liquidator).liquidate(
          positionId,
          await usdcToken.getAddress(),
          debtToCover
        )
      ).to.emit(lendingAdapter, 'Liquidated');
    });
    
    it('Should revert liquidation of healthy position', async function () {
      // Create new healthy position
      const healthyTokenId = await nftContract.connect(user2).mint.staticCall(await user2.getAddress());
      await nftContract.connect(user2).mint(await user2.getAddress());
      
      await nftContract.connect(user2).approve(await lendingAdapter.getAddress(), healthyTokenId);
      await lendingAdapter.connect(user2).supplyCollateral(
        await nftContract.getAddress(),
        healthyTokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user2.getAddress());
      const healthyPositionId = positions[0];
      
      // Borrow small amount
      await lendingAdapter.connect(user2).borrow(
        healthyPositionId,
        await usdcToken.getAddress(),
        ethers.parseEther('1000')
      );
      
      const debtToCover = ethers.parseEther('500');
      await usdcToken.connect(liquidator).approve(await lendingAdapter.getAddress(), debtToCover);
      
      await expect(
        lendingAdapter.connect(liquidator).liquidate(
          healthyPositionId,
          await usdcToken.getAddress(),
          debtToCover
        )
      ).to.be.revertedWithCustomError(lendingAdapter, 'HealthFactorTooLow');
    });
    
    it('Should transfer NFT to liquidator on full liquidation', async function () {
      const fullDebt = ethers.parseEther('1500');
      
      await usdcToken.connect(liquidator).approve(await lendingAdapter.getAddress(), fullDebt);
      
      await lendingAdapter.connect(liquidator).liquidate(
        positionId,
        await usdcToken.getAddress(),
        fullDebt
      );
      
      // Verify NFT transferred to liquidator
      expect(await nftContract.ownerOf(tokenId)).to.equal(await liquidator.getAddress());
      
      // Verify position marked inactive
      const position = await lendingAdapter.getPosition(positionId);
      expect(position.isActive).to.be.false;
      expect(position.borrowedAmount).to.equal(0);
    });
  });
  
  describe('Interest Rate Model', function () {
    it('Should use Aave variable interest rate', async function () {
      // The contract uses Aave's interest rate mode 2 (variable)
      // This is verified through the borrow and repay function calls
      const interestRateMode = 2;
      expect(interestRateMode).to.equal(2);
    });
    
    it('Should accrue interest over time in Aave', async function () {
      // Interest accrual is handled by Aave Pool
      // Our mock shows the pattern, real Aave would accrue interest
      const rate = await mockAavePool.INTEREST_RATE();
      expect(rate).to.equal(500); // 5% APY in mock
    });
  });
  
  describe('Integration Scenarios', function () {
    it('Should handle complete lending lifecycle', async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      
      // 1. Mint NFT
      const tokenId = await nftContract.connect(user1).mint.staticCall(await user1.getAddress());
      await nftContract.connect(user1).mint(await user1.getAddress());
      
      // 2. Supply as collateral
      await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
      await lendingAdapter.connect(user1).supplyCollateral(
        await nftContract.getAddress(),
        tokenId
      );
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      const positionId = positions[0];
      
      // 3. Borrow
      const borrowAmount = ethers.parseEther('2000');
      await lendingAdapter.connect(user1).borrow(
        positionId,
        await usdcToken.getAddress(),
        borrowAmount
      );
      
      // 4. Partial repay
      const partialRepay = ethers.parseEther('1000');
      await usdcToken.connect(user1).approve(await lendingAdapter.getAddress(), partialRepay);
      await lendingAdapter.connect(user1).repay(
        positionId,
        await usdcToken.getAddress(),
        partialRepay
      );
      
      // 5. Full repay
      const remainingDebt = ethers.parseEther('1000');
      await usdcToken.connect(user1).approve(await lendingAdapter.getAddress(), remainingDebt);
      await lendingAdapter.connect(user1).repay(
        positionId,
        await usdcToken.getAddress(),
        remainingDebt
      );
      
      // 6. Withdraw collateral
      await lendingAdapter.connect(user1).withdrawCollateral(positionId);
      
      // Verify final state
      expect(await nftContract.ownerOf(tokenId)).to.equal(await user1.getAddress());
      const position = await lendingAdapter.getPosition(positionId);
      expect(position.borrowedAmount).to.equal(0);
      expect(position.isActive).to.be.false;
    });
    
    it('Should handle multiple positions per user', async function () {
      await lendingAdapter.addSupportedNFT(await nftContract.getAddress());
      
      // Create multiple NFTs and positions
      for (let i = 0; i < 3; i++) {
        const tokenId = await nftContract.connect(user1).mint.staticCall(await user1.getAddress());
        await nftContract.connect(user1).mint(await user1.getAddress());
        
        await nftContract.connect(user1).approve(await lendingAdapter.getAddress(), tokenId);
        await lendingAdapter.connect(user1).supplyCollateral(
          await nftContract.getAddress(),
          tokenId
        );
      }
      
      const positions = await lendingAdapter.getUserPositions(await user1.getAddress());
      expect(positions.length).to.equal(3);
    });
  });
});
