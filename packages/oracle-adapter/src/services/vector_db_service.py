"""Vector Database Service for storing and querying content fingerprints"""

import numpy as np
from typing import Dict, List, Optional, Tuple
import structlog
import asyncio
from dataclasses import dataclass
import json
import hashlib

logger = structlog.get_logger()


@dataclass
class VectorRecord:
    """Vector record for storage"""
    id: str
    vector: List[float]
    metadata: Dict
    timestamp: float


class VectorDBService:
    """Service for managing vector database operations"""
    
    def __init__(self):
        self.vectors = {}  # In-memory storage for now
        self.index = None  # Will use FAISS or similar for production
        self.dimension = 512  # Standard feature dimension
        
    async def initialize(self):
        """Initialize vector database"""
        try:
            logger.info("Initializing vector database")
            
            # In production, this would connect to Weaviate, Pinecone, or FAISS
            # For now, use in-memory storage
            self.vectors = {}
            
            logger.info("Vector database initialized successfully")
        except Exception as e:
            logger.error("Failed to initialize vector database", error=str(e))
            raise
    
    async def store_vector(
        self,
        content_id: str,
        vector: List[float],
        metadata: Dict
    ) -> bool:
        """Store a vector with metadata"""
        try:
            # Normalize vector
            vector_array = np.array(vector)
            if len(vector_array) != self.dimension:
                # Pad or truncate to standard dimension
                if len(vector_array) < self.dimension:
                    vector_array = np.pad(vector_array, (0, self.dimension - len(vector_array)))
                else:
                    vector_array = vector_array[:self.dimension]
            
            # Normalize to unit vector
            norm = np.linalg.norm(vector_array)
            if norm > 0:
                vector_array = vector_array / norm
            
            record = VectorRecord(
                id=content_id,
                vector=vector_array.tolist(),
                metadata=metadata,
                timestamp=asyncio.get_event_loop().time()
            )
            
            self.vectors[content_id] = record
            
            logger.info("Vector stored successfully", content_id=content_id)
            return True
            
        except Exception as e:
            logger.error("Failed to store vector", content_id=content_id, error=str(e))
            return False
    
    async def search_similar(
        self,
        query_vector: List[float],
        threshold: float = 0.8,
        limit: int = 10
    ) -> List[Tuple[str, float, Dict]]:
        """Search for similar vectors"""
        try:
            if not self.vectors:
                return []
            
            # Normalize query vector
            query_array = np.array(query_vector)
            if len(query_array) != self.dimension:
                if len(query_array) < self.dimension:
                    query_array = np.pad(query_array, (0, self.dimension - len(query_array)))
                else:
                    query_array = query_array[:self.dimension]
            
            norm = np.linalg.norm(query_array)
            if norm > 0:
                query_array = query_array / norm
            
            similarities = []
            
            for record in self.vectors.values():
                stored_vector = np.array(record.vector)
                
                # Calculate cosine similarity
                similarity = np.dot(query_array, stored_vector)
                
                if similarity >= threshold:
                    similarities.append((record.id, float(similarity), record.metadata))
            
            # Sort by similarity (descending)
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            return similarities[:limit]
            
        except Exception as e:
            logger.error("Failed to search similar vectors", error=str(e))
            return []
    
    async def get_vector(self, content_id: str) -> Optional[VectorRecord]:
        """Get a specific vector by ID"""
        return self.vectors.get(content_id)
    
    async def delete_vector(self, content_id: str) -> bool:
        """Delete a vector"""
        try:
            if content_id in self.vectors:
                del self.vectors[content_id]
                logger.info("Vector deleted successfully", content_id=content_id)
                return True
            return False
        except Exception as e:
            logger.error("Failed to delete vector", content_id=content_id, error=str(e))
            return False
    
    async def get_stats(self) -> Dict:
        """Get database statistics"""
        return {
            "total_vectors": len(self.vectors),
            "dimension": self.dimension,
            "memory_usage_mb": len(self.vectors) * self.dimension * 4 / (1024 * 1024),  # Rough estimate
        }
    
    async def batch_store(self, records: List[Tuple[str, List[float], Dict]]) -> int:
        """Store multiple vectors in batch"""
        success_count = 0
        
        for content_id, vector, metadata in records:
            if await self.store_vector(content_id, vector, metadata):
                success_count += 1
        
        logger.info("Batch store completed", total=len(records), success=success_count)
        return success_count
    
    async def find_duplicates(self, threshold: float = 0.95) -> List[Tuple[str, str, float]]:
        """Find potential duplicate content"""
        duplicates = []
        
        vector_items = list(self.vectors.items())
        
        for i, (id1, record1) in enumerate(vector_items):
            for id2, record2 in vector_items[i+1:]:
                vector1 = np.array(record1.vector)
                vector2 = np.array(record2.vector)
                
                similarity = np.dot(vector1, vector2)
                
                if similarity >= threshold:
                    duplicates.append((id1, id2, float(similarity)))
        
        return duplicates
    
    async def cluster_vectors(self, n_clusters: int = 10) -> Dict[int, List[str]]:
        """Cluster vectors for content analysis"""
        try:
            if len(self.vectors) < n_clusters:
                # Not enough data for clustering
                return {0: list(self.vectors.keys())}
            
            # Simple k-means clustering (in production, use scikit-learn)
            vectors = np.array([record.vector for record in self.vectors.values()])
            content_ids = list(self.vectors.keys())
            
            # Initialize centroids randomly
            centroids = vectors[np.random.choice(len(vectors), n_clusters, replace=False)]
            
            for _ in range(10):  # Max iterations
                # Assign points to clusters
                distances = np.sqrt(((vectors - centroids[:, np.newaxis])**2).sum(axis=2))
                labels = np.argmin(distances, axis=0)
                
                # Update centroids
                new_centroids = np.array([vectors[labels == i].mean(axis=0) for i in range(n_clusters)])
                
                # Check convergence
                if np.allclose(centroids, new_centroids):
                    break
                    
                centroids = new_centroids
            
            # Group content IDs by cluster
            clusters = {}
            for i in range(n_clusters):
                clusters[i] = [content_ids[j] for j, label in enumerate(labels) if label == i]
            
            return clusters
            
        except Exception as e:
            logger.error("Failed to cluster vectors", error=str(e))
            return {}


# Global instance
vector_db = VectorDBService()