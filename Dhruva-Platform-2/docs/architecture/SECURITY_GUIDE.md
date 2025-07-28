# Dhruva Platform Server - Security & Compliance Guide

## 📋 Overview

This document provides comprehensive security guidelines, best practices, and compliance requirements for the Dhruva Platform server architecture. It covers authentication, authorization, data protection, infrastructure security, and regulatory compliance.

## 🔐 Authentication & Authorization

### Multi-Tier Authentication System

The Dhruva Platform implements a robust multi-tier authentication system supporting different access patterns:

#### 1. API Key Authentication

**Purpose**: Service-to-service communication and programmatic access
**Implementation**: Custom API key validation with Redis caching

```python
# API Key Format
dhruva_<32_character_random_string>

# Example
dhruva_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz

# Security Features:
- Cryptographically secure random generation
- Masked display (dhruva_abc***xyz234)
- Configurable expiration dates
- Usage tracking and rate limiting
- Service-specific permissions
```

**Security Controls:**
- API keys are hashed before storage
- Rate limiting per API key (60 requests/minute default)
- IP-based access controls (optional)
- Automatic deactivation after 6 months of inactivity
- Audit logging for all API key operations

#### 2. JWT Token Authentication

**Purpose**: User session management and web application access
**Implementation**: JSON Web Tokens with HS256 signing

```python
# JWT Payload Structure
{
  "user_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1640995200,  # Issued at
  "exp": 1641081600,  # Expires at (24 hours)
  "jti": "unique_token_id"  # JWT ID for revocation
}

# Security Features:
- Short-lived tokens (24 hours default)
- Secure secret key (minimum 256 bits)
- Token revocation support
- Refresh token mechanism
```

**Security Controls:**
- Tokens are signed with HMAC-SHA256
- Automatic expiration and refresh
- Session invalidation on logout
- Concurrent session limits
- Device tracking and management

#### 3. Role-Based Access Control (RBAC)

**Roles Hierarchy:**
```
SUPER_ADMIN
├── Full system access
├── User management
├── Service configuration
└── System monitoring

ADMIN
├── Service management
├── API key management
├── Usage analytics
└── Limited user management

USER
├── API key creation
├── Service usage
├── Personal analytics
└── Profile management
```

**Permission Matrix:**
| Resource | USER | ADMIN | SUPER_ADMIN |
|----------|------|-------|-------------|
| Create API Keys | ✓ | ✓ | ✓ |
| Manage Own API Keys | ✓ | ✓ | ✓ |
| Manage All API Keys | ✗ | ✓ | ✓ |
| Create Services | ✗ | ✓ | ✓ |
| Manage Services | ✗ | ✓ | ✓ |
| View Analytics | Own | All | All |
| User Management | ✗ | Limited | ✓ |
| System Configuration | ✗ | ✗ | ✓ |

### Authentication Flow Security

#### API Key Validation Process

```python
def validate_api_key(api_key: str) -> ApiKeyData:
    """
    Secure API key validation with multiple security checks
    """
    # 1. Format validation
    if not api_key.startswith('dhruva_') or len(api_key) != 64:
        raise InvalidApiKeyError("Invalid API key format")
    
    # 2. Rate limiting check
    if is_rate_limited(api_key):
        raise RateLimitExceededError("Rate limit exceeded")
    
    # 3. Cache lookup with fallback to database
    api_key_data = get_from_cache_or_db(api_key)
    
    # 4. Status validation
    if not api_key_data.active:
        raise InactiveApiKeyError("API key is inactive")
    
    if api_key_data.expires_at and api_key_data.expires_at < datetime.now():
        raise ExpiredApiKeyError("API key has expired")
    
    # 5. IP validation (if configured)
    if api_key_data.allowed_ips and client_ip not in api_key_data.allowed_ips:
        raise UnauthorizedIPError("IP address not allowed")
    
    # 6. Service permission check
    if service_id not in api_key_data.allowed_services:
        raise InsufficientPermissionsError("Service access not permitted")
    
    # 7. Update last used timestamp
    update_last_used(api_key)
    
    return api_key_data
```

