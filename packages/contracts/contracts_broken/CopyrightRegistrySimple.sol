// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title CopyrightRegistrySimple
 * @dev 简化版本的版权注册合约，避免复杂继承问题
 */
contract CopyrightRegistrySimple is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    enum ContentCategory { Music, Video, Image, Text, Software, Other }
    
    struct IPMetadata {
        string metadataURI;
        bytes32 contentHash;
        bytes32 aiFingerprint;
        ContentCategory category;
        uint256 royaltyPercentage;
        address creator;
        uint256 createdAt;
        bool isVerified;
    }
    
    mapping(uint256 => IPMetadata) public ipMetadata;
    mapping(bytes32 => uint256) public contentHashToTokenId;
    mapping(bytes32 => uint256) public fingerprintToTokenId;
    
    uint256 private _tokenIdCounter;
    
    event IPRegistered(
        uint256 indexed tokenId,
        address indexed creator,
        bytes32 contentHash,
        bytes32 aiFingerprint,
        ContentCategory category
    );
    
    event IPVerified(uint256 indexed tokenId, bool verified);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __ERC721_init("KnowTon IP Registry", "KTIP");
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        
        _tokenIdCounter = 1;
    }
    
    function registerIP(
        address to,
        string memory metadataURI,
        bytes32 contentHash,
        bytes32 aiFingerprint,
        ContentCategory category,
        uint256 royaltyPercentage
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(contentHashToTokenId[contentHash] == 0, "Content already registered");
        require(fingerprintToTokenId[aiFingerprint] == 0, "Fingerprint already exists");
        require(royaltyPercentage <= 5000, "Royalty too high"); // Max 50%
        
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        
        ipMetadata[tokenId] = IPMetadata({
            metadataURI: metadataURI,
            contentHash: contentHash,
            aiFingerprint: aiFingerprint,
            category: category,
            royaltyPercentage: royaltyPercentage,
            creator: to,
            createdAt: block.timestamp,
            isVerified: false
        });
        
        contentHashToTokenId[contentHash] = tokenId;
        fingerprintToTokenId[aiFingerprint] = tokenId;
        
        emit IPRegistered(tokenId, to, contentHash, aiFingerprint, category);
        
        return tokenId;
    }
    
    function verifyIP(uint256 tokenId, bool verified) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        
        ipMetadata[tokenId].isVerified = verified;
        emit IPVerified(tokenId, verified);
    }
    
    function getIPMetadata(uint256 tokenId) external view returns (IPMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return ipMetadata[tokenId];
    }
    
    function checkContentHash(bytes32 contentHash) external view returns (uint256) {
        return contentHashToTokenId[contentHash];
    }
    
    function checkFingerprint(bytes32 aiFingerprint) external view returns (uint256) {
        return fingerprintToTokenId[aiFingerprint];
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }
    
    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
}