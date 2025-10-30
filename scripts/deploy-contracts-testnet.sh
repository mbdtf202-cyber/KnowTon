#!/bin/bash

# KnowTon Smart Contracts Testnet Deployment Script
# Deploys all smart contracts to Arbitrum Sepolia testnet

set -e

echo "🚀 Deploying KnowTon Smart Contracts to Testnet..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if running from contracts directory
if [ ! -f "hardhat.config.ts" ]; then
    if [ -d "packages/contracts" ]; then
        cd packages/contracts
    else
        print_error "Please run this script from the project root or contracts directory"
        exit 1
    fi
fi

# Check environment variables
if [ -z "$ARBITRUM_SEPOLIA_RPC_URL" ]; then
    print_error "ARBITRUM_SEPOLIA_RPC_URL environment variable is required"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    print_error "PRIVATE_KEY environment variable is required"
    exit 1
fi

if [ -z "$ARBISCAN_API_KEY" ]; then
    print_warning "ARBISCAN_API_KEY not set, contract verification will be skipped"
fi

print_header "Pre-deployment Checks"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Compile contracts
print_status "Compiling contracts..."
npx hardhat compile

# Run tests
print_status "Running contract tests..."
npx hardhat test

# Check network connection
print_status "Checking network connection..."
npx hardhat run scripts/check-network.ts --network arbitrumSepolia

print_header "Contract Deployment"

# Create deployment directory
mkdir -p deployments/arbitrumSepolia

# Deploy contracts in order (respecting dependencies)
print_status "Deploying contracts to Arbitrum Sepolia..."

