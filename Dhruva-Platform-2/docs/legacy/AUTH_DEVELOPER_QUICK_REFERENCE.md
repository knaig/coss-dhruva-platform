# Dhruva Platform Authentication - Developer Quick Reference

## 🚀 Quick Start Guide

### Authentication Methods

**JWT Token (Web Apps)**
```http
POST /auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}

# Response includes refresh token
# Use refresh token to get access token:
POST /auth/refresh
{
  "token": "refresh_token_here"
}

# Use access token for API calls:
Authorization: Bearer access_token_here
x-auth-source: AUTH_TOKEN
```

**API Key (Programmatic Access)**
```http
# Create API key first (requires authentication):
POST /auth/api-key
{
  "name": "my-service-key",
  "type": "INFERENCE",
  "data_tracking": true
}

# Use API key for requests:
Authorization: your_api_key_here
x-auth-source: API_KEY
```

---

## 🔐 Adding Authentication to New Endpoints

### Basic Authentication
```python
from auth.auth_provider import AuthProvider
from fastapi import Depends

@router.get("/protected-endpoint")
async def my_endpoint(
    auth: None = Depends(AuthProvider)  # Requires any valid auth
):
    return {"message": "Authenticated!"}
```

### Role-Based Authorization
```python
from auth.auth_provider import AuthProvider
from auth.role_authorization_provider import RoleAuthorizationProvider
from schema.auth.common import RoleType

@router.get("/admin-only")
async def admin_endpoint(
    auth: None = Depends(AuthProvider),
    role_auth: None = Depends(RoleAuthorizationProvider([RoleType.ADMIN]))
):
    return {"message": "Admin access granted!"}
```

### API Key Type Authorization
```python
from auth.api_key_type_authorization_provider import ApiKeyTypeAuthorizationProvider
from schema.auth.common import ApiKeyType

@router.get("/platform-api-only")
async def platform_endpoint(
    auth: None = Depends(AuthProvider),
    key_auth: None = Depends(ApiKeyTypeAuthorizationProvider(ApiKeyType.PLATFORM))
):
    return {"message": "Platform API key required!"}
```

### Getting User Context
```python
from auth.request_session_provider import InjectRequestSession, RequestSession

@router.get("/user-info")
async def get_user_info(
    auth: None = Depends(AuthProvider),
    session: RequestSession = Depends(InjectRequestSession)
):
    return {
        "user_id": session.id,
        "user_name": session.name,
        "user_email": session.email
    }
```

### Accessing Request State (Alternative)
```python
from fastapi import Request

@router.get("/request-state")
async def get_request_state(
    request: Request,
    auth: None = Depends(AuthProvider)
):
    return {
        "user_id": request.state.user_id,
        "api_key_name": getattr(request.state, 'api_key_name', None),
        "api_key_type": getattr(request.state, 'api_key_type', None)
    }
```

---

## 🛠️ Common Patterns

### Router-Level Authentication
```python
from fastapi import APIRouter

# All endpoints in this router require authentication
router = APIRouter(
    prefix="/api/v1",
    dependencies=[Depends(AuthProvider)]
)

@router.get("/endpoint1")  # Automatically protected
async def endpoint1():
    return {"data": "protected"}

@router.get("/endpoint2")  # Automatically protected  
async def endpoint2():
    return {"data": "also protected"}
```

### Mixed Authentication Requirements
```python
# Public endpoint (no auth required)
@router.get("/public")
async def public_endpoint():
    return {"message": "Public access"}

# Basic auth required
@router.get("/protected")
async def protected_endpoint(auth: None = Depends(AuthProvider)):
    return {"message": "Authenticated access"}

# Admin only
@router.get("/admin")
async def admin_endpoint(
    auth: None = Depends(AuthProvider),
    role: None = Depends(RoleAuthorizationProvider([RoleType.ADMIN]))
):
    return {"message": "Admin access"}
```

### Conditional Authorization
```python
from fastapi import HTTPException, status

@router.get("/conditional")
async def conditional_endpoint(
    request: Request,
    auth: None = Depends(AuthProvider),
    session: RequestSession = Depends(InjectRequestSession)
):
    # Custom authorization logic
    if session.role != RoleType.ADMIN and request.state.user_id != target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only access own resources"
        )
    
    return {"message": "Access granted"}
```

---

## 📊 Database Queries

### User Operations
```python
# Get user by email
user = user_repository.find_one({"email": "user@example.com"})

# Get user by ID
user = user_repository.get_by_id(ObjectId("user_id_here"))

# Create new user
new_user = User(
    name="John Doe",
    email="john@example.com", 
    password=hashed_password,  # Use Argon2!
    role=RoleType.CONSUMER
)
user_id = user_repository.insert_one(new_user)
```

