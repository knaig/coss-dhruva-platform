#!/usr/bin/env python3
"""
Test script for the new signup functionality.
This script tests the public user registration endpoint.
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
SIGNUP_ENDPOINT = f"{BASE_URL}/auth/signup"
SIGNIN_ENDPOINT = f"{BASE_URL}/auth/signin"

def test_signup():
    """Test the signup endpoint"""
    print("Testing signup endpoint...")
    
    # Test data
    signup_data = {
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "testpassword123"
    }
    
    try:
        # Make signup request
        response = requests.post(SIGNUP_ENDPOINT, json=signup_data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 201:
            print("✅ Signup successful!")
            return response.json()
        else:
            print("❌ Signup failed!")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the server is running.")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_signin(email, password):
    """Test signin with the newly created user"""
    print("\nTesting signin with new user...")
    
    signin_data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(SIGNIN_ENDPOINT, json=signin_data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("✅ Signin successful!")
            return response.json()
        else:
            print("❌ Signin failed!")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_duplicate_signup():
    """Test signup with duplicate email"""
    print("\nTesting duplicate signup...")
    
    signup_data = {
        "name": "Another User",
        "email": "testuser@example.com",  # Same email as before
        "password": "anotherpassword123"
    }
    
    try:
        response = requests.post(SIGNUP_ENDPOINT, json=signup_data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 400:
            print("✅ Duplicate email properly rejected!")
        else:
            print("❌ Duplicate email should have been rejected!")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 Testing Dhruva Platform Signup Functionality")
    print("=" * 50)
    
    # Test 1: Normal signup
    signup_result = test_signup()
    
    if signup_result:
        # Test 2: Signin with new user
        test_signin("testuser@example.com", "testpassword123")
        
        # Test 3: Duplicate signup
        test_duplicate_signup()
        
        print("\n📋 Summary:")
        print(f"✅ User ID: {signup_result.get('id')}")
        print(f"✅ Name: {signup_result.get('name')}")
        print(f"✅ Email: {signup_result.get('email')}")
        print(f"✅ Role: {signup_result.get('role')}")
        print(f"✅ API Key: {signup_result.get('api_key')[:20]}...")
        print(f"✅ Message: {signup_result.get('message')}")
    
    print("\n🎉 Testing completed!")
