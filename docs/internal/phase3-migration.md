# Phase 3 Migration Guide

**Civic Intel Hub - Service Layer & Performance Optimization**

**Migration Version**: Phase 3.6 - Performance Baseline Established  
**Last Updated**: September 8, 2025  
**Status**: Performance infrastructure ready for optimization implementation

## 🚀 Migration Overview

Phase 3 introduces a **service-oriented architecture** with **dependency injection**, **repository pattern**, and **comprehensive performance optimization**. This guide covers the migration from the current feature-based architecture to the new service layer architecture.

### Migration Goals

- ✅ **Established Performance Baseline** - API response times and bundle metrics documented
- 🎯 **Service Layer Redesign** - Repository pattern and dependency injection
- 🎯 **Business Logic Extraction** - Pure functions and use cases
- 🎯 **Performance Optimization** - Multi-level caching and bundle optimization
- 🎯 **Comprehensive Testing** - >90% test coverage target

## 📊 Current State Analysis

### Performance Baseline (September 8, 2025)

| Metric                     | Current Value | Target | Priority    |
| -------------------------- | ------------- | ------ | ----------- |
| **Districts API Response** | 3,863.86ms    | <200ms | 🔴 Critical |
| **API Success Rate**       | 33.3%         | >95%   | 🔴 Critical |
| **Bundle Size**            | 476MB         | <350MB | 🟡 Medium   |
| **Test Coverage**          | Unknown       | >90%   | 🔴 Critical |
| **Cache Hit Rate**         | ~0%           | >70%   | 🟡 Medium   |

### Available Performance Tools

```bash
# Quick API baseline measurement
npm run test:performance:quick

# Comprehensive performance suite (includes bundle analysis)
npm run test:performance

# Multi-threaded load testing
npm run test:load

# Custom load test parameters
npm run test:load -- --concurrency 10 --duration 30000
```

## 🏗️ Service Usage Migration

### Before (Current Pattern)

```typescript
// Direct service usage in API routes
import { enhancedCongressDataService } from '@/services/congress/enhanced-congress-data-service';

export async function GET(request: Request) {
  const data = await enhancedCongressDataService.getRepresentativeWithEnhancedData(id);
  return Response.json(data);
}
```

### After (Phase 3 Pattern)

```typescript
// Dependency injection pattern
import { container } from '@/lib/container';

export async function GET(request: Request) {
  const useCase = container.resolve<GetRepresentativeUseCase>('getRepresentativeUseCase');
  const data = await useCase.execute(id);
  return Response.json(data);
}
```

### Service Container Setup

```typescript
// lib/container.ts
import { ServiceContainer } from '@/lib/service-container';
import { CongressRepository } from '@/repositories/congress-repository';
import { GetRepresentativeUseCase } from '@/use-cases/get-representative';

export const container = new ServiceContainer();

// Repository registration
container.register(
  'congressRepository',
  () => new CachedRepository(new CongressRepository(), container.resolve('cacheService'))
);

// Use case registration
container.register(
  'getRepresentativeUseCase',
  () => new GetRepresentativeUseCase(container.resolve('congressRepository'))
);
```

## 🗄️ Repository Pattern Migration

### Current Data Access Pattern

```typescript
// Direct API calls mixed with business logic
async function getRepresentative(id: string) {
  const response = await fetch(`${CONGRESS_API_URL}/member/${id}`);
  const data = await response.json();

  // Business logic mixed with data access
  if (data.member.terms?.length > 0) {
    data.member.currentTerm = data.member.terms[data.member.terms.length - 1];
  }

  return data;
}
```

### New Repository Pattern

```typescript
// Repository interface
interface IRepresentativeRepository {
  getById(id: string): Promise<Representative>;
  getByZip(zipCode: string): Promise<Representative[]>;
  getByState(state: string): Promise<Representative[]>;
}

// Concrete implementation
class CongressApiRepository implements IRepresentativeRepository {
  async getById(id: string): Promise<Representative> {
    const response = await fetch(`${this.baseUrl}/member/${id}`);
    return this.parseResponse(await response.json());
  }

  private parseResponse(data: any): Representative {
    // Pure data transformation
    return {
      bioguideId: data.member.bioguideId,
      name: `${data.member.firstName} ${data.member.lastName}`,
      // ... other mappings
    };
  }
}

// Caching wrapper
class CachedRepository implements IRepresentativeRepository {
  constructor(
    private baseRepo: IRepresentativeRepository,
    private cache: CacheService
  ) {}

  async getById(id: string): Promise<Representative> {
    const cached = await this.cache.get(`rep:${id}`);
    if (cached) return cached;

    const data = await this.baseRepo.getById(id);
    await this.cache.set(`rep:${id}`, data, 3600); // 1 hour TTL

    return data;
  }
}
```

