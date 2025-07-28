# SSL/TLS Implementation Guide for Dhruva Platform

## Current Setup Analysis

### Infrastructure Overview
- **Nginx**: Running on host system (not containerized), listening on port 80
- **Next.js Frontend**: Running on port 3001 (host system, not containerized)
- **Backend API**: Running in Docker container on port 8000
- **Current Nginx Config**: Proxies `/dhruva` requests to Next.js frontend
- **SSL Status**: Not configured (HTTP only)

### Current Nginx Configuration
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location /dhruva {
        proxy_pass http://localhost:3001;
        # ... proxy headers
    }
}
```

## SSL Implementation Plan

### Phase 1: Certificate Acquisition Options

#### Option A: Let's Encrypt (Recommended for Production)
- **Pros**: Free, automated renewal, trusted by all browsers
- **Cons**: Requires domain name and public accessibility
- **Use Case**: Production deployments with public domain

#### Option B: Self-Signed Certificates (Recommended for Development)
- **Pros**: Works without domain, immediate setup, no external dependencies
- **Cons**: Browser warnings, not trusted by default
- **Use Case**: Development, testing, internal networks

#### Option C: Existing Certificates
- **Pros**: Use existing organizational certificates
- **Cons**: Manual management, renewal complexity
- **Use Case**: Enterprise environments with existing PKI

### Phase 2: Nginx SSL Configuration

#### Required Changes:
1. **Add HTTPS server block** (port 443)
2. **Configure SSL certificates** and security settings
3. **Implement HTTP to HTTPS redirect**
4. **Maintain existing proxy rules** for `/dhruva` path
5. **Add security headers** for HTTPS

### Phase 3: Testing and Validation

#### Validation Steps:
1. **Certificate validation**: Verify SSL certificate installation
2. **HTTPS access**: Test frontend and API access via HTTPS
3. **HTTP redirect**: Verify automatic HTTP to HTTPS redirection
4. **Proxy functionality**: Ensure Next.js and API routing still works
5. **Security headers**: Validate security header implementation

## Implementation Steps

### Step 1: Choose Certificate Method

We'll provide configurations for both Let's Encrypt and self-signed certificates.

### Step 2: Backup Current Configuration

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

### Step 3: Install Required Tools

For Let's Encrypt:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

For self-signed certificates:
```bash
sudo apt update
sudo apt install openssl
```

### Step 4: Generate/Obtain Certificates

#### For Let's Encrypt (requires domain):
```bash
sudo certbot --nginx -d your-domain.com
```

#### For Self-Signed Certificates:
```bash
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/dhruva-selfsigned.key \
    -out /etc/nginx/ssl/dhruva-selfsigned.crt \
    -subj "/C=IN/ST=State/L=City/O=Organization/CN=localhost"
```

### Step 5: Update Nginx Configuration

The new configuration will include:
- HTTPS server block on port 443
- HTTP to HTTPS redirect
- SSL security settings
- Preserved proxy rules for `/dhruva`

### Step 6: Test and Deploy

1. Test configuration syntax
2. Reload Nginx
3. Verify HTTPS access
4. Test all existing functionality

## Security Considerations

### SSL Security Settings
- **TLS Versions**: TLS 1.2 and 1.3 only
- **Cipher Suites**: Modern, secure ciphers
- **HSTS**: HTTP Strict Transport Security
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.

### Certificate Management
- **Renewal**: Automated for Let's Encrypt, manual for self-signed
- **Backup**: Regular backup of certificates and keys
- **Monitoring**: Certificate expiration monitoring

## Next Steps

1. **Choose certificate method** based on your environment
2. **Review and approve** the detailed configuration changes
3. **Execute implementation** with proper testing
4. **Validate functionality** across all endpoints
5. **Document** the final configuration for maintenance

Would you like to proceed with a specific certificate method?

## Detailed Configuration Files

### Configuration Option 1: Self-Signed Certificate (Development/Testing)

#### Generate Self-Signed Certificate:
```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/dhruva-selfsigned.key \
    -out /etc/nginx/ssl/dhruva-selfsigned.crt \
    -subj "/C=IN/ST=Karnataka/L=Bangalore/O=Dhruva Platform/CN=localhost"

# Set proper permissions
sudo chmod 600 /etc/nginx/ssl/dhruva-selfsigned.key
sudo chmod 644 /etc/nginx/ssl/dhruva-selfsigned.crt
```

#### Nginx Configuration for Self-Signed Certificate:
```nginx
##
# SSL-Enabled Nginx Configuration for Dhruva Platform
# Self-Signed Certificate Configuration
##

