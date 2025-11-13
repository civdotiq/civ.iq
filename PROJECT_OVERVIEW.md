# CIV.IQ (civic-intel-hub) - Comprehensive Technical & Conceptual Overview

**Last Updated**: November 11, 2025
**Version**: 0.1.0
**Status**: Production-Ready Federal Platform, State Features in Development

---

## I. PROJECT IDENTITY & MISSION

### Core Mission

CIV.IQ is a Progressive Web Application that democratizes access to government data by connecting citizens with their elected representatives at federal, state, and local levels. The platform serves as a civic transparency engine, transforming complex government data into accessible, actionable information.

### Fundamental Principles

1. **Zero Mock Data Policy**: Every data point displayed comes from official government APIs or is explicitly marked as unavailable. No synthetic, generated, or fake data ever.
2. **Radical Transparency**: All data sources are attributed with clear links to government APIs and databases.
3. **Type Safety First**: 100% TypeScript compliance with strict null safety and zero compilation errors.
4. **Performance as a Feature**: Sub-3-second page loads, sub-200ms API responses, aggressive caching strategies.
5. **Honest Error Handling**: When data is unavailable, the system says so rather than generating misleading placeholder content.

### Project Location & Environment

- **Repository**: D:\civic-intel-hub
- **Platform**: Linux (WSL2) - Microsoft Standard WSL2 5.10.102.1
- **Runtime**: Node.js 18+ LTS
- **Deployment**: Vercel with Edge Network CDN
- **Development Status**: 100% TypeScript compliant, zero build errors

---

## II. TECHNICAL ARCHITECTURE

### Technology Stack

#### Frontend Layer

- **Framework**: Next.js 15.5.2 (App Router architecture)
- **Language**: TypeScript 5.8.3 (strict mode, zero `any` types)
- **UI Library**: React 18.2.0 (Server Components + Client Components)
- **Styling**: Tailwind CSS 3.4.1 (Otl Aicher/Dieter Rams-inspired geometric modernism)
- **State Management**:
  - Zustand 5.0.6 (client state)
  - SWR 2.3.4 (server state with intelligent caching)
- **Data Visualization**:
  - Recharts 3.0.0 (charts and graphs)
  - D3.js 7.9.0 (modular imports for custom visualizations)
  - MapLibre GL JS 5.7.0 (interactive maps)
- **Maps**:
  - PMTiles 4.3.0 (vector tile format for district boundaries)
  - Leaflet alternative with MapLibre for lighter bundle

#### Backend Layer

- **Runtime**: Node.js 18+ with TypeScript
- **API Routes**: Next.js API Routes (REST architecture)
- **Caching**:
  - Redis (ioredis 5.6.1) for production
  - LRU-cache 10.4.3 as in-memory fallback
- **Rate Limiting**: Custom implementation with `limiter` 3.0.0
- **Data Validation**: Zod 4.1.11 for runtime type checking
- **XML Parsing**: fast-xml-parser 5.2.5 (Senate voting records)

#### Data Processing & GIS

- **Geospatial**:
  - MapLibre GL JS for rendering
  - PMTiles for efficient vector tile streaming
  - Census TIGER/Line shapefiles (2023+ redistricting data)
- **Vector Tiles**:
  - ogr2ogr for shapefile conversion
  - Tippecanoe for PMTiles generation
  - Sub-meter accuracy for all district boundaries
- **File Formats**:
  - GeoJSON for intermediate processing
  - PMTiles for production serving (95MB → 24MB optimization)

#### Infrastructure

- **Hosting**: Vercel (serverless Next.js deployment)
- **CDN**: Vercel Edge Network (global distribution)
- **Monitoring**: Sentry (error tracking and performance monitoring)
- **Analytics**: Vercel Analytics (web vitals tracking)
- **CI/CD**: GitHub Actions with automated validation gates

### Architecture Patterns

#### 1. Layered Architecture

```
┌─────────────────────────────────────────┐
│     Presentation Layer                  │
│  (React Components, Server & Client)    │
├─────────────────────────────────────────┤
│     Application Layer                   │
│  (Hooks, State Management, SWR)         │
├─────────────────────────────────────────┤
│     Service Layer                       │
│  (API Clients, Data Transformers)       │
├─────────────────────────────────────────┤
│     Data Layer                          │
│  (TypeScript Types, API Responses)      │
└─────────────────────────────────────────┘
```

#### 2. API Gateway Pattern

All external API calls are proxied through Next.js API routes:

