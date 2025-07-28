# Dhruva Platform Server - Operations Guide

## 📋 Overview

This guide provides practical instructions for deploying, monitoring, maintaining, and troubleshooting the Dhruva Platform server in production environments.

## 🚀 Deployment Guide

### Prerequisites

#### System Requirements

```bash
# Minimum Production Requirements
CPU: 8 cores (3.0GHz+)
Memory: 16GB RAM
Storage: 500GB NVMe SSD
Network: 10Gbps
OS: Ubuntu 20.04+ or CentOS 8+

# Software Dependencies
Docker: 24.0+
Docker Compose: 2.20+
Git: 2.30+
```

#### Environment Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/dhruva-platform.git
cd dhruva-platform/Dhruva-Platform-2

# 2. Create environment file
cp .env.example .env

# 3. Configure environment variables
nano .env
```

### Configuration

#### Environment Variables Configuration

```bash
# Database Configuration
MONGO_APP_DB_USERNAME=dhruvaadmin
MONGO_APP_DB_PASSWORD=your_secure_password_here
MONGO_LOG_DB_USERNAME=dhruvalogadmin
MONGO_LOG_DB_PASSWORD=your_secure_log_password_here
APP_DB_NAME=admin
APP_DB_CONNECTION_STRING=mongodb://${MONGO_APP_DB_USERNAME}:${MONGO_APP_DB_PASSWORD}@dhruva-platform-app-db:27017/admin?authSource=admin

# Redis Configuration
REDIS_HOST=dhruva-platform-redis
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password
REDIS_DB=0
REDIS_SECURE=false

# TimescaleDB Configuration
TIMESCALE_USER=dhruva
TIMESCALE_PASSWORD=your_secure_timescale_password
TIMESCALE_DATABASE_NAME=dhruva_metering
TIMESCALE_PORT=5432
TIMESCALE_HOST=dhruva-platform-timescaledb

# RabbitMQ Configuration
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=your_secure_rabbitmq_password
RABBITMQ_DEFAULT_VHOST=dhruva_host
CELERY_BROKER_URL=amqp://${RABBITMQ_DEFAULT_USER}:${RABBITMQ_DEFAULT_PASS}@dhruva-platform-rabbitmq:5672/${RABBITMQ_DEFAULT_VHOST}

# Application Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8000
BACKEND_WORKERS=4
ENV=production
MAX_SOCKET_CONNECTIONS_PER_WORKER=100

# Security Configuration
JWT_SECRET_KEY=your_super_secure_jwt_secret_key_minimum_32_characters
ARGON2_HASH_ROUNDS=12

# Monitoring Configuration
PROMETHEUS_URL=http://prometheus-pushgateway:9091
PROM_AGG_GATEWAY_USERNAME=admin
PROM_AGG_GATEWAY_PASSWORD=your_prometheus_password

# External Services
HEARTBEAT_API_KEY=your_heartbeat_api_key
NEXT_PUBLIC_BACKEND_API_URL=https://your-domain.com
```

#### SSL/TLS Configuration

```nginx
# /etc/nginx/sites-available/dhruva-platform
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # API endpoints
    location /services/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }

    # Socket.IO endpoints
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000;
        access_log off;
    }
}
```

### Deployment Steps

#### Production Deployment

```bash
# 1. Build and start services
docker-compose -f docker-compose-app.yml -f docker-compose-db.yml up -d

# 2. Wait for services to be healthy
docker-compose ps

# 3. Run database migrations
docker exec dhruva-platform-server python migrate.py

# 4. Verify deployment
curl -f http://localhost:8000/health

# 5. Check logs
docker-compose logs -f server
```

#### Rolling Updates

```bash
# 1. Build new image
docker build -t dhruva-platform-server:v2.0.0 ./server

# 2. Tag as latest
docker tag dhruva-platform-server:v2.0.0 dhruva-platform-server:latest

# 3. Update services one by one
docker-compose up -d --no-deps server

# 4. Verify health
curl -f http://localhost:8000/health

# 5. Update workers
docker-compose up -d --no-deps celery-worker celery-beat
```

## 📊 Monitoring & Observability

### Health Checks

#### Application Health Endpoint

```bash
# Basic health check
curl -f http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "2.0.0",
  "components": {
    "database": "healthy",
    "cache": "healthy",
    "queue": "healthy"
  }
}
```

#### Component Health Checks

```bash
# MongoDB health
docker exec dhruva-platform-app-db mongosh --eval "db.adminCommand('ping')"

