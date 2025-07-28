#!/usr/bin/env python3
"""
Database setup script for email verification collections.

This script creates the necessary MongoDB collections and indexes
for the email verification system.

Usage:
    python scripts/setup_email_verification_collections.py
"""

import os
import sys
from datetime import datetime

import pymongo
from dotenv import load_dotenv

# Add the server directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

load_dotenv()


def get_database():
    """Get MongoDB database connection."""
    connection_string = os.environ.get(
        "APP_DB_CONNECTION_STRING",
        "mongodb://dhruvaadmin:dhruva123@dhruva-platform-app-db:27017/admin?authSource=admin"
    )
    client = pymongo.MongoClient(connection_string)
    db_name = os.environ.get("APP_DB_NAME", "admin")
    return client[db_name]


def create_pending_registrations_collection(db):
    """Create pending_registrations collection with indexes."""
    collection_name = "pending_registrations"
    
    print(f"Setting up {collection_name} collection...")
    
    # Create collection if it doesn't exist
    if collection_name not in db.list_collection_names():
        db.create_collection(collection_name)
        print(f"✓ Created {collection_name} collection")
    else:
        print(f"✓ {collection_name} collection already exists")
    
    collection = db[collection_name]
    
    # Create indexes
    indexes_to_create = [
        # Unique indexes
        {"keys": [("email", 1)], "options": {"unique": True, "name": "email_unique"}},
        {"keys": [("verification_token", 1)], "options": {"unique": True, "name": "verification_token_unique"}},
        
        # TTL index for automatic cleanup (expires documents at the expires_at time)
        {"keys": [("expires_at", 1)], "options": {"expireAfterSeconds": 0, "name": "expires_at_ttl"}},
        
        # Query optimization indexes
        {"keys": [("created_at", 1)], "options": {"name": "created_at_index"}},
        {"keys": [("ip_address", 1), ("created_at", -1)], "options": {"name": "ip_address_created_at_index"}},
    ]
    
    for index_spec in indexes_to_create:
        try:
            collection.create_index(index_spec["keys"], **index_spec["options"])
            print(f"✓ Created index: {index_spec['options']['name']}")
        except pymongo.errors.OperationFailure as e:
            if "already exists" in str(e):
                print(f"✓ Index already exists: {index_spec['options']['name']}")
            else:
                print(f"✗ Failed to create index {index_spec['options']['name']}: {e}")
    
    print(f"✓ {collection_name} setup complete\n")


def create_email_verification_logs_collection(db):
    """Create email_verification_logs collection with indexes."""
    collection_name = "email_verification_logs"
    
    print(f"Setting up {collection_name} collection...")
    
    # Create collection if it doesn't exist
    if collection_name not in db.list_collection_names():
        db.create_collection(collection_name)
        print(f"✓ Created {collection_name} collection")
    else:
        print(f"✓ {collection_name} collection already exists")
    
    collection = db[collection_name]
    
    # Create indexes
    indexes_to_create = [
        # Query optimization indexes
        {"keys": [("email", 1), ("timestamp", -1)], "options": {"name": "email_timestamp_index"}},
        {"keys": [("ip_address", 1), ("timestamp", -1)], "options": {"name": "ip_address_timestamp_index"}},
        {"keys": [("action", 1), ("timestamp", -1)], "options": {"name": "action_timestamp_index"}},
        
        # TTL index for automatic cleanup (30 days)
        {"keys": [("timestamp", 1)], "options": {"expireAfterSeconds": 2592000, "name": "timestamp_ttl"}},  # 30 days
        
        # Additional query indexes
        {"keys": [("verification_token", 1)], "options": {"name": "verification_token_index"}},
        {"keys": [("success", 1), ("timestamp", -1)], "options": {"name": "success_timestamp_index"}},
    ]
    
    for index_spec in indexes_to_create:
        try:
            collection.create_index(index_spec["keys"], **index_spec["options"])
            print(f"✓ Created index: {index_spec['options']['name']}")
        except pymongo.errors.OperationFailure as e:
            if "already exists" in str(e):
                print(f"✓ Index already exists: {index_spec['options']['name']}")
            else:
                print(f"✗ Failed to create index {index_spec['options']['name']}: {e}")
    
    print(f"✓ {collection_name} setup complete\n")


def verify_collections(db):
    """Verify that collections and indexes were created successfully."""
    print("Verifying collections and indexes...")
    
    collections_to_verify = ["pending_registrations", "email_verification_logs"]
    
    for collection_name in collections_to_verify:
        if collection_name in db.list_collection_names():
            collection = db[collection_name]
            indexes = collection.list_indexes()
            index_names = [index["name"] for index in indexes]
            print(f"✓ {collection_name}: {len(index_names)} indexes - {', '.join(index_names)}")
        else:
            print(f"✗ {collection_name}: Collection not found")
    
    print()


def main():
    """Main function to set up email verification collections."""
    print("Email Verification Database Setup")
    print("=" * 40)
    print(f"Timestamp: {datetime.utcnow().isoformat()}Z")
    print()
    
    try:
        # Get database connection
        db = get_database()
        print(f"✓ Connected to database: {db.name}")
        print()
        
        # Create collections and indexes
        create_pending_registrations_collection(db)
        create_email_verification_logs_collection(db)
        
        # Verify setup
        verify_collections(db)
        
        print("✓ Email verification database setup completed successfully!")
        
    except Exception as e:
        print(f"✗ Error during setup: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
