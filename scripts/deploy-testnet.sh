#!/bin/bash

# KnowTon Platform - Testnet Deployment Script
# Deploys smart contracts and services to Arbitrum Sepolia testnet

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "======================================"
echo "  KnowTon Testnet Deployment"
echo "======================================"
echo ""

# Check prerequisites
log_info "Checking prerequisites..."

# Check if .env exists
if [ ! -f ".env" ]; then
    log_error ".env file not found. Please create it from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$ARBITRUM_RPC_URL" ]; then
    log_error "ARBITRUM_RPC_URL not set in .env"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    log_error "PRIVATE_KEY not set in .env"
    exit 1
fi

log_success "Prerequisites check passed"
echo ""

# Phase 1: Deploy Smart Contracts
log_info "Phase 1: Deploying Smart Contracts to Arbitrum Sepolia..."
echo ""

cd packages/contracts

# Compile contracts
log_info "Compiling contracts..."
npx hardhat compile

# Deploy contracts
log_info "Deploying contracts..."
npx hardhat run scripts/deploy.ts --network arbitrumSepolia > ../../deployment-output.txt 2>&1

if [ $? -eq 0 ]; then
    log_success "Contracts deployed successfully"
    cat ../../deployment-output.txt
else
    log_error "Contract deployment failed"
    cat ../../deployment-output.txt
    exit 1
fi

# Extract contract addresses
log_info "Extracting contract addresses..."
COPYRIGHT_REGISTRY=$(grep "CopyrightRegistry deployed to:" ../../deployment-output.txt | awk '{print $NF}')
ROYALTY_DISTRIBUTOR=$(grep "RoyaltyDistributor deployed to:" ../../deployment-output.txt | awk '{print $NF}')
FRACTIONALIZATION=$(grep "FractionalizationVault deployed to:" ../../deployment-output.txt | awk '{print $NF}')
MARKETPLACE=$(grep "Marketplace deployed to:" ../../deployment-output.txt | awk '{print $NF}')
STAKING=$(grep "Staking deployed to:" ../../deployment-output.txt | awk '{print $NF}')
GOVERNANCE=$(grep "Governance deployed to:" ../../deployment-output.txt | awk '{print $NF}')
IP_BOND=$(grep "IPBond deployed to:" ../../deployment-output.txt | awk '{print $NF}')

echo ""
log_info "Contract Addresses:"
echo "  CopyrightRegistry:      $COPYRIGHT_REGISTRY"
echo "  RoyaltyDistributor:     $ROYALTY_DISTRIBUTOR"
echo "  FractionalizationVault: $FRACTIONALIZATION"
echo "  Marketplace:            $MARKETPLACE"
echo "  Staking:                $STAKING"
echo "  Governance:             $GOVERNANCE"
echo "  IPBond:                 $IP_BOND"
echo ""

