# Phase Tracker - CIV.IQ Development Progress

## Current Status: ML DEEPENING & MONEY-TO-VOTES (Phase 11 Complete)

Last Updated: March 15, 2026

## Completed Phases

### Phase 11: ML Deepening & Money-to-Votes (March 2026)

**Status**: COMPLETE

#### ML Pipeline

- **Training Data Collection**: `scripts/collect-training-data.ts` collects historical roll call data into `training-data/*.json`
- **Vote Prediction Model**: Python training (`scripts/train-vote-model.py`) exports XGBoost to ONNX; TypeScript inference in `src/lib/intelligence/ml/vote-predictor.ts`
- **Bill-Lobbying Similarity**: Semantic matching via all-MiniLM-L6-v2 embeddings between bill text and lobbied issues
- **Influence Clustering**: Offline Python computation (`scripts/compute-influence-clusters.py`) served as JSON via API

#### HuggingFace Small-Model Pipelines

- **Zero-Shot Classification**: nli-deberta-v3-xsmall for stance detection and topic classification
- **Named Entity Recognition**: bert-base-NER for extracting entities from civic text
- **Text Embeddings**: all-MiniLM-L6-v2 for cosine similarity between bills and lobbying filings

#### Money-to-Votes Features

- **Influence Chain Analyzer**: Traces lobbying → contribution → committee → bill → vote pathways per committee
  - API: `/api/intelligence/representative/[bioguideId]/influence-chain`
  - UI: `InfluenceChainCard.tsx`, `InfluenceChainTable.tsx`
- **Sector Leaderboard**: Rankings of legislators by industry sector donation levels relative to peers
  - API: `/api/intelligence/sector/[sector]/leaderboard`
  - UI: `SectorLeaderboard.tsx` (integrated into industry/[sector] pages)
- **Address Money Report**: Address or ZIP lookup showing campaign finance → committee → legislative outcome chains for local representatives
  - API: `/api/intelligence/address/money-report` (POST for address, GET for ZIP)
  - UI: `AddressLookupForm.tsx` + `MoneyReportCard.tsx`
  - Page: `/money-report`

#### Vote Prediction

- **Vote Prediction Analyzer**: ML model predicts roll call votes with independence score measuring deviation from party line
  - API: `/api/intelligence/representative/[bioguideId]/vote-prediction`
  - UI: `VotePredictionCard.tsx`

#### Federal Register Intelligence

- **Regulatory Analysis**: Statistical analysis of proposed and final rules from the Federal Register
  - API: `/api/intelligence/federal-register/[documentNumber]`

### Phase 10: Open-Source Package Extraction (February 2026)

**Status**: COMPLETE ✅

#### @civiq/civic-statistics

- **✅ Statistical Utilities**: Confidence scoring, peer comparison, correlation (Spearman/Pearson)
- **✅ Sample Size Enforcement**: `meetsSampleSize()` with configurable thresholds
- **✅ Constants**: MIN_VOTES_PER_SECTOR (10), MIN_QUARTERS_TEMPORAL (4), MIN_TRADES_STOCK (3), MIN_FILINGS_LOBBYING (5), MIN_PAC_RECIPIENTS (3), MIN_RELEVANT_VOTES (3), MIN_PEERS (3)
- **✅ Pure Functions**: No external dependencies, fully unit-tested

#### @civiq/entity-resolution

- **✅ Committee Alias Resolution**: Maps committee name variants to canonical codes
- **✅ Ticker-to-Industry Resolution**: Batch ticker symbol to IndustrySector mapping
- **✅ FEC Recipient Matching**: Deduplication and resolution of FEC committee recipients

#### Technical Implementation

- **✅ npm Workspaces**: `packages/civic-statistics` and `packages/entity-resolution`
- **✅ Re-export Shims**: Existing app code imports from packages via workspace resolution
- **✅ TypeScript Build**: Each package has its own `tsconfig.json` and builds independently

### Phase 9: AI Civic Intelligence Layer (December 2025 - February 2026)

**Status**: COMPLETE ✅

#### Intelligence Analyzers (6)

- **✅ Finance-Jurisdiction Overlap**: Campaign donor sectors vs committee jurisdictions
- **✅ Vote-Finance Correlation**: Voting record alignment with donor industry sectors
- **✅ Temporal Vote Pattern Shifts**: Quarterly party-line alignment trends with shift detection
- **✅ Lobbying-Committee-Legislation Pipeline**: LDA filings → committee activity → bill output
- **✅ PAC-to-Legislator Vote Tracing**: PAC contributions traced to recipient voting records
- **✅ Stock Trade-Committee Jurisdiction**: STOCK Act disclosure trades in regulated sectors (House only)

