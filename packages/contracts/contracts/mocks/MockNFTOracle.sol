// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockNFTOracle
 * @notice Mock implementation of NFT Oracle for testing
 */
contract MockNFTOracle {
    mapping(address => mapping(uint256 => uint256)) public nftValuations;
    uint256 public defaultValuation;
    
    event ValuationUpdated(address indexed nftContract, uint256 indexed tokenId, uint256 valuation);
    
    constructor(uint256 _defaultValuation) {
        defaultValuation = _defaultValuation;
    }
    
    function setValuation(address nftContract, uint256 tokenId, uint256 valuation) external {
        nftValuations[nftContract][tokenId] = valuation;
        emit ValuationUpdated(nftContract, tokenId, valuation);
    }
    
    function setDefaultValuation(uint256 valuation) external {
        defaultValuation = valuation;
    }
    
    function getValuation(address nftContract, uint256 tokenId) external view returns (uint256) {
        uint256 valuation = nftValuations[nftContract][tokenId];
        return valuation > 0 ? valuation : defaultValuation;
    }
}
