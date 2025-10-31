"""IP Valuation Service using ML models and Chainlink Oracle integration"""

import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
import structlog
from web3 import Web3
from eth_account import Account
import json
import httpx
import time
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os

from src.config import settings
from src.models.schemas import ValuationResponse

logger = structlog.get_logger()


class ValuationService:
    """Service for estimating IP value using ML models"""
    
    def __init__(self):
        self.neural_model = None
        self.ensemble_model = None
        self.scaler = StandardScaler()
        self.w3 = None
        self.oracle_contract = None
        self.account = None
        self.historical_data_cache = {}
        self.market_data_cache = {}
        
        # Initialize Web3 connection
        if settings.arbitrum_rpc_url:
            self.w3 = Web3(Web3.HTTPProvider(settings.arbitrum_rpc_url))
            logger.info("Web3 connection initialized", network="Arbitrum")
        
        # Enhanced feature weights for valuation
        self.feature_weights = {
            "creator_reputation": 0.20,
            "content_quality": 0.18,
            "market_demand": 0.15,
            "historical_performance": 0.12,
            "rarity": 0.10,
            "category_trend": 0.08,
            "market_sentiment": 0.07,
            "seasonal_factor": 0.05,
            "liquidity_score": 0.05,
        }
        
        # Model performance tracking
        self.model_metrics = {
            "mae": 0.0,
            "r2_score": 0.0,
            "prediction_count": 0,
            "last_updated": None,
        }
    
    async def load_model(self):
        """Load the valuation ML models"""
        try:
            logger.info("Loading valuation models", model_name=settings.valuation_model_name)
            
            # Load neural network model
            self.neural_model = self._create_neural_valuation_model()
            self.neural_model.eval()
            
            # Load ensemble model (Random Forest + Gradient Boosting)
            self.ensemble_model = self._create_ensemble_model()
            
            # Load pre-trained models if available
            await self._load_pretrained_models()
            
            # Initialize scaler with historical data
            await self._initialize_scaler()
            
            logger.info("Valuation models loaded successfully")
        except Exception as e:
            logger.error("Failed to load valuation models", error=str(e))
            raise
    
    def _create_neural_valuation_model(self) -> torch.nn.Module:
        """Create an enhanced neural network for valuation"""
        class EnhancedValuationModel(torch.nn.Module):
            def __init__(self, input_size=30):
                super().__init__()
                # Feature extraction layers
                self.feature_extractor = nn.Sequential(
                    nn.Linear(input_size, 128),
                    nn.BatchNorm1d(128),
                    nn.ReLU(),
                    nn.Dropout(0.3),
                    
                    nn.Linear(128, 64),
                    nn.BatchNorm1d(64),
                    nn.ReLU(),
                    nn.Dropout(0.2),
                    
                    nn.Linear(64, 32),
                    nn.BatchNorm1d(32),
                    nn.ReLU(),
                    nn.Dropout(0.1),
                )
                
                # Value prediction head
                self.value_head = nn.Sequential(
                    nn.Linear(32, 16),
                    nn.ReLU(),
                    nn.Linear(16, 1),
                )
                
                # Uncertainty estimation head
                self.uncertainty_head = nn.Sequential(
                    nn.Linear(32, 16),
                    nn.ReLU(),
                    nn.Linear(16, 1),
                    nn.Softplus(),  # Ensure positive uncertainty
                )
            
            def forward(self, x):
                features = self.feature_extractor(x)
                value = self.value_head(features)
                uncertainty = self.uncertainty_head(features)
                return value, uncertainty
        
        return EnhancedValuationModel()
    
    def _create_ensemble_model(self) -> Dict[str, Any]:
        """Create ensemble of traditional ML models"""
        return {
            'random_forest': RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
            ),
            'gradient_boosting': GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
            ),
        }
    
    async def _load_pretrained_models(self):
        """Load pre-trained models from disk if available"""
        try:
            model_dir = "models"
            if os.path.exists(f"{model_dir}/neural_model.pth"):
                self.neural_model.load_state_dict(
                    torch.load(f"{model_dir}/neural_model.pth", map_location='cpu')
                )
                logger.info("Pre-trained neural model loaded")
            
            if os.path.exists(f"{model_dir}/ensemble_models.joblib"):
                self.ensemble_model = joblib.load(f"{model_dir}/ensemble_models.joblib")
                logger.info("Pre-trained ensemble models loaded")
                
            if os.path.exists(f"{model_dir}/scaler.joblib"):
                self.scaler = joblib.load(f"{model_dir}/scaler.joblib")
                logger.info("Pre-trained scaler loaded")
                
        except Exception as e:
            logger.warning("Could not load pre-trained models", error=str(e))
    
    async def _initialize_scaler(self):
        """Initialize feature scaler with historical data"""
        try:
            # Get sample historical data for scaler initialization
            sample_data = await self._get_historical_training_data(limit=1000)
            if sample_data:
                features = np.array([self._extract_features_array(d) for d in sample_data])
                self.scaler.fit(features)
                logger.info("Feature scaler initialized with historical data")
        except Exception as e:
            logger.warning("Could not initialize scaler", error=str(e))
    
    async def estimate_value(
        self,
        token_id: int,
        metadata: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]] = None,
    ) -> ValuationResponse:
        """
        Estimate IP value using enhanced ML models
        
        Args:
            token_id: NFT token ID
            metadata: NFT metadata including category, creator, etc.
            historical_data: Historical sales data for similar content
        
        Returns:
            ValuationResponse with estimated value and confidence interval
        """
        start_time = time.time()
        
        try:
            # 1. Gather comprehensive market data
            market_data = await self._gather_market_data(metadata)
            
            # 2. Extract and prepare enhanced features
            features = await self._prepare_enhanced_features(
                token_id, metadata, historical_data, market_data
            )
            
            # 3. Run ensemble valuation models
            neural_prediction = await self._run_neural_model(features)
            ensemble_prediction = await self._run_ensemble_models(features)
            
            # 4. Combine predictions with confidence weighting
            estimated_value, model_uncertainty = self._combine_predictions(
                neural_prediction, ensemble_prediction
            )
            
            # 5. Calculate enhanced confidence interval with uncertainty quantification
            confidence_interval = await self._calculate_enhanced_confidence_interval(
                estimated_value, model_uncertainty, features, market_data
            )
            
            # 6. Find and analyze comparable sales
            comparable_sales = await self._find_enhanced_comparable_sales(
                metadata, historical_data, market_data
            )
            
            # 7. Generate explainable valuation factors
            factors = await self._calculate_explainable_factors(
                features, metadata, market_data, estimated_value
            )
            
            # 8. Validate prediction against market bounds
            estimated_value = self._validate_market_bounds(
                estimated_value, metadata, comparable_sales
            )
            
            # 9. Submit to Chainlink Oracle (if configured)
            if settings.chainlink_oracle_address:
                from src.services.chainlink_service import chainlink_oracle
                if chainlink_oracle.is_ready():
                    await chainlink_oracle.submit_valuation(
                        str(token_id),
                        estimated_value,
                        1.0 - model_uncertainty,
                        metadata
                    )
            
            # 10. Update model performance metrics
            await self._update_model_metrics(estimated_value, features)
            
            processing_time = (time.time() - start_time) * 1000
            
            logger.info(
                "Enhanced valuation completed",
                token_id=token_id,
                estimated_value=estimated_value,
                confidence_interval=confidence_interval,
                processing_time_ms=processing_time,
                model_uncertainty=model_uncertainty,
            )
            
            return ValuationResponse(
                estimated_value=estimated_value,
                confidence_interval=confidence_interval,
                comparable_sales=comparable_sales,
                factors=factors,
                model_uncertainty=model_uncertainty,
                processing_time_ms=processing_time,
            )
        
        except Exception as e:
            logger.error("Enhanced valuation estimation failed", token_id=token_id, error=str(e))
            raise
    
    async def _gather_market_data(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Gather comprehensive market data for valuation"""
        try:
            category = metadata.get("category", "unknown")
            
            # Get market data from cache or fetch fresh
            cache_key = f"market_data_{category}_{datetime.now().strftime('%Y%m%d')}"
            if cache_key in self.market_data_cache:
                return self.market_data_cache[cache_key]
            
            market_data = {
                "category_volume_24h": await self._get_category_volume(category),
                "category_avg_price": await self._get_category_avg_price(category),
                "market_volatility": await self._get_market_volatility(),
                "trending_categories": await self._get_trending_categories(),
                "liquidity_metrics": await self._get_liquidity_metrics(category),
                "macro_indicators": await self._get_macro_indicators(),
            }
            
            # Cache for 1 hour
            self.market_data_cache[cache_key] = market_data
            return market_data
            
        except Exception as e:
            logger.warning("Failed to gather market data", error=str(e))
            return {}
    
    async def _prepare_enhanced_features(
        self,
        token_id: int,
        metadata: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]],
        market_data: Dict[str, Any],
    ) -> torch.Tensor:
        """Prepare enhanced feature vector for valuation models"""
        
        features = []
        
        # 1. Creator and Content Features
        creator_reputation = await self._get_creator_reputation(metadata.get("creator", ""))
        features.extend([
            creator_reputation,
            metadata.get("quality_score", 0.5),
            metadata.get("rarity", 0.5),
            metadata.get("has_license", 0),
            metadata.get("is_verified", 0),
            min(metadata.get("views", 0) / 10000, 1.0),
            min(metadata.get("likes", 0) / 1000, 1.0),
            min(metadata.get("shares", 0) / 500, 1.0),
        ])
        
        # 2. Historical Performance Features
        if historical_data:
            prices = [d.get("price", 0) for d in historical_data]
            volumes = [d.get("volume", 0) for d in historical_data]
            
            features.extend([
                np.mean(prices) / 10000 if prices else 0.5,
                np.max(prices) / 50000 if prices else 0.5,
                np.std(prices) / 5000 if len(prices) > 1 else 0.1,
                len(historical_data) / 100,
                np.mean(volumes) if volumes else 0.1,
            ])
        else:
            features.extend([0.5, 0.5, 0.1, 0.1, 0.1])
        
        # 3. Market and Category Features
        category = metadata.get("category", "unknown")
        category_popularity = await self._get_category_popularity(category)
        
        features.extend([
            category_popularity,
            market_data.get("category_volume_24h", 0) / 1000000,  # Normalized
            market_data.get("category_avg_price", 1000) / 10000,
            market_data.get("market_volatility", 0.2),
        ])
        
        # 4. Temporal Features
        current_time = datetime.now()
        features.extend([
            self._get_market_sentiment(),
            self._get_seasonal_factor(),
            (current_time.hour / 24),  # Time of day
            (current_time.weekday() / 7),  # Day of week
        ])
        
        # 5. Liquidity and Trading Features
        liquidity_metrics = market_data.get("liquidity_metrics", {})
        features.extend([
            liquidity_metrics.get("bid_ask_spread", 0.1),
            liquidity_metrics.get("order_book_depth", 0.5),
            liquidity_metrics.get("trading_frequency", 0.3),
        ])
        
        # 6. Macro Economic Indicators
        macro_indicators = market_data.get("macro_indicators", {})
        features.extend([
            macro_indicators.get("crypto_market_cap", 0.5),
            macro_indicators.get("nft_market_sentiment", 0.5),
            macro_indicators.get("risk_appetite", 0.5),
        ])
        
        # Pad to 30 features
        while len(features) < 30:
            features.append(0.0)
        
        return torch.tensor(features[:30], dtype=torch.float32)
    
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
    
    async def _run_neural_model(self, features: torch.Tensor) -> Tuple[float, float]:
        """Run the neural network model to estimate value and uncertainty"""
        
        if self.neural_model is None:
            # Fallback to rule-based valuation
            value = self._rule_based_valuation(features)
            return value, value * 0.3  # 30% uncertainty
        
        with torch.no_grad():
            # Normalize features
            features_np = features.numpy().reshape(1, -1)
            features_scaled = self.scaler.transform(features_np)
            features_tensor = torch.tensor(features_scaled, dtype=torch.float32)
            
            # Run model
            value_output, uncertainty_output = self.neural_model(features_tensor)
            
            # Convert to USD value (scale output)
            estimated_value = float(torch.exp(value_output).item())
            model_uncertainty = float(uncertainty_output.item())
            
            # Clamp to reasonable range
            estimated_value = max(100, min(estimated_value, 1000000))
            model_uncertainty = max(0.01, min(model_uncertainty, 0.8))
        
        return estimated_value, model_uncertainty
    
    async def _run_ensemble_models(self, features: torch.Tensor) -> Dict[str, float]:
        """Run ensemble of traditional ML models"""
        
        if not self.ensemble_model:
            return {}
        
        try:
            # Prepare features for sklearn models
            features_np = features.numpy().reshape(1, -1)
            features_scaled = self.scaler.transform(features_np)
            
            predictions = {}
            
            # Random Forest prediction
            if 'random_forest' in self.ensemble_model:
                rf_pred = self.ensemble_model['random_forest'].predict(features_scaled)[0]
                predictions['random_forest'] = max(100, min(rf_pred, 1000000))
            
            # Gradient Boosting prediction
            if 'gradient_boosting' in self.ensemble_model:
                gb_pred = self.ensemble_model['gradient_boosting'].predict(features_scaled)[0]
                predictions['gradient_boosting'] = max(100, min(gb_pred, 1000000))
            
            return predictions
            
        except Exception as e:
            logger.warning("Ensemble model prediction failed", error=str(e))
            return {}
    
    def _combine_predictions(
        self, 
        neural_prediction: Tuple[float, float], 
        ensemble_predictions: Dict[str, float]
    ) -> Tuple[float, float]:
        """Combine predictions from different models with confidence weighting"""
        
        neural_value, neural_uncertainty = neural_prediction
        
        # Collect all predictions
        all_predictions = [neural_value]
        weights = [0.5]  # Neural network weight
        
        if ensemble_predictions:
            for model_name, prediction in ensemble_predictions.items():
                all_predictions.append(prediction)
                # Weight based on model type
                if model_name == 'random_forest':
                    weights.append(0.3)
                elif model_name == 'gradient_boosting':
                    weights.append(0.2)
                else:
                    weights.append(0.1)
        
        # Normalize weights
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]
        
        # Weighted average
        combined_value = sum(pred * weight for pred, weight in zip(all_predictions, weights))
        
        # Calculate combined uncertainty
        prediction_variance = np.var(all_predictions) if len(all_predictions) > 1 else 0
        combined_uncertainty = np.sqrt(neural_uncertainty**2 + prediction_variance)
        
        return combined_value, combined_uncertainty
    
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
    
    async def _calculate_enhanced_confidence_interval(
        self,
        estimated_value: float,
        model_uncertainty: float,
        features: torch.Tensor,
        market_data: Dict[str, Any],
    ) -> List[float]:
        """Calculate enhanced confidence interval with multiple uncertainty sources"""
        
        # 1. Model uncertainty (from neural network)
        model_std = model_uncertainty
        
        # 2. Feature quality uncertainty
        feature_quality = float(torch.mean(features).item())
        feature_uncertainty = 0.3 - (feature_quality * 0.2)  # 10-30% based on feature quality
        
        # 3. Market volatility uncertainty
        market_volatility = market_data.get("market_volatility", 0.2)
        volatility_uncertainty = market_volatility * 0.5  # Scale market volatility
        
        # 4. Data availability uncertainty
        data_completeness = self._assess_data_completeness(features, market_data)
        data_uncertainty = (1 - data_completeness) * 0.2  # Up to 20% for incomplete data
        
        # 5. Historical prediction accuracy
        historical_accuracy = self.model_metrics.get("r2_score", 0.7)
        accuracy_uncertainty = (1 - historical_accuracy) * 0.3
        
        # Combine uncertainties (root sum of squares)
        total_uncertainty = np.sqrt(
            model_std**2 + 
            feature_uncertainty**2 + 
            volatility_uncertainty**2 + 
            data_uncertainty**2 + 
            accuracy_uncertainty**2
        )
        
        # Apply confidence level (95% confidence interval = 1.96 * std)
        confidence_multiplier = 1.96
        margin = estimated_value * total_uncertainty * confidence_multiplier
        
        lower_bound = max(estimated_value - margin, estimated_value * 0.3)  # At least 30% of estimate
        upper_bound = min(estimated_value + margin, estimated_value * 3.0)  # At most 300% of estimate
        
        return [round(lower_bound, 2), round(upper_bound, 2)]
    
    def _assess_data_completeness(
        self, 
        features: torch.Tensor, 
        market_data: Dict[str, Any]
    ) -> float:
        """Assess completeness of data for uncertainty calculation"""
        
        # Check feature completeness
        feature_completeness = 1.0 - (features == 0).float().mean().item()
        
        # Check market data completeness
        market_completeness = len(market_data) / 6  # Expected 6 market data fields
        market_completeness = min(market_completeness, 1.0)
        
        # Combined completeness score
        return (feature_completeness + market_completeness) / 2
    
    async def _find_enhanced_comparable_sales(
        self,
        metadata: Dict[str, Any],
        historical_data: Optional[List[Dict[str, Any]]],
        market_data: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Find enhanced comparable sales with similarity scoring"""
        
        if not historical_data:
            # Try to fetch from external sources
            historical_data = await self._fetch_external_comparable_sales(metadata)
        
        if not historical_data:
            return []
        
        category = metadata.get("category", "")
        creator = metadata.get("creator", "")
        quality_score = metadata.get("quality_score", 0.5)
        
        # Calculate similarity scores for each historical sale
        comparable_with_scores = []
        
        for sale in historical_data:
            similarity_score = self._calculate_similarity_score(metadata, sale)
            
            if similarity_score > 0.3:  # Minimum similarity threshold
                sale_with_score = sale.copy()
                sale_with_score["similarity_score"] = similarity_score
                sale_with_score["price_per_quality"] = sale.get("price", 0) / max(sale.get("quality_score", 0.5), 0.1)
                comparable_with_scores.append(sale_with_score)
        
        # Sort by similarity score and recency
        comparable_with_scores.sort(
            key=lambda x: (x["similarity_score"], x.get("timestamp", 0)), 
            reverse=True
        )
        
        # Return top 10 most similar
        return comparable_with_scores[:10]
    
    def _calculate_similarity_score(
        self, 
        target_metadata: Dict[str, Any], 
        sale_metadata: Dict[str, Any]
    ) -> float:
        """Calculate similarity score between target and historical sale"""
        
        score = 0.0
        
        # Category match (40% weight)
        if target_metadata.get("category") == sale_metadata.get("category"):
            score += 0.4
        
        # Creator match (20% weight)
        if target_metadata.get("creator") == sale_metadata.get("creator"):
            score += 0.2
        
        # Quality score similarity (20% weight)
        target_quality = target_metadata.get("quality_score", 0.5)
        sale_quality = sale_metadata.get("quality_score", 0.5)
        quality_similarity = 1 - abs(target_quality - sale_quality)
        score += quality_similarity * 0.2
        
        # Rarity similarity (10% weight)
        target_rarity = target_metadata.get("rarity", 0.5)
        sale_rarity = sale_metadata.get("rarity", 0.5)
        rarity_similarity = 1 - abs(target_rarity - sale_rarity)
        score += rarity_similarity * 0.1
        
        # Time decay (10% weight) - more recent sales are more relevant
        sale_timestamp = sale_metadata.get("timestamp", 0)
        current_timestamp = time.time()
        days_ago = (current_timestamp - sale_timestamp) / (24 * 3600)
        time_relevance = max(0, 1 - (days_ago / 365))  # Decay over 1 year
        score += time_relevance * 0.1
        
        return min(score, 1.0)
    
    async def _calculate_explainable_factors(
        self,
        features: torch.Tensor,
        metadata: Dict[str, Any],
        market_data: Dict[str, Any],
        estimated_value: float,
    ) -> Dict[str, Any]:
        """Calculate explainable valuation factors with impact analysis"""
        
        features_list = features.tolist()
        
        # Base factors with normalized scores
        base_factors = {
            "creator_reputation": {
                "score": round(features_list[0], 3),
                "impact": self._calculate_factor_impact("creator_reputation", features_list[0]),
                "description": "Creator's historical performance and reputation score",
            },
            "content_quality": {
                "score": round(features_list[1], 3),
                "impact": self._calculate_factor_impact("content_quality", features_list[1]),
                "description": "Technical and artistic quality assessment",
            },
            "category_popularity": {
                "score": round(features_list[2], 3),
                "impact": self._calculate_factor_impact("category_popularity", features_list[2]),
                "description": "Current market demand for this content category",
            },
            "rarity": {
                "score": round(features_list[3], 3),
                "impact": self._calculate_factor_impact("rarity", features_list[3]),
                "description": "Uniqueness and scarcity of the content",
            },
            "market_sentiment": {
                "score": round(features_list[-6], 3),
                "impact": self._calculate_factor_impact("market_sentiment", features_list[-6]),
                "description": "Overall market sentiment and trends",
            },
        }
        
        # Market-specific factors
        market_factors = {
            "liquidity": {
                "score": round(features_list[-3], 3),
                "impact": self._calculate_factor_impact("liquidity", features_list[-3]),
                "description": "Market liquidity and trading activity",
            },
            "volatility": {
                "score": market_data.get("market_volatility", 0.2),
                "impact": "negative" if market_data.get("market_volatility", 0.2) > 0.3 else "neutral",
                "description": "Market volatility affecting price stability",
            },
        }
        
        # Historical performance analysis
        historical_factors = await self._analyze_historical_performance(metadata, estimated_value)
        
        # Risk assessment
        risk_factors = self._assess_valuation_risks(features, market_data)
        
        return {
            "base_factors": base_factors,
            "market_factors": market_factors,
            "historical_factors": historical_factors,
            "risk_factors": risk_factors,
            "overall_confidence": self._calculate_overall_confidence(base_factors, market_factors),
        }
    
    def _calculate_factor_impact(self, factor_name: str, score: float) -> str:
        """Calculate the impact of a factor on valuation"""
        
        # Define thresholds for each factor
        thresholds = {
            "creator_reputation": {"high": 0.7, "low": 0.3},
            "content_quality": {"high": 0.8, "low": 0.4},
            "category_popularity": {"high": 0.6, "low": 0.3},
            "rarity": {"high": 0.7, "low": 0.3},
            "market_sentiment": {"high": 0.6, "low": 0.4},
            "liquidity": {"high": 0.5, "low": 0.2},
        }
        
        threshold = thresholds.get(factor_name, {"high": 0.6, "low": 0.4})
        
        if score >= threshold["high"]:
            return "positive"
        elif score <= threshold["low"]:
            return "negative"
        else:
            return "neutral"
    
    async def _analyze_historical_performance(
        self, 
        metadata: Dict[str, Any], 
        estimated_value: float
    ) -> Dict[str, Any]:
        """Analyze historical performance patterns"""
        
        creator = metadata.get("creator", "")
        category = metadata.get("category", "")
        
        # Get creator's historical performance
        creator_history = await self._get_creator_historical_performance(creator)
        
        # Get category trends
        category_trends = await self._get_category_trends(category)
        
        return {
            "creator_avg_performance": creator_history.get("avg_price", 0),
            "creator_success_rate": creator_history.get("success_rate", 0.5),
            "category_growth_rate": category_trends.get("growth_rate", 0),
            "price_vs_creator_avg": estimated_value / max(creator_history.get("avg_price", 1000), 1),
        }
    
    def _assess_valuation_risks(
        self, 
        features: torch.Tensor, 
        market_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess various risks affecting valuation"""
        
        return {
            "market_risk": "high" if market_data.get("market_volatility", 0.2) > 0.4 else "medium",
            "liquidity_risk": "high" if features[-3] < 0.3 else "low",
            "creator_risk": "high" if features[0] < 0.3 else "low",
            "category_risk": "high" if features[2] < 0.3 else "medium",
            "overall_risk_score": self._calculate_overall_risk_score(features, market_data),
        }
    
    def _calculate_overall_risk_score(
        self, 
        features: torch.Tensor, 
        market_data: Dict[str, Any]
    ) -> float:
        """Calculate overall risk score (0-1, higher = riskier)"""
        
        risk_factors = [
            1 - features[0],  # Creator reputation risk
            1 - features[1],  # Quality risk
            1 - features[2],  # Category risk
            market_data.get("market_volatility", 0.2),  # Market volatility
            1 - features[-3],  # Liquidity risk
        ]
        
        return round(np.mean(risk_factors), 3)
    
    def _calculate_overall_confidence(
        self, 
        base_factors: Dict[str, Any], 
        market_factors: Dict[str, Any]
    ) -> float:
        """Calculate overall confidence in valuation"""
        
        positive_factors = 0
        total_factors = 0
        
        for factor_group in [base_factors, market_factors]:
            for factor_name, factor_data in factor_group.items():
                if factor_data.get("impact") == "positive":
                    positive_factors += 1
                total_factors += 1
        
        return round(positive_factors / max(total_factors, 1), 3)
    
    def _validate_market_bounds(
        self,
        estimated_value: float,
        metadata: Dict[str, Any],
        comparable_sales: List[Dict[str, Any]],
    ) -> float:
        """Validate estimated value against market bounds"""
        
        if not comparable_sales:
            return estimated_value
        
        # Get price range from comparable sales
        prices = [sale.get("price", 0) for sale in comparable_sales if sale.get("price", 0) > 0]
        
        if not prices:
            return estimated_value
        
        min_price = min(prices)
        max_price = max(prices)
        median_price = np.median(prices)
        
        # Apply bounds with some flexibility
        lower_bound = min_price * 0.5  # Allow 50% below minimum
        upper_bound = max_price * 2.0  # Allow 100% above maximum
        
        # If estimate is way outside bounds, adjust towards median
        if estimated_value < lower_bound:
            estimated_value = (estimated_value + median_price) / 2
        elif estimated_value > upper_bound:
            estimated_value = (estimated_value + median_price) / 2
        
        return estimated_value
    
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
    async def _update_model_metrics(self, estimated_value: float, features: torch.Tensor):
        """Update model performance metrics"""
        try:
            self.model_metrics["prediction_count"] += 1
            self.model_metrics["last_updated"] = datetime.now().isoformat()
            
            # In production, compare with actual sale prices when available
            # For now, just track prediction statistics
            logger.info(
                "Model metrics updated",
                prediction_count=self.model_metrics["prediction_count"],
                estimated_value=estimated_value,
            )
        except Exception as e:
            logger.warning("Failed to update model metrics", error=str(e))
    
    async def _get_historical_training_data(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get historical data for model training"""
        try:
            # In production, fetch from database or data warehouse
            # For now, return mock data
            return [
                {
                    "price": np.random.lognormal(8, 1),  # Log-normal distribution for prices
                    "category": np.random.choice(["music", "art", "video", "ebook"]),
                    "quality_score": np.random.beta(2, 2),
                    "creator_reputation": np.random.beta(2, 3),
                    "rarity": np.random.beta(1.5, 3),
                    "timestamp": time.time() - np.random.randint(0, 365*24*3600),
                }
                for _ in range(min(limit, 100))  # Limit mock data
            ]
        except Exception as e:
            logger.warning("Failed to get historical training data", error=str(e))
            return []
    
    def _extract_features_array(self, data: Dict[str, Any]) -> List[float]:
        """Extract feature array from data record"""
        return [
            data.get("creator_reputation", 0.5),
            data.get("quality_score", 0.5),
            data.get("rarity", 0.5),
            # Add more features as needed
        ] + [0.0] * 27  # Pad to 30 features
    
    async def _get_category_volume(self, category: str) -> float:
        """Get 24h trading volume for category"""
        try:
            # In production, query from analytics database
            volumes = {"music": 50000, "art": 75000, "video": 30000, "ebook": 15000}
            return volumes.get(category, 25000)
        except Exception as e:
            logger.warning("Failed to get category volume", error=str(e))
            return 25000
    
    async def _get_category_avg_price(self, category: str) -> float:
        """Get average price for category"""
        try:
            # In production, query from analytics database
            avg_prices = {"music": 2500, "art": 5000, "video": 3000, "ebook": 1500}
            return avg_prices.get(category, 2000)
        except Exception as e:
            logger.warning("Failed to get category average price", error=str(e))
            return 2000
    
    async def _get_market_volatility(self) -> float:
        """Get current market volatility"""
        try:
            # In production, calculate from recent price movements
            return 0.25  # 25% volatility
        except Exception as e:
            logger.warning("Failed to get market volatility", error=str(e))
            return 0.2
    
    async def _get_trending_categories(self) -> List[str]:
        """Get currently trending categories"""
        try:
            # In production, analyze recent activity
            return ["music", "art", "video"]
        except Exception as e:
            logger.warning("Failed to get trending categories", error=str(e))
            return []
    
    async def _get_liquidity_metrics(self, category: str) -> Dict[str, float]:
        """Get liquidity metrics for category"""
        try:
            # In production, calculate from order book data
            return {
                "bid_ask_spread": 0.05,  # 5% spread
                "order_book_depth": 0.7,
                "trading_frequency": 0.6,
            }
        except Exception as e:
            logger.warning("Failed to get liquidity metrics", error=str(e))
            return {"bid_ask_spread": 0.1, "order_book_depth": 0.5, "trading_frequency": 0.3}
    
    async def _get_macro_indicators(self) -> Dict[str, float]:
        """Get macro economic indicators"""
        try:
            # In production, fetch from external APIs
            return {
                "crypto_market_cap": 0.6,  # Normalized
                "nft_market_sentiment": 0.5,
                "risk_appetite": 0.4,
            }
        except Exception as e:
            logger.warning("Failed to get macro indicators", error=str(e))
            return {"crypto_market_cap": 0.5, "nft_market_sentiment": 0.5, "risk_appetite": 0.5}
    
    async def _fetch_external_comparable_sales(self, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch comparable sales from external sources"""
        try:
            # In production, query external NFT marketplaces
            category = metadata.get("category", "")
            
            # Mock external data
            return [
                {
                    "price": np.random.lognormal(8, 0.5),
                    "category": category,
                    "quality_score": np.random.beta(2, 2),
                    "timestamp": time.time() - np.random.randint(0, 90*24*3600),
                    "source": "external_marketplace",
                }
                for _ in range(5)
            ]
        except Exception as e:
            logger.warning("Failed to fetch external comparable sales", error=str(e))
            return []
    
    async def _get_creator_historical_performance(self, creator: str) -> Dict[str, Any]:
        """Get creator's historical performance metrics"""
        try:
            # In production, query from creator analytics
            return {
                "avg_price": np.random.lognormal(8, 0.3),
                "success_rate": np.random.beta(3, 2),
                "total_sales": np.random.randint(5, 50),
                "reputation_trend": np.random.choice(["increasing", "stable", "decreasing"]),
            }
        except Exception as e:
            logger.warning("Failed to get creator historical performance", error=str(e))
            return {"avg_price": 2000, "success_rate": 0.6, "total_sales": 10, "reputation_trend": "stable"}
    
    async def _get_category_trends(self, category: str) -> Dict[str, Any]:
        """Get category trend analysis"""
        try:
            # In production, analyze category performance over time
            return {
                "growth_rate": np.random.normal(0.1, 0.2),  # 10% average growth with variance
                "trend_direction": np.random.choice(["up", "stable", "down"]),
                "volatility": np.random.beta(2, 5),
            }
        except Exception as e:
            logger.warning("Failed to get category trends", error=str(e))
            return {"growth_rate": 0.05, "trend_direction": "stable", "volatility": 0.2}
    
    async def train_model_with_new_data(self, training_data: List[Dict[str, Any]]):
        """Train/retrain the valuation models with new data"""
        try:
            logger.info("Starting model training with new data", data_size=len(training_data))
            
            if len(training_data) < 50:
                logger.warning("Insufficient training data", data_size=len(training_data))
                return
            
            # Prepare training data
            X = []
            y = []
            
            for record in training_data:
                features = self._extract_features_array(record)
                price = record.get("price", 0)
                
                if price > 0:
                    X.append(features)
                    y.append(np.log(price))  # Log transform for neural network
            
            if len(X) < 50:
                logger.warning("Insufficient valid training samples", valid_samples=len(X))
                return
            
            X = np.array(X)
            y = np.array(y)
            
            # Update scaler
            self.scaler.fit(X)
            X_scaled = self.scaler.transform(X)
            
            # Train ensemble models
            if self.ensemble_model:
                # Train Random Forest
                self.ensemble_model['random_forest'].fit(X_scaled, np.exp(y))  # Original scale
                rf_score = self.ensemble_model['random_forest'].score(X_scaled, np.exp(y))
                
                # Train Gradient Boosting
                self.ensemble_model['gradient_boosting'].fit(X_scaled, np.exp(y))
                gb_score = self.ensemble_model['gradient_boosting'].score(X_scaled, np.exp(y))
                
                logger.info("Ensemble models trained", rf_score=rf_score, gb_score=gb_score)
            
            # Train neural network (simplified training loop)
            if self.neural_model:
                self.neural_model.train()
                optimizer = torch.optim.Adam(self.neural_model.parameters(), lr=0.001)
                criterion = torch.nn.MSELoss()
                
                X_tensor = torch.tensor(X_scaled, dtype=torch.float32)
                y_tensor = torch.tensor(y, dtype=torch.float32).unsqueeze(1)
                
                # Simple training loop
                for epoch in range(100):
                    optimizer.zero_grad()
                    value_pred, uncertainty_pred = self.neural_model(X_tensor)
                    loss = criterion(value_pred, y_tensor)
                    loss.backward()
                    optimizer.step()
                    
                    if epoch % 20 == 0:
                        logger.info(f"Training epoch {epoch}, loss: {loss.item():.4f}")
                
                self.neural_model.eval()
                logger.info("Neural network model trained")
            
            # Update model metrics
            self.model_metrics["last_updated"] = datetime.now().isoformat()
            self.model_metrics["training_samples"] = len(X)
            
            # Save models
            await self._save_models()
            
            logger.info("Model training completed successfully")
            
        except Exception as e:
            logger.error("Model training failed", error=str(e))
            raise
    
    async def _save_models(self):
        """Save trained models to disk"""
        try:
            os.makedirs("models", exist_ok=True)
            
            # Save neural network
            if self.neural_model:
                torch.save(self.neural_model.state_dict(), "models/neural_model.pth")
            
            # Save ensemble models
            if self.ensemble_model:
                joblib.dump(self.ensemble_model, "models/ensemble_models.joblib")
            
            # Save scaler
            joblib.dump(self.scaler, "models/scaler.joblib")
            
            logger.info("Models saved successfully")
            
        except Exception as e:
            logger.warning("Failed to save models", error=str(e))
    
    def get_model_performance_metrics(self) -> Dict[str, Any]:
        """Get current model performance metrics"""
        return {
            **self.model_metrics,
            "feature_weights": self.feature_weights,
            "model_types": {
                "neural_network": self.neural_model is not None,
                "random_forest": "random_forest" in (self.ensemble_model or {}),
                "gradient_boosting": "gradient_boosting" in (self.ensemble_model or {}),
            },
        }