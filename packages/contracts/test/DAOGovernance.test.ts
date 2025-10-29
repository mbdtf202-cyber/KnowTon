import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { DAOGovernance } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time, mine } from "@nomicfoundation/hardhat-network-helpers";

describe("DAOGovernance", function () {
  let governance: DAOGovernance;
  let governanceToken: any;
  let timelock: any;
  let owner: SignerWithAddress;
  let proposer: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;

  const VOTING_DELAY = 1; // 1 block
  const VOTING_PERIOD = 50400; // 1 week in blocks
  const PROPOSAL_THRESHOLD = ethers.parseEther("1000");
  const QUORUM_PERCENTAGE = 4; // 4%
  const MIN_DELAY = 3600; // 1 hour

  beforeEach(async function () {
    [owner, proposer, voter1, voter2, voter3] = await ethers.getSigners();

    // Deploy governance token (ERC20Votes)
    const GovernanceTokenFactory = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceTokenFactory.deploy();
    await governanceToken.initialize("KnowTon Token", "KTN");

    // Mint tokens to voters
    await governanceToken.mint(proposer.address, ethers.parseEther("10000"));
    await governanceToken.mint(voter1.address, ethers.parseEther("5000"));
    await governanceToken.mint(voter2.address, ethers.parseEther("3000"));
    await governanceToken.mint(voter3.address, ethers.parseEther("2000"));

    // Delegate voting power
    await governanceToken.connect(proposer).delegate(proposer.address);
    await governanceToken.connect(voter1).delegate(voter1.address);
    await governanceToken.connect(voter2).delegate(voter2.address);
    await governanceToken.connect(voter3).delegate(voter3.address);

    // Deploy Timelock
    const TimelockFactory = await ethers.getContractFactory("TimelockController");
    timelock = await TimelockFactory.deploy(
      MIN_DELAY,
      [], // proposers
      [], // executors
      owner.address // admin
    );

    // Deploy Governance
    const GovernanceFactory = await ethers.getContractFactory("DAOGovernance");
    governance = (await upgrades.deployProxy(
      GovernanceFactory,
      [
        await governanceToken.getAddress(),
        await timelock.getAddress(),
        VOTING_DELAY,
        VOTING_PERIOD,
        PROPOSAL_THRESHOLD,
        QUORUM_PERCENTAGE,
      ],
      {
        initializer: "initialize",
      }
    )) as unknown as DAOGovernance;

    // Grant roles to governance contract
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, await governance.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE, await governance.getAddress());
    await timelock.grantRole(CANCELLER_ROLE, await governance.getAddress());
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await governance.name()).to.equal("KnowTon DAO");
      expect(await governance.votingDelay()).to.equal(VOTING_DELAY);
      expect(await governance.votingPeriod()).to.equal(VOTING_PERIOD);
      expect(await governance.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
    });

    it("Should have correct token and timelock", async function () {
      expect(await governance.token()).to.equal(await governanceToken.getAddress());
      expect(await governance.timelock()).to.equal(await timelock.getAddress());
    });
  });

  describe("Proposal Creation", function () {
    it("Should create a proposal", async function () {
      const targets = [await governanceToken.getAddress()];
      const values = [0];
      const calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          voter1.address,
          ethers.parseEther("1000"),
        ]),
      ];
      const description = "Mint 1000 tokens to voter1";

      const proposeTx = await governance
        .connect(proposer)
        .propose(targets, values, calldatas, description);

      const receipt = await proposeTx.wait();
      const event = receipt?.logs.find((log: any) => {
        try {
          return governance.interface.parseLog(log)?.name === "ProposalCreated";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });

    it("Should reject proposal from account below threshold", async function () {
      const targets = [await governanceToken.getAddress()];
      const values = [0];
      const calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          voter1.address,
          ethers.parseEther("1000"),
        ]),
      ];
      const description = "Test proposal";

      // voter3 has only 2000 tokens, below threshold of 1000
      await expect(
        governance.connect(voter3).propose(targets, values, calldatas, description)
      ).to.be.reverted;
    });

    it("Should calculate proposal ID correctly", async function () {
      const targets = [await governanceToken.getAddress()];
      const values = [0];
      const calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          voter1.address,
          ethers.parseEther("1000"),
        ]),
      ];
      const description = "Test proposal";

      await governance.connect(proposer).propose(targets, values, calldatas, description);

      const proposalId = await governance.hashProposal(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );

      const state = await governance.state(proposalId);
      expect(state).to.equal(0); // Pending
    });
  });

  describe("Voting", function () {
    let proposalId: bigint;

    beforeEach(async function () {
      const targets = [await governanceToken.getAddress()];
      const values = [0];
      const calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          voter1.address,
          ethers.parseEther("1000"),
        ]),
      ];
      const description = "Mint tokens proposal";

      await governance.connect(proposer).propose(targets, values, calldatas, description);

      proposalId = await governance.hashProposal(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );

      // Wait for voting delay
      await mine(VOTING_DELAY + 1);
    });

    it("Should allow voting", async function () {
      const voteTx = await governance.connect(voter1).castVote(proposalId, 1); // For

      await expect(voteTx).to.emit(governance, "VoteCast");

      const hasVoted = await governance.hasVoted(proposalId, voter1.address);
      expect(hasVoted).to.be.true;
    });

    it("Should count votes correctly", async function () {
      await governance.connect(voter1).castVote(proposalId, 1); // For - 5000 tokens
      await governance.connect(voter2).castVote(proposalId, 1); // For - 3000 tokens
      await governance.connect(voter3).castVote(proposalId, 0); // Against - 2000 tokens

      const proposalVotes = await governance.proposalVotes(proposalId);
      expect(proposalVotes.forVotes).to.equal(ethers.parseEther("8000"));
      expect(proposalVotes.againstVotes).to.equal(ethers.parseEther("2000"));
      expect(proposalVotes.abstainVotes).to.equal(0);
    });

    it("Should reject double voting", async function () {
      await governance.connect(voter1).castVote(proposalId, 1);

      await expect(governance.connect(voter1).castVote(proposalId, 1)).to.be.reverted;
    });

    it("Should allow voting with reason", async function () {
      const reason = "I support this proposal";
      const voteTx = await governance.connect(voter1).castVoteWithReason(proposalId, 1, reason);

      await expect(voteTx).to.emit(governance, "VoteCast");
    });
  });

  describe("Proposal Execution", function () {
    let proposalId: bigint;
    let targets: string[];
    let values: number[];
    let calldatas: string[];
    let description: string;

    beforeEach(async function () {
      targets = [await governanceToken.getAddress()];
      values = [0];
      calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          voter1.address,
          ethers.parseEther("1000"),
        ]),
      ];
      description = "Mint tokens proposal";

      await governance.connect(proposer).propose(targets, values, calldatas, description);

      proposalId = await governance.hashProposal(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );

      // Wait for voting delay
      await mine(VOTING_DELAY + 1);

      // Vote
      await governance.connect(proposer).castVote(proposalId, 1); // 10000 tokens
      await governance.connect(voter1).castVote(proposalId, 1); // 5000 tokens

      // Wait for voting period to end
      await mine(VOTING_PERIOD + 1);
    });

    it("Should queue successful proposal", async function () {
      const queueTx = await governance.queue(targets, values, calldatas, ethers.id(description));

      await expect(queueTx).to.emit(governance, "ProposalQueued");

      const state = await governance.state(proposalId);
      expect(state).to.equal(5); // Queued
    });

    it("Should execute queued proposal after timelock", async function () {
      await governance.queue(targets, values, calldatas, ethers.id(description));

      // Wait for timelock delay
      await time.increase(MIN_DELAY + 1);

      const balanceBefore = await governanceToken.balanceOf(voter1.address);

      const executeTx = await governance.execute(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );

      await expect(executeTx).to.emit(governance, "ProposalExecuted");

      const balanceAfter = await governanceToken.balanceOf(voter1.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1000"));

      const state = await governance.state(proposalId);
      expect(state).to.equal(7); // Executed
    });

    it("Should reject execution before timelock delay", async function () {
      await governance.queue(targets, values, calldatas, ethers.id(description));

      await expect(
        governance.execute(targets, values, calldatas, ethers.id(description))
      ).to.be.reverted;
    });

    it("Should reject execution of defeated proposal", async function () {
      // Create new proposal
      const newTargets = [await governanceToken.getAddress()];
      const newValues = [0];
      const newCalldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          voter2.address,
          ethers.parseEther("500"),
        ]),
      ];
      const newDescription = "Another proposal";

      await governance.connect(proposer).propose(newTargets, newValues, newCalldatas, newDescription);

      const newProposalId = await governance.hashProposal(
        newTargets,
        newValues,
        newCalldatas,
        ethers.id(newDescription)
      );

      await mine(VOTING_DELAY + 1);

      // Vote against
      await governance.connect(proposer).castVote(newProposalId, 0); // Against - 10000 tokens

      await mine(VOTING_PERIOD + 1);

      const state = await governance.state(newProposalId);
      expect(state).to.equal(3); // Defeated

      await expect(
        governance.queue(newTargets, newValues, newCalldatas, ethers.id(newDescription))
      ).to.be.reverted;
    });
  });

  describe("Quorum", function () {
    it("Should calculate quorum correctly", async function () {
      const totalSupply = await governanceToken.totalSupply();
      const expectedQuorum = (totalSupply * BigInt(QUORUM_PERCENTAGE)) / 100n;

      const currentBlock = await ethers.provider.getBlockNumber();
      const quorum = await governance.quorum(currentBlock - 1);

      expect(quorum).to.equal(expectedQuorum);
    });

    it("Should reject proposal that doesn't meet quorum", async function () {
      const targets = [await governanceToken.getAddress()];
      const values = [0];
      const calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          voter1.address,
          ethers.parseEther("100"),
        ]),
      ];
      const description = "Low participation proposal";

      await governance.connect(proposer).propose(targets, values, calldatas, description);

      const proposalId = await governance.hashProposal(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );

      await mine(VOTING_DELAY + 1);

      // Only voter3 votes (2000 tokens), below quorum
      await governance.connect(voter3).castVote(proposalId, 1);

      await mine(VOTING_PERIOD + 1);

      const state = await governance.state(proposalId);
      expect(state).to.equal(3); // Defeated (quorum not reached)
    });
  });

  describe("Proposal Cancellation", function () {
    let proposalId: bigint;
    let targets: string[];
    let values: number[];
    let calldatas: string[];
    let description: string;

    beforeEach(async function () {
      targets = [await governanceToken.getAddress()];
      values = [0];
      calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          voter1.address,
          ethers.parseEther("1000"),
        ]),
      ];
      description = "Cancellable proposal";

      await governance.connect(proposer).propose(targets, values, calldatas, description);

      proposalId = await governance.hashProposal(
        targets,
        values,
        calldatas,
        ethers.id(description)
      );
    });

    it("Should allow proposer to cancel proposal", async function () {
      const cancelTx = await governance
        .connect(proposer)
        .cancel(targets, values, calldatas, ethers.id(description));

      await expect(cancelTx).to.emit(governance, "ProposalCanceled");

      const state = await governance.state(proposalId);
      expect(state).to.equal(2); // Canceled
    });
  });
});
