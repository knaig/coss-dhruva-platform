# Deployment Guide

> **🔒 SECURITY NOTICE**: This documentation contains examples with placeholder credentials.
> Always use environment variables for actual passwords. Never commit real credentials to version control.

## 🚀 Overview

This guide provides comprehensive instructions for deploying the Dhruva Platform in various environments, from local development to production-ready deployments.

## 📋 Prerequisites

### System Requirements

#### Minimum Requirements (Development)
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **OS**: Ubuntu 20.04+ / macOS 10.15+ / Windows 10 with WSL2

#### Recommended Requirements (Production)
- **CPU**: 8+ cores
- **RAM**: 32+ GB
- **Storage**: 200+ GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: 1 Gbps connection

### Software Dependencies

```bash
# Required software
- Docker 24.0+
- Docker Compose 2.0+
- Git 2.30+
- Node.js 18+ (for client development)
- Python 3.12+ (for server development)

# Optional tools
- kubectl (for Kubernetes deployment)
- helm (for Kubernetes package management)
- nginx (for reverse proxy)
```

## 🔧 Environment Setup

### 1. Clone Repository

```bash
# Clone the main repository
git clone https://github.com/AI4Bharat/Dhruva-Platform.git
cd Dhruva-Platform/Dhruva-Platform-2

# Verify directory structure
ls -la
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Essential Environment Variables

```bash
# Database Configuration
MONGO_APP_DB_USERNAME=your-mongo-username
MONGO_APP_DB_PASSWORD=your-secure-mongo-password
APP_DB_NAME=admin
APP_DB_CONNECTION_STRING=mongodb://${MONGO_APP_DB_USERNAME}:${MONGO_APP_DB_PASSWORD}@dhruva-platform-app-db:27017/admin

# TimescaleDB Configuration
TIMESCALE_HOST=dhruva-platform-timescaledb
TIMESCALE_PORT=5432
TIMESCALE_USER=your-timescale-username
TIMESCALE_PASSWORD=your-secure-timescale-password
TIMESCALE_DATABASE_NAME=dhruva_metering

# Redis Configuration
REDIS_HOST=dhruva-platform-redis
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password

# RabbitMQ Configuration
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=admin123
RABBITMQ_DEFAULT_VHOST=dhruva_host

# Application Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8000
BACKEND_WORKERS=4
ENV=development

# Security Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production
ARGON2_HASH_ROUNDS=12

# Monitoring Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123

# OAuth Configuration (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🐳 Docker Deployment

### Development Deployment

#### Step 1: Build Images

```bash
# Build all images
./build-images.sh

# Or build individually
docker build -t dhruva-platform-server:latest ./server
docker build -t dhruva-platform-client:latest ./client
```

#### Step 2: Deploy Services

```bash
# Deploy in correct order
docker compose -f docker-compose-db.yml up -d
docker compose -f docker-compose-metering.yml up -d
docker compose -f docker-compose-monitoring.yml up -d
docker compose -f docker-compose-app.yml up -d

# Verify all services are running
docker ps
```

#### Step 3: Verify Deployment

```bash
# Check service health
curl http://localhost:8000/health
curl http://localhost:3000  # Frontend (if deployed)
curl http://localhost:9090  # Prometheus
curl http://localhost:3000  # Grafana

# Check logs
docker logs dhruva-platform-server --tail 50
docker logs celery-metering --tail 50
```

### Production Deployment

#### Step 1: Production Environment Setup

```bash
# Set production environment
export ENV=production

# Update .env for production
sed -i 's/ENV=development/ENV=production/' .env
sed -i 's/localhost/your-domain.com/g' .env

# Generate strong passwords
openssl rand -base64 32  # For JWT_SECRET_KEY
openssl rand -base64 16  # For database passwords
```

#### Step 2: SSL/TLS Configuration

```bash
# Option 1: Let's Encrypt (Recommended)
./setup-ssl-letsencrypt.sh your-domain.com

# Option 2: Self-signed certificates (Development only)
./setup-ssl-selfsigned.sh
```

#### Step 3: Production Deployment

