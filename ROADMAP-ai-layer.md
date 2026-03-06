# CIV.IQ AI Civic Intelligence Layer

**Foundation documents**: ANALYSIS-entities.md, ANALYSIS-ai-integration.md, ANALYSIS-feasibility.md
**Note**: This roadmap supersedes the foundation documents where they conflict. The architecture has been simplified from what those analyses originally proposed.

---

## Section 1 — Goal

The AI civic intelligence layer sits between CIV.IQ's existing government data pipeline and its user-facing pages. It does not replace any existing functionality. It adds a new analysis layer that connects data already flowing through the system but currently displayed in isolation.

A citizen visiting a representative's page today sees campaign finance in one tab and voting records in another. They see lobbying data in one section and committee activity in another. The intelligence layer connects these: who funds this legislator, how do they vote on issues affecting those funders, and how does that compare to their peers?

---

## Section 2 — Architecture

### Data Flow

```
Existing API Endpoints
(Congress.gov, FEC, OpenStates, Senate XML, USASpending,
 Federal Register, GovInfo, House Clerk, Census, BLS, Wikidata)
    |
    v
+---------------------------+
|  Statistical              |  NEW — src/lib/intelligence/
|  Pre-computation          |  Fetches data from existing API endpoints,
|                           |  computes correlations and baselines.
|                           |  Wraps simple-statistics with civic defaults.
+------------+--------------+
             |
             v
+---------------------------+
|  AI Narrative             |  NEW — uses existing generateAIText()
|  Generation               |  AI interprets pre-computed statistics.
|                           |  Temperature 0.3. Reading level <= 8.
|                           |  Fallback to statistical summary without AI.
+------------+--------------+
             |
             v
+---------------------------+
|  Redis Cache              |  EXISTING — @upstash/redis
|                           |  Key: insight:{type}:{entityId}
|                           |  Each carries confidence, dataAsOf, methodology.
|                           |  7-day TTL. On-demand generation, not batch.
+------------+--------------+
             |
             v
+---------------------------+
|  Insight API Routes       |  NEW — src/app/api/intelligence/
|  & UI Components          |  Serves cached insights to pages.
|                           |  Insight cards on existing representative,
|                           |  bill, committee, and district pages.
+---------------------------+
```

### Existing Code This Builds On

The intelligence layer is not greenfield. These existing implementations are its foundation:

