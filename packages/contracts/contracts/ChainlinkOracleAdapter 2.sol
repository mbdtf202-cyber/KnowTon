// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ChainlinkOracleAdapter
 * @notice Integrates Chainlink Price Feeds, VRF, and Automation for the KnowTon platform
 * @dev Provides price data, random number generation, and automated task execution
 */
contract ChainlinkOracleAdapter is Ownable, ReentrancyGuard {
    // Chainlink Price Feed
    mapping(address => address) public priceFeeds; // token => price feed address
    
    // Chainlink VRF
    IVRFCoordinatorV2 public vrfCoordinator;
    uint64 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit = 100000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;
    
    // VRF request tracking
    struct VRFRequest {
        address requester;
        uint256 requestedAt;
        bool fulfilled;
        uint256[] randomWords;
    }
    mapping(uint256 => VRFRequest) public vrfRequests;
    
    // Chainlink Automation (Keepers)
    mapping(bytes32 => AutomationTask) public automationTasks;
    bytes32[] public taskIds;
    
    struct AutomationTask {
        address target;
        bytes callData;
        uint256 interval;
        uint256 lastExecuted;
        bool isActive;
    }
    
    // NFT Valuation Oracle
    mapping(address => mapping(uint256 => ValuationData)) public nftValuations;
    
    struct ValuationData {
        uint256 value;
        uint256 confidence;
        uint256 timestamp;
        address oracle;
    }
    
    // Events
    event PriceFeedUpdated(address indexed token, address indexed feed);
    event PriceRequested(address indexed token, uint256 price, uint256 timestamp);
    
    event RandomnessRequested(uint256 indexed requestId, address indexed requester);
    event RandomnessFulfilled(uint256 indexed requestId, uint256[] randomWords);
    
    event AutomationTaskCreated(bytes32 indexed taskId, address target, uint256 interval);
    event AutomationTaskExecuted(bytes32 indexed taskId, uint256 timestamp);
    event AutomationTaskCancelled(bytes32 indexed taskId);
    
    event ValuationSubmitted(
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 value,
        uint256 confidence,
        address oracle
    );
    
    // Errors
    error InvalidPriceFeed();
    error PriceNotAvailable();
    error InvalidVRFConfig();
    error RequestNotFound();
    error TaskNotFound();
    error TaskNotReady();
    error InvalidInterval();
    
    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) {
        require(_vrfCoordinator != address(0), "Invalid VRF coordinator");
        
        vrfCoordinator = IVRFCoordinatorV2(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }
    
    // ============ Price Feed Functions ============
    
    /**
     * @notice Add or update a Chainlink price feed for a token
     * @param token Token address
     * @param priceFeed Chainlink price feed address
     */
    function setPriceFeed(address token, address priceFeed) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(priceFeed != address(0), "Invalid price feed");
        
        priceFeeds[token] = priceFeed;
        emit PriceFeedUpdated(token, priceFeed);
    }
    
    /**
     * @notice Get latest price for a token
     * @param token Token address
     * @return price Latest price (8 decimals)
     * @return decimals Price decimals
     */
    function getLatestPrice(address token) external view returns (int256 price, uint8 decimals) {
        address feed = priceFeeds[token];
        if (feed == address(0)) revert InvalidPriceFeed();
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        
        (, price, , , ) = priceFeed.latestRoundData();
        decimals = priceFeed.decimals();
        
        if (price <= 0) revert PriceNotAvailable();
    }
    
    /**
     * @notice Get historical price data
     * @param token Token address
     * @param roundId Round ID to query
     * @return price Price at the specified round
     * @return timestamp Timestamp of the round
     */
    function getHistoricalPrice(
        address token,
        uint80 roundId
    ) external view returns (int256 price, uint256 timestamp) {
        address feed = priceFeeds[token];
        if (feed == address(0)) revert InvalidPriceFeed();
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        (, price, , timestamp, ) = priceFeed.getRoundData(roundId);
    }
    
    /**
     * @notice Get price in USD for a token amount
     * @param token Token address
     * @param amount Token amount
     * @return usdValue Value in USD (18 decimals)
     */
    function getUSDValue(address token, uint256 amount) external view returns (uint256 usdValue) {
        address feed = priceFeeds[token];
        if (feed == address(0)) revert InvalidPriceFeed();
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        (, int256 price, , , ) = priceFeed.latestRoundData();
        
        if (price <= 0) revert PriceNotAvailable();
        
        uint8 decimals = priceFeed.decimals();
        
        // Convert to 18 decimals
        usdValue = (amount * uint256(price) * 1e18) / (10 ** decimals);
    }
    
    // ============ VRF (Random Number) Functions ============
    
    /**
     * @notice Request random words from Chainlink VRF
     * @return requestId VRF request ID
     */
    function requestRandomWords() external nonReentrant returns (uint256 requestId) {
        requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        vrfRequests[requestId] = VRFRequest({
            requester: msg.sender,
            requestedAt: block.timestamp,
            fulfilled: false,
            randomWords: new uint256[](0)
        });
        
        emit RandomnessRequested(requestId, msg.sender);
    }
    
    /**
     * @notice Callback function for VRF
     * @param requestId Request ID
     * @param randomWords Array of random words
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal {
        VRFRequest storage request = vrfRequests[requestId];
        
        if (request.requester == address(0)) revert RequestNotFound();
        
        request.fulfilled = true;
        request.randomWords = randomWords;
        
        emit RandomnessFulfilled(requestId, randomWords);
    }
    
    /**
     * @notice Get random words for a request
     * @param requestId Request ID
     * @return randomWords Array of random words
     */
    function getRandomWords(uint256 requestId) external view returns (uint256[] memory randomWords) {
        VRFRequest storage request = vrfRequests[requestId];
        
        if (request.requester == address(0)) revert RequestNotFound();
        require(request.fulfilled, "Request not fulfilled");
        
        randomWords = request.randomWords;
    }
    
    /**
     * @notice Update VRF configuration
     * @param _callbackGasLimit Gas limit for callback
     * @param _requestConfirmations Number of confirmations
     * @param _numWords Number of random words
     */
    function updateVRFConfig(
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) external onlyOwner {
        require(_callbackGasLimit > 0, "Invalid gas limit");
        require(_requestConfirmations > 0, "Invalid confirmations");
        require(_numWords > 0, "Invalid num words");
        
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }
    
    // ============ Automation (Keepers) Functions ============
    
    /**
     * @notice Create an automation task
     * @param target Target contract address
     * @param callData Function call data
     * @param interval Execution interval in seconds
     * @return taskId Task identifier
     */
    function createAutomationTask(
        address target,
        bytes memory callData,
        uint256 interval
    ) external onlyOwner returns (bytes32 taskId) {
        require(target != address(0), "Invalid target");
        require(interval >= 60, "Interval too short");
        
        taskId = keccak256(abi.encodePacked(target, callData, block.timestamp));
        
        automationTasks[taskId] = AutomationTask({
            target: target,
            callData: callData,
            interval: interval,
            lastExecuted: 0,
            isActive: true
        });
        
        taskIds.push(taskId);
        
        emit AutomationTaskCreated(taskId, target, interval);
    }
    
    /**
     * @notice Check if a task needs execution (called by Chainlink Keepers)
     * @param taskId Task identifier
     * @return upkeepNeeded Whether the task needs execution
     * @return performData Data to pass to performUpkeep
     */
    function checkUpkeep(bytes32 taskId) external view returns (
        bool upkeepNeeded,
        bytes memory performData
    ) {
        AutomationTask storage task = automationTasks[taskId];
        
        if (!task.isActive) {
            return (false, "");
        }
        
        upkeepNeeded = (block.timestamp - task.lastExecuted) >= task.interval;
        performData = abi.encode(taskId);
    }
    
    /**
     * @notice Execute an automation task (called by Chainlink Keepers)
     * @param performData Encoded task ID
     */
    function performUpkeep(bytes calldata performData) external nonReentrant {
        bytes32 taskId = abi.decode(performData, (bytes32));
        AutomationTask storage task = automationTasks[taskId];
        
        if (!task.isActive) revert TaskNotFound();
        if ((block.timestamp - task.lastExecuted) < task.interval) revert TaskNotReady();
        
        task.lastExecuted = block.timestamp;
        
        // Execute the task
        (bool success, ) = task.target.call(task.callData);
        require(success, "Task execution failed");
        
        emit AutomationTaskExecuted(taskId, block.timestamp);
    }
    
    /**
     * @notice Cancel an automation task
     * @param taskId Task identifier
     */
    function cancelAutomationTask(bytes32 taskId) external onlyOwner {
        AutomationTask storage task = automationTasks[taskId];
        
        if (task.target == address(0)) revert TaskNotFound();
        
        task.isActive = false;
        
        emit AutomationTaskCancelled(taskId);
    }
    
    /**
     * @notice Get all active task IDs
     * @return activeTaskIds Array of active task IDs
     */
    function getActiveTaskIds() external view returns (bytes32[] memory activeTaskIds) {
        uint256 activeCount = 0;
        
        // Count active tasks
        for (uint256 i = 0; i < taskIds.length; i++) {
            if (automationTasks[taskIds[i]].isActive) {
                activeCount++;
            }
        }
        
        // Populate array
        activeTaskIds = new bytes32[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < taskIds.length; i++) {
            if (automationTasks[taskIds[i]].isActive) {
                activeTaskIds[index] = taskIds[i];
                index++;
            }
        }
    }
    
    // ============ NFT Valuation Oracle Functions ============
    
    /**
     * @notice Submit NFT valuation (called by authorized oracles)
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param value Valuation in USD (18 decimals)
     * @param confidence Confidence score (0-100)
     */
    function submitValuation(
        address nftContract,
        uint256 tokenId,
        uint256 value,
        uint256 confidence
    ) external {
        require(nftContract != address(0), "Invalid NFT contract");
        require(value > 0, "Invalid value");
        require(confidence <= 100, "Invalid confidence");
        
        nftValuations[nftContract][tokenId] = ValuationData({
            value: value,
            confidence: confidence,
            timestamp: block.timestamp,
            oracle: msg.sender
        });
        
        emit ValuationSubmitted(nftContract, tokenId, value, confidence, msg.sender);
    }
    
    /**
     * @notice Get NFT valuation
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @return valuation Valuation data
     */
    function getValuation(
        address nftContract,
        uint256 tokenId
    ) external view returns (ValuationData memory valuation) {
        valuation = nftValuations[nftContract][tokenId];
        require(valuation.value > 0, "Valuation not found");
    }
    
    /**
     * @notice Check if valuation is stale
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     * @param maxAge Maximum age in seconds
     * @return isStale Whether the valuation is stale
     */
    function isValuationStale(
        address nftContract,
        uint256 tokenId,
        uint256 maxAge
    ) external view returns (bool isStale) {
        ValuationData storage valuation = nftValuations[nftContract][tokenId];
        
        if (valuation.value == 0) {
            return true;
        }
        
        isStale = (block.timestamp - valuation.timestamp) > maxAge;
    }
}

// Chainlink Interfaces
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

interface IVRFCoordinatorV2 {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}
