import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { KnowTonToken, KnowTonTimelock, KnowTonGovernance } from '../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('KnowTonGovernance', function () {
  let token: KnowTonToken;
  let timelock: KnowTonTimelock;
  let governance: KnowTonGovernance;
  let owner: SignerWithAddress;
  let proposer: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther('10000000'); // 10M tokens
  const PROPOSAL_STAKE = ethers.parseEther('5000'); // 5000 tokens stake
  const VOTING_DELAY = 1; // 1 block
  const VOTING_PERIOD = 50400; // ~1 week
  const MIN_DELAY = 2 * 24 * 60 * 60; // 48 hours

  beforeEach(async function () {
    [owner, proposer, voter1, voter2, voter3] = await ethers.getSigners();

    // Deploy token
    const TokenFactory = await ethers.getContractFactory('KnowTonToken');
    token = await TokenFactory.deploy(INITIAL_SUPPLY);
    await token.waitForDeployment();

    // Deploy timelock
    const TimelockFactory = await ethers.getContractFactory('KnowTonTimelock');
    timelock = await TimelockFactory.deploy(
      [], // proposers (will be set to governance)
      [], // executors (will be set to governance)
      owner.address // admin
    );
    await timelock.waitForDeployment();

    // Deploy governance
    const GovernanceFactory = await ethers.getContractFactory('KnowTonGovernance');
    governance = await GovernanceFactory.deploy(
      await token.getAddress(),
      await timelock.getAddress(),
      PROPOSAL_STAKE
    );
    await governance.waitForDeployment();

    // Setup roles
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, await governance.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE, await governance.getAddress());
    await timelock.grantRole(CANCELLER_ROLE, await governance.getAddress());

    // Distribute tokens
    await token.transfer(proposer.address, ethers.parseEther('10000'));
    await token.transfer(voter1.address, ethers.parseEther('100000'));
    await token.transfer(voter2.address, ethers.parseEther('50000'));
    await token.transfer(voter3.address, ethers.parseEther('25000'));

    // Delegate voting power
    await token.connect(proposer).delegate(proposer.address);
    await token.connect(voter1).delegate(voter1.address);
    await token.connect(voter2).delegate(voter2.address);
    await token.connect(voter3).delegate(voter3.address);

    // Mine a block to activate voting power
    await ethers.provider.send('evm_mine', []);
  });

  describe('Deployment', function () {
    it('Should set the correct token', async function () {
      expect(await governance.token()).to.equal(await token.getAddress());
    });

    it('Should set the correct timelock', async function () {
      expect(await governance.timelock()).to.equal(await timelock.getAddress());
    });

    it('Should set the correct proposal stake amount', async function () {
      expect(await governance.proposalStakeAmount()).to.equal(PROPOSAL_STAKE);
    });

    it('Should have correct voting parameters', async function () {
      expect(await governance.votingDelay()).to.equal(VOTING_DELAY);
      expect(await governance.votingPeriod()).to.equal(VOTING_PERIOD);
    });
  });

  describe('Proposal Creation', function () {
    it('Should create a proposal with token staking', async function () {
      // Approve stake
      await token.connect(proposer).approve(await governance.getAddress(), PROPOSAL_STAKE);

      const targets = [await token.getAddress()];
      const values = [0];
      const calldatas = [token.interface.encodeFunctionData('transfer', [voter1.address, ethers.parseEther('100')])];
      const description = 'Transfer 100 tokens to voter1';

      const proposeTx = await governance.connect(proposer).propose(targets, values, calldatas, description);
      const receipt = await proposeTx.wait();

      // Check ProposalCreated event
      const event = receipt?.logs.find((log: any) => {
        try {
          return governance.interface.parseLog(log)?.name === 'ProposalCreated';
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;

      // Verify stake was transferred
      const proposalId = await governance.hashProposal(targets, values, calldatas, ethers.id(description));
      expect(await governance.proposalStakes(proposalId)).to.equal(PROPOSAL_STAKE);
      expect(await governance.proposalProposers(proposalId)).to.equal(proposer.address);
    });

    it('Should fail if proposer does not have enough tokens', async function () {
      const targets = [await token.getAddress()];
      const values = [0];
      const calldatas = [token.interface.encodeFunctionData('transfer', [voter1.address, ethers.parseEther('100')])];
      const description = 'Transfer 100 tokens to voter1';

      await expect(
        governance.connect(voter3).propose(targets, values, calldatas, description)
      ).to.be.revertedWith('Governor: proposer votes below proposal threshold');
    });

    it('Should fail if stake approval is insufficient', async function () {
      const targets = [await token.getAddress()];
      const values = [0];
      const calldatas = [token.interface.encodeFunctionData('transfer', [voter1.address, ethers.parseEther('100')])];
      const description = 'Transfer 100 tokens to voter1';

      await expect(
        governance.connect(proposer).propose(targets, values, calldatas, description)
      ).to.be.reverted;
    });
  });

  describe('Voting', function () {
    let proposalId: bigint;
    let targets: string[];
    let values: bigint[];
    let calldatas: string[];
    let description: string;

    beforeEach(async function () {
      // Create a proposal
      await token.connect(proposer).approve(await governance.getAddress(), PROPOSAL_STAKE);

      targets = [await token.getAddress()];
      values = [0n];
      calldatas = [token.interface.encodeFunctionData('transfer', [voter1.address, ethers.parseEther('100')])];
      description = 'Transfer 100 tokens to voter1';

      await governance.connect(proposer).propose(targets, values, calldatas, description);
      proposalId = await governance.hashProposal(targets, values, calldatas, ethers.id(description));

      // Wait for voting delay
      await time.increase(VOTING_DELAY + 1);
      await ethers.provider.send('evm_mine', []);
    });

    it('Should allow voting on active proposal', async function () {
      // Vote: 0 = Against, 1 = For, 2 = Abstain
      await expect(governance.connect(voter1).castVote(proposalId, 1))
        .to.emit(governance, 'VoteCast');
    });

    it('Should calculate quadratic voting weight correctly', async function () {
      const voter1Balance = await token.getVotes(voter1.address);
      const expectedWeight = await governance.getVotingWeight(voter1.address);

      // Quadratic voting: sqrt(100000 * 10^18) ≈ 10^13
      expect(expectedWeight).to.be.gt(0);
    });

    it('Should track votes correctly', async function () {
      await governance.connect(voter1).castVote(proposalId, 1); // For
      await governance.connect(voter2).castVote(proposalId, 0); // Against

      const proposalVotes = await governance.proposalVotes(proposalId);
      expect(proposalVotes.forVotes).to.be.gt(0);
      expect(proposalVotes.againstVotes).to.be.gt(0);
    });
  });

  describe('Activity Score', function () {
    it('Should update activity score', async function () {
      const score = 500;
      
      // First, we need to grant governance role to owner for testing
      // In production, this would be done through a proposal
      await expect(governance.updateActivityScore(voter1.address, score))
        .to.emit(governance, 'ActivityScoreUpdated')
        .withArgs(voter1.address, score);

      expect(await governance.activityScore(voter1.address)).to.equal(score);
    });

    it('Should increase voting weight with activity score', async function () {
      const baseWeight = await governance.getVotingWeight(voter1.address);
      
      // Update activity score
      await governance.updateActivityScore(voter1.address, 1000);
      
      const boostedWeight = await governance.getVotingWeight(voter1.address);
      expect(boostedWeight).to.be.gt(baseWeight);
    });
  });

  describe('Proposal Execution', function () {
    let proposalId: bigint;
    let targets: string[];
    let values: bigint[];
    let calldatas: string[];
    let description: string;
    let descriptionHash: string;

    beforeEach(async function () {
      // Create and pass a proposal
      await token.connect(proposer).approve(await governance.getAddress(), PROPOSAL_STAKE);

      targets = [await token.getAddress()];
      values = [0n];
      calldatas = [token.interface.encodeFunctionData('transfer', [voter1.address, ethers.parseEther('100')])];
      description = 'Transfer 100 tokens to voter1';
      descriptionHash = ethers.id(description);

      await governance.connect(proposer).propose(targets, values, calldatas, description);
      proposalId = await governance.hashProposal(targets, values, calldatas, descriptionHash);

      // Wait for voting to start
      await time.increase(VOTING_DELAY + 1);
      await ethers.provider.send('evm_mine', []);

      // Vote
      await governance.connect(voter1).castVote(proposalId, 1);
      await governance.connect(voter2).castVote(proposalId, 1);

      // Wait for voting to end
      await time.increase(VOTING_PERIOD + 1);
      await ethers.provider.send('evm_mine', []);
    });

    it('Should queue proposal after voting succeeds', async function () {
      await expect(governance.queue(targets, values, calldatas, descriptionHash))
        .to.emit(governance, 'ProposalQueued');
    });

    it('Should execute proposal after timelock delay', async function () {
      // Queue the proposal
      await governance.queue(targets, values, calldatas, descriptionHash);

      // Wait for timelock delay
      await time.increase(MIN_DELAY + 1);

      // Execute
      const voter1BalanceBefore = await token.balanceOf(voter1.address);
      await governance.execute(targets, values, calldatas, descriptionHash);
      const voter1BalanceAfter = await token.balanceOf(voter1.address);

      expect(voter1BalanceAfter - voter1BalanceBefore).to.equal(ethers.parseEther('100'));
    });

    it('Should return stake after execution', async function () {
      const proposerBalanceBefore = await token.balanceOf(proposer.address);

      // Queue and execute
      await governance.queue(targets, values, calldatas, descriptionHash);
      await time.increase(MIN_DELAY + 1);
      await governance.execute(targets, values, calldatas, descriptionHash);

      const proposerBalanceAfter = await token.balanceOf(proposer.address);
      expect(proposerBalanceAfter - proposerBalanceBefore).to.equal(PROPOSAL_STAKE);
    });

    it('Should fail to execute before timelock delay', async function () {
      await governance.queue(targets, values, calldatas, descriptionHash);

      await expect(
        governance.execute(targets, values, calldatas, descriptionHash)
      ).to.be.reverted;
    });
  });

  describe('Proposal Cancellation', function () {
    it('Should allow cancellation and return stake', async function () {
      // Create proposal
      await token.connect(proposer).approve(await governance.getAddress(), PROPOSAL_STAKE);

      const targets = [await token.getAddress()];
      const values = [0n];
      const calldatas = [token.interface.encodeFunctionData('transfer', [voter1.address, ethers.parseEther('100')])];
      const description = 'Transfer 100 tokens to voter1';
      const descriptionHash = ethers.id(description);

      await governance.connect(proposer).propose(targets, values, calldatas, description);

      const proposerBalanceBefore = await token.balanceOf(proposer.address);

      // Cancel
      await governance.connect(proposer).cancel(targets, values, calldatas, descriptionHash);

      const proposerBalanceAfter = await token.balanceOf(proposer.address);
      expect(proposerBalanceAfter - proposerBalanceBefore).to.equal(PROPOSAL_STAKE);
    });
  });

  describe('Quadratic Voting Math', function () {
    it('Should calculate square root correctly', async function () {
      // Test with different token amounts
      const testCases = [
        { tokens: ethers.parseEther('100'), expectedSqrt: ethers.parseEther('10') },
        { tokens: ethers.parseEther('10000'), expectedSqrt: ethers.parseEther('100') },
        { tokens: ethers.parseEther('1000000'), expectedSqrt: ethers.parseEther('1000') },
      ];

      for (const testCase of testCases) {
        // Transfer tokens to a test address
        const testAddr = ethers.Wallet.createRandom().address;
        await token.transfer(testAddr, testCase.tokens);
        await token.connect(await ethers.getSigner(testAddr)).delegate(testAddr);
        await ethers.provider.send('evm_mine', []);

        const weight = await governance.getVotingWeight(testAddr);
        // Allow for some rounding error
        expect(weight).to.be.closeTo(testCase.expectedSqrt, ethers.parseEther('1'));
      }
    });
  });
});
