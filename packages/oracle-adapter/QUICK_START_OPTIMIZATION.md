# Quick Start: Optimized Fingerprint Generation

## What's New? 🚀

The fingerprint generation service has been optimized to process content in **under 30 seconds** with the following improvements:

- ⚡ **GPU Acceleration**: 3-5x faster with automatic GPU detection
- 🔄 **Parallel Processing**: Process multiple items simultaneously
- 💾 **Smart Caching**: 100x+ faster for repeated requests
- 📦 **Batch API**: Process multiple items in one call

## Quick Usage

### Basic Fingerprint Generation
```python
from src.services.fingerprint_service import FingerprintService
from src.models.schemas import ContentType

# Initialize service
service = FingerprintService()
await service.load_models()

# Generate fingerprint (with caching)
result = await service.generate_fingerprint(
    content_url="ipfs://QmXxx...",
    content_type=ContentType.IMAGE
)

print(f"Fingerprint: {result.fingerprint}")
print(f"Time: {result.processing_time_ms}ms")
```

### Batch Processing (NEW!)
```python
# Process multiple items in parallel
items = [
    ("ipfs://QmAbc...", ContentType.IMAGE),
    ("ipfs://QmDef...", ContentType.AUDIO),
    ("ipfs://QmGhi...", ContentType.VIDEO),
]

results = await service.batch_generate_fingerprints(items)
# 3-4x faster than processing sequentially!
```

### Cache Management (NEW!)
```python
# Check cache stats
stats = service.get_cache_stats()
print(f"Cached items: {stats['cache_size']}")
print(f"Using: {stats['device']}")

# Clear cache if needed
service.clear_cache()
```

## Performance Expectations

| Content Type | Processing Time | Cached Time |
|-------------|-----------------|-------------|
| Image (1080p) | 0.5-5s | <10ms |
| Audio (3 min) | 3-6s | <10ms |
| Video (1 min) | 3-15s | <10ms |
| Text (10k words) | 1-2s | <10ms |

## Testing

### Run Tests
```bash
cd packages/oracle-adapter
pip install -r requirements.txt
pytest tests/test_fingerprint_optimization.py -v
```

### Run Benchmark
```bash
python src/scripts/benchmark_fingerprint.py
```

## Configuration

### Adjust Worker Count
```python
from src.config import settings
settings.max_workers = 8  # Match your CPU cores
```

### Environment Variables
```bash
MAX_WORKERS=4              # Parallel workers
CUDA_VISIBLE_DEVICES=0     # GPU device (if multiple)
```

## Documentation

- 📖 **Full Guide**: `docs/FINGERPRINT_OPTIMIZATION.md`
- 📋 **Implementation Summary**: `docs/TASK_1.3.1_IMPLEMENTATION_SUMMARY.md`
- 🧪 **Tests**: `tests/test_fingerprint_optimization.py`
- 📊 **Benchmark**: `src/scripts/benchmark_fingerprint.py`

## Need Help?

Check the troubleshooting section in `docs/FINGERPRINT_OPTIMIZATION.md` or review the implementation summary for detailed information.

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: November 2, 2025
