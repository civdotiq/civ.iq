# Service Layer Architecture Redesign

## Executive Summary

Phase 3 of the civic-intel-hub modernization focuses on consolidating the fragmented service layer into a clean, testable, and performant architecture. This plan addresses critical issues identified in the current 22-service sprawl and establishes a foundation for sub-200ms API response times.

## Current Problems Analysis

### Service Fragmentation (22 Files)

**Current Service Distribution:**

```
src/services/ (14 files)
├── ai/ - summarization.service.ts
├── api/ - base.service.ts, representatives.service.ts, unified-representatives.service.ts, news.service.ts
├── base/ - unified-base.service.ts
├── batch/ - representative-batch.service.ts, unified-representative-batch.service.ts
├── cache/ - redis.service.ts
├── congress/ - optimized-congress.service.ts, unified-optimized-congress.service.ts
├── interfaces/ - unified-service-interfaces.ts
├── district-lookup.ts
└── index.ts

src/features/representatives/services/ (11 files)
├── batch-voting-service.ts
├── congress-api.ts
├── congress-rollcall-api.ts
├── congress.service.ts
├── enhanced-congress-data-service.ts
├── enhanced-photo-service.ts
├── representative-photos.ts
├── unified-congress.service.ts
├── unified-enhanced-congress-data.service.ts
└── voting-data-service.ts

src/lib/fec/fec-api-service.ts (1 file)
```

### Critical Issues Identified

#### 1. **Multiple Overlapping Services**

- **5 Different Representative Services**: `representatives.service.ts`, `unified-representatives.service.ts`, `congress.service.ts`, `unified-congress.service.ts`, `enhanced-congress-data-service.ts`
- **3 Different Base Classes**: `BaseService`, `BaseUnifiedService`, and standalone classes
- **2 Batch Services**: `representative-batch.service.ts`, `unified-representative-batch.service.ts`

#### 2. **Architectural Inconsistencies**

- **Mixed Patterns**: Some services use dependency injection, others don't
- **Scattered Caching**: Each service handles caching differently
- **Inconsistent Error Handling**: Different error response formats
- **Type Confusion**: Multiple interface definitions for the same entities

#### 3. **Performance Issues**

- **No Connection Pooling**: Each service creates its own HTTP clients
- **Cache Duplication**: Same data cached in multiple places
- **No Request Deduplication**: Concurrent requests to same endpoint
- **Large Bundle Size**: Unnecessary service code shipped to client

#### 4. **Maintenance Burden**

- **Code Duplication**: Similar logic repeated across services
- **Testing Complexity**: 22 different service patterns to test
- **Debugging Difficulty**: Error traces span multiple service files
- **Refactoring Risk**: Changes require updates across many files

## Target Architecture

### Design Principles

1. **Single Responsibility**: Each service has one clear purpose
2. **Dependency Injection**: All dependencies injected, not constructed
3. **Interface Segregation**: Small, focused interfaces
4. **Pure Business Logic**: Core logic as testable pure functions
5. **Performance First**: Sub-200ms API response times

### New Directory Structure

```
src/core/
├── services/              # Service interfaces & implementations
│   ├── interfaces/        # Service contracts
│   │   ├── IRepresentativeService.ts
│   │   ├── IVotingService.ts
│   │   ├── IFinanceService.ts
│   │   ├── INewsService.ts
│   │   ├── ICacheService.ts
│   │   └── IHttpClient.ts
│   ├── implementations/   # Concrete implementations
│   │   ├── RepresentativeService.ts
│   │   ├── VotingService.ts
│   │   ├── FinanceService.ts
│   │   ├── NewsService.ts
│   │   ├── RedisCacheService.ts
│   │   ├── MemoryCacheService.ts
│   │   └── HttpClient.ts
│   └── container.ts      # Dependency injection container
├── repositories/         # Data access layer
│   ├── RepresentativeRepository.ts
│   ├── VotingRepository.ts
│   ├── FinanceRepository.ts
│   ├── NewsRepository.ts
│   └── CacheRepository.ts
├── use-cases/           # Business logic (pure functions)
│   ├── representatives/
│   │   ├── enhanceRepresentativeData.ts
│   │   ├── calculateApprovalRating.ts
│   │   ├── determineKeyVotes.ts
│   │   └── analyzeVotingPattern.ts
│   ├── finance/
│   │   ├── calculateTotalContributions.ts
│   │   ├── identifyTopDonors.ts
│   │   └── analyzeFundingSources.ts
│   └── shared/
│       ├── validateBioguideId.ts
│       ├── formatCurrency.ts
│       └── calculatePercentage.ts
├── adapters/            # External API adapters
│   ├── CongressApiAdapter.ts
│   ├── FecApiAdapter.ts
│   ├── GdeltApiAdapter.ts
│   └── WikidataApiAdapter.ts
├── cache/              # Caching strategy
│   ├── CacheManager.ts
│   ├── RedisCache.ts
│   ├── MemoryCache.ts
│   └── CacheStrategies.ts
└── validators/         # Input validation
    ├── RepresentativeValidator.ts
    ├── QueryValidator.ts
    └── CommonValidators.ts
```

### Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Routes    │    │   Components    │    │     Hooks       │
│  /api/rep/[id]  │    │ RepProfile.tsx  │    │ useRepresentative│
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Container                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │   Rep Service │ │ Voting Svc   │ │ Finance Svc  │             │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repository Layer                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  Rep Repo    │ │ Voting Repo  │ │ Finance Repo │             │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘             │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External APIs                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Congress API │ │ Senate.gov   │ │    FEC API   │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Service Interfaces

#### Core Service Interface

```typescript
// src/core/services/interfaces/IRepresentativeService.ts
export interface IRepresentativeService {
  getById(bioguideId: string): Promise<ServiceResult<Representative>>;
  getByIds(bioguideIds: string[]): Promise<ServiceResult<Representative[]>>;
  getByZip(zipCode: string): Promise<ServiceResult<Representative[]>>;
  search(query: string, filters?: SearchFilters): Promise<ServiceResult<Representative[]>>;
}

export interface ServiceResult<T> {
  data: T | null;
  success: boolean;
  error?: ServiceError;
  metadata: {
    timestamp: string;
    processingTimeMs: number;
    cacheHit: boolean;
    dataSource: string;
  };
}
```

#### Dependency Injection Container

```typescript
// src/core/services/container.ts
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<string, any>();

  static getInstance(): ServiceContainer {
    if (!this.instance) {
      this.instance = new ServiceContainer();
    }
    return this.instance;
  }

  register<T>(name: string, implementation: T): void {
    this.services.set(name, implementation);
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not registered`);
    }
    return service as T;
  }
}

// Usage in API routes
export function getRepresentativeService(): IRepresentativeService {
  return container.resolve<IRepresentativeService>('representativeService');
}
```

## Performance Optimizations

### 1. **Connection Pooling**

```typescript
// src/core/adapters/HttpClient.ts
class HttpClient implements IHttpClient {
  private agent: https.Agent;

  constructor() {
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
    });
  }
}
```

### 2. **Request Deduplication**

```typescript
// src/core/cache/RequestDeduplicator.ts
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = fetcher();
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
}
```

### 3. **Multi-Level Caching**

```typescript
// src/core/cache/CacheManager.ts
class CacheManager implements ICacheService {
  constructor(
    private l1Cache: MemoryCache, // 100ms TTL
    private l2Cache: RedisCache // 1 hour TTL
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Try L1 first
    let value = await this.l1Cache.get<T>(key);
    if (value) return value;

    // Try L2
    value = await this.l2Cache.get<T>(key);
    if (value) {
      // Backfill L1
      await this.l1Cache.set(key, value, 100);
      return value;
    }

    return null;
  }
}
```

### 4. **Batch Processing**

```typescript
// src/core/use-cases/representatives/batchEnhanceRepresentatives.ts
export async function batchEnhanceRepresentatives(
  bioguideIds: string[],
  services: {
    representativeRepo: IRepresentativeRepository;
    votingRepo: IVotingRepository;
    financeRepo: IFinanceRepository;
  }
): Promise<EnhancedRepresentative[]> {
  // Process in parallel batches of 10
  const batches = chunk(bioguideIds, 10);
  const results = await Promise.all(
    batches.map(batch =>
      Promise.all([
        services.representativeRepo.getByIds(batch),
        services.votingRepo.getByRepresentativeIds(batch),
        services.financeRepo.getByRepresentativeIds(batch),
      ])
    )
  );

  return mergeRepresentativeData(results);
}
```

## Migration Strategy

### Phase 3.1: Foundation (Week 1)

**Goal**: Establish new architecture without breaking existing functionality

#### Tasks:

1. **Create Core Infrastructure**
   - [ ] Set up `src/core/` directory structure
   - [ ] Implement `ServiceContainer` with dependency injection
   - [ ] Create base interfaces (`IRepresentativeService`, `ICacheService`)
   - [ ] Build `HttpClient` with connection pooling

2. **Implement Repository Layer**
   - [ ] Create `RepresentativeRepository` as first repository
   - [ ] Implement basic CRUD operations
   - [ ] Add comprehensive error handling
   - [ ] Include performance logging

3. **Build Caching Layer**
   - [ ] Implement `CacheManager` with L1/L2 strategy
   - [ ] Create `MemoryCache` and `RedisCache` implementations
   - [ ] Add request deduplication
   - [ ] Include cache hit/miss metrics

#### Validation Checkpoints:

```bash
# After each component
npm run type-check
npm test src/core/
curl localhost:3000/api/health

