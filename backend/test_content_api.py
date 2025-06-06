#!/usr/bin/env python3
"""
Test script for testset content API endpoints
"""

import requests
import json
import os
import sys

# Add the app directory to path
sys.path.append('.')

BASE_URL = "http://localhost:8000/api/v1"

def get_auth_token():
    """Get auth token for testing"""
    # Try to login with default admin credentials
    login_data = {
        'username': 'admin@example.com',
        'password': 'admin123'
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data=login_data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_get_testsets():
    """Test getting testsets"""
    token = get_auth_token()
    if not token:
        return
    
    headers = {'Authorization': f'Bearer {token}'}
    
    print("🔍 Testing GET /testsets/")
    response = requests.get(f"{BASE_URL}/testsets/", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data['items'])} testsets")
        if data['items']:
            testset = data['items'][0]
            print(f"First testset: {testset['testset_name']} (ID: {testset['testset_id']})")
            return testset['testset_id']
    else:
        print(f"Error: {response.text}")
    
    return None

def test_get_content(testset_id, file_type):
    """Test getting file content"""
    token = get_auth_token()
    if not token:
        return
    
    headers = {'Authorization': f'Bearer {token}'}
    
    print(f"🔍 Testing GET /testsets/{testset_id}/content/{file_type}")
    response = requests.get(f"{BASE_URL}/testsets/{testset_id}/content/{file_type}", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Filename: {data['filename']}")
        print(f"Lines: {data['lines_count']}")
        print(f"Size: {data['size_bytes']} bytes")
        print(f"Content preview: {data['content'][:100]}...")
        return data['content']
    else:
        print(f"Error: {response.text}")
    
    return None

def test_update_content(testset_id, file_type, new_content):
    """Test updating file content"""
    token = get_auth_token()
    if not token:
        return
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payload = {'content': new_content}
    
    print(f"🔍 Testing PUT /testsets/{testset_id}/content/{file_type}")
    response = requests.put(
        f"{BASE_URL}/testsets/{testset_id}/content/{file_type}", 
        headers=headers,
        json=payload
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data['message']}")
        print(f"New lines count: {data['lines_count']}")
        print(f"New size: {data['size_bytes']} bytes")
    else:
        print(f"Error: {response.text}")

def main():
    print("🚀 Testing Testset Content API Endpoints")
    print("=" * 50)
    
    # Test 1: Get testsets
    testset_id = test_get_testsets()
    if not testset_id:
        print("❌ No testsets found or failed to get testsets")
        return
    
    print("\n" + "=" * 50)
    
    # Test 2: Get source content
    original_content = test_get_content(testset_id, 'source')
    
    print("\n" + "=" * 50)
    
    # Test 3: Get target content  
    test_get_content(testset_id, 'target')
    
    print("\n" + "=" * 50)
    
    # Test 4: Update content (if we got content)
    if original_content:
        # Add a test line
        new_content = original_content + "\nTest line added by API test"
        test_update_content(testset_id, 'source', new_content)
        
        print("\n" + "=" * 50)
        
        # Test 5: Verify update
        print("🔍 Verifying update...")
        updated_content = test_get_content(testset_id, 'source')
        
        if updated_content and "Test line added by API test" in updated_content:
            print("✅ Content update successful!")
            
            # Restore original content
            test_update_content(testset_id, 'source', original_content)
            print("✅ Original content restored")
        else:
            print("❌ Content update failed")
    
    print("\n" + "=" * 50)
    print("🎉 Test completed!")

if __name__ == "__main__":
    main() 