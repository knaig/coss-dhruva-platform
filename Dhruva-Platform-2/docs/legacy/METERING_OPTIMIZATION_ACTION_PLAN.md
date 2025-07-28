# Dhruva Platform Metering Services - Optimization Action Plan

## Executive Summary

This action plan addresses the three critical issues identified in the metering services analysis and provides a comprehensive optimization strategy. The plan is structured by priority and includes detailed resolution procedures, AWS migration strategy, and system optimization recommendations.

## Issue Priority Matrix

| Priority | Issue | Impact | Urgency | Estimated Effort |
|----------|-------|--------|---------|------------------|
| **P1** | Queue Backlog (13,242 messages) | High | High | 4-6 hours |
| **P2** | High Memory Usage (Celery Workers) | Medium | Medium | 2-4 hours |
| **P3** | Azure Storage Authentication | Low | Low | 6-8 hours |
| **P4** | Incomplete TimescaleDB Schema | Low | Low | 2-3 hours |

## 1. PRIORITY 1: Queue Backlog Resolution

### Root Cause Analysis Steps

**Step 1: Investigate Queue Status**
```bash
# Check current queue depths and rates
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host name messages consumers message_stats.publish_details.rate

# Check worker status and active tasks
docker exec celery-metering celery -A celery_backend.celery_app inspect active
docker exec celery-metering celery -A celery_backend.celery_app inspect stats

# Monitor real-time queue processing
watch -n 5 'docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host'
```

**Step 2: Analyze Worker Performance**
```bash
# Check worker logs for errors or bottlenecks
docker logs celery-metering --tail 500 | grep -E "(ERROR|WARNING|CRITICAL)"

# Monitor worker resource usage
docker stats celery-metering --no-stream

# Check database connection status
docker exec celery-metering python3 -c "
from celery_backend.tasks.database import AppDatabase
from celery_backend.tasks.metering_database import engine
from sqlalchemy.orm import Session
try:
    db = AppDatabase()
    print('MongoDB connection: OK')
    with Session(engine) as session:
        session.execute('SELECT 1')
    print('TimescaleDB connection: OK')
except Exception as e:
    print(f'Database error: {e}')
"
```

**Step 3: Identify Bottlenecks**
```bash
# Check for slow queries in TimescaleDB
docker exec -it timescaledb psql -U postgres -d dhruva -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"

# Monitor MongoDB performance
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin --eval "
db.runCommand({serverStatus: 1}).opcounters
"
```

### Resolution Procedures

**Option A: Scale Worker Capacity (Immediate Fix)**
```bash
# Increase worker concurrency temporarily
docker exec celery-metering celery -A celery_backend.celery_app control pool_grow 4

# Add additional worker container (modify docker-compose-metering.yml)
# Add this service definition:
```

```yaml
celery-metering-2:
  container_name: celery-metering-2
  platform: linux/amd64
  build:
    context: ./server
  working_dir: /src
  depends_on:
    rabbitmq_server:
      condition: service_started
    timescaledb:
      condition: service_healthy
  volumes:
    - ./server:/src
  env_file:
    - .env
  command: sh -c "python3 -m celery -A celery_backend.celery_app worker -Q data-log --concurrency=4"
  networks:
    - dhruva-network
```

**Option B: Optimize Task Processing (Long-term Fix)**
```python
# Modify celery_backend/tasks/log_data.py to add batch processing
@app.task(name="log.data.batch", bind=True)
def log_data_batch(self, task_list):
    """Process multiple log_data tasks in a single batch"""
    try:
        for task_data in task_list:
            # Process individual task
            log_data(*task_data)
    except Exception as exc:
        self.retry(countdown=60, max_retries=3)
```

**Option C: Purge Stale Messages (Emergency Fix)**
```bash
# CAUTION: Only if messages are determined to be stale/corrupted
# Backup queue first
docker exec dhruva-platform-rabbitmq rabbitmqctl export_definitions /tmp/backup.json

# Purge specific queue (DESTRUCTIVE - use with caution)
# docker exec dhruva-platform-rabbitmq rabbitmqctl purge_queue data-log -p dhruva_host
```

### Verification Methods
```bash
# Monitor queue reduction over time
while true; do
  echo "$(date): $(docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host name messages | grep data-log)"
  sleep 60
done

# Verify data integrity in TimescaleDB
docker exec -it timescaledb psql -U postgres -d dhruva -c "
SELECT COUNT(*), DATE_TRUNC('hour', timestamp) as hour
FROM apikey
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;"
```

