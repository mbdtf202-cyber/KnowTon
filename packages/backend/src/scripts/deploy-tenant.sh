#!/bin/bash

###############################################################################
# Tenant Deployment Automation Script
# 
# This script automates the deployment of a new tenant instance including:
# - Kubernetes namespace creation
# - Resource provisioning
# - Database setup
# - Configuration deployment
# - Service deployment
# - Ingress configuration
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="${SCRIPT_DIR}/../../../k8s"
NAMESPACE_PREFIX="knowton-tenant"

# Functions
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Parse arguments
TENANT_SLUG=""
TENANT_ID=""
PLAN="professional"
DOMAIN=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --slug)
            TENANT_SLUG="$2"
            shift 2
            ;;
        --id)
            TENANT_ID="$2"
            shift 2
            ;;
        --plan)
            PLAN="$2"
            shift 2
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$TENANT_SLUG" ]; then
    log_error "Tenant slug is required (--slug)"
    exit 1
fi

if [ -z "$TENANT_ID" ]; then
    log_error "Tenant ID is required (--id)"
    exit 1
fi

# Set namespace
NAMESPACE="${NAMESPACE_PREFIX}-${TENANT_SLUG}"

log_info "Starting tenant deployment"
echo "  Tenant: ${TENANT_SLUG}"
echo "  ID: ${TENANT_ID}"
echo "  Plan: ${PLAN}"
echo "  Domain: ${DOMAIN:-N/A}"
echo "  Namespace: ${NAMESPACE}"
echo ""

# Step 1: Create namespace
log_info "Step 1: Creating Kubernetes namespace..."

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would create namespace ${NAMESPACE}"
else
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE}
  labels:
    tenant-id: "${TENANT_ID}"
    tenant-slug: "${TENANT_SLUG}"
    plan: "${PLAN}"
    managed-by: "knowton-automation"
EOF
    log_success "Namespace created: ${NAMESPACE}"
fi

# Step 2: Create resource quotas based on plan
log_info "Step 2: Setting resource quotas..."

case $PLAN in
    basic)
        CPU_LIMIT="2"
        MEMORY_LIMIT="4Gi"
        STORAGE_LIMIT="10Gi"
        ;;
    professional)
        CPU_LIMIT="8"
        MEMORY_LIMIT="16Gi"
        STORAGE_LIMIT="100Gi"
        ;;
    enterprise)
        CPU_LIMIT="32"
        MEMORY_LIMIT="64Gi"
        STORAGE_LIMIT="1Ti"
        ;;
    *)
        log_error "Unknown plan: ${PLAN}"
        exit 1
        ;;
esac

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would set quotas - CPU: ${CPU_LIMIT}, Memory: ${MEMORY_LIMIT}, Storage: ${STORAGE_LIMIT}"
else
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: ${NAMESPACE}
spec:
  hard:
    requests.cpu: "${CPU_LIMIT}"
    requests.memory: "${MEMORY_LIMIT}"
    persistentvolumeclaims: "10"
    requests.storage: "${STORAGE_LIMIT}"
EOF
    log_success "Resource quotas configured"
fi

# Step 3: Create ConfigMap
log_info "Step 3: Creating tenant configuration..."

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would create ConfigMap"
else
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: tenant-config
  namespace: ${NAMESPACE}
data:
  TENANT_ID: "${TENANT_ID}"
  TENANT_SLUG: "${TENANT_SLUG}"
  TENANT_PLAN: "${PLAN}"
  TENANT_DOMAIN: "${DOMAIN}"
  NODE_ENV: "production"
  POSTGRES_HOST: "postgres-service.knowton-dev.svc.cluster.local"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "knowton_${TENANT_SLUG}"
  REDIS_HOST: "redis-service.knowton-dev.svc.cluster.local"
  REDIS_PORT: "6379"
  KAFKA_BROKERS: "kafka-service.knowton-dev.svc.cluster.local:9092"
EOF
    log_success "ConfigMap created"
fi

# Step 4: Create Secrets
log_info "Step 4: Creating tenant secrets..."

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would create Secrets"
else
    # Generate random passwords
    DB_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)
    API_SECRET=$(openssl rand -base64 32)

    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: tenant-secrets
  namespace: ${NAMESPACE}
type: Opaque
stringData:
  POSTGRES_PASSWORD: "${DB_PASSWORD}"
  JWT_SECRET: "${JWT_SECRET}"
  API_SECRET: "${API_SECRET}"
EOF
    log_success "Secrets created"
fi

# Step 5: Deploy backend service
log_info "Step 5: Deploying backend service..."

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would deploy backend service"
else
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: ${NAMESPACE}
  labels:
    app: backend
    tenant: ${TENANT_SLUG}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        tenant: ${TENANT_SLUG}
    spec:
      containers:
      - name: backend
        image: knowton/backend:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: tenant-config
        - secretRef:
            name: tenant-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: ${NAMESPACE}
spec:
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
EOF
    log_success "Backend service deployed"
fi

# Step 6: Deploy frontend service
log_info "Step 6: Deploying frontend service..."

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would deploy frontend service"
else
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: ${NAMESPACE}
  labels:
    app: frontend
    tenant: ${TENANT_SLUG}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
        tenant: ${TENANT_SLUG}
    spec:
      containers:
      - name: frontend
        image: knowton/frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_TENANT_SLUG
          value: "${TENANT_SLUG}"
        - name: VITE_API_URL
          value: "https://api.knowton.com"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: ${NAMESPACE}
spec:
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
EOF
    log_success "Frontend service deployed"
fi

# Step 7: Configure Ingress
log_info "Step 7: Configuring ingress..."

if [ -n "$DOMAIN" ]; then
    INGRESS_HOST="${DOMAIN}"
else
    INGRESS_HOST="${TENANT_SLUG}.knowton.com"
fi

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would configure ingress for ${INGRESS_HOST}"
else
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tenant-ingress
  namespace: ${NAMESPACE}
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ${INGRESS_HOST}
    secretName: ${TENANT_SLUG}-tls
  rules:
  - host: ${INGRESS_HOST}
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
EOF
    log_success "Ingress configured for ${INGRESS_HOST}"
fi

# Step 8: Setup monitoring
log_info "Step 8: Setting up monitoring..."

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would setup monitoring"
else
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: tenant-monitor
  namespace: ${NAMESPACE}
  labels:
    tenant: ${TENANT_SLUG}
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
EOF
    log_success "Monitoring configured"
fi

# Step 9: Wait for deployment
if [ "$DRY_RUN" = false ]; then
    log_info "Step 9: Waiting for deployment to be ready..."
    
    kubectl wait --for=condition=available --timeout=300s \
        deployment/backend -n ${NAMESPACE} || {
        log_error "Backend deployment failed to become ready"
        exit 1
    }
    
    kubectl wait --for=condition=available --timeout=300s \
        deployment/frontend -n ${NAMESPACE} || {
        log_error "Frontend deployment failed to become ready"
        exit 1
    }
    
    log_success "All deployments are ready"
fi

# Step 10: Display summary
echo ""
log_success "Tenant deployment completed successfully!"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Tenant: ${TENANT_SLUG}"
echo "  Namespace: ${NAMESPACE}"
echo "  URL: https://${INGRESS_HOST}"
echo "  Plan: ${PLAN}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Verify deployment: kubectl get all -n ${NAMESPACE}"
echo "  2. Check logs: kubectl logs -n ${NAMESPACE} -l app=backend"
echo "  3. Access application: https://${INGRESS_HOST}"
echo ""

exit 0
