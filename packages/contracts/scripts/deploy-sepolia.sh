#!/bin/bash

set -e

echo "🚀 Deploying KnowTon Contracts to Arbitrum Sepolia"
echo "=================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Copy .env.example to .env and fill in your values"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in .env"
    exit 1
fi

if [ -z "$ARBITRUM_SEPOLIA_RPC_URL" ]; then
    echo "⚠️  Warning: ARBITRUM_SEPOLIA_RPC_URL not set, using default"
    export ARBITRUM_SEPOLIA_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
fi

echo "📋 Configuration:"
echo "   Network: Arbitrum Sepolia (Chain ID: 421614)"
echo "   RPC: $ARBITRUM_SEPOLIA_RPC_URL"
echo ""

# Compile contracts
echo "🔨 Compiling contracts..."
npm run build
echo ""

# Deploy contracts
echo "🚀 Deploying contracts..."
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
echo ""

# Configure contracts
echo "⚙️  Configuring contracts..."
npx hardhat run scripts/configure-contracts.ts --network arbitrumSepolia
echo ""

# Verify contracts (if API key is set)
if [ -n "$ARBISCAN_API_KEY" ]; then
    echo "⏳ Waiting 30 seconds before verification..."
    sleep 30
    echo ""
    echo "🔍 Verifying contracts on Arbiscan..."
    npm run verify:sepolia || echo "⚠️  Verification failed, retry with: npm run verify:sepolia"
else
    echo "⚠️  ARBISCAN_API_KEY not set, skipping verification"
    echo "   Verify later with: npm run verify:sepolia"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Contract addresses saved to:"
echo "   deployments/arbitrumSepolia-latest.json"
echo ""
