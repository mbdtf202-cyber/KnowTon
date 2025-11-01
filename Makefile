.PHONY: help install dev build test clean deploy quick-deploy full-deploy verify stop

help:
	@echo "╔═══════════════════════════════════════════════════════════╗"
	@echo "║         KnowTon Platform - Available Commands             ║"
	@echo "╚═══════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "🚀 Deployment Commands:"
	@echo "  make deploy           - Interactive deployment menu"
	@echo "  make quick-deploy     - Quick local deployment (3-5 min)"
	@echo "  make full-deploy      - Full deployment with all services (10-15 min)"
	@echo "  make testnet-deploy   - Deploy to Arbitrum Sepolia testnet"
	@echo "  make verify           - Verify deployment status"
	@echo "  make stop             - Stop all services"
	@echo ""
	@echo "📦 Development Commands:"
	@echo "  make install          - Install all dependencies"
	@echo "  make dev              - Start development environment"
	@echo "  make build            - Build all packages"
	@echo "  make test             - Run all tests"
	@echo "  make test-contracts   - Run smart contract tests"
	@echo "  make test-e2e         - Run E2E tests"
	@echo "  make test-load        - Run load tests"
	@echo "  make clean            - Clean build artifacts"
	@echo ""
	@echo "🐳 Docker Commands:"
	@echo "  make docker-up        - Start Docker services"
	@echo "  make docker-down      - Stop Docker services"
	@echo "  make docker-logs      - View Docker logs"
	@echo "  make docker-clean     - Clean Docker resources"
	@echo ""
	@echo "🗄️  Database Commands:"
	@echo "  make db-migrate       - Run database migrations"
	@echo "  make db-seed          - Seed database with test data"
	@echo "  make db-reset         - Reset database"
	@echo ""
	@echo "☸️  Kubernetes Commands:"
	@echo "  make k8s-deploy       - Deploy to Kubernetes"
	@echo "  make k8s-status       - Check Kubernetes status"
	@echo ""
	@echo "🔧 Utility Commands:"
	@echo "  make build-images     - Build Docker images"
	@echo "  make lint             - Run linters"
	@echo "  make format           - Format code"
	@echo "  make monitoring       - Deploy monitoring stack"
	@echo ""
	@echo "📚 Documentation:"
	@echo "  make docs             - View deployment guide"
	@echo "  make quick-ref        - View quick reference"
	@echo ""

# ============================================
# Deployment Commands
# ============================================

deploy:
	@./deploy.sh

quick-deploy:
	@echo "🚀 Starting quick deployment..."
	@./scripts/quick-deploy.sh

full-deploy:
	@echo "🏗️  Starting full deployment..."
	@./scripts/full-deployment.sh

testnet-deploy:
	@echo "🌐 Deploying to testnet..."
	@./scripts/full-deployment.sh

verify:
	@echo "🔍 Verifying deployment..."
	@./scripts/verify-deployment.sh

stop:
	@echo "🛑 Stopping all services..."
	@./scripts/stop-services.sh

# ============================================
# Development Commands
# ============================================

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

test-e2e:
	@echo "🧪 Running E2E tests..."
	npm run test:e2e

test-load:
	@echo "🧪 Running load tests..."
	npm run test:load

test-all:
	@echo "🧪 Running all tests..."
	npm run test:all

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf packages/*/dist
	rm -rf packages/*/build
	rm -rf packages/*/.turbo
	rm -rf node_modules/.cache

docker-up:
	@echo "🐳 Starting Docker services..."
	docker-compose -f docker-compose.simple.yml up -d

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose -f docker-compose.simple.yml down

docker-logs:
	@echo "📋 Viewing Docker logs..."
	docker-compose -f docker-compose.simple.yml logs -f

docker-clean:
	@echo "🧹 Cleaning Docker resources..."
	docker-compose -f docker-compose.simple.yml down -v
	docker system prune -f

db-migrate:
	@echo "🗄️  Running database migrations..."
	cd packages/backend && npx prisma migrate dev

db-seed:
	@echo "🌱 Seeding database..."
	cd packages/backend && npx prisma db seed

db-reset:
	@echo "🔄 Resetting database..."
	cd packages/backend && npx prisma migrate reset

k8s-deploy:
	@echo "☸️  Deploying to Kubernetes..."
	./scripts/deploy-k8s.sh

k8s-status:
	@echo "☸️  Checking Kubernetes status..."
	kubectl get pods -n knowton-dev
	kubectl get services -n knowton-dev

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

monitoring:
	@echo "📊 Deploying monitoring stack..."
	./scripts/deploy-monitoring.sh

monitoring-port:
	@echo "📊 Port-forwarding monitoring services..."
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana: http://localhost:3000 (admin/admin123)"
	@echo ""
	@echo "Press Ctrl+C to stop port-forwarding"
	@kubectl port-forward -n knowton-dev svc/prometheus-service 9090:9090 & \
	kubectl port-forward -n knowton-dev svc/grafana-service 3000:3000


# ============================================
# Documentation Commands
# ============================================

docs:
	@echo "📚 Opening deployment guide..."
	@less DEPLOYMENT_GUIDE.md || cat DEPLOYMENT_GUIDE.md

quick-ref:
	@echo "📋 Opening quick reference..."
	@less QUICK_DEPLOY.md || cat QUICK_DEPLOY.md

# ============================================
# Shortcuts
# ============================================

up: quick-deploy
down: stop
status: verify
logs: docker-logs
