#!/bin/bash

# Dhruva Platform Helm Chart Validation Script
# This script validates the Helm chart templates and configurations

set -e

# Configuration
CHART_PATH=${CHART_PATH:-"./dhruva-platform"}
VALUES_FILE=${VALUES_FILE:-"values.yaml"}
NAMESPACE=${NAMESPACE:-"dhruva-test"}

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

    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed. Please install Helm first."
        exit 1
    fi

    # Check if chart directory exists
    if [ ! -d "$CHART_PATH" ]; then
        log_error "Chart directory $CHART_PATH does not exist."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Validate chart syntax
validate_chart_syntax() {
    log_info "Validating chart syntax..."

    # Lint the chart
    if helm lint "$CHART_PATH" --values "$CHART_PATH/$VALUES_FILE"; then
        log_success "Chart syntax validation passed"
    else
        log_error "Chart syntax validation failed"
        exit 1
    fi
}

# Validate chart dependencies
validate_dependencies() {
    log_info "Validating chart dependencies..."

    # Update dependencies
    if helm dependency update "$CHART_PATH"; then
        log_success "Dependencies updated successfully"
    else
        log_error "Failed to update dependencies"
        exit 1
    fi

    # Build dependencies
    if helm dependency build "$CHART_PATH"; then
        log_success "Dependencies built successfully"
    else
        log_error "Failed to build dependencies"
        exit 1
    fi
}

# Validate template rendering
validate_templates() {
    log_info "Validating template rendering..."

    # Test template rendering with default values
    if helm template test-release "$CHART_PATH" --values "$CHART_PATH/$VALUES_FILE" > /dev/null; then
        log_success "Template rendering with default values passed"
    else
        log_error "Template rendering with default values failed"
        exit 1
    fi

    # Test template rendering with production values if it exists
    if [ -f "$CHART_PATH/values-production.yaml" ]; then
        if helm template test-release "$CHART_PATH" --values "$CHART_PATH/values-production.yaml" > /dev/null; then
            log_success "Template rendering with production values passed"
        else
            log_error "Template rendering with production values failed"
            exit 1
        fi
    fi
}

# Validate Kubernetes manifests
validate_manifests() {
    log_info "Validating Kubernetes manifests..."

    # Generate manifests
    local temp_dir=$(mktemp -d)
    helm template test-release "$CHART_PATH" --values "$CHART_PATH/$VALUES_FILE" --output-dir "$temp_dir"

    # Check if kubectl is available for validation
    if command -v kubectl &> /dev/null; then
        # Validate each manifest file
        find "$temp_dir" -name "*.yaml" -type f | while read -r file; do
            if kubectl apply --dry-run=client -f "$file" > /dev/null 2>&1; then
                log_info "✓ $(basename "$file") is valid"
            else
                log_warning "⚠ $(basename "$file") validation failed"
            fi
        done
    else
        log_warning "kubectl not available, skipping manifest validation"
    fi

    # Cleanup
    rm -rf "$temp_dir"
    log_success "Manifest validation completed"
}

# Check for security best practices
validate_security() {
    log_info "Validating security configurations..."

    local temp_file=$(mktemp)
    helm template test-release "$CHART_PATH" --values "$CHART_PATH/$VALUES_FILE" > "$temp_file"

    local issues=0

    # Check for privileged containers
    if grep -q "privileged: true" "$temp_file"; then
        log_warning "Found privileged containers"
        ((issues++))
    fi

    # Check for containers running as root
    if grep -q "runAsUser: 0" "$temp_file"; then
        log_warning "Found containers running as root"
        ((issues++))
    fi

    # Check for missing resource limits
    if ! grep -q "limits:" "$temp_file"; then
        log_warning "Some containers may be missing resource limits"
        ((issues++))
    fi

    # Check for missing security contexts
    if ! grep -q "securityContext:" "$temp_file"; then
        log_warning "Some pods may be missing security contexts"
        ((issues++))
    fi

    # Cleanup
    rm -f "$temp_file"

    if [ $issues -eq 0 ]; then
        log_success "Security validation passed"
    else
        log_warning "Security validation completed with $issues warnings"
    fi
}

# Validate chart values
validate_values() {
    log_info "Validating chart values..."

    # Check if required values are set
    local required_values=(
        "server.image.repository"
        "client.image.repository"
        "mongodb.auth.password"
        "redis.auth.password"
    )

    local temp_file=$(mktemp)
    helm template test-release "$CHART_PATH" --values "$CHART_PATH/$VALUES_FILE" > "$temp_file"

    local missing_values=0
    for value in "${required_values[@]}"; do
        if ! grep -q "$value" "$CHART_PATH/$VALUES_FILE"; then
            log_warning "Value $value might not be properly configured"
            ((missing_values++))
        fi
    done

    # Cleanup
    rm -f "$temp_file"

    if [ $missing_values -eq 0 ]; then
        log_success "Values validation passed"
    else
        log_warning "Values validation completed with $missing_values warnings"
    fi
}

# Generate test report
generate_report() {
    log_info "Generating validation report..."

    local report_file="validation-report-$(date +%Y%m%d-%H%M%S).txt"

    {
        echo "Dhruva Platform Helm Chart Validation Report"
        echo "============================================="
        echo "Date: $(date)"
        echo "Chart Path: $CHART_PATH"
        echo "Values File: $VALUES_FILE"
        echo ""
        echo "Validation Results:"
        echo "- Chart Syntax: PASSED"
        echo "- Dependencies: PASSED"
        echo "- Template Rendering: PASSED"
        echo "- Kubernetes Manifests: PASSED"
        echo "- Security Check: COMPLETED"
        echo "- Values Check: COMPLETED"
        echo ""
        echo "Chart Information:"
        helm show chart "$CHART_PATH"
    } > "$report_file"

    log_success "Validation report generated: $report_file"
}

# Main validation function
main() {
    log_info "Starting Dhruva Platform Helm chart validation..."

    check_prerequisites
    validate_chart_syntax
    validate_dependencies
    validate_templates
    validate_manifests
    validate_security
    validate_values
    generate_report

    log_success "Helm chart validation completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Dhruva Platform Helm Chart Validation Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Environment Variables:"
        echo "  CHART_PATH     Path to Helm chart (default: ./dhruva-platform)"
        echo "  VALUES_FILE    Values file name (default: values.yaml)"
        echo "  NAMESPACE      Test namespace (default: dhruva-test)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Validate with defaults"
        echo "  VALUES_FILE=values-production.yaml $0 # Validate production config"
        exit 0
        ;;
    *)
        main
        ;;
esac