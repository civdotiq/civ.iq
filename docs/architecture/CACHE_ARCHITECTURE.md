# Cache Architecture

## Overview

CIV.IQ uses a three-tier caching architecture designed for optimal performance, reliability, and serverless compatibility.

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│         Application Layer                        │
│  (API Routes, Services, Components)              │
└──────────────────┬───────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────▼──────────┐  ┌─────▼────────────────────┐
│ Unified Cache     │  │  Direct Redis Access      │
│ Service           │  │  (redis-client.ts)        │
│ (High-level API)  │  │  (Low-level operations)   │
└─────────┬─────────┘  └──────────┬────────────────┘
          │                       │
          └───────────┬───────────┘
                      │
          ┌───────────▼────────────┐
          │   Redis Client Layer    │
          │   (redis-client.ts)     │
          │   - Upstash REST API    │
          │   - ioredis (fallback)  │
          │   - In-memory cache     │
          └─────────────────────────┘
```

## Core Components

### 1. Unified Cache Service (`src/services/cache/unified-cache.service.ts`)

**Purpose**: High-level caching API with intelligent TTL management

**Features**:

- Automatic TTL selection based on data type
- Dual-layer caching (Redis + in-memory fallback)
- Pattern-based cache invalidation
- Cache statistics and monitoring

**Usage**:

```typescript
import { unifiedCache, cachedFetch } from '@/services/cache/unified-cache.service';

// Simple caching with automatic TTL
const data = await cachedFetch(
  'representative:K000367',
  () => fetchRepresentativeData('K000367'),
  { dataType: 'representatives' } // Auto-selects 24h Redis / 1h memory TTL
);

// Manual cache operations
await unifiedCache.set('my-key', myData, {
  dataType: 'votes', // 15min Redis / 3min memory TTL
  source: 'congress-api',
});

const cached = await unifiedCache.get('my-key');
```

**TTL Configuration**:

- `representatives`: 24h Redis / 1h memory (static data)
- `districts`: 7d Redis / 1d memory (boundaries rarely change)
- `committees`: 12h Redis / 2h memory (membership changes periodically)
- `finance`: 4h Redis / 30min memory (quarterly/annual updates)
- `bills`: 2h Redis / 10min memory (active during sessions)
- `votes`: 15min Redis / 3min memory (frequent updates during voting)
- `news`: 15min Redis / 2min memory (breaking news)
- `search`: 5min Redis / 30s memory (user search results)

### 2. Redis Client (`src/lib/cache/redis-client.ts`)

**Purpose**: Low-level Redis operations with automatic failover

**Features**:

- Upstash REST API support (serverless-optimized)
- ioredis fallback for development
- In-memory fallback when Redis unavailable
- Build-phase detection (no Redis during build)

**Usage**:

```typescript
import { getRedisCache } from '@/lib/cache/redis-client';

const redis = getRedisCache();

// Direct Redis operations
await redis.set('key', value, 3600); // TTL in seconds
const data = await redis.get('key');
await redis.delete('key');

// Check status
const status = redis.getStatus();
console.log(status.isConnected, status.redisAvailable);
```

### 3. Simple Cache Helper (`src/lib/cache.ts`)

**Purpose**: Convenience wrapper for common caching patterns

**Features**:

- Automatic cache-or-fetch pattern
- Error handling and fallback to direct fetch
- Telemetry integration

**Usage**:

```typescript
import { cachedFetch, cache } from '@/lib/cache';

// Cache-or-fetch pattern
const data = await cachedFetch(
  'my-cache-key',
  async () => {
    // This function only runs on cache miss
    return await fetchFromExternalAPI();
  },
  3600 // TTL in seconds
);

// Direct cache access
await cache.set('key', data, 3600);
const cached = await cache.get('key');
```

## Direct Import Architecture Pattern

**IMPORTANT**: CIV.IQ uses **direct function imports** instead of HTTP calls between services.

### ❌ ANTI-PATTERN: API-to-API HTTP Calls

```typescript
// WRONG - Do NOT do this!
export async function GET(request: Request) {
  // Making HTTP call to our own API = wasteful round trip
  const response = await fetch('http://localhost:3000/api/representatives');
  const data = await response.json();
  return NextResponse.json(data);
}
```

**Problems**:

- Unnecessary network overhead
- Serialization/deserialization waste
- Harder to debug
- Potential for circular dependencies
- Connection issues in serverless

### ✅ CORRECT PATTERN: Direct Function Imports

```typescript
// CORRECT - Import and call directly
import { getEnhancedRepresentative } from '@/services/core/representatives-core.service';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Direct function call - efficient, type-safe, no network overhead
  const representative = await getEnhancedRepresentative(params.id);
  return NextResponse.json(representative);
}
```

**Benefits**:

- Zero network overhead
- Full TypeScript type safety
- Easier debugging with stack traces
- Better performance
- Serverless-friendly
- Shared cache across calls

## Service Layer Organization

```
src/
├── app/api/                          # API Routes (thin controllers)
│   └── representative/[id]/route.ts  # Calls service layer directly
│
├── services/                         # Business Logic Layer
│   ├── core/                         # Core domain services
│   │   └── representatives-core.service.ts
│   ├── external/                     # External API integrations
│   │   ├── congress.service.ts
│   │   ├── fec.service.ts
│   │   └── census.service.ts
│   └── cache/                        # Caching infrastructure
│       ├── unified-cache.service.ts
│       └── redis.service.ts (DEPRECATED)
│
└── lib/                              # Shared utilities
    ├── cache/
    │   └── redis-client.ts           # Redis client singleton
    └── cache.ts                      # Cache helpers
