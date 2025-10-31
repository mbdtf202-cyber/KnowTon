#!/bin/bash

set -e

echo "🧪 Testing Local Deployment"
echo "==========================="
echo ""

# Start local node in background
echo "🔧 Starting local Hardhat node..."
npx hardhat node > /dev/null 2>&1 &
NODE_PID=$!

# Wait for node to start
sleep 3

echo "✅ Local node started (PID: $NODE_PID)"
echo ""

# Deploy contracts
echo "🚀 Deploying contracts to local network..."
npx hardhat run scripts/deploy.ts --network localhost

echo ""
echo "🛑 Stopping local node..."
kill $NODE_PID

echo ""
echo "✅ Local deployment test complete!"
