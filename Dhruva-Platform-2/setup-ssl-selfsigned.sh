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

# Create the SSL-enabled Nginx configuration
echo "📝 Creating SSL-enabled Nginx configuration..."
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
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
EOF

# Test configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
    
    echo "✅ SSL setup completed successfully!"
    echo ""
    echo "📍 Certificate location: /etc/nginx/ssl/dhruva-selfsigned.crt"
    echo "🔑 Private key location: /etc/nginx/ssl/dhruva-selfsigned.key"
    echo ""
    echo "🌐 You can now access Dhruva Platform via HTTPS:"
    echo "   https://localhost/dhruva"
    echo ""
    echo "⚠️  Note: You'll see a browser warning for self-signed certificates."
    echo "   This is normal for development/testing environments."
    
else
    echo "❌ Nginx configuration has errors. Please check the configuration."
    exit 1
fi