#### JWT Token Security

```python
class JWTManager:
    def __init__(self):
        self.secret_key = os.environ['JWT_SECRET_KEY']
        self.algorithm = 'HS256'
        self.token_expiry = timedelta(hours=24)
        self.refresh_expiry = timedelta(days=7)
    
    def create_token(self, user_data: UserData) -> TokenPair:
        """Create access and refresh token pair"""
        now = datetime.utcnow()
        
        # Access token payload
        access_payload = {
            'user_id': str(user_data.id),
            'email': user_data.email,
            'role': user_data.role,
            'iat': now,
            'exp': now + self.token_expiry,
            'type': 'access',
            'jti': generate_unique_id()
        }
        
        # Refresh token payload
        refresh_payload = {
            'user_id': str(user_data.id),
            'iat': now,
            'exp': now + self.refresh_expiry,
            'type': 'refresh',
            'jti': generate_unique_id()
        }
        
        access_token = jwt.encode(access_payload, self.secret_key, self.algorithm)
        refresh_token = jwt.encode(refresh_payload, self.secret_key, self.algorithm)
        
        # Store refresh token for revocation tracking
        self.store_refresh_token(refresh_token, user_data.id)
        
        return TokenPair(access_token, refresh_token)
    
    def validate_token(self, token: str) -> TokenData:
        """Validate and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check if token is revoked
            if self.is_token_revoked(payload['jti']):
                raise RevokedTokenError("Token has been revoked")
            
            return TokenData(**payload)
            
        except jwt.ExpiredSignatureError:
            raise ExpiredTokenError("Token has expired")
        except jwt.InvalidTokenError:
            raise InvalidTokenError("Invalid token")
```

## 🛡️ Data Protection

### Encryption Standards

#### Data at Rest

```python
# Database Encryption
- MongoDB: Encryption at rest using WiredTiger encryption
- TimescaleDB: Transparent Data Encryption (TDE)
- Redis: RDB and AOF encryption
- File Storage: AES-256 encryption for stored files

# Configuration Example
MONGO_ENCRYPTION_KEY_FILE=/etc/mongodb/encryption.key
POSTGRES_TDE_KEY_FILE=/etc/postgresql/tde.key
REDIS_ENCRYPTION_KEY=/etc/redis/encryption.key
```

#### Data in Transit

```nginx
# TLS Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS Header
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Certificate Configuration
ssl_certificate /etc/ssl/certs/dhruva-platform.crt;
ssl_certificate_key /etc/ssl/private/dhruva-platform.key;
ssl_dhparam /etc/ssl/certs/dhparam.pem;
```

### Sensitive Data Handling

#### Password Security

```python
# Argon2 Configuration
ARGON2_TIME_COST = 3      # Number of iterations
ARGON2_MEMORY_COST = 65536  # Memory usage in KB (64MB)
ARGON2_PARALLELISM = 4    # Number of parallel threads
ARGON2_HASH_LENGTH = 32   # Hash length in bytes
ARGON2_SALT_LENGTH = 16   # Salt length in bytes

def hash_password(password: str) -> str:
    """Hash password using Argon2id"""
    return argon2.hash(
        password,
        time_cost=ARGON2_TIME_COST,
        memory_cost=ARGON2_MEMORY_COST,
        parallelism=ARGON2_PARALLELISM,
        hash_len=ARGON2_HASH_LENGTH,
        salt_len=ARGON2_SALT_LENGTH,
        type=argon2.Type.ID
    )

def verify_password(password: str, hash: str) -> bool:
    """Verify password against Argon2 hash"""
    try:
        return argon2.verify(hash, password)
    except argon2.exceptions.VerifyMismatchError:
        return False
```

#### API Key Security

