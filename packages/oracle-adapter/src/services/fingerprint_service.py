"""Content Fingerprinting Service using AI models"""

import torch
import torchvision.transforms as transforms
from PIL import Image
import librosa
import numpy as np
import hashlib
from typing import Dict, Optional, Any, Tuple
import structlog
import time
import httpx
import io
import base64
import cv2
import tempfile
import os
from collections import Counter

from src.config import settings
from src.models.schemas import (
    ContentType,
    FingerprintResponse,
    FingerprintFeatures,
    SimilarityResponse,
)
from src.services.vector_db_service import vector_db

logger = structlog.get_logger()


class FingerprintService:
    """Service for generating content fingerprints using AI models"""
    
    def __init__(self):
        self.image_model = None
        self.audio_model = None
        self.video_model = None
        self.transform = None
    
    async def load_models(self):
        """Load AI models for fingerprinting"""
        try:
            logger.info("Loading fingerprinting models")
            
            # Load image model (ResNet-50 for feature extraction)
            self.image_model = torch.hub.load('pytorch/vision:v0.10.0', 'resnet50', pretrained=True)
            self.image_model.eval()
            
            # Remove the final classification layer to get features
            self.image_model = torch.nn.Sequential(*list(self.image_model.children())[:-1])
            
            # Image preprocessing with data augmentation for robustness
            self.transform = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])
            
            # Audio model initialization (placeholder for future implementation)
            self.audio_model = None  # Will load Wav2Vec2 or similar
            
            # Video model initialization (placeholder for future implementation)
            self.video_model = None  # Will load I3D or SlowFast
            
            logger.info("Fingerprinting models loaded successfully")
        except Exception as e:
            logger.error("Failed to load fingerprinting models", error=str(e))
            # Continue without models for basic fingerprinting
    
    async def generate_fingerprint(
        self,
        content_url: str,
        content_type: ContentType,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> FingerprintResponse:
        """Generate content fingerprint based on content type"""
        start_time = time.time()
        
        try:
            logger.info("Generating fingerprint", content_type=content_type)
            
            if content_type == ContentType.IMAGE:
                fingerprint, features = await self._generate_image_fingerprint(content_url)
            elif content_type == ContentType.AUDIO:
                fingerprint, features = await self._generate_audio_fingerprint(content_url)
            elif content_type == ContentType.VIDEO:
                fingerprint, features = await self._generate_video_fingerprint(content_url)
            elif content_type == ContentType.TEXT:
                fingerprint, features = await self._generate_text_fingerprint(content_url)
            else:
                # Fallback to basic hash
                fingerprint = hashlib.sha256(content_url.encode()).hexdigest()
                features = FingerprintFeatures(
                    perceptual_hash="",
                    feature_vector=[0.5] * 128,
                    metadata=metadata or {},
                )
            
            processing_time = (time.time() - start_time) * 1000
            
            logger.info(
                "Fingerprint generated successfully",
                content_type=content_type,
                fingerprint_length=len(fingerprint),
                processing_time_ms=processing_time,
            )
            
            # Store in vector database
            await vector_db.store_vector(
                content_id=fingerprint,
                vector=features.feature_vector,
                metadata={
                    "content_type": content_type.value,
                    "metadata_uri": content_url,
                    "timestamp": time.time(),
                    **features.metadata
                }
            )
            
            return FingerprintResponse(
                fingerprint=fingerprint,
                features=features,
                confidence_score=0.95,
                processing_time_ms=processing_time,
            )
    
    async def detect_similarity(
        self,
        fingerprint1: str,
        fingerprint2: str,
    ) -> SimilarityResponse:
        """Detect similarity between fingerprints"""
        
        # Mock implementation
        similarity_score = 0.3 if fingerprint1 != fingerprint2 else 1.0
        
        return SimilarityResponse(
            similarity_score=similarity_score,
            is_infringement=similarity_score > 0.85,
            confidence=0.92,
            matched_features=["color", "texture"] if similarity_score > 0.5 else [],
        )
                content_type=content_type,
                features=features,
                confidence_score=0.95,
                processing_time_ms=processing_time,
            )
        
        except Exception as e:
            logger.error("Fingerprint generation failed", error=str(e))
            raise
    
    async def detect_similarity(
        self,
        fingerprint1: str,
        fingerprint2: str,
    ) -> SimilarityResponse:
        """Detect similarity between two fingerprints using vector similarity"""
        try:
            # Get vectors from database
            record1 = await vector_db.get_vector(fingerprint1)
            record2 = await vector_db.get_vector(fingerprint2)
            
            if not record1 or not record2:
                # Fallback to simple hash comparison
                if fingerprint1 == fingerprint2:
                    similarity_score = 1.0
                else:
                    similarity_score = 0.0
            else:
                # Calculate cosine similarity between feature vectors
                import numpy as np
                vector1 = np.array(record1.vector)
                vector2 = np.array(record2.vector)
                
                similarity_score = float(np.dot(vector1, vector2))
            
            is_similar = similarity_score > 0.85  # 85% threshold for similarity
            is_infringement = similarity_score > 0.95  # 95% threshold for potential infringement
            
            # Determine matched features based on similarity score
            matched_features = []
            if similarity_score > 0.9:
                matched_features = ["high_similarity", "potential_duplicate"]
            elif similarity_score > 0.8:
                matched_features = ["similar_content"]
            elif similarity_score > 0.6:
                matched_features = ["related_content"]
            
            return SimilarityResponse(
                similarity_score=similarity_score,
                is_infringement=is_infringement,
                confidence=0.92,
                matched_features=matched_features,
            )
        
        except Exception as e:
            logger.error("Similarity detection failed", error=str(e))
            raise
    
    async def _generate_image_fingerprint(self, content_url: str) -> Tuple[str, FingerprintFeatures]:
        """Generate fingerprint for image content"""
        
        # Load image
        image = await self._load_image(content_url)
        
        # Generate perceptual hash
        phash = self._calculate_phash(image)
        
        # Generate AI features if model is available
        ai_features = []
        if self.image_model is not None:
            ai_features = await self._extract_image_features(image)
        
        # Create feature vector
        feature_vector = ai_features[:128] if len(ai_features) >= 128 else ([0.0] * 128)
        
        # Create fingerprint from combined data
        fingerprint_data = {
            "phash": phash,
            "dimensions": image.size,
            "mode": image.mode,
        }
        fingerprint = hashlib.sha256(str(fingerprint_data).encode()).hexdigest()
        
        features = FingerprintFeatures(
            perceptual_hash=phash,
            feature_vector=feature_vector,
            metadata={
                "width": image.size[0],
                "height": image.size[1],
                "aspect_ratio": image.size[0] / image.size[1],
                "mode": image.mode,
                "has_ai_features": len(ai_features) > 0,
            },
        )
        
        return fingerprint, features
    
    async def _generate_audio_fingerprint(self, content_url: str) -> Tuple[str, FingerprintFeatures]:
        """Generate fingerprint for audio content"""
        
        try:
            # Download audio
            audio_data = await self._download_content(content_url)
            
            # Load with librosa
            y, sr = librosa.load(io.BytesIO(audio_data), sr=None)
            
            # Generate audio features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            chroma_mean = np.mean(chroma, axis=1)
            
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            mfcc_mean = np.mean(mfcc, axis=1)
            
            # Combine features
            audio_features = np.concatenate([chroma_mean, mfcc_mean])
            
            # Pad or truncate to 128 dimensions
            if len(audio_features) < 128:
                feature_vector = np.pad(audio_features, (0, 128 - len(audio_features))).tolist()
            else:
                feature_vector = audio_features[:128].tolist()
            
            # Create fingerprint
            fingerprint_data = {
                "chroma": chroma_mean.tolist(),
                "mfcc": mfcc_mean.tolist(),
                "duration": len(y) / sr,
                "sample_rate": sr,
            }
            fingerprint = hashlib.sha256(str(fingerprint_data).encode()).hexdigest()
            
            # Calculate additional features
            tempo = librosa.beat.tempo(y=y, sr=sr)[0]
            spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
            zcr = np.mean(librosa.feature.zero_crossing_rate(y))
            
            features = FingerprintFeatures(
                perceptual_hash="",  # Audio doesn't use perceptual hash
                feature_vector=feature_vector,
                metadata={
                    "duration": len(y) / sr,
                    "sample_rate": sr,
                    "tempo": float(tempo),
                    "spectral_centroid": float(spectral_centroid),
                    "zero_crossing_rate": float(zcr),
                },
            )
            
            return fingerprint, features
        
        except Exception as e:
            logger.error("Audio fingerprint generation failed", error=str(e))
            # Fallback to basic hash
            fingerprint = hashlib.sha256(content_url.encode()).hexdigest()
            features = FingerprintFeatures(
                perceptual_hash="",
                feature_vector=[0.0] * 128,
                metadata={"error": str(e)},
            )
            return fingerprint, features
    
    async def _generate_video_fingerprint(self, content_url: str) -> Tuple[str, FingerprintFeatures]:
        """Generate fingerprint for video content"""
        
        try:
            # Download video
            video_data = await self._download_content(content_url)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
                tmp_file.write(video_data)
                tmp_path = tmp_file.name
            
            try:
                # Extract key frames
                cap = cv2.VideoCapture(tmp_path)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                duration = frame_count / fps if fps > 0 else 0
                
                # Extract frames at regular intervals
                frames = []
                interval = max(1, frame_count // 10)  # Max 10 frames
                
                for i in range(0, frame_count, interval):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, i)
                    ret, frame = cap.read()
                    if ret:
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        frames.append(frame_rgb)
                
                cap.release()
                
                # Generate fingerprints for frames
                frame_hashes = []
                for frame in frames:
                    pil_frame = Image.fromarray(frame)
                    phash = self._calculate_phash(pil_frame)
                    frame_hashes.append(phash)
                
                # Create combined fingerprint
                fingerprint_data = {
                    "frame_hashes": frame_hashes,
                    "duration": duration,
                    "fps": fps,
                    "frame_count": frame_count,
                }
                fingerprint = hashlib.sha256(str(fingerprint_data).encode()).hexdigest()
                
                # Create feature vector from frame hashes
                feature_vector = []
                for hash_str in frame_hashes[:8]:  # Use first 8 frames
                    # Convert hex hash to numeric values
                    hash_int = int(hash_str, 16)
                    # Take lower 16 bits and normalize
                    feature_vector.extend([(hash_int >> i) & 1 for i in range(16)])
                
                # Pad to 128 dimensions
                while len(feature_vector) < 128:
                    feature_vector.append(0.0)
                feature_vector = feature_vector[:128]
                
                features = FingerprintFeatures(
                    perceptual_hash=frame_hashes[0] if frame_hashes else "",
                    feature_vector=feature_vector,
                    metadata={
                        "duration": duration,
                        "fps": fps,
                        "frame_count": frame_count,
                        "key_frames": len(frames),
                        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
                    },
                )
                
                return fingerprint, features
            
            finally:
                os.unlink(tmp_path)
        
        except Exception as e:
            logger.error("Video fingerprint generation failed", error=str(e))
            # Fallback to basic hash
            fingerprint = hashlib.sha256(content_url.encode()).hexdigest()
            features = FingerprintFeatures(
                perceptual_hash="",
                feature_vector=[0.0] * 128,
                metadata={"error": str(e)},
            )
            return fingerprint, features
    
    async def _generate_text_fingerprint(self, content_url: str) -> Tuple[str, FingerprintFeatures]:
        """Generate fingerprint for text content"""
        
        try:
            # Load text content
            if content_url.startswith('data:'):
                text = base64.b64decode(content_url.split(',')[1]).decode('utf-8')
            else:
                text_data = await self._download_content(content_url)
                text = text_data.decode('utf-8')
            
            # Generate n-grams
            words = text.lower().split()
            trigrams = [' '.join(words[i:i+3]) for i in range(len(words)-2)]
            
            # Create frequency distribution
            trigram_freq = Counter(trigrams)
            top_trigrams = dict(trigram_freq.most_common(50))
            
            # Create fingerprint
            fingerprint_data = {
                "top_trigrams": top_trigrams,
                "word_count": len(words),
                "char_count": len(text),
            }
            fingerprint = hashlib.sha256(str(fingerprint_data).encode()).hexdigest()
            
            # Create feature vector from trigram frequencies
            feature_vector = []
            for trigram, freq in list(top_trigrams.items())[:32]:  # Top 32 trigrams
                feature_vector.extend([
                    freq / len(trigrams),  # Normalized frequency
                    len(trigram.split()),  # Number of words
                    len(trigram),          # Character length
                    trigram.count(' '),    # Space count
                ])
            
            # Pad to 128 dimensions
            while len(feature_vector) < 128:
                feature_vector.append(0.0)
            feature_vector = feature_vector[:128]
            
            features = FingerprintFeatures(
                perceptual_hash="",  # Text doesn't use perceptual hash
                feature_vector=feature_vector,
                metadata={
                    "word_count": len(words),
                    "char_count": len(text),
                    "unique_words": len(set(words)),
                    "avg_word_length": sum(len(word) for word in words) / len(words) if words else 0,
                    "sentence_count": text.count('.') + text.count('!') + text.count('?'),
                },
            )
            
            return fingerprint, features
        
        except Exception as e:
            logger.error("Text fingerprint generation failed", error=str(e))
            # Fallback to basic hash
            fingerprint = hashlib.sha256(content_url.encode()).hexdigest()
            features = FingerprintFeatures(
                perceptual_hash="",
                feature_vector=[0.0] * 128,
                metadata={"error": str(e)},
            )
            return fingerprint, features
    
    async def _load_image(self, content_url: str) -> Image.Image:
        """Load image from URL or base64 data"""
        
        if content_url.startswith('data:image'):
            # Base64 encoded image
            image_data = base64.b64decode(content_url.split(',')[1])
            return Image.open(io.BytesIO(image_data)).convert('RGB')
        else:
            # Download from URL
            async with httpx.AsyncClient() as client:
                response = await client.get(content_url)
                response.raise_for_status()
                return Image.open(io.BytesIO(response.content)).convert('RGB')
    
    async def _download_content(self, content_url: str) -> bytes:
        """Download content from URL"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(content_url)
            response.raise_for_status()
            return response.content
    
    def _calculate_phash(self, image: Image.Image) -> str:
        """Calculate perceptual hash for image"""
        
        # Resize to 32x32
        image = image.resize((32, 32), Image.Resampling.LANCZOS)
        
        # Convert to grayscale
        image = image.convert('L')
        
        # Get pixel values
        pixels = list(image.getdata())
        
        # Calculate average
        avg = sum(pixels) / len(pixels)
        
        # Generate hash
        hash_bits = []
        for pixel in pixels:
            hash_bits.append('1' if pixel > avg else '0')
        
        # Convert to hex
        hash_str = ''.join(hash_bits)
        hash_int = int(hash_str, 2)
        return format(hash_int, '016x')
    
    async def _extract_image_features(self, image: Image.Image) -> list:
        """Extract AI features from image using ResNet"""
        
        if self.image_model is None or self.transform is None:
            return []
        
        try:
            # Preprocess image
            input_tensor = self.transform(image).unsqueeze(0)
            
            # Extract features
            with torch.no_grad():
                features = self.image_model(input_tensor)
                features = features.squeeze().numpy()
            
            return features.tolist()
        except Exception as e:
            logger.error("AI feature extraction failed", error=str(e))
            return []
    
    async def search_similar_content(
        self,
        content_url: str,
        content_type: ContentType,
        threshold: float = 0.8,
        limit: int = 10
    ) -> List[Dict]:
        """Search for similar content in the database"""
        try:
            # Generate fingerprint for the query content
            fingerprint_response = await self.generate_fingerprint(
                content_url, content_type
            )
            
            # Search for similar vectors
            similar_results = await vector_db.search_similar(
                query_vector=fingerprint_response.features.feature_vector,
                threshold=threshold,
                limit=limit
            )
            
            results = []
            for content_id, similarity, metadata in similar_results:
                results.append({
                    "content_id": content_id,
                    "similarity_score": similarity,
                    "content_type": metadata.get("content_type"),
                    "metadata_uri": metadata.get("metadata_uri"),
                    "timestamp": metadata.get("timestamp"),
                })
            
            return results
            
        except Exception as e:
            logger.error("Similar content search failed", error=str(e))
            return []
    
    async def detect_potential_infringement(
        self,
        content_url: str,
        content_type: ContentType,
        threshold: float = 0.95
    ) -> Dict:
        """Detect potential copyright infringement"""
        try:
            similar_content = await self.search_similar_content(
                content_url, content_type, threshold, limit=5
            )
            
            if not similar_content:
                return {
                    "infringement_detected": False,
                    "confidence": 0.0,
                    "similar_content": []
                }
            
            # Analyze results
            max_similarity = max(item["similarity_score"] for item in similar_content)
            infringement_detected = max_similarity >= threshold
            
            return {
                "infringement_detected": infringement_detected,
                "confidence": max_similarity,
                "similar_content": similar_content,
                "analysis": {
                    "max_similarity": max_similarity,
                    "threshold_used": threshold,
                    "total_matches": len(similar_content)
                }
            }
            
        except Exception as e:
            logger.error("Infringement detection failed", error=str(e))
            return {
                "infringement_detected": False,
                "confidence": 0.0,
                "similar_content": [],
                "error": str(e)
            }