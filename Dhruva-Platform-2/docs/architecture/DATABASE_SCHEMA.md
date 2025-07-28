# Dhruva Platform Server - Database Schema Documentation

## 📋 Overview

The Dhruva Platform uses a hybrid database architecture combining MongoDB for operational data and TimescaleDB for time-series analytics. This document provides comprehensive schema documentation for both databases.

## 🍃 MongoDB Schema

MongoDB serves as the primary operational database, storing user data, API keys, services, models, and application metadata.

### Database Configuration

```javascript
// Connection Details
Database Name: admin
Authentication: SCRAM-SHA-256
Replica Set: Single node (production should use replica set)
Storage Engine: WiredTiger
```

### Collections Overview

| Collection | Purpose | Document Count (Typical) | Indexes |
|------------|---------|---------------------------|---------|
| `users` | User account information | 1K - 10K | email, _id |
| `api_keys` | API key metadata and usage | 5K - 50K | api_key, user_id |
| `services` | Service configurations | 100 - 1K | serviceId |
| `models` | ML model metadata | 50 - 500 | modelId |
| `sessions` | User session data | 1K - 10K | user_id, timestamp |
| `feedback` | User feedback data | 10K - 100K | timestamp, service_id |

### Users Collection

Stores user account information and authentication data.

```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "$argon2id$v=19$m=65536,t=3,p=4$...", // Argon2 hash
  "role": "USER", // USER, ADMIN, SUPER_ADMIN
  "created_timestamp": ISODate("2024-01-01T00:00:00.000Z"),
  "last_login": ISODate("2024-01-15T10:30:00.000Z"),
  "email_verified": true,
  "is_active": true,
  "profile": {
    "organization": "Example Corp",
    "department": "Engineering",
    "phone": "+1-555-0123"
  },
  "preferences": {
    "language": "en",
    "timezone": "UTC",
    "notifications": {
      "email": true,
      "usage_alerts": true
    }
  },
  "metadata": {
    "registration_ip": "192.168.1.100",
    "last_login_ip": "192.168.1.101",
    "login_count": 45
  }
}
```

**Indexes:**
```javascript
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "role": 1 })
db.users.createIndex({ "is_active": 1 })
db.users.createIndex({ "created_timestamp": 1 })
```

### API Keys Collection

Stores API key metadata, usage statistics, and access control information.

```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "name": "Production API Key",
  "api_key": "dhruva_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
  "masked_key": "dhruva_abc***xyz234",
  "active": true,
  "user_id": ObjectId("507f1f77bcf86cd799439011"),
  "type": "INFERENCE", // INFERENCE, PLATFORM
  "created_timestamp": ISODate("2024-01-01T00:00:00.000Z"),
  "last_used": ISODate("2024-01-15T14:22:00.000Z"),
  "expires_at": ISODate("2025-01-01T00:00:00.000Z"), // Optional expiration
  "usage": 15000, // Total usage units consumed
  "hits": 500,    // Total API calls made
  "data_tracking": true,
  "services": [
    {
      "service_id": "ai4bharat/indictrans-v2-all-gpu",
      "usage": 8000,
      "hits": 200,
      "last_used": ISODate("2024-01-15T14:22:00.000Z")
    },
    {
      "service_id": "ai4bharat/conformer-hi-gpu",
      "usage": 7000,
      "hits": 300,
      "last_used": ISODate("2024-01-15T13:45:00.000Z")
    }
  ],
  "rate_limits": {
    "requests_per_minute": 60,
    "requests_per_hour": 1000,
    "requests_per_day": 10000
  },
  "permissions": {
    "allowed_services": ["*"], // "*" for all, or specific service IDs
    "allowed_tasks": ["translation", "asr", "tts"],
    "allowed_languages": ["*"] // "*" for all, or specific language codes
  },
  "metadata": {
    "created_by": ObjectId("507f1f77bcf86cd799439011"),
    "created_ip": "192.168.1.100",
    "description": "API key for production translation service"
  }
}
```

**Indexes:**
```javascript
db.api_keys.createIndex({ "api_key": 1 }, { unique: true })
db.api_keys.createIndex({ "user_id": 1, "active": 1 })
db.api_keys.createIndex({ "type": 1 })
db.api_keys.createIndex({ "created_timestamp": 1 })
db.api_keys.createIndex({ "last_used": 1 })
db.api_keys.createIndex({ "services.service_id": 1 })
```

### Services Collection

Stores service configurations, endpoints, and metadata.

