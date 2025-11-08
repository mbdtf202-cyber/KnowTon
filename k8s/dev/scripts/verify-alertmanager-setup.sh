#!/bin/bash

# Verify AlertManager Setup and Configuration
# This script performs comprehensive verification of AlertManager deployment

set -e

NAMESPACE="${NAMESPACE:-knowton-dev}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AlertManager Setup Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check and report
check() {
    local name=$1
    local command=$2
    
    echo -n "Checking $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to warn
warn() {
    local message=$1
    echo -e "${YELLOW}⚠ WARNING: $message${NC}"
    ((WARNINGS++))
}

echo -e "${BLUE}1. Kubernetes Resources${NC}"
echo "-----------------------------------"

# Check namespace
check "Namespace exists" "kubectl get namespace $NAMESPACE"

# Check ConfigMaps
check "AlertManager config exists" "kubectl get configmap alertmanager-config -n $NAMESPACE"
check "AlertManager templates exist" "kubectl get configmap alertmanager-templates -n $NAMESPACE"
check "Prometheus alerts exist" "kubectl get configmap prometheus-alerts -n $NAMESPACE"

# Check Secrets
check "AlertManager secrets exist" "kubectl get secret alertmanager-secrets -n $NAMESPACE"

# Check Deployments
check "AlertManager deployment exists" "kubectl get deployment alertmanager -n $NAMESPACE"
check "AlertManager deployment ready" "kubectl get deployment alertmanager -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -q '1'"

# Check Pods
check "AlertManager pod running" "kubectl get pods -n $NAMESPACE -l app=alertmanager -o jsonpath='{.items[0].status.phase}' | grep -q 'Running'"

# Check Services
check "AlertManager service exists" "kubectl get service alertmanager-service -n $NAMESPACE"

# Check PVC
check "AlertManager PVC exists" "kubectl get pvc alertmanager-pvc -n $NAMESPACE"
check "AlertManager PVC bound" "kubectl get pvc alertmanager-pvc -n $NAMESPACE -o jsonpath='{.status.phase}' | grep -q 'Bound'"

echo ""
echo -e "${BLUE}2. AlertManager Health${NC}"
echo "-----------------------------------"

# Check if port-forward is needed
if ! curl -s -f "$ALERTMANAGER_URL/-/healthy" > /dev/null 2>&1; then
    warn "AlertManager not accessible at $ALERTMANAGER_URL"
    echo "Starting port-forward..."
    kubectl port-forward -n $NAMESPACE svc/alertmanager-service 9093:9093 > /dev/null 2>&1 &
    PF_PID=$!
    sleep 3
fi

# Check health endpoints
check "AlertManager healthy" "curl -s -f $ALERTMANAGER_URL/-/healthy"
check "AlertManager ready" "curl -s -f $ALERTMANAGER_URL/-/ready"

# Check API
check "AlertManager API responding" "curl -s $ALERTMANAGER_URL/api/v1/status | jq -e '.status == \"success\"'"

echo ""
echo -e "${BLUE}3. Configuration Validation${NC}"
echo "-----------------------------------"

# Check receivers
RECEIVERS=$(curl -s $ALERTMANAGER_URL/api/v1/status | jq -r '.data.config.receivers[].name' 2>/dev/null)
if [ -n "$RECEIVERS" ]; then
    echo -e "${GREEN}✓ PASS${NC} Receivers configured"
    ((PASSED++))
    echo "  Receivers:"
    echo "$RECEIVERS" | while read -r receiver; do
        echo "    - $receiver"
    done
else
    echo -e "${RED}✗ FAIL${NC} No receivers configured"
    ((FAILED++))
fi

# Check routes
check "Routes configured" "curl -s $ALERTMANAGER_URL/api/v1/status | jq -e '.data.config.route'"

# Check inhibit rules
INHIBIT_RULES=$(curl -s $ALERTMANAGER_URL/api/v1/status | jq '.data.config.inhibit_rules | length' 2>/dev/null)
if [ "$INHIBIT_RULES" -gt 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} Inhibit rules configured ($INHIBIT_RULES rules)"
    ((PASSED++))
else
    warn "No inhibit rules configured"
fi

echo ""
echo -e "${BLUE}4. Prometheus Integration${NC}"
echo "-----------------------------------"

# Check if Prometheus is accessible
if ! curl -s -f "$PROMETHEUS_URL/-/healthy" > /dev/null 2>&1; then
    warn "Prometheus not accessible at $PROMETHEUS_URL"
    echo "Starting port-forward..."
    kubectl port-forward -n $NAMESPACE svc/prometheus-service 9090:9090 > /dev/null 2>&1 &
    sleep 3
fi

# Check Prometheus health
check "Prometheus healthy" "curl -s -f $PROMETHEUS_URL/-/healthy"

# Check alert rules
ALERT_RULES=$(curl -s $PROMETHEUS_URL/api/v1/rules | jq '[.data.groups[].rules[] | select(.type == "alerting")] | length' 2>/dev/null)
if [ "$ALERT_RULES" -gt 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} Alert rules loaded ($ALERT_RULES rules)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} No alert rules loaded"
    ((FAILED++))
fi

# Check AlertManager configuration in Prometheus
check "Prometheus configured with AlertManager" "curl -s $PROMETHEUS_URL/api/v1/alertmanagers | jq -e '.data.activeAlertmanagers | length > 0'"

