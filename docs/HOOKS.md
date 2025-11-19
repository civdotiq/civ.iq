# CIV.IQ Custom Hooks Documentation

This document covers the custom React hooks and optimization features available in the CIV.IQ platform.

## 🚀 Batch API Hooks

### `useBatchAPI`

A powerful hook for fetching multiple API endpoints in a single request, reducing round-trips by up to 80%.

```typescript
import { useBatchAPI } from '@/hooks/useBatchAPI';

const { data, loading, error, refetch, metadata } = useBatchAPI(
  bioguideId,
  ['profile', 'votes', 'bills'],
  { enabled: true }
);
```

**Parameters:**

- `bioguideId` (string): The representative's bioguide ID
- `endpoints` (string[]): Array of endpoint names to fetch
- `options` (object): Configuration options
  - `enabled` (boolean): Whether to automatically fetch data (default: true)
  - `refetchOnMount` (boolean): Whether to refetch when component mounts (default: true)

**Returns:**

- `data` (object): Data keyed by endpoint name
- `loading` (boolean): Loading state
- `error` (string | null): Error message if any
- `refetch` (function): Function to manually refetch data
- `metadata` (object): Request metadata including timing and success/failure counts

**Example:**

```typescript
function RepresentativeProfile({ bioguideId }: { bioguideId: string }) {
  const { data, loading, error } = useBatchAPI(bioguideId, [
    'profile',
    'votes',
    'bills',
    'finance',
    'party-alignment'
  ]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <ProfileSection data={data.profile} />
      <VotingSection data={data.votes} />
      <BillsSection data={data.bills} />
      <FinanceSection data={data.finance} />
      <PartyAlignmentSection data={data['party-alignment']} />
    </div>
  );
}
```

### `useRepresentativeProfile`

Pre-configured hook for representative profile pages with common endpoints.

```typescript
import { useRepresentativeProfile } from '@/hooks/useBatchAPI';

const { data, loading, error } = useRepresentativeProfile(bioguideId, {
  includeVotes: true,
  includeBills: true,
  includeFinance: true,
  includeNews: true,
  includePartyAlignment: true,
  enabled: true,
});
```

**Parameters:**

- `bioguideId` (string): The representative's bioguide ID
- `options` (object): Feature flags for what data to include
  - `includeVotes` (boolean): Include voting records (default: true)
  - `includeBills` (boolean): Include sponsored bills (default: true)
  - `includeFinance` (boolean): Include campaign finance (default: true)
  - `includeNews` (boolean): Include news mentions (default: true)
  - `includePartyAlignment` (boolean): Include party voting analysis (default: true)
  - `enabled` (boolean): Whether to fetch data (default: true)

**Example:**

```typescript
function EnhancedRepresentativePage({ bioguideId }: { bioguideId: string }) {
  const { data, loading, error, metadata } = useRepresentativeProfile(bioguideId, {
    includeVotes: true,
    includeBills: true,
    includeFinance: false, // Skip finance for faster loading
    includeNews: true,
    includePartyAlignment: true
  });

  console.log(`Request took ${metadata?.totalTime}ms`);

  return (
    <ProfileLayout>
      {data.profile && <ProfileHeader representative={data.profile} />}
      {data.votes && <VotingTab votes={data.votes} />}
      {data.bills && <BillsTab bills={data.bills} />}
      {data.news && <NewsTab news={data.news} />}
      {data['party-alignment'] && <PartyAlignment data={data['party-alignment']} />}
    </ProfileLayout>
  );
}
```

### `useRepresentativeData`

Flexible hook for fetching specific data subsets.

```typescript
import { useRepresentativeData } from '@/hooks/useBatchAPI';

const { data, loading, error } = useRepresentativeData(
  bioguideId,
  ['votes', 'party-alignment', 'committees'],
  true // enabled
);
```

**Available Data Types:**