```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "serviceId": "ai4bharat/indictrans-v2-all-gpu",
  "name": "IndicTrans2 Translation Service",
  "serviceDescription": "Neural machine translation for Indian languages using IndicTrans2 model",
  "hardwareDescription": "NVIDIA A100 GPU with 40GB VRAM",
  "publishedOn": NumberLong("1704067200000"), // Unix timestamp in milliseconds
  "modelId": "indictrans-v2-model-id",
  "endpoint": "https://inference.ai4bharat.org/translate",
  "api_key": "service_specific_api_key_here",
  "task": {
    "type": "translation"
  },
  "languages": [
    {
      "sourceLanguage": "en",
      "targetLanguage": "hi"
    },
    {
      "sourceLanguage": "hi",
      "targetLanguage": "en"
    },
    {
      "sourceLanguage": "en",
      "targetLanguage": "ta"
    }
  ],
  "healthStatus": {
    "status": "healthy", // healthy, unhealthy, unknown
    "lastUpdated": ISODate("2024-01-15T15:00:00.000Z"),
    "response_time_ms": 250,
    "error_rate": 0.01, // Percentage (0.01 = 1%)
    "uptime_percentage": 99.95
  },
  "benchmarks": {
    "translation": [
      {
        "language_pair": "en-hi",
        "dataset": "flores-200",
        "bleu_score": 42.5,
        "chrf_score": 65.8,
        "throughput_requests_per_minute": 100,
        "latency_p50_ms": 200,
        "latency_p95_ms": 500,
        "latency_p99_ms": 800
      }
    ]
  },
  "configuration": {
    "max_input_length": 5000,
    "supported_formats": ["text"],
    "batch_size": 32,
    "timeout_seconds": 30
  },
  "pricing": {
    "model": "pay_per_use",
    "cost_per_unit": 0.001, // Cost per inference unit
    "currency": "USD"
  },
  "metadata": {
    "created_by": ObjectId("507f1f77bcf86cd799439011"),
    "created_timestamp": ISODate("2024-01-01T00:00:00.000Z"),
    "updated_timestamp": ISODate("2024-01-15T15:00:00.000Z"),
    "version": "2.0.0",
    "tags": ["translation", "indian-languages", "neural-mt"]
  }
}
```

**Indexes:**
```javascript
db.services.createIndex({ "serviceId": 1 }, { unique: true })
db.services.createIndex({ "task.type": 1 })
db.services.createIndex({ "healthStatus.status": 1 })
db.services.createIndex({ "languages.sourceLanguage": 1, "languages.targetLanguage": 1 })
db.services.createIndex({ "publishedOn": 1 })
```

### Models Collection

Stores ML model metadata, configurations, and inference endpoints.

```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "modelId": "indictrans-v2-model-id",
  "version": "2.0.0",
  "submittedOn": NumberLong("1704067200000"),
  "updatedOn": NumberLong("1704153600000"),
  "name": "IndicTrans2",
  "description": "A neural machine translation model for Indian languages",
  "refUrl": "https://github.com/AI4Bharat/IndicTrans2",
  "task": {
    "type": "translation"
  },
  "languages": [
    {
      "sourceLanguage": "en",
      "targetLanguage": "hi",
      "script": {
        "sourceScript": "Latn",
        "targetScript": "Deva"
      }
    }
  ],
  "license": "MIT",
  "domain": ["general", "news", "social"],
  "inferenceEndPoint": {
    "callbackUrl": "https://inference.ai4bharat.org/translate",
    "schema": {
      "request": {
        "input": [
          {
            "source": "string"
          }
        ],
        "config": {
          "language": {
            "sourceLanguage": "string",
            "targetLanguage": "string"
          },
          "serviceId": "string"
        }
      },
      "response": {
        "output": [
          {
            "source": "string",
            "target": "string"
          }
        ],
        "config": {
          "language": {
            "sourceLanguage": "string",
            "targetLanguage": "string"
          }
        }
      }
    }
  },
  "benchmarks": [
    {
      "dataset": "flores-200",
      "metric": "BLEU",
      "score": 42.5,
      "language_pair": "en-hi"
    }
  ],
  "submitter": {
    "name": "AI4Bharat",
    "aboutMe": "AI4Bharat is a research lab focused on Indian language AI",
    "team": [
      {
        "name": "Dr. Mitesh Khapra",
        "role": "Principal Investigator"
      }
    ]
  },
  "metadata": {
    "model_size": "1.2B", // Number of parameters
    "training_data": "IndicCorp + other parallel corpora",
    "architecture": "Transformer",
    "framework": "PyTorch",
    "hardware_requirements": {
      "min_gpu_memory": "8GB",
      "recommended_gpu": "A100",
      "cpu_cores": 8,
      "ram": "32GB"
    }
  }
}
```