```python
def generate_api_key() -> str:
    """Generate cryptographically secure API key"""
    # Generate 32 bytes of random data
    random_bytes = secrets.token_bytes(32)
    
    # Encode as base64 and create API key
    encoded = base64.urlsafe_b64encode(random_bytes).decode('ascii')
    api_key = f"dhruva_{encoded}"
    
    return api_key

def mask_api_key(api_key: str) -> str:
    """Mask API key for display purposes"""
    if len(api_key) < 16:
        return "***"
    
    prefix = api_key[:10]  # Show first 10 characters
    suffix = api_key[-6:]  # Show last 6 characters
    return f"{prefix}***{suffix}"

def hash_api_key(api_key: str) -> str:
    """Hash API key for secure storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()
```

### Data Privacy & Consent

#### Data Tracking Consent

```python
class DataTrackingManager:
    """Manage user consent for data tracking"""
    
    def check_consent(self, api_key_id: str, request_data: dict) -> bool:
        """Check if user has consented to data tracking"""
        # Check API key level consent
        api_key = self.get_api_key(api_key_id)
        if not api_key.data_tracking:
            return False
        
        # Check request level consent
        control_config = request_data.get('controlConfig', {})
        return control_config.get('dataTracking', True)
    
    def anonymize_data(self, data: dict) -> dict:
        """Anonymize sensitive data before storage"""
        anonymized = data.copy()
        
        # Remove or hash personally identifiable information
        if 'user_id' in anonymized:
            anonymized['user_id'] = self.hash_user_id(anonymized['user_id'])
        
        if 'ip_address' in anonymized:
            anonymized['ip_address'] = self.anonymize_ip(anonymized['ip_address'])
        
        if 'user_agent' in anonymized:
            anonymized['user_agent'] = self.anonymize_user_agent(anonymized['user_agent'])
        
        return anonymized
    
    def apply_retention_policy(self, data_type: str) -> timedelta:
        """Apply data retention policies"""
        retention_policies = {
            'request_logs': timedelta(days=90),
            'usage_metrics': timedelta(days=365),
            'error_logs': timedelta(days=30),
            'audit_logs': timedelta(days=2555)  # 7 years
        }
        
        return retention_policies.get(data_type, timedelta(days=30))
```

## 🔒 Infrastructure Security

### Container Security

#### Docker Security Configuration

```dockerfile
# Security-hardened Dockerfile
FROM python:3.10-slim as base

# Create non-root user
RUN groupadd -r dhruva && useradd -r -g dhruva dhruva

# Install security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    libsndfile1 ffmpeg curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set secure permissions
WORKDIR /app
COPY --chown=dhruva:dhruva . /app
RUN chmod -R 755 /app && \
    chmod -R 700 /app/secrets

# Switch to non-root user
USER dhruva

# Security labels
LABEL security.scan="enabled"
LABEL security.policy="restricted"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run with restricted capabilities
# docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE --read-only dhruva-server
```

#### Container Runtime Security

```yaml
# docker-compose security configuration
version: '3.8'
services:
  server:
    image: dhruva-platform-server:latest
    security_opt:
      - no-new-privileges:true
      - apparmor:docker-default
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
      - /var/run:noexec,nosuid,size=100m
    ulimits:
      nproc: 65535
      nofile:
        soft: 65535
        hard: 65535
    sysctls:
      - net.core.somaxconn=65535
    environment:
      - PYTHONDONTWRITEBYTECODE=1
      - PYTHONUNBUFFERED=1
    networks:
      - dhruva-network
    restart: unless-stopped
```

### Network Security

#### Firewall Configuration

```bash
# UFW (Uncomplicated Firewall) rules
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (change port from default 22)
ufw allow 2222/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow application ports (internal network only)
ufw allow from 10.0.0.0/8 to any port 8000
ufw allow from 10.0.0.0/8 to any port 5432
ufw allow from 10.0.0.0/8 to any port 27017
ufw allow from 10.0.0.0/8 to any port 6379
ufw allow from 10.0.0.0/8 to any port 5672

# Enable firewall
ufw enable
```

#### Network Segmentation

```yaml
# Docker network configuration
networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  backend:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/16
  database:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.22.0.0/16

services:
  nginx:
    networks:
      - frontend
      - backend
  
  server:
    networks:
      - backend
      - database
  
  mongodb:
    networks:
      - database
  
  redis:
    networks:
      - database
```

