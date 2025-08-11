# Architecture - CIV.IQ Platform

## Overview

CIV.IQ is a Progressive Web Application built with Next.js 15, utilizing the App Router for optimal performance and SEO. The platform follows a microservices-inspired architecture with clear separation of concerns.

## Technology Stack

### Frontend

- **Framework**: Next.js 15.4.5 (App Router)
- **Language**: TypeScript 5.8.3
- **UI Library**: React 18.2.0
- **Styling**: Tailwind CSS 3.4.1
- **State Management**: Zustand 5.0.6
- **Data Fetching**: SWR 2.3.4
- **Charts**: Recharts 3.0.0, D3.js 7.9.0
- **Maps**: MapLibre GL JS, Leaflet 1.9.4

### Backend

- **Runtime**: Node.js 18+ LTS
- **API Routes**: Next.js API Routes
- **Caching**: Redis (via ioredis 5.6.1)
- **Rate Limiting**: Custom limiter implementation

### Data Sources

- **Congress.gov API**: Legislative data
- **FEC API**: Campaign finance
- **Census API**: Demographics & boundaries
- **GDELT V2 DOC API**: News aggregation
- **Senate.gov XML**: Senate voting records
- **congress-legislators**: Enhanced member data

### Infrastructure

- **Hosting**: Vercel
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry
- **Analytics**: Vercel Analytics

## Architecture Patterns

### 1. Layered Architecture

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│     (React Components + Pages)      │
├─────────────────────────────────────┤
│         Application Layer           │
│    (Hooks, State Management)        │
├─────────────────────────────────────┤
│          Service Layer              │
│    (API Clients, Utilities)         │
├─────────────────────────────────────┤
│           Data Layer                │
│    (Type Definitions, Models)       │
└─────────────────────────────────────┘
```

### 2. API Gateway Pattern

All external API calls go through our API routes:

```
Client → /api/endpoint → External Service
         ↓
     Caching Layer
         ↓
     Rate Limiting
         ↓
     Error Handling
```

### 3. Repository Pattern

Data access is abstracted through service modules:

```typescript
// src/lib/services/representative.service.ts
export class RepresentativeService {
  async findByZip(zip: string): Promise<Representative[]>;
  async findById(id: string): Promise<Representative>;
  async getVotes(id: string): Promise<Vote[]>;
}
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── representative/
│   │   ├── committee/
│   │   ├── bill/
│   │   └── health/
│   ├── (marketing)/       # Marketing pages
│   ├── representatives/   # Representative pages
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
│
├── components/            # React components
│   ├── ui/               # Base components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   ├── representatives/  # Feature components
│   │   ├── RepresentativeCard.tsx
│   │   ├── VotingRecord.tsx
│   │   └── FinanceChart.tsx
│   └── shared/          # Shared components
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── LoadingState.tsx
│
├── lib/                  # Core libraries
│   ├── api/             # API clients
│   │   ├── congress.ts
│   │   ├── fec.ts
│   │   └── census.ts
│   ├── services/        # Business logic
│   ├── utils/           # Utilities
│   └── constants.ts     # Constants
│
├── types/               # TypeScript types
│   ├── representative.ts
│   ├── bill.ts
│   ├── vote.ts
│   └── api.ts
│
├── hooks/               # Custom React hooks
│   ├── useRepresentative.ts
│   ├── useDebounce.ts
│   └── useInfiniteScroll.ts
│
└── styles/              # Global styles
    └── globals.css
```

## Data Flow

### 1. User Search Flow

```mermaid
User Input (ZIP)
    → SearchForm Component
    → /api/representatives API Route
    → Census API (validate ZIP)
    → Congress API (fetch members)
    → Transform & Cache Response
    → Return to Client
    → Display Results
```

### 2. Representative Profile Flow

```mermaid
Profile Request
    → Parallel API Calls:
        → Basic Info (congress-legislators)
        → Voting Records (Congress.gov)
        → Campaign Finance (FEC)
        → News (GDELT)
    → Aggregate Results
    → Cache with TTL
    → Render Profile
```

### 3. Caching Strategy

```typescript
interface CacheConfig {
  representatives: 3600; // 1 hour
  votes: 900; // 15 minutes
  finance: 3600; // 1 hour
  news: 300; // 5 minutes
  districts: 86400; // 24 hours
  committees: 21600; // 6 hours
}
```

## API Design

### RESTful Endpoints

All APIs follow REST principles:

```
GET    /api/representatives      # List
GET    /api/representative/{id}  # Read
POST   /api/representative/batch # Batch operations
```

### Response Format

Consistent JSON structure:

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    cached: boolean;
    ttl?: number;
  };
}
```

### Error Handling

Centralized error handling:

```typescript
class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}
```

## Performance Optimizations

### 1. Code Splitting

Dynamic imports for heavy components:

```typescript
const HeavyChart = dynamic(
  () => import('./HeavyChart'),
  {
    loading: () => <Skeleton />,
    ssr: false
  }
);
```

### 2. Image Optimization

Next.js Image component with optimization:

