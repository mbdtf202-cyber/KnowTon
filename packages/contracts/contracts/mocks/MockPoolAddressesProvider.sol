// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockPoolAddressesProvider
 * @notice Mock implementation of Aave V3 PoolAddressesProvider for testing
 */
contract MockPoolAddressesProvider {
    address public pool;
    address public priceOracle;
    
    constructor(address _pool, address _priceOracle) {
        pool = _pool;
        priceOracle = _priceOracle;
    }
    
    function getPool() external view returns (address) {
        return pool;
    }
    
    function getPriceOracle() external view returns (address) {
        return priceOracle;
    }
    
    function setPool(address _pool) external {
        pool = _pool;
    }
    
    function setPriceOracle(address _priceOracle) external {
        priceOracle = _priceOracle;
    }
}
