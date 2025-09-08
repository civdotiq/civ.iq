# API Patterns and Consolidation Plan

**Phase 2 Foundation Document**  
**Status**: Step 1.5 - API Response Standardization  
**Created**: September 2025  
**Updated**: September 2025  

## Overview

This document defines the standardized API response patterns and outlines the consolidation plan to reduce the current 63 API routes to 28 core endpoints, improving maintainability, consistency, and developer experience.

## Current State Analysis

### Existing Route Count: 63 Endpoints

```bash
# Current API structure
find src/app/api -name "route.ts" | wc -l
# Result: 63 routes
```

### Response Pattern Inconsistencies

1. **Mixed Response Formats**: Some endpoints return raw data, others have success/error wrappers
2. **Inconsistent Metadata**: Varying metadata structures across endpoints
3. **Error Handling**: Different error codes and formats
4. **Caching Headers**: Inconsistent cache control implementation
5. **Validation**: Mixed validation approaches and error responses

## Standardized Response Types

Based on the new `ApiResponseTransformer` middleware at `src/lib/middleware/api-response.ts`, all APIs will use these 5 core response types:

### 1. Single Resource Response
```typescript
interface SingleResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata: ApiMetadata;
}
```
**Use Case**: Individual representative, bill, committee details

### 2. List Response
```typescript
interface ListResponse<T> {
  success: boolean;
  data?: T[];
  count: number;
  error?: ApiError;
  metadata: ApiMetadata;
}
```
**Use Case**: Simple lists without pagination (committees, simple searches)

### 3. Paginated Response
```typescript
interface PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  error?: ApiError;
  metadata: ApiMetadata;
}
```
**Use Case**: Large datasets (bills, votes, news articles)

### 4. Health Response
```typescript
interface HealthResponse {
  success: boolean;
  data?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'up' | 'down' | 'degraded'>;
    timestamp: string;
  };
  error?: ApiError;
  metadata: ApiMetadata;
}
```
**Use Case**: Health checks, service status monitoring

