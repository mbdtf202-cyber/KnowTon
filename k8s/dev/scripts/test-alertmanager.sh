#!/bin/bash

# Test AlertManager Configuration and Notifications
# This script tests AlertManager setup and sends test alerts

set -e

NAMESPACE="${NAMESPACE:-knowton-dev}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KnowTon AlertManager Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if service is running
check_service() {
    local service=$1
    local url=$2
    
    echo -e "${YELLOW}Checking $service...${NC}"
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $service is running${NC}"
        return 0
    else
        echo -e "${RED}✗ $service is not accessible at $url${NC}"
        return 1
    fi
}

# Function to send test alert
send_test_alert() {
    local severity=$1
    local alertname=$2
    local description=$3
    
    echo -e "${YELLOW}Sending test alert: $alertname (severity: $severity)${NC}"
    
    local alert_json=$(cat <<EOF
[
  {
    "labels": {
      "alertname": "$alertname",
      "severity": "$severity",
      "service": "test-service",
      "category": "test",
      "instance": "test-instance"
    },
    "annotations": {
      "summary": "Test alert for $alertname",
      "description": "$description",
      "runbook_url": "https://docs.knowton.io/runbooks/test"
    },
    "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "endsAt": "$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%S.000Z)",
    "generatorURL": "http://prometheus:9090/graph"
  }
]
EOF
)
    
    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$alert_json" \
        "$ALERTMANAGER_URL/api/v1/alerts")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Alert sent successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to send alert (HTTP $http_code)${NC}"
        echo "$body"
        return 1
    fi
}

# Function to check AlertManager status
check_alertmanager_status() {
    echo -e "${YELLOW}Checking AlertManager status...${NC}"
    
    local status=$(curl -s "$ALERTMANAGER_URL/api/v1/status")
    
    if echo "$status" | jq -e '.status == "success"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ AlertManager is healthy${NC}"
        echo "$status" | jq '.data'
        return 0
    else
        echo -e "${RED}✗ AlertManager status check failed${NC}"
        echo "$status"
        return 1
    fi
}

# Function to list active alerts
list_active_alerts() {
    echo -e "${YELLOW}Listing active alerts...${NC}"
    
    local alerts=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts")
    
    if echo "$alerts" | jq -e '.status == "success"' > /dev/null 2>&1; then
        local count=$(echo "$alerts" | jq '.data | length')
        echo -e "${GREEN}✓ Found $count active alerts${NC}"
        echo "$alerts" | jq '.data[] | {alertname: .labels.alertname, severity: .labels.severity, status: .status.state}'
        return 0
    else
        echo -e "${RED}✗ Failed to list alerts${NC}"
        echo "$alerts"
        return 1
    fi
}

# Function to check AlertManager configuration
check_alertmanager_config() {
    echo -e "${YELLOW}Checking AlertManager configuration...${NC}"
    
    local config=$(curl -s "$ALERTMANAGER_URL/api/v1/status")
    
    if echo "$config" | jq -e '.status == "success"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Configuration is valid${NC}"
        
        # Check receivers
        local receivers=$(echo "$config" | jq -r '.data.config.receivers[].name')
        echo -e "${BLUE}Configured receivers:${NC}"
        echo "$receivers" | while read -r receiver; do
            echo "  - $receiver"
        done
        
        # Check routes
        echo -e "${BLUE}Route configuration:${NC}"
        echo "$config" | jq '.data.config.route'
        
        return 0
    else
        echo -e "${RED}✗ Configuration check failed${NC}"
        echo "$config"
        return 1
    fi
}

# Function to silence an alert
silence_alert() {
    local alertname=$1
    local duration=$2
    local comment=$3
    
    echo -e "${YELLOW}Creating silence for $alertname (duration: $duration)${NC}"
    
    local silence_json=$(cat <<EOF
{
  "matchers": [
    {
      "name": "alertname",
      "value": "$alertname",
      "isRegex": false
    }
  ],
  "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "endsAt": "$(date -u -d "+$duration" +%Y-%m-%dT%H:%M:%S.000Z)",
  "createdBy": "test-script",
  "comment": "$comment"
}
EOF
)
    
    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$silence_json" \
        "$ALERTMANAGER_URL/api/v1/silences")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        local silence_id=$(echo "$body" | jq -r '.data.silenceID')
        echo -e "${GREEN}✓ Silence created (ID: $silence_id)${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to create silence (HTTP $http_code)${NC}"
        echo "$body"
        return 1
    fi
}

