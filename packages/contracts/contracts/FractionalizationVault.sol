// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title FractionalizationVault
 * @dev NFT 碎片化合约，将 NFT 锁定并铸造 ERC-20 代币
 */
contract FractionalizationVault is
    Initializable,
    ERC20Upgradeable,
    ERC721HolderUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    enum VaultState {
        Inactive,
        Fractionalized,
        RedeemVoting,
        Redeemed
    }
    
    struct Vault {
        address nftContract;
        uint256 tokenId;
        address curator;
        uint256 totalSupply;
        uint256 reservePrice;
        VaultState state;
        uint256 createdAt;
        uint256 votingEndTime;
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
    }
    
    // vaultId => Vault
    mapping(uint256 => Vault) public vaults;
    uint256 private _vaultIdCounter;
    
    // Voting parameters
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant QUORUM_PERCENTAGE = 51; // 51%
    
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address curator,
        uint256 totalSupply
    );
    event RedeemVotingStarted(uint256 indexed vaultId, uint256 endTime);
    event VoteCast(uint256 indexed vaultId, address indexed voter, bool support, uint256 weight);
    event VaultRedeemed(uint256 indexed vaultId, address indexed redeemer);
    event ReservePriceUpdated(uint256 indexed vaultId, uint256 newPrice);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __ERC20_init("Fractionalized NFT", "fNFT");
        __ERC721Holder_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CURATOR_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }
    
    /**
     * @dev 创建碎片化金库
     * @param nftContract NFT 合约地址
     * @param tokenId NFT token ID
     * @param totalSupply 碎片代币总供应量
     * @param reservePrice 赎回底价
     * @param name 碎片代币名称
     * @param symbol 碎片代币符号
     */
    function createVault(
        address nftContract,
        uint256 tokenId,
        uint256 totalSupply,
        uint256 reservePrice,
        string memory name,
        string memory symbol
    ) external nonReentrant returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(totalSupply > 0, "Invalid supply");
        
        // Transfer NFT to vault
        IERC721Upgradeable(nftContract).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );
        
        _vaultIdCounter++;
        uint256 vaultId = _vaultIdCounter;
        
        Vault storage vault = vaults[vaultId];
        vault.nftContract = nftContract;
        vault.tokenId = tokenId;
        vault.curator = msg.sender;
        vault.totalSupply = totalSupply;
        vault.reservePrice = reservePrice;
        vault.state = VaultState.Fractionalized;
        vault.createdAt = block.timestamp;
        
        // Mint fractional tokens to curator
        _mint(msg.sender, totalSupply);
        
        emit VaultCreated(vaultId, nftContract, tokenId, msg.sender, totalSupply);
        
        return vaultId;
    }
    
    /**
     * @dev 开始赎回投票
     * @param vaultId 金库 ID
     */
    function startRedeemVoting(uint256 vaultId) external {
        Vault storage vault = vaults[vaultId];
        require(vault.state == VaultState.Fractionalized, "Invalid state");
        require(msg.sender == vault.curator, "Not curator");
        
        vault.state = VaultState.RedeemVoting;
        vault.votingEndTime = block.timestamp + VOTING_PERIOD;
        vault.yesVotes = 0;
        vault.noVotes = 0;
        
        emit RedeemVotingStarted(vaultId, vault.votingEndTime);
    }
    
    /**
     * @dev 投票赎回
     * @param vaultId 金库 ID
     * @param support 是否支持赎回
     */
    function vote(uint256 vaultId, bool support) external {
        Vault storage vault = vaults[vaultId];
        require(vault.state == VaultState.RedeemVoting, "Not in voting");
        require(block.timestamp < vault.votingEndTime, "Voting ended");
        require(!vault.hasVoted[msg.sender], "Already voted");
        
        uint256 weight = balanceOf(msg.sender);
        require(weight > 0, "No voting power");
        
        vault.hasVoted[msg.sender] = true;
        
        if (support) {
            vault.yesVotes += weight;
        } else {
            vault.noVotes += weight;
        }
        
        emit VoteCast(vaultId, msg.sender, support, weight);
    }
    
    /**
     * @dev 执行赎回
     * @param vaultId 金库 ID
     */
    function executeRedeem(uint256 vaultId) external payable nonReentrant {
        Vault storage vault = vaults[vaultId];
        require(vault.state == VaultState.RedeemVoting, "Not in voting");
        require(block.timestamp >= vault.votingEndTime, "Voting not ended");
        require(msg.value >= vault.reservePrice, "Insufficient payment");
        
        uint256 totalVotes = vault.yesVotes + vault.noVotes;
        uint256 quorum = (vault.totalSupply * QUORUM_PERCENTAGE) / 100;
        
        require(totalVotes >= quorum, "Quorum not reached");
        require(vault.yesVotes > vault.noVotes, "Vote failed");
        
        vault.state = VaultState.Redeemed;
        
        // Transfer NFT to redeemer
        IERC721Upgradeable(vault.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            vault.tokenId
        );
        
        // Distribute payment to token holders proportionally
        // (In production, this would be done through a separate claim mechanism)
        
        emit VaultRedeemed(vaultId, msg.sender);
    }
    
    /**
     * @dev 更新底价
     * @param vaultId 金库 ID
     * @param newPrice 新底价
     */
    function updateReservePrice(uint256 vaultId, uint256 newPrice)
        external
        onlyRole(CURATOR_ROLE)
    {
        Vault storage vault = vaults[vaultId];
        require(vault.state == VaultState.Fractionalized, "Invalid state");
        
        vault.reservePrice = newPrice;
        
        emit ReservePriceUpdated(vaultId, newPrice);
    }
    
    /**
     * @dev 获取金库信息
     * @param vaultId 金库 ID
     */
    function getVaultInfo(uint256 vaultId)
        external
        view
        returns (
            address nftContract,
            uint256 tokenId,
            address curator,
            uint256 totalSupply,
            uint256 reservePrice,
            VaultState state,
            uint256 createdAt
        )
    {
        Vault storage vault = vaults[vaultId];
        return (
            vault.nftContract,
            vault.tokenId,
            vault.curator,
            vault.totalSupply,
            vault.reservePrice,
            vault.state,
            vault.createdAt
        );
    }
    
    /**
     * @dev 获取投票信息
     * @param vaultId 金库 ID
     */
    function getVotingInfo(uint256 vaultId)
        external
        view
        returns (
            uint256 votingEndTime,
            uint256 yesVotes,
            uint256 noVotes,
            bool hasVoted
        )
    {
        Vault storage vault = vaults[vaultId];
        return (
            vault.votingEndTime,
            vault.yesVotes,
            vault.noVotes,
            vault.hasVoted[msg.sender]
        );
    }
    
    /**
     * @dev 检查是否已投票
     * @param vaultId 金库 ID
     * @param voter 投票者地址
     */
    function hasVoted(uint256 vaultId, address voter) external view returns (bool) {
        return vaults[vaultId].hasVoted[voter];
    }
    
    // Required overrides
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
}
