"""Pydantic schemas for API requests and responses"""

from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from enum import Enum


class ContentType(str, Enum):
    """Supported content types"""
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"


class FingerprintRequest(BaseModel):
    """Request to generate content fingerprint"""
    content_url: str = Field(..., description="IPFS CID or URL to content")
    content_type: ContentType = Field(..., description="Type of content")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class FingerprintFeatures(BaseModel):
    """Feature vector representation"""
    vector: List[float] = Field(..., description="Feature vector")
    dimensions: int = Field(..., description="Number of dimensions")
    model_version: str = Field(..., description="Model version used")


class FingerprintResponse(BaseModel):
    """Response containing content fingerprint"""
    fingerprint: str = Field(..., description="Unique content fingerprint hash")
    features: FingerprintFeatures = Field(..., description="Feature vector")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    content_type: ContentType = Field(..., description="Type of content")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")


class SimilarityRequest(BaseModel):
    """Request to compare content similarity"""
    fingerprint1: str = Field(..., description="First content fingerprint")
    fingerprint2: str = Field(..., description="Second content fingerprint")


class SimilarityResponse(BaseModel):
    """Response containing similarity score"""
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Similarity score (0-1)")
    is_infringement: bool = Field(..., description="Whether content is likely infringement")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in assessment")
    matched_features: List[str] = Field(default_factory=list, description="Matched feature types")


class ValuationRequest(BaseModel):
    """Request to estimate IP value"""
    token_id: int = Field(..., description="NFT token ID")
    metadata: Dict[str, Any] = Field(..., description="NFT metadata")
    historical_data: Optional[List[Dict[str, Any]]] = Field(default=None, description="Historical sales data")


class ValuationResponse(BaseModel):
    """Response containing IP valuation"""
    estimated_value: float = Field(..., description="Estimated value in USD")
    confidence_interval: List[float] = Field(..., description="[lower_bound, upper_bound]")
    comparable_sales: List[Dict[str, Any]] = Field(default_factory=list, description="Similar sales")
    factors: Dict[str, float] = Field(default_factory=dict, description="Valuation factors")


class RecommendationRequest(BaseModel):
    """Request for content recommendations"""
    user_address: str = Field(..., description="User wallet address")
    limit: int = Field(default=10, ge=1, le=100, description="Number of recommendations")
    category: Optional[str] = Field(default=None, description="Filter by category")


class RecommendedContent(BaseModel):
    """Recommended content item"""
    token_id: int = Field(..., description="NFT token ID")
    score: float = Field(..., ge=0.0, le=1.0, description="Recommendation score")
    reason: str = Field(..., description="Reason for recommendation")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Content metadata")


class RecommendationResponse(BaseModel):
    """Response containing recommendations"""
    recommendations: List[RecommendedContent] = Field(..., description="List of recommendations")
    user_profile: Dict[str, Any] = Field(default_factory=dict, description="User profile summary")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="Service version")
    models_loaded: Dict[str, bool] = Field(..., description="Model loading status")
    uptime_seconds: float = Field(..., description="Service uptime")


class ErrorResponse(BaseModel):
    """Error response"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")
