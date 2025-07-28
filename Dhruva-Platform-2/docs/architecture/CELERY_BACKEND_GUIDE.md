# Dhruva Platform Celery Backend - Comprehensive Technical Guide

## 📋 Overview

The Dhruva Platform's Celery backend is a sophisticated asynchronous task processing system that handles critical operations including request logging, usage metering, health monitoring, metrics collection, and scheduled maintenance tasks. This guide provides complete technical documentation for understanding, maintaining, and extending the Celery backend system.

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI App   │───▶│   RabbitMQ      │───▶│ Celery Workers  │
│                 │    │   Message       │    │                 │
│ • Task Triggers │    │   Broker        │    │ • Task Execution│
│ • API Endpoints │    │ • Exchanges     │    │ • Error Handling│
│ • Middleware    │    │ • Queues        │    │ • Result Storage│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Celery Beat     │    │ External Systems│
                       │ Scheduler       │    │                 │
                       │ • Cron Tasks    │    │ • MongoDB       │
                       │ • Periodic Jobs │    │ • TimescaleDB   │
                       │ • Health Checks │    │ • Prometheus    │
                       └─────────────────┘    └─────────────────┘
```

### Directory Structure

```
celery_backend/
├── __init__.py                    # Package initialization
├── celery_app.py                  # Main Celery application configuration
├── celeryconfig.py                # Celery configuration settings
├── flowerconfig.py                # Flower monitoring configuration
├── rabbitmq.conf                  # RabbitMQ server configuration
├── definitions.json               # RabbitMQ topology definitions
└── tasks/                         # Task implementations
    ├── __init__.py                # Task package initialization
    ├── constants.py               # Shared constants and multipliers
    ├── database.py                # MongoDB connection utilities
    ├── metering_database.py       # TimescaleDB connection and models
    ├── log_data.py                # Request/response logging task
    ├── metering.py                # Usage calculation utilities
    ├── heartbeat.py               # Service health monitoring task
    ├── push_metrics.py            # Prometheus metrics pushing task
    ├── send_usage_email.py        # Weekly usage email reports
    ├── upload_feedback_dump.py    # Monthly feedback data export
    └── email_verification_cleanup.py # Email verification cleanup
```

## ⚙️ Core Configuration

### Celery Application Setup (`celery_app.py`)

The main Celery application is configured with sophisticated routing and scheduling:

```python
from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue

# Initialize Celery application
app = Celery("dhruva_celery")

# Prevent eager execution in production
app.conf.setdefault('task_always_eager', False)

# Load configuration from celeryconfig module
app.config_from_object("celery_backend.celeryconfig")
app.autodiscover_tasks()

# Define scheduled tasks with Celery Beat
app.conf.beat_schedule = {
    "heartbeat": {
        "task": "heartbeat",
        "schedule": 300.0,  # Every 5 minutes
        "options": {"queue": "heartbeat"},
    },
    "upload-feedback-dump": {
        "task": "upload.feedback.dump",
        "schedule": crontab(day_of_month="1", hour="6", minute="30"),  # Monthly at 6:30 UTC
        "options": {"queue": "upload-feedback-dump"},
    },
    "send-usage-email": {
        "task": "send.usage.email", 
        "schedule": crontab(day_of_week="1", hour="3", minute="0"),  # Weekly Monday 3:00 UTC
        "options": {"queue": "send-usage-email"},
    },
}

# Define task queues with dedicated exchanges
app.conf.task_queues = (
    Queue("data-log", exchange=Exchange("logs", type="direct")),
    Queue("metrics-log", exchange=Exchange("metrics", type="direct")),
    Queue("heartbeat", exchange=Exchange("heartbeat", type="direct")),
    Queue("upload-feedback-dump", exchange=Exchange("upload-feedback-dump", type="direct")),
    Queue("send-usage-email", exchange=Exchange("send-usage-email", type="direct")),
)

# Route tasks to specific queues
app.conf.task_routes = {
    'push.metrics': {'queue': 'metrics-log'},
    'log.data': {'queue': 'data-log'},
    'heartbeat': {'queue': 'heartbeat'},
    'upload.feedback.dump': {'queue': 'upload-feedback-dump'},
    'send.usage.email': {'queue': 'send-usage-email'},
}
```

### Celery Configuration (`celeryconfig.py`)

```python
import os
from dotenv import load_dotenv

load_dotenv()

# RabbitMQ broker connection
broker_url = os.environ["CELERY_BROKER_URL"]
# Example: "amqp://admin:admin123@dhruva-platform-rabbitmq:5672/dhruva_host"

# Task module imports for autodiscovery
imports = (
    "celery_backend.tasks.log_data",
    "celery_backend.tasks.heartbeat", 
    "celery_backend.tasks.upload_feedback_dump",
    "celery_backend.tasks.send_usage_email",
    "celery_backend.tasks.push_metrics",
)
```

### RabbitMQ Configuration

#### RabbitMQ Server Configuration (`rabbitmq.conf`)

```ini
# Allow guest user from non-localhost connections
loopback_users.guest = false