## 🧠 Business Logic Extraction

### Current Mixed Pattern

```typescript
// Business logic mixed in API route
export async function GET(request: Request) {
  const representative = await getRepresentative(id);

  // Business logic in API layer
  const currentTerm = representative.terms?.find(term => new Date(term.endDate) > new Date());

  const isCurrentMember = !!currentTerm;
  const chamber = currentTerm?.chamber || 'unknown';

  return Response.json({
    ...representative,
    currentTerm,
    isCurrentMember,
    chamber,
  });
}
```

### New Use Case Pattern

```typescript
// Pure business logic in use case
export class GetRepresentativeUseCase {
  constructor(private repo: IRepresentativeRepository) {}

  async execute(bioguideId: string): Promise<EnhancedRepresentative> {
    const representative = await this.repo.getById(bioguideId);
    return this.enhanceWithBusinessLogic(representative);
  }

  private enhanceWithBusinessLogic(rep: Representative): EnhancedRepresentative {
    // Pure function - no side effects
    const currentTerm = this.getCurrentTerm(rep.terms);

    return {
      ...rep,
      currentTerm,
      isCurrentMember: !!currentTerm,
      chamber: currentTerm?.chamber || 'unknown',
      yearsInCongress: this.calculateYearsInCongress(rep.terms),
      partyHistory: this.buildPartyHistory(rep.terms),
    };
  }

  private getCurrentTerm(terms: Term[]): Term | null {
    // Pure business logic
    return terms.find(term => new Date(term.endDate) > new Date()) || null;
  }

  private calculateYearsInCongress(terms: Term[]): number {
    // Pure calculation
    return terms.reduce((years, term) => {
      const termYears = Math.ceil(
        (new Date(term.endDate).getTime() - new Date(term.startDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365)
      );
      return years + termYears;
    }, 0);
  }
}

// Clean API route
export async function GET(request: Request) {
  const useCase = container.resolve<GetRepresentativeUseCase>('getRepresentativeUseCase');
  const data = await useCase.execute(id);
  return Response.json(data);
}
```

## 💾 Caching Strategy Migration

### Current Caching (Limited)

```typescript
// File-based cache for static data
const fileCache = {
  async get(key: string) {
    try {
      const data = fs.readFileSync(`data/cache/${key}.json`, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
};
```

### New Multi-Level Caching

```typescript
// Comprehensive caching service
class CacheService {
  constructor(
    private memoryCache: MemoryCache,
    private fileCache: FileCache,
    private redisCache?: RedisCache
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Level 1: Memory (fastest)
    let result = this.memoryCache.get<T>(key);
    if (result) {
      this.recordCacheHit(key, 'memory');
      return result;
    }

    // Level 2: File system (fast)
    result = await this.fileCache.get<T>(key);
    if (result) {
      this.memoryCache.set(key, result, 300); // 5 min in memory
      this.recordCacheHit(key, 'file');
      return result;
    }

    // Level 3: Redis (if available)
    if (this.redisCache) {
      result = await this.redisCache.get<T>(key);
      if (result) {
        this.memoryCache.set(key, result, 300);
        this.recordCacheHit(key, 'redis');
        return result;
      }
    }

    this.recordCacheHit(key, 'miss');
    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Set at all levels
    this.memoryCache.set(key, value, Math.min(ttl, 3600)); // Max 1h in memory
    await this.fileCache.set(key, value, ttl);

    if (this.redisCache) {
      await this.redisCache.set(key, value, ttl);
    }
  }

  private recordCacheHit(key: string, level: string) {
    // Track cache performance for monitoring
    metricsService.recordCacheHit(key, level);
  }
}
```

### Cache Key Conventions

```typescript
// Standardized cache key patterns
export const cacheKeys = {
  // Representatives
  representative: (id: string) => `rep:${id}:v2`,
  representativeBills: (id: string, page: number) => `rep:${id}:bills:${page}:v2`,
  representativeVotes: (id: string, limit: number) => `rep:${id}:votes:${limit}:v2`,

  // Districts
  districtsByZip: (zip: string) => `districts:zip:${zip}:v2`,
  districtInfo: (id: string) => `district:${id}:v2`,

  // Static data
  congressLegislators: () => `congress:legislators:current:v2`,
  committees: () => `congress:committees:current:v2`,

  // API responses
  apiResponse: (endpoint: string, params: string) => `api:${endpoint}:${params}:v2`,
};

// Usage example
const key = cacheKeys.representative('K000367');
const cached = await cacheService.get<Representative>(key);
```

