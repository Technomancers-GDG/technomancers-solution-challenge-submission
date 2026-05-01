#!/usr/bin/env python3
"""
Gemini Integration Test Suite

Run this to validate the Gemini integration is working correctly.

Usage:
    python test_gemini_integration.py
    
Or with environment:
    GEMINI_DEBUG=true python test_gemini_integration.py
"""

import sys
import os

# Ensure we can import from project
sys.path.insert(0, os.path.dirname(__file__))

from backend.utils.gemini_client import (
    analyze_news_with_gemini,
    analyze_multiple_news,
    analyze_route_impact,
    generate_driver_message,
    generate_simulation_event,
)


def test_single_news():
    """Test analyze_news_with_gemini()"""
    print("\n" + "="*60)
    print("TEST 1: Single News Analysis")
    print("="*60)
    
    text = "Major traffic accident blocks highway between Chennai and Bangalore for 3 hours"
    print(f"\nInput: {text}")
    
    result = analyze_news_with_gemini(text)
    
    if result is None:
        print("❌ FAILED: Returned None")
        return False
    
    print("\nResult:")
    for key, value in result.items():
        print(f"  {key}: {value}")
    
    # Validate structure
    required_keys = {"event_type", "severity", "location", "summary"}
    if not required_keys.issubset(result.keys()):
        print(f"❌ FAILED: Missing keys. Got: {result.keys()}")
        return False
    
    print("✅ PASSED")
    return True


def test_multiple_news():
    """Test analyze_multiple_news()"""
    print("\n" + "="*60)
    print("TEST 2: Multiple News Analysis")
    print("="*60)
    
    news_list = [
        "Major traffic jam on Chennai ring road due to accident",
        "Logistics strike announced in Bangalore for tomorrow",
        "Heavy rain forecast for coastal regions this evening",
        "Highway repairs causing 2-hour delays near Hyderabad"
    ]
    
    print(f"\nInput: {len(news_list)} news items")
    for i, news in enumerate(news_list, 1):
        print(f"  {i}. {news}")
    
    result = analyze_multiple_news(news_list)
    
    if result is None:
        print("❌ FAILED: Returned None")
        return False
    
    print("\nResult:")
    for key, value in result.items():
        print(f"  {key}: {value}")
    
    # Validate structure
    required_keys = {"event_type", "severity", "affected_regions", "risk_score", "confidence", "reasoning"}
    if not required_keys.issubset(result.keys()):
        print(f"❌ FAILED: Missing keys. Got: {result.keys()}")
        return False
    
    # Validate value ranges
    if not 0 <= result["risk_score"] <= 1:
        print(f"❌ FAILED: risk_score {result['risk_score']} not in [0, 1]")
        return False
    
    if not 0 <= result["confidence"] <= 1:
        print(f"❌ FAILED: confidence {result['confidence']} not in [0, 1]")
        return False
    
    if result["severity"] not in ["low", "medium", "high"]:
        print(f"❌ FAILED: severity {result['severity']} not valid")
        return False
    
    print("✅ PASSED")
    return result


def test_route_impact(disruption):
    """Test analyze_route_impact()"""
    print("\n" + "="*60)
    print("TEST 3: Route Impact Analysis")
    print("="*60)
    
    route = "Bangalore → Chennai"
    print(f"\nRoute: {route}")
    print(f"Disruption: {disruption.get('event_type')} (risk: {disruption.get('risk_score')})")
    
    result = analyze_route_impact(route, disruption)
    
    if result is None:
        print("❌ FAILED: Returned None")
        return False
    
    print("\nResult:")
    for key, value in result.items():
        print(f"  {key}: {value}")
    
    # Validate structure
    required_keys = {"impact", "recommended_action", "reason"}
    if not required_keys.issubset(result.keys()):
        print(f"❌ FAILED: Missing keys. Got: {result.keys()}")
        return False
    
    if result["impact"] not in ["low", "medium", "high"]:
        print(f"❌ FAILED: impact {result['impact']} not valid")
        return False
    
    if result["recommended_action"] not in ["continue", "reroute", "delay"]:
        print(f"❌ FAILED: action {result['recommended_action']} not valid")
        return False
    
    print("✅ PASSED")
    return result


