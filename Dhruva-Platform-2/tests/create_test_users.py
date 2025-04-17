import os
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv
from argon2 import PasswordHasher

# Load environment variables
load_dotenv()

# MongoDB connection with authentication
MONGO_URI = os.getenv("APP_DB_CONNECTION_STRING", "mongodb://localhost:27017")
DB_NAME = os.getenv("APP_DB_NAME", "dhruva")
MONGO_USER = os.getenv("MONGO_APP_DB_USERNAME", "dhruvaadmin")
MONGO_PASS = os.getenv("MONGO_APP_DB_PASSWORD", "dhruva123")

def get_mongo_client():
    # Create MongoDB connection with authentication
    if MONGO_USER and MONGO_PASS:
        # If username and password are provided, use them
        client = MongoClient(
            MONGO_URI,
            username=MONGO_USER,
            password=MONGO_PASS,
            authSource="admin"
        )
    else:
        # Otherwise use connection without auth
        client = MongoClient(MONGO_URI)
    return client

def create_user(name: str, email: str, password: str, role: str = "USER"):
    # Connect to MongoDB
    client = get_mongo_client()
    db = client[DB_NAME]
    user_collection = db["user"]
    
    try:
        # Check if user already exists
        existing_user = user_collection.find_one({"email": email})
        if existing_user:
            print(f"User with email {email} already exists!")
            print(f"User ID: {existing_user['_id']}")
            return existing_user['_id']
        
        # Hash password
        ph = PasswordHasher()
        hashed_password = ph.hash(password)
        
        # Create user document
        user_doc = {
            "name": name,
            "email": email,
            "password": hashed_password,
            "role": role
        }
        
        # Insert into database
        result = user_collection.insert_one(user_doc)
        user_id = result.inserted_id
        
        print(f"User created successfully!")
        print(f"Name: {name}")
        print(f"Email: {email}")
        print(f"User ID: {user_id}")
        
        return user_id
    except Exception as e:
        print(f"Error creating user: {str(e)}")
        return None
    finally:
        client.close()

def list_users():
    # Connect to MongoDB
    client = get_mongo_client()
    db = client[DB_NAME]
    user_collection = db["user"]
    
    try:
        # Get all users
        users = user_collection.find({})
        
        print("\nAll Users:")
        print("-" * 50)
        for user in users:
            print(f"Name: {user['name']}")
            print(f"Email: {user['email']}")
            print(f"User ID: {user['_id']}")
            print(f"Role: {user['role']}")
            print("-" * 50)
    except Exception as e:
        print(f"Error listing users: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    # Test MongoDB connection first
    try:
        client = get_mongo_client()
        client.server_info()  # will throw an exception if connection fails
        print("Successfully connected to MongoDB!")
        client.close()
    except Exception as e:
        print(f"Failed to connect to MongoDB: {str(e)}")
        print("\nPlease check your MongoDB connection settings:")
        print(f"URI: {MONGO_URI}")
        print(f"Database: {DB_NAME}")
        print(f"Username: {MONGO_USER}")
        print(f"Password: {'*' * len(MONGO_PASS) if MONGO_PASS else 'Not set'}")
        exit(1)

    while True:
        print("\n1. Create new user")
        print("2. List all users")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ")
        
        if choice == "1":
            name = input("Enter user name: ")
            email = input("Enter email: ")
            password = input("Enter password: ")
            role = input("Enter role (USER/ADMIN) [USER]: ") or "USER"
            
            create_user(name, email, password, role)
            
        elif choice == "2":
            list_users()
            
        elif choice == "3":
            break
            
        else:
            print("Invalid choice. Please try again.") 