**Indexes:**
```javascript
db.models.createIndex({ "modelId": 1 }, { unique: true })
db.models.createIndex({ "task.type": 1 })
db.models.createIndex({ "languages.sourceLanguage": 1, "languages.targetLanguage": 1 })
db.models.createIndex({ "submittedOn": 1 })
db.models.createIndex({ "license": 1 })
```

### Sessions Collection

Stores user session data for authentication and tracking.

```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439015"),
  "user_id": ObjectId("507f1f77bcf86cd799439011"),
  "session_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "type": "web", // web, mobile, api
  "created_timestamp": ISODate("2024-01-15T10:00:00.000Z"),
  "last_activity": ISODate("2024-01-15T14:30:00.000Z"),
  "expires_at": ISODate("2024-01-16T10:00:00.000Z"),
  "is_active": true,
  "metadata": {
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "device_info": {
      "platform": "Windows",
      "browser": "Chrome",
      "version": "120.0.0.0"
    },
    "location": {
      "country": "India",
      "city": "Bangalore",
      "timezone": "Asia/Kolkata"
    }
  }
}
```

**Indexes:**
```javascript
db.sessions.createIndex({ "session_token": 1 }, { unique: true })
db.sessions.createIndex({ "user_id": 1, "is_active": 1 })
db.sessions.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 })
db.sessions.createIndex({ "created_timestamp": 1 })
```

### Feedback Collection

Stores user feedback and ratings for services and models.

```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439016"),
  "user_id": ObjectId("507f1f77bcf86cd799439011"),
  "api_key_id": ObjectId("507f1f77bcf86cd799439012"),
  "service_id": "ai4bharat/indictrans-v2-all-gpu",
  "model_id": "indictrans-v2-model-id",
  "request_id": "req_abc123def456", // Unique request identifier
  "timestamp": ISODate("2024-01-15T14:45:00.000Z"),
  "feedback_type": "quality", // quality, performance, bug_report, feature_request
  "rating": 4, // 1-5 scale
  "input_data": {
    "source_text": "Hello, how are you?",
    "source_language": "en",
    "target_language": "hi"
  },
  "output_data": {
    "target_text": "नमस्ते, आप कैसे हैं?",
    "confidence_score": 0.95
  },
  "feedback_details": {
    "accuracy": 5,
    "fluency": 4,
    "relevance": 4,
    "comments": "Good translation but could be more natural"
  },
  "metadata": {
    "response_time_ms": 250,
    "model_version": "2.0.0",
    "processing_node": "gpu-node-01"
  }
}
```

**Indexes:**
```javascript
db.feedback.createIndex({ "service_id": 1, "timestamp": 1 })
db.feedback.createIndex({ "user_id": 1, "timestamp": 1 })
db.feedback.createIndex({ "feedback_type": 1 })
db.feedback.createIndex({ "rating": 1 })
db.feedback.createIndex({ "timestamp": 1 })
```

## 🕐 TimescaleDB Schema

TimescaleDB serves as the analytics database for time-series data, usage metrics, and performance monitoring.

### Database Configuration

```sql
-- Database Details
Database Name: dhruva_metering
PostgreSQL Version: 15+
TimescaleDB Extension: 2.11+
Connection Pool: 20 connections
```

### Hypertables Overview

| Hypertable | Purpose | Partition Key | Retention |
|------------|---------|---------------|-----------|
| `api_key_usage` | API usage tracking | time | 1 year |
| `service_metrics` | Service performance | time | 6 months |
| `inference_logs` | Detailed request logs | time | 3 months |
| `system_metrics` | System performance | time | 1 month |

### API Key Usage Hypertable

Tracks detailed usage metrics for API keys across time.