# HTTP to HTTPS redirect
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server configuration
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;

    # SSL Certificate Configuration
    ssl_certificate /etc/nginx/ssl/dhruva-selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/dhruva-selfsigned.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Next.js Frontend Proxy
    location /dhruva {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;

        # Additional SSL-specific headers
        proxy_set_header X-Forwarded-Ssl on;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

### Configuration Option 2: Let's Encrypt Certificate (Production)

#### Prerequisites for Let's Encrypt:
- Domain name pointing to your server
- Server accessible from the internet on ports 80 and 443
- DNS properly configured

#### Install Certbot:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

#### Obtain Let's Encrypt Certificate:
```bash
# Replace 'your-domain.com' with your actual domain
sudo certbot --nginx -d your-domain.com

# For multiple domains/subdomains:
# sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### Nginx Configuration for Let's Encrypt:
```nginx
##
# SSL-Enabled Nginx Configuration for Dhruva Platform
# Let's Encrypt Certificate Configuration
##

# HTTP to HTTPS redirect
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name your-domain.com www.your-domain.com;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server configuration
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name your-domain.com www.your-domain.com;

    # SSL Certificate Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Additional SSL Security Settings
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Next.js Frontend Proxy
    location /dhruva {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;

        # Additional SSL-specific headers
        proxy_set_header X-Forwarded-Ssl on;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

#### Set up automatic renewal:
```bash
# Test renewal process
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job, but you can verify:
sudo crontab -l | grep certbot
```

## Implementation Scripts

### Script 1: Self-Signed Certificate Setup

Create `setup-ssl-selfsigned.sh`:
```bash
#!/bin/bash

echo "🔒 Setting up SSL with Self-Signed Certificate for Dhruva Platform"

# Backup current configuration
echo "📁 Backing up current Nginx configuration..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Create SSL directory
echo "📂 Creating SSL directory..."
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificate
echo "🔑 Generating self-signed certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/dhruva-selfsigned.key \
    -out /etc/nginx/ssl/dhruva-selfsigned.crt \
    -subj "/C=IN/ST=Karnataka/L=Bangalore/O=Dhruva Platform/CN=localhost"

# Set proper permissions
echo "🔐 Setting certificate permissions..."
sudo chmod 600 /etc/nginx/ssl/dhruva-selfsigned.key
sudo chmod 644 /etc/nginx/ssl/dhruva-selfsigned.crt

echo "✅ Self-signed certificate generated successfully!"
echo "📍 Certificate location: /etc/nginx/ssl/dhruva-selfsigned.crt"
echo "🔑 Private key location: /etc/nginx/ssl/dhruva-selfsigned.key"
echo ""
echo "⚠️  Next steps:"
echo "1. Update Nginx configuration with SSL settings"
echo "2. Test configuration: sudo nginx -t"
echo "3. Reload Nginx: sudo systemctl reload nginx"
```

### Script 2: Let's Encrypt Setup

Create `setup-ssl-letsencrypt.sh`:
```bash
#!/bin/bash

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Domain name required"
    echo "Usage: $0 your-domain.com"
    exit 1
fi

DOMAIN=$1

echo "🔒 Setting up SSL with Let's Encrypt for Dhruva Platform"
echo "🌐 Domain: $DOMAIN"

# Backup current configuration
echo "📁 Backing up current Nginx configuration..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)

# Install Certbot
echo "📦 Installing Certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
echo "🔑 Obtaining Let's Encrypt certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Test renewal
echo "🔄 Testing certificate renewal..."
sudo certbot renew --dry-run

echo "✅ Let's Encrypt certificate obtained successfully!"
echo "📍 Certificate location: /etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "⚠️  Next steps:"
echo "1. Verify Nginx configuration: sudo nginx -t"
echo "2. Check HTTPS access: https://$DOMAIN/dhruva"
echo "3. Monitor certificate expiration (auto-renewal is configured)"
```

## Testing and Validation Procedures

### Pre-Implementation Checklist

```bash
# 1. Verify current services are running
sudo systemctl status nginx
curl -f http://localhost/dhruva
docker ps | grep dhruva-platform-server

# 2. Check current ports
sudo netstat -tlnp | grep -E "(80|443|3001|8000)"

# 3. Backup current configuration
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
```

### Post-Implementation Testing

#### Test Script: `test-ssl-setup.sh`
```bash
#!/bin/bash

echo "🧪 Testing SSL Setup for Dhruva Platform"

# Test 1: Nginx configuration syntax
echo "1️⃣ Testing Nginx configuration syntax..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Test 2: SSL certificate validation
echo "2️⃣ Testing SSL certificate..."
if openssl x509 -in /etc/nginx/ssl/dhruva-selfsigned.crt -text -noout > /dev/null 2>&1; then
    echo "✅ SSL certificate is valid"
    openssl x509 -in /etc/nginx/ssl/dhruva-selfsigned.crt -subject -dates -noout
else
    echo "❌ SSL certificate validation failed"
fi

# Test 3: HTTPS connectivity
echo "3️⃣ Testing HTTPS connectivity..."
if curl -k -f https://localhost/health > /dev/null 2>&1; then
    echo "✅ HTTPS health check passed"
else
    echo "❌ HTTPS health check failed"
fi

# Test 4: HTTP to HTTPS redirect
echo "4️⃣ Testing HTTP to HTTPS redirect..."
REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/dhruva)
if [ "$REDIRECT_STATUS" = "301" ]; then
    echo "✅ HTTP to HTTPS redirect working"
else
    echo "❌ HTTP to HTTPS redirect not working (Status: $REDIRECT_STATUS)"
fi

# Test 5: Frontend proxy functionality
echo "5️⃣ Testing frontend proxy functionality..."
if curl -k -f https://localhost/dhruva > /dev/null 2>&1; then
    echo "✅ Frontend proxy working via HTTPS"
else
    echo "❌ Frontend proxy not working via HTTPS"
fi

# Test 6: Security headers
echo "6️⃣ Testing security headers..."
HEADERS=$(curl -k -s -I https://localhost/dhruva)
if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    echo "✅ HSTS header present"
else
    echo "❌ HSTS header missing"
fi

echo ""
echo "🏁 SSL Testing Complete!"
```

### Manual Validation Steps

#### 1. Browser Testing
```bash
# Open in browser (accept self-signed certificate warning if using self-signed)
https://localhost/dhruva
https://your-domain.com/dhruva  # For Let's Encrypt
```

#### 2. SSL Certificate Information
```bash
# Check certificate details
openssl x509 -in /etc/nginx/ssl/dhruva-selfsigned.crt -text -noout

# For Let's Encrypt:
# openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout
```

#### 3. Security Headers Validation
```bash
# Test security headers
curl -k -I https://localhost/dhruva | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"
```

#### 4. Performance Testing
```bash
# Test SSL handshake performance
openssl s_time -connect localhost:443 -new -verify 0

# Test overall response time
time curl -k -s https://localhost/dhruva > /dev/null
```

### Troubleshooting Common Issues

#### Issue 1: Certificate Permission Errors
```bash
# Fix certificate permissions
sudo chmod 600 /etc/nginx/ssl/dhruva-selfsigned.key
sudo chmod 644 /etc/nginx/ssl/dhruva-selfsigned.crt
sudo chown root:root /etc/nginx/ssl/*
```

#### Issue 2: Nginx Won't Start
```bash
# Check detailed error logs
sudo journalctl -u nginx.service -f
sudo tail -f /var/log/nginx/error.log
```

#### Issue 3: Frontend Not Loading
```bash
# Verify Next.js is running
sudo netstat -tlnp | grep 3001
curl http://localhost:3001/dhruva

# Check proxy configuration
sudo nginx -T | grep -A 10 "location /dhruva"
```

#### Issue 4: Mixed Content Warnings
```bash
# Ensure all resources use HTTPS
# Check browser developer console for mixed content errors
# Update any hardcoded HTTP URLs in frontend code
```

## Quick Start Implementation

### For Development/Testing (Self-Signed Certificate)

```bash
# 1. Run the self-signed SSL setup script
./setup-ssl-selfsigned.sh

# 2. Test the SSL setup
./test-ssl-setup.sh

# 3. Access the application
# https://localhost/dhruva (accept browser warning for self-signed cert)
```

### For Production (Let's Encrypt Certificate)

```bash
# 1. Ensure your domain points to this server
# 2. Run the Let's Encrypt SSL setup script
./setup-ssl-letsencrypt.sh your-domain.com

# 3. Test the SSL setup
./test-ssl-setup.sh

# 4. Access the application
# https://your-domain.com/dhruva
```

## Files Created

1. **`SSL_IMPLEMENTATION_GUIDE.md`** - Complete implementation guide
2. **`setup-ssl-selfsigned.sh`** - Self-signed certificate setup script
3. **`setup-ssl-letsencrypt.sh`** - Let's Encrypt certificate setup script
4. **`test-ssl-setup.sh`** - Comprehensive SSL testing script

## What Gets Preserved

✅ **All existing functionality maintained:**
- Next.js frontend on `/dhruva` path
- Backend API routing through Docker containers
- All existing proxy configurations
- Docker Compose setup unchanged
- Monitoring and metering services unaffected

✅ **Enhanced security added:**
- HTTPS encryption for all traffic
- HTTP to HTTPS automatic redirects
- Modern SSL/TLS security settings
- Security headers (HSTS, X-Frame-Options, etc.)
- Certificate management (auto-renewal for Let's Encrypt)

## Support and Maintenance

### Certificate Renewal
- **Let's Encrypt**: Automatic renewal via cron job
- **Self-Signed**: Manual renewal required (365 days)

### Monitoring
```bash
# Check certificate expiration
openssl x509 -in /etc/nginx/ssl/dhruva-selfsigned.crt -dates -noout

# For Let's Encrypt:
sudo certbot certificates
```

### Backup
```bash
# Backup SSL certificates
sudo tar -czf ssl-backup-$(date +%Y%m%d).tar.gz /etc/nginx/ssl/ /etc/letsencrypt/
```

Ready to implement SSL/TLS for your Dhruva Platform! 🔒
