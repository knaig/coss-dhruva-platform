import os

import pymongo
from dotenv import load_dotenv
from pymongo.database import Database

load_dotenv(override=True)

db_clients = {
    "app": pymongo.MongoClient(os.environ.get("APP_DB_CONNECTION_STRING", "mongodb://dhruvaadmin:dhruva123@dhruva-platform-app-db:27017/admin?authSource=admin")),
}

def AppDatabase() -> Database:
    mongo_db = db_clients["app"]["admin"]
    return mongo_db


def LogDatastore():
    """Placeholder for cloud storage - disabled in sandbox mode"""
    print("[SANDBOX MODE] Cloud storage disabled - LogDatastore not available")
    return None
