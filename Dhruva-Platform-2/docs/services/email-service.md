# Email Service Documentation for Dhruva Platform

## Table of Contents
1. [Email Service Options Comparison](#email-service-options-comparison)
2. [SMTP Configuration Guide](#smtp-configuration-guide)
3. [Environment Variables Guide](#environment-variables-guide)
4. [Email Template Customization](#email-template-customization)
5. [Testing Instructions](#testing-instructions)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## 1. Email Service Options Comparison

### SMTP (Simple Mail Transfer Protocol)
**Best for**: Development, testing, small-scale deployments

**Pros:**
- ✅ Simple to configure and test
- ✅ Works with any email provider (Gmail, Outlook, etc.)
- ✅ No additional service costs (uses existing email account)
- ✅ Direct control over email sending
- ✅ Good for development and testing

**Cons:**
- ❌ Limited sending volume (Gmail: 500/day, Outlook: 300/day)
- ❌ Higher chance of emails going to spam
- ❌ No advanced features (templates, analytics, etc.)
- ❌ Requires email account credentials
- ❌ Not suitable for high-volume production use

**Setup Complexity**: ⭐⭐ (Easy)
**Cost**: Free (uses existing email account)
**Reliability**: ⭐⭐⭐ (Good for low volume)

### SendGrid
**Best for**: Production deployments, high-volume email sending

**Pros:**
- ✅ High deliverability rates (99%+)
- ✅ Advanced email templates and design tools
- ✅ Comprehensive analytics and tracking
- ✅ High sending limits (40,000 emails/month free tier)
- ✅ Excellent documentation and support
- ✅ Built-in spam protection and reputation management
- ✅ Webhook support for email events

**Cons:**
- ❌ Requires account setup and API key management
- ❌ Costs money for higher volumes
- ❌ More complex initial configuration
- ❌ Dependent on third-party service

**Setup Complexity**: ⭐⭐⭐ (Moderate)
**Cost**: Free tier (40K emails/month), then $14.95+/month
**Reliability**: ⭐⭐⭐⭐⭐ (Excellent)

### Amazon SES (Simple Email Service)
**Best for**: AWS-integrated applications, cost-effective high-volume sending

**Pros:**
- ✅ Very cost-effective ($0.10 per 1,000 emails)
- ✅ Integrates well with other AWS services
- ✅ High deliverability and reputation
- ✅ Scalable to millions of emails
- ✅ Built-in bounce and complaint handling
- ✅ Detailed sending statistics

**Cons:**
- ❌ Requires AWS account and IAM setup
- ❌ More complex configuration
- ❌ Limited template features compared to SendGrid
- ❌ Requires domain verification for production
- ❌ Learning curve for AWS services

**Setup Complexity**: ⭐⭐⭐⭐ (Complex)
**Cost**: $0.10 per 1,000 emails (very cost-effective)
**Reliability**: ⭐⭐⭐⭐⭐ (Excellent)

### Recommendation Matrix

| Use Case | Recommended Service | Reason |
|----------|-------------------|---------|
| Development/Testing | SMTP | Simple setup, no costs |
| Small Production (<1K emails/month) | SMTP or SendGrid Free | Low volume, cost-effective |
| Medium Production (1K-40K emails/month) | SendGrid | Good balance of features and cost |
| Large Production (>40K emails/month) | Amazon SES | Most cost-effective for high volume |
| AWS-based Infrastructure | Amazon SES | Native integration |
| Need Advanced Templates | SendGrid | Best template and design tools |

---

## 2. SMTP Configuration Guide

### 2.1 Gmail SMTP Configuration

**Step 1: Enable 2-Factor Authentication**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to Security → 2-Step Verification
3. Enable 2-Factor Authentication

**Step 2: Generate App Password**
1. Go to Security → App passwords
2. Select "Mail" and "Other (Custom name)"
3. Enter "Dhruva Platform" as the name
4. Copy the generated 16-character password

**Step 3: SMTP Settings**
```bash
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_USE_TLS=true
```

### 2.2 Outlook/Hotmail SMTP Configuration

**Step 1: Enable SMTP in Outlook**
1. Sign in to [Outlook.com](https://outlook.com)
2. Go to Settings → Mail → Sync email
3. Enable "Let devices and apps use POP"

**Step 2: SMTP Settings**
```bash
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-outlook-password
SMTP_USE_TLS=true
```

### 2.3 Custom SMTP Provider

For other email providers, you'll need to find their SMTP settings:

**Common SMTP Ports:**
- Port 587: STARTTLS (recommended)
- Port 465: SSL/TLS
- Port 25: Unencrypted (not recommended)

**Example for Custom Provider:**
```bash
SMTP_SERVER=mail.yourprovider.com
SMTP_PORT=587
SMTP_USERNAME=your-email@yourprovider.com
SMTP_PASSWORD=your-password
SMTP_USE_TLS=true
```

---

## 3. Environment Variables Guide

### 3.1 Complete Environment Variables List

Add these variables to your `.env` file:

```bash
# Email Service Configuration
EMAIL_SERVICE_PROVIDER=smtp
EMAIL_FROM_ADDRESS=noreply@dhruva.ai
EMAIL_FROM_NAME=Dhruva Platform

# SMTP Configuration (for EMAIL_SERVICE_PROVIDER=smtp)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true

# SendGrid Configuration (for EMAIL_SERVICE_PROVIDER=sendgrid)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_VERIFICATION_TEMPLATE_ID=d-1234567890abcdef
EMAIL_WELCOME_TEMPLATE_ID=d-fedcba0987654321

# Amazon SES Configuration (for EMAIL_SERVICE_PROVIDER=ses)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Frontend URLs
FRONTEND_BASE_URL=http://localhost:3000
EMAIL_VERIFICATION_URL=${FRONTEND_BASE_URL}/verify-email

# Email Verification Settings
EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS=24
EMAIL_VERIFICATION_MAX_ATTEMPTS=5

# Rate Limiting Settings
RATE_LIMIT_SIGNUP_PER_IP_PER_HOUR=5
RATE_LIMIT_VERIFY_PER_IP_PER_HOUR=10
RATE_LIMIT_RESEND_PER_EMAIL_PER_HOUR=3
RATE_LIMIT_STATUS_PER_IP_PER_HOUR=20
```

### 3.2 Environment Variable Descriptions

| Variable | Description | Example Value | Required |
|----------|-------------|---------------|----------|
| `EMAIL_SERVICE_PROVIDER` | Email service to use | `smtp`, `sendgrid`, `ses` | Yes |
| `EMAIL_FROM_ADDRESS` | Sender email address | `noreply@dhruva.ai` | Yes |
| `EMAIL_FROM_NAME` | Sender display name | `Dhruva Platform` | Yes |
| `SMTP_SERVER` | SMTP server hostname | `smtp.gmail.com` | If using SMTP |
| `SMTP_PORT` | SMTP server port | `587` | If using SMTP |
| `SMTP_USERNAME` | SMTP username | `your-email@gmail.com` | If using SMTP |
| `SMTP_PASSWORD` | SMTP password/app password | `abcd efgh ijkl mnop` | If using SMTP |
| `SMTP_USE_TLS` | Enable TLS encryption | `true` | If using SMTP |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.abc123...` | If using SendGrid |
| `FRONTEND_BASE_URL` | Frontend application URL | `http://localhost:3000` | Yes |
| `EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS` | Token expiry time | `24` | No (default: 24) |

### 3.3 Development vs Production Configuration

**Development (.env.development):**
```bash
EMAIL_SERVICE_PROVIDER=smtp
EMAIL_FROM_ADDRESS=noreply@dhruva.ai
FRONTEND_BASE_URL=http://localhost:3000
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-dev-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Production (.env.production):**
```bash
EMAIL_SERVICE_PROVIDER=sendgrid
EMAIL_FROM_ADDRESS=noreply@dhruva.ai
FRONTEND_BASE_URL=https://platform.dhruva.ai
SENDGRID_API_KEY=your-production-sendgrid-key
EMAIL_VERIFICATION_TEMPLATE_ID=d-production-template-id
```

---

## 4. Email Template Customization

### 4.1 Template Structure

Email templates are stored in `server/module/auth/templates/`:
- `verification_email.html` - Email verification template
- `welcome_email.html` - Welcome email template (optional)

### 4.2 Template Variables

**Verification Email Variables:**
- `{{name}}` - User's full name
- `{{verification_url}}` - Complete verification URL with token
- `{{expires_in_hours}}` - Token expiry time in hours

**Welcome Email Variables:**
- `{{name}}` - User's full name
- `{{email}}` - User's email address
- `{{api_key}}` - Generated API key (masked for security)

### 4.3 Customizing Templates

**Basic Customization:**
1. Edit HTML files in `server/module/auth/templates/`
2. Modify colors, fonts, and styling
3. Update company branding and logos
4. Change text content and messaging

**Advanced Customization:**
1. Add new template variables in email service
2. Create conditional content blocks
3. Implement multi-language support
4. Add tracking pixels or analytics

**Example Customization:**
```html
<!-- Custom branding -->
<div style="background-color: #your-brand-color; padding: 20px;">
    <img src="https://your-domain.com/logo.png" alt="Your Logo" style="height: 50px;">
</div>

<!-- Custom styling -->
<style>
    .btn-primary {
        background-color: #your-brand-color !important;
        border-color: #your-brand-color !important;
    }
</style>
```

### 4.4 Template Testing

**Test Template Rendering:**
```python
# Test script to preview templates
from jinja2 import Template

with open('verification_email.html', 'r') as f:
    template = Template(f.read())

rendered = template.render(
    name="Test User",
    verification_url="http://localhost:3000/verify-email?token=test123",
    expires_in_hours=24
)

with open('preview.html', 'w') as f:
    f.write(rendered)
```

---

## 5. Testing Instructions

### 5.1 Development Environment Setup

**Step 1: Configure Environment Variables**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your SMTP settings
EMAIL_SERVICE_PROVIDER=smtp
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-test-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM_ADDRESS=noreply@dhruva.ai
FRONTEND_BASE_URL=http://localhost:3000
```

**Step 2: Start Services**
```bash
# Start all services
docker compose -f docker-compose-db.yml -f docker-compose-metering.yml -f docker-compose-monitoring.yml -f docker-compose-app.yml up -d --remove-orphans
```

**Step 3: Verify Email Service**
```bash
# Check server logs for email service initialization
docker logs dhruva-platform-server --tail 50

# Look for messages like:
# "Email service initialized with provider: smtp"
# "Email service ready to send emails"
```

### 5.2 End-to-End Testing

**Test 1: User Registration**
```bash
# Test signup endpoint
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpassword123"
  }'

# Expected response:
# {
#   "message": "Verification email sent successfully",
#   "email": "test@example.com",
#   "expires_in": 86400
# }
```

**Test 2: Check Email Delivery**
1. Check your test email inbox
2. Look for email from "Dhruva Platform"
3. Verify email content and formatting
4. Click verification link or copy token

**Test 3: Email Verification**
```bash
# Test verification endpoint (replace TOKEN with actual token from email)
curl -X GET "http://localhost:8000/auth/verify-email?token=TOKEN"

# Expected response:
# {
#   "message": "Email verified successfully. Account created.",
#   "user_id": "user_id_here",
#   "email": "test@example.com",
#   "api_key": "generated_api_key_here"
# }
```

**Test 4: Verify User Creation**
```bash
# Check if user was created in database
docker exec -it dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin --eval "use admin; db.user.find({email: 'test@example.com'}).pretty()"

# Check if API key was created
docker exec -it dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin --eval "use admin; db.api_key.find({name: 'default'}).pretty()"
```

### 5.3 Error Testing

**Test Invalid Email:**
```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "invalid-email",
    "password": "testpassword123"
  }'
```

**Test Duplicate Registration:**
```bash
# Register same email twice
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Test Invalid Token:**
```bash
curl -X GET "http://localhost:8000/auth/verify-email?token=invalid-token"
```

### 5.4 Rate Limiting Testing

**Test Signup Rate Limiting:**
```bash
# Send 6 requests quickly (should hit rate limit on 6th)
for i in {1..6}; do
  curl -X POST "http://localhost:8000/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"User $i\", \"email\": \"user$i@example.com\", \"password\": \"password123\"}"
  echo "Request $i completed"
done
```

### 5.5 Monitoring and Logs

**Check Email Service Logs:**
```bash
# Server logs
docker logs dhruva-platform-server --tail 100 -f | grep -i email

# Celery logs (if using background email sending)
docker logs celery-metering --tail 100 -f | grep -i email
```

**Check Database Collections:**
```bash
# Check pending registrations
docker exec -it dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin --eval "use admin; db.pending_registrations.find().pretty()"

# Check verification logs
docker exec -it dhruva-platform-app-db mongosh --username dhruvaadmin --password dhruva123 --authenticationDatabase admin --eval "use admin; db.email_verification_logs.find().pretty()"
```

---

## 6. Production Deployment

### 6.1 Email Service Selection for Production

**Recommended Approach:**
1. **Start with SendGrid** for most production deployments
2. **Consider Amazon SES** if you're already using AWS
3. **Avoid SMTP** for high-volume production use

### 6.2 SendGrid Production Setup

**Step 1: Create SendGrid Account**
1. Sign up at [SendGrid.com](https://sendgrid.com)
2. Verify your account and domain
3. Create API key with "Mail Send" permissions

**Step 2: Domain Authentication**
1. Add your domain to SendGrid
2. Configure DNS records for domain authentication
3. Verify domain ownership

**Step 3: Create Email Templates**
1. Use SendGrid's template editor
2. Create verification and welcome templates
3. Note template IDs for configuration

**Step 4: Production Configuration**
```bash
EMAIL_SERVICE_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your-production-api-key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_VERIFICATION_TEMPLATE_ID=d-your-verification-template-id
EMAIL_WELCOME_TEMPLATE_ID=d-your-welcome-template-id
FRONTEND_BASE_URL=https://platform.yourdomain.com
```

### 6.3 Amazon SES Production Setup

**Step 1: AWS Account Setup**
1. Create AWS account or use existing
2. Create IAM user with SES permissions
3. Generate access key and secret key

**Step 2: Domain Verification**
1. Add domain to SES
2. Verify domain ownership via DNS
3. Request production access (removes sandbox mode)

**Step 3: Production Configuration**
```bash
EMAIL_SERVICE_PROVIDER=ses
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
FRONTEND_BASE_URL=https://platform.yourdomain.com
```

### 6.4 Production Security Considerations

**Environment Variables Security:**
- Use environment variable management (AWS Secrets Manager, HashiCorp Vault)
- Never commit credentials to version control
- Rotate API keys regularly
- Use different credentials for different environments

**Email Security:**
- Implement DKIM and SPF records
- Monitor bounce and complaint rates
- Set up webhook endpoints for email events
- Implement email reputation monitoring

**Rate Limiting:**
- Adjust rate limits based on expected traffic
- Monitor for abuse patterns
- Implement IP whitelisting if needed
- Set up alerts for unusual activity

### 6.5 Monitoring and Alerting

**Key Metrics to Monitor:**
- Email delivery success rate
- Email open rates (if tracking enabled)
- Verification completion rate
- Failed email attempts
- Rate limiting triggers

**Recommended Alerts:**
- Email service failures
- High bounce rates
- Unusual signup patterns
- Verification token expiry rates

**Monitoring Setup:**
```python
# Example Prometheus metrics
email_sent_total = Counter('email_sent_total', 'Total emails sent', ['type', 'status'])
email_verification_rate = Histogram('email_verification_duration_seconds', 'Time to verify email')
```

---

## 7. Troubleshooting

### 7.1 Common SMTP Issues

**Issue: Authentication Failed**
```
Error: (535, '5.7.8 Username and Password not accepted')
```
**Solution:**
- Verify username and password are correct
- For Gmail, ensure you're using App Password, not regular password
- Check if 2FA is enabled and App Password is generated

**Issue: Connection Timeout**
```
Error: [Errno 110] Connection timed out
```
**Solution:**
- Check SMTP server and port settings
- Verify firewall/network allows outbound connections on SMTP port
- Try different ports (587, 465, 25)

**Issue: TLS/SSL Errors**
```
Error: [SSL: CERTIFICATE_VERIFY_FAILED]
```
**Solution:**
- Verify SMTP_USE_TLS setting
- Check if server requires SSL instead of TLS
- Update certificates if using custom SMTP server

### 7.2 Common SendGrid Issues

**Issue: API Key Invalid**
```
Error: The provided authorization grant is invalid, expired, or revoked
```
**Solution:**
- Verify API key is correct and not expired
- Check API key permissions include "Mail Send"
- Regenerate API key if necessary

**Issue: Template Not Found**
```
Error: template_id not found
```
**Solution:**
- Verify template ID is correct
- Check template is published and active
- Ensure template exists in correct SendGrid account

### 7.3 Common Database Issues

**Issue: Collection Not Found**
```
Error: Collection 'pending_registrations' doesn't exist
```
**Solution:**
- Run database initialization script
- Check MongoDB connection
- Verify collection creation in populate_db.py

**Issue: Index Creation Failed**
```
Error: Index with name already exists with different options
```
**Solution:**
- Drop existing indexes and recreate
- Check for conflicting index definitions
- Run index creation script manually

### 7.4 Rate Limiting Issues

**Issue: Redis Connection Failed**
```
Error: Redis connection failed
```
**Solution:**
- Verify Redis is running and accessible
- Check Redis connection settings
- Ensure Redis password is correct

**Issue: Rate Limit Not Working**
```
Error: Rate limiting not applied
```
**Solution:**
- Check rate limiting middleware is properly configured
- Verify Redis keys are being created
- Check rate limit configuration values

### 7.5 Debug Mode

**Enable Debug Logging:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)

# In email service
logger = logging.getLogger(__name__)
logger.debug(f"Sending email to {to_email} via {provider}")
```

**Test Email Service Directly:**
```python
# Test script
from module.auth.service.email_service import EmailService

email_service = EmailService()
result = email_service.send_verification_email(
    to_email="test@example.com",
    name="Test User",
    verification_token="test-token"
)
print(f"Email sent: {result}")
```

---

## Conclusion

This documentation provides comprehensive guidance for implementing and configuring email services in the Dhruva Platform. Start with SMTP for development and testing, then migrate to SendGrid or Amazon SES for production deployments based on your specific needs and infrastructure.

For additional support or questions, refer to the specific service documentation:
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [Amazon SES Documentation](https://docs.aws.amazon.com/ses/)
- [Python smtplib Documentation](https://docs.python.org/3/library/smtplib.html)
