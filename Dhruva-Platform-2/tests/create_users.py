import requests
import json
from typing import Dict, Optional

BASE_URL = "http://localhost:8000"

class DhruvaAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
    
    def signin(self, email: str, password: str) -> bool:
        try:
            response = requests.post(
                f"{self.base_url}/auth/signin",
                json={"email": email, "password": password}
            )
            if response.status_code == 200:
                data = response.json()
                self.refresh_token = data.get('token')
                return True
            return False
        except Exception as e:
            print(f"Error during signin: {str(e)}")
            return False
    
    def refresh_access_token(self) -> bool:
        if not self.refresh_token:
            return False
        try:
            response = requests.post(
                f"{self.base_url}/auth/refresh",
                json={"token": self.refresh_token}
            )
            if response.status_code == 200:
                self.access_token = response.json().get('token')
                return True
            return False
        except Exception as e:
            print(f"Error refreshing token: {str(e)}")
            return False
    
    def create_user(self, user_data: Dict) -> Optional[Dict]:
        try:
            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'
            
            response = requests.post(
                f"{self.base_url}/auth/user",
                json=user_data,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                print(f"User created successfully: {user_data['email']}")
                return response.json()
            else:
                print(f"Error creating user: {response.status_code}")
                print(response.text)
                return None
                
        except Exception as e:
            print(f"Error creating user {user_data['email']}: {str(e)}")
            return None
    
    def create_api_key(self, name: str) -> Optional[str]:
        if not self.access_token:
            print("No access token available. Please sign in first.")
            return None
        
        try:
            response = requests.post(
                f"{self.base_url}/auth/api-key",
                json={"name": name},
                headers={'Authorization': f'Bearer {self.access_token}'}
            )
            
            if response.status_code == 201:
                print(f"API key created successfully for: {name}")
                return response.json().get('api_key')
            else:
                print(f"Error creating API key: {response.status_code}")
                print(response.text)
                return None
                
        except Exception as e:
            print(f"Error creating API key: {str(e)}")
            return None

def setup_initial_admin():
    api = DhruvaAPI(BASE_URL)
    
    # Create admin user
    admin_user = {
        "name": "Admin User",
        "email": "admin@example.com",
        "password": "Admin@123",  # Change this in production
        "role": "ADMIN"
    }
    
    # Try to create admin
    admin_result = api.create_user(admin_user)
    if not admin_result:
        print("Failed to create admin user")
        return
    
    # Sign in as admin
    if not api.signin(admin_user["email"], admin_user["password"]):
        print("Failed to sign in as admin")
        return
    
    # Get fresh access token
    if not api.refresh_access_token():
        print("Failed to get access token")
        return
    
    # Create API key for admin
    api_key = api.create_api_key("Admin Default Key")
    if api_key:
        print(f"Created API key: {api_key}")
    
    print("\nInitial setup completed successfully!")
    print(f"Admin email: {admin_user['email']}")
    print(f"Admin password: {admin_user['password']}")
    print("Please change the admin password after first login!")

if __name__ == "__main__":
    setup_initial_admin() 