#### Bill Intelligence

- **✅ Bill Intelligence Analyzer**: Sponsor/cosponsor funding analysis with lobbying cross-reference

#### API Routes (8)

- **✅ Representative Insights**: `/api/intelligence/representative/[bioguideId]` (finance-jurisdiction + vote-finance)
- **✅ Influence Chain**: `/api/intelligence/representative/[bioguideId]/influence-chain` (lobbying pipeline per committee)
- **✅ Temporal Analysis**: `/api/intelligence/representative/[bioguideId]/temporal`
- **✅ Stock Trade Analysis**: `/api/intelligence/representative/[bioguideId]/stock-trades`
- **✅ Committee Intelligence**: `/api/intelligence/committee/[committeeId]`
- **✅ Bill Intelligence**: `/api/intelligence/bill/[billId]`
- **✅ PAC Intelligence**: `/api/intelligence/pac/[committeeId]`
- **✅ District Intelligence**: `/api/intelligence/district/[districtId]`

#### UI Components (11)

- **✅ InsightCard**: Base card for all intelligence displays with confidence badge
- **✅ FinanceJurisdictionCard**: Committee-donor overlap visualization
- **✅ VoteFinanceCard**: Sector-by-sector correlation display
- **✅ TemporalVoteCard**: Quarterly alignment chart with shift markers
- **✅ StockTradeCard**: Flagged trade table with committee jurisdiction context
- **✅ LobbyingPipelineCard**: Organization spending and issue-bill alignment
- **✅ PACVoteCard**: Recipient vote records with baseline comparison
- **✅ BillIntelligenceCard**: Sponsor funding and lobbying summary
- **✅ DistrictIntelligenceSummary**: Multi-representative overview
- **✅ InfluenceChainCard**: Committee-level lobbying pipeline
- **✅ IntelligenceTab**: Tab component for representative/bill/district pages

#### Entity Resolution

- **✅ Ticker-to-Industry Resolver**: Batch resolution with Redis caching
- **✅ Lobbying-Committee Resolver**: LDA filing entity matching to committee codes
- **✅ LDA Issue-Policy Map**: Issue code to Congress.gov policy area alignment
- **✅ FEC Recipient Resolver**: Committee disbursement to bioguide ID matching

#### Architecture

- **✅ Statistics-First**: Every analyzer computes numbers before calling LLM
- **✅ Reading Level Validation**: AI text must pass Flesch-Kincaid <= 8 with retry
- **✅ Peer Comparison Baselines**: All insights compared to peer group via Redis mget
- **✅ Redis Caching**: 7-14 day TTLs at analyzer level, 12-hour s-maxage at API level
- **✅ Correlation-Only Language**: "pattern", "correlation", "association" — never causation

### Phase 8: State Legislative District Mapping - Interactive Boundaries for All State Districts (November 6, 2025)

**Status**: COMPLETE ✅

#### State Legislative District Boundary Visualization

- **✅ Complete State District Coverage**: Interactive maps for all 7,383 state legislative districts (upper and lower chambers) across 50 states + DC
  - Census TIGER/Line 2025 shapefiles for accurate boundary data
  - Separate layers for state house (lower) and state senate (upper) chambers
  - Unified ID schema: `{STATE}-{CHAMBER}-{DISTRICT}` (e.g., `CA-lower-12`, `TX-upper-4`)
  - Edge case handling: Nebraska unicameral, at-large districts, multi-member districts
- **✅ Build-Time Data Pipeline**: Automated processing and optimization
  - `scripts/process-state-legislative-districts.mjs` - Downloads and processes TIGER/Line shapefiles
  - ogr2ogr for shapefile conversion and geometry simplification
  - Tippecanoe for PMTiles vector tile generation (~100-200MB total)
  - Manifest generation with district centroids and bounding boxes
- **✅ Validation Tools**: Cross-reference with OpenStates API
  - `scripts/validate-state-district-ids.mjs` - Validates TIGER IDs match OpenStates
  - Fuzzy matching for edge cases and district number variations
  - Support for targeted testing by state and chamber
