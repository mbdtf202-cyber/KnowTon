#!/bin/bash

# Deploy and Configure AlertManager for KnowTon Platform

set -e

NAMESPACE="${NAMESPACE:-knowton-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KnowTon AlertManager Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}✗ kubectl not found. Please install kubectl.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ kubectl found${NC}"
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠ jq not found. Installing jq is recommended for testing.${NC}"
    else
        echo -e "${GREEN}✓ jq found${NC}"
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}✗ Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Connected to Kubernetes cluster${NC}"
    
    echo ""
}

# Function to create namespace
create_namespace() {
    echo -e "${YELLOW}Creating namespace...${NC}"
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo -e "${GREEN}✓ Namespace $NAMESPACE already exists${NC}"
    else
        kubectl create namespace "$NAMESPACE"
        echo -e "${GREEN}✓ Namespace $NAMESPACE created${NC}"
    fi
    
    echo ""
}

# Function to configure secrets
configure_secrets() {
    echo -e "${YELLOW}Configuring secrets...${NC}"
    
    if kubectl get secret alertmanager-secrets -n "$NAMESPACE" &> /dev/null; then
        echo -e "${GREEN}✓ Secrets already exist${NC}"
        read -p "Do you want to update secrets? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
        kubectl delete secret alertmanager-secrets -n "$NAMESPACE"
    fi
    
    echo -e "${BLUE}Please provide notification channel configurations:${NC}"
    echo ""
    
    # Slack
    read -p "Slack Webhook URL (or press Enter to skip): " SLACK_WEBHOOK_URL
    SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-"https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"}
    
    # Discord
    read -p "Discord Webhook URL (or press Enter to skip): " DISCORD_WEBHOOK_URL
    DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL:-""}
    
    # Email
    read -p "SMTP Host (default: smtp.gmail.com:587): " SMTP_HOST
    SMTP_HOST=${SMTP_HOST:-"smtp.gmail.com:587"}
    
    read -p "SMTP From Address (default: alerts@knowton.io): " SMTP_FROM
    SMTP_FROM=${SMTP_FROM:-"alerts@knowton.io"}
    
    read -p "SMTP Username (or press Enter to skip): " SMTP_USERNAME
    SMTP_USERNAME=${SMTP_USERNAME:-""}
    
    if [ -n "$SMTP_USERNAME" ]; then
        read -sp "SMTP Password: " SMTP_PASSWORD
        echo ""
    else
        SMTP_PASSWORD=""
    fi
    
    # Email recipients
    read -p "Alert Email Recipients (comma-separated, default: ops@knowton.io): " ALERT_EMAIL_TO
    ALERT_EMAIL_TO=${ALERT_EMAIL_TO:-"ops@knowton.io"}
    
    read -p "DBA Email (default: dba@knowton.io): " DBA_EMAIL
    DBA_EMAIL=${DBA_EMAIL:-"dba@knowton.io"}
    
    read -p "Security Email (default: security@knowton.io): " SECURITY_EMAIL
    SECURITY_EMAIL=${SECURITY_EMAIL:-"security@knowton.io"}
    
    read -p "Business Email (default: business@knowton.io): " BUSINESS_EMAIL
    BUSINESS_EMAIL=${BUSINESS_EMAIL:-"business@knowton.io"}
    
    read -p "Audit Email (default: audit@knowton.io): " AUDIT_EMAIL
    AUDIT_EMAIL=${AUDIT_EMAIL:-"audit@knowton.io"}
    
    # PagerDuty (optional)
    read -p "PagerDuty Service Key (or press Enter to skip): " PAGERDUTY_SERVICE_KEY
    PAGERDUTY_SERVICE_KEY=${PAGERDUTY_SERVICE_KEY:-""}
    
    # Create secret
    kubectl create secret generic alertmanager-secrets \
        --from-literal=SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" \
        --from-literal=DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL" \
        --from-literal=SMTP_HOST="$SMTP_HOST" \
        --from-literal=SMTP_FROM="$SMTP_FROM" \
        --from-literal=SMTP_USERNAME="$SMTP_USERNAME" \
        --from-literal=SMTP_PASSWORD="$SMTP_PASSWORD" \
        --from-literal=ALERT_EMAIL_TO="$ALERT_EMAIL_TO" \
        --from-literal=DBA_EMAIL="$DBA_EMAIL" \
        --from-literal=SECURITY_EMAIL="$SECURITY_EMAIL" \
        --from-literal=BUSINESS_EMAIL="$BUSINESS_EMAIL" \
        --from-literal=AUDIT_EMAIL="$AUDIT_EMAIL" \
        --from-literal=PAGERDUTY_SERVICE_KEY="$PAGERDUTY_SERVICE_KEY" \
        --namespace="$NAMESPACE"
    
    echo -e "${GREEN}✓ Secrets created${NC}"
    echo ""
}

