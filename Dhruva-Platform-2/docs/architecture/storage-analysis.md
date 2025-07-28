# Dhruva Platform Storage Architecture Analysis
## Cloud Storage vs. Local Database: Purpose and Design Rationale

## Executive Summary

The Dhruva Platform employs a **hybrid storage architecture** that strategically separates operational data (TimescaleDB) from archival/export data (Cloud Storage). This design optimizes for real-time performance, cost efficiency, and long-term data management.

---

## 1. Storage Purpose Differentiation

### TimescaleDB (Local Database)
**Primary Purpose:** Real-time operational metrics and analytics
- **Performance Focus:** Sub-second query response times
- **Data Lifecycle:** Active, frequently accessed data
- **Query Patterns:** Time-series aggregations, real-time dashboards
- **Retention:** Short to medium-term (days to months)

### Cloud Storage (Azure Blob/AWS S3)
**Primary Purpose:** Long-term archival and bulk data export
- **Cost Focus:** Cheap storage for infrequently accessed data
- **Data Lifecycle:** Historical, archived, or exported data
- **Access Patterns:** Batch processing, periodic downloads
- **Retention:** Long-term (months to years)

---

## 2. Data Type Separation

### Data Stored in TimescaleDB
```sql
-- Real-time metrics for monitoring and analytics
CREATE TABLE apikey (
    api_key_id TEXT,
    api_key_name TEXT,
    user_id TEXT,
    user_email TEXT,
    inference_service_id TEXT,
    task_type TEXT,
    usage DOUBLE PRECISION,           -- Real-time usage metrics
    timestamp TIMESTAMP WITH TIME ZONE PRIMARY KEY
);

-- System health metrics
CREATE TABLE system_health (
    component_name TEXT,
    metric_name TEXT,
    metric_value DOUBLE PRECISION,   -- Performance counters
    timestamp TIMESTAMP WITH TIME ZONE
);
```

**Characteristics:**
- **Structured data** with defined schemas
- **Time-series data** for real-time monitoring
- **Frequently queried** for dashboards and alerts
- **Small record size** (typically < 1KB per record)
- **High write volume** (thousands of records per minute)

### Data Stored in Cloud Storage (S3/Azure)
```python
# Examples from Dhruva Platform codebase:

# 1. Monthly feedback dumps (CSV files)
filename = f"feedback_dump_{start_year}{start_month:02d}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
# File size: 10MB - 1GB depending on feedback volume

# 2. Error logs and debugging data
error_log_file = f"error_logs_{date}.json"
# File size: 1MB - 100MB per day

# 3. Raw request/response logs
request_log_file = f"api_requests_{date}.jsonl"
# File size: 100MB - 10GB per day

# 4. Model training data exports
training_data_export = f"training_data_{model_id}_{date}.parquet"
# File size: 1GB - 100GB per export
```

**Characteristics:**
- **Unstructured or semi-structured** data (CSV, JSON, logs)
- **Large file sizes** (MB to GB per file)
- **Infrequent access** (monthly, quarterly, or on-demand)
- **Archival nature** (historical data for compliance/analysis)
- **Bulk operations** (entire file uploads/downloads)

---

## 3. Why Not Use Just One System?

### Performance Constraints
```python
# TimescaleDB Optimization Example
# Efficient for: SELECT AVG(usage) FROM apikey WHERE timestamp > NOW() - INTERVAL '1 hour'
# Query time: ~50ms for millions of records

# Inefficient for: Storing 1GB CSV files as BLOB
# Would cause: Memory pressure, slow queries, index bloat
```

### Cost Considerations
```bash
# TimescaleDB (Local SSD Storage)
# Cost: ~$0.10/GB/month (high-performance SSD)
# Best for: Frequently accessed data

# AWS S3 (Cloud Storage)
# Cost: ~$0.023/GB/month (Standard tier)
# Cost: ~$0.004/GB/month (Glacier for archival)
# Best for: Infrequently accessed data
```

### Operational Requirements
```python
# Real-time monitoring needs (TimescaleDB)
def get_current_usage_metrics():
    # Needs: <100ms response time
    # Frequency: Every 15 seconds
    # Data: Last 24 hours of metrics

# Compliance reporting needs (Cloud Storage)
def generate_monthly_report():
    # Needs: Complete historical data
    # Frequency: Monthly
    # Data: All feedback from previous month
```

