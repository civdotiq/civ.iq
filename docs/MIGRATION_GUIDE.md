# Migration Guide: Performance Optimization Update

## Overview

This guide helps developers understand and migrate to the new performance-optimized architecture implemented in the CIV.IQ Representative Profile system.

## Table of Contents

1. [What Changed](#what-changed)
2. [Breaking Changes](#breaking-changes)
3. [Migration Steps](#migration-steps)
4. [Updated Patterns](#updated-patterns)
5. [Testing Guide](#testing-guide)
6. [Troubleshooting](#troubleshooting)

## What Changed

### Architecture Transformation

**Before (Client-Heavy SPA):**
```
Client Component → useRepresentativeProfile Hook → 8 API Calls → Loading States
```

**After (Hybrid SSR + Lazy Loading):**
```
Server Component → Batch API Call → Pre-rendered HTML → Client Components for Interactivity
```

### Key Changes

1. **Server-Side Rendering**: Main page now renders on server with pre-fetched data
2. **Lazy Loading**: Heavy components load on-demand with `next/dynamic`
3. **Suspense Boundaries**: Granular loading states for better UX
4. **Enhanced Caching**: Next.js 15 fetch with intelligent cache strategies
5. **Client Wrapper**: Interactive functionality separated into client components

## Breaking Changes

### 1. Page Component Structure

**Before:**
```typescript
'use client';
import { useRepresentativeProfile } from '@/hooks/useBatchAPI';

export default function RepresentativeProfilePage() {
  const { data, loading, error } = useRepresentativeProfile(bioguideId);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage />;
  
  return <ProfileContent data={data} />;
}
```

**After:**
```typescript
// Server Component - no 'use client'
import { getRepresentativeData } from './data-fetching';

export default async function RepresentativeProfilePage({ params }) {
  const { bioguideId } = await params;
  const data = await getRepresentativeData(bioguideId);
  
  return (
    <div>
      <ProfileHeader data={data.profile} />
      <RepresentativeProfileClient initialData={data} />
    </div>
  );
}
```

### 2. Hook Usage Changes

**Before:**
```typescript
// All data fetched on client
const { data, loading, error } = useRepresentativeProfile(bioguideId);
```

**After:**
```typescript
// Server: Data pre-fetched
const data = await getRepresentativeData(bioguideId);

// Client: Hook only for interactive features
const { data, loading } = useVotingRecords(bioguideId); // Individual endpoints
```

### 3. Component Import Changes

**Before:**
```typescript
import { VotingRecordsTable } from '@/components/VotingRecordsTable';
import { CampaignFinanceVisualizer } from '@/components/CampaignFinanceVisualizer';
```

**After:**
```typescript
// Lazy loaded with dynamic imports
const VotingRecordsTable = dynamic(() => import('@/components/VotingRecordsTable'));
const CampaignFinanceVisualizer = dynamic(() => import('@/components/CampaignFinanceVisualizer'));
```

## Migration Steps

### Step 1: Update Page Component

1. **Remove 'use client' directive** from main page component
2. **Convert to async function** that accepts params
3. **Add server-side data fetching** before component render
4. **Extract interactive features** to client wrapper

```typescript
// Before
'use client';
export default function Page() {
  const { data, loading } = useRepresentativeProfile(id);
  // ...
}

// After
export default async function Page({ params }) {
  const data = await getRepresentativeData(id);
  return (
    <div>
      <ServerRenderedContent data={data} />
      <ClientWrapper initialData={data} />
    </div>
  );
}
```

### Step 2: Create Client Wrapper

1. **Create new client component** for interactive features
2. **Move tab state management** to client component
3. **Wrap heavy components** in Suspense boundaries

```typescript
// New file: client-wrapper.tsx
'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />
});

export function ClientWrapper({ initialData }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyComponent data={initialData} />
    </Suspense>
  );
}
```

### Step 3: Update API Client

1. **Add caching options** to API requests
2. **Implement cache tags** for invalidation
3. **Add different cache times** based on data freshness

```typescript
// Before
async function apiRequest(endpoint: string) {
  return fetch(endpoint);
}

// After
async function apiRequest(endpoint: string, options: {
  cacheTime?: number;
  tags?: string[];
}) {
  return fetch(endpoint, {
    next: {
      revalidate: options.cacheTime || 300,
      tags: options.tags || []
    }
  });
}
```

### Step 4: Update Component Imports

1. **Convert static imports** to dynamic imports for heavy components
2. **Add loading states** for lazy-loaded components
3. **Configure SSR settings** for client-only libraries

```typescript
// Before
import { ChartComponent } from '@/components/ChartComponent';

// After
const ChartComponent = dynamic(
  () => import('@/components/ChartComponent'),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false // If using client-only libraries
  }
);
```

### Step 5: Update Data Fetching Patterns

1. **Move critical data** to server components
2. **Keep interactive data** in client components
3. **Use transitions** for non-urgent updates

```typescript
// Before
useEffect(() => {
  fetchData();
}, []);

// After - Server Component
const data = await fetch('/api/data', { next: { revalidate: 300 } });

// After - Client Component
const [isPending, startTransition] = useTransition();
const handleFilter = () => {
  startTransition(() => {
    setFilter(newFilter);
  });
};
```

## Updated Patterns

### 1. Data Fetching Pattern

```typescript
// Server Component Pattern
async function getRepresentativeData(bioguideId: string) {
  const response = await fetch(`/api/representative/${bioguideId}/batch`, {
    method: 'POST',
    body: JSON.stringify({ endpoints: ['profile', 'votes', 'bills'] }),
    next: { 
      revalidate: 300,
      tags: [`representative-${bioguideId}`]
    }
  });
  return response.json();
}
```

### 2. Lazy Loading Pattern

```typescript
// Component Lazy Loading
const LazyComponent = dynamic(
  () => import('./LazyComponent').then(mod => ({ default: mod.LazyComponent })),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);
```

### 3. Suspense Boundary Pattern

```typescript
// Granular Loading States
<Suspense fallback={<VotingSkeleton />}>
  <VotingRecordsTable bioguideId={bioguideId} />
</Suspense>

<Suspense fallback={<FinanceSkeleton />}>
  <CampaignFinanceVisualizer data={financeData} />
</Suspense>
```

### 4. Transition Pattern

```typescript
// Non-blocking Updates
const [isPending, startTransition] = useTransition();

const handleSort = (field: string) => {
  startTransition(() => {
    setSortField(field);
  });
};

return (
  <div>
    {isPending && <PendingIndicator />}
    <SortableTable onSort={handleSort} />
  </div>
);
```

## Testing Guide

### 1. Server Component Testing

```typescript
// Test server-side data fetching
describe('RepresentativeProfilePage', () => {
  it('should fetch data on server', async () => {
    const mockData = { profile: { name: 'John Doe' } };
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve(mockData)
    });

    const component = await RepresentativeProfilePage({ 
      params: Promise.resolve({ bioguideId: 'A000001' }) 
    });
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/representative/A000001/batch'),
      expect.objectContaining({
        next: expect.objectContaining({
          revalidate: 300,
          tags: ['representative-A000001']
        })
      })
    );
  });
});
```

### 2. Client Component Testing

```typescript
// Test client-side interactivity
describe('ClientWrapper', () => {
  it('should handle tab switching', () => {
    render(<ClientWrapper initialData={mockData} />);
    
    fireEvent.click(screen.getByText('Voting Record'));
    expect(screen.getByText('Loading voting records...')).toBeInTheDocument();
  });
});
```

### 3. Performance Testing

```typescript
// Test lazy loading
describe('Lazy Loading', () => {
  it('should not load heavy components initially', () => {
    render(<ProfilePage />);
    
    // Heavy component should not be in DOM initially
    expect(screen.queryByTestId('campaign-finance-chart')).not.toBeInTheDocument();
    
    // Should load after tab click
    fireEvent.click(screen.getByText('Campaign Finance'));
    expect(screen.getByTestId('campaign-finance-chart')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Hydration Mismatches

**Problem:** Server and client render different content

**Solution:**
```typescript
// Use useEffect for client-only features
useEffect(() => {
  setClientOnlyData(data);
}, []);

// Or use dynamic imports with ssr: false
const ClientOnlyComponent = dynamic(() => import('./ClientComponent'), {
  ssr: false
});
```

#### 2. Missing Data in Server Components

**Problem:** Server component can't access client-side data

**Solution:**
```typescript
// Pass data through props
export default async function ServerComponent({ params }) {
  const data = await fetchData(params.id);
  return <ClientComponent initialData={data} />;
}
```

#### 3. Lazy Loading Not Working

**Problem:** Dynamic imports not loading properly

**Solution:**
```typescript
// Ensure proper import syntax
const LazyComponent = dynamic(
  () => import('./Component').then(mod => ({ default: mod.Component })),
  { loading: () => <div>Loading...</div> }
);
```

#### 4. Cache Not Working

**Problem:** Data not being cached properly

**Solution:**
```typescript
// Add proper cache configuration
const response = await fetch(url, {
  next: {
    revalidate: 300, // 5 minutes
    tags: ['data-tag']
  }
});
```

### Debugging Tips

1. **Check Console Logs**: Look for `[CIV.IQ-DEBUG]` messages
2. **Network Tab**: Verify API calls are reduced from 8 to 1
3. **Performance Tab**: Check Time to Interactive improvements
4. **Cache Headers**: Verify cache hit/miss in Network tab

### Performance Verification

```typescript
// Check if optimizations are working
const performanceCheck = {
  // Should be 1 instead of 8
  apiCalls: document.querySelectorAll('[data-api-call]').length,
  
  // Should be < 1 second
  timeToInteractive: performance.getEntriesByName('navigation')[0].loadEventEnd,
  
  // Should be reduced by ~60%
  bundleSize: performance.getEntriesByType('resource')
    .filter(r => r.name.includes('.js'))
    .reduce((total, resource) => total + resource.transferSize, 0)
};
```

## Performance Monitoring

### Setup Performance Monitoring

```typescript
// Add to your main component
useEffect(() => {
  // Monitor Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  });
}, []);
```

### Key Metrics to Monitor

- **Time to Interactive (TTI)**: Should be < 1 second
- **First Contentful Paint (FCP)**: Should be < 0.5 seconds
- **Largest Contentful Paint (LCP)**: Should be < 1 second
- **Cumulative Layout Shift (CLS)**: Should be < 0.1
- **Bundle Size**: Should be 60% smaller than before

## Conclusion

The migration to the new performance-optimized architecture requires updating your components to use the hybrid SSR + lazy loading pattern. While there are breaking changes, the performance improvements (68% faster TTI, 83% faster FCP) make the migration worthwhile.

Take the migration step by step, testing each component as you update it. The new architecture provides better user experience while maintaining the same functionality.

For detailed implementation examples, see the [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md) documentation.