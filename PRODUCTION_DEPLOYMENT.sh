#!/bin/bash
# KnowTon Production Deployment Script

set -e

echo "🚀 KnowTon Production Deployment"
echo "=================================="
echo ""

# 1. Deploy Smart Contracts
echo "📝 Step 1: Deploying Smart Contracts to Arbitrum Sepolia..."
cd packages/contracts
npx hardhat run scripts/deploy.ts --network arbitrumSepolia
CONTRACT_ADDRESSES=$(cat deployments/arbitrum-sepolia.json)
cd ../..

# 2. Build Docker Images
echo "🐳 Step 2: Building Docker Images..."
docker build -t knowton/backend:latest packages/backend
docker build -t knowton/frontend:latest packages/frontend
docker build -t knowton/oracle-adapter:latest packages/oracle-adapter

# 3. Push to Registry
echo "📤 Step 3: Pushing to Container Registry..."
docker tag knowton/backend:latest ghcr.io/knowton/backend:latest
docker tag knowton/frontend:latest ghcr.io/knowton/frontend:latest
docker tag knowton/oracle-adapter:latest ghcr.io/knowton/oracle-adapter:latest

docker push ghcr.io/knowton/backend:latest
docker push ghcr.io/knowton/frontend:latest
docker push ghcr.io/knowton/oracle-adapter:latest

# 4. Deploy to Kubernetes
echo "☸️  Step 4: Deploying to Kubernetes..."
kubectl create namespace knowton-prod --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic knowton-secrets \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=private-key="$PRIVATE_KEY" \
  --namespace knowton-prod \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/prod/ -n knowton-prod

# 5. Wait for deployment
echo "⏳ Step 5: Waiting for deployment..."
kubectl wait --for=condition=available --timeout=300s deployment/backend -n knowton-prod
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n knowton-prod

# 6. Run migrations
echo "🗄️  Step 6: Running database migrations..."
kubectl exec -it deployment/backend -n knowton-prod -- npx prisma migrate deploy

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Services:"
echo "  Frontend: https://app.knowton.io"
echo "  Backend API: https://api.knowton.io"
echo "  Monitoring: https://grafana.knowton.io"
echo ""
