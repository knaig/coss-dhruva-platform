# Development Documentation

This directory contains development setup guides and developer resources for the Dhruva Platform.

## 📋 Contents

- [Cursor Setup Guide](./cursor-setup.md) - IDE setup and configuration for Cursor
- [Quick Reference](./quick-reference.md) - Developer quick reference guide

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker and Docker Compose
- Git

### Development Environment Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd Dhruva-Platform-2
   ```

2. **Backend Setup**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd client
   npm install
   ```

4. **Start Development Services**
   ```bash
   # Start infrastructure services
   docker-compose -f docker-compose-db.yml up -d
   
   # Start the application
   docker-compose -f docker-compose-app.yml up -d
   ```

## 🛠️ Development Tools

### IDE Configuration
- [Cursor Setup Guide](./cursor-setup.md) - Complete IDE setup for optimal development experience

### Code Quality
- **Linting**: ESLint for frontend, flake8 for backend
- **Formatting**: Prettier for frontend, black for backend
- **Type Checking**: TypeScript for frontend, mypy for backend

### Testing
- **Backend**: pytest with coverage reporting
- **Frontend**: Jest and React Testing Library
- **Integration**: End-to-end testing with Playwright

## 📖 Development Guidelines

### Code Structure
- Follow the established module pattern
- Maintain clear separation of concerns
- Use dependency injection where appropriate

### API Development
- Follow RESTful conventions
- Document all endpoints with OpenAPI/Swagger
- Include comprehensive error handling

### Frontend Development
- Use TypeScript for type safety
- Follow React best practices
- Implement responsive design patterns

### Database Development
- Use migrations for schema changes
- Index frequently queried fields
- Follow data modeling best practices

## 🔧 Useful Commands

### Backend Development
```bash
# Run development server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest tests/ -v --cov=.

# Database migrations
python migrate.py

# Celery monitoring
celery -A celery_backend.celery_app flower
```

### Frontend Development
```bash
# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Type checking
npm run type-check
```

### Docker Operations
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 Additional Resources

- [Architecture Documentation](../architecture/README.md)
- [API Documentation](../architecture/API_REFERENCE.md)
- [Deployment Guide](../deployment/README.md)
- [Testing Documentation](../testing/README.md)

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Write tests for new functionality
4. Update documentation as needed
5. Submit a pull request for review

## 📞 Support

For development support:
- Check the [Quick Reference](./quick-reference.md) for common tasks
- Review the architecture documentation for system understanding
- Consult the troubleshooting guides for common issues
