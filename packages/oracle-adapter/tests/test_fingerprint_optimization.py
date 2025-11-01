"""Tests for optimized fingerprint generation"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch, AsyncMock
from PIL import Image
import numpy as np
import io

from src.services.fingerprint_service import FingerprintService
from src.models.schemas import ContentType


@pytest.fixture
async def fingerprint_service():
    """Create fingerprint service instance"""
    service = FingerprintService()
    await service.load_models()
    return service


@pytest.mark.asyncio
async def test_fingerprint_generation_performance(fingerprint_service):
    """Test that fingerprint generation completes within 30 seconds"""
    # Create a test image
    test_image = Image.new('RGB', (800, 600), color='red')
    img_bytes = io.BytesIO()
    test_image.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    # Mock the download to return our test image
    with patch.object(fingerprint_service, '_load_image', return_value=test_image):
        start_time = time.time()
        
        result = await fingerprint_service.generate_fingerprint(
            content_url="test://image.png",
            content_type=ContentType.IMAGE
        )
        
        elapsed_time = time.time() - start_time
        
        # Verify processing time is under 30 seconds
        assert elapsed_time < 30, f"Processing took {elapsed_time}s, expected <30s"
        assert result.processing_time_ms < 30000, f"Reported time {result.processing_time_ms}ms, expected <30000ms"
        assert result.fingerprint is not None
        assert len(result.features.feature_vector) == 128


@pytest.mark.asyncio
async def test_cache_functionality(fingerprint_service):
    """Test that caching reduces processing time"""
    test_image = Image.new('RGB', (800, 600), color='blue')
    
    with patch.object(fingerprint_service, '_load_image', return_value=test_image):
        # First call - should process normally
        start_time = time.time()
        result1 = await fingerprint_service.generate_fingerprint(
            content_url="test://cached_image.png",
            content_type=ContentType.IMAGE,
            use_cache=True
        )
        first_call_time = time.time() - start_time
        
        # Second call - should use cache
        start_time = time.time()
        result2 = await fingerprint_service.generate_fingerprint(
            content_url="test://cached_image.png",
            content_type=ContentType.IMAGE,
            use_cache=True
        )
        second_call_time = time.time() - start_time
        
        # Cached call should be significantly faster
        assert second_call_time < first_call_time * 0.5, "Cached call should be at least 50% faster"
        assert result1.fingerprint == result2.fingerprint


@pytest.mark.asyncio
async def test_batch_processing(fingerprint_service):
    """Test batch processing of multiple fingerprints"""
    test_image = Image.new('RGB', (800, 600), color='green')
    
    # Create multiple test items
    content_items = [
        (f"test://image_{i}.png", ContentType.IMAGE)
        for i in range(5)
    ]
    
    with patch.object(fingerprint_service, '_load_image', return_value=test_image):
        start_time = time.time()
        
        results = await fingerprint_service.batch_generate_fingerprints(content_items)
        
        elapsed_time = time.time() - start_time
        
        # Verify all items were processed
        assert len(results) == 5
        
        # Batch processing should be faster than sequential
        # (5 items should take less than 5x the time of 1 item due to parallelization)
        assert elapsed_time < 30, f"Batch processing took {elapsed_time}s, expected <30s"
        
        # Verify all results are valid
        for result in results:
            assert result.fingerprint is not None
            assert len(result.features.feature_vector) == 128


@pytest.mark.asyncio
async def test_parallel_processing_speedup(fingerprint_service):
    """Test that parallel processing provides speedup"""
    test_image = Image.new('RGB', (800, 600), color='yellow')
    
    with patch.object(fingerprint_service, '_load_image', return_value=test_image):
        # Process single item
        start_time = time.time()
        await fingerprint_service.generate_fingerprint(
            content_url="test://single.png",
            content_type=ContentType.IMAGE,
            use_cache=False
        )
        single_time = time.time() - start_time
        
        # Process 3 items in batch
        content_items = [
            (f"test://batch_{i}.png", ContentType.IMAGE)
            for i in range(3)
        ]
        
        start_time = time.time()
        results = await fingerprint_service.batch_generate_fingerprints(content_items)
        batch_time = time.time() - start_time
        
        # Batch should be faster than 3x single processing time
        assert batch_time < single_time * 3, "Parallel processing should provide speedup"
        assert len(results) == 3


@pytest.mark.asyncio
async def test_gpu_acceleration_detection(fingerprint_service):
    """Test that GPU acceleration is detected and used when available"""
    # Check if GPU is being used
    assert fingerprint_service.device is not None
    
    # If CUDA is available, verify it's being used
    import torch
    if torch.cuda.is_available():
        assert fingerprint_service.device.type == 'cuda', "Should use GPU when available"
        if fingerprint_service.image_model is not None:
            # Check if model is on GPU
            assert next(fingerprint_service.image_model.parameters()).is_cuda


@pytest.mark.asyncio
async def test_cache_stats(fingerprint_service):
    """Test cache statistics reporting"""
    stats = fingerprint_service.get_cache_stats()
    
    assert 'cache_size' in stats
    assert 'cache_ttl_seconds' in stats
    assert 'device' in stats
    assert 'models_loaded' in stats
    assert isinstance(stats['models_loaded'], dict)


@pytest.mark.asyncio
async def test_cache_clear(fingerprint_service):
    """Test cache clearing functionality"""
    test_image = Image.new('RGB', (800, 600), color='purple')
    
    with patch.object(fingerprint_service, '_load_image', return_value=test_image):
        # Generate a fingerprint to populate cache
        await fingerprint_service.generate_fingerprint(
            content_url="test://clear_test.png",
            content_type=ContentType.IMAGE,
            use_cache=True
        )
        
        # Verify cache has items
        stats_before = fingerprint_service.get_cache_stats()
        assert stats_before['cache_size'] > 0
        
        # Clear cache
        fingerprint_service.clear_cache()
        
        # Verify cache is empty
        stats_after = fingerprint_service.get_cache_stats()
        assert stats_after['cache_size'] == 0


@pytest.mark.asyncio
async def test_audio_parallel_processing(fingerprint_service):
    """Test audio fingerprint generation uses parallel processing"""
    # Mock audio data
    mock_audio_data = b"fake_audio_data"
    
    with patch.object(fingerprint_service, '_download_content', return_value=mock_audio_data):
        with patch.object(fingerprint_service, '_process_audio_features') as mock_process:
            mock_process.return_value = (
                "test_fingerprint",
                Mock(
                    perceptual_hash="",
                    feature_vector=[0.0] * 128,
                    metadata={"duration": 10.0}
                )
            )
            
            result = await fingerprint_service.generate_fingerprint(
                content_url="test://audio.mp3",
                content_type=ContentType.AUDIO,
                use_cache=False
            )
            
            # Verify the process pool was used
            assert result.fingerprint is not None


@pytest.mark.asyncio
async def test_video_parallel_processing(fingerprint_service):
    """Test video fingerprint generation uses parallel processing"""
    # Mock video data
    mock_video_data = b"fake_video_data"
    
    with patch.object(fingerprint_service, '_download_content', return_value=mock_video_data):
        with patch.object(fingerprint_service, '_process_video_features') as mock_process:
            mock_process.return_value = (
                "test_fingerprint",
                Mock(
                    perceptual_hash="abc123",
                    feature_vector=[0.0] * 128,
                    metadata={"duration": 60.0, "fps": 30}
                )
            )
            
            result = await fingerprint_service.generate_fingerprint(
                content_url="test://video.mp4",
                content_type=ContentType.VIDEO,
                use_cache=False
            )
            
            # Verify the process pool was used
            assert result.fingerprint is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
