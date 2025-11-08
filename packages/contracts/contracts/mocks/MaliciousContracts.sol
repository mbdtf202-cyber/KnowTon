// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title MaliciousNFTReceiver
 * @notice Malicious contract that attempts reentrancy during NFT transfer
 */
contract MaliciousNFTReceiver is IERC721Receiver {
    address public targetContract;
    uint256 public attackCount;
    bool public attacking;
    
    constructor(address _target) {
        targetContract = _target;
        attackCount = 0;
        attacking = false;
    }
    
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public override returns (bytes4) {
        // Attempt reentrancy attack
        if (!attacking && attackCount < 3) {
            attacking = true;
            attackCount++;
            
            // Try to call back into the contract
            // This should fail due to ReentrancyGuard
            try this.attemptReentry() {
                // Attack succeeded (bad!)
            } catch {
                // Attack failed (good!)
            }
            
            attacking = false;
        }
        
        return this.onERC721Received.selector;
    }
    
    function attemptReentry() external {
        // Placeholder for reentrancy attempt
        // In real attack, would call back to target contract
    }
}

/**
 * @title MaliciousPaymentReceiver
 * @notice Malicious contract that attempts reentrancy during payment
 */
contract MaliciousPaymentReceiver {
    address public targetContract;
    uint256 public attackCount;
    bool public attacking;
    
    constructor(address _target) {
        targetContract = _target;
        attackCount = 0;
        attacking = false;
    }
    
    receive() external payable {
        // Attempt reentrancy when receiving payment
        if (!attacking && attackCount < 3) {
            attacking = true;
            attackCount++;
            
            // Try to withdraw again (reentrancy attack)
            try this.attemptReentry() {
                // Attack succeeded (bad!)
            } catch {
                // Attack failed (good!)
            }
            
            attacking = false;
        }
    }
    
    function attemptReentry() external {
        // Placeholder for reentrancy attempt
    }
}

/**
 * @title MaliciousInvestor
 * @notice Malicious contract that attempts reentrancy during investment
 */
contract MaliciousInvestor {
    address public targetContract;
    uint256 public attackCount;
    bool public attacking;
    
    constructor(address _target) {
        targetContract = _target;
        attackCount = 0;
        attacking = false;
    }
    
    function attack(string memory bondId, uint8 tranche, uint256 amount) external payable {
        // Attempt to invest with reentrancy
        attacking = true;
        
        // Call invest function
        (bool success, ) = targetContract.call{value: amount}(
            abi.encodeWithSignature("invest(string,uint8)", bondId, tranche)
        );
        
        require(success, "Investment failed");
        attacking = false;
    }
    
    receive() external payable {
        // Attempt reentrancy when receiving payment
        if (attacking && attackCount < 3) {
            attackCount++;
            
            // Try to invest again
            try this.attemptReentry() {
                // Attack succeeded (bad!)
            } catch {
                // Attack failed (good!)
            }
        }
    }
    
    function attemptReentry() external {
        // Placeholder
    }
}

/**
 * @title IntegerOverflowTester
 * @notice Contract to test integer overflow protection
 */
contract IntegerOverflowTester {
    function testAdditionOverflow(uint256 a, uint256 b) external pure returns (uint256) {
        // Should revert on overflow in Solidity 0.8+
        return a + b;
    }
    
    function testSubtractionUnderflow(uint256 a, uint256 b) external pure returns (uint256) {
        // Should revert on underflow in Solidity 0.8+
        return a - b;
    }
    
    function testMultiplicationOverflow(uint256 a, uint256 b) external pure returns (uint256) {
        // Should revert on overflow in Solidity 0.8+
        return a * b;
    }
    
    function testUncheckedAddition(uint256 a, uint256 b) external pure returns (uint256) {
        unchecked {
            return a + b;
        }
    }
}

/**
 * @title AccessControlTester
 * @notice Contract to test access control mechanisms
 */
contract AccessControlTester {
    address public owner;
    mapping(address => bool) public authorized;
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorized[msg.sender], "Not authorized");
        _;
    }
    
    function authorizeUser(address user) external onlyOwner {
        authorized[user] = true;
    }
    
    function revokeUser(address user) external onlyOwner {
        authorized[user] = false;
    }
    
    function protectedFunction() external onlyAuthorized returns (bool) {
        return true;
    }
    
    function ownerFunction() external onlyOwner returns (bool) {
        return true;
    }
}
