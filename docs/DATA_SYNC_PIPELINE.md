# KnowTon Data Synchronization Pipeline

## Overview

The KnowTon platform implements a comprehensive data synchronization pipeline that ensures data consistency across multiple data stores (PostgreSQL, ClickHouse, Elasticsearch) using Change Data Capture (CDC) and Kafka Connect.

## Architecture

```
┌─────────────┐
│ PostgreSQL  │ (Source of Truth)
│  (Primary)  │
└──────┬──────┘
       │ CDC (Debezium)
       ▼
┌─────────────┐
│   Kafka     │ (Message Bus)
│  Topics     │
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ ClickHouse  │   │Elasticsearch│   │   Backend   │
│ (Analytics) │   │  (Search)   │   │  Services   │
└─────────────┘   └─────────────┘   └─────────────┘
```

## Components

### 1. CDC (Change Data Capture)

**Purpose**: Capture database changes in real-time from PostgreSQL

**Technology**: Debezium PostgreSQL Connector

**Features**:
- Logical replication using PostgreSQL's `pgoutput` plugin
- Captures INSERT, UPDATE, DELETE operations
- Minimal performance impact on source database
- Guaranteed delivery with Kafka
- Schema evolution support

**Configuration**: `scripts/kafka-connect-postgres-cdc.json`

### 2. Kafka Connect

**Purpose**: Distributed platform for streaming data between systems

**Connectors**:
- **Source Connector**: Debezium PostgreSQL CDC
- **Sink Connectors**: 
  - ClickHouse (analytics)
  - Elasticsearch (search)

**Deployment**: `k8s/dev/kafka-connect-deployment.yaml`

### 3. Data Sync Service

**Purpose**: Application-level data synchronization and transformation

**Location**: `packages/backend/src/services/cdc-sync.service.ts`

**Features**:
- Polling-based change detection (fallback)
- Data transformation and enrichment
- Direct sync to ClickHouse and Elasticsearch
- Error handling and retry logic

## Setup Instructions

### Prerequisites

1. PostgreSQL 10+ with logical replication enabled
2. Kafka cluster running
3. ClickHouse database
4. Elasticsearch cluster

### Step 1: Enable PostgreSQL CDC

```bash
# Run the CDC setup script
psql -U knowton -d knowton -f scripts/postgres-enable-cdc.sql
```

This script:
- Creates a publication for CDC
- Sets up replication slot
- Creates monitoring views
- Grants necessary permissions

### Step 2: Deploy Kafka Connect

```bash
# Deploy Kafka Connect to Kubernetes
kubectl apply -f k8s/dev/kafka-connect-deployment.yaml

# Wait for Kafka Connect to be ready
kubectl wait --for=condition=ready pod -l app=kafka-connect -n knowton-dev --timeout=300s
```

### Step 3: Deploy Connectors

```bash
# Deploy all Kafka Connect connectors
./scripts/deploy-kafka-connectors.sh
```

This deploys:
- PostgreSQL CDC source connector
- ClickHouse sink connector
- Elasticsearch sink connector

### Step 4: Verify Setup

```bash
# Check connector status
curl http://localhost:8083/connectors

# Check specific connector
curl http://localhost:8083/connectors/postgres-cdc-source-connector/status

# View CDC health in PostgreSQL
psql -U knowton -d knowton -c "SELECT * FROM check_cdc_health();"
```

## Data Flow

### 1. Database Changes → Kafka

When data changes in PostgreSQL:

```sql
INSERT INTO "User" (address, username, email) 
VALUES ('0x123...', 'alice', 'alice@example.com');
```

Debezium captures the change and publishes to Kafka topic `cdc-User`:

```json
{
  "op": "c",
  "after": {
    "address": "0x123...",
    "username": "alice",
    "email": "alice@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "source": {
    "db": "knowton",
    "table": "User",
    "ts_ms": 1705318200000
  }
}
```

### 2. Kafka → ClickHouse

ClickHouse sink connector consumes from Kafka and inserts into analytics tables:

```sql
INSERT INTO user_activity (
  date, user_address, action_type, action_count, total_value
) VALUES (
  '2024-01-15', '0x123...', 'registration', 1, 0
);
```

### 3. Kafka → Elasticsearch

Elasticsearch sink connector indexes data for search:

```json
PUT /knowton-users/_doc/0x123...
{
  "address": "0x123...",
  "username": "alice",
  "bio": "",
  "reputation": 0,
  "indexed_at": "2024-01-15T10:30:00Z"
}
```