### Secrets Management

#### Environment Variables Security

```bash
# Use Docker secrets for sensitive data
echo "super_secret_jwt_key" | docker secret create jwt_secret -
echo "mongodb_password" | docker secret create mongo_password -
echo "redis_password" | docker secret create redis_password -

# Reference secrets in docker-compose.yml
services:
  server:
    secrets:
      - jwt_secret
      - mongo_password
      - redis_password
    environment:
      - JWT_SECRET_KEY_FILE=/run/secrets/jwt_secret
      - MONGO_PASSWORD_FILE=/run/secrets/mongo_password
      - REDIS_PASSWORD_FILE=/run/secrets/redis_password

secrets:
  jwt_secret:
    external: true
  mongo_password:
    external: true
  redis_password:
    external: true
```

#### HashiCorp Vault Integration

```python
import hvac

class VaultSecretManager:
    def __init__(self, vault_url: str, vault_token: str):
        self.client = hvac.Client(url=vault_url, token=vault_token)
    
    def get_secret(self, path: str, key: str) -> str:
        """Retrieve secret from Vault"""
        try:
            response = self.client.secrets.kv.v2.read_secret_version(path=path)
            return response['data']['data'][key]
        except Exception as e:
            logger.error(f"Failed to retrieve secret {path}/{key}: {e}")
            raise
    
    def store_secret(self, path: str, secrets: dict) -> None:
        """Store secret in Vault"""
        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret=secrets
            )
        except Exception as e:
            logger.error(f"Failed to store secret {path}: {e}")
            raise

# Usage example
vault = VaultSecretManager(
    vault_url=os.environ['VAULT_URL'],
    vault_token=os.environ['VAULT_TOKEN']
)

jwt_secret = vault.get_secret('dhruva/auth', 'jwt_secret_key')
db_password = vault.get_secret('dhruva/database', 'mongodb_password')
```

## 🔍 Security Monitoring & Auditing

### Audit Logging

#### Comprehensive Audit Trail

```python
class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger('audit')
        self.logger.setLevel(logging.INFO)
        
        # Configure audit log handler
        handler = logging.handlers.RotatingFileHandler(
            '/var/log/dhruva/audit.log',
            maxBytes=100*1024*1024,  # 100MB
            backupCount=10
        )
        
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
    
    def log_authentication(self, event_type: str, user_id: str, 
                          ip_address: str, user_agent: str, 
                          success: bool, details: dict = None):
        """Log authentication events"""
        audit_data = {
            'event_type': f'auth.{event_type}',
            'user_id': user_id,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'success': success,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
        
        self.logger.info(json.dumps(audit_data))
    
    def log_api_access(self, api_key_id: str, endpoint: str, 
                      method: str, status_code: int, 
                      response_time: float, ip_address: str):
        """Log API access events"""
        audit_data = {
            'event_type': 'api.access',
            'api_key_id': api_key_id,
            'endpoint': endpoint,
            'method': method,
            'status_code': status_code,
            'response_time_ms': response_time,
            'ip_address': ip_address,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.info(json.dumps(audit_data))
    
    def log_data_access(self, user_id: str, data_type: str, 
                       operation: str, resource_id: str, 
                       success: bool, reason: str = None):
        """Log data access events"""
        audit_data = {
            'event_type': 'data.access',
            'user_id': user_id,
            'data_type': data_type,
            'operation': operation,
            'resource_id': resource_id,
            'success': success,
            'reason': reason,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        self.logger.info(json.dumps(audit_data))
```

### Security Monitoring

#### Intrusion Detection

