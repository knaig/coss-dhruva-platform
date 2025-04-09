import os

import pymongo
from dotenv import load_dotenv
from pymongo.database import Database

load_dotenv(override=True)

db_clients = {
    "app": pymongo.MongoClient(os.environ["APP_DB_CONNECTION_STRING"]),
    "log": pymongo.MongoClient(os.environ["LOG_DB_CONNECTION_STRING"]),
}

def AppDatabase() -> Database:
    mongo_db = db_clients["app"][os.environ["APP_DB_NAME"]]
    return mongo_db


def LogDatastore() -> Database:
    mongo_db = db_clients["log"][os.environ["LOG_DB_NAME"]]
    return mongo_db