# Redis health
docker exec dhruva-platform-redis redis-cli ping

# RabbitMQ health
docker exec dhruva-platform-rabbitmq rabbitmq-diagnostics ping

# TimescaleDB health
docker exec dhruva-platform-timescaledb pg_isready -U dhruva
```

### Metrics Collection

#### Prometheus Metrics

```bash
# Application metrics endpoint
curl http://localhost:8000/metrics

# Key metrics to monitor:
- http_requests_total
- http_request_duration_seconds
- celery_task_total
- celery_task_duration_seconds
- redis_connected_clients
- mongodb_connections_current
```

#### Custom Metrics Dashboard

```python
# Key Performance Indicators (KPIs)
1. API Request Rate (requests/second)
2. API Response Time (P95, P99)
3. Error Rate (percentage)
4. Cache Hit Rate (percentage)
5. Queue Depth (number of pending tasks)
6. Database Connection Pool Usage
7. Memory and CPU Utilization
8. Disk I/O and Network Throughput
```

### Logging Configuration

#### Structured Logging

```python
# Log configuration in log/logger.py
LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "json": {
            "format": '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "level": "INFO",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/dhruva/app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "formatter": "json",
            "level": "INFO",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"],
    },
}
```

#### Log Aggregation

```bash
# Using ELK Stack (Elasticsearch, Logstash, Kibana)
# docker-compose-logging.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
```

## 🔧 Maintenance Procedures

### Database Maintenance

#### MongoDB Maintenance

```bash
# 1. Create backup
docker exec dhruva-platform-app-db mongodump --out /backup/$(date +%Y%m%d_%H%M%S)

# 2. Compact collections (if needed)
docker exec dhruva-platform-app-db mongosh --eval "db.runCommand({compact: 'api_keys'})"

# 3. Rebuild indexes
docker exec dhruva-platform-app-db mongosh --eval "db.api_keys.reIndex()"

# 4. Check database stats
docker exec dhruva-platform-app-db mongosh --eval "db.stats()"
```

#### TimescaleDB Maintenance

```sql
-- 1. Vacuum and analyze tables
VACUUM ANALYZE api_key_usage;
VACUUM ANALYZE service_metrics;

-- 2. Update table statistics
ANALYZE api_key_usage;
ANALYZE service_metrics;

-- 3. Check hypertable health
SELECT * FROM timescaledb_information.hypertables;

-- 4. Compress old data
SELECT compress_chunk(i) FROM show_chunks('api_key_usage', older_than => INTERVAL '7 days') i;

-- 5. Drop old chunks (if retention policy allows)
SELECT drop_chunks('api_key_usage', older_than => INTERVAL '1 year');
```

#### Redis Maintenance

```bash
# 1. Check memory usage
docker exec dhruva-platform-redis redis-cli info memory

# 2. Analyze key patterns
docker exec dhruva-platform-redis redis-cli --bigkeys

# 3. Save snapshot
docker exec dhruva-platform-redis redis-cli bgsave

# 4. Check persistence status
docker exec dhruva-platform-redis redis-cli lastsave
```

### Cache Management

#### Cache Warming

```python
# Warm critical caches after deployment
import requests

# 1. Warm service cache
services = requests.get("http://localhost:8000/services/details/list_services").json()
for service in services:
    requests.get(f"http://localhost:8000/services/details/service/{service['serviceId']}")

# 2. Warm model cache
models = requests.get("http://localhost:8000/services/details/list_models").json()
for model in models:
    requests.get(f"http://localhost:8000/services/details/model/{model['modelId']}")
```

#### Cache Invalidation

```bash
# 1. Invalidate specific cache entries
docker exec dhruva-platform-redis redis-cli del "dhruva:ServiceCache:service-id"

# 2. Flush all caches (use with caution)
docker exec dhruva-platform-redis redis-cli flushall

# 3. Selective cache cleanup
docker exec dhruva-platform-redis redis-cli --scan --pattern "dhruva:ApiKeyCache:*" | xargs docker exec dhruva-platform-redis redis-cli del
```

### Queue Management

#### Celery Queue Monitoring

```bash
# 1. Check active tasks
docker exec dhruva-platform-celery-worker celery -A celery_backend.celery_app inspect active