```
Client → /api/endpoint → [Cache Check] → External API
                            ↓
                      [Rate Limiting]
                            ↓
                      [Error Handling]
                            ↓
                      [Data Transform]
```

#### 3. Repository Pattern

Data access abstracted through service modules:

- `RepresentativeService`: Federal legislator operations
- `StateLegislatureCoreService`: State legislator operations
- `CensusAPIService`: Demographic and geographic data
- `DistrictEnhancementService`: Multi-source district analytics

#### 4. OODA Debugging Framework

Custom debugging methodology for complex issues:

- **Observe**: Gather all error data and context
- **Orient**: Analyze patterns and identify root causes
- **Decide**: Choose optimal solution approach
- **Act**: Implement with validation at each step

---

## III. CORE FEATURES & CAPABILITIES

### Federal Government Coverage (100% Production-Ready)

#### 1. Representative Profiles

- **Data Sources**: congress-legislators (GitHub), Congress.gov API
- **Coverage**: All 535 federal legislators (100 senators + 435 representatives)
- **Information Depth**:
  - Biographical data (birth date, place, education from Wikidata)
  - Current term details (office, phone, address, websites)
  - Committee assignments (standing committees, subcommittees, leadership roles)
  - Social media presence (Twitter, Facebook, YouTube, Instagram, Mastodon)
  - Contact information (DC office, district offices, contact forms)
  - Historical terms and party affiliations
  - Photo pipeline: 6-source fallback system (99% reliability)

#### 2. Voting Records

- **House Votes**: Congress.gov API with real-time roll call data
- **Senate Votes**: Direct Senate.gov XML parsing (custom CORS proxy)
- **Features**:
  - Complete voting history with bill context
  - Party-line alignment analysis
  - Key vote identification
  - Vote detail pages showing all 100 senators' positions
  - Bioguide ID to LIS Member ID mapping for Senate votes
  - Enhanced name matching ("Bernie" ↔ "Bernard" variations)

#### 3. Campaign Finance

- **Data Source**: FEC API (Federal Election Commission)
- **Integration**: Bioguide → FEC ID mapping via congress-legislators
- **Analytics**:
  - Total raised/spent/cash on hand
  - Industry categorization (50+ employer mappings)
  - Bundled contributions (employee + PAC linking)
  - Independent expenditures (Schedule E tracking)
  - Geographic breakdown by state
  - Funding diversity metrics
  - Data quality indicators (completeness percentages)

#### 4. Legislative Tracking

- **Bill Sponsorship**: Primary sponsors and cosponsors
- **Bill Status**: Real-time status from Congress.gov
- **Legislative Effectiveness**: Bills passed, success rates
- **Committee Activity**: Bills by committee assignment

#### 5. News & Media Integration

- **Primary Source**: GDELT V2 DOC API (real-time global news)
- **Backup Sources**: NewsAPI, Google News RSS
- **Features**:
  - Intelligent deduplication (story clustering)
  - 10 political theme tracking (healthcare, economy, immigration, etc.)
  - Sentiment analysis (positive/neutral/negative)
  - Source verification (legitimate news outlets only)
  - Time-based aggregation (7/30/90 day windows)

#### 6. District Intelligence

- **Boundaries**: Census TIGER/Line 2023+ (119th Congress redistricting)
- **Format**: PMTiles vector tiles (64MB optimized from 306MB GeoJSON)
- **Demographics**: Census ACS 5-Year Estimates
  - Population, median age, median income
  - Race/ethnicity breakdowns
  - Education levels
  - Employment statistics
- **Economic Profile**: BLS data
  - Unemployment rates
  - Labor force participation
  - Job growth trends
- **Infrastructure**: FCC data
  - Broadband availability
  - Fiber access
  - Digital divide index

### State Legislature Coverage (In Production)

#### 1. State Representative Profiles

- **Data Source**: OpenStates v3 REST API (migrated from v2 GraphQL)
- **Coverage**: 110+ state legislators across all 50 states + DC
- **Performance**: 50% faster than previous implementation (direct service layer)
- **Features**:
  - Legislator details (name, party, chamber, district)
  - Contact information (email, phone, addresses)
  - Committee assignments (with role and chamber)
  - Social media links
  - Official websites and photos

#### 2. State Bills & Voting

- **Bill Tracking**: OpenStates v3 bill endpoints
- **Pagination**: Proper handling (50 legislators/page, 20 bills/page max)
- **Features**:
  - Sponsored bills by legislator
  - Bill status and latest actions
  - Bill abstracts and summaries
  - Session-based filtering