## 2. PRIORITY 2: Memory Optimization for Celery Workers

### Root Cause Analysis
```bash
# Analyze memory usage patterns
docker exec celery-metering python3 -c "
import psutil
import os
process = psutil.Process(os.getpid())
print(f'Memory: {process.memory_info().rss / 1024 / 1024:.2f} MB')
print(f'Open files: {len(process.open_files())}')
print(f'Connections: {len(process.connections())}')
"

# Check for memory leaks
docker exec celery-metering python3 -c "
import gc
print(f'Garbage collector stats: {gc.get_stats()}')
print(f'Uncollectable objects: {len(gc.garbage)}')
"
```

### Optimization Procedures

**Step 1: Configure Celery Memory Management**
```python
# Add to celery_backend/celeryconfig.py
worker_max_tasks_per_child = 1000  # Restart worker after 1000 tasks
worker_max_memory_per_child = 200000  # Restart worker at 200MB
worker_disable_rate_limits = True
task_acks_late = True
worker_prefetch_multiplier = 1
```

**Step 2: Optimize Database Connections**
```python
# Modify celery_backend/tasks/metering_database.py
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

connection_string = "postgresql://postgres:postgres@timescaledb:5432/dhruva"
engine = create_engine(
    connection_string,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

**Step 3: Implement Connection Pooling for MongoDB**
```python
# Modify celery_backend/tasks/database.py
import pymongo
from pymongo import MongoClient

class AppDatabase:
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._client = MongoClient(
                os.environ["APP_DB_CONNECTION_STRING"],
                maxPoolSize=10,
                minPoolSize=2,
                maxIdleTimeMS=30000
            )
        return cls._instance
```

## 3. PRIORITY 3: AWS Migration Plan

### AWS Services Architecture
```
Azure Blob Storage → AWS S3
Azure Identity → AWS IAM
Azure Key Vault → AWS Secrets Manager (optional)
```

### Required AWS Services and Configuration

**AWS S3 Configuration:**
```bash
# Environment variables to add/update in .env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
AWS_S3_BUCKET_NAME=dhruva-platform-storage
AWS_S3_BUCKET_LOGS=dhruva-platform-logs
AWS_S3_BUCKET_FEEDBACK=dhruva-platform-feedback
```

**IAM Policy Requirements:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::dhruva-platform-*",
                "arn:aws:s3:::dhruva-platform-*/*"
            ]
        }
    ]
}
```

### Code Changes Required

**Step 1: Update requirements.txt**
```txt
# Remove Azure dependencies
# azure-storage-blob
# azure-identity

# Add AWS dependencies
boto3>=1.26.0
botocore>=1.29.0
```

**Step 2: Create AWS Storage Helper**
```python
# Create new file: celery_backend/tasks/aws_storage.py
import boto3
import os
from botocore.exceptions import ClientError

class AWSStorageManager:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            region_name=os.environ['AWS_DEFAULT_REGION']
        )

    def upload_file(self, file_content, bucket, key):
        try:
            self.s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=file_content
            )
            return True
        except ClientError as e:
            print(f"AWS S3 upload error: {e}")
            return False

    def download_file(self, bucket, key):
        try:
            response = self.s3_client.get_object(Bucket=bucket, Key=key)
            return response['Body'].read()
        except ClientError as e:
            print(f"AWS S3 download error: {e}")
            return None
```

**Step 3: Update Celery Tasks**
```python
# Modify celery_backend/tasks/upload_feedback_dump.py
from .aws_storage import AWSStorageManager

@app.task(name="upload.feedback.dump")
def upload_feedback_dump() -> None:
    """Uploads feedback dumps to AWS S3"""
    # ... existing CSV generation code ...

    storage_manager = AWSStorageManager()

    # Generate filename with timestamp
    filename = f"feedback_dump_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    # Upload to S3
    success = storage_manager.upload_file(
        file_content=file.getvalue().encode('utf-8'),
        bucket=os.environ['AWS_S3_BUCKET_FEEDBACK'],
        key=filename
    )

    if success:
        print(f"Successfully uploaded feedback dump: {filename}")
    else:
        print(f"Failed to upload feedback dump: {filename}")
```

