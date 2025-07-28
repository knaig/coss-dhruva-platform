# Database Layer

## 🗄️ Overview

The Dhruva Platform implements a sophisticated multi-database architecture designed for optimal performance, scalability, and data integrity. The system uses three specialized databases, each optimized for specific use cases and data patterns.

## 🏗️ Database Architecture

### Multi-Database Design

```mermaid
graph TD
    A[Application Layer] --> B[Database Abstraction Layer]
    
    B --> C[MongoDB]
    B --> D[TimescaleDB]
    B --> E[Redis]
    
    C --> F[User Management]
    C --> G[Service Registry]
    C --> H[API Keys]
    C --> I[Sessions]
    
    D --> J[Usage Metrics]
    D --> K[Performance Data]
    D --> L[Audit Logs]
    
    E --> M[Caching Layer]
    E --> N[Session Storage]
    E --> O[Rate Limiting]
```

### Database Roles & Responsibilities

| Database | Primary Use Case | Data Pattern | Performance Characteristics |
|----------|------------------|--------------|----------------------------|
| **MongoDB** | Application Data | Document-based, CRUD operations | High read/write performance, flexible schema |
| **TimescaleDB** | Time-Series Analytics | Time-ordered inserts, analytical queries | Optimized for time-series data, compression |
| **Redis** | Caching & Sessions | Key-value, temporary data | In-memory, ultra-fast access |

## 📊 MongoDB - Application Database

### Purpose & Use Cases
- **User Management**: User profiles, authentication data
- **Service Registry**: AI service and model definitions
- **API Key Management**: API key metadata and usage counters
- **Session Management**: User sessions and temporary data
- **Configuration**: Application settings and feature flags

### Collections Schema

#### Users Collection
```javascript
{
  "_id": ObjectId("user_id"),
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$argon2id$v=19$m=65536,t=3,p=4$...", // Argon2 hash
  "role": "CONSUMER", // ADMIN | CONSUMER
  "oauth_providers": [
    {
      "provider": "google",
      "provider_user_id": "google_user_id",
      "email": "john@gmail.com",
      "linked_at": ISODate("2023-01-01T00:00:00Z")
    }
  ],
  "profile": {
    "organization": "Example Corp",
    "phone": "+91-9876543210",
    "preferences": {
      "language": "en",
      "notifications": true
    }
  },
  "quota_limits": {
    "monthly_characters": 100000,
    "monthly_seconds": 7200,
    "concurrent_requests": 10
  },
  "created_at": ISODate("2023-01-01T00:00:00Z"),
  "updated_at": ISODate("2023-01-01T00:00:00Z"),
  "last_login": ISODate("2023-01-01T00:00:00Z"),
  "is_active": true
}
```

#### API Keys Collection
```javascript
{
  "_id": ObjectId("api_key_id"),
  "name": "Production Translation Key",
  "key": "$2b$12$...", // Bcrypt hash of actual key
  "user_id": ObjectId("user_id"),
  "type": "INFERENCE", // PLATFORM | INFERENCE
  "services": [
    {
      "service_id": "ai4bharat/indictrans--gpu-t4",
      "usage": 15420, // Total characters processed
      "hits": 342,    // Total API calls
      "last_used": ISODate("2023-01-01T00:00:00Z")
    }
  ],
  "rate_limits": {
    "requests_per_minute": 60,
    "characters_per_hour": 10000
  },
  "restrictions": {
    "allowed_ips": ["192.168.1.0/24"],
    "allowed_domains": ["example.com"],
    "expires_at": ISODate("2024-01-01T00:00:00Z")
  },
  "created_at": ISODate("2023-01-01T00:00:00Z"),
  "is_active": true
}
```

#### Services Collection
```javascript
{
  "_id": ObjectId("service_id"),
  "serviceId": "ai4bharat/indictrans--gpu-t4",
  "name": "IndicTrans Translation Service",
  "description": "Neural machine translation for Indian languages",
  "task": {
    "type": "translation"
  },
  "modelId": "ai4bharat/indictrans--gpu-t4",
  "status": {
    "type": "ACTIVE", // ACTIVE | INACTIVE | MAINTENANCE
    "message": "Service is running normally"
  },
  "pricing": {
    "unit": "character",
    "rate": 0.001,
    "currency": "USD"
  },
  "limits": {
    "max_input_length": 5000,
    "max_batch_size": 100,
    "timeout_seconds": 30
  },
  "languages": [
    {
      "sourceLanguage": "hi",
      "targetLanguage": "en",
      "quality_score": 0.95
    }
  ],
  "created_at": ISODate("2023-01-01T00:00:00Z"),
  "updated_at": ISODate("2023-01-01T00:00:00Z")
}
```