# Load queue/exchange definitions from JSON file
management.load_definitions = /etc/rabbitmq/definitions.json
```

#### RabbitMQ Topology (`definitions.json`)

```json
{
  "rabbit_version": "3",
  "users": [
    {
      "name": "admin",
      "password": "admin123", 
      "tags": "administrator"
    }
  ],
  "vhosts": [
    {
      "name": "dhruva_host"
    }
  ],
  "permissions": [
    {
      "user": "admin",
      "vhost": "dhruva_host",
      "configure": ".*",
      "write": ".*", 
      "read": ".*"
    }
  ]
}
```

## 🔄 Task Implementations Deep Dive

### 1. Data Logging Task (`log_data.py`)

**Purpose**: Asynchronously log API requests/responses and calculate usage metrics

**Task Signature**:
```python
@app.task(name="log.data")
def log_data(
    usage_type: str,        # Task type: "asr", "translation", "tts", etc.
    service_id: str,        # Service identifier
    client_ip: str,         # Client IP address
    data_tracking_consent: bool,  # User consent for data tracking
    error_msg: str,         # Error message if any
    api_key_id: str,        # API key identifier
    req_body: str,          # JSON-encoded request body
    resp_body: str,         # JSON-encoded response body
    response_time: float    # Request processing time
) -> None
```

**Workflow**:
```python
def log_data(usage_type, service_id, client_ip, data_tracking_consent, 
             error_msg, api_key_id, req_body, resp_body, response_time):
    """
    Complete data logging workflow:
    1. Parse JSON request/response bodies
    2. Extract usage data based on task type
    3. Handle audio URI to base64 conversion for ASR
    4. Log to storage if consent given
    5. Calculate and meter usage
    """
    
    # Parse JSON data
    resp_body = json.loads(resp_body) if resp_body else {}
    req_body = json.loads(req_body)
    
    # Extract usage data based on task type
    if usage_type in ("translation", "transliteration", "tts"):
        data_usage = req_body["input"]  # Text input
    elif usage_type == "asr":
        # Handle audio data - convert URI to base64 if needed
        for i, ele in enumerate(req_body["audio"]):
            if ele.get("audioUri"):
                req_body["audio"][i]["audioContent"] = base64.b64encode(
                    urlopen(ele["audioUri"]).read()
                ).decode("utf-8")
        data_usage = req_body["audio"]  # Audio input
    else:
        raise ValueError(f"Invalid task type: {usage_type}")
    
    # Log to storage if user consented
    if data_tracking_consent:
        log_to_storage(client_ip, error_msg, req_body, resp_body, api_key_id, service_id)
    
    # Calculate and record usage metrics
    meter_usage(api_key_id, data_usage, usage_type, service_id)
```

**Integration with FastAPI**:
```python
# In inference_router.py - InferenceLoggingRoute middleware
log_data.apply_async(
    (
        usage_type,                    # Extracted from URL path
        service_id,                    # From query parameters
        request.headers.get("X-Forwarded-For", request.client.host),
        enable_tracking,               # From API key settings
        error_msg,                     # Error message if any
        api_key_id,                    # From authentication
        request.state._state.get("input", req_body),
        res_body.decode("utf-8") if res_body else None,
        time.time() - start_time,      # Response time calculation
    ),
    queue="data-log",  # Route to data-log queue
)
```

### 2. Usage Metering System (`metering.py`)

**Purpose**: Calculate inference units and update usage counters

**Usage Calculation Functions**:

```python
def calculate_asr_usage(data) -> int:
    """Calculate ASR usage based on audio duration"""
    total_usage = 0
    for d in data:
        # Decode base64 audio
        audio = base64.b64decode(d["audioContent"])
        
        # Calculate audio length in seconds
        length = get_audio_length(audio)
        
        # Apply multipliers for cost calculation
        total_usage += math.ceil(
            length * ASR_GPU_MULTIPLIER * ASR_CPU_MULTIPLIER * ASR_RAM_MULTIPLIER
        )
    return total_usage

def calculate_translation_usage(data) -> int:
    """Calculate translation usage based on character count"""
    total_usage = 0
    for d in data:
        # Use character count as proxy for tokenization
        total_usage += (
            len(d["source"]) 
            * NMT_TOKEN_CALCULATION_MULTIPLIER
            * NMT_GPU_MULTIPLIER 
            * NMT_CPU_MULTIPLIER
            * NMT_RAM_MULTIPLIER
        )
    return total_usage

def calculate_tts_usage(data: List) -> int:
    """Calculate TTS usage based on input text length"""
    total_usage = 0
    for d in data:
        total_usage += (
            len(d["source"])
            * TTS_TOKEN_CALCULATION_MULTIPLIER
            * TTS_GPU_MULTIPLIER
            * TTS_CPU_MULTIPLIER 
            * TTS_RAM_MULTIPLIER
        )
    return total_usage
