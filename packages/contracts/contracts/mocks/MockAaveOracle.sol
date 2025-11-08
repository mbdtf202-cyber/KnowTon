// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockAaveOracle
 * @notice Mock implementation of Aave V3 Oracle for testing
 */
contract MockAaveOracle {
    mapping(address => uint256) public assetPrices;
    
    event AssetPriceUpdated(address indexed asset, uint256 price);
    
    function setAssetPrice(address asset, uint256 price) external {
        assetPrices[asset] = price;
        emit AssetPriceUpdated(asset, price);
    }
    
    function getAssetPrice(address asset) external view returns (uint256) {
        uint256 price = assetPrices[asset];
        require(price > 0, "Price not set");
        return price;
    }
    
    function getAssetsPrices(address[] calldata assets) external view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            prices[i] = assetPrices[assets[i]];
        }
        return prices;
    }
}
