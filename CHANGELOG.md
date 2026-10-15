# Changelog

All notable changes to the CIV.IQ project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-10-15

The first app release in thirteen months, and the first one tagged and published as a GitHub Release. It covers the roughly 1,500 commits since 2.1.0, summarized by area rather than listed. Pull request numbers appear where the change went through a PR. The `@civiq/*` npm packages are versioned on their own; see each package's `CHANGELOG.md` under `packages/`.

### Breaking

- **Vote prediction retired (#223).** The XGBoost vote model and the "independence score" built on it are gone. They scored a gap between how members voted and how their donors "predicted" they would, which is a judgment about motive, not public data. Removed: `GET /api/intelligence/representative/{id}/vote-prediction`, the Civic Mesh counterfactual and cascade endpoints, the `analyze_vote_prediction` MCP tool, and `intelligence.votePrediction()` in `@civiq/sdk` 0.3.0. The roll calls and FEC contributions it read stay on the site.
- **Sector leaderboard (#241).** `/api/intelligence/sector/{sector}/leaderboard` now returns each House member's yes-vote rate on bills in the sector. It no longer reports money totals or ranks. `@civiq/sdk` 0.4.0 matches the new shape.

### Added

#### Address lookup

- One resolver answers both federal and state representatives from a full home address (#190, #191, #192, #193). ZIP input still works but carries an accuracy note: 74% of Americans live in a ZIP that crosses a congressional or state legislative district line (Census ZCTA crosswalks).
- Address lookups also show the 2026-ballot district where a state redrew its map.
- DC and territorial delegates.

#### State legislatures

- All 50 states and DC through OpenStates API v3: legislator profiles, committees, bills with full-text search, legislative calendar and vote detail pages.
- Boundary maps for every state legislative district, rebuilt from TIGER 2025 (#121).
- Rosters and committees served from committed corpora built from OpenStates data, not live API calls (#109).
- State pages with governors (NGA), executive officers, judiciary and an elections tab, server-rendered (#201).
- Wikidata and Wikipedia biographies for state legislators.

#### Federal data

- Bill pages: text, subjects, CBO estimates, amendments, related laws and CRS summaries. Server-rendered, with every count and entity linked (#187, #198).
- Senate votes served from a mirrored Senate.gov roll-call corpus. Vote pages show the amendment purpose, bill context and CRS summary.
- Committee directory with subcommittee rosters, floor schedule, witnesses and GovInfo hearings.
- Federal Register documents, Regulations.gov comment periods and executive orders.
- District pages: CDC PLACES public health, Census demographics with national comparisons, Medicaid/CHIP enrollment, veteran population, and USASpending awards and infrastructure obligations scoped to the district (#151). Server-rendered; unknown districts return a real 404 (#210).
- Campaign finance: multi-cycle FEC data, PAC and leadership-PAC money, contributions by employer, organization roll-ups, FEC filing pages and a data-lag notice.
- Lobbying: the full LDA filing corpus (lda.gov) mirrored for complete totals, a lobbying tab on profiles, and pages for lobbying organizations, PACs and industry sectors.
- Congressional stock trades for both chambers, from the Congress Trading Monitor dataset of STOCK Act filings, with late-filing flags and a trading leaderboard.
- Incumbent Record Card for each member: legislation, voting compared with the full chamber, and federal spending, with share image, embed and print versions.
- Representative search filters for bills introduced and money raised (#141, #142), and a side-by-side compare page.
- Topic pages and bills by policy area from the GovInfo BILLSTATUS corpus (#112).
- Detroit city council lookup and roster through Legistar.

#### Elections

- 2026 federal race index and race pages from the FEC candidate corpus. Filed candidates appear on member, district and ballot pages.
- Hand-verified voter-registration deadlines for the 2026 general election.
- 2024 results from MIT Election Lab precinct data; 2025 New Jersey and Virginia governor results.

#### Intelligence layer

- 17 statistics-first analyzers: finance and committee jurisdiction overlap, temporal vote shifts, lobbying-to-committee pipeline, PAC vote tracing, stock trades and committee jurisdiction, party-line alignment, bill intelligence and others (see the README table). Every insight carries a confidence score, data date, methodology, disclaimer and peer baseline. None claims causation.
- Civic Intelligence Brief on representative profiles.
- Plain-language AI bill summaries (Gemini through the Vercel AI SDK), held to grade-8 reading level.

#### Open data and developer access

- Versioned public API (`/api/v1`) with an OpenAPI spec covering 39 endpoints.
- MCP server at `/api/mcp` with 46 tools and a registry manifest.
- npm packages: `@civiq/sdk` (TypeScript client and `civiq` CLI), `@civiq/civic-statistics` and `@civiq/entity-resolution`.
- Bulk datasets, including the complete lobbying corpus, plus Atom feeds and embeddable widgets.
- Agent support: `llms.txt`, markdown content negotiation, typed JSON errors and `RateLimit` headers.
- Nostr: civic events (bills, votes, filings) are signed and published to relays, with read-back verification.
- ActivityPub: fediverse instances can follow civic updates.

#### Pages and design

- Aicher/Ulm design system site-wide: Braun Linear type, 8px grid, party colors used only for party.
- A 23-part page redesign, now the default layout everywhere.
- Weekly per-state digest, `/ask` question pages, glossary, K-12 civics lessons, methodology page, a "What this data cannot tell you" section, corrections and support pages.
- Share buttons and link-preview images for every page type (#213, #214); Schema.org structured data across the site; IndexNow.

### Changed

- Next.js 15.5 to 16.4.1, ESLint 9 flat config, Node.js 20.
- Democrat party color is blue (`#2563eb`); green is retired from party use.
- Code is licensed Apache-2.0 and data is public domain (#245). README and metadata counts now match the code, and tests keep them in sync (#246).

### Removed

- GDELT news integration.
- Mock, placeholder and estimated data wherever it was found: placeholder votes, estimated district figures, two fake-data vote routes, fabricated FCC metrics, and three scripts that faked their results (#252).
- Five Legistar pilot cities whose APIs went offline. They now answer "unavailable" instead of an empty roster (#95).

### Fixed

Highlights from about 700 fixes:

- Cache TTLs were passed in milliseconds where seconds were expected, so some cached data stopped refreshing.
- Pages that showed a fetch limit as if it were a total now show the count each upstream API reports.
- Member vote records honor the selected session and no longer double-count (#248).
- Bill sponsor money comes from FEC aggregates, not a sample (#250).
- A shared FEC rate limiter and circuit breaker; visitor page loads no longer call FEC directly (#181).
- Security: sanitized bill summaries and Wikipedia HTML, admin auth on cache-mutating endpoints, and Next.js advisory fixes including CVE-2025-55182.

## [2.1.0] - 2025-09-16

### Added - District Enhancement APIs

- Economic & Infrastructure Health tracking with BLS employment data
- Education & Healthcare Access metrics from Department of Education and CDC
- Government Investment & Services tracking via USASpending.gov
- New API endpoints for district economic profiles, services, and spending
- Responsive UI components with gradient card layouts
- TypeScript safety with complete type definitions

### Changed

- Enhanced district pages with comprehensive civic intelligence data
- Improved error handling with honest "Data unavailable" messaging
- Added 30-minute caching for district enhancement APIs

## [2.0.0] - 2025-09-02

### Fixed - Campaign Finance Systems Architecture

- Resolved critical Bioguide→FEC ID mapping issues in batch service
- Established single consistent data path (Frontend → Batch API → FEC Service)
- Fixed misleading zero-data responses with proper HTTP status codes (404/503)

### Added

- Real FEC data integration for mapped representatives
- Systematic logging and error propagation throughout finance system

### Changed

- Replaced dual-path architecture with unified data flow

## [1.9.0] - 2025-08-29

### Added - Interactive District Maps & Wikipedia-Style Navigation

- Complete URL flexibility for district pages (state abbreviation and full name)
- Interactive Leaflet.js maps with OpenStreetMap tiles
- Wikipedia-style interconnected navigation between representatives and districts
- Neighboring districts API with geographic adjacency mapping
- Dynamic loading with proper Next.js SSR handling

### Changed

- District pages transformed from scaffolding to fully functional navigation hubs
- Enhanced TypeScript-safe React components for maps and district exploration

## [1.8.0] - 2025-08-07

### Added - Complete Senate Voting Integration

- Real Senate vote data via Senate.gov XML roll call votes
- Unified voting system integrating House and Senate votes
- Custom CORS proxy route for Senate.gov XML handling
- Dynamic XML parsing with member vote extraction
- LIS Member ID support for Senate's Legislative Information System
- Chamber-agnostic API routing for House vs Senate votes

### Changed

- Enhanced getVoteDetails function for automatic chamber routing
- Improved voting records system with Senate.gov integration

## [1.7.0] - 2025-08-02

### Added - Data Transparency & Source Attribution System

- Data source badges linking to official government sources
- Cache status indicators showing cached vs fresh data
- Data quality indicators with validation metrics
- Data freshness indicators with timestamps and TTL
- Transparency panel combining all metadata
- Enhanced API responses with transparency metadata
- Cache performance monitoring endpoint

### Changed

- All API responses now include comprehensive transparency data
- Improved user trust through data source visibility

## [1.6.0] - 2025-08-01

### Added - Real Congressional District Boundaries

- Authentic Census Bureau TIGER/Line shapefiles for all 435 districts + territories
- Sub-meter accuracy from official Census geometric data
- PMTiles optimization (64MB file) for efficient web serving
- Complete 306MB GeoJSON dataset with full geometries
- Point-in-polygon lookup using real boundary data
- Automated download, processing, and conversion pipeline
- MapLibre GL JS integration with vector tiles

### Removed

- All mock congressional district boundary data

## [1.5.0] - 2025-07-30

### Fixed - Complete Mock Data Elimination

- Eliminated ALL mock data from federal government pages
- Replaced hardcoded fake representatives with congress-legislators data
- Fixed intentionally blocked Congress.gov voting data
- Replaced mock committee generation with real committee data
- Converted algorithmic fake comparisons to real voting analysis
- Added clear "[SAMPLE]" labeling for sample news content

### Changed

- All APIs now clearly indicate data source
- Platform now serves authentic federal government data exclusively

## [1.4.0] - 2025-07-27

### Added - Comprehensive Performance Optimization (70% Improvement)

- Server Components migration (1,235-line client component conversion)
- SWR cache implementation for memory leak prevention
- D3 dynamic imports with lazy loading
- Batch API system reducing API round-trips by 80%
- Next.js Image optimization with WebP/AVIF conversion

### Changed

- 70% reduction in initial bundle size
- 80% fewer API calls via batch processing
- 50% faster image loading
- Improved Core Web Vitals across all metrics

## [1.3.0] - 2025-07-25

### Added - MVP Verification & Bug Fixes

- Multi-district selection functionality
- Enhanced address search with Census API geocoding
- Smart caching system to prevent rate limits
- Data source transparency indicators
- Graceful degradation for API failures

### Fixed

- Navigation issues with View Profile buttons
- Census API geocoding reliability
- Edge case handling for DC, at-large districts, territories

## [1.2.0] - 2025-07-02

### Added - Enhanced Data Quality System

- Real voting records from Congress.gov API
- Multi-source photo pipeline with 99% reliability
- Advanced news clustering with GDELT
- 10 political themes for story grouping
- Complete FEC integration with PAC contributions

### Changed

- Improved data validation and quality scoring
- Enhanced news deduplication algorithms

## [1.1.0] - 2025-01-31

### Added - Corporate Lobbying Transparency

- Senate Lobbying Disclosure Act (LDA) database integration
- Committee-based lobbying analysis
- Corporate lobbying tab in Campaign Finance component
- Spending visualization by company and industry
- Industry sector categorization

## [1.0.0] - 2025-01-29

### Added - TypeScript & Testing Infrastructure

- Comprehensive TypeScript definitions for all domain models
- Full v1 API structure with centralized configuration
- Organized testing framework with unit and integration tests
- Strict TypeScript configuration with null checks
- Mock utilities and test helpers

### Changed

- Enhanced component prop validation
- Improved development experience with IntelliSense

## [0.9.0] - 2025-01-28

### Added - Interactive Committee Profile System

- Clickable committee navigation from representative profiles
- Dedicated committee pages with comprehensive information
- Committee leadership display with photos
- Member lists with party badges
- Subcommittee integration with focus areas
- Smart committee name resolution

## [0.8.0] - 2025-01-27

### Added - Voting Records & Bill Navigation Overhaul

- SWR caching with 5-minute deduplication (70% performance improvement)
- Interconnected navigation between representatives, bills, committees
- Comprehensive bill pages with sponsor/cosponsor links
- Clickable voting records linking to bill pages
- Enhanced bill intelligence from Congress.gov
- Smart caching with background updates

## [0.7.0] - 2025-01-26

### Added - Performance Optimization Suite

- Memory leak prevention with D3 force simulation cleanup
- React.memo optimization for RepresentativeCard and StateLegislatorCard
- Virtual scrolling with react-window for large datasets
- Modular D3 imports (70% bundle size reduction)
- Intelligent caching with SWR
- Next.js Image component optimization

### Fixed

- Memory accumulation during navigation (~50MB per page)
- Unnecessary re-renders (70% reduction)

## [0.6.0] - 2025-01-21

### Added - MVP Verification Complete

- Comprehensive federal functionality verification
- 535+ federal members with complete profiles
- 39,363 ZIP codes with multi-district support
- Advanced filtering across all criteria
- Real voting records and party alignment analysis
- DC delegates and at-large district support

### Changed

- Confirmed production readiness for core federal features

## [0.5.0] - 2024-12-17

### Added - Complete TypeScript Compliance

- Achieved ZERO TypeScript compilation errors
- Comprehensive null safety and type guards
- Proper interfaces for all API responses
- Defensive programming patterns throughout
- 24 systematic batch fixes addressing error patterns

### Changed

- Reduced compilation errors from 587 to 0
- Improved maintainability and IDE support

## [0.4.0] - 2024-08-01

### Added - ZIP Code Mapping System

- 146x coverage expansion (270 → 39,363 ZIP codes)
- Sub-millisecond performance (0.0001ms average)
- Complete geographic coverage (50 states + DC + territories)
- Multi-district ZIP support (6,569 ZIP codes)
- Perfect caching with 100% hit rate
- Real-time performance monitoring

## [0.3.0] - 2024-07-01

### Added - Enhanced Campaign Finance

- Industry categorization with 50+ mappings
- Bundled contributions analysis (employee + PAC)
- Independent expenditures tracking (Schedule E)
- Funding diversity metrics with Herfindahl index
- Corporate influence mapping with 30+ company-to-PAC relationships

## [0.2.0] - 2024-06-01

### Added - Core Features

- Representative search by ZIP code
- Comprehensive profiles with congress-legislators data
- Voting records visualization
- Legislative tracking with bill monitoring
- Campaign finance integration
- Real-time news mentions via GDELT

## [0.1.0] - 2024-05-01

### Added - Project Foundation

- Next.js 15 project structure
- TypeScript configuration
- Basic representative data integration
- Landing page and search functionality
- Initial API routes

---

## Version History Summary

- **v3.0**: State legislatures, address lookup, elections 2026, intelligence layer, open API/MCP/SDK, redesign
- **v2.x**: District enhancements, campaign finance refactor, geographic features
- **v1.x**: Data transparency, committee intelligence, performance optimization
- **v0.x**: Core functionality, MVP verification, foundation building

## Links

- [Project Repository](https://github.com/civdotiq/civ.iq)
- [Releases](https://github.com/civdotiq/civ.iq/releases)
- [Issue Tracker](https://github.com/civdotiq/civ.iq/issues)
- [Documentation](docs/)

[Unreleased]: https://github.com/civdotiq/civ.iq/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/civdotiq/civ.iq/releases/tag/v3.0.0