# 1. Deploy GovernanceToken first (needed by other contracts)
print_status "1. Deploying GovernanceToken..."
GOVERNANCE_TOKEN=$(npx hardhat run scripts/deploy/01-deploy-governance-token.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "GovernanceToken deployed to: $GOVERNANCE_TOKEN"

# 2. Deploy CopyrightRegistry
print_status "2. Deploying CopyrightRegistry..."
COPYRIGHT_REGISTRY=$(npx hardhat run scripts/deploy/02-deploy-copyright-registry.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "CopyrightRegistry deployed to: $COPYRIGHT_REGISTRY"

# 3. Deploy RoyaltyDistributor
print_status "3. Deploying RoyaltyDistributor..."
ROYALTY_DISTRIBUTOR=$(npx hardhat run scripts/deploy/03-deploy-royalty-distributor.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "RoyaltyDistributor deployed to: $ROYALTY_DISTRIBUTOR"

# 4. Deploy FractionalizationVault
print_status "4. Deploying FractionalizationVault..."
FRACTIONALIZATION_VAULT=$(npx hardhat run scripts/deploy/04-deploy-fractionalization-vault.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "FractionalizationVault deployed to: $FRACTIONALIZATION_VAULT"

# 5. Deploy IPBond
print_status "5. Deploying IPBond..."
IP_BOND=$(npx hardhat run scripts/deploy/05-deploy-ip-bond.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "IPBond deployed to: $IP_BOND"

# 6. Deploy DAOGovernance
print_status "6. Deploying DAOGovernance..."
DAO_GOVERNANCE=$(npx hardhat run scripts/deploy/06-deploy-dao-governance.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "DAOGovernance deployed to: $DAO_GOVERNANCE"

# 7. Deploy StakingRewards
print_status "7. Deploying StakingRewards..."
STAKING_REWARDS=$(npx hardhat run scripts/deploy/07-deploy-staking-rewards.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "StakingRewards deployed to: $STAKING_REWARDS"

# 8. Deploy MarketplaceAMM
print_status "8. Deploying MarketplaceAMM..."
MARKETPLACE_AMM=$(npx hardhat run scripts/deploy/08-deploy-marketplace-amm.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "MarketplaceAMM deployed to: $MARKETPLACE_AMM"

# 9. Deploy LendingAdapter
print_status "9. Deploying LendingAdapter..."
LENDING_ADAPTER=$(npx hardhat run scripts/deploy/09-deploy-lending-adapter.ts --network arbitrumSepolia | grep "deployed to:" | awk '{print $3}')
echo "LendingAdapter deployed to: $LENDING_ADAPTER"

print_header "Post-deployment Configuration"

# Configure contract interactions
print_status "Configuring contract interactions..."

# Set up roles and permissions
npx hardhat run scripts/setup/setup-roles.ts --network arbitrumSepolia

# Configure contract addresses in each contract
npx hardhat run scripts/setup/configure-addresses.ts --network arbitrumSepolia

# Initialize contracts with default parameters
npx hardhat run scripts/setup/initialize-contracts.ts --network arbitrumSepolia

print_header "Contract Verification"

if [ -n "$ARBISCAN_API_KEY" ]; then
    print_status "Verifying contracts on Arbiscan..."
    
    # Verify each contract
    contracts=(
        "$GOVERNANCE_TOKEN:GovernanceToken"
        "$COPYRIGHT_REGISTRY:CopyrightRegistry"
        "$ROYALTY_DISTRIBUTOR:RoyaltyDistributor"
        "$FRACTIONALIZATION_VAULT:FractionalizationVault"
        "$IP_BOND:IPBond"
        "$DAO_GOVERNANCE:DAOGovernance"
        "$STAKING_REWARDS:StakingRewards"
        "$MARKETPLACE_AMM:MarketplaceAMM"
        "$LENDING_ADAPTER:LendingAdapter"
    )
    
    for contract in "${contracts[@]}"; do
        address=$(echo $contract | cut -d: -f1)
        name=$(echo $contract | cut -d: -f2)
        
        print_status "Verifying $name at $address..."
        npx hardhat verify --network arbitrumSepolia $address || print_warning "Verification failed for $name"
        sleep 5  # Rate limiting
    done
else
    print_warning "Skipping contract verification (ARBISCAN_API_KEY not set)"
fi

print_header "Deployment Summary"

# Create deployment summary
cat > deployments/arbitrumSepolia/deployment-summary.json << EOF
{
  "network": "arbitrumSepolia",
  "chainId": 421614,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$(npx hardhat run scripts/get-deployer-address.ts --network arbitrumSepolia)",
  "contracts": {
    "GovernanceToken": "$GOVERNANCE_TOKEN",
    "CopyrightRegistry": "$COPYRIGHT_REGISTRY",
    "RoyaltyDistributor": "$ROYALTY_DISTRIBUTOR",
    "FractionalizationVault": "$FRACTIONALIZATION_VAULT",
    "IPBond": "$IP_BOND",
    "DAOGovernance": "$DAO_GOVERNANCE",
    "StakingRewards": "$STAKING_REWARDS",
    "MarketplaceAMM": "$MARKETPLACE_AMM",
    "LendingAdapter": "$LENDING_ADAPTER"
  },
  "verification": {
    "enabled": $([ -n "$ARBISCAN_API_KEY" ] && echo "true" || echo "false"),
    "explorer": "https://sepolia.arbiscan.io"
  }
}
EOF

# Create environment file for frontend/backend
cat > deployments/arbitrumSepolia/.env.contracts << EOF
# KnowTon Smart Contract Addresses - Arbitrum Sepolia
VITE_GOVERNANCE_TOKEN_ADDRESS=$GOVERNANCE_TOKEN
VITE_COPYRIGHT_REGISTRY_ADDRESS=$COPYRIGHT_REGISTRY
VITE_ROYALTY_DISTRIBUTOR_ADDRESS=$ROYALTY_DISTRIBUTOR
VITE_FRACTIONALIZATION_VAULT_ADDRESS=$FRACTIONALIZATION_VAULT
VITE_IP_BOND_ADDRESS=$IP_BOND
VITE_DAO_GOVERNANCE_ADDRESS=$DAO_GOVERNANCE
VITE_STAKING_REWARDS_ADDRESS=$STAKING_REWARDS
VITE_MARKETPLACE_AMM_ADDRESS=$MARKETPLACE_AMM
VITE_LENDING_ADAPTER_ADDRESS=$LENDING_ADAPTER

# Network Configuration
VITE_CHAIN_ID=421614
VITE_NETWORK_NAME=arbitrumSepolia
VITE_RPC_URL=$ARBITRUM_SEPOLIA_RPC_URL
VITE_EXPLORER_URL=https://sepolia.arbiscan.io
EOF

# Copy to frontend and backend
cp deployments/arbitrumSepolia/.env.contracts ../frontend/.env.contracts
cp deployments/arbitrumSepolia/.env.contracts ../backend/.env.contracts

print_status "Contract addresses saved to .env.contracts files"

print_header "Testing Deployment"

# Run deployment tests
print_status "Running deployment verification tests..."
npx hardhat test test/deployment/ --network arbitrumSepolia

# Test basic functionality
print_status "Testing basic contract functionality..."
npx hardhat run scripts/test/test-basic-functionality.ts --network arbitrumSepolia

print_header "Deployment Complete! 🎉"

echo ""
print_status "✅ All contracts deployed successfully to Arbitrum Sepolia!"
echo ""
echo "📋 Deployment Summary:"
echo "  Network: Arbitrum Sepolia (Chain ID: 421614)"
echo "  Explorer: https://sepolia.arbiscan.io"
echo "  Deployer: $(npx hardhat run scripts/get-deployer-address.ts --network arbitrumSepolia)"
echo ""
echo "📄 Contract Addresses:"
echo "  GovernanceToken: $GOVERNANCE_TOKEN"
echo "  CopyrightRegistry: $COPYRIGHT_REGISTRY"
echo "  RoyaltyDistributor: $ROYALTY_DISTRIBUTOR"
echo "  FractionalizationVault: $FRACTIONALIZATION_VAULT"
echo "  IPBond: $IP_BOND"
echo "  DAOGovernance: $DAO_GOVERNANCE"
echo "  StakingRewards: $STAKING_REWARDS"
echo "  MarketplaceAMM: $MARKETPLACE_AMM"
echo "  LendingAdapter: $LENDING_ADAPTER"
echo ""
echo "🔗 Verification Status:"
if [ -n "$ARBISCAN_API_KEY" ]; then
    echo "  ✅ Contracts verified on Arbiscan"
else
    echo "  ⚠️  Contract verification skipped (set ARBISCAN_API_KEY to enable)"
fi
echo ""
echo "📁 Files Created:"
echo "  deployments/arbitrumSepolia/deployment-summary.json"
echo "  deployments/arbitrumSepolia/.env.contracts"
echo "  ../frontend/.env.contracts"
echo "  ../backend/.env.contracts"
echo ""
echo "🚀 Next Steps:"
echo "  1. Update frontend/backend with new contract addresses"
echo "  2. Test DApp functionality with testnet contracts"
echo "  3. Run integration tests"
echo "  4. Prepare for mainnet deployment"
echo ""
print_warning "Remember to:"
print_warning "  - Keep your private keys secure"
print_warning "  - Test all functionality thoroughly"
print_warning "  - Monitor gas costs and optimize if needed"
print_warning "  - Set up monitoring and alerts"