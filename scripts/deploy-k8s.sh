#!/bin/bash

set -e

NAMESPACE="knowton-dev"
CONTEXT="minikube"

echo "Deploying KnowTon platform to Kubernetes..."

# Set context
kubectl config use-context $CONTEXT

# Create namespace
echo "Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy infrastructure
echo "Deploying infrastructure components..."
kubectl apply -f k8s/dev/postgres.yaml
kubectl apply -f k8s/dev/redis.yaml
kubectl apply -f k8s/dev/mongodb.yaml
kubectl apply -f k8s/dev/clickhouse.yaml
kubectl apply -f k8s/dev/kafka.yaml
kubectl apply -f k8s/dev/elasticsearch.yaml

# Wait for infrastructure to be ready
echo "Waiting for infrastructure to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n $NAMESPACE --timeout=300s

# Deploy ConfigMaps and Secrets
echo "Deploying ConfigMaps and Secrets..."
kubectl apply -f k8s/dev/configmap.yaml
kubectl apply -f k8s/dev/contract-addresses-configmap.yaml
kubectl apply -f k8s/dev/secrets-template.yaml

# Deploy backend services
echo "Deploying backend services..."
kubectl apply -f k8s/dev/backend-deployment.yaml
kubectl apply -f k8s/dev/bonding-deployment.yaml
kubectl apply -f k8s/dev/lending-deployment.yaml
kubectl apply -f k8s/dev/analytics-deployment.yaml
kubectl apply -f k8s/dev/data-sync-deployment.yaml

# Deploy Ingress
echo "Deploying Ingress..."
kubectl apply -f k8s/dev/ingress.yaml

# Wait for services to be ready
echo "Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n $NAMESPACE --timeout=300s

echo "Deployment complete!"
echo ""
echo "Services:"
kubectl get svc -n $NAMESPACE
echo ""
echo "Pods:"
kubectl get pods -n $NAMESPACE
echo ""
echo "Ingress:"
kubectl get ingress -n $NAMESPACE
echo ""
echo "To access the application, add the following to your /etc/hosts:"
echo "$(minikube ip) knowton.local api.knowton.local"
