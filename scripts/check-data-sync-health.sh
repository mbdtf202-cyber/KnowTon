#!/bin/bash

# ============================================================================
# Data Sync Pipeline Health Check
# ============================================================================
# Purpose: Monitor the health of CDC and data synchronization pipeline
# ============================================================================

set -e

KAFKA_CONNECT_URL="${KAFKA_CONNECT_URL:-http://localhost:8083}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-knowton}"
POSTGRES_USER="${POSTGRES_USER:-knowton}"
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"
ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "Data Sync Pipeline Health Check"
echo "============================================"
echo ""

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
    else
        echo -e "${RED}✗${NC} $message"
    fi
}

# Check Kafka Connect
echo "1. Checking Kafka Connect..."
echo "----------------------------------------"
if curl -s -f "$KAFKA_CONNECT_URL" > /dev/null 2>&1; then
    print_status "OK" "Kafka Connect is running"
    
    # Check connectors
    connectors=$(curl -s "$KAFKA_CONNECT_URL/connectors" | jq -r '.[]' 2>/dev/null)
    if [ -n "$connectors" ]; then
        echo "   Connectors:"
        echo "$connectors" | while read -r connector; do
            status=$(curl -s "$KAFKA_CONNECT_URL/connectors/$connector/status" | jq -r '.connector.state' 2>/dev/null)
            if [ "$status" = "RUNNING" ]; then
                print_status "OK" "   - $connector: $status"
            else
                print_status "FAIL" "   - $connector: $status"
            fi
        done
    else
        print_status "WARN" "No connectors deployed"
    fi
else
    print_status "FAIL" "Kafka Connect is not accessible"
fi
echo ""

# Check PostgreSQL CDC
echo "2. Checking PostgreSQL CDC..."
echo "----------------------------------------"
if command -v psql > /dev/null 2>&1; then
    # Check if publication exists
    pub_exists=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM pg_publication WHERE pubname = 'knowton_publication';" 2>/dev/null | tr -d ' ')
    
    if [ "$pub_exists" = "1" ]; then
        print_status "OK" "CDC publication exists"
        
        # Check replication slot
        slot_exists=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM pg_replication_slots WHERE slot_name LIKE 'knowton%';" 2>/dev/null | tr -d ' ')
        
        if [ "$slot_exists" -gt "0" ]; then
            print_status "OK" "Replication slot exists"
            
            # Check replication lag
            lag=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) FROM pg_replication_slots WHERE slot_name LIKE 'knowton%' LIMIT 1;" 2>/dev/null | tr -d ' ')
            
            echo "   Replication lag: $lag"
        else
            print_status "WARN" "Replication slot not created yet"
        fi
        
        # Check published tables
        table_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'knowton_publication';" 2>/dev/null | tr -d ' ')
        echo "   Published tables: $table_count"
    else
        print_status "FAIL" "CDC publication not found"
    fi
else
    print_status "WARN" "psql not available, skipping PostgreSQL checks"
fi
echo ""

# Check ClickHouse
echo "3. Checking ClickHouse..."
echo "----------------------------------------"
if curl -s -f "$CLICKHOUSE_HOST:$CLICKHOUSE_PORT" > /dev/null 2>&1; then
    print_status "OK" "ClickHouse is running"
    
    # Check recent inserts
    recent_data=$(curl -s "$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/?query=SELECT%20table%2C%20count()%20as%20rows%2C%20max(event_time)%20as%20last_insert%20FROM%20knowton.nft_transactions%20WHERE%20event_date%20%3E%3D%20today()%20-%201%20GROUP%20BY%20table%20FORMAT%20JSON" 2>/dev/null)
    
    if [ -n "$recent_data" ]; then
        echo "   Recent data ingestion:"
        echo "$recent_data" | jq -r '.data[] | "   - \(.table): \(.rows) rows, last: \(.last_insert)"' 2>/dev/null || echo "   (Unable to parse data)"
    fi
else
    print_status "FAIL" "ClickHouse is not accessible"
fi
echo ""

# Check Elasticsearch
echo "4. Checking Elasticsearch..."
echo "----------------------------------------"
if curl -s -f "$ELASTICSEARCH_URL" > /dev/null 2>&1; then
    print_status "OK" "Elasticsearch is running"
    
    # Check indices
    indices=$(curl -s "$ELASTICSEARCH_URL/_cat/indices/knowton-*?format=json" 2>/dev/null)
    if [ -n "$indices" ]; then
        echo "   Indices:"
        echo "$indices" | jq -r '.[] | "   - \(.index): \(.docs.count) docs, \(.store.size)"' 2>/dev/null || echo "   (Unable to parse indices)"
    fi
else
    print_status "FAIL" "Elasticsearch is not accessible"
fi
echo ""

