"""Configuration management for Oracle Adapter Service"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # Server
    port: int = 8000
    host: str = "0.0.0.0"
    environment: str = "development"
    
    # IPFS
    ipfs_gateway_url: str = "https://gateway.pinata.cloud"
    ipfs_api_url: str = "https://api.pinata.cloud"
    pinata_api_key: Optional[str] = None
    pinata_secret_key: Optional[str] = None
    
    # TorchServe
    torchserve_url: str = "http://localhost:8080"
    torchserve_management_url: str = "http://localhost:8081"
    model_store_path: str = "/models"
    
    # Vector Database
    weaviate_url: str = "http://localhost:8080"
    weaviate_api_key: Optional[str] = None
    
    # Database
    postgres_url: str = "postgresql://user:password@localhost:5432/knowton"
    redis_url: str = "redis://localhost:6379"
    
    # Blockchain
    arbitrum_rpc_url: str = "https://arb1.arbitrum.io/rpc"
    chainlink_oracle_address: Optional[str] = None
    ai_oracle_address: Optional[str] = None
    
    # Model Configuration
    image_model_name: str = "image_fingerprint"
    audio_model_name: str = "audio_fingerprint"
    video_model_name: str = "video_fingerprint"
    similarity_model_name: str = "similarity_detection"
    valuation_model_name: str = "valuation_model"
    
    # Performance
    max_workers: int = 4
    batch_size: int = 8
    timeout_seconds: int = 30
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
