# Dhruva Platform Kubernetes Deployment Guide

This guide provides step-by-step instructions for deploying the Dhruva Platform on Kubernetes using Helm charts for high-scale production environments.

## 🎯 Overview

The Dhruva Platform Helm chart provides:
- **High Availability**: Multi-replica deployments with pod anti-affinity
- **Auto-scaling**: HPA for dynamic scaling based on CPU/Memory
- **Monitoring**: Integrated Prometheus + Grafana stack
- **Security**: RBAC, network policies, and security contexts
- **Persistence**: Persistent storage for databases and logs
- **Load Balancing**: Ingress with SSL termination

## 📋 Prerequisites

### Infrastructure Requirements

- **Kubernetes Cluster**: v1.19+ with at least 3 nodes
- **Node Resources**: Minimum 16 CPU cores, 32GB RAM per node
- **Storage**: Dynamic PV provisioning with SSD storage class
- **Network**: CNI plugin with NetworkPolicy support
- **Load Balancer**: Cloud provider LB or MetalLB

### Software Requirements

- **Helm**: v3.8+
- **kubectl**: Compatible with your cluster version
- **cert-manager**: For TLS certificate management
- **Ingress Controller**: nginx-ingress recommended

### Cluster Setup Verification

```bash
# Check cluster info
kubectl cluster-info

# Verify nodes
kubectl get nodes -o wide

# Check storage classes
kubectl get storageclass

# Verify ingress controller
kubectl get pods -n ingress-nginx
```

## 🚀 Quick Start Deployment

### 1. Clone and Prepare

```bash
# Navigate to the Helm directory
cd Dhruva-Platform-2/helm

# Validate the chart
./validate.sh

# Add required Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### 2. Configure for Your Environment

```bash
# Copy production values template
cp dhruva-platform/values-production.yaml my-values.yaml

# Edit configuration
nano my-values.yaml
```

**Critical configurations to update:**
- Domain names in `ingress.hosts`
- All passwords in `secrets` section
- Storage class names
- Node selectors and affinity rules
- Resource limits based on your cluster

### 3. Deploy

```bash
# Install using the automated script
NAMESPACE=dhruva-prod VALUES_FILE=my-values.yaml ./install.sh

# Or manually
helm install dhruva-platform ./dhruva-platform \
  --namespace dhruva-prod \
  --create-namespace \
  --values my-values.yaml \
  --timeout 600s \
  --wait
```

## 🏗️ Production Deployment

### Step 1: Infrastructure Preparation

#### Storage Configuration
```bash
# Create high-performance storage class (example for AWS EKS)
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF
```

#### Namespace and RBAC
```bash
# Create production namespace
kubectl create namespace dhruva-prod

# Label namespace for monitoring
kubectl label namespace dhruva-prod monitoring=enabled
```

### Step 2: Security Configuration

#### Create Secrets
```bash
# Generate secure passwords
MONGODB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
RABBITMQ_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# Create secrets manually (alternative to values file)
kubectl create secret generic dhruva-secrets \
  --from-literal=mongodb-password="$MONGODB_PASSWORD" \
  --from-literal=redis-password="$REDIS_PASSWORD" \
  --from-literal=rabbitmq-password="$RABBITMQ_PASSWORD" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  -n dhruva-prod
```

#### Network Policies
```bash
# Apply network policies for security
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dhruva-network-policy
  namespace: dhruva-prod
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/instance: dhruva-platform
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8000
    - protocol: TCP
      port: 3000
  egress:
  - {}
EOF
```

### Step 3: Monitoring Setup

#### Install Prometheus Operator (if not already installed)
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus-operator prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```