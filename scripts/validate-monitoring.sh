#!/bin/bash

# KnowTon Monitoring Validation Script
# This script validates the monitoring setup including Prometheus, Grafana, and AlertManager

set -e

NAMESPACE="knowton-dev"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "KnowTon Monitoring Validation"
echo "========================================="
echo ""

# Function to check if a pod is running
check_pod_status() {
    local pod_name=$1
    local status=$(kubectl get pods -n $NAMESPACE -l app=$pod_name -o jsonpath='{.items[0].status.phase}' 2>/dev/null)
    
    if [ "$status" == "Running" ]; then
        echo -e "${GREEN}✓${NC} $pod_name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $pod_name is not running (status: $status)"
        return 1
    fi
}

# Function to check if a service is accessible
check_service() {
    local service_name=$1
    local port=$2
    
    if kubectl get svc -n $NAMESPACE $service_name &>/dev/null; then
        echo -e "${GREEN}✓${NC} Service $service_name exists"
        
        # Try to port-forward and check connectivity
        kubectl port-forward -n $NAMESPACE svc/$service_name $port:$port &>/dev/null &
        local PF_PID=$!
        sleep 2
        
        if curl -s http://localhost:$port/-/healthy &>/dev/null || curl -s http://localhost:$port/api/health &>/dev/null; then
            echo -e "${GREEN}✓${NC} Service $service_name is accessible on port $port"
            kill $PF_PID 2>/dev/null
            return 0
        else
            echo -e "${YELLOW}⚠${NC} Service $service_name exists but health check failed"
            kill $PF_PID 2>/dev/null
            return 1
        fi
    else
        echo -e "${RED}✗${NC} Service $service_name does not exist"
        return 1
    fi
}

# Function to check ConfigMap
check_configmap() {
    local cm_name=$1
    
    if kubectl get configmap -n $NAMESPACE $cm_name &>/dev/null; then
        echo -e "${GREEN}✓${NC} ConfigMap $cm_name exists"
        return 0
    else
        echo -e "${RED}✗${NC} ConfigMap $cm_name does not exist"
        return 1
    fi
}

# Function to validate Prometheus metrics
validate_prometheus_metrics() {
    echo ""
    echo "Validating Prometheus metrics..."
    
    kubectl port-forward -n $NAMESPACE svc/prometheus-service 9090:9090 &>/dev/null &
    local PF_PID=$!
    sleep 3
    
    # Check if Prometheus is up
    if curl -s http://localhost:9090/-/healthy &>/dev/null; then
        echo -e "${GREEN}✓${NC} Prometheus is healthy"
        
        # Check if targets are being scraped
        local targets=$(curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets | length')
        if [ "$targets" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Prometheus is scraping $targets targets"
        else
            echo -e "${YELLOW}⚠${NC} Prometheus has no active targets"
        fi
        
        # Check if alert rules are loaded
        local rules=$(curl -s http://localhost:9090/api/v1/rules | jq -r '.data.groups | length')
        if [ "$rules" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Prometheus has $rules alert rule groups loaded"
        else
            echo -e "${YELLOW}⚠${NC} Prometheus has no alert rules loaded"
        fi
        
        # Check for KnowTon-specific metrics
        local knowton_metrics=$(curl -s http://localhost:9090/api/v1/label/__name__/values | jq -r '.data[]' | grep -c "knowton_" || true)
        if [ "$knowton_metrics" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Found $knowton_metrics KnowTon business metrics"
        else
            echo -e "${YELLOW}⚠${NC} No KnowTon business metrics found (may need time to populate)"
        fi
    else
        echo -e "${RED}✗${NC} Prometheus is not healthy"
    fi
    
    kill $PF_PID 2>/dev/null
}

# Function to validate Grafana dashboards
validate_grafana_dashboards() {
    echo ""
    echo "Validating Grafana dashboards..."
    
    kubectl port-forward -n $NAMESPACE svc/grafana-service 3000:3000 &>/dev/null &
    local PF_PID=$!
    sleep 3
    
    # Check if Grafana is up
    if curl -s http://localhost:3000/api/health &>/dev/null; then
        echo -e "${GREEN}✓${NC} Grafana is healthy"
        
        # Check dashboards (requires authentication, so we just check if the endpoint responds)
        if curl -s -u admin:admin http://localhost:3000/api/search &>/dev/null; then
            local dashboard_count=$(curl -s -u admin:admin http://localhost:3000/api/search | jq '. | length')
            echo -e "${GREEN}✓${NC} Grafana has $dashboard_count dashboards"
        else
            echo -e "${YELLOW}⚠${NC} Could not retrieve Grafana dashboards (check credentials)"
        fi
    else
        echo -e "${RED}✗${NC} Grafana is not healthy"
    fi
    
    kill $PF_PID 2>/dev/null
}

# Function to validate AlertManager
validate_alertmanager() {
    echo ""
    echo "Validating AlertManager..."
    
    kubectl port-forward -n $NAMESPACE svc/alertmanager-service 9093:9093 &>/dev/null &
    local PF_PID=$!
    sleep 3
    
    # Check if AlertManager is up
    if curl -s http://localhost:9093/-/healthy &>/dev/null; then
        echo -e "${GREEN}✓${NC} AlertManager is healthy"
        
        # Check alert status
        local alerts=$(curl -s http://localhost:9093/api/v2/alerts | jq '. | length')
        echo -e "${GREEN}✓${NC} AlertManager has $alerts active alerts"
    else
        echo -e "${RED}✗${NC} AlertManager is not healthy"
    fi
    
    kill $PF_PID 2>/dev/null
}

# Main validation flow
echo "1. Checking Prometheus..."
check_pod_status "prometheus"
check_configmap "prometheus-config"
check_configmap "prometheus-alerts"
validate_prometheus_metrics

echo ""
echo "2. Checking Grafana..."
check_pod_status "grafana"
check_configmap "grafana-config"
check_configmap "grafana-dashboards"
validate_grafana_dashboards

echo ""
echo "3. Checking AlertManager..."
check_pod_status "alertmanager"
check_configmap "alertmanager-config"
validate_alertmanager

echo ""
echo "4. Checking Backend Metrics Endpoint..."
if kubectl get svc -n $NAMESPACE backend-service &>/dev/null; then
    kubectl port-forward -n $NAMESPACE svc/backend-service 3000:3000 &>/dev/null &
    local PF_PID=$!
    sleep 2
    
    if curl -s http://localhost:3000/metrics | grep -q "knowton_"; then
        echo -e "${GREEN}✓${NC} Backend is exposing KnowTon metrics"
    else
        echo -e "${YELLOW}⚠${NC} Backend metrics endpoint exists but no KnowTon metrics found"
    fi
    
    kill $PF_PID 2>/dev/null
else
    echo -e "${YELLOW}⚠${NC} Backend service not found (may not be deployed yet)"
fi

echo ""
echo "========================================="
echo "Validation Complete"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Access Prometheus: kubectl port-forward -n $NAMESPACE svc/prometheus-service 9090:9090"
echo "2. Access Grafana: kubectl port-forward -n $NAMESPACE svc/grafana-service 3000:3000"
echo "3. Access AlertManager: kubectl port-forward -n $NAMESPACE svc/alertmanager-service 9093:9093"
echo ""
echo "For detailed setup instructions, see: k8s/dev/MONITORING_SETUP.md"
