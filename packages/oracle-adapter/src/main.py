"""Main FastAPI application for Oracle Adapter Service"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import structlog

from src.config import settings
from src.models.schemas import (
    FingerprintRequest,
    FingerprintResponse,
    SimilarityRequest,
    SimilarityResponse,
    ValuationRequest,
    ValuationResponse,
    RecommendationRequest,
    RecommendationResponse,
    HealthResponse,
    ErrorResponse,
)
from src.services.fingerprint_service import FingerprintService
from src.services.valuation_service import ValuationService
from src.services.recommendation_service import RecommendationService
from src import __version__

logger = structlog.get_logger()

# Global service instances
fingerprint_service: FingerprintService = None
valuation_service: ValuationService = None
recommendation_service: RecommendationService = None
start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle management for the application"""
    global fingerprint_service, valuation_service, recommendation_service
    
    logger.info("Starting Oracle Adapter Service", version=__version__)
    
    # Initialize services
    fingerprint_service = FingerprintService()
    valuation_service = ValuationService()
    recommendation_service = RecommendationService()
    
    # Load AI models
    await fingerprint_service.load_models()
    await valuation_service.load_model()
    await recommendation_service.load_model()
    
    # Initialize Chainlink Oracle service
    from src.services.chainlink_service import chainlink_oracle
    await chainlink_oracle.initialize()
    
    logger.info("All services initialized successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Oracle Adapter Service")


app = FastAPI(
    title="KnowTon Oracle Adapter Service",
    description="AI-powered oracle service for IP valuation, fingerprinting, and recommendations",
    version=__version__,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version=__version__,
        models_loaded={
            "fingerprint": fingerprint_service is not None,
            "valuation": valuation_service is not None,
            "recommendation": recommendation_service is not None,
        },
        uptime_seconds=time.time() - start_time,
    )


@app.post("/api/v1/oracle/fingerprint", response_model=FingerprintResponse)
async def generate_fingerprint(request: FingerprintRequest):
    """Generate content fingerprint using AI models"""
    try:
        logger.info("Generating fingerprint", content_type=request.content_type)
        result = await fingerprint_service.generate_fingerprint(
            request.content_url,
            request.content_type,
            request.metadata,
        )
        return result
    except Exception as e:
        logger.error("Fingerprint generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/oracle/similarity", response_model=SimilarityResponse)
async def detect_similarity(request: SimilarityRequest):
    """Detect similarity between two content fingerprints"""
    try:
        logger.info("Detecting similarity")
        result = await fingerprint_service.detect_similarity(
            request.fingerprint1,
            request.fingerprint2,
        )
        return result
    except Exception as e:
        logger.error("Similarity detection failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/oracle/valuation", response_model=ValuationResponse)
async def estimate_valuation(request: ValuationRequest):
    """Estimate IP value using ML model and submit to Chainlink Oracle"""
    try:
        logger.info("Estimating IP valuation", token_id=request.token_id)
        result = await valuation_service.estimate_value(
            request.token_id,
            request.metadata,
            request.historical_data,
        )
        return result
    except Exception as e:
        logger.error("Valuation estimation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/oracle/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    user_address: str,
    limit: int = 10,
    category: str = None,
):
    """Get personalized content recommendations"""
    try:
        logger.info("Getting recommendations", user_address=user_address)
        result = await recommendation_service.get_recommendations(
            user_address,
            limit,
            category,
        )
        return result
    except Exception as e:
        logger.error("Recommendation generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
