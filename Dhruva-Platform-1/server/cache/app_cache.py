import os

from dotenv import load_dotenv
from redis_om import get_redis_connection

load_dotenv()


def get_cache_connection():
    return get_redis_connection(
        host=os.environ.get("REDIS_HOST"),
        port=int(os.environ.get("REDIS_PORT", 6379)),
        db=int(os.environ.get("REDIS_DB", 0)),
        password=os.environ.get("REDIS_PASSWORD"),
        ssl=os.environ.get("REDIS_SECURE") == "true",
    )
