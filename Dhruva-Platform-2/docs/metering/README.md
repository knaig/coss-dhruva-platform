# Metering & Analytics System

## 📊 Overview

The Dhruva Platform metering system implements a comprehensive dual-database architecture for real-time usage tracking and analytics. It captures, calculates, and stores usage data for all AI inference services with high accuracy and reliability.

## 🏗️ Architecture

### Dual-Database Model

```mermaid
graph TD
    A[API Request] --> B[Usage Calculation]
    B --> C[Dual Database Write]
    C --> D[MongoDB Update]
    C --> E[TimescaleDB Insert]

    D --> F[Cumulative Counters]
    E --> G[Time-Series Analytics]

    F --> H[User Management]
    F --> I[Billing Reports]
    G --> J[Usage Analytics]
    G --> K[Performance Monitoring]
```

### Database Roles

| Database | Primary Purpose | Data Pattern | Use Cases |
|----------|----------------|--------------|-----------|
| **MongoDB** | User Management & Cumulative Tracking | UPDATE existing records | API key management, billing totals, user quotas |
| **TimescaleDB** | Time-Series Analytics & Audit Trail | INSERT new records | Usage trends, performance analytics, detailed reporting |

## 🔄 Data Flow Architecture

### Metering Process Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Server
    participant Q as RabbitMQ
    participant W as Celery Worker
    participant M as MongoDB
    participant T as TimescaleDB
    
    C->>A: API Request
    A->>A: Process Request
    A->>A: Calculate Usage
    A->>Q: Queue Metering Task
    A->>C: Return Response
    
    Q->>W: Deliver Task
    W->>M: Update Cumulative Usage
    W->>T: Insert Time-Series Record
    W->>Q: Acknowledge Task
```

### Usage Calculation Logic

```python
# Usage calculation by service type
def calculate_usage(service_type, request_data, response_data):
    if service_type == "translation":
        return sum(len(item["source"]) for item in request_data["input"])
    elif service_type == "asr":
        return calculate_audio_duration(request_data["audio"])
    elif service_type == "tts":
        return sum(len(item["source"]) for item in request_data["input"])
    elif service_type == "ner":
        return sum(len(item["source"]) for item in request_data["input"])
    elif service_type == "transliteration":
        return sum(len(item["source"]) for item in request_data["input"])
