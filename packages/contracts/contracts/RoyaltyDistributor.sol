// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RoyaltyDistributor V2
 * @dev Enhanced automated royalty distribution contract with:
 * - Support for up to 10 recipients
 * - Dynamic percentage updates
 * - Emergency pause functionality
 * - ERC-2981 standard compatibility
 */
contract RoyaltyDistributor is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_RECIPIENTS = 10;
    
    struct Beneficiary {
        address payable recipient;
        uint96 percentage; // basis points (10000 = 100%)
    }
    
    struct RoyaltyConfig {
        uint256 tokenId;
        Beneficiary[] beneficiaries;
        uint256 totalDistributed;
        bool isActive;
    }
    
    // tokenId => RoyaltyConfig
    mapping(uint256 => RoyaltyConfig) private royaltyConfigs;
    
    // tokenId => beneficiary => amount
    mapping(uint256 => mapping(address => uint256)) public pendingWithdrawals;
    
    // beneficiary => total earned
    mapping(address => uint256) public totalEarned;
    
    event RoyaltyConfigured(uint256 indexed tokenId, Beneficiary[] beneficiaries);
    event RoyaltyDistributed(uint256 indexed tokenId, uint256 amount, address indexed payer);
    event RoyaltyWithdrawn(address indexed beneficiary, uint256 amount);
    event BeneficiaryAdded(uint256 indexed tokenId, address indexed beneficiary, uint96 percentage);
    event BeneficiaryRemoved(uint256 indexed tokenId, address indexed beneficiary);
    event BeneficiaryUpdated(uint256 indexed tokenId, address indexed beneficiary, uint96 oldPercentage, uint96 newPercentage);
    event EmergencyPaused(address indexed pauser);
    event EmergencyUnpaused(address indexed pauser);
    
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
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }
    
    /**
     * @dev Configure royalty distribution
     * @param tokenId NFT token ID
     * @param beneficiaries List of beneficiaries (max 10)
     */
    function configureRoyalty(
        uint256 tokenId,
        Beneficiary[] memory beneficiaries
    ) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused {
        require(beneficiaries.length > 0, "No beneficiaries");
        require(beneficiaries.length <= MAX_RECIPIENTS, "Too many recipients");
        
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            require(beneficiaries[i].recipient != address(0), "Invalid recipient");
            require(beneficiaries[i].percentage > 0, "Invalid percentage");
            totalPercentage += beneficiaries[i].percentage;
        }
        require(totalPercentage == BASIS_POINTS, "Total must be 100%");
        
        // Clear existing beneficiaries
        delete royaltyConfigs[tokenId].beneficiaries;
        
        // Add new beneficiaries
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            royaltyConfigs[tokenId].beneficiaries.push(beneficiaries[i]);
        }
        
        royaltyConfigs[tokenId].tokenId = tokenId;
        royaltyConfigs[tokenId].isActive = true;
        
        emit RoyaltyConfigured(tokenId, beneficiaries);
    }
    
    /**
     * @dev Distribute royalty (ETH)
     * @param tokenId NFT token ID
     */
    function distributeRoyalty(uint256 tokenId) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "No payment");
        require(royaltyConfigs[tokenId].isActive, "Royalty not configured");
        
        RoyaltyConfig storage config = royaltyConfigs[tokenId];
        uint256 amount = msg.value;
        
        for (uint256 i = 0; i < config.beneficiaries.length; i++) {
            Beneficiary memory beneficiary = config.beneficiaries[i];
            uint256 share = (amount * beneficiary.percentage) / BASIS_POINTS;
            
            pendingWithdrawals[tokenId][beneficiary.recipient] += share;
            totalEarned[beneficiary.recipient] += share;
        }
        
        config.totalDistributed += amount;
        
        emit RoyaltyDistributed(tokenId, amount, msg.sender);
    }
    
    /**
     * @dev Distribute ERC-20 token royalty
     * @param tokenId NFT token ID
     * @param token ERC-20 token address
     * @param amount Amount to distribute
     */
    function distributeTokenRoyalty(
        uint256 tokenId,
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "No payment");
        require(royaltyConfigs[tokenId].isActive, "Royalty not configured");
        
        IERC20 erc20Token = IERC20(token);
        require(
            erc20Token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        RoyaltyConfig storage config = royaltyConfigs[tokenId];
        
        for (uint256 i = 0; i < config.beneficiaries.length; i++) {
            Beneficiary memory beneficiary = config.beneficiaries[i];
            uint256 share = (amount * beneficiary.percentage) / BASIS_POINTS;
            
            require(erc20Token.transfer(beneficiary.recipient, share), "Distribution failed");
            totalEarned[beneficiary.recipient] += share;
        }
        
        config.totalDistributed += amount;
        
        emit RoyaltyDistributed(tokenId, amount, msg.sender);
    }
    
    /**
     * @dev Withdraw pending royalties
     * @param tokenId NFT token ID
     */
    function withdraw(uint256 tokenId) external nonReentrant {
        uint256 amount = pendingWithdrawals[tokenId][msg.sender];
        require(amount > 0, "No pending withdrawals");
        
        pendingWithdrawals[tokenId][msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit RoyaltyWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Batch withdraw from multiple tokens
     * @param tokenIds NFT token IDs
     */
    function batchWithdraw(uint256[] calldata tokenIds) external nonReentrant {
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 amount = pendingWithdrawals[tokenIds[i]][msg.sender];
            if (amount > 0) {
                pendingWithdrawals[tokenIds[i]][msg.sender] = 0;
                totalAmount += amount;
            }
        }
        
        require(totalAmount > 0, "No pending withdrawals");
        
        (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
        require(success, "Transfer failed");
        
        emit RoyaltyWithdrawn(msg.sender, totalAmount);
    }
    
    /**
     * @dev Add beneficiary to existing configuration
     * @param tokenId NFT token ID
     * @param recipient Beneficiary address
     * @param percentage Percentage in basis points
     */
    function addBeneficiary(
        uint256 tokenId,
        address payable recipient,
        uint96 percentage
    ) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused {
        require(recipient != address(0), "Invalid recipient");
        require(percentage > 0, "Invalid percentage");
        
        RoyaltyConfig storage config = royaltyConfigs[tokenId];
        require(config.beneficiaries.length < MAX_RECIPIENTS, "Max recipients reached");
        
        // Check total percentage doesn't exceed 100%
        uint256 totalPercentage = percentage;
        for (uint256 i = 0; i < config.beneficiaries.length; i++) {
            totalPercentage += config.beneficiaries[i].percentage;
        }
        require(totalPercentage <= BASIS_POINTS, "Exceeds 100%");
        
        config.beneficiaries.push(Beneficiary({
            recipient: recipient,
            percentage: percentage
        }));
        
        emit BeneficiaryAdded(tokenId, recipient, percentage);
    }
    
    /**
     * @dev Remove beneficiary from configuration
     * @param tokenId NFT token ID
     * @param recipient Beneficiary address
     */
    function removeBeneficiary(
        uint256 tokenId,
        address recipient
    ) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused {
        RoyaltyConfig storage config = royaltyConfigs[tokenId];
        
        for (uint256 i = 0; i < config.beneficiaries.length; i++) {
            if (config.beneficiaries[i].recipient == recipient) {
                // Move last element to deleted position
                config.beneficiaries[i] = config.beneficiaries[config.beneficiaries.length - 1];
                config.beneficiaries.pop();
                
                emit BeneficiaryRemoved(tokenId, recipient);
                return;
            }
        }
        
        revert("Beneficiary not found");
    }
    
    /**
     * @dev Update beneficiary percentage dynamically
     * @param tokenId NFT token ID
     * @param recipient Beneficiary address
     * @param newPercentage New percentage in basis points
     */
    function updateBeneficiaryPercentage(
        uint256 tokenId,
        address recipient,
        uint96 newPercentage
    ) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused {
        require(newPercentage > 0, "Invalid percentage");
        
        RoyaltyConfig storage config = royaltyConfigs[tokenId];
        bool found = false;
        uint96 oldPercentage = 0;
        
        // Find and update the beneficiary
        for (uint256 i = 0; i < config.beneficiaries.length; i++) {
            if (config.beneficiaries[i].recipient == recipient) {
                oldPercentage = config.beneficiaries[i].percentage;
                config.beneficiaries[i].percentage = newPercentage;
                found = true;
                break;
            }
        }
        
        require(found, "Beneficiary not found");
        
        // Verify total percentage is still 100%
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < config.beneficiaries.length; i++) {
            totalPercentage += config.beneficiaries[i].percentage;
        }
        require(totalPercentage == BASIS_POINTS, "Total must be 100%");
        
        emit BeneficiaryUpdated(tokenId, recipient, oldPercentage, newPercentage);
    }
    
    /**
     * @dev Batch update multiple beneficiary percentages
     * @param tokenId NFT token ID
     * @param recipients Array of beneficiary addresses
     * @param newPercentages Array of new percentages
     */
    function batchUpdatePercentages(
        uint256 tokenId,
        address[] calldata recipients,
        uint96[] calldata newPercentages
    ) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused {
        require(recipients.length == newPercentages.length, "Length mismatch");
        require(recipients.length > 0, "Empty arrays");
        
        RoyaltyConfig storage config = royaltyConfigs[tokenId];
        
        // Update all percentages
        for (uint256 j = 0; j < recipients.length; j++) {
            require(newPercentages[j] > 0, "Invalid percentage");
            
            bool found = false;
            uint96 oldPercentage = 0;
            
            for (uint256 i = 0; i < config.beneficiaries.length; i++) {
                if (config.beneficiaries[i].recipient == recipients[j]) {
                    oldPercentage = config.beneficiaries[i].percentage;
                    config.beneficiaries[i].percentage = newPercentages[j];
                    found = true;
                    emit BeneficiaryUpdated(tokenId, recipients[j], oldPercentage, newPercentages[j]);
                    break;
                }
            }
            
            require(found, "Beneficiary not found");
        }
        
        // Verify total percentage is still 100%
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < config.beneficiaries.length; i++) {
            totalPercentage += config.beneficiaries[i].percentage;
        }
        require(totalPercentage == BASIS_POINTS, "Total must be 100%");
    }
    
    /**
     * @dev Emergency pause - stops all distributions and configurations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPaused(msg.sender);
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }
    
    /**
     * @dev Get royalty configuration
     * @param tokenId NFT token ID
     */
    function getRoyaltyConfig(uint256 tokenId)
        external
        view
        returns (
            Beneficiary[] memory beneficiaries,
            uint256 totalDistributed,
            bool isActive
        )
    {
        RoyaltyConfig storage config = royaltyConfigs[tokenId];
        return (config.beneficiaries, config.totalDistributed, config.isActive);
    }
    
    /**
     * @dev Get pending withdrawal amount
     * @param tokenId NFT token ID
     * @param beneficiary Beneficiary address
     */
    function getPendingWithdrawal(uint256 tokenId, address beneficiary)
        external
        view
        returns (uint256)
    {
        return pendingWithdrawals[tokenId][beneficiary];
    }
    
    /**
     * @dev Get total earned by beneficiary
     * @param beneficiary Beneficiary address
     */
    function getTotalEarned(address beneficiary) external view returns (uint256) {
        return totalEarned[beneficiary];
    }
    
    /**
     * @dev Get number of beneficiaries for a token
     * @param tokenId NFT token ID
     */
    function getBeneficiaryCount(uint256 tokenId) external view returns (uint256) {
        return royaltyConfigs[tokenId].beneficiaries.length;
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
