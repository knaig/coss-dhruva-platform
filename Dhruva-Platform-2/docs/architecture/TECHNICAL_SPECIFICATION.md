# Dhruva Platform Server - Technical Specification

## 📋 Executive Summary

This document provides detailed technical specifications for the Dhruva Platform server architecture, including component interactions, data models, API specifications, and deployment requirements.

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Layer  │    │  Proxy Layer    │    │ Application     │
│                 │    │                 │    │ Layer           │
│ • Web Client    │───▶│ • Nginx         │───▶│ • FastAPI       │
│ • API Client    │    │ • Load Balancer │    │ • Socket.IO     │
│ • Socket Client │    │ • SSL Term.     │    │ • Auth System   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │ Message Queue   │◀────────────┘
                       │                 │
                       │ • RabbitMQ      │
                       │ • Celery        │
                       │ • Task Routing  │
                       └─────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Data Layer  │    │ Cache Layer │    │ External    │
│             │    │             │    │ Services    │
│ • MongoDB   │    │ • Redis     │    │ • Triton    │
│ • TimescaleDB│    │ • Sessions  │    │ • Prometheus│
│ • Blob Store│    │ • API Keys  │    │ • Grafana   │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Component Specifications

#### FastAPI Application Server

**Technology Stack:**
- **Framework**: FastAPI 0.93.0
- **ASGI Server**: Uvicorn 0.20.0
- **Python Version**: 3.10.12
- **Deployment**: Docker containerized

**Key Features:**
- Automatic OpenAPI documentation generation
- Built-in request/response validation
- Dependency injection system
- Middleware pipeline for cross-cutting concerns
- WebSocket support for real-time communication

**Performance Characteristics:**
- **Concurrent Requests**: 1000+ (with proper scaling)
- **Response Time**: <500ms P95 for inference requests
- **Memory Usage**: ~512MB base + model cache
- **CPU Usage**: Variable based on inference load

#### Message Queue System (RabbitMQ + Celery)

**RabbitMQ Configuration:**
```yaml
Version: 3.11+
Management Plugin: Enabled
Virtual Host: dhruva_host
Default User: admin/admin123
Persistence: Enabled
Clustering: Single node (scalable to cluster)
```

**Exchange & Queue Topology:**
```python
Exchanges:
  - logs (direct): Routes data logging tasks
  - metrics (direct): Routes metrics collection tasks  
  - heartbeat (direct): Routes health check tasks
  - upload-feedback-dump (direct): Routes feedback tasks
  - send-usage-email (direct): Routes email tasks

Queues:
  - data-log: Processes request/response logging
  - metrics-log: Processes Prometheus metrics
  - heartbeat: Processes service health checks
  - upload-feedback-dump: Processes monthly feedback dumps
  - send-usage-email: Processes weekly usage emails
```

**Celery Worker Configuration:**
```python
Concurrency: 4 workers per container
Task Routing: Queue-based routing
Serialization: JSON (default)
Result Backend: Redis
Task Time Limit: 300 seconds
Task Soft Time Limit: 240 seconds
Worker Prefetch Multiplier: 1
```

#### Database Systems

**MongoDB (Primary Database)**
```yaml
Version: 6.0+
Storage Engine: WiredTiger
Authentication: SCRAM-SHA-256
Replica Set: Single node (production should use replica set)
Collections:
  - users: User account information
  - api_keys: API key metadata and usage
  - services: Service configurations
  - models: ML model metadata
  - feedback: User feedback data
  - sessions: User session data
```

**TimescaleDB (Analytics Database)**
```yaml
Version: 2.11+ (PostgreSQL 15)
Extensions: TimescaleDB, pg_stat_statements
Hypertables:
  - api_key_usage: Time-series usage data
  - service_metrics: Service performance metrics
  - inference_logs: Inference request logs
Retention Policy: 1 year (configurable)
Compression: Enabled for data older than 7 days
```

**Redis (Cache & Session Store)**
```yaml
Version: 7.0+
Memory Policy: allkeys-lru
Max Memory: 2GB (configurable)
Persistence: RDB snapshots + AOF
Data Structures:
  - Hash: API key cache, service cache, model cache
  - String: Session tokens, temporary data
  - Set: Rate limiting counters
  - Sorted Set: Leaderboards, rankings
```

## 🔧 Component Deep Dive

### Authentication & Authorization System

#### API Key Authentication Flow

