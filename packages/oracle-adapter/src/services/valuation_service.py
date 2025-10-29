"""IP Valuation Service using ML models and Chainlink Oracle integration"""

import torch
import numpy as np
from typing import Dict, List, Optional, Any
import structlog
from web3 import Web3
from eth_account import Account
import json
import httpx
import time

from src.config import settings
from src.models.schemas import ValuationResponse

logger = structlog.get_logger()


class ValuationService:
    """Service for estimating IP value using ML models"""
    
    def __init__(self):
        self.model = None
        self.w3 = None
        self.oracle_contract = None
        self.account = None
        
        # Initialize Web3 connection
        if settings.arbitrum_rpc_url:
            self.w3 = Web3(Web3.HTTPProvider(settings.arbitrum_rpc_url))
            logger.info("Web3 connection initialized", network="Arbitrum")
        
        # Feature weights for valuation
        self.feature_weights = {
            "creator_reputation": 0.25,
            "content_quality": 0.20,
            "market_demand": 0.20,
            "historical_performance": 0.15,
            "rarity": 0.10,
            "category_trend": 0.10,
        }
    
    async def load_model(self):
        """Load the valuation ML model"""
        try:
            logger.info("Loading valuation model", model_name=settings.valuation_model_name)
            
            # In production, load from TorchServe or model registry
            # For now, create a simple model architecture
            self.model = self._create_valuation_model()
            self.model.eval()
            
            logger.info("Valuation model loaded successfully")
        except Exception as e:
            logger.error("Failed to load valuation model", error=str(e))
            raise
    
    def _create_valuation_model(self) -> torch.nn.Module:
        """Create a simple neural network for valuation"""
        class ValuationModel(torch.nn.Module):
            def __init__(self):
                super().__init__()
                self.fc1 = torch.nn.Linear(20, 64)
                self.fc2 = torch.nn.Linear(64, 32)
                self.fc3 = torch.nn.Linear(32, 16)
                self.fc4 = torch.nn.Linear(16, 1)
                self.relu = torch.nn.ReLU()
                self.dropout = torch.nn.Dropout(0.2)
            
            def forward(self, x):
                x = self.relu(self.fc1(x))
                x = self.dropout(x)
                x = self.relu(self.fc2(x))
                x = self.dropout(x)
                x = self.relu(self.fc3(x))
                x = self.fc4(x)
                return x
        
        return ValuationModel()
    
    async def estimate_value(
        self,
        token_id: int,
        metadata: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]] = None,
    ) -> ValuationResponse:
        """
        Estimate IP value using ML model
        
        Args:
            token_id: NFT token ID
            metadata: NFT metadata including category, creator, etc.
            historical_data: Historical sales data for similar content
        
        Returns:
            ValuationResponse with estimated value and confidence interval
        """
        start_time = time.time()
        
        try:
            # 1. Extract and prepare features
            features = await self._prepare_features(token_id, metadata, historical_data)
            
            # 2. Run valuation model
            estimated_value = await self._run_valuation_model(features)
            
            # 3. Calculate confidence interval
            confidence_interval = self._calculate_confidence_interval(
                estimated_value,
                features,
            )
            
            # 4. Find comparable sales
            comparable_sales = await self._find_comparable_sales(metadata, historical_data)
            
            # 5. Calculate valuation factors
            factors = self._calculate_valuation_factors(features, metadata)
            
            # 6. Submit to Chainlink Oracle (if configured)
            if settings.chainlink_oracle_address and self.w3:
                await self._submit_to_chainlink(token_id, estimated_value)
            
            processing_time = (time.time() - start_time) * 1000
            
            logger.info(
                "Valuation completed",
                token_id=token_id,
                estimated_value=estimated_value,
                processing_time_ms=processing_time,
            )
            
            return ValuationResponse(
                estimated_value=estimated_value,
                confidence_interval=confidence_interval,
                comparable_sales=comparable_sales,
                factors=factors,
            )
        
        except Exception as e:
            logger.error("Valuation estimation failed", token_id=token_id, error=str(e))
            raise
    
    async def _prepare_features(
        self,
        token_id: int,
        metadata: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]],
    ) -> torch.Tensor:
        """Prepare feature vector for valuation model"""
        
        features = []
        
        # Creator reputation (0-1)
        creator_reputation = await self._get_creator_reputation(
            metadata.get("creator", "")
        )
        features.append(creator_reputation)
        
        # Content quality score (0-1)
        quality_score = metadata.get("quality_score", 0.5)
        features.append(quality_score)
        
        # Category popularity (0-1)
        category = metadata.get("category", "unknown")
        category_score = await self._get_category_popularity(category)
        features.append(category_score)
        
        # Rarity score (0-1)
        rarity = metadata.get("rarity", 0.5)
        features.append(rarity)
        
        # Historical performance metrics
        if historical_data:
            avg_price = np.mean([d.get("price", 0) for d in historical_data])
            max_price = np.max([d.get("price", 0) for d in historical_data])
            volume = len(historical_data)
            
            features.extend([
                min(avg_price / 10000, 1.0),  # Normalized average price
                min(max_price / 50000, 1.0),  # Normalized max price
                min(volume / 100, 1.0),       # Normalized volume
            ])
        else:
            features.extend([0.5, 0.5, 0.1])  # Default values
        
        # Content metadata features
        features.extend([
            min(metadata.get("views", 0) / 10000, 1.0),
            min(metadata.get("likes", 0) / 1000, 1.0),
            min(metadata.get("shares", 0) / 500, 1.0),
            metadata.get("has_license", 0),
            metadata.get("is_verified", 0),
        ])
        
        # Market timing features
        features.extend([
            self._get_market_sentiment(),
            self._get_seasonal_factor(),
        ])
        
        # Pad to 20 features
        while len(features) < 20:
            features.append(0.0)
        
        return torch.tensor(features[:20], dtype=torch.float32)
    
    async def _run_valuation_model(self, features: torch.Tensor) -> float:
        """Run the valuation model to estimate value"""
        
        if self.model is None:
            # Fallback to rule-based valuation
            return self._rule_based_valuation(features)
        
        with torch.no_grad():
            # Add batch dimension
            features = features.unsqueeze(0)
            
            # Run model
            output = self.model(features)
            
            # Convert to USD value (scale output)
            # Model outputs log-scaled value
            estimated_value = float(torch.exp(output).item())
            
            # Clamp to reasonable range
            estimated_value = max(100, min(estimated_value, 1000000))
        
        return estimated_value
    
    def _rule_based_valuation(self, features: torch.Tensor) -> float:
        """Fallback rule-based valuation when model is not available"""
        
        features_list = features.tolist()
        
        # Base value
        base_value = 1000.0
        
        # Apply feature weights
        multiplier = 1.0
        multiplier += features_list[0] * 2.0  # Creator reputation
        multiplier += features_list[1] * 1.5  # Quality score
        multiplier += features_list[2] * 1.0  # Category popularity
        multiplier += features_list[3] * 0.5  # Rarity
        
        # Historical performance boost
        if features_list[4] > 0.5:  # Good historical performance
            multiplier *= 1.5
        
        estimated_value = base_value * multiplier
        
        return max(100, min(estimated_value, 1000000))
    
    def _calculate_confidence_interval(
        self,
        estimated_value: float,
        features: torch.Tensor,
    ) -> List[float]:
        """Calculate confidence interval for the valuation"""
        
        # Calculate uncertainty based on feature quality
        feature_quality = float(torch.mean(features).item())
        
        # Higher quality features = narrower confidence interval
        uncertainty = 0.5 - (feature_quality * 0.3)  # 20-50% uncertainty
        
        lower_bound = estimated_value * (1 - uncertainty)
        upper_bound = estimated_value * (1 + uncertainty)
        
        return [round(lower_bound, 2), round(upper_bound, 2)]
    
    async def _find_comparable_sales(
        self,
        metadata: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """Find comparable sales for reference"""
        
        if not historical_data:
            return []
        
        category = metadata.get("category", "")
        
        # Filter by same category
        comparable = [
            d for d in historical_data
            if d.get("category") == category
        ]
        
        # Sort by recency and relevance
        comparable.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        
        # Return top 5
        return comparable[:5]
    
    def _calculate_valuation_factors(
        self,
        features: torch.Tensor,
        metadata: Dict[str, Any],
    ) -> Dict[str, float]:
        """Calculate individual valuation factors"""
        
        features_list = features.tolist()
        
        return {
            "creator_reputation": round(features_list[0], 3),
            "content_quality": round(features_list[1], 3),
            "category_popularity": round(features_list[2], 3),
            "rarity": round(features_list[3], 3),
            "historical_performance": round(features_list[4], 3),
            "market_sentiment": round(features_list[-2], 3),
            "seasonal_factor": round(features_list[-1], 3),
        }
    
    async def _get_creator_reputation(self, creator_address: str) -> float:
        """Get creator reputation score from on-chain data"""
        
        if not self.w3 or not creator_address:
            return 0.5  # Default neutral reputation
        
        try:
            # In production, query from reputation contract or subgraph
            # For now, return mock data
            return 0.75
        except Exception as e:
            logger.warning("Failed to get creator reputation", error=str(e))
            return 0.5
    
    async def _get_category_popularity(self, category: str) -> float:
        """Get category popularity score"""
        
        # Category popularity mapping (mock data)
        popularity = {
            "music": 0.85,
            "video": 0.80,
            "art": 0.75,
            "ebook": 0.60,
            "course": 0.70,
            "software": 0.65,
        }
        
        return popularity.get(category.lower(), 0.5)
    
    def _get_market_sentiment(self) -> float:
        """Get current market sentiment (0-1)"""
        # In production, analyze market data
        # For now, return neutral
        return 0.6
    
    def _get_seasonal_factor(self) -> float:
        """Get seasonal adjustment factor"""
        # In production, analyze seasonal trends
        # For now, return neutral
        return 0.5
    
    async def _submit_to_chainlink(self, token_id: int, estimated_value: float):
        """Submit valuation result to Chainlink Oracle"""
        
        if not self.w3 or not settings.chainlink_oracle_address:
            logger.warning("Chainlink oracle not configured, skipping submission")
            return
        
        try:
            # Load oracle contract ABI
            oracle_abi = self._get_oracle_abi()
            
            oracle_contract = self.w3.eth.contract(
                address=settings.chainlink_oracle_address,
                abi=oracle_abi,
            )
            
            # Convert value to wei (assuming 18 decimals)
            value_wei = self.w3.to_wei(estimated_value, 'ether')
            
            # Prepare transaction
            # Note: In production, use proper key management (Vault, KMS)
            if not self.account:
                logger.warning("No account configured for oracle submission")
                return
            
            tx = oracle_contract.functions.submitValuation(
                token_id,
                value_wei,
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price,
            })
            
            # Sign and send transaction
            signed_tx = self.account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            logger.info(
                "Valuation submitted to Chainlink",
                token_id=token_id,
                tx_hash=tx_hash.hex(),
            )
        
        except Exception as e:
            logger.error("Failed to submit to Chainlink oracle", error=str(e))
            # Don't raise - oracle submission is optional
    
    def _get_oracle_abi(self) -> List[Dict]:
        """Get Chainlink Oracle contract ABI"""
        
        # Simplified ABI for valuation submission
        return [
            {
                "inputs": [
                    {"name": "tokenId", "type": "uint256"},
                    {"name": "value", "type": "uint256"},
                ],
                "name": "submitValuation",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function",
            }
        ]