## Monitoring

### Kafka Connect Metrics

```bash
# View connector metrics
curl http://localhost:8083/connectors/postgres-cdc-source-connector/status | jq

# View task status
curl http://localhost:8083/connectors/postgres-cdc-source-connector/tasks/0/status | jq
```

### PostgreSQL Replication Lag

```sql
-- Check replication lag
SELECT * FROM replication_status;

-- Check published tables
SELECT * FROM published_tables;
```

### ClickHouse Data Verification

```sql
-- Check recent inserts
SELECT 
  table,
  count() as row_count,
  max(event_time) as last_insert
FROM system.parts
WHERE database = 'knowton'
GROUP BY table
ORDER BY last_insert DESC;
```

### Elasticsearch Index Status

```bash
# Check index health
curl http://localhost:9200/_cat/indices/knowton-*?v

# Check recent documents
curl http://localhost:9200/knowton-users/_search?size=10&sort=indexed_at:desc
```

## Troubleshooting

### Connector Fails to Start

**Symptom**: Connector status shows `FAILED`

**Solution**:
```bash
# Check connector logs
kubectl logs -f deployment/kafka-connect -n knowton-dev

# Restart connector
curl -X POST http://localhost:8083/connectors/postgres-cdc-source-connector/restart
```

### Replication Lag

**Symptom**: Data not appearing in ClickHouse/Elasticsearch

**Solution**:
```sql
-- Check replication slot lag
SELECT 
  slot_name,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag
FROM pg_replication_slots
WHERE slot_name LIKE 'knowton%';

-- If lag is too large, consider increasing Kafka Connect resources
```

### Schema Changes

**Symptom**: Connector fails after schema change

**Solution**:
```bash
# Update connector configuration
curl -X PUT http://localhost:8083/connectors/postgres-cdc-source-connector/config \
  -H "Content-Type: application/json" \
  -d @scripts/kafka-connect-postgres-cdc.json

# Or restart connector
curl -X POST http://localhost:8083/connectors/postgres-cdc-source-connector/restart
```

### Dead Letter Queue

**Symptom**: Messages failing to process

**Solution**:
```bash
# Check DLQ topics
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic dlq-clickhouse-failed \
  --from-beginning

# Reprocess failed messages (manual intervention required)
```

## Performance Tuning

### Kafka Connect

```properties
# Increase batch size for better throughput
consumer.max.poll.records=1000
producer.batch.size=32768
producer.linger.ms=100

# Increase memory
KAFKA_HEAP_OPTS="-Xms2G -Xmx2G"
```

### ClickHouse Sink

```json
{
  "clickhouse.insert.batch.size": "5000",
  "clickhouse.insert.batch.timeout.ms": "10000"
}
```

### Elasticsearch Sink

```json
{
  "batch.size": "1000",
  "max.buffered.records": "10000",
  "linger.ms": "1000"
}
```

## Best Practices

1. **Monitor Replication Lag**: Set up alerts for replication lag > 1 minute
2. **Regular Backups**: Backup replication slot state
3. **Schema Versioning**: Use schema registry for Kafka messages
4. **Error Handling**: Configure DLQ for failed messages
5. **Resource Limits**: Set appropriate CPU/memory limits for Kafka Connect
6. **Testing**: Test schema changes in staging before production
7. **Documentation**: Document custom transformations and mappings

## Maintenance

### Backup Replication Slot

```sql
-- Create backup of replication slot
SELECT pg_export_snapshot();
```

### Clean Up Old Data

```sql
-- ClickHouse: TTL policies handle automatic cleanup
-- Check TTL status
SELECT 
  table,
  partition,
  rows,
  bytes_on_disk
FROM system.parts
WHERE database = 'knowton' AND active
ORDER BY modification_time DESC;
```

### Update Connectors

```bash
# Update connector configuration
./scripts/deploy-kafka-connectors.sh

# Rolling restart
kubectl rollout restart deployment/kafka-connect -n knowton-dev
```

## References

- [Debezium PostgreSQL Connector](https://debezium.io/documentation/reference/connectors/postgresql.html)
- [Kafka Connect Documentation](https://kafka.apache.org/documentation/#connect)
- [ClickHouse Kafka Integration](https://clickhouse.com/docs/en/integrations/kafka)
- [Elasticsearch Kafka Connector](https://docs.confluent.io/kafka-connect-elasticsearch/current/)
