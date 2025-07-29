# Testing Guide

Comprehensive testing guide for CIV.IQ's testing infrastructure and best practices.

## 🎯 Testing Philosophy

Our testing approach follows the **Testing Trophy** pattern:

- **Static Analysis**: TypeScript, ESLint, Prettier
- **Unit Tests**: Individual functions and components
- **Integration Tests**: API routes and service interactions
- **End-to-End Tests**: Complete user workflows (future)

## 📁 Test Structure

```
tests/
├── unit/                     # Unit tests (70% of tests)
│   ├── features/            # Feature-specific tests
│   │   ├── representatives/ # Representative feature tests
│   │   └── news/           # News feature tests
│   └── services/           # Service layer tests
├── integration/            # Integration tests (20% of tests)
│   └── api/               # API endpoint tests
├── fixtures/              # Test data
│   ├── representatives.json
│   ├── news.json
│   └── index.ts
└── utils/                 # Test utilities
    └── test-helpers.ts    # Mock functions, generators
```

## 🧪 Test Utilities

### Core Test Helpers

Located in `tests/utils/test-helpers.ts`:

```typescript
// Mock API responses
export const createMockApiResponse = <T>(data: T, overrides = {}): ApiResponse<T>

// Generate test data
export const createMockRepresentative = (overrides?: Partial<Representative>): Representative
export const createMockNewsArticle = (overrides?: Partial<NewsArticle>): NewsArticle
export const createMockRepresentatives = (count = 3): Representative[]

// API mocking
export const mockFetch = (response: unknown, ok = true, status = 200)
export const resetMocks = ()

// Async utilities
export const waitForAsync = () => Promise<void>

// Error responses
export const createMockErrorResponse = (message = 'Test error', code = 'TEST_ERROR')
```

### Fixtures

JSON-based test data for consistent testing:

```typescript
import { fixtures } from '../fixtures';

// Use pre-defined test data
const testRepresentatives = fixtures.representatives;
const testNews = fixtures.news;
```

## 🔧 Writing Tests

### Unit Test Example

```typescript
// tests/unit/services/representatives.service.test.ts
import { representativesService } from '@/services/api/representatives.service';
import {
  createMockApiResponse,
  createMockRepresentative,
  mockFetch,
  resetMocks,
} from '../../utils/test-helpers';

describe('RepresentativesService', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('getByZipCode', () => {
    it('should fetch representatives by ZIP code', async () => {
      // Arrange
      const mockRepresentatives = [createMockRepresentative()];
      const mockResponse = createMockApiResponse(mockRepresentatives);
      mockFetch(mockResponse);

      // Act
      const result = await representativesService.getByZipCode('48221');

      // Assert
      expect(result).toEqual(mockRepresentatives);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/representatives?zip=48221'),
        expect.any(Object)
      );
    });

    it('should handle empty results', async () => {
      const mockResponse = createMockApiResponse([]);
      mockFetch(mockResponse);

      const result = await representativesService.getByZipCode('00000');

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockFetch(null, false, 500);

      await expect(representativesService.getByZipCode('48221')).rejects.toThrow();
    });
  });
});
```

### Component Test Example

```typescript
// tests/unit/components/RepresentativeCard.test.tsx
import { render, screen } from '@testing-library/react';
import { RepresentativeCard } from '@/components/RepresentativeCard';
import { createMockRepresentative } from '../../utils/test-helpers';

describe('RepresentativeCard', () => {
  it('should display representative information', () => {
    const mockRep = createMockRepresentative({
      name: {
        first: 'John',
        last: 'Doe',
        official_full: 'John Doe'
      },
      party: 'Democrat',
      state: 'MI'
    });

    render(<RepresentativeCard representative={mockRep} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Democrat')).toBeInTheDocument();
    expect(screen.getByText('MI')).toBeInTheDocument();
  });

  it('should handle missing contact information gracefully', () => {
    const mockRep = createMockRepresentative({
      contact: { phone: undefined, website: undefined }
    });

    render(<RepresentativeCard representative={mockRep} />);

    // Should not crash and should show fallback content
    expect(screen.getByText(mockRep.name.official_full)).toBeInTheDocument();
  });
});
```

### Integration Test Example