- **✅ Interactive Map Component**: Client-side visualization with MapLibre GL JS
  - `StateDistrictBoundaryMap.tsx` - Reusable React component
  - PMTiles protocol for efficient streaming (loads only viewport tiles)
  - Highlights current district, shows neighboring districts
  - Fullscreen mode, click-to-navigate neighbors
  - Automatic fly-to district centroid

#### Technical Implementation

- **✅ Unified ID Normalization**:
  - TIGER format: Zero-padded (e.g., "012")
  - OpenStates format: No padding (e.g., "12")
  - Census Geocoder: GEOID (e.g., "26012")
  - Solution: Normalization removes leading zeros, handles at-large ("AL")
- **✅ Performance Optimization**:
  - PMTiles streaming: ~500KB-2MB per page view (not full 200MB)
  - Separate vector tile layers (sldl, sldu) for efficient filtering
  - HTTP range requests, CDN-friendly caching
- **✅ Complete TypeScript Safety**: Full type definitions for all components and data structures
- **✅ Comprehensive Documentation**: `docs/STATE_DISTRICT_MAPPING_IMPLEMENTATION.md`
  - Complete data flow diagrams
  - Step-by-step implementation guide
  - Troubleshooting and edge case documentation

#### Test Data Generated

- **Test States**: California (120 districts), Texas (181 districts), Nebraska (49 districts)
- **Total Processed**: 350 districts in 96 seconds
- **Output Files**:
  - `public/maps/state_legislative_districts.pmtiles` (9.6MB test file)
  - `data/state-districts/state-districts-manifest.json` (176KB metadata)

#### Impact

- **Complete State Legislature Visualization**: Citizens can now view precise boundaries for their state house and senate districts
- **Seamless Integration**: Maps embedded in state district detail pages alongside legislator information
- **Scalable Architecture**: Efficient PMTiles format ready for nationwide deployment (all 7,383 districts)
- **Developer-Friendly**: Reusable map component with comprehensive documentation

### Phase 7: District Enhancement APIs - Complete Civic Intelligence System (September 16, 2025)

**Status**: COMPLETE ✅

#### Comprehensive District Intelligence Features

- **✅ Economic & Infrastructure Health API**: Real-time employment data from Bureau of Labor Statistics
  - Live unemployment rates, labor force participation, job growth tracking
  - FCC broadband connectivity metrics (fiber availability, download/upload speeds)
  - Digital divide index calculations and infrastructure health ratings
- **✅ Services & Health Profile API**: Education and healthcare access tracking
  - School district performance ratings and federal education funding
  - Healthcare quality indices and Medicare provider counts
  - Public health metrics including preventable disease rates
- **✅ Government Investment API**: Federal spending and social services tracking
  - USASpending.gov integration for district-level federal investment
  - SNAP, Medicaid, housing assistance, and veterans services data
  - Legislative impact tracking with bills affecting each district

#### Technical Implementation

- **✅ Three New API Endpoints**:
  - `/api/districts/[districtId]/economic-profile` - Employment, infrastructure, connectivity
  - `/api/districts/[districtId]/services-health` - Education, healthcare, public health
  - `/api/districts/[districtId]/government-spending` - Federal investment and social services
- **✅ Real Government API Integration**:
  - BLS (Bureau of Labor Statistics) for employment data
  - FCC (Federal Communications Commission) for broadband access
  - DoE (Department of Education) for school performance
  - CDC PLACES for health outcomes
  - USASpending.gov for federal contracts and grants
- **✅ Complete TypeScript Safety**: Comprehensive interfaces in `src/types/district-enhancements.ts`
- **✅ Performance Optimization**: 30-minute caching, graceful error handling, source attribution
- **✅ Honest Data Policy**: Zero values when APIs unavailable, clear "Data unavailable" messaging

#### Impact

- **Revolutionary District Intelligence**: Citizens can now access comprehensive data about their district's economic health, infrastructure, education, healthcare, and federal investment
- **Multi-Source Validation**: Real government APIs provide authenticated data from official sources
- **Transparent Attribution**: Clear source links and data quality indicators for full accountability
- **Performance Optimized**: Intelligent caching ensures fast response times while respecting API limits

### Phase 6.1: Data Flow Debugging & OODA Implementation (August 13, 2025)

**Status**: COMPLETE ✅

#### Critical Data Flow Fix

- **Problem**: Bills and Finance data fetched successfully but not displaying in UI
- **Root Cause**: Debug code in DataFetchingWrappers.tsx blocking data flow to components
- **Solution**: OODA methodology implementation with specialized agents