```sql
CREATE TABLE api_key_usage (
    time TIMESTAMPTZ NOT NULL,
    api_key_id TEXT NOT NULL,
    api_key_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    inference_service_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    usage INTEGER NOT NULL,
    request_count INTEGER DEFAULT 1,
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    input_tokens INTEGER,
    output_tokens INTEGER,
    model_version TEXT,
    client_ip INET,
    user_agent TEXT,
    PRIMARY KEY (time, api_key_id, inference_service_id)
);

-- Convert to hypertable
SELECT create_hypertable('api_key_usage', 'time');

-- Create indexes for common queries
CREATE INDEX idx_api_key_usage_api_key_time ON api_key_usage (api_key_id, time DESC);
CREATE INDEX idx_api_key_usage_service_time ON api_key_usage (inference_service_id, time DESC);
CREATE INDEX idx_api_key_usage_user_time ON api_key_usage (user_id, time DESC);
CREATE INDEX idx_api_key_usage_task_type ON api_key_usage (task_type, time DESC);

-- Create continuous aggregates for hourly summaries
CREATE MATERIALIZED VIEW api_key_usage_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    api_key_id,
    api_key_name,
    user_id,
    inference_service_id,
    task_type,
    SUM(usage) as total_usage,
    SUM(request_count) as total_requests,
    SUM(error_count) as total_errors,
    AVG(response_time_ms) as avg_response_time,
    MAX(response_time_ms) as max_response_time,
    COUNT(*) as sample_count
FROM api_key_usage
GROUP BY bucket, api_key_id, api_key_name, user_id, inference_service_id, task_type;

-- Add refresh policy
SELECT add_continuous_aggregate_policy('api_key_usage_hourly',
    start_offset => INTERVAL '1 week',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

### Service Metrics Hypertable

Tracks service performance metrics and health status over time.

```sql
CREATE TABLE service_metrics (
    time TIMESTAMPTZ NOT NULL,
    service_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    metric_unit TEXT,
    tags JSONB,
    PRIMARY KEY (time, service_id, metric_name)
);

-- Convert to hypertable
SELECT create_hypertable('service_metrics', 'time');

-- Create indexes
CREATE INDEX idx_service_metrics_service_time ON service_metrics (service_id, time DESC);
CREATE INDEX idx_service_metrics_metric_time ON service_metrics (metric_name, time DESC);
CREATE INDEX idx_service_metrics_tags ON service_metrics USING GIN (tags);

-- Common metrics stored:
-- response_time_ms: Average response time
-- throughput_rps: Requests per second
-- error_rate: Error percentage
-- cpu_usage: CPU utilization percentage
-- memory_usage: Memory utilization percentage
-- queue_depth: Number of pending requests

-- Create continuous aggregate for service health dashboard
CREATE MATERIALIZED VIEW service_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    service_id,
    metric_name,
    AVG(metric_value) as avg_value,
    MAX(metric_value) as max_value,
    MIN(metric_value) as min_value,
    STDDEV(metric_value) as stddev_value,
    COUNT(*) as sample_count
FROM service_metrics
GROUP BY bucket, service_id, metric_name;
```

### Inference Logs Hypertable

Stores detailed logs of inference requests for debugging and analytics.

```sql
CREATE TABLE inference_logs (
    time TIMESTAMPTZ NOT NULL,
    request_id TEXT NOT NULL,
    api_key_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    input_size INTEGER,
    output_size INTEGER,
    response_time_ms INTEGER,
    status_code INTEGER,
    error_message TEXT,
    model_version TEXT,
    processing_node TEXT,
    client_info JSONB,
    PRIMARY KEY (time, request_id)
);

-- Convert to hypertable
SELECT create_hypertable('inference_logs', 'time');

-- Create indexes
CREATE INDEX idx_inference_logs_api_key ON inference_logs (api_key_id, time DESC);
CREATE INDEX idx_inference_logs_service ON inference_logs (service_id, time DESC);
CREATE INDEX idx_inference_logs_status ON inference_logs (status_code, time DESC);
CREATE INDEX idx_inference_logs_request_id ON inference_logs (request_id);

-- Create retention policy (keep logs for 3 months)
SELECT add_retention_policy('inference_logs', INTERVAL '3 months');
```

### System Metrics Hypertable

Tracks system-level performance metrics for infrastructure monitoring.

```sql
CREATE TABLE system_metrics (
    time TIMESTAMPTZ NOT NULL,
    hostname TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    metric_unit TEXT,
    component TEXT, -- api_server, celery_worker, database, cache
    PRIMARY KEY (time, hostname, metric_name)
);

-- Convert to hypertable
SELECT create_hypertable('system_metrics', 'time');

-- Create indexes
CREATE INDEX idx_system_metrics_hostname ON system_metrics (hostname, time DESC);
CREATE INDEX idx_system_metrics_component ON system_metrics (component, time DESC);

