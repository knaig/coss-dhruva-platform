# Dhruva Platform - Quick Reference

## Common AI Prompts for Development

### Backend Development

#### Creating a New Router
```
Create a FastAPI router for [feature] with authentication and proper error handling following the Dhruva Platform patterns
```

#### Adding Repository Methods
```
Add a repository method to find [entity] by [field] using the BaseRepository pattern
```

#### Data Transformation
```
Transform this MongoDB model to match the API response schema, handling complex nested objects
```

#### Error Handling
```
Add proper error handling to this function using the project's error patterns and specific error codes
```

### Frontend Development

#### API Client Functions
```
Create an API client function for [endpoint] using the project's axios configuration and TypeScript types
```

#### React Components
```
Create a React component for [feature] using Chakra UI and following the project's component patterns
```

#### Type Definitions
```
Create TypeScript interfaces for [data] matching the backend API response format
```

## File Templates

### FastAPI Router Template
```python
from typing import List
from fastapi import APIRouter, Depends
from auth.auth_provider import AuthProvider
from auth.api_key_type_authorization_provider import ApiKeyTypeAuthorizationProvider
from schema.auth.common import ApiKeyType

router = APIRouter(
    prefix="/feature",
    dependencies=[
        Depends(AuthProvider),
        Depends(ApiKeyTypeAuthorizationProvider(ApiKeyType.INFERENCE)),
    ],
)

@router.get("/endpoint", response_model=List[ResponseModel])
async def endpoint_function(repository: Repository = Depends(Repository)):
    try:
        result = repository.find_all()
        return [transform_to_response(item) for item in result]
    except Exception:
        raise BaseError(Errors.ERROR_CODE.value, traceback.format_exc())
```

### Repository Template
```python
from typing import Optional
from db.BaseRepository import BaseRepository
from ..model import EntityModel

class EntityRepository(BaseRepository[EntityModel]):
    __collection_name__ = "entity"

    def __init__(self, db: Database = Depends(AppDatabase)) -> None:
        super().__init__(db, self.__collection_name__)

    def find_by_field(self, field_value: str) -> Optional[EntityModel]:
        return super().find_one({"field": field_value})
```

### API Client Template
```typescript
import { dhruvaAPI, apiInstance } from "./apiConfig";

interface EntityResponse {
  id: string;
  name: string;
  status: string;
}

const getEntity = async (id: string): Promise<EntityResponse> => {
  const response = await apiInstance({
    method: "GET",
    url: `${dhruvaAPI.baseURL}/services/entity/${id}`,
  });
  return response.data;
};

export { getEntity };
```

## Common Patterns

### Authentication Headers
```typescript
// API Key
headers: {
  "Authorization": "api_key_value",
  "x-auth-source": "API_KEY"
}

// JWT Token
headers: {
  "Authorization": "Bearer jwt_token",
  "x-auth-source": "AUTH_TOKEN"
}
```

### Error Handling
```python
# Repository level
try:
    result = self.collection.find_one(query)
    return result
except Exception:
    raise BaseError(Errors.DHRUVA_ERROR.value, traceback.format_exc())

# Router level
if not result:
    raise ClientError(status.HTTP_404_NOT_FOUND, message="Entity not found")
```

### Data Transformation
```python
# Complex object to simple response
def transform_to_response(db_model):
    return ResponseModel(
        id=db_model.id,
        name=db_model.name,
        status=db_model.status.type if db_model.status else "unknown",
        metadata=db_model.metadata.get("key", "default") if db_model.metadata else {}
    )
```

## Docker Commands

### Complete Stack Deployment
```bash
# Deploy all services in correct order
docker compose -f docker-compose-db.yml -f docker-compose-metering.yml \
  -f docker-compose-monitoring.yml -f docker-compose-app.yml \
  up -d --remove-orphans

# Force recreation of all services
docker compose -f docker-compose-db.yml -f docker-compose-metering.yml \
  -f docker-compose-monitoring.yml -f docker-compose-app.yml \
  up --force-recreate -d

# Shutdown all services
docker compose -f docker-compose-app.yml -f docker-compose-monitoring.yml \
  -f docker-compose-metering.yml -f docker-compose-db.yml down
```

### Build and Deploy
```bash
# Build server image
docker build -t dhruva-platform-server:latest-pg15 ./server

# Build all images using script
./build-images.sh

# Check service health
docker compose -f docker-compose-db.yml -f docker-compose-metering.yml \
  -f docker-compose-monitoring.yml -f docker-compose-app.yml ps
```

### Service-Specific Logs
```bash
# Application logs
docker logs dhruva-platform-server --tail 100 -f
docker logs dhruva-platform-worker --tail 50 -f

# Database logs
docker logs dhruva-platform-app-db --tail 50 -f
docker logs dhruva-platform-redis --tail 50 -f

# Monitoring logs
docker logs dhruva-platform-prometheus --tail 50 -f
docker logs dhruva-platform-grafana --tail 50 -f

# Metering logs
docker logs dhruva-platform-rabbitmq --tail 50 -f
docker logs celery-metering --tail 100 -f
```

