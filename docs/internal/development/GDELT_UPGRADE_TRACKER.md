# GDELT Upgrade Tracker for civic-intel-hub

## Current State Analysis

Based on review of the codebase (December 2024):

### Existing GDELT Integration

- ✅ Basic GDELT integration exists in `/api/representative/[bioguideId]/news`
- ⚠️ No deduplication system implemented (showing duplicate articles)
- ⚠️ No batch processing for all 535 members
- ⚠️ Missing comprehensive TypeScript types for GDELT responses
- ⚠️ No caching strategy aligned with GDELT's 15-minute update cycle
- ⚠️ No name variation handling (missing nicknames, titles)
- ⚠️ No circuit breaker or rate limiting protection

### Current Files Using GDELT

- `src/app/api/representative/[bioguideId]/news/route.ts` - Basic endpoint
- `src/lib/gdelt-api.ts` - Simple fetch wrapper
- `src/components/EnhancedNewsFeed.tsx` - Display component

## Implementation Phases

### Phase 1: Type Safety & Core Infrastructure ✅ COMPLETED (2025-09-20)

**Priority: HIGH - Foundation for all other improvements**

- [x] Create `src/types/gdelt.ts` with strict interfaces
  - [x] GDELTArticle interface with nullable fields
  - [x] GDELTResponse with proper response structure
  - [x] GDELTError types and Result pattern
  - [x] GDELTQueryParams for query building
- [x] Implement Result/Either pattern in `src/lib/error-handling/gdelt-errors.ts`
- [x] Update existing `/api/representative/[bioguideId]/news` with new types
- [x] Add Zod validation for runtime safety

**Files created:**

- ✅ `src/types/gdelt.ts` - Comprehensive type definitions
- ✅ `src/lib/error-handling/gdelt-errors.ts` - Result/Either pattern utilities
- ✅ `src/lib/validation/gdelt-schemas.ts` - Zod validation schemas

**Files updated:**

- ✅ `src/app/api/representative/[bioguideId]/news/route.ts` - Uses new types
- ✅ `src/features/news/services/gdelt-api.ts` - Integrated Zod validation

### Phase 2: Deduplication System 🎯 Critical

**Priority: HIGH - Users seeing duplicate news is poor UX**

- [ ] Implement MinHash in `src/lib/news-deduplication.ts`
- [ ] Add content similarity detection (80% threshold)
- [ ] Create URL normalization utilities
- [ ] Add title similarity with Jaccard coefficient
- [ ] Update EnhancedNewsFeed component to use deduplication

**Files to create:**

- `src/lib/gdelt/deduplication.ts`

**Files to update:**

- `src/lib/news-deduplication.ts` (enhance existing)
- `src/components/EnhancedNewsFeed.tsx`

### Phase 3: Batch Processing for Scale 📊

**Priority: MEDIUM - Enables tracking all 535 members**

- [ ] Create `GDELTCongressQueue` class in `src/lib/gdelt/GDELTCongressQueue.ts`
- [ ] Add `/api/gdelt/batch` endpoint for bulk processing
- [ ] Implement exponential backoff for rate limit handling
- [ ] Add name variation generation (nicknames, titles)
- [ ] Create background job for periodic updates

**Files to create:**

- `src/lib/gdelt/GDELTCongressQueue.ts`
- `src/app/api/gdelt/batch/route.ts`
- `src/lib/gdelt/name-variants.ts`

### Phase 4: Caching & Performance ⚡

**Priority: MEDIUM - Improves speed and reduces API load**

- [ ] Align caching to 30-minute strategy (2x GDELT's 15-min updates)
- [ ] Add SWR configuration in `src/hooks/useGDELTNews.ts`
- [ ] Implement LRU cache for in-memory storage
- [ ] Add Redis caching layer (optional for production)
- [ ] Implement background refresh strategy

**Files to create:**

- `src/hooks/useGDELTNews.ts`
- `src/lib/gdelt/cache.ts`

**Files to update:**

- Existing SWR configurations

### Phase 5: Advanced Features 🚀

**Priority: LOW - Nice to have enhancements**

- [ ] Add GEO API for district-specific news
- [ ] Implement Television API for broadcast coverage
- [ ] Add committee-specific news tracking
- [ ] Create news sentiment analysis
- [ ] Add trending topics detection

### Phase 6: Monitoring & Testing 🧪

**Priority: HIGH - Ensures reliability**

- [ ] Add circuit breaker pattern
- [ ] Create comprehensive integration tests
- [ ] Add performance monitoring
- [ ] Implement error tracking
- [ ] Add usage analytics

**Files to create:**

- `src/lib/gdelt/circuit-breaker.ts`
- `src/tests/gdelt/gdelt-integration.test.ts`
- `src/tests/gdelt/deduplication.test.ts`

## Quick Wins (Can do immediately)

1. **Add TypeScript types** - Improves IDE support and catches errors
2. **Basic deduplication** - Immediate UX improvement
3. **30-minute caching** - Reduces API calls by 50%
4. **Name variations** - Improves coverage for high-profile members

## Dependencies to Install

```bash
# Required
npm install zod           # Runtime validation
npm install lru-cache     # In-memory caching

# Optional (for advanced features)
npm install minhash       # Deduplication algorithm
npm install bullmq        # Background job processing
npm install ioredis       # Redis client
```

## Environment Variables Needed

```env
# Add to .env.local
GDELT_USER_AGENT=CIV.IQ-Congressional-Tracker/1.0
GDELT_CACHE_TTL=1800000  # 30 minutes in ms
GDELT_BATCH_SIZE=50      # Members per batch
GDELT_RATE_LIMIT_DELAY=2000  # 2 seconds between batches
```

## Testing Strategy

### Test Representatives (Use these for validation)

- **Nancy Pelosi (P000197)** - High coverage, many name variations
- **Alexandria Ocasio-Cortez (O000172)** - Has nickname "AOC"
- **Mitch McConnell (M000355)** - Senate leader, high coverage
- **New member** - Test low coverage handling

### Success Metrics

- ✅ Deduplication reduces articles by 40-60%
- ✅ All 535 members processed within 30 minutes
- ✅ Cache hit rate > 80%
- ✅ Zero TypeScript errors
- ✅ < 1% API error rate

## Migration Path from Current System

1. **Keep existing endpoint working** during migration
2. **Add new types** without breaking changes
3. **Implement deduplication** as a filter layer
4. **Test with subset** of representatives first
5. **Roll out gradually** with feature flag

## Risk Assessment

### Low Risk Changes

- Adding TypeScript types
- Implementing caching
- Adding deduplication

### Medium Risk Changes

- Batch processing implementation
- Rate limiting logic
- Name variation generation

### High Risk Changes

- Replacing existing endpoint
- Changing data structure
- Adding background jobs

## Current Blockers

None identified - ready to begin implementation

## Next Steps

1. **Start with Phase 1** - TypeScript types (30 minutes)
2. **Implement Phase 2** - Deduplication (2 hours)
3. **Test with real data** - Validate improvements
4. **Deploy behind feature flag** - Safe rollout

## Notes

- GDELT has no published rate limits but is sensitive to load
- 15-minute update cycle means 30-minute cache is optimal
- Name variations critical for comprehensive coverage
- Deduplication essential for professional appearance
- Must maintain backwards compatibility during migration

---

**Last Updated**: September 20, 2025
**Status**: ✅ Phase 1 Complete | Ready for Phase 2 implementation
**Estimated Time**: 6-10 hours for Phases 2-4
**Completed**: Phase 1 (2 hours)