echo ""
echo -e "${BLUE}5. Notification Channels${NC}"
echo "-----------------------------------"

# Check secrets
SLACK_URL=$(kubectl get secret alertmanager-secrets -n $NAMESPACE -o jsonpath='{.data.SLACK_WEBHOOK_URL}' 2>/dev/null | base64 -d)
DISCORD_URL=$(kubectl get secret alertmanager-secrets -n $NAMESPACE -o jsonpath='{.data.DISCORD_WEBHOOK_URL}' 2>/dev/null | base64 -d)
SMTP_HOST=$(kubectl get secret alertmanager-secrets -n $NAMESPACE -o jsonpath='{.data.SMTP_HOST}' 2>/dev/null | base64 -d)

if [ -n "$SLACK_URL" ] && [ "$SLACK_URL" != "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" ]; then
    echo -e "${GREEN}✓ PASS${NC} Slack webhook configured"
    ((PASSED++))
else
    warn "Slack webhook not configured or using default value"
fi

if [ -n "$DISCORD_URL" ]; then
    echo -e "${GREEN}✓ PASS${NC} Discord webhook configured"
    ((PASSED++))
else
    warn "Discord webhook not configured"
fi

if [ -n "$SMTP_HOST" ]; then
    echo -e "${GREEN}✓ PASS${NC} SMTP configured"
    ((PASSED++))
else
    warn "SMTP not configured"
fi

echo ""
echo -e "${BLUE}6. Metrics and Monitoring${NC}"
echo "-----------------------------------"

# Check metrics endpoint
check "Metrics endpoint accessible" "curl -s -f $ALERTMANAGER_URL/metrics"

# Check key metrics
ACTIVE_ALERTS=$(curl -s $ALERTMANAGER_URL/metrics | grep '^alertmanager_alerts{' | awk '{print $2}' | head -1)
if [ -n "$ACTIVE_ALERTS" ]; then
    echo -e "${GREEN}✓ PASS${NC} Metrics available (Active alerts: $ACTIVE_ALERTS)"
    ((PASSED++))
else
    warn "Could not retrieve alert metrics"
fi

echo ""
echo -e "${BLUE}7. Files and Scripts${NC}"
echo "-----------------------------------"

# Check files exist
check "alertmanager.yaml exists" "test -f k8s/dev/alertmanager.yaml"
check "alertmanager-templates.yaml exists" "test -f k8s/dev/alertmanager-templates.yaml"
check "prometheus-alerts.yaml exists" "test -f k8s/dev/prometheus-alerts.yaml"
check "test-alertmanager.sh exists" "test -f k8s/dev/scripts/test-alertmanager.sh"
check "deploy-alertmanager.sh exists" "test -f k8s/dev/scripts/deploy-alertmanager.sh"
check "Setup guide exists" "test -f k8s/dev/ALERTMANAGER_SETUP_GUIDE.md"
check "Quick start guide exists" "test -f k8s/dev/ALERTMANAGER_QUICK_START.md"

# Check scripts are executable
check "test-alertmanager.sh is executable" "test -x k8s/dev/scripts/test-alertmanager.sh"
check "deploy-alertmanager.sh is executable" "test -x k8s/dev/scripts/deploy-alertmanager.sh"

echo ""
echo -e "${BLUE}8. Documentation${NC}"
echo "-----------------------------------"

# Check documentation completeness
DOC_FILES=(
    "k8s/dev/ALERTMANAGER_SETUP_GUIDE.md"
    "k8s/dev/ALERTMANAGER_QUICK_START.md"
    "k8s/dev/TASK_15.6_COMPLETION.md"
    "k8s/dev/ALERTMANAGER_IMPLEMENTATION_SUMMARY.md"
    "k8s/dev/alerting/README.md"
)

for doc in "${DOC_FILES[@]}"; do
    if [ -f "$doc" ]; then
        LINES=$(wc -l < "$doc")
        echo -e "${GREEN}✓ PASS${NC} $doc ($LINES lines)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} $doc missing"
        ((FAILED++))
    fi
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "Tests Passed:  ${GREEN}$PASSED${NC}"
echo -e "Tests Failed:  ${RED}$FAILED${NC}"
echo -e "Warnings:      ${YELLOW}$WARNINGS${NC}"
echo ""

# Calculate percentage
TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((PASSED * 100 / TOTAL))
    echo -e "Success Rate:  ${BLUE}$PERCENTAGE%${NC}"
    echo ""
fi

# Overall status
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Configure actual webhook URLs and SMTP credentials"
    echo "2. Run test script: ./k8s/dev/scripts/test-alertmanager.sh"
    echo "3. Send test alerts to verify notification channels"
    echo "4. Access AlertManager UI: $ALERTMANAGER_URL"
    echo "5. Review documentation: k8s/dev/ALERTMANAGER_SETUP_GUIDE.md"
    echo ""
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check logs: kubectl logs -n $NAMESPACE -l app=alertmanager"
    echo "2. Check pod status: kubectl get pods -n $NAMESPACE -l app=alertmanager"
    echo "3. Check events: kubectl get events -n $NAMESPACE"
    echo "4. Review configuration: kubectl get configmap alertmanager-config -n $NAMESPACE -o yaml"
    echo "5. Consult documentation: k8s/dev/ALERTMANAGER_SETUP_GUIDE.md"
    echo ""
    exit 1
fi