```bash
# Deploy with production configuration
docker compose -f docker-compose-db.yml \
               -f docker-compose-metering.yml \
               -f docker-compose-monitoring.yml \
               -f docker-compose-app.yml \
               -f docker-compose-prod.yml \
               up -d --remove-orphans

# Enable auto-restart
docker update --restart=unless-stopped $(docker ps -q)
```

## ☸️ Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Kubernetes Configuration

#### Step 1: Create Namespace

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dhruva-platform
  labels:
    name: dhruva-platform
```

#### Step 2: ConfigMaps and Secrets

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dhruva-config
  namespace: dhruva-platform
data:
  FRONTEND_PORT: "3000"
  BACKEND_PORT: "8000"
  BACKEND_WORKERS: "4"
  ENV: "production"
  REDIS_HOST: "dhruva-redis"
  MONGO_HOST: "dhruva-mongodb"
  TIMESCALE_HOST: "dhruva-timescaledb"
```

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dhruva-secrets
  namespace: dhruva-platform
type: Opaque
data:
  JWT_SECRET_KEY: <base64-encoded-secret>
  MONGO_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
  TIMESCALE_PASSWORD: <base64-encoded-password>
```

#### Step 3: Database Deployments

```yaml
# k8s/mongodb-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dhruva-mongodb
  namespace: dhruva-platform
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dhruva-mongodb
  template:
    metadata:
      labels:
        app: dhruva-mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "dhruvaadmin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: dhruva-secrets
              key: MONGO_PASSWORD
        volumeMounts:
        - name: mongodb-storage
          mountPath: /data/db
      volumes:
      - name: mongodb-storage
        persistentVolumeClaim:
          claimName: mongodb-pvc
```

#### Step 4: Application Deployment

```yaml
# k8s/server-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dhruva-server
  namespace: dhruva-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dhruva-server
  template:
    metadata:
      labels:
        app: dhruva-server
    spec:
      containers:
      - name: dhruva-server
        image: dhruva-platform-server:latest
        ports:
        - containerPort: 8000
        env:
        - name: ENV
          valueFrom:
            configMapKeyRef:
              name: dhruva-config
              key: ENV
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: dhruva-secrets
              key: JWT_SECRET_KEY
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### Step 5: Services and Ingress

```yaml
# k8s/services.yaml
apiVersion: v1
kind: Service
metadata:
  name: dhruva-server-service
  namespace: dhruva-platform
spec:
  selector:
    app: dhruva-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
```

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dhruva-ingress
  namespace: dhruva-platform
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.dhruva.ai4bharat.org
    secretName: dhruva-tls
  rules:
  - host: api.dhruva.ai4bharat.org
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dhruva-server-service
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Apply all configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n dhruva-platform
kubectl get services -n dhruva-platform
kubectl get ingress -n dhruva-platform

# Check logs
kubectl logs -f deployment/dhruva-server -n dhruva-platform
```

## 🔧 Configuration Management

### Environment-Specific Configurations

#### Development Configuration

```yaml
# docker-compose.override.yml (automatically loaded in development)
version: '3.8'
services:
  server:
    volumes:
      - ./server:/src
    environment:
      - DEBUG=true
      - LOG_LEVEL=DEBUG
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    
  client:
    volumes:
      - ./client:/app
    command: npm run dev
```

#### Production Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  server:
    environment:
      - DEBUG=false
      - LOG_LEVEL=INFO
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - server
```

### Secrets Management

#### Using Docker Secrets

```bash
# Create secrets
echo "super-secret-jwt-key" | docker secret create jwt_secret -
echo "database-password" | docker secret create db_password -

# Use in docker-compose
version: '3.8'
services:
  server:
    secrets:
      - jwt_secret
      - db_password
    environment:
      - JWT_SECRET_KEY_FILE=/run/secrets/jwt_secret
      
secrets:
  jwt_secret:
    external: true
  db_password:
    external: true
```

#### Using Kubernetes Secrets

