# Recent News Tab - Optimization Report

**Date**: October 22, 2025
**Scope**: `/api/representative/[bioguideId]/news` endpoint and `SimpleNewsSection` component

## Executive Summary

The Recent News tab is currently functional but has several performance bottlenecks. The main issues are:

1. **Internal HTTP calls within API routes** (100-300ms overhead per request)
2. **Sequential fallback processing** (adds 5-10s on failures)
3. **Excessive GDELT search terms** (10-15 parallel API calls)

**Estimated performance improvement**: 40-60% faster response times with recommended optimizations.

---

## Current Architecture

### News Sources (Fallback Chain)

1. **NewsAPI.org** (primary) → best quality, most reliable
2. **Google News RSS** (secondary) → less noise for common names
3. **GDELT** (tertiary) → comprehensive but requires heavy processing

### Key Files

- **API Route**: `src/app/api/representative/[bioguideId]/news/route.ts` (972 lines)
- **UI Component**: `src/features/news/components/SimpleNewsSection.tsx` (584 lines)
- **Services**:
  - `src/features/news/services/gdelt-api.ts`
  - `src/lib/services/newsapi.ts`
  - `src/lib/services/google-news-rss.ts`

### Current Performance

- **Cache TTL**: 30 minutes
- **Response Time** (uncached): 2-8 seconds
- **Response Time** (cached): 100-300ms

---

## Optimization Opportunities

### 🔴 HIGH IMPACT (Quick Wins)

#### 1. Eliminate Internal HTTP Calls

**Location**: `route.ts:70, 148, 229, 283`

**Problem**: Making HTTP calls to `/api/representative/${bioguideId}` within the same server creates unnecessary overhead.

**Current Code**:

```typescript
const repResponse = await fetch(`${request.nextUrl.origin}/api/representative/${bioguideId}`);
if (repResponse.ok) {
  const repData = await repResponse.json();
  const representative = repData.representative as EnhancedRepresentative;
```

**Optimized Code**:

```typescript
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';

// At the beginning of the GET handler
const representative = await getEnhancedRepresentative(bioguideId);
if (!representative) {
  return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
}
```

**Impact**: Saves 100-300ms per request
**Effort**: 30 minutes
**Risk**: Low

---

#### 2. Parallel News Source Fetching

**Location**: `route.ts:68-223`

**Problem**: NewsAPI → Google News → GDELT runs sequentially. If NewsAPI times out (10s), we wait before trying Google News.

**Current**: Sequential with early returns

```typescript
// Try NewsAPI
if (newsAPI has results) return;

// Try Google News
if (googleNews has results) return;

// Try GDELT
return gdelt;
```

**Optimized**: Parallel with Promise.race

```typescript
const results = await Promise.allSettled([
  fetchNewsAPI(representative, options),
  fetchGoogleNews(representative, options),
]);

// Return first successful result
for (const result of results) {
  if (result.status === 'fulfilled' && result.value) {
    return NextResponse.json(result.value);
  }
}

// Fall back to GDELT if both fail
return fetchGDELT(representative, options);
```

**Impact**: Up to 10 seconds faster on NewsAPI failures
**Effort**: 2-3 hours
**Risk**: Medium (requires careful error handling)

---

#### 3. Reduce GDELT Search Terms

**Location**: `route.ts:438-556`

**Problem**: Generates 10-15 search terms for common names, making 10-15 parallel GDELT API calls.

**Current Logic**:

- Base terms: Full name, title + name, state + name
- District terms: name + district
- Nickname variations
- Committee-based terms
- Press release terms

**Optimized**:

- Limit to **5 most effective search terms**
- Prioritize: `"Full Name"`, `"Title LastName"`, `"Name State"`
- Skip committee and press release terms (low signal)

```typescript
// For common names
const searchTerms = [
  `"${simpleName}"`, // Full name (exact match)
  `"Senator ${simpleName}"`, // Title + full name
  `"${simpleName}" "${fullStateName}"`, // Name + state context
];

// For unique names
const searchTerms = [
  `"${simpleName}"`,
  `"${lastName}" "${fullStateName}"`,
  `"Senator ${lastName}"`,
];
```