```python
class SecurityMonitor:
    def __init__(self):
        self.redis_client = get_redis_client()
        self.alert_thresholds = {
            'failed_logins': 5,      # per 15 minutes
            'api_errors': 100,       # per 5 minutes
            'unusual_access': 10,    # per hour
            'rate_limit_hits': 50    # per 5 minutes
        }
    
    def check_failed_logins(self, ip_address: str) -> bool:
        """Monitor failed login attempts"""
        key = f"failed_logins:{ip_address}"
        current_count = self.redis_client.incr(key)
        
        if current_count == 1:
            self.redis_client.expire(key, 900)  # 15 minutes
        
        if current_count >= self.alert_thresholds['failed_logins']:
            self.trigger_security_alert(
                'multiple_failed_logins',
                {'ip_address': ip_address, 'count': current_count}
            )
            return True
        
        return False
    
    def check_api_abuse(self, api_key_id: str, endpoint: str) -> bool:
        """Monitor API abuse patterns"""
        key = f"api_errors:{api_key_id}:{endpoint}"
        current_count = self.redis_client.incr(key)
        
        if current_count == 1:
            self.redis_client.expire(key, 300)  # 5 minutes
        
        if current_count >= self.alert_thresholds['api_errors']:
            self.trigger_security_alert(
                'api_abuse_detected',
                {'api_key_id': api_key_id, 'endpoint': endpoint, 'count': current_count}
            )
            return True
        
        return False
    
    def trigger_security_alert(self, alert_type: str, details: dict):
        """Trigger security alert"""
        alert_data = {
            'alert_type': alert_type,
            'severity': 'high',
            'timestamp': datetime.utcnow().isoformat(),
            'details': details
        }
        
        # Log security alert
        logger.warning(f"Security Alert: {json.dumps(alert_data)}")
        
        # Send to monitoring system
        self.send_to_monitoring_system(alert_data)
        
        # Take automated action if needed
        self.take_automated_action(alert_type, details)
    
    def take_automated_action(self, alert_type: str, details: dict):
        """Take automated security actions"""
        if alert_type == 'multiple_failed_logins':
            # Temporarily block IP address
            self.block_ip_address(details['ip_address'], duration=3600)
        
        elif alert_type == 'api_abuse_detected':
            # Temporarily suspend API key
            self.suspend_api_key(details['api_key_id'], duration=1800)
```

## 📋 Compliance & Regulations

### GDPR Compliance

#### Data Subject Rights Implementation

```python
class GDPRComplianceManager:
    """Implement GDPR data subject rights"""

    def __init__(self):
        self.db = get_database_client()
        self.audit_logger = AuditLogger()

    def export_user_data(self, user_id: str) -> dict:
        """Export all user data (Right to Data Portability)"""
        user_data = {}

        # Personal information
        user = self.db.users.find_one({'_id': ObjectId(user_id)})
        if user:
            user_data['personal_info'] = {
                'name': user.get('name'),
                'email': user.get('email'),
                'created_timestamp': user.get('created_timestamp'),
                'preferences': user.get('preferences', {})
            }

        # API keys
        api_keys = self.db.api_keys.find({'user_id': ObjectId(user_id)})
        user_data['api_keys'] = [
            {
                'name': key.get('name'),
                'type': key.get('type'),
                'created_timestamp': key.get('created_timestamp'),
                'usage': key.get('usage', 0),
                'hits': key.get('hits', 0)
            }
            for key in api_keys
        ]

        # Usage data (anonymized)
        usage_data = self.get_usage_data(user_id)
        user_data['usage_statistics'] = usage_data

        # Audit log
        self.audit_logger.log_data_access(
            user_id, 'user_data', 'export', user_id, True
        )

        return user_data

    def delete_user_data(self, user_id: str, verification_token: str) -> bool:
        """Delete all user data (Right to Erasure)"""
        # Verify deletion request
        if not self.verify_deletion_token(user_id, verification_token):
            return False

        try:
            # Delete from MongoDB
            self.db.users.delete_one({'_id': ObjectId(user_id)})
            self.db.api_keys.delete_many({'user_id': ObjectId(user_id)})
            self.db.sessions.delete_many({'user_id': ObjectId(user_id)})
            self.db.feedback.delete_many({'user_id': ObjectId(user_id)})

            # Anonymize TimescaleDB data (cannot delete due to analytics needs)
            self.anonymize_timeseries_data(user_id)

            # Clear Redis cache
            self.clear_user_cache(user_id)

            # Audit log
            self.audit_logger.log_data_access(
                user_id, 'user_data', 'delete', user_id, True
            )

            return True

        except Exception as e:
            logger.error(f"Failed to delete user data: {e}")
            return False

    def anonymize_timeseries_data(self, user_id: str):
        """Anonymize user data in TimescaleDB"""
        # Replace user_id with anonymous hash
        anonymous_id = hashlib.sha256(f"anonymous_{user_id}".encode()).hexdigest()[:16]

        # Update TimescaleDB records
        with get_timescale_connection() as conn:
            conn.execute(
                "UPDATE api_key_usage SET user_id = %s, user_email = 'anonymized@example.com' WHERE user_id = %s",
                (anonymous_id, user_id)
            )
            conn.commit()
```

