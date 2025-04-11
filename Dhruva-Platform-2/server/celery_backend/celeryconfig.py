import os
import logging

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Broker settings - Add CELERY_ prefix
CELERY_BROKER_URL = os.environ[
    "CELERY_BROKER_URL"
]

# Add default for task_always_eager
CELERY_TASK_ALWAYS_EAGER = False

print("🐍 celeryconfig.py loaded (simplified, added always_eager)")

imports = (
    "celery_backend.tasks.log_data",
    "celery_backend.tasks.heartbeat",
    "celery_backend.tasks.upload_feedback_dump",
    "celery_backend.tasks.send_usage_email",
    "celery_backend.tasks.push_metrics",
)