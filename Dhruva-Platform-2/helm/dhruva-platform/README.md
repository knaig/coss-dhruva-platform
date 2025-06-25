# Dhruva Platform Helm Chart

This Helm chart deploys the Dhruva AI Platform on Kubernetes, providing a scalable and production-ready deployment for serving AI models at scale.

## Overview

Dhruva Platform is a comprehensive AI platform developed by AI4Bharat that provides:
- **Automatic Speech Recognition (ASR)** for multiple Indian languages
- **Text-to-Speech (TTS)** synthesis
- **Neural Machine Translation (NMT)** with IndicTrans2
- **Named Entity Recognition (NER)**
- **Transliteration (XLIT)**
- **Speech-to-Speech (S2S)** translation

## Architecture

The platform consists of:
- **Frontend**: Next.js client application
- **Backend**: FastAPI server with AI model inference
- **Workers**: Celery workers for background processing
- **Databases**: MongoDB (app data), Redis (cache), TimescaleDB (metrics)
- **Message Queue**: RabbitMQ for task distribution
- **Monitoring**: Prometheus + Grafana stack

## Prerequisites

- Kubernetes 1.19+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure
- Ingress controller (nginx recommended)
- cert-manager (for TLS certificates)

## Installation

### Quick Start

1. **Add Helm repositories:**
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

2. **Install the chart:**
```bash
helm install dhruva-platform ./dhruva-platform --namespace dhruva --create-namespace
```

### Production Installation

For production deployment, use the provided installation script:

```bash
cd helm
chmod +x install.sh
./install.sh
```

Or manually with production values:

```bash
helm install dhruva-platform ./dhruva-platform \
  --namespace dhruva \
  --create-namespace \
  --values values-production.yaml \
  --timeout 600s \
  --wait
```

## Configuration

### Values Files

- `values.yaml` - Default development configuration
- `values-production.yaml` - Production-ready configuration with HA

### Key Configuration Sections

#### Server Configuration
```yaml
server:
  enabled: true
  replicaCount: 2
  resources:
    limits:
      cpu: 2000m
      memory: 4Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
```

#### Database Configuration
```yaml
mongodb:
  enabled: true
  architecture: replicaset
  replicaCount: 3
  persistence:
    size: 100Gi

redis:
  enabled: true
  architecture: standalone
  persistence:
    size: 20Gi
```

#### Ingress Configuration
```yaml
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: dhruva.example.com
      paths:
        - path: /
          service: client
        - path: /api
          service: server
```

## Scaling

### Horizontal Pod Autoscaling

The chart includes HPA configurations for:
- Server pods (CPU/Memory based)
- Client pods (CPU based)
- Celery workers (CPU based)

### Manual Scaling

Scale individual components:
```bash
kubectl scale deployment dhruva-platform-server --replicas=5 -n dhruva
kubectl scale deployment dhruva-platform-celery-worker --replicas=10 -n dhruva
```

## Monitoring

### Prometheus Metrics

The platform exposes metrics at `/metrics` endpoint. ServiceMonitor is automatically created when enabled.

### Grafana Dashboards

Access Grafana dashboard:
```bash
kubectl port-forward svc/dhruva-platform-grafana 3000:80 -n dhruva
```

Default credentials: `admin` / `admin` (change in production)

### Flower (Celery Monitoring)

Monitor Celery tasks:
```bash
kubectl port-forward svc/dhruva-platform-flower 5555:5555 -n dhruva
```

## Security

### Production Security Checklist

- [ ] Change all default passwords in `secrets` section
- [ ] Enable network policies
- [ ] Configure proper RBAC
- [ ] Use specific image tags (not `latest`)
- [ ] Enable pod security contexts
- [ ] Configure TLS certificates
- [ ] Set up backup strategies

### Secrets Management

Update secrets in production:
```yaml
secrets:
  mongodbPassword: "your-secure-password"
  redisPassword: "your-secure-password"
  jwtSecret: "your-jwt-secret"
  # ... other secrets
```

## Backup and Recovery

### Database Backups

MongoDB backup using Bitnami chart:
```bash
kubectl create job --from=cronjob/mongodb-backup mongodb-backup-manual -n dhruva
```

### Persistent Volume Backups

Ensure your storage class supports snapshots for automated backups.

## Troubleshooting

### Common Issues

1. **Pods stuck in Pending state**
   - Check resource requests vs available cluster resources
   - Verify storage class availability
   - Check node selectors and affinity rules

2. **Database connection issues**
   - Verify database pods are running
   - Check service names and ports
   - Validate credentials in secrets

3. **Ingress not working**
   - Verify ingress controller is installed
   - Check DNS resolution
   - Validate TLS certificates

### Debugging Commands

```bash
# Check pod status
kubectl get pods -n dhruva

# View pod logs
kubectl logs -f deployment/dhruva-platform-server -n dhruva

# Check services
kubectl get svc -n dhruva

# Describe problematic resources
kubectl describe pod <pod-name> -n dhruva
```

## Upgrading

### Helm Upgrade

```bash
helm upgrade dhruva-platform ./dhruva-platform \
  --namespace dhruva \
  --values values-production.yaml
```

### Rolling Updates

The chart supports rolling updates with zero downtime when properly configured with:
- Multiple replicas
- Pod disruption budgets
- Health checks

## Uninstallation

```bash
helm uninstall dhruva-platform -n dhruva
kubectl delete namespace dhruva
```

**Warning**: This will delete all data. Ensure backups are taken before uninstalling.

## Support

For issues and questions:
- GitHub Issues: [Dhruva Platform Repository]
- Documentation: [AI4Bharat Documentation]
- Community: [AI4Bharat Discord/Slack]

## License

This chart is licensed under the MIT License. See the LICENSE file for details.