#### Data Processing Lawfulness

```python
class DataProcessingManager:
    """Ensure lawful basis for data processing"""

    LAWFUL_BASIS = {
        'consent': 'User has given consent',
        'contract': 'Processing necessary for contract performance',
        'legal_obligation': 'Processing necessary for legal compliance',
        'legitimate_interest': 'Processing necessary for legitimate interests'
    }

    def record_processing_activity(self, user_id: str, data_type: str,
                                 purpose: str, lawful_basis: str,
                                 retention_period: timedelta):
        """Record data processing activity"""
        processing_record = {
            'user_id': user_id,
            'data_type': data_type,
            'purpose': purpose,
            'lawful_basis': lawful_basis,
            'lawful_basis_description': self.LAWFUL_BASIS.get(lawful_basis),
            'retention_period_days': retention_period.days,
            'processing_start': datetime.utcnow(),
            'data_controller': 'Dhruva Platform',
            'data_processor': 'Internal',
            'third_party_sharing': False,
            'cross_border_transfer': False
        }

        self.db.processing_activities.insert_one(processing_record)

    def check_retention_compliance(self):
        """Check and enforce data retention policies"""
        # Check for data that should be deleted
        retention_policies = {
            'request_logs': timedelta(days=90),
            'usage_metrics': timedelta(days=365),
            'error_logs': timedelta(days=30),
            'session_data': timedelta(days=30)
        }

        for data_type, retention_period in retention_policies.items():
            cutoff_date = datetime.utcnow() - retention_period
            self.delete_expired_data(data_type, cutoff_date)
```

### SOC 2 Compliance

#### Security Controls Implementation

```python
class SOC2Controls:
    """Implement SOC 2 security controls"""

    def __init__(self):
        self.audit_logger = AuditLogger()
        self.security_monitor = SecurityMonitor()

    # CC6.1 - Logical and Physical Access Controls
    def implement_access_controls(self):
        """Implement comprehensive access controls"""
        controls = {
            'multi_factor_authentication': True,
            'role_based_access': True,
            'principle_of_least_privilege': True,
            'regular_access_reviews': True,
            'automated_deprovisioning': True
        }
        return controls

    # CC6.2 - System Access Monitoring
    def monitor_system_access(self):
        """Monitor and log all system access"""
        monitoring_controls = {
            'authentication_logging': True,
            'authorization_logging': True,
            'data_access_logging': True,
            'administrative_access_logging': True,
            'failed_access_attempt_monitoring': True
        }
        return monitoring_controls

    # CC6.3 - Data Protection
    def implement_data_protection(self):
        """Implement data protection controls"""
        protection_controls = {
            'encryption_at_rest': True,
            'encryption_in_transit': True,
            'data_classification': True,
            'data_loss_prevention': True,
            'secure_data_disposal': True
        }
        return protection_controls

    # CC7.1 - System Boundaries and Data Flow
    def document_system_boundaries(self):
        """Document system boundaries and data flows"""
        system_documentation = {
            'network_diagrams': 'Updated quarterly',
            'data_flow_diagrams': 'Updated with each release',
            'system_inventory': 'Updated monthly',
            'third_party_integrations': 'Documented and reviewed'
        }
        return system_documentation
```

### Industry-Specific Compliance

#### Healthcare (HIPAA) Considerations