```

**Database Writing Logic**:
```python
def write_to_db(api_key_id: str, inference_units: int, service_id: str, usage_type: str):
    """Write usage data to both MongoDB and TimescaleDB"""
    
    # Get API key and user information from MongoDB
    api_key_collection = db["api_key"]
    user_collection = db["user"]
    
    # Handle both ObjectId string and actual API key string
    try:
        if isinstance(api_key_id, str) and len(api_key_id) == 24:
            api_key = api_key_collection.find_one({"_id": ObjectId(api_key_id)})
        else:
            api_key = api_key_collection.find_one({"api_key": api_key_id})
    except Exception as e:
        print(f"Error looking up API key: {e}")
        return
    
    if not api_key:
        print(f"No document found for the API key: {api_key_id}")
        return
    
    user = user_collection.find_one({"_id": api_key["user_id"]})
    if not user:
        print("Invalid user id for API key")
        return
    
    # Write to TimescaleDB for time-series analytics
    with Session(engine) as session:
        api_key_record = ApiKey(
            api_key_id=api_key_id,
            api_key_name=api_key["name"],
            user_id=str(user["_id"]),
            user_email=user["email"],
            inference_service_id=service_id,
            task_type=usage_type,
            usage=inference_units,
        )
        session.add(api_key_record)
        session.commit()
    
    # Update MongoDB API key usage counters
    api_key_collection.update_one(
        {"_id": ObjectId(api_key_id)},
        {
            "$inc": {
                "usage": inference_units,  # Increment total usage
                "hits": 1                  # Increment hit counter
            }
        }
    )
```

### 3. Health Monitoring Task (`heartbeat.py`)

**Purpose**: Periodically check service health and update status

**Task Implementation**:
```python
@app.task(name="heartbeat", queue="heartbeat")
def inference_heartbeat():
    """
    Comprehensive service health monitoring:
    1. Fetch list of active services and models
    2. Send test requests to each service
    3. Update health status based on response
    4. Report success/failure statistics
    """
    
    # Fetch services and models from API
    services = requests.get(f"{BASE_URL}/services/details/list_services", headers=HEADERS)
    models = requests.get(f"{BASE_URL}/services/details/list_models", headers=HEADERS)
    
    if services.status_code != 200 or models.status_code != 200:
        print("Failed to fetch service/model lists")
        return
    
    services = services.json()
    models = models.json()
    
    # Transform models for easier access
    model_dict = {model["modelId"]: model for model in models}
    
    # Test each service
    success, failure = send_heartbeat(services, model_dict)
    print(f"Heartbeat completed - Success: {success}, Failure: {failure}")

def send_heartbeat(services: List[Dict[str, Any]], models: Dict[str, Any]):
    """Send test requests to all services"""
    success = 0
    failure = 0
    
    for service in services:
        try:
            # Get test request body from model schema
            body = models[service["modelId"]]["inferenceEndPoint"]["schema"]["request"]
            body["config"]["serviceId"] = service["serviceId"]
            
            # Send test inference request
            response = requests.post(
                f"{BASE_URL}/services/inference/{service['task']['type']}?serviceId={service['serviceId']}",
                headers=HEADERS,
                json=body,
            )
            
            if response.status_code == 200:
                success += 1
                set_health_status(service["serviceId"], "healthy")
            else:
                raise Exception(f"Service {service['serviceId']} failed with status {response.status_code}")
                
        except Exception as e:
            print(f"Health check failed for {service['serviceId']}: {e}")
            failure += 1
            set_health_status(service["serviceId"], "unhealthy")
    
    return (success, failure)

def set_health_status(service_id: str, status: str):
    """Update service health status via API"""
    try:
        requests.patch(
            f"{BASE_URL}/services/admin/health",
            headers=HEADERS,
            json={"serviceId": service_id, "status": status},
        )
    except Exception as e:
        print(f"Failed to update {service_id} health status: {e}")
```

### 4. Metrics Push Task (`push_metrics.py`)

**Purpose**: Push Prometheus metrics to gateway

**Task Implementation**:
```python
@app.task(name="push.metrics")
def push_metrics(registry_enc: str) -> None:
    """
    Push metrics to Prometheus gateway:
    1. Decode serialized registry
    2. Authenticate with gateway
    3. Push metrics with job label
    """
    
    # Decode the serialized Prometheus registry
    registry: CollectorRegistry = jsonpickle.decode(registry_enc, keys=True)
    
    # Push to Prometheus gateway with authentication
    push_to_gateway(
        os.environ["PROMETHEUS_URL"],
        job="metrics_push",
        registry=registry,
        handler=prom_agg_gateway_auth_handler,
    )

def prom_agg_gateway_auth_handler(url, method, timeout, headers, data):
    """Handle authentication for Prometheus gateway"""
    try:
        username = os.environ["PROM_AGG_GATEWAY_USERNAME"]
        password = os.environ["PROM_AGG_GATEWAY_PASSWORD"]
        return basic_auth_handler(url, method, timeout, headers, data, username, password)
    except Exception:
        return None
```

**Integration with Middleware**:
```python
# In prometheus_global_metrics_middleware.py
push_metrics.apply_async(
    (jsonpickle.encode(self.registry, keys=True),),
    queue="metrics-log"
)
```

### 5. Usage Email Reports (`send_usage_email.py`)

**Purpose**: Generate and send weekly usage reports via email

**Task Implementation**:
```python
@app.task(name="send.usage.email")
def send_usage_email() -> None:
    """
    Weekly usage email workflow:
    1. Query TimescaleDB for weekly usage data
    2. Generate CSV report
    3. Create email with attachment
    4. Send via SMTP
    """

    email_list = os.environ["USAGE_EMAIL_RECIPIENTS"]
    sender = os.environ["USAGE_EMAIL_SENDER"]
    smtp_username = os.environ["SMTP_USERNAME"]
    smtp_password = os.environ["SMTP_PASSWORD"]

    print("Generating and sending usage report")

    # Create email with CSV attachment
    email = create_email(sender, email_list)

    # Send via SMTP with SSL
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(os.environ["SMTP_SERVER"], 465, context=context) as server:
        server.login(smtp_username, smtp_password)
        server.sendmail(sender, email_list.split(","), email)

    print("Usage report sent successfully")