### Database Access
```bash
# Connect to MongoDB
docker exec -it dhruva-platform-app-db mongosh \
  --username dhruvaadmin --password dhruva123 --authenticationDatabase admin

# Connect to Redis
docker exec -it dhruva-platform-redis redis-cli
```

## Testing Commands

### API Testing
```bash
# Test with API key
curl -X GET "http://localhost:8000/services/endpoint" \
  -H "Authorization: api_key_here" \
  -H "x-auth-source: API_KEY"

# Test with JWT token
curl -X GET "http://localhost:8000/services/endpoint" \
  -H "Authorization: Bearer jwt_token_here" \
  -H "x-auth-source: AUTH_TOKEN"
```

### Python Testing
```bash
# Run tests
cd server && python -m pytest tests/

# Run specific test
python -m pytest tests/test_specific.py::test_function
```

## Directory Quick Reference

```
Dhruva-Platform-2/
├── .cursorrules              # AI assistant rules
├── server/                   # Python FastAPI backend
│   ├── main.py              # App entry point
│   ├── module/              # Business logic
│   │   ├── auth/           # Authentication module
│   │   └── services/       # Core services
│   ├── schema/             # Request/Response models
│   ├── db/                 # Database utilities
│   └── exception/          # Error handling
├── client/                  # Next.js frontend
│   ├── api/                # API client functions
│   ├── components/         # React components
│   ├── pages/              # Next.js pages
│   └── types/              # TypeScript definitions
├── docker-compose-*.yml     # Docker services
└── .env                    # Environment variables
```

## Key Files to Know

- **`.cursorrules`** - AI assistant configuration
- **`server/main.py`** - FastAPI app setup
- **`server/module/services/router/`** - API endpoints
- **`server/schema/`** - Request/response models
- **`client/api/apiConfig.ts`** - API client setup
- **`docker-compose-app.yml`** - Main services
- **`.env`** - Environment configuration

## Environment Variables

```bash
# Database
MONGO_APP_DB_USERNAME=dhruvaadmin
MONGO_APP_DB_PASSWORD=dhruva123
APP_DB_NAME=admin

# Redis
REDIS_HOST=dhruva-platform-redis
REDIS_PORT=6379
REDIS_PASSWORD=dhruva123

# TimescaleDB
TIMESCALE_USER=dhruva
TIMESCALE_PASSWORD=dhruva123
TIMESCALE_DATABASE_NAME=dhruva_metering

# RabbitMQ
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=admin123
RABBITMQ_DEFAULT_VHOST=dhruva_host

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123

# Authentication
JWT_SECRET_KEY=your_secret_key
```

## Troubleshooting Quick Commands

### Service Health Check
```bash
# Check all services status
docker compose -f docker-compose-db.yml -f docker-compose-metering.yml \
  -f docker-compose-monitoring.yml -f docker-compose-app.yml ps

# Check specific service health
docker inspect dhruva-platform-server --format='{{.State.Health.Status}}'
```

### Database Connectivity
```bash
# Test MongoDB connection
docker exec dhruva-platform-server python -c "
from pymongo import MongoClient
client = MongoClient('mongodb://dhruvaadmin:dhruva123@dhruva-platform-app-db:27017/admin?authSource=admin')
print('MongoDB:', client.admin.list_collection_names())
"

# Test Redis connection
docker exec dhruva-platform-server python -c "
import redis
r = redis.Redis(host='dhruva-platform-redis', port=6379, password='dhruva123')
print('Redis ping:', r.ping())
"
```

### API Testing
```bash
# Test API with authentication
curl -X GET "http://localhost:8000/services/details/list_models" \
  -H "Authorization: resEY0jeJ5KqTFyV3xaLineuRMgBqvsSneEiUG_Ic4yJVVrPFSPGMlNM3ySVzznE" \
  -H "x-auth-source: API_KEY"

# Check service health endpoints
curl -f http://localhost:8000/health
curl -f http://localhost:3000/api/health
curl -f http://localhost:9090/-/healthy
```

### Resource Monitoring
```bash
# Check container resource usage
docker stats --no-stream

# Check disk usage
docker system df

# Monitor specific services
docker stats dhruva-platform-server dhruva-platform-app-db dhruva-platform-redis
```

## Service URLs

### Internal (Docker Network)
- MongoDB: `mongodb://dhruvaadmin:dhruva123@dhruva-platform-app-db:27017/admin?authSource=admin`
- Redis: `redis://:dhruva123@dhruva-platform-redis:6379`
- RabbitMQ: `amqp://admin:admin123@dhruva-platform-rabbitmq:5672/dhruva_host`

### External (Host Access)
- API Server: http://localhost:8000
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Flower (Celery): http://localhost:5555
- Mongo Express: http://localhost:8081
- RabbitMQ Management: http://localhost:15672

This quick reference should help you navigate the project efficiently and use the AI assistant effectively!