| Existing Code                                                                                    | What It Does                                                                                                                | How Intelligence Layer Uses It                                                                                                                                               |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CivicAlignmentAnalyzer` (`src/features/legislation/services/ai/civic-alignment-analyzer.ts`)    | Joins votes + finance + committees + district data into an AI-analyzed report                                               | **The pattern to follow exactly**: fetch data -> compute stats -> AI narrative -> Redis cache -> fallback chain. Every analyzer copies this structure.                       |
| `FinanceJurisdictionOverlap` (`src/types/joins.ts`)                                              | Links committees to industry sectors funding their members                                                                  | Starting point for the first insight. Already computes the join; intelligence layer adds statistical analysis and peer comparison on top.                                    |
| `/api/representative/[bioguideId]/connections`                                                   | The most relationship-dense endpoint: rep -> district -> spending, rep -> committees -> agencies -> regulations -> hearings | Existing join logic to reuse rather than rebuild. The intelligence layer adds correlation analysis to these existing connections.                                            |
| `policy-area-map.ts` (`src/lib/connections/policy-area-map.ts`)                                  | Maps 32 Congress.gov policyArea values to industry sectors, committee topics, agency slugs, Federal Register keywords       | Starting point for bill-to-industry classification. **AI classification will extend this** — the static map handles clear mappings, AI handles ambiguous/multi-sector bills. |
| `VotePatternAnalyzer` (`src/features/legislation/services/ai/vote-pattern-analyzer.ts`)          | Computes category counts, generates narrative about voting patterns                                                         | Pattern for statistics-first analysis. Intelligence layer extends this with temporal shift detection and peer comparison.                                                    |
| `committee-agency-map.ts` (`src/lib/connections/committee-agency-map.ts`)                        | Maps committee codes to agencies, topics, keywords                                                                          | Used directly by analyzers to connect committee jurisdiction to agency oversight.                                                                                            |
| `industry-taxonomy.ts` (`src/lib/fec/industry-taxonomy.ts`)                                      | 13 OpenSecrets-style sector codes with keyword matching                                                                     | The shared vocabulary for all finance-to-policy-area correlations.                                                                                                           |
| `bioguide-fec-mapping.ts` (`src/lib/data/bioguide-fec-mapping.ts`)                               | 537-member bidirectional bioguide <-> FEC ID mapping                                                                        | Already solved. No work needed.                                                                                                                                              |
| `entity-resolution.ts` (`src/lib/fec/entity-resolution.ts`)                                      | FEC donor deduplication via Levenshtein + metadata                                                                          | Working. Intelligence layer adds confidence scores to its boolean output.                                                                                                    |
| `reading-level-validator.ts` (`src/features/legislation/services/ai/reading-level-validator.ts`) | Flesch-Kincaid <= 8 enforcement with regeneration                                                                           | Already built. Intelligence layer uses it directly.                                                                                                                          |
| `plain-language.ts` (`src/lib/ai/plain-language.ts`)                                             | System prompt, jargon replacement list, attribution metadata                                                                | Already built. Intelligence layer uses it directly.                                                                                                                          |
| `BillSummarizer` (`src/features/legislation/services/ai/bill-summarizer.ts`)                     | AI-powered bill summarization with cache + fallback                                                                         | Extended to add `affectedIndustries` field for bill-to-industry classification.                                                                                              |
| `generateAIText` (`src/lib/ai/provider.ts`)                                                      | Provider-agnostic LLM call via Vercel AI SDK                                                                                | The AI call abstraction for all analyzer narratives. Already supports model selection.                                                                                       |

### Key Architectural Decisions

1. **Redis only, no new database.** Insights are cached JSON blobs in Redis. No Postgres, no Neo4j, no vector database.

2. **Statistics first, AI second.** Every analysis computes statistical summaries before calling the LLM. The AI interprets numbers — it does not compute them. Profile data first, then choose appropriate statistical methods based on actual distributions and sample sizes.

3. **On-demand with caching, not pre-computed pipeline.** Follow the `CivicAlignmentAnalyzer` pattern: generate insight on first request, cache in Redis with TTL. No cron pipeline, no cursor management, no processing queue. This is simpler, follows existing patterns, and avoids building infrastructure before proving the insights are valuable.

4. **Every insight carries provenance.** Each insight includes `confidence` (0-1), `dataAsOf` (timestamp of freshest source data), `methodology` (how it was computed), and `disclaimer`. Users see "Analysis based on data through [date]" on every AI-generated card.

5. **AI for bill-to-industry classification, not static mapping alone.** The existing `policy-area-map.ts` handles clear 1:1 mappings (e.g., "Health" -> HEALTH). But many bills span multiple industries — "Armed Forces and National Security" touches DEFENSE, TECHNOLOGY, and MANUFACTURING. Use AI to classify the `affectedIndustries` of bills when the static map is ambiguous. Add this as a new field on `BillSummary` during summarization.

6. **Independent staleness detection via `lastAnalyzedAt`.** Each cached insight stores when it was computed and the timestamp of the source data it used. Staleness is determined by comparing `dataAsOf` to the current date — if older than the TTL, regenerate on next request. No coupling to external systems for change detection.

---

## Section 3 — Phase 1: First Two Insights End-to-End

### Goal

Build two complete insights visible on representative pages, following the `CivicAlignmentAnalyzer` pattern exactly: fetch data -> compute statistics -> AI narrative -> Redis cache -> fallback. Prove the architecture works with real data before expanding.

### Insight 1: Finance-Jurisdiction Overlap with AI Narrative

**What it detects**: For each legislator, identifies where their campaign donors' industry sectors overlap with their committee jurisdictions. Answers: "This legislator sits on committees that oversee industries funding their campaign."

**Why first**: This extends `FinanceJurisdictionOverlap` (already computed in `src/types/joins.ts`) and the connections endpoint (already joins committees to agencies). The data fetching and joining already exist — the intelligence layer adds statistical context and AI narrative.

**Technical approach**:

1. **Data retrieval**: Fetch committee memberships (Congress.gov cache), campaign contributions by industry sector (FEC via existing `aggregateByIndustrySector`), and committee jurisdiction topics (existing `committee-agency-map.ts`).

2. **Statistical pre-computation**:
   - For each committee: which `IndustrySector` values fall under its jurisdiction (via `policy-area-map.ts`)
   - For each sector: total donations from that sector
   - Overlap score: total donations from sectors under committee jurisdiction / total donations
   - Peer comparison: compute the same overlap for all legislators on the same committee

3. **AI narrative**: Feed pre-computed stats to LLM via `generateAIText`. Temperature 0.3. System prompt enforces plain language + nonpartisan framing using existing `PLAIN_LANGUAGE_SYSTEM_PROMPT`. Validate with `reading-level-validator.ts`. Max 3 regeneration attempts; fallback to statistical summary.

4. **Storage**: `insight:finance_jurisdiction:{bioguideId}` in Redis, 7-day TTL.

### Insight 2: Vote-Finance Correlation (Gap A1)

**What it detects**: For each legislator, correlates their campaign finance donors (by industry sector) with their voting record (by bill industry classification). Answers: "What percentage of this legislator's votes align with their top donor industries?"

**New capability: AI-classified bill industries**

The existing `policy-area-map.ts` maps Congress.gov `policyArea` to `IndustrySector[]`, but many bills span multiple industries. Rather than manually expanding a static map, add an `affectedIndustries` field to bill summaries:

- During bill summarization (in `BillSummarizer`), ask the AI to also classify which `IndustrySector` values the bill affects
- Store as `affectedIndustries: IndustrySector[]` on `BillSummary`
- Fall back to the static `policy-area-map.ts` lookup when AI classification is unavailable
- This replaces the need to "validate and refine" the policy area map manually

**Technical approach**:

1. **Data retrieval**: Fetch votes (Congress.gov cache), campaign contributions by industry sector (FEC), bill `affectedIndustries` (from extended bill summaries, falling back to `policy-area-map.ts`).

2. **Statistical pre-computation** (profile data first, then choose methods):
   - Map each voted-on bill to industry sectors via `affectedIndustries` or `policy-area-map.ts`
   - For each industry sector: total donations, bills voted on, vote positions (yea/nay)
   - Alignment score: `votesAlignedWithIndustry / totalVotesOnIndustryBills`
   - Compute correlation between donation amounts and alignment scores across sectors — choose correlation method (Pearson, Spearman, or rank-based) after profiling actual data distributions

3. **Baseline comparison**:
   - Compute the same alignment score for all legislators in the same chamber and state delegation
   - Peer deviation: how far from the peer group average? (Choose method — z-score, percentile rank, or other — after profiling actual data distributions)
   - This prevents flagging a Texas representative for oil industry alignment when all Texas representatives show similar patterns

4. **Significance filtering**:
   - Minimum: 10 votes in a sector before computing correlation
   - Confidence interval on the alignment score (method chosen after profiling)
   - Flag as "insufficient data" if sample size is too small

5. **AI narrative**: Same pattern as Insight 1 — pre-computed stats only, temperature 0.3, plain language, reading level validation, fallback to statistical summary.

6. **Storage**: `insight:vote_finance:{bioguideId}` in Redis, 7-day TTL.

### Entity Resolution: Ticker-to-Industry Only

**Stock Ticker -> Industry Sector (Gap B1)**

- **Source**: Stock ticker symbols from House Clerk disclosure filings
- **Target**: `IndustrySector` enum from `src/lib/fec/industry-taxonomy.ts`
- **Method**: SEC EDGAR company tickers JSON (~13K entries with SIC codes). Map SIC codes to `IndustrySector` via a static table. No AI needed.
- **Storage**: `src/lib/intelligence/entity-resolution/sec-sic-data.json` (~500KB static). Resolver in `ticker-industry-resolver.ts`.
- **Verification**: Test with all unique tickers from the most recent quarter of House disclosures. Target: 85%+ resolution rate (some tickers are ETFs without a single sector).

Lobbying committee resolution (`government_entities` -> committee IDs) is deferred to Phase 2. It requires data profiling of Senate LDA filings first and is not needed for the Phase 1 insights.

### Base Analyzer Pattern

All analyzers follow the same structure, modeled on the existing `CivicAlignmentAnalyzer`:

```typescript
// Pattern, not a literal interface — each analyzer implements this flow:
// 1. Check Redis cache -> return if fresh
// 2. Fetch data from existing API endpoints / caches
// 3. Compute statistics (wrapping simple-statistics)
// 4. Generate AI narrative from pre-computed stats (generateAIText)
// 5. Validate reading level (existing reading-level-validator)
// 6. Cache insight in Redis with TTL
// 7. On any failure: return fallback (statistical summary without AI narrative)
```

### First UI: InsightCard on Representative Page

- `InsightCard.tsx` — summary paragraph, key stat callout, confidence badge, data date, collapsible disclaimer
- `ConfidenceBadge.tsx` — green (>0.8) / amber (0.6-0.8) / hidden (<0.6)
- `InsightDisclaimer.tsx` — standard correlation != causation text
- `GET /api/intelligence/representative/[bioguideId]` — generates or returns cached insight

Integrate on the representative detail page (`src/app/(civic)/representative/[bioguideId]/page.tsx`) as a new "Intelligence" tab.

### File Structure

```
src/lib/intelligence/
+-- analyzers/
|   +-- finance-jurisdiction-analyzer.ts    # Insight 1: committee funding overlap
|   +-- vote-finance-analyzer.ts            # Insight 2: vote-finance correlation
+-- entity-resolution/
|   +-- ticker-industry-resolver.ts         # Stock ticker -> IndustrySector
|   +-- sec-sic-data.json                   # SEC EDGAR company data (static)
|   +-- sic-sector-map.ts                   # SIC code -> IndustrySector mapping
+-- statistics/
|   +-- civic-stats.ts                      # Wraps simple-statistics with civic defaults
+-- types.ts                                # All intelligence layer type definitions

