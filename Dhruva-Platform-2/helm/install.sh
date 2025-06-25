#!/bin/bash

# Dhruva Platform Helm Installation Script
# This script installs the Dhruva Platform using Helm with all dependencies

set -e

# Configuration
NAMESPACE=${NAMESPACE:-"dhruva"}
RELEASE_NAME=${RELEASE_NAME:-"dhruva-platform"}
CHART_PATH=${CHART_PATH:-"./dhruva-platform"}
VALUES_FILE=${VALUES_FILE:-"values.yaml"}
TIMEOUT=${TIMEOUT:-"600s"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi

    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed. Please install Helm first."
        exit 1
    fi

    # Check if we can connect to Kubernetes cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Add Helm repositories
add_helm_repos() {
    log_info "Adding Helm repositories..."

    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts

    log_info "Updating Helm repositories..."
    helm repo update

    log_success "Helm repositories added and updated"
}

# Create namespace
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"

    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        log_success "Namespace $NAMESPACE created"
    fi
}

# Install or upgrade the chart
install_chart() {
    log_info "Installing/Upgrading Dhruva Platform..."

    # Check if release exists
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        log_info "Release $RELEASE_NAME exists, upgrading..."
        helm upgrade "$RELEASE_NAME" "$CHART_PATH" \
            --namespace "$NAMESPACE" \
            --values "$VALUES_FILE" \
            --timeout "$TIMEOUT" \
            --wait
    else
        log_info "Installing new release $RELEASE_NAME..."
        helm install "$RELEASE_NAME" "$CHART_PATH" \
            --namespace "$NAMESPACE" \
            --values "$VALUES_FILE" \
            --timeout "$TIMEOUT" \
            --wait \
            --create-namespace
    fi

    log_success "Dhruva Platform installed/upgraded successfully"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."

    # Check if all pods are running
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE"

    # Wait for pods to be ready
    log_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance="$RELEASE_NAME" -n "$NAMESPACE" --timeout=300s

    # Check services
    log_info "Checking services..."
    kubectl get services -n "$NAMESPACE"

    log_success "Installation verification completed"
}

# Display access information
display_access_info() {
    log_info "Getting access information..."

    echo ""
    echo "=== Dhruva Platform Access Information ==="
    echo ""

    # Get ingress information
    if kubectl get ingress -n "$NAMESPACE" &> /dev/null; then
        echo "Ingress URLs:"
        kubectl get ingress -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,HOSTS:.spec.rules[*].host,ADDRESS:.status.loadBalancer.ingress[*].ip
    fi

    # Get service information
    echo ""
    echo "Services:"
    kubectl get services -n "$NAMESPACE" -o wide

    echo ""
    echo "To access the services locally, you can use port-forwarding:"
    echo "  kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME-client 3000:3000"
    echo "  kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME-server 8000:8000"
    echo "  kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME-flower 5555:5555"
    echo ""
}

# Main installation function
main() {
    log_info "Starting Dhruva Platform installation..."

    check_prerequisites
    add_helm_repos
    create_namespace
    install_chart
    verify_installation
    display_access_info

    log_success "Dhruva Platform installation completed successfully!"
    log_info "You can check the status with: helm status $RELEASE_NAME -n $NAMESPACE"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Dhruva Platform Helm Installation Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Environment Variables:"
        echo "  NAMESPACE      Kubernetes namespace (default: dhruva)"
        echo "  RELEASE_NAME   Helm release name (default: dhruva-platform)"
        echo "  CHART_PATH     Path to Helm chart (default: ./dhruva-platform)"
        echo "  VALUES_FILE    Values file path (default: values.yaml)"
        echo "  TIMEOUT        Installation timeout (default: 600s)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Install with defaults"
        echo "  NAMESPACE=prod $0                     # Install in 'prod' namespace"
        echo "  VALUES_FILE=prod-values.yaml $0      # Use custom values file"
        exit 0
        ;;
    *)
        main
        ;;
esac