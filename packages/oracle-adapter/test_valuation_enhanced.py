#!/usr/bin/env python3
"""Test script for enhanced IP valuation service"""

import asyncio
import json
import time
from typing import Dict, Any

from src.services.valuation_service import ValuationService


async def test_enhanced_valuation():
    """Test the enhanced valuation service"""
    
    print("🧪 Testing Enhanced IP Valuation Service")
    print("=" * 50)
    
    # Initialize service
    valuation_service = ValuationService()
    
    # Load models
    print("📚 Loading ML models...")
    await valuation_service.load_model()
    print("✅ Models loaded successfully")
    
    # Test data
    test_cases = [
        {
            "name": "High-Quality Music NFT",
            "token_id": 1001,
            "metadata": {
                "category": "music",
                "creator": "0x1234567890123456789012345678901234567890",
                "quality_score": 0.9,
                "rarity": 0.8,
                "has_license": 1,
                "is_verified": 1,
                "views": 50000,
                "likes": 5000,
                "shares": 1000,
            },
            "historical_data": [
                {"price": 5000, "category": "music", "quality_score": 0.85, "timestamp": time.time() - 86400},
                {"price": 7500, "category": "music", "quality_score": 0.9, "timestamp": time.time() - 172800},
                {"price": 4200, "category": "music", "quality_score": 0.8, "timestamp": time.time() - 259200},
            ]
        },
        {
            "name": "Rare Digital Art",
            "token_id": 2001,
            "metadata": {
                "category": "art",
                "creator": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                "quality_score": 0.95,
                "rarity": 0.95,
                "has_license": 1,
                "is_verified": 1,
                "views": 100000,
                "likes": 15000,
                "shares": 3000,
            },
            "historical_data": [
                {"price": 15000, "category": "art", "quality_score": 0.9, "timestamp": time.time() - 86400},
                {"price": 25000, "category": "art", "quality_score": 0.95, "timestamp": time.time() - 172800},
                {"price": 12000, "category": "art", "quality_score": 0.85, "timestamp": time.time() - 259200},
            ]
        },
        {
            "name": "Low-Quality Video Content",
            "token_id": 3001,
            "metadata": {
                "category": "video",
                "creator": "0x9876543210987654321098765432109876543210",
                "quality_score": 0.3,
                "rarity": 0.2,
                "has_license": 0,
                "is_verified": 0,
                "views": 1000,
                "likes": 50,
                "shares": 5,
            },
            "historical_data": [
                {"price": 500, "category": "video", "quality_score": 0.3, "timestamp": time.time() - 86400},
                {"price": 300, "category": "video", "quality_score": 0.25, "timestamp": time.time() - 172800},
            ]
        }
    ]
    
    # Run tests
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🔍 Test Case {i}: {test_case['name']}")
        print("-" * 30)
        
        try:
            # Run valuation
            start_time = time.time()
            
            response = await valuation_service.estimate_value(
                token_id=test_case["token_id"],
                metadata=test_case["metadata"],
                historical_data=test_case["historical_data"],
            )
            
            processing_time = (time.time() - start_time) * 1000
            
            # Display results
            print(f"💰 Estimated Value: ${response.estimated_value:,.2f}")
            print(f"📊 Confidence Interval: ${response.confidence_interval[0]:,.2f} - ${response.confidence_interval[1]:,.2f}")
            print(f"🎯 Model Uncertainty: {response.model_uncertainty:.3f}")
            print(f"⏱️  Processing Time: {processing_time:.2f}ms")
            print(f"🔗 Comparable Sales: {len(response.comparable_sales)} found")
            
            # Display key factors
            if "base_factors" in response.factors:
                print("\n📈 Key Valuation Factors:")
                base_factors = response.factors["base_factors"]
                for factor_name, factor_data in base_factors.items():
                    impact_emoji = {"positive": "🟢", "negative": "🔴", "neutral": "🟡"}.get(factor_data["impact"], "⚪")
                    print(f"  {impact_emoji} {factor_name.replace('_', ' ').title()}: {factor_data['score']:.3f} ({factor_data['impact']})")
            
            # Display risk assessment
            if "risk_factors" in response.factors:
                risk_factors = response.factors["risk_factors"]
                risk_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(risk_factors.get("overall_risk_score", 0.5) > 0.6 and "high" or "medium", "🟡")
                print(f"\n⚠️  Overall Risk: {risk_emoji} {risk_factors.get('overall_risk_score', 'N/A')}")
            
            results.append({
                "test_case": test_case["name"],
                "estimated_value": response.estimated_value,
                "confidence_interval": response.confidence_interval,
                "processing_time_ms": processing_time,
                "success": True,
            })
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            results.append({
                "test_case": test_case["name"],
                "error": str(e),
                "success": False,
            })
    
    # Test model training
    print(f"\n🎓 Testing Model Training")
    print("-" * 30)
    
    try:
        # Generate mock training data
        training_data = []
        for _ in range(100):
            import numpy as np
            training_data.append({
                "price": np.random.lognormal(8, 1),
                "category": np.random.choice(["music", "art", "video", "ebook"]),
                "quality_score": np.random.beta(2, 2),
                "creator_reputation": np.random.beta(2, 3),
                "rarity": np.random.beta(1.5, 3),
                "timestamp": time.time() - np.random.randint(0, 365*24*3600),
            })
        
        await valuation_service.train_model_with_new_data(training_data)
        print("✅ Model training completed successfully")
        
    except Exception as e:
        print(f"❌ Model training failed: {str(e)}")
    
    # Test model metrics
    print(f"\n📊 Model Performance Metrics")
    print("-" * 30)
    
    try:
        metrics = valuation_service.get_model_performance_metrics()
        print(f"Prediction Count: {metrics.get('prediction_count', 0)}")
        print(f"Last Updated: {metrics.get('last_updated', 'Never')}")
        print(f"Model Types Available:")
        for model_type, available in metrics.get('model_types', {}).items():
            status_emoji = "✅" if available else "❌"
            print(f"  {status_emoji} {model_type.replace('_', ' ').title()}")
        
    except Exception as e:
        print(f"❌ Failed to get model metrics: {str(e)}")
    
    # Summary
    print(f"\n📋 Test Summary")
    print("=" * 50)
    
    successful_tests = sum(1 for r in results if r["success"])
    total_tests = len(results)
    
    print(f"✅ Successful Tests: {successful_tests}/{total_tests}")
    
    if successful_tests > 0:
        avg_processing_time = np.mean([r["processing_time_ms"] for r in results if r["success"]])
        print(f"⏱️  Average Processing Time: {avg_processing_time:.2f}ms")
        
        estimated_values = [r["estimated_value"] for r in results if r["success"]]
        print(f"💰 Value Range: ${min(estimated_values):,.2f} - ${max(estimated_values):,.2f}")
    
    print(f"\n🎉 Enhanced IP Valuation Service Test Complete!")
    
    return results


if __name__ == "__main__":
    # Run the test
    results = asyncio.run(test_enhanced_valuation())
    
    # Save results
    with open("valuation_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Test results saved to valuation_test_results.json")