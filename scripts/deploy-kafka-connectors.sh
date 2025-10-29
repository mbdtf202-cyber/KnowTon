#!/bin/bash

# ============================================================================
# Deploy Kafka Connect Connectors
# ============================================================================
# Purpose: Deploy all Kafka Connect connectors for data synchronization
# Requirements: 数据一致性需求
# ============================================================================

set -e

KAFKA_CONNECT_URL="${KAFKA_CONNECT_URL:-http://localhost:8083}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "Deploying Kafka Connect Connectors"
echo "============================================"
echo "Kafka Connect URL: $KAFKA_CONNECT_URL"
echo ""

# Function to check if Kafka Connect is ready
check_kafka_connect() {
    echo "Checking Kafka Connect availability..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$KAFKA_CONNECT_URL" > /dev/null 2>&1; then
            echo "✓ Kafka Connect is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo "Waiting for Kafka Connect... (attempt $attempt/$max_attempts)"
        sleep 5
    done
    
    echo "✗ Kafka Connect is not available after $max_attempts attempts"
    return 1
}

# Function to deploy a connector
deploy_connector() {
    local connector_file=$1
    local connector_name=$(jq -r '.name' "$connector_file")
    
    echo ""
    echo "Deploying connector: $connector_name"
    echo "----------------------------------------"
    
    # Check if connector already exists
    if curl -s -f "$KAFKA_CONNECT_URL/connectors/$connector_name" > /dev/null 2>&1; then
        echo "Connector $connector_name already exists. Updating..."
        
        # Update connector configuration
        response=$(curl -s -X PUT \
            -H "Content-Type: application/json" \
            --data @"$connector_file" \
            "$KAFKA_CONNECT_URL/connectors/$connector_name/config")
        
        if echo "$response" | jq -e '.error_code' > /dev/null 2>&1; then
            echo "✗ Failed to update connector: $connector_name"
            echo "$response" | jq '.'
            return 1
        else
            echo "✓ Connector updated successfully: $connector_name"
        fi
    else
        echo "Creating new connector: $connector_name"
        
        # Create new connector
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            --data @"$connector_file" \
            "$KAFKA_CONNECT_URL/connectors")
        
        if echo "$response" | jq -e '.error_code' > /dev/null 2>&1; then
            echo "✗ Failed to create connector: $connector_name"
            echo "$response" | jq '.'
            return 1
        else
            echo "✓ Connector created successfully: $connector_name"
        fi
    fi
    
    # Check connector status
    sleep 2
    status=$(curl -s "$KAFKA_CONNECT_URL/connectors/$connector_name/status")
    state=$(echo "$status" | jq -r '.connector.state')
    
    echo "Connector state: $state"
    
    if [ "$state" != "RUNNING" ]; then
        echo "⚠ Warning: Connector is not in RUNNING state"
        echo "$status" | jq '.'
    fi
}

# Function to list all connectors
list_connectors() {
    echo ""
    echo "============================================"
    echo "Current Connectors"
    echo "============================================"
    
    connectors=$(curl -s "$KAFKA_CONNECT_URL/connectors")
    echo "$connectors" | jq -r '.[]' | while read -r connector; do
        status=$(curl -s "$KAFKA_CONNECT_URL/connectors/$connector/status")
        state=$(echo "$status" | jq -r '.connector.state')
        tasks=$(echo "$status" | jq -r '.tasks[].state' | tr '\n' ',' | sed 's/,$//')
        
        echo "  - $connector: $state (tasks: $tasks)"
    done
}

# Main execution
main() {
    # Check Kafka Connect availability
    if ! check_kafka_connect; then
        echo "Please ensure Kafka Connect is running and try again."
        exit 1
    fi
    
    # Deploy PostgreSQL CDC connector
    if [ -f "$SCRIPT_DIR/kafka-connect-postgres-cdc.json" ]; then
        deploy_connector "$SCRIPT_DIR/kafka-connect-postgres-cdc.json"
    else
        echo "⚠ Warning: PostgreSQL CDC connector config not found"
    fi
    
    # Deploy ClickHouse sink connector
    if [ -f "$SCRIPT_DIR/kafka-connect-clickhouse.json" ]; then
        deploy_connector "$SCRIPT_DIR/kafka-connect-clickhouse.json"
    else
        echo "⚠ Warning: ClickHouse sink connector config not found"
    fi
    
    # Deploy Elasticsearch sink connector
    if [ -f "$SCRIPT_DIR/kafka-connect-elasticsearch.json" ]; then
        deploy_connector "$SCRIPT_DIR/kafka-connect-elasticsearch.json"
    else
        echo "⚠ Warning: Elasticsearch sink connector config not found"
    fi
    
    # List all connectors
    list_connectors
    
    echo ""
    echo "============================================"
    echo "Deployment Complete"
    echo "============================================"
    echo ""
    echo "To check connector status:"
    echo "  curl $KAFKA_CONNECT_URL/connectors/<connector-name>/status"
    echo ""
    echo "To view connector logs:"
    echo "  kubectl logs -f deployment/kafka-connect -n knowton-dev"
    echo ""
}

# Run main function
main "$@"
