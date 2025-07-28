# Cloud Storage Dependency Analysis for Dhruva Platform
## Sandbox/Prototype Configuration Guide

## Executive Summary

**✅ GOOD NEWS:** Cloud storage (AWS S3/Azure Blob) is **NOT required** for core metering functionality. You can run a fully functional prototype using only local components.

**🎯 Core Answer:** The essential metering services (usage tracking, real-time monitoring, dashboards) work perfectly without cloud storage. Only optional archival features require cloud storage.

---

## 1. Cloud Storage Necessity Assessment

### ✅ **Core Metering Functions (NO Cloud Storage Required)**
```python
# These work without cloud storage:
- API usage tracking → TimescaleDB
- Real-time monitoring → Prometheus/Grafana  
- Usage calculations → Local processing
- Dashboard metrics → TimescaleDB queries
- Authentication/API keys → MongoDB + Redis
```

### ⚠️ **Optional Features (Cloud Storage Required)**
```python
# These require cloud storage:
- Monthly feedback dumps → CSV export to cloud
- Complete request/response logging → JSON files to cloud
- Email usage reports → Uses TimescaleDB (works without cloud)
```

---

## 2. Detailed Task Analysis

### **Critical Tasks (Work Without Cloud Storage)**

#### ✅ `meter_usage()` - Core Metering Function
```python
# Location: celery_backend/tasks/metering.py
def meter_usage(api_key_id, input_data, usage_type, service_id):
    # Calculates usage units and writes to TimescaleDB
    # NO cloud storage dependency
    inference_units = calculate_usage(input_data, usage_type)
    write_to_db(api_key_id, inference_units, service_id, usage_type)
```
**Status:** ✅ **Fully functional without cloud storage**

#### ✅ `push_metrics` - Prometheus Monitoring
```python
# Location: celery_backend/tasks/push_metrics.py
# Pushes metrics to Prometheus Pushgateway
# NO cloud storage dependency
```
**Status:** ✅ **Fully functional without cloud storage**

#### ✅ `heartbeat` - Service Health Monitoring
```python
# Location: celery_backend/tasks/heartbeat.py
# Monitors service health and availability
# NO cloud storage dependency
```
**Status:** ✅ **Fully functional without cloud storage**

### **Optional Tasks (Require Cloud Storage)**

#### ⚠️ `log_data` - Request/Response Logging
```python
# Location: celery_backend/tasks/log_data.py
@app.task(name="log.data")
def log_data(...):
    # CRITICAL: Always calls meter_usage() - this works without cloud storage
    meter_usage(api_key_id, data_usage, usage_type, service_id)
    
    # OPTIONAL: Only logs to cloud storage if data_tracking_consent=True
    if data_tracking_consent:
        log_to_storage(...)  # ← This requires cloud storage
```
**Status:** ⚠️ **Core metering works, logging fails if data_tracking_consent=True**

#### ⚠️ `upload_feedback_dump` - Monthly CSV Export
```python
# Location: celery_backend/tasks/upload_feedback_dump.py
@app.task(name="upload.feedback.dump")
def upload_feedback_dump():
    # Generates CSV from MongoDB feedback data
    # Uploads to cloud storage
    blob_client.upload_blob(file.read())  # ← Requires cloud storage
```
**Status:** ⚠️ **Will fail without cloud storage (but not critical for core functionality)**

#### ✅ `send_usage_email` - Weekly Email Reports
```python
# Location: celery_backend/tasks/send_usage_email.py
@app.task(name="send.usage.email")
def send_usage_email():
    # Queries TimescaleDB for usage data
    # Sends email with CSV attachment
    # NO cloud storage dependency
```
**Status:** ✅ **Works without cloud storage (uses TimescaleDB data)**

---

## 3. Impact Assessment for Sandbox Mode

### ✅ **What WILL Work Without Cloud Storage**

#### Core API Metering
```bash
# All these functions work perfectly:
✅ API request authentication
✅ Usage calculation (ASR, Translation, TTS, NER)
✅ Usage data storage in TimescaleDB
✅ Real-time usage monitoring
✅ Prometheus metrics collection
✅ Grafana dashboards
✅ Service health monitoring
✅ Weekly usage email reports
```

#### Real-time Monitoring Stack
```bash
✅ Prometheus metrics: http://localhost:9090
✅ Grafana dashboards: http://localhost:3000
✅ Flower Celery monitoring: http://localhost:5555
✅ TimescaleDB queries for usage analytics
```

### ⚠️ **What WILL Fail Without Cloud Storage**

#### Failed Tasks (Non-Critical)
```bash
❌ upload_feedback_dump (monthly CSV export)
❌ log_to_storage (complete request/response logging)
❌ Azure/AWS blob operations
```

#### Error Messages You'll See
```bash
# Expected errors in logs:
"Azure credentials not found"
"AWS S3 upload error"
"upload.feedback.dump task failed"
```

### ✅ **What WILL Continue Working**
```bash
✅ All API endpoints for inference
✅ Usage tracking and billing calculations
✅ Real-time performance monitoring
✅ User authentication and API key management
✅ Service health checks and alerting
```

---

## 4. Minimal Configuration for Sandbox

