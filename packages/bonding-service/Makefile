.PHONY: proto build run test clean docker-build docker-run

# Generate protobuf code
proto:
	@echo "Generating protobuf code..."
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/bonding.proto

# Build the service
build:
	@echo "Building bonding service..."
	go build -o bin/bonding-service ./cmd/server

# Run the service
run:
	@echo "Running bonding service..."
	go run ./cmd/server/main.go

# Run tests
test:
	@echo "Running all tests..."
	go test -v ./... -timeout 30m

# Run unit tests only
test-unit:
	@echo "Running unit tests..."
	go test -v -short ./...

# Run integration tests
test-integration:
	@echo "Running integration tests..."
	@echo "Make sure you have set the following environment variables:"
	@echo "  - ARBITRUM_RPC_URL"
	@echo "  - IPBOND_CONTRACT_ADDRESS"
	@echo "  - PRIVATE_KEY"
	@echo "  - AI_ORACLE_URL (optional)"
	@echo ""
	go test -v ./test/integration/... ./internal/blockchain/*_integration_test.go -timeout 30m

# Run contract integration tests only
test-integration-contract:
	@echo "Running contract integration tests..."
	go test -v ./internal/blockchain/contract_integration_test.go -timeout 15m

# Run full lifecycle integration tests only
test-integration-lifecycle:
	@echo "Running full lifecycle integration tests..."
	go test -v ./test/integration/bond_lifecycle_test.go -timeout 15m

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html

# Install dependencies
deps:
	@echo "Installing dependencies..."
	go mod download
	go mod tidy

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...

# Lint code
lint:
	@echo "Linting code..."
	golangci-lint run

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	docker build -t knowton/bonding-service:latest .

# Run Docker container
docker-run:
	@echo "Running Docker container..."
	docker run -d \
		--name bonding-service \
		-p 50051:50051 \
		--env-file .env \
		knowton/bonding-service:latest

# Stop Docker container
docker-stop:
	@echo "Stopping Docker container..."
	docker stop bonding-service
	docker rm bonding-service

# Development mode with hot reload
dev:
	@echo "Starting development mode..."
	air

# Install development tools
install-tools:
	@echo "Installing development tools..."
	go install github.com/cosmtrek/air@latest
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Help
help:
	@echo "Available targets:"
	@echo "  proto                      - Generate protobuf code"
	@echo "  build                      - Build the service"
	@echo "  run                        - Run the service"
	@echo "  test                       - Run all tests (unit + integration)"
	@echo "  test-unit                  - Run unit tests only"
	@echo "  test-integration           - Run all integration tests"
	@echo "  test-integration-contract  - Run contract integration tests"
	@echo "  test-integration-lifecycle - Run full lifecycle tests"
	@echo "  test-coverage              - Run tests with coverage"
	@echo "  clean                      - Clean build artifacts"
	@echo "  deps                       - Install dependencies"
	@echo "  fmt                        - Format code"
	@echo "  lint                       - Lint code"
	@echo "  docker-build               - Build Docker image"
	@echo "  docker-run                 - Run Docker container"
	@echo "  docker-stop                - Stop Docker container"
	@echo "  dev                        - Start development mode"
	@echo "  install-tools              - Install development tools"
