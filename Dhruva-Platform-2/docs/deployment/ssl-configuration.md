# Dhruva Platform SSL/TLS Configuration Documentation

## Overview
This document describes the SSL/TLS encryption configuration for the Dhruva Platform Nginx reverse proxy, implemented using self-signed certificates for the EC2 instance at IP address 13.203.149.17.

## SSL Certificate Details

### Certificate Information
- **Certificate Path**: `/etc/nginx/ssl/dhruva.crt`
- **Private Key Path**: `/etc/nginx/ssl/dhruva.key`
- **Certificate Type**: Self-signed X.509 certificate
- **Key Algorithm**: RSA 2048-bit
- **Validity Period**: 365 days (1 year)
- **Subject**: `C=IN, ST=Karnataka, L=Bangalore, O=Dhruva Platform, OU=IT Department, CN=13.203.149.17`
- **Valid From**: June 6, 2025
- **Valid Until**: June 6, 2026

### Certificate Generation Command
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/dhruva.key \
  -out /etc/nginx/ssl/dhruva.crt \
  -subj "/C=IN/ST=Karnataka/L=Bangalore/O=Dhruva Platform/OU=IT Department/CN=13.203.149.17"
```

## Nginx SSL Configuration

### HTTP to HTTPS Redirect
- All HTTP (port 80) requests are automatically redirected to HTTPS (port 443)
- Redirect status: 301 Moved Permanently
- Preserves the original request URI

### HTTPS Server Configuration
- **Listen Ports**: 443 (IPv4 and IPv6)
- **SSL Protocols**: TLSv1.2, TLSv1.3
- **SSL Ciphers**: ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384
- **SSL Session Cache**: 10MB shared cache
- **SSL Session Timeout**: 10 minutes

## Reverse Proxy Configuration

### Frontend (Next.js)
- **HTTPS URL**: `https://13.203.149.17/dhruva`
- **Proxy Target**: `http://localhost:3001`
- **Status**: ✅ Fully functional

### Backend API (FastAPI)
- **HTTPS URL**: `https://13.203.149.17/backend/`
- **Proxy Target**: `http://localhost:8000/`
- **Status**: ✅ Fully functional

### API Documentation
- **HTTPS URL**: `https://13.203.149.17/backend/docs`
- **Description**: FastAPI Swagger UI documentation
- **Status**: ✅ Fully functional

### OpenAPI Schema
- **HTTPS URL**: `https://13.203.149.17/openapi.json`
- **Proxy Target**: `http://localhost:8000/openapi.json`
- **Status**: ✅ Fully functional

## Security Features

### SSL/TLS Security
- ✅ Strong encryption protocols (TLSv1.2, TLSv1.3)
- ✅ Secure cipher suites
- ✅ Server cipher preference enabled
- ✅ SSL session caching for performance
- ✅ Proper proxy headers for HTTPS

### Proxy Security Headers
- `X-Real-IP`: Client's real IP address
- `X-Forwarded-For`: Proxy chain information
- `X-Forwarded-Proto`: Original protocol (https)
- `Host`: Original host header
- `Upgrade` and `Connection`: WebSocket support

## Access URLs

### Production URLs (HTTPS)
- **Root**: `https://13.203.149.17/`
- **Frontend**: `https://13.203.149.17/dhruva`
- **Backend API**: `https://13.203.149.17/backend/`
- **API Documentation**: `https://13.203.149.17/backend/docs`
- **OpenAPI Schema**: `https://13.203.149.17/openapi.json`

### HTTP Redirects
- All HTTP URLs automatically redirect to HTTPS equivalents
- Example: `http://13.203.149.17/dhruva` → `https://13.203.149.17/dhruva`

## Browser Considerations

### Self-Signed Certificate Warnings
- Browsers will show security warnings for self-signed certificates
- Users need to accept the certificate or add security exceptions
- For production use, consider using Let's Encrypt or commercial certificates

### Testing with curl
```bash
# Test with certificate verification disabled
curl -k https://13.203.149.17/backend/docs

# Test HTTP to HTTPS redirect
curl -I http://13.203.149.17/
```

## Maintenance

### Certificate Renewal
The self-signed certificate is valid for 1 year. To renew:
```bash
# Generate new certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/dhruva.key \
  -out /etc/nginx/ssl/dhruva.crt \
  -subj "/C=IN/ST=Karnataka/L=Bangalore/O=Dhruva Platform/OU=IT Department/CN=13.203.149.17"

# Restart Nginx
sudo systemctl restart nginx
```

### Configuration Files
- **Nginx Config**: `/etc/nginx/sites-available/default`
- **SSL Certificates**: `/etc/nginx/ssl/`
- **Backup Location**: Create backups before making changes

## Troubleshooting

### Common Issues
1. **Certificate not found**: Verify files exist in `/etc/nginx/ssl/`
2. **Permission errors**: Ensure proper file permissions (644 for .crt, 600 for .key)
3. **Port conflicts**: Verify ports 80 and 443 are available
4. **Firewall**: Ensure EC2 security groups allow HTTPS (port 443)

### Verification Commands
```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check listening ports
sudo netstat -tlnp | grep nginx

# Verify SSL certificate
openssl x509 -in /etc/nginx/ssl/dhruva.crt -text -noout
```

## Status Summary
✅ **SSL/TLS encryption successfully configured**
✅ **All endpoints accessible via HTTPS**
✅ **HTTP to HTTPS redirects working**
✅ **Self-signed certificate properly installed**
✅ **Reverse proxy functionality preserved**
✅ **FastAPI documentation accessible**
✅ **External access from public IP working**

---
*Last Updated: June 6, 2025*
*Configuration Status: Production Ready*