#### 3. State District Mapping

- **Coverage**: All 7,383 state legislative districts (upper and lower chambers)
- **Data Source**: Census TIGER/Line 2025 shapefiles
- **Format**: PMTiles with separate layers (sldl for lower, sldu for upper)
- **Size Optimization**: 95MB → 24MB (75% reduction via max-zoom 12→10)
- **Features**:
  - Interactive boundary visualization
  - District-to-legislator mapping
  - Automatic fly-to district centroid
  - Neighboring district navigation

#### 4. Address Geocoding

- **Geocoding**: U.S. Census Bureau Geocoding API
- **District Lookup**: OpenStates district identification
- **Features**:
  - Full address to coordinates conversion
  - State legislative district identification (upper and lower)
  - Federal district identification
  - Combined legislator lookup (state + federal)

### Search & Discovery

#### 1. ZIP Code Search

- **Coverage**: 39,363 ZIP codes mapped to districts
- **Performance**: O(1) lookup, sub-millisecond average
- **Multi-District Support**: 6,569 complex ZIPs with district selection
- **Data Source**: OpenSourceActivismTech + HUD USPS Crosswalk

#### 2. Advanced Search

- **Filters**: Party, state, chamber, committee, seniority, finance ranges
- **Full-Text**: Fuse.js 7.1.0 for fuzzy matching
- **Faceted Navigation**: Real-time filter counts

#### 3. Interactive Maps

- **District Boundaries**: MapLibre GL JS with PMTiles
- **Click-to-Navigate**: Instant district details
- **Fullscreen Mode**: Immersive boundary exploration
- **Performance**: Streaming tiles (500KB-2MB per view vs. full 200MB)

---

## IV. DATA SOURCES & INTEGRATIONS

### Government APIs (Primary Sources)

#### 1. Congress.gov API

- **Purpose**: Legislative data, voting records, bill tracking
- **Endpoints**:
  - `/v3/member/{bioguideId}` - Member details
  - `/v3/member/{bioguideId}/sponsored-legislation` - Bills
  - `/v3/bill/{congress}/{billType}/{billNumber}` - Bill details
  - `/v3/vote` - House voting records
- **Rate Limits**: Generous (100 requests/hour)
- **Caching**: 1 hour for member data, 15 minutes for votes

#### 2. FEC API (Federal Election Commission)

- **Purpose**: Campaign finance data
- **Endpoints**:
  - `/v1/candidate/{candidateId}/totals` - Financial summaries
  - `/v1/schedules/schedule_a` - Individual contributions
  - `/v1/schedules/schedule_e` - Independent expenditures
- **Rate Limits**: 1000 requests/hour
- **Caching**: 1 hour (finance data changes slowly)

#### 3. Census Bureau APIs

- **Geographic**: TIGER/Line Web Services
  - Congressional district boundaries (2023+ redistricting)
  - State legislative district boundaries (2025 data)
  - ZIP Code Tabulation Areas (ZCTAs)
- **Demographic**: American Community Survey (ACS) 5-Year Estimates
  - Population statistics
  - Income and poverty data
  - Education and employment metrics
- **Geocoding**: Census Geocoding API
  - Address to coordinates conversion
  - Legislative district identification

#### 4. Senate.gov XML Feeds

- **Purpose**: Senate roll call votes (Congress.gov lacks Senate vote details)
- **Format**: XML files per vote
- **Parsing**: custom fast-xml-parser implementation
- **CORS Workaround**: Custom Next.js proxy (`/api/senate-votes/[voteNumber]`)
- **Member Matching**: LIS ID to Bioguide ID mapping with fuzzy name matching

#### 5. OpenStates v3 API

- **Purpose**: State legislature data
- **Architecture**: REST API (migrated from v2 GraphQL October 2025)
- **Endpoints**:
  - `/people?jurisdiction={state}` - All legislators
  - `/people/{ocd-id}` - Individual legislator
  - `/bills?sponsor={ocd-id}` - Sponsored bills
- **Pagination**: Max 50 legislators/page, 20 bills/page
- **Caching**: 30 minutes for legislator profiles

#### 6. BLS (Bureau of Labor Statistics)

- **Purpose**: Employment and economic data
- **Metrics**: Unemployment rates, labor force participation, job growth
- **Granularity**: State and MSA (Metropolitan Statistical Area) level

#### 7. FCC (Federal Communications Commission)

