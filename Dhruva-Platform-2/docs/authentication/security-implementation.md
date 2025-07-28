# Dhruva Platform Authentication Security Implementation Guide

## Security Checklist & Implementation Roadmap

### Current Security Status ✅❌⚠️

#### ✅ Implemented Security Measures
- **Password Security**: Argon2 hashing with proper configuration
- **Token Security**: JWT with HMAC-SHA256, proper expiration times
- **API Key Security**: Cryptographically secure generation (48 bytes)
- **Authorization**: Role-based access control (RBAC)
- **Data Validation**: Pydantic models with type checking
- **Database Security**: Parameterized queries, no SQL injection risk
- **Session Management**: Database-backed session validation

#### ❌ Critical Security Gaps (Immediate Action Required)
- **No Rate Limiting**: Vulnerable to brute force attacks
- **No Account Lockout**: Unlimited failed login attempts
- **No Password Policy**: Weak passwords accepted
- **No API Key Expiration**: Keys never expire automatically
- **No Session Timeout**: Long-lived access tokens (30 days)
- **No Audit Logging**: Limited security event tracking

#### ⚠️ Security Improvements Needed (Short-term)
- **Limited Input Validation**: Some endpoints lack comprehensive validation
- **No IP Restrictions**: API keys usable from any location
- **No Request Signing**: API keys transmitted in plain headers
- **No Multi-Factor Authentication**: Single factor only
- **No CSRF Protection**: Though API-first design mitigates risk

---

## Priority 1: Critical Security Implementations

### 1. Rate Limiting Implementation

**Objective**: Prevent brute force attacks and API abuse

**Implementation Strategy**:
```python
# requirements.txt addition
slowapi==0.1.9

# middleware/rate_limiter.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address)

# Rate limiting rules
AUTH_RATE_LIMITS = {
    "signin": "5/minute",      # 5 attempts per minute
    "signup": "3/minute",      # 3 registrations per minute  
    "refresh": "10/minute",    # 10 token refreshes per minute
    "api_key_create": "5/hour" # 5 API key creations per hour
}

# Apply to auth endpoints
@router.post("/signin")
@limiter.limit("5/minute")
async def _sign_in(request: Request, ...):
    # existing implementation
```

**Configuration**:
- Use Redis as rate limiting backend
- Different limits for different endpoints
- Progressive delays for repeated violations
- Whitelist for admin IPs

### 2. Account Lockout Mechanism

**Objective**: Prevent persistent brute force attacks

**Implementation Strategy**:
```python
# models/user_security.py
class UserSecurity(MongoBaseModel):
    user_id: ObjectId
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_failed_attempt: Optional[datetime] = None

# service/security_service.py
class SecurityService:
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)
    
    async def check_account_lockout(self, user_id: ObjectId) -> bool:
        security = await self.get_user_security(user_id)
        if security.locked_until and security.locked_until > datetime.now():
            return True
        return False
    
    async def record_failed_attempt(self, user_id: ObjectId):
        security = await self.get_user_security(user_id)
        security.failed_attempts += 1
        security.last_failed_attempt = datetime.now()
        
        if security.failed_attempts >= self.MAX_FAILED_ATTEMPTS:
            security.locked_until = datetime.now() + self.LOCKOUT_DURATION
        
        await self.save_user_security(security)
```

### 3. Password Policy Enforcement

**Objective**: Ensure strong password requirements

**Implementation Strategy**:
```python
# validators/password_validator.py
import re
from typing import List

class PasswordPolicy:
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True  
    REQUIRE_DIGITS = True
    REQUIRE_SPECIAL = True
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    @classmethod
    def validate_password(cls, password: str) -> List[str]:
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters")
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must be no more than {cls.MAX_LENGTH} characters")
        
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if cls.REQUIRE_DIGITS and not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if cls.REQUIRE_SPECIAL and not re.search(f'[{re.escape(cls.SPECIAL_CHARS)}]', password):
            errors.append("Password must contain at least one special character")
        
        return errors

# schema/auth/request/signup_request.py
from pydantic import validator

class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password_strength(cls, v):
        errors = PasswordPolicy.validate_password(v)
        if errors:
            raise ValueError('; '.join(errors))
        return v
```

### 4. API Key Expiration & Rotation

**Objective**: Implement automatic API key lifecycle management