def get_csv():
    """Generate CSV report from TimescaleDB data"""
    headers = (
        "API KEY NAME", "USER EMAIL", "INFERENCE SERVICE ID",
        "TASK_TYPE", "REQUEST COUNT", "USAGE", "UNIT FOR USAGE"
    )

    file = io.StringIO()
    csv_writer = csv.writer(file)
    csv_writer.writerow(headers)

    # Query last 7 days of usage data
    stmt = (
        select(
            ApiKey.api_key_name,
            ApiKey.user_email,
            ApiKey.inference_service_id,
            ApiKey.task_type,
            sqlalchemy.func.count(ApiKey.usage),
            sqlalchemy.func.sum(ApiKey.usage),
        )
        .group_by(
            ApiKey.api_key_id, ApiKey.api_key_name, ApiKey.user_id,
            ApiKey.user_email, ApiKey.inference_service_id, ApiKey.task_type,
        )
        .where(
            sqlalchemy.func.now() - sqlalchemy.func.cast(concat(7, " DAYS"), INTERVAL)
            <= ApiKey.timestamp
        )
    )

    with Session(engine) as session:
        rows = session.execute(stmt).all()
        for row in rows:
            val, unit = get_usage_val_and_unit(row[3], row[5])
            csv_writer.writerow((*row[:5], val, unit))

    file.seek(0)
    return file

def get_usage_val_and_unit(task_type: str, val: float):
    """Convert raw usage to human-readable units"""
    if task_type in ("translation", "transliteration", "tts"):
        return (val / 1000, "Input Kilo-Characters")
    elif task_type == "asr":
        return (val / 3600, "Input Audio Time (In Hours)")
    else:
        return (val, "")
```

### 6. Feedback Data Export (`upload_feedback_dump.py`)

**Purpose**: Monthly export of feedback data for analysis

**Task Implementation**:
```python
@app.task(name="upload.feedback.dump")
def upload_feedback_dump() -> None:
    """
    Monthly feedback export workflow:
    1. Calculate previous month date range
    2. Query feedback collection
    3. Generate CSV export
    4. Save to local storage (cloud disabled in sandbox)
    """

    print("[SANDBOX MODE] Generating feedback dump locally")

    file = io.StringIO()
    csv_writer = csv.writer(file)
    csv_writer.writerow(csv_headers)

    # Calculate previous month date range
    d = datetime.now()
    start_month, start_year = (
        (d.month - 1, d.year) if d.month - 1 != 0 else (12, d.year - 1)
    )
    start_date = d.replace(
        year=start_year, month=start_month, day=1,
        hour=0, minute=0, second=0, microsecond=0
    ).timestamp()
    end_date = d.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    ).timestamp()

    # Query feedback data
    query = {
        "feedbackTimeStamp": {"$gte": int(start_date), "$lt": int(end_date)},
    }

    record_count = 0
    for doc in feedback_collection.find(query):
        feedback = Feedback(**doc)
        csv_writer.writerow(feedback.to_export_row())
        record_count += 1

    # Save to local file
    local_file_name = f"feedback_dump_{start_year}{start_month:02d}_{d.strftime('%Y%m%d_%H%M%S')}.csv"
    local_file_path = os.path.join(constants.LOCAL_DATA_DIR, local_file_name)

    with open(local_file_path, 'w', newline='', encoding='utf-8') as f:
        f.write(file.getvalue())

    print(f"Feedback dump saved: {local_file_path} ({record_count} records)")
```

## 🗄️ Database Connections

### MongoDB Connection (`database.py`)

```python
import os
import pymongo
from dotenv import load_dotenv
from pymongo.database import Database

load_dotenv(override=True)

# Database client connections
db_clients = {
    "app": pymongo.MongoClient(
        os.environ.get(
            "APP_DB_CONNECTION_STRING",
            "mongodb://dhruvaadmin:dhruva123@dhruva-platform-app-db:27017/admin?authSource=admin"
        )
    ),
}

def AppDatabase() -> Database:
    """Get MongoDB database instance"""
    mongo_db = db_clients["app"]["admin"]
    return mongo_db

def LogDatastore():
    """Placeholder for cloud storage - disabled in sandbox mode"""
    print("[SANDBOX MODE] Cloud storage disabled")
    return None
```

### TimescaleDB Connection (`metering_database.py`)

```python
import datetime
import os
from dotenv import load_dotenv
from sqlalchemy import Column, DateTime, Float, Text, create_engine
from sqlalchemy.orm import declarative_base

load_dotenv()

# TimescaleDB connection
connection_string = "postgresql://postgres:postgres@timescaledb:5432/dhruva"
engine = create_engine(connection_string)

Base = declarative_base()

class ApiKey(Base):
    """TimescaleDB hypertable for API key usage analytics"""
    __table_args__ = {"timescaledb_hypertable": {"time_column_name": "timestamp"}}
    __tablename__ = "apikey"

    api_key_id = Column("api_key_id", Text)
    api_key_name = Column("api_key_name", Text)
    user_id = Column("user_id", Text)
    user_email = Column("user_email", Text)
    inference_service_id = Column("inference_service_id", Text)
    task_type = Column("task_type", Text)
    usage = Column("usage", Float)
    timestamp = Column(
        "timestamp",
        DateTime(timezone=True),
        default=datetime.datetime.now,
        primary_key=True,
    )