- **Purpose**: Broadband and connectivity data
- **Metrics**: Fiber availability, download/upload speeds, digital divide index
- **Source**: FCC Form 477 data and broadband maps

### Secondary Sources

#### 8. GDELT V2 DOC API

- **Purpose**: Global news monitoring
- **Coverage**: 150+ countries, real-time updates every 15 minutes
- **Features**: Story clustering, sentiment analysis, theme extraction
- **Deduplication**: Custom algorithm for identical story removal

#### 9. Wikidata & Wikipedia

- **Purpose**: Biographical enrichment
- **Data**: Birth places, education, occupations, awards
- **Integration**: SPARQL queries for Wikidata, MediaWiki API for Wikipedia
- **Caching**: 7 days (biographical data rarely changes)

---

## V. DEVELOPMENT PHILOSOPHY & PRINCIPLES

### Quality Gates (Must Pass Before Commit)

1. **TypeScript Compilation**: `npm run type-check` - Zero errors
2. **Linting**: `npm run lint` - Zero warnings/errors
3. **Unit Tests**: `npm test` - All passing
4. **Build Validation**: `npm run build` - Successful production build

### Code Quality Standards

- **No `any` Types**: Full type safety with explicit interfaces
- **Null Safety**: Optional chaining (`?.`) and nullish coalescing (`??`) throughout
- **Error Boundaries**: React error boundaries on all major sections
- **Input Sanitization**: Zod validation on all user inputs and API responses
- **XSS Protection**: isomorphic-dompurify for HTML content

### Performance Principles

- **30-Line Validation Rule**: Never write more than 30 lines without validation
- **Code Splitting**: Dynamic imports for heavy components
- **Virtual Scrolling**: react-window for large lists (react-window 1.8.11)
- **Image Optimization**: Next.js Image component with blur placeholders
- **Bundle Optimization**: Modular D3 imports (not full bundle)

### Data Integrity Framework

1. **Source Verification**: All data traced to government API
2. **Transparent Errors**: "Data unavailable" instead of mock data
3. **Attribution**: Source links on every data visualization
4. **Validation Pipeline**: Automated tests for data accuracy
5. **Cache Invalidation**: Admin API for cache management

### Development Workflow (Iterative OODA-inspired)

1. **Explore**: Understand existing patterns before coding
2. **Hypothesis**: State approach and expected outcome
3. **Implement**: Small chunks (20-30 lines max)
4. **Validate**: Immediate type-check and lint
5. **Iterate**: Continue only if passing

---

## VI. CURRENT STATUS & ROADMAP

### Production-Ready Features (November 2025)

- ✅ Federal representatives (535/535)
- ✅ ZIP code lookup (39,363 ZIPs)
- ✅ Campaign finance (FEC integration)
- ✅ Voting records (House + Senate)
- ✅ News integration (GDELT + backups)
- ✅ Interactive district maps (435 federal districts)
- ✅ Committee profiles (all standing committees)
- ✅ Bill tracking (Congress.gov)
- ✅ State legislator profiles (110+ legislators)
- ✅ State district mapping (7,383 districts)
- ✅ Address geocoding (Census + OpenStates)

### Recent Milestones (Last 90 Days)

- **November 2025**: PMTiles optimization (95MB → 24MB, 75% size reduction)
- **November 2025**: OpenStates pagination fix (proper API limits)
- **November 2025**: OpenStates security improvements (API key redaction)
- **November 2025**: Congressional constants hardcoding (performance boost)
- **October 2025**: OpenStates v3 migration (GraphQL → REST)
- **October 2025**: Address geocoding integration
- **September 2025**: Otl Aicher design system (416 files updated)
- **September 2025**: District enhancement APIs (BLS, FCC, DoE integration)

### Known Issues & Limitations

- **Limited FEC Coverage**: ~60% of representatives have FEC ID mappings
- **District Boundary Accuracy**: Some geometries need refinement
- **OpenStates Committee Data**: ~30% coverage (API limitation)
- **OpenStates Pagination**: Hard limits (50 legislators, 20 bills per page)

### Upcoming Features (Q4 2025 - Q1 2026)

- Enhanced district analytics
- Performance optimizations (caching strategies, API batching)
- Mobile layout refinements
- Local government integration (mayors, city councils)
- Enhanced state bill tracking

---

## VII. KEY IMPLEMENTATION DETAILS

### File Structure

