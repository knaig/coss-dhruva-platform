#!/usr/bin/env python3
"""
Production Email Testing Script for Dhruva Platform
Tests the complete email verification workflow with real email delivery.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "your-test-email@gmail.com"  # Replace with your actual email
TEST_NAME = "Production Test User"
TEST_PASSWORD = "testpassword123"

def log_message(message):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def test_signup():
    """Test user signup with email verification"""
    log_message("Testing user signup...")
    
    url = f"{BASE_URL}/auth/signup"
    payload = {
        "name": TEST_NAME,
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        log_message(f"Signup Response Status: {response.status_code}")
        log_message(f"Signup Response: {response.text}")
        
        if response.status_code == 201:
            log_message("✅ Signup successful! Check your email for verification link.")
            return True
        else:
            log_message(f"❌ Signup failed: {response.text}")
            return False
            
    except Exception as e:
        log_message(f"❌ Signup request failed: {str(e)}")
        return False

def test_registration_status():
    """Test registration status endpoint"""
    log_message("Testing registration status...")
    
    url = f"{BASE_URL}/auth/registration-status"
    params = {"email": TEST_EMAIL}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        log_message(f"Status Response: {response.status_code}")
        log_message(f"Status Data: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "pending":
                log_message("✅ Registration status is pending (correct)")
                return True
            else:
                log_message(f"⚠️ Unexpected status: {data.get('status')}")
                return False
        else:
            log_message(f"❌ Status check failed: {response.text}")
            return False
            
    except Exception as e:
        log_message(f"❌ Status request failed: {str(e)}")
        return False

def test_invalid_token():
    """Test email verification with invalid token"""
    log_message("Testing invalid token handling...")
    
    url = f"{BASE_URL}/auth/verify-email"
    params = {"token": "invalid-token-12345"}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        log_message(f"Invalid Token Response: {response.status_code}")
        log_message(f"Invalid Token Data: {response.text}")
        
        if response.status_code == 400:
            log_message("✅ Invalid token properly rejected")
            return True
        else:
            log_message(f"⚠️ Unexpected response for invalid token")
            return False
            
    except Exception as e:
        log_message(f"❌ Invalid token test failed: {str(e)}")
        return False

def main():
    """Run complete email verification testing"""
    log_message("=== DHRUVA PLATFORM EMAIL VERIFICATION TESTING ===")
    log_message(f"Testing with email: {TEST_EMAIL}")
    log_message("Make sure you have access to this email to check for verification emails!")
    log_message("")
    
    # Test 1: User Signup
    signup_success = test_signup()
    time.sleep(2)
    
    # Test 2: Registration Status
    status_success = test_registration_status()
    time.sleep(2)
    
    # Test 3: Invalid Token
    invalid_token_success = test_invalid_token()
    
    # Summary
    log_message("")
    log_message("=== TEST SUMMARY ===")
    log_message(f"Signup Test: {'✅ PASS' if signup_success else '❌ FAIL'}")
    log_message(f"Status Test: {'✅ PASS' if status_success else '❌ FAIL'}")
    log_message(f"Invalid Token Test: {'✅ PASS' if invalid_token_success else '❌ FAIL'}")
    
    if signup_success:
        log_message("")
        log_message("🎯 NEXT STEPS:")
        log_message("1. Check your email inbox for verification email")
        log_message("2. Click the verification link or copy the token")
        log_message("3. Test the verification endpoint manually:")
        log_message(f"   curl 'http://localhost:8000/auth/verify-email?token=YOUR_TOKEN'")
        log_message("")
        log_message("If you receive the email, your production email configuration is working! 🎉")
    
    return signup_success and status_success and invalid_token_success

if __name__ == "__main__":
    if len(sys.argv) > 1:
        TEST_EMAIL = sys.argv[1]
    
    success = main()
    sys.exit(0 if success else 1)