```

## 🔄 Task Workflow Diagrams

### Complete Task Lifecycle

```mermaid
graph TB
    subgraph "FastAPI Application"
        API[API Request]
        MIDDLEWARE[Middleware Processing]
        RESPONSE[API Response]
    end

    subgraph "RabbitMQ Message Broker"
        EXCHANGE[Exchange Routing]
        QUEUE[Task Queue]
    end

    subgraph "Celery Workers"
        WORKER[Worker Process]
        TASK[Task Execution]
        ERROR[Error Handling]
    end

    subgraph "Data Storage"
        MONGO[(MongoDB)]
        TIMESCALE[(TimescaleDB)]
        PROMETHEUS[(Prometheus)]
    end

    subgraph "Scheduled Tasks"
        BEAT[Celery Beat]
        HEARTBEAT[Health Checks]
        REPORTS[Usage Reports]
        FEEDBACK[Feedback Export]
    end

    API --> MIDDLEWARE
    MIDDLEWARE --> RESPONSE
    MIDDLEWARE --> EXCHANGE
    EXCHANGE --> QUEUE
    QUEUE --> WORKER
    WORKER --> TASK
    TASK --> MONGO
    TASK --> TIMESCALE
    TASK --> PROMETHEUS
    TASK --> ERROR

    BEAT --> HEARTBEAT
    BEAT --> REPORTS
    BEAT --> FEEDBACK
    HEARTBEAT --> QUEUE
    REPORTS --> QUEUE
    FEEDBACK --> QUEUE
```

### Data Logging Task Flow

```mermaid
sequenceDiagram
    participant FastAPI
    participant RabbitMQ
    participant Worker
    participant MongoDB
    participant TimescaleDB

    FastAPI->>RabbitMQ: log_data.apply_async()
    RabbitMQ->>Worker: Route to data-log queue

    Worker->>Worker: Parse request/response JSON
    Worker->>Worker: Extract usage data by type
    Worker->>Worker: Calculate inference units

    alt Data tracking consent given
        Worker->>MongoDB: Log request/response data
    end

    Worker->>MongoDB: Update API key usage counters
    Worker->>TimescaleDB: Write time-series usage data

    Worker->>RabbitMQ: Task completion acknowledgment
```

## 🛠️ Development Guide

### Adding New Tasks

**Step 1: Create Task Module**
```python
# celery_backend/tasks/my_new_task.py
from ..celery_app import app

@app.task(name="my.new.task")
def my_new_task(param1: str, param2: int) -> dict:
    """
    New task implementation

    Args:
        param1: Description of parameter 1
        param2: Description of parameter 2

    Returns:
        dict: Task result
    """
    try:
        # Task logic here
        result = {"status": "success", "data": f"Processed {param1} with {param2}"}
        return result
    except Exception as e:
        # Error handling
        print(f"Task failed: {e}")
        raise
```

**Step 2: Update Configuration**
```python
# celery_backend/celeryconfig.py
imports = (
    "celery_backend.tasks.log_data",
    "celery_backend.tasks.heartbeat",
    "celery_backend.tasks.my_new_task",  # Add new task
    # ... other tasks
)
```

**Step 3: Add Queue Configuration (if needed)**
```python
# celery_backend/celery_app.py
app.conf.task_queues = (
    Queue("data-log", exchange=Exchange("logs", type="direct")),
    Queue("my-new-queue", exchange=Exchange("my-new-exchange", type="direct")),  # New queue
    # ... other queues
)

app.conf.task_routes = {
    'my.new.task': {'queue': 'my-new-queue'},  # Route new task
    # ... other routes
}
```

**Step 4: Call Task from Application**
```python
# In your FastAPI route or service
from celery_backend.tasks.my_new_task import my_new_task

# Asynchronous execution
result = my_new_task.apply_async(
    ("param_value", 42),
    queue="my-new-queue"
)

# Get task ID for tracking
task_id = result.id
```

### Testing Tasks

**Unit Testing**:
```python
# tests/test_celery_tasks.py
import pytest
from celery_backend.tasks.log_data import log_data
from celery_backend.celery_app import app

# Configure Celery for testing
app.conf.update(task_always_eager=True)

def test_log_data_task():
    """Test log_data task execution"""
    result = log_data(
        usage_type="translation",
        service_id="test-service",
        client_ip="127.0.0.1",
        data_tracking_consent=True,
        error_msg="",
        api_key_id="test-api-key",
        req_body='{"input": [{"source": "test"}]}',
        resp_body='{"output": [{"target": "test"}]}',
        response_time=0.5
    )

    # Assert task completed successfully
    assert result is None  # log_data returns None
```

**Integration Testing**:
```python
# tests/test_celery_integration.py
import time
from celery_backend.tasks.heartbeat import inference_heartbeat

def test_heartbeat_integration():
    """Test heartbeat task with real services"""
    # Execute task asynchronously
    result = inference_heartbeat.apply_async()

    # Wait for completion
    result.get(timeout=30)

    # Verify task completed
    assert result.successful()
```

### Debugging Tasks

**Enable Debug Logging**:
```python
# In celeryconfig.py
import logging