### API Key Operations
```python
# Get API key by name and user
api_key = api_key_repository.find_one({
    "name": "my-key",
    "user_id": ObjectId("user_id_here")
})

# Get all API keys for user
api_keys = api_key_repository.find({"user_id": ObjectId("user_id_here")})

# Create new API key
new_key = ApiKey(
    name="my-new-key",
    api_key=secrets.token_urlsafe(48),
    masked_key=mask_key(api_key),
    active=True,
    user_id=ObjectId("user_id_here"),
    type=ApiKeyType.INFERENCE.value,
    created_timestamp=datetime.now(),
    data_tracking=True
)
key_id = api_key_repository.insert_one(new_key)
```

### Session Operations
```python
# Create session
session = Session(
    user_id=ObjectId("user_id_here"),
    type="access",  # or "refresh"
    timestamp=datetime.now()
)
session_id = session_repository.insert_one(session)

# Validate session exists
session = session_repository.find_one({"_id": ObjectId("session_id_here")})
```

---

## 🔍 Debugging Authentication Issues

### Common Error Messages
```python
# 401 Unauthorized
"Not authenticated" 
# → Check Authorization header and x-auth-source

# 403 Forbidden  
"Not authorized"
# → Check user role or API key type

# 404 Not Found
"User not found" / "API Key does not exist"
# → Check database records

# 400 Bad Request
"Invalid target user id"
# → Check ObjectId format
```

### Debug Checklist
1. **Check Headers**:
   - `Authorization: Bearer <token>` or `Authorization: <api_key>`
   - `x-auth-source: AUTH_TOKEN` or `x-auth-source: API_KEY`

2. **Verify Token/Key**:
   - JWT token not expired
   - API key exists and is active
   - Session exists in database

3. **Check Permissions**:
   - User has required role
   - API key has required type
   - User can access target resource

4. **Database State**:
   - User exists and is active
   - API key is not revoked
   - Session is valid

### Testing Authentication
```python
# Test with curl
curl -X GET "http://localhost:5050/auth/api-key/list" \
  -H "Authorization: your_api_key_here" \
  -H "x-auth-source: API_KEY"

# Test JWT flow
# 1. Login
curl -X POST "http://localhost:5050/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# 2. Get access token  
curl -X POST "http://localhost:5050/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"token":"refresh_token_from_step_1"}'

# 3. Use access token
curl -X GET "http://localhost:5050/auth/api-key/list" \
  -H "Authorization: Bearer access_token_from_step_2" \
  -H "x-auth-source: AUTH_TOKEN"
```

---

## ⚡ Performance Tips

### Caching
- API keys are automatically cached in Redis
- Sessions are NOT cached (database query on each request)
- Consider caching user roles for high-traffic endpoints

### Database Optimization
- Use indexes on frequently queried fields:
  - `user.email` (unique index)
  - `api_key.api_key` (unique index)  
  - `api_key.user_id` (compound index with name)
  - `session.user_id`

### Request State
- Access `request.state` properties directly for better performance
- Use `InjectRequestSession` only when you need full user object

---

## 🚨 Security Best Practices

### Password Handling
```python
# ✅ Correct - Use Argon2
from argon2 import PasswordHasher
ph = PasswordHasher()
hashed = ph.hash(password)
ph.verify(hashed, password)  # Verify

# ❌ Wrong - Never store plain text
user.password = request.password  # DON'T DO THIS
```

### API Key Generation
```python
# ✅ Correct - Cryptographically secure
import secrets
api_key = secrets.token_urlsafe(48)

# ❌ Wrong - Predictable
import random
api_key = str(random.randint(1000000, 9999999))  # DON'T DO THIS
```

### Error Handling
```python
# ✅ Correct - Generic error messages
raise ClientError(
    status_code=status.HTTP_401_UNAUTHORIZED,
    message="Invalid credentials"  # Don't reveal if user exists
)

# ❌ Wrong - Information disclosure
raise ClientError(
    status_code=status.HTTP_401_UNAUTHORIZED, 
    message="User john@example.com not found"  # Reveals user existence
)
```

### Input Validation
```python
# ✅ Correct - Use Pydantic models
class CreateUserRequest(BaseModel):
    email: EmailStr  # Validates email format
    password: str = Field(min_length=8)  # Minimum length

# ❌ Wrong - No validation
def create_user(email: str, password: str):  # No validation
```

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `auth/auth_provider.py` | Main authentication dispatcher |
| `auth/auth_token_provider.py` | JWT token validation |
| `auth/api_key_provider.py` | API key validation |
| `module/auth/service/auth_service.py` | Business logic |
| `module/auth/router/auth_router.py` | Auth endpoints |
| `module/auth/model/user.py` | User data model |
| `module/auth/model/api_key.py` | API key model & cache |
| `schema/auth/common/role_type.py` | Role definitions |
| `schema/auth/common/api_key_type.py` | API key types |

---

## 🔗 Related Documentation

- [Complete Authentication Analysis](./AUTHENTICATION_AUTHORIZATION_COMPREHENSIVE_ANALYSIS.md)
- [Security Implementation Guide](./AUTHENTICATION_SECURITY_IMPLEMENTATION_GUIDE.md)
- [API Documentation](./docs/api/)
- [Database Schema](./docs/database/)
