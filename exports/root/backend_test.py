#!/usr/bin/env python3
"""
XChess Platform Backend Testing Suite
Tests the backend API endpoints and validates Supabase/Firebase integration modules
"""

import requests
import json
import sys
import os
from urllib.parse import urljoin

# Get base URL from environment
BASE_URL = "https://xchess-play.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_health_check():
    """Test the health check API endpoint: GET /api/"""
    print("\n=== Testing Health Check API ===")
    try:
        # Test GET /api/ (root endpoint)
        response = requests.get(f"{API_BASE}/", timeout=10)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ Health check API working correctly")
                return True
            else:
                print(f"❌ Health check API returned wrong message: {data}")
                return False
        else:
            print(f"❌ Health check API failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Health check API error: {str(e)}")
        return False

def test_status_endpoints():
    """Test the status endpoints for completeness"""
    print("\n=== Testing Status Endpoints ===")
    try:
        # Test POST /api/status
        status_data = {"client_name": "backend_test_client"}
        response = requests.post(f"{API_BASE}/status", 
                               json=status_data, 
                               timeout=10)
        
        print(f"POST /api/status status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Status creation response: {data}")
            
            # Test GET /api/status
            get_response = requests.get(f"{API_BASE}/status", timeout=10)
            print(f"GET /api/status status: {get_response.status_code}")
            
            if get_response.status_code == 200:
                statuses = get_response.json()
                print(f"Retrieved {len(statuses)} status entries")
                print("✅ Status endpoints working correctly")
                return True
                
        print("❌ Status endpoints failed")
        return False
        
    except Exception as e:
        print(f"❌ Status endpoints error: {str(e)}")
        return False

def validate_supabase_client_module():
    """Validate the Supabase client module structure"""
    print("\n=== Validating Supabase Client Module ===")
    try:
        client_path = "/app/lib/supabase/client.js"
        
        if not os.path.exists(client_path):
            print(f"❌ Supabase client file not found: {client_path}")
            return False
            
        with open(client_path, 'r') as f:
            content = f.read()
            
        # Check for required imports
        if '@supabase/ssr' not in content:
            print("❌ Missing @supabase/ssr import")
            return False
            
        if 'createBrowserClient' not in content:
            print("❌ Missing createBrowserClient import")
            return False
            
        # Check for createClient export
        if 'export function createClient()' not in content and 'export const createClient' not in content:
            print("❌ Missing createClient export function")
            return False
            
        # Check for environment variable usage
        if 'NEXT_PUBLIC_SUPABASE_URL' not in content:
            print("❌ Missing Supabase URL environment variable")
            return False
            
        if 'NEXT_PUBLIC_SUPABASE_ANON_KEY' not in content:
            print("❌ Missing Supabase anon key environment variable")
            return False
            
        print("✅ Supabase client module structure is valid")
        return True
        
    except Exception as e:
        print(f"❌ Supabase client validation error: {str(e)}")
        return False

def validate_supabase_server_module():
    """Validate the Supabase server module structure"""
    print("\n=== Validating Supabase Server Module ===")
    try:
        server_path = "/app/lib/supabase/server.js"
        
        if not os.path.exists(server_path):
            print(f"❌ Supabase server file not found: {server_path}")
            return False
            
        with open(server_path, 'r') as f:
            content = f.read()
            
        # Check for required imports
        if 'createServerClient' not in content:
            print("❌ Missing createServerClient import")
            return False
            
        if 'next/headers' not in content:
            print("❌ Missing next/headers import for cookies")
            return False
            
        # Check for server client function
        if 'createServerSupabaseClient' not in content:
            print("❌ Missing createServerSupabaseClient function")
            return False
            
        # Check for cookie handling
        if 'cookies' not in content:
            print("❌ Missing cookie handling configuration")
            return False
            
        print("✅ Supabase server module structure is valid")
        return True
        
    except Exception as e:
        print(f"❌ Supabase server validation error: {str(e)}")
        return False

def validate_supabase_middleware_module():
    """Validate the Supabase middleware module structure"""
    print("\n=== Validating Supabase Middleware Module ===")
    try:
        middleware_path = "/app/lib/supabase/middleware.js"
        
        if not os.path.exists(middleware_path):
            print(f"❌ Supabase middleware file not found: {middleware_path}")
            return False
            
        with open(middleware_path, 'r') as f:
            content = f.read()
            
        # Check for required imports
        if 'createServerClient' not in content:
            print("❌ Missing createServerClient import")
            return False
            
        if 'NextResponse' not in content:
            print("❌ Missing NextResponse import")
            return False
            
        # Check for updateSession function
        if 'export async function updateSession' not in content:
            print("❌ Missing updateSession export function")
            return False
            
        # Check for graceful error handling
        if 'console.warn' not in content or 'try' not in content:
            print("❌ Missing graceful error handling")
            return False
            
        print("✅ Supabase middleware module structure is valid")
        return True
        
    except Exception as e:
        print(f"❌ Supabase middleware validation error: {str(e)}")
        return False

