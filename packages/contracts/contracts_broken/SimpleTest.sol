// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title SimpleTest
 * @dev 简单的测试合约，用于验证基本功能
 */
contract SimpleTest is Initializable, AccessControlUpgradeable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    string public name;
    uint256 public value;
    
    event ValueSet(uint256 newValue);
    
    function initialize(string memory _name) public initializer {
        __AccessControl_init();
        name = _name;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    function setValue(uint256 _value) external onlyRole(ADMIN_ROLE) {
        value = _value;
        emit ValueSet(_value);
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
}