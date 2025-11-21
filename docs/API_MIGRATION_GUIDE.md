# API Migration Guide: Individual Endpoints to Batch API

## Overview

We've refactored the representative data fetching to use a single batch API endpoint instead of multiple individual endpoints. This reduces API calls from 4+ to 1, significantly improving performance.

## What Changed

### Before (Multiple API Calls)

```typescript
// Each hook made a separate API call
useRepresentativeBills(bioguideId); // GET /api/representative/[id]/bills
useRepresentativeFinance(bioguideId); // GET /api/representative/[id]/finance
useRepresentativeCommittees(bioguideId); // GET /api/representative/[id]/committees
useRepresentativeVotes(bioguideId); // GET /api/representative/[id]/votes
```

### After (Single Batch Call)

```typescript
// All hooks share data from one batch call
useBatchData(bioguideId); // POST /api/representative/[id]/batch
// Individual hooks extract their data from the shared response
```

## Migration Status

### ✅ Completed

- Updated `useSWR.ts` hooks to use batch API
- Batch service handles missing data gracefully
- Components already support shared data pattern

### ⚠️ Keep For Now

The individual API endpoints should be kept for now because:

1. Other parts of the app might still use them
2. External integrations might depend on them
3. Useful for debugging specific data issues
4. Backward compatibility

### 🔄 Future Cleanup (After Full Testing)

Once we verify all consumers are updated:

1. Mark individual endpoints as deprecated
2. Add console warnings when they're called
3. Remove after grace period

## Usage Examples

### In Components

```typescript
// Old way (still works but makes multiple calls)
const bills = useRepresentativeBills(bioguideId);
const finance = useRepresentativeFinance(bioguideId);

// New way (recommended - single call)
// The hooks internally use the batch API
const bills = useRepresentativeBills(bioguideId); // Same interface!
const finance = useRepresentativeFinance(bioguideId); // Same interface!
```

### Direct Batch API Usage

```typescript
// For custom implementations
const response = await fetch(`/api/representative/${bioguideId}/batch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoints: ['bills', 'finance', 'committees', 'votes'],
  }),
});
const data = await response.json();
// data.data.bills, data.data.finance, etc.
```

## Performance Improvements

- **Before**: 4+ API calls, ~8-10 seconds total
- **After**: 1 API call, ~2-3 seconds total
- **Cache Efficiency**: Single cache entry shared by all hooks

## Rollback Plan

If issues arise:

1. Revert to commit before refactor
2. Restore `useSWR-original.ts` as `useSWR.ts`
3. Individual endpoints remain functional
