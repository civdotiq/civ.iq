# Plan: Surface All Unsurfaced Data in CIV.IQ

## Context

CIV.IQ has ~40% of its computed data invisible to citizens. Built components sit unmounted, API responses drop fields before rendering, complete backend features have zero UI, and 6 government data services are only accessible via MCP tools. This plan organizes all unsurfaced data into implementation phases ordered by `citizen_value × (1 / effort)`.

**Guiding principle**: "Does this organize publicly available information and make it easy to understand for the average citizen?"

---

## Phase 1: Finance Tab — Mount Built Components + Surface Dropped Fields

**Citizen question**: "Where does my representative's money come from?"
**Effort**: ~3 hours | **Value**: Very High | **Dependencies**: None

### Problem

`CampaignFinanceVisualizer.tsx:244-278` maps the comprehensive finance response but drops 7 data fields. Three finished components (`FundingNarrative`, `GeographicBreakdown`, `FundraisingTrends`) are never imported.

### Changes

**`src/features/campaign-finance/components/CampaignFinanceVisualizer.tsx`**

- Extend mapper (line 247) to preserve: `geographic`, `contributionTrends`, `donorMetrics`, `sectorSummary`, `organizations`, `leadershipPACSponsors`, `conduitAggregates`
- Store these in new state variables (or extend `comprehensiveData` shape)
- **Overview sub-tab additions** (top to bottom):
  1. `FundingNarrative` — plain-language profile card ("grassroots", "PAC-heavy", etc.) at the TOP, before any numbers
  2. Donor metrics stat row — 4 cards: total donors, small-donor %, average donation, median donation (follow `HeroSummary` pattern)
  3. `GeographicBreakdown` — in-state vs out-of-state bar chart
  4. Sector summary — business vs labor vs ideological as 3-segment bar
  5. Leadership PAC sponsors — small list: "PAC money from these politicians"
  6. Conduit aggregates — single disclosure line: "X,XXX individuals contributed through ActBlue/WinRed"
- **Charts sub-tab**: Mount `FundraisingTrends` (quarterly timeline, burn rate, projections)
- **Contributions sub-tab**: Add `organizations` (employer-aggregated donors) above existing top contributors

**Files to modify**:

- `src/features/campaign-finance/components/CampaignFinanceVisualizer.tsx` — mapper + mount points
- No changes to `FundingNarrative.tsx`, `GeographicBreakdown.tsx`, `FundraisingTrends.tsx` — they're complete

**Reuse**: `DynamicFundraisingTrends` wrapper in `src/components/dynamic/index.tsx` already registered

---

## Phase 2: Intelligence Tab — Surface Dropped Analysis Fields

**Citizen question**: "What patterns should I know about?"
**Effort**: ~2 hours | **Value**: High | **Dependencies**: None

### Changes

**`src/components/intelligence/CivicBriefCard.tsx`**

- Add "Key numbers" row: `funding.totalSpent`, `funding.cashOnHand`, `voting.missedVotePct`
- Show `funding.contributionsSampled` as methodology footnote

**`src/components/intelligence/VoteShiftTimeline.tsx`**

- Under each shift marker, show `context` block: committees joined, large contributions, election proximity
- Render as a collapsible "Why this shift?" disclosure

**`src/components/intelligence/InfluenceChainCard.tsx`**

- Add: `"{chainsDropped} additional chains below confidence threshold excluded"` — one line

**`src/components/intelligence/VotePredictionCard.tsx`**

- Show `topPredictiveFactors` as a simple ranked list below the SHAP chart
- These are the citizen-readable version ("Party alignment: 72%", "Committee membership: 15%")

**`src/components/intelligence/IntelligenceTab.tsx`**

- Pass anomaly arrays from vote-finance and temporal insights to `AnomalyFlagsDisplay` (currently only finance-jurisdiction anomalies are shown)

**`src/components/intelligence/SectorLeaderboard.tsx`** and **`StockTradeLeaderboard.tsx`**

- Show `stats` block: mean, median, stddev as context row above the rankings

---

## Phase 3: District Tab on Representative Profile

**Citizen question**: "Does this rep actually work for my district?"
**Effort**: ~2 hours | **Value**: High | **Dependencies**: Verify civic-alignment + connections APIs