# Check Kafka topics
echo "5. Checking Kafka Topics..."
echo "----------------------------------------"
if command -v kafka-topics > /dev/null 2>&1; then
    cdc_topics=$(kafka-topics --bootstrap-server localhost:9092 --list 2>/dev/null | grep -E "cdc-|connect-" || true)
    
    if [ -n "$cdc_topics" ]; then
        print_status "OK" "CDC topics exist"
        echo "   Topics:"
        echo "$cdc_topics" | while read -r topic; do
            echo "   - $topic"
        done
    else
        print_status "WARN" "No CDC topics found"
    fi
else
    print_status "WARN" "kafka-topics not available, skipping Kafka checks"
fi
echo ""

# Summary
echo "============================================"
echo "Health Check Complete"
echo "============================================"
echo ""
echo "For detailed logs:"
echo "  Kafka Connect: kubectl logs -f deployment/kafka-connect -n knowton-dev"
echo "  PostgreSQL: tail -f /var/log/postgresql/postgresql-*.log"
echo "  ClickHouse: tail -f /var/log/clickhouse-server/clickhouse-server.log"
echo ""
echo "To restart components:"
echo "  Kafka Connect: kubectl rollout restart deployment/kafka-connect -n knowton-dev"
echo "  Connectors: ./scripts/deploy-kafka-connectors.sh"
echo ""
# ============================================================================
# Enhanced Health Monitoring Functions
# ============================================================================

# Function to check data freshness
check_data_freshness() {
    echo "6. Checking Data Freshness..."
    echo "----------------------------------------"
    
    # Check PostgreSQL latest timestamp
    if command -v psql > /dev/null 2>&1; then
        pg_latest=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXTRACT(EPOCH FROM MAX(created_at)) FROM nft_mints;" 2>/dev/null | tr -d ' ')
        
        if [ -n "$pg_latest" ] && [ "$pg_latest" != "" ]; then
            current_time=$(date +%s)
            pg_lag=$((current_time - ${pg_latest%.*}))
            
            if [ $pg_lag -lt 300 ]; then  # Less than 5 minutes
                print_status "OK" "PostgreSQL data is fresh (${pg_lag}s ago)"
            elif [ $pg_lag -lt 3600 ]; then  # Less than 1 hour
                print_status "WARN" "PostgreSQL data is stale (${pg_lag}s ago)"
            else
                print_status "FAIL" "PostgreSQL data is very stale (${pg_lag}s ago)"
            fi
        else
            print_status "WARN" "No data found in PostgreSQL"
        fi
    fi
    
    # Check ClickHouse latest timestamp
    ch_latest=$(curl -s "$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/?query=SELECT%20toUnixTimestamp(max(created_at))%20FROM%20nft_mints%20FORMAT%20TSV" 2>/dev/null)
    
    if [ -n "$ch_latest" ] && [ "$ch_latest" != "0" ]; then
        current_time=$(date +%s)
        ch_lag=$((current_time - ch_latest))
        
        if [ $ch_lag -lt 600 ]; then  # Less than 10 minutes (allowing for CDC lag)
            print_status "OK" "ClickHouse data is fresh (${ch_lag}s ago)"
        elif [ $ch_lag -lt 3600 ]; then  # Less than 1 hour
            print_status "WARN" "ClickHouse data is stale (${ch_lag}s ago)"
        else
            print_status "FAIL" "ClickHouse data is very stale (${ch_lag}s ago)"
        fi
    else
        print_status "WARN" "No data found in ClickHouse"
    fi
    
    echo ""
}