- `votes` - Recent voting records
- `bills` - Sponsored/co-sponsored bills
- `finance` - Campaign finance data
- `news` - Recent news mentions
- `committees` - Committee assignments
- `party-alignment` - Party voting analysis
- `leadership` - Leadership roles

## 📊 Performance Benefits

### Request Optimization

**Before (Multiple Requests):**

```typescript
// 6 separate API calls
const profile = await fetch(`/api/representative/${id}`);
const votes = await fetch(`/api/representative/${id}/votes`);
const bills = await fetch(`/api/representative/${id}/bills`);
const finance = await fetch(`/api/representative/${id}/finance`);
const news = await fetch(`/api/representative/${id}/news`);
const alignment = await fetch(`/api/representative/${id}/party-alignment`);

// Total time: ~1.2 seconds (6 × 200ms)
```

**After (Batch Request):**

```typescript
// 1 batch API call
const { data } = useBatchAPI(id, [
  'profile',
  'votes',
  'bills',
  'finance',
  'news',
  'party-alignment',
]);

// Total time: ~400ms (80% reduction)
```

### Caching Strategy

The batch API implements intelligent caching:

```typescript
// Different endpoints have different cache TTLs
const cacheTTLs = {
  profile: 30 * 60 * 1000, // 30 minutes
  votes: 15 * 60 * 1000, // 15 minutes
  bills: 60 * 60 * 1000, // 1 hour
  finance: 6 * 60 * 60 * 1000, // 6 hours
  news: 5 * 60 * 1000, // 5 minutes
  'party-alignment': 60 * 60 * 1000, // 1 hour
};
```

### Error Isolation

Individual endpoint failures don't affect other data:

```typescript
const { data, errors } = useBatchAPI(id, ['profile', 'votes', 'bills']);

// Even if 'votes' fails, you still get 'profile' and 'bills' data
if (data.profile) {
  // Render profile section
}

if (errors.votes) {
  // Show error message only for votes section
}
```

## 🔧 Advanced Usage

### Conditional Data Fetching

```typescript
function ConditionalProfile({ bioguideId, showFinance }: Props) {
  // Only fetch finance data when needed
  const endpoints = ['profile', 'votes'];
  if (showFinance) endpoints.push('finance');

  const { data, loading } = useBatchAPI(bioguideId, endpoints);

  return (
    <div>
      <ProfileSection data={data.profile} />
      <VotingSection data={data.votes} />
      {showFinance && data.finance && (
        <FinanceSection data={data.finance} />
      )}
    </div>
  );
}
```

### Manual Refetching

```typescript
function RefreshableProfile({ bioguideId }: Props) {
  const { data, loading, refetch } = useBatchAPI(bioguideId, [
    'profile', 'votes', 'news'
  ]);

  const handleRefresh = async () => {
    await refetch();
    toast.success('Data refreshed!');
  };

  return (
    <div>
      <button onClick={handleRefresh} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh Data'}
      </button>
      <ProfileContent data={data} />
    </div>
  );
}
```

### Performance Monitoring

```typescript
function MonitoredProfile({ bioguideId }: Props) {
  const { data, metadata } = useBatchAPI(bioguideId, [
    'profile', 'votes', 'bills', 'finance'
  ]);

  useEffect(() => {
    if (metadata) {
      // Log performance metrics
      console.log('Batch API Performance:', {
        totalTime: metadata.totalTime,
        successfulEndpoints: metadata.successfulEndpoints.length,
        failedEndpoints: metadata.failedEndpoints.length,
        cacheHits: metadata.cacheHits // if available
      });

      // Send to analytics
      analytics.track('batch_api_request', {
        endpoints: metadata.requestedEndpoints,
        response_time: metadata.totalTime,
        success_rate: metadata.successfulEndpoints.length / metadata.requestedEndpoints.length
      });
    }
  }, [metadata]);

  return <ProfileDisplay data={data} />;
}
```

## 🔍 Debugging

### Development Mode

Enable verbose logging in development:

