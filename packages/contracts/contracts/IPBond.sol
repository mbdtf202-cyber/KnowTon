// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/**
 * @title IPBond
 * @dev IP asset-backed tiered bond contract with Senior/Mezzanine/Junior structure
 * @notice This contract implements a 3-tier bond system with priority-based yield distribution
 */
contract IPBond is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    enum TrancheType {
        Senior,      // 0: Lowest risk, lowest return, highest priority
        Mezzanine,   // 1: Medium risk, medium return, medium priority
        Junior       // 2: Highest risk, highest return, lowest priority
    }
    
    enum BondStatus {
        Active,      // 0: Bond is active and accepting investments
        Matured,     // 1: Bond has reached maturity date
        Defaulted    // 2: Bond has defaulted
    }
    
    struct Tranche {
        TrancheType trancheType;
        uint256 allocation;        // Maximum investment allowed for this tranche
        uint256 apy;              // Annual Percentage Yield in basis points (10000 = 100%)
        uint256 totalInvested;    // Total amount invested in this tranche
        uint256 totalRedeemed;    // Total amount redeemed from this tranche
        uint256 accumulatedYield; // Accumulated yield for this tranche
        mapping(address => uint256) investments; // Investor address => investment amount
    }
    
    struct Bond {
        uint256 bondId;
        address nftContract;      // NFT contract representing the IP asset
        uint256 tokenId;          // Token ID of the IP asset
        address issuer;           // Address of the bond issuer
        uint256 totalValue;       // Total value of the bond
        uint256 maturityDate;     // Unix timestamp of maturity
        BondStatus status;        // Current status of the bond
        uint256 createdAt;        // Unix timestamp of creation
        uint256 totalRevenue;     // Total revenue distributed to the bond
        Tranche[3] tranches;      // Array of 3 tranches: Senior, Mezzanine, Junior
    }
    
    mapping(uint256 => Bond) public bonds;
    uint256 private _bondIdCounter;
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    // Default allocation percentages
    uint256 public constant SENIOR_ALLOCATION_PCT = 50;    // 50%
    uint256 public constant MEZZANINE_ALLOCATION_PCT = 33; // 33%
    uint256 public constant JUNIOR_ALLOCATION_PCT = 17;    // 17%
    
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
        uint256 indexed trancheIndex,
        address indexed investor,
        uint256 amount
    );
    
    event RevenueDistributed(
        uint256 indexed bondId,
        uint256 amount
    );
    
    event BondRedeemed(
        uint256 indexed bondId,
        uint256 indexed trancheIndex,
        address indexed investor,
        uint256 principal,
        uint256 yield
    );
    
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
        __Pausable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }
    
    /**
     * @dev Issue a new bond with 3-tier structure
     * @param nftContract Address of the NFT contract representing the IP asset
     * @param tokenId Token ID of the IP asset
     * @param totalValue Total value of the bond
     * @param maturityDate Unix timestamp when the bond matures
     * @param seniorAPY APY for Senior tranche in basis points
     * @param mezzanineAPY APY for Mezzanine tranche in basis points
     * @param juniorAPY APY for Junior tranche in basis points
     * @return bondId The ID of the newly issued bond
     */
    function issueBond(
        address nftContract,
        uint256 tokenId,
        uint256 totalValue,
        uint256 maturityDate,
        uint256 seniorAPY,
        uint256 mezzanineAPY,
        uint256 juniorAPY
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(totalValue > 0, "Invalid total value");
        require(maturityDate > block.timestamp, "Invalid maturity date");
        require(seniorAPY <= BASIS_POINTS, "Senior APY too high");
        require(mezzanineAPY <= BASIS_POINTS, "Mezzanine APY too high");
        require(juniorAPY <= BASIS_POINTS, "Junior APY too high");
        
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
        
        // Configure Senior tranche (50% allocation)
        bond.tranches[0].trancheType = TrancheType.Senior;
        bond.tranches[0].allocation = (totalValue * SENIOR_ALLOCATION_PCT) / 100;
        bond.tranches[0].apy = seniorAPY;
        
        // Configure Mezzanine tranche (33% allocation)
        bond.tranches[1].trancheType = TrancheType.Mezzanine;
        bond.tranches[1].allocation = (totalValue * MEZZANINE_ALLOCATION_PCT) / 100;
        bond.tranches[1].apy = mezzanineAPY;
        
        // Configure Junior tranche (17% allocation)
        bond.tranches[2].trancheType = TrancheType.Junior;
        bond.tranches[2].allocation = (totalValue * JUNIOR_ALLOCATION_PCT) / 100;
        bond.tranches[2].apy = juniorAPY;
        
        emit BondIssued(bondId, msg.sender, nftContract, tokenId, totalValue, maturityDate);
        
        return bondId;
    }
    
    /**
     * @dev Invest in a specific tranche of a bond
     * @param bondId The ID of the bond to invest in
     * @param trancheIndex Index of the tranche (0=Senior, 1=Mezzanine, 2=Junior)
     */
    function invest(uint256 bondId, uint256 trancheIndex) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(trancheIndex < 3, "Invalid tranche");
        Bond storage bond = bonds[bondId];
        require(bond.bondId != 0, "Bond does not exist");
        require(bond.status == BondStatus.Active, "Bond not active");
        require(block.timestamp < bond.maturityDate, "Bond matured");
        require(msg.value > 0, "No investment");
        
        Tranche storage tranche = bond.tranches[trancheIndex];
        require(
            tranche.totalInvested + msg.value <= tranche.allocation,
            "Exceeds allocation"
        );
        
        tranche.investments[msg.sender] += msg.value;
        tranche.totalInvested += msg.value;
        
        emit Investment(bondId, trancheIndex, msg.sender, msg.value);
    }
    
    /**
     * @dev Distribute revenue to the bond with tier-based priority
     * @param bondId The ID of the bond to distribute revenue to
     * @notice Revenue is distributed to Senior first, then Mezzanine, then Junior
     */
    function distributeRevenue(uint256 bondId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        Bond storage bond = bonds[bondId];
        require(bond.bondId != 0, "Bond does not exist");
        require(bond.status == BondStatus.Active, "Bond not active");
        require(msg.value > 0, "No revenue");
        
        bond.totalRevenue += msg.value;
        
        uint256 remaining = msg.value;
        
        // Distribute to Senior first (highest priority)
        remaining = _distributeTranche(bond, 0, remaining);
        
        // Then Mezzanine (medium priority)
        if (remaining > 0) {
            remaining = _distributeTranche(bond, 1, remaining);
        }
        
        // Finally Junior (lowest priority)
        if (remaining > 0) {
            _distributeTranche(bond, 2, remaining);
        }
        
        emit RevenueDistributed(bondId, msg.value);
    }
    
    /**
     * @dev Internal function to distribute revenue to a specific tranche
     * @param bond The bond storage reference
     * @param trancheIndex Index of the tranche
     * @param amount Amount to distribute
     * @return remaining Amount remaining after distribution
     */
    function _distributeTranche(
        Bond storage bond,
        uint256 trancheIndex,
        uint256 amount
    ) private returns (uint256 remaining) {
        Tranche storage tranche = bond.tranches[trancheIndex];
        
        if (tranche.totalInvested == 0) {
            return amount;
        }
        
        // Calculate expected yield for this tranche
        uint256 expectedYield = _calculateExpectedYield(
            tranche.totalInvested,
            tranche.apy,
            bond.createdAt,
            block.timestamp
        );
        
        // Calculate how much yield is still owed
        uint256 yieldOwed = expectedYield > tranche.accumulatedYield 
            ? expectedYield - tranche.accumulatedYield 
            : 0;
        
        // Distribute up to the owed amount
        uint256 toDistribute = yieldOwed > amount ? amount : yieldOwed;
        
        tranche.accumulatedYield += toDistribute;
        
        return amount - toDistribute;
    }
    
    /**
     * @dev Calculate expected yield based on APY and time elapsed
     * @param principal Principal amount invested
     * @param apy Annual Percentage Yield in basis points
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return Expected yield amount
     */
    function _calculateExpectedYield(
        uint256 principal,
        uint256 apy,
        uint256 startTime,
        uint256 endTime
    ) private pure returns (uint256) {
        if (endTime <= startTime) {
            return 0;
        }
        
        uint256 duration = endTime - startTime;
        uint256 annualYield = (principal * apy) / BASIS_POINTS;
        return (annualYield * duration) / SECONDS_PER_YEAR;
    }
    
    /**
     * @dev Redeem investment with accumulated yield
     * @param bondId The ID of the bond to redeem from
     * @param trancheIndex Index of the tranche to redeem from
     */
    function redeem(uint256 bondId, uint256 trancheIndex) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(trancheIndex < 3, "Invalid tranche");
        Bond storage bond = bonds[bondId];
        require(bond.bondId != 0, "Bond does not exist");
        require(
            bond.status == BondStatus.Matured || block.timestamp >= bond.maturityDate,
            "Bond not matured"
        );
        
        Tranche storage tranche = bond.tranches[trancheIndex];
        uint256 investment = tranche.investments[msg.sender];
        require(investment > 0, "No investment");
        
        // Calculate total yield earned
        uint256 expectedYield = _calculateExpectedYield(
            investment,
            tranche.apy,
            bond.createdAt,
            bond.maturityDate
        );
        
        // Calculate investor's share of accumulated yield
        uint256 investorYield = tranche.totalInvested > 0
            ? (tranche.accumulatedYield * investment) / tranche.totalInvested
            : 0;
        
        // Use the minimum of expected and accumulated yield
        uint256 actualYield = investorYield < expectedYield ? investorYield : expectedYield;
        
        // Clear investment
        tranche.investments[msg.sender] = 0;
        tranche.totalRedeemed += investment + actualYield;
        
        // Calculate total payout
        uint256 totalPayout = investment + actualYield;
        
        require(address(this).balance >= totalPayout, "Insufficient balance");
        
        (bool success, ) = payable(msg.sender).call{value: totalPayout}("");
        require(success, "Transfer failed");
        
        emit BondRedeemed(bondId, trancheIndex, msg.sender, investment, actualYield);
    }
    
    /**
     * @dev Mark bond as matured (can only be called after maturity date)
     * @param bondId The ID of the bond to mark as matured
     */
    function markMatured(uint256 bondId) external onlyRole(ISSUER_ROLE) {
        Bond storage bond = bonds[bondId];
        require(bond.bondId != 0, "Bond does not exist");
        require(block.timestamp >= bond.maturityDate, "Not matured yet");
        require(bond.status == BondStatus.Active, "Bond not active");
        
        bond.status = BondStatus.Matured;
        
        emit BondMatured(bondId);
    }
    
    /**
     * @dev Mark bond as defaulted
     * @param bondId The ID of the bond to mark as defaulted
     */
    function markDefaulted(uint256 bondId) external onlyRole(ISSUER_ROLE) {
        Bond storage bond = bonds[bondId];
        require(bond.bondId != 0, "Bond does not exist");
        require(bond.status == BondStatus.Active, "Bond not active");
        
        bond.status = BondStatus.Defaulted;
        
        emit BondDefaulted(bondId);
    }
    
    /**
     * @dev Get bond information
     * @param bondId The ID of the bond
     * @return nftContract Address of the NFT contract
     * @return tokenId Token ID of the NFT
     * @return issuer Address of the bond issuer
     * @return totalValue Total value of the bond
     * @return maturityDate Maturity date timestamp
     * @return status Current status of the bond
     * @return totalRevenue Total revenue distributed
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
        require(bond.bondId != 0, "Bond does not exist");
        
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
     * @dev Get tranche information
     * @param bondId The ID of the bond
     * @param trancheIndex Index of the tranche
     * @return allocation Maximum investment allowed
     * @return apy Annual Percentage Yield in basis points
     * @return totalInvested Total amount invested
     * @return totalRedeemed Total amount redeemed
     */
    function getTrancheInfo(uint256 bondId, uint256 trancheIndex)
        external
        view
        returns (
            uint256 allocation,
            uint256 apy,
            uint256 totalInvested,
            uint256 totalRedeemed
        )
    {
        require(trancheIndex < 3, "Invalid tranche");
        Bond storage bond = bonds[bondId];
        require(bond.bondId != 0, "Bond does not exist");
        
        Tranche storage tranche = bond.tranches[trancheIndex];
        return (
            tranche.allocation,
            tranche.apy,
            tranche.totalInvested,
            tranche.totalRedeemed
        );
    }
    
    /**
     * @dev Get investment amount for a specific investor in a tranche
     * @param bondId The ID of the bond
     * @param trancheIndex Index of the tranche
     * @param investor Address of the investor
     * @return Investment amount
     */
    function getInvestment(
        uint256 bondId,
        uint256 trancheIndex,
        address investor
    ) external view returns (uint256) {
        require(trancheIndex < 3, "Invalid tranche");
        Bond storage bond = bonds[bondId];
        require(bond.bondId != 0, "Bond does not exist");
        
        return bond.tranches[trancheIndex].investments[investor];
    }
    
    /**
     * @dev Calculate current yield for an investor
     * @param bondId The ID of the bond
     * @param trancheIndex Index of the tranche
     * @param investor Address of the investor
     * @return Current yield amount
     */
    function calculateCurrentYield(
        uint256 bondId,
        uint256 trancheIndex,
        address investor
    ) external view returns (uint256) {
        require(trancheIndex < 3, "Invalid tranche");
        Bond storage bond = bonds[bondId];
        require(bond.bondId != 0, "Bond does not exist");
        
        Tranche storage tranche = bond.tranches[trancheIndex];
        uint256 investment = tranche.investments[investor];
        
        if (investment == 0) {
            return 0;
        }
        
        uint256 endTime = block.timestamp < bond.maturityDate 
            ? block.timestamp 
            : bond.maturityDate;
        
        return _calculateExpectedYield(
            investment,
            tranche.apy,
            bond.createdAt,
            endTime
        );
    }
    
    /**
     * @dev Pause the contract (emergency use only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Required override for UUPS upgrades
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
    
    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