# Function to deploy AlertManager
deploy_alertmanager() {
    echo -e "${YELLOW}Deploying AlertManager...${NC}"
    
    # Apply templates
    echo "Applying templates..."
    kubectl apply -f "$K8S_DIR/alertmanager-templates.yaml"
    
    # Apply AlertManager configuration and deployment
    echo "Applying AlertManager configuration..."
    kubectl apply -f "$K8S_DIR/alertmanager.yaml"
    
    # Wait for deployment
    echo "Waiting for AlertManager to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/alertmanager -n "$NAMESPACE" || true
    
    # Check status
    if kubectl get pods -n "$NAMESPACE" -l app=alertmanager | grep -q "Running"; then
        echo -e "${GREEN}✓ AlertManager deployed successfully${NC}"
    else
        echo -e "${RED}✗ AlertManager deployment failed${NC}"
        kubectl get pods -n "$NAMESPACE" -l app=alertmanager
        exit 1
    fi
    
    echo ""
}

# Function to deploy alert rules
deploy_alert_rules() {
    echo -e "${YELLOW}Deploying alert rules...${NC}"
    
    # Apply Prometheus alerts
    if [ -f "$K8S_DIR/prometheus-alerts.yaml" ]; then
        echo "Applying Prometheus alert rules..."
        kubectl apply -f "$K8S_DIR/prometheus-alerts.yaml"
    fi
    
    # Apply data sync alerts
    if [ -f "$K8S_DIR/data-sync-alerts.yaml" ]; then
        echo "Applying data sync alert rules..."
        kubectl apply -f "$K8S_DIR/data-sync-alerts.yaml"
    fi
    
    # Apply audit alerts
    if [ -f "$K8S_DIR/audit-alerts.yaml" ]; then
        echo "Applying audit alert rules..."
        kubectl apply -f "$K8S_DIR/audit-alerts.yaml"
    fi
    
    echo -e "${GREEN}✓ Alert rules deployed${NC}"
    echo ""
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Check pods
    echo "Checking pods..."
    kubectl get pods -n "$NAMESPACE" -l app=alertmanager
    
    # Check services
    echo ""
    echo "Checking services..."
    kubectl get svc -n "$NAMESPACE" -l app=alertmanager
    
    # Check logs
    echo ""
    echo "Recent logs:"
    kubectl logs -n "$NAMESPACE" -l app=alertmanager --tail=20
    
    echo ""
}

# Function to setup port forwarding
setup_port_forward() {
    echo -e "${YELLOW}Setting up port forwarding...${NC}"
    
    # Kill existing port forwards
    pkill -f "port-forward.*alertmanager" || true
    
    # Start port forward
    kubectl port-forward -n "$NAMESPACE" svc/alertmanager-service 9093:9093 > /dev/null 2>&1 &
    PF_PID=$!
    
    sleep 3
    
    if ps -p $PF_PID > /dev/null; then
        echo -e "${GREEN}✓ Port forwarding active (PID: $PF_PID)${NC}"
        echo -e "${BLUE}AlertManager UI: http://localhost:9093${NC}"
    else
        echo -e "${RED}✗ Port forwarding failed${NC}"
    fi
    
    echo ""
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"
    
    if [ -f "$SCRIPT_DIR/test-alertmanager.sh" ]; then
        bash "$SCRIPT_DIR/test-alertmanager.sh"
    else
        echo -e "${YELLOW}⚠ Test script not found${NC}"
    fi
}

# Function to display summary
display_summary() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}✓ AlertManager Deployment Complete!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Access Points:${NC}"
    echo "  - AlertManager UI: http://localhost:9093"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Grafana: http://localhost:3000"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "  - View pods: kubectl get pods -n $NAMESPACE -l app=alertmanager"
    echo "  - View logs: kubectl logs -n $NAMESPACE -l app=alertmanager -f"
    echo "  - Port forward: kubectl port-forward -n $NAMESPACE svc/alertmanager-service 9093:9093"
    echo "  - Test alerts: ./k8s/dev/scripts/test-alertmanager.sh"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Access AlertManager UI at http://localhost:9093"
    echo "  2. Verify notification channels are working"
    echo "  3. Run test script to send test alerts"
    echo "  4. Review alert rules in Prometheus"
    echo "  5. Configure alert thresholds as needed"
    echo ""
    echo -e "${YELLOW}Documentation:${NC}"
    echo "  - Setup Guide: k8s/dev/ALERTMANAGER_SETUP_GUIDE.md"
    echo "  - Alert Rules: k8s/dev/prometheus-alerts.yaml"
    echo "  - Configuration: k8s/dev/alertmanager.yaml"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    create_namespace
    
    # Ask if user wants to configure secrets
    read -p "Do you want to configure notification secrets now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        configure_secrets
    else
        echo -e "${YELLOW}⚠ Skipping secret configuration. You'll need to create secrets manually.${NC}"
        echo ""
    fi
    
    deploy_alertmanager
    deploy_alert_rules
    verify_deployment
    
    # Ask if user wants to setup port forwarding
    read -p "Do you want to setup port forwarding? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_port_forward
    fi
    
    # Ask if user wants to run tests
    read -p "Do you want to run tests now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_tests
    fi
    
    display_summary
}

# Run main function
main "$@"
