# Email Verification Workflow Design for Dhruva Platform

## Table of Contents
1. [Overview](#overview)
2. [Current vs New Workflow](#current-vs-new-workflow)
3. [Database Schema Changes](#database-schema-changes)
4. [API Endpoint Design](#api-endpoint-design)
5. [Token Management](#token-management)
6. [Email Service Integration](#email-service-integration)
7. [Security Considerations](#security-considerations)
8. [Error Handling](#error-handling)
9. [User Experience](#user-experience)
10. [Cleanup Process](#cleanup-process)
11. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Overview

This document outlines the technical design for implementing email verification in the Dhruva Platform's user registration process. The enhancement will add a verification step before user account creation, improving security and ensuring valid email addresses.

### Goals
- Verify email addresses before account creation
- Prevent spam and fake registrations
- Maintain security and user experience
- Integrate seamlessly with existing authentication system
- Provide robust error handling and cleanup mechanisms

### Key Requirements
- Email verification before account activation
- Secure token generation and validation
- Configurable token expiration (24 hours default)
- Automatic cleanup of unverified registrations
- Rate limiting to prevent abuse
- Comprehensive error handling

---

## 2. Current vs New Workflow

### Current Workflow
```
POST /auth/signup
├── Validate input (name, email, password)
├── Check email uniqueness
├── Hash password
├── Create user account (CONSUMER role)
├── Generate default INFERENCE API key
└── Return user details + API key
```

### New Workflow

#### Phase 1: Registration Request
```
POST /auth/signup
├── Validate input (name, email, password)
├── Check email not already registered/pending
├── Hash password
├── Generate verification token
├── Store pending registration
├── Send verification email
└── Return "verification email sent" message
```

#### Phase 2: Email Verification
```
GET /auth/verify-email?token={verification_token}
├── Validate token format and expiration
├── Retrieve pending registration
├── Create user account (CONSUMER role)
├── Generate default INFERENCE API key
├── Delete pending registration record
├── Send welcome email (optional)
└── Redirect to success page or return success response
```

#### Phase 3: Cleanup Process
```
Scheduled Task (runs every hour)
├── Find expired pending registrations (>24 hours)
├── Delete expired records
└── Log cleanup statistics
```

---

## 3. Database Schema Changes

### 3.1 New Collection: `pending_registrations`

**Purpose**: Store user registration data before email verification

**Schema**:
```javascript
{
  "_id": ObjectId,
  "email": String,           // User's email (unique index)
  "name": String,            // User's full name
  "password_hash": String,   // Argon2 hashed password
  "verification_token": String, // Unique verification token (unique index)
  "created_at": Date,        // Registration timestamp
  "expires_at": Date,        // Token expiration timestamp
  "verification_attempts": Number, // Count of verification attempts
  "ip_address": String,      // Optional: IP address for security
  "user_agent": String       // Optional: User agent for security
}
```

**Indexes**:
```javascript
// Unique indexes
db.pending_registrations.createIndex({"email": 1}, {unique: true})
db.pending_registrations.createIndex({"verification_token": 1}, {unique: true})

// TTL index for automatic cleanup
db.pending_registrations.createIndex({"expires_at": 1}, {expireAfterSeconds: 0})

// Query optimization
db.pending_registrations.createIndex({"created_at": 1})
```

### 3.2 New Collection: `email_verification_logs`

**Purpose**: Track verification attempts and prevent abuse

**Schema**:
```javascript
{
  "_id": ObjectId,
  "email": String,
  "action": String,          // "signup_request", "verification_attempt", "verification_success"
  "ip_address": String,
  "user_agent": String,
  "timestamp": Date,
  "success": Boolean,
  "error_message": String    // If applicable
}
```

**Indexes**:
```javascript
db.email_verification_logs.createIndex({"email": 1, "timestamp": -1})
db.email_verification_logs.createIndex({"ip_address": 1, "timestamp": -1})
db.email_verification_logs.createIndex({"timestamp": 1}, {expireAfterSeconds: 2592000}) // 30 days TTL
```

### 3.3 Existing Collections Modifications

**No changes required** to existing `user` and `api_key` collections. The verification process will use the existing user creation logic after email verification.

---

## 4. API Endpoint Design

### 4.1 Modified Signup Endpoint

**Endpoint**: `POST /auth/signup`
**Authentication**: None (public)
**Rate Limiting**: 5 requests per IP per hour

**Request Schema**:
```python
class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    
    @validator("name")
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters long")
        return v.strip()

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        # Add password strength validation
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain both letters and numbers")
        return v

    @validator("email")
    def validate_email(cls, v):
        return v.lower()
```

**Response Schema**:
```python
class SignUpResponse(BaseModel):
    message: str = "Verification email sent successfully"
    email: EmailStr
    expires_in: int = 86400  # 24 hours in seconds
```

**Response Examples**:
```json
// Success (201)
{
  "message": "Verification email sent successfully",
  "email": "user@example.com",
  "expires_in": 86400
}

// Email already registered (400)
{
  "detail": {
    "message": "Email already registered or verification pending"
  }
}

// Rate limit exceeded (429)
{
  "detail": {
    "message": "Too many signup attempts. Please try again later."
  }
}
```

### 4.2 New Email Verification Endpoint

**Endpoint**: `GET /auth/verify-email`
**Authentication**: None (public)
**Rate Limiting**: 10 requests per IP per hour

**Query Parameters**:
```python
class EmailVerificationQuery(BaseModel):
    token: str
    
    @validator("token")
    def validate_token(cls, v):
        if not v or len(v) < 32:
            raise ValueError("Invalid verification token")
        return v
```

**Response Schema**:
```python
class EmailVerificationResponse(BaseModel):
    message: str
    user_id: str
    email: EmailStr
    api_key: str
    redirect_url: Optional[str] = None
```

**Response Examples**:
```json
// Success (200)
{
  "message": "Email verified successfully. Account created.",
  "user_id": "user_id_here",
  "email": "user@example.com",
  "api_key": "generated_api_key_here",
  "redirect_url": "https://platform.dhruva.ai/welcome"
}

// Invalid/expired token (400)
{
  "detail": {
    "message": "Invalid or expired verification token"
  }
}

// Already verified (409)
{
  "detail": {
    "message": "Email already verified and account exists"
  }
}
```

### 4.3 New Resend Verification Endpoint

**Endpoint**: `POST /auth/resend-verification`
**Authentication**: None (public)
**Rate Limiting**: 3 requests per email per hour

**Request Schema**:
```python
class ResendVerificationRequest(BaseModel):
    email: EmailStr
```

**Response Schema**:
```python
class ResendVerificationResponse(BaseModel):
    message: str = "Verification email resent successfully"
    expires_in: int = 86400
```

### 4.4 New Check Registration Status Endpoint

**Endpoint**: `GET /auth/registration-status`
**Authentication**: None (public)
**Rate Limiting**: 20 requests per IP per hour

**Query Parameters**:
```python
class RegistrationStatusQuery(BaseModel):
    email: EmailStr
```

**Response Schema**:
```python
class RegistrationStatusResponse(BaseModel):
    status: str  # "not_found", "pending", "verified"
    message: str
    expires_at: Optional[datetime] = None
```

---

## 5. Token Management

### 5.1 Token Generation

**Algorithm**: Cryptographically secure random token
**Length**: 64 characters (URL-safe base64)
**Uniqueness**: Enforced by database unique index

**Implementation Strategy**:
```python
import secrets
import base64
from datetime import datetime, timedelta

def generate_verification_token() -> str:
    """Generate a cryptographically secure verification token"""
    # Generate 48 random bytes (will be 64 chars when base64 encoded)
    random_bytes = secrets.token_bytes(48)
    # Convert to URL-safe base64
    token = base64.urlsafe_b64encode(random_bytes).decode('utf-8')
    return token

def generate_token_expiration(hours: int = 24) -> datetime:
    """Generate token expiration timestamp"""
    return datetime.utcnow() + timedelta(hours=hours)
```

### 5.2 Token Storage

**Storage Location**: MongoDB `pending_registrations` collection
**Security Measures**:
- Unique index prevents token collisions
- TTL index for automatic cleanup
- No token encryption needed (tokens are single-use and time-limited)

### 5.3 Token Validation

**Validation Steps**:
1. Check token format (64 characters, URL-safe base64)
2. Query database for matching token
3. Verify token hasn't expired
4. Check verification attempt limits
5. Validate associated email hasn't been registered elsewhere

**Security Features**:
- Maximum 5 verification attempts per token
- Token invalidated after successful verification
- Automatic cleanup of expired tokens

---

## 6. Email Service Integration

### 6.1 Email Service Selection

**Recommended**: **SendGrid** or **Amazon SES**
**Rationale**:
- High deliverability rates
- Comprehensive APIs
- Good documentation and Python SDKs
- Reasonable pricing
- Template management capabilities

**Alternative Options**:
- Mailgun
- Postmark
- SMTP (for development/testing)

### 6.2 Email Configuration

**Environment Variables**:
```bash
# Email Service Configuration
EMAIL_SERVICE_PROVIDER=sendgrid  # or "ses", "smtp"
EMAIL_API_KEY=your_api_key_here
EMAIL_FROM_ADDRESS=noreply@dhruva.ai
EMAIL_FROM_NAME=Dhruva Platform

# Email Templates
EMAIL_VERIFICATION_TEMPLATE_ID=d-1234567890abcdef
EMAIL_WELCOME_TEMPLATE_ID=d-fedcba0987654321

# URLs
FRONTEND_BASE_URL=https://platform.dhruva.ai
EMAIL_VERIFICATION_URL=${FRONTEND_BASE_URL}/verify-email
```

### 6.3 Email Templates

#### Verification Email Template
**Subject**: "Verify your email address for Dhruva Platform"

**HTML Content**:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email - Dhruva Platform</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2c3e50;">Welcome to Dhruva Platform!</h1>
        
        <p>Hello {{name}},</p>
        
        <p>Thank you for signing up for Dhruva Platform. To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{verification_url}}" 
               style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
            </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3498db;">{{verification_url}}</p>
        
        <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
            If you didn't create an account with Dhruva Platform, you can safely ignore this email.
        </p>
        
        <p style="font-size: 12px; color: #666;">
            Best regards,<br>
            The Dhruva Platform Team
        </p>
    </div>
</body>
</html>
```

#### Welcome Email Template (Optional)
**Subject**: "Welcome to Dhruva Platform - Your account is ready!"

**Content**: Welcome message with getting started guide and API key information.

### 6.4 Email Service Implementation

**Service Class Structure**:
```python
class EmailService:
    def __init__(self, provider: str, api_key: str, from_address: str):
        self.provider = provider
        self.client = self._initialize_client(provider, api_key)
        self.from_address = from_address
    
    async def send_verification_email(self, to_email: str, name: str, verification_token: str) -> bool:
        """Send email verification email"""
        pass
    
    async def send_welcome_email(self, to_email: str, name: str, api_key: str) -> bool:
        """Send welcome email after successful verification"""
        pass
    
    def _initialize_client(self, provider: str, api_key: str):
        """Initialize email service client based on provider"""
        pass
```

---

## 7. Security Considerations

### 7.1 Rate Limiting

**Implementation**: Redis-based rate limiting using FastAPI middleware

**Limits**:
- Signup requests: 5 per IP per hour
- Verification attempts: 10 per IP per hour
- Resend verification: 3 per email per hour
- Registration status checks: 20 per IP per hour

**Rate Limiting Strategy**:
```python
# Redis keys for rate limiting
signup_key = f"rate_limit:signup:{ip_address}"
verify_key = f"rate_limit:verify:{ip_address}"
resend_key = f"rate_limit:resend:{email}"
```

### 7.2 Token Security

**Security Measures**:
- Cryptographically secure random generation
- 64-character length (high entropy)
- Single-use tokens (deleted after verification)
- Time-limited (24-hour expiration)
- Unique database constraints

**Attack Prevention**:
- No token reuse possible
- Brute force protection via rate limiting
- Automatic cleanup of expired tokens
- Verification attempt limits

### 7.3 Email Security

**Security Features**:
- Email address validation and normalization
- Duplicate registration prevention
- Verification attempt logging
- IP address tracking for abuse detection

### 7.4 Data Protection

**Privacy Measures**:
- Minimal data storage in pending registrations
- Automatic cleanup of unverified data
- Secure password hashing (Argon2)
- Optional IP/User-Agent logging (configurable)

---

## 8. Error Handling

### 8.1 Signup Endpoint Errors

| Error Code | Scenario | Response |
|------------|----------|----------|
| 400 | Invalid input data | Validation error details |
| 400 | Email already registered | "Email already registered or verification pending" |
| 429 | Rate limit exceeded | "Too many signup attempts. Please try again later." |
| 500 | Email service failure | "Unable to send verification email. Please try again." |
| 500 | Database error | "Registration temporarily unavailable. Please try again." |

### 8.2 Verification Endpoint Errors

| Error Code | Scenario | Response |
|------------|----------|----------|
| 400 | Invalid token format | "Invalid verification token format" |
| 400 | Token not found | "Invalid or expired verification token" |
| 400 | Token expired | "Verification token has expired. Please request a new one." |
| 409 | Email already verified | "Email already verified and account exists" |
| 429 | Too many attempts | "Too many verification attempts. Please try again later." |
| 500 | Account creation failure | "Unable to create account. Please contact support." |

### 8.3 Resend Verification Errors

| Error Code | Scenario | Response |
|------------|----------|----------|
| 400 | Email not found in pending | "No pending registration found for this email" |
| 400 | Email already verified | "Email already verified. Please sign in." |
| 429 | Rate limit exceeded | "Too many resend attempts. Please wait before trying again." |
| 500 | Email service failure | "Unable to resend verification email. Please try again." |

### 8.4 Error Logging

**Log Levels**:
- INFO: Successful operations
- WARN: Rate limiting, invalid attempts
- ERROR: Service failures, database errors
- DEBUG: Detailed operation traces

**Log Format**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "ERROR",
  "service": "email_verification",
  "operation": "send_verification_email",
  "email": "user@example.com",
  "ip_address": "192.168.1.1",
  "error": "Email service timeout",
  "trace_id": "abc123def456"
}
```

---

## 9. User Experience

### 9.1 Signup Flow

**Step 1: Registration Form**
- User fills out signup form (name, email, password)
- Client-side validation for immediate feedback
- Clear password requirements displayed

**Step 2: Confirmation Page**
- "Check your email" message
- Email address confirmation
- Resend option (with rate limiting)
- Expected delivery time (usually within 5 minutes)

**Step 3: Email Verification**
- Clear, professional verification email
- Prominent "Verify Email" button
- Alternative link for accessibility
- Expiration time clearly stated

**Step 4: Verification Success**
- Success page with account details
- API key display (one-time only)
- Getting started guide
- Sign-in link

### 9.2 Email Design

**Key Elements**:
- Professional branding consistent with Dhruva Platform
- Clear call-to-action button
- Alternative text link for accessibility
- Mobile-responsive design
- Security information (expiration, ignore if not requested)

### 9.3 Error Handling UX

**User-Friendly Messages**:
- Clear explanation of what went wrong
- Actionable next steps
- Contact information for support
- Consistent error page design

### 9.4 Mobile Experience

**Considerations**:
- Responsive email templates
- Large, touch-friendly verification buttons
- Mobile-optimized success pages
- Deep linking support for mobile apps

---

## 10. Cleanup Process

### 10.1 Automatic Cleanup

**MongoDB TTL Index**:
- Automatic deletion of expired pending registrations
- No manual intervention required
- Configurable expiration time (default: 24 hours)

**Implementation**:
```javascript
// TTL index on expires_at field
db.pending_registrations.createIndex(
  {"expires_at": 1}, 
  {expireAfterSeconds: 0}
)
```

### 10.2 Manual Cleanup Service

**Scheduled Task**: Celery task running every hour

**Cleanup Operations**:
1. Remove expired pending registrations (backup to TTL)
2. Clean up old verification logs (>30 days)
3. Generate cleanup statistics
4. Alert on unusual patterns

**Cleanup Service Structure**:
```python
@celery.task
def cleanup_expired_registrations():
    """Clean up expired pending registrations and logs"""
    # Remove expired pending registrations
    expired_count = pending_registrations_collection.delete_many({
        "expires_at": {"$lt": datetime.utcnow()}
    }).deleted_count
    
    # Clean up old verification logs
    old_logs_count = verification_logs_collection.delete_many({
        "timestamp": {"$lt": datetime.utcnow() - timedelta(days=30)}
    }).deleted_count
    
    # Log cleanup statistics
    logger.info(f"Cleanup completed: {expired_count} expired registrations, {old_logs_count} old logs")
    
    return {
        "expired_registrations": expired_count,
        "old_logs": old_logs_count,
        "timestamp": datetime.utcnow()
    }
```

### 10.3 Monitoring and Alerts

**Metrics to Track**:
- Pending registration count
- Verification success rate
- Email delivery success rate
- Cleanup operation statistics

**Alerts**:
- High number of failed verifications
- Email service failures
- Unusual signup patterns
- Cleanup service failures

---

## 11. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
1. **Database Schema Setup**
   - Create `pending_registrations` collection
   - Create `email_verification_logs` collection
   - Set up indexes and TTL

2. **Basic Models and Schemas**
   - Create Pydantic models for new endpoints
   - Update existing schemas as needed

3. **Email Service Integration**
   - Choose and configure email service provider
   - Implement basic email sending functionality
   - Create email templates

### Phase 2: API Endpoints (Week 2)
1. **Modify Signup Endpoint**
   - Update signup logic to create pending registration
   - Implement token generation
   - Add email sending

2. **Create Verification Endpoint**
   - Implement token validation
   - Add user account creation logic
   - Handle success/error responses

3. **Add Supporting Endpoints**
   - Resend verification endpoint
   - Registration status endpoint

### Phase 3: Security and Rate Limiting (Week 3)
1. **Rate Limiting Implementation**
   - Set up Redis for rate limiting
   - Implement rate limiting middleware
   - Configure limits for each endpoint

2. **Security Enhancements**
   - Add comprehensive input validation
   - Implement logging and monitoring
   - Add abuse detection mechanisms

### Phase 4: Cleanup and Monitoring (Week 4)
1. **Cleanup Service**
   - Implement Celery cleanup tasks
   - Set up scheduled execution
   - Add monitoring and alerting

2. **Testing and Documentation**
   - Comprehensive testing suite
   - API documentation updates
   - User guide creation

### Phase 5: Production Deployment (Week 5)
1. **Production Configuration**
   - Environment-specific settings
   - Email service production setup
   - Monitoring dashboard setup

2. **Gradual Rollout**
   - Feature flag implementation
   - A/B testing setup
   - Performance monitoring

---

## Conclusion

This email verification system design provides a comprehensive, secure, and user-friendly enhancement to the Dhruva Platform's registration process. The implementation follows security best practices, includes robust error handling, and maintains excellent user experience while preventing abuse and ensuring email validity.

The modular design allows for phased implementation and easy maintenance, while the comprehensive monitoring and cleanup processes ensure long-term system health and performance.