## 🚀 Performance Optimization Migration

### Bundle Size Optimization

#### Before Migration

- **Total Size**: 476MB
- **Optimization**: Limited
- **Code Splitting**: Basic

#### After Migration (Target)

```typescript
// Dynamic imports for features
const RepresentativeFeature = lazy(() =>
  import('@/features/representatives').then(module => ({
    default: module.RepresentativeFeature
  }))
);

const LegislationFeature = lazy(() =>
  import('@/features/legislation').then(module => ({
    default: module.LegislationFeature
  }))
);

// Route-based code splitting
const routes = [
  {
    path: '/representative/:id',
    component: lazy(() => import('@/pages/RepresentativePage'))
  },
  {
    path: '/bills',
    component: lazy(() => import('@/pages/BillsPage'))
  }
];

// Bundle analysis
npm run analyze  // Analyze bundle size
```

### API Performance Optimization

#### Response Time Targets

```typescript
// Performance middleware for all API routes
export function withPerformanceOptimization(handler: Function) {
  return async (req: Request) => {
    const start = performance.now();

    try {
      // Add compression
      const response = await handler(req);
      const compressed = await compressResponse(response);

      // Add performance headers
      const duration = performance.now() - start;
      compressed.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
      compressed.headers.set('X-Cache-Status', getCacheStatus(req.url));

      // Log performance
      logger.info('API Performance', {
        endpoint: req.url,
        duration,
        cacheStatus: getCacheStatus(req.url),
      });

      return compressed;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error('API Error', {
        endpoint: req.url,
        duration,
        error: error.message,
      });
      throw error;
    }
  };
}

// Target performance metrics
const PERFORMANCE_TARGETS = {
  maxResponseTime: 200, // ms
  maxBundleSize: 350 * 1024 * 1024, // 350MB
  minCacheHitRate: 0.7, // 70%
  maxErrorRate: 0.05, // 5%
};
```

## 🧪 Testing Migration

### Current Testing State

- **Coverage**: Unknown (needs measurement)
- **Types**: Unit tests exist
- **Integration**: Limited
- **E2E**: Playwright setup available

### New Testing Strategy

```typescript
// Unit tests for use cases
describe('GetRepresentativeUseCase', () => {
  let useCase: GetRepresentativeUseCase;
  let mockRepo: jest.Mocked<IRepresentativeRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    useCase = new GetRepresentativeUseCase(mockRepo);
  });

  it('should enhance representative with business logic', async () => {
    // Arrange
    const rawRep = createTestRepresentative();
    mockRepo.getById.mockResolvedValue(rawRep);

    // Act
    const result = await useCase.execute('K000367');

    // Assert
    expect(result.isCurrentMember).toBe(true);
    expect(result.yearsInCongress).toBeGreaterThan(0);
    expect(result.currentTerm).toBeDefined();
  });
});

// Integration tests for repositories
describe('CongressApiRepository', () => {
  it('should fetch and parse representative data', async () => {
    const repo = new CongressApiRepository();
    const result = await repo.getById('K000367');

    expect(result.bioguideId).toBe('K000367');
    expect(result.name).toMatch(/Amy Klobuchar/);
  });
});

// Performance tests
describe('API Performance', () => {
  it('should respond within target time', async () => {
    const start = performance.now();
    const response = await fetch('/api/representative/K000367');
    const duration = performance.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200); // Target: <200ms
  });
});
```

## 🔄 Migration Steps

### Step 1: Performance Baseline ✅ COMPLETED

- [x] Set up performance testing infrastructure
- [x] Measure current API response times
- [x] Document bundle size baseline
- [x] Create load testing framework
- [x] Document performance metrics

### Step 2: Repository Pattern Implementation 🎯 NEXT

```bash
# Create repository interfaces
mkdir -p src/repositories/interfaces
touch src/repositories/interfaces/representative-repository.ts

# Implement concrete repositories
mkdir -p src/repositories/implementations
touch src/repositories/implementations/congress-api-repository.ts

# Add caching wrapper
touch src/repositories/implementations/cached-repository.ts

# Update existing services
# (Gradual migration of existing service calls)
```

### Step 3: Use Case Extraction

```bash
# Create use cases directory
mkdir -p src/use-cases/representatives
touch src/use-cases/representatives/get-representative.ts
touch src/use-cases/representatives/get-representatives-by-zip.ts

# Extract business logic from current services
# (Move pure logic to use case classes)

# Add comprehensive unit tests
mkdir -p src/use-cases/__tests__
touch src/use-cases/__tests__/get-representative.test.ts
```

