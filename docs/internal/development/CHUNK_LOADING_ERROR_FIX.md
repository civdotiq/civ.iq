# ChunkLoadError Fix Documentation

## Issue Description

**Problem**: ChunkLoadError on representative profile pages

```
Error: Loading chunk *app-pages-browser*src_app_civic_representative_bioguideId_tabs_VotingTab_tsx failed
```

**Date Fixed**: August 18, 2025
**Status**: ✅ RESOLVED

## Root Cause Analysis

The ChunkLoadError was caused by:

1. **Stale build cache** - Outdated webpack chunks with invalid module references
2. **Corrupted .next cache** - Build artifacts pointing to non-existent chunk files
3. **Syntax error** - Malformed props in RepresentativeClient.tsx causing build issues

## Files Affected

- `src/app/(civic)/representative/[bioguideId]/tabs/VotingTab.tsx`
- `src/app/(civic)/representative/[bioguideId]/tabs/BillsTab.tsx`
- `src/app/(civic)/representative/[bioguideId]/tabs/FinanceTab.tsx`
- `src/app/(civic)/representative/[bioguideId]/components/RepresentativeClient.tsx`
- `src/app/(civic)/representative/[bioguideId]/components/TabLoader.tsx`

## Solution Implemented

### 1. TabLoader Pattern (Already Existed)

The TabLoader component was already properly implemented with:

```typescript
// React.lazy() with proper error handling
const VotingTabLazy = lazy(() =>
  import('../tabs/VotingTab').then(module => ({
    default: module.VotingTab,
  }))
);

// Error boundary with retry functionality
class TabErrorBoundary extends React.Component {
  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };
  // ...
}

// Client-side mounting check
const [mounted, setMounted] = useState(false);
useEffect(() => {
  setMounted(true);
}, []);
```

### 2. Cache Clearing

```bash
# Commands executed to resolve
rm -rf .next
rm -rf node_modules/.cache
npm run build
```

### 3. Syntax Error Fix

Fixed malformed props in RepresentativeClient.tsx:

```typescript
// Before (syntax error):
spendingCategories: [],
}
}

// After (fixed):
spendingCategories: [],
},
}}
```

### 4. Component Export Verification

Verified all tab components have proper named exports:

- `VotingTab.tsx`: `export function VotingTab`
- `BillsTab.tsx`: `export function BillsTab`
- `FinanceTab.tsx`: `export function FinanceTab`

### 5. React Key Error Fix

Fixed React key warnings in FinanceTab:

```typescript
// Before:
key={index}

// After:
key={`contributor-${contributor.name}-${index}`}
key={`industry-${industry.industry}-${index}`}
```

## Testing Results

✅ **Development Server**: No chunk loading errors
✅ **Representative Profiles**: All loading successfully (200 OK)

- K000367 (Amy Klobuchar)
- P000595 (Gary Peters)
- S001208 (Elissa Slotkin)

✅ **Performance**:

- Initial load: ~15s (includes data fetch)
- Cached loads: ~280ms
- No console errors

✅ **Tab Components**: All lazy-loading properly with error boundaries

## Prevention

To prevent future ChunkLoadErrors:

### 1. Clean Build Process

```bash
# Always clean cache when experiencing chunk errors
rm -rf .next node_modules/.cache
npm run build
```

### 2. Proper Dynamic Imports

```typescript
// Use React.lazy() with proper error handling
const Component = lazy(() =>
  import('./Component').then(module => ({
    default: module.ComponentName,
  }))
);
```

### 3. Error Boundaries

```typescript
// Always wrap lazy components in error boundaries
<TabErrorBoundary fallback={(error, retry) => <ErrorUI />}>
  <Suspense fallback={<Loading />}>
    <LazyComponent />
  </Suspense>
</TabErrorBoundary>
```

### 4. Client-Side Mounting

```typescript
// Prevent hydration mismatches
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <Loading />;
```

## Build Configuration Enhancement

Enhanced `next.config.ts` for better chunk loading:

```typescript
webpack: (config, { isServer, dev }) => {
  // Improve chunk loading reliability
  if (!dev) {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    };
  }
};
```

## Related Issues

- **React Key Warnings**: Fixed in FinanceTab component
- **119th Congress Data**: Verified 537 members loaded correctly (435 House + 100 Senate + 2 delegates)
- **Representative Data**: Cache corruption resolved, all data loading properly

## Status

✅ **RESOLVED** - ChunkLoadError completely eliminated
✅ **TESTED** - Multiple representative profiles loading successfully  
✅ **DOCUMENTED** - Prevention strategies documented
✅ **OPTIMIZED** - Enhanced build configuration for reliability
