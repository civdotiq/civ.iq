<p align="center">
  <img src="public/images/civiq-logo-hero.webp" alt="CIV.IQ" width="160">
</p>

<h1 align="center">CIV.IQ</h1>

<p align="center">Civic intelligence from government sources, organized for public use.</p>

<p align="center">
  <a href="https://civdotiq.org">civdotiq.org</a> &bull;
  <a href="docs/API_REFERENCE.md">API Reference</a> &bull;
  <a href="CONTRIBUTING.md">Contribute</a> &bull;
  <a href="LICENSE">License</a>
</p>

---

## What this is

A civic intelligence platform. Enter an address to find your federal and state representatives, with voting records, federal campaign finance, committee assignments, legislative activity, and machine-learning-powered analysis of money-in-politics patterns. Local-government coverage is limited to a pilot list of 10 cities.

All data comes from government APIs. All analysis is statistical, with confidence scores and methodology disclosed. If data is unavailable, the interface and the response payload say so explicitly. Nothing is fabricated.

Honest coverage matrix: [docs/COVERAGE.md](docs/COVERAGE.md). It is the canonical answer to "what does CIV.IQ actually cover?" — every other claim in this README defers to that page.

## What it does

**Representatives**: Federal and state legislators with photos, contact info, committee assignments, and voting records.

**Campaign Finance**: Federal only — FEC contributions, PAC spending, expenditure tracking, and donor sector analysis. State campaign finance is not currently available (FollowTheMoney.org is in maintenance mode during the OpenSecrets merger).

**Intelligence Layer**: Statistical analyzers that cross-reference voting records with campaign finance, lobbying filings, stock trades, and committee jurisdictions to surface patterns of potential influence. Every insight carries a confidence score, methodology note, and correlation-not-causation disclaimer.

**Vote Prediction**: An XGBoost model (trained on historical roll call data, exported to ONNX) predicts how representatives are likely to vote on upcoming legislation, with an independence score measuring deviation from party line.

**Money Report**: Address-based lookup that traces the path from campaign contributions through committee assignments to legislative outcomes for your specific representatives.

**Sector Leaderboard**: Rankings of legislators by industry sector, showing which members receive the most from a given industry relative to their peers.

**Regulations & Comment Periods**: Federal Register integration for proposed rules, final rules, executive orders, and open public comment periods.

**State Legislatures**: All 50 states via OpenStates — legislators, bills, committees, votes, and calendars. Interactive district boundary maps for all 7,383 state legislative districts. State-level campaign finance, lobbying, and stock-trade data are **not** part of state coverage.

**Local Government**: City council data for 10 pilot cities via Legistar (Austin, Boston, Chicago, Denver, Detroit, Minneapolis, Oakland, Philadelphia, Portland, Seattle). Outside this list, local-government routes return `dataQuality: 'unavailable'` rather than empty arrays. There is no national local-government API; coverage expands one city at a time.

**District Intelligence**: Demographics, economic indicators (BLS employment data), federal spending (USASpending), infrastructure metrics, and bills ranked by relevance to each congressional district.

**Nostr Publishing**: Civic events (new bills, votes, hearings) are signed and published to the Nostr network for decentralized, verifiable distribution.

## Developer integrations

