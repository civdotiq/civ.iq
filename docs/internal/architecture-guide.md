# Civic Intel Hub Architecture Guide

**Version**: Phase 3 - Service Layer & Performance Optimization  
**Last Updated**: September 8, 2025  
**Status**: Performance Baseline Established

## Overview

The Civic Intel Hub follows a **feature-based architecture** with **clean separation of concerns** across three main layers:

1. **Presentation Layer** - React components and Next.js pages
2. **Service Layer** - Business logic, data processing, and external integrations
3. **Data Layer** - API routes, caching, and external data sources

## 🏗️ Architecture Principles

### 1. Feature-Based Organization

```
src/
├── features/           # Domain-specific features
│   ├── representatives/ # Representative-related functionality
│   ├── legislation/     # Bills and voting records
│   ├── campaign-finance/ # FEC integration
│   └── districts/       # Geographic and demographic data
├── components/         # Shared UI components
├── services/          # Cross-cutting services
├── types/             # Centralized TypeScript definitions
└── lib/              # Utilities and configurations
```

### 2. Dependency Direction

- **Features** → **Services** → **Data Sources**
- **Components** → **Hooks** → **Services**
- **Services** → **Repository Pattern** → **External APIs**

### 3. Separation of Concerns

- **UI Components**: Pure presentation, no business logic
- **Custom Hooks**: State management and data fetching coordination
- **Services**: Business logic and data transformation
- **Repositories**: Data access abstraction

## 🔧 Service Layer Architecture

### Current Service Patterns

#### 1. API Service Pattern

```typescript
// Base service structure
export class BaseApiService {
  protected baseUrl: string;
  protected cache: CacheService;

  async fetch<T>(endpoint: string): Promise<T> {
    // Caching, error handling, retry logic
  }
}
```

#### 2. Enhanced Data Services

```typescript
// Example: Enhanced Congress Data Service
export const enhancedCongressDataService = {
  getRepresentativeWithEnhancedData,
  getBillsWithMetadata,
  getVotingRecordsWithContext,
};
```

#### 3. Feature-Specific Services

```typescript
// Representatives feature services
src/features/representatives/services/
├── congress.service.ts        # YAML data processing
├── enhanced-congress-data-service.ts  # Data enrichment
└── representatives.service.ts  # Core representative logic
```

### Planned Service Layer (Phase 3)

#### 1. Repository Pattern

```typescript
interface IRepresentativeRepository {
  getById(id: string): Promise<Representative>;
  getByZip(zipCode: string): Promise<Representative[]>;
  getByState(state: string): Promise<Representative[]>;
}

class CongressApiRepository implements IRepresentativeRepository {
  // Implementation with Congress.gov API
}

class CachedRepository implements IRepresentativeRepository {
  constructor(
    private base: IRepresentativeRepository,
    private cache: CacheService
  ) {}
  // Caching wrapper implementation
}
```

#### 2. Use Cases (Business Logic)

```typescript
// Pure business logic, no side effects
export class GetRepresentativeUseCase {
  constructor(private repo: IRepresentativeRepository) {}

  async execute(bioguideId: string): Promise<EnhancedRepresentative> {
    const representative = await this.repo.getById(bioguideId);
    return this.enhanceWithMetadata(representative);
  }

  private enhanceWithMetadata(rep: Representative): EnhancedRepresentative {
    // Pure transformation logic
  }
}
```

#### 3. Dependency Injection Container

```typescript
// Service container for dependency management
class ServiceContainer {
  private services = new Map();

  register<T>(key: string, factory: () => T): void {
    this.services.set(key, factory);
  }

  resolve<T>(key: string): T {
    return this.services.get(key)();
  }
}

// Usage in API routes
const container = new ServiceContainer();
container.register(
  'representativeUseCase',
  () => new GetRepresentativeUseCase(container.resolve('representativeRepo'))
);
```

## 📊 Caching Strategy

### Multi-Level Cache Architecture

#### 1. File-Based Cache (Long-term)

- **Location**: `data/cache/`
- **Use Case**: Static congress data (legislators, committees)
- **TTL**: 6-24 hours
- **Size**: ~16MB congress data

```typescript
export const fileCache = {
  async get<T>(key: string): Promise<T | null> {
    // File system cache implementation
  },
  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    // File system cache implementation
  },
};
```

#### 2. Memory Cache (Short-term)

- **Use Case**: API responses, computed results
- **TTL**: 5-60 minutes
- **Implementation**: Map-based with LRU eviction

