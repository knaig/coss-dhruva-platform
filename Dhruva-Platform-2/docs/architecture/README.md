# Architecture Documentation

This directory contains comprehensive architectural documentation for the Dhruva Platform.

## 📋 Contents

### High-Level Architecture
- [Executive Summary](./executive-summary.md) - Business and technical overview
- [System Overview](./system-overview.md) - Complete system architecture
- [Technical Analysis](./technical-analysis.md) - Detailed technical architecture analysis
- [Architectural Analysis Correction](./architectural-analysis-correction.md) - Important architectural clarifications

### Specialized Architecture Analysis
- [Data Flow Architecture](./data-flow.md) - Data flow patterns and processing
- [Async/Sync Analysis](./async-sync-analysis.md) - Asynchronous vs synchronous processing patterns
- [Storage Analysis](./storage-analysis.md) - Storage architecture and data management

### Server Architecture (Detailed Technical Documentation)
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Database Schema](./DATABASE_SCHEMA.md) - Database design and schema
- [Security Guide](./SECURITY_GUIDE.md) - Security architecture and implementation
- [Operations Guide](./OPERATIONS_GUIDE.md) - Operational procedures and guidelines
- [Technical Specification](./TECHNICAL_SPECIFICATION.md) - Detailed technical specifications
- [Celery Backend Guide](./CELERY_BACKEND_GUIDE.md) - Background processing architecture
- [Index](./INDEX.md) - Architecture documentation index

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Technology Stack](#technology-stack)
4. [Directory Structure](#directory-structure)
5. [Core Components Analysis](#core-components-analysis)
6. [Data Flow & Workflows](#data-flow--workflows)
7. [Configuration & Environment](#configuration--environment)
8. [Deployment Architecture](#deployment-architecture)
9. [Performance & Scalability](#performance--scalability)
10. [Troubleshooting Guide](#troubleshooting-guide)

## 🏗️ Overview

The Dhruva Platform server is a sophisticated **modular monolith** architecture built on **FastAPI** with **Celery** for asynchronous task processing, **RabbitMQ** for message queuing, and **Redis** for caching. It provides AI/ML inference services including ASR (Automatic Speech Recognition), Translation, TTS (Text-to-Speech), and NER (Named Entity Recognition).

### Key Architectural Principles

- **Modular Monolith Architecture**: Single deployable unit with clear module separation
- **Asynchronous Processing**: Non-blocking operations using Celery workers
- **Caching Strategy**: Redis-based caching for performance optimization
- **Scalable Design**: Horizontal scaling support through containerization
- **Monitoring & Observability**: Prometheus metrics and comprehensive logging

## 🏛️ Architecture Components

### Core Services

| Component | Purpose | Technology | Port |
|-----------|---------|------------|------|
| **FastAPI Server** | Main API gateway and business logic | FastAPI + Uvicorn | 8000 |
| **Celery Workers** | Asynchronous task processing | Celery + RabbitMQ | - |
| **RabbitMQ** | Message broker for task queuing | RabbitMQ | 5672 |
| **Redis Cache** | High-performance caching layer | Redis | 6379 |
| **MongoDB** | Primary document database | MongoDB | 27017 |
| **TimescaleDB** | Time-series analytics database | PostgreSQL + TimescaleDB | 5432 |

### External Dependencies

| Service | Purpose | Integration |
|---------|---------|-------------|
| **Triton Inference Server** | ML model serving | HTTP API calls |
| **Prometheus** | Metrics collection | Push gateway |
| **Grafana** | Monitoring dashboards | Prometheus data source |
| **Nginx** | Reverse proxy & load balancer | HTTP proxy |

## 🛠️ Technology Stack

### Core Framework & Libraries

```python
# Primary Framework
fastapi==0.93.0              # Modern, fast web framework
uvicorn==0.20.0              # ASGI server
starlette==0.25.0            # Web framework foundation

# Asynchronous Processing
celery==5.2.7                # Distributed task queue
kombu==5.2.4                 # Messaging library
amqp==5.1.1                  # AMQP protocol implementation

# Database & Caching
pymongo==4.3.3               # MongoDB driver
redis-om==0.1.2              # Redis object mapping
SQLAlchemy==2.0.19           # SQL toolkit
psycopg2-binary==2.9.6       # PostgreSQL adapter

# Authentication & Security
pyjwt==2.6.0                 # JWT token handling
argon2-cffi==21.3.0          # Password hashing

# Monitoring & Metrics
prometheus-client==0.15.0     # Metrics collection
prometheus-fastapi-instrumentator==5.9.1  # FastAPI metrics

# Audio Processing
soundfile==0.12.1            # Audio file I/O
pydub==0.25.1                # Audio manipulation
torch==2.0.0                 # PyTorch for ML
torchaudio==2.0.1            # Audio processing
```

### Infrastructure Components

```yaml
# Docker Services
services:
  - dhruva-platform-server     # Main FastAPI application
  - dhruva-platform-redis      # Redis cache
  - dhruva-platform-app-db     # MongoDB primary database
  - dhruva-platform-rabbitmq   # RabbitMQ message broker
  - dhruva-platform-timescaledb # TimescaleDB analytics
```

## 📁 Directory Structure

```
server/
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── Dockerfile                # Container configuration
├── 
├── auth/                     # Authentication & authorization
│   ├── api_key_provider.py
│   ├── auth_provider.py
│   └── role_authorization_provider.py
│
├── cache/                    # Redis caching implementation
│   ├── app_cache.py         # Cache connection management
│   └── CacheBaseModel.py    # Base cache model with Redis-OM
│
├── celery_backend/          # Celery configuration & tasks
│   ├── celery_app.py        # Celery application setup
│   ├── celeryconfig.py      # Celery configuration
│   ├── rabbitmq.conf        # RabbitMQ configuration
│   ├── definitions.json     # RabbitMQ definitions
│   └── tasks/               # Celery task implementations
│       ├── log_data.py      # Request/response logging
│       ├── heartbeat.py     # Service health monitoring
│       ├── metering.py      # Usage calculation & tracking
│       └── push_metrics.py  # Prometheus metrics pushing
│
├── db/                      # Database configurations
│   ├── database.py          # MongoDB connection
│   ├── metering_database.py # TimescaleDB connection
│   └── MongoBaseModel.py    # Base MongoDB model
│
├── module/                  # Business logic modules
│   ├── auth/                # Authentication module
│   │   ├── model/           # Auth data models
│   │   ├── service/         # Auth business logic
│   │   └── router/          # Auth API endpoints
│   └── services/            # Services module
│       ├── model/           # Service data models
│       ├── service/         # Service business logic
│       ├── router/          # Service API endpoints
│       └── gateway/         # External service integration
│
├── schema/                  # Pydantic schemas
│   ├── auth/                # Authentication schemas
│   └── services/            # Service request/response schemas
│
├── exception/               # Custom exception handling
├── middleware/              # Custom middleware
├── log/                     # Logging configuration
└── utils/                   # Utility functions
```

## 🔧 Core Components Analysis

### 1. Main Server Directory (`/server/`)

#### FastAPI Application (`main.py`)

The main application entry point that orchestrates all components:

```python
# Key Features:
- FastAPI app initialization with comprehensive middleware
- Socket.IO server mounting for real-time communication
- Prometheus metrics integration
- Database connection management
- Comprehensive error handling
- CORS configuration for cross-origin requests
```

**Key Middleware Stack:**
1. **PrometheusGlobalMetricsMiddleware**: Metrics collection
2. **CORSMiddleware**: Cross-origin request handling
3. **DBSessionMiddleware**: Database session management
4. **InferenceLoggingRoute**: Request/response logging

#### Authentication System (`/auth/`)

Multi-layered authentication supporting:
- **API Key Authentication**: For service-to-service communication
- **JWT Token Authentication**: For user sessions
- **Role-based Authorization**: Admin, user, and service roles

```python
# Authentication Flow:
1. Request arrives with API key or JWT token
2. AuthProvider validates credentials
3. ApiKeyTypeAuthorizationProvider checks permissions
4. Request context populated with user/API key data
5. Business logic processes authenticated request
```

### 2. Celery Backend Directory (`/server/celery_backend/`)

#### Celery Application (`celery_app.py`)

Distributed task processing system with:

```python
# Queue Configuration:
- data-log: Request/response logging
- metrics-log: Prometheus metrics pushing  
- heartbeat: Service health monitoring
- upload-feedback-dump: Monthly feedback collection
- send-usage-email: Weekly usage reports
```

#### Task Scheduling (`celery_app.py`)

```python
# Scheduled Tasks:
beat_schedule = {
    "heartbeat": {
        "task": "heartbeat",
        "schedule": 300.0,  # Every 5 minutes
        "options": {"queue": "heartbeat"}
    },
    "upload-feedback-dump": {
        "task": "upload.feedback.dump", 
        "schedule": crontab(day_of_month="1", hour="6", minute="30"),
        "options": {"queue": "upload-feedback-dump"}
    },
    "send-usage-email": {
        "task": "send.usage.email",
        "schedule": crontab(day_of_week="1", hour="3", minute="0"),
        "options": {"queue": "send-usage-email"}
    }
}
```

#### RabbitMQ Configuration

**Exchange & Queue Setup:**
```python
# Direct exchanges for task routing
task_queues = (
    Queue("data-log", exchange=Exchange("logs", type="direct")),
    Queue("metrics-log", exchange=Exchange("metrics", type="direct")),
    Queue("heartbeat", exchange=Exchange("heartbeat", type="direct")),
    Queue("upload-feedback-dump", exchange=Exchange("upload-feedback-dump", type="direct")),
    Queue("send-usage-email", exchange=Exchange("send-usage-email", type="direct"))
)
```

### 3. Cache Directory (`/server/cache/`)

#### Redis Caching Strategy

**Cache Models:**
- **ApiKeyCache**: API key metadata for fast authentication
- **ServiceCache**: Service configuration and metadata
- **ModelCache**: ML model information and endpoints

**Cache Operations:**
```python
# Cache Population Pattern:
1. Check Redis cache for data
2. On cache miss, query MongoDB
3. Transform MongoDB document to cache-compatible format
4. Store in Redis with appropriate TTL
5. Return cached data to application
```

**Data Transformation:**
```python
# MongoDB → Redis Transformation:
- ObjectId → String conversion
- DateTime → ISO string format
- Complex nested objects → Flattened key-value pairs
- Unsupported types filtered out
```

## 🔄 Data Flow & Workflows

### Inference Request Workflow

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant Auth
    participant Cache
    participant InferenceService
    participant Triton
    participant RabbitMQ
    participant CeleryWorker
    participant Database

    Client->>FastAPI: POST /services/inference/translation
    FastAPI->>Auth: Validate API key
    Auth->>Cache: Check API key cache
    Cache-->>Auth: Return API key data
    Auth-->>FastAPI: Authentication successful

    FastAPI->>InferenceService: Process request
    InferenceService->>Cache: Get service metadata
    Cache-->>InferenceService: Return service config

    InferenceService->>Triton: Send inference request
    Triton-->>InferenceService: Return results

    InferenceService-->>FastAPI: Return response
    FastAPI->>RabbitMQ: Queue logging task
    RabbitMQ->>CeleryWorker: Process log.data
    CeleryWorker->>Database: Store metrics & logs

    FastAPI-->>Client: Return inference response
```

### Task Processing Workflow

1. **Request Logging**: Every API request triggers asynchronous logging
2. **Usage Metering**: Calculate inference units based on input data
3. **Health Monitoring**: Periodic service health checks
4. **Metrics Collection**: Prometheus metrics aggregation and pushing
5. **Data Archival**: Monthly feedback dumps and weekly usage reports

### Caching Workflow

```python
# Cache-First Pattern Implementation:
def get_service_data(service_id: str):
    try:
        # 1. Try cache first
        service = ServiceCache.get(service_id)
        return service
    except Exception:
        # 2. Cache miss - query database
        service = service_repository.get_by_service_id(service_id)
        # 3. Populate cache
        service_cache = ServiceCache(**service.dict())
        service_cache.save()
        return service_cache
```

## ⚙️ Configuration & Environment

### Environment Variables

```bash
# Database Configuration
MONGO_APP_DB_USERNAME=dhruvaadmin
MONGO_APP_DB_PASSWORD=dhruva123
APP_DB_NAME=admin
APP_DB_CONNECTION_STRING=mongodb://${MONGO_APP_DB_USERNAME}:${MONGO_APP_DB_PASSWORD}@dhruva-platform-app-db:27017/admin?authSource=admin

# Redis Configuration
REDIS_HOST=dhruva-platform-redis
REDIS_PORT=6379
REDIS_PASSWORD=dhruva123
REDIS_DB=0
REDIS_SECURE=false

# TimescaleDB Configuration
TIMESCALE_USER=dhruva
TIMESCALE_PASSWORD=dhruva123
TIMESCALE_DATABASE_NAME=dhruva_metering
TIMESCALE_PORT=5432
TIMESCALE_HOST=dhruva-platform-timescaledb

# RabbitMQ Configuration
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=admin123
RABBITMQ_DEFAULT_VHOST=dhruva_host
CELERY_BROKER_URL=amqp://${RABBITMQ_DEFAULT_USER}:${RABBITMQ_DEFAULT_PASS}@dhruva-platform-rabbitmq:5672/${RABBITMQ_DEFAULT_VHOST}

# Application Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8000
BACKEND_WORKERS=4
ENV=development
MAX_SOCKET_CONNECTIONS_PER_WORKER=-1

# Security Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key
ARGON2_HASH_ROUNDS=12

# Monitoring Configuration
PROMETHEUS_URL=http://prometheus-pushgateway:9091
PROM_AGG_GATEWAY_USERNAME=admin
PROM_AGG_GATEWAY_PASSWORD=admin123

# External Services
HEARTBEAT_API_KEY=your-heartbeat-api-key
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
```

### Docker Configuration

```dockerfile
# Multi-stage build for optimization
FROM python:3.10.12-slim as base

# Security & performance optimizations
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/src
ENV PIP_NO_CACHE_DIR=1

# System dependencies for audio processing
RUN apt-get update && apt-get install -y \
    libsndfile1 libsndfile1-dev \
    ffmpeg curl gcc g++ build-essential

# Non-root user for security
RUN groupadd -r dhruva && useradd -r -g dhruva dhruva

# Application setup
WORKDIR /src
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . /src
RUN chown -R dhruva:dhruva /src && chmod -R 755 /src

USER dhruva
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1
```

## 🚀 Deployment Architecture

### Container Orchestration

```yaml
# docker-compose-app.yml
services:
  server:
    image: dhruva-platform-server:latest
    container_name: dhruva-platform-server
    command: python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
    depends_on:
      - redis
      - app_db
      - rabbitmq_server
      - timescaledb
    ports:
      - "8000:8000"
    networks:
      - dhruva-network
```

### Service Dependencies

```mermaid
graph TB
    subgraph "Application Layer"
        SERVER[FastAPI Server]
        CELERY[Celery Workers]
        BEAT[Celery Beat]
    end

    subgraph "Data Layer"
        MONGO[(MongoDB)]
        TIMESCALE[(TimescaleDB)]
        REDIS[(Redis)]
    end

    subgraph "Message Layer"
        RABBITMQ[RabbitMQ]
    end

    subgraph "External Services"
        TRITON[Triton Server]
        PROMETHEUS[Prometheus]
    end

    SERVER --> MONGO
    SERVER --> REDIS
    SERVER --> RABBITMQ
    SERVER --> TRITON

    CELERY --> MONGO
    CELERY --> TIMESCALE
    CELERY --> RABBITMQ
    CELERY --> PROMETHEUS

    BEAT --> RABBITMQ
```

### Scaling Considerations

**Horizontal Scaling:**
- Multiple FastAPI server instances behind load balancer
- Celery worker scaling based on queue depth
- Redis cluster for cache distribution
- MongoDB replica sets for read scaling

**Vertical Scaling:**
- CPU optimization for inference processing
- Memory scaling for large model caching
- Storage optimization for time-series data

## 📊 Performance & Scalability

### Performance Metrics

| Component | Metric | Target | Monitoring |
|-----------|--------|--------|------------|
| **API Response Time** | P95 latency | < 500ms | Prometheus |
| **Cache Hit Rate** | Redis cache hits | > 90% | Redis metrics |
| **Queue Processing** | Task completion rate | > 95% | Celery monitoring |
| **Database Performance** | Query response time | < 100ms | Database metrics |

### Optimization Strategies

**Caching Optimization:**
```python
# Cache warming strategy
@app.on_event("startup")
async def warm_cache():
    # Pre-populate frequently accessed data
    services = service_repository.get_active_services()
    for service in services:
        ServiceCache(**service.dict()).save()
```

**Database Optimization:**
```python
# Connection pooling and indexing
- MongoDB indexes on frequently queried fields
- TimescaleDB hypertables for time-series data
- Connection pooling for database efficiency
```

**Queue Optimization:**
```python
# Task routing and prioritization
task_routes = {
    'log.data': {'queue': 'data-log', 'priority': 1},
    'heartbeat': {'queue': 'heartbeat', 'priority': 5},
    'push.metrics': {'queue': 'metrics-log', 'priority': 3}
}
```

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### 1. Cache Connection Issues

**Problem**: Redis connection failures
```bash
# Symptoms:
- "Connection refused" errors
- Slow API response times
- Cache miss rate approaching 100%
```

**Solution**:
```bash
# Check Redis connectivity
docker exec -it dhruva-platform-redis redis-cli ping

# Verify environment variables
echo $REDIS_HOST $REDIS_PORT $REDIS_PASSWORD

# Restart Redis service
docker-compose restart redis
```

#### 2. Celery Worker Issues

**Problem**: Tasks not processing
```bash
# Symptoms:
- Tasks stuck in PENDING state
- Queue depth increasing
- No worker activity logs
```

**Solution**:
```bash
# Check worker status
celery -A celery_backend.celery_app inspect active

# Monitor queue status
celery -A celery_backend.celery_app inspect reserved

# Restart workers
docker-compose restart celery-worker
```

#### 3. Database Connection Issues

**Problem**: MongoDB connection failures
```bash
# Symptoms:
- "ServerSelectionTimeoutError"
- Authentication failures
- Slow database queries
```

**Solution**:
```bash
# Test MongoDB connection
docker exec -it dhruva-platform-app-db mongosh -u dhruvaadmin -p dhruva123

# Check connection string format
mongodb://username:password@host:port/database?authSource=admin

# Verify network connectivity
docker network ls
docker network inspect dhruva-network
```

### Performance Troubleshooting

#### High Memory Usage
```bash
# Monitor memory usage
docker stats dhruva-platform-server

# Check for memory leaks
python -m memory_profiler main.py

# Optimize cache settings
REDIS_MAXMEMORY=2gb
REDIS_MAXMEMORY_POLICY=allkeys-lru
```

#### Slow API Response Times
```bash
# Enable detailed logging
LOG_LEVEL=DEBUG

# Monitor database query performance
db.collection.explain("executionStats")

# Check cache hit rates
redis-cli info stats | grep keyspace
```

### Monitoring & Alerting

#### Key Metrics to Monitor

```python
# Application Metrics
- API request rate and latency
- Error rates by endpoint
- Cache hit/miss ratios
- Database connection pool usage

# Infrastructure Metrics
- CPU and memory utilization
- Disk I/O and network throughput
- Container health status
- Queue depth and processing rates
```

#### Health Check Endpoints

```python
# Application health
GET /health
{
    "status": "healthy",
    "database": "connected",
    "cache": "connected",
    "queue": "connected"
}

# Detailed metrics
GET /metrics
# Prometheus format metrics
```

## 📚 Additional Resources

### Development Guidelines

1. **Code Structure**: Follow the established module pattern
2. **Error Handling**: Use custom exception classes
3. **Testing**: Write unit tests for business logic
4. **Documentation**: Update API documentation with changes
5. **Security**: Follow authentication/authorization patterns

### Useful Commands

```bash
# Development
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Testing
pytest tests/ -v --cov=.

# Database migrations
python migrate.py

# Celery monitoring
celery -A celery_backend.celery_app flower

# Docker operations
docker-compose -f docker-compose-app.yml up -d
docker-compose logs -f server
```

### API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Spec**: `http://localhost:8000/openapi.json`

---

*This documentation provides a comprehensive overview of the Dhruva Platform server architecture. For specific implementation details, refer to the individual component documentation and source code.*