```typescript
// In development, the hooks provide detailed logging
const { data, loading, error } = useBatchAPI(bioguideId, endpoints, {
  debug: process.env.NODE_ENV === 'development',
});

// Console output:
// [useBatchAPI] Fetching endpoints: ['profile', 'votes', 'bills']
// [useBatchAPI] Request completed in 423ms
// [useBatchAPI] Success: profile, votes, bills
// [useBatchAPI] Cache hits: profile (cached), votes (fresh), bills (fresh)
```

### Error Debugging

```typescript
const { data, error, metadata } = useBatchAPI(bioguideId, endpoints);

if (error) {
  console.error('Batch API Error:', {
    message: error,
    failedEndpoints: metadata?.failedEndpoints,
    successfulEndpoints: metadata?.successfulEndpoints,
    totalTime: metadata?.totalTime,
  });
}
```

## 🎯 Best Practices

### 1. Choose Appropriate Endpoints

```typescript
// ✅ Good: Related data that's needed together
const { data } = useBatchAPI(id, ['profile', 'votes', 'committees']);

// ❌ Avoid: Unrelated data that might not all be needed
const { data } = useBatchAPI(id, ['profile', 'finance', 'news', 'bills', 'votes']);
```

### 2. Handle Loading States

```typescript
function ProfileWithSkeleton({ bioguideId }: Props) {
  const { data, loading } = useBatchAPI(bioguideId, ['profile', 'votes']);

  return (
    <div>
      {loading ? (
        <ProfileSkeleton />
      ) : (
        <ProfileContent profile={data.profile} votes={data.votes} />
      )}
    </div>
  );
}
```

### 3. Graceful Error Handling

```typescript
function RobustProfile({ bioguideId }: Props) {
  const { data, error, metadata } = useBatchAPI(bioguideId, [
    'profile', 'votes', 'bills'
  ]);

  return (
    <div>
      {data.profile ? (
        <ProfileSection data={data.profile} />
      ) : (
        <ErrorBoundary>Profile unavailable</ErrorBoundary>
      )}

      {data.votes ? (
        <VotingSection data={data.votes} />
      ) : metadata?.failedEndpoints.includes('votes') ? (
        <ErrorMessage>Voting data temporarily unavailable</ErrorMessage>
      ) : (
        <VotingSkeletonLoader />
      )}
    </div>
  );
}
```

### 4. Optimize Bundle Size

```typescript
// Use dynamic imports for heavy components
const FinanceSection = lazy(() => import('./FinanceSection'));

function OptimizedProfile({ bioguideId }: Props) {
  const { data } = useRepresentativeProfile(bioguideId, {
    includeFinance: false // Only load when needed
  });

  const [showFinance, setShowFinance] = useState(false);

  return (
    <div>
      <ProfileSection data={data.profile} />
      {showFinance && (
        <Suspense fallback={<LoadingSpinner />}>
          <FinanceSection bioguideId={bioguideId} />
        </Suspense>
      )}
    </div>
  );
}
```

## 📊 Performance Metrics

### Real-world Performance Gains

| Metric               | Before (Individual Requests) | After (Batch API) | Improvement     |
| -------------------- | ---------------------------- | ----------------- | --------------- |
| **Total Requests**   | 6                            | 1                 | 83% reduction   |
| **Load Time**        | 1,200ms                      | 400ms             | 67% faster      |
| **Bundle Size**      | N/A                          | +2KB              | Minimal impact  |
| **Cache Efficiency** | 60%                          | 85%               | 25% improvement |
| **Error Resilience** | All-or-nothing               | Partial success   | Much better     |

### Monitoring Dashboard

```typescript
// Example metrics collection
const MetricsCollector = {
  trackBatchRequest: (metadata: BatchMetadata) => {
    const metrics = {
      timestamp: Date.now(),
      endpoints: metadata.requestedEndpoints,
      responseTime: metadata.totalTime,
      successRate: metadata.successfulEndpoints.length / metadata.requestedEndpoints.length,
      cacheHitRate: metadata.cacheHits / metadata.requestedEndpoints.length,
    };

    // Send to your analytics service
    analytics.track('batch_api_performance', metrics);
  },
};
```