### Step 4: Dependency Injection Setup

```bash
# Create service container
touch src/lib/service-container.ts
touch src/lib/container.ts

# Register services and repositories
# (Update all API routes to use container)

# Add configuration management
touch src/lib/config.ts
```

### Step 5: Performance Optimization

```bash
# Implement multi-level caching
touch src/services/cache-service.ts

# Add code splitting
# (Update components with lazy loading)

# Optimize bundle size
npm run analyze
# (Remove unused dependencies, optimize assets)

# Add performance monitoring
touch src/middleware/performance-middleware.ts
```

## 📋 Breaking Changes

### Service Interfaces (Internal)

- Service constructor signatures may change
- Cache key formats will be standardized
- Internal API response formats enhanced (public APIs unchanged)

### Development Workflow

- New dependency injection patterns required for new features
- Test patterns updated for repository mocking
- Performance tests required for API routes

### Configuration

- New environment variables for cache configuration
- Updated service container registration needed

## 🔧 Performance Tips

### 1. Repository Usage

```typescript
// DO: Use dependency injection
const useCase = container.resolve<GetRepresentativeUseCase>('getRepresentativeUseCase');

// DON'T: Direct repository instantiation
const repo = new CongressApiRepository(); // Bypasses caching and DI
```

### 2. Caching Best Practices

```typescript
// DO: Use structured cache keys
const key = cacheKeys.representative(bioguideId);

// DON'T: Manual cache key construction
const key = `rep-${bioguideId}`; // Inconsistent format
```

### 3. Business Logic Placement

```typescript
// DO: Pure functions in use cases
class GetRepresentativeUseCase {
  private enhanceWithMetadata(rep: Representative): EnhancedRepresentative {
    // Pure function - no side effects
    return { ...rep, enhanced: true };
  }
}

// DON'T: Business logic in API routes
export async function GET() {
  const rep = await getRepresentative(id);
  rep.enhanced = true; // Side effect - mutates data
  return Response.json(rep);
}
```

## 🎯 Success Criteria Checklist

### Phase 3 Completion Targets

#### ✅ Performance Infrastructure (COMPLETED)

- [x] Performance testing scripts created
- [x] Baseline metrics documented
- [x] Load testing framework ready
- [x] Bundle analysis tools available

#### 🎯 Service Layer Architecture (IN PROGRESS)

- [ ] Repository pattern implemented
- [ ] Dependency injection container working
- [ ] Use cases extracted from services
- [ ] Business logic in pure functions

#### 🎯 Performance Optimization (PENDING)

- [ ] API responses <200ms average
- [ ] Bundle size reduced by 27% (476MB → <350MB)
- [ ] Cache hit rate >70%
- [ ] Error rate <5%

#### 🎯 Testing & Quality (PENDING)

- [ ] Test coverage >90%
- [ ] All existing functionality preserved
- [ ] Performance monitoring in place
- [ ] Documentation complete

## 📊 Monitoring Migration Progress

### Available Metrics Commands

```bash
# Quick performance check
npm run test:performance:quick

# Full performance suite
npm run test:performance

# Load testing
npm run test:load -- --concurrency 10 --duration 15000

# Bundle analysis
npm run build && npm run analyze

# Test coverage
npm run test:coverage
```

### Progress Tracking

Track migration progress using the metrics in `REFACTOR_TRACKING.md`:

- **API Routes**: Currently 54 → Target: 28 (Phase 3)
- **Service Files**: Feature-organized → DI Container organized
- **Response Times**: Current baseline → <200ms target
- **Bundle Size**: 476MB → <350MB target

---

## 🚀 Next Steps

1. **Immediate**: Implement repository interfaces and concrete implementations
2. **Week 1**: Extract use cases from existing services
3. **Week 2**: Set up dependency injection container
4. **Week 3**: Implement multi-level caching
5. **Week 4**: Optimize bundle size and performance
6. **Final**: Comprehensive testing and monitoring

## 📚 Additional Resources

- [Architecture Guide](./architecture-guide.md) - Complete architecture overview
- [API Reference](./API_REFERENCE.md) - API documentation
- [Performance Testing Guide](../scripts/README.md) - Performance tools usage
- [REFACTOR_TRACKING.md](../REFACTOR_TRACKING.md) - Progress tracking

---

**Last Updated**: September 8, 2025  
**Current Phase**: 3.6 - Performance Baseline Established  
**Next Phase**: 3.7 - Service Layer Implementation
