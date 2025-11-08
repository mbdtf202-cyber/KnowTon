import { ethers } from 'hardhat';

async function main() {
  console.log('Deploying KnowTon Governance System...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // Configuration
  const INITIAL_SUPPLY = ethers.parseEther('10000000'); // 10M tokens
  const PROPOSAL_STAKE = ethers.parseEther('5000'); // 5000 tokens required to stake

  // 1. Deploy Governance Token
  console.log('1. Deploying KnowTonToken...');
  const TokenFactory = await ethers.getContractFactory('KnowTonToken');
  const token = await TokenFactory.deploy(INITIAL_SUPPLY);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log('   ✓ KnowTonToken deployed to:', tokenAddress);
  console.log('   ✓ Initial supply:', ethers.formatEther(INITIAL_SUPPLY), 'KNOW\n');

  // 2. Deploy Timelock
  console.log('2. Deploying KnowTonTimelock...');
  const TimelockFactory = await ethers.getContractFactory('KnowTonTimelock');
  const timelock = await TimelockFactory.deploy(
    [], // proposers (will be set to governance contract)
    [], // executors (will be set to governance contract)
    deployer.address // admin (can renounce after setup)
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log('   ✓ KnowTonTimelock deployed to:', timelockAddress);
  console.log('   ✓ Minimum delay: 48 hours\n');

  // 3. Deploy Governance
  console.log('3. Deploying KnowTonGovernance...');
  const GovernanceFactory = await ethers.getContractFactory('KnowTonGovernance');
  const governance = await GovernanceFactory.deploy(
    tokenAddress,
    timelockAddress,
    PROPOSAL_STAKE
  );
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log('   ✓ KnowTonGovernance deployed to:', governanceAddress);
  console.log('   ✓ Proposal stake:', ethers.formatEther(PROPOSAL_STAKE), 'KNOW\n');

  // 4. Setup Timelock Roles
  console.log('4. Setting up Timelock roles...');
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

  // Grant roles to governance contract
  await timelock.grantRole(PROPOSER_ROLE, governanceAddress);
  console.log('   ✓ Granted PROPOSER_ROLE to governance');
  
  await timelock.grantRole(EXECUTOR_ROLE, governanceAddress);
  console.log('   ✓ Granted EXECUTOR_ROLE to governance');
  
  await timelock.grantRole(CANCELLER_ROLE, governanceAddress);
  console.log('   ✓ Granted CANCELLER_ROLE to governance');

  // Optional: Renounce admin role for full decentralization
  // await timelock.renounceRole(ADMIN_ROLE, deployer.address);
  // console.log('   ✓ Renounced ADMIN_ROLE (fully decentralized)');
  console.log('   ⚠ ADMIN_ROLE retained by deployer (renounce for full decentralization)\n');

  // 5. Transfer ownership of token to timelock (optional, for full DAO control)
  console.log('5. Transferring token ownership...');
  await token.transferOwnership(timelockAddress);
  console.log('   ✓ Token ownership transferred to Timelock\n');

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Deployment Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('KnowTonToken:      ', tokenAddress);
  console.log('KnowTonTimelock:   ', timelockAddress);
  console.log('KnowTonGovernance: ', governanceAddress);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nNext Steps:');
  console.log('1. Distribute KNOW tokens to community members');
  console.log('2. Users must delegate voting power to themselves or others');
  console.log('3. Create proposals through the governance contract');
  console.log('4. Vote on proposals (quadratic voting enabled)');
  console.log('5. Execute passed proposals after 48-hour timelock\n');

  // Save deployment addresses
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      KnowTonToken: tokenAddress,
      KnowTonTimelock: timelockAddress,
      KnowTonGovernance: governanceAddress,
    },
    config: {
      initialSupply: ethers.formatEther(INITIAL_SUPPLY),
      proposalStake: ethers.formatEther(PROPOSAL_STAKE),
      timelockDelay: '48 hours',
      votingDelay: '1 block',
      votingPeriod: '~1 week (50400 blocks)',
      quorum: '4%',
    },
    timestamp: new Date().toISOString(),
  };

  console.log('\nDeployment configuration saved:');
  console.log(JSON.stringify(deployment, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
