// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title EnterpriseLicensing
 * @dev Smart contract for managing enterprise content licenses on-chain
 * @notice This contract handles license issuance, verification, and renewal for enterprise customers
 */
contract EnterpriseLicensing is Ownable, ReentrancyGuard, Pausable {
    struct License {
        uint256 contentId;
        address enterprise;
        uint256 seats;
        uint256 usedSeats;
        uint256 pricePerSeat;
        uint256 expiresAt;
        bool isActive;
        uint256 createdAt;
    }

    // Mapping from licenseId to License
    mapping(bytes32 => License) public licenses;
    
    // Mapping from enterprise address to their license IDs
    mapping(address => bytes32[]) public enterpriseLicenses;
    
    // Mapping from licenseId to seat assignments (licenseId => userAddress => isAssigned)
    mapping(bytes32 => mapping(address => bool)) public seatAssignments;
    
    // Mapping from licenseId to usage tracking (licenseId => userAddress => lastAccessTime)
    mapping(bytes32 => mapping(address => uint256)) public seatUsage;

    // Events
    event LicenseIssued(
        bytes32 indexed licenseId,
        address indexed enterprise,
        uint256 contentId,
        uint256 seats,
        uint256 expiresAt,
        uint256 totalCost
    );

    event LicenseRenewed(
        bytes32 indexed licenseId,
        uint256 newExpiresAt,
        uint256 renewalCost
    );

    event LicenseSuspended(bytes32 indexed licenseId);
    
    event LicenseReactivated(bytes32 indexed licenseId);

    event SeatAssigned(
        bytes32 indexed licenseId,
        address indexed user,
        uint256 timestamp
    );

    event SeatRevoked(
        bytes32 indexed licenseId,
        address indexed user,
        uint256 timestamp
    );

    event SeatUsageTracked(
        bytes32 indexed licenseId,
        address indexed user,
        uint256 timestamp
    );

    event SeatsIncreased(
        bytes32 indexed licenseId,
        uint256 oldSeats,
        uint256 newSeats,
        uint256 additionalCost
    );

    /**
     * @dev Issue a new enterprise license
     * @param _contentId The ID of the content being licensed
     * @param _enterprise The address of the enterprise purchasing the license
     * @param _seats Number of seats (users) allowed
     * @param _duration Duration of the license in seconds
     * @return licenseId The unique identifier for the license
     */
    function issueLicense(
        uint256 _contentId,
        address _enterprise,
        uint256 _seats,
        uint256 _duration
    ) external payable nonReentrant whenNotPaused returns (bytes32) {
        require(_enterprise != address(0), "Invalid enterprise address");
        require(_seats > 0, "Seats must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");

        // Generate unique license ID
        bytes32 licenseId = keccak256(
            abi.encodePacked(
                _contentId,
                _enterprise,
                block.timestamp,
                block.number
            )
        );

        require(licenses[licenseId].enterprise == address(0), "License already exists");

        // Calculate price per seat (simplified - in production, this would come from oracle)
        uint256 pricePerSeat = msg.value / _seats;
        require(msg.value >= _seats * pricePerSeat, "Insufficient payment");

        uint256 expiresAt = block.timestamp + _duration;

        // Create license
        licenses[licenseId] = License({
            contentId: _contentId,
            enterprise: _enterprise,
            seats: _seats,
            usedSeats: 0,
            pricePerSeat: pricePerSeat,
            expiresAt: expiresAt,
            isActive: true,
            createdAt: block.timestamp
        });

        // Add to enterprise's licenses
        enterpriseLicenses[_enterprise].push(licenseId);

        emit LicenseIssued(
            licenseId,
            _enterprise,
            _contentId,
            _seats,
            expiresAt,
            msg.value
        );

        return licenseId;
    }

    /**
     * @dev Verify if a license is valid
     * @param _licenseId The license ID to verify
     * @return isValid Whether the license is valid and active
     */
    function verifyLicense(bytes32 _licenseId) external view returns (bool) {
        License memory license = licenses[_licenseId];
        
        return (
            license.enterprise != address(0) &&
            license.isActive &&
            block.timestamp < license.expiresAt
        );
    }

    /**
     * @dev Renew an existing license
     * @param _licenseId The license ID to renew
     * @param _duration Additional duration in seconds
     */
    function renewLicense(bytes32 _licenseId, uint256 _duration)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        License storage license = licenses[_licenseId];
        require(license.enterprise != address(0), "License does not exist");
        require(license.isActive, "License is not active");
        require(_duration > 0, "Duration must be greater than 0");

        // Calculate renewal cost
        uint256 renewalCost = license.seats * license.pricePerSeat;
        require(msg.value >= renewalCost, "Insufficient payment for renewal");

        // Extend expiration
        if (block.timestamp > license.expiresAt) {
            // License expired, start from now
            license.expiresAt = block.timestamp + _duration;
        } else {
            // License still valid, extend from current expiration
            license.expiresAt += _duration;
        }

        emit LicenseRenewed(_licenseId, license.expiresAt, msg.value);
    }

    /**
     * @dev Assign a seat to a user
     * @param _licenseId The license ID
     * @param _user The user address to assign the seat to
     */
    function assignSeat(bytes32 _licenseId, address _user)
        external
        nonReentrant
        whenNotPaused
    {
        License storage license = licenses[_licenseId];
        require(license.enterprise != address(0), "License does not exist");
        require(license.isActive, "License is not active");
        require(block.timestamp < license.expiresAt, "License has expired");
        require(msg.sender == license.enterprise || msg.sender == owner(), "Not authorized");
        require(_user != address(0), "Invalid user address");
        require(!seatAssignments[_licenseId][_user], "Seat already assigned to user");
        require(license.usedSeats < license.seats, "No available seats");

        // Assign seat
        seatAssignments[_licenseId][_user] = true;
        license.usedSeats++;

        emit SeatAssigned(_licenseId, _user, block.timestamp);
    }

    /**
     * @dev Revoke a seat from a user
     * @param _licenseId The license ID
     * @param _user The user address to revoke the seat from
     */
    function revokeSeat(bytes32 _licenseId, address _user)
        external
        nonReentrant
        whenNotPaused
    {
        License storage license = licenses[_licenseId];
        require(license.enterprise != address(0), "License does not exist");
        require(msg.sender == license.enterprise || msg.sender == owner(), "Not authorized");
        require(seatAssignments[_licenseId][_user], "Seat not assigned to user");

        // Revoke seat
        seatAssignments[_licenseId][_user] = false;
        license.usedSeats--;

        emit SeatRevoked(_licenseId, _user, block.timestamp);
    }

    /**
     * @dev Track seat usage
     * @param _licenseId The license ID
     * @param _user The user accessing the content
     */
    function trackUsage(bytes32 _licenseId, address _user)
        external
        whenNotPaused
    {
        License memory license = licenses[_licenseId];
        require(license.enterprise != address(0), "License does not exist");
        require(license.isActive, "License is not active");
        require(block.timestamp < license.expiresAt, "License has expired");
        require(seatAssignments[_licenseId][_user], "User does not have assigned seat");

        // Track usage
        seatUsage[_licenseId][_user] = block.timestamp;

        emit SeatUsageTracked(_licenseId, _user, block.timestamp);
    }

    /**
     * @dev Increase the number of seats for a license
     * @param _licenseId The license ID
     * @param _additionalSeats Number of additional seats to add
     */
    function increaseSeats(bytes32 _licenseId, uint256 _additionalSeats)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        License storage license = licenses[_licenseId];
        require(license.enterprise != address(0), "License does not exist");
        require(license.isActive, "License is not active");
        require(msg.sender == license.enterprise, "Not authorized");
        require(_additionalSeats > 0, "Additional seats must be greater than 0");

        // Calculate cost for additional seats
        uint256 additionalCost = _additionalSeats * license.pricePerSeat;
        require(msg.value >= additionalCost, "Insufficient payment");

        uint256 oldSeats = license.seats;
        license.seats += _additionalSeats;

        emit SeatsIncreased(_licenseId, oldSeats, license.seats, msg.value);
    }

    /**
     * @dev Suspend a license (admin only)
     * @param _licenseId The license ID to suspend
     */
    function suspendLicense(bytes32 _licenseId) external onlyOwner {
        License storage license = licenses[_licenseId];
        require(license.enterprise != address(0), "License does not exist");
        require(license.isActive, "License already suspended");

        license.isActive = false;

        emit LicenseSuspended(_licenseId);
    }

    /**
     * @dev Reactivate a suspended license (admin only)
     * @param _licenseId The license ID to reactivate
     */
    function reactivateLicense(bytes32 _licenseId) external onlyOwner {
        License storage license = licenses[_licenseId];
        require(license.enterprise != address(0), "License does not exist");
        require(!license.isActive, "License is already active");

        license.isActive = true;

        emit LicenseReactivated(_licenseId);
    }

    /**
     * @dev Get license details
     * @param _licenseId The license ID
     * @return License struct with all details
     */
    function getLicense(bytes32 _licenseId)
        external
        view
        returns (License memory)
    {
        return licenses[_licenseId];
    }

    /**
     * @dev Get all licenses for an enterprise
     * @param _enterprise The enterprise address
     * @return Array of license IDs
     */
    function getEnterpriseLicenses(address _enterprise)
        external
        view
        returns (bytes32[] memory)
    {
        return enterpriseLicenses[_enterprise];
    }

    /**
     * @dev Check if a user has an assigned seat
     * @param _licenseId The license ID
     * @param _user The user address
     * @return Whether the user has an assigned seat
     */
    function hasSeat(bytes32 _licenseId, address _user)
        external
        view
        returns (bool)
    {
        return seatAssignments[_licenseId][_user];
    }

    /**
     * @dev Get last usage time for a user
     * @param _licenseId The license ID
     * @param _user The user address
     * @return Last access timestamp
     */
    function getLastUsage(bytes32 _licenseId, address _user)
        external
        view
        returns (uint256)
    {
        return seatUsage[_licenseId][_user];
    }

    /**
     * @dev Get available seats for a license
     * @param _licenseId The license ID
     * @return Number of available seats
     */
    function getAvailableSeats(bytes32 _licenseId)
        external
        view
        returns (uint256)
    {
        License memory license = licenses[_licenseId];
        if (license.seats > license.usedSeats) {
            return license.seats - license.usedSeats;
        }
        return 0;
    }

    /**
     * @dev Pause the contract (admin only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract (admin only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraw contract balance (admin only)
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
