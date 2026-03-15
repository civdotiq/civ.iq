# Architecture — CIV.IQ Platform

## Overview

CIV.IQ is a civic intelligence platform built with Next.js 16, using the App Router for server-side rendering, incremental static regeneration, and API route handling. The platform aggregates data from 18+ government APIs, cross-references them through a join layer, and runs statistical analysis via a machine learning intelligence layer.

## Technology Stack

### Frontend

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5.8.3 (strict mode)
- **UI Library**: React 18.2.0
- **Styling**: Tailwind CSS 3.4.1
- **State Management**: Zustand 5.0.6
- **Data Fetching**: SWR 2.3.4
- **Charts**: Recharts 3.0.0, D3.js 7.9.0
- **Maps**: MapLibre GL JS 5.7.0
- **Validation**: Zod 4.1.11

### Backend

- **Runtime**: Node.js 20+ LTS
- **API Routes**: Next.js API Routes (181 endpoints)
- **Caching**: Redis via Upstash REST API (production) and ioredis (development), with in-memory LRU fallback
- **Rate Limiting**: Upstash Ratelimit (production), custom limiter (development)
- **AI**: Google Gemini Flash (primary), OpenAI (fallback) via Vercel AI SDK
- **Search**: Fuse.js for fuzzy matching

### Intelligence Layer

- **Statistics**: simple-statistics (wrapped by @civiq/civic-statistics)
- **ML Inference**: XGBoost model exported to ONNX, loaded in TypeScript
- **Embeddings**: HuggingFace Transformers (all-MiniLM-L6-v2, nli-deberta-v3-xsmall, bert-base-NER)
- **Entity Resolution**: @civiq/entity-resolution (committee aliases, ticker-industry mapping, FEC deduplication)

### Decentralized Publishing

- **Nostr**: nostr-tools 2.23.1 — signed civic events published to relay network
- **ActivityPub**: Federation support for fediverse distribution

### Data Sources

| API                        | Domain                                                     | Auth              |
| -------------------------- | ---------------------------------------------------------- | ----------------- |
| Congress.gov v3            | Bills, representatives, committees, votes                  | API key           |
| FEC API                    | Campaign finance (contributions, expenditures, donors)     | API key           |
| USASpending.gov v2         | Federal spending (contracts, grants, awards)               | None              |
| Federal Register API       | Regulations (proposed rules, final rules, comment periods) | None              |
| GovInfo API                | Congressional hearings, government documents               | API key           |
| Census API                 | Demographics, boundaries, geocoding                        | API key           |
| OpenStates GraphQL         | State legislators, bills, committees, votes                | API key           |
| Senate.gov XML             | Senate voting records                                      | None              |
| House Clerk XML            | House voting records                                       | None              |
| Bureau of Labor Statistics | Employment, wages, labor force                             | None              |
| SEC EDGAR                  | Financial disclosures, stock trades                        | None (User-Agent) |
| Senate LDA                 | Lobbying disclosure filings                                | None              |
| FRED                       | Federal Reserve economic indicators                        | API key           |
| Regulations.gov            | Public comments on proposed rules                          | API key           |
| Wikidata SPARQL            | State executives, judiciary, biographies                   | None              |
| FollowTheMoney.org         | State campaign finance                                     | API key           |
| GDELT v2                   | News aggregation                                           | None              |
| Census TIGER/Line          | District boundary shapefiles                               | None              |

### Cross-Domain Join Layer

10 join endpoints connect the data domains into a linked civic intelligence graph. See [DATA_NETWORK.md](./DATA_NETWORK.md) for the full network map, connection logic, and shared infrastructure.

### Infrastructure

- **Hosting**: Vercel
- **CDN**: Vercel Edge Network
- **Caching**: Upstash Redis (serverless)
- **Maps**: PMTiles on CDN (range requests, no tile server)

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
│       Intelligence Layer            │
│  (Analyzers, ML, Entity Resolution) │
├─────────────────────────────────────┤
│          Service Layer              │
│    (API Clients, Data Sources)      │
├─────────────────────────────────────┤
│           Data Layer                │
│  (Type Definitions, Mappings, Cache)│
└─────────────────────────────────────┘
```

### 2. API Gateway Pattern

All external API calls go through internal API routes:

```
Client → /api/endpoint → External Service
         ↓
     Redis Cache Check
         ↓
     Rate Limiting
         ↓
     Input Validation (Zod)
         ↓
     Error Handling
         ↓
     Response with metadata (dataQuality, sources, cache TTL)