```
civic-intel-hub/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # 90+ API endpoints
│   │   │   ├── representative/       # Federal legislator endpoints
│   │   │   ├── state-legislature/    # State legislator endpoints
│   │   │   ├── districts/            # District data endpoints
│   │   │   └── health/               # System health checks
│   │   ├── (public)/                 # Public routes (landing, search)
│   │   └── (civic)/                  # Protected civic data routes
│   ├── components/                   # 200+ React components
│   │   ├── ui/                       # Base UI components
│   │   ├── representatives/          # Federal rep components
│   │   └── shared/                   # Shared utilities
│   ├── features/                     # Feature modules
│   │   ├── campaign-finance/         # FEC integration
│   │   ├── legislation/              # Bills & votes
│   │   └── representatives/          # Member data
│   ├── lib/                          # Core libraries
│   │   ├── api/                      # API clients (congress.ts, fec.ts, census.ts)
│   │   ├── services/                 # Business logic services
│   │   └── utils/                    # Utility functions
│   ├── types/                        # TypeScript definitions
│   │   ├── representative.ts         # 457 lines of federal types
│   │   ├── state-legislature.ts      # State legislature types
│   │   └── district-enhancements.ts  # District analytics types
│   └── hooks/                        # Custom React hooks
│       ├── useRepresentative.ts      # SWR-based data fetching
│       └── useBatchApi.ts            # Parallel endpoint calls
├── public/
│   ├── data/                         # Static JSON data
│   │   ├── districts/                # District metadata
│   │   └── state-districts/          # State district manifests
│   └── maps/                         # PMTiles vector tiles
│       ├── congressional_districts_119.pmtiles  # 64MB federal
│       └── state_legislative_districts.pmtiles  # 24MB state
├── scripts/                          # Build and processing scripts
│   ├── process-state-legislative-districts.mjs  # TIGER/Line processing
│   ├── validate-state-district-ids.mjs          # OpenStates validation
│   └── process-district-boundaries.mjs          # Federal boundaries
└── docs/                             # Comprehensive documentation
    ├── API_REFERENCE.md              # 1300+ lines of API docs
    ├── ARCHITECTURE.md               # System design
    ├── PHASE_TRACKER.md              # Development history
    └── development/                  # Implementation guides
```

### Critical Code Patterns

#### 1. Representative Type System (src/types/representative.ts)

```typescript
export interface EnhancedRepresentative extends BaseRepresentative {
  bioguideId: string; // Primary key
  name: string; // Display name
  party: string; // Political affiliation
  state: string; // Two-letter code
  district?: string; // House only
  chamber: 'House' | 'Senate'; // Legislative body

  // Enhanced biographical data
  biography?: {
    birthPlace?: string; // From Wikidata
    education?: string[]; // Colleges/universities
    occupations?: string[]; // Pre-politics careers
    wikipediaSummary?: string; // First paragraph
  };

  // Cross-platform identifiers
  ids?: {
    govtrack?: number;
    opensecrets?: string; // FEC mapping
    fec?: string[]; // Campaign committees
    wikidata?: string; // Wikidata QID
  };

  // Data quality metadata
  metadata?: {
    lastUpdated: string;
    dataSources: Array<'congress.gov' | 'congress-legislators' | 'fec'>;
    completeness?: {
      basicInfo: boolean;
      socialMedia: boolean;
      finance: boolean;
    };
  };
}
```

#### 2. Batch API Pattern (src/app/api/representative/[bioguideId]/batch/route.ts)

```typescript
// Parallel data fetching reduces round-trips by 80%
export async function POST(request: Request, { params }: { params: { bioguideId: string } }) {
  const { endpoints } = await request.json();

  // Parallel execution
  const results = await Promise.allSettled([
    endpoints.includes('votes') ? fetchVotes(params.bioguideId) : null,
    endpoints.includes('bills') ? fetchBills(params.bioguideId) : null,
    endpoints.includes('finance') ? fetchFinance(params.bioguideId) : null,
    endpoints.includes('news') ? fetchNews(params.bioguideId) : null,
  ]);

  return NextResponse.json({
    data: aggregateResults(results),
    metadata: {
      requestedEndpoints: endpoints,
      successfulEndpoints: getSuccessful(results),
      totalTime: performance.now() - startTime,
    },
  });
}
```

#### 3. Caching Strategy (Multi-Layer)

