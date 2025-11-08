// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title FractionalizationVault
 * @dev Vault for fractionalizing NFTs into ERC-20 tokens with buyout mechanism
 * @notice This contract allows NFT owners to lock their NFTs and mint fractional tokens
 * Token holders can vote on redemption and buyout the NFT
 */
contract FractionalizationVault is 
    Initializable,
    ERC20Upgradeable,
    ERC721HolderUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable 
{
    enum VaultState {
        Inactive,
        Active,
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
        uint256 vaultId;
    }

    struct VotingInfo {
        uint256 votingEndTime;
        uint256 yesVotes;
        uint256 noVotes;
        mapping(address => bool) hasVoted;
    }

    // Vault storage
    mapping(uint256 => Vault) public vaults;
    mapping(uint256 => VotingInfo) public votingInfo;
    mapping(address => mapping(uint256 => uint256)) public nftToVaultId;
    
    uint256 public vaultCounter;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant QUORUM_PERCENTAGE = 50; // 50% of tokens must vote yes

    // Events
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address curator,
        uint256 totalSupply
    );

    event RedeemVotingStarted(
        uint256 indexed vaultId,
        uint256 votingEndTime
    );

    event VoteCast(
        uint256 indexed vaultId,
        address indexed voter,
        bool support,
        uint256 votes
    );

    event VaultRedeemed(
        uint256 indexed vaultId,
        address indexed redeemer
    );

    event ReservePriceUpdated(
        uint256 indexed vaultId,
        uint256 newPrice
    );

    event FractionsRedeemed(
        uint256 indexed vaultId,
        address indexed holder,
        uint256 amount,
        uint256 payout
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     */
    function initialize() public initializer {
        __ERC20_init("Fractional Vault Token", "FVT");
        __ERC721Holder_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        vaultCounter = 0;
    }

    /**
     * @dev Create a new vault and fractionalize an NFT
     * @param _nftContract Address of the NFT contract
     * @param _tokenId Token ID of the NFT
     * @param _totalSupply Total supply of fractional tokens to mint
     * @param _reservePrice Minimum price for buyout
     * @param _name Name of the fractional token
     * @param _symbol Symbol of the fractional token
     */
    function createVault(
        address _nftContract,
        uint256 _tokenId,
        uint256 _totalSupply,
        uint256 _reservePrice,
        string memory _name,
        string memory _symbol
    ) external nonReentrant returns (uint256) {
        require(_nftContract != address(0), "Invalid NFT contract");
        require(_totalSupply > 0, "Invalid supply");
        require(_totalSupply >= 1000 && _totalSupply <= 1000000 * 10**18, "Supply out of range");
        require(_reservePrice > 0, "Invalid reserve price");

        // Transfer NFT to vault
        IERC721Upgradeable(_nftContract).safeTransferFrom(
            msg.sender,
            address(this),
            _tokenId
        );

        // Create vault
        vaultCounter++;
        uint256 vaultId = vaultCounter;

        vaults[vaultId] = Vault({
            nftContract: _nftContract,
            tokenId: _tokenId,
            curator: msg.sender,
            totalSupply: _totalSupply,
            reservePrice: _reservePrice,
            state: VaultState.Active,
            vaultId: vaultId
        });

        nftToVaultId[_nftContract][_tokenId] = vaultId;

        // Mint fractional tokens to curator
        _mint(msg.sender, _totalSupply);

        emit VaultCreated(vaultId, _nftContract, _tokenId, msg.sender, _totalSupply);

        return vaultId;
    }

    /**
     * @dev Start voting for redemption/buyout
     * @param _vaultId ID of the vault
     */
    function startRedeemVoting(uint256 _vaultId) external {
        Vault storage vault = vaults[_vaultId];
        require(vault.state == VaultState.Active, "Vault not active");
        require(msg.sender == vault.curator || balanceOf(msg.sender) > 0, "Not authorized");

        vault.state = VaultState.RedeemVoting;
        
        VotingInfo storage voting = votingInfo[_vaultId];
        voting.votingEndTime = block.timestamp + VOTING_PERIOD;
        voting.yesVotes = 0;
        voting.noVotes = 0;

        emit RedeemVotingStarted(_vaultId, voting.votingEndTime);
    }

    /**
     * @dev Vote on redemption
     * @param _vaultId ID of the vault
     * @param _support True to support redemption, false to oppose
     */
    function vote(uint256 _vaultId, bool _support) external {
        Vault storage vault = vaults[_vaultId];
        require(vault.state == VaultState.RedeemVoting, "Not in voting state");

        VotingInfo storage voting = votingInfo[_vaultId];
        require(block.timestamp < voting.votingEndTime, "Voting ended");
        require(!voting.hasVoted[msg.sender], "Already voted");

        uint256 votes = balanceOf(msg.sender);
        require(votes > 0, "No voting power");

        voting.hasVoted[msg.sender] = true;

        if (_support) {
            voting.yesVotes += votes;
        } else {
            voting.noVotes += votes;
        }

        emit VoteCast(_vaultId, msg.sender, _support, votes);
    }

    /**
     * @dev Execute redemption after successful vote
     * @param _vaultId ID of the vault
     */
    function executeRedeem(uint256 _vaultId) external payable nonReentrant {
        Vault storage vault = vaults[_vaultId];
        require(vault.state == VaultState.RedeemVoting, "Not in voting state");

        VotingInfo storage voting = votingInfo[_vaultId];
        require(block.timestamp >= voting.votingEndTime, "Voting not ended");

        // Check if vote passed (yes votes > 50% of total supply)
        uint256 quorumVotes = (vault.totalSupply * QUORUM_PERCENTAGE) / 100;
        require(voting.yesVotes > quorumVotes, "Vote did not pass");

        // Check payment
        require(msg.value >= vault.reservePrice, "Insufficient payment");

        // Update state
        vault.state = VaultState.Redeemed;

        // Transfer NFT to redeemer
        IERC721Upgradeable(vault.nftContract).safeTransferFrom(
            address(this),
            msg.sender,
            vault.tokenId
        );

        emit VaultRedeemed(_vaultId, msg.sender);
    }

    /**
     * @dev Redeem fractional tokens for ETH after vault is redeemed
     * @param _vaultId ID of the vault
     * @param _amount Amount of tokens to redeem
     */
    function redeemFractions(uint256 _vaultId, uint256 _amount) external nonReentrant {
        Vault storage vault = vaults[_vaultId];
        require(vault.state == VaultState.Redeemed, "Vault not redeemed");
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");

        // Calculate payout proportional to token holdings
        uint256 totalBalance = address(this).balance;
        uint256 payout = (totalBalance * _amount) / vault.totalSupply;

        // Burn tokens
        _burn(msg.sender, _amount);

        // Transfer ETH
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Transfer failed");

        emit FractionsRedeemed(_vaultId, msg.sender, _amount, payout);
    }

    /**
     * @dev Update reserve price (only curator)
     * @param _vaultId ID of the vault
     * @param _newPrice New reserve price
     */
    function updateReservePrice(uint256 _vaultId, uint256 _newPrice) external {
        Vault storage vault = vaults[_vaultId];
        require(msg.sender == vault.curator, "Not curator");
        require(vault.state == VaultState.Active, "Vault not active");
        require(_newPrice > 0, "Invalid price");

        vault.reservePrice = _newPrice;

        emit ReservePriceUpdated(_vaultId, _newPrice);
    }

    /**
     * @dev Get vault information
     * @param _vaultId ID of the vault
     */
    function getVaultInfo(uint256 _vaultId) external view returns (
        address nftContract,
        uint256 tokenId,
        address curator,
        VaultState state,
        uint256 reservePrice,
        uint256 totalSupply
    ) {
        Vault storage vault = vaults[_vaultId];
        return (
            vault.nftContract,
            vault.tokenId,
            vault.curator,
            vault.state,
            vault.reservePrice,
            vault.totalSupply
        );
    }

    /**
     * @dev Get voting information
     * @param _vaultId ID of the vault
     */
    function getVotingInfo(uint256 _vaultId) external view returns (
        uint256 votingEndTime,
        uint256 yesVotes,
        uint256 noVotes
    ) {
        VotingInfo storage voting = votingInfo[_vaultId];
        return (
            voting.votingEndTime,
            voting.yesVotes,
            voting.noVotes
        );
    }

    /**
     * @dev Check if an address has voted
     * @param _vaultId ID of the vault
     * @param _voter Address to check
     */
    function hasVoted(uint256 _vaultId, address _voter) external view returns (bool) {
        return votingInfo[_vaultId].hasVoted[_voter];
    }

    /**
     * @dev Get vault ID for an NFT
     * @param _nftContract Address of the NFT contract
     * @param _tokenId Token ID
     */
    function getVaultIdForNFT(address _nftContract, uint256 _tokenId) external view returns (uint256) {
        return nftToVaultId[_nftContract][_tokenId];
    }

    /**
     * @dev Override transfer to add custom logic if needed
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        // Allow minting and burning
        if (from != address(0) && to != address(0)) {
            // Check if any vault is in voting state for this holder
            // This is a simplified check - in production you'd want more sophisticated logic
            require(amount > 0, "Invalid transfer amount");
        }
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
