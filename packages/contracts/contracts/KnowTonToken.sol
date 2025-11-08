// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KnowTonToken
 * @dev Governance token for KnowTon platform with voting capabilities
 * 
 * Features:
 * - ERC20 standard token
 * - Voting power delegation
 * - Snapshot mechanism for voting
 * - Permit for gasless approvals
 * - Burnable tokens
 */
contract KnowTonToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable {
    // Maximum supply: 100 million tokens
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    
    // Total minted supply
    uint256 public totalMinted;
    
    /**
     * @dev Constructor
     * @param initialSupply Initial supply to mint to deployer
     */
    constructor(uint256 initialSupply)
        ERC20("KnowTon Governance Token", "KNOW")
        ERC20Permit("KnowTon Governance Token")
    {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        _mint(msg.sender, initialSupply);
        totalMinted = initialSupply;
    }
    
    /**
     * @dev Mint new tokens (only owner, respects max supply)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalMinted + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        totalMinted += amount;
    }
    
    /**
     * @dev Batch mint to multiple addresses
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalMinted + totalAmount <= MAX_SUPPLY, "Exceeds max supply");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
        
        totalMinted += totalAmount;
    }
    
    // Required overrides
    
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }
    
    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }
    
    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}