```python
class ApiKeyAuthFlow:
    """
    1. Extract API key from Authorization header
    2. Check Redis cache for API key metadata
    3. If cache miss, query MongoDB and populate cache
    4. Validate API key status (active, not expired)
    5. Check API key type permissions for endpoint
    6. Populate request context with API key data
    7. Proceed to business logic
    """
    
    def authenticate(self, request: Request) -> ApiKeyData:
        api_key = self.extract_api_key(request)
        
        # Cache-first lookup
        try:
            api_key_data = ApiKeyCache.get(api_key)
        except NotFoundError:
            # Cache miss - query database
            api_key_data = self.populate_api_key_cache(api_key)
        
        self.validate_api_key(api_key_data)
        return api_key_data
```

#### JWT Token Authentication Flow

```python
class JWTAuthFlow:
    """
    1. Extract JWT token from Authorization header
    2. Verify token signature and expiration
    3. Extract user claims from token payload
    4. Validate user status and permissions
    5. Populate request context with user data
    6. Proceed to business logic
    """
    
    def authenticate(self, request: Request) -> UserData:
        token = self.extract_jwt_token(request)
        payload = jwt.decode(token, self.secret_key, algorithms=["HS256"])
        
        user_data = self.get_user_data(payload["user_id"])
        self.validate_user_permissions(user_data, request.url.path)
        return user_data
```

### Inference Service Architecture

#### Service Discovery & Caching

```python
class ServiceDiscovery:
    """
    Service metadata caching strategy:
    1. Check ServiceCache for service configuration
    2. If cache miss, query MongoDB services collection
    3. Transform service document to cache model
    4. Store in Redis with no expiration (manual invalidation)
    5. Return service configuration for inference
    """
    
    def get_service_config(self, service_id: str) -> ServiceConfig:
        try:
            service = ServiceCache.get(service_id)
        except NotFoundError:
            service = self.populate_service_cache(service_id)
        
        return ServiceConfig(**service.dict())
```

#### Inference Request Processing

```python
class InferenceProcessor:
    """
    Inference request lifecycle:
    1. Validate request schema and parameters
    2. Resolve service configuration from cache
    3. Prepare request for external inference server
    4. Send HTTP request to Triton/external service
    5. Process and validate response
    6. Apply post-processing transformations
    7. Return formatted response to client
    8. Queue logging task asynchronously
    """
    
    async def process_inference(self, request: InferenceRequest) -> InferenceResponse:
        # Service resolution
        service = self.service_discovery.get_service_config(request.service_id)
        
        # External service call
        response = await self.gateway.send_request(service, request)
        
        # Post-processing
        processed_response = self.post_processor.process(response, request.config)
        
        # Async logging
        self.queue_logging_task(request, processed_response)
        
        return processed_response
```

### Task Processing System

#### Log Data Task Implementation

```python
@app.task(name="log.data")
def log_data(usage_type: str, service_id: str, client_ip: str, 
             data_tracking_consent: bool, error_msg: str, 
             api_key_id: str, req_body: str, resp_body: str, 
             response_time: float) -> None:
    """
    Data logging task processing:
    1. Parse request and response JSON
    2. Calculate usage metrics based on task type
    3. Store request/response data (if consent given)
    4. Update API key usage counters in MongoDB
    5. Write time-series data to TimescaleDB
    6. Handle errors gracefully with retries
    """
    
    # Parse JSON data
    req_data = json.loads(req_body)
    resp_data = json.loads(resp_body) if resp_body else {}
    
    # Calculate usage based on task type
    if usage_type == "asr":
        usage = calculate_asr_usage(req_data["audio"])
    elif usage_type in ("translation", "transliteration"):
        usage = calculate_translation_usage(req_data["input"])
    elif usage_type == "tts":
        usage = calculate_tts_usage(req_data["input"])
    
    # Store data and update metrics
    if data_tracking_consent:
        log_to_storage(client_ip, error_msg, req_data, resp_data, api_key_id, service_id)
    
    meter_usage(api_key_id, usage, usage_type, service_id)
```

#### Usage Metering Implementation

```python
def meter_usage(api_key_id: str, input_data: List, usage_type: str, service_id: str):
    """
    Usage metering and billing:
    1. Calculate inference units based on input data
    2. Update MongoDB API key usage counters
    3. Write time-series data to TimescaleDB
    4. Handle both ObjectId and string API key formats
    """
    
    # Calculate usage units
    if usage_type == "asr":
        inference_units = calculate_asr_usage(input_data)
    elif usage_type in ("translation", "transliteration"):
        inference_units = calculate_translation_usage(input_data)
    elif usage_type == "tts":
        inference_units = calculate_tts_usage(input_data)
    
    # Update databases
    write_to_db(api_key_id, inference_units, service_id, usage_type)
```

