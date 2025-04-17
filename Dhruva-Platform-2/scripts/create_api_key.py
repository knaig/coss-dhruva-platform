import os
import secrets
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "dhruva")

def generate_api_key():
    # Generate a random API key
    api_key = secrets.token_urlsafe(32)
    # Create masked version (first 8 chars + ... + last 8 chars)
    masked_key = f"{api_key[:8]}...{api_key[-8:]}"
    return api_key, masked_key

def create_api_key_in_db(name: str, user_id: str, key_type: str = "INFERENCE", data_tracking: bool = True):
    # Connect to MongoDB
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    api_key_collection = db["api_key"]
    
    # Generate API key
    api_key, masked_key = generate_api_key()
    
    # Create API key document
    api_key_doc = {
        "name": name,
        "api_key": api_key,
        "masked_key": masked_key,
        "active": True,
        "user_id": ObjectId(user_id),
        "type": key_type,
        "created_timestamp": datetime.utcnow(),
        "usage": 0,
        "hits": 0,
        "data_tracking": data_tracking,
        "services": []
    }
    
    # Insert into database
    result = api_key_collection.insert_one(api_key_doc)
    
    print(f"API Key created successfully!")
    print(f"Name: {name}")
    print(f"API Key: {api_key}")
    print(f"Type: {key_type}")
    print(f"User ID: {user_id}")
    
    return api_key

if __name__ == "__main__":
    # Example usage
    name = input("Enter API key name: ")
    user_id = input("Enter user ID: ")
    key_type = input("Enter key type (INFERENCE/PLATFORM) [INFERENCE]: ") or "INFERENCE"
    data_tracking = input("Enable data tracking? (y/n) [y]: ").lower() != "n"
    
    api_key = create_api_key_in_db(name, user_id, key_type, data_tracking) 