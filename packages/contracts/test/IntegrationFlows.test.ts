import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { 
  CopyrightRegistrySimple, 
  FractionalizationVault,
  RoyaltyDistributorV2,
  IPBond,
  KnowTonGovernance,
  KnowTonToken,
  LendingAdapter,
  MockERC20,
  MockAavePool,
  MockPoolAddressesProvider,
  MockAaveOracle,
  MockNFTOracle,
  TimelockController
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Integration Tests for Smart Contract Flows
 * 
 * Tests the following end-to-end scenarios:
 * 1. NFT Minting → Fractionalization Flow
 * 2. NFT Minting → Collateral → Lending Flow
 * 3. NFT Minting → Bond Issuance Flow
 * 4. Royalty Distribution → Withdrawal Flow
 * 5. Governance Proposal → Voting → Execution Flow
 */
describe("Smart Contract Integration Flows", function () {
  let copyrightRegistry: CopyrightRegistrySimple;
  let fractionalizationVault: FractionalizationVault;
  let royaltyDistributor: RoyaltyDistributorV2;
  let ipBond: IPBond;
  let governance: KnowTonGovernance;
  let governanceToken: KnowTonToken;
  let lendingAdapter: LendingAdapter;
  let usdcToken: MockERC20;
  let mockAavePool: MockAavePool;
  let mockAddressesProvider: MockPoolAddressesProvider;
  let mockAaveOracle: MockAaveOracle;
  let mockNFTOracle: MockNFTOracle;
  let timelock: TimelockController;
  
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  let buyer: SignerWithAddress;

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const ISSUER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
  
  const mockMetadata = {
    metadataURI: "ipfs://QmTest123",
    contentHash: ethers.keccak256(ethers.toUtf8Bytes("test-content")),
    aiFingerprint: ethers.keccak256(ethers.toUtf8Bytes("test-fingerprint")),
    category: 0, // Music
    royaltyPercentage: 1000, // 10%
  };

  beforeEach(async function () {
    [owner, creator, investor1, investor2, buyer] = await ethers.getSigners();

    // Deploy CopyrightRegistry
    const CopyrightRegistry = await ethers.getContractFactory("CopyrightRegistrySimple");
    copyrightRegistry = await upgrades.deployProxy(
      CopyrightRegistry,
      [],
      { initializer: "initialize" }
    ) as unknown as CopyrightRegistrySimple;
    await copyrightRegistry.waitForDeployment();

    // Deploy FractionalizationVault
    const FractionalizationVault = await ethers.getContractFactory("FractionalizationVault");
    fractionalizationVault = await upgrades.deployProxy(
      FractionalizationVault,
      [],
      { initializer: "initialize" }
    ) as unknown as FractionalizationVault;
    await fractionalizationVault.waitForDeployment();

    // Deploy RoyaltyDistributor
    const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributorV2");
    royaltyDistributor = await RoyaltyDistributor.deploy();
    await royaltyDistributor.waitForDeployment();

    // Deploy IPBond
    const IPBond = await ethers.getContractFactory("IPBond");
    ipBond = await upgrades.deployProxy(
      IPBond,
      [],
      { initializer: "initialize" }
    ) as unknown as IPBond;
    await ipBond.waitForDeployment();

    // Deploy Governance Token
    const GovernanceToken = await ethers.getContractFactory("KnowTonToken");
    governanceToken = await GovernanceToken.deploy(ethers.parseEther("20000")); // Initial supply to owner
    await governanceToken.waitForDeployment();

    // Transfer tokens to investors
    await governanceToken.transfer(investor1.address, ethers.parseEther("5000"));
    await governanceToken.transfer(investor2.address, ethers.parseEther("3000"));

    // Delegate voting power
    await governanceToken.connect(owner).delegate(owner.address);
    await governanceToken.connect(investor1).delegate(investor1.address);
    await governanceToken.connect(investor2).delegate(investor2.address);

    // Deploy Timelock
    const TimelockFactory = await ethers.getContractFactory("TimelockController");
    timelock = await TimelockFactory.deploy(
      3600, // 1 hour delay
      [],
      [],
      owner.address
    );

    // Deploy Governance
    const DAOGovernance = await ethers.getContractFactory("KnowTonGovernance");
    governance = await DAOGovernance.deploy(
      await governanceToken.getAddress(),
      await timelock.getAddress(),
      ethers.parseEther("100") // stake amount
    );
    await governance.waitForDeployment();

    // Grant roles
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    await timelock.grantRole(PROPOSER_ROLE, await governance.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE, await governance.getAddress());

    // Deploy mock lending infrastructure
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    usdcToken = await MockERC20Factory.deploy("USD Coin", "USDC", ethers.parseEther("1000000"));

    const MockAavePoolFactory = await ethers.getContractFactory("MockAavePool");
    mockAavePool = await MockAavePoolFactory.deploy();

    const MockAaveOracleFactory = await ethers.getContractFactory("MockAaveOracle");
    mockAaveOracle = await MockAaveOracleFactory.deploy();

    const MockPoolAddressesProviderFactory = await ethers.getContractFactory("MockPoolAddressesProvider");
    mockAddressesProvider = await MockPoolAddressesProviderFactory.deploy(
      await mockAavePool.getAddress(),
      await mockAaveOracle.getAddress()
    );

    const MockNFTOracleFactory = await ethers.getContractFactory("MockNFTOracle");
    mockNFTOracle = await MockNFTOracleFactory.deploy(ethers.parseEther("10000"));

    // Set prices
    await mockAaveOracle.setAssetPrice(await usdcToken.getAddress(), ethers.parseEther("1"));
    await usdcToken.transfer(await mockAavePool.getAddress(), ethers.parseEther("500000"));

    // Deploy LendingAdapter
    const LendingAdapter = await ethers.getContractFactory("LendingAdapter");
    lendingAdapter = await LendingAdapter.deploy(
      await mockAavePool.getAddress(),
      await mockAddressesProvider.getAddress(),
      await mockNFTOracle.getAddress()
    );
    await lendingAdapter.waitForDeployment();

    // Grant necessary roles
    await ipBond.grantRole(ISSUER_ROLE, owner.address);
  });

  /**
   * Test 1: NFT Minting → Fractionalization Flow
   * 
   * This test verifies the complete flow of:
   * 1. Minting an IP-NFT
   * 2. Fractionalizing the NFT into ERC-20 tokens
   * 3. Distributing fractional tokens to investors
   * 4. Initiating and executing redemption voting
   */
  describe("Flow 1: NFT Minting → Fractionalization", function () {
    it("Should complete full fractionalization flow", async function () {
      // Step 1: Mint IP-NFT
      const mintTx = await copyrightRegistry.registerIP(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      await expect(mintTx)
        .to.emit(copyrightRegistry, "IPRegistered")
        .withArgs(1, creator.address, mockMetadata.contentHash, mockMetadata.aiFingerprint, mockMetadata.category);

      expect(await copyrightRegistry.ownerOf(1)).to.equal(creator.address);

      // Step 2: Approve vault to transfer NFT
      await copyrightRegistry.connect(creator).approve(await fractionalizationVault.getAddress(), 1);

      // Step 3: Fractionalize NFT
      const totalSupply = ethers.parseEther("1000");
      const reservePrice = ethers.parseEther("10");

      const fractTx = await fractionalizationVault.connect(creator).createVault(
        await copyrightRegistry.getAddress(),
        1,
        totalSupply,
        reservePrice,
        "Fractional IP-NFT",
        "fIPNFT"
      );

      await expect(fractTx)
        .to.emit(fractionalizationVault, "VaultCreated")
        .withArgs(1, await copyrightRegistry.getAddress(), 1, creator.address, totalSupply);

      // Verify NFT transferred to vault
      expect(await copyrightRegistry.ownerOf(1)).to.equal(await fractionalizationVault.getAddress());

      // Verify fractional tokens minted
      expect(await fractionalizationVault.balanceOf(creator.address)).to.equal(totalSupply);

      // Step 4: Distribute tokens to investors
      await fractionalizationVault.connect(creator).transfer(investor1.address, ethers.parseEther("400"));
      await fractionalizationVault.connect(creator).transfer(investor2.address, ethers.parseEther("300"));

      expect(await fractionalizationVault.balanceOf(investor1.address)).to.equal(ethers.parseEther("400"));
      expect(await fractionalizationVault.balanceOf(investor2.address)).to.equal(ethers.parseEther("300"));
      expect(await fractionalizationVault.balanceOf(creator.address)).to.equal(ethers.parseEther("300"));

      // Step 5: Start redemption voting
      await fractionalizationVault.connect(creator).startRedeemVoting(1);

      const [, , , state] = await fractionalizationVault.getVaultInfo(1);
      expect(state).to.equal(2); // RedeemVoting

      // Step 6: Vote on redemption
      await fractionalizationVault.connect(investor1).vote(1, true);
      await fractionalizationVault.connect(investor2).vote(1, true);
      await fractionalizationVault.connect(creator).vote(1, false);

      const [, yesVotes, noVotes] = await fractionalizationVault.getVotingInfo(1);
      expect(yesVotes).to.equal(ethers.parseEther("700")); // 400 + 300
      expect(noVotes).to.equal(ethers.parseEther("300"));

      // Step 7: Fast forward time to end voting period
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
      await ethers.provider.send("evm_mine", []);

      // Step 8: Execute redemption
      const redeemTx = await fractionalizationVault.connect(buyer).executeRedeem(1, { value: reservePrice });

      await expect(redeemTx)
        .to.emit(fractionalizationVault, "VaultRedeemed")
        .withArgs(1, buyer.address);

      // Verify NFT transferred to redeemer
      expect(await copyrightRegistry.ownerOf(1)).to.equal(buyer.address);

      // Verify vault state
      const [, , , finalState] = await fractionalizationVault.getVaultInfo(1);
      expect(finalState).to.equal(3); // Redeemed
    });
  });

  /**
   * Test 2: NFT Minting → Collateral → Lending Flow
   * 
   * This test verifies the complete flow of:
   * 1. Minting an IP-NFT
   * 2. Using NFT as collateral
   * 3. Borrowing against the NFT
   * 4. Repaying the loan
   */
  describe("Flow 2: NFT Minting → Collateral → Lending", function () {
    it("Should complete full lending flow", async function () {
      // Step 1: Mint IP-NFT
      await copyrightRegistry.registerIP(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      expect(await copyrightRegistry.ownerOf(1)).to.equal(creator.address);

      // Step 2: Approve lending adapter to manage NFT
      await copyrightRegistry.connect(creator).approve(await lendingAdapter.getAddress(), 1);

      // Step 3: Supply NFT as collateral
      const supplyTx = await lendingAdapter.connect(creator).supplyNFTCollateral(
        await copyrightRegistry.getAddress(),
        1
      );

      await expect(supplyTx)
        .to.emit(lendingAdapter, "NFTCollateralSupplied")
        .withArgs(creator.address, await copyrightRegistry.getAddress(), 1);

      // Verify NFT transferred to lending adapter
      expect(await copyrightRegistry.ownerOf(1)).to.equal(await lendingAdapter.getAddress());

      // Step 4: Get NFT valuation and calculate max borrow
      const valuation = await mockNFTOracle.getNFTValuation(await copyrightRegistry.getAddress(), 1);
      expect(valuation).to.equal(ethers.parseEther("10000"));

      const maxBorrow = await lendingAdapter.getMaxBorrowAmount(
        await copyrightRegistry.getAddress(),
        1,
        await usdcToken.getAddress()
      );

      // Max borrow should be ~50% of valuation (LTV ratio)
      expect(maxBorrow).to.be.closeTo(ethers.parseEther("5000"), ethers.parseEther("100"));

      // Step 5: Borrow USDC against NFT
      const borrowAmount = ethers.parseEther("4000");
      const borrowTx = await lendingAdapter.connect(creator).borrowAgainstNFT(
        await copyrightRegistry.getAddress(),
        1,
        await usdcToken.getAddress(),
        borrowAmount
      );

      await expect(borrowTx)
        .to.emit(lendingAdapter, "BorrowedAgainstNFT")
        .withArgs(creator.address, await copyrightRegistry.getAddress(), 1, await usdcToken.getAddress(), borrowAmount);

      // Verify creator received USDC
      expect(await usdcToken.balanceOf(creator.address)).to.equal(borrowAmount);

      // Step 6: Check health factor
      const healthFactor = await lendingAdapter.getHealthFactor(
        await copyrightRegistry.getAddress(),
        1
      );

      // Health factor should be > 1 (healthy position)
      expect(healthFactor).to.be.gt(ethers.parseEther("1"));

      // Step 7: Repay loan
      await usdcToken.connect(creator).approve(await lendingAdapter.getAddress(), borrowAmount);

      const repayTx = await lendingAdapter.connect(creator).repayNFTLoan(
        await copyrightRegistry.getAddress(),
        1,
        await usdcToken.getAddress(),
        borrowAmount
      );

      await expect(repayTx)
        .to.emit(lendingAdapter, "LoanRepaid")
        .withArgs(creator.address, await copyrightRegistry.getAddress(), 1, await usdcToken.getAddress(), borrowAmount);

      // Step 8: Withdraw NFT collateral
      const withdrawTx = await lendingAdapter.connect(creator).withdrawNFTCollateral(
        await copyrightRegistry.getAddress(),
        1
      );

      await expect(withdrawTx)
        .to.emit(lendingAdapter, "NFTCollateralWithdrawn")
        .withArgs(creator.address, await copyrightRegistry.getAddress(), 1);

      // Verify NFT returned to creator
      expect(await copyrightRegistry.ownerOf(1)).to.equal(creator.address);
    });
  });

  /**
   * Test 3: NFT Minting → Bond Issuance Flow
   * 
   * This test verifies the complete flow of:
   * 1. Minting an IP-NFT
   * 2. Issuing a bond backed by the NFT
   * 3. Investors purchasing bond tranches
   * 4. Distributing returns to investors
   */
  describe("Flow 3: NFT Minting → Bond Issuance", function () {
    it("Should complete full bond issuance flow", async function () {
      // Step 1: Mint IP-NFT
      await copyrightRegistry.registerIP(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      expect(await copyrightRegistry.ownerOf(1)).to.equal(creator.address);

      // Step 2: Issue bond backed by NFT
      const totalValue = ethers.parseEther("100");
      const block = await ethers.provider.getBlock("latest");
      const maturityDate = block!.timestamp + 365 * 24 * 60 * 60; // 1 year
      const seniorAPY = 500; // 5%
      const mezzanineAPY = 1000; // 10%
      const juniorAPY = 2000; // 20%

      const issueTx = await ipBond.issueBond(
        await copyrightRegistry.getAddress(),
        1,
        totalValue,
        maturityDate,
        seniorAPY,
        mezzanineAPY,
        juniorAPY
      );

      await expect(issueTx)
        .to.emit(ipBond, "BondIssued")
        .withArgs(1, owner.address, await copyrightRegistry.getAddress(), 1, totalValue, maturityDate);

      // Verify bond info
      const bondInfo = await ipBond.getBondInfo(1);
      expect(bondInfo.nftContract).to.equal(await copyrightRegistry.getAddress());
      expect(bondInfo.tokenId).to.equal(1);
      expect(bondInfo.totalValue).to.equal(totalValue);
      expect(bondInfo.status).to.equal(0); // Active

      // Step 3: Verify tranche allocations
      const seniorInfo = await ipBond.getTrancheInfo(1, 0);
      const mezzanineInfo = await ipBond.getTrancheInfo(1, 1);
      const juniorInfo = await ipBond.getTrancheInfo(1, 2);

      expect(seniorInfo.allocation).to.equal(ethers.parseEther("50")); // 50%
      expect(mezzanineInfo.allocation).to.equal(ethers.parseEther("33")); // 33%
      expect(juniorInfo.allocation).to.equal(ethers.parseEther("17")); // 17%

      expect(seniorInfo.apy).to.equal(seniorAPY);
      expect(mezzanineInfo.apy).to.equal(mezzanineAPY);
      expect(juniorInfo.apy).to.equal(juniorAPY);

      // Step 4: Investors purchase bond tranches
      const seniorInvestment = ethers.parseEther("20");
      const mezzanineInvestment = ethers.parseEther("15");
      const juniorInvestment = ethers.parseEther("10");

      await ipBond.connect(investor1).invest(1, 0, { value: seniorInvestment }); // Senior
      await ipBond.connect(investor2).invest(1, 1, { value: mezzanineInvestment }); // Mezzanine
      await ipBond.connect(creator).invest(1, 2, { value: juniorInvestment }); // Junior

      // Verify investments
      const investor1Position = await ipBond.getInvestorPosition(1, 0, investor1.address);
      const investor2Position = await ipBond.getInvestorPosition(1, 1, investor2.address);
      const creatorPosition = await ipBond.getInvestorPosition(1, 2, creator.address);

      expect(investor1Position).to.equal(seniorInvestment);
      expect(investor2Position).to.equal(mezzanineInvestment);
      expect(creatorPosition).to.equal(juniorInvestment);

      // Step 5: Simulate revenue generation and distribution
      const revenue = ethers.parseEther("10");
      await ipBond.distributeRevenue(1, { value: revenue });

      // Step 6: Fast forward to maturity
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      // Step 7: Mature the bond
      await ipBond.matureBond(1);

      const finalBondInfo = await ipBond.getBondInfo(1);
      expect(finalBondInfo.status).to.equal(1); // Matured

      // Step 8: Investors claim returns
      const investor1BalanceBefore = await ethers.provider.getBalance(investor1.address);
      const claimTx1 = await ipBond.connect(investor1).claimReturns(1, 0);
      const receipt1 = await claimTx1.wait();
      const gasUsed1 = receipt1!.gasUsed * receipt1!.gasPrice;
      const investor1BalanceAfter = await ethers.provider.getBalance(investor1.address);

      // Investor should receive principal + interest
      const expectedReturn1 = seniorInvestment + (seniorInvestment * BigInt(seniorAPY) / BigInt(10000));
      expect(investor1BalanceAfter - investor1BalanceBefore + gasUsed1).to.be.closeTo(
        expectedReturn1,
        ethers.parseEther("0.1")
      );
    });
  });

  /**
   * Test 4: Royalty Distribution → Withdrawal Flow
   * 
   * This test verifies the complete flow of:
   * 1. Minting an IP-NFT
   * 2. Configuring royalty beneficiaries
   * 3. Distributing royalty payments
   * 4. Beneficiaries withdrawing their share
   */
  describe("Flow 4: Royalty Distribution → Withdrawal", function () {
    it("Should complete full royalty distribution flow", async function () {
      // Step 1: Mint IP-NFT
      await copyrightRegistry.registerIP(
        creator.address,
        mockMetadata.metadataURI,
        mockMetadata.contentHash,
        mockMetadata.aiFingerprint,
        mockMetadata.category,
        mockMetadata.royaltyPercentage
      );

      const tokenId = 1;

      // Step 2: Configure royalty split
      const beneficiaries = [
        { recipient: creator.address, percentage: 7000 }, // 70%
        { recipient: investor1.address, percentage: 2000 }, // 20%
        { recipient: investor2.address, percentage: 1000 }, // 10%
      ];

      const configTx = await royaltyDistributor.configureRoyalty(tokenId, beneficiaries);

      await expect(configTx)
        .to.emit(royaltyDistributor, "RoyaltyConfigured")
        .withArgs(tokenId, beneficiaries.length);

      // Verify configuration
      const [configBeneficiaries, , isActive] = await royaltyDistributor.getRoyaltyConfig(tokenId);
      expect(configBeneficiaries.length).to.equal(3);
      expect(isActive).to.be.true;

      // Step 3: Simulate NFT sale and distribute royalty
      const salePrice = ethers.parseEther("10");
      const royaltyAmount = ethers.parseEther("1"); // 10% royalty

      const distributeTx = await royaltyDistributor.connect(buyer).distributeRoyalty(tokenId, {
        value: royaltyAmount,
      });

      await expect(distributeTx)
        .to.emit(royaltyDistributor, "RoyaltyDistributed")
        .withArgs(tokenId, royaltyAmount, buyer.address);

      // Step 4: Verify pending withdrawals
      const creatorPending = await royaltyDistributor.getPendingWithdrawal(tokenId, creator.address);
      const investor1Pending = await royaltyDistributor.getPendingWithdrawal(tokenId, investor1.address);
      const investor2Pending = await royaltyDistributor.getPendingWithdrawal(tokenId, investor2.address);

      expect(creatorPending).to.equal(ethers.parseEther("0.7")); // 70%
      expect(investor1Pending).to.equal(ethers.parseEther("0.2")); // 20%
      expect(investor2Pending).to.equal(ethers.parseEther("0.1")); // 10%

      // Step 5: Beneficiaries withdraw their share
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      const withdrawTx = await royaltyDistributor.connect(creator).withdraw(tokenId);
      const receipt = await withdrawTx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);

      await expect(withdrawTx)
        .to.emit(royaltyDistributor, "RoyaltyWithdrawn")
        .withArgs(creator.address, ethers.parseEther("0.7"));

      expect(creatorBalanceAfter - creatorBalanceBefore + gasUsed).to.equal(ethers.parseEther("0.7"));

      // Verify pending cleared
      const creatorPendingAfter = await royaltyDistributor.getPendingWithdrawal(tokenId, creator.address);
      expect(creatorPendingAfter).to.equal(0);

      // Step 6: Multiple distributions
      await royaltyDistributor.connect(buyer).distributeRoyalty(tokenId, {
        value: ethers.parseEther("2"),
      });

      await royaltyDistributor.connect(buyer).distributeRoyalty(tokenId, {
        value: ethers.parseEther("1.5"),
      });

      // Step 7: Batch withdraw
      const investor1BalanceBefore = await ethers.provider.getBalance(investor1.address);
      const batchWithdrawTx = await royaltyDistributor.connect(investor1).batchWithdraw([tokenId]);
      const batchReceipt = await batchWithdrawTx.wait();
      const batchGasUsed = batchReceipt!.gasUsed * batchReceipt!.gasPrice;
      const investor1BalanceAfter = await ethers.provider.getBalance(investor1.address);

      // Total distributed: 1 + 2 + 1.5 = 4.5 ETH
      // Investor1 share: 20% of 4.5 = 0.9 ETH (but already withdrew 0.2 from first distribution)
      // New amount: 20% of (2 + 1.5) = 0.7 ETH
      const expectedWithdrawal = ethers.parseEther("0.7");
      expect(investor1BalanceAfter - investor1BalanceBefore + batchGasUsed).to.be.closeTo(
        expectedWithdrawal,
        ethers.parseEther("0.01")
      );

      // Step 8: Verify total earned tracking
      const totalEarned = await royaltyDistributor.getTotalEarned(investor1.address);
      expect(totalEarned).to.be.closeTo(ethers.parseEther("0.9"), ethers.parseEther("0.01"));
    });
  });

  /**
   * Test 5: Governance Proposal → Voting → Execution Flow
   * 
   * This test verifies the complete flow of:
   * 1. Creating a governance proposal
   * 2. Token holders voting on the proposal
   * 3. Queuing the proposal in timelock
   * 4. Executing the proposal
   */
  describe("Flow 5: Governance Proposal → Voting → Execution", function () {
    it("Should complete full governance flow", async function () {
      // Step 1: Create a proposal to mint new governance tokens
      const targets = [await governanceToken.getAddress()];
      const values = [0];
      const calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          investor1.address,
          ethers.parseEther("1000"),
        ]),
      ];
      const description = "Mint 1000 tokens to investor1 for community contribution";

      const proposeTx = await governance.propose(targets, values, calldatas, description);
      const proposeReceipt = await proposeTx.wait();

      // Extract proposal ID from event
      const proposeEvent = proposeReceipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ProposalCreated"
      );
      const proposalId = proposeEvent!.args![0];

      // Step 2: Wait for voting delay
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []); // Mine 2 blocks to pass voting delay

      // Step 3: Cast votes
      const voteTx1 = await governance.connect(owner).castVote(proposalId, 1); // For
      await expect(voteTx1)
        .to.emit(governance, "VoteCast")
        .withArgs(owner.address, proposalId, 1, ethers.parseEther("10000"), "");

      await governance.connect(investor1).castVote(proposalId, 1); // For
      await governance.connect(investor2).castVote(proposalId, 0); // Against

      // Step 4: Wait for voting period to end
      for (let i = 0; i < 50401; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Step 5: Check proposal state
      const state = await governance.state(proposalId);
      expect(state).to.equal(4); // Succeeded

      // Step 6: Queue the proposal
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
      const queueTx = await governance.queue(targets, values, calldatas, descriptionHash);

      await expect(queueTx).to.emit(governance, "ProposalQueued").withArgs(proposalId, anyValue);

      // Step 7: Wait for timelock delay
      await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
      await ethers.provider.send("evm_mine", []);

      // Step 8: Execute the proposal
      const executeTx = await governance.execute(targets, values, calldatas, descriptionHash);

      await expect(executeTx).to.emit(governance, "ProposalExecuted").withArgs(proposalId);

      // Step 9: Verify execution result
      const investor1Balance = await governanceToken.balanceOf(investor1.address);
      expect(investor1Balance).to.equal(ethers.parseEther("6000")); // 5000 initial + 1000 minted

      // Verify proposal state is executed
      const finalState = await governance.state(proposalId);
      expect(finalState).to.equal(7); // Executed
    });

    it("Should reject proposal with insufficient votes", async function () {
      // Create proposal with only investor2 voting (not enough for quorum)
      const targets = [await governanceToken.getAddress()];
      const values = [0];
      const calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          investor2.address,
          ethers.parseEther("500"),
        ]),
      ];
      const description = "Mint 500 tokens to investor2";

      const proposeTx = await governance.propose(targets, values, calldatas, description);
      const proposeReceipt = await proposeTx.wait();
      const proposeEvent = proposeReceipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ProposalCreated"
      );
      const proposalId = proposeEvent!.args![0];

      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_mine", []);

      // Only investor2 votes (3000 tokens, not enough for quorum)
      await governance.connect(investor2).castVote(proposalId, 1);

      for (let i = 0; i < 50401; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      // Proposal should be defeated
      const state = await governance.state(proposalId);
      expect(state).to.equal(3); // Defeated
    });

    it("Should allow proposal cancellation", async function () {
      const targets = [await governanceToken.getAddress()];
      const values = [0];
      const calldatas = [
        governanceToken.interface.encodeFunctionData("mint", [
          investor1.address,
          ethers.parseEther("100"),
        ]),
      ];
      const description = "Mint 100 tokens - to be cancelled";

      const proposeTx = await governance.propose(targets, values, calldatas, description);
      const proposeReceipt = await proposeTx.wait();
      const proposeEvent = proposeReceipt!.logs.find(
        (log: any) => log.fragment && log.fragment.name === "ProposalCreated"
      );
      const proposalId = proposeEvent!.args![0];

      // Cancel proposal
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));
      const cancelTx = await governance.cancel(targets, values, calldatas, descriptionHash);

      await expect(cancelTx).to.emit(governance, "ProposalCanceled").withArgs(proposalId);

      const state = await governance.state(proposalId);
      expect(state).to.equal(2); // Canceled
    });
  });
});

// Helper function for anyValue matcher
function anyValue() {
  return true;
}