src/app/api/intelligence/
+-- representative/[bioguideId]/
|   +-- route.ts                            # Serves cached insights for a legislator

src/components/intelligence/
+-- InsightCard.tsx
+-- InsightDisclaimer.tsx
+-- ConfidenceBadge.tsx
```

### Verification Test Cases

1. **Ticker resolution**: `XOM` resolves to `ENERGY` sector with confidence 1.0.
2. **Ticker resolution (fund)**: `SPY` resolves to `null` (ETF, no single sector) — expected.
3. **Finance-jurisdiction insight**: A legislator with sufficient data has an insight with non-null overlap scores and peer comparison.
4. **Vote-finance insight**: A legislator with sufficient data has a `VoteFinanceInsight` with non-null correlations, peer comparison, and summary.
5. **InsightCard renders**: The representative page shows the intelligence tab with a populated insight card.
6. **Cache round-trip**: Insight generated on first request, served from cache on second request.
7. **Fallback works**: When AI narrative generation fails, a statistical summary without AI narrative is returned.
8. **Bill affectedIndustries**: A summarized bill has `affectedIndustries` populated from AI classification or static fallback.

---

## Section 4 — Phase 2: Expand Analyzers

### Goal

With the first two insights proven, build the remaining analyzers using the same pattern: fetch -> statistics -> AI narrative -> cache -> fallback.

### Analyzer: Lobbying-Committee-Legislation Pipeline (Gap A2)

**What it detects**: Traces lobbying expenditures to committee activity to legislative output. Answers: "Which organizations lobbied this committee, and what legislation did the committee produce on those issues?"

**Starts from**: `FinanceJurisdictionOverlap` in `src/types/joins.ts` (already computes committee -> industry sector funding) and the committee-agency map.

**Prerequisite — Lobbying Committee Resolution (deferred from Phase 1)**:

Before building this analyzer, profile the actual data:

1. Download 1 year of Senate LDA filings and extract all distinct `government_entities` values.
2. Categorize them: committee names, agency names, White House offices, individual member offices, freeform text, other.
3. Count: How many are committees? How many are agencies? How many are noise?
4. Scope the alias table based on what's actually in the data.
5. Build resolver: static alias table + `fuse.js` (already installed) fuzzy matching with 0.85+ threshold as fallback.
6. Verification: test with 50 randomly sampled filings. Target: 90%+ resolution rate on committee-type entities.

**Technical approach**:

1. Fetch lobbying filings (Senate LDA cache), resolve `government_entities` to committee IDs, fetch bills referred to each committee (Congress.gov cache).

2. Pre-aggregation:
   - Group lobbying filings by LDA issue code (~80 standardized codes)
   - Group committee bills by subject/policyArea
   - Match issue codes to policy areas using a new static mapping (`lda-issue-policy-map.ts`)
   - Compute timeline: lobbying quarter vs. bill introduction date

3. Baseline: Compare against other committees of similar type and jurisdiction.

4. AI narrative: Feed pre-computed statistics to LLM. Output: organizations, issues, bills, amounts, timeline — all factual, no causation claims.

5. Storage: `insight:lobbying_pipeline:{committeeId}` in Redis, 7-day TTL.

**UI**: `InfluenceChainTable.tsx` — a structured table showing lobbying organizations, their issue areas, dollar amounts, and bills the committee produced on those issues. Not a Sankey diagram. A table is more scannable, accessible, and mobile-friendly.

### Analyzer: PAC-to-Legislator Vote Tracing (Gap E1)

**What it detects**: Traces specific PAC contributions to legislators, then checks those legislators' voting records on PAC-relevant issues. Answers: "This PAC gave $X to these legislators. How did they vote on issues the PAC lobbied on?"

**Starts from**: `ResolvedRecipient` in `src/types/influence.ts` (already links PAC disbursements -> candidate_id -> bioguideId) and the existing `/api/influence/[committeeId]` route.

**Technical approach**:

1. For a given PAC: get all recipients via `recipient-resolver.ts` -> bioguideIds
2. For each recipient legislator: get their vote record on bills related to the PAC's lobbied issues
3. Aggregate: PAC gave $X to legislator Y, who voted yea on Z% of bills related to PAC's issue areas
4. Baseline: Compare to legislators who did NOT receive PAC funding on the same votes

5. Storage: `insight:pac_votes:{committeeId}` in Redis, 7-day TTL.

### Analyzer: Temporal Vote Pattern Shifts (Gap C1)

**What it detects**: Identifies significant changes in a legislator's voting behavior over time. Answers: "Did this legislator's party alignment change, and when?"

**Starts from**: `VotePatternAnalyzer` (already computes category counts and generates narratives).

**Technical approach**:

1. Full vote history from Congress.gov cache, partitioned into quarterly windows.

2. Pre-aggregation:
   - Party alignment score per quarter (votes with party / total votes)
   - Per-policy-area alignment per quarter
   - Rolling 4-quarter average with threshold-based shift detection (flag deviations > 10 percentage points from trailing average)

3. Correlation with external events: For each detected shift, check:
   - New committee assignments in that period
   - New large contributions (FEC quarterly filings)
   - Election proximity

4. AI narrative: Describe what changed and what else happened at the same time — without claiming causation.

5. Storage: `insight:temporal_votes:{bioguideId}` in Redis, 14-day TTL.

**Note on methodology**: With quarterly data and typical legislative terms, you have 8-24 data points per legislator. Complex change-point detection algorithms don't have meaningful statistical power at that scale. A simpler rolling-average threshold is more honest about the data limitations and easier to explain to users. Profile actual data distributions before committing to a specific method.

**UI**: `VoteShiftTimeline.tsx` — Recharts line chart showing party alignment over time, with markers at detected shift points.

### Analyzer: Stock Trade-Committee Jurisdiction (Gap B1)

**What it detects**: Identifies stock trades in industries that a legislator's committee oversees. Answers: "Did this legislator trade stocks in sectors their committee regulates?"

**Technical approach**:

1. Stock trades from House Clerk cache, ticker -> industry from Phase 1 resolver, committee -> industry from the existing committee-agency map.

2. Pre-aggregation:
   - For each trade: resolve ticker -> industry sector
   - Check if sector falls under any of the legislator's committee jurisdictions
   - Flag trades where sector matches committee jurisdiction

3. Statistical filter: With 535 members, ~3 committees each, and many trades, some overlaps are guaranteed by chance. Compute expected overlap rate and only flag overlaps exceeding the threshold determined after data profiling.

4. Storage: `insight:stock_committee:{bioguideId}` in Redis, 7-day TTL. House members only.

**Data quality warning**: House disclosures report amounts in ranges ("$1,001 - $15,000"), not exact figures. Tickers are self-reported and sometimes wrong or missing.

### Phase 2 File Additions

```
src/lib/intelligence/analyzers/
+-- lobbying-pipeline-analyzer.ts     # Gap A2
+-- pac-vote-analyzer.ts              # Gap E1
+-- temporal-vote-analyzer.ts         # Gap C1
+-- stock-committee-analyzer.ts       # Gap B1