#### OODA Agent Analysis Results

- **Observe**: Identified data fetching correctly but UI components not receiving data
- **Orient**: Found type erasure, overly strict validation, and debug divs blocking render flow
- **Decide**: Comprehensive fix addressing types, validation, and transformation
- **Act**: Implemented type preservation, simplified validation, removed blocking code

#### Technical Improvements

- ✅ Fixed type preservation throughout data pipeline
- ✅ Restored proper data flow from API → Wrapper → Component
- ✅ Eliminated debug code preventing component rendering
- ✅ Maintained full type safety with proper interfaces
- ✅ Simplified validation logic while preserving error handling

#### Impact

- Bills data now displays correctly in BillsTracker component
- Campaign Finance data now flows to CampaignFinanceVisualizer
- Enhanced developer experience with proper TypeScript support
- Removed data loading inconsistencies across representative profiles

### Phase 6: MVP Production Ready (July 2025)

**Status**: COMPLETE ✅

#### Major Achievements

##### 🗳️ Complete Senate Voting Integration (August 7, 2025)

- Full Senate roll call vote data via Senate.gov XML
- Unified House+Senate voting system
- CORS proxy for Senate.gov (`/api/senate-votes/[voteNumber]`)
- Real-time XML parsing with member vote extraction
- 100-senator coverage with all vote positions
- LIS Member ID support
- Chamber-agnostic vote API

##### 🗺️ REAL Congressional District Boundaries (August 1, 2025)

- Complete Census TIGER/Line shapefile processing
- All 435 congressional districts + territories
- 64MB PMTiles for efficient web serving
- 306MB GeoJSON with full geometric data
- Sub-meter accuracy from Census Bureau
- MapLibre GL JS integration
- NO MOCK DATA - 100% authentic boundaries

##### 📰 GDELT News Integration Fix (August 1, 2025)

- Fixed GDELT V2 DOC API integration
- Live news feeds on member profiles
- Smart search term generation
- Story clustering and deduplication
- 10 political theme tracking
- Legitimate source verification

##### 🎯 Complete Mock Data Elimination (July 30, 2025)

- Replaced ALL federal mock data
- Real Congress.gov/congress-legislators data
- Authentic voting records
- Real committee assignments
- Clear labeling for sample fallbacks

##### 🏛️ Interactive Committee Profile Pages (January 28, 2025)

- Full committee navigation system
- Clickable committee assignments
- Committee leadership display
- Subcommittee organization
- Jurisdiction information
- 119th Congress data

##### 🚀 Performance Optimization (January 26, 2025)

- 70% rendering improvement
- Memory leak fixes
- Virtual scrolling implementation
- Modular D3 imports
- SWR caching strategy
- Next.js image optimization

##### 🏦 Enhanced FEC Campaign Finance (January 25, 2025)

- Industry categorization (50+ mappings)
- Bundled contributions analysis
- Independent expenditures tracking
- Schedule E processing
- Corporate influence tracking
- Funding diversity analytics

### Phase 5: Enhanced Features (January 2025)

**Status**: COMPLETE ✅

- District Map API with geocoding fallbacks
- Complete error handling system
- TypeScript safety improvements
- Multi-source photo pipeline (6 sources, 99% reliability)
- AI-powered bill summarization
- Real party line voting analysis
- Interactive district maps with GeoJSON
- Live Census ACS demographics
- Batch API system (80% reduction in round-trips)
- Advanced search with comprehensive filtering

### Phase 4: Core Integration (December 2024)

**Status**: COMPLETE ✅

- Real voting records from Congress.gov
- Bill-based extraction system
- Roll call parsing (House + Senate)
- Campaign finance with FEC data
- PAC contribution tracking
- Complete source breakdown
- GDELT news integration
- Advanced story clustering
- Political theme tracking

### Phase 3: ZIP Code Integration (November 2024)

**Status**: COMPLETE ✅

#### Comprehensive Integration

- 39,363 ZIP codes integrated
- Sub-millisecond performance (0.000ms average)
- 100% backward compatibility
- Multi-district ZIP support (6,569 complex ZIPs)
- Real-time monitoring
- 90% API call reduction
- Dynamic proxy mapping (146x coverage increase)
- 9/9 integration tests passed

### Phase 2: Data Processing Pipeline (October 2024)

**Status**: COMPLETE ✅

