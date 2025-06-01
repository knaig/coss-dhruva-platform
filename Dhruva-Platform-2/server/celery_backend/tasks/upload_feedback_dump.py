import csv
import io
import os
from datetime import datetime

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
    """Generates feedback dumps locally (cloud storage disabled for sandbox)"""
    print("[SANDBOX MODE] Feedback dump task running - cloud storage disabled")

    file = io.StringIO()
    csv_writer = csv.writer(file)
    csv_writer.writerow(csv_headers)

    d = datetime.now()

    start_month, start_year = (
        (d.month - 1, d.year) if d.month - 1 != 0 else (12, d.year - 1)
    )
    start_date = d.replace(
        year=start_year,
        month=start_month,
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    ).timestamp()

    end_date = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0).timestamp()

    query = {
        "feedbackTimeStamp": {"$gte": int(start_date), "$lt": int(end_date)},
    }

    record_count = 0
    for doc in feedback_collection.find(query):
        feedback = Feedback(**doc)
        csv_writer.writerow(feedback.to_export_row())
        record_count += 1

    # Save to local file instead of cloud storage
    local_file_name = f"feedback_dump_{start_year}{start_month:02d}_{d.strftime('%Y%m%d_%H%M%S')}.csv"
    local_file_path = os.path.join(constants.LOCAL_DATA_DIR, local_file_name)

    try:
        with open(local_file_path, 'w', newline='', encoding='utf-8') as f:
            f.write(file.getvalue())
        print(f"[LOCAL STORAGE] Feedback dump saved locally: {local_file_path} ({record_count} records)")
    except Exception as e:
        print(f"[ERROR] Failed to save feedback dump locally: {e}")

    return
