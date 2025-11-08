// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockSwapRouter {
    // Mock exchange rate: 1:1 for simplicity, can be adjusted
    uint256 public exchangeRate = 1e18; // 1:1
    uint256 public slippageTolerance = 50; // 0.5% in basis points
    
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
    
    event Swap(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    );
    
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        require(block.timestamp <= params.deadline, "Transaction too old");
        require(params.amountIn > 0, "Invalid amount");
        
        // Transfer tokens from sender
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        
        // Calculate output amount (with mock slippage)
        amountOut = (params.amountIn * exchangeRate) / 1e18;
        uint256 slippage = (amountOut * slippageTolerance) / 10000;
        amountOut = amountOut - slippage;
        
        require(amountOut >= params.amountOutMinimum, "Insufficient output amount");
        
        // Transfer output tokens to recipient
        IERC20(params.tokenOut).transfer(params.recipient, amountOut);
        
        emit Swap(params.tokenIn, params.tokenOut, params.amountIn, amountOut, params.recipient);
    }
    
    function exactInput(ExactInputParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        require(block.timestamp <= params.deadline, "Transaction too old");
        require(params.amountIn > 0, "Invalid amount");
        
        // Decode path to get tokenIn and tokenOut
        (address tokenIn, address tokenOut) = _decodePath(params.path);
        
        // Transfer tokens from sender
        IERC20(tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        
        // Calculate output amount (with mock slippage)
        amountOut = (params.amountIn * exchangeRate) / 1e18;
        uint256 slippage = (amountOut * slippageTolerance) / 10000;
        amountOut = amountOut - slippage;
        
        require(amountOut >= params.amountOutMinimum, "Insufficient output amount");
        
        // Transfer output tokens to recipient
        IERC20(tokenOut).transfer(params.recipient, amountOut);
        
        emit Swap(tokenIn, tokenOut, params.amountIn, amountOut, params.recipient);
    }
    
    // Helper function to decode path
    function _decodePath(bytes memory path) internal pure returns (address tokenIn, address tokenOut) {
        require(path.length >= 43, "Invalid path"); // 20 + 3 + 20 bytes minimum
        
        assembly {
            tokenIn := mload(add(path, 20))
            tokenOut := mload(add(path, 43))
        }
    }
    
    // Admin functions for testing
    function setExchangeRate(uint256 _rate) external {
        exchangeRate = _rate;
    }
    
    function setSlippageTolerance(uint256 _tolerance) external {
        slippageTolerance = _tolerance;
    }
    
    // Fund the router with tokens for testing
    function fundRouter(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
}
