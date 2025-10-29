.PHONY: help install dev build test clean deploy

help:
	@echo "KnowTon Platform - Available Commands:"
	@echo ""
	@echo "  make install          - Install all dependencies"
	@echo "  make dev              - Start development environment"
	@echo "  make build            - Build all packages"
	@echo "  make test             - Run all tests"
	@echo "  make test-contracts   - Run smart contract tests"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make docker-up        - Start Docker services"
	@echo "  make docker-down      - Stop Docker services"
	@echo "  make db-migrate       - Run database migrations"
	@echo "  make db-seed          - Seed database with test data"
	@echo "  make k8s-deploy       - Deploy to Kubernetes"
	@echo "  make build-images     - Build Docker images"
	@echo "  make lint             - Run linters"
	@echo "  make format           - Format code"

install:
	@echo "📦 Installing dependencies..."
	npm install
	cd packages/contracts && npm install
	cd packages/backend && npm install
	cd packages/frontend && npm install
	cd packages/sdk && npm install

dev:
	@echo "🚀 Starting development environment..."
	./scripts/quick-start.sh

build:
	@echo "🔨 Building all packages..."
	npm run build

test:
	@echo "🧪 Running tests..."
	npm run test

test-contracts:
	@echo "🧪 Running smart contract tests..."
	cd packages/contracts && npm run test

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf packages/*/dist
	rm -rf packages/*/build
	rm -rf packages/*/.turbo
	rm -rf node_modules/.cache

docker-up:
	@echo "🐳 Starting Docker services..."
	docker-compose up -d

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose down

db-migrate:
	@echo "🗄️  Running database migrations..."
	cd packages/backend && npx prisma migrate dev

db-seed:
	@echo "🌱 Seeding database..."
	cd packages/backend && npx prisma db seed

k8s-deploy:
	@echo "☸️  Deploying to Kubernetes..."
	./scripts/deploy-k8s.sh

build-images:
	@echo "🐳 Building Docker images..."
	./scripts/build-images.sh

lint:
	@echo "🔍 Running linters..."
	npm run lint

format:
	@echo "✨ Formatting code..."
	npm run format

init-data:
	@echo "🔧 Initializing data layers..."
	bash scripts/kafka-init.sh
	bash scripts/elasticsearch-init.sh
	docker-compose exec -T mongodb mongosh -u knowton -p knowton_mongo_password --authenticationDatabase admin < scripts/mongodb-init.js
	docker-compose exec -T clickhouse clickhouse-client --multiquery < scripts/clickhouse-init.sql