# Enable debug logging
worker_log_level = 'DEBUG'
worker_hijack_root_logger = False

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Monitor Task Execution**:
```bash
# Start Celery worker with debug output
celery -A celery_backend.celery_app worker --loglevel=debug

# Monitor task events
celery -A celery_backend.celery_app events

# Check task status
celery -A celery_backend.celery_app inspect active
celery -A celery_backend.celery_app inspect scheduled
celery -A celery_backend.celery_app inspect reserved
```

**Using Flower for Monitoring**:
```bash
# Start Flower web interface
celery -A celery_backend.celery_app flower --conf=celery_backend.flowerconfig

# Access web interface at http://localhost:5555
```

## 🚨 Error Handling & Recovery

### Task Retry Mechanisms

**Automatic Retry Configuration**:
```python
@app.task(name="log.data", bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def log_data_with_retry(self, usage_type, service_id, client_ip, data_tracking_consent,
                       error_msg, api_key_id, req_body, resp_body, response_time):
    """Log data task with automatic retry on failure"""
    try:
        # Task implementation
        pass
    except Exception as exc:
        # Log the error
        print(f"Task failed: {exc}")

        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
```

**Manual Retry Logic**:
```python
@app.task(name="heartbeat", bind=True)
def heartbeat_with_manual_retry(self):
    """Heartbeat task with manual retry logic"""
    try:
        # Attempt heartbeat
        result = send_heartbeat(services, models)
        return result
    except requests.ConnectionError as exc:
        # Retry on connection errors
        if self.request.retries < 3:
            print(f"Connection error, retrying in 30 seconds: {exc}")
            raise self.retry(exc=exc, countdown=30)
        else:
            print(f"Max retries exceeded for heartbeat: {exc}")
            raise
    except Exception as exc:
        # Don't retry on other errors
        print(f"Heartbeat failed with non-retryable error: {exc}")
        raise
```

### Dead Letter Queue Handling

**Configure Dead Letter Exchange**:
```python
# In celery_app.py
from kombu import Exchange, Queue

# Define dead letter exchange
dead_letter_exchange = Exchange("dlx", type="direct")

# Configure queues with dead letter routing
app.conf.task_queues = (
    Queue(
        "data-log",
        exchange=Exchange("logs", type="direct"),
        routing_key="data-log",
        queue_arguments={
            'x-dead-letter-exchange': 'dlx',
            'x-dead-letter-routing-key': 'data-log-failed',
            'x-message-ttl': 300000,  # 5 minutes TTL
        }
    ),
    Queue(
        "data-log-failed",
        exchange=dead_letter_exchange,
        routing_key="data-log-failed"
    ),
)
```

**Dead Letter Queue Processor**:
```python
@app.task(name="process.dead.letter")
def process_dead_letter_queue():
    """Process failed tasks from dead letter queue"""
    # Connect to RabbitMQ
    connection = pika.BlockingConnection(
        pika.URLParameters(os.environ["CELERY_BROKER_URL"])
    )
    channel = connection.channel()

    # Process messages from dead letter queue
    method_frame, header_frame, body = channel.basic_get(queue="data-log-failed")

    if method_frame:
        try:
            # Attempt to reprocess the message
            message = json.loads(body)

            # Log the failure for analysis
            print(f"Reprocessing failed task: {message}")

            # Optionally retry the original task
            # log_data.apply_async(message['args'], message['kwargs'])

            # Acknowledge the message
            channel.basic_ack(method_frame.delivery_tag)

        except Exception as e:
            print(f"Failed to reprocess dead letter: {e}")
            # Reject and don't requeue
            channel.basic_nack(method_frame.delivery_tag, requeue=False)

    connection.close()
```

### Health Monitoring

**Task Health Checks**:
```python
@app.task(name="system.health.check")
def system_health_check():
    """Comprehensive system health check"""
    health_status = {
        "timestamp": datetime.utcnow().isoformat(),
        "components": {}
    }

    # Check MongoDB connectivity
    try:
        db = AppDatabase()
        db.command("ping")
        health_status["components"]["mongodb"] = "healthy"
    except Exception as e:
        health_status["components"]["mongodb"] = f"unhealthy: {e}"

    # Check TimescaleDB connectivity
    try:
        with Session(engine) as session:
            session.execute("SELECT 1")
        health_status["components"]["timescaledb"] = "healthy"
    except Exception as e:
        health_status["components"]["timescaledb"] = f"unhealthy: {e}"

    # Check RabbitMQ connectivity
    try:
        connection = pika.BlockingConnection(
            pika.URLParameters(os.environ["CELERY_BROKER_URL"])
        )
        connection.close()
        health_status["components"]["rabbitmq"] = "healthy"
    except Exception as e:
        health_status["components"]["rabbitmq"] = f"unhealthy: {e}"

    return health_status
```

**Worker Monitoring**:
```python
@app.task(name="worker.stats")
def collect_worker_stats():
    """Collect worker statistics for monitoring"""
    inspect = app.control.inspect()

    stats = {
        "active_tasks": inspect.active(),
        "scheduled_tasks": inspect.scheduled(),
        "reserved_tasks": inspect.reserved(),
        "worker_stats": inspect.stats(),
        "registered_tasks": inspect.registered(),
    }

    # Send stats to monitoring system
    # push_to_monitoring_system(stats)

    return stats
```