| Integration                                            | What it provides                                                |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| [OpenAPI spec](public/openapi.json)                    | 39 paths, 29 schemas — generate clients in any language         |
| [@civiq/sdk](packages/sdk)                             | Zero-dependency TypeScript client (`npm install @civiq/sdk`)    |
| [MCP server](/api/mcp)                                 | 16 tools for AI assistants (Claude, Cursor, etc.)               |
| [Atom feeds](/api/feed/bills/latest)                   | RSS-compatible feeds for bills, members, districts, committees  |
| [Embeddable widgets](https://civdotiq.org/open/embeds) | Drop-in HTML for legislator cards, district lookup, bill status |
| [llms.txt](public/llms.txt)                            | AI-discoverable documentation                                   |

## Data sources

| Source                     | What it provides                                            |
| -------------------------- | ----------------------------------------------------------- |
| Congress.gov v3            | Bills, votes, members, committees, hearings                 |
| FEC.gov                    | Campaign contributions, expenditures, PAC filings           |
| U.S. Census Bureau         | Demographics, geocoding, economic data                      |
| Senate.gov XML             | Senate floor votes, roll calls                              |
| House Clerk XML            | House voting records                                        |
| OpenStates GraphQL         | State legislators, bills, committees, votes (all 50 states) |
| GovInfo                    | Hearing transcripts, legislative documents                  |
| Federal Register           | Executive orders, proposed rules, comment periods           |
| USASpending.gov v2         | Federal contracts, grants, awards by district               |
| Senate LDA                 | Lobbying disclosure filings                                 |
| Bureau of Labor Statistics | Employment, wages, labor force data                         |
| SEC EDGAR                  | Financial disclosures, stock trades (STOCK Act)             |
| Wikidata SPARQL            | State executives, judiciary, biographies                    |
| FRED                       | Federal Reserve economic indicators                         |
| Regulations.gov            | Public comments on proposed rules                           |
| Census TIGER/Line          | Congressional and state district boundaries                 |

No data is fabricated, scraped, or generated.

## Setup

```bash
git clone https://github.com/civdotiq/civ.iq.git
cd civ.iq
npm install
cp .env.example .env.local
```

Add API keys to `.env.local`. All are free:

```env
# Required
CONGRESS_API_KEY=       # api.congress.gov/sign-up
FEC_API_KEY=            # api.open.fec.gov/developers
CENSUS_API_KEY=         # api.census.gov/data/key_signup.html
OPENSTATES_API_KEY=     # openstates.org/accounts/profile

# Recommended
UPSTASH_REDIS_REST_URL= # upstash.com (caching)
UPSTASH_REDIS_REST_TOKEN=
GOOGLE_GENERATIVE_AI_API_KEY= # aistudio.google.com/apikey (AI summaries)

# Optional (enhanced features)
FRED_API_KEY=           # fredaccount.stlouisfed.org/apikeys
DATA_GOV_API_KEY=       # api.data.gov/signup (Regulations.gov)
GOVINFO_API_KEY=        # api.govinfo.gov/docs
```

See `.env.example` for the full list, including Nostr publishing and ActivityPub federation.

```bash
npm run dev
```

Verify at [localhost:3000/api/health](http://localhost:3000/api/health).

## Structure

```
src/
├── app/
│   ├── api/                  # 181 API routes
│   └── (civic)/              # Pages (representatives, districts, legislation, etc.)
├── components/
│   ├── intelligence/         # Insight cards, leaderboards, influence chains
│   └── ...                   # Shared UI, search, visualizations
├── features/                 # Feature modules
│   ├── campaign-finance/
│   ├── legislation/
│   ├── representatives/
│   └── state-legislature/
├── lib/
│   ├── intelligence/         # Analyzers, ML models, embeddings, entity resolution
│   ├── nostr/                # Nostr event signing and relay publishing
│   ├── data-sources/         # Federal Register, FRED, SEC, lobbying services
│   └── ...                   # API clients, services, utilities
├── hooks/                    # Custom React hooks
└── types/                    # TypeScript definitions
packages/
├── sdk/                      # @civiq/sdk (TypeScript API client)
├── civic-statistics/         # @civiq/civic-statistics (confidence scoring, correlation)
└── entity-resolution/        # @civiq/entity-resolution (entity matching, deduplication)
```

## Stack

Next.js 16, React 18, TypeScript (strict), Tailwind CSS, SWR, Zustand, MapLibre GL, D3.js, Recharts, Redis (Upstash + ioredis), Zod, simple-statistics, HuggingFace Transformers (small models), Google Gemini AI, nostr-tools.

## Intelligence layer

12 statistical analyzers cross-reference government data domains:

| Analyzer                     | What it detects                                            |
| ---------------------------- | ---------------------------------------------------------- |
| Finance-Jurisdiction Overlap | Donor sectors that match a member's committee jurisdiction |
| Vote-Finance Correlation     | Voting alignment with campaign contributor industries      |
| Temporal Vote Shifts         | Quarterly changes in party-line voting patterns            |
| Lobbying Pipeline            | Lobbying spend → committee activity → bill output chains   |
| PAC-to-Vote Tracing          | PAC contributions traced to recipient voting records       |
| Stock-Committee Overlap      | STOCK Act trades in sectors a member's committee regulates |
| Influence Chain              | Full money → committee → legislation → vote pathways       |
| Sector Leaderboard           | Industry-by-industry legislator rankings                   |
| Vote Prediction              | ML model (XGBoost/ONNX) for roll call vote forecasting     |
| Bill Intelligence            | Sponsor funding sources cross-referenced with lobbying     |
| Bill-Lobbying Similarity     | Semantic similarity between bill text and lobbied issues   |
| Federal Register Analysis    | Regulatory intelligence from proposed and final rules      |

Every insight carries: confidence score (0–1), data-as-of timestamp, methodology description, and a disclaimer that correlation does not imply causation.

### ML pipeline

- **Vote prediction**: Training data collected via `npm run collect:training-data`, model trained in Python (`scripts/train-vote-model.py`), exported to ONNX, inference in TypeScript (`src/lib/intelligence/ml/vote-predictor.ts`)
- **Text similarity**: all-MiniLM-L6-v2 embeddings for bill-to-lobbying matching
- **Classification**: nli-deberta-v3-xsmall for zero-shot stance detection
- **Named entity recognition**: bert-base-NER for extracting entities from civic text
- **Influence clusters**: Offline Python computation (`scripts/compute-influence-clusters.py`) served as JSON

### Open-source packages

Three packages are extracted as standalone npm workspace packages:

- **@civiq/sdk** — TypeScript API client with typed methods for all 39 endpoints, error hierarchy, custom fetch injection
- **@civiq/civic-statistics** — Confidence scoring, peer comparison, correlation (Spearman/Pearson), anomaly detection, sample size enforcement
- **@civiq/entity-resolution** — Committee alias resolution, ticker-to-industry mapping, FEC recipient deduplication

## Commands

```bash
# Development
npm run dev                          # Dev server at localhost:3000
npm run build                        # Production build
npm run lint                         # ESLint
npm run lint:fix                     # ESLint with auto-fix
npm run type-check                   # TypeScript strict check
npm run type-check:watch             # TypeScript watch mode

# Testing
npm test                             # Run all tests (Jest)
npm run test:watch                   # Watch mode (Vitest)
npm run test:coverage                # Coverage report
npm run test:ci                      # CI mode with coverage
npm run test:e2e                     # Playwright end-to-end tests
npm run test:e2e:ui                  # Playwright with UI
npm run test:e2e:headed              # Playwright in headed browser

# Validation
npm run validate:all                 # lint + type-check + test + build
npm run validate:production          # Production API validation
npm run validate:production:critical # Critical-only production checks
npm run validate:production:parallel # Parallel production validation
npm run diagnose:apis                # Test API connectivity

# Performance
npm run perf:benchmark               # Run performance benchmarks
npm run perf:analyze                 # Bundle analysis build
npm run perf:baseline                # Save benchmark as baseline
npm run test:performance             # Performance test suite
npm run test:performance:quick       # Quick performance baseline
npm run test:load                    # Load testing
npm run test:redis                   # Redis performance test

# Data & ML
npm run collect:training-data        # Collect ML training data
npm run generate:embeddings          # Generate sector embedding vectors
npm run seed-data                    # Seed Congress data
npm run process-census               # Process Census data
npm run process-district-boundaries  # Process district GeoJSON/PMTiles
npm run process:state-districts      # Process state legislative districts
npm run process:mobile-pmtiles       # Generate mobile-optimized PMTiles
npm run validate-mappings            # Validate ZIP-to-district mappings
npm run validate-districts           # Validate district data

# Security
npm run security:audit               # npm audit (moderate level)
npm run security:full                # Full security scan
npm run security:emergency           # Emergency vulnerability fix

# Utilities
npm run analyze                      # Next.js bundle analyzer
npm run clean                        # Remove .next and node_modules
npm run clean:install                # Clean + reinstall
npm run flatten                      # Flatten codebase to XML
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache License 2.0. Copyright 2019-2026 Mark Sandford.

Use it, modify it, distribute it. Include the copyright, license, and NOTICE file per Apache 2.0 Section 4. Provide visible attribution: "Powered by CIV.IQ." The CIV.IQ name and logo are trademarks and require written permission to use. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

---

Mark Sandford - contact@civdotiq.org