-- Common system metrics:
-- cpu_usage_percent: CPU utilization
-- memory_usage_percent: Memory utilization
-- disk_usage_percent: Disk utilization
-- network_bytes_in: Network input bytes
-- network_bytes_out: Network output bytes
-- active_connections: Number of active connections

-- Create retention policy (keep system metrics for 1 month)
SELECT add_retention_policy('system_metrics', INTERVAL '1 month');
```

## 🔧 Database Maintenance

### MongoDB Maintenance Scripts

```javascript
// Monthly maintenance script
function monthlyMaintenance() {
    // 1. Compact collections
    db.runCommand({compact: 'api_keys'});
    db.runCommand({compact: 'users'});
    db.runCommand({compact: 'services'});

    // 2. Rebuild indexes
    db.api_keys.reIndex();
    db.users.reIndex();
    db.services.reIndex();

    // 3. Clean up expired sessions
    db.sessions.deleteMany({
        expires_at: { $lt: new Date() }
    });

    // 4. Archive old feedback (older than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const oldFeedback = db.feedback.find({
        timestamp: { $lt: oneYearAgo }
    });

    // Archive to separate collection
    db.feedback_archive.insertMany(oldFeedback.toArray());
    db.feedback.deleteMany({
        timestamp: { $lt: oneYearAgo }
    });

    // 5. Update statistics
    db.runCommand({dbStats: 1});
}

// Weekly cleanup script
function weeklyCleanup() {
    // Clean up inactive API keys (not used in 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    db.api_keys.updateMany(
        {
            last_used: { $lt: sixMonthsAgo },
            active: true
        },
        {
            $set: {
                active: false,
                deactivated_reason: "inactive_6_months",
                deactivated_at: new Date()
            }
        }
    );

    // Clean up old sessions (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    db.sessions.deleteMany({
        last_activity: { $lt: thirtyDaysAgo }
    });
}
```

### TimescaleDB Maintenance Scripts

```sql
-- Daily maintenance procedure
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS void AS $$
BEGIN
    -- 1. Update table statistics
    ANALYZE api_key_usage;
    ANALYZE service_metrics;
    ANALYZE inference_logs;
    ANALYZE system_metrics;

    -- 2. Refresh continuous aggregates
    CALL refresh_continuous_aggregate('api_key_usage_hourly', NULL, NULL);
    CALL refresh_continuous_aggregate('service_metrics_hourly', NULL, NULL);

    -- 3. Compress old chunks (older than 7 days)
    PERFORM compress_chunk(i)
    FROM show_chunks('api_key_usage', older_than => INTERVAL '7 days') i;

    PERFORM compress_chunk(i)
    FROM show_chunks('service_metrics', older_than => INTERVAL '7 days') i;

    -- 4. Log maintenance completion
    INSERT INTO system_metrics (time, hostname, metric_name, metric_value, component)
    VALUES (NOW(), 'maintenance', 'daily_maintenance_completed', 1, 'database');
END;
$$ LANGUAGE plpgsql;

-- Weekly maintenance procedure
CREATE OR REPLACE FUNCTION weekly_maintenance()
RETURNS void AS $$
BEGIN
    -- 1. Vacuum and analyze all tables
    VACUUM ANALYZE api_key_usage;
    VACUUM ANALYZE service_metrics;
    VACUUM ANALYZE inference_logs;
    VACUUM ANALYZE system_metrics;

    -- 2. Reindex if needed
    REINDEX INDEX CONCURRENTLY idx_api_key_usage_api_key_time;
    REINDEX INDEX CONCURRENTLY idx_service_metrics_service_time;

    -- 3. Check chunk compression status
    SELECT chunk_schema, chunk_name, compression_status
    FROM timescaledb_information.chunks
    WHERE hypertable_name IN ('api_key_usage', 'service_metrics')
    ORDER BY chunk_name;

    -- 4. Update database statistics
    SELECT pg_stat_reset();
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance jobs
SELECT cron.schedule('daily-maintenance', '0 2 * * *', 'SELECT daily_maintenance();');
SELECT cron.schedule('weekly-maintenance', '0 3 * * 0', 'SELECT weekly_maintenance();');
```

## 📊 Performance Optimization

### MongoDB Optimization

```javascript
// Optimize query performance
db.api_keys.createIndex(
    { "user_id": 1, "active": 1, "last_used": 1 },
    { background: true }
);

// Partial index for active API keys only
db.api_keys.createIndex(
    { "api_key": 1 },
    {
        partialFilterExpression: { "active": true },
        background: true
    }
);