```typescript
// 1. Browser cache (SWR)
const { data } = useSWR(`/api/representative/${id}`, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1 minute
});

// 2. Server-side Redis
const cached = await redis.get(`rep:${bioguideId}`);
if (cached) return JSON.parse(cached);

// 3. In-memory LRU fallback
const lruCached = lruCache.get(`rep:${bioguideId}`);
if (lruCached) return lruCached;

// Cache with TTL
await redis.setex(`rep:${bioguideId}`, 3600, JSON.stringify(data));
```

#### 4. State Legislature Service (Direct Service Layer)

```typescript
// src/lib/services/StateLegislatureCoreService.ts
export class StateLegislatureCoreService {
  async getLegislators(state: string, chamber?: 'upper' | 'lower') {
    const cacheKey = `state:${state}:${chamber || 'all'}`;

    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from OpenStates v3 REST API
    const legislators = await this.openStatesClient.getPeople({
      jurisdiction: state,
      chamber,
      per_page: 50, // API maximum
    });

    // Transform and cache (30 minutes)
    const transformed = legislators.map(this.transformLegislator);
    await this.cache.set(cacheKey, transformed, 1800);

    return transformed;
  }
}
```

---

## VIII. PERFORMANCE & OPTIMIZATION

### Current Metrics (November 2025)

- **Page Load**: < 2 seconds average (target: < 3s) ✅
- **API Response**: < 200ms average (target: < 500ms) ✅
- **Bundle Size**: 1.8MB (target: < 2MB) ✅
- **Lighthouse Score**: 95+ across all categories ✅
- **TypeScript Errors**: 0 (target: 0) ✅
- **Test Coverage**: 78% (target: 80%) ⚠️

### Optimization Strategies

#### 1. PMTiles Vector Tile Optimization

- **Federal Districts**: 306MB GeoJSON → 64MB PMTiles (79% reduction)
- **State Districts**: 95MB → 24MB (75% reduction)
- **Technique**: Reduced max-zoom from 12 to 10 (no quality loss at relevant zoom levels)
- **Streaming**: Loads only viewport tiles (500KB-2MB per view)

#### 2. Code Splitting & Lazy Loading

```typescript
// Heavy components loaded on-demand
const CampaignFinanceChart = dynamic(
  () => import('./CampaignFinanceChart'),
  {
    loading: () => <Skeleton />,
    ssr: false  // Client-side only for D3
  }
);
```

#### 3. Image Pipeline (6-Source Fallback)

1. congress-legislators official photos
2. Congress.gov API photos
3. Wikidata Commons images
4. Wikipedia infobox images
5. State legislature official photos
6. Generic placeholder (party-colored)

- **Result**: 99% photo coverage, average load time < 100ms

#### 4. Virtual Scrolling for Large Lists

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={legislators.length}
  itemSize={100}
  width="100%"
>
  {LegislatorRow}
</FixedSizeList>
```

#### 5. Database-Free Architecture

- **No Traditional Database**: All data from API calls + static JSON
- **Benefits**:
  - Zero database maintenance
  - Instant deploys (no migrations)
  - Scales horizontally (stateless)
- **Trade-offs**:
  - Relies on external API reliability
  - Aggressive caching required

---

## IX. DATA MODELS & TYPE SYSTEM

### Core Types (457 lines in representative.ts)

#### Representative Hierarchy

```
BaseRepresentative (core fields)
  ↓
EnhancedRepresentative (with congress-legislators data)
  ↓
RepresentativeSummary (list view)
  ↓