## 🔧 Performance Optimization

### Worker Scaling

**Dynamic Worker Scaling**:
```python
# celery_worker_autoscaler.py
import psutil
from celery import Celery

class WorkerAutoscaler:
    def __init__(self, app: Celery, min_workers=2, max_workers=10):
        self.app = app
        self.min_workers = min_workers
        self.max_workers = max_workers

    def scale_workers(self):
        """Scale workers based on queue depth and system resources"""
        inspect = self.app.control.inspect()

        # Get queue lengths
        active_tasks = inspect.active()
        reserved_tasks = inspect.reserved()

        total_tasks = sum(len(tasks) for tasks in active_tasks.values())
        total_reserved = sum(len(tasks) for tasks in reserved_tasks.values())

        # Get system resources
        cpu_percent = psutil.cpu_percent(interval=1)
        memory_percent = psutil.virtual_memory().percent

        # Scaling logic
        if total_tasks + total_reserved > 50 and cpu_percent < 80 and memory_percent < 80:
            # Scale up
            current_workers = len(active_tasks)
            if current_workers < self.max_workers:
                print(f"Scaling up workers: {current_workers} -> {current_workers + 1}")
                # Add worker logic here

        elif total_tasks + total_reserved < 10 and cpu_percent < 50:
            # Scale down
            current_workers = len(active_tasks)
            if current_workers > self.min_workers:
                print(f"Scaling down workers: {current_workers} -> {current_workers - 1}")
                # Remove worker logic here
```

**Queue Prioritization**:
```python
# Configure queue priorities
app.conf.task_routes = {
    'log.data': {'queue': 'data-log', 'priority': 1},           # Low priority
    'heartbeat': {'queue': 'heartbeat', 'priority': 5},         # High priority
    'push.metrics': {'queue': 'metrics-log', 'priority': 3},    # Medium priority
    'send.usage.email': {'queue': 'send-usage-email', 'priority': 2},  # Low-medium priority
}

# Worker configuration for priority handling
# celery -A celery_backend.celery_app worker --queues=heartbeat,metrics-log,data-log --prefetch-multiplier=1
```

### Memory Optimization

**Task Memory Management**:
```python
@app.task(name="memory.optimized.task")
def memory_optimized_task(large_data_id: str):
    """Process large data with memory optimization"""
    try:
        # Process data in chunks to avoid memory issues
        chunk_size = 1000

        # Use generators for memory efficiency
        def process_data_chunks(data_id):
            # Fetch data in chunks from database
            offset = 0
            while True:
                chunk = fetch_data_chunk(data_id, offset, chunk_size)
                if not chunk:
                    break
                yield chunk
                offset += chunk_size

        # Process each chunk
        results = []
        for chunk in process_data_chunks(large_data_id):
            processed_chunk = process_chunk(chunk)
            results.append(processed_chunk)

            # Clear chunk from memory
            del chunk
            del processed_chunk

        return {"status": "success", "processed_chunks": len(results)}

    except MemoryError:
        print("Memory error encountered, reducing chunk size")
        # Implement fallback with smaller chunks
        raise
```

**Connection Pooling**:
```python
# Optimized database connections
from sqlalchemy.pool import QueuePool

# TimescaleDB with connection pooling
engine = create_engine(
    connection_string,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections every hour
)

# MongoDB with connection pooling
db_clients = {
    "app": pymongo.MongoClient(
        os.environ.get("APP_DB_CONNECTION_STRING"),
        maxPoolSize=50,
        minPoolSize=10,
        maxIdleTimeMS=30000,
        waitQueueTimeoutMS=5000,
    ),
}
```

## 📊 Monitoring & Observability

### Task Metrics Collection

**Custom Metrics**:
```python
from prometheus_client import Counter, Histogram, Gauge

# Define custom metrics
TASK_COUNTER = Counter('celery_task_total', 'Total number of tasks', ['task_name', 'status'])
TASK_DURATION = Histogram('celery_task_duration_seconds', 'Task duration', ['task_name'])
QUEUE_DEPTH = Gauge('celery_queue_depth', 'Queue depth', ['queue_name'])

@app.task(name="instrumented.task", bind=True)
def instrumented_task(self, param1, param2):
    """Task with comprehensive instrumentation"""
    task_name = self.name

    # Start timing
    start_time = time.time()

    try:
        # Task logic here
        result = process_data(param1, param2)

        # Record success
        TASK_COUNTER.labels(task_name=task_name, status='success').inc()

        return result

    except Exception as e:
        # Record failure
        TASK_COUNTER.labels(task_name=task_name, status='failure').inc()
        raise

    finally:
        # Record duration
        duration = time.time() - start_time
        TASK_DURATION.labels(task_name=task_name).observe(duration)
```

