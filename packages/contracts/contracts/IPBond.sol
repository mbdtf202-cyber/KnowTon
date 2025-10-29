// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title IPBond
 * @dev IP 资产支持的分级债券合约
 * 支持 Senior/Mezzanine/Junior 三级结构
 */
contract IPBond is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    enum TrancheType {
        Senior,
        Mezzanine,
        Junior
    }
    
    enum BondStatus {
        Active,
        Matured,
        Defaulted
    }
    
    struct Tranche {
        TrancheType trancheType;
        uint256 allocation;
        uint256 apy; // basis points (10000 = 100%)
        uint256 totalInvested;
        uint256 totalRedeemed;
        address tokenAddress;
        mapping(address => uint256) investments;
    }
    
    struct Bond {
        uint256 bondId;
        address nftContract;
        uint256 tokenId;
        address issuer;
        uint256 totalValue;
        uint256 maturityDate;
        BondStatus status;
        uint256 createdAt;
        Tranche[3] tranches; // Senior, Mezzanine, Junior
        uint256 totalRevenue;
    }
    
    mapping(uint256 => Bond) public bonds;
    uint256 private _bondIdCounter;
    
    uint256 public constant BASIS_POINTS = 10000;
    
    event BondIssued(
        uint256 indexed bondId,
        address indexed issuer,
        address nftContract,
        uint256 tokenId,
        uint256 totalValue,
        uint256 maturityDate
    );
    event Investment(
        uint256 indexed bondId,
        TrancheType tranche,
        address indexed investor,
        uint256 amount
    );
    event RevenueDistributed(uint256 indexed bondId, uint256 amount);
    event BondRedeemed(uint256 indexed bondId, TrancheType tranche, address indexed investor, uint256 amount);
    event BondMatured(uint256 indexed bondId);
    event BondDefaulted(uint256 indexed bondId);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }
    
    /**
     * @dev 发行债券
     * @param nftContract NFT 合约地址
     * @param tokenId NFT token ID
     * @param totalValue 债券总价值
     * @param maturityDate 到期日期
     * @param seniorAPY Senior 级 APY
     * @param mezzanineAPY Mezzanine 级 APY
     * @param juniorAPY Junior 级 APY
     */
    function issueBond(
        address nftContract,
        uint256 tokenId,
        uint256 totalValue,
        uint256 maturityDate,
        uint256 seniorAPY,
        uint256 mezzanineAPY,
        uint256 juniorAPY
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(totalValue > 0, "Invalid total value");
        require(maturityDate > block.timestamp, "Invalid maturity date");
        
        _bondIdCounter++;
        uint256 bondId = _bondIdCounter;
        
        Bond storage bond = bonds[bondId];
        bond.bondId = bondId;
        bond.nftContract = nftContract;
        bond.tokenId = tokenId;
        bond.issuer = msg.sender;
        bond.totalValue = totalValue;
        bond.maturityDate = maturityDate;
        bond.status = BondStatus.Active;
        bond.createdAt = block.timestamp;
        
        // Configure tranches
        // Senior: 50%, Mezzanine: 33%, Junior: 17%
        bond.tranches[0].trancheType = TrancheType.Senior;
        bond.tranches[0].allocation = (totalValue * 50) / 100;
        bond.tranches[0].apy = seniorAPY;
        
        bond.tranches[1].trancheType = TrancheType.Mezzanine;
        bond.tranches[1].allocation = (totalValue * 33) / 100;
        bond.tranches[1].apy = mezzanineAPY;
        
        bond.tranches[2].trancheType = TrancheType.Junior;
        bond.tranches[2].allocation = (totalValue * 17) / 100;
        bond.tranches[2].apy = juniorAPY;
        
        emit BondIssued(bondId, msg.sender, nftContract, tokenId, totalValue, maturityDate);
        
        return bondId;
    }
    
    /**
     * @dev 投资债券
     * @param bondId 债券 ID
     * @param trancheType 分级类型
     */
    function invest(uint256 bondId, TrancheType trancheType) external payable nonReentrant {
        Bond storage bond = bonds[bondId];
        require(bond.status == BondStatus.Active, "Bond not active");
        require(msg.value > 0, "No investment");
        
        Tranche storage tranche = bond.tranches[uint256(trancheType)];
        require(
            tranche.totalInvested + msg.value <= tranche.allocation,
            "Exceeds allocation"
        );
        
        tranche.investments[msg.sender] += msg.value;
        tranche.totalInvested += msg.value;
        
        emit Investment(bondId, trancheType, msg.sender, msg.value);
    }
    
    /**
     * @dev 分配收益
     * @param bondId 债券 ID
     */
    function distributeRevenue(uint256 bondId) external payable nonReentrant {
        Bond storage bond = bonds[bondId];
        require(bond.status == BondStatus.Active, "Bond not active");
        require(msg.value > 0, "No revenue");
        
        bond.totalRevenue += msg.value;
        
        uint256 remaining = msg.value;
        
        // Distribute to Senior first
        remaining = _distributeTranche(bond, TrancheType.Senior, remaining);
        
        // Then Mezzanine
        if (remaining > 0) {
            remaining = _distributeTranche(bond, TrancheType.Mezzanine, remaining);
        }
        
        // Finally Junior
        if (remaining > 0) {
            _distributeTranche(bond, TrancheType.Junior, remaining);
        }
        
        emit RevenueDistributed(bondId, msg.value);
    }
    
    /**
     * @dev 内部函数：分配到特定分级
     */
    function _distributeTranche(
        Bond storage bond,
        TrancheType trancheType,
        uint256 amount
    ) private returns (uint256) {
        Tranche storage tranche = bond.tranches[uint256(trancheType)];
        
        if (tranche.totalInvested == 0) {
            return amount;
        }
        
        uint256 expectedReturn = _calculateExpectedReturn(
            tranche.totalInvested,
            tranche.apy,
            bond.createdAt,
            block.timestamp
        );
        
        uint256 toDistribute = expectedReturn > amount ? amount : expectedReturn;
        
        // Distribute proportionally to investors
        // (In production, use a claim mechanism instead of direct distribution)
        
        return amount - toDistribute;
    }
    
    /**
     * @dev 计算预期收益
     */
    function _calculateExpectedReturn(
        uint256 principal,
        uint256 apy,
        uint256 startTime,
        uint256 endTime
    ) private pure returns (uint256) {
        uint256 duration = endTime - startTime;
        uint256 annualReturn = (principal * apy) / BASIS_POINTS;
        return (annualReturn * duration) / 365 days;
    }
    
    /**
     * @dev 赎回投资
     * @param bondId 债券 ID
     * @param trancheType 分级类型
     */
    function redeem(uint256 bondId, TrancheType trancheType) external nonReentrant {
        Bond storage bond = bonds[bondId];
        require(
            bond.status == BondStatus.Matured || block.timestamp >= bond.maturityDate,
            "Bond not matured"
        );
        
        Tranche storage tranche = bond.tranches[uint256(trancheType)];
        uint256 investment = tranche.investments[msg.sender];
        require(investment > 0, "No investment");
        
        tranche.investments[msg.sender] = 0;
        tranche.totalRedeemed += investment;
        
        uint256 returns = _calculateExpectedReturn(
            investment,
            tranche.apy,
            bond.createdAt,
            bond.maturityDate
        );
        
        uint256 totalPayout = investment + returns;
        
        (bool success, ) = payable(msg.sender).call{value: totalPayout}("");
        require(success, "Transfer failed");
        
        emit BondRedeemed(bondId, trancheType, msg.sender, totalPayout);
    }
    
    /**
     * @dev 标记债券到期
     * @param bondId 债券 ID
     */
    function markMatured(uint256 bondId) external onlyRole(ISSUER_ROLE) {
        Bond storage bond = bonds[bondId];
        require(block.timestamp >= bond.maturityDate, "Not matured yet");
        require(bond.status == BondStatus.Active, "Bond not active");
        
        bond.status = BondStatus.Matured;
        
        emit BondMatured(bondId);
    }
    
    /**
     * @dev 标记债券违约
     * @param bondId 债券 ID
     */
    function markDefaulted(uint256 bondId) external onlyRole(ISSUER_ROLE) {
        Bond storage bond = bonds[bondId];
        require(bond.status == BondStatus.Active, "Bond not active");
        
        bond.status = BondStatus.Defaulted;
        
        emit BondDefaulted(bondId);
    }
    
    /**
     * @dev 获取债券信息
     */
    function getBondInfo(uint256 bondId)
        external
        view
        returns (
            address nftContract,
            uint256 tokenId,
            address issuer,
            uint256 totalValue,
            uint256 maturityDate,
            BondStatus status,
            uint256 totalRevenue
        )
    {
        Bond storage bond = bonds[bondId];
        return (
            bond.nftContract,
            bond.tokenId,
            bond.issuer,
            bond.totalValue,
            bond.maturityDate,
            bond.status,
            bond.totalRevenue
        );
    }
    
    /**
     * @dev 获取分级信息
     */
    function getTrancheInfo(uint256 bondId, TrancheType trancheType)
        external
        view
        returns (
            uint256 allocation,
            uint256 apy,
            uint256 totalInvested,
            uint256 totalRedeemed
        )
    {
        Tranche storage tranche = bonds[bondId].tranches[uint256(trancheType)];
        return (
            tranche.allocation,
            tranche.apy,
            tranche.totalInvested,
            tranche.totalRedeemed
        );
    }
    
    /**
     * @dev 获取投资者投资额
     */
    function getInvestment(
        uint256 bondId,
        TrancheType trancheType,
        address investor
    ) external view returns (uint256) {
        return bonds[bondId].tranches[uint256(trancheType)].investments[investor];
    }
    
    // Required overrides
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
    
    // Receive ETH
    receive() external payable {}
}