```typescript
// tests/integration/api/representatives.test.ts
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/representatives/route';
import { createMockRepresentative } from '../../utils/test-helpers';

// Mock external dependencies
jest.mock('@/lib/census-api');
jest.mock('@/features/representatives/services/congress.service');

describe('/api/v1/representatives', () => {
  it('should return representatives for valid ZIP code', async () => {
    const mockReps = [createMockRepresentative()];

    // Mock the service responses
    (getAllEnhancedRepresentatives as jest.Mock).mockResolvedValue(mockReps);
    (getCongressionalDistrictFromZip as jest.Mock).mockResolvedValue({
      state: 'MI',
      district: '1',
    });

    const request = new NextRequest('http://localhost:3000/api/v1/representatives?zip=48221');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.representatives).toHaveLength(1);
    expect(data.metadata.apiVersion).toBe('v1');
  });

  it('should return 400 for invalid ZIP code', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/representatives?zip=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVALID_ZIP_CODE');
  });
});
```

## 🎭 Mocking Strategies

### API Mocking

```typescript
// Mock fetch responses
mockFetch({ success: true, data: mockData });

// Mock with error
mockFetch(null, false, 500);

// Mock with custom response
mockFetch({
  success: false,
  error: { code: 'NOT_FOUND', message: 'Representative not found' },
});
```

### External Service Mocking

```typescript
// Mock external APIs
jest.mock('@/lib/census-api', () => ({
  getCongressionalDistrictFromZip: jest.fn(),
}));

// In tests
(getCongressionalDistrictFromZip as jest.Mock).mockResolvedValue({
  state: 'MI',
  district: '1',
});
```

### React Component Mocking

```typescript
// Mock complex child components
jest.mock('@/components/ComplexChart', () => {
  return function MockComplexChart({ data }: { data: any }) {
    return <div data-testid="mock-chart">Chart with {data.length} items</div>;
  };
});
```

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- representatives.service.test.ts

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Advanced Options

```bash
# Run tests matching pattern
npm test -- --testNamePattern="should fetch"

# Run tests in specific directory
npm test -- tests/unit/services

# Run tests with verbose output
npm test -- --verbose

# Run tests and update snapshots
npm test -- --updateSnapshot
```

## 📊 Coverage Requirements

### Coverage Targets

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Configuration

```json
// jest.config.js
{
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.*",
    "!src/**/index.ts"
  ],
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    }
  }
}
```

## 🎯 Testing Best Practices

### Test Structure (AAA Pattern)

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const mockData = createMockRepresentative();
  mockFetch(createMockApiResponse(mockData));

  // Act - Execute the code under test
  const result = await service.fetchRepresentative('123');

  // Assert - Verify the results
  expect(result).toEqual(mockData);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
```

### Descriptive Test Names

```typescript
// Good
it('should return empty array when no representatives found for ZIP code');
it('should throw error when API returns 500 status');
it('should format phone number with country code');

// Avoid
it('should work');
it('handles error');
it('returns data');
```

### Test Data Management

```typescript
// Use factories for consistent test data
const createTestRepresentative = (overrides = {}) => ({
  bioguideId: 'T000001',
  name: { first: 'Test', last: 'Rep', official_full: 'Test Rep' },
  ...overrides,
});

// Use fixtures for complex data
import { fixtures } from '../fixtures';
const testRep = fixtures.representatives[0];
```

### Async Testing

```typescript
// Proper async/await usage
it('should handle async operations', async () => {
  const promise = service.fetchData();
  await expect(promise).resolves.toEqual(expectedData);
});

// Error handling
it('should handle async errors', async () => {
  mockFetch(null, false, 500);
  await expect(service.fetchData()).rejects.toThrow('Server Error');
});
```

## 🔍 Debugging Tests

### Debug Output

```typescript
// Add debug output
console.log('Test data:', JSON.stringify(testData, null, 2));

// Use screen.debug() for component tests
import { screen } from '@testing-library/react';
screen.debug(); // Prints rendered DOM
```

### Running Single Tests

```bash
# Run specific test
npm test -- --testNamePattern="should fetch representatives"

# Run with debugger
node --inspect-brk node_modules/.bin/jest --runInBand --testNamePattern="your test"
```

### VS Code Integration

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## 📋 Testing Checklist

- [ ] **Unit tests** for all service methods
- [ ] **Component tests** for key UI components
- [ ] **Integration tests** for API endpoints
- [ ] **Error handling** tests for failure scenarios
- [ ] **Edge cases** covered (empty data, invalid input)
- [ ] **Mock cleanup** in beforeEach/afterEach
- [ ] **Descriptive test names** that explain intent
- [ ] **Type safety** in all test code
- [ ] **Coverage targets** met for new code
- [ ] **Documentation** updated for testing patterns

## 🚀 CI/CD Integration

Tests run automatically on:

- **Pull requests** - All tests must pass
- **Main branch commits** - Full test suite
- **Release builds** - Tests + coverage report

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --coverage --watchAll=false

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```
