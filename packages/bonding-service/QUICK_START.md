# Bonding Service - Quick Start Guide

## What is this?

A Go-based gRPC microservice for issuing and managing IP-backed bonds in the KnowTon platform. It includes an AI-driven risk assessment engine and integrates with the IPBond smart contract on Arbitrum.

## Quick Setup

### 1. Install Dependencies

```bash
cd packages/bonding-service
go mod download
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Generate Protobuf Code

```bash
make proto
```

### 4. Run the Service

```bash
make run
```

The service will start on `localhost:50051`.

## Test the Service

### Using grpcurl

```bash
# Assess IP Risk
grpcurl -plaintext -d '{
  "ipnft_id": "QmTest123",
  "metadata": {
    "category": "music",
    "views": 10000,
    "likes": 500
  }
}' localhost:50051 bonding.BondingService/AssessIPRisk

# Issue a Bond
grpcurl -plaintext -d '{
  "ipnft_id": "QmTest123",
  "total_value": "100000000000000000000",
  "maturity_date": 1735689600,
  "senior": {"name": "Senior", "priority": 1, "allocation_percentage": "50", "apy": 5.0, "risk_level": "Low"},
  "mezzanine": {"name": "Mezzanine", "priority": 2, "allocation_percentage": "33", "apy": 10.0, "risk_level": "Medium"},
  "junior": {"name": "Junior", "priority": 3, "allocation_percentage": "17", "apy": 20.0, "risk_level": "High"},
  "issuer_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}' localhost:50051 bonding.BondingService/IssueBond
```

### Using the Example Client

```bash
go run examples/client.go
```

## Key Features

✅ **Bond Issuance**: Create IP-backed bonds with 3-tranche structure (Senior/Mezzanine/Junior)  
✅ **Risk Assessment**: AI-driven valuation and risk rating (AAA to CCC)  
✅ **Smart Contract Integration**: Direct integration with IPBond contract on Arbitrum  
✅ **Database Persistence**: PostgreSQL storage for bonds, tranches, and investments  
✅ **gRPC API**: High-performance RPC interface  

## Architecture

```
Client → gRPC (port 50051) → Bonding Service → [Risk Engine, Smart Contract, Database]
```

## Tranche Structure

- **Senior (50%)**: Low risk, 5-8% APY, priority 1
- **Mezzanine (33%)**: Medium risk, 10-15% APY, priority 2
- **Junior (17%)**: High risk, 20-30% APY, priority 3

## Docker Deployment

```bash
make docker-build
make docker-run
```

## Kubernetes Deployment

```bash
kubectl apply -f k8s/dev/bonding-deployment.yaml
```

## Documentation

- [README.md](README.md) - Full documentation
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation details
- [proto/bonding.proto](proto/bonding.proto) - API specification

## Support

For issues or questions, see the main KnowTon platform documentation.