#### Models Collection
```javascript
{
  "_id": ObjectId("model_id"),
  "modelId": "ai4bharat/indictrans--gpu-t4",
  "name": "IndicTrans GPU T4",
  "version": "1.0.0",
  "description": "Transformer-based neural machine translation model",
  "task": {
    "type": "translation"
  },
  "languages": [
    {
      "sourceLanguage": "hi",
      "sourceScriptCode": "Deva",
      "targetLanguage": "en",
      "targetScriptCode": "Latn"
    }
  ],
  "inferenceEndPoint": {
    "callbackUrl": "https://api.dhruva.ai4bharat.org/inference/translation",
    "schema": {
      "request": {...},
      "response": {...}
    }
  },
  "benchmarks": [
    {
      "name": "BLEU Score",
      "score": "32.5",
      "dataset": "WMT Hindi-English"
    }
  ],
  "submitter": {
    "name": "AI4Bharat",
    "organization": "IIT Madras"
  },
  "license": "MIT",
  "domain": ["general", "news"],
  "created_at": ISODate("2023-01-01T00:00:00Z")
}
```

### Indexes & Performance

```javascript
// User collection indexes
db.user.createIndex({"email": 1}, {unique: true})
db.user.createIndex({"oauth_providers.provider_user_id": 1})
db.user.createIndex({"created_at": -1})

// API Key collection indexes
db.api_key.createIndex({"key": 1}, {unique: true})
db.api_key.createIndex({"user_id": 1})
db.api_key.createIndex({"services.service_id": 1})
db.api_key.createIndex({"created_at": -1})

// Service collection indexes
db.service.createIndex({"serviceId": 1}, {unique: true})
db.service.createIndex({"task.type": 1})
db.service.createIndex({"status.type": 1})

// Model collection indexes
db.model.createIndex({"modelId": 1}, {unique: true})
db.model.createIndex({"task.type": 1})
db.model.createIndex({"languages.sourceLanguage": 1, "languages.targetLanguage": 1})
```

## ⏰ TimescaleDB - Time-Series Database

### Purpose & Use Cases
- **Usage Metrics**: Detailed API usage tracking over time
- **Performance Monitoring**: Response times and system metrics
- **Audit Logging**: Security and compliance audit trails
- **Analytics**: Business intelligence and reporting

### Schema Design

#### API Key Usage Table
```sql
CREATE TABLE apikey (
    api_key_id TEXT NOT NULL,
    api_key_name TEXT,
    user_id TEXT NOT NULL,
    user_email TEXT,
    inference_service_id TEXT NOT NULL,
    task_type TEXT,
    usage FLOAT NOT NULL,
    request_data JSONB,
    response_data JSONB,
    response_time_ms INTEGER,
    client_ip INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (timestamp, api_key_id)
);

-- Create hypertable for time-series optimization
SELECT create_hypertable('apikey', 'timestamp');

-- Create indexes for common query patterns
CREATE INDEX idx_apikey_user_time ON apikey (user_id, timestamp DESC);
CREATE INDEX idx_apikey_service_time ON apikey (inference_service_id, timestamp DESC);
CREATE INDEX idx_apikey_success ON apikey (success, timestamp DESC);
```

#### System Metrics Table
```sql
CREATE TABLE system_metrics (
    metric_name TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    labels JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (timestamp, metric_name)
);

SELECT create_hypertable('system_metrics', 'timestamp');

CREATE INDEX idx_metrics_name_time ON system_metrics (metric_name, timestamp DESC);
```

### Time-Series Optimizations

