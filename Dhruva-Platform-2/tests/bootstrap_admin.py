#!/usr/bin/env python3
import json
import os
import sys
import datetime
from argon2 import PasswordHasher
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from pathlib import Path

def load_env():
    """Load environment variables from .env file"""
    env_path = Path(__file__).parent.parent / '.env'
    if not env_path.exists():
        print("Error: .env file not found in project root")
        sys.exit(1)
    load_dotenv(env_path)

def get_mongodb_url():
    """Get MongoDB connection URL from environment variables"""
    username = os.getenv("MONGO_APP_DB_USERNAME")
    password = os.getenv("MONGO_APP_DB_PASSWORD")
    # Use MONGO_HOST from env if available, otherwise default to localhost
    host = os.getenv("MONGO_HOST", "localhost")
    port = os.getenv("MONGO_PORT", "27017")
    db = "admin"
    
    if not username or not password:
        print("Error: MongoDB credentials not found in .env file")
        sys.exit(1)
    
    return f"mongodb://{username}:{password}@{host}:{port}/{db}?authSource=admin"

def create_fixtures_dir():
    """Create fixtures directory if it doesn't exist"""
    fixtures_dir = Path(__file__).parent / 'fixtures'
    fixtures_dir.mkdir(exist_ok=True)
    return fixtures_dir

def write_user_fixture(fixtures_dir: Path):
    """Create the users registry fixture"""
    user_fixture = {
        "name": "Admin User",
        "email": "admin@example.com",
        "password": "Admin@123",
        "role": "ADMIN"
    }
    
    user_file = fixtures_dir / 'users_registry.json'
    with open(user_file, 'w') as f:
        json.dump(user_fixture, f, indent=4)
    return user_fixture

def write_api_key_fixture(fixtures_dir: Path):
    """Create the API key registry fixture"""
    api_key_fixture = [{
        "name": "Admin Default Key",
        "api_key": "dhruva_admin_default_key",
        "type": "INFERENCE",
        "data_tracking": True
    }]
    
    api_key_file = fixtures_dir / 'api_key_registry.json'
    with open(api_key_file, 'w') as f:
        json.dump(api_key_fixture, f, indent=4)
    return api_key_fixture

def bootstrap_admin():
    """Bootstrap the first admin user and API key"""
    try:
        # Setup
        load_env()
        mongo_url = get_mongodb_url()
        fixtures_dir = create_fixtures_dir()
        
        # Create fixture files
        user_data = write_user_fixture(fixtures_dir)
        api_keys = write_api_key_fixture(fixtures_dir)
        
        # Connect to MongoDB
        print(f"Connecting to MongoDB...")
        client = MongoClient(mongo_url)
        db = client[os.getenv("APP_DB_NAME", "admin")]
        
        # Check if users exist
        if db.user.count_documents({}) > 0:
            print("Users already exist in the database. Skipping bootstrap.")
            return
        
        # Hash password and create user
        ph = PasswordHasher()
        user_data['password'] = ph.hash(user_data['password'])
        user_id = db.user.insert_one(user_data).inserted_id
        print(f"Created admin user with ID: {user_id}")
        
        # Create API keys
        for key in api_keys:
            key.update({
                "masked_key": key["api_key"][:4] + (len(key["api_key"]) - 8) * "*" + key["api_key"][-4:],
                "active": True,
                "user_id": user_id,
                "usage": 0,
                "hits": 0,
                "services": [],
                "created_timestamp": datetime.datetime.now()
            })
        
        result = db.api_key.insert_many(api_keys)
        print(f"Created {len(result.inserted_ids)} API key(s)")
        
        print("\nBootstrap completed successfully!")
        print(f"Admin email: {user_data['email']}")
        print("Admin password: Admin@123")
        print("Please change the admin password after first login!")
        print("\nAPI Keys created:")
        for key in api_keys:
            print(f"- {key['name']}: {key['api_key']}")
        
    except Exception as e:
        print(f"Error during bootstrap: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    bootstrap_admin() 