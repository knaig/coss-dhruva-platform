# Dhruva Platform Metering System - Quick Reference Guide

## 🚀 Quick Start

### Check Current Usage
```bash
# MongoDB - Cumulative usage for API key
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin admin --eval "db.api_key.findOne({\"_id\": ObjectId(\"680b368070069bee045b210c\")}, {name: 1, usage: 1, hits: 1})"

# TimescaleDB - Detailed usage history
docker exec -it timescaledb psql -U postgres -d dhruva -c "SELECT api_key_name, task_type, usage, timestamp FROM apikey WHERE api_key_id = '680b368070069bee045b210c' ORDER BY timestamp DESC LIMIT 5;"
```

### Make Test API Request
```bash
curl -X POST "http://localhost:8000/services/inference/translation" \
  -H "Authorization: resEY0jeJ5KqTFyV3xaLineuRMgBqvsSneEiUG_Ic4yJVVrPFSPGMlNM3ySVzznE" \
  -H "x-auth-source: API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": [{"source": "Hello"}], "config": {"language": {"sourceLanguage": "en", "targetLanguage": "hi"}, "serviceId": "ai4bharat/indictrans--gpu-t4"}}'
```

---

## 📊 Database Field Summary

### MongoDB (api_key collection) - User Management
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `usage` | Integer | **Total cumulative usage units** | `6` |
| `hits` | Integer | **Total API calls made** | `2` |
| `name` | String | API key identifier | `"default"` |
| `active` | Boolean | Whether key is enabled | `true` |

### TimescaleDB (apikey table) - Analytics
| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `usage` | Double | **Usage units for this call** | `4.0` |
| `timestamp` | Timestamp | **When call was made** | `2025-06-01 15:04:35+00` |
| `task_type` | Text | Service type used | `"translation"` |
| `api_key_id` | Text | Links to MongoDB | `"680b368070069bee045b210c"` |

---

## 🔄 Data Flow

```
API Request → Usage Calculation → Dual Database Write
├── MongoDB: UPDATE usage counters (cumulative)
└── TimescaleDB: INSERT new record (time-series)
```

**Usage Calculation**: Character count = Usage units
- `"Hi"` = 2 characters = 2 usage units
- `"Test"` = 4 characters = 4 usage units

---

## 🛠️ Common Operations

### Check System Health
```bash
# Queue status
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host

# Worker logs
docker logs celery-metering --tail 10

# Database connectivity
docker exec -it timescaledb psql -U postgres -d dhruva -c "SELECT COUNT(*) FROM apikey;"
```

### Monitor Metering Process
```bash
# Watch for MongoDB updates in logs
docker logs celery-metering --follow | grep "Updated MongoDB usage"

# Check recent usage records
docker exec -it timescaledb psql -U postgres -d dhruva -c "SELECT * FROM apikey ORDER BY timestamp DESC LIMIT 3;"
```

### Troubleshoot Issues
```bash
# Check for stuck tasks
docker exec dhruva-platform-rabbitmq rabbitmqctl list_queues -p dhruva_host | grep data-log

# Verify data consistency
# MongoDB total should equal TimescaleDB sum for each API key
docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin admin --eval "db.api_key.find({}, {name: 1, usage: 1}).pretty()"
```

---

## 📈 Key Metrics

### Success Indicators
- ✅ Queue backlog: 0 messages
- ✅ MongoDB usage incrementing
- ✅ TimescaleDB records inserting
- ✅ Logs show "Updated MongoDB usage: +X units"

### Warning Signs
- ⚠️ Queue backlog > 100 messages
- ⚠️ MongoDB usage not updating
- ⚠️ Missing TimescaleDB records
- ⚠️ Celery worker errors

---

## 🔧 Quick Fixes

### Restart Metering Workers
```bash
docker compose -f docker-compose-metering.yml restart celery-metering
```

### Force Recreate All Services (if server code changed)
```bash
# 1. Rebuild server image
cd server && docker build -t dhruva-platform-server:latest-pg15 .

# 2. Force recreate all services
cd .. && docker compose -f docker-compose-db.yml -f docker-compose-metering.yml -f docker-compose-monitoring.yml -f docker-compose-app.yml up --force-recreate -d --remove-orphans
```

### Clear Queue Backlog
```bash
# Purge stuck messages (use with caution)
docker exec dhruva-platform-rabbitmq rabbitmqctl purge_queue data-log -p dhruva_host
```

---

## 📋 Verification Checklist

After making changes or troubleshooting:

1. **✅ Services Running**: All containers up and healthy
2. **✅ Queue Processing**: data-log queue at 0 messages
3. **✅ API Requests**: Test translation endpoint responds
4. **✅ MongoDB Updates**: usage and hits fields incrementing
5. **✅ TimescaleDB Writes**: New records appearing with correct usage
6. **✅ Data Consistency**: MongoDB totals match TimescaleDB sums
7. **✅ Worker Logs**: "Updated MongoDB usage" messages appearing

---

## 🚨 Emergency Procedures

### System Down
```bash
# Check all services
docker ps | grep dhruva

# Restart everything
docker compose -f docker-compose-db.yml -f docker-compose-metering.yml -f docker-compose-monitoring.yml -f docker-compose-app.yml restart
```

### Data Inconsistency
```bash
# Compare database totals
echo "MongoDB total:" && docker exec dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin admin --eval "db.api_key.aggregate([{$group: {_id: null, total: {$sum: '$usage'}}}])"

echo "TimescaleDB total:" && docker exec -it timescaledb psql -U postgres -d dhruva -c "SELECT SUM(usage) FROM apikey;"
```

### High Memory/CPU Usage
```bash
# Check resource usage
docker stats dhruva-platform-server celery-metering celery-monitoring --no-stream

# Scale workers if needed
docker compose -f docker-compose-metering.yml up --scale celery-metering=2 -d
```

---

## 📞 Support Information

**Documentation**: See `DHRUVA_METERING_SYSTEM_DOCUMENTATION.md` for complete details

**Log Locations**:
- Celery Workers: `docker logs celery-metering`
- API Server: `docker logs dhruva-platform-server`
- Database: `docker logs dhruva-platform-app-db`

**Key Files**:
- Metering Logic: `server/celery_backend/tasks/metering.py`
- Database Config: `server/celery_backend/tasks/database.py`
- API Routes: `server/module/inference/router/inference_router.py`

**Monitoring**:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- Flower (Celery): http://localhost:5555
