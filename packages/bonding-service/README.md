# Bonding Service

Go-based gRPC service for IP Bond issuance and management in the KnowTon platform.

## Features

- **Bond Issuance**: Issue IP-backed bonds with tranche structure (Senior/Mezzanine/Junior)
- **Risk Assessment**: AI-driven risk assessment engine for IP valuation
- **Smart Contract Integration**: Direct integration with IPBond smart contract on Arbitrum
- **Investment Management**: Handle investments in bond tranches
- **Revenue Distribution**: Automated revenue distribution to bond holders

## Architecture

```
┌─────────────────┐
│   gRPC Client   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Bonding Service│
│   (Go + gRPC)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│  Risk  │ │ IPBond   │
│ Engine │ │ Contract │
└────────┘ └──────────┘
```

## Prerequisites

- Go 1.21+
- PostgreSQL 14+
- Protocol Buffers compiler (protoc)
- Access to Arbitrum RPC node

## Installation

1. Install dependencies:
```bash
cd packages/bonding-service
go mod download
```

2. Generate protobuf code:
```bash
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/bonding.proto
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
go run cmd/server/main.go
```

## Usage

### Start the server

```bash
go run cmd/server/main.go
```

The gRPC server will start on port 50051 (configurable via GRPC_PORT).

### gRPC API

#### IssueBond

Issue a new IP-backed bond:

```bash
grpcurl -plaintext -d '{
  "ipnft_id": "QmHash123",
  "total_value": "100000000000000000000",
  "maturity_date": 1735689600,
  "senior": {
    "name": "Senior",
    "priority": 1,
    "allocation_percentage": "50",
    "apy": 5.0,
    "risk_level": "Low"
  },
  "mezzanine": {
    "name": "Mezzanine",
    "priority": 2,
    "allocation_percentage": "33",
    "apy": 10.0,
    "risk_level": "Medium"
  },
  "junior": {
    "name": "Junior",
    "priority": 3,
    "allocation_percentage": "17",
    "apy": 20.0,
    "risk_level": "High"
  },
  "issuer_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}' localhost:50051 bonding.BondingService/IssueBond
```

#### GetBondInfo

Retrieve bond information:

```bash
grpcurl -plaintext -d '{
  "bond_id": "BOND-1234567890"
}' localhost:50051 bonding.BondingService/GetBondInfo
```

#### AssessIPRisk

Assess IP risk and valuation:

```bash
grpcurl -plaintext -d '{
  "ipnft_id": "QmHash123",
  "metadata": {
    "category": "music",
    "creator_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "created_at": 1704067200,
    "views": 10000,
    "likes": 500,
    "tags": ["original", "popular", "trending"],
    "content_hash": "QmHash123"
  }
}' localhost:50051 bonding.BondingService/AssessIPRisk
```

## Risk Assessment Engine

The risk engine evaluates IP-NFTs based on multiple factors:

### Valuation Factors
- **Category Multiplier**: Different content types have different base values
- **Engagement Score**: Views and likes indicate popularity
- **Creator Reputation**: Historical performance of the creator
- **Age Factor**: Content depreciation over time

### Risk Rating Scale
- **AAA**: Highest quality, lowest risk (90-100 score)
- **AA**: Very high quality (80-89 score)
- **A**: High quality (70-79 score)
- **BBB**: Good quality (60-69 score)
- **BB**: Moderate quality (50-59 score)
- **B**: Lower quality (40-49 score)
- **CCC**: Highest risk (0-39 score)

### Loan-to-Value (LTV) Ratios
- **AAA**: 70% LTV
- **AA**: 65% LTV
- **A**: 60% LTV
- **BBB**: 50% LTV
- **BB**: 40% LTV
- **B**: 30% LTV
- **CCC**: 20% LTV

## Tranche Structure

Bonds are divided into three tranches with different risk/return profiles:

### Senior Tranche (50% allocation)
- **Priority**: 1 (highest)
- **APY**: 5-8%
- **Risk**: Low
- **First to receive revenue distributions**

### Mezzanine Tranche (33% allocation)
- **Priority**: 2 (medium)
- **APY**: 10-15%
- **Risk**: Medium
- **Receives distributions after Senior**

### Junior Tranche (17% allocation)
- **Priority**: 3 (lowest)
- **APY**: 20-30%
- **Risk**: High
- **Receives distributions last, highest upside**

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t knowton/bonding-service:latest .

# Run container
docker run -d \
  --name bonding-service \
  -p 50051:50051 \
  --env-file .env \
  knowton/bonding-service:latest
```

## Kubernetes Deployment

Deploy to Kubernetes:

```bash
kubectl apply -f k8s/bonding-deployment.yaml
```

## Development

### Run tests

```bash
go test ./...
```

### Run with hot reload

```bash
go install github.com/cosmtrek/air@latest
air
```

### Generate protobuf code

```bash
make proto
```

## Integration with Backend Services

The bonding service integrates with:

- **IPBond Smart Contract**: On-chain bond management
- **Risk Engine**: AI-driven valuation and risk assessment
- **PostgreSQL**: Bond and investment data storage
- **Oracle Adapter**: External data feeds for risk assessment

## API Reference

See [proto/bonding.proto](proto/bonding.proto) for complete API specification.

## License

MIT