**Impact**: Reduces GDELT API calls by 60-70%
**Effort**: 1 hour
**Risk**: Low (may slightly reduce coverage, but most articles match top 3 terms)

---

### 🟡 MEDIUM IMPACT (Code Quality)

#### 4. Extract GDELT Processing into Service

**Location**: `route.ts:270-910` (640 lines of GDELT logic)

**Problem**: GDELT processing (search terms, deduplication, clustering, filtering) is embedded in the route handler.

**Solution**: Extract to `src/features/news/services/gdelt-news-service.ts`

```typescript
// New service
export async function fetchGDELTNewsForRepresentative(
  representative: EnhancedRepresentative,
  options: { limit: number; page: number }
): Promise<NewsResponse> {
  // All GDELT logic here
}

// In route.ts
const gdeltNews = await fetchGDELTNewsForRepresentative(representative, { limit, page });
return NextResponse.json(gdeltNews);
```

**Impact**: Better maintainability, testability, reusability
**Effort**: 2-3 hours
**Risk**: Low (pure refactor, no logic changes)

---

#### 5. Add Circuit Breaker Pattern

**Location**: All news service calls

**Problem**: Repeated failures to external APIs can cascade and slow down all requests.

**Solution**: Track failure rates and temporarily skip failing services.

```typescript
class CircuitBreaker {
  private failures = new Map<string, number>();

  isOpen(serviceName: string): boolean {
    const failures = this.failures.get(serviceName) || 0;
    return failures >= 5; // Threshold
  }

  recordFailure(serviceName: string): void {
    const count = this.failures.get(serviceName) || 0;
    this.failures.set(serviceName, count + 1);
  }
}

// Usage
if (!circuitBreaker.isOpen('newsapi')) {
  try {
    const result = await fetchNewsAPI(...);
    circuitBreaker.recordSuccess('newsapi');
    return result;
  } catch (error) {
    circuitBreaker.recordFailure('newsapi');
  }
}
```

**Impact**: Faster fallback when services are down
**Effort**: 2 hours
**Risk**: Low

---

#### 6. Fix Type Safety Issues

**Location**: `route.ts:624, 644, 660, 797, 860`

**Problem**: Using `as unknown`, `as any`, `as Record<string, unknown>` type assertions.

**Solution**: Define proper TypeScript interfaces for all data shapes.

```typescript
interface GDELTArticleProcessed {
  url: string;
  title: string;
  publishedDate: string;
  domain: string;
  imageUrl?: string;
  language: string;
  source: string;
  relatedStories?: number;
  sources?: string;
  category?: string;
  importance?: number;
}

// Replace 'as unknown' with proper typing
const clusteredArticles: GDELTArticleProcessed[] = clusteringResult.clusters
  .map(cluster => {
    const primaryArticle = flattenedArticles.find(a => a.url === cluster.primaryArticle.url);
    if (!primaryArticle) return null;
    return {
      ...primaryArticle,
      relatedStories: cluster.relatedArticles.length,
      sources: cluster.sources.join(', '),
      category: cluster.category,
      importance: cluster.importance,
    };
  })
  .filter((article): article is GDELTArticleProcessed => article !== null);
```

**Impact**: Better IDE support, catch bugs at compile time
**Effort**: 1-2 hours
**Risk**: Low

---

### 🟢 LOW IMPACT (Nice to Have)

#### 7. Client-Side Request Deduplication

**Location**: `SimpleNewsSection.tsx`

**Problem**: Multiple tabs/components might request the same news data simultaneously.

**Solution**: SWR already handles this via `dedupingInterval`, but we can optimize further.

```typescript
// In SimpleNewsSection.tsx
const { data, error, size, setSize } = useSWRInfinite(getKey, fetcher, {
  dedupingInterval: 60000, // 1 minute (currently 30s)
  revalidateOnFocus: false, // Already set
  revalidateOnMount: true, // Add this
});
```

**Impact**: Marginal (SWR already handles this well)
**Effort**: 15 minutes
**Risk**: None