### **Required Services (Local Only)**
```yaml
# docker-compose services you need:
✅ dhruva-platform-server      # Main API server
✅ dhruva-platform-app-db      # MongoDB (users, API keys)
✅ dhruva-platform-redis       # Caching and sessions
✅ timescaledb                 # Usage metrics storage
✅ dhruva-platform-rabbitmq    # Message queue
✅ celery-metering            # Core metering worker
✅ celery-monitoring          # Prometheus metrics worker
✅ dhruva-platform-prometheus  # Metrics collection
✅ dhruva-platform-grafana     # Monitoring dashboards
```

### **Environment Variables to Remove/Modify**
```bash
# Remove these Azure variables from .env:
# AZURE_STORAGE_ACCOUNT_NAME
# AZURE_STORAGE_ACCOUNT_KEY
# AZURE_STORAGE_CONNECTION_STRING
# BLOB_STORE

# Keep these for core functionality:
MONGO_APP_DB_USERNAME=dhruvaadmin
MONGO_APP_DB_PASSWORD=dhruva123
TIMESCALE_USER=postgres
TIMESCALE_PASSWORD=postgres
REDIS_PASSWORD=dhruva123
CELERY_BROKER_URL=pyamqp://admin:admin123@rabbitmq_server:5672/dhruva_host
```

### **Celery Configuration Modification**
```python
# Modify celery_backend/tasks/log_data.py
@app.task(name="log.data")
def log_data(...):
    # Always do core metering (works without cloud storage)
    meter_usage(api_key_id, data_usage, usage_type, service_id)
    
    # Skip cloud storage logging for sandbox mode
    if data_tracking_consent and os.environ.get('ENABLE_CLOUD_STORAGE', 'false').lower() == 'true':
        try:
            log_to_storage(...)
        except Exception as e:
            print(f"Cloud storage not available: {e}")
            # Continue without failing
```

---

## 5. Migration Path to Production

### **Phase 1: Sandbox (Current)**
```bash
# Run with local services only
docker-compose -f docker-compose-db.yml \
               -f docker-compose-metering.yml \
               -f docker-compose-monitoring.yml \
               -f docker-compose-app.yml up -d

# Core metering works perfectly
# Optional cloud features disabled
```

### **Phase 2: Production Migration**
```bash
# When ready for production:
1. Set up AWS S3 buckets (following our AWS migration guide)
2. Add AWS environment variables to .env
3. Update Celery tasks to use AWS storage
4. Enable data_tracking_consent features
5. Test cloud storage integration

# Zero downtime migration possible
```

### **Migration Difficulty: LOW**
```python
# Changes needed for production:
✅ Add AWS credentials to .env (5 minutes)
✅ Update 2 Celery task files (15 minutes)
✅ Test cloud storage integration (30 minutes)
✅ Total migration time: < 1 hour
```

---

## 6. Recommended Sandbox Configuration

### **Step 1: Disable Cloud Storage Tasks**
```bash
# Modify docker-compose-metering.yml
# Remove upload-feedback-dump from celery-metering queues:
command: sh -c "python3 -m celery -A celery_backend.celery_app worker -Q data-log,heartbeat,send-usage-email"
```

### **Step 2: Add Environment Flag**
```bash
# Add to .env file:
ENABLE_CLOUD_STORAGE=false
ENABLE_DATA_TRACKING=false
```

### **Step 3: Modify log_data.py**
```python
# Add conditional cloud storage:
if data_tracking_consent and os.environ.get('ENABLE_CLOUD_STORAGE', 'false').lower() == 'true':
    try:
        log_to_storage(...)
    except Exception as e:
        logging.warning(f"Cloud storage unavailable: {e}")
```

### **Step 4: Start Services**
```bash
# Start all services except cloud storage dependencies
docker-compose -f docker-compose-db.yml \
               -f docker-compose-metering.yml \
               -f docker-compose-monitoring.yml \
               -f docker-compose-app.yml up -d
```

---

## 7. Verification Commands

### **Test Core Metering (Should Work)**
```bash
# Test API usage tracking
curl -X POST "http://localhost:8000/inference/translation" \
     -H "Authorization: your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"input": [{"source": "Hello"}]}'

# Check usage in TimescaleDB
docker exec -it timescaledb psql -U postgres -d dhruva -c "SELECT * FROM apikey ORDER BY timestamp DESC LIMIT 5;"

# Check Prometheus metrics
curl http://localhost:9090/api/v1/query?query=dhruva_inference_request_total

# Check Grafana dashboards
curl http://localhost:3000/api/health
```

### **Expected Results**
```bash
✅ API requests processed successfully
✅ Usage data appears in TimescaleDB
✅ Prometheus metrics updated
✅ Grafana dashboards show data
❌ Some Celery task errors (expected and harmless)
```

---

## 8. Conclusion

**🎯 Bottom Line for Sandbox Use:**

✅ **YES** - You can run a fully functional Dhruva Platform prototype without cloud storage  
✅ **YES** - Core metering, monitoring, and analytics work perfectly  
✅ **YES** - All essential features are available for development/testing  
✅ **YES** - Easy migration path to production when ready  

**The only features you'll lose are:**
- Monthly feedback CSV exports to cloud
- Complete request/response logging to cloud files
- Long-term archival storage

**Everything else works perfectly for sandbox/prototype purposes!**
