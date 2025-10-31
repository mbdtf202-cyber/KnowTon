// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MarketplaceAMM
 * @notice Integrates with Uniswap V3 for IP-NFT fractional token trading
 * @dev Provides liquidity pool creation, swap functionality, and TWAP price oracle
 */
contract MarketplaceAMM is Ownable, ReentrancyGuard {
    // Uniswap V3 interfaces
    IUniswapV3Factory public immutable uniswapFactory;
    ISwapRouter public immutable swapRouter;
    INonfungiblePositionManager public immutable positionManager;
    
    // Fee tiers (in hundredths of a bip, i.e. 1e-6)
    uint24 public constant FEE_LOW = 500;      // 0.05%
    uint24 public constant FEE_MEDIUM = 3000;  // 0.3%
    uint24 public constant FEE_HIGH = 10000;   // 1%
    
    // Pool registry
    struct PoolInfo {
        address token0;
        address token1;
        uint24 fee;
        address pool;
        uint256 createdAt;
        bool isActive;
    }
    
    mapping(bytes32 => PoolInfo) public pools;
    mapping(address => bytes32[]) public tokenPools;
    
    // TWAP configuration
    uint32 public twapInterval = 1800; // 30 minutes
    
    // Events
    event PoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 fee,
        address pool,
        uint256 timestamp
    );
    
    event LiquidityAdded(
        address indexed provider,
        address indexed pool,
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1,
        uint128 liquidity
    );
    
    event LiquidityRemoved(
        address indexed provider,
        uint256 indexed tokenId,
        uint256 amount0,
        uint256 amount1
    );
    
    event SwapExecuted(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );
    
    // Errors
    error PoolAlreadyExists();
    error PoolNotFound();
    error InvalidTokenPair();
    error InsufficientLiquidity();
    error SlippageExceeded();
    error InvalidFee();
    
    constructor(
        address _uniswapFactory,
        address _swapRouter,
        address _positionManager
    ) {
        require(_uniswapFactory != address(0), "Invalid factory");
        require(_swapRouter != address(0), "Invalid router");
        require(_positionManager != address(0), "Invalid position manager");
        
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        swapRouter = ISwapRouter(_swapRouter);
        positionManager = INonfungiblePositionManager(_positionManager);
    }
    
    /**
     * @notice Create a new Uniswap V3 liquidity pool
     * @param token0 First token address
     * @param token1 Second token address
     * @param fee Fee tier
     * @param sqrtPriceX96 Initial price (sqrt(price) * 2^96)
     * @return pool Address of created pool
     */
    function createPool(
        address token0,
        address token1,
        uint24 fee,
        uint160 sqrtPriceX96
    ) external onlyOwner returns (address pool) {
        if (token0 == address(0) || token1 == address(0)) revert InvalidTokenPair();
        if (token0 == token1) revert InvalidTokenPair();
        if (fee != FEE_LOW && fee != FEE_MEDIUM && fee != FEE_HIGH) revert InvalidFee();
        
        // Ensure token0 < token1
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        
        bytes32 poolKey = keccak256(abi.encodePacked(token0, token1, fee));
        if (pools[poolKey].pool != address(0)) revert PoolAlreadyExists();
        
        // Create pool via Uniswap factory
        pool = uniswapFactory.createPool(token0, token1, fee);
        
        // Initialize pool with price
        IUniswapV3Pool(pool).initialize(sqrtPriceX96);
        
        // Store pool info
        pools[poolKey] = PoolInfo({
            token0: token0,
            token1: token1,
            fee: fee,
            pool: pool,
            createdAt: block.timestamp,
            isActive: true
        });
        
        tokenPools[token0].push(poolKey);
        tokenPools[token1].push(poolKey);
        
        emit PoolCreated(token0, token1, fee, pool, block.timestamp);
    }
    
    /**
     * @notice Add liquidity to a Uniswap V3 pool
     * @param token0 First token address
     * @param token1 Second token address
     * @param fee Fee tier
     * @param amount0Desired Desired amount of token0
     * @param amount1Desired Desired amount of token1
     * @param amount0Min Minimum amount of token0
     * @param amount1Min Minimum amount of token1
     * @param tickLower Lower tick boundary
     * @param tickUpper Upper tick boundary
     * @return tokenId NFT token ID representing the position
     * @return liquidity Amount of liquidity added
     * @return amount0 Actual amount of token0 added
     * @return amount1 Actual amount of token1 added
     */
    function addLiquidity(
        address token0,
        address token1,
        uint24 fee,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        int24 tickLower,
        int24 tickUpper
    ) external nonReentrant returns (
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    ) {
        // Ensure token0 < token1
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
            (amount0Desired, amount1Desired) = (amount1Desired, amount0Desired);
            (amount0Min, amount1Min) = (amount1Min, amount0Min);
        }
        
        bytes32 poolKey = keccak256(abi.encodePacked(token0, token1, fee));
        if (pools[poolKey].pool == address(0)) revert PoolNotFound();
        
        // Transfer tokens from sender
        IERC20(token0).transferFrom(msg.sender, address(this), amount0Desired);
        IERC20(token1).transferFrom(msg.sender, address(this), amount1Desired);
        
        // Approve position manager
        IERC20(token0).approve(address(positionManager), amount0Desired);
        IERC20(token1).approve(address(positionManager), amount1Desired);
        
        // Mint position
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: amount0Min,
            amount1Min: amount1Min,
            recipient: msg.sender,
            deadline: block.timestamp + 300
        });
        
        (tokenId, liquidity, amount0, amount1) = positionManager.mint(params);
        
        // Refund unused tokens
        if (amount0 < amount0Desired) {
            IERC20(token0).transfer(msg.sender, amount0Desired - amount0);
        }
        if (amount1 < amount1Desired) {
            IERC20(token1).transfer(msg.sender, amount1Desired - amount1);
        }
        
        emit LiquidityAdded(msg.sender, pools[poolKey].pool, tokenId, amount0, amount1, liquidity);
    }
    
    /**
     * @notice Remove liquidity from a position
     * @param tokenId NFT token ID of the position
     * @param liquidity Amount of liquidity to remove
     * @param amount0Min Minimum amount of token0
     * @param amount1Min Minimum amount of token1
     * @return amount0 Amount of token0 received
     * @return amount1 Amount of token1 received
     */
    function removeLiquidity(
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0Min,
        uint256 amount1Min
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        // Verify ownership
        require(positionManager.ownerOf(tokenId) == msg.sender, "Not position owner");
        
        // Decrease liquidity
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = 
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                deadline: block.timestamp + 300
            });
        
        (amount0, amount1) = positionManager.decreaseLiquidity(params);
        
        // Collect tokens
        INonfungiblePositionManager.CollectParams memory collectParams = 
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });
        
        positionManager.collect(collectParams);
        
        emit LiquidityRemoved(msg.sender, tokenId, amount0, amount1);
    }
    
    /**
     * @notice Swap tokens using Uniswap V3
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param fee Fee tier
     * @param amountIn Amount of input tokens
     * @param amountOutMinimum Minimum amount of output tokens (slippage protection)
     * @return amountOut Amount of output tokens received
     */
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        // Transfer tokens from sender
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Execute swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender,
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = swapRouter.exactInputSingle(params);
        
        if (amountOut < amountOutMinimum) revert SlippageExceeded();
        
        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, block.timestamp);
    }
    
    /**
     * @notice Swap tokens using multi-hop path
     * @param path Encoded path (token addresses and fees)
     * @param amountIn Amount of input tokens
     * @param amountOutMinimum Minimum amount of output tokens
     * @return amountOut Amount of output tokens received
     */
    function swapExactInput(
        bytes memory path,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        // Extract first token from path
        address tokenIn;
        assembly {
            tokenIn := mload(add(path, 20))
        }
        
        // Transfer tokens from sender
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Execute swap
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: msg.sender,
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum
        });
        
        amountOut = swapRouter.exactInput(params);
        
        if (amountOut < amountOutMinimum) revert SlippageExceeded();
    }
    
    /**
     * @notice Get TWAP price from Uniswap V3 pool
     * @param token0 First token address
     * @param token1 Second token address
     * @param fee Fee tier
     * @return price Time-weighted average price
     */
    function getTWAPPrice(
        address token0,
        address token1,
        uint24 fee
    ) external view returns (uint256 price) {
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        
        bytes32 poolKey = keccak256(abi.encodePacked(token0, token1, fee));
        address pool = pools[poolKey].pool;
        
        if (pool == address(0)) revert PoolNotFound();
        
        // Get TWAP observation
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapInterval;
        secondsAgos[1] = 0;
        
        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(pool).observe(secondsAgos);
        
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 arithmeticMeanTick = int24(tickCumulativesDelta / int56(uint56(twapInterval)));
        
        // Convert tick to price
        price = _getQuoteAtTick(arithmeticMeanTick, uint128(1e18), token0, token1);
    }
    
    /**
     * @notice Get current spot price from pool
     * @param token0 First token address
     * @param token1 Second token address
     * @param fee Fee tier
     * @return price Current spot price
     */
    function getSpotPrice(
        address token0,
        address token1,
        uint24 fee
    ) external view returns (uint256 price) {
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        
        bytes32 poolKey = keccak256(abi.encodePacked(token0, token1, fee));
        address pool = pools[poolKey].pool;
        
        if (pool == address(0)) revert PoolNotFound();
        
        (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(pool).slot0();
        
        // Calculate price from sqrtPriceX96
        price = _sqrtPriceX96ToPrice(sqrtPriceX96);
    }
    
    /**
     * @notice Get pool information
     * @param token0 First token address
     * @param token1 Second token address
     * @param fee Fee tier
     * @return poolInfo Pool information struct
     */
    function getPoolInfo(
        address token0,
        address token1,
        uint24 fee
    ) external view returns (PoolInfo memory poolInfo) {
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }
        
        bytes32 poolKey = keccak256(abi.encodePacked(token0, token1, fee));
        poolInfo = pools[poolKey];
    }
    
    /**
     * @notice Update TWAP interval
     * @param newInterval New interval in seconds
     */
    function setTWAPInterval(uint32 newInterval) external onlyOwner {
        require(newInterval >= 60 && newInterval <= 86400, "Invalid interval");
        twapInterval = newInterval;
    }
    
    // Internal helper functions
    function _getQuoteAtTick(
        int24 tick,
        uint128 baseAmount,
        address baseToken,
        address quoteToken
    ) internal pure returns (uint256 quoteAmount) {
        uint160 sqrtRatioX96 = _getSqrtRatioAtTick(tick);
        
        if (sqrtRatioX96 <= type(uint128).max) {
            uint256 ratioX192 = uint256(sqrtRatioX96) * sqrtRatioX96;
            quoteAmount = baseToken < quoteToken
                ? (ratioX192 * baseAmount) >> 192
                : (baseAmount << 192) / ratioX192;
        } else {
            uint256 ratioX128 = (uint256(sqrtRatioX96) * sqrtRatioX96) >> 64;
            quoteAmount = baseToken < quoteToken
                ? (ratioX128 * baseAmount) >> 128
                : (baseAmount << 128) / ratioX128;
        }
    }
    
    function _getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= uint256(int256(887272)), "T");
        
        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;
        
        if (tick > 0) ratio = type(uint256).max / ratio;
        
        sqrtPriceX96 = uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
    }
    
    function _sqrtPriceX96ToPrice(uint160 sqrtPriceX96) internal pure returns (uint256 price) {
        uint256 priceX192 = uint256(sqrtPriceX96) * sqrtPriceX96;
        price = priceX192 >> 192;
    }
}

// Uniswap V3 Interfaces
interface IUniswapV3Factory {
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
    function observe(uint32[] calldata secondsAgos) external view returns (
        int56[] memory tickCumulatives,
        uint160[] memory secondsPerLiquidityCumulativeX128s
    );
}

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }
    
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function mint(MintParams calldata params) external payable returns (
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params) external payable returns (
        uint256 amount0,
        uint256 amount1
    );
    
    function collect(CollectParams calldata params) external payable returns (
        uint256 amount0,
        uint256 amount1
    );
    
    function ownerOf(uint256 tokenId) external view returns (address owner);
}
