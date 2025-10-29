#!/bin/bash

# Kafka topics initialization script for KnowTon platform

KAFKA_BROKER="localhost:9092"
PARTITIONS=3
REPLICATION_FACTOR=1

echo "Creating Kafka topics..."

# NFT events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic nft-minted \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic nft-transferred \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic nft-burned \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

# Content events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic content-uploaded \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic content-verified \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

# Trading events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic trades \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic orders-created \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic orders-cancelled \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

# Royalty events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic royalty-distributions \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

# Fractionalization events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic vault-created \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic vault-redeemed \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

# Staking events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic staking-events \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

# Governance events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic proposals-created \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic votes-cast \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic proposals-executed \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

# Bond events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic bonds-issued \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic bonds-invested \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic bonds-redeemed \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

# Lending events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic collateral-supplied \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic loans-borrowed \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic loans-repaid \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

# User events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic user-registered \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic user-activity \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

# Analytics events (for real-time processing)
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic analytics-events \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=604800000 \
  --if-not-exists

# Dead letter queue for failed events
kafka-topics --create \
  --bootstrap-server $KAFKA_BROKER \
  --topic dlq-failed-events \
  --partitions $PARTITIONS \
  --replication-factor $REPLICATION_FACTOR \
  --config retention.ms=2592000000 \
  --if-not-exists

echo "Kafka topics created successfully"
echo "Listing all topics:"
kafka-topics --list --bootstrap-server $KAFKA_BROKER