### Caching Strategy Implementation

#### Cache Model Generation

```python
def generate_cache_model(cls, primary_key_field: str):
    """
    Dynamic cache model generation:
    1. Iterate through MongoDB model fields
    2. Filter out unsupported Redis types
    3. Convert complex types to simple types
    4. Generate Redis-OM field definitions
    5. Return model definition dictionary
    """
    
    model_definition = {}
    for key, value in cls.__fields__.items():
        if key not in EXCLUDED_FIELDS:
            if value.type_ == ObjectId:
                field = {key: (str, RedisField(...))}
            elif key == primary_key_field:
                field = {key: (str, RedisField(..., primary_key=True))}
            elif value.type_ in ACCEPTED_FIELD_TYPES:
                field = {key: (value.type_, RedisField(...))}
            else:
                continue  # Skip unsupported types
        
        model_definition.update(field)
    return model_definition
```

#### Cache Population Strategy

```python
class CacheManager:
    """
    Cache population and invalidation:
    1. Lazy loading: Populate on first access
    2. Write-through: Update cache on data modification
    3. Cache invalidation: Remove stale data on updates
    4. Startup warming: Pre-populate critical data
    """
    
    def populate_cache(self, model_class, primary_key: str):
        # Query database
        data = self.repository.get_by_id(primary_key)
        
        # Transform to cache model
        cache_data = self.transform_for_cache(data)
        
        # Store in Redis
        cache_model = model_class(**cache_data)
        cache_model.save()
        
        return cache_model
    
    def invalidate_cache(self, model_class, primary_key: str):
        try:
            model_class.delete(primary_key)
        except NotFoundError:
            pass  # Already deleted or never cached
```

## 📊 Performance Specifications

### Throughput Requirements

| Component | Metric | Target | Measurement |
|-----------|--------|--------|-------------|
| **API Gateway** | Requests/second | 1000+ | Load testing |
| **Inference Processing** | Concurrent requests | 100+ | Stress testing |
| **Task Queue** | Tasks/minute | 10,000+ | Queue monitoring |
| **Database Queries** | Queries/second | 5000+ | Database metrics |
| **Cache Operations** | Operations/second | 50,000+ | Redis metrics |

### Latency Requirements

| Operation | Target Latency | P95 Latency | P99 Latency |
|-----------|----------------|-------------|-------------|
| **API Authentication** | <50ms | <100ms | <200ms |
| **Cache Lookup** | <5ms | <10ms | <20ms |
| **Database Query** | <100ms | <200ms | <500ms |
| **Inference Request** | <2000ms | <5000ms | <10000ms |
| **Task Processing** | <1000ms | <2000ms | <5000ms |

### Resource Requirements

#### Minimum System Requirements

```yaml
CPU: 4 cores (2.4GHz+)
Memory: 8GB RAM
Storage: 100GB SSD
Network: 1Gbps
```

#### Recommended Production Requirements

```yaml
CPU: 8 cores (3.0GHz+)
Memory: 16GB RAM
Storage: 500GB NVMe SSD
Network: 10Gbps
Load Balancer: Yes
Monitoring: Full stack monitoring
Backup: Automated daily backups
```

#### Container Resource Limits

```yaml
FastAPI Server:
  CPU: 2 cores
  Memory: 4GB
  Storage: 10GB

Celery Workers:
  CPU: 1 core per worker
  Memory: 2GB per worker
  Storage: 5GB

Redis Cache:
  CPU: 1 core
  Memory: 2GB
  Storage: 10GB

MongoDB:
  CPU: 2 cores
  Memory: 4GB
  Storage: 100GB

TimescaleDB:
  CPU: 2 cores
  Memory: 4GB
  Storage: 200GB
```

## 🔌 API Specifications

### Authentication Endpoints

#### API Key Management

```http
POST /auth/api-keys
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "name": "My API Key",
  "type": "INFERENCE",
  "services": ["service-1", "service-2"],
  "data_tracking": true
}

Response:
{
  "api_key": "dhruva_abc123...",
  "masked_key": "dhruva_abc***",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### User Authentication

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Inference Endpoints

#### Translation Service

```http
POST /services/inference/translation?serviceId=ai4bharat/indictrans-v2-all-gpu
Content-Type: application/json
Authorization: <api_key>