**Implementation Strategy**:
```python
# models/api_key.py (enhanced)
class ApiKey(MongoBaseModel):
    # existing fields...
    expires_at: Optional[datetime] = None
    last_used: Optional[datetime] = None
    rotation_required: bool = False
    
    def is_expired(self) -> bool:
        if self.expires_at:
            return datetime.now() > self.expires_at
        return False
    
    def requires_rotation(self) -> bool:
        if self.rotation_required:
            return True
        # Auto-rotation after 1 year
        if self.created_timestamp:
            return datetime.now() > self.created_timestamp + timedelta(days=365)
        return False

# service/api_key_lifecycle_service.py
class ApiKeyLifecycleService:
    DEFAULT_EXPIRY_DAYS = 365
    
    async def create_api_key_with_expiry(self, request: CreateApiKeyRequest, user_id: ObjectId):
        expiry_date = datetime.now() + timedelta(days=self.DEFAULT_EXPIRY_DAYS)
        
        api_key = ApiKey(
            # existing fields...
            expires_at=expiry_date
        )
        
        return await self.api_key_repository.insert_one(api_key)
    
    async def rotate_api_key(self, api_key_id: ObjectId) -> str:
        api_key = await self.api_key_repository.get_by_id(api_key_id)
        
        # Generate new key
        new_key = secrets.token_urlsafe(48)
        api_key.api_key = new_key
        api_key.masked_key = self.__mask_key(new_key)
        api_key.created_timestamp = datetime.now()
        api_key.expires_at = datetime.now() + timedelta(days=self.DEFAULT_EXPIRY_DAYS)
        api_key.rotation_required = False
        
        await self.api_key_repository.save(api_key)
        
        # Update cache
        api_key_cache = ApiKeyCache(**api_key.dict())
        api_key_cache.save()
        
        return new_key

# Scheduled task for automatic rotation
# celery_backend/tasks/security_tasks.py
@celery_app.task
def check_api_key_expiration():
    """Daily task to check and notify about expiring API keys"""
    expiring_keys = api_key_repository.find({
        "expires_at": {
            "$lte": datetime.now() + timedelta(days=7),
            "$gte": datetime.now()
        }
    })
    
    for key in expiring_keys:
        # Send notification to user
        send_api_key_expiry_notification(key)
```

---

## Priority 2: Enhanced Security Features

### 5. Comprehensive Audit Logging

**Objective**: Track all security-relevant events

**Implementation Strategy**:
```python
# models/audit_log.py
class AuditLog(MongoBaseModel):
    timestamp: datetime
    user_id: Optional[ObjectId]
    api_key_id: Optional[ObjectId]
    event_type: str  # LOGIN, LOGOUT, API_KEY_CREATED, etc.
    event_details: dict
    ip_address: str
    user_agent: str
    success: bool
    risk_score: Optional[int]

# service/audit_service.py
class AuditService:
    SECURITY_EVENTS = {
        'LOGIN_SUCCESS': 'User login successful',
        'LOGIN_FAILED': 'User login failed',
        'ACCOUNT_LOCKED': 'Account locked due to failed attempts',
        'API_KEY_CREATED': 'API key created',
        'API_KEY_REVOKED': 'API key revoked',
        'PASSWORD_CHANGED': 'Password changed',
        'UNAUTHORIZED_ACCESS': 'Unauthorized access attempt'
    }
    
    async def log_security_event(
        self,
        event_type: str,
        user_id: Optional[ObjectId] = None,
        api_key_id: Optional[ObjectId] = None,
        details: dict = None,
        request: Request = None,
        success: bool = True
    ):
        audit_log = AuditLog(
            timestamp=datetime.now(),
            user_id=user_id,
            api_key_id=api_key_id,
            event_type=event_type,
            event_details=details or {},
            ip_address=request.client.host if request else "unknown",
            user_agent=request.headers.get("user-agent", "unknown") if request else "unknown",
            success=success,
            risk_score=self.calculate_risk_score(event_type, details)
        )
        
        await self.audit_repository.insert_one(audit_log)
        
        # Real-time alerting for high-risk events
        if audit_log.risk_score and audit_log.risk_score > 7:
            await self.send_security_alert(audit_log)
```

### 6. Session Timeout & Management

**Objective**: Implement proper session lifecycle management

**Implementation Strategy**:
```python
# Enhanced session model
class Session(MongoBaseModel):
    user_id: ObjectId
    type: str  # "refresh" or "access"
    timestamp: datetime
    last_activity: datetime
    expires_at: datetime
    ip_address: str
    user_agent: str
    is_active: bool = True

# service/session_service.py
class SessionService:
    ACCESS_TOKEN_LIFETIME = timedelta(hours=2)  # Reduced from 30 days
    REFRESH_TOKEN_LIFETIME = timedelta(days=30)
    IDLE_TIMEOUT = timedelta(minutes=30)
    
    async def create_session(self, user_id: ObjectId, session_type: str, request: Request):
        now = datetime.now()
        
        if session_type == "access":
            expires_at = now + self.ACCESS_TOKEN_LIFETIME
        else:
            expires_at = now + self.REFRESH_TOKEN_LIFETIME
        
        session = Session(
            user_id=user_id,
            type=session_type,
            timestamp=now,
            last_activity=now,
            expires_at=expires_at,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent", "unknown")
        )
        
        return await self.session_repository.insert_one(session)
    
    async def validate_session(self, session_id: ObjectId, request: Request) -> bool:
        session = await self.session_repository.get_by_id(session_id)
        
        if not session or not session.is_active:
            return False
        
        now = datetime.now()
        
        # Check expiration
        if now > session.expires_at:
            await self.invalidate_session(session_id)
            return False
        
        # Check idle timeout
        if now > session.last_activity + self.IDLE_TIMEOUT:
            await self.invalidate_session(session_id)
            return False
        
        # Update last activity
        session.last_activity = now
        await self.session_repository.save(session)
        
        return True
```

