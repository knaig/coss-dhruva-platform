#!/bin/bash

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Domain name required"
    echo "Usage: $0 your-domain.com"
    echo ""
    echo "Example: $0 api.dhruva.ai4bharat.org"
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

# Create initial configuration for Let's Encrypt challenge
echo "📝 Creating initial Nginx configuration for Let's Encrypt..."
sudo tee /etc/nginx/sites-available/default > /dev/null << EOF
##
# Initial Nginx Configuration for Let's Encrypt Certificate
##

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Temporary proxy for existing functionality during setup
    location /dhruva {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Test and reload configuration
echo "🧪 Testing initial Nginx configuration..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Initial configuration loaded"
else
    echo "❌ Initial configuration has errors"
    exit 1
fi

# Create web root for Let's Encrypt challenges
sudo mkdir -p /var/www/html

# Obtain certificate
echo "🔑 Obtaining Let's Encrypt certificate..."
echo "⚠️  Make sure your domain $DOMAIN points to this server's IP address"
read -p "Press Enter to continue when DNS is configured..."

if sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN; then
    echo "✅ Let's Encrypt certificate obtained successfully!"
else
    echo "❌ Failed to obtain Let's Encrypt certificate"
    echo "Please check:"
    echo "1. Domain DNS points to this server"
    echo "2. Ports 80 and 443 are accessible from internet"
    echo "3. No firewall blocking access"
    exit 1
fi

# Update configuration with enhanced security settings
echo "📝 Updating Nginx configuration with enhanced security..."
sudo tee /etc/nginx/sites-available/default > /dev/null << EOF
##
# SSL-Enabled Nginx Configuration for Dhruva Platform
# Let's Encrypt Certificate Configuration
##

# HTTP to HTTPS redirect
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN;
    
    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server configuration
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name $DOMAIN;

    # SSL Certificate Configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
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

# Test final configuration
echo "🧪 Testing final Nginx configuration..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "✅ Final SSL configuration loaded successfully!"
else
    echo "❌ Final configuration has errors"
    exit 1
fi

# Test renewal process
echo "🔄 Testing certificate renewal..."
sudo certbot renew --dry-run

echo "✅ Let's Encrypt SSL setup completed successfully!"
echo ""
echo "📍 Certificate location: /etc/letsencrypt/live/$DOMAIN/"
echo "🌐 You can now access Dhruva Platform via HTTPS:"
echo "   https://$DOMAIN/dhruva"
echo ""
echo "🔄 Certificate auto-renewal is configured via cron job"
echo "📅 Certificate expires in 90 days and will auto-renew"