```typescript
class MemoryCache {
  private cache = new Map();
  private maxSize = 1000;

  set(key: string, value: any, ttl: number): void {
    // Memory cache with TTL
  }

  get(key: string): any | null {
    // Memory cache retrieval
  }
}
```

#### 3. Redis Cache (Distributed)

- **Use Case**: User sessions, real-time data
- **TTL**: Variable based on data type
- **Status**: Ready for implementation

### Cache Key Strategy

```typescript
// Hierarchical cache keys
const cacheKeys = {
  representative: (id: string) => `rep:${id}`,
  representativeBills: (id: string, page: number) => `rep:${id}:bills:${page}`,
  districtsByZip: (zip: string) => `districts:zip:${zip}`,
  congressData: (type: string) => `congress:${type}:current`,
};
```

## 🚀 Performance Optimizations

### Current Performance Metrics (Baseline - Sept 8, 2025)

| Metric         | Current | Target | Status                   |
| -------------- | ------- | ------ | ------------------------ |
| Districts API  | 3,863ms | <200ms | 🔴 Needs optimization    |
| Bundle Size    | 476MB   | <350MB | 🟡 Room for improvement  |
| Cache Hit Rate | ~0%     | >70%   | 🔴 Implementation needed |
| Error Rate     | 66.7%   | <5%    | 🔴 Critical fixes needed |

### Optimization Strategies

#### 1. API Response Optimization

```typescript
// Response streaming for large datasets
export async function streamDistrictsData(limit?: number) {
  // Implement streaming response
  const stream = new ReadableStream({
    async start(controller) {
      // Stream districts in chunks
    },
  });
  return new Response(stream);
}
```

#### 2. Code Splitting

```typescript
// Dynamic imports for feature modules
const RepresentativeDetails = lazy(
  () => import('../features/representatives/components/RepresentativeDetails')
);

const BillTracker = lazy(() => import('../features/legislation/components/BillTracker'));
```

#### 3. Bundle Optimization

- **Target**: Reduce from 476MB to <350MB (27% reduction)
- **Strategies**:
  - Remove unused dependencies
  - Optimize image assets
  - Implement code splitting
  - Tree shaking optimization

#### 4. Caching Implementation

```typescript
// Multi-level caching middleware
export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  return async () => {
    // 1. Check memory cache
    let result = memoryCache.get(key);
    if (result) return result;

    // 2. Check file cache
    result = await fileCache.get(key);
    if (result) {
      memoryCache.set(key, result, options.memoryTtl);
      return result;
    }

    // 3. Fetch from source
    result = await fetcher();
    await fileCache.set(key, result, options.fileTtl);
    memoryCache.set(key, result, options.memoryTtl);

    return result;
  };
}
```

## 🧪 Testing Architecture

### Testing Pyramid

#### 1. Unit Tests (70%)

- **Target**: Pure functions, use cases, utilities
- **Framework**: Jest + Testing Library
- **Coverage Target**: >90%

```typescript
// Example unit test for use case
describe('GetRepresentativeUseCase', () => {
  it('should enhance representative with metadata', async () => {
    const mockRepo = createMockRepository();
    const useCase = new GetRepresentativeUseCase(mockRepo);

    const result = await useCase.execute('K000367');
    expect(result.enhanced).toBe(true);
  });
});
```

#### 2. Integration Tests (20%)

- **Target**: Service integration, API routes
- **Framework**: Jest + Supertest

```typescript
// API route integration test
describe('GET /api/representative/[id]', () => {
  it('should return enhanced representative data', async () => {
    const response = await request(app).get('/api/representative/K000367').expect(200);

    expect(response.body.name).toBeDefined();
    expect(response.body.enhanced).toBe(true);
  });
});
```

#### 3. E2E Tests (10%)

- **Target**: Critical user flows
- **Framework**: Playwright

```typescript
// User flow test
test('user can search and view representative', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid=zip-input]', '48221');
  await page.click('[data-testid=search-button]');
  await expect(page.locator('[data-testid=representative-card]')).toBeVisible();
});
```

### Performance Testing

#### 1. Load Testing

```bash
# Custom load testing framework
npm run test:load -- --concurrency 10 --duration 30000

# Load test scenarios
scenarios:
  - Single user journey
  - Concurrent users (10, 50, 100)
  - Sustained load (5 minutes)
  - Spike testing
```

#### 2. Performance Monitoring