```

## 🗄️ Database Schema

### MongoDB Collections

#### API Key Collection
```javascript
{
  "_id": ObjectId("680b368070069bee045b210c"),
  "name": "My Translation Key",
  "key": "hashed_api_key",
  "user_id": ObjectId("user_id"),
  "type": "INFERENCE",
  "services": [
    {
      "service_id": "ai4bharat/indictrans--gpu-t4",
      "usage": 15420,      // Total characters processed
      "hits": 342          // Total API calls
    }
  ],
  "created_at": ISODate("2023-01-01T00:00:00Z"),
  "is_active": true
}
```

#### User Collection
```javascript
{
  "_id": ObjectId("user_id"),
  "name": "John Doe",
  "email": "john@example.com",
  "role": "CONSUMER",
  "total_usage": {
    "translation": 15420,
    "asr": 3600,
    "tts": 8900
  },
  "quota_limits": {
    "monthly_characters": 100000,
    "monthly_seconds": 7200
  }
}
```

### TimescaleDB Schema

#### API Key Usage Table
```sql
CREATE TABLE apikey (
    api_key_id TEXT,
    api_key_name TEXT,
    user_id TEXT,
    user_email TEXT,
    inference_service_id TEXT,
    task_type TEXT,
    usage FLOAT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (timestamp)
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('apikey', 'timestamp');

-- Create indexes for common queries
CREATE INDEX idx_apikey_id ON apikey (api_key_id, timestamp DESC);
CREATE INDEX idx_user_id ON apikey (user_id, timestamp DESC);
CREATE INDEX idx_service_id ON apikey (inference_service_id, timestamp DESC);
```

## ⚙️ Celery Task Processing

### Task Queues

```mermaid
graph LR
    A[API Request] --> B[data-log Queue]
    C[Metrics Collection] --> D[metrics-log Queue]
    E[Scheduled Tasks] --> F[heartbeat Queue]
    G[Email Notifications] --> H[send-usage-email Queue]
    I[Feedback Processing] --> J[upload-feedback-dump Queue]
    
    B --> K[Celery Metering Worker]
    D --> L[Celery Monitoring Worker]
    F --> K
    H --> K
    J --> K
```

### Core Metering Task

```python
@celery_app.task(bind=True, queue="data-log")
def log_data(self, user_id, service_id, client_ip, success, 
             error_message, api_key_id, request_data, 
             response_data, response_time):
    try:
        # Calculate usage based on service type
        usage = calculate_usage(service_id, request_data, response_data)
        
        # Update MongoDB cumulative counters
        update_mongodb_usage(api_key_id, service_id, usage)
        
        # Insert TimescaleDB time-series record
        insert_timescale_record(api_key_id, service_id, usage, 
                               user_id, response_time)
        
        logger.info(f"Logged usage: {usage} for service {service_id}")
        
    except Exception as e:
        logger.error(f"Metering task failed: {e}")
        raise self.retry(countdown=60, max_retries=3)
```

## 📈 Analytics & Reporting

### Usage Analytics Queries

#### Daily Usage Summary
```sql
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    inference_service_id,
    COUNT(*) as requests,
    SUM(usage) as total_usage,
    AVG(usage) as avg_usage_per_request
FROM apikey 
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY date, inference_service_id
ORDER BY date DESC;
```

#### User Usage Trends
```sql
SELECT 
    user_email,
    DATE_TRUNC('week', timestamp) as week,
    SUM(usage) as weekly_usage,
    COUNT(*) as weekly_requests
FROM apikey 
WHERE timestamp >= NOW() - INTERVAL '12 weeks'
GROUP BY user_email, week
ORDER BY week DESC, weekly_usage DESC;
```

#### Service Performance Metrics
```sql
SELECT 
    inference_service_id,
    COUNT(*) as total_requests,
    SUM(usage) as total_usage,
    AVG(usage) as avg_usage,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY usage) as p95_usage
FROM apikey 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY inference_service_id;
```

### MongoDB Aggregation Queries

#### Top Users by Usage
```javascript
db.api_key.aggregate([
  {
    $lookup: {
      from: "user",
      localField: "user_id",
      foreignField: "_id",
      as: "user"
    }
  },
  {
    $unwind: "$services"
  },
  {
    $group: {
      _id: "$user_id",
      user_email: { $first: { $arrayElemAt: ["$user.email", 0] } },
      total_usage: { $sum: "$services.usage" },
      total_hits: { $sum: "$services.hits" }
    }
  },
  {
    $sort: { total_usage: -1 }
  },
  {
    $limit: 10
  }
])
```

## 🔧 Configuration

### Environment Variables

```bash
# TimescaleDB Configuration
TIMESCALE_HOST=dhruva-platform-timescaledb
TIMESCALE_PORT=5432
TIMESCALE_USER=dhruva
TIMESCALE_PASSWORD=dhruva123
TIMESCALE_DATABASE_NAME=dhruva_metering

# MongoDB Configuration
MONGO_APP_DB_USERNAME=dhruvaadmin
MONGO_APP_DB_PASSWORD=dhruva123
APP_DB_CONNECTION_STRING=mongodb://dhruvaadmin:dhruva123@dhruva-platform-app-db:27017/admin

# RabbitMQ Configuration
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=admin123
RABBITMQ_DEFAULT_VHOST=dhruva_host
CELERY_BROKER_URL=amqp://admin:admin123@dhruva-platform-rabbitmq:5672/dhruva_host

# Celery Configuration
CELERY_RESULT_BACKEND=redis://dhruva-platform-redis:6379/0
CELERY_TASK_SERIALIZER=json
CELERY_RESULT_SERIALIZER=json
```

### Queue Configuration

```python
# Celery queue routing
CELERY_ROUTES = {
    'celery_backend.tasks.log_data': {'queue': 'data-log'},
    'celery_backend.tasks.push_metrics': {'queue': 'metrics-log'},
    'celery_backend.tasks.heartbeat': {'queue': 'heartbeat'},
    'celery_backend.tasks.send_usage_email': {'queue': 'send-usage-email'},
    'celery_backend.tasks.upload_feedback_dump': {'queue': 'upload-feedback-dump'}
}
```

## 📊 Monitoring & Alerting

### Key Metrics

```promql
# Queue depth monitoring
rabbitmq_queue_messages{queue="data-log"}