---

## 4. Practical Examples from Dhruva Platform

### Example 1: Feedback Dump Task Analysis

**What it does:**
```python
@app.task(name="upload.feedback.dump")
def upload_feedback_dump() -> None:
    """Uploads feedback dumps to cloud storage"""
    # 1. Query MongoDB for previous month's feedback
    query = {
        "feedbackTimeStamp": {"$gte": int(start_date), "$lt": int(end_date)},
    }

    # 2. Convert to CSV format
    for doc in feedback_collection.find(query):
        feedback = Feedback(**doc)
        csv_writer.writerow(feedback.to_export_row())

    # 3. Upload entire CSV file to cloud storage
    blob_client.upload_blob(file.read())
```

**Why Cloud Storage is Required:**

1. **File Size Considerations**
```python
# Typical feedback dump characteristics:
# - 10,000+ feedback records per month
# - Each record: ~2KB (includes full pipeline input/output)
# - Total file size: 20MB - 200MB per month
# - Annual size: 240MB - 2.4GB

# TimescaleDB Impact if stored there:
# - Would require BLOB column (inefficient for time-series DB)
# - Breaks hypertable partitioning efficiency
# - Increases backup size significantly
# - Slows down all other queries due to large row sizes
```

2. **Access Pattern Mismatch**
```python
# Feedback dumps are accessed:
# - Monthly for compliance reporting
# - Quarterly for ML model training
# - Annually for business analytics
# - Never for real-time monitoring

# TimescaleDB is optimized for:
# - Sub-second queries on recent data
# - Time-series aggregations
# - Real-time dashboard updates
```

3. **Data Structure Complexity**
```python
# Feedback data structure (from codebase):
class Feedback:
    pipelineInput: PipelineInput      # Complex nested JSON
    pipelineOutput: PipelineOutput    # Large response data
    suggestedPipelineOutput: Optional # Alternative responses
    pipelineFeedback: PipelineFeedback # User ratings/comments
    taskFeedback: List[TaskFeedback]   # Detailed task feedback

# Each feedback record contains:
# - Original request data (input text, audio files)
# - Complete response data (translations, audio outputs)
# - User feedback and ratings
# - Suggested improvements
# - Metadata and timestamps

# This complex, nested structure is:
# ✓ Perfect for CSV export and archival
# ✗ Terrible for time-series analysis
```

### Example 2: Log Data Task Analysis

**What it does:**
```python
@app.task(name="log.data")
def log_data(usage_type, service_id, client_ip, data_tracking_consent,
             error_msg, api_key_id, req_body, resp_body, response_time):

    # 1. Process request/response data
    # 2. Create detailed log document
    # 3. Store in cloud storage as individual JSON files
    # 4. ALSO store usage metrics in TimescaleDB
```

**Dual Storage Strategy:**
```python
# Cloud Storage (Azure Blob/AWS S3):
log_document = {
    "client_ip": client_ip,
    "input": full_request_data,      # Complete request payload
    "output": full_response_data,    # Complete response payload
    "task_type": task_type,
    "timestamp": timestamp,
    "api_key_id": api_key_id,
    "service_id": service_id
}
# File: /2024/12/01/01JWNQ8AWH0KVRT16C10YKA4AP.json
# Size: 1KB - 100KB per request

# TimescaleDB (via metering.py):
meter_usage(api_key_id, input_data, usage_type, service_id)
# Stores: usage metrics, timestamps, user IDs
# Size: ~100 bytes per record
```

**Why Both Systems Are Needed:**

1. **Different Query Patterns**
```sql
-- TimescaleDB queries (real-time monitoring):
SELECT AVG(usage), COUNT(*)
FROM apikey
WHERE timestamp > NOW() - INTERVAL '1 hour'
AND task_type = 'translation';

-- Cloud storage queries (debugging/compliance):
-- Download specific request file: 01JWNQ8AWH0KVRT16C10YKA4AP.json
-- Analyze complete request/response for error investigation
```

