// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title IPBondSimple
 * @dev 简化版本的 IP 债券合约
 */
contract IPBondSimple is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant BOND_ISSUER_ROLE = keccak256("BOND_ISSUER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    enum TrancheType { Senior, Mezzanine, Junior }
    enum BondStatus { Active, Matured, Defaulted }
    
    struct Tranche {
        string name;
        uint256 allocation;
        uint256 apy; // In basis points (e.g., 500 = 5%)
        uint256 totalInvested;
        uint256 totalRedeemed;
        mapping(address => uint256) investments;
        address[] investors;
    }
    
    struct Bond {
        string bondId;
        uint256 ipnftId;
        address issuer;
        uint256 totalValue;
        uint256 maturityDate;
        BondStatus status;
        uint256 totalRevenue;
        uint256 createdAt;
        mapping(TrancheType => Tranche) tranches;
    }
    
    mapping(string => Bond) public bonds;
    mapping(uint256 => string) public ipnftToBond;
    string[] public bondIds;
    
    event BondIssued(
        string indexed bondId,
        uint256 indexed ipnftId,
        address indexed issuer,
        uint256 totalValue,
        uint256 maturityDate
    );
    
    event Investment(
        string indexed bondId,
        TrancheType indexed tranche,
        address indexed investor,
        uint256 amount
    );
    
    event RevenueDistributed(
        string indexed bondId,
        uint256 amount,
        uint256 timestamp
    );
    
    event BondMatured(string indexed bondId, uint256 timestamp);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // For testing, we don't disable initializers
    }
    
    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BOND_ISSUER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }
    
    function issueBond(
        string memory bondId,
        uint256 ipnftId,
        uint256 totalValue,
        uint256 maturityDate,
        uint256[3] memory allocations, // [senior, mezzanine, junior]
        uint256[3] memory apys // [senior, mezzanine, junior] in basis points
    ) external onlyRole(BOND_ISSUER_ROLE) nonReentrant {
        require(bytes(bonds[bondId].bondId).length == 0, "Bond already exists");
        require(maturityDate > block.timestamp, "Invalid maturity date");
        require(allocations[0] + allocations[1] + allocations[2] == totalValue, "Invalid allocations");
        require(bytes(ipnftToBond[ipnftId]).length == 0, "IP-NFT already bonded");
        
        Bond storage bond = bonds[bondId];
        bond.bondId = bondId;
        bond.ipnftId = ipnftId;
        bond.issuer = msg.sender;
        bond.totalValue = totalValue;
        bond.maturityDate = maturityDate;
        bond.status = BondStatus.Active;
        bond.totalRevenue = 0;
        bond.createdAt = block.timestamp;
        
        // Initialize tranches
        string[3] memory trancheNames = ["Senior", "Mezzanine", "Junior"];
        for (uint256 i = 0; i < 3; i++) {
            TrancheType trancheType = TrancheType(i);
            Tranche storage tranche = bond.tranches[trancheType];
            tranche.name = trancheNames[i];
            tranche.allocation = allocations[i];
            tranche.apy = apys[i];
            tranche.totalInvested = 0;
            tranche.totalRedeemed = 0;
        }
        
        ipnftToBond[ipnftId] = bondId;
        bondIds.push(bondId);
        
        emit BondIssued(bondId, ipnftId, msg.sender, totalValue, maturityDate);
    }
    
    function invest(
        string memory bondId,
        TrancheType trancheType
    ) external payable nonReentrant {
        Bond storage bond = bonds[bondId];
        require(bytes(bond.bondId).length > 0, "Bond does not exist");
        require(bond.status == BondStatus.Active, "Bond not active");
        require(block.timestamp < bond.maturityDate, "Bond matured");
        require(msg.value > 0, "Investment must be greater than zero");
        
        Tranche storage tranche = bond.tranches[trancheType];
        require(tranche.totalInvested + msg.value <= tranche.allocation, "Exceeds tranche allocation");
        
        // Record investment
        if (tranche.investments[msg.sender] == 0) {
            tranche.investors.push(msg.sender);
        }
        tranche.investments[msg.sender] += msg.value;
        tranche.totalInvested += msg.value;
        
        emit Investment(bondId, trancheType, msg.sender, msg.value);
    }
    
    function distributeRevenue(
        string memory bondId,
        uint256 revenue
    ) external onlyRole(BOND_ISSUER_ROLE) nonReentrant {
        Bond storage bond = bonds[bondId];
        require(bytes(bond.bondId).length > 0, "Bond does not exist");
        require(bond.status == BondStatus.Active, "Bond not active");
        
        bond.totalRevenue += revenue;
        
        // Distribute to tranches based on priority (waterfall)
        uint256 remainingRevenue = revenue;
        
        // Senior tranche first
        remainingRevenue = _distributeTranche(bond, TrancheType.Senior, remainingRevenue);
        
        // Mezzanine tranche second
        if (remainingRevenue > 0) {
            remainingRevenue = _distributeTranche(bond, TrancheType.Mezzanine, remainingRevenue);
        }
        
        // Junior tranche last
        if (remainingRevenue > 0) {
            _distributeTranche(bond, TrancheType.Junior, remainingRevenue);
        }
        
        emit RevenueDistributed(bondId, revenue, block.timestamp);
    }
    
    function _distributeTranche(
        Bond storage bond,
        TrancheType trancheType,
        uint256 availableRevenue
    ) internal returns (uint256 remainingRevenue) {
        Tranche storage tranche = bond.tranches[trancheType];
        
        if (tranche.totalInvested == 0) {
            return availableRevenue;
        }
        
        // Calculate expected returns for this tranche
        uint256 expectedReturns = _calculateTrancheReturns(bond, trancheType);
        uint256 distributionAmount = expectedReturns > availableRevenue ? availableRevenue : expectedReturns;
        
        if (distributionAmount > 0) {
            // Distribute proportionally to investors
            for (uint256 i = 0; i < tranche.investors.length; i++) {
                address investor = tranche.investors[i];
                uint256 investment = tranche.investments[investor];
                
                if (investment > 0) {
                    uint256 payout = (distributionAmount * investment) / tranche.totalInvested;
                    if (payout > 0) {
                        (bool success, ) = payable(investor).call{value: payout}("");
                        require(success, "Transfer failed");
                    }
                }
            }
        }
        
        return availableRevenue - distributionAmount;
    }
    
    function _calculateTrancheReturns(
        Bond storage bond,
        TrancheType trancheType
    ) internal view returns (uint256) {
        Tranche storage tranche = bond.tranches[trancheType];
        
        if (tranche.totalInvested == 0) {
            return 0;
        }
        
        // Calculate time-based returns
        uint256 timeElapsed = block.timestamp - bond.createdAt;
        uint256 totalTime = bond.maturityDate - bond.createdAt;
        
        if (totalTime == 0) {
            return 0;
        }
        
        // Calculate proportional returns based on APY
        uint256 annualReturns = (tranche.totalInvested * tranche.apy) / 10000;
        uint256 expectedReturns = (annualReturns * timeElapsed) / (365 days);
        
        return expectedReturns;
    }
    
    function getBondInfo(string memory bondId) external view returns (
        uint256 ipnftId,
        address issuer,
        uint256 totalValue,
        uint256 maturityDate,
        BondStatus status,
        uint256 totalRevenue,
        uint256 createdAt
    ) {
        Bond storage bond = bonds[bondId];
        require(bytes(bond.bondId).length > 0, "Bond does not exist");
        
        return (
            bond.ipnftId,
            bond.issuer,
            bond.totalValue,
            bond.maturityDate,
            bond.status,
            bond.totalRevenue,
            bond.createdAt
        );
    }
    
    function getTrancheInfo(
        string memory bondId,
        TrancheType trancheType
    ) external view returns (
        string memory name,
        uint256 allocation,
        uint256 apy,
        uint256 totalInvested,
        uint256 totalRedeemed,
        uint256 investorCount
    ) {
        Bond storage bond = bonds[bondId];
        require(bytes(bond.bondId).length > 0, "Bond does not exist");
        
        Tranche storage tranche = bond.tranches[trancheType];
        
        return (
            tranche.name,
            tranche.allocation,
            tranche.apy,
            tranche.totalInvested,
            tranche.totalRedeemed,
            tranche.investors.length
        );
    }
    
    function getInvestment(
        string memory bondId,
        TrancheType trancheType,
        address investor
    ) external view returns (uint256) {
        Bond storage bond = bonds[bondId];
        require(bytes(bond.bondId).length > 0, "Bond does not exist");
        
        return bond.tranches[trancheType].investments[investor];
    }
    
    function getTotalBonds() external view returns (uint256) {
        return bondIds.length;
    }
    
    function getBondIdByIndex(uint256 index) external view returns (string memory) {
        require(index < bondIds.length, "Index out of bounds");
        return bondIds[index];
    }
    
    function checkBondByIPNFT(uint256 ipnftId) external view returns (string memory) {
        return ipnftToBond[ipnftId];
    }
    
    // Emergency functions
    function pauseBond(string memory bondId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Bond storage bond = bonds[bondId];
        require(bytes(bond.bondId).length > 0, "Bond does not exist");
        require(bond.status == BondStatus.Active, "Bond not active");
        
        bond.status = BondStatus.Defaulted;
    }
    
    function matureBond(string memory bondId) external onlyRole(BOND_ISSUER_ROLE) {
        Bond storage bond = bonds[bondId];
        require(bytes(bond.bondId).length > 0, "Bond does not exist");
        require(bond.status == BondStatus.Active, "Bond not active");
        require(block.timestamp >= bond.maturityDate, "Bond not yet matured");
        
        bond.status = BondStatus.Matured;
        emit BondMatured(bondId, block.timestamp);
    }
    
    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
    
    // Fallback to receive ETH
    receive() external payable {}
}