import base64
import io
import json
import logging
import os
import time
from datetime import datetime
from urllib.request import urlopen

from ulid import ULID

from ..celery_app import app
from . import constants
from .database import LogDatastore
from .metering import meter_usage

log_store = LogDatastore()


def log_to_storage(
    client_ip: str,
    error_msg: str,
    input_data: dict,
    output_data: dict,
    api_key_id: str,
    service_id: str,
):
    """Log input output data pairs to local storage (cloud storage disabled for sandbox)"""

    # Skip cloud storage for sandbox mode - just log locally
    print(f"[SANDBOX MODE] Skipping cloud storage for API key: {api_key_id}, service: {service_id}")

    # Create local log entry for debugging
    log_document = {
        "client_ip": client_ip,
        "api_key_id": api_key_id,
        "service_id": service_id,
        "task_type": output_data.get("taskType") if output_data else None,
        "timestamp": datetime.now().strftime("%d-%m-%Y,%H:%M:%S"),
        "status": "logged_locally" if not error_msg else "error_logged_locally"
    }

    if error_msg:
        log_document["error_msg"] = error_msg

    # Log to console instead of cloud storage
    print(f"[LOCAL LOG] {json.dumps(log_document, indent=2)}")
    return


@app.task(name="log.data")
def log_data(
    usage_type: str,
    service_id: str,
    client_ip: str,
    data_tracking_consent: bool,
    error_msg,
    api_key_id: str,
    req_body: str,
    resp_body: str,
    response_time: time.time,
) -> None:
    """Logs I/O and metering data to MongoDB"""

    resp_body = json.loads(resp_body) if resp_body else {}
    req_body = json.loads(req_body)

    data_usage = None

    if usage_type in ("translation", "transliteration", "tts"):
        data_usage = req_body["input"]

    elif usage_type == "asr":
        for i, ele in enumerate(req_body["audio"]):
            if ele.get("audioUri"):
                req_body["audio"][i]["audioContent"] = base64.b64encode(
                    urlopen(ele["audioUri"]).read()
                ).decode("utf-8")
        data_usage = req_body["audio"]

    else:
        raise ValueError(f"Invalid task type: {usage_type}")

    if data_tracking_consent:
        log_to_storage(
            client_ip, error_msg, req_body, resp_body, api_key_id, service_id
        )

    logging.debug(f"response_time: {response_time}")
    meter_usage(api_key_id, data_usage, usage_type, service_id)