# Save addresses to file
cat > ../../contract-addresses.json << EOF
{
  "network": "arbitrum-sepolia",
  "chainId": 421614,
  "contracts": {
    "CopyrightRegistry": "$COPYRIGHT_REGISTRY",
    "RoyaltyDistributor": "$ROYALTY_DISTRIBUTOR",
    "FractionalizationVault": "$FRACTIONALIZATION",
    "Marketplace": "$MARKETPLACE",
    "Staking": "$STAKING",
    "Governance": "$GOVERNANCE",
    "IPBond": "$IP_BOND"
  },
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

log_success "Contract addresses saved to contract-addresses.json"

cd ../..

echo ""

# Phase 2: Update Configuration Files
log_info "Phase 2: Updating configuration files..."
echo ""

# Update frontend .env
log_info "Updating frontend configuration..."
cat > packages/frontend/.env.production << EOF
VITE_ARBITRUM_RPC_URL=$ARBITRUM_RPC_URL
VITE_CHAIN_ID=421614
VITE_COPYRIGHT_REGISTRY_ADDRESS=$COPYRIGHT_REGISTRY
VITE_ROYALTY_DISTRIBUTOR_ADDRESS=$ROYALTY_DISTRIBUTOR
VITE_FRACTIONALIZATION_VAULT_ADDRESS=$FRACTIONALIZATION
VITE_MARKETPLACE_ADDRESS=$MARKETPLACE
VITE_STAKING_ADDRESS=$STAKING
VITE_GOVERNANCE_ADDRESS=$GOVERNANCE
VITE_IP_BOND_ADDRESS=$IP_BOND
VITE_BACKEND_API_URL=https://api-testnet.knowton.io
VITE_ORACLE_ADAPTER_URL=https://oracle-testnet.knowton.io
EOF

# Update backend .env
log_info "Updating backend configuration..."
cat > packages/backend/.env.production << EOF
NODE_ENV=production
PORT=3000
ARBITRUM_RPC_URL=$ARBITRUM_RPC_URL
CHAIN_ID=421614
COPYRIGHT_REGISTRY_ADDRESS=$COPYRIGHT_REGISTRY
ROYALTY_DISTRIBUTOR_ADDRESS=$ROYALTY_DISTRIBUTOR
FRACTIONALIZATION_VAULT_ADDRESS=$FRACTIONALIZATION
MARKETPLACE_ADDRESS=$MARKETPLACE
STAKING_ADDRESS=$STAKING
GOVERNANCE_ADDRESS=$GOVERNANCE
IP_BOND_ADDRESS=$IP_BOND
ORACLE_ADAPTER_URL=http://oracle-adapter:8000
BONDING_SERVICE_URL=bonding-service:50051
DATABASE_URL=\${DATABASE_URL}
MONGODB_URI=\${MONGODB_URI}
REDIS_URL=\${REDIS_URL}
KAFKA_BROKERS=\${KAFKA_BROKERS}
EOF

# Update oracle-adapter .env
log_info "Updating oracle-adapter configuration..."
cat > packages/oracle-adapter/.env.production << EOF
ENVIRONMENT=production
ARBITRUM_RPC_URL=$ARBITRUM_RPC_URL
CHAINLINK_ORACLE_ADDRESS=\${CHAINLINK_ORACLE_ADDRESS}
ORACLE_PRIVATE_KEY=\${ORACLE_PRIVATE_KEY}
COPYRIGHT_REGISTRY_ADDRESS=$COPYRIGHT_REGISTRY
EOF

# Update bonding-service .env
log_info "Updating bonding-service configuration..."
cat > packages/bonding-service/.env.production << EOF
ENVIRONMENT=production
ARBITRUM_RPC_URL=$ARBITRUM_RPC_URL
IP_BOND_ADDRESS=$IP_BOND
PRIVATE_KEY=\${PRIVATE_KEY}
ORACLE_ADAPTER_URL=http://oracle-adapter:8000
DATABASE_URL=\${DATABASE_URL}
EOF

log_success "Configuration files updated"
echo ""

# Phase 3: Build Docker Images
log_info "Phase 3: Building Docker images..."
echo ""

# Build backend
log_info "Building backend image..."
docker build -t knowton/backend:testnet -f packages/backend/Dockerfile packages/backend

# Build frontend
log_info "Building frontend image..."
docker build -t knowton/frontend:testnet -f packages/frontend/Dockerfile packages/frontend

# Build oracle-adapter
log_info "Building oracle-adapter image..."
docker build -t knowton/oracle-adapter:testnet -f packages/oracle-adapter/Dockerfile packages/oracle-adapter

# Build bonding-service
log_info "Building bonding-service image..."
docker build -t knowton/bonding-service:testnet -f packages/bonding-service/Dockerfile packages/bonding-service

log_success "Docker images built successfully"
echo ""

# Phase 4: Tag and Push Images (optional)
if [ "$PUSH_IMAGES" = "true" ]; then
    log_info "Phase 4: Pushing Docker images to registry..."
    echo ""
    
    REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/knowton"}
    
    docker tag knowton/backend:testnet $REGISTRY/backend:testnet
    docker tag knowton/frontend:testnet $REGISTRY/frontend:testnet
    docker tag knowton/oracle-adapter:testnet $REGISTRY/oracle-adapter:testnet
    docker tag knowton/bonding-service:testnet $REGISTRY/bonding-service:testnet
    
    docker push $REGISTRY/backend:testnet
    docker push $REGISTRY/frontend:testnet
    docker push $REGISTRY/oracle-adapter:testnet
    docker push $REGISTRY/bonding-service:testnet
    
    log_success "Images pushed to registry"
    echo ""
fi

# Phase 5: Deploy to Kubernetes (if enabled)
if [ "$DEPLOY_K8S" = "true" ]; then
    log_info "Phase 5: Deploying to Kubernetes..."
    echo ""
    
    # Create namespace
    kubectl create namespace knowton-testnet --dry-run=client -o yaml | kubectl apply -f -
    
    # Create secrets
    kubectl create secret generic knowton-secrets \
        --from-literal=database-url="$DATABASE_URL" \
        --from-literal=mongodb-uri="$MONGODB_URI" \
        --from-literal=redis-url="$REDIS_URL" \
        --from-literal=private-key="$PRIVATE_KEY" \
        --from-literal=oracle-private-key="$ORACLE_PRIVATE_KEY" \
        --from-literal=pinata-api-key="$PINATA_API_KEY" \
        --from-literal=pinata-secret="$PINATA_SECRET_KEY" \
        --namespace knowton-testnet \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy services
    kubectl apply -f k8s/testnet/ -n knowton-testnet
    
    log_success "Deployed to Kubernetes"
    echo ""
fi

# Summary
echo "======================================"
echo "  Deployment Summary"
echo "======================================"
echo ""
log_success "Testnet deployment completed successfully!"
echo ""
echo "Contract Addresses:"
echo "  CopyrightRegistry:      $COPYRIGHT_REGISTRY"
echo "  RoyaltyDistributor:     $ROYALTY_DISTRIBUTOR"
echo "  FractionalizationVault: $FRACTIONALIZATION"
echo "  Marketplace:            $MARKETPLACE"
echo "  Staking:                $STAKING"
echo "  Governance:             $GOVERNANCE"
echo "  IPBond:                 $IP_BOND"
echo ""
echo "Verify contracts on Arbiscan:"
echo "  https://sepolia.arbiscan.io/address/$COPYRIGHT_REGISTRY"
echo ""
echo "Configuration files created:"
echo "  - packages/frontend/.env.production"
echo "  - packages/backend/.env.production"
echo "  - packages/oracle-adapter/.env.production"
echo "  - packages/bonding-service/.env.production"
echo "  - contract-addresses.json"
echo ""
echo "Next steps:"
echo "  1. Verify contracts on Arbiscan"
echo "  2. Test contract interactions"
echo "  3. Deploy services to testnet environment"
echo "  4. Run integration tests"
echo ""