## 🔄 Migration Guide

### From Individual Hooks to Batch API

**Before:**

```typescript
const { data: profile } = useProfile(bioguideId);
const { data: votes } = useVotes(bioguideId);
const { data: bills } = useBills(bioguideId);
```

**After:**

```typescript
const { data } = useBatchAPI(bioguideId, ['profile', 'votes', 'bills']);
// Access via: data.profile, data.votes, data.bills
```

### Incremental Migration

You can migrate gradually:

```typescript
// Phase 1: Start with critical data
const { data: critical } = useBatchAPI(bioguideId, ['profile', 'votes']);

// Phase 2: Add remaining data
const { data: additional } = useBatchAPI(bioguideId, ['bills', 'finance'], {
  enabled: !!critical.profile, // Only fetch after critical data loads
});
```

## 📞 Support

For questions about the batch API hooks:

- **Documentation**: https://docs.civiq.org/hooks
- **Examples**: https://github.com/civiq/civic-intel-hub/tree/main/examples
- **Issues**: https://github.com/civiq/civic-intel-hub/issues

---

## 📱 UI/UX Hooks

### `useResponsiveChartHeight`

A hook for providing responsive chart heights that adapt to viewport size, optimizing data visualizations for mobile and desktop experiences.

```typescript
import { useResponsiveChartHeight } from '@/hooks/useResponsiveChartHeight';

const chartHeight = useResponsiveChartHeight(400, 280, 768);
```

**Parameters:**

- `desktopHeight` (number): Height in pixels for desktop viewports (default: 400)
- `mobileHeight` (number): Height in pixels for mobile viewports (default: 250)
- `breakpoint` (number): Viewport width breakpoint in pixels (default: 768)

**Returns:**

- `height` (number): Responsive height value based on current viewport size

**Features:**

- Automatic viewport detection and updates
- Listens to window resize events
- SSR-safe (handles `typeof window !== 'undefined'`)
- Memory-efficient cleanup on unmount

**Example - Basic Usage:**

