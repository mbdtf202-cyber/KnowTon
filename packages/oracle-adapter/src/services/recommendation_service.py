"""Content Recommendation Service using collaborative filtering and content-based algorithms"""

import numpy as np
from typing import Dict, List, Optional, Any
import structlog
import time
from collections import defaultdict, Counter

from src.models.schemas import (
    RecommendationResponse,
    RecommendedContent,
)

logger = structlog.get_logger()


class RecommendationService:
    """Service for generating personalized content recommendations"""
    
    def __init__(self):
        self.model = None
        self.user_embeddings = {}
        self.content_embeddings = {}
        self.user_interactions = defaultdict(list)
        self.content_features = {}
        self.category_popularity = {}
        
    async def load_model(self):
        """Load recommendation model and initialize data"""
        try:
            logger.info("Loading recommendation model")
            
            # Initialize mock data for demonstration
            await self._initialize_mock_data()
            
            # In production, load trained model from model registry
            # self.model = torch.jit.load('recommendation_model.pt')
            
            logger.info("Recommendation model loaded successfully")
        except Exception as e:
            logger.error("Failed to load recommendation model", error=str(e))
            # Continue with basic recommendations
    
    async def get_recommendations(
        self,
        user_address: str,
        limit: int = 10,
        category: Optional[str] = None,
    ) -> RecommendationResponse:
        """Get personalized recommendations for user"""
        start_time = time.time()
        
        try:
            logger.info("Generating recommendations", user_address=user_address, category=category)
            
            # Get user interaction history
            user_history = await self._get_user_history(user_address)
            
            # Generate recommendations using multiple strategies
            recommendations = []
            
            # 1. Collaborative filtering recommendations
            collab_recs = await self._collaborative_filtering(user_address, user_history, limit // 2)
            recommendations.extend(collab_recs)
            
            # 2. Content-based recommendations
            content_recs = await self._content_based_filtering(user_address, user_history, limit // 2)
            recommendations.extend(content_recs)
            
            # 3. Popular content recommendations (for new users)
            if len(user_history) < 5:
                popular_recs = await self._get_popular_content(category, limit // 3)
                recommendations.extend(popular_recs)
            
            # 4. Category-based recommendations
            if category:
                category_recs = await self._get_category_recommendations(category, limit // 3)
                recommendations.extend(category_recs)
            
            # Remove duplicates and sort by score
            seen_tokens = set()
            unique_recommendations = []
            for rec in recommendations:
                if rec.token_id not in seen_tokens:
                    seen_tokens.add(rec.token_id)
                    unique_recommendations.append(rec)
            
            # Sort by score and limit results
            unique_recommendations.sort(key=lambda x: x.score, reverse=True)
            final_recommendations = unique_recommendations[:limit]
            
            processing_time = (time.time() - start_time) * 1000
            
            logger.info(
                "Recommendations generated",
                user_address=user_address,
                count=len(final_recommendations),
                processing_time_ms=processing_time,
            )
            
            return RecommendationResponse(
                recommendations=final_recommendations,
                user_profile={
                    "address": user_address,
                    "preferences": await self._analyze_user_preferences(user_history),
                    "interaction_count": len(user_history),
                },
            )
        
        except Exception as e:
            logger.error("Recommendation generation failed", error=str(e))
            # Return fallback recommendations
            return await self._get_fallback_recommendations(user_address, limit, category)
    
    async def _collaborative_filtering(
        self,
        user_address: str,
        user_history: List[Dict[str, Any]],
        limit: int,
    ) -> List[RecommendedContent]:
        """Generate recommendations using collaborative filtering"""
        
        if not user_history:
            return []
        
        # Find similar users based on interaction patterns
        similar_users = await self._find_similar_users(user_address, user_history)
        
        recommendations = []
        user_interacted_tokens = {item['token_id'] for item in user_history}
        
        # Get recommendations from similar users
        for similar_user, similarity_score in similar_users[:5]:  # Top 5 similar users
            similar_user_history = await self._get_user_history(similar_user)
            
            for item in similar_user_history:
                if item['token_id'] not in user_interacted_tokens:
                    # Calculate recommendation score
                    score = similarity_score * item.get('rating', 0.5)
                    
                    recommendations.append(RecommendedContent(
                        token_id=item['token_id'],
                        score=score,
                        reason=f"Users with similar taste also liked this (similarity: {similarity_score:.2f})",
                        metadata={
                            'title': item.get('title', f"Content {item['token_id']}"),
                            'creator': item.get('creator', '0x' + '0' * 40),
                            'category': item.get('category', 'unknown'),
                        },
                    ))
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations[:limit]
    
    async def _content_based_filtering(
        self,
        user_address: str,
        user_history: List[Dict[str, Any]],
        limit: int,
    ) -> List[RecommendedContent]:
        """Generate recommendations using content-based filtering"""
        
        if not user_history:
            return []
        
        # Analyze user preferences from history
        user_preferences = await self._analyze_user_preferences(user_history)
        
        recommendations = []
        user_interacted_tokens = {item['token_id'] for item in user_history}
        
        # Get all available content
        all_content = await self._get_all_content()
        
        for content in all_content:
            if content['token_id'] not in user_interacted_tokens:
                # Calculate content similarity score
                similarity_score = await self._calculate_content_similarity(
                    user_preferences,
                    content,
                )
                
                if similarity_score > 0.3:  # Threshold for relevance
                    recommendations.append(RecommendedContent(
                        token_id=content['token_id'],
                        score=similarity_score,
                        reason=f"Similar to content you've enjoyed (similarity: {similarity_score:.2f})",
                        metadata={
                            'title': content.get('title', f"Content {content['token_id']}"),
                            'creator': content.get('creator', '0x' + '0' * 40),
                            'category': content.get('category', 'unknown'),
                        },
                    ))
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations[:limit]
    
    async def _get_popular_content(
        self,
        category: Optional[str] = None,
        limit: int = 5,
    ) -> List[RecommendedContent]:
        """Get popular content recommendations"""
        
        # Mock popular content data
        popular_content = [
            {
                'token_id': 'popular_1',
                'title': 'Trending Music Track',
                'creator': '0x1234567890123456789012345678901234567890',
                'category': 'music',
                'popularity_score': 0.95,
                'views': 10000,
            },
            {
                'token_id': 'popular_2',
                'title': 'Viral Video Content',
                'creator': '0x2345678901234567890123456789012345678901',
                'category': 'video',
                'popularity_score': 0.90,
                'views': 8500,
            },
            {
                'token_id': 'popular_3',
                'title': 'Digital Art Masterpiece',
                'creator': '0x3456789012345678901234567890123456789012',
                'category': 'art',
                'popularity_score': 0.85,
                'views': 7200,
            },
        ]
        
        # Filter by category if specified
        if category:
            popular_content = [c for c in popular_content if c['category'] == category]
        
        recommendations = []
        for content in popular_content[:limit]:
            recommendations.append(RecommendedContent(
                token_id=content['token_id'],
                score=content['popularity_score'],
                reason=f"Trending content with {content['views']} views",
                metadata={
                    'title': content['title'],
                    'creator': content['creator'],
                    'category': content['category'],
                },
            ))
        
        return recommendations
    
    async def _get_category_recommendations(
        self,
        category: str,
        limit: int = 5,
    ) -> List[RecommendedContent]:
        """Get recommendations from specific category"""
        
        # Mock category content
        category_content = {
            'music': [
                {'token_id': 'music_1', 'title': 'Electronic Beat', 'creator': '0x1111111111111111111111111111111111111111'},
                {'token_id': 'music_2', 'title': 'Jazz Fusion', 'creator': '0x2222222222222222222222222222222222222222'},
            ],
            'art': [
                {'token_id': 'art_1', 'title': 'Abstract Painting', 'creator': '0x3333333333333333333333333333333333333333'},
                {'token_id': 'art_2', 'title': 'Digital Sculpture', 'creator': '0x4444444444444444444444444444444444444444'},
            ],
            'video': [
                {'token_id': 'video_1', 'title': 'Short Film', 'creator': '0x5555555555555555555555555555555555555555'},
                {'token_id': 'video_2', 'title': 'Animation', 'creator': '0x6666666666666666666666666666666666666666'},
            ],
        }
        
        content_list = category_content.get(category.lower(), [])
        
        recommendations = []
        for i, content in enumerate(content_list[:limit]):
            recommendations.append(RecommendedContent(
                token_id=content['token_id'],
                score=0.8 - (i * 0.1),  # Decreasing score
                reason=f"Popular in {category} category",
                metadata={
                    'title': content['title'],
                    'creator': content['creator'],
                    'category': category,
                },
            ))
        
        return recommendations
    
    async def _get_user_history(self, user_address: str) -> List[Dict[str, Any]]:
        """Get user interaction history"""
        
        # In production, fetch from database or analytics service
        # For now, return mock data
        mock_history = [
            {
                'token_id': 'token_123',
                'title': 'Music Track 1',
                'creator': '0x1234567890123456789012345678901234567890',
                'category': 'music',
                'interaction_type': 'purchase',
                'rating': 0.9,
                'timestamp': time.time() - 86400,  # 1 day ago
            },
            {
                'token_id': 'token_456',
                'title': 'Digital Art 1',
                'creator': '0x2345678901234567890123456789012345678901',
                'category': 'art',
                'interaction_type': 'view',
                'rating': 0.7,
                'timestamp': time.time() - 172800,  # 2 days ago
            },
        ]
        
        return mock_history
    
    async def _find_similar_users(
        self,
        user_address: str,
        user_history: List[Dict[str, Any]],
    ) -> List[tuple]:
        """Find users with similar interaction patterns"""
        
        # Mock similar users data
        similar_users = [
            ('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0.85),
            ('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 0.78),
            ('0xcccccccccccccccccccccccccccccccccccccccc', 0.72),
        ]
        
        return similar_users
    
    async def _analyze_user_preferences(
        self,
        user_history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Analyze user preferences from interaction history"""
        
        if not user_history:
            return {}
        
        categories = [item['category'] for item in user_history]
        category_counts = Counter(categories)
        
        creators = [item['creator'] for item in user_history]
        creator_counts = Counter(creators)
        
        avg_rating = np.mean([item.get('rating', 0.5) for item in user_history])
        
        preferences = {
            'favorite_categories': dict(category_counts.most_common(3)),
            'favorite_creators': dict(creator_counts.most_common(3)),
            'avg_rating': avg_rating,
            'interaction_count': len(user_history),
        }
        
        return preferences
    
    async def _get_all_content(self) -> List[Dict[str, Any]]:
        """Get all available content for recommendations"""
        
        # Mock content data
        all_content = [
            {
                'token_id': 'content_1',
                'title': 'New Music Release',
                'creator': '0x1111111111111111111111111111111111111111',
                'category': 'music',
                'tags': ['electronic', 'upbeat'],
                'created_at': time.time() - 3600,
            },
            {
                'token_id': 'content_2',
                'title': 'Abstract Art Piece',
                'creator': '0x2222222222222222222222222222222222222222',
                'category': 'art',
                'tags': ['abstract', 'colorful'],
                'created_at': time.time() - 7200,
            },
        ]
        
        return all_content
    
    async def _calculate_content_similarity(
        self,
        user_preferences: Dict[str, Any],
        content: Dict[str, Any],
    ) -> float:
        """Calculate similarity between user preferences and content"""
        
        similarity_score = 0.0
        
        # Category preference
        favorite_categories = user_preferences.get('favorite_categories', {})
        if content['category'] in favorite_categories:
            category_weight = favorite_categories[content['category']] / sum(favorite_categories.values())
            similarity_score += category_weight * 0.4
        
        # Creator preference
        favorite_creators = user_preferences.get('favorite_creators', {})
        if content['creator'] in favorite_creators:
            creator_weight = favorite_creators[content['creator']] / sum(favorite_creators.values())
            similarity_score += creator_weight * 0.3
        
        # Recency bonus
        content_age = time.time() - content.get('created_at', 0)
        if content_age < 86400:  # Less than 1 day old
            similarity_score += 0.2
        elif content_age < 604800:  # Less than 1 week old
            similarity_score += 0.1
        
        # Random factor for diversity
        similarity_score += np.random.random() * 0.1
        
        return min(similarity_score, 1.0)
    
    async def _get_fallback_recommendations(
        self,
        user_address: str,
        limit: int,
        category: Optional[str] = None,
    ) -> RecommendationResponse:
        """Get fallback recommendations when main algorithm fails"""
        
        recommendations = []
        
        for i in range(limit):
            recommendations.append(RecommendedContent(
                token_id=f"fallback_{i}",
                score=0.5,
                reason="Featured content",
                metadata={
                    'title': f"Featured Content {i + 1}",
                    'creator': '0x' + '0' * 40,
                    'category': category or 'general',
                },
            ))
        
        return RecommendationResponse(
            recommendations=recommendations,
            user_profile={"address": user_address, "preferences": []},
        )
    
    async def _initialize_mock_data(self):
        """Initialize mock data for demonstration"""
        
        # Category popularity
        self.category_popularity = {
            'music': 0.85,
            'art': 0.75,
            'video': 0.80,
            'ebook': 0.60,
            'course': 0.70,
        }
        
        logger.info("Mock recommendation data initialized")