### Problem

`CivicAlignmentTab` (260 lines) and `ConnectionsTab` (372 lines) are fully built and tested but never imported.

### Changes

**`src/features/representatives/components/SimpleRepresentativeProfile.tsx`**

- Add 8th tab: "District" (icon: reuse existing or add `DistrictIcon` to AicherIcons)
- Dynamic import both components

**Create `src/features/representatives/components/DistrictTab.tsx`** (~40 lines)

- Composition wrapper rendering:
  1. `CivicAlignmentTab` — "How they vote for your district" (gap analysis, district needs vs votes)
  2. `ConnectionsTab` — "What's happening in your district" (spending, hearings, comment periods, civic actions)
- Both fetch independently via SWR (already implemented in each component)

**Information hierarchy**: Civic alignment gap analysis is the headline. Connections are drill-down context.

---

## Phase 4: Congress 119th Stats — Wire Live Data

**Citizen question**: "What does the current Congress look like?"
**Effort**: ~30 min | **Value**: Medium | **Dependencies**: None

### Changes

**`src/app/(civic)/congress/page.tsx`**

- Replace hardcoded stats (100, 435, etc.) with SWR fetch from `/api/congress/119th/stats`
- Render `byParty` breakdown and `demographics` (avg age, gender) — currently invisible

---

## Phase 5: Revive the State Page

**Citizen question**: "What's going on in my state?"
**Effort**: ~4 hours | **Value**: High | **Dependencies**: None

### Problem

`src/app/(civic)/states/[state]/page.tsx` line 587: `setStateData(null)` — every state shows "State not found." The UI scaffold (4 tabs, charts, leadership cards) is built but receives zero data.

### Changes

**`src/app/(civic)/states/[state]/page.tsx`** — Major rewrite of data layer

- Replace monolithic `fetchStateData()` with independent SWR hooks:
  1. `/api/state-executives/{state}` → governor, AG, secretary of state
  2. `/api/state-judiciary/{state}` → state courts
  3. `/api/state-demographics/{stateCode}` → population, income, unemployment, education
  4. `/api/state-legislature/{state}` → party breakdown, chambers, session info
- Each section renders independently with skeleton loaders
- Remove fake D3 placeholders (StateMap grey rectangle, KeyIssuesRadar)
- 2-tab structure with real data:
  - **Overview**: State demographics + leadership (governor, AG, SoS) + key stats
  - **Legislature**: Party control bars from OpenStates + legislator roster

**State slug mapping**: Verify `stateId` URL param maps to API state codes (may need a `slug-to-code` utility)

**NOT included** (see Phase 5B): Elections tab, Districts tab. Elections requires 2025 data ingestion first. Congressional districts belong on `/delegation/[stateCode]`.

---

## Phase 5B: Ingest 2025 Election Data + Elections Tab

**Citizen question**: "What happened in the last election?"
**Effort**: ~3 hours | **Value**: Medium | **Dependencies**: Phase 5

### Problem

Election data is frozen at 2024 (MEDSL/Harvard Dataverse). NJ and VA held governor + state house elections in Nov 2025. KY/LA/MS last voted in 2023 (next: 2027). State election cycles vary:

| Group           | States                                 | Frequency               | Next Big Sync |
| --------------- | -------------------------------------- | ----------------------- | ------------- |
| Standard 46     | All others                             | Even years (2026, 2028) | Nov 2026      |
| Odd-Year 4      | NJ, VA, MS, LA                         | Odd years (2025, 2027)  | Nov 2027      |
| 2-Year Senators | AR, CT, GA, ID, MA, NH, NY, NC, RI, VT | Every 2 years           | Nov 2026      |

### Changes

1. **Ingest 2025 MEDSL data** — Update `scripts/seed-election-data.ts` to pull 2025 results; create `src/data/election-results-2025-statewide.ts` and `election-results-2025-state-leg.ts`
2. **Create election cycle lookup** — utility mapping each state to its schedule group so the UI shows the correct "most recent election" year
3. **Add Elections tab to state page** — show most recent governor, state house, state senate results for that state based on cycle group
4. **Update `/api/elections/` route** — support `year=2025` parameter

---

## Phase 6: Money Report Card Page

