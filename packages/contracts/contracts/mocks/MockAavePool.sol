// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockAavePool
 * @notice Mock implementation of Aave V3 Pool for testing
 */
contract MockAavePool {
    mapping(address => mapping(address => uint256)) public userBorrows;
    mapping(address => mapping(address => uint256)) public userSupplies;
    
    uint256 public constant INTEREST_RATE = 500; // 5% APY
    
    event Supply(address indexed asset, uint256 amount, address indexed onBehalfOf);
    event Borrow(address indexed asset, uint256 amount, address indexed onBehalfOf);
    event Repay(address indexed asset, uint256 amount, address indexed onBehalfOf);
    event Withdraw(address indexed asset, uint256 amount, address indexed to);
    
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        userSupplies[onBehalfOf][asset] += amount;
        emit Supply(asset, amount, onBehalfOf);
    }
    
    function borrow(
        address asset,
        uint256 amount,
        uint256 /* interestRateMode */,
        uint16 /* referralCode */,
        address onBehalfOf
    ) external {
        require(IERC20(asset).balanceOf(address(this)) >= amount, "Insufficient liquidity");
        
        userBorrows[onBehalfOf][asset] += amount;
        IERC20(asset).transfer(msg.sender, amount);
        
        emit Borrow(asset, amount, onBehalfOf);
    }
    
    function repay(
        address asset,
        uint256 amount,
        uint256 /* interestRateMode */,
        address onBehalfOf
    ) external returns (uint256) {
        uint256 debt = userBorrows[onBehalfOf][asset];
        uint256 repayAmount = amount > debt ? debt : amount;
        
        IERC20(asset).transferFrom(msg.sender, address(this), repayAmount);
        userBorrows[onBehalfOf][asset] -= repayAmount;
        
        emit Repay(asset, repayAmount, onBehalfOf);
        return repayAmount;
    }
    
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        uint256 supplied = userSupplies[msg.sender][asset];
        uint256 withdrawAmount = amount > supplied ? supplied : amount;
        
        userSupplies[msg.sender][asset] -= withdrawAmount;
        IERC20(asset).transfer(to, withdrawAmount);
        
        emit Withdraw(asset, withdrawAmount, to);
        return withdrawAmount;
    }
    
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        // Simplified mock implementation
        totalCollateralBase = 0;
        totalDebtBase = 0;
        availableBorrowsBase = 0;
        currentLiquidationThreshold = 7500;
        ltv = 5000;
        healthFactor = 1e18;
    }
    
    function getBorrowBalance(address user, address asset) external view returns (uint256) {
        return userBorrows[user][asset];
    }
    
    function getSupplyBalance(address user, address asset) external view returns (uint256) {
        return userSupplies[user][asset];
    }
}
