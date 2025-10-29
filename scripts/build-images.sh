#!/bin/bash

set -e

VERSION=${1:-latest}
REGISTRY="ghcr.io/knowton"

echo "Building Docker images version: $VERSION"

# Build backend image
echo "Building backend service..."
docker build -t $REGISTRY/backend:$VERSION -f packages/backend/Dockerfile packages/backend

# Build frontend image
echo "Building frontend..."
docker build -t $REGISTRY/frontend:$VERSION -f packages/frontend/Dockerfile packages/frontend

# Tag services
echo "Tagging service images..."
docker tag $REGISTRY/backend:$VERSION $REGISTRY/creator-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/content-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/nft-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/royalty-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/marketplace-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/fractionalization-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/staking-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/governance-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/bonding-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/lending-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/analytics-service:$VERSION
docker tag $REGISTRY/backend:$VERSION $REGISTRY/data-sync-service:$VERSION

echo "Build complete!"
echo ""
echo "To push images to registry, run:"
echo "docker push $REGISTRY/backend:$VERSION"
echo "docker push $REGISTRY/frontend:$VERSION"
echo "# ... and other service images"
