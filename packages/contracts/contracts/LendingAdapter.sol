// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

interface IAavePool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
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

interface IPriceOracle {
    function getAssetPrice(address asset) external view returns (uint256);
}

contract LendingAdapter is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    IAavePool public aavePool;
    IPriceOracle public priceOracle;
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MIN_HEALTH_FACTOR = 1.5e18;
    
    struct NFTCollateral {
        address nftContract;
        uint256 tokenId;
        address owner;
        uint256 valuation;
        uint256 borrowedAmount;
        uint256 ltv; // basis points
        bool active;
        uint256 depositedAt;
    }
    
    mapping(bytes32 => NFTCollateral) public collaterals;
    mapping(address => bytes32[]) public userCollaterals;
    mapping(address => mapping(uint256 => uint256)) public nftValuations;
    
    event CollateralDeposited(bytes32 indexed collateralId, address indexed owner, address nftContract, uint256 tokenId, uint256 valuation);
    event Borrowed(bytes32 indexed collateralId, address indexed borrower, uint256 amount);
    event Repaid(bytes32 indexed collateralId, address indexed borrower, uint256 amount);
    event CollateralWithdrawn(bytes32 indexed collateralId, address indexed owner);
    event ValuationUpdated(address indexed nftContract, uint256 indexed tokenId, uint256 newValuation);
    event Liquidated(bytes32 indexed collateralId, address indexed liquidator, uint256 debtCovered);
    
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _aavePool,
        address _priceOracle
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        aavePool = IAavePool(_aavePool);
        priceOracle = IPriceOracle(_priceOracle);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }
    
    function depositNFTCollateral(
        address nftContract,
        uint256 tokenId,
        uint256 ltv
    ) external nonReentrant returns (bytes32) {
        require(ltv <= 5000, "LTV too high"); // Max 50%
        
        IERC721Upgradeable nft = IERC721Upgradeable(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        
        nft.transferFrom(msg.sender, address(this), tokenId);
        
        uint256 valuation = nftValuations[nftContract][tokenId];
        require(valuation > 0, "No valuation");
        
        bytes32 collateralId = keccak256(abi.encodePacked(nftContract, tokenId, msg.sender, block.timestamp));
        
        collaterals[collateralId] = NFTCollateral({
            nftContract: nftContract,
            tokenId: tokenId,
            owner: msg.sender,
            valuation: valuation,
            borrowedAmount: 0,
            ltv: ltv,
            active: true,
            depositedAt: block.timestamp
        });
        
        userCollaterals[msg.sender].push(collateralId);
        
        emit CollateralDeposited(collateralId, msg.sender, nftContract, tokenId, valuation);
        
        return collateralId;
    }
    
    function borrow(
        bytes32 collateralId,
        address asset,
        uint256 amount
    ) external nonReentrant {
        NFTCollateral storage collateral = collaterals[collateralId];
        require(collateral.active, "Collateral not active");
        require(collateral.owner == msg.sender, "Not owner");
        
        uint256 maxBorrow = (collateral.valuation * collateral.ltv) / BASIS_POINTS;
        require(collateral.borrowedAmount + amount <= maxBorrow, "Exceeds max borrow");
        
        collateral.borrowedAmount += amount;
        
        aavePool.borrow(asset, amount, 2, 0, address(this));
        
        IERC20Upgradeable(asset).transfer(msg.sender, amount);
        
        uint256 healthFactor = calculateHealthFactor(collateralId);
        require(healthFactor >= MIN_HEALTH_FACTOR, "Health factor too low");
        
        emit Borrowed(collateralId, msg.sender, amount);
    }
    
    function repay(
        bytes32 collateralId,
        address asset,
        uint256 amount
    ) external nonReentrant {
        NFTCollateral storage collateral = collaterals[collateralId];
        require(collateral.active, "Collateral not active");
        require(collateral.owner == msg.sender, "Not owner");
        
        IERC20Upgradeable(asset).transferFrom(msg.sender, address(this), amount);
        IERC20Upgradeable(asset).approve(address(aavePool), amount);
        
        uint256 repaidAmount = aavePool.repay(asset, amount, 2, address(this));
        
        if (repaidAmount > collateral.borrowedAmount) {
            collateral.borrowedAmount = 0;
        } else {
            collateral.borrowedAmount -= repaidAmount;
        }
        
        emit Repaid(collateralId, msg.sender, repaidAmount);
    }
    
    function withdrawCollateral(bytes32 collateralId) external nonReentrant {
        NFTCollateral storage collateral = collaterals[collateralId];
        require(collateral.active, "Collateral not active");
        require(collateral.owner == msg.sender, "Not owner");
        require(collateral.borrowedAmount == 0, "Outstanding debt");
        
        collateral.active = false;
        
        IERC721Upgradeable(collateral.nftContract).transferFrom(
            address(this),
            msg.sender,
            collateral.tokenId
        );
        
        emit CollateralWithdrawn(collateralId, msg.sender);
    }
    
    function liquidate(bytes32 collateralId, address asset, uint256 debtToCover) external nonReentrant {
        NFTCollateral storage collateral = collaterals[collateralId];
        require(collateral.active, "Collateral not active");
        
        uint256 healthFactor = calculateHealthFactor(collateralId);
        require(healthFactor < 1e18, "Health factor OK");
        
        IERC20Upgradeable(asset).transferFrom(msg.sender, address(this), debtToCover);
        IERC20Upgradeable(asset).approve(address(aavePool), debtToCover);
        
        uint256 repaidAmount = aavePool.repay(asset, debtToCover, 2, address(this));
        
        if (repaidAmount > collateral.borrowedAmount) {
            collateral.borrowedAmount = 0;
        } else {
            collateral.borrowedAmount -= repaidAmount;
        }
        
        uint256 liquidationBonus = (repaidAmount * 500) / BASIS_POINTS; // 5% bonus
        uint256 totalReward = repaidAmount + liquidationBonus;
        
        if (collateral.borrowedAmount == 0) {
            collateral.active = false;
            IERC721Upgradeable(collateral.nftContract).transferFrom(
                address(this),
                msg.sender,
                collateral.tokenId
            );
        }
        
        emit Liquidated(collateralId, msg.sender, repaidAmount);
    }
    
    function calculateHealthFactor(bytes32 collateralId) public view returns (uint256) {
        NFTCollateral storage collateral = collaterals[collateralId];
        
        if (collateral.borrowedAmount == 0) {
            return type(uint256).max;
        }
        
        uint256 collateralValue = (collateral.valuation * collateral.ltv) / BASIS_POINTS;
        return (collateralValue * 1e18) / collateral.borrowedAmount;
    }
    
    function updateNFTValuation(
        address nftContract,
        uint256 tokenId,
        uint256 newValuation
    ) external onlyRole(ORACLE_ROLE) {
        require(newValuation > 0, "Invalid valuation");
        nftValuations[nftContract][tokenId] = newValuation;
        emit ValuationUpdated(nftContract, tokenId, newValuation);
    }
    
    function getUserCollaterals(address user) external view returns (bytes32[] memory) {
        return userCollaterals[user];
    }
    
    function getCollateralInfo(bytes32 collateralId)
        external
        view
        returns (
            address nftContract,
            uint256 tokenId,
            address owner,
            uint256 valuation,
            uint256 borrowedAmount,
            uint256 ltv,
            bool active,
            uint256 healthFactor
        )
    {
        NFTCollateral storage collateral = collaterals[collateralId];
        return (
            collateral.nftContract,
            collateral.tokenId,
            collateral.owner,
            collateral.valuation,
            collateral.borrowedAmount,
            collateral.ltv,
            collateral.active,
            calculateHealthFactor(collateralId)
        );
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
}