```

### 3. Intelligence Pipeline

Analyzers follow a statistics-first, AI-second pattern:

```
Raw Data (Congress.gov, FEC, LDA, SEC)
    → Entity Resolution (match IDs across systems)
    → Statistical Analysis (simple-statistics)
    → Peer Comparison (Redis mget for baselines)
    → ML Classification (HuggingFace small models, when needed)
    → AI Summary (Gemini Flash, with Flesch-Kincaid ≤ 8 validation)
    → Structured Insight (confidence, methodology, disclaimer)
    → Redis Cache (7–14 day TTL)
```

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # 181 API endpoints
│   │   ├── representative/       # Federal member data
│   │   ├── intelligence/         # Intelligence layer (15 routes)
│   │   │   ├── representative/[bioguideId]/
│   │   │   │   ├── route.ts              # Base insights
│   │   │   │   ├── vote-finance/         # Vote-finance correlation
│   │   │   │   ├── finance-jurisdiction/ # Donor-committee overlap
│   │   │   │   ├── temporal/             # Voting pattern shifts
│   │   │   │   ├── stock-trades/         # STOCK Act analysis
│   │   │   │   ├── vote-prediction/      # ML vote prediction
│   │   │   │   └── influence-chain/      # Full influence chains
│   │   │   ├── committee/[committeeId]/  # Committee intelligence
│   │   │   ├── bill/[billId]/            # Bill intelligence
│   │   │   ├── pac/[committeeId]/        # PAC analysis
│   │   │   ├── district/[districtId]/    # District intelligence
│   │   │   ├── sector/[sector]/leaderboard/ # Industry rankings
│   │   │   ├── address/money-report/     # Address money lookup
│   │   │   ├── federal-register/         # Regulatory analysis
│   │   │   └── influence-clusters/       # Precomputed clusters
│   │   ├── committee/            # Committee data
│   │   ├── bill/                 # Bill data and joins
│   │   ├── spending/             # USASpending data
│   │   ├── districts/            # District data and profiles
│   │   ├── state-legislature/    # OpenStates integration
│   │   └── health/               # Health checks
│   └── (civic)/                  # Public pages
│       ├── representative/       # Federal rep profiles
│       ├── state-legislature/    # State legislator pages
│       ├── districts/            # Congressional districts
│       ├── state-districts/      # State legislative districts
│       ├── legislation/          # Federal bills
│       ├── state-bills/          # State bills
│       ├── committees/           # Committee directory
│       ├── industry/             # Sector analysis + leaderboards
│       ├── influence/            # Influence rankings
│       ├── money-report/         # Address money report
│       ├── regulations/          # Federal Register
│       ├── comment-periods/      # Open comment periods
│       ├── executive-orders/     # Executive orders
│       ├── spending/             # Federal spending
│       ├── topics/               # Policy area pages (12 sectors)
│       └── ...
│
├── components/
│   ├── intelligence/             # 18 insight components
│   │   ├── InsightCard.tsx       # Base insight display
│   │   ├── ConfidenceBadge.tsx   # Confidence indicator
│   │   ├── MoneyReportCard.tsx   # Address money report
│   │   ├── VotePredictionCard.tsx # ML prediction display
│   │   ├── InfluenceChainCard.tsx # Influence chain visualization
│   │   ├── SectorLeaderboard.tsx  # Industry rankings
│   │   ├── PACVoteTable.tsx       # PAC-to-vote tracing
│   │   ├── StockOverlapTable.tsx  # Stock trade analysis
│   │   ├── VoteShiftTimeline.tsx  # Temporal patterns
│   │   └── ...
│   └── ...                       # Shared UI, search, maps, charts
│
├── lib/
│   ├── intelligence/             # Intelligence engine
│   │   ├── analyzers/            # 12 statistical analyzers
│   │   ├── ml/                   # ONNX vote prediction model
│   │   ├── embeddings/           # HuggingFace text pipelines
│   │   ├── clusters/             # Precomputed influence clusters
│   │   ├── entity-resolution/    # Cross-system ID matching
│   │   ├── statistics/           # Civic statistics wrapper
│   │   └── types.ts              # All insight type definitions
│   ├── nostr/                    # Nostr relay publishing
│   ├── activitypub/              # ActivityPub federation
│   ├── data-sources/             # External data services
│   │   ├── federal-register-service.ts
│   │   ├── fred-economic-service.ts
│   │   ├── sec-edgar-service.ts
│   │   ├── senate-lobbying-api.ts
│   │   ├── house-disclosure-service.ts
│   │   └── regulations-gov-service.ts
│   ├── api/                      # API clients (congress, fec, census, wikidata)
│   ├── campaign-finance/         # FEC processing
│   ├── follow-the-money/         # State campaign finance
│   ├── fec/                      # FEC entity resolution
│   └── ...
│
├── features/                     # Feature modules
│   ├── campaign-finance/
│   ├── legislation/
│   ├── representatives/
│   └── state-legislature/
│
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript type definitions
└── styles/                       # Global styles

packages/                         # npm workspace packages
├── civic-statistics/             # @civiq/civic-statistics
└── entity-resolution/            # @civiq/entity-resolution
```

