#!/bin/bash
# Test Grafana Dashboard Queries
# This script tests all Prometheus queries used in Grafana dashboards

set -e

PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
DASHBOARD_DIR="$(dirname "$0")/../grafana-dashboards"

echo "🔍 Testing Grafana Dashboard Queries"
echo "Prometheus URL: $PROMETHEUS_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test a single query
test_query() {
    local query="$1"
    local panel_name="$2"
    
    # URL encode the query
    encoded_query=$(echo "$query" | jq -sRr @uri)
    
    # Execute query
    response=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=${encoded_query}")
    
    # Check if query succeeded
    status=$(echo "$response" | jq -r '.status')
    
    if [ "$status" = "success" ]; then
        result_count=$(echo "$response" | jq '.data.result | length')
        
        if [ "$result_count" -gt 0 ]; then
            echo -e "${GREEN}✅${NC} $panel_name: OK ($result_count series)"
            return 0
        else
            echo -e "${YELLOW}⚠️${NC}  $panel_name: No data"
            echo "   Query: $query"
            return 1
        fi
    else
        error=$(echo "$response" | jq -r '.error')
        echo -e "${RED}❌${NC} $panel_name: Error"
        echo "   Query: $query"
        echo "   Error: $error"
        return 2
    fi
}

# Test service health dashboard queries
echo "📊 Testing Service Health Dashboard"
echo "-----------------------------------"

test_query 'up{job="backend-service"}' "Backend Service Status"
test_query 'up{job="analytics-service"}' "Analytics Service Status"
test_query 'up{job="oracle-adapter-service"}' "Oracle Adapter Status"
test_query 'up{job="bonding-service"}' "Bonding Service Status"
test_query 'sum(rate(container_cpu_usage_seconds_total{namespace="knowton-dev",container!="POD",container!=""}[5m])) by (container) * 100' "CPU Usage by Service"
test_query 'sum(container_memory_working_set_bytes{namespace="knowton-dev",container!="POD",container!=""}) by (container)' "Memory Usage by Service"
test_query 'sum(rate(http_requests_total{namespace="knowton-dev"}[5m])) by (service, method, route)' "API Request Rate"
test_query 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace="knowton-dev"}[5m])) by (service, method, route, le))' "API Response Time P95"
test_query 'sum(rate(http_requests_total{namespace="knowton-dev",status=~"5.."}[5m])) by (service)' "Error Rate 5xx"
test_query 'pg_stat_database_numbackends{datname="knowton"} or vector(0)' "PostgreSQL Connections"

echo ""
echo "📊 Testing Business Metrics Dashboard"
echo "--------------------------------------"

test_query 'sum(rate(knowton_nft_mints_total[5m])) or vector(0)' "NFT Minting Rate"
test_query 'sum(knowton_trading_volume_usd{period="24h"}) or vector(0)' "Trading Volume"
test_query 'sum(knowton_active_users_total{period="24h"}) or vector(0)' "Active Users"
test_query 'sum(knowton_total_nfts) or vector(0)' "Total NFTs"
test_query 'sum(knowton_active_bonds_total) or vector(0)' "Active Bonds"
test_query 'sum(knowton_total_value_locked_usd) or vector(0)' "Total Value Locked"
test_query 'sum by (category) (knowton_nft_mints_total) or vector(0)' "NFTs by Category"
test_query 'histogram_quantile(0.95, sum(rate(knowton_ai_processing_duration_seconds_bucket[5m])) by (le, service)) * 1000 or vector(0)' "AI Processing Latency P95"

echo ""
echo "📊 Testing Technical Dashboard"
echo "-------------------------------"

test_query 'up{job=~"knowton-.*"}' "Service Health Status"
test_query '100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)' "CPU Usage"
test_query '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100' "Memory Usage"
test_query 'sum by (service) (rate(http_requests_total{job=~"knowton-.*"}[5m]))' "Request Rate by Service"
test_query 'histogram_quantile(0.95, sum by (service, le) (rate(http_request_duration_seconds_bucket{job=~"knowton-.*"}[5m]))) * 1000' "Response Time P95"
test_query 'sum by (service) (rate(http_requests_total{job=~"knowton-.*", code!~"5.."}[5m])) / sum by (service) (rate(http_requests_total{job=~"knowton-.*"}[5m])) * 100' "Service Availability"

echo ""
echo "📊 Testing Business Dashboard"
echo "------------------------------"

test_query 'sum(rate(knowton_nft_minted_total[5m]) * 300)' "NFT Minting Rate"
test_query 'sum(knowton_total_revenue_usd)' "Total Revenue"
test_query 'sum(knowton_marketplace_transactions_total)' "Marketplace Transactions"
test_query 'sum(rate(knowton_royalty_payments_total[1h]) * 3600)' "Royalty Payments"
test_query 'sum by (content_type) (knowton_content_uploads_total)' "Content Distribution"
test_query 'sum(knowton_staking_pools_active)' "Active Staking Pools"
test_query 'sum by (service) (rate(knowton_service_requests_total[5m]) * 300)' "Service Request Rate"

echo ""
echo "✅ Dashboard query testing complete!"
