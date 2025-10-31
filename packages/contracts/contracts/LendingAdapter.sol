// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title LendingAdapter
 * @notice Integrates with Aave V3 for IP-NFT collateralized lending
 * @dev Allows users to supply IP-NFTs as collateral and borrow against them
 */
contract LendingAdapter is Ownable, ReentrancyGuard, IERC721Receiver {
    // Aave V3 interfaces
    IPool public immutable aavePool;
    IPoolAddressesProvider public immutable addressesProvider;
    IAaveOracle public aaveOracle;
    
    // Supported collateral NFTs
    mapping(address => bool) public supportedNFTs;
    
    // NFT collateral tracking
    struct CollateralPosition {
        address nftContract;
        uint256 tokenId;
        address owner;
        uint256 valuationUSD;
        uint256 borrowedAmount;
        uint256 depositedAt;
        bool isActive;
    }
    
    mapping(bytes32 => CollateralPosition) public positions;
    mapping(address => bytes32[]) public userPositions;
    
    // Lending parameters
    uint256 public constant LTV_RATIO = 5000; // 50% LTV (basis points)
    uint256 public constant LIQUIDATION_THRESHOLD = 7500; // 75%
    uint256 public constant LIQUIDATION_BONUS = 500; // 5%
    uint256 public constant MIN_HEALTH_FACTOR = 1e18; // 1.0
    
    // Oracle for NFT valuation
    address public nftOracle;
    
    // Events
    event CollateralSupplied(
        bytes32 indexed positionId,
        address indexed user,
        address indexed nftContract,
        uint256 tokenId,
        uint256 valuation
    );
    
    event CollateralWithdrawn(
        bytes32 indexed positionId,
        address indexed user,
        address indexed nftContract,
        uint256 tokenId
    );
    
    event Borrowed(
        bytes32 indexed positionId,
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 healthFactor
    );
    
    event Repaid(
        bytes32 indexed positionId,
        address indexed user,
        address indexed asset,
        uint256 amount
    );
    
    event Liquidated(
        bytes32 indexed positionId,
        address indexed liquidator,
        address indexed user,
        uint256 debtCovered,
        uint256 liquidationBonus
    );
    
    event NFTSupportUpdated(address indexed nftContract, bool supported);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    // Errors
    error NFTNotSupported();
    error PositionNotFound();
    error UnauthorizedAccess();
    error InsufficientCollateral();
    error HealthFactorTooLow();
    error PositionNotActive();
    error InvalidAmount();
    error InvalidOracle();
    
    constructor(
        address _aavePool,
        address _addressesProvider,
        address _nftOracle
    ) {
        require(_aavePool != address(0), "Invalid pool");
        require(_addressesProvider != address(0), "Invalid provider");
        require(_nftOracle != address(0), "Invalid oracle");
        
        aavePool = IPool(_aavePool);
        addressesProvider = IPoolAddressesProvider(_addressesProvider);
        nftOracle = _nftOracle;
        
        // Get Aave oracle from provider
        aaveOracle = IAaveOracle(addressesProvider.getPriceOracle());
    }
    
    /**
     * @notice Supply IP-NFT as collateral
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID of the NFT
     * @return positionId Unique identifier for the collateral position
     */
    function supplyCollateral(
        address nftContract,
        uint256 tokenId
    ) external nonReentrant returns (bytes32 positionId) {
        if (!supportedNFTs[nftContract]) revert NFTNotSupported();
        
        // Transfer NFT to this contract
        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);
        
        // Get NFT valuation from oracle
        uint256 valuation = _getNFTValuation(nftContract, tokenId);
        
        // Create position ID
        positionId = keccak256(abi.encodePacked(nftContract, tokenId, msg.sender, block.timestamp));
        
        // Store position
        positions[positionId] = CollateralPosition({
            nftContract: nftContract,
            tokenId: tokenId,
            owner: msg.sender,
            valuationUSD: valuation,
            borrowedAmount: 0,
            depositedAt: block.timestamp,
            isActive: true
        });
        
        userPositions[msg.sender].push(positionId);
        
        emit CollateralSupplied(positionId, msg.sender, nftContract, tokenId, valuation);
    }
    
    /**
     * @notice Withdraw collateral NFT
     * @param positionId Position identifier
     */
    function withdrawCollateral(bytes32 positionId) external nonReentrant {
        CollateralPosition storage position = positions[positionId];
        
        if (!position.isActive) revert PositionNotActive();
        if (position.owner != msg.sender) revert UnauthorizedAccess();
        if (position.borrowedAmount > 0) revert InsufficientCollateral();
        
        // Mark position as inactive
        position.isActive = false;
        
        // Transfer NFT back to owner
        IERC721(position.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            position.tokenId
        );
        
        emit CollateralWithdrawn(positionId, msg.sender, position.nftContract, position.tokenId);
    }
    
    /**
     * @notice Borrow assets against collateral
     * @param positionId Position identifier
     * @param asset Address of the asset to borrow
     * @param amount Amount to borrow
     */
    function borrow(
        bytes32 positionId,
        address asset,
        uint256 amount
    ) external nonReentrant {
        CollateralPosition storage position = positions[positionId];
        
        if (!position.isActive) revert PositionNotActive();
        if (position.owner != msg.sender) revert UnauthorizedAccess();
        if (amount == 0) revert InvalidAmount();
        
        // Calculate max borrow amount
        uint256 maxBorrow = _calculateMaxBorrow(position.valuationUSD);
        
        if (position.borrowedAmount + amount > maxBorrow) {
            revert InsufficientCollateral();
        }
        
        // Update borrowed amount
        position.borrowedAmount += amount;
        
        // Check health factor
        uint256 healthFactor = _calculateHealthFactor(position);
        if (healthFactor < MIN_HEALTH_FACTOR) revert HealthFactorTooLow();
        
        // Borrow from Aave
        aavePool.borrow(
            asset,
            amount,
            2, // Variable interest rate mode
            0, // Referral code
            address(this)
        );
        
        // Transfer borrowed assets to user
        IERC20(asset).transfer(msg.sender, amount);
        
        emit Borrowed(positionId, msg.sender, asset, amount, healthFactor);
    }
    
    /**
     * @notice Repay borrowed assets
     * @param positionId Position identifier
     * @param asset Address of the asset to repay
     * @param amount Amount to repay
     */
    function repay(
        bytes32 positionId,
        address asset,
        uint256 amount
    ) external nonReentrant {
        CollateralPosition storage position = positions[positionId];
        
        if (!position.isActive) revert PositionNotActive();
        if (position.owner != msg.sender) revert UnauthorizedAccess();
        if (amount == 0) revert InvalidAmount();
        
        // Transfer repayment from user
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        
        // Approve Aave pool
        IERC20(asset).approve(address(aavePool), amount);
        
        // Repay to Aave
        uint256 repaidAmount = aavePool.repay(
            asset,
            amount,
            2, // Variable rate
            address(this)
        );
        
        // Update borrowed amount
        if (repaidAmount >= position.borrowedAmount) {
            position.borrowedAmount = 0;
        } else {
            position.borrowedAmount -= repaidAmount;
        }
        
        emit Repaid(positionId, msg.sender, asset, repaidAmount);
    }
    
    /**
     * @notice Liquidate undercollateralized position
     * @param positionId Position identifier
     * @param asset Address of the debt asset
     * @param debtToCover Amount of debt to cover
     */
    function liquidate(
        bytes32 positionId,
        address asset,
        uint256 debtToCover
    ) external nonReentrant {
        CollateralPosition storage position = positions[positionId];
        
        if (!position.isActive) revert PositionNotActive();
        
        // Check if position is liquidatable
        uint256 healthFactor = _calculateHealthFactor(position);
        if (healthFactor >= MIN_HEALTH_FACTOR) revert HealthFactorTooLow();
        
        // Transfer debt payment from liquidator
        IERC20(asset).transferFrom(msg.sender, address(this), debtToCover);
        
        // Approve and repay debt to Aave
        IERC20(asset).approve(address(aavePool), debtToCover);
        aavePool.repay(asset, debtToCover, 2, address(this));
        
        // Calculate liquidation bonus
        uint256 collateralValue = (debtToCover * (10000 + LIQUIDATION_BONUS)) / 10000;
        
        // Update position
        position.borrowedAmount -= debtToCover;
        
        // If fully liquidated, transfer NFT to liquidator
        if (position.borrowedAmount == 0) {
            position.isActive = false;
            IERC721(position.nftContract).safeTransferFrom(
                address(this),
                msg.sender,
                position.tokenId
            );
        }
        
        emit Liquidated(positionId, msg.sender, position.owner, debtToCover, collateralValue);
    }
    
    /**
     * @notice Get health factor for a position
     * @param positionId Position identifier
     * @return healthFactor Current health factor (1e18 = 1.0)
     */
    function getHealthFactor(bytes32 positionId) external view returns (uint256 healthFactor) {
        CollateralPosition storage position = positions[positionId];
        if (!position.isActive) revert PositionNotActive();
        
        healthFactor = _calculateHealthFactor(position);
    }
    
    /**
     * @notice Get maximum borrow amount for a position
     * @param positionId Position identifier
     * @return maxBorrow Maximum amount that can be borrowed
     */
    function getMaxBorrow(bytes32 positionId) external view returns (uint256 maxBorrow) {
        CollateralPosition storage position = positions[positionId];
        if (!position.isActive) revert PositionNotActive();
        
        uint256 totalMaxBorrow = _calculateMaxBorrow(position.valuationUSD);
        maxBorrow = totalMaxBorrow > position.borrowedAmount 
            ? totalMaxBorrow - position.borrowedAmount 
            : 0;
    }
    
    /**
     * @notice Get user's positions
     * @param user User address
     * @return positionIds Array of position IDs
     */
    function getUserPositions(address user) external view returns (bytes32[] memory positionIds) {
        positionIds = userPositions[user];
    }
    
    /**
     * @notice Get position details
     * @param positionId Position identifier
     * @return position Position struct
     */
    function getPosition(bytes32 positionId) external view returns (CollateralPosition memory position) {
        position = positions[positionId];
    }
    
    /**
     * @notice Add supported NFT contract
     * @param nftContract Address of NFT contract
     */
    function addSupportedNFT(address nftContract) external onlyOwner {
        require(nftContract != address(0), "Invalid NFT contract");
        supportedNFTs[nftContract] = true;
        emit NFTSupportUpdated(nftContract, true);
    }
    
    /**
     * @notice Remove supported NFT contract
     * @param nftContract Address of NFT contract
     */
    function removeSupportedNFT(address nftContract) external onlyOwner {
        supportedNFTs[nftContract] = false;
        emit NFTSupportUpdated(nftContract, false);
    }
    
    /**
     * @notice Update NFT oracle address
     * @param newOracle New oracle address
     */
    function updateNFTOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidOracle();
        address oldOracle = nftOracle;
        nftOracle = newOracle;
        emit OracleUpdated(oldOracle, newOracle);
    }
    
    /**
     * @notice Update Aave oracle from provider
     */
    function updateAaveOracle() external onlyOwner {
        aaveOracle = IAaveOracle(addressesProvider.getPriceOracle());
    }
    
    // Internal functions
    function _calculateHealthFactor(CollateralPosition storage position) internal view returns (uint256) {
        if (position.borrowedAmount == 0) {
            return type(uint256).max;
        }
        
        uint256 collateralValueInETH = position.valuationUSD;
        uint256 liquidationThresholdValue = (collateralValueInETH * LIQUIDATION_THRESHOLD) / 10000;
        
        return (liquidationThresholdValue * 1e18) / position.borrowedAmount;
    }
    
    function _calculateMaxBorrow(uint256 collateralValue) internal pure returns (uint256) {
        return (collateralValue * LTV_RATIO) / 10000;
    }
    
    function _getNFTValuation(address nftContract, uint256 tokenId) internal view returns (uint256) {
        // Call external oracle for NFT valuation
        INFTOracle oracle = INFTOracle(nftOracle);
        return oracle.getValuation(nftContract, tokenId);
    }
    
    // ERC721 Receiver
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

// Aave V3 Interfaces
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;
    
    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external returns (uint256);
    
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
}

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
    function getPriceOracle() external view returns (address);
}

interface IAaveOracle {
    function getAssetPrice(address asset) external view returns (uint256);
    function getAssetsPrices(address[] calldata assets) external view returns (uint256[] memory);
}

interface INFTOracle {
    function getValuation(address nftContract, uint256 tokenId) external view returns (uint256);
}
