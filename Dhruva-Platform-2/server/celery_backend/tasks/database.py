import os

import pymongo
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv
from pymongo.database import Database

load_dotenv(override=True)

db_clients = {
    "app": pymongo.MongoClient("mongodb://dhruva-platform-app-db:27017"),
}

def AppDatabase() -> Database:
    mongo_db = db_clients["app"]["dhruva"]
    return mongo_db


def LogDatastore() -> BlobServiceClient:
    token_credential = DefaultAzureCredential()
    blob_service_client = BlobServiceClient(
        account_url=f'https://{os.environ.get("BLOB_STORE")}.blob.core.windows.net',
        credential=token_credential,
    )
    return blob_service_client