# 2. Check scheduled tasks
docker exec dhruva-platform-celery-worker celery -A celery_backend.celery_app inspect scheduled

# 3. Check queue lengths
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues name messages

# 4. Purge queue (emergency only)
docker exec dhruva-platform-rabbitmq rabbitmqctl purge_queue data-log
```

#### Task Failure Recovery

```bash
# 1. Check failed tasks
docker exec dhruva-platform-celery-worker celery -A celery_backend.celery_app inspect reserved

# 2. Retry failed tasks
docker exec dhruva-platform-celery-worker celery -A celery_backend.celery_app control retry

# 3. Cancel stuck tasks
docker exec dhruva-platform-celery-worker celery -A celery_backend.celery_app control revoke <task_id>
```

## 🚨 Troubleshooting Guide

### Common Issues

#### 1. High Memory Usage

**Symptoms:**
- Container OOM kills
- Slow response times
- Redis memory warnings

**Diagnosis:**
```bash
# Check container memory usage
docker stats dhruva-platform-server

# Check Redis memory usage
docker exec dhruva-platform-redis redis-cli info memory

# Check Python memory usage
docker exec dhruva-platform-server python -c "import psutil; print(f'Memory: {psutil.virtual_memory().percent}%')"
```

**Solutions:**
```bash
# 1. Increase container memory limits
# In docker-compose.yml:
services:
  server:
    deploy:
      resources:
        limits:
          memory: 8G

# 2. Optimize Redis memory usage
docker exec dhruva-platform-redis redis-cli config set maxmemory 2gb
docker exec dhruva-platform-redis redis-cli config set maxmemory-policy allkeys-lru

# 3. Clear unnecessary caches
docker exec dhruva-platform-redis redis-cli flushdb
```

#### 2. Database Connection Issues

**Symptoms:**
- "ServerSelectionTimeoutError"
- "Authentication failed"
- Slow database queries

**Diagnosis:**
```bash
# Test MongoDB connection
docker exec dhruva-platform-app-db mongosh -u dhruvaadmin -p dhruva123 --eval "db.adminCommand('ping')"

# Check connection pool status
docker exec dhruva-platform-server python -c "
from db.database import db_client
print(db_client['app'].server_info())
"

# Monitor active connections
docker exec dhruva-platform-app-db mongosh --eval "db.serverStatus().connections"
```

**Solutions:**
```bash
# 1. Restart database service
docker-compose restart app_db

# 2. Check network connectivity
docker network inspect dhruva-network

# 3. Verify credentials and connection string
echo $APP_DB_CONNECTION_STRING

# 4. Increase connection pool size
# In database.py, add connection pool settings:
client = MongoClient(connection_string, maxPoolSize=50, minPoolSize=10)
```

#### 3. Queue Processing Delays

**Symptoms:**
- Tasks stuck in PENDING state
- Increasing queue depth
- Delayed task execution

**Diagnosis:**
```bash
# Check queue status
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues name messages consumers

# Check worker status
docker exec dhruva-platform-celery-worker celery -A celery_backend.celery_app inspect stats

# Monitor task processing
docker exec dhruva-platform-celery-worker celery -A celery_backend.celery_app events
```

**Solutions:**
```bash
# 1. Scale up workers
docker-compose up -d --scale celery-worker=4

# 2. Restart stuck workers
docker-compose restart celery-worker

# 3. Purge problematic queues (last resort)
docker exec dhruva-platform-rabbitmq rabbitmqctl purge_queue data-log

# 4. Increase worker concurrency
# In docker-compose.yml:
command: celery -A celery_backend.celery_app worker --concurrency=8
```

#### 4. API Performance Issues

**Symptoms:**
- High response times
- Timeout errors
- Low throughput

**Diagnosis:**
```bash
# Load testing
ab -n 1000 -c 10 http://localhost:8000/health

# Check API metrics
curl http://localhost:8000/metrics | grep http_request_duration

# Monitor resource usage
docker stats dhruva-platform-server
```

**Solutions:**
```bash
# 1. Scale API servers
docker-compose up -d --scale server=3

# 2. Optimize database queries
# Add indexes for frequently queried fields

# 3. Increase cache hit rate
# Warm caches and optimize cache TTL

# 4. Enable connection pooling
# Configure uvicorn with more workers:
command: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Emergency Procedures

#### Service Recovery