**Citizen question**: "How does money affect ALL my representatives?"
**Effort**: ~5 hours | **Value**: Very High | **Dependencies**: None

### Problem

Backend complete at `/api/intelligence/address/money-report` (geocodes address, runs 4 analyzers per rep, returns per-rep scores + aggregates + narrative). Zero frontend exists.

### Changes

**Create `src/components/intelligence/MoneyReportCard.tsx`** (~200 lines)

- **Narrative headline**: `MoneyReportCardInsight.narrative` — plain-language district summary
- **Aggregates banner**: 4 stat cards — `highestOverlap`, `lowestOverlap`, `mostIndependent`, `leastIndependent`
- **Per-rep cards**: For each rep in `representatives[]`:
  - Name, party (color-coded), chamber badge
  - `voteFinanceCorrelation` → percentage bar ("X% of votes align with top donor industries")
  - `financeJurisdictionOverlap` → percentage bar ("X% of campaign money from industries they oversee")
  - `independenceScore` → gauge ("How independently do they vote?")
  - `influenceChainCount` → count badge ("X traceable lobbying→legislation paths")
  - Link to full representative profile
- **Disclaimer footer** from API response
- **Source attribution** with methodology accordion

**Create `src/app/(civic)/your-reps/money-report/page.tsx`** (~80 lines)

- Address form (reuse pattern from `RepresentativeLookupForm`)
- On submit → POST to `/api/intelligence/address/money-report`
- Render `MoneyReportCard` with response
- Handle loading (skeleton), errors, multi-district warnings

**Modify `src/app/(civic)/your-reps/page.tsx`**

- Add CTA card below the form: "See the full Money Report Card for your representatives →"

**Modify `src/shared/components/navigation/Header.tsx`**

- Add "Money Report" to the nav dropdown under "Your Reps" (or as sibling nav item)

---

## Phase 7: Influence Graph Visualization

**Citizen question**: "How does lobbying money become policy?"
**Effort**: ~6 hours | **Value**: Very High | **Dependencies**: None

### Problem

The influence-graph analyzer extends the 4-node influence chain with regulation, enforcement, court cases, and outcome signals. It's the most sophisticated analysis in the system. NO UI component exists.

### Design Decision

Do NOT render a node-link graph diagram — it would overwhelm citizens. Use a **vertical pipeline metaphor**: each chain is a linear story told step-by-step.

### Changes

**Create `src/components/intelligence/InfluenceGraphCard.tsx`** (~300 lines)

- **Narrative headline**: `InfluenceGraphInsight.narrative`
- **Stats bar**: entities tracked, regulation connections, enforcement actions (3 compact stat boxes)
- **Chain pipelines** (show top 3 by confidence, expand for all):
  - Step 1: `[Org]` lobbied for `[issue]` — `$X` spent
  - Step 2: `[Rep]` voted `[YEA/NAY]` on `[bill]` — with text similarity %
  - Step 3 (if `regulationNode`): `[Agency]` created regulation `[docket]` — status badge
  - Step 4 (if `enforcementActions`): `[Agency]` enforcement — `X actions, $Y penalties`
  - Step 5 (if `courtCases`): Court case — `[caseName]` in `[court]` — status
  - Step 6 (if `outcomeSignals`): Outcome — `[metric]` changed `[X%]` vs baseline
  - Each step: bordered card, vertical connecting line, confidence dot
  - Missing steps simply omitted (most chains have 3-4 nodes, not all 6)
- **Peer comparison**: percentile rank vs same-chamber legislators
- **Expand disclosure**: "Show all N chains" toggle
- **Source citations + methodology accordion**

**Modify `src/components/intelligence/IntelligenceTab.tsx`**

- Add SWR call for `/api/intelligence/representative/{id}/influence-graph`
- Mount `InfluenceGraphCard` in Tier 2 section, after existing influence chains
- This endpoint is expensive (up to 60s) — loads independently, shows skeleton

---

## Phase 8: Elections Page — Federal / State Hierarchy

**Citizen question**: "What were the election results?"
**Effort**: ~4 hours | **Value**: Medium | **Dependencies**: None

### Design Decision

Federal and state elections are separate tiers. The page hierarchy reflects this:

- `/elections` — Landing page with cards linking to federal and state sections
- `/elections/federal` — President, US Senate, US House tabs
- `/elections/state` — Governor, State Legislature tabs

### Changes

**Create `src/app/(civic)/elections/page.tsx`** (~60 lines)

- Two section cards: "Federal Elections" and "State Elections"
- Each card: brief description, link to subpage
- Year selector (2024, 2025 where applicable)
- Breadcrumb: Elections

**Create `src/app/(civic)/elections/federal/page.tsx`** (~200 lines)

- 3 tabs: President | US Senate | US House
- State filter dropdown (all tabs)
- District filter (House tab only)
- Results table: candidate party (color dot), vote count, percentage, margin, winner badge
- Data source: `/api/elections/2024?type=president|senate|house`
- Breadcrumb: Elections → Federal

**Create `src/app/(civic)/elections/state/page.tsx`** (~200 lines)

- 2 tabs: Governor | State Legislature
- State filter dropdown
- Chamber filter (Legislature tab: upper/lower)
- Results table: same format as federal
- Data source: `/api/elections/2024?type=governor|state-leg` + `/api/elections/2025?type=governor` (NJ/VA)
- Breadcrumb: Elections → State

**Shared components** (if needed):

- `ElectionResultsTable.tsx` — reusable table for both pages
- State filter dropdown — shared between federal and state pages

**Also feeds Phase 5**: State page elections tab reuses same API with state filter

---

## Phase 9: Enforcement Explorer

**Citizen question**: "What is the government doing about [industry/company/in my state]?"
**Effort**: ~5 hours | **Value**: Medium-High | **Dependencies**: Phase 5 (state page) benefits

### Changes

**Add enforcement section to state page** (Phase 5 enhancement)

- Fetch `/api/intelligence/enforcement/state/{state}`
- Show penalty amounts by agency, trend direction, narrative

**Add enforcement-by-org to industry page**

- Fetch `/api/intelligence/enforcement/organization?name={org}`
- Show in the existing industry sector page alongside sector leaderboard

**Consider standalone `/enforcement` page** with agency/sector/state filters

- Combines all three enforcement endpoints with a filter bar

---

## Phase 10: Civic Data Services — Housing, Safety, Health Accountability

**Citizen question**: "What public data about housing, crime, and health industry influence affects my community?"
**Effort**: ~9 hours total | **Value**: Medium | **Dependencies**: API keys for FBI, HUD

### Guiding filter

