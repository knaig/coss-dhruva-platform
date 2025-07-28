# Dhruva Platform Documentation

Welcome to the comprehensive documentation for the Dhruva Platform - an AI/ML model serving platform for Indian language processing.

## 📚 Documentation Structure

This documentation is organized into module-specific guides and high-level architectural overviews:

### Module Documentation
- [Authentication & Authorization System](./authentication/README.md)
- [AI Services Module](./services/README.md)
- [Metering & Analytics System](./metering/README.md)
- [Frontend Application](./frontend/README.md)
- [Database Layer](./database/README.md)
- [Monitoring & Observability](./monitoring/README.md)

### Architecture Documentation
- [Architecture Overview](./architecture/README.md) - Complete architecture documentation index
- [Executive Summary](./architecture/executive-summary.md) - Business and technical overview
- [System Architecture Overview](./architecture/system-overview.md) - Complete system architecture
- [Technical Analysis](./architecture/technical-analysis.md) - Detailed technical architecture
- [**Architectural Analysis Correction**](./architecture/architectural-analysis-correction.md) ⚠️
- [Data Flow Architecture](./architecture/data-flow.md) - Data flow patterns
- [Async/Sync Analysis](./architecture/async-sync-analysis.md) - Processing patterns
- [Storage Analysis](./architecture/storage-analysis.md) - Storage architecture

### Operational Guides
- [Deployment Guide](./deployment/README.md) - Infrastructure and deployment
- [Development Setup](./development/README.md) - Developer environment setup
- [Testing Documentation](./testing/README.md) - Testing strategies and results

### Additional Documentation
- [Frontend Documentation](./frontend/README.md) - Frontend application documentation
- [Database Documentation](./database/README.md) - Database layer documentation
- [Monitoring Documentation](./monitoring/README.md) - Monitoring and observability
- [Legacy Documentation](./legacy/README.md) - Historical documentation backup

## 🚀 Quick Start

1. **System Overview**: Start with [System Architecture Overview](./architecture/system-overview.md)
2. **Deployment**: Follow the [Deployment Guide](./deployment/README.md)
3. **Services**: Check [AI Services Module](./services/README.md)
4. **Monitoring**: Set up [Monitoring & Observability](./monitoring/README.md)

## 🏗️ Platform Overview

Dhruva Platform is a comprehensive AI/ML serving platform that provides:

- **Multi-language AI Services**: Translation, ASR, TTS, NER, and Transliteration
- **Modular Monolithic Architecture**: Well-structured single application with distributed infrastructure
- **Real-time Processing**: Streaming capabilities for live audio processing
- **Comprehensive Metering**: Usage tracking and analytics
- **Enterprise Security**: Multi-factor authentication and authorization
- **Monitoring & Observability**: Full metrics and logging stack

## 📁 Documentation Organization

This documentation has been recently reorganized for better navigation and maintainability:

### New Structure Benefits
- **Logical Categorization**: Documents grouped by functional area
- **Improved Navigation**: Clear hierarchy and cross-references
- **Better Maintainability**: Easier to find and update documentation
- **Historical Preservation**: Original files backed up in `legacy/` folder

### Migration Notes
- All original scattered .md files have been moved to appropriate categories
- Internal links have been updated to reflect new locations
- Legacy backup available in `docs/legacy/` for reference
- New README files created for each category

## ⚠️ Important Architectural Note

**This platform follows a modular monolith pattern, not microservices.** Please see the [Architectural Analysis Correction](./architecture/architectural-analysis-correction.md) for detailed technical analysis and evidence.

## 🔧 Technology Stack

- **Backend**: Python, FastAPI, Celery
- **Frontend**: Next.js, TypeScript, Chakra UI
- **Databases**: MongoDB, TimescaleDB, Redis
- **Message Queue**: RabbitMQ
- **Monitoring**: Prometheus, Grafana
- **Deployment**: Docker, Docker Compose, Kubernetes
- **Authentication**: JWT, OAuth2, API Keys

## 📖 Documentation Conventions

- **🏗️ Architecture**: System design and component relationships
- **⚙️ Configuration**: Setup and configuration details
- **🔌 API**: Endpoint documentation and examples
- **📊 Monitoring**: Metrics, logging, and observability
- **🚀 Deployment**: Installation and deployment procedures
- **🔒 Security**: Authentication, authorization, and security measures

## 🤝 Contributing

For contributing to this documentation:

1. Follow the established structure and conventions
2. Include Mermaid diagrams for architectural components
3. Provide code examples and configuration snippets
4. Update the main README when adding new modules

## 📞 Support

For technical support and questions:
- Review module-specific documentation in the organized folders
- Consult the architecture diagrams for system understanding
- Check the legacy folder for historical documentation references
