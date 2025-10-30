// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title CopyrightRegistry
 * @dev IP-NFT (Intellectual Property NFT) 合约
 * 支持版权注册、版税配置、内容指纹验证
 */
contract CopyrightRegistry is 
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ERC721EnumerableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC2981
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    uint256 private _tokenIdCounter;
    uint96 public constant MAX_ROYALTY_PERCENTAGE = 5000; // 50%
    
    enum ContentCategory {
        Music,
        Video,
        Image,
        Text,
        Software,
        Other
    }
    
    struct IPMetadata {
        address creator;
        bytes32 contentHash;
        bytes32 aiFingerprint;
        ContentCategory category;
        uint256 mintTimestamp;
        uint96 royaltyPercentage;
        address royaltyRecipient;
        bool isVerified;
    }
    
    // tokenId => IPMetadata
    mapping(uint256 => IPMetadata) public ipMetadata;
    
    // contentHash => tokenId (防止重复铸造)
    mapping(bytes32 => uint256) public contentHashToTokenId;
    
    // aiFingerprint => tokenId[] (用于相似度检测)
    mapping(bytes32 => uint256[]) public fingerprintToTokenIds;
    
    // creator => tokenIds[]
    mapping(address => uint256[]) public creatorTokens;
    
    event IPNFTMinted(
        uint256 indexed tokenId,
        address indexed creator,
        bytes32 contentHash,
        bytes32 aiFingerprint,
        ContentCategory category,
        uint96 royaltyPercentage
    );
    
    event IPVerified(uint256 indexed tokenId, address verifier);
    event RoyaltyUpdated(uint256 indexed tokenId, uint96 newRoyalty, address newRecipient);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __ERC721_init("KnowTon IP-NFT", "IPNFT");
        __ERC721URIStorage_init();
        __ERC721Enumerable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }
    
    /**
     * @dev 铸造 IP-NFT
     * @param to 接收者地址
     * @param metadataURI IPFS 元数据 URI
     * @param contentHash 内容哈希
     * @param aiFingerprint AI 生成的内容指纹
     * @param category 内容类别
     * @param royaltyPercentage 版税百分比 (basis points, 10000 = 100%)
     */
    function mintIPNFT(
        address to,
        string memory metadataURI,
        bytes32 contentHash,
        bytes32 aiFingerprint,
        ContentCategory category,
        uint96 royaltyPercentage
    ) public returns (uint256) {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        require(contentHashToTokenId[contentHash] == 0, "Content already registered");
        require(royaltyPercentage <= MAX_ROYALTY_PERCENTAGE, "Royalty too high");
        
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        ipMetadata[tokenId] = IPMetadata({
            creator: to,
            contentHash: contentHash,
            aiFingerprint: aiFingerprint,
            category: category,
            mintTimestamp: block.timestamp,
            royaltyPercentage: royaltyPercentage,
            royaltyRecipient: to,
            isVerified: false
        });
        
        contentHashToTokenId[contentHash] = tokenId;
        fingerprintToTokenIds[aiFingerprint].push(tokenId);
        creatorTokens[to].push(tokenId);
        
        emit IPNFTMinted(tokenId, to, contentHash, aiFingerprint, category, royaltyPercentage);
        
        return tokenId;
    }
    
    /**
     * @dev 批量铸造 IP-NFT
     */
    function batchMintIPNFT(
        address[] memory recipients,
        string[] memory metadataURIs,
        bytes32[] memory contentHashes,
        bytes32[] memory aiFingerprints,
        ContentCategory[] memory categories,
        uint96[] memory royaltyPercentages
    ) external returns (uint256[] memory) {
        require(recipients.length == metadataURIs.length, "Array length mismatch");
        require(recipients.length == contentHashes.length, "Array length mismatch");
        
        uint256[] memory tokenIds = new uint256[](recipients.length);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = mintIPNFT(
                recipients[i],
                metadataURIs[i],
                contentHashes[i],
                aiFingerprints[i],
                categories[i],
                royaltyPercentages[i]
            );
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 验证 IP-NFT（由管理员或验证者执行）
     */
    function verifyIP(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        ipMetadata[tokenId].isVerified = true;
        emit IPVerified(tokenId, msg.sender);
    }
    
    /**
     * @dev 更新版税配置（仅创作者可调用）
     */
    function updateRoyalty(
        uint256 tokenId,
        uint96 newRoyaltyPercentage,
        address newRecipient
    ) external {
        require(_ownerOf(tokenId) == msg.sender, "Not token owner");
        require(newRoyaltyPercentage <= MAX_ROYALTY_PERCENTAGE, "Royalty too high");
        require(newRecipient != address(0), "Invalid recipient");
        
        ipMetadata[tokenId].royaltyPercentage = newRoyaltyPercentage;
        ipMetadata[tokenId].royaltyRecipient = newRecipient;
        
        emit RoyaltyUpdated(tokenId, newRoyaltyPercentage, newRecipient);
    }
    
    /**
     * @dev 检查内容是否已注册
     */
    function isContentRegistered(bytes32 contentHash) external view returns (bool) {
        return contentHashToTokenId[contentHash] != 0;
    }
    
    /**
     * @dev 通过指纹查找相似内容
     */
    function findSimilarContent(bytes32 aiFingerprint) external view returns (uint256[] memory) {
        return fingerprintToTokenIds[aiFingerprint];
    }
    
    /**
     * @dev 获取创作者的所有作品
     */
    function getCreatorTokens(address creator) external view returns (uint256[] memory) {
        return creatorTokens[creator];
    }
    
    /**
     * @dev 获取 IP 元数据
     */
    function getIPMetadata(uint256 tokenId) external view returns (IPMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return ipMetadata[tokenId];
    }
    
    /**
     * @dev ERC-2981 版税信息
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        IPMetadata memory metadata = ipMetadata[tokenId];
        receiver = metadata.royaltyRecipient;
        royaltyAmount = (salePrice * metadata.royaltyPercentage) / 10000;
    }
    
    // Required overrides
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
    
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, AccessControlUpgradeable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}