def test_driver_message(impact, disruption):
    """Test generate_driver_message()"""
    print("\n" + "="*60)
    print("TEST 4: Driver Message Generation")
    print("="*60)
    
    print(f"\nImpact: {impact.get('impact')}")
    print(f"Action: {impact.get('recommended_action')}")
    
    result = generate_driver_message(impact, disruption)
    
    if not result:
        print("❌ FAILED: Returned empty string")
        return False
    
    print(f"\nDriver Message:\n  \"{result}\"")
    
    # Validate
    if len(result) > 300:
        print("❌ FAILED: Message too long")
        return False
    
    if not isinstance(result, str):
        print("❌ FAILED: Not a string")
        return False
    
    print("✅ PASSED")
    return result


def test_simulation_event():
    """Test generate_simulation_event()"""
    print("\n" + "="*60)
    print("TEST 5: Simulation Event Generation")
    print("="*60)
    
    text = "Major protest blocks ring road in Chennai during peak hours"
    print(f"\nInput: {text}")
    
    result = generate_simulation_event(text)
    
    if result is None:
        print("❌ FAILED: Returned None")
        return False
    
    print("\nResult:")
    for key, value in result.items():
        print(f"  {key}: {value}")
    
    # Validate structure
    required_keys = {"event", "severity", "location", "estimated_duration_hours"}
    if not required_keys.issubset(result.keys()):
        print(f"❌ FAILED: Missing keys. Got: {result.keys()}")
        return False
    
    if result["severity"] not in ["low", "medium", "high"]:
        print(f"❌ FAILED: severity {result['severity']} not valid")
        return False
    
    if not isinstance(result["estimated_duration_hours"], int):
        print(f"❌ FAILED: duration not int")
        return False
    
    print("✅ PASSED")
    return result


def test_error_handling():
    """Test error handling"""
    print("\n" + "="*60)
    print("TEST 6: Error Handling")
    print("="*60)
    
    # Empty input
    print("\n6a. Empty input handling...")
    result = analyze_multiple_news([])
    if result is None:
        print("  ✅ Correctly returned None for empty list")
    else:
        print("  ❌ Should return None for empty list")
        return False
    
    # None input
    print("6b. None disruption handling...")
    result = analyze_route_impact("A → B", None)
    if result is None:
        print("  ✅ Correctly returned None for invalid disruption")
    else:
        print("  ❌ Should return None for invalid disruption")
        return False
    
    print("✅ PASSED")
    return True


def main():
    """Run all tests"""
    print("\n" + "█"*60)
    print("█  GEMINI INTEGRATION TEST SUITE")
    print("█"*60)
    
    # Check for API key
    from config import settings
    if not settings.gemini_api_key:
        print("❌ ERROR: GEMINI_API_KEY not configured in config.py")
        return False
    
    print(f"\n✓ API Key configured: {settings.gemini_api_key[:20]}...")
    
    # Run tests
    results = []
    
    # Test 1
    results.append(("Single News Analysis", test_single_news()))
    
    # Test 2
    disruption_result = test_multiple_news()
    results.append(("Multiple News Analysis", disruption_result is not False))
    
    if disruption_result:
        # Test 3
        impact_result = test_route_impact(disruption_result)
        results.append(("Route Impact Analysis", impact_result is not False))
        
        # Test 4
        if impact_result:
            results.append(("Driver Message Generation", test_driver_message(impact_result, disruption_result) is not False))
    
    # Test 5
    results.append(("Simulation Event Generation", test_simulation_event() is not False))
    
    # Test 6
    results.append(("Error Handling", test_error_handling()))
    
    # Summary
    print("\n" + "█"*60)
    print("█  TEST SUMMARY")
    print("█"*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! Gemini integration is ready.")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Review logs above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