```tsx
<Image
  src={photoUrl}
  alt={name}
  width={200}
  height={200}
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>
```

### 3. Virtual Scrolling

For long lists:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={100}
  width="100%"
>
  {Row}
</FixedSizeList>
```

### 4. Bundle Optimization

Modular imports:

```typescript
// ✅ Good - Import only what's needed
import { scaleLinear, scaleTime } from 'd3-scale';

// ❌ Bad - Imports entire D3
import * as d3 from 'd3';
```

## Security

### 1. Input Validation

All user inputs validated:

```typescript
import { z } from 'zod';

const zipSchema = z.string().regex(/^\d{5}$/);

function validateZip(zip: string) {
  return zipSchema.parse(zip);
}
```

### 2. API Key Protection

Environment variables for sensitive data:

```typescript
const API_KEY = process.env.CONGRESS_API_KEY;
if (!API_KEY) {
  throw new Error('API key not configured');
}
```

### 3. Rate Limiting

Protect against abuse:

```typescript
const rateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests
});
```

### 4. CORS Configuration

Strict CORS policies:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

## State Management

### 1. Client State (Zustand)

```typescript
interface AppStore {
  representatives: Representative[];
  selectedRep: Representative | null;
  setRepresentatives: (reps: Representative[]) => void;
  selectRepresentative: (rep: Representative) => void;
}

const useStore = create<AppStore>(set => ({
  representatives: [],
  selectedRep: null,
  setRepresentatives: reps => set({ representatives: reps }),
  selectRepresentative: rep => set({ selectedRep: rep }),
}));
```

### 2. Server State (SWR)

```typescript
const { data, error, isLoading } = useSWR(`/api/representative/${id}`, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000,
});
```

## Testing Strategy

### 1. Unit Tests (Jest)

```typescript
describe('RepresentativeService', () => {
  it('finds representatives by ZIP', async () => {
    const reps = await service.findByZip('94114');
    expect(reps).toHaveLength(3);
  });
});
```

### 2. Integration Tests

```typescript
describe('API Routes', () => {
  it('returns representatives for valid ZIP', async () => {
    const res = await fetch('/api/representatives?zip=94114');
    expect(res.status).toBe(200);
  });
});
```

### 3. E2E Tests (Playwright)

```typescript
test('complete user journey', async ({ page }) => {
  await page.goto('/');
  await page.fill('[name="zip"]', '94114');
  await page.click('button[type="submit"]');
  await expect(page.locator('.representative-card')).toBeVisible();
});
```

## Deployment

### 1. Build Process

```bash
# Production build
npm run build

# Output structure
.next/
├── static/       # Static assets
├── server/       # Server-side code
└── cache/        # Build cache
```

### 2. Environment Configuration

```env
# Production variables
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://civ.iq
CONGRESS_API_KEY=xxx
FEC_API_KEY=xxx
CENSUS_API_KEY=xxx
SENTRY_DSN=xxx
```

### 3. CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run validate:all
      - run: npm run build
      - uses: vercel/action@v20
```

## Monitoring & Observability

### 1. Error Tracking (Sentry)

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 2. Performance Monitoring

```typescript
export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (metric.label === 'web-vital') {
    console.log(metric);
    // Send to analytics
  }
}
```

### 3. Health Checks

```typescript
// /api/health
export async function GET() {
  const checks = await runHealthChecks();
  return NextResponse.json({
    status: checks.allPassing ? 'healthy' : 'degraded',
    services: checks.results,
  });
}
```

## Scalability Considerations

### 1. Database Strategy

Currently using file-based data with API caching. Future considerations:

- PostgreSQL for relational data
- Redis for session management
- ElasticSearch for full-text search

### 2. Microservices Migration Path

Potential service breakdown:

- Representative Service
- Voting Service
- Finance Service
- News Aggregation Service
- District Service

### 3. CDN Strategy

Static assets served from edge:

- Images from Vercel CDN
- District boundaries from PMTiles
- API responses cached at edge

## Design Decisions

### Why Next.js App Router?

- Server Components for better SEO
- Streaming SSR for performance
- Built-in API routes
- Excellent DX with hot reload

### Why TypeScript?

- Type safety prevents runtime errors
- Better IDE support
- Self-documenting code
- Easier refactoring

### Why SWR over React Query?

- Smaller bundle size
- Simpler API
- Built by Vercel (Next.js team)
- Sufficient for our needs

### Why Tailwind CSS?

- Consistent design system
- Smaller CSS bundle
- Rapid prototyping
- Good documentation

## Future Considerations

### Technical Improvements

- [ ] Implement GraphQL for flexible queries
- [ ] Add WebSocket support for real-time updates
- [ ] Implement service workers for offline support
- [ ] Add machine learning for prediction models
- [ ] Implement blockchain for voting verification

### Infrastructure Scaling

- [ ] Multi-region deployment
- [ ] Database sharding
- [ ] Kubernetes orchestration
- [ ] Message queue for async processing
- [ ] API Gateway for rate limiting

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components)
- [Vercel Architecture](https://vercel.com/docs/concepts/architecture)