```bash
# Create secrets from command line
kubectl create secret generic dhruva-secrets \
  --from-literal=JWT_SECRET_KEY=your-secret-key \
  --from-literal=MONGO_PASSWORD=your-mongo-password \
  -n dhruva-platform

# Or from files
kubectl create secret generic dhruva-secrets \
  --from-file=jwt-secret=./secrets/jwt-secret.txt \
  --from-file=mongo-password=./secrets/mongo-password.txt \
  -n dhruva-platform
```

## 📊 Monitoring Setup

### Prometheus Configuration

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy Prometheus using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.adminPassword=admin123 \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### Custom Monitoring

```yaml
# k8s/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dhruva-platform-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: dhruva-server
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

## 🔄 Backup and Recovery

### Automated Backup Setup

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# MongoDB backup
docker exec dhruva-platform-app-db mongodump \
  --username $MONGO_APP_DB_USERNAME --password $MONGO_APP_DB_PASSWORD \
  --authenticationDatabase admin \
  --out $BACKUP_DIR/mongodb

# TimescaleDB backup
docker exec dhruva-platform-timescaledb pg_dump \
  -U dhruva dhruva_metering \
  > $BACKUP_DIR/timescaledb.sql

# Configuration backup
tar -czf $BACKUP_DIR/config.tar.gz .env docker-compose-*.yml

# Upload to cloud storage (optional)
aws s3 sync $BACKUP_DIR s3://dhruva-backups/$(date +%Y%m%d_%H%M%S)/
```

### Recovery Procedures

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_DIR=$1

# Stop services
docker compose down

# Restore MongoDB
docker exec dhruva-platform-app-db mongorestore \
  --username $MONGO_APP_DB_USERNAME --password $MONGO_APP_DB_PASSWORD \
  --authenticationDatabase admin \
  --drop $BACKUP_DIR/mongodb

# Restore TimescaleDB
docker exec -i dhruva-platform-timescaledb psql \
  -U dhruva dhruva_metering < $BACKUP_DIR/timescaledb.sql

# Restart services
docker compose up -d
```

## 🔍 Troubleshooting

### Common Deployment Issues

#### 1. Port Conflicts

```bash
# Check port usage
netstat -tulpn | grep :8000
lsof -i :8000

# Solution: Change ports in .env file
BACKEND_PORT=8001
FRONTEND_PORT=3001
```

#### 2. Database Connection Issues

```bash
# Check database connectivity
docker exec dhruva-platform-app-db mongosh --eval "db.runCommand('ping')"
docker exec dhruva-platform-timescaledb psql -U dhruva -d dhruva_metering -c "SELECT 1;"

# Check network connectivity
docker network ls
docker network inspect dhruva-network
```

#### 3. Memory Issues

```bash
# Check memory usage
docker stats --no-stream
free -h

# Increase Docker memory limits
# Edit docker-compose.yml
services:
  server:
    deploy:
      resources:
        limits:
          memory: 4G
```

### Health Check Commands

```bash
# Complete system health check
./scripts/health-check.sh

# Individual service checks
curl -f http://localhost:8000/health
curl -f http://localhost:9090/-/healthy
curl -f http://localhost:3000/api/health

# Database health
docker exec dhruva-platform-app-db mongosh --eval "db.runCommand('ping')" --quiet
docker exec dhruva-platform-redis redis-cli ping
```

## 📈 Scaling and Performance

### Horizontal Scaling

```bash
# Scale API servers
docker compose up -d --scale server=3

# Scale Celery workers
docker compose up -d --scale worker=5

# Kubernetes scaling
kubectl scale deployment dhruva-server --replicas=5 -n dhruva-platform
```

### Performance Tuning

```yaml
# Production optimizations
services:
  server:
    environment:
      - BACKEND_WORKERS=8
      - WORKER_CONNECTIONS=1000
      - MAX_REQUESTS=1000
      - MAX_REQUESTS_JITTER=100
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
```

## 🚀 Deployment Checklist

### Pre-deployment

- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database passwords changed from defaults
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Health checks verified

### Post-deployment

- [ ] All services running and healthy
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Monitoring dashboards accessible
- [ ] Backup jobs scheduled
- [ ] Log aggregation working
- [ ] Performance metrics baseline established