def validate_oauth_callback_route():
    """Validate the OAuth callback route structure"""
    print("\n=== Validating OAuth Callback Route ===")
    try:
        callback_path = "/app/app/auth/callback/route.js"
        
        if not os.path.exists(callback_path):
            print(f"❌ OAuth callback route not found: {callback_path}")
            return False
            
        with open(callback_path, 'r') as f:
            content = f.read()
            
        # Check for GET export
        if 'export async function GET' not in content:
            print("❌ Missing GET function export")
            return False
            
        # Check for code exchange
        if 'exchangeCodeForSession' not in content:
            print("❌ Missing code exchange for session")
            return False
            
        # Check for redirect handling
        if 'NextResponse.redirect' not in content:
            print("❌ Missing redirect response")
            return False
            
        print("✅ OAuth callback route structure is valid")
        return True
        
    except Exception as e:
        print(f"❌ OAuth callback validation error: {str(e)}")
        return False

def validate_firebase_client_module():
    """Validate the Firebase client module structure"""
    print("\n=== Validating Firebase Client Module ===")
    try:
        firebase_path = "/app/lib/firebase/client.js"
        
        if not os.path.exists(firebase_path):
            print(f"❌ Firebase client file not found: {firebase_path}")
            return False
            
        with open(firebase_path, 'r') as f:
            content = f.read()
            
        # Check for required imports
        if 'firebase/app' not in content:
            print("❌ Missing firebase/app import")
            return False
            
        if 'firebase/analytics' not in content:
            print("❌ Missing firebase/analytics import")
            return False
            
        # Check for app initialization
        if 'getFirebaseApp' not in content:
            print("❌ Missing getFirebaseApp function")
            return False
            
        # Check for analytics initialization
        if 'getFirebaseAnalytics' not in content:
            print("❌ Missing getFirebaseAnalytics function")
            return False
            
        print("✅ Firebase client module structure is valid")
        return True
        
    except Exception as e:
        print(f"❌ Firebase client validation error: {str(e)}")
        return False

def validate_firebase_analytics_module():
    """Validate the Firebase analytics module structure"""
    print("\n=== Validating Firebase Analytics Module ===")
    try:
        analytics_path = "/app/lib/firebase/analytics.js"
        
        if not os.path.exists(analytics_path):
            print(f"❌ Firebase analytics file not found: {analytics_path}")
            return False
            
        with open(analytics_path, 'r') as f:
            content = f.read()
            
        # Check for required event tracking functions
        required_functions = [
            'trackPageView',
            'trackBoardLoaded', 
            'trackGameStarted',
            'trackGameFinished',
            'trackMoveAttempted',
            'trackMoveCommitted',
            'trackIllegalMoveAttempt',
            'trackArcherFireModeOpened',
            'trackArcherFireConfirmed',
            'trackPuzzleStart',
            'trackPuzzleComplete',
            'trackSignUp',
            'trackLogin'
        ]
        
        missing_functions = []
        for func in required_functions:
            if func not in content:
                missing_functions.append(func)
                
        if missing_functions:
            print(f"❌ Missing analytics functions: {missing_functions}")
            return False
            
        # Check for analytics export object
        if 'export const analytics' not in content:
            print("❌ Missing analytics export object")
            return False
            
        print("✅ Firebase analytics module structure is valid")
        return True
        
    except Exception as e:
        print(f"❌ Firebase analytics validation error: {str(e)}")
        return False

def validate_api_layer_module():
    """Validate the API layer module structure"""
    print("\n=== Validating API Layer Module ===")
    try:
        api_path = "/app/lib/api/index.js"
        
        if not os.path.exists(api_path):
            print(f"❌ API layer file not found: {api_path}")
            return False
            
        with open(api_path, 'r') as f:
            content = f.read()
            
        # Check for required API exports
        required_apis = ['gamesApi', 'puzzlesApi', 'matchmakingApi', 'ratingsApi']
        
        for api_name in required_apis:
            if api_name not in content:
                print(f"❌ Missing API export: {api_name}")
                return False
                
        # Check for unified api export
        if 'export const api' not in content:
            print("❌ Missing unified api export")
            return False
            
        # Check for error handling
        if 'ApiError' not in content:
            print("❌ Missing ApiError class")
            return False
            
        print("✅ API layer module structure is valid")
        return True
        
    except Exception as e:
        print(f"❌ API layer validation error: {str(e)}")
        return False

def main():
    """Run all backend tests"""
    print("=== XChess Platform Backend Testing Suite ===")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    
    test_results = {}
    
    # API endpoint tests
    test_results['health_check'] = test_health_check()
    test_results['status_endpoints'] = test_status_endpoints()
    
    # Module validation tests
    test_results['supabase_client'] = validate_supabase_client_module()
    test_results['supabase_server'] = validate_supabase_server_module()
    test_results['supabase_middleware'] = validate_supabase_middleware_module()
    test_results['oauth_callback'] = validate_oauth_callback_route()
    test_results['firebase_client'] = validate_firebase_client_module()
    test_results['firebase_analytics'] = validate_firebase_analytics_module()
    test_results['api_layer'] = validate_api_layer_module()
    
    # Summary
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("⚠️  Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())