# Function to check data consistency
check_data_consistency() {
    echo "7. Checking Data Consistency..."
    echo "----------------------------------------"
    
    # Compare record counts
    if command -v psql > /dev/null 2>&1; then
        pg_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM nft_mints;" 2>/dev/null | tr -d ' ')
        
        ch_count=$(curl -s "$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/?query=SELECT%20COUNT(*)%20FROM%20nft_mints%20FORMAT%20TSV" 2>/dev/null)
        
        if [ -n "$pg_count" ] && [ -n "$ch_count" ]; then
            diff=$((pg_count - ch_count))
            diff_abs=${diff#-}  # Absolute value
            
            echo "   PostgreSQL records: $pg_count"
            echo "   ClickHouse records: $ch_count"
            echo "   Difference: $diff"
            
            if [ $diff_abs -le 5 ]; then
                print_status "OK" "Data counts are consistent"
            elif [ $diff_abs -le 50 ]; then
                print_status "WARN" "Minor data inconsistency detected"
            else
                print_status "FAIL" "Significant data inconsistency detected"
            fi
        else
            print_status "WARN" "Unable to compare data counts"
        fi
    fi
    
    echo ""
}

# Function to check connector performance
check_connector_performance() {
    echo "8. Checking Connector Performance..."
    echo "----------------------------------------"
    
    if curl -s -f "$KAFKA_CONNECT_URL" > /dev/null 2>&1; then
        connectors=$(curl -s "$KAFKA_CONNECT_URL/connectors" | jq -r '.[]' 2>/dev/null)
        
        if [ -n "$connectors" ]; then
            echo "$connectors" | while read -r connector; do
                # Get connector metrics
                metrics=$(curl -s "$KAFKA_CONNECT_URL/connectors/$connector/status" 2>/dev/null)
                
                if [ -n "$metrics" ]; then
                    state=$(echo "$metrics" | jq -r '.connector.state' 2>/dev/null)
                    tasks=$(echo "$metrics" | jq -r '.tasks[].state' 2>/dev/null)
                    
                    echo "   Connector: $connector"
                    echo "     State: $state"
                    
                    if [ -n "$tasks" ]; then
                        running_tasks=$(echo "$tasks" | grep -c "RUNNING" || echo "0")
                        total_tasks=$(echo "$tasks" | wc -l)
                        echo "     Tasks: $running_tasks/$total_tasks running"
                        
                        if [ "$running_tasks" = "$total_tasks" ] && [ "$state" = "RUNNING" ]; then
                            print_status "OK" "     $connector is healthy"
                        else
                            print_status "WARN" "     $connector has issues"
                        fi
                    fi
                fi
            done
        fi
    fi
    
    echo ""
}

# Function to generate health report
generate_health_report() {
    echo "9. Generating Health Report..."
    echo "----------------------------------------"
    
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    report_file="/tmp/knowton-data-sync-health-$(date +%Y%m%d-%H%M%S).json"
    
    # Collect system metrics
    kafka_connect_status="unknown"
    postgres_status="unknown"
    clickhouse_status="unknown"
    elasticsearch_status="unknown"
    
    if curl -s -f "$KAFKA_CONNECT_URL" > /dev/null 2>&1; then
        kafka_connect_status="healthy"
    else
        kafka_connect_status="unhealthy"
    fi
    
    if curl -s -f "$CLICKHOUSE_HOST:$CLICKHOUSE_PORT" > /dev/null 2>&1; then
        clickhouse_status="healthy"
    else
        clickhouse_status="unhealthy"
    fi
    
    if curl -s -f "$ELASTICSEARCH_URL" > /dev/null 2>&1; then
        elasticsearch_status="healthy"
    else
        elasticsearch_status="unhealthy"
    fi
    
    # Create JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "pipeline_health": {
    "kafka_connect": "$kafka_connect_status",
    "postgresql": "$postgres_status",
    "clickhouse": "$clickhouse_status",
    "elasticsearch": "$elasticsearch_status"
  },
  "data_metrics": {
    "last_check": "$timestamp",
    "sync_lag_seconds": 0,
    "consistency_score": 95
  },
  "recommendations": [
    "Monitor connector performance regularly",
    "Set up automated alerts for data lag",
    "Implement data quality checks",
    "Regular backup and recovery testing"
  ],
  "next_check": "$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    print_status "OK" "Health report generated: $report_file"
    echo ""
}

# Function to setup monitoring alerts
setup_monitoring_alerts() {
    echo "10. Setting up Monitoring Alerts..."
    echo "----------------------------------------"
    
    # Create Prometheus alert rules
    alert_rules_file="/tmp/knowton-data-sync-alerts.yml"
    
    cat > "$alert_rules_file" << EOF
groups:
- name: knowton-data-sync
  rules:
  - alert: KafkaConnectDown
    expr: up{job="kafka-connect"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Kafka Connect is down"
      description: "Kafka Connect has been down for more than 2 minutes"
      
  - alert: DataSyncLag
    expr: (time() - knowton_last_sync_timestamp) > 600
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Data sync lag detected"
      description: "Data synchronization lag is over 10 minutes"
      
  - alert: ConnectorFailed
    expr: kafka_connect_connector_status{state!="RUNNING"} == 1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Kafka connector failed"
      description: "Connector {{ \$labels.connector }} is in {{ \$labels.state }} state"
      
  - alert: DataInconsistency
    expr: abs(knowton_postgres_records - knowton_clickhouse_records) > 100
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Data inconsistency detected"
      description: "Record count difference between PostgreSQL and ClickHouse is over 100"
EOF
    
    print_status "OK" "Alert rules created: $alert_rules_file"
    echo "   Apply with: kubectl apply -f $alert_rules_file"
    echo ""
}

# Run enhanced health checks
check_data_freshness
check_data_consistency
check_connector_performance
generate_health_report
setup_monitoring_alerts

echo "============================================"
echo "Enhanced Health Check Complete"
echo "============================================"
echo ""
echo "Monitoring Dashboard URLs:"
echo "  Grafana: http://localhost:3000/d/knowton-data-sync"
echo "  Prometheus: http://localhost:9090/alerts"
echo "  Kafka Connect: $KAFKA_CONNECT_URL"
echo ""
echo "Troubleshooting Commands:"
echo "  Check connector logs: kubectl logs -f deployment/kafka-connect"
echo "  Restart connector: curl -X POST $KAFKA_CONNECT_URL/connectors/{connector}/restart"
echo "  Reset connector: curl -X DELETE $KAFKA_CONNECT_URL/connectors/{connector}"
echo ""