src/lib/intelligence/entity-resolution/
+-- committee-alias-table.ts          # Built from data profiling
+-- lobbying-committee-resolver.ts    # Resolves government_entities text
+-- lda-issue-policy-map.ts           # LDA issue codes -> policyArea mapping

src/app/api/intelligence/
+-- representative/[bioguideId]/
|   +-- influence-chain/route.ts
|   +-- temporal/route.ts
+-- committee/[committeeId]/
|   +-- route.ts

src/components/intelligence/
+-- InfluenceChainTable.tsx
+-- VoteShiftTimeline.tsx
```

---

## Section 5 — Phase 3: Page Integration and Polish

### Goal

Complete the UI integration across all page types and ensure the intelligence layer is accessible, understandable, and honest about its limitations.

### Page Integrations

**Representative detail page** (`src/app/(civic)/representative/[bioguideId]/page.tsx`):

- "Intelligence" tab alongside existing tabs (Overview, Bills, Votes, Finance, etc.)
- `InsightCard` components for each available insight type
- Cards link to detail views with charts

**Committee detail page** (`src/app/(civic)/committees/[committeeId]/page.tsx`):

- "Intelligence" section below existing committee data
- Shows lobbying pipeline insight and member funding overlap (extending existing `FinanceJurisdictionOverlap`)

**Bill detail page** (`src/app/(civic)/bill/[billId]/page.tsx`):

- "Intelligence" section showing sponsor/cosponsor funding analysis and related lobbying activity

**District page** (`src/app/(civic)/districts/[districtId]/page.tsx`):

- Summary intelligence card for the district's representative(s)

### Remaining API Endpoints

| Endpoint                                                            | Purpose                                    |
| ------------------------------------------------------------------- | ------------------------------------------ |
| `GET /api/intelligence/representative/[bioguideId]/influence-chain` | Lobbying -> committee -> legislation chain |
| `GET /api/intelligence/representative/[bioguideId]/temporal`        | Voting pattern shift timeline              |
| `GET /api/intelligence/committee/[committeeId]`                     | Committee-level intelligence               |
| `GET /api/intelligence/bill/[billId]`                               | Bill-specific insights                     |
| `GET /api/intelligence/district/[districtId]`                       | District-level summary                     |

All routes follow existing pattern: `force-dynamic` with response-level `Cache-Control` headers. Insights are served from Redis cache or generated on-demand, so response times are sub-50ms for cached results.

### Making Insights Understandable

1. **Plain language enforcement**: All AI text passes through the existing reading level validator (Flesch-Kincaid <= 8, already built). Max 3 regeneration attempts; fallback to statistical summary.

2. **"What does this mean?" expandable**: Each insight card has a collapsible section explaining the methodology. Example: "We looked at all the companies that donated to this legislator's campaign. Then we looked at how the legislator voted on bills related to those companies' industries. This chart shows whether there's a pattern."

3. **Numbers with context**: Never show a number alone. Always pair with: (a) what it means, (b) the comparison group average, (c) whether the difference is statistically meaningful. Example: "72% alignment with the finance industry (peer average: 68%, not a statistically significant difference)."

4. **Progressive disclosure**: Summary first (one sentence), then key stats (3 numbers), then full analysis (paragraph + chart), then methodology (expandable).

---

## Section 6 — Phase 4: Open-Source Packaging ✅ COMPLETE

### Goal

Extract the most reusable components into standalone packages for other civic tech projects.

### Status: Shipped

Both packages extracted via npm workspaces with re-export shims at original paths:

- **`@civiq/civic-statistics`** — Correlation, peer comparison, confidence scoring. 1 source file, 7 consumers.
- **`@civiq/entity-resolution`** — Committee/agency alias matching, industry taxonomy, ticker-to-sector, FEC entity dedup, bioguide-FEC mapping. 11 source files, 35+ transitive consumers.

Logger and cache dependencies abstracted via `configure({ logger, cache })` injection.
Each package: `package.json`, `tsconfig.json`, `README.md`, `METHODOLOGY.md`, `CONTRIBUTING.md`, `LICENSE`.

### Package 1: `@civiq/entity-resolution`

**What**: Committee alias table, ticker-industry resolver, lobbying-committee resolver, FEC entity matching utilities, bioguide-FEC mapping utilities.

**Why reusable**: Every civic tech project that works with FEC, Congress.gov, and lobbying data faces the same identifier mismatch problems.

**Contents**:

- Committee alias table (name variants -> committee codes)
- SIC code -> industry sector mapping
- FEC donor deduplication utilities (Levenshtein + metadata scoring)
- Lobbying `government_entities` -> committee code resolver
- Stock ticker -> industry sector resolver
- Bioguide <-> FEC candidate ID mapping utilities
- TypeScript types for all resolution results

**Integration example**:

```typescript
import { resolveCommittee, resolveTickerIndustry } from '@civiq/entity-resolution';