---

## Priority 3: Advanced Security Features

### 7. Multi-Factor Authentication (MFA)

**Objective**: Add second factor authentication

**Implementation Strategy**:
```python
# models/mfa.py
class MFASecret(MongoBaseModel):
    user_id: ObjectId
    secret: str  # TOTP secret
    backup_codes: List[str]
    is_enabled: bool = False
    created_at: datetime
    last_used: Optional[datetime]

# service/mfa_service.py
import pyotp
import qrcode
from io import BytesIO
import base64

class MFAService:
    def generate_mfa_secret(self, user: User) -> tuple[str, str]:
        """Generate TOTP secret and QR code"""
        secret = pyotp.random_base32()
        
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name="Dhruva Platform"
        )
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        qr_code_data = base64.b64encode(buffer.getvalue()).decode()
        
        return secret, qr_code_data
    
    def verify_totp_code(self, secret: str, code: str) -> bool:
        """Verify TOTP code"""
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)
```

### 8. IP-based Restrictions

**Objective**: Restrict API key usage by IP address

**Implementation Strategy**:
```python
# Enhanced API key model
class ApiKey(MongoBaseModel):
    # existing fields...
    allowed_ips: List[str] = []  # CIDR notation supported
    ip_restriction_enabled: bool = False

# service/ip_restriction_service.py
import ipaddress

class IPRestrictionService:
    def is_ip_allowed(self, api_key: ApiKey, client_ip: str) -> bool:
        if not api_key.ip_restriction_enabled:
            return True
        
        if not api_key.allowed_ips:
            return True
        
        client_ip_obj = ipaddress.ip_address(client_ip)
        
        for allowed_ip in api_key.allowed_ips:
            try:
                if '/' in allowed_ip:  # CIDR notation
                    network = ipaddress.ip_network(allowed_ip, strict=False)
                    if client_ip_obj in network:
                        return True
                else:  # Single IP
                    if client_ip_obj == ipaddress.ip_address(allowed_ip):
                        return True
            except ValueError:
                continue
        
        return False
```

---

## Implementation Timeline

### Phase 1 (Week 1-2): Critical Security
- [ ] Implement rate limiting
- [ ] Add account lockout mechanism
- [ ] Enforce password policy
- [ ] Set up basic audit logging

### Phase 2 (Week 3-4): Session & Key Management
- [ ] Implement API key expiration
- [ ] Add session timeout
- [ ] Create key rotation mechanism
- [ ] Enhanced audit logging

### Phase 3 (Week 5-6): Advanced Features
- [ ] Multi-factor authentication
- [ ] IP-based restrictions
- [ ] Security monitoring dashboard
- [ ] Automated security alerts

### Phase 4 (Week 7-8): Testing & Monitoring
- [ ] Security testing automation
- [ ] Performance impact assessment
- [ ] Documentation updates
- [ ] Team training

---

## Security Testing Checklist

### Authentication Testing
- [ ] Test rate limiting effectiveness
- [ ] Verify account lockout mechanism
- [ ] Test password policy enforcement
- [ ] Validate JWT token security
- [ ] Test API key validation

### Authorization Testing
- [ ] Test role-based access control
- [ ] Verify API key type restrictions
- [ ] Test cross-user access prevention
- [ ] Validate admin privilege escalation

### Session Management Testing
- [ ] Test session timeout
- [ ] Verify session invalidation
- [ ] Test concurrent session limits
- [ ] Validate session hijacking prevention

### Security Monitoring Testing
- [ ] Test audit log generation
- [ ] Verify security alert triggers
- [ ] Test incident response procedures
- [ ] Validate monitoring dashboard

---

## Monitoring & Alerting

### Key Security Metrics
- Failed authentication attempts per minute
- Account lockout events
- API key creation/revocation events
- Unusual access patterns
- High-risk security events

### Alert Thresholds
- **Critical**: 10+ failed logins from same IP in 5 minutes
- **High**: New API key created outside business hours
- **Medium**: Password change without MFA
- **Low**: Unusual geographic access patterns

### Response Procedures
1. **Immediate**: Automated blocking of suspicious IPs
2. **Short-term**: Manual investigation of security events
3. **Long-term**: Security policy updates based on trends