```bash
# 1. Complete system restart
docker-compose down
docker-compose up -d

# 2. Database recovery
docker exec dhruva-platform-app-db mongod --repair
docker-compose restart app_db

# 3. Cache rebuild
docker exec dhruva-platform-redis redis-cli flushall
# Restart application to rebuild caches
docker-compose restart server

# 4. Queue recovery
docker exec dhruva-platform-rabbitmq rabbitmqctl stop_app
docker exec dhruva-platform-rabbitmq rabbitmqctl reset
docker exec dhruva-platform-rabbitmq rabbitmqctl start_app
```

#### Data Recovery

```bash
# 1. MongoDB backup restoration
docker exec dhruva-platform-app-db mongorestore --drop /backup/20240101_120000

# 2. TimescaleDB backup restoration
docker exec dhruva-platform-timescaledb pg_restore -U dhruva -d dhruva_metering /backup/timescale_backup.sql

# 3. Redis data recovery
docker exec dhruva-platform-redis redis-cli --rdb /backup/dump.rdb
```

## 📈 Performance Optimization

### Application Optimization

#### FastAPI Optimization

```python
# 1. Enable response caching
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost:6379")
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")

# 2. Use async database operations
async def get_user_async(user_id: str):
    return await user_collection.find_one({"_id": ObjectId(user_id)})

# 3. Implement connection pooling
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(connection_string, maxPoolSize=50)
```

#### Database Optimization

```sql
-- MongoDB indexes
db.api_keys.createIndex({"api_key": 1})
db.api_keys.createIndex({"user_id": 1, "active": 1})
db.services.createIndex({"serviceId": 1})
db.users.createIndex({"email": 1})

-- TimescaleDB optimization
-- Create partial indexes for active data
CREATE INDEX CONCURRENTLY idx_api_key_usage_recent
ON api_key_usage (api_key_id, time DESC)
WHERE time > NOW() - INTERVAL '30 days';

-- Enable parallel query execution
SET max_parallel_workers_per_gather = 4;
SET parallel_tuple_cost = 0.1;
```

#### Cache Optimization

```python
# 1. Implement cache warming
@app.on_event("startup")
async def warm_caches():
    # Pre-populate frequently accessed data
    active_services = await service_repository.get_active_services()
    for service in active_services:
        ServiceCache(**service.dict()).save()

# 2. Use cache hierarchies
# L1: Application memory cache
# L2: Redis distributed cache
# L3: Database

# 3. Implement cache invalidation strategies
def invalidate_service_cache(service_id: str):
    ServiceCache.delete(service_id)
    # Also invalidate related caches
    ModelCache.delete_by_service(service_id)
```

### Infrastructure Optimization

#### Container Optimization

```dockerfile
# Multi-stage build for smaller images
FROM python:3.10-slim as builder
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.10-slim
COPY --from=builder /root/.local /root/.local
COPY . /app
WORKDIR /app

# Optimize Python runtime
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app
```

#### Network Optimization

```nginx
# Nginx optimization
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain application/json application/javascript text/css;

# Enable HTTP/2
listen 443 ssl http2;

# Connection pooling
upstream dhruva_backend {
    least_conn;
    server localhost:8000 max_fails=3 fail_timeout=30s;
    server localhost:8001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

## 📚 Best Practices

### Security Best Practices

```bash
# 1. Use strong passwords and rotate regularly
# 2. Enable SSL/TLS for all communications
# 3. Implement rate limiting
# 4. Regular security updates
# 5. Monitor for suspicious activities
# 6. Use secrets management (e.g., HashiCorp Vault)
# 7. Implement proper logging and auditing
```

### Operational Best Practices

```bash
# 1. Implement blue-green deployments
# 2. Use infrastructure as code (Terraform, Ansible)
# 3. Automate backups and test recovery procedures
# 4. Implement comprehensive monitoring and alerting
# 5. Use configuration management
# 6. Document all procedures and runbooks
# 7. Regular disaster recovery testing
```

### Development Best Practices

```python
# 1. Follow coding standards and use linting
# 2. Implement comprehensive testing (unit, integration, e2e)
# 3. Use dependency injection and loose coupling
# 4. Implement proper error handling and logging
# 5. Use async/await for I/O operations
# 6. Implement circuit breakers for external services
# 7. Use feature flags for gradual rollouts
```

---

*This operations guide provides comprehensive procedures for managing the Dhruva Platform server in production environments. Regular updates and team training are essential for effective operations.*
