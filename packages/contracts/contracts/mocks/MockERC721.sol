// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title MockERC721
 * @notice Simple ERC721 implementation for testing
 */
contract MockERC721 is ERC721 {
    uint256 private _tokenIdCounter;
    
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        _tokenIdCounter = 1;
    }
    
    function mint(address to) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        return tokenId;
    }
    
    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }
}