- CSV processing (46,620 rows in 169ms)
- District normalization
- Multi-district handling
- TypeScript generation
- O(1) lookup structure
- 100% data validation

### Phase 1: 119th Congress Data (September 2024)

**Status**: COMPLETE ✅

- OpenSourceActivismTech data validated
- 39,363 ZIP codes mapped
- Complete US coverage (50 states + territories)
- Multi-district ZIP support
- Automated validation pipeline
- 90% API call reduction achieved

## In Progress

### Local Government Expansion

- Municipal data sources research
- City council integration
- Mayor profiles
- Local ordinance tracking

## Upcoming

### Civic Engagement Tools

- Voter registration assistance
- Election reminders
- Town hall notifications

### Data Coverage Expansion

- Additional state-level data integrations
- Municipal meeting schedules
- Local ordinance tracking

## Security Milestones

### Zero-Trust Security Remediation (August 10, 2025)

**Status**: COMPLETE ✅

- Complete elimination of mock data generation
- Analytics suite quarantined (501 responses)
- Math.random() violations eliminated
- State legislature fake data removed
- 100% authentic government data
- Honest "unavailable" messaging

## Metrics & Performance

### Current Stats

- **Page Load**: < 2s (target: < 3s)
- **API Response**: < 200ms average
- **TypeScript Compliance**: 100% (0 compilation errors)
- **Test Coverage**: 118 suites / 1,500+ tests
- **API Routes**: 181 endpoints
- **Intelligence Analyzers**: 12
- **Intelligence UI Components**: 18

### Data Coverage

- **Federal Representatives**: 100% (535/535)
- **State Legislators**: All 50 states (via OpenStates)
- **ZIP Codes Mapped**: 84.4% (39,363/46,620)
- **Congressional District Boundaries**: 100% (435/435)
- **State Legislative District Boundaries**: 100% (7,383/7,383)
- **Committee Data**: 100% (all standing committees)
- **Voting Records**: 100% (House + Senate)

### API Integration Status

- **Congress.gov**: Fully integrated
- **FEC**: Fully integrated
- **Census**: Fully integrated
- **OpenStates**: Fully integrated (all 50 states)
- **USASpending.gov**: Fully integrated
- **Federal Register**: Fully integrated
- **GovInfo**: Fully integrated
- **Senate.gov XML**: Fully integrated
- **House Clerk XML**: Fully integrated
- **BLS**: Fully integrated
- **SEC EDGAR**: Fully integrated
- **Senate LDA (Lobbying)**: Fully integrated
- **FRED**: Fully integrated
- **Wikidata SPARQL**: Fully integrated
- **FollowTheMoney.org**: Fully integrated
- **Regulations.gov**: Fully integrated
- **GDELT**: Fully integrated
- **Census TIGER/Line**: Fully integrated

## Definition of Done

A phase is considered complete when:

1. All features are implemented and tested
2. Documentation is updated
3. No critical bugs remain
4. Performance targets are met
5. Security audit passed
6. Code coverage > 70%
7. All linters pass
8. Production deployment successful

## Notes

### Key Decisions

- **No Mock Data Policy**: Established July 2025 - only real government data or clear "unavailable" messages
- **TypeScript Strict Mode**: Enforced for all new code
- **API First**: All data from official government APIs
- **Progressive Enhancement**: Core features work without JavaScript
- **Mobile First**: All features designed for mobile, enhanced for desktop

### Lessons Learned

1. **Census API Rate Limits**: Implement aggressive caching and local mappings
2. **GDELT Deduplication**: Essential for news quality
3. **Photo Pipeline**: Multiple sources needed for reliability
4. **Senate.gov CORS**: Proxy required for XML data
5. **District Boundaries**: Census TIGER files are the gold standard

### Technical Debt

- [ ] Migrate remaining JavaScript files to TypeScript
- [ ] Increase test coverage to 90%
- [x] Implement Redis caching layer
- [x] Add comprehensive logging system
- [x] Intelligence layer with ML pipeline
- [x] Open-source package extraction
- [ ] Optimize bundle splitting

## Related Documents

- [ROADMAP.md](../ROADMAP.md) - Future planning
- [ROADMAP-ai-layer.md](../ROADMAP-ai-layer.md) - Intelligence layer roadmap
- [DATA_NETWORK.md](./DATA_NETWORK.md) - Cross-domain join layer
- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [README.md](../README.md) - Project overview
