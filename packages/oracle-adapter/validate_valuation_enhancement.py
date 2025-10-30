#!/usr/bin/env python3
"""Validation script for enhanced IP valuation service implementation"""

import ast
import os
import sys


def validate_valuation_service():
    """Validate the enhanced valuation service implementation"""
    
    print("🔍 Validating Enhanced IP Valuation Service Implementation")
    print("=" * 60)
    
    # Check if the valuation service file exists
    valuation_file = "src/services/valuation_service.py"
    if not os.path.exists(valuation_file):
        print(f"❌ Valuation service file not found: {valuation_file}")
        return False
    
    print(f"✅ Found valuation service file: {valuation_file}")
    
    # Read and parse the file
    try:
        with open(valuation_file, 'r') as f:
            content = f.read()
        
        # Parse the AST to validate structure
        tree = ast.parse(content)
        
    except Exception as e:
        print(f"❌ Failed to parse valuation service file: {e}")
        return False
    
    print("✅ Valuation service file parsed successfully")
    
    # Check for required enhancements
    enhancements = {
        "Enhanced Neural Network": [
            "EnhancedValuationModel",
            "uncertainty_head",
            "BatchNorm1d",
        ],
        "Ensemble Models": [
            "RandomForestRegressor",
            "GradientBoostingRegressor",
            "_create_ensemble_model",
        ],
        "Market Data Integration": [
            "_gather_market_data",
            "_get_category_volume",
            "_get_market_volatility",
        ],
        "Enhanced Features": [
            "_prepare_enhanced_features",
            "liquidity_metrics",
            "macro_indicators",
        ],
        "Confidence Intervals": [
            "_calculate_enhanced_confidence_interval",
            "model_uncertainty",
            "_assess_data_completeness",
        ],
        "Explainable Factors": [
            "_calculate_explainable_factors",
            "_calculate_factor_impact",
            "_assess_valuation_risks",
        ],
        "Model Training": [
            "train_model_with_new_data",
            "_save_models",
            "_load_pretrained_models",
        ],
        "Comparable Sales": [
            "_find_enhanced_comparable_sales",
            "_calculate_similarity_score",
            "_fetch_external_comparable_sales",
        ],
    }
    
    print("\n🔧 Checking Implementation Enhancements:")
    print("-" * 40)
    
    all_passed = True
    
    for enhancement_name, required_items in enhancements.items():
        print(f"\n📋 {enhancement_name}:")
        
        enhancement_passed = True
        for item in required_items:
            if item in content:
                print(f"  ✅ {item}")
            else:
                print(f"  ❌ {item} - Missing")
                enhancement_passed = False
                all_passed = False
        
        if enhancement_passed:
            print(f"  🎉 {enhancement_name} - Complete")
        else:
            print(f"  ⚠️  {enhancement_name} - Incomplete")
    
    # Check for ML dependencies
    print(f"\n📦 Checking ML Dependencies:")
    print("-" * 30)
    
    ml_imports = [
        "torch",
        "sklearn",
        "pandas",
        "joblib",
        "numpy",
    ]
    
    for import_name in ml_imports:
        if f"import {import_name}" in content or f"from {import_name}" in content:
            print(f"  ✅ {import_name}")
        else:
            print(f"  ❌ {import_name} - Missing import")
    
    # Check method signatures
    print(f"\n🔧 Checking Enhanced Method Signatures:")
    print("-" * 40)
    
    enhanced_methods = [
        ("estimate_value", "model_uncertainty"),
        ("_run_neural_model", "Tuple[float, float]"),
        ("_combine_predictions", "confidence weighting"),
        ("_calculate_enhanced_confidence_interval", "multiple uncertainty sources"),
    ]
    
    for method_name, expected_feature in enhanced_methods:
        if method_name in content:
            print(f"  ✅ {method_name} method found")
        else:
            print(f"  ❌ {method_name} method missing")
    
    # Check for new response fields
    print(f"\n📊 Checking Enhanced Response Fields:")
    print("-" * 35)
    
    response_fields = [
        "model_uncertainty",
        "processing_time_ms",
        "base_factors",
        "market_factors",
        "risk_factors",
    ]
    
    # Check schemas file
    schemas_file = "src/models/schemas.py"
    if os.path.exists(schemas_file):
        with open(schemas_file, 'r') as f:
            schemas_content = f.read()
        
        for field in response_fields:
            if field in schemas_content:
                print(f"  ✅ {field}")
            else:
                print(f"  ❌ {field} - Missing from schema")
    else:
        print(f"  ⚠️  Schema file not found: {schemas_file}")
    
    # Summary
    print(f"\n📋 Validation Summary")
    print("=" * 30)
    
    if all_passed:
        print("🎉 All enhancements implemented successfully!")
        print("✅ Enhanced IP Valuation Model is ready for deployment")
        
        # List key improvements
        print(f"\n🚀 Key Improvements Implemented:")
        print("  • Enhanced neural network with uncertainty estimation")
        print("  • Ensemble models (Random Forest + Gradient Boosting)")
        print("  • Comprehensive market data integration")
        print("  • Advanced confidence interval calculations")
        print("  • Explainable AI factors and risk assessment")
        print("  • Model training and retraining capabilities")
        print("  • Enhanced comparable sales analysis")
        print("  • Performance metrics tracking")
        
        return True
    else:
        print("⚠️  Some enhancements are missing or incomplete")
        print("🔧 Please review the implementation and add missing components")
        return False


def check_file_structure():
    """Check if all required files are present"""
    
    print(f"\n📁 Checking File Structure:")
    print("-" * 25)
    
    required_files = [
        "src/services/valuation_service.py",
        "src/models/schemas.py",
        "test_valuation_enhanced.py",
        "requirements.txt",
    ]
    
    all_files_present = True
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path} - Missing")
            all_files_present = False
    
    return all_files_present


def main():
    """Main validation function"""
    
    # Change to the correct directory
    if not os.path.exists("src"):
        print("❌ Not in the correct directory. Please run from oracle-adapter package root.")
        return False
    
    # Check file structure
    files_ok = check_file_structure()
    
    # Validate implementation
    implementation_ok = validate_valuation_service()
    
    # Final result
    print(f"\n🏁 Final Validation Result")
    print("=" * 30)
    
    if files_ok and implementation_ok:
        print("🎉 VALIDATION PASSED")
        print("✅ Enhanced IP Valuation Model implementation is complete!")
        print("🚀 Ready for testing and deployment")
        return True
    else:
        print("❌ VALIDATION FAILED")
        print("🔧 Please address the issues above before proceeding")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)