{
  "input": [
    {
      "source": "Hello, how are you?"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "en",
      "targetLanguage": "hi"
    },
    "serviceId": "ai4bharat/indictrans-v2-all-gpu"
  }
}

Response:
{
  "output": [
    {
      "source": "Hello, how are you?",
      "target": "नमस्ते, आप कैसे हैं?"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "en",
      "targetLanguage": "hi"
    }
  }
}
```

#### ASR (Automatic Speech Recognition)

```http
POST /services/inference/asr?serviceId=ai4bharat/conformer-hi-gpu
Content-Type: application/json
Authorization: <api_key>

{
  "audio": [
    {
      "audioContent": "base64_encoded_audio_data"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "hi"
    },
    "serviceId": "ai4bharat/conformer-hi-gpu",
    "audioFormat": "wav",
    "samplingRate": 16000
  }
}

Response:
{
  "output": [
    {
      "source": "नमस्ते, मैं ठीक हूँ"
    }
  ],
  "config": {
    "language": {
      "sourceLanguage": "hi"
    }
  }
}
```

### Administrative Endpoints

#### Service Management

```http
GET /services/details/list_services
Authorization: <admin_api_key>

Response:
[
  {
    "serviceId": "ai4bharat/indictrans-v2-all-gpu",
    "name": "IndicTrans2 Translation Service",
    "task": {
      "type": "translation"
    },
    "languages": [
      {"sourceLanguage": "en", "targetLanguage": "hi"},
      {"sourceLanguage": "hi", "targetLanguage": "en"}
    ],
    "healthStatus": {
      "status": "healthy",
      "lastUpdated": "2024-01-01T00:00:00Z"
    }
  }
]
```

#### Usage Analytics

```http
GET /services/admin/usage?api_key_id=<api_key_id>&start_date=2024-01-01&end_date=2024-01-31
Authorization: <admin_api_key>

Response:
{
  "total_requests": 1500,
  "total_usage_units": 45000,
  "breakdown_by_service": {
    "translation": {
      "requests": 800,
      "usage_units": 24000
    },
    "asr": {
      "requests": 700,
      "usage_units": 21000
    }
  },
  "daily_usage": [
    {
      "date": "2024-01-01",
      "requests": 50,
      "usage_units": 1500
    }
  ]
}
```

## 🔄 Data Models

### MongoDB Collections

#### Users Collection

```javascript
{
  "_id": ObjectId("..."),
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$argon2id$v=19$m=65536,t=3,p=4$...", // Argon2 hash
  "role": "USER", // USER, ADMIN, SUPER_ADMIN
  "created_timestamp": ISODate("2024-01-01T00:00:00Z"),
  "last_login": ISODate("2024-01-01T00:00:00Z"),
  "email_verified": true,
  "is_active": true
}
```

#### API Keys Collection

```javascript
{
  "_id": ObjectId("..."),
  "name": "Production API Key",
  "api_key": "dhruva_abc123def456...",
  "masked_key": "dhruva_abc***def***",
  "active": true,
  "user_id": ObjectId("..."),
  "type": "INFERENCE", // INFERENCE, PLATFORM
  "created_timestamp": ISODate("2024-01-01T00:00:00Z"),
  "usage": 15000, // Total usage units
  "hits": 500,    // Total API calls
  "data_tracking": true,
  "services": [
    {
      "service_id": "ai4bharat/indictrans-v2-all-gpu",
      "usage": 8000,
      "hits": 200
    }
  ],
  "rate_limit": {
    "requests_per_minute": 60,
    "requests_per_hour": 1000
  }
}
```

#### Services Collection

```javascript
{
  "_id": ObjectId("..."),
  "serviceId": "ai4bharat/indictrans-v2-all-gpu",
  "name": "IndicTrans2 Translation Service",
  "serviceDescription": "Neural machine translation for Indian languages",
  "hardwareDescription": "NVIDIA A100 GPU",
  "publishedOn": 1704067200000, // Unix timestamp
  "modelId": "indictrans-v2-model-id",
  "endpoint": "https://inference.ai4bharat.org/translate",
  "api_key": "service_specific_api_key",
  "healthStatus": {
    "status": "healthy", // healthy, unhealthy, unknown
    "lastUpdated": "2024-01-01T00:00:00Z",
    "response_time": 250, // milliseconds
    "error_rate": 0.01    // percentage
  },
  "benchmarks": {
    "translation": [
      {
        "language_pair": "en-hi",
        "bleu_score": 42.5,
        "throughput": 100, // requests per minute
        "latency_p95": 500 // milliseconds
      }
    ]
  }
}
```

### TimescaleDB Tables

#### API Key Usage (Hypertable)

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
    PRIMARY KEY (time, api_key_id)
);

-- Convert to hypertable
SELECT create_hypertable('api_key_usage', 'time');

-- Create indexes for common queries
CREATE INDEX idx_api_key_usage_api_key_time ON api_key_usage (api_key_id, time DESC);
CREATE INDEX idx_api_key_usage_service_time ON api_key_usage (inference_service_id, time DESC);
CREATE INDEX idx_api_key_usage_user_time ON api_key_usage (user_id, time DESC);
```

