#!/bin/bash

# Deploy Prometheus and Grafana monitoring stack for KnowTon platform
# This script deploys Prometheus for metrics collection and Grafana for visualization

set -e

echo "=========================================="
echo "Deploying KnowTon Monitoring Stack"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace knowton-dev &> /dev/null; then
    echo -e "${YELLOW}Creating namespace knowton-dev...${NC}"
    kubectl apply -f k8s/dev/namespace.yaml
fi

# Deploy secrets (if not already deployed)
echo -e "${YELLOW}Checking secrets...${NC}"
if ! kubectl get secret knowton-secrets -n knowton-dev &> /dev/null; then
    echo -e "${YELLOW}Creating secrets from template...${NC}"
    kubectl apply -f k8s/dev/secrets-template.yaml
else
    echo -e "${GREEN}Secrets already exist${NC}"
fi

# Deploy Prometheus
echo -e "${YELLOW}Deploying Prometheus...${NC}"
kubectl apply -f k8s/dev/prometheus.yaml

# Wait for Prometheus to be ready
echo -e "${YELLOW}Waiting for Prometheus to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n knowton-dev || true

# Deploy Grafana
echo -e "${YELLOW}Deploying Grafana...${NC}"
kubectl apply -f k8s/dev/grafana.yaml

# Wait for Grafana to be ready
echo -e "${YELLOW}Waiting for Grafana to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n knowton-dev || true

# Check deployment status
echo ""
echo "=========================================="
echo "Deployment Status"
echo "=========================================="

echo -e "\n${YELLOW}Prometheus:${NC}"
kubectl get pods -n knowton-dev -l app=prometheus
kubectl get svc -n knowton-dev -l app=prometheus

echo -e "\n${YELLOW}Grafana:${NC}"
kubectl get pods -n knowton-dev -l app=grafana
kubectl get svc -n knowton-dev -l app=grafana

# Get service URLs
echo ""
echo "=========================================="
echo "Access Information"
echo "=========================================="

PROMETHEUS_PORT=$(kubectl get svc prometheus-service -n knowton-dev -o jsonpath='{.spec.ports[0].port}')
GRAFANA_PORT=$(kubectl get svc grafana-service -n knowton-dev -o jsonpath='{.spec.ports[0].port}')

echo -e "\n${GREEN}Prometheus:${NC}"
echo "  Service: prometheus-service"
echo "  Port: $PROMETHEUS_PORT"
echo "  Access via port-forward: kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090"
echo "  Then open: http://localhost:9090"

echo -e "\n${GREEN}Grafana:${NC}"
echo "  Service: grafana-service"
echo "  Port: $GRAFANA_PORT"
echo "  Access via port-forward: kubectl port-forward -n knowton-dev svc/grafana-service 3000:3000"
echo "  Then open: http://localhost:3000"
echo "  Default credentials: admin / admin123"

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo "1. Port-forward Prometheus: kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090"
echo "2. Port-forward Grafana: kubectl port-forward -n knowton-dev svc/grafana-service 3000:3000"
echo "3. Access Grafana at http://localhost:3000"
echo "4. Prometheus is already configured as a datasource in Grafana"
echo "5. Import additional dashboards from https://grafana.com/grafana/dashboards/"
echo ""
echo -e "${GREEN}Monitoring stack deployment complete!${NC}"