## Data Flow

### 1. Address Lookup Flow

```
User Input (address or ZIP)
    → AddressAutocomplete / GeolocationLookup
    → Census Geocoder (address → district)
    → /api/representatives (ZIP or district)
    → Congress.gov (federal members)
    → OpenStates (state legislators)
    → Parallel intelligence analysis
    → Render representative profiles
```

### 2. Intelligence Analysis Flow

```
Representative Profile Request
    → Parallel data fetches:
        → Congress.gov (votes, committees, sponsored bills)
        → FEC (contributions by sector)
        → Senate LDA (lobbying filings)
        → SEC EDGAR (stock trades, House only)
    → Entity Resolution:
        → Bioguide ID → FEC committee ID
        → Committee codes → agency slugs
        → Ticker symbols → industry sectors
        → LDA issue codes → policy areas
    → Analyzer execution (statistics-first):
        → Finance-Jurisdiction Overlap
        → Vote-Finance Correlation
        → Temporal Vote Shifts
        → Lobbying Pipeline
        → Stock-Committee Overlap
        → Vote Prediction (ONNX model)
    → Peer comparison baselines (Redis mget)
    → AI summary generation (Gemini Flash)
    → Reading level validation (Flesch-Kincaid ≤ 8)
    → Cache results (Redis, 7–14 day TTL)
    → Return structured insights with metadata
```

### 3. Caching Strategy

| Data type             | TTL   | Reason                               |
| --------------------- | ----- | ------------------------------------ |
| Representatives       | 1h    | Changes with new sessions            |
| Votes                 | 15m   | New votes cast during session        |
| Campaign finance      | 1h    | FEC data released quarterly          |
| Intelligence insights | 7–14d | Expensive computation, slow-changing |
| Districts             | 24h   | Boundary data is static              |
| Committees            | 6h    | Leadership changes infrequently      |
| News (GDELT)          | 5m    | Fresh content matters                |
| Join endpoints        | 1–24h | Varies by data volatility            |

Three caching tiers: Redis (Upstash REST or ioredis), LRU in-memory (lru-cache), and HTTP Cache-Control headers for CDN caching.

## API Design

### RESTful Endpoints

```
GET    /api/representatives          # By ZIP code
GET    /api/representative/{id}      # By bioguide ID
GET    /api/intelligence/representative/{id}/vote-finance  # Intelligence
POST   /api/intelligence/address/money-report              # Address lookup
GET    /api/intelligence/sector/{sector}/leaderboard        # Rankings
```

### Response Envelope

All join and intelligence endpoints return a consistent structure:

```typescript
interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
  metadata?: {
    generatedAt: string;
    dataSources: string[];
    dataQuality: 'complete' | 'partial' | 'degraded';
    cached: boolean;
    ttl?: number;
  };
}
```

### Intelligence Insight Structure