### Migration Verification Steps
```bash
# Test AWS credentials
docker exec celery-metering python3 -c "
import boto3
try:
    s3 = boto3.client('s3')
    s3.list_buckets()
    print('AWS S3 connection: SUCCESS')
except Exception as e:
    print(f'AWS S3 connection: FAILED - {e}')
"

# Test file upload
docker exec celery-metering python3 -c "
from celery_backend.tasks.aws_storage import AWSStorageManager
import os
storage = AWSStorageManager()
result = storage.upload_file(
    b'test content',
    os.environ['AWS_S3_BUCKET_LOGS'],
    'test_file.txt'
)
print(f'Upload test: {\"SUCCESS\" if result else \"FAILED\"}')
"
```

## 4. PRIORITY 4: TimescaleDB Schema Enhancement

### Current Schema Analysis
```sql
-- Current table structure
CREATE TABLE apikey (
    api_key_id TEXT,
    api_key_name TEXT,
    user_id TEXT,
    user_email TEXT,
    inference_service_id TEXT,
    task_type TEXT,
    usage DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE PRIMARY KEY
);
```

### Enhanced Schema Design
```sql
-- Add comprehensive metrics tables
CREATE TABLE IF NOT EXISTS service_metrics (
    service_id TEXT NOT NULL,
    service_name TEXT,
    endpoint_url TEXT,
    response_time_ms DOUBLE PRECISION,
    status_code INTEGER,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (timestamp, service_id)
);

CREATE TABLE IF NOT EXISTS user_activity (
    user_id TEXT NOT NULL,
    user_email TEXT,
    api_key_id TEXT,
    action_type TEXT,
    resource_accessed TEXT,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (timestamp, user_id)
);

CREATE TABLE IF NOT EXISTS system_health (
    component_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION,
    metric_unit TEXT,
    status TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (timestamp, component_name, metric_name)
);

-- Convert to hypertables
SELECT create_hypertable('service_metrics', 'timestamp', if_not_exists => TRUE);
SELECT create_hypertable('user_activity', 'timestamp', if_not_exists => TRUE);
SELECT create_hypertable('system_health', 'timestamp', if_not_exists => TRUE);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_service_metrics_service_id ON service_metrics (service_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health (component_name, timestamp DESC);
```

### Implementation Steps
```bash
# Apply schema changes
docker exec -it timescaledb psql -U postgres -d dhruva -f /path/to/schema_updates.sql

# Verify hypertables
docker exec -it timescaledb psql -U postgres -d dhruva -c "
SELECT hypertable_name, num_chunks
FROM timescaledb_information.hypertables;"
```

## Implementation Sequence

### Phase 1: Immediate Fixes (Day 1)
1. **Queue Backlog Resolution** - Scale workers and monitor processing
2. **Memory Optimization** - Apply Celery configuration changes
3. **Monitoring Setup** - Implement real-time queue monitoring

### Phase 2: Infrastructure Improvements (Week 1)
1. **AWS Migration** - Replace Azure storage with S3
2. **Database Schema** - Enhance TimescaleDB with additional tables
3. **Performance Tuning** - Optimize database connections and queries

### Phase 3: Long-term Optimization (Week 2-3)
1. **Alerting System** - Implement Prometheus alerts
2. **Automated Scaling** - Container orchestration improvements
3. **Data Retention** - Implement automated cleanup policies

## Testing and Validation Framework

### Pre-Implementation Testing
```bash
# Create test environment
cp .env .env.backup
cp docker-compose-metering.yml docker-compose-metering.yml.backup

# Test configuration changes in isolation
docker-compose -f docker-compose-test.yml up -d
```

### Post-Implementation Validation
```bash
# Functional tests
./scripts/test_metering_pipeline.sh
./scripts/test_aws_integration.sh
./scripts/test_database_performance.sh

# Load testing
./scripts/load_test_queue_processing.sh

# Monitoring validation
./scripts/verify_metrics_collection.sh
```

### Rollback Procedures
```bash
# Quick rollback commands
docker-compose -f docker-compose-metering.yml down
cp .env.backup .env
cp docker-compose-metering.yml.backup docker-compose-metering.yml
docker-compose -f docker-compose-metering.yml up -d
```

## Risk Assessment and Mitigation

### High-Risk Operations
| Operation | Risk Level | Mitigation Strategy |
|-----------|------------|-------------------|
| Queue Purging | **HIGH** | Full backup before purge, staged rollout |
| Database Schema Changes | **MEDIUM** | Test on copy, incremental deployment |
| AWS Migration | **MEDIUM** | Parallel operation, gradual cutover |
| Memory Configuration | **LOW** | Gradual tuning, monitoring |