# Processing rate
rate(celery_task_total{task="log_data"}[5m])

# Task failure rate
rate(celery_task_failed_total[5m]) / rate(celery_task_total[5m])

# Database write latency
histogram_quantile(0.95, timescaledb_write_duration_seconds_bucket)
```

### Health Checks

```bash
# Check queue status
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host

# Check TimescaleDB connectivity
docker exec -it dhruva-platform-timescaledb psql -U dhruva -d dhruva_metering -c "SELECT COUNT(*) FROM apikey WHERE timestamp > NOW() - INTERVAL '1 hour';"

# Check MongoDB connectivity
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin admin --eval "db.api_key.countDocuments()"

# Check Celery workers
docker exec celery-metering celery -A celery_backend.celery_app inspect active
```

## 🚀 Performance Optimization

### Database Optimization

#### TimescaleDB Optimizations
```sql
-- Compression for older data
ALTER TABLE apikey SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'api_key_id'
);

-- Automatic compression policy
SELECT add_compression_policy('apikey', INTERVAL '7 days');

-- Data retention policy
SELECT add_retention_policy('apikey', INTERVAL '1 year');
```

#### MongoDB Optimizations
```javascript
// Compound indexes for common queries
db.api_key.createIndex({"user_id": 1, "services.service_id": 1})
db.api_key.createIndex({"services.service_id": 1, "services.usage": -1})

// TTL index for session cleanup
db.session.createIndex({"expires_at": 1}, {expireAfterSeconds: 0})
```

### Celery Optimization

```python
# Worker configuration for high throughput
CELERY_WORKER_PREFETCH_MULTIPLIER = 4
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# Task routing for load balancing
CELERY_ROUTES = {
    'log_data': {'queue': 'data-log', 'routing_key': 'data'},
    'push_metrics': {'queue': 'metrics-log', 'routing_key': 'metrics'}
}
```

## 🧪 Testing & Validation

### Data Consistency Verification

```bash
# Verify MongoDB vs TimescaleDB consistency
python scripts/verify_data_consistency.py --date 2023-12-01

# Test metering accuracy
python scripts/test_metering_accuracy.py --service translation --samples 100
```

### Load Testing

```bash
# Generate test load
for i in {1..1000}; do
  curl -X POST "http://localhost:8000/services/inference/translation" \
    -H "Authorization: test-api-key" \
    -H "Content-Type: application/json" \
    -d '{"input": [{"source": "test"}], "config": {"serviceId": "test-service"}}'
done
```

## 🔍 Troubleshooting

### Common Issues

1. **Queue Backlog**: Monitor queue depth and scale workers
2. **Database Connection**: Check connection strings and credentials
3. **Task Failures**: Review Celery logs for error patterns
4. **Data Inconsistency**: Run consistency verification scripts

### Debug Commands

```bash
# Monitor queue processing
watch -n 1 'docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host'

# Check worker logs
docker logs celery-metering --tail 100 -f

# Verify recent usage data
docker exec -it dhruva-platform-timescaledb psql -U dhruva -d dhruva_metering -c "SELECT * FROM apikey ORDER BY timestamp DESC LIMIT 10;"
```

## 📋 Maintenance Procedures

### Daily Maintenance
```bash
#!/bin/bash
# Daily maintenance script

# Check database health
python scripts/health_check.py

# Verify data consistency
python scripts/verify_data_consistency.py --date $(date -d "yesterday" +%Y-%m-%d)

# Clean up old logs
docker logs dhruva-platform-server --since 24h | grep ERROR > /var/log/dhruva/errors_$(date +%Y%m%d).log
```

### Weekly Maintenance
```sql
-- Analyze query performance
ANALYZE apikey;

-- Check for slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%apikey%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```
