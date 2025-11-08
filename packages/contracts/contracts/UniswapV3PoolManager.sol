// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title UniswapV3PoolManager
 * @dev Manages Uniswap V3 liquidity pools for fractional tokens
 * @notice Creates and manages liquidity pools for fractionalized NFTs
 */
contract UniswapV3PoolManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Uniswap V3 interfaces
    IUniswapV3Factory public immutable factory;
    INonfungiblePositionManager public immutable positionManager;
    ISwapRouter public immutable swapRouter;
    
    // Chainlink price oracle
    address public priceOracle;
    
    // WETH address for pairing
    address public immutable WETH;
    
    // Pool configuration
    struct PoolConfig {
        address token0;
        address token1;
        uint24 fee;
        address pool;
        uint256 vaultId;
        bool isActive;
    }
    
    // Liquidity position
    struct LiquidityPosition {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0;
        uint256 amount1;
        address owner;
    }
    
    // Mappings
    mapping(uint256 => PoolConfig) public vaultPools; // vaultId => PoolConfig
    mapping(address => uint256) public poolToVault; // pool => vaultId
    mapping(uint256 => LiquidityPosition) public positions; // positionId => LiquidityPosition
    mapping(uint256 => uint256[]) public vaultPositions; // vaultId => positionIds
    
    // Constants
    uint24 public constant DEFAULT_FEE = 3000; // 0.3%
    uint160 public constant MIN_SQRT_RATIO = 4295128739;
    uint160 public constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;
    
    // Events
    event PoolCreated(
        uint256 indexed vaultId,
        address indexed fractionalToken,
        address indexed pool,
        uint24 fee
    );
    
    event LiquidityAdded(
        uint256 indexed vaultId,
        uint256 indexed positionId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    event LiquidityRemoved(
        uint256 indexed vaultId,
        uint256 indexed positionId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    event TokensSwapped(
        uint256 indexed vaultId,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );
    
    event PriceOracleUpdated(address indexed newOracle);
    
    // Errors
    error PoolAlreadyExists();
    error PoolNotFound();
    error InvalidToken();
    error InvalidFee();
    error InsufficientLiquidity();
    error SlippageExceeded();
    error InvalidPosition();
    error Unauthorized();
    
    constructor(
        address _factory,
        address _positionManager,
        address _swapRouter,
        address _weth,
        address _priceOracle
    ) {
        require(_factory != address(0), "Invalid factory");
        require(_positionManager != address(0), "Invalid position manager");
        require(_swapRouter != address(0), "Invalid swap router");
        require(_weth != address(0), "Invalid WETH");
        
        factory = IUniswapV3Factory(_factory);
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
        WETH = _weth;
        priceOracle = _priceOracle;
    }
    
    /**
     * @dev Create a Uniswap V3 pool for a fractional token
     * @param vaultId Vault ID
     * @param fractionalToken Fractional token address
     * @param fee Pool fee tier (500, 3000, or 10000)
     * @param initialPrice Initial price (sqrtPriceX96)
     */
    function createPool(
        uint256 vaultId,
        address fractionalToken,
        uint24 fee,
        uint160 initialPrice
    ) external onlyOwner returns (address pool) {
        if (vaultPools[vaultId].pool != address(0)) revert PoolAlreadyExists();
        if (fractionalToken == address(0)) revert InvalidToken();
        if (fee != 500 && fee != 3000 && fee != 10000) revert InvalidFee();
        
        // Determine token order
        (address token0, address token1) = fractionalToken < WETH
            ? (fractionalToken, WETH)
            : (WETH, fractionalToken);
        
        // Create pool
        pool = factory.createPool(token0, token1, fee);
        
        // Initialize pool with price
        IUniswapV3Pool(pool).initialize(initialPrice);
        
        // Store pool config
        vaultPools[vaultId] = PoolConfig({
            token0: token0,
            token1: token1,
            fee: fee,
            pool: pool,
            vaultId: vaultId,
            isActive: true
        });
        
        poolToVault[pool] = vaultId;
        
        emit PoolCreated(vaultId, fractionalToken, pool, fee);
    }
    
    /**
     * @dev Add liquidity to a pool
     * @param vaultId Vault ID
     * @param amount0Desired Amount of token0 desired
     * @param amount1Desired Amount of token1 desired
     * @param amount0Min Minimum amount of token0
     * @param amount1Min Minimum amount of token1
     * @param tickLower Lower tick
     * @param tickUpper Upper tick
     */
    function addLiquidity(
        uint256 vaultId,
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
        PoolConfig storage config = vaultPools[vaultId];
        if (config.pool == address(0)) revert PoolNotFound();
        
        // Transfer tokens from sender
        IERC20(config.token0).safeTransferFrom(msg.sender, address(this), amount0Desired);
        IERC20(config.token1).safeTransferFrom(msg.sender, address(this), amount1Desired);
        
        // Approve position manager
        IERC20(config.token0).safeApprove(address(positionManager), amount0Desired);
        IERC20(config.token1).safeApprove(address(positionManager), amount1Desired);
        
        // Mint position
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: config.token0,
            token1: config.token1,
            fee: config.fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: amount0Min,
            amount1Min: amount1Min,
            recipient: address(this),
            deadline: block.timestamp
        });
        
        (tokenId, liquidity, amount0, amount1) = positionManager.mint(params);
        
        // Store position
        positions[tokenId] = LiquidityPosition({
            tokenId: tokenId,
            liquidity: liquidity,
            amount0: amount0,
            amount1: amount1,
            owner: msg.sender
        });
        
        vaultPositions[vaultId].push(tokenId);
        
        // Refund unused tokens
        if (amount0Desired > amount0) {
            IERC20(config.token0).safeTransfer(msg.sender, amount0Desired - amount0);
        }
        if (amount1Desired > amount1) {
            IERC20(config.token1).safeTransfer(msg.sender, amount1Desired - amount1);
        }
        
        emit LiquidityAdded(vaultId, tokenId, liquidity, amount0, amount1);
    }
    
    /**
     * @dev Remove liquidity from a position
     * @param tokenId Position token ID
     * @param liquidity Amount of liquidity to remove
     * @param amount0Min Minimum amount of token0
     * @param amount1Min Minimum amount of token1
     */
    function removeLiquidity(
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0Min,
        uint256 amount1Min
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        LiquidityPosition storage position = positions[tokenId];
        if (position.owner != msg.sender) revert Unauthorized();
        if (liquidity > position.liquidity) revert InsufficientLiquidity();
        
        // Decrease liquidity
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = 
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                deadline: block.timestamp
            });
        
        (amount0, amount1) = positionManager.decreaseLiquidity(params);
        
        // Collect tokens
        INonfungiblePositionManager.CollectParams memory collectParams = 
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: uint128(amount0),
                amount1Max: uint128(amount1)
            });
        
        positionManager.collect(collectParams);
        
        // Update position
        position.liquidity -= liquidity;
        position.amount0 -= amount0;
        position.amount1 -= amount1;
        
        uint256 vaultId = poolToVault[vaultPools[position.tokenId].pool];
        
        emit LiquidityRemoved(vaultId, tokenId, liquidity, amount0, amount1);
    }
    
    /**
     * @dev Swap tokens with slippage protection
     * @param vaultId Vault ID
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input tokens
     * @param amountOutMinimum Minimum amount of output tokens (slippage protection)
     * @param recipient Recipient address
     */
    function swapTokens(
        uint256 vaultId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient
    ) external nonReentrant returns (uint256 amountOut) {
        PoolConfig storage config = vaultPools[vaultId];
        if (config.pool == address(0)) revert PoolNotFound();
        
        // Transfer tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Approve swap router
        IERC20(tokenIn).safeApprove(address(swapRouter), amountIn);
        
        // Execute swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: config.fee,
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });
        
        amountOut = swapRouter.exactInputSingle(params);
        
        if (amountOut < amountOutMinimum) revert SlippageExceeded();
        
        emit TokensSwapped(vaultId, tokenIn, tokenOut, amountIn, amountOut, recipient);
    }
    
    /**
     * @dev Get pool price from Chainlink oracle
     * @param vaultId Vault ID
     * @return price Current price (18 decimals)
     */
    function getOraclePrice(uint256 vaultId) external view returns (uint256 price) {
        PoolConfig storage config = vaultPools[vaultId];
        if (config.pool == address(0)) revert PoolNotFound();
        
        if (priceOracle != address(0)) {
            // Get price from Chainlink oracle
            (int256 oraclePrice, ) = IChainlinkOracle(priceOracle).getLatestPrice(config.token0);
            price = uint256(oraclePrice);
        } else {
            // Fallback to pool price
            price = _getPoolPrice(config.pool);
        }
    }
    
    /**
     * @dev Get current pool price
     * @param pool Pool address
     * @return price Current price
     */
    function _getPoolPrice(address pool) internal view returns (uint256 price) {
        (uint160 sqrtPriceX96, , , , , , ) = IUniswapV3Pool(pool).slot0();
        
        // Convert sqrtPriceX96 to price
        uint256 priceX96 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        price = (priceX96 * 1e18) >> 192;
    }
    
    /**
     * @dev Calculate amount out for a swap with slippage
     * @param vaultId Vault ID
     * @param tokenIn Input token
     * @param amountIn Amount in
     * @param slippageBps Slippage in basis points (e.g., 50 = 0.5%)
     * @return amountOutMinimum Minimum amount out
     */
    function calculateAmountOutMinimum(
        uint256 vaultId,
        address tokenIn,
        uint256 amountIn,
        uint256 slippageBps
    ) external view returns (uint256 amountOutMinimum) {
        PoolConfig storage config = vaultPools[vaultId];
        if (config.pool == address(0)) revert PoolNotFound();
        
        uint256 price = _getPoolPrice(config.pool);
        uint256 amountOut;
        
        if (tokenIn == config.token0) {
            amountOut = (amountIn * price) / 1e18;
        } else {
            amountOut = (amountIn * 1e18) / price;
        }
        
        // Apply slippage
        amountOutMinimum = (amountOut * (10000 - slippageBps)) / 10000;
    }
    
    /**
     * @dev Update price oracle
     * @param newOracle New oracle address
     */
    function updatePriceOracle(address newOracle) external onlyOwner {
        priceOracle = newOracle;
        emit PriceOracleUpdated(newOracle);
    }
    
    /**
     * @dev Get pool info
     * @param vaultId Vault ID
     */
    function getPoolInfo(uint256 vaultId) external view returns (
        address token0,
        address token1,
        uint24 fee,
        address pool,
        bool isActive,
        uint256 price
    ) {
        PoolConfig storage config = vaultPools[vaultId];
        return (
            config.token0,
            config.token1,
            config.fee,
            config.pool,
            config.isActive,
            _getPoolPrice(config.pool)
        );
    }
    
    /**
     * @dev Get position info
     * @param tokenId Position token ID
     */
    function getPositionInfo(uint256 tokenId) external view returns (
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1,
        address owner
    ) {
        LiquidityPosition storage position = positions[tokenId];
        return (
            position.liquidity,
            position.amount0,
            position.amount1,
            position.owner
        );
    }
    
    /**
     * @dev Get all positions for a vault
     * @param vaultId Vault ID
     */
    function getVaultPositions(uint256 vaultId) external view returns (uint256[] memory) {
        return vaultPositions[vaultId];
    }
}

// Uniswap V3 Interfaces
interface IUniswapV3Factory {
    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool);
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
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IChainlinkOracle {
    function getLatestPrice(address token) external view returns (int256 price, uint8 decimals);
}