const committee = resolveCommittee('Senate Committee on Finance');
// { committeeId: "SSFI", confidence: 0.97, method: "alias_table" }

const industry = resolveTickerIndustry('XOM');
// { sector: "ENERGY", sicCode: "1311", confidence: 1.0 }
```

### Package 2: `@civiq/civic-statistics`

**What**: Domain-specific wrappers around `simple-statistics` tuned for civic data patterns.

**Contents**:

- Correlation computation for vote-finance analysis (method chosen per data profile)
- Z-score computation with configurable peer groups
- Confidence interval computation
- Rolling-average shift detection for time-series
- Minimum sample size enforcement
- TypeScript types for all statistical outputs

### No `@civiq/insight-renderer` Package

The React UI components are designed around CIV.IQ's Aicher design system. Extracting them for other projects with different design systems creates a theming and customization burden that isn't worth maintaining. Other projects can reference CIV.IQ's component source code as implementation examples.

### Documentation Requirements

Each package needs:

1. **README.md**: Purpose, installation, quick start, API reference, examples
2. **METHODOLOGY.md**: Statistical methods, assumptions, and limitations. Not optional — civic data tools carry responsibility for how their outputs are interpreted.
3. **CONTRIBUTING.md**: How to contribute, coding standards, testing requirements
4. **LICENSE**: MIT

---

## Section 7 — Dependencies and Prerequisites

### npm Packages to Install

```bash
npm install simple-statistics    # Correlation, regression, z-scores — pure JS, no native deps
```

One new runtime dependency. Existing dependencies cover everything else:

- `fuse.js`: fuzzy matching (already installed, used in Phase 2 for lobbying resolution)
- `@upstash/redis`: insight caching (already installed)
- `recharts`: chart components (already installed)
- `zod`: input validation (already installed)

### Data Files to Download

1. **SEC EDGAR company tickers**: `https://www.sec.gov/files/company_tickers.json` (~500KB, CIK -> ticker -> SIC code). Save as `src/lib/intelligence/entity-resolution/sec-sic-data.json`. Update monthly.
2. **SIC code reference**: Static ~5KB file mapping SIC codes to industry names.

