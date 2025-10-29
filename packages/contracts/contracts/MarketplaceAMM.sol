// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

interface IUniswapV3Router {
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
}

interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

contract MarketplaceAMM is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    IUniswapV3Router public uniswapRouter;
    address public WETH;
    
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
        uint256 listedAt;
    }
    
    mapping(bytes32 => Listing) public listings;
    mapping(address => mapping(uint256 => bytes32)) public nftToListingId;
    
    uint256 public platformFee; // basis points
    address public feeRecipient;
    
    event Listed(bytes32 indexed listingId, address indexed seller, address nftContract, uint256 tokenId, uint256 price);
    event Sold(bytes32 indexed listingId, address indexed buyer, address indexed seller, uint256 price);
    event Cancelled(bytes32 indexed listingId);
    event PriceUpdated(bytes32 indexed listingId, uint256 newPrice);
    
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _uniswapRouter,
        address _weth,
        uint256 _platformFee,
        address _feeRecipient
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        uniswapRouter = IUniswapV3Router(_uniswapRouter);
        WETH = _weth;
        platformFee = _platformFee;
        feeRecipient = _feeRecipient;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }
    
    function list(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external nonReentrant returns (bytes32) {
        require(price > 0, "Invalid price");
        
        IERC721Upgradeable nft = IERC721Upgradeable(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "Not approved"
        );
        
        bytes32 listingId = keccak256(abi.encodePacked(nftContract, tokenId, block.timestamp));
        
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true,
            listedAt: block.timestamp
        });
        
        nftToListingId[nftContract][tokenId] = listingId;
        
        emit Listed(listingId, msg.sender, nftContract, tokenId, price);
        
        return listingId;
    }
    
    function buy(bytes32 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(msg.value >= listing.price, "Insufficient payment");
        
        listing.active = false;
        
        uint256 fee = (listing.price * platformFee) / 10000;
        uint256 sellerAmount = listing.price - fee;
        
        IERC721Upgradeable(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        (bool successSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(successSeller, "Seller transfer failed");
        
        if (fee > 0) {
            (bool successFee, ) = payable(feeRecipient).call{value: fee}("");
            require(successFee, "Fee transfer failed");
        }
        
        if (msg.value > listing.price) {
            (bool successRefund, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(successRefund, "Refund failed");
        }
        
        emit Sold(listingId, msg.sender, listing.seller, listing.price);
    }
    
    function buyWithToken(
        bytes32 listingId,
        address tokenIn,
        uint256 amountInMaximum,
        uint24 poolFee
    ) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        
        IERC20Upgradeable(tokenIn).transferFrom(msg.sender, address(this), amountInMaximum);
        IERC20Upgradeable(tokenIn).approve(address(uniswapRouter), amountInMaximum);
        
        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: WETH,
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountInMaximum,
            amountOutMinimum: listing.price,
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = uniswapRouter.exactInputSingle(params);
        require(amountOut >= listing.price, "Insufficient output");
        
        listing.active = false;
        
        uint256 fee = (listing.price * platformFee) / 10000;
        uint256 sellerAmount = listing.price - fee;
        
        IERC721Upgradeable(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );
        
        (bool successSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(successSeller, "Seller transfer failed");
        
        if (fee > 0) {
            (bool successFee, ) = payable(feeRecipient).call{value: fee}("");
            require(successFee, "Fee transfer failed");
        }
        
        emit Sold(listingId, msg.sender, listing.seller, listing.price);
    }
    
    function cancel(bytes32 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(listing.seller == msg.sender, "Not seller");
        
        listing.active = false;
        
        emit Cancelled(listingId);
    }
    
    function updatePrice(bytes32 listingId, uint256 newPrice) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(listing.seller == msg.sender, "Not seller");
        require(newPrice > 0, "Invalid price");
        
        listing.price = newPrice;
        
        emit PriceUpdated(listingId, newPrice);
    }
    
    function getPrice(address tokenIn, address tokenOut, uint24 poolFee, uint256 amountIn)
        external
        view
        returns (uint256)
    {
        // Simplified price query - in production use Quoter contract
        return amountIn;
    }
    
    function updatePlatformFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }
    
    function updateFeeRecipient(address newRecipient) external onlyRole(ADMIN_ROLE) {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
    
    receive() external payable {}
}