Each item must organize publicly available civic data and make it easy for citizens to understand. Dropped NOAA (weather isn't civic accountability) and NHTSA (consumer safety lookup, not civic intelligence).

### Changes (by data source, prioritized by civic relevance)

1. **HUD** (~3h) — Add "Housing Affordability" section to district page
   - Create API route `/api/district/{districtId}/housing`
   - Call `getFairMarketRents()` + `getIncomeLimits()` by county FIPS
   - Show: fair market rent by bedroom count, income limit thresholds
   - Civic value: citizens can see if housing policy matches their district's reality
   - Needs `HUD_API_TOKEN`

2. **FBI UCR** (~2h) — Add "Public Safety" section to state page
   - Create API route `/api/states/{state}/crime`
   - Call `getCrimeStatsByState()` + `getCrimeTrend()`
   - Show: crime rates vs national average, clearance rates, trend chart
   - Civic value: ground-truth crime data vs political rhetoric about public safety
   - Needs `DATA_GOV_API_KEY`

~~3. **FDA** — REMOVED. Consumer safety (product recalls) is not civic intelligence about representation.~~

~~4. **Open Payments** — REMOVED. Payments to doctors are healthcare transparency, not civic data about how government represents citizens.~~

---

## Implementation Order

One phase at a time. Implement → test → commit → move on. No phase starts until the previous one is committed.

| #   | Phase                                                      | Effort | Status | Commit   |
| --- | ---------------------------------------------------------- | ------ | ------ | -------- |
| 1   | Finance tab enrichment                                     | ~3h    | `[x]`  | aad52709 |
| 2   | Intelligence dropped fields                                | ~2h    | `[x]`  | 547fb5ec |
| 3   | District tab (alignment + connections)                     | ~2h    | `[x]`  | 15337408 |
| 4   | Congress 119th live stats                                  | ~30m   | `[x]`  | 8128319a |
| 5   | State page revival (Overview + Legislature)                | ~4h    | `[x]`  | 32629f6a |
| 5B  | Election cycle utility + Elections tab (2025 data pending) | ~3h    | `[x]`  | 5798c635 |
| 6   | Money report card page                                     | ~5h    | `[x]`  | 78b2e242 |
| 7   | Influence graph visualization                              | ~6h    | `[x]`  | 84af5a96 |
| 8   | Elections page (federal/state hierarchy)                   | ~4h    | `[x]`  | pending  |
| 9   | Enforcement explorer                                       | ~5h    | `[x]`  | f7e36ea3 |
| 10  | Civic data services (HUD, FBI, FDA, Open Payments)         | ~9h    | `[x]`  | f7e36ea3 |

### Per-Phase Checkpoint

After implementing each phase, before committing:

1. `npm run validate:all` — lint, type-check, test, build must pass
2. Visual check on `localhost:3000` — verify the new data renders
3. Confirm real API data loads (not mocked)
4. Confirm empty states render when data is unavailable
5. Commit with conventional format: `feat(phase-name): description`
6. Update this table: mark `[x]`, add commit hash

---

## Critical Files Reference

| File                                                                      | Lines | Role                                | Phases |
| ------------------------------------------------------------------------- | ----- | ----------------------------------- | ------ |
| `src/features/campaign-finance/components/CampaignFinanceVisualizer.tsx`  | 1670  | Finance data mapper + tabs          | 1      |
| `src/features/representatives/components/SimpleRepresentativeProfile.tsx` | 591   | Rep profile tab structure           | 3      |
| `src/components/intelligence/IntelligenceTab.tsx`                         | 345   | Intelligence endpoint orchestration | 2, 7   |
| `src/components/intelligence/CivicBriefCard.tsx`                          | ~200  | Brief card rendering                | 2      |
| `src/components/intelligence/VoteShiftTimeline.tsx`                       | ~150  | Temporal shift display              | 2      |
| `src/components/intelligence/InfluenceChainCard.tsx`                      | ~250  | Influence chain display             | 2      |
| `src/components/intelligence/VotePredictionCard.tsx`                      | ~200  | Vote prediction display             | 2      |
| `src/app/(civic)/states/[state]/page.tsx`                                 | 855   | Dead state page                     | 5      |
| `src/app/(civic)/your-reps/page.tsx`                                      | 41    | Your reps entry point               | 6      |
| `src/app/api/intelligence/address/money-report/route.ts`                  | ~200  | Money report backend                | 6      |
| `src/features/campaign-finance/components/GeographicBreakdown.tsx`        | 392   | Built, unmounted                    | 1      |
| `src/features/campaign-finance/components/FundraisingTrends.tsx`          | 641   | Built, unmounted                    | 1      |
| `src/features/campaign-finance/components/FundingNarrative.tsx`           | 96    | Built, unmounted                    | 1      |
| `src/features/representatives/components/CivicAlignmentTab.tsx`           | 260   | Built, unmounted                    | 3      |
| `src/features/representatives/components/ConnectionsTab.tsx`              | 372   | Built, unmounted                    | 3      |

---

## Unsurfaced Data Inventory (Complete)

### Already-Built Components Never Mounted

| Component             | Lines | Location                                    | Receives                               |
| --------------------- | ----- | ------------------------------------------- | -------------------------------------- |
| `GeographicBreakdown` | 392   | `src/features/campaign-finance/components/` | Props (data, dataQuality, totalRaised) |
| `FundraisingTrends`   | 641   | `src/features/campaign-finance/components/` | Props (data with timeline + summary)   |
| `FundingNarrative`    | 96    | `src/features/campaign-finance/components/` | Props (narrative object)               |
| `CivicAlignmentTab`   | 260   | `src/features/representatives/components/`  | Fetches own data via SWR               |
| `ConnectionsTab`      | 372   | `src/features/representatives/components/`  | Fetches own data via SWR               |

### API Endpoints With No UI Consumer

| Endpoint                                                | Data Source                                                | Response Type              |
| ------------------------------------------------------- | ---------------------------------------------------------- | -------------------------- |
| `/api/intelligence/representative/{id}/influence-graph` | Federal Register, EPA, OSHA, CourtListener, FRED           | `InfluenceGraphInsight`    |
| `/api/intelligence/address/money-report`                | Census Geocoder + 4 analyzers per rep                      | `MoneyReportCardInsight`   |
| `/api/elections/2024`                                   | Static MEDSL/Harvard Dataverse                             | `RaceResultFull`           |
| `/api/congress/119th/stats`                             | Pre-built JSON                                             | Party/demo/state breakdown |
| `/api/intelligence/enforcement/state/{state}`           | EPA, OSHA, SEC, CFPB                                       | `EnforcementInsight`       |
| `/api/intelligence/enforcement/organization`            | EPA, OSHA, SEC, CFPB                                       | `EnforcementInsight`       |
| `/api/intelligence/regulation/{agencySlug}`             | Federal Register, Senate LDA                               | `RegulationInsight`        |
| `/api/representative/{id}/civic-alignment`              | Congress.gov, FEC, Census ACS                              | `CivicAlignmentReport`     |
| `/api/representative/{id}/connections`                  | USASpending, GovInfo, Fed Register, OpenStates, Legistar   | Connections bundle         |
| `/api/representative/{id}/leadership`                   | Congress.gov                                               | Leadership positions       |
| `/api/compare`                                          | Congress.gov (votes only; finance/effectiveness are stubs) | Comparison data            |

### Data Fields Fetched But Dropped Before UI

| Source Endpoint                                  | Dropped Fields                                                                                                                     | Where They Should Go                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `/api/representative/{id}/finance/comprehensive` | `geographic`, `contributionTrends`, `donorMetrics`, `sectorSummary`, `organizations`, `leadershipPACSponsors`, `conduitAggregates` | Finance tab overview/charts/contributions |
| CivicBriefCard data                              | `funding.totalSpent`, `funding.cashOnHand`, `voting.missedVotePct`, `funding.contributionsSampled`                                 | Brief card key numbers                    |
| VoteShiftTimeline data                           | `VoteShift.context` (committees, contributions, election proximity)                                                                | Shift marker disclosures                  |
| InfluenceChainCard data                          | `chainsDropped`                                                                                                                    | Methodology transparency line             |
| VotePredictionCard data                          | `topPredictiveFactors`                                                                                                             | Ranked list below SHAP                    |
| SectorLeaderboard data                           | `stats` (mean, median, stddev)                                                                                                     | Context row above rankings                |
| StockTradeLeaderboard data                       | `stats` (mean, median, stddev)                                                                                                     | Context row above rankings                |
| AnomalyFlagsDisplay                              | Non-finance anomaly arrays (vote-finance, temporal)                                                                                | Per-insight anomaly display               |

### Data Services With Zero UI Exposure (MCP-Only)

| Service           | File                                      | API Key                       | Key Data                                                        | Phase 10 |
| ----------------- | ----------------------------------------- | ----------------------------- | --------------------------------------------------------------- | -------- |
| FBI UCR           | `src/lib/data-sources/fbi-ucr-service.ts` | `DATA_GOV_API_KEY` (required) | State crime rates, national comparison, clearance rates, trends | Yes      |
| ~~FDA~~           | ~~removed~~                               | —                             | ~~Removed: consumer safety, not civic intelligence~~            | —        |
| HUD               | `src/lib/data-sources/hud-service.ts`     | `HUD_API_TOKEN` (required)    | Fair market rents, income limits by county                      | Yes      |
| ~~Open Payments~~ | ~~removed~~                               | —                             | ~~Removed: payments to doctors, not civic representation data~~ | —        |
| NOAA              | `src/lib/data-sources/noaa-service.ts`    | `NOAA_TOKEN` (required)       | Climate normals, severe weather events with damage              | Dropped  |
| NHTSA             | `src/lib/data-sources/nhtsa-service.ts`   | None                          | Vehicle recalls (parkIt flag), safety complaints                | Dropped  |

### Dead Pages

| Page              | Issue                                                                              | Fix                    |
| ----------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| `/states/[state]` | `fetchStateData()` sets null unconditionally — "State not found" for all 50 states | Wire 5 real API routes |