```

## Cache Keys Convention

Use descriptive, hierarchical cache keys:

```typescript
// Format: {domain}:{entity}:{id}:{subset?}
'representative:K000367'; // Basic representative data
'representative:K000367:votes'; // Specific subset
'representative:K000367:finance'; // Campaign finance
'district:MN-04'; // District data
'district:MN-04:boundaries'; // Specific subset
'bill:hr1234-119'; // Bill data
'committee:SSAP'; // Committee data
'search:representatives:minneapolis'; // Search results
```

## Environment Configuration

### Required Environment Variables

```bash
# Upstash Redis (Recommended for production)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Traditional Redis (Alternative)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password  # Optional
REDIS_DB=0                    # Optional, default: 0
```

### Configuration Precedence

1. **Upstash REST API** (if both URL and TOKEN set)
   - Best for serverless (Vercel, AWS Lambda)
   - HTTP-based, no persistent connections
   - Automatic failover and scaling

2. **Traditional Redis via ioredis** (if REDIS_HOST or REDIS_URL set)
   - Best for development and dedicated servers
   - Lower latency with persistent connections
   - Requires stable network connection

3. **In-memory fallback** (if no Redis configured)
   - Automatic fallback on connection errors
   - Per-instance cache (not shared across serverless functions)
   - 5-minute automatic cleanup cycle

## Cache Invalidation Strategies

### 1. Time-based (TTL)

Automatic expiration based on data volatility (see TTL configuration above).

### 2. Pattern-based

```typescript
// Invalidate all representative data
await unifiedCache.invalidatePattern('representative:');

// Invalidate specific representative's all cached data
await unifiedCache.invalidatePattern('representative:K000367');

// Invalidate all voting records
await unifiedCache.invalidatePattern(':votes');
```

### 3. Event-driven

```typescript
// After updating representative data
await unifiedCache.invalidatePattern(`representative:${bioguideId}`);

// After vote is recorded
await unifiedCache.invalidatePattern('votes:');
await unifiedCache.invalidatePattern(`:${voteId}`);
```

## Monitoring and Debugging

### Cache Statistics

```typescript
const stats = await unifiedCache.getStats();
console.log({
  redis: stats.redis.isConnected,
  totalEntries: stats.combined.totalEntries,
  redundancy: stats.combined.redundancy, // 'dual-layer' or 'fallback-only'
});
```

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health/redis
```

Response includes:

- Redis connection status
- Cache operation results (get/set/exists/delete)
- Performance metrics
- Fallback cache size
- Full cache statistics

## Performance Best Practices

1. **Use appropriate TTLs**: Balance freshness vs performance
2. **Batch operations when possible**: Use Redis pipelines
3. **Monitor cache hit rates**: Adjust TTLs based on metrics
4. **Implement graceful degradation**: Always handle cache misses
5. **Use pattern invalidation wisely**: Too broad = unnecessary cache clears
6. **Leverage serverless REST API**: Use Upstash in production
7. **Direct imports only**: Never fetch your own API routes

## Migration Guide

### From `redis.service.ts` (deprecated)

```typescript
// OLD (deprecated)
import { redisService } from '@/services/cache/redis.service';
const result = await redisService.get('key');

// NEW (recommended)
import { getRedisCache } from '@/lib/cache/redis-client';
const redis = getRedisCache();
const result = await redis.get('key');

// OR use unified cache for high-level operations
import { unifiedCache } from '@/services/cache/unified-cache.service';
const result = await unifiedCache.get('key');
```

## Common Issues and Solutions

### Issue: Cache not working in development

**Solution**: Check Redis connection:

```bash
# Test connection
redis-cli ping

# Or use health endpoint
curl http://localhost:3000/api/health/redis
```

### Issue: Cache cleared on serverless cold start

**Expected**: Each serverless function instance has its own in-memory cache
**Solution**: Use Upstash REST API for persistent caching across instances

### Issue: TypeScript errors with cache.get()

**Solution**: Specify the type parameter:

```typescript
const data = await cache.get<MyType>('key');
```

### Issue: Cache not invalidating after data update

**Solution**: Explicitly invalidate after mutations:

```typescript
await unifiedCache.invalidatePattern(`representative:${id}`);
```

## Testing

```typescript
// Mock cache in tests
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
  }),
}));
```

## See Also

- [Performance Optimization Guide](./PERFORMANCE.md)
- [Service Architecture](../service-architecture-plan.md)
- [API Reference](../API_REFERENCE.md)