```python
class HIPAACompliance:
    """HIPAA compliance for healthcare data processing"""

    def __init__(self):
        self.encryption_required = True
        self.audit_logging_required = True
        self.access_controls_required = True

    def classify_phi(self, data: dict) -> bool:
        """Identify if data contains Protected Health Information"""
        phi_indicators = [
            'medical_record_number',
            'health_plan_id',
            'biometric_identifiers',
            'health_information'
        ]

        return any(indicator in data for indicator in phi_indicators)

    def apply_minimum_necessary_rule(self, user_role: str, requested_data: dict) -> dict:
        """Apply minimum necessary rule for PHI access"""
        role_permissions = {
            'healthcare_provider': ['all_phi'],
            'researcher': ['anonymized_phi'],
            'administrator': ['limited_phi'],
            'user': ['own_phi_only']
        }

        allowed_fields = role_permissions.get(user_role, [])
        return self.filter_data_by_permissions(requested_data, allowed_fields)
```

## 🚨 Incident Response

### Security Incident Response Plan

```python
class IncidentResponseManager:
    """Manage security incident response"""

    SEVERITY_LEVELS = {
        'critical': 1,    # Data breach, system compromise
        'high': 2,        # Unauthorized access, service disruption
        'medium': 3,      # Security policy violation
        'low': 4          # Minor security event
    }

    def __init__(self):
        self.notification_channels = {
            'email': 'security@dhruva.ai',
            'slack': '#security-alerts',
            'pagerduty': 'security-team'
        }

    def detect_incident(self, event_data: dict) -> bool:
        """Detect potential security incidents"""
        incident_indicators = [
            'multiple_failed_logins',
            'unusual_data_access',
            'privilege_escalation',
            'malware_detection',
            'data_exfiltration',
            'system_compromise'
        ]

        event_type = event_data.get('event_type')
        return event_type in incident_indicators

    def respond_to_incident(self, incident_data: dict):
        """Execute incident response procedures"""
        severity = self.assess_severity(incident_data)

        # 1. Immediate containment
        if severity <= 2:  # Critical or High
            self.immediate_containment(incident_data)

        # 2. Notification
        self.notify_stakeholders(incident_data, severity)

        # 3. Investigation
        self.start_investigation(incident_data)

        # 4. Documentation
        self.document_incident(incident_data)

    def immediate_containment(self, incident_data: dict):
        """Immediate containment actions"""
        incident_type = incident_data.get('type')

        if incident_type == 'data_breach':
            # Isolate affected systems
            self.isolate_systems(incident_data.get('affected_systems', []))

            # Revoke compromised credentials
            self.revoke_credentials(incident_data.get('compromised_accounts', []))

        elif incident_type == 'unauthorized_access':
            # Block suspicious IP addresses
            self.block_ip_addresses(incident_data.get('source_ips', []))

            # Force password reset for affected users
            self.force_password_reset(incident_data.get('affected_users', []))

    def notify_stakeholders(self, incident_data: dict, severity: int):
        """Notify relevant stakeholders"""
        notification_data = {
            'incident_id': incident_data.get('id'),
            'severity': severity,
            'description': incident_data.get('description'),
            'affected_systems': incident_data.get('affected_systems', []),
            'timestamp': datetime.utcnow().isoformat()
        }

        # Immediate notification for critical/high severity
        if severity <= 2:
            self.send_immediate_notification(notification_data)

        # Regular notification for medium/low severity
        else:
            self.send_regular_notification(notification_data)
```

### Breach Notification Procedures

