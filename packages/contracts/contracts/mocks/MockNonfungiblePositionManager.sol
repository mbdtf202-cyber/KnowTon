// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockNonfungiblePositionManager is ERC721 {
    uint256 private _nextTokenId = 1;
    
    struct Position {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }
    
    mapping(uint256 => Position) public positions;
    
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
    
    event IncreaseLiquidity(
        uint256 indexed tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    event DecreaseLiquidity(
        uint256 indexed tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    constructor() ERC721("Uniswap V3 Positions NFT", "UNI-V3-POS") {}
    
    function mint(MintParams calldata params)
        external
        payable
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        require(block.timestamp <= params.deadline, "Transaction too old");
        require(params.amount0Desired > 0 || params.amount1Desired > 0, "Invalid amounts");
        
        tokenId = _nextTokenId++;
        
        // Transfer tokens from sender
        if (params.amount0Desired > 0) {
            IERC20(params.token0).transferFrom(msg.sender, address(this), params.amount0Desired);
        }
        if (params.amount1Desired > 0) {
            IERC20(params.token1).transferFrom(msg.sender, address(this), params.amount1Desired);
        }
        
        // Calculate liquidity (simplified)
        liquidity = uint128((params.amount0Desired + params.amount1Desired) / 2);
        amount0 = params.amount0Desired;
        amount1 = params.amount1Desired;
        
        require(amount0 >= params.amount0Min, "Insufficient amount0");
        require(amount1 >= params.amount1Min, "Insufficient amount1");
        
        // Store position
        positions[tokenId] = Position({
            token0: params.token0,
            token1: params.token1,
            fee: params.fee,
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            liquidity: liquidity
        });
        
        // Mint NFT to recipient
        _mint(params.recipient, tokenId);
        
        emit IncreaseLiquidity(tokenId, liquidity, amount0, amount1);
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1)
    {
        require(block.timestamp <= params.deadline, "Transaction too old");
        require(_ownerOf(params.tokenId) != address(0), "Invalid token ID");
        require(positions[params.tokenId].liquidity >= params.liquidity, "Insufficient liquidity");
        
        // Calculate amounts (simplified)
        amount0 = uint256(params.liquidity) / 2;
        amount1 = uint256(params.liquidity) / 2;
        
        require(amount0 >= params.amount0Min, "Insufficient amount0");
        require(amount1 >= params.amount1Min, "Insufficient amount1");
        
        // Update position
        positions[params.tokenId].liquidity -= params.liquidity;
        
        emit DecreaseLiquidity(params.tokenId, params.liquidity, amount0, amount1);
    }
    
    function collect(CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1)
    {
        require(_ownerOf(params.tokenId) != address(0), "Invalid token ID");
        
        Position memory position = positions[params.tokenId];
        
        // Calculate collectible amounts (simplified)
        amount0 = uint256(uint128(params.amount0Max)) < position.liquidity / 2 
            ? uint256(uint128(params.amount0Max)) 
            : position.liquidity / 2;
        amount1 = uint256(uint128(params.amount1Max)) < position.liquidity / 2 
            ? uint256(uint128(params.amount1Max)) 
            : position.liquidity / 2;
        
        // Transfer tokens to recipient
        if (amount0 > 0) {
            IERC20(position.token0).transfer(params.recipient, amount0);
        }
        if (amount1 > 0) {
            IERC20(position.token1).transfer(params.recipient, amount1);
        }
    }
    
    function getPosition(uint256 tokenId) external view returns (Position memory) {
        return positions[tokenId];
    }
}