RepresentativeSearchResult (with relevance scoring)
```

#### State Legislature Types

```typescript
export interface StateLegislator {
  id: string; // OpenStates OCD-ID format
  name: string;
  party: 'Democratic' | 'Republican' | 'Independent' | 'Green' | 'Libertarian';
  chamber: 'upper' | 'lower'; // Senate/House at state level
  district: string; // District number
  state: string; // Two-letter code
  photoUrl?: string;
  email?: string;
  committees?: Array<{
    name: string;
    role: 'Chair' | 'Vice Chair' | 'Member';
  }>;
}
```

#### Batch API Response

```typescript
export interface BatchApiResponse {
  success: boolean;
  data: {
    votes?: VoteData[];
    bills?: BillData[];
    finance?: FinanceData;
    news?: NewsData[];
    profile?: EnhancedRepresentative;
  };
  errors: Record<string, string>; // Partial failures allowed
  metadata: {
    timestamp: string;
    requestedEndpoints: string[];
    successfulEndpoints: string[];
    failedEndpoints: string[];
    totalTime: number; // Milliseconds
  };
}
```

### Type Safety Patterns

- **No `any` Types**: Every variable has explicit type
- **Runtime Validation**: Zod schemas for API responses
- **Type Guards**: `isEnhancedRepresentative()`, `isRepresentativeSummary()`
- **Branded Types**: `BioguideId`, `FecId`, `OcdId` for ID safety

---

## X. API ARCHITECTURE

### Endpoint Organization (90+ Routes)

```
/api/
├── representative/
│   ├── [bioguideId]/              # Core profile
│   │   ├── votes/                 # Voting records
│   │   ├── bills/                 # Sponsored legislation
│   │   ├── finance/               # Campaign finance
│   │   │   ├── contributors/      # Top donors
│   │   │   ├── industries/        # Industry breakdown
│   │   │   └── expenditures/      # Spending
│   │   ├── news/                  # Recent news
│   │   ├── committees/            # Committee assignments
│   │   └── batch/                 # Parallel data fetch
│   └── by-district/               # District lookup
├── representatives/               # List all
│   ├── all/                       # Complete roster
│   └── by-district/               # Filter by district
├── state-legislature/
│   └── [state]/
│       ├── legislator/[id]/       # State legislator profile
│       │   ├── bills/             # State bills
│       │   └── votes/             # State votes
│       └── committees/            # State committees
├── districts/
│   └── [districtId]/
│       ├── economic-profile/      # BLS + FCC data
│       ├── services-health/       # DoE + CDC data
│       └── government-spending/   # USASpending data
├── vote/[voteId]/                 # Detailed vote page
├── bill/[billId]/                 # Bill details
├── committee/[committeeId]/       # Committee profile
├── search/                        # Advanced search
├── geocode/                       # Address lookup
└── health/                        # System status
```

### Response Format (Consistent)

```json
{
  "data": {
    /* Payload */
  },
  "success": true,
  "error": null,
  "metadata": {
    "timestamp": "2025-11-11T12:00:00Z",
    "cached": true,
    "ttl": 3600,
    "source": "congress.gov"
  }
}
```

### Error Handling

```typescript
class ApiError extends Error {
  constructor(
    public code: string, // NOT_FOUND, RATE_LIMITED, etc.
    public statusCode: number, // HTTP status
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

// Centralized error handler
return NextResponse.json(
  {
    error: apiError.message,
    code: apiError.code,
  },
  { status: apiError.statusCode }
);
```

---

## XI. DEVELOPMENT COMMANDS

### Quality Validation

```bash
npm run lint              # ESLint checks
npm test                  # Jest unit tests
npm run type-check        # TypeScript validation
npm run build             # Production build
npm run validate:all      # ALL checks at once (CI/CD)
```

### Development

```bash
npm run dev               # Start dev server (localhost:3000)
npm run dev:clean         # Clean .next and restart
```

### Data Processing

```bash
npm run process-census                    # Update Census data
npm run process-zip-districts             # Process ZIP mappings
npm run process-state-legislative-districts  # State boundaries
```

### Testing & Debugging

```bash
npm run diagnose:apis     # Test API connectivity
npm run test:e2e          # Playwright end-to-end tests
npm run perf:benchmark    # Performance benchmarking
```

---

## XII. SECURITY & COMPLIANCE

### Security Measures

1. **Input Sanitization**: Zod validation on all user inputs
2. **XSS Protection**: isomorphic-dompurify for HTML content
3. **API Key Protection**: Environment variables only, never in client code
4. **Rate Limiting**: Custom implementation per endpoint
5. **CORS**: Strict policies, whitelisted origins only
6. **Dependency Auditing**: `npm audit` on every install
7. **No Math.random()**: Eliminated for data generation (security audit)

### Compliance

- **Data Attribution**: All sources clearly cited
- **Privacy**: No user tracking without consent
- **Accessibility**: WCAG 2.1 AA compliance (in progress)
- **License**: MIT with attribution requirements

---

## XIII. UNIQUE TECHNICAL CHALLENGES & SOLUTIONS

### 1. Senate Vote Data Access

**Problem**: Congress.gov API lacks detailed Senate vote data (member positions)
**Solution**: Custom XML parser for Senate.gov feeds with CORS proxy
**Implementation**: `/api/senate-votes/[voteNumber]` endpoint, LIS ID mapping

### 2. FEC ID Mapping

**Problem**: Bioguide IDs don't directly map to FEC candidate IDs
**Solution**: congress-legislators `legislators-current.yaml` file contains FEC mappings
**Coverage**: ~60% of current representatives have FEC IDs

### 3. Multi-District ZIP Codes

**Problem**: 6,569 ZIP codes span multiple congressional districts
**Solution**: ZIP-to-district proxy mapping with user selection UI
**Performance**: O(1) lookup via TypeScript constant object

### 4. State District ID Normalization

**Problem**: Census TIGER uses zero-padded IDs ("012"), OpenStates doesn't ("12")
**Solution**: Normalization function removes leading zeros, handles "AL" (at-large)
**Edge Cases**: Nebraska unicameral, multi-member districts

### 5. PMTiles Size Optimization

**Problem**: State legislative district PMTiles initially 95MB (too large for fast loading)
**Solution**: Reduced max-zoom from 12 to 10 (districts don't need building-level detail)
**Result**: 75% size reduction (95MB → 24MB), zero quality loss at relevant zoom levels

---

## XIV. PROJECT PHILOSOPHY & CULTURE

### Core Values

1. **Authenticity Over Aesthetics**: Real data trumps beautiful mock-ups
2. **Honest Errors**: "Data unavailable" is better than fake data
3. **Performance as a Feature**: Speed is user experience
4. **Type Safety as Quality**: Compilation errors prevent runtime bugs
5. **Progressive Enhancement**: Core features work without JavaScript

### Development Culture

- **Ask Before Assuming**: Clarify requirements before implementing
- **Simple Before Complex**: One direct solution before abstractions
- **Validate Early, Validate Often**: Never write >30 lines without checking
- **Document As You Go**: Comments and docs are first-class code

### Architectural Decisions

- **Why Next.js App Router?** Server Components for SEO, streaming SSR, built-in API routes
- **Why TypeScript Strict?** Runtime errors prevented at compile time
- **Why SWR over React Query?** Smaller bundle, simpler API, Vercel-native
- **Why No Database?** Reduces complexity, all data from authoritative government sources
- **Why PMTiles?** Efficient vector tiles, CDN-friendly, streaming capability

---

## XV. FUTURE VISION

### Technical Roadmap

- GraphQL API layer for flexible client queries
- WebSocket support for real-time legislative updates
- Service workers for offline PWA functionality
- Machine learning for bill outcome prediction
- Multi-region deployment (edge computing)

### Feature Roadmap

- Local government integration (mayors, city councils, county commissioners)
- Municipal ordinance tracking
- Town hall calendar and notifications
- Petition platform integration
- Community forums for civic engagement
- Voter registration assistance
- Election reminders and polling place locators

### Data Expansion

- Historical congressional data (back to founding)
- International legislative bodies (starting with Canada, UK)
- Judicial branch tracking (Supreme Court, federal judges)
- Executive branch (cabinet members, agency heads)
- Lobbying activity visualization (enhanced OpenSecrets integration)

---

## XVI. PROJECT METADATA

### Maintainer

- **Name**: Mark Sandford
- **Email**: mark@marksandford.dev
- **License**: MIT with attribution requirements

### Key Statistics (November 2025)

- **Total Files**: 800+ TypeScript/React files
- **Lines of Code**: ~150,000 (excluding dependencies)
- **API Endpoints**: 90+ routes
- **React Components**: 200+ components
- **Type Definitions**: 50+ interface files
- **Government APIs**: 9 primary integrations
- **Test Coverage**: 78% (target: 80%)
- **Documentation**: 15+ comprehensive markdown files

### Data Coverage

- **Federal Representatives**: 100% (535/535)
- **State Legislators**: 110+ across all states
- **Congressional Districts**: 100% (435/435 + territories)
- **State Legislative Districts**: 100% (7,383/7,383)
- **ZIP Codes**: 84.4% (39,363/46,620)

---

## CONCLUSION

CIV.IQ represents a comprehensive, production-grade civic transparency platform built on principles of data authenticity, type safety, and performance optimization. The architecture leverages modern web technologies (Next.js 15, TypeScript 5.8, React 18) while maintaining a strict "zero mock data" policy that ensures all information comes from authoritative government sources.

The platform's technical sophistication is matched by its commitment to accessibility and user experience, featuring sub-2-second page loads, intelligent caching strategies, and a responsive design that works across devices. With 90+ API endpoints, 200+ React components, and integrations with 9 government APIs, CIV.IQ serves as a comprehensive civic intelligence hub for citizens seeking to understand and engage with their elected representatives.

The project continues to evolve with active development of state and local government features, maintaining its core mission of democratizing access to government data through transparent, performant, and reliable technology.
