import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Deploying EnterpriseLicensing contract...');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  // Deploy EnterpriseLicensing
  const EnterpriseLicensing = await ethers.getContractFactory('EnterpriseLicensing');
  const enterpriseLicensing = await EnterpriseLicensing.deploy();
  await enterpriseLicensing.waitForDeployment();

  const address = await enterpriseLicensing.getAddress();
  console.log('EnterpriseLicensing deployed to:', address);

  // Save deployment info
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    contractAddress: address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `enterprise-licensing-${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log('Deployment info saved to:', filepath);

  // Also save as latest
  const latestFilepath = path.join(deploymentsDir, `enterprise-licensing-${network.name}-latest.json`);
  fs.writeFileSync(latestFilepath, JSON.stringify(deploymentInfo, null, 2));
  console.log('Latest deployment info saved to:', latestFilepath);

  // Wait for a few block confirmations
  console.log('Waiting for block confirmations...');
  await enterpriseLicensing.deploymentTransaction()?.wait(5);
  console.log('Contract deployment confirmed!');

  // Verify contract on Etherscan (if not local network)
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('\nVerifying contract on Etherscan...');
    console.log('Run the following command to verify:');
    console.log(
      `npx hardhat verify --network ${network.name} ${address}`
    );
  }

  console.log('\n=== Deployment Summary ===');
  console.log('Network:', network.name);
  console.log('Chain ID:', network.chainId);
  console.log('Contract Address:', address);
  console.log('Deployer:', deployer.address);
  console.log('Block Number:', deploymentInfo.blockNumber);
  console.log('========================\n');

  // Test basic functionality
  console.log('Testing basic functionality...');
  
  // Check if contract is pausable
  const isPaused = await enterpriseLicensing.paused();
  console.log('Contract paused:', isPaused);

  // Check owner
  const owner = await enterpriseLicensing.owner();
  console.log('Contract owner:', owner);
  console.log('Owner matches deployer:', owner === deployer.address);

  console.log('\nDeployment completed successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
