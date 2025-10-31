#!/bin/bash

# Integration Tests Runner Script
# Runs comprehensive integration tests for KnowTon platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}
KAFKA_BROKERS=${KAFKA_BROKERS:-"localhost:9092"}
TIMEOUT=${TIMEOUT:-30000}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}KnowTon Integration Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if service is running
check_service() {
    local service_name=$1
    local service_url=$2
    local max_retries=30
    local retry_count=0

    echo -n "Checking $service_name... "
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -s -f "$service_url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
            return 0
        fi
        retry_count=$((retry_count + 1))
        sleep 1
    done
    
    echo -e "${RED}✗${NC}"
    return 1
}

# Function to check Kafka
check_kafka() {
    echo -n "Checking Kafka... "
    
    # Try to list topics (requires kafka-topics.sh or kafkacat)
    if command -v kafkacat &> /dev/null; then
        if kafkacat -L -b "$KAFKA_BROKERS" &> /dev/null; then
            echo -e "${GREEN}✓${NC}"
            return 0
        fi
    fi
    
    # Fallback: just check if port is open
    if nc -z localhost 9092 2>/dev/null; then
        echo -e "${YELLOW}⚠ (port open, but not verified)${NC}"
        return 0
    fi
    
    echo -e "${RED}✗${NC}"
    return 1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
echo ""

SERVICES_OK=true

# Check API
if ! check_service "API Server" "$API_BASE_URL/api/v1/health"; then
    echo -e "${RED}API Server is not running at $API_BASE_URL${NC}"
    SERVICES_OK=false
fi

# Check Kafka
if ! check_kafka; then
    echo -e "${YELLOW}Warning: Kafka is not running. Kafka tests will be skipped.${NC}"
fi

# Check PostgreSQL
if ! check_service "PostgreSQL" "http://localhost:5432" 2>/dev/null; then
    echo -e "${YELLOW}Warning: PostgreSQL may not be running${NC}"
fi

# Check MongoDB
if ! nc -z localhost 27017 2>/dev/null; then
    echo -e "${YELLOW}Warning: MongoDB may not be running${NC}"
fi

# Check Redis
if ! nc -z localhost 6379 2>/dev/null; then
    echo -e "${YELLOW}Warning: Redis may not be running${NC}"
fi

echo ""

if [ "$SERVICES_OK" = false ]; then
    echo -e "${RED}Required services are not running!${NC}"
    echo -e "${YELLOW}Please start services with: docker-compose -f docker-compose.dev.yml up -d${NC}"
    exit 1
fi

# Export environment variables
export API_BASE_URL
export KAFKA_BROKERS
export NODE_ENV=test

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running Integration Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Parse command line arguments
TEST_SUITE=""
COVERAGE=false
VERBOSE=false
WATCH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build Jest command
JEST_CMD="npx jest"

if [ -n "$TEST_SUITE" ]; then
    JEST_CMD="$JEST_CMD $TEST_SUITE"
fi

if [ "$COVERAGE" = true ]; then
    JEST_CMD="$JEST_CMD --coverage"
fi

if [ "$VERBOSE" = true ]; then
    JEST_CMD="$JEST_CMD --verbose"
fi

if [ "$WATCH" = true ]; then
    JEST_CMD="$JEST_CMD --watch"
fi

# Run tests
echo -e "${GREEN}Executing: $JEST_CMD${NC}"
echo ""

if $JEST_CMD; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ Some tests failed${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