### Backup Strategy
```bash
# Complete system backup before changes
./scripts/backup_all_services.sh

# Individual component backups
docker exec dhruva-platform-rabbitmq rabbitmqctl export_definitions /backup/rabbitmq_definitions.json
docker exec timescaledb pg_dump -U postgres dhruva > /backup/timescaledb_backup.sql
docker exec dhruva-platform-app-db mongodump --out /backup/mongodb_backup
tar -czf /backup/config_backup.tar.gz .env docker-compose-*.yml
```

## Monitoring and Alerting Enhancements

### Prometheus Alert Rules
```yaml
# Add to prometheus/alert_rules.yml
groups:
  - name: dhruva_metering_alerts
    rules:
      - alert: HighQueueDepth
        expr: rabbitmq_queue_messages{queue="data-log"} > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High message queue depth detected"
          description: "Queue {{ $labels.queue }} has {{ $value }} messages"

      - alert: CeleryWorkerDown
        expr: up{job="celery-workers"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Celery worker is down"

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes{name=~"celery.*"} / container_spec_memory_limit_bytes > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage in Celery worker"
```

### Grafana Dashboard Enhancements
```json
{
  "dashboard": {
    "title": "Dhruva Metering Health",
    "panels": [
      {
        "title": "Queue Depths",
        "type": "graph",
        "targets": [
          {
            "expr": "rabbitmq_queue_messages",
            "legendFormat": "{{ queue }}"
          }
        ]
      },
      {
        "title": "Worker Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "container_memory_usage_bytes{name=~\"celery.*\"} / 1024 / 1024",
            "legendFormat": "{{ name }}"
          }
        ]
      }
    ]
  }
}
```

## Performance Benchmarking

### Baseline Metrics Collection
```bash
# Collect current performance baseline
echo "=== BASELINE METRICS ===" > baseline_metrics.txt
echo "Date: $(date)" >> baseline_metrics.txt

# Queue depths
echo "Queue Depths:" >> baseline_metrics.txt
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host >> baseline_metrics.txt

# Memory usage
echo "Memory Usage:" >> baseline_metrics.txt
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" >> baseline_metrics.txt

# Database performance
echo "Database Performance:" >> baseline_metrics.txt
docker exec -it timescaledb psql -U postgres -d dhruva -c "
SELECT
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables;" >> baseline_metrics.txt
```

### Load Testing Scripts
```bash
#!/bin/bash
# scripts/load_test_queue_processing.sh

echo "Starting load test for queue processing..."

# Generate test messages
for i in {1..1000}; do
    docker exec celery-metering python3 -c "
from celery_backend.tasks.log_data import log_data
log_data.apply_async(
    ('test', 'test_service', '127.0.0.1', True, None, 'test_key',
     '{\"test\": \"data\"}', '{\"result\": \"success\"}', 0.1),
    queue='data-log'
)
"
    if [ $((i % 100)) -eq 0 ]; then
        echo "Generated $i test messages"
    fi
done

echo "Load test completed. Monitor queue processing..."
```

## Detailed Implementation Scripts

### Queue Monitoring Script
```bash
#!/bin/bash
# scripts/monitor_queue_processing.sh

echo "Starting queue monitoring..."
LOG_FILE="queue_monitoring_$(date +%Y%m%d_%H%M%S).log"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    QUEUE_DEPTH=$(docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host name messages | grep data-log | awk '{print $2}')
    WORKER_ACTIVE=$(docker exec celery-metering celery -A celery_backend.celery_app inspect active | grep -c "log.data")

    echo "$TIMESTAMP,data-log,$QUEUE_DEPTH,$WORKER_ACTIVE" >> $LOG_FILE
    echo "[$TIMESTAMP] Queue: $QUEUE_DEPTH messages, Active tasks: $WORKER_ACTIVE"

    sleep 30
done
```