```python
class BreachNotificationManager:
    """Manage data breach notifications"""

    def __init__(self):
        self.notification_requirements = {
            'gdpr': {
                'authority_notification_hours': 72,
                'individual_notification_required': True,
                'authority': 'Data Protection Authority'
            },
            'ccpa': {
                'authority_notification_hours': None,
                'individual_notification_required': True,
                'authority': 'California Attorney General'
            },
            'hipaa': {
                'authority_notification_hours': 1440,  # 60 days
                'individual_notification_required': True,
                'authority': 'HHS Office for Civil Rights'
            }
        }

    def assess_breach_notification_requirements(self, breach_data: dict) -> dict:
        """Assess which breach notification requirements apply"""
        affected_data_types = breach_data.get('data_types', [])
        affected_jurisdictions = breach_data.get('jurisdictions', [])

        applicable_regulations = []

        # Check GDPR applicability
        if any(jurisdiction in ['EU', 'EEA'] for jurisdiction in affected_jurisdictions):
            applicable_regulations.append('gdpr')

        # Check CCPA applicability
        if 'california' in affected_jurisdictions:
            applicable_regulations.append('ccpa')

        # Check HIPAA applicability
        if 'phi' in affected_data_types:
            applicable_regulations.append('hipaa')

        return {
            'applicable_regulations': applicable_regulations,
            'notification_deadlines': self.calculate_deadlines(applicable_regulations),
            'notification_requirements': self.get_requirements(applicable_regulations)
        }

    def send_breach_notification(self, breach_data: dict, regulation: str):
        """Send breach notification according to regulation requirements"""
        template = self.get_notification_template(regulation)

        notification_content = template.format(
            incident_id=breach_data.get('id'),
            discovery_date=breach_data.get('discovery_date'),
            affected_individuals=breach_data.get('affected_count'),
            data_types=', '.join(breach_data.get('data_types', [])),
            containment_measures=breach_data.get('containment_measures'),
            contact_information='privacy@dhruva.ai'
        )

        # Send to regulatory authority
        self.send_to_authority(notification_content, regulation)

        # Send to affected individuals
        if self.notification_requirements[regulation]['individual_notification_required']:
            self.send_to_individuals(notification_content, breach_data.get('affected_users', []))
```

## 🔧 Security Best Practices

### Secure Development Lifecycle

```python
# Security code review checklist
SECURITY_CHECKLIST = {
    'input_validation': [
        'All user inputs are validated',
        'SQL injection prevention implemented',
        'XSS prevention implemented',
        'CSRF protection enabled'
    ],
    'authentication': [
        'Strong password requirements enforced',
        'Multi-factor authentication available',
        'Session management secure',
        'Account lockout policies implemented'
    ],
    'authorization': [
        'Principle of least privilege applied',
        'Role-based access control implemented',
        'Resource-level permissions checked',
        'Privilege escalation prevented'
    ],
    'data_protection': [
        'Sensitive data encrypted',
        'Secure communication protocols used',
        'Data retention policies implemented',
        'Secure data disposal procedures'
    ],
    'logging_monitoring': [
        'Security events logged',
        'Log integrity protected',
        'Monitoring and alerting configured',
        'Incident response procedures documented'
    ]
}
```

### Security Training & Awareness

```python
class SecurityTrainingManager:
    """Manage security training and awareness programs"""

    def __init__(self):
        self.training_modules = {
            'secure_coding': {
                'duration_hours': 4,
                'frequency': 'quarterly',
                'mandatory': True
            },
            'data_privacy': {
                'duration_hours': 2,
                'frequency': 'annually',
                'mandatory': True
            },
            'incident_response': {
                'duration_hours': 3,
                'frequency': 'bi-annually',
                'mandatory': True
            },
            'phishing_awareness': {
                'duration_hours': 1,
                'frequency': 'monthly',
                'mandatory': True
            }
        }

    def track_training_completion(self, employee_id: str, module: str):
        """Track security training completion"""
        completion_record = {
            'employee_id': employee_id,
            'module': module,
            'completion_date': datetime.utcnow(),
            'score': self.get_training_score(employee_id, module),
            'certificate_issued': True
        }

        self.db.training_records.insert_one(completion_record)

    def generate_security_awareness_metrics(self) -> dict:
        """Generate security awareness metrics"""
        return {
            'training_completion_rate': self.calculate_completion_rate(),
            'phishing_simulation_results': self.get_phishing_results(),
            'security_incident_trends': self.analyze_incident_trends(),
            'compliance_status': self.check_compliance_status()
        }
```

---

*This security guide provides comprehensive guidelines for securing the Dhruva Platform server. Regular security assessments and updates to these procedures are essential for maintaining a strong security posture.*
```
