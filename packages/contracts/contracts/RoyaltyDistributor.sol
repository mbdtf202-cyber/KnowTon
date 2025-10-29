// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RoyaltyDistributor
 * @dev 自动化版税分配合约，支持多受益人和 ERC-2981 标准
 */
contract RoyaltyDistributor is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    uint256 public constant BASIS_POINTS = 10000;
    
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
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }
    
    /**
     * @dev 配置版税分配
     * @param tokenId NFT token ID
     * @param beneficiaries 受益人列表
     */
    function configureRoyalty(
        uint256 tokenId,
        Beneficiary[] memory beneficiaries
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(beneficiaries.length > 0, "No beneficiaries");
        
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
     * @dev 分配版税（ETH）
     * @param tokenId NFT token ID
     */
    function distributeRoyalty(uint256 tokenId) external payable nonReentrant {
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
     * @dev 分配 ERC-20 代币版税
     * @param tokenId NFT token ID
     * @param token ERC-20 代币地址
     * @param amount 金额
     */
    function distributeTokenRoyalty(
        uint256 tokenId,
        address token,
        uint256 amount
    ) external nonReentrant {
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
     * @dev 提取待领取的版税
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
     * @dev 批量提取多个 token 的版税
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
     * @dev 添加受益人
     * @param tokenId NFT token ID
     * @param recipient 受益人地址
     * @param percentage 百分比（basis points）
     */
    function addBeneficiary(
        uint256 tokenId,
        address payable recipient,
        uint96 percentage
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        require(percentage > 0, "Invalid percentage");
        
        RoyaltyConfig storage config = royaltyConfigs[tokenId];
        
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
     * @dev 移除受益人
     * @param tokenId NFT token ID
     * @param recipient 受益人地址
     */
    function removeBeneficiary(
        uint256 tokenId,
        address recipient
    ) external onlyRole(DISTRIBUTOR_ROLE) {
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
     * @dev 获取版税配置
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
     * @dev 获取待提取金额
     * @param tokenId NFT token ID
     * @param beneficiary 受益人地址
     */
    function getPendingWithdrawal(uint256 tokenId, address beneficiary)
        external
        view
        returns (uint256)
    {
        return pendingWithdrawals[tokenId][beneficiary];
    }
    
    /**
     * @dev 获取受益人总收益
     * @param beneficiary 受益人地址
     */
    function getTotalEarned(address beneficiary) external view returns (uint256) {
        return totalEarned[beneficiary];
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
