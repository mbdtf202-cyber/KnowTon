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