### AWS Migration Validation Script
```bash
#!/bin/bash
# scripts/test_aws_integration.sh

echo "Testing AWS S3 integration..."

# Test 1: Credentials validation
echo "1. Testing AWS credentials..."
docker exec celery-metering python3 -c "
import boto3
from botocore.exceptions import ClientError
try:
    s3 = boto3.client('s3')
    response = s3.list_buckets()
    print('✓ AWS credentials valid')
    print(f'  Found {len(response[\"Buckets\"])} buckets')
except ClientError as e:
    print(f'✗ AWS credentials invalid: {e}')
    exit(1)
"

# Test 2: Bucket access
echo "2. Testing bucket access..."
docker exec celery-metering python3 -c "
import boto3
import os
from datetime import datetime

s3 = boto3.client('s3')
bucket = os.environ['AWS_S3_BUCKET_LOGS']
test_key = f'test/connectivity_test_{datetime.now().isoformat()}.txt'
test_content = b'AWS S3 connectivity test'

try:
    # Upload test
    s3.put_object(Bucket=bucket, Key=test_key, Body=test_content)
    print('✓ Upload test successful')

    # Download test
    response = s3.get_object(Bucket=bucket, Key=test_key)
    downloaded = response['Body'].read()
    assert downloaded == test_content
    print('✓ Download test successful')

    # Cleanup
    s3.delete_object(Bucket=bucket, Key=test_key)
    print('✓ Cleanup successful')

except Exception as e:
    print(f'✗ S3 operation failed: {e}')
    exit(1)
"

echo "AWS integration test completed successfully!"
```

### Database Performance Test
```bash
#!/bin/bash
# scripts/test_database_performance.sh

echo "Testing database performance..."

# TimescaleDB performance test
echo "1. Testing TimescaleDB performance..."
docker exec -it timescaledb psql -U postgres -d dhruva -c "
EXPLAIN ANALYZE
INSERT INTO apikey (api_key_id, api_key_name, user_id, user_email, inference_service_id, task_type, usage, timestamp)
SELECT
    'test_key_' || generate_series,
    'test_name_' || generate_series,
    'user_' || generate_series,
    'user' || generate_series || '@test.com',
    'service_' || (generate_series % 10),
    CASE (generate_series % 4)
        WHEN 0 THEN 'asr'
        WHEN 1 THEN 'translation'
        WHEN 2 THEN 'tts'
        ELSE 'ner'
    END,
    random() * 100,
    NOW() - (generate_series || ' seconds')::INTERVAL
FROM generate_series(1, 1000);
"

# MongoDB performance test
echo "2. Testing MongoDB performance..."
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin --eval "
db = db.getSiblingDB('admin');
var start = new Date();
for(var i = 0; i < 1000; i++) {
    db.test_collection.insertOne({
        test_id: i,
        timestamp: new Date(),
        data: 'test_data_' + i
    });
}
var end = new Date();
print('MongoDB insert performance: ' + (end - start) + 'ms for 1000 records');
db.test_collection.drop();
"

echo "Database performance test completed!"
```

## Success Criteria and KPIs

### Phase 1 Success Metrics
- **Queue Backlog**: Reduced to < 100 messages within 2 hours
- **Memory Usage**: Celery workers < 500MB each
- **Processing Rate**: > 50 messages/second sustained

### Phase 2 Success Metrics
- **AWS Migration**: 100% successful file uploads to S3
- **Database Schema**: All new tables created and indexed
- **Zero Downtime**: No service interruptions during migration

### Phase 3 Success Metrics
- **Alert Response**: < 5 minute detection of issues
- **Automated Scaling**: Workers auto-scale based on queue depth
- **Data Retention**: Automated cleanup of data > 90 days

### Continuous Monitoring KPIs
```bash
# Daily health check script
#!/bin/bash
# scripts/daily_health_check.sh

echo "=== DAILY HEALTH CHECK $(date) ==="

# Check all services are running
echo "1. Service Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep dhruva

# Check queue depths
echo "2. Queue Status:"
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host

# Check database sizes
echo "3. Database Sizes:"
docker exec -it timescaledb psql -U postgres -d dhruva -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public';"

# Check error rates
echo "4. Recent Errors:"
docker logs celery-metering --since 24h | grep -c ERROR
docker logs celery-monitoring --since 24h | grep -c ERROR

echo "Health check completed!"
```

---

**Implementation Ready**: This comprehensive action plan provides step-by-step procedures for resolving all identified issues. Each phase includes detailed scripts, validation procedures, and rollback plans to ensure safe implementation with minimal risk to the production system.

**Estimated Timeline**:
- Phase 1 (Critical Fixes): 1-2 days
- Phase 2 (Infrastructure): 1 week
- Phase 3 (Optimization): 2-3 weeks

**Resource Requirements**:
- AWS Account with S3 access
- 2-4 hours of maintenance window for database changes
- Monitoring during first 48 hours post-implementation
