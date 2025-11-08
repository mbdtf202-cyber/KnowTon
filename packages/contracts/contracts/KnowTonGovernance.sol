// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * @title KnowTonGovernance
 * @dev DAO Governance contract for KnowTon platform with quadratic voting and timelock
 */
contract KnowTonGovernance {
    // Governance token
    ERC20Votes public immutable token;
    
    // Timelock controller
    TimelockController public immutable timelock;
    
    // Constants
    uint256 public constant PROPOSAL_THRESHOLD = 1000 * 10**18;
    uint256 public proposalStakeAmount;
    uint256 public votingDelay = 1;
    uint256 public votingPeriod = 50400;
    uint256 public quorumPercentage = 4;
    
    // Proposal states
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed }
    enum VoteType { Against, For, Abstain }
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool canceled;
        bool executed;
        uint256 eta;
        mapping(address => bool) hasVoted;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        string description;
    }
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => uint256) public proposalStakes;
    mapping(address => uint256) public activityScore;
    
    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description);
    event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight, string reason);
    event ProposalCanceled(uint256 indexed proposalId);
    event ProposalQueued(uint256 indexed proposalId, uint256 eta);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalStaked(uint256 indexed proposalId, address indexed proposer, uint256 amount);
    event ProposalStakeReturned(uint256 indexed proposalId, address indexed proposer, uint256 amount);
    event ActivityScoreUpdated(address indexed user, uint256 newScore);
    
    constructor(ERC20Votes _token, TimelockController _timelock, uint256 _stakeAmount) {
        token = _token;
        timelock = _timelock;
        proposalStakeAmount = _stakeAmount;
    }
    
    function propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description) public returns (uint256) {
        require(targets.length == values.length && targets.length == calldatas.length && targets.length > 0, "Invalid proposal");
        require(token.getVotes(msg.sender) >= PROPOSAL_THRESHOLD, "Below threshold");
        require(IERC20(address(token)).transferFrom(msg.sender, address(this), proposalStakeAmount), "Stake failed");
        
        uint256 proposalId = ++proposalCount;
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.startBlock = block.number + votingDelay;
        proposal.endBlock = proposal.startBlock + votingPeriod;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;
        proposal.description = description;
        proposalStakes[proposalId] = proposalStakeAmount;
        
        emit ProposalCreated(proposalId, msg.sender, targets, values, new string[](targets.length), calldatas, proposal.startBlock, proposal.endBlock, description);
        emit ProposalStaked(proposalId, msg.sender, proposalStakeAmount);
        return proposalId;
    }
    
    function castVote(uint256 proposalId, uint8 support) public returns (uint256) {
        return _castVote(msg.sender, proposalId, support, "");
    }
    
    function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) public returns (uint256) {
        return _castVote(msg.sender, proposalId, support, reason);
    }
    
    function _castVote(address voter, uint256 proposalId, uint8 support, string memory reason) internal returns (uint256) {
        require(state(proposalId) == ProposalState.Active, "Not active");
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[voter], "Already voted");
        
        uint256 weight = getVotingWeight(voter);
        require(weight > 0, "No voting power");
        proposal.hasVoted[voter] = true;
        
        if (support == uint8(VoteType.Against)) proposal.againstVotes += weight;
        else if (support == uint8(VoteType.For)) proposal.forVotes += weight;
        else if (support == uint8(VoteType.Abstain)) proposal.abstainVotes += weight;
        else revert("Invalid vote");
        
        emit VoteCast(voter, proposalId, support, weight, reason);
        return weight;
    }
    
    function queue(uint256 proposalId) public returns (uint256) {
        require(state(proposalId) == ProposalState.Succeeded, "Not succeeded");
        Proposal storage proposal = proposals[proposalId];
        uint256 eta = block.timestamp + timelock.getMinDelay();
        proposal.eta = eta;
        
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            timelock.schedule(proposal.targets[i], proposal.values[i], proposal.calldatas[i], bytes32(0), bytes32(proposalId), timelock.getMinDelay());
        }
        emit ProposalQueued(proposalId, eta);
        return eta;
    }
    
    function execute(uint256 proposalId) public payable returns (uint256) {
        require(state(proposalId) == ProposalState.Queued, "Not queued");
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.eta, "Timelock not met");
        proposal.executed = true;
        
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            timelock.execute(proposal.targets[i], proposal.values[i], proposal.calldatas[i], bytes32(0), bytes32(proposalId));
        }
        _returnStake(proposalId);
        emit ProposalExecuted(proposalId);
        return proposalId;
    }
    
    function cancel(uint256 proposalId) public returns (uint256) {
        Proposal storage proposal = proposals[proposalId];
        require(msg.sender == proposal.proposer, "Not proposer");
        require(state(proposalId) != ProposalState.Executed, "Already executed");
        proposal.canceled = true;
        _returnStake(proposalId);
        emit ProposalCanceled(proposalId);
        return proposalId;
    }
    
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "Does not exist");
        if (proposal.canceled) return ProposalState.Canceled;
        if (proposal.executed) return ProposalState.Executed;
        if (block.number <= proposal.startBlock) return ProposalState.Pending;
        if (block.number <= proposal.endBlock) return ProposalState.Active;
        if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < quorum()) return ProposalState.Defeated;
        if (proposal.eta == 0) return ProposalState.Succeeded;
        if (proposal.eta > 0 && block.timestamp < proposal.eta) return ProposalState.Queued;
        return ProposalState.Expired;
    }
    
    function quorum() public view returns (uint256) {
        return (token.totalSupply() * quorumPercentage) / 100;
    }
    
    function getVotingWeight(address account) public view returns (uint256) {
        uint256 tokenBalance = token.getVotes(account);
        if (tokenBalance == 0) return 0;
        uint256 sqrtBalance = sqrt(tokenBalance);
        uint256 activity = activityScore[account];
        uint256 activityMultiplier = activity > 1000 ? 500 : (activity * 500) / 1000;
        return sqrtBalance * (1000 + activityMultiplier) / 1000;
    }
    
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }
    
    function _returnStake(uint256 proposalId) internal {
        uint256 stake = proposalStakes[proposalId];
        address proposer = proposals[proposalId].proposer;
        if (stake > 0) {
            proposalStakes[proposalId] = 0;
            require(IERC20(address(token)).transfer(proposer, stake), "Stake return failed");
            emit ProposalStakeReturned(proposalId, proposer, stake);
        }
    }
    
    function updateActivityScore(address user, uint256 score) external {
        require(msg.sender == address(this), "Only governance");
        activityScore[user] = score;
        emit ActivityScoreUpdated(user, score);
    }
    
    function getProposal(uint256 proposalId) external view returns (address proposer, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed) {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.proposer, proposal.startBlock, proposal.endBlock, proposal.forVotes, proposal.againstVotes, proposal.abstainVotes, proposal.canceled, proposal.executed);
    }
}