### 5. Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: ApiMetadata;
}
```
**Use Case**: All error conditions with standardized codes

## Consolidated API Architecture (63 → 28 Routes)

### Core Resource Endpoints (8 routes)

| New Endpoint | Consolidates | HTTP Methods | Response Type |
|-------------|-------------|--------------|---------------|
| `/api/representatives` | `/api/representatives`, `/api/representatives-v2`, `/api/representatives-simple`, `/api/v1/representatives`, `/api/representatives-multi-district` | GET | List/Paginated |
| `/api/representative/[id]` | `/api/representative/[bioguideId]`, `/api/representative/[bioguideId]/simple` | GET | Single |
| `/api/bills` | `/api/v1/bills`, `/api/bills/latest` | GET | Paginated |
| `/api/bill/[id]` | `/api/bill/[billId]`, `/api/bill/[billId]/summary` | GET | Single |
| `/api/committees` | `/api/committees` | GET | List |
| `/api/committee/[id]` | `/api/committee/[committeeId]` | GET | Single |
| `/api/districts` | `/api/v1/districts`, `/api/districts/all` | GET | List |
| `/api/district/[id]` | `/api/districts/[districtId]` | GET | Single |

### Representative Sub-resources (8 routes)

| New Endpoint | Consolidates | Current Routes | Response Type |
|-------------|-------------|----------------|---------------|
| `/api/representative/[id]/bills` | Bills endpoint | `/api/representative/[bioguideId]/bills` | Paginated |
| `/api/representative/[id]/votes` | Voting records | `/api/representative/[bioguideId]/votes`, `/api/representative/[bioguideId]/votes-simple`, `/api/representative/[bioguideId]/voting-record` | Paginated |
| `/api/representative/[id]/committees` | Committee membership | `/api/representative/[bioguideId]/committees` | List |
| `/api/representative/[id]/finance` | Campaign finance | `/api/representative/[bioguideId]/finance` | Single |
| `/api/representative/[id]/news` | News articles | `/api/representative/[bioguideId]/news` | Paginated |
| `/api/representative/[id]/district` | District info | `/api/representative/[bioguideId]/district` | Single |
| `/api/representative/[id]/analytics` | Performance metrics | `/api/representative/[bioguideId]/party-alignment`, `/api/representative/[bioguideId]/leadership`, `/api/representative/[bioguideId]/election-cycles` | Single |
| `/api/representative/[id]/batch` | Bulk data | `/api/representative/[bioguideId]/batch` | Single |

### Committee Sub-resources (3 routes)

| New Endpoint | Consolidates | Current Routes | Response Type |
|-------------|-------------|----------------|---------------|
| `/api/committee/[id]/bills` | Committee bills | `/api/committee/[committeeId]/bills` | Paginated |
| `/api/committee/[id]/reports` | Committee reports | `/api/committee/[committeeId]/reports` | Paginated |
| `/api/committee/[id]/timeline` | Committee activity | `/api/committee/[committeeId]/timeline` | Paginated |

### Specialized Endpoints (5 routes)

| New Endpoint | Consolidates | Current Routes | Response Type |
|-------------|-------------|----------------|---------------|
| `/api/search` | Universal search | `/api/search` | Paginated |
| `/api/analytics` | System analytics | `/api/analytics/voting-trends`, `/api/analytics/campaign-finance`, `/api/analytics/effectiveness` | Single |
| `/api/maps` | Geographic data | `/api/district-map`, `/api/district-boundaries/[districtId]`, `/api/district-boundaries/metadata`, `/api/districts/[districtId]/neighbors` | Single |
| `/api/votes` | Voting data | `/api/vote/[voteId]`, `/api/senate-votes/[voteNumber]` | Single |
| `/api/government` | Government levels | `/api/state-legislature/[state]`, `/api/state-representatives`, `/api/state-executives/[state]`, `/api/local-government/[location]`, `/api/state-bills/[state]` | List/Paginated |

### System Endpoints (4 routes)

| New Endpoint | Consolidates | Current Routes | Response Type |
|-------------|-------------|----------------|---------------|
| `/api/health` | Health checks | `/api/health`, `/api/admin/health`, `/api/api-health` | Health |
| `/api/cache` | Cache management | `/api/cache-status`, `/api/cache/status`, `/api/debug/clear-cache` | Single |
| `/api/batch` | Batch operations | `/api/news/batch` | List |
| `/api/system` | System utilities | `/api/warmup`, `/api/representative-photo/[id]`, `/api/agent`, `/api/compare` | Single |

## Migration Strategy

### Phase 2.1: Response Standardization (Current Step)
- ✅ **Completed**: API Response Middleware (`src/lib/middleware/api-response.ts`)
- **Next**: Update 3-5 high-traffic endpoints to use new response format
- **Validation**: Ensure backward compatibility during transition

### Phase 2.2: Route Consolidation (Weeks 2-3)
- Group similar endpoints under unified handlers
- Implement query parameter-based routing
- Add versioning headers for backward compatibility

### Phase 2.3: Deprecation (Weeks 4-5)
- Mark old endpoints with deprecation warnings
- Add `X-Deprecated` headers with migration guidance
- Update client applications to use new endpoints

### Phase 2.4: Cleanup (Week 6)
- Remove deprecated routes
- Clean up unused middleware and utilities
- Update documentation and OpenAPI specs

## Implementation Examples

### Using the New Middleware

```typescript
// Before (inconsistent)
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ 
      success: true, 
      representatives: data,
      metadata: { /* inconsistent structure */ }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// After (standardized)
import { ApiResponseTransformer, generateRequestId } from '@/lib/middleware/api-response';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    const data = await fetchData();
    return ApiResponseTransformer.list(data, 'congress-legislators', 'high', requestId)
      .toNextResponse();
  } catch (error) {
    return ApiResponseTransformer.handleError(error, 'Failed to fetch representatives', 'congress-legislators', requestId)
      .toNextResponse();
  }
}
```

### Consolidated Endpoint Example

```typescript
// New: /api/representative/[id] (handles multiple ID types)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const requestId = generateRequestId();
  
  // Handle different ID formats: bioguide, FEC, OpenSecrets
  const representative = await getRepresentativeById(id);
  
  // Include sub-resources based on query params
  const includeVotes = searchParams.get('includeVotes') === 'true';
  const includeBills = searchParams.get('includeBills') === 'true';
  
  if (includeVotes) {
    representative.recentVotes = await getRecentVotes(id);
  }
  
  if (includeBills) {
    representative.sponsoredBills = await getSponsoredBills(id);
  }
  
  return ApiResponseTransformer.success(representative, 'congress-legislators', 'high', requestId)
    .toNextResponse();
}
```

## Error Code Standardization

### Consistent Error Codes Across All Endpoints

```typescript
// Input Validation
'MISSING_PARAMETERS'     // 400 - Required parameters missing
'INVALID_ZIP_CODE'       // 400 - ZIP code format invalid
'INVALID_BIOGUIDE_ID'    // 400 - Bioguide ID format invalid
'INVALID_BILL_ID'        // 400 - Bill ID format invalid
'INVALID_COMMITTEE_ID'   // 400 - Committee ID format invalid

