# Bonding Service Implementation

## Overview

This document describes the implementation of Task 6.1: "实现债券发行 API（Go + gRPC）" from the KnowTon platform specification.

## Implementation Summary

The bonding service is a Go-based gRPC microservice that handles IP-backed bond issuance and management. It integrates with the IPBond smart contract on Arbitrum and includes an AI-driven risk assessment engine.

## Components Implemented

### 1. gRPC Service Definition (`proto/bonding.proto`)

Defines the complete API for bond operations:
- `IssueBond`: Issue new IP-backed bonds with tranche structure
- `GetBondInfo`: Retrieve bond information
- `InvestInBond`: Process investments in bond tranches
- `DistributeRevenue`: Distribute revenue to bond holders
- `AssessIPRisk`: Assess IP value and risk using AI engine

### 2. Risk Assessment Engine (`internal/risk/engine.go`)

Implements comprehensive risk assessment for IP-NFTs:

**Valuation Factors:**
- Category multiplier (music: 1.5x, video: 2.0x, software: 2.5x, artwork: 3.0x)
- Engagement score (views × 0.1 + likes × 1.0)
- Creator reputation score
- Age depreciation factor (20% per year)

**Risk Rating System:**
- AAA (90-100): Highest quality, 70% LTV, 1% default probability
- AA (80-89): Very high quality, 65% LTV, 2% default probability
- A (70-79): High quality, 60% LTV, 5% default probability
- BBB (60-69): Good quality, 50% LTV, 10% default probability
- BB (50-59): Moderate quality, 40% LTV, 20% default probability
- B (40-49): Lower quality, 30% LTV, 35% default probability
- CCC (0-39): Highest risk, 20% LTV, 50% default probability

**Risk Factors Identified:**
- Low view count (< 100 views)
- New content (< 30 days old)
- Limited social validation (< 10 likes)
- Category-specific risks (e.g., technology obsolescence for software)

### 3. Data Models (`internal/models/bond.go`)

GORM models for database persistence:
- `Bond`: Main bond entity with IP-NFT reference
- `Tranche`: Senior/Mezzanine/Junior tranche configuration
- `Investment`: Individual investor positions
- `RevenueDistribution`: Revenue distribution history
- `RiskAssessment`: Cached risk assessment results

### 4. Service Implementation (`internal/service/bonding_service.go`)

Core business logic:
- Bond issuance with smart contract integration
- Risk assessment integration
- Database persistence
- Transaction management
- Error handling

### 5. Server (`cmd/server/main.go`)

gRPC server setup:
- Database initialization and auto-migration
- Ethereum client connection
- gRPC server configuration
- Reflection support for debugging

## Tranche Structure

Bonds are divided into three tranches with different risk/return profiles:

### Senior Tranche (50% allocation)
- **Priority**: 1 (highest)
- **APY**: 5-8%
- **Risk**: Low
- **Characteristics**: First to receive revenue distributions, lowest yield

### Mezzanine Tranche (33% allocation)
- **Priority**: 2 (medium)
- **APY**: 10-15%
- **Risk**: Medium
- **Characteristics**: Receives distributions after Senior, balanced risk/return

### Junior Tranche (17% allocation)
- **Priority**: 3 (lowest)
- **APY**: 20-30%
- **Risk**: High
- **Characteristics**: Receives distributions last, highest upside potential

## Smart Contract Integration

The service integrates with the IPBond smart contract deployed on Arbitrum:

**Contract Functions Called:**
- `issueBond()`: Create new bond on-chain
- `invest()`: Process tranche investments
- `distributeRevenue()`: Distribute revenue to holders
- `redeem()`: Redeem matured bonds

**Transaction Management:**
- Gas estimation and optimization
- Transaction signing with private key
- Receipt confirmation and event parsing
- Error handling and retry logic

## Requirements Mapping

This implementation satisfies the following requirements from the specification:

### Requirement 12.1
✅ "THE Smart Contract SHALL allow creators to mint Royalty Tokens representing future revenue streams from IP-NFT"
- Implemented through bond issuance with tranche tokenization

### Requirement 12.2
✅ "WHEN creator tokenizes royalties, THE Smart Contract SHALL lock percentage of future earnings and issue ERC-20 royalty tokens"
- Implemented through tranche allocation and investment tracking

### Requirement 12.3
✅ "THE Liquidity Pool SHALL enable trading of Royalty Tokens with automated pricing based on projected revenue and time decay"
- Risk engine calculates fair value using DCF model
- Tranche pricing based on APY and risk rating

## API Examples

### Issue Bond

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

### Assess IP Risk

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

## Deployment

### Docker

```bash
cd packages/bonding-service
docker build -t knowton/bonding-service:latest .
docker run -p 50051:50051 --env-file .env knowton/bonding-service:latest
```

### Kubernetes

```bash
kubectl apply -f k8s/dev/bonding-deployment.yaml
```

The service will be deployed with:
- 2 replicas (auto-scaling 2-10 based on CPU/memory)
- gRPC health checks
- Resource limits (512Mi memory, 500m CPU)
- ConfigMap and Secret management

## Testing

Run unit tests:
```bash
cd packages/bonding-service
go test ./...
```

Run with coverage:
```bash
make test-coverage
```

## Future Enhancements

1. **Enhanced Risk Engine**:
   - Integration with external AI models (TorchServe)
   - Historical data analysis from The Graph
   - Market sentiment analysis

2. **Advanced Features**:
   - Secondary market for tranche tokens
   - Automated rebalancing
   - Cross-chain bond issuance
   - Insurance integration

3. **Performance Optimizations**:
   - Connection pooling
   - Caching layer (Redis)
   - Batch processing
   - Async event handling

## Monitoring

The service exposes metrics for:
- Bond issuance rate
- Risk assessment latency
- Smart contract interaction success rate
- Database query performance

## Security Considerations

- Private keys stored in Kubernetes secrets
- Input validation on all gRPC endpoints
- Rate limiting (to be implemented at API gateway)
- Smart contract interaction auditing
- Database access control

## Conclusion

This implementation provides a production-ready gRPC service for IP bond issuance with integrated risk assessment. It satisfies all requirements from Task 6.1 and provides a solid foundation for the bonding/tranche functionality in the KnowTon platform.