# Performance baseline
time curl localhost:3000/api/representative/K000367
```

### Phase 3.2: Service Consolidation (Week 2)

**Goal**: Migrate one domain (representatives) to new architecture

#### Tasks:

1. **Consolidate Representative Services**
   - [ ] Create unified `RepresentativeService` implementation
   - [ ] Migrate data from 5 existing services to 1 new service
   - [ ] Preserve all existing functionality
   - [ ] Add comprehensive unit tests

2. **Extract Business Logic**
   - [ ] Move calculations to `src/core/use-cases/representatives/`
   - [ ] Create pure functions for approval ratings, voting analysis
   - [ ] Add comprehensive test coverage (aim for 90%+)
   - [ ] Performance test each use case

3. **API Route Migration**
   - [ ] Update `/api/representative/[id]` to use new service
   - [ ] Maintain backward compatibility
   - [ ] Add performance monitoring
   - [ ] Include error tracking

#### Success Criteria:

- [ ] All existing API tests pass
- [ ] Response times under 200ms (target: 100ms)
- [ ] Zero breaking changes to frontend components
- [ ] 90%+ test coverage on new code

### Phase 3.3: Full Domain Migration (Week 3)

**Goal**: Migrate all remaining services to new architecture

#### Tasks:

1. **Voting Service Migration**
   - [ ] Consolidate `batch-voting-service.ts` and `voting-data-service.ts`
   - [ ] Extract voting analysis logic to use cases
   - [ ] Optimize Senate XML parsing performance
   - [ ] Add comprehensive caching strategy

2. **Finance Service Migration**
   - [ ] Migrate `fec-api-service.ts` to new architecture
   - [ ] Extract financial analysis to pure functions
   - [ ] Implement contribution aggregation logic
   - [ ] Add FEC rate limiting compliance

3. **News Service Migration**
   - [ ] Migrate `news.service.ts` to new architecture
   - [ ] Optimize GDELT API integration
   - [ ] Add news relevance scoring logic
   - [ ] Implement smart caching for news data

#### Validation:

```bash
# Full system test
npm run test:integration
npm run build
npm run validate:performance

# Load test
ab -n 100 -c 10 localhost:3000/api/representative/K000367
```

### Phase 3.4: Performance Optimization (Week 4)

**Goal**: Achieve sub-200ms API response times and reduce bundle size

#### Tasks:

1. **Performance Tuning**
   - [ ] Implement connection pooling across all services
   - [ ] Add request batching where applicable
   - [ ] Optimize cache hit ratios (target: >80%)
   - [ ] Minimize API payload sizes

2. **Bundle Optimization**
   - [ ] Remove unused service code
   - [ ] Implement code splitting for services
   - [ ] Tree-shake unused dependencies
   - [ ] Optimize TypeScript compilation

3. **Monitoring & Observability**
   - [ ] Add performance metrics collection
   - [ ] Implement service health checks
   - [ ] Create performance dashboards
   - [ ] Set up alerting for performance regression

#### Success Metrics:

- [ ] API response times: <200ms (95th percentile)
- [ ] Bundle size reduction: 35%+ smaller
- [ ] Cache hit ratio: >80%
- [ ] Test coverage: >90%

### Phase 3.5: Legacy Cleanup (Week 5)

**Goal**: Remove old service files and finalize migration

#### Tasks:

1. **Legacy Service Removal**
   - [ ] Archive old service files to `src/legacy/`
   - [ ] Update all imports to use new services
   - [ ] Remove unused dependencies
   - [ ] Clean up test files

2. **Documentation Update**
   - [ ] Update API documentation
   - [ ] Create service architecture guides
   - [ ] Document migration patterns
   - [ ] Add performance tuning guides

3. **Final Validation**
   - [ ] Full regression test suite
   - [ ] Performance benchmark comparison
   - [ ] Security audit of new architecture
   - [ ] Load testing under realistic conditions

## Success Criteria

### Quantitative Metrics

- [ ] **Response Time**: 95th percentile under 200ms
- [ ] **Bundle Size**: 35% reduction from current size
- [ ] **Service Count**: 22 services → 8 services (64% reduction)
- [ ] **Test Coverage**: >90% on all new service code
- [ ] **Cache Hit Ratio**: >80% for frequently accessed data

### Qualitative Improvements

- [ ] **Maintainability**: Single pattern for all services
- [ ] **Testability**: Pure functions with dependency injection
- [ ] **Debuggability**: Clear error traces and performance metrics
- [ ] **Extensibility**: Easy to add new government data sources
- [ ] **Documentation**: Comprehensive guides for service patterns

## Risk Mitigation

### Technical Risks

1. **Breaking Changes**: Maintain backward compatibility during migration
2. **Performance Regression**: Continuous benchmarking during development
3. **Data Loss**: Comprehensive test coverage on data transformations
4. **Cache Issues**: Gradual cache implementation with fallback strategies

### Mitigation Strategies

- **Feature Flags**: Gradual rollout of new services
- **Blue/Green Deployment**: Easy rollback if issues arise
- **Comprehensive Testing**: Unit, integration, and performance tests
- **Monitoring**: Real-time performance and error tracking

## Timeline Summary

```
Week 1: Foundation & Infrastructure
Week 2: Representative Service Migration
Week 3: All Domain Service Migration
Week 4: Performance Optimization
Week 5: Legacy Cleanup & Documentation

Total Duration: 5 weeks
Key Milestones: Foundation (Week 1), First Migration (Week 2), Full Migration (Week 3)
```

---

**Next Action**: Begin Phase 3.1 Foundation implementation starting with the Service Container and base interfaces.