### Environment Variables

No new variables. All required API keys are already configured. The existing `GOOGLE_GENERATIVE_AI_API_KEY` and `generateAIText` provider abstraction handle the AI narrative calls.

### Database Migrations

None. Redis is schemaless. No SQL, no Prisma, no Drizzle.

### CLAUDE.md Updates

Add before Phase 1 starts:

```markdown
## Intelligence Layer

### Architecture

- Analyzers: `src/lib/intelligence/analyzers/` (on-demand, cached in Redis)
- Entity resolution: `src/lib/intelligence/entity-resolution/`
- Statistics: `src/lib/intelligence/statistics/` (wraps simple-statistics)
- API routes: `src/app/api/intelligence/`
- UI components: `src/components/intelligence/`

### Rules

- Statistics first, AI second. Every analyzer computes numbers before calling LLM.
- Every insight carries: confidence (0-1), dataAsOf, methodology, disclaimer.
- Minimum sample sizes: 10 votes per sector, 4 quarters for temporal, 3 trades for stock analysis.
- All AI text must pass reading level validation (Flesch-Kincaid <= 8).
- Never claim causation. Use "pattern", "correlation", "association" — never "caused", "influenced", "resulted in".
- Baselines required: always compare to peer group average.
- Kill threshold: if an analyzer's false positive rate exceeds 20%, do not ship it.
```