// Compound index for service queries
db.services.createIndex(
    { "task.type": 1, "healthStatus.status": 1, "publishedOn": 1 },
    { background: true }
);

// Text index for search functionality
db.services.createIndex(
    {
        "name": "text",
        "serviceDescription": "text",
        "metadata.tags": "text"
    },
    {
        weights: {
            "name": 10,
            "serviceDescription": 5,
            "metadata.tags": 1
        }
    }
);
```

### TimescaleDB Optimization

```sql
-- Optimize chunk size for better performance
SELECT set_chunk_time_interval('api_key_usage', INTERVAL '1 day');
SELECT set_chunk_time_interval('service_metrics', INTERVAL '1 day');

-- Create partial indexes for recent data
CREATE INDEX CONCURRENTLY idx_api_key_usage_recent
ON api_key_usage (api_key_id, time DESC)
WHERE time > NOW() - INTERVAL '30 days';

-- Optimize for time-range queries
CREATE INDEX CONCURRENTLY idx_service_metrics_time_range
ON service_metrics (service_id, metric_name, time DESC)
WHERE time > NOW() - INTERVAL '7 days';

-- Enable parallel query execution
SET max_parallel_workers_per_gather = 4;
SET parallel_tuple_cost = 0.1;
SET parallel_setup_cost = 1000;

-- Configure work memory for large aggregations
SET work_mem = '256MB';
SET maintenance_work_mem = '1GB';
```

## 🔍 Query Examples

### Common MongoDB Queries

```javascript
// Get user's active API keys with usage stats
db.api_keys.find({
    user_id: ObjectId("507f1f77bcf86cd799439011"),
    active: true
}).sort({ last_used: -1 });

// Find services by task type and health status
db.services.find({
    "task.type": "translation",
    "healthStatus.status": "healthy"
}).sort({ "benchmarks.translation.bleu_score": -1 });

// Get top users by API usage
db.api_keys.aggregate([
    { $match: { active: true } },
    { $group: {
        _id: "$user_id",
        total_usage: { $sum: "$usage" },
        total_hits: { $sum: "$hits" },
        api_key_count: { $sum: 1 }
    }},
    { $sort: { total_usage: -1 } },
    { $limit: 10 }
]);

// Find services with poor performance
db.services.find({
    $or: [
        { "healthStatus.response_time_ms": { $gt: 1000 } },
        { "healthStatus.error_rate": { $gt: 0.05 } },
        { "healthStatus.uptime_percentage": { $lt: 99.0 } }
    ]
});
```

### Common TimescaleDB Queries

```sql
-- Get hourly usage for a specific API key
SELECT
    time_bucket('1 hour', time) as hour,
    SUM(usage) as total_usage,
    SUM(request_count) as total_requests,
    AVG(response_time_ms) as avg_response_time
FROM api_key_usage
WHERE api_key_id = 'specific_api_key_id'
    AND time >= NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;

-- Get service performance metrics for the last week
SELECT
    time_bucket('1 hour', time) as hour,
    service_id,
    AVG(CASE WHEN metric_name = 'response_time_ms' THEN metric_value END) as avg_response_time,
    AVG(CASE WHEN metric_name = 'throughput_rps' THEN metric_value END) as avg_throughput,
    AVG(CASE WHEN metric_name = 'error_rate' THEN metric_value END) as avg_error_rate
FROM service_metrics
WHERE time >= NOW() - INTERVAL '7 days'
GROUP BY hour, service_id
ORDER BY hour, service_id;

-- Find top API keys by usage in the last month
SELECT
    api_key_id,
    api_key_name,
    user_email,
    SUM(usage) as total_usage,
    SUM(request_count) as total_requests,
    COUNT(DISTINCT inference_service_id) as services_used
FROM api_key_usage
WHERE time >= NOW() - INTERVAL '1 month'
GROUP BY api_key_id, api_key_name, user_email
ORDER BY total_usage DESC
LIMIT 20;

-- Analyze error patterns
SELECT
    time_bucket('1 day', time) as day,
    service_id,
    task_type,
    COUNT(*) as total_requests,
    SUM(error_count) as total_errors,
    (SUM(error_count)::float / COUNT(*) * 100) as error_percentage
FROM api_key_usage
WHERE time >= NOW() - INTERVAL '30 days'
GROUP BY day, service_id, task_type
HAVING SUM(error_count) > 0
ORDER BY day, error_percentage DESC;
```

---

*This database schema documentation provides comprehensive information for developers and database administrators working with the Dhruva Platform. Regular updates should be made as the schema evolves.*
```