# Function to test Prometheus rules
test_prometheus_rules() {
    echo -e "${YELLOW}Testing Prometheus alert rules...${NC}"
    
    local rules=$(curl -s "$PROMETHEUS_URL/api/v1/rules")
    
    if echo "$rules" | jq -e '.status == "success"' > /dev/null 2>&1; then
        local rule_count=$(echo "$rules" | jq '[.data.groups[].rules[]] | length')
        echo -e "${GREEN}✓ Found $rule_count alert rules${NC}"
        
        # List all alert rules
        echo -e "${BLUE}Alert rules:${NC}"
        echo "$rules" | jq -r '.data.groups[].rules[] | select(.type == "alerting") | "  - \(.name) (severity: \(.labels.severity // "N/A"))"'
        
        # Check for firing alerts
        local firing=$(echo "$rules" | jq '[.data.groups[].rules[] | select(.type == "alerting" and .state == "firing")] | length')
        if [ "$firing" -gt 0 ]; then
            echo -e "${YELLOW}⚠ $firing alerts are currently firing${NC}"
            echo "$rules" | jq -r '.data.groups[].rules[] | select(.type == "alerting" and .state == "firing") | "  - \(.name): \(.alerts[0].annotations.description)"'
        else
            echo -e "${GREEN}✓ No alerts are currently firing${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}✗ Failed to fetch Prometheus rules${NC}"
        echo "$rules"
        return 1
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}Step 1: Service Health Checks${NC}"
    echo "-----------------------------------"
    check_service "AlertManager" "$ALERTMANAGER_URL/-/healthy" || exit 1
    check_service "Prometheus" "$PROMETHEUS_URL/-/healthy" || exit 1
    echo ""
    
    echo -e "${BLUE}Step 2: AlertManager Status${NC}"
    echo "-----------------------------------"
    check_alertmanager_status || exit 1
    echo ""
    
    echo -e "${BLUE}Step 3: Configuration Check${NC}"
    echo "-----------------------------------"
    check_alertmanager_config || exit 1
    echo ""
    
    echo -e "${BLUE}Step 4: Prometheus Rules Check${NC}"
    echo "-----------------------------------"
    test_prometheus_rules || exit 1
    echo ""
    
    echo -e "${BLUE}Step 5: Active Alerts${NC}"
    echo "-----------------------------------"
    list_active_alerts
    echo ""
    
    echo -e "${BLUE}Step 6: Test Alert Notifications${NC}"
    echo "-----------------------------------"
    read -p "Do you want to send test alerts? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${YELLOW}Sending test alerts...${NC}"
        
        # Test info alert
        send_test_alert "info" "TestInfoAlert" "This is a test info alert"
        sleep 2
        
        # Test warning alert
        send_test_alert "warning" "TestWarningAlert" "This is a test warning alert"
        sleep 2
        
        # Test critical alert
        send_test_alert "critical" "TestCriticalAlert" "This is a test critical alert"
        sleep 2
        
        echo ""
        echo -e "${GREEN}✓ Test alerts sent. Check your notification channels!${NC}"
        echo -e "${YELLOW}Note: It may take a few seconds for alerts to appear${NC}"
        echo ""
        
        # Wait and show alerts
        echo -e "${YELLOW}Waiting 10 seconds for alerts to process...${NC}"
        sleep 10
        list_active_alerts
        
        # Offer to silence test alerts
        echo ""
        read -p "Do you want to silence the test alerts? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            silence_alert "TestInfoAlert" "1 hour" "Silencing test alert"
            silence_alert "TestWarningAlert" "1 hour" "Silencing test alert"
            silence_alert "TestCriticalAlert" "1 hour" "Silencing test alert"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}✓ AlertManager test suite completed!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Check your Slack/Discord/Email for test notifications"
    echo "2. Review AlertManager UI: $ALERTMANAGER_URL"
    echo "3. Review Prometheus alerts: $PROMETHEUS_URL/alerts"
    echo "4. Review Grafana dashboards for alert visualization"
    echo ""
}

# Run main function
main "$@"