#### Service Metrics (Hypertable)

```sql
CREATE TABLE service_metrics (
    time TIMESTAMPTZ NOT NULL,
    service_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    tags JSONB,
    PRIMARY KEY (time, service_id, metric_name)
);

-- Convert to hypertable
SELECT create_hypertable('service_metrics', 'time');

-- Create continuous aggregates for common queries
CREATE MATERIALIZED VIEW service_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    service_id,
    metric_name,
    AVG(metric_value) as avg_value,
    MAX(metric_value) as max_value,
    MIN(metric_value) as min_value,
    COUNT(*) as sample_count
FROM service_metrics
GROUP BY bucket, service_id, metric_name;
```

### Redis Cache Structures

#### API Key Cache

```redis
# Hash structure for API key metadata
HSET dhruva:ApiKeyCache:dhruva_abc123def456
     "id" "507f1f77bcf86cd799439011"
     "name" "Production API Key"
     "active" "true"
     "user_id" "507f1f77bcf86cd799439012"
     "type" "INFERENCE"
     "data_tracking" "true"
     "usage" "15000"
     "hits" "500"

# TTL: No expiration (manual invalidation)
```

#### Service Cache

```redis
# Hash structure for service metadata
HSET dhruva:ServiceCache:ai4bharat/indictrans-v2-all-gpu
     "id" "507f1f77bcf86cd799439013"
     "name" "IndicTrans2 Translation Service"
     "endpoint" "https://inference.ai4bharat.org/translate"
     "api_key" "service_specific_api_key"
     "task_type" "translation"

# TTL: No expiration (manual invalidation)
```

#### Session Cache

```redis
# String structure for JWT sessions
SET dhruva:session:eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9
    "507f1f77bcf86cd799439012"
    EX 3600  # 1 hour expiration
```

## 🚀 Deployment Specifications

### Container Orchestration

#### Docker Compose Configuration

```yaml
version: '3.8'

services:
  server:
    image: dhruva-platform-server:latest
    container_name: dhruva-platform-server
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      - PYTHONPATH=/src
      - ENV=production
    env_file: .env
    command: >
      sh -c "python migrate.py &&
             python -m uvicorn main:app
             --host 0.0.0.0
             --port 8000
             --workers 4
             --worker-class uvicorn.workers.UvicornWorker"
    ports:
      - "8000:8000"
    depends_on:
      redis:
        condition: service_healthy
      app_db:
        condition: service_healthy
      rabbitmq_server:
        condition: service_started
      timescaledb:
        condition: service_healthy
    networks:
      - dhruva-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  celery-worker:
    image: dhruva-platform-server:latest
    container_name: dhruva-platform-celery-worker
    env_file: .env
    command: >
      celery -A celery_backend.celery_app worker
      --loglevel=info
      --concurrency=4
      --queues=data-log,metrics-log,heartbeat,upload-feedback-dump,send-usage-email
    depends_on:
      - rabbitmq_server
      - redis
      - app_db
      - timescaledb
    networks:
      - dhruva-network
    restart: unless-stopped

  celery-beat:
    image: dhruva-platform-server:latest
    container_name: dhruva-platform-celery-beat
    env_file: .env
    command: >
      celery -A celery_backend.celery_app beat
      --loglevel=info
      --schedule=/tmp/celerybeat-schedule
    depends_on:
      - rabbitmq_server
    networks:
      - dhruva-network
    restart: unless-stopped
    volumes:
      - celery_beat_data:/tmp
```

#### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dhruva-server
  labels:
    app: dhruva-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dhruva-server
  template:
    metadata:
      labels:
        app: dhruva-server
    spec:
      containers:
      - name: dhruva-server
        image: dhruva-platform-server:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis-service"
        - name: MONGO_HOST
          value: "mongodb-service"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

*This technical specification provides comprehensive details for implementing, deploying, and maintaining the Dhruva Platform server architecture.*
