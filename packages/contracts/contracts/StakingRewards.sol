// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title StakingRewards
 * @dev 质押奖励合约，支持锁定期和 APY 计算
 */
contract StakingRewards is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    IERC20Upgradeable public stakingToken;
    IERC20Upgradeable public rewardToken;
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant YEAR = 365 days;
    
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lockPeriod;
        uint256 apy;
        uint256 rewardsClaimed;
    }
    
    mapping(address => StakeInfo[]) public stakes;
    mapping(uint256 => uint256) public lockPeriodToAPY; // lockPeriod => APY
    
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    
    event Staked(address indexed user, uint256 amount, uint256 lockPeriod, uint256 apy);
    event Unstaked(address indexed user, uint256 stakeIndex, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 stakeIndex, uint256 amount);
    event APYUpdated(uint256 lockPeriod, uint256 newAPY);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address _stakingToken,
        address _rewardToken
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        stakingToken = IERC20Upgradeable(_stakingToken);
        rewardToken = IERC20Upgradeable(_rewardToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        
        // Default APY configurations
        lockPeriodToAPY[30 days] = 500;    // 5%
        lockPeriodToAPY[90 days] = 1000;   // 10%
        lockPeriodToAPY[180 days] = 1500;  // 15%
        lockPeriodToAPY[365 days] = 2000;  // 20%
    }
    
    /**
     * @dev 质押代币
     * @param amount 质押数量
     * @param lockPeriod 锁定期
     */
    function stake(uint256 amount, uint256 lockPeriod) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        require(lockPeriodToAPY[lockPeriod] > 0, "Invalid lock period");
        
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 apy = lockPeriodToAPY[lockPeriod];
        
        stakes[msg.sender].push(StakeInfo({
            amount: amount,
            startTime: block.timestamp,
            lockPeriod: lockPeriod,
            apy: apy,
            rewardsClaimed: 0
        }));
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, lockPeriod, apy);
    }
    
    /**
     * @dev 解除质押
     * @param stakeIndex 质押索引
     */
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < stakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = stakes[msg.sender][stakeIndex];
        require(
            block.timestamp >= stakeInfo.startTime + stakeInfo.lockPeriod,
            "Still locked"
        );
        
        uint256 amount = stakeInfo.amount;
        uint256 rewards = calculateRewards(msg.sender, stakeIndex);
        uint256 unclaimedRewards = rewards - stakeInfo.rewardsClaimed;
        
        // Remove stake
        stakes[msg.sender][stakeIndex] = stakes[msg.sender][stakes[msg.sender].length - 1];
        stakes[msg.sender].pop();
        
        totalStaked -= amount;
        totalRewardsDistributed += unclaimedRewards;
        
        // Transfer staked tokens and rewards
        stakingToken.safeTransfer(msg.sender, amount);
        if (unclaimedRewards > 0) {
            rewardToken.safeTransfer(msg.sender, unclaimedRewards);
        }
        
        emit Unstaked(msg.sender, stakeIndex, amount, unclaimedRewards);
    }
    
    /**
     * @dev 领取奖励
     * @param stakeIndex 质押索引
     */
    function claimRewards(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < stakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = stakes[msg.sender][stakeIndex];
        uint256 rewards = calculateRewards(msg.sender, stakeIndex);
        uint256 unclaimedRewards = rewards - stakeInfo.rewardsClaimed;
        
        require(unclaimedRewards > 0, "No rewards to claim");
        
        stakeInfo.rewardsClaimed = rewards;
        totalRewardsDistributed += unclaimedRewards;
        
        rewardToken.safeTransfer(msg.sender, unclaimedRewards);
        
        emit RewardsClaimed(msg.sender, stakeIndex, unclaimedRewards);
    }
    
    /**
     * @dev 计算奖励
     * @param user 用户地址
     * @param stakeIndex 质押索引
     */
    function calculateRewards(address user, uint256 stakeIndex)
        public
        view
        returns (uint256)
    {
        require(stakeIndex < stakes[user].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = stakes[user][stakeIndex];
        
        uint256 stakingDuration = block.timestamp - stakeInfo.startTime;
        uint256 annualReward = (stakeInfo.amount * stakeInfo.apy) / BASIS_POINTS;
        uint256 rewards = (annualReward * stakingDuration) / YEAR;
        
        return rewards;
    }
    
    /**
     * @dev 获取用户所有质押
     * @param user 用户地址
     */
    function getUserStakes(address user)
        external
        view
        returns (StakeInfo[] memory)
    {
        return stakes[user];
    }
    
    /**
     * @dev 获取用户质押数量
     * @param user 用户地址
     */
    function getUserStakeCount(address user) external view returns (uint256) {
        return stakes[user].length;
    }
    
    /**
     * @dev 获取用户总质押金额
     * @param user 用户地址
     */
    function getUserTotalStaked(address user) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < stakes[user].length; i++) {
            total += stakes[user][i].amount;
        }
        return total;
    }
    
    /**
     * @dev 获取用户总待领取奖励
     * @param user 用户地址
     */
    function getUserTotalPendingRewards(address user) external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < stakes[user].length; i++) {
            uint256 rewards = calculateRewards(user, i);
            total += rewards - stakes[user][i].rewardsClaimed;
        }
        return total;
    }
    
    /**
     * @dev 更新 APY
     * @param lockPeriod 锁定期
     * @param newAPY 新 APY
     */
    function updateAPY(uint256 lockPeriod, uint256 newAPY)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(newAPY <= 10000, "APY too high"); // Max 100%
        lockPeriodToAPY[lockPeriod] = newAPY;
        emit APYUpdated(lockPeriod, newAPY);
    }
    
    /**
     * @dev 紧急提取（仅管理员）
     * @param token 代币地址
     * @param amount 数量
     */
    function emergencyWithdraw(address token, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        IERC20Upgradeable(token).safeTransfer(msg.sender, amount);
    }
    
    // Required overrides
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}
}