// Resource Not Found
'DISTRICT_NOT_FOUND'           // 404 - Congressional district not found
'REPRESENTATIVE_NOT_FOUND'     // 404 - Representative not found
'BILL_NOT_FOUND'              // 404 - Bill not found
'COMMITTEE_NOT_FOUND'         // 404 - Committee not found

// Data Availability
'NO_REPRESENTATIVES_FOUND'     // 404 - No representatives match criteria
'NO_BILLS_FOUND'              // 404 - No bills found for query
'NO_COMMITTEES_FOUND'         // 404 - No committees found

// Service Issues
'SERVICE_TEMPORARILY_UNAVAILABLE' // 503 - External service down
'SERVICE_TIMEOUT'                // 503 - External service timeout
'REPRESENTATIVES_DATA_UNAVAILABLE' // 503 - Congress data unavailable
'BILLS_DATA_UNAVAILABLE'          // 503 - Bills data unavailable
'FINANCE_DATA_UNAVAILABLE'        // 503 - FEC data unavailable
'NEWS_DATA_UNAVAILABLE'          // 503 - GDELT data unavailable

// System Errors
'CONFIGURATION_ERROR'    // 500 - API key or config issue
'UNKNOWN_ERROR'         // 500 - Unexpected error
'INTERNAL_ERROR'        // 500 - Internal server error
```

## Metadata Standardization

### Consistent Metadata Structure

```typescript
interface ApiMetadata {
  timestamp: string;           // ISO timestamp
  dataQuality: 'high' | 'medium' | 'low' | 'unavailable';
  dataSource: string;          // Source identifier
  cacheable: boolean;          // Cache control
  freshness?: string;          // Human-readable freshness
  validationScore?: number;    // 0-100 quality score
  validationStatus?: 'excellent' | 'good' | 'fair' | 'poor';
  requestId?: string;          // Request tracking
  processingTime?: number;     // Response time in ms
}
```

## Benefits of Consolidation

### Developer Experience
- **Consistent API**: Same response format across all endpoints
- **Predictable Errors**: Standardized error codes and messages
- **Better Documentation**: Cleaner OpenAPI specification
- **Type Safety**: Shared TypeScript interfaces

### Maintenance
- **Reduced Complexity**: 35 fewer route files to maintain
- **Centralized Logic**: Common patterns in shared middleware
- **Easier Testing**: Standardized test patterns
- **Simplified Deployment**: Fewer endpoints to monitor

### Performance
- **Better Caching**: Consistent cache headers and strategies
- **Reduced Bundle Size**: Less duplicate code
- **Improved Monitoring**: Standardized metrics collection
- **Circuit Breakers**: Consistent error handling patterns

## Testing Strategy

### Validation Checkpoints
1. **Backward Compatibility**: Existing clients continue working
2. **Response Format**: All endpoints use standardized format
3. **Error Handling**: Consistent error codes and messages
4. **Performance**: No regression in response times
5. **Documentation**: OpenAPI spec matches implementation

### Migration Validation Script
```bash
# Test script to validate migration
npm run test:api-migration

# Checks:
# - All old endpoints return deprecation headers
# - New endpoints match expected response format  
# - Error codes are consistent
# - Performance benchmarks pass
```

## Next Steps

### Immediate (Step 1.5)
- ✅ **Completed**: Create API response middleware
- ✅ **Completed**: Document consolidation plan
- **Next**: Update 3 high-traffic endpoints as proof of concept

### Phase 2 Implementation
1. **Week 1**: Migrate representatives endpoints (8 routes → 2 routes)
2. **Week 2**: Migrate bills and committees endpoints (12 routes → 4 routes) 
3. **Week 3**: Migrate specialized endpoints (20 routes → 8 routes)
4. **Week 4**: Migrate system endpoints (23 routes → 14 routes)
5. **Week 5**: Add deprecation warnings and client migration
6. **Week 6**: Remove deprecated routes and cleanup

### Success Metrics
- **Route Reduction**: 63 → 28 endpoints (55% reduction)
- **Response Time**: <10% performance impact during transition
- **Error Rate**: <1% increase during migration period  
- **Developer Satisfaction**: Positive feedback on API consistency

---

**Implementation Status**: ✅ Foundation Complete  
**Next**: Begin endpoint migration starting with `/api/representatives`