// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockUniswapV3Factory {
    mapping(address => mapping(address => mapping(uint24 => address))) public pools;
    
    event PoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 indexed fee,
        int24 tickSpacing,
        address pool
    );
    
    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool) {
        require(tokenA != tokenB, "Identical addresses");
        
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Zero address");
        require(pools[token0][token1][fee] == address(0), "Pool exists");
        
        // Deploy mock pool
        pool = address(new MockUniswapV3Pool(token0, token1, fee));
        pools[token0][token1][fee] = pool;
        
        emit PoolCreated(token0, token1, fee, 60, pool);
    }
    
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        pool = pools[token0][token1][fee];
    }
}

contract MockUniswapV3Pool {
    address public immutable token0;
    address public immutable token1;
    uint24 public immutable fee;
    
    uint160 public sqrtPriceX96;
    int24 public tick;
    uint16 public observationIndex;
    uint16 public observationCardinality;
    uint16 public observationCardinalityNext;
    uint8 public feeProtocol;
    bool public unlocked = true;
    
    // Mock observations for TWAP
    struct Observation {
        uint32 blockTimestamp;
        int56 tickCumulative;
        uint160 secondsPerLiquidityCumulativeX128;
        bool initialized;
    }
    
    Observation[] public observations;
    
    constructor(address _token0, address _token1, uint24 _fee) {
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
        
        // Initialize with default observation
        observations.push(Observation({
            blockTimestamp: uint32(block.timestamp),
            tickCumulative: 0,
            secondsPerLiquidityCumulativeX128: 0,
            initialized: true
        }));
        
        observationCardinality = 1;
        observationCardinalityNext = 1;
    }
    
    function initialize(uint160 _sqrtPriceX96) external {
        require(sqrtPriceX96 == 0, "Already initialized");
        sqrtPriceX96 = _sqrtPriceX96;
        
        // Calculate tick from price
        tick = _getTickAtSqrtRatio(_sqrtPriceX96);
    }
    
    function slot0() external view returns (
        uint160 _sqrtPriceX96,
        int24 _tick,
        uint16 _observationIndex,
        uint16 _observationCardinality,
        uint16 _observationCardinalityNext,
        uint8 _feeProtocol,
        bool _unlocked
    ) {
        return (
            sqrtPriceX96,
            tick,
            observationIndex,
            observationCardinality,
            observationCardinalityNext,
            feeProtocol,
            unlocked
        );
    }
    
    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (
            int56[] memory tickCumulatives,
            uint160[] memory secondsPerLiquidityCumulativeX128s
        )
    {
        tickCumulatives = new int56[](secondsAgos.length);
        secondsPerLiquidityCumulativeX128s = new uint160[](secondsAgos.length);
        
        for (uint256 i = 0; i < secondsAgos.length; i++) {
            uint32 targetTime = uint32(block.timestamp) - secondsAgos[i];
            
            // Simple mock: return cumulative based on current tick
            tickCumulatives[i] = int56(tick) * int56(uint56(targetTime));
            secondsPerLiquidityCumulativeX128s[i] = 0;
        }
    }
    
    // Helper function to calculate tick from sqrtPriceX96
    function _getTickAtSqrtRatio(uint160 _sqrtPriceX96) internal pure returns (int24) {
        // Simplified calculation for testing
        // In production, this would use the full Uniswap V3 math
        if (_sqrtPriceX96 == 79228162514264337593543950336) return 0; // Price = 1
        if (_sqrtPriceX96 > 79228162514264337593543950336) return 1000; // Price > 1
        return -1000; // Price < 1
    }
    
    // Mock function to update price (for testing)
    function setPrice(uint160 _sqrtPriceX96) external {
        sqrtPriceX96 = _sqrtPriceX96;
        tick = _getTickAtSqrtRatio(_sqrtPriceX96);
    }
}