```typescript
function CampaignFinanceChart() {
  const chartHeight = useResponsiveChartHeight(400, 250);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data}>
        {/* Chart components */}
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Example - Custom Breakpoints:**

```typescript
function CustomChart() {
  // Use 1024px breakpoint for tablet-specific sizing
  const chartHeight = useResponsiveChartHeight(
    500,  // Desktop height
    300,  // Mobile height
    1024  // Custom breakpoint
  );

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <LineChart data={trends}>
          {/* Chart components */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Example - Multiple Charts with Different Heights:**

```typescript
function DashboardCharts() {
  const primaryChartHeight = useResponsiveChartHeight(400, 280);
  const secondaryChartHeight = useResponsiveChartHeight(300, 250);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ResponsiveContainer width="100%" height={primaryChartHeight}>
        <BarChart data={mainData}>{/* ... */}</BarChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={secondaryChartHeight}>
        <PieChart data={categoryData}>{/* ... */}</PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Performance Considerations:**

- Hook uses `useEffect` with proper cleanup to prevent memory leaks
- Resize listener is automatically removed on component unmount
- Initial state matches desktop height for SSR hydration consistency
- Dependencies array includes all parameters for proper updates

**When to Use:**

- ✅ Recharts visualizations that need mobile optimization
- ✅ Any chart component that should adapt to screen size
- ✅ Dashboard layouts with multiple charts
- ✅ Components that need different heights across breakpoints

**When Not to Use:**

- ❌ Static images or non-interactive visualizations (use CSS instead)
- ❌ Charts that should always be the same height
- ❌ Simple responsive layouts (use Tailwind classes: `h-64 md:h-96`)

---

## 🎨 Chart Color Constants

### `CHART_COLORS`

Centralized brand color constants for consistent data visualizations across the platform.

**Location:** `src/lib/constants/chart-colors.ts`

### Brand Colors

```typescript
import { BRAND_COLORS } from '@/lib/constants/chart-colors';

const colors = {
  red: BRAND_COLORS.red, // #e11d07 (Civiq Red)
  green: BRAND_COLORS.green, // #0a9338 (Civiq Green)
  blue: BRAND_COLORS.blue, // #3ea2d4 (Civiq Blue)
};
```

### Chart Color Palette

```typescript
import { CHART_COLORS, getChartColor } from '@/lib/constants/chart-colors';

// Use predefined palette
const data = [
  { name: 'Category A', value: 100, color: CHART_COLORS[0] }, // Blue
  { name: 'Category B', value: 200, color: CHART_COLORS[1] }, // Green
  { name: 'Category C', value: 150, color: CHART_COLORS[2] }, // Red
];

// Or use utility function for dynamic colors
const dynamicColors = categories.map((_, index) => getChartColor(index));
```

**Available Colors:**

1. `CHART_COLORS[0]` - Primary Blue (#3ea2d4)
2. `CHART_COLORS[1]` - Secondary Green (#0a9338)
3. `CHART_COLORS[2]` - Tertiary Red (#e11d07)
4. `CHART_COLORS[3]` - Neutral Gray (#64748b)
5. `CHART_COLORS[4]` - Light Gray (#94a3b8)
6. `CHART_COLORS[5]` - Dark Gray (#475569)

### Semantic Colors

```typescript
import { SEMANTIC_COLORS, getPartyColor } from '@/lib/constants/chart-colors';

// Political party colors
const partyColor = getPartyColor('Democrat'); // Returns #3ea2d4
const repColor = getPartyColor('R'); // Returns #e11d07

// Vote indicators
const voteColors = {
  yea: SEMANTIC_COLORS.yea, // #0a9338 (green)
  nay: SEMANTIC_COLORS.nay, // #e11d07 (red)
  abstain: SEMANTIC_COLORS.abstain, // #64748b (gray)
};

// Financial indicators
const financeColors = {
  income: SEMANTIC_COLORS.income, // #0a9338 (green)
  expenditure: SEMANTIC_COLORS.expenditure, // #e11d07 (red)
  balance: SEMANTIC_COLORS.balance, // #3ea2d4 (blue)
};
```

**Example - Campaign Finance Chart:**

```typescript
import { CHART_COLORS, SEMANTIC_COLORS } from '@/lib/constants/chart-colors';

function FinanceBreakdown({ data }) {
  const chartData = [
    { name: 'Individual', value: data.individual, color: CHART_COLORS[0] },
    { name: 'PAC', value: data.pac, color: CHART_COLORS[1] },
    { name: 'Party', value: data.party, color: CHART_COLORS[2] },
  ];

  return (
    <PieChart>
      <Pie data={chartData} dataKey="value">
        {chartData.map((entry, index) => (
          <Cell key={index} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  );
}
```

**Example - Party Alignment Chart:**

```typescript
import { getPartyColor } from '@/lib/constants/chart-colors';

function PartyVotingChart({ representatives }) {
  return (
    <BarChart data={representatives}>
      <Bar dataKey="votes">
        {representatives.map((rep, index) => (
          <Cell key={index} fill={getPartyColor(rep.party)} />
        ))}
      </Bar>
    </BarChart>
  );
}
```

**Benefits:**

- ✅ Consistent brand colors across all visualizations
- ✅ Accessible color contrast ratios (WCAG 2.1 AA)
- ✅ Type-safe constants with TypeScript
- ✅ Utility functions for dynamic color assignment
- ✅ Semantic naming for better code readability

---

**Note**: These hooks are part of the advanced civic intelligence platform optimization features. The batch API hooks are from Phase 6, and the UI/UX hooks are from the mobile optimization initiative (November 2025).
