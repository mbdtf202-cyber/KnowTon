// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title KnowTonTimelock
 * @dev Timelock controller for KnowTon governance
 * 
 * Features:
 * - Minimum delay of 48 hours for proposal execution
 * - Multi-sig capability for emergency actions
 * - Proposal queuing and execution
 * - Cancellation mechanism
 */
contract KnowTonTimelock is TimelockController {
    // Minimum delay: 48 hours (172800 seconds)
    uint256 public constant MIN_DELAY = 2 days;
    
    /**
     * @dev Constructor
     * @param proposers List of addresses that can propose
     * @param executors List of addresses that can execute
     * @param admin Admin address (can be zero address for full decentralization)
     */
    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(MIN_DELAY, proposers, executors, admin) {}
}
