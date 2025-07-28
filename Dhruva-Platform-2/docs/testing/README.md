# Testing Documentation

This directory contains testing documentation and test results for the Dhruva Platform.

## 📋 Contents

- [Microphone Test Results](./microphone-test-results.md) - ASR microphone reliability testing results

## 🧪 Testing Strategy

### Test Types

1. **Unit Tests**
   - Individual component testing
   - Business logic validation
   - Utility function testing

2. **Integration Tests**
   - API endpoint testing
   - Database integration testing
   - Service integration testing

3. **End-to-End Tests**
   - Complete user workflow testing
   - Cross-service communication testing
   - UI automation testing

4. **Performance Tests**
   - Load testing
   - Stress testing
   - Scalability testing

### Testing Framework

#### Backend Testing
- **Framework**: pytest
- **Coverage**: pytest-cov
- **Mocking**: pytest-mock
- **Async Testing**: pytest-asyncio

#### Frontend Testing
- **Framework**: Jest
- **React Testing**: React Testing Library
- **E2E Testing**: Playwright
- **Component Testing**: Storybook

## 🚀 Running Tests

### Backend Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v

# Run tests in parallel
pytest -n auto
```

### Frontend Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📊 Test Coverage

### Current Coverage Targets
- **Backend**: > 80% line coverage
- **Frontend**: > 75% line coverage
- **Critical Paths**: > 95% coverage

### Coverage Reports
- Backend coverage reports are generated in `htmlcov/`
- Frontend coverage reports are generated in `coverage/`

## 🔧 Test Configuration

### Backend Test Configuration
```python
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --strict-config
    --cov=.
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80
```

### Frontend Test Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};
```

## 🧪 Test Data Management

### Test Fixtures
- Database fixtures for consistent test data
- Mock data generators for realistic testing
- Snapshot testing for UI components

### Test Environment
- Isolated test database
- Mock external services
- Controlled test environment variables

## 📈 Continuous Integration

### CI Pipeline
1. **Code Quality Checks**
   - Linting
   - Type checking
   - Security scanning

2. **Test Execution**
   - Unit tests
   - Integration tests
   - Coverage reporting

3. **Build Verification**
   - Docker image building
   - Deployment testing

### Test Automation
- Automated test execution on PR
- Coverage reporting and enforcement
- Performance regression testing

## 🐛 Debugging Tests

### Common Issues
1. **Flaky Tests**: Use proper async/await patterns
2. **Test Isolation**: Ensure tests don't depend on each other
3. **Mock Management**: Properly reset mocks between tests

### Debugging Tools
```bash
# Run tests with debugging
pytest --pdb

# Run specific test with output
pytest -s tests/test_specific.py::test_function

# Debug frontend tests
npm test -- --debug
```

## 📋 Test Checklists

### Before Committing
- [ ] All tests pass locally
- [ ] Coverage meets minimum requirements
- [ ] No flaky or skipped tests
- [ ] Test data is properly cleaned up

### Before Deploying
- [ ] All CI tests pass
- [ ] Performance tests show no regression
- [ ] Integration tests with staging environment pass
- [ ] Security tests pass

## 📚 Testing Best Practices

### General Principles
1. **Test Pyramid**: More unit tests, fewer E2E tests
2. **Test Independence**: Each test should be isolated
3. **Clear Naming**: Test names should describe what they test
4. **Arrange-Act-Assert**: Structure tests clearly

### Backend Testing
- Test business logic, not implementation details
- Use dependency injection for testability
- Mock external dependencies
- Test error conditions and edge cases

### Frontend Testing
- Test user interactions, not implementation
- Use semantic queries for accessibility
- Test loading and error states
- Mock API calls consistently

## 📞 Support

For testing support:
- Review test examples in the codebase
- Check CI logs for test failures
- Consult the development team for complex testing scenarios