```typescript
// Performance tracking middleware
export function withPerformanceTracking(handler: Function) {
  return async (req: Request, res: Response) => {
    const start = performance.now();

    try {
      const result = await handler(req, res);
      const duration = performance.now() - start;

      // Log performance metrics
      logger.info('API Performance', {
        endpoint: req.url,
        method: req.method,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error('API Error', {
        endpoint: req.url,
        method: req.method,
        duration,
        error: error.message,
      });
      throw error;
    }
  };
}
```

## 📈 Monitoring & Observability

### Current Monitoring

#### 1. Logging

- **Framework**: Custom logger with structured logging
- **Levels**: DEBUG, INFO, WARN, ERROR
- **Output**: Console (development), File (production)

```typescript
logger.info('API Request', {
  method: req.method,
  url: req.url,
  userAgent: req.headers['user-agent'],
  ip: req.ip,
  timestamp: new Date().toISOString(),
});
```

#### 2. Performance Metrics

- **Response Times**: Tracked per endpoint
- **Cache Performance**: Hit/miss ratios
- **Error Rates**: By endpoint and error type
- **Bundle Analysis**: Size tracking

### Planned Monitoring (Phase 3)

#### 1. Real-time Metrics Dashboard

```typescript
// Metrics collection service
class MetricsService {
  private metrics = new Map();

  recordApiCall(endpoint: string, duration: number, success: boolean) {
    // Record metrics for dashboard
  }

  recordCacheHit(key: string, level: 'memory' | 'file' | 'miss') {
    // Track cache performance
  }

  getMetricsSummary() {
    return {
      apiCalls: this.getApiMetrics(),
      cachePerformance: this.getCacheMetrics(),
      errorRates: this.getErrorRates(),
    };
  }
}
```

#### 2. Health Checks

```typescript
// Comprehensive health check endpoint
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      congressApi: await checkCongressApi(),
      census: await checkCensusApi(),
      fec: await checkFecApi(),
      cache: await checkCacheHealth(),
    },
    performance: {
      averageResponseTime: metricsService.getAverageResponseTime(),
      cacheHitRate: metricsService.getCacheHitRate(),
      errorRate: metricsService.getErrorRate(),
    },
  };

  const overallStatus = Object.values(health.services).every(s => s.status === 'healthy')
    ? 'healthy'
    : 'degraded';

  return Response.json({ ...health, status: overallStatus });
}
```

## 🔄 Migration Strategy

### Phase 3 Implementation Plan

#### Step 1: Repository Pattern Implementation

1. Create interface definitions
2. Implement concrete repositories
3. Add caching wrapper repositories
4. Update existing services to use repositories

#### Step 2: Use Case Extraction

1. Identify business logic in current services
2. Extract to pure functions/classes
3. Add comprehensive unit tests
4. Update service layer to use use cases

#### Step 3: Dependency Injection Setup

1. Create service container
2. Register all services and repositories
3. Update API routes to use container
4. Add configuration management

#### Step 4: Performance Optimization

1. Implement multi-level caching
2. Add code splitting and lazy loading
3. Optimize bundle size
4. Add performance monitoring

### Breaking Changes

- Service interfaces may change (will be documented)
- Cache key formats will be standardized
- Some internal API response formats may be enhanced

### Backward Compatibility

- All public API endpoints remain unchanged
- Component interfaces remain stable
- User-facing functionality unchanged

## 🎯 Success Criteria

### Performance Targets

- ✅ **API Response Times**: <200ms average (currently 3,863ms for Districts API)
- ✅ **Bundle Size Reduction**: 27% reduction (476MB → <350MB)
- ✅ **Cache Hit Rate**: >70% for repeated requests
- ✅ **Error Rate**: <5% (currently 66.7%)
- ✅ **Test Coverage**: >90% (current baseline needed)

### Architecture Quality

- ✅ **Service Decoupling**: Clear separation of concerns
- ✅ **Dependency Injection**: Proper IoC implementation
- ✅ **Business Logic Purity**: No side effects in use cases
- ✅ **Caching Strategy**: Multi-level implementation
- ✅ **Monitoring**: Real-time performance tracking

## 📚 Additional Resources

- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Feature Architecture Guide](./feature-architecture.md) - Feature-specific patterns
- [Phase 3 Migration Guide](./phase3-migration.md) - Detailed migration instructions
- [Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION.md) - Performance best practices
- [Testing Guide](./TESTING-GUIDE.md) - Comprehensive testing strategies

---

**Next Steps**:

1. Complete service layer implementation
2. Implement multi-level caching
3. Add comprehensive monitoring
4. Achieve performance targets
5. Deploy with real-time metrics

**Last Updated**: September 8, 2025  
**Phase**: 3.6 - Performance Baseline Established