---

## Section 8 — False Positive Prevention

Every insight produced by every analyzer includes these protections:

1. **Comparative baseline**: "The average for legislators from similar districts/committees is X." Without this, every correlation looks suspicious.

2. **Confidence score**: 0-1, derived from sample size, statistical significance, and data completeness.

3. **Significance threshold**: Insights below 0.6 confidence are not shown by default. 0.6-0.8 shows with amber badge. Above 0.8 shows with green badge.

4. **Minimum data requirements**: No vote-finance correlation with fewer than 10 votes per sector. No temporal analysis with fewer than 4 quarters. No stock trade flagging without at least 3 trades.

5. **Disclaimer on every insight**: "This analysis shows factual patterns in public data. Correlation does not indicate wrongdoing or improper behavior."

6. **Peer group normalization**: A Texas representative's oil industry donations are compared to other Texas representatives, not the national average.

7. **Kill threshold**: After building any analyzer, measure its false positive rate. If more than 20% of flagged patterns are within the expected random baseline (i.e., the statistical filter can't separate signal from noise), do not ship that analyzer. Document the finding and move on. Define this threshold before building, not after.

---

## Section 9 — What NOT to Build

### 1. A Graph Database (Neo4j, Dgraph, etc.)

The relationship patterns are key-value lookups with optional scoring, not multi-hop traversals. Redis handles this at sub-millisecond latency with zero new infrastructure.

### 2. A Separate Redis Relationship Graph

The existing API endpoints already fetch and join the data needed for analysis (committees, contributions, votes, spending). Building a pre-computed graph layer (`graph:{entityType}:{id}:{relation}` sorted sets) duplicates data that's already accessible and adds a synchronization burden. Fetch from existing endpoints on demand, cache the computed insights.

### 3. A Pre-Computed Batch Pipeline with Cursor Management

A cron pipeline with cursor-based resumability and a processing queue is premature optimization. The on-demand + caching pattern (identical to `CivicAlignmentAnalyzer`) is simpler, follows existing patterns, and avoids building infrastructure before proving the insights are valuable. If demand grows to the point where on-demand generation causes latency problems, add batch pre-computation then.

### 4. Nostr Publisher Coupling for Change Detection

Wiring the intelligence pipeline's staleness detection to the Nostr publisher's change detection creates a fragile dependency between two independent systems. Instead, each insight carries its own `dataAsOf` timestamp and regenerates on request when stale. Independent staleness detection is simpler and more robust.

### 5. Bill Text Embeddings and Similarity Search (Gap D1)

Priority #7. Requires pgvector (new database). Interesting but not actionable for citizens the way vote-finance correlations are.

### 6. Real-Time Event-Driven Analysis

Government data updates on government timescales (FEC: quarterly, Congress.gov: hours to days). On-demand analysis with TTL-based caching is adequate.

### 7. A User-Facing Chat Interface

Conversational AI creates uncontrollable hallucination surface area. The intelligence layer's value is in pre-computed, validated, confidence-scored insights — the opposite of freeform generation.

### 8. Ideology Scoring or Political Leaning Classification

The platform's core commitment is nonpartisan factual analysis. Report facts: "voted with party 87% of the time on healthcare bills." Do not label: "leans liberal on healthcare."

### 9. Automated Social Media Posting of Insights

Automated posting of AI-generated correlations without editorial review is a liability. The Nostr layer publishes event facts (bill introduced, vote recorded), not AI-generated analysis.

### 10. Predictive Models

Prediction models are wrong often enough to be misleading and right often enough to be dangerous. Civic data tools should inform participation, not replace it.

### 11. Multi-Tenant SaaS Features

User accounts require auth, session management, a user database, GDPR/CCPA. None of this exists. CIV.IQ is a public utility accessible without login.

### 12. A Sankey Diagram for Lobbying Flows

D3 Sankey diagrams are high-effort, hard to make responsive, hard to make accessible. A structured table communicates the same lobbying -> committee -> bills data more clearly and takes a third of the effort.

### 13. OG Image Generation for Intelligence Insights

Nice-to-have, not core. Users can screenshot. Effort better spent on the analysis layer itself.

### 14. Scraping Data Sources That Have APIs

Government APIs exist for every source CIV.IQ uses. If the API is slow, cache. If rate-limited, batch. If incomplete, show "Data unavailable."

### 15. Rebuilding What Already Exists

The CivicAlignmentAnalyzer, FinanceJurisdictionOverlap, connections endpoint, policy-area-map, reading-level-validator, plain-language system prompt, and data fetching/joining logic in the connections endpoint are all working code. The intelligence layer extends them, not replaces them. Do not rebuild the data fetching and joining that `/api/representative/[bioguideId]/connections` already does.

### 16. Pre-Specified Statistical Methods Before Data Profiling

Do not commit to Pearson correlation, z-scores, or any specific statistical method before profiling the actual data. Civic data has non-normal distributions, small sample sizes, and heavy tails. Profile first, then choose appropriate methods. The `simple-statistics` library supports multiple approaches — pick the right one for the data, not the one that sounds most rigorous.
