#!/bin/bash

set -e

echo "🚀 Starting KnowTon Platform..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start infrastructure services
echo "📦 Starting infrastructure services..."
docker-compose up -d postgres redis mongodb clickhouse kafka elasticsearch

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Initialize databases
echo "🔧 Initializing databases..."
docker-compose exec -T mongodb mongosh -u knowton -p knowton_mongo_password --authenticationDatabase admin < scripts/mongodb-init.js || true
docker-compose exec -T clickhouse clickhouse-client --multiquery < scripts/clickhouse-init.sql || true

# Initialize Kafka topics
echo "📨 Creating Kafka topics..."
bash scripts/kafka-init.sh || true

# Initialize Elasticsearch indices
echo "🔍 Creating Elasticsearch indices..."
bash scripts/elasticsearch-init.sh || true

# Run database migrations
echo "🗄️  Running database migrations..."
cd packages/backend && npx prisma migrate dev --name init && cd ../..

# Start backend services
echo "🖥️  Starting backend services..."
cd packages/backend && npm run dev &
BACKEND_PID=$!

# Start frontend
echo "🎨 Starting frontend..."
cd packages/frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ KnowTon Platform is starting!"
echo ""
echo "📍 Services:"
echo "   Frontend:     http://localhost:5173"
echo "   Backend API:  http://localhost:3000"
echo "   PostgreSQL:   localhost:5432"
echo "   Redis:        localhost:6379"
echo "   MongoDB:      localhost:27017"
echo "   ClickHouse:   localhost:8123"
echo "   Kafka:        localhost:9092"
echo "   Elasticsearch: localhost:9200"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit" INT
wait