**Queue Monitoring**:
```python
@app.task(name="monitor.queues")
def monitor_queue_depths():
    """Monitor and report queue depths"""
    inspect = app.control.inspect()

    # Get queue information
    active_queues = inspect.active_queues()

    for worker, queues in active_queues.items():
        for queue_info in queues:
            queue_name = queue_info['name']

            # Get queue depth from RabbitMQ
            queue_depth = get_rabbitmq_queue_depth(queue_name)

            # Update Prometheus metric
            QUEUE_DEPTH.labels(queue_name=queue_name).set(queue_depth)

    return {"status": "queue_monitoring_complete"}

def get_rabbitmq_queue_depth(queue_name: str) -> int:
    """Get queue depth from RabbitMQ management API"""
    try:
        management_url = os.environ.get("RABBITMQ_MANAGEMENT_URL")
        auth = (
            os.environ.get("RABBITMQ_DEFAULT_USER"),
            os.environ.get("RABBITMQ_DEFAULT_PASS")
        )

        response = requests.get(
            f"{management_url}/api/queues/dhruva_host/{queue_name}",
            auth=auth
        )

        if response.status_code == 200:
            queue_info = response.json()
            return queue_info.get('messages', 0)
        else:
            return 0

    except Exception as e:
        print(f"Failed to get queue depth for {queue_name}: {e}")
        return 0
```

### Alerting

**Task Failure Alerts**:
```python
@app.task(name="alert.on.failure", bind=True)
def alert_on_task_failure(self, *args, **kwargs):
    """Send alerts when critical tasks fail"""
    try:
        # Task logic here
        pass
    except Exception as exc:
        # Send alert
        send_alert(
            severity="high",
            message=f"Critical task {self.name} failed: {exc}",
            task_id=self.request.id,
            args=args,
            kwargs=kwargs
        )
        raise

def send_alert(severity: str, message: str, **context):
    """Send alert to monitoring system"""
    alert_data = {
        "severity": severity,
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
        "context": context
    }

    # Send to alerting system (Slack, PagerDuty, etc.)
    # slack_webhook_url = os.environ.get("SLACK_WEBHOOK_URL")
    # requests.post(slack_webhook_url, json={"text": message})

    print(f"ALERT [{severity.upper()}]: {message}")
```

## 🔒 Security Considerations

### Task Input Validation

**Input Sanitization**:
```python
from pydantic import BaseModel, validator
from typing import List, Optional

class LogDataInput(BaseModel):
    usage_type: str
    service_id: str
    client_ip: str
    data_tracking_consent: bool
    error_msg: Optional[str]
    api_key_id: str
    req_body: str
    resp_body: Optional[str]
    response_time: float

    @validator('usage_type')
    def validate_usage_type(cls, v):
        allowed_types = ['asr', 'translation', 'transliteration', 'tts', 'ner']
        if v not in allowed_types:
            raise ValueError(f'Invalid usage_type: {v}')
        return v

    @validator('client_ip')
    def validate_ip(cls, v):
        import ipaddress
        try:
            ipaddress.ip_address(v)
        except ValueError:
            raise ValueError(f'Invalid IP address: {v}')
        return v

@app.task(name="secure.log.data")
def secure_log_data(**kwargs):
    """Secure log data task with input validation"""
    try:
        # Validate input
        validated_input = LogDataInput(**kwargs)

        # Process with validated data
        return log_data(
            validated_input.usage_type,
            validated_input.service_id,
            validated_input.client_ip,
            validated_input.data_tracking_consent,
            validated_input.error_msg,
            validated_input.api_key_id,
            validated_input.req_body,
            validated_input.resp_body,
            validated_input.response_time
        )
    except ValueError as e:
        print(f"Input validation failed: {e}")
        raise
```

### Secure Configuration

**Environment Variable Security**:
```python
# Secure configuration loading
import os
from cryptography.fernet import Fernet

class SecureConfig:
    def __init__(self):
        self.encryption_key = os.environ.get("CONFIG_ENCRYPTION_KEY")
        self.cipher = Fernet(self.encryption_key) if self.encryption_key else None

    def get_secure_value(self, key: str) -> str:
        """Get and decrypt secure configuration value"""
        encrypted_value = os.environ.get(key)
        if encrypted_value and self.cipher:
            return self.cipher.decrypt(encrypted_value.encode()).decode()
        return encrypted_value

    def get_database_url(self) -> str:
        """Get secure database URL"""
        return self.get_secure_value("SECURE_DB_CONNECTION_STRING")

# Usage in tasks
secure_config = SecureConfig()
```

---

## 📚 Summary

The Dhruva Platform's Celery backend provides a robust, scalable foundation for asynchronous task processing. Key strengths include:

**Architecture Benefits**:
- **Modular Design**: Clear separation of concerns with dedicated task modules
- **Scalable Queuing**: RabbitMQ with multiple exchanges and queues for different task types
- **Comprehensive Monitoring**: Built-in health checks, metrics collection, and error handling
- **Flexible Scheduling**: Cron-based scheduling for periodic maintenance tasks

**Operational Excellence**:
- **Reliable Processing**: Retry mechanisms and dead letter queue handling
- **Performance Optimization**: Connection pooling, memory management, and worker scaling
- **Security**: Input validation, secure configuration, and audit logging
- **Observability**: Comprehensive metrics, logging, and alerting

**Development Friendly**:
- **Easy Extension**: Clear patterns for adding new tasks
- **Testing Support**: Unit and integration testing frameworks
- **Debugging Tools**: Comprehensive logging and monitoring capabilities
- **Documentation**: Detailed code examples and workflow explanations

This Celery backend system serves as the backbone for all asynchronous operations in the Dhruva Platform, ensuring reliable, scalable, and maintainable task processing for critical business operations.

---

*This guide provides comprehensive technical documentation for the Dhruva Platform's Celery backend system. For additional support or questions, refer to the main architecture documentation or contact the development team.*
```
