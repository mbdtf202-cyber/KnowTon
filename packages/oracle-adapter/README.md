# Oracle Adapter Service

AI-powered oracle service for the KnowTon platform, providing content fingerprinting, similarity detection, IP valuation, and personalized recommendations.

## Features

- **Content Fingerprinting**: Generate AI-based fingerprints for images, audio, and video
- **Similarity Detection**: Compare content fingerprints to detect potential copyright infringement
- **IP Valuation**: Estimate intellectual property value using machine learning models
- **Chainlink Integration**: Submit valuation results to Chainlink Oracle for on-chain verification
- **Recommendations**: Provide personalized content recommendations using collaborative filtering

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Oracle Adapter Service                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Fingerprint  │  │  Valuation   │  │Recommendation│      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │  AI Models     │                        │
│                    │  (TorchServe)  │                        │
│                    └────────────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌─────────┐         ┌──────────┐        ┌──────────┐
   │  IPFS   │         │Chainlink │        │ Vector   │
   │ Storage │         │  Oracle  │        │   DB     │
   └─────────┘         └──────────┘        └──────────┘
```

## API Endpoints

### Health Check
```
GET /health
```

### Content Fingerprinting
```
POST /api/v1/oracle/fingerprint
Content-Type: application/json

{
  "content_url": "QmHash123...",
  "content_type": "image",
  "metadata": {}
}
```

### Similarity Detection
```
POST /api/v1/oracle/similarity
Content-Type: application/json

{
  "fingerprint1": "abc123...",
  "fingerprint2": "def456..."
}
```

### IP Valuation
```
POST /api/v1/oracle/valuation
Content-Type: application/json

{
  "token_id": 123,
  "metadata": {
    "category": "music",
    "creator": "0x...",
    "quality_score": 0.85,
    "rarity": 0.7
  },
  "historical_data": [
    {
      "price": 1000,
      "timestamp": 1234567890,
      "category": "music"
    }
  ]
}
```

### Recommendations
```
GET /api/v1/oracle/recommendations?user_address=0x...&limit=10&category=music
```

## Installation

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the service:
```bash
python -m uvicorn src.main:app --reload --port 8000
```

### Docker

Build and run with Docker:
```bash
docker build -t knowton/oracle-adapter:latest .
docker run -p 8000:8000 --env-file .env knowton/oracle-adapter:latest
```

### Kubernetes

Deploy to Kubernetes:
```bash
kubectl apply -f k8s/dev/oracle-adapter-deployment.yaml
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8000` |
| `HOST` | Server host | `0.0.0.0` |
| `ENVIRONMENT` | Environment (development/production) | `development` |
| `ARBITRUM_RPC_URL` | Arbitrum RPC endpoint | - |
| `CHAINLINK_ORACLE_ADDRESS` | Chainlink Oracle contract address | - |
| `IPFS_GATEWAY_URL` | IPFS gateway URL | `https://gateway.pinata.cloud` |
| `TORCHSERVE_URL` | TorchServe inference endpoint | `http://localhost:8080` |
| `WEAVIATE_URL` | Weaviate vector database URL | `http://localhost:8080` |
| `POSTGRES_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |

## Valuation Model

The IP valuation model uses multiple factors:

1. **Creator Reputation** (25%): On-chain reputation score
2. **Content Quality** (20%): AI-assessed quality metrics
3. **Market Demand** (20%): Category popularity and trends
4. **Historical Performance** (15%): Past sales and engagement
5. **Rarity** (10%): Uniqueness and scarcity
6. **Category Trend** (10%): Current market trends

### Valuation Process

1. Extract features from metadata and historical data
2. Normalize features to 0-1 range
3. Run through neural network model
4. Calculate confidence interval based on feature quality
5. Find comparable sales for reference
6. Submit result to Chainlink Oracle (optional)

### Model Architecture

```
Input (20 features)
    ↓
Dense(64) + ReLU + Dropout(0.2)
    ↓
Dense(32) + ReLU + Dropout(0.2)
    ↓
Dense(16) + ReLU
    ↓
Dense(1) → Estimated Value
```

## Chainlink Integration

The service can submit valuation results to a Chainlink Oracle for on-chain verification:

1. Valuation is calculated off-chain using ML model
2. Result is signed by the oracle service
3. Transaction is submitted to Chainlink Oracle contract
4. Smart contracts can query the oracle for verified valuations

### Oracle Contract Interface

```solidity
interface IValuationOracle {
    function submitValuation(uint256 tokenId, uint256 value) external;
    function getValuation(uint256 tokenId) external view returns (uint256);
}
```

## Testing

Run tests:
```bash
pytest tests/ -v --cov=src
```

Run with coverage:
```bash
pytest tests/ --cov=src --cov-report=html
```

## Performance

- Fingerprint generation: < 2 seconds
- Similarity detection: < 500ms
- Valuation estimation: < 1 second
- Recommendations: < 2 seconds

## Security

- All API keys stored in Kubernetes secrets
- Private keys managed via HashiCorp Vault (production)
- Rate limiting enabled (100 requests/minute per IP)
- Input validation on all endpoints
- CORS configured for allowed origins

## Monitoring

Metrics exposed at `/metrics` (Prometheus format):
- Request count and latency
- Model inference time
- Error rates
- Active connections

## Future Enhancements

- [ ] Train production-grade valuation models
- [ ] Implement model versioning and A/B testing
- [ ] Add support for more content types
- [ ] Integrate with more oracle networks (UMA, Band Protocol)
- [ ] Implement caching layer for frequently accessed data
- [ ] Add batch processing for multiple valuations

## License

MIT License - see LICENSE file for details