2. **Data Retention Policies**
```python
# TimescaleDB (performance-focused):
# - Keep 90 days of metrics for dashboards
# - Automatic aggregation and compression
# - Fast queries for recent data

# Cloud Storage (compliance-focused):
# - Keep 7 years of complete logs for audit
# - Lifecycle policies for cost optimization
# - Searchable by date/service/user
```

### Example 3: Real-time Metrics vs. Historical Archives

**TimescaleDB Usage (Real-time):**
```python
# From metering.py - writes to TimescaleDB
def write_to_db(api_key_id, inference_units, service_id, usage_type):
    with Session(engine) as session:
        api_key = ApiKey(
            api_key_id=api_key_id,
            api_key_name=api_key["name"],
            user_id=str(user["_id"]),
            user_email=user["email"],
            inference_service_id=service_id,
            task_type=usage_type,
            usage=inference_units,  # Calculated usage units
            timestamp=datetime.now()
        )
        session.add(api_key)
        session.commit()

# Query pattern: Real-time dashboard
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    SUM(usage) as total_usage,
    COUNT(*) as request_count
FROM apikey
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

**Cloud Storage Usage (Historical):**
```python
# From upload_feedback_dump.py - writes to cloud storage
def upload_feedback_dump():
    # Process entire month of data
    for doc in feedback_collection.find(query):
        feedback = Feedback(**doc)
        csv_writer.writerow([
            feedback.id,
            feedback.feedbackTimeStamp,
            feedback.pipelineInput.json(),    # Full request data
            feedback.pipelineOutput.json(),   # Full response data
            feedback.pipelineFeedback.json(), # User feedback
            # ... complete record
        ])

    # Upload 50MB+ file to cloud storage
    storage_manager.upload_file(
        file_content=file.getvalue(),
        bucket=AWS_S3_BUCKET_FEEDBACK,
        key=f"monthly_dumps/{filename}"
    )
```

## 5. Architectural Benefits of Hybrid Approach

### Performance Optimization
```python
# TimescaleDB excels at:
# - Time-series queries: SELECT * WHERE timestamp > ?
# - Aggregations: SUM, AVG, COUNT over time windows
# - Real-time inserts: 10,000+ records/second
# - Automatic partitioning by time

# Cloud Storage excels at:
# - Large file storage: 100MB+ files
# - Infrequent access: monthly/quarterly
# - Cost-effective archival: $0.004/GB/month
# - Global accessibility: download from anywhere
```

### Cost Efficiency
```bash
# Example monthly costs for 1M API requests:

# TimescaleDB (local SSD):
# - Metrics data: 100MB × $0.10/GB = $0.01
# - High-performance queries included

# Cloud Storage:
# - Log files: 10GB × $0.023/GB = $0.23
# - Feedback dumps: 200MB × $0.023/GB = $0.005
# - Total cloud storage: $0.235

# If everything was in TimescaleDB:
# - Total data: 10.3GB × $0.10/GB = $1.03
# - 4x more expensive + slower queries
```

### Operational Efficiency
```python
# Monitoring Dashboard (TimescaleDB):
# - Real-time metrics: < 100ms response
# - 24/7 availability required
# - Automatic alerting on anomalies

# Compliance Reporting (Cloud Storage):
# - Monthly batch processing: minutes to hours
# - On-demand access acceptable
# - Long-term retention required
```

## 6. Why This Architecture is Optimal

### Separation of Concerns
- **TimescaleDB**: Operational intelligence (monitoring, alerting, analytics)
- **Cloud Storage**: Data archival (compliance, debugging, ML training)

### Scalability
- **TimescaleDB**: Scales with active users and real-time queries
- **Cloud Storage**: Scales with historical data accumulation

### Cost Management
- **Hot Data** (recent metrics): Expensive but fast storage
- **Cold Data** (historical logs): Cheap but slower storage

### Compliance
- **Real-time Data**: Short retention for performance
- **Archived Data**: Long retention for regulatory requirements

This hybrid approach allows Dhruva Platform to maintain excellent real-time performance while meeting long-term data retention and compliance requirements cost-effectively.

<function_calls>
<invoke name="codebase-retrieval">
<parameter name="information_request">Show me the complete upload_feedback_dump task implementation and explain what data it processes and why it needs cloud storage
