# Dhruva Platform Authentication & Authorization System

## Table of Contents
1. [Authentication Workflow Analysis](#authentication-workflow-analysis)
2. [Authorization System Documentation](#authorization-system-documentation)
3. [API Endpoint Security Classification](#api-endpoint-security-classification)
4. [Security Implementation Technical Details](#security-implementation-technical-details)
5. [Code References and Examples](#code-references-and-examples)

---

## 1. Authentication Workflow Analysis

### 1.1 Supported Authentication Methods

The Dhruva Platform supports a dual authentication system:

#### A. JWT Token-Based Authentication (`AUTH_TOKEN`)
- **Refresh Tokens**: Long-lived tokens (1 year expiration) for initial authentication
- **Access Tokens**: Short-lived tokens (30 days expiration) for API access
- **Session Management**: MongoDB-based session tracking with Redis caching

#### B. API Key Authentication (`API_KEY`)
- **Platform API Keys**: For administrative and user management operations
- **Inference API Keys**: For AI/ML model inference operations
- **Redis Caching**: API keys cached for performance optimization

### 1.2 Complete Authentication Flow

#### Initial Login Process

**File**: `server/module/auth/service/auth_service.py` (lines 67-119)

1. **User Validation**: Email/password verification using Argon2 password hashing
2. **Session Creation**: Creates a "refresh" session in MongoDB
3. **Refresh Token Generation**: JWT with 1-year expiration
4. **Token Structure**:
   ```json
   {
     "sub": "user_id",
     "name": "user_name", 
     "exp": "timestamp + 31536000",
     "iat": "current_timestamp",
     "sess_id": "session_id"
   }
   ```
5. **Headers**: `{"tok": "refresh"}` to identify token type

#### Access Token Generation

**File**: `server/module/auth/service/auth_service.py` (lines 121-170)

1. **Refresh Token Validation**: Verifies refresh token signature and type
2. **New Session Creation**: Creates an "access" session in MongoDB
3. **Access Token Generation**: JWT with 30-day expiration
4. **Token Structure**:
   ```json
   {
     "sub": "user_id",
     "name": "user_name",
     "exp": "timestamp + 2592000", 
     "iat": "current_timestamp",
     "sess_id": "access_session_id"
   }
   ```
5. **Headers**: `{"tok": "access"}` to identify token type

#### Token Validation Process

**File**: `server/auth/auth_token_provider.py` (lines 16-55)

1. **Header Verification**: Checks JWT header for `{"tok": "access"}`
2. **Signature Validation**: Verifies JWT using `JWT_SECRET_KEY`
3. **Session Verification**: Validates session exists in MongoDB
4. **Special Handling**: For inference/feedback endpoints, retrieves default API key
5. **Request State Population**: Sets `user_id`, `api_key_id`, `api_key_type` in request state

### 1.3 Session Management

#### MongoDB Collections

**Sessions Collection** (`server/module/auth/model/session.py`):
```python
class Session(MongoBaseModel):
    user_id: ObjectId
    type: str  # "refresh" or "access"
    timestamp: datetime.datetime
```

**Users Collection** (`server/module/auth/model/user.py`):
```python
class User(MongoBaseModel):
    name: str
    email: EmailStr
    password: str  # Argon2 hashed
    role: RoleType  # ADMIN or CONSUMER
```

#### Redis Caching

**File**: `server/cache/app_cache.py`

- **Connection**: Redis with password authentication
- **API Key Caching**: `ApiKeyCache` model for performance
- **Cache Invalidation**: Flushed on application startup

### 1.4 API Key Management

#### API Key Structure

**File**: `server/module/auth/model/api_key.py`

```python
class ApiKey(MongoBaseModel):
    name: str
    api_key: str           # Full API key
    masked_key: str        # Masked version for display
    active: bool
    user_id: ObjectId
    type: str             # "PLATFORM" or "INFERENCE"
    created_timestamp: datetime
    usage: int = 0
    hits: int = 0
    data_tracking: bool
    services: List[_ServiceUsage] = []
```

#### API Key Validation

**File**: `server/auth/api_key_provider.py` (lines 19-37)

1. **Cache Lookup**: First checks Redis cache for API key
2. **Database Fallback**: If not cached, queries MongoDB and populates cache
3. **Active Status Check**: Validates API key is active
4. **Request State Population**: Sets API key details in request state

### 1.5 Authentication Headers

#### Required Headers

1. **Authorization**: Contains JWT token or API key
2. **x-auth-source**: Specifies authentication method
   - `AUTH_TOKEN`: For JWT-based authentication
   - `API_KEY`: For API key-based authentication (default)

#### Header Processing

**File**: `server/auth/auth_provider.py` (lines 13-42)

The `AuthProvider` dependency handles both authentication methods based on the `x-auth-source` header.

---

## 2. Authorization System Documentation

### 2.1 User Roles and Permissions

#### Role Types

**File**: `server/schema/auth/common/role_type.py`

```python
class RoleType(str, Enum):
    ADMIN = "ADMIN"
    CONSUMER = "CONSUMER"
```

#### Role Hierarchy and Permissions

1. **ADMIN Role**:
   - Full system access
   - User management capabilities
   - Service administration
   - API key management for all users
   - Dashboard access

2. **CONSUMER Role**:
   - Limited to own resources
   - API key management for own account
   - Inference service access
   - Feedback submission

### 2.2 API Key Types and Authorization

#### API Key Types

**File**: `server/schema/auth/common/api_key_type.py`

```python
class ApiKeyType(str, Enum):
    PLATFORM = "PLATFORM"
    INFERENCE = "INFERENCE"
```

#### API Key Type Permissions

1. **PLATFORM API Keys**:
   - User management operations
   - Administrative functions
   - Service configuration
   - Required for `/admin/*` and `/user/*` endpoints

2. **INFERENCE API Keys**:
   - AI/ML model inference
   - Feedback submission
   - Service details access
   - Required for `/services/inference/*` and `/services/feedback/*` endpoints

### 2.3 Role-Based Access Control (RBAC) Implementation

#### Role Authorization Provider

**File**: `server/auth/role_authorization_provider.py`

```python
class RoleAuthorizationProvider:
    def __init__(self, roles: List[RoleType]) -> None:
        self.roles = roles

    def __call__(self, request: Request, db: Database = Depends(AppDatabase)):
        user_collection = db["user"]
        user = user_collection.find_one({"_id": ObjectId(request.state.user_id)})
        user_role = RoleType[user["role"]]
        
        # ADMIN role has universal access
        if user_role == RoleType.ADMIN:
            return
            
        # Check if user role is in allowed roles
        if user_role not in self.roles:
            raise ClientError(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Not authorized",
            )
```

#### API Key Type Authorization Provider

**File**: `server/auth/api_key_type_authorization_provider.py`

```python
class ApiKeyTypeAuthorizationProvider:
    def __init__(self, required_type: ApiKeyType):
        self.required_type = required_type

    def __call__(self, request: Request, x_auth_source: TokenType = Header(default=TokenType.API_KEY)):
        # AUTH_TOKEN bypasses API key type checks
        if x_auth_source == TokenType.AUTH_TOKEN:
            return
            
        # Validate API key type matches requirement
        if ApiKeyType[request.state.api_key_type] != self.required_type:
            raise ClientError(
                status_code=status.HTTP_403_FORBIDDEN,
                message="Not authorized",
            )
```

### 2.4 Permission Checking Mechanisms

#### Middleware-Based Authorization

Authorization is enforced through FastAPI dependencies at the router level:

1. **AuthProvider**: Validates authentication credentials
2. **RoleAuthorizationProvider**: Checks user role permissions
3. **ApiKeyTypeAuthorizationProvider**: Validates API key type requirements

#### Request State Management

**File**: `server/auth/request_session_provider.py`

The `InjectRequestSession` dependency provides session details to protected routes:

```python
def InjectRequestSession(
    credentials_bearer: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    credentials_key: Optional[str] = Depends(APIKeyHeader(name="Authorization")),
    x_auth_source: TokenType = Header(default=TokenType.API_KEY),
    db: Database = Depends(AppDatabase),
):
    match x_auth_source:
        case TokenType.AUTH_TOKEN:
            session = auth_token_provider.fetch_session(credentials_bearer.credentials, db)
        case TokenType.API_KEY:
            session = api_key_provider.fetch_session(credentials_key, db)
    
    return RequestSession(**session)
```

---

## 3. API Endpoint Security Classification

### 3.1 Public Endpoints (No Authentication Required)

#### Root Endpoint
- **URL**: `/`
- **Method**: GET
- **Purpose**: Welcome message
- **File**: `server/main.py` (line 186-188)

#### Authentication Endpoints
- **URL**: `/auth/signin`
- **Method**: POST
- **Purpose**: User login
- **File**: `server/module/auth/router/auth_router.py`
- **Dependencies**: None (public endpoint)

#### Metrics Endpoint
- **URL**: `/metrics`
- **Method**: GET
- **Purpose**: Prometheus metrics
- **File**: `server/main.py` (line 43-44)

### 3.2 Consumer/User Endpoints (Requires Valid Authentication)

#### API Key Management
- **Base URL**: `/auth/api-key/*`
- **Dependencies**: `AuthProvider`
- **File**: `server/module/auth/router/api_key_router.py`
- **Endpoints**:
  - `GET /auth/api-key/list` - List user's API keys
  - `POST /auth/api-key` - Create new API key
  - `GET /auth/api-key` - Get specific API key details

#### Service Details
- **Base URL**: `/services/details/*`
- **Dependencies**: `AuthProvider`, `ApiKeyTypeAuthorizationProvider(ApiKeyType.INFERENCE)`
- **File**: `server/module/services/router/details_router.py`
- **Endpoints**:
  - `GET /services/details/list_services` - List available services
  - `GET /services/details/list_models` - List available models

#### Inference Services
- **Base URL**: `/services/inference/*`
- **Dependencies**: `AuthProvider`, `ApiKeyTypeAuthorizationProvider(ApiKeyType.INFERENCE)`
- **File**: `server/module/services/router/inference_router.py`
- **Endpoints**:
  - `POST /services/inference/translation` - Translation inference
  - `POST /services/inference/asr` - Speech recognition
  - `POST /services/inference/tts` - Text-to-speech
  - `POST /services/inference/ner` - Named entity recognition
  - `POST /services/inference/transliteration` - Transliteration
  - `POST /services/inference/vad` - Voice activity detection

#### Feedback Services
- **Base URL**: `/services/feedback/*`
- **Dependencies**: `AuthProvider`, `ApiKeyTypeAuthorizationProvider(ApiKeyType.INFERENCE)`
- **File**: `server/module/services/router/feedback_router.py`
- **Endpoints**:
  - `POST /services/feedback/submit` - Submit feedback
  - `GET /services/feedback/questions` - Get feedback questions
  - `GET /services/feedback/download` - Download feedback data

### 3.3 Platform API Endpoints (Requires Platform API Key)

#### User Management
- **Base URL**: `/auth/user/*`
- **Dependencies**: `AuthProvider`, `ApiKeyTypeAuthorizationProvider(ApiKeyType.PLATFORM)`
- **File**: `server/module/auth/router/user_router.py`
- **Endpoints**:
  - `GET /auth/user` - Get user details
  - `POST /auth/user` - Create new user
  - `PUT /auth/user/{user_id}` - Update user
  - `GET /auth/user/list` - List all users

### 3.4 Admin-Only Endpoints (Requires Admin Role + Platform API Key)

#### Administrative Dashboard
- **Base URL**: `/services/admin/*`
- **Dependencies**: 
  - `AuthProvider`
  - `RoleAuthorizationProvider([RoleType.ADMIN])`
  - `ApiKeyTypeAuthorizationProvider(ApiKeyType.PLATFORM)`
- **File**: `server/module/services/router/admin_router.py`
- **Endpoints**:
  - `GET /services/admin/dashboard` - Admin dashboard data
  - `POST /services/admin/model` - Create model
  - `PUT /services/admin/model/{model_id}` - Update model
  - `POST /services/admin/service` - Create service
  - `PUT /services/admin/service/{service_id}` - Update service
  - `POST /services/admin/service/heartbeat` - Service heartbeat

---

## 4. Security Implementation Technical Details

### 4.1 Authentication Middleware and Security Functions

#### Core Authentication Provider

**File**: `server/auth/auth_provider.py`

The `AuthProvider` function serves as the main authentication middleware:

```python
def AuthProvider(
    request: Request,
    credentials_bearer: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    credentials_key: Optional[str] = Depends(APIKeyHeader(name="Authorization")),
    x_auth_source: TokenType = Header(default=TokenType.API_KEY),
    db: Database = Depends(AppDatabase),
):
    match x_auth_source:
        case TokenType.AUTH_TOKEN:
            validate_status = auth_token_provider.validate_credentials(
                credentials_bearer.credentials, request, db
            )
        case TokenType.API_KEY:
            validate_status = api_key_provider.validate_credentials(
                credentials_key, request, db
            )
    
    if not validate_status:
        raise ClientError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            message="Not authenticated",
        )
```

#### JWT Token Validation

**File**: `server/auth/auth_token_provider.py`

```python
def validate_credentials(credentials: str, request: Request, db: Database) -> bool:
    # Verify JWT header contains "access" token type
    headers = jwt.get_unverified_header(credentials)
    if headers["tok"] != "access":
        return False
    
    # Decode and verify JWT signature
    claims = jwt.decode(credentials, key=os.environ["JWT_SECRET_KEY"], algorithms=["HS256"])
    
    # Verify session exists in MongoDB
    session_collection = db["session"]
    session = session_collection.find_one({"_id": ObjectId(claims["sess_id"])})
    
    # Special handling for inference/feedback endpoints
    if "inference" in request.url.path or "feedback" in request.url.path:
        # Retrieve default API key for the user
        api_key_collection = db["api_key"]
        api_key = api_key_collection.find_one(
            {"name": "default", "user_id": ObjectId(claims["sub"])}
        )
        
        # Populate request state with API key details
        request.state.api_key_id = api_key["_id"]
        request.state.api_key_type = api_key["type"]
        request.state.api_key_name = "default"
    
    request.state.user_id = claims["sub"]
    return session is not None
```

#### API Key Validation

**File**: `server/auth/api_key_provider.py`

```python
def validate_credentials(credentials: str, request: Request, db: Database) -> bool:
    try:
        # Try to get API key from Redis cache
        api_key = ApiKeyCache.get(credentials)
    except NotFoundError:
        # If not in cache, query MongoDB and populate cache
        api_key = populate_api_key_cache(credentials, db)
    
    # Check if API key is active
    if not bool(api_key.active):
        return False
    
    # Populate request state with API key details
    request.state.api_key_name = api_key.name
    request.state.user_id = api_key.user_id
    request.state.api_key_id = api_key.id
    request.state.api_key_data_tracking = bool(api_key.data_tracking)
    request.state.api_key_type = api_key.type
    
    return True
```

### 4.2 Database Schemas

#### MongoDB Collections

**Users Collection Schema**:
```javascript
{
  "_id": ObjectId,
  "name": String,
  "email": String,
  "password": String,  // Argon2 hashed
  "role": String       // "ADMIN" or "CONSUMER"
}
```

**Sessions Collection Schema**:
```javascript
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "type": String,      // "refresh" or "access"
  "timestamp": Date
}
```

**API Keys Collection Schema**:
```javascript
{
  "_id": ObjectId,
  "name": String,
  "api_key": String,
  "masked_key": String,
  "active": Boolean,
  "user_id": ObjectId,
  "type": String,      // "PLATFORM" or "INFERENCE"
  "created_timestamp": Date,
  "usage": Number,
  "hits": Number,
  "data_tracking": Boolean,
  "services": [
    {
      "service_id": String,
      "usage": Number,
      "hits": Number
    }
  ]
}
```

#### TimescaleDB Metrics Schema

**File**: `server/module/services/model/api_key_metering.py`

```python
class ApiKeyMetering(Base):
    __tablename__ = "apikey"
    
    api_key_id = Column("api_key_id", Text)
    api_key_name = Column("api_key_name", Text)
    user_id = Column("user_id", Text)
    user_email = Column("user_email", Text)
    inference_service_id = Column("inference_service_id", Text)
    task_type = Column("task_type", Text)
    usage = Column("usage", Float)
    timestamp = Column("timestamp", DateTime(timezone=True), primary_key=True)
```

### 4.3 Redis Caching Implementation

#### Cache Configuration

**File**: `server/cache/app_cache.py`

```python
def get_cache_connection():
    return get_redis_connection(
        host=os.environ.get("REDIS_HOST"),
        port=os.environ.get("REDIS_PORT"),
        db=os.environ.get("REDIS_DB"),
        password=os.environ.get("REDIS_PASSWORD"),
        ssl=os.environ.get("REDIS_SECURE") == "true",
    )
```

#### API Key Caching

**File**: `server/module/auth/model/api_key.py`

```python
ApiKeyCache = create_model(
    "ApiKeyCache",
    __base__=CacheBaseModel,
    **generate_cache_model(ApiKey, primary_key_field="api_key")
)
```

#### Cache Management

- **Cache Key Pattern**: `Dhruva:ApiKeyCache:{api_key}`
- **TTL**: No explicit TTL set (persistent until manual invalidation)
- **Invalidation**: Application startup flushes all cache

### 4.4 Security Configuration

#### Environment Variables

**Required Security Variables**:
```bash
# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret_key_here

# Database Authentication
MONGO_APP_DB_USERNAME=dhruvaadmin
MONGO_APP_DB_PASSWORD=dhruva123
APP_DB_NAME=admin
APP_DB_CONNECTION_STRING=mongodb://${MONGO_APP_DB_USERNAME}:${MONGO_APP_DB_PASSWORD}@dhruva-platform-app-db:27017/admin?authSource=admin

# Redis Authentication
REDIS_HOST=dhruva-platform-redis
REDIS_PORT=6379
REDIS_PASSWORD=dhruva123
REDIS_DB=0
REDIS_SECURE=false

# TimescaleDB Authentication
TIMESCALE_USER=dhruva
TIMESCALE_PASSWORD=dhruva123
TIMESCALE_DATABASE_NAME=dhruva_metering
```

#### Password Security

**File**: `server/module/auth/service/auth_service.py`

- **Hashing Algorithm**: Argon2 (via `argon2-cffi` library)
- **Password Verification**: `PasswordHasher().verify()`
- **Rehashing Check**: `PasswordHasher().check_needs_rehash()`

#### JWT Security

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secret Key**: Environment variable `JWT_SECRET_KEY`
- **Token Types**: Identified by header `{"tok": "refresh|access"}`
- **Expiration**: 
  - Refresh tokens: 1 year (31,536,000 seconds)
  - Access tokens: 30 days (2,592,000 seconds)

### 4.5 CORS and Security Headers

**File**: `server/main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Note**: Current CORS configuration allows all origins, which should be restricted in production.

---

## 5. Code References and Examples

### 5.1 Key Authentication Components

#### File Structure
```
server/
├── auth/
│   ├── auth_provider.py                    # Main authentication middleware
│   ├── auth_token_provider.py              # JWT token validation
│   ├── api_key_provider.py                 # API key validation
│   ├── role_authorization_provider.py      # Role-based access control
│   ├── api_key_type_authorization_provider.py  # API key type validation
│   ├── request_session_provider.py         # Session injection
│   └── token_type.py                       # Token type enumeration
├── module/auth/
│   ├── model/
│   │   ├── user.py                         # User data model
│   │   ├── session.py                      # Session data model
│   │   └── api_key.py                      # API key data model
│   ├── service/
│   │   ├── auth_service.py                 # Authentication business logic
│   │   └── user_service.py                 # User management logic
│   ├── repository/
│   │   └── user_repository.py              # User data access
│   └── router/
│       ├── auth_router.py                  # Authentication endpoints
│       ├── user_router.py                  # User management endpoints
│       └── api_key_router.py               # API key management endpoints
└── schema/auth/
    ├── common/
    │   ├── role_type.py                    # Role enumeration
    │   └── api_key_type.py                 # API key type enumeration
    ├── request/                            # Request schemas
    └── response/                           # Response schemas
```

### 5.2 Authentication Flow Examples

#### Example 1: User Login

**Request**:
```bash
curl -X POST "http://localhost:8000/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response**:
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsInRvayI6InJlZnJlc2gifQ...",
  "role": "CONSUMER"
}
```

#### Example 2: Get Access Token

**Request**:
```bash
curl -X POST "http://localhost:8000/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "refresh_token_here"
  }'
```

**Response**:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsInRvayI6ImFjY2VzcyJ9..."
}
```

#### Example 3: API Key Authentication

**Request**:
```bash
curl -X GET "http://localhost:8000/services/details/list_models" \
  -H "Authorization: your_api_key_here" \
  -H "x-auth-source: API_KEY"
```

#### Example 4: JWT Token Authentication

**Request**:
```bash
curl -X GET "http://localhost:8000/auth/api-key/list" \
  -H "Authorization: Bearer access_token_here" \
  -H "x-auth-source: AUTH_TOKEN"
```

### 5.3 Router Configuration Examples

#### Example 1: Public Endpoint

<augment_code_snippet path="server/module/auth/router/auth_router.py" mode="EXCERPT">
````python
router = APIRouter(
    responses={"401": {"model": ClientErrorResponse}},
)

@router.post("/signin", response_model=SignInResponse)
async def _sign_in(
    request: SignInRequest, auth_service: AuthService = Depends(AuthService)
):
    res = auth_service.validate_user(request)
    return res
````
</augment_code_snippet>

#### Example 2: Protected Endpoint with Authentication

<augment_code_snippet path="server/module/auth/router/api_key_router.py" mode="EXCERPT">
````python
router = APIRouter(
    prefix="/api-key",
    dependencies=[
        Depends(AuthProvider),
    ],
    responses={"401": {"model": ClientErrorResponse}},
)
````
</augment_code_snippet>

#### Example 3: Admin-Only Endpoint

<augment_code_snippet path="server/module/services/router/admin_router.py" mode="EXCERPT">
````python
router = APIRouter(
    prefix="/admin",
    dependencies=[
        Depends(AuthProvider),
        Depends(RoleAuthorizationProvider([RoleType.ADMIN])),
        Depends(ApiKeyTypeAuthorizationProvider(ApiKeyType.PLATFORM)),
    ],
    responses={
        "401": {"model": ClientErrorResponse},
        "403": {"model": ClientErrorResponse},
    },
)
````
</augment_code_snippet>

#### Example 4: Inference Endpoint

<augment_code_snippet path="server/module/services/router/inference_router.py" mode="EXCERPT">
````python
router = APIRouter(
    prefix="/inference",
    route_class=InferenceLoggingRoute,
    dependencies=[
        Depends(AuthProvider),
        Depends(ApiKeyTypeAuthorizationProvider(ApiKeyType.INFERENCE)),
    ],
    responses={
        "401": {"model": ClientErrorResponse},
        "403": {"model": ClientErrorResponse},
    },
)
````
</augment_code_snippet>

### 5.4 Security Constants and Configuration

#### Token Types

<augment_code_snippet path="server/auth/token_type.py" mode="EXCERPT">
````python
class TokenType(Enum):
    AUTH_TOKEN = "AUTH_TOKEN"
    API_KEY = "API_KEY"
````
</augment_code_snippet>

#### Role Types

<augment_code_snippet path="server/schema/auth/common/role_type.py" mode="EXCERPT">
````python
class RoleType(str, Enum):
    ADMIN = "ADMIN"
    CONSUMER = "CONSUMER"
````
</augment_code_snippet>

#### API Key Types

<augment_code_snippet path="server/schema/auth/common/api_key_type.py" mode="EXCERPT">
````python
class ApiKeyType(str, Enum):
    PLATFORM = "PLATFORM"
    INFERENCE = "INFERENCE"
````
</augment_code_snippet>

### 5.5 Database Connection Examples

#### MongoDB Connection

<augment_code_snippet path="server/db/database.py" mode="EXCERPT">
````python
def AppDatabase() -> Database:
    mongo_db = db_client["app"][os.environ["APP_DB_NAME"]]
    return mongo_db
````
</augment_code_snippet>

#### Redis Connection

<augment_code_snippet path="server/cache/app_cache.py" mode="EXCERPT">
````python
def get_cache_connection():
    return get_redis_connection(
        host=os.environ.get("REDIS_HOST"),
        port=os.environ.get("REDIS_PORT"),
        db=os.environ.get("REDIS_DB"),
        password=os.environ.get("REDIS_PASSWORD"),
        ssl=os.environ.get("REDIS_SECURE") == "true",
    )
````
</augment_code_snippet>

---

## Summary

The Dhruva Platform implements a comprehensive dual authentication system supporting both JWT tokens and API keys, with role-based authorization and API key type restrictions. The system provides:

1. **Secure Authentication**: Argon2 password hashing, JWT tokens with proper expiration
2. **Flexible Authorization**: Role-based access control with admin/consumer roles
3. **Performance Optimization**: Redis caching for API keys and session data
4. **Comprehensive Logging**: TimescaleDB metrics for usage tracking
5. **Modular Architecture**: Clean separation of authentication, authorization, and business logic

The implementation follows security best practices with proper token validation, session management, and granular permission controls across different endpoint categories.