```typescript
interface Insight {
  type: string;
  confidence: number; // 0–1
  dataAsOf: string; // ISO timestamp
  methodology: string; // How it was computed
  disclaimer: string; // Correlation ≠ causation
  source: 'statistical' | 'ai-generated' | 'statistical-fallback';
  // ... type-specific fields
}
```

## Performance

### Code Splitting

Dynamic imports for heavy components (maps, charts, intelligence cards). Intelligence insights load independently after the base profile renders.

### Virtual Scrolling

react-window for long lists (voting records, contribution tables).

### Bundle Optimization

- Modular D3 imports (d3-scale, d3-shape — not the full d3 package)
- HuggingFace models loaded on-demand, server-side only
- PMTiles for maps (range requests, no full tile download)

### Map Optimization

District boundaries served as PMTiles (vector tiles via HTTP range requests). Congressional districts: ~64MB total, ~500KB–2MB per page view. State legislative districts: ~200MB total, streamed on demand.

## Security

### Input Validation

All user inputs validated with Zod schemas. XSS prevention via isomorphic-dompurify. SQL injection not applicable (no SQL database).

### API Key Protection

All external API keys stored as environment variables, never exposed to the client. Internal admin endpoints require `ADMIN_API_KEY`.

### Rate Limiting

Redis-backed rate limiting in production (Upstash Ratelimit). Per-endpoint configuration. In-memory fallback when Redis is unavailable.

### Security Headers

- Content Security Policy (strict in production, permissive in development)
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

### Data Integrity

No mock data, no fabricated records, no Math.random() for data generation. Empty arrays when upstream data is unavailable. Every response reports `dataQuality` honestly.

## State Management

### Client State (Zustand)

Application state for UI interactions, selected representatives, search context.

### Server State (SWR)

All API data fetched via SWR with deduplication, revalidation-on-focus disabled, and configurable stale times.

## Testing

- **Unit tests** (Jest): 118 test suites, 1,500+ tests covering analyzers, services, API routes, and components
- **End-to-end tests** (Playwright): Full user journeys — address lookup, representative profiles, district navigation
- **Performance benchmarks**: Automated timing for API routes and analysis pipelines

```bash
npm test                    # Unit tests
npm run test:e2e            # E2E tests
npm run test:coverage       # Coverage report
npm run validate:all        # Full validation (lint + types + test + build)
```

## Deployment

### Build

```bash
npm run build
```

Output goes to `.next/` — static assets, server bundles, and build cache.

### Environment

Production requires:

- `CONGRESS_API_KEY`, `FEC_API_KEY`, `CENSUS_API_KEY`, `OPENSTATES_API_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `ADMIN_API_KEY`, `CACHE_WARM_SECRET`

See `.env.example` for the full list.

### CI/CD

Validation runs on every push: lint, type-check, test, build. Deployment to Vercel on merge to main.

## Design Decisions

| Decision                  | Rationale                                                                  |
| ------------------------- | -------------------------------------------------------------------------- |
| Next.js App Router        | Server Components for SEO, streaming SSR, built-in API routes              |
| TypeScript strict         | Prevents runtime errors, self-documenting, safer refactoring               |
| SWR over React Query      | Smaller bundle, simpler API, built by the Next.js team                     |
| Tailwind CSS              | Consistent design system, small CSS bundle, rapid iteration                |
| Statistics-first analysis | Reproducible, auditable results before any AI summarization                |
| Small HuggingFace models  | Run server-side without GPU, fast inference, no external API dependency    |
| ONNX for vote prediction  | Cross-platform inference, trained in Python, served in TypeScript          |
| Redis + LRU + CDN caching | Three tiers cover serverless, in-process, and edge scenarios               |
| PMTiles for maps          | No tile server needed, CDN-friendly, HTTP range requests                   |
| Nostr for publishing      | Decentralized, cryptographically signed, censorship-resistant distribution |

## Resources

- [DATA_NETWORK.md](./DATA_NETWORK.md) — Cross-domain join layer documentation
- [API_REFERENCE.md](./API_REFERENCE.md) — Complete API endpoint documentation
- [PHASE_TRACKER.md](./PHASE_TRACKER.md) — Feature completion tracking
- [ROADMAP-ai-layer.md](../ROADMAP-ai-layer.md) — Intelligence layer roadmap
