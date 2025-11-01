// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title IPBondBasic
 * @dev Basic IP Bond contract for KnowTon platform
 */
contract IPBondBasic is Ownable, ReentrancyGuard {
    IERC20 public paymentToken;
    
    enum BondStatus { Active, Matured, Defaulted }
    
    struct Bond {
        uint256 bondId;
        address issuer;
        uint256 principal;
        uint256 interestRate; // In basis points (e.g., 500 = 5%)
        uint256 maturityDate;
        BondStatus status;
        uint256 totalInvested;
        uint256 totalRedeemed;
    }
    
    mapping(uint256 => Bond) public bonds;
    mapping(uint256 => mapping(address => uint256)) public investments;
    
    uint256 public nextBondId;
    
    event BondIssued(uint256 indexed bondId, address indexed issuer, uint256 principal, uint256 interestRate);
    event BondInvested(uint256 indexed bondId, address indexed investor, uint256 amount);
    event BondRedeemed(uint256 indexed bondId, address indexed investor, uint256 amount);
    
    constructor(address _paymentToken) {
        paymentToken = IERC20(_paymentToken);
        nextBondId = 1;
    }
    
    /**
     * @dev Issue a new bond
     */
    function issueBond(
        uint256 principal,
        uint256 interestRate,
        uint256 duration
    ) external returns (uint256) {
        uint256 bondId = nextBondId++;
        uint256 maturityDate = block.timestamp + duration;
        
        bonds[bondId] = Bond({
            bondId: bondId,
            issuer: msg.sender,
            principal: principal,
            interestRate: interestRate,
            maturityDate: maturityDate,
            status: BondStatus.Active,
            totalInvested: 0,
            totalRedeemed: 0
        });
        
        emit BondIssued(bondId, msg.sender, principal, interestRate);
        return bondId;
    }
    
    /**
     * @dev Invest in a bond
     */
    function invest(uint256 bondId, uint256 amount) external nonReentrant {
        Bond storage bond = bonds[bondId];
        require(bond.status == BondStatus.Active, "Bond not active");
        require(block.timestamp < bond.maturityDate, "Bond matured");
        
        paymentToken.transferFrom(msg.sender, address(this), amount);
        
        investments[bondId][msg.sender] += amount;
        bond.totalInvested += amount;
        
        emit BondInvested(bondId, msg.sender, amount);
    }
    
    /**
     * @dev Redeem investment with interest
     */
    function redeem(uint256 bondId) external nonReentrant {
        Bond storage bond = bonds[bondId];
        require(block.timestamp >= bond.maturityDate, "Bond not matured");
        
        uint256 investment = investments[bondId][msg.sender];
        require(investment > 0, "No investment");
        
        uint256 interest = (investment * bond.interestRate) / 10000;
        uint256 totalReturn = investment + interest;
        
        investments[bondId][msg.sender] = 0;
        bond.totalRedeemed += totalReturn;
        
        paymentToken.transfer(msg.sender, totalReturn);
        
        emit BondRedeemed(bondId, msg.sender, totalReturn);
    }
    
    /**
     * @dev Get bond details
     */
    function getBond(uint256 bondId) external view returns (Bond memory) {
        return bonds[bondId];
    }
    
    /**
     * @dev Get investment amount
     */
    function getInvestment(uint256 bondId, address investor) external view returns (uint256) {
        return investments[bondId][investor];
    }
}