```sql
-- Compression for older data
ALTER TABLE apikey SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'api_key_id, inference_service_id'
);

-- Automatic compression policy (compress data older than 7 days)
SELECT add_compression_policy('apikey', INTERVAL '7 days');

-- Data retention policy (delete data older than 1 year)
SELECT add_retention_policy('apikey', INTERVAL '1 year');

-- Continuous aggregates for common queries
CREATE MATERIALIZED VIEW daily_usage_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 day', timestamp) AS day,
    user_id,
    inference_service_id,
    COUNT(*) as requests,
    SUM(usage) as total_usage,
    AVG(response_time_ms) as avg_response_time
FROM apikey
GROUP BY day, user_id, inference_service_id;

-- Refresh policy for continuous aggregates
SELECT add_continuous_aggregate_policy('daily_usage_summary',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

## 🚀 Redis - Caching & Session Store

### Purpose & Use Cases
- **API Key Caching**: Fast lookup of API key metadata
- **Session Management**: User session storage
- **Rate Limiting**: Request rate tracking
- **Temporary Data**: Short-lived application data

### Data Structures

#### API Key Cache
```redis
# API key metadata cache (TTL: 1 hour)
HSET api_key:680b368070069bee045b210c 
     "user_id" "user_123"
     "type" "INFERENCE"
     "is_active" "true"
     "rate_limit" "60"

EXPIRE api_key:680b368070069bee045b210c 3600
```

#### User Sessions
```redis
# User session data (TTL: 24 hours)
HSET session:session_token_123
     "user_id" "user_123"
     "role" "CONSUMER"
     "login_time" "2023-01-01T00:00:00Z"
     "last_activity" "2023-01-01T12:00:00Z"

EXPIRE session:session_token_123 86400
```

#### Rate Limiting
```redis
# Rate limiting counters (TTL: 1 minute)
INCR rate_limit:api_key_123:minute:1672531200
EXPIRE rate_limit:api_key_123:minute:1672531200 60

# Sliding window rate limiting
ZADD rate_limit:api_key_123:requests 1672531200 "request_id_1"
ZREMRANGEBYSCORE rate_limit:api_key_123:requests 0 (1672531140)
```

### Redis Configuration

```redis
# redis.conf optimizations
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# Persistence for session data
appendonly yes
appendfsync everysec
```

## 🔧 Database Connections & Configuration

### Connection Management

```python
# MongoDB connection
import pymongo
from pymongo.database import Database

class MongoDBManager:
    def __init__(self):
        self.client = pymongo.MongoClient(
            os.environ["APP_DB_CONNECTION_STRING"],
            maxPoolSize=50,
            minPoolSize=10,
            maxIdleTimeMS=30000,
            serverSelectionTimeoutMS=5000
        )
        
    def get_database(self) -> Database:
        return self.client[os.environ["APP_DB_NAME"]]

# TimescaleDB connection
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

class TimescaleDBManager:
    def __init__(self):
        connection_string = f"postgresql://{os.environ['TIMESCALE_USER']}:" \
                          f"{os.environ['TIMESCALE_PASSWORD']}@" \
                          f"{os.environ['TIMESCALE_HOST']}:" \
                          f"{os.environ['TIMESCALE_PORT']}/" \
                          f"{os.environ['TIMESCALE_DATABASE_NAME']}"
        
        self.engine = create_engine(
            connection_string,
            pool_size=20,
            max_overflow=30,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )

# Redis connection
import redis

class RedisManager:
    def __init__(self):
        self.client = redis.Redis(
            host=os.environ["REDIS_HOST"],
            port=int(os.environ["REDIS_PORT"]),
            password=os.environ["REDIS_PASSWORD"],
            decode_responses=True,
            max_connections=50,
            socket_keepalive=True,
            socket_keepalive_options={}
        )
```

### Environment Configuration

```bash
# MongoDB Configuration
MONGO_APP_DB_USERNAME=dhruvaadmin
MONGO_APP_DB_PASSWORD=dhruva123
APP_DB_NAME=admin
APP_DB_CONNECTION_STRING=mongodb://dhruvaadmin:dhruva123@dhruva-platform-app-db:27017/admin

# TimescaleDB Configuration
TIMESCALE_HOST=dhruva-platform-timescaledb
TIMESCALE_PORT=5432
TIMESCALE_USER=dhruva
TIMESCALE_PASSWORD=dhruva123
TIMESCALE_DATABASE_NAME=dhruva_metering

