import csv
import io
from datetime import datetime
import logging

from celery_backend.tasks.database import AppDatabase, LogDatastore
from module.services.model.feedback import Feedback

from ..celery_app import app
from . import constants

feedback_store = LogDatastore()

app_db = AppDatabase()
feedback_collection = app_db.get_collection("feedback")

csv_headers = [
    "ObjectId",
    "Feedback Timestamp",
    "Feedback Language",
    "Pipeline Tasks",
    "Input Data",
    "Pipeline Response",
    "Suggested Pipeline Response",
    "Pipeline Feedback",
    "Task Feedback",
]


@app.task(name="upload.feedback.dump")
def upload_feedback_dump() -> None:
    """Upload feedback dump to MongoDB"""
    try:
        feedbacks = feedback_collection.find()
        feedback_list = []
        for feedback in feedbacks:
            feedback_list.append({
                "ObjectId": str(feedback["_id"]),
                "Feedback Timestamp": feedback.get("timestamp", ""),
                "Feedback Language": feedback.get("language", ""),
                "Pipeline Tasks": feedback.get("pipeline_tasks", ""),
                "Input Data": feedback.get("input_data", ""),
                "Pipeline Response": feedback.get("pipeline_response", ""),
                "Suggested Pipeline Response": feedback.get("suggested_response", ""),
                "Pipeline Feedback": feedback.get("pipeline_feedback", ""),
                "Task Feedback": feedback.get("task_feedback", "")
            })
        
        feedback_store.feedback_dumps.insert_one({
            "timestamp": datetime.utcnow(),
            "data": feedback_list
        })
    except Exception as e:
        logging.error(f"Failed to upload feedback dump: {str(e)}")