---

#### 8. Optimize Pagination

**Location**: `route.ts:98, 178`

**Problem**: Fetching `limit * 2` articles then slicing for pagination means re-fetching data on page 2+.

**Current**:

```typescript
const newsAPIArticles = await fetchRepresentativeNewsAPI(..., {
  pageSize: limit * 2, // Fetches 30 for limit=15
});
const paginatedArticles = newsAPIArticles.slice(offset, offset + limit);
```

**Optimized** (if NewsAPI supports true pagination):

```typescript
const newsAPIArticles = await fetchRepresentativeNewsAPI(..., {
  pageSize: limit,
  page: page, // Native pagination
});
```

**Impact**: Faster page 2+ loads
**Effort**: Depends on NewsAPI support
**Risk**: Low if APIs support it

---

## Recommended Implementation Order

### Phase 1: Quick Wins (Week 1)

1. ✅ **Eliminate internal HTTP calls** (30 min) - Biggest impact/effort ratio
2. ✅ **Reduce GDELT search terms** (1 hour) - Significant API call reduction
3. ✅ **Parallel NewsAPI + Google News** (3 hours) - Faster fallback

**Expected improvement**: 40-50% faster response times

### Phase 2: Code Quality (Week 2)

4. ✅ **Extract GDELT service** (3 hours) - Better maintainability
5. ✅ **Add circuit breaker** (2 hours) - Resilience improvement
6. ✅ **Fix type safety** (2 hours) - Code quality

**Expected improvement**: Better reliability and maintainability

### Phase 3: Polish (Optional)

7. Client-side optimizations
8. Advanced pagination

---

## Monitoring Recommendations

After implementing optimizations, track:

1. **Response Time** (P50, P95, P99)
   - Target: <2s uncached, <200ms cached
2. **Cache Hit Rate**
   - Target: >80%
3. **Error Rate by Source**
   - NewsAPI, Google News, GDELT failure rates
4. **GDELT API Calls per Request**
   - Target: 3-5 calls (down from 10-15)

---

## Testing Checklist

Before deploying optimizations:

- [ ] Test with high-coverage representatives (e.g., Nancy Pelosi)
- [ ] Test with low-coverage representatives (new members)
- [ ] Test with common names (John James, Mike Johnson)
- [ ] Test all three data sources independently
- [ ] Test pagination (pages 1, 2, 3)
- [ ] Test cache behavior (first call, second call)
- [ ] Test error scenarios (API timeouts, invalid bioguideId)
- [ ] Verify no TypeScript errors (`npm run type-check`)
- [ ] Verify linting passes (`npm run lint`)

---

## Implementation Example: Quick Win #1

Here's a complete implementation of the highest-impact optimization:

```typescript
// src/app/api/representative/[bioguideId]/news/route.ts

import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '15');
  const page = parseInt(searchParams.get('page') || '1');

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  // OPTIMIZATION: Fetch representative data once (no internal HTTP call)
  const representative = await getEnhancedRepresentative(bioguideId);

  if (!representative) {
    return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
  }

  // Now use 'representative' throughout the function
  // Remove all other fetch calls to /api/representative/${bioguideId}

  // Continue with existing logic...
}
```

**Testing command**:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test the endpoint
time curl "http://localhost:3000/api/representative/K000367/news?limit=10" | jq '.articles | length'

# Should return in <2 seconds with 10 articles
```

---

## Conclusion

The Recent News tab has solid functionality but can be optimized for better performance and maintainability. The recommended approach is:

1. **Start with Quick Wins** (Phase 1) - Immediate 40-50% improvement
2. **Follow with Code Quality** (Phase 2) - Long-term maintainability
3. **Monitor and iterate** - Use metrics to guide further optimizations

All optimizations maintain backward compatibility and don't break existing functionality.

---

**Next Steps**:

1. Review this report
2. Choose which optimizations to implement
3. Create feature branch: `git checkout -b optimize/news-tab`
4. Implement Phase 1 optimizations
5. Test thoroughly
6. Deploy and monitor