# Redis Configuration
REDIS_HOST=dhruva-platform-redis
REDIS_PORT=6379
REDIS_PASSWORD=dhruva123
```

## 🔄 Data Migration & Versioning

### MongoDB Migrations

```python
# migrations/20230101_add_oauth_providers.py
from mongodb_migrations.base import BaseMigration

class Migration(BaseMigration):
    def upgrade(self):
        # Add oauth_providers field to existing users
        self.db.user.update_many(
            {"oauth_providers": {"$exists": False}},
            {"$set": {"oauth_providers": []}}
        )
        
        # Create index for OAuth lookups
        self.db.user.create_index("oauth_providers.provider_user_id")
        
    def downgrade(self):
        # Remove oauth_providers field
        self.db.user.update_many(
            {},
            {"$unset": {"oauth_providers": ""}}
        )
```

### TimescaleDB Migrations

```sql
-- migrations/001_create_apikey_table.sql
CREATE TABLE IF NOT EXISTS apikey (
    api_key_id TEXT NOT NULL,
    api_key_name TEXT,
    user_id TEXT NOT NULL,
    user_email TEXT,
    inference_service_id TEXT NOT NULL,
    task_type TEXT,
    usage FLOAT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (timestamp, api_key_id)
);

SELECT create_hypertable('apikey', 'timestamp', if_not_exists => TRUE);
```

## 📊 Monitoring & Performance

### Database Health Checks

```bash
# MongoDB health check
docker exec dhruva-platform-app-db mongosh \
  --username dhruvaadmin --password dhruva123 \
  --authenticationDatabase admin admin \
  --eval "db.runCommand('ping')"

# TimescaleDB health check
docker exec -it dhruva-platform-timescaledb \
  psql -U dhruva -d dhruva_metering \
  -c "SELECT 1;"

# Redis health check
docker exec dhruva-platform-redis redis-cli ping
```

### Performance Monitoring

```sql
-- TimescaleDB query performance
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%apikey%'
ORDER BY total_time DESC
LIMIT 10;

-- Check compression status
SELECT 
    hypertable_name,
    compression_status,
    uncompressed_heap_size,
    compressed_heap_size
FROM timescaledb_information.compression_settings;
```

```javascript
// MongoDB performance monitoring
db.runCommand({
  "collStats": "api_key",
  "indexDetails": true
})

// Check slow operations
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

## 🛠️ Backup & Recovery

### Automated Backup Strategy

```bash
#!/bin/bash
# backup_databases.sh

# MongoDB backup
docker exec dhruva-platform-app-db mongodump \
  --username dhruvaadmin --password dhruva123 \
  --authenticationDatabase admin \
  --out /backup/mongodb_$(date +%Y%m%d_%H%M%S)

# TimescaleDB backup
docker exec dhruva-platform-timescaledb pg_dump \
  -U dhruva dhruva_metering \
  > /backup/timescaledb_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
docker exec dhruva-platform-redis redis-cli BGSAVE
```

### Recovery Procedures

```bash
# MongoDB restore
docker exec dhruva-platform-app-db mongorestore \
  --username dhruvaadmin --password dhruva123 \
  --authenticationDatabase admin \
  /backup/mongodb_backup_directory

# TimescaleDB restore
docker exec -i dhruva-platform-timescaledb psql \
  -U dhruva dhruva_metering < backup_file.sql

# Redis restore
docker cp backup.rdb dhruva-platform-redis:/data/dump.rdb
docker restart dhruva-platform-redis
```

## 🔍 Troubleshooting

### Common Issues

1. **Connection Timeouts**: Check network connectivity and connection pool settings
2. **Slow Queries**: Analyze query patterns and add appropriate indexes
3. **Memory Issues**: Monitor Redis memory usage and configure eviction policies
4. **Disk Space**: Monitor TimescaleDB compression and retention policies

### Debug Commands

```bash
# Check database connections
docker logs dhruva-platform-server | grep -i "database\|connection"

# Monitor active connections
docker exec dhruva-platform-app-db mongosh \
  --eval "db.serverStatus().connections"

# Check TimescaleDB locks
docker exec dhruva-platform-timescaledb psql -U dhruva -d dhruva_metering \
  -c "SELECT * FROM pg_locks WHERE NOT granted;"
```
