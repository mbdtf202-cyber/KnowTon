"""Benchmark script for fingerprint generation performance"""

import asyncio
import time
import statistics
from PIL import Image
import io
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from src.services.fingerprint_service import FingerprintService
from src.models.schemas import ContentType


async def create_test_image(size=(1920, 1080)):
    """Create a test image"""
    img = Image.new('RGB', size, color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img


async def benchmark_single_fingerprint(service: FingerprintService, iterations=10):
    """Benchmark single fingerprint generation"""
    print(f"\n{'='*60}")
    print("Benchmarking Single Fingerprint Generation")
    print(f"{'='*60}")
    
    test_image = await create_test_image()
    times = []
    
    for i in range(iterations):
        # Create unique URL to avoid cache
        test_url = f"data:image/png;base64,test_{i}"
        
        start = time.time()
        result = await service.generate_fingerprint(
            content_url=test_url,
            content_type=ContentType.IMAGE,
            use_cache=False
        )
        elapsed = time.time() - start
        times.append(elapsed)
        
        print(f"  Iteration {i+1}: {elapsed:.3f}s ({result.processing_time_ms:.2f}ms reported)")
    
    print(f"\nResults:")
    print(f"  Average: {statistics.mean(times):.3f}s")
    print(f"  Median:  {statistics.median(times):.3f}s")
    print(f"  Min:     {min(times):.3f}s")
    print(f"  Max:     {max(times):.3f}s")
    print(f"  StdDev:  {statistics.stdev(times):.3f}s")
    
    # Check if meets requirement
    avg_time = statistics.mean(times)
    if avg_time < 30:
        print(f"  ✅ PASS: Average time {avg_time:.3f}s < 30s requirement")
    else:
        print(f"  ❌ FAIL: Average time {avg_time:.3f}s >= 30s requirement")
    
    return times


async def benchmark_cached_fingerprint(service: FingerprintService, iterations=10):
    """Benchmark cached fingerprint generation"""
    print(f"\n{'='*60}")
    print("Benchmarking Cached Fingerprint Generation")
    print(f"{'='*60}")
    
    test_url = "data:image/png;base64,cached_test"
    
    # First call to populate cache
    print("  Populating cache...")
    await service.generate_fingerprint(
        content_url=test_url,
        content_type=ContentType.IMAGE,
        use_cache=True
    )
    
    times = []
    for i in range(iterations):
        start = time.time()
        result = await service.generate_fingerprint(
            content_url=test_url,
            content_type=ContentType.IMAGE,
            use_cache=True
        )
        elapsed = time.time() - start
        times.append(elapsed)
        
        print(f"  Iteration {i+1}: {elapsed:.6f}s")
    
    print(f"\nResults:")
    print(f"  Average: {statistics.mean(times):.6f}s")
    print(f"  Median:  {statistics.median(times):.6f}s")
    print(f"  Min:     {min(times):.6f}s")
    print(f"  Max:     {max(times):.6f}s")
    
    return times


async def benchmark_batch_processing(service: FingerprintService, batch_sizes=[5, 10, 20]):
    """Benchmark batch fingerprint generation"""
    print(f"\n{'='*60}")
    print("Benchmarking Batch Fingerprint Generation")
    print(f"{'='*60}")
    
    for batch_size in batch_sizes:
        print(f"\n  Batch size: {batch_size}")
        
        # Create batch items
        content_items = [
            (f"data:image/png;base64,batch_{i}", ContentType.IMAGE)
            for i in range(batch_size)
        ]
        
        start = time.time()
        results = await service.batch_generate_fingerprints(content_items)
        elapsed = time.time() - start
        
        avg_per_item = elapsed / batch_size
        
        print(f"    Total time: {elapsed:.3f}s")
        print(f"    Avg per item: {avg_per_item:.3f}s")
        print(f"    Successful: {len(results)}/{batch_size}")
        
        if avg_per_item < 30:
            print(f"    ✅ PASS: Average time per item {avg_per_item:.3f}s < 30s")
        else:
            print(f"    ❌ FAIL: Average time per item {avg_per_item:.3f}s >= 30s")


async def benchmark_parallel_speedup(service: FingerprintService):
    """Benchmark parallel processing speedup"""
    print(f"\n{'='*60}")
    print("Benchmarking Parallel Processing Speedup")
    print(f"{'='*60}")
    
    num_items = 5
    
    # Sequential processing (simulated)
    print(f"\n  Sequential processing ({num_items} items):")
    sequential_times = []
    for i in range(num_items):
        start = time.time()
        await service.generate_fingerprint(
            content_url=f"data:image/png;base64,seq_{i}",
            content_type=ContentType.IMAGE,
            use_cache=False
        )
        sequential_times.append(time.time() - start)
    
    sequential_total = sum(sequential_times)
    print(f"    Total time: {sequential_total:.3f}s")
    print(f"    Avg per item: {statistics.mean(sequential_times):.3f}s")
    
    # Parallel processing
    print(f"\n  Parallel processing ({num_items} items):")
    content_items = [
        (f"data:image/png;base64,par_{i}", ContentType.IMAGE)
        for i in range(num_items)
    ]
    
    start = time.time()
    results = await service.batch_generate_fingerprints(content_items)
    parallel_total = time.time() - start
    
    print(f"    Total time: {parallel_total:.3f}s")
    print(f"    Avg per item: {parallel_total / num_items:.3f}s")
    
    # Calculate speedup
    speedup = sequential_total / parallel_total
    print(f"\n  Speedup: {speedup:.2f}x")
    
    if speedup > 1.5:
        print(f"  ✅ PASS: Parallel processing provides {speedup:.2f}x speedup")
    else:
        print(f"  ⚠️  WARNING: Parallel speedup {speedup:.2f}x is less than expected")


async def main():
    """Run all benchmarks"""
    print("="*60)
    print("Fingerprint Generation Performance Benchmark")
    print("="*60)
    
    # Initialize service
    print("\nInitializing fingerprint service...")
    service = FingerprintService()
    await service.load_models()
    
    # Display configuration
    stats = service.get_cache_stats()
    print(f"\nConfiguration:")
    print(f"  Device: {stats['device']}")
    print(f"  Image model loaded: {stats['models_loaded']['image']}")
    print(f"  Cache TTL: {stats['cache_ttl_seconds']}s")
    
    # Run benchmarks
    try:
        await benchmark_single_fingerprint(service, iterations=5)
        await benchmark_cached_fingerprint(service, iterations=10)
        await benchmark_batch_processing(service, batch_sizes=[5, 10])
        await benchmark_parallel_speedup(service)
        
        print(f"\n{'='*60}")
        print("Benchmark Complete")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"\n❌ Benchmark failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
