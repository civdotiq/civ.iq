# Full Influence Graph — Implementation Plan

## Overview

Build the complete **money -> lobbying -> legislation -> regulation -> enforcement -> outcome** connected graph. This traces how money flows through the political system to produce real-world outcomes using only publicly available government data.

**Example citizen-facing output:**

> Dow Chemical spent $14.2M lobbying on environmental regulation and donated $47,000 to Sen. Smith (Energy & Commerce). Sen. Smith voted Yea on HR-4521 (Clean Water Standards Reduction Act). The EPA issued final rule EPA-HQ-OW-2025-0342, relaxing discharge limits. EPA enforcement actions in the chemical sector dropped 34% year-over-year. Dow's stock rose 12% the following quarter.
>
> _This analysis traces public data. Correlation does not indicate causation._

**Phase dependency:**

```
Phase 1 (Entity Resolution) ──> Phase 2 (Regulation) + Phase 3 (Enforcement) ──> Phase 4 (Full Graph) ──> Phase 5 (UI)
```

Phases 2 and 3 can run in parallel. Each phase is independently shippable and must pass `npm run validate:all`.

---

## How to Use This Document

Clear context between phases. Paste the relevant phase section below into a fresh Claude Code instance along with this preamble:

> **Project context:** CIV.IQ is a civic intelligence platform (Next.js 16 + TypeScript + React 18) that uses ONLY real government APIs. See CLAUDE.md for all rules. The codebase has 181 API endpoints, 16 intelligence analyzers, and an entity resolution package at `packages/entity-resolution/`. All analyzers follow the pattern: cache -> fetch -> statistics first -> AI narrative -> cache. Every insight carries InsightBase metadata (confidence 0-1, dataAsOf, methodology, disclaimer). TypeScript strict mode, no `any` types. No mock data ever. Reading level <= Flesch-Kincaid 8. Never claim causation.

Then paste the specific phase instructions.

---

## Phase 1: Entity Resolution Foundation

### Prompt

````
Implement Phase 1 of PLAN-influence-graph.md: Entity Resolution Foundation.

**Problem**: Company names vary across 6 federal APIs. "DOW CHEMICAL CO TEXAS OPERATIONS" (EPA) vs "Dow Inc." (SEC) vs "DOW INC" (FEC). Three duplicate normalization implementations exist in the codebase.

**What to build:**

1. **`packages/entity-resolution/src/company-entity-resolver.ts`** — Unified company name resolver.
   - Consolidate EXISTING duplicate code:
     - `normalizeOrgName()` from `src/lib/intelligence/analyzers/influence-chain-analyzer.ts` (line ~243)
     - `cleanNameForMatching()` from `packages/entity-resolution/src/fec-entity-resolution.ts` (line ~92)
     - `expandAbbreviation()` from fec-entity-resolution.ts (line ~51)
     - `levenshteinDistance()` duplicated in both files above
     - `validateTokenOverlap()` from influence-chain-analyzer.ts (line ~223)
   - Add SIC/NAICS cross-validation using existing `sicToSector()` from `packages/entity-resolution/src/sic-sector-map.ts`
   - Exports:
     - `resolveCompanyName(rawName, context?: { sicCode?, naicsCode?, state? }): ResolvedCompany | null`
     - `resolveCompanyNames(entries: Array<{ name, source, context? }>): Map<string, ResolvedCompany>`
     - `normalizeCompanyName(name: string): string`
     - `companiesMatch(a, b, context?): { match: boolean; confidence: number }`
   - Type:
     ```typescript
     interface ResolvedCompany {
       canonicalName: string;
       normalizedName: string;
       aliases: string[];
       sicCodes: string[];
       naicsCodes: string[];
       sector: IndustrySector | null;
       cik: string | null;
       confidence: number;  // 0-1
     }
     ```

2. **`packages/entity-resolution/src/company-alias-table.ts`** — Static mapping of top 500 companies by lobbying spend.
   - Canonical name + known aliases across EPA/OSHA/CFPB/SEC/FEC/LDA
   - Include SIC codes, sector, and CIK where known
   - Exports: `COMPANY_ALIAS_TABLE`, `findCompanyByAlias(name): CompanyAlias | null`

3. **Update `packages/entity-resolution/src/index.ts`** — Add exports for new modules.

4. **Refactor `src/lib/intelligence/analyzers/influence-chain-analyzer.ts`** — Replace local implementations (lines ~156-249) with imports from the new package. Behavior must be identical; this is a deduplication refactor, not a feature change.

5. **Tests** — `packages/entity-resolution/src/__tests__/company-entity-resolver.test.ts`:
   - Cross-API: EPA "DOW CHEMICAL CO" matches SEC "Dow Inc." via alias table
   - Token overlap: "American Health Association" does NOT match "American Heart Association"
   - SIC boost: matching SIC codes increase confidence
   - Batch: 100 names resolve in <100ms
   - Existing fec-entity-resolution tests still pass

**Run `npm run validate:all` when complete.**
````

---

## Phase 2: Regulation Node

### Prompt

````
Implement Phase 2 of PLAN-influence-graph.md: Regulation Node.

**Prereq**: Phase 1 (entity resolution) is complete and committed.

**Problem**: Bills authorize or weaken regulatory action, but CIV.IQ doesn't link legislation to rulemaking. No direct bill-to-docket mapping exists in any government API.

**Join strategy (3 methods, tried in order):**
1. RIN-based (0.95 confidence): Federal Register `regulation_id_numbers` field -> Regulations.gov docket
2. Committee-agency (0.80 confidence): Bill committee -> existing `committee-agency-map.ts` -> agency slug -> Federal Register docs from that agency matching bill's policy area keywords from `policy-area-map.ts`
3. Text similarity (0.50 confidence): Embed bill title + regulation title via existing `embedText()` from `src/lib/intelligence/embeddings/embedding-classifier.ts`

**What to build:**

1. **Extend `src/lib/data-sources/regulations-gov-service.ts`** — Add to existing `RegulationsGovService` class:
   - `searchByRIN(rin: string): Promise<RegDocument[]>`
   - `getDocketDocuments(docketId: string): Promise<RegDocument[]>`
   - `getRuleLifecycle(docketId: string): Promise<RuleLifecycle>` — Track: proposed -> comment_period -> comment_closed -> final -> effective -> withdrawn
   - `getOrganizationComments(docketId, orgName): Promise<{ comments: RegComment[]; total: number }>`

2. **Extend `src/lib/data-sources/federal-register-service.ts`** — Add:
   - `searchAgencyRules(agencySlug, opts?: { dateFrom?, dateTo?, type? }): Promise<FederalRegisterAPIDocument[]>`
   - `getDocumentsByRIN(rin: string): Promise<FederalRegisterAPIDocument[]>`
   - `findRegulationsForBill(billTitle, policyArea, committees[]): Promise<FederalRegisterAPIDocument[]>` — The critical join. Chain: committees -> `getAgenciesForCommittee()` (from entity-resolution package) -> agency slugs -> Federal Register query filtered by policy-area keywords from `src/lib/connections/policy-area-map.ts`

3. **Add types to `src/types/regulations-gov.ts`:**
   ```typescript
   export interface RuleLifecycle {
     docketId: string;
     agencyId: string;
     title: string;
     status: 'proposed' | 'comment_period' | 'comment_closed' | 'final' | 'effective' | 'withdrawn';
     proposedDate: string | null;
     commentOpenDate: string | null;
     commentCloseDate: string | null;
     finalRuleDate: string | null;
     effectiveDate: string | null;
     totalComments: number;
     rin: string | null;
   }
````

4. **Add types to `src/lib/intelligence/types.ts`:**

   ```typescript
   export interface RegulationNode {
     docketId: string;
     agency: string;
     agencySlug: string;
     title: string;
     type: 'proposed_rule' | 'final_rule';
     status: RuleLifecycle['status'];
     publicationDate: string;
     rin: string | null;
     commentCount: number;
     linkMethod: 'committee_agency' | 'rin' | 'text_similarity';
     linkConfidence: number;
   }

   export interface RegulationInsight extends InsightBase {
     agencySlug: string;
     agencyName: string;
     regulationBillLinks: Array<{
       regulation: RegulationNode;
       billId: string;
       billTitle: string;
       confidence: number;
     }>;
     lobbyingCommentOverlap: Array<{
       organization: string;
       lobbyingSpending: number;
       commentCount: number;
       isOverlap: boolean;
     }>;
     activeRulemakings: number;
     finalizedRules: number;
     withdrawnRules: number;
     peerComparison: PeerComparison;
     narrative: string;
   }
   ```

5. **New analyzer: `src/lib/intelligence/analyzers/regulation-analyzer.ts`**
   - `analyzeRegulations(agencySlug): Promise<RegulationInsight | null>`
   - Follow exact pattern of `lobbying-pipeline-analyzer.ts`: cache -> fetch -> statistics -> AI narrative -> cache
   - Use shared utilities from `./shared.ts` (withTimeout, generateInsightNarrative, freshestDate, etc.)
   - Key insight: "3 of the top 5 lobbying orgs on this committee also commented on the resulting EPA rules"
   - Minimum sample: 2 regulation-bill links required

6. **New API route: `src/app/api/intelligence/regulation/[agencySlug]/route.ts`**
   - `force-dynamic`, `maxDuration = 60`
   - Cache-Control: `public, s-maxage=10800, stale-while-revalidate=3600` (3h)
   - Pattern: match existing intelligence routes exactly

7. **Tests** for regulation analyzer and service extensions.

**Run `npm run validate:all` when complete.**

```

---

## Phase 3: Enforcement Node

### Prompt

```

Implement Phase 3 of PLAN-influence-graph.md: Enforcement Node.

**Prereq**: Phase 1 (entity resolution) is complete and committed.

**Problem**: Regulations are meaningless without enforcement. Aggregate enforcement actions across EPA, OSHA, and CFPB, linked to regulated sectors via entity resolution.

**What to build:**

1. **New service: `src/lib/data-sources/osha-service.ts`**
   - Base URL: `https://apiprod.dol.gov/v4/osha/`
   - Auth: `DOL_API_KEY` env var (header: `Authorization: Bearer ${key}`)
   - Rate limit: 200ms interval (conservative)
   - Cache TTL: 6 hours
   - Follow EXACT pattern of `epa-echo-service.ts`: rateLimitedFetch(), cachedFetch(), transform functions
   - Methods:
     - `searchInspections({ state?, sicCode?, establishmentName?, limit?, offset? }): Promise<OshaInspection[]>`
     - `getViolations(activityNumber): Promise<OshaViolation[]>`
     - `getInspectionSummaryBySIC(sicCode, state?): Promise<OshaInspectionSummary>`
   - Tables: `OSHA_inspection`, `OSHA_violation`
   - Pagination: `limit=200` + `offset`

2. **New types: `src/types/osha.ts`** — Follow pattern of `src/types/epa.ts`:

   ```typescript
   export interface OshaInspection {
     activityNumber: string;
     establishmentName: string;
     siteAddress: string;
     siteCity: string;
     siteState: string;
     siteZip: string;
     sicCode: string;
     naicsCode: string;
     inspectionType: string;
     openDate: string;
     closeDate: string | null;
     totalCurrentPenalty: number;
     violationCount: number;
     seriousViolationCount: number;
   }

   export interface OshaViolation {
     activityNumber: string;
     citationId: string;
     violationType: 'S' | 'W' | 'R' | 'O';
     currentPenalty: number;
     initialPenalty: number;
     standard: string;
     abatementDate: string | null;
   }

   export interface OshaInspectionSummary {
     sicCode: string;
     state: string | null;
     totalInspections: number;
     totalPenalties: number;
     avgPenalty: number;
     seriousViolationRate: number;
     periodStart: string;
     periodEnd: string;
   }
   ```

3. **Extend `src/lib/data-sources/epa-echo-service.ts`** — Add:
   - `searchEnforcementCases({ state?, sicCode?, facilityName?, penaltyMin?, dateFrom? }): Promise<EpaEnforcementCase[]>` — via `case_rest_services.get_cases`
   - `getEnforcementCaseDetail(caseNumber): Promise<EpaEnforcementCaseDetail | null>` — penalties assessed vs paid
   - `getComplianceHistory(registryId): Promise<EpaComplianceTimeline>` — quarterly compliance data

4. **Add types to `src/types/epa.ts`:** `EpaEnforcementCase`, `EpaComplianceTimeline`

5. **Extend `src/lib/data-sources/cfpb-complaint-service.ts`** — Add:
   - `getCompanyTrends(company, periodMonths?): Promise<CfpbCompanyTrend>` — monthly counts + trend
   - `getCompanyBreakdown(company): Promise<CfpbCompanyBreakdown>` — by product, issue, state

6. **Add types to `src/types/cfpb.ts`:** `CfpbCompanyTrend`, `CfpbCompanyBreakdown`

7. **New analyzer: `src/lib/intelligence/analyzers/enforcement-analyzer.ts`**
   - `analyzeEnforcement(scope): Promise<EnforcementInsight | null>`
   - Scope: `{ type: 'sector', sector }` | `{ type: 'state', state }` | `{ type: 'organization', name }`
   - Flow:
     1. Query EPA ECHO + OSHA + CFPB in parallel based on scope
     2. Use `resolveCompanyName()` from `@civiq/entity-resolution` to match entities across agencies
     3. Use `sicToSector()` to normalize to 13-sector model
     4. Map facilities to congressional districts: EPA via FacLat/FacLong, OSHA via address -> existing Census Geocoder
     5. Compute statistics: total actions, total penalties, trend, by-agency breakdown
     6. Generate narrative (Flesch-Kincaid <= 8)
   - Minimum sample: 3 enforcement actions

8. **Add types to `src/lib/intelligence/types.ts`:**

   ```typescript
   export interface EnforcementAction {
     agency: 'EPA' | 'OSHA' | 'SEC' | 'CFPB';
     actionType: string;
     organization: string;
     resolvedCompany: ResolvedCompany | null;
     sector: IndustrySector | null;
     penaltyAmount: number;
     date: string;
     state: string;
     district: string | null;
   }

   export interface EnforcementInsight extends InsightBase {
     scope:
       | { type: 'sector'; sector: IndustrySector }
       | { type: 'state'; state: string }
       | { type: 'organization'; name: string };
     actions: EnforcementAction[];
     stats: {
       totalActions: number;
       totalPenalties: number;
       byAgency: Array<{ agency: string; count: number; penalties: number }>;
       trend: 'increasing' | 'decreasing' | 'stable';
       periodMonths: number;
     };
     linkedRegulations: Array<{ docketId: string; title: string; agency: string }>;
     peerComparison: PeerComparison;
     narrative: string;
   }
   ```

9. **New API routes:**
   - `src/app/api/intelligence/enforcement/sector/[sector]/route.ts`
   - `src/app/api/intelligence/enforcement/state/[state]/route.ts`
   - `src/app/api/intelligence/enforcement/organization/route.ts` (query param `?name=`)
   - All: `force-dynamic`, `maxDuration = 60`, Cache-Control 6h

10. **Tests** for OSHA service, enforcement analyzer, EPA extensions, CFPB extensions.

**Env var needed: `DOL_API_KEY` (register at dataportal.dol.gov/api-keys)**

**Run `npm run validate:all` when complete.**

```

---

## Phase 4: CourtListener + Full Graph Assembly

### Prompt

```

Implement Phase 4 of PLAN-influence-graph.md: CourtListener + Full Graph Assembly.

**Prereqs**: Phase 1 (entity resolution), Phase 2 (regulation node), and Phase 3 (enforcement node) are all complete and committed.

**Problem**: Enforcement actions often lead to court cases. Assemble the complete 6-node influence graph that traces money to outcomes.

**What to build:**

1. **New service: `src/lib/data-sources/courtlistener-service.ts`**
   - Base URL: `https://www.courtlistener.com/api/rest/v4/`
   - Auth: `COURTLISTENER_API_TOKEN` env var (header: `Authorization: Token ${token}`)
   - Rate: 750ms interval (5,000 queries/hr)
   - Cache TTL: 12 hours
   - Methods:
     - `searchDockets({ partyName?, court?, dateAfter?, limit? }): Promise<CourtCase[]>`
     - `searchAgencyCases(agencyName, opts?): Promise<CourtCase[]>`
     - `getJudgePositions(personId): Promise<JudgePosition[]>`

2. **New types: `src/types/courtlistener.ts`:**

   ```typescript
   export interface CourtCase {
     docketId: number;
     caseName: string;
     court: string;
     dateFiled: string;
     dateTerminated: string | null;
     parties: string[];
     natureOfSuit: string | null;
   }

   export interface JudgePosition {
     personId: number;
     name: string;
     court: string;
     dateStart: string;
     nominatedBy: string | null;
     appointedBy: string | null;
   }
   ```

3. **Extend `InfluenceChainLink.type` in `src/lib/intelligence/types.ts`:**

   ```typescript
   // Add to existing union:
   | 'regulation' | 'enforcement' | 'court_case' | 'outcome'
   ```

4. **Add new types to `src/lib/intelligence/types.ts`:**

   ```typescript
   export interface OutcomeSignal {
     type: 'stock_price' | 'economic_indicator' | 'enforcement_trend' | 'complaint_trend';
     metric: string;
     value: number;
     change: number;
     periodStart: string;
     periodEnd: string;
     direction: 'positive' | 'negative' | 'neutral';
     baseline: { value: number; label: string };
   }

   export interface InfluenceGraphChain extends InfluenceChain {
     regulationNode: RegulationNode | null;
     enforcementActions: EnforcementAction[];
     courtCases: Array<{ caseName: string; court: string; dateFiled: string; status: string }>;
     outcomeSignals: OutcomeSignal[];
   }

   export interface InfluenceGraphInsight extends InsightBase {
     bioguideId: string;
     chains: InfluenceGraphChain[];
     totalChainsDetected: number;
     chainsDropped: number;
     graphStats: {
       nodesCount: number;
       edgesCount: number;
       avgChainLength: number;
       maxChainLength: number;
       regulationLinks: number;
       enforcementLinks: number;
     };
     peerComparison: PeerComparison;
     narrative: string;
   }
   ```

5. **Capstone analyzer: `src/lib/intelligence/analyzers/influence-graph-analyzer.ts`**

   The most important file. Extends (does NOT replace) the existing influence chain analyzer:

   ```
   Flow:
   1. analyzeInfluenceChains(bioguideId)  →  Get existing 4-node chains
   2. For each chain's bill:
      └── findRegulationsForBill()         →  Regulation nodes (Phase 2)
   3. For each regulation's agency+sector:
      └── analyzeEnforcement({ sector })   →  Enforcement data (Phase 3)
   4. For each enforcement agency:
      └── courtListenerService.searchAgencyCases()  →  Court outcomes
   5. For each chain company:
      └── Existing stock trade data + FRED  →  Outcome signals
   6. Assemble InfluenceGraphChain[] with multiplicative confidence
   7. Generate citizen-readable narrative (Flesch-Kincaid <= 8)
   ```

   Confidence scoring:
   - Regulation via RIN: 0.95
   - Regulation via committee-agency: 0.80
   - Regulation via text similarity: 0.50
   - Enforcement via entity resolution: variable (from companiesMatch())
   - Court case via party name: 0.70
   - Outcome via correlation: 0.40
   - Chain confidence = Math.min(...allLinkConfidences)
   - Chains below 0.5 are dropped

   Backward compatibility: existing `/api/intelligence/representative/[bioguideId]/influence-chain` is UNCHANGED. New endpoint is additive.

6. **New API route: `src/app/api/intelligence/representative/[bioguideId]/influence-graph/route.ts`**
   - `force-dynamic`, `maxDuration = 60`
   - Cache-Control: `public, s-maxage=604800` (7 days)

7. **Tests** for CourtListener service, full graph analyzer, integration test with mocked chain data.

**Env var needed: `COURTLISTENER_API_TOKEN` (register at courtlistener.com)**

**Run `npm run validate:all` when complete.**

```

---

## Phase 5: Citizen UI

### Prompt

```

Implement Phase 5 of PLAN-influence-graph.md: Citizen UI.

**Prereqs**: Phases 1-4 are complete and committed. The influence graph API is working at `/api/intelligence/representative/[bioguideId]/influence-graph`.

**Problem**: The graph data exists but citizens can't see it. Build the visualization.

**Design system (from CLAUDE.md — MUST follow):**

- Font: Braun Linear (weights 100-700)
- Grid: 8px base, all spacing in multiples
- Borders: 2px structural, no shadows
- Colors: #e11d07 (red/errors/Republican), #0a9338 (green/success/Democrat), #3ea2d4 (blue/links)
- BANNED: gradients, rounded corners, box shadows, skeleton loaders, toast notifications

**What to build:**

1. **`src/components/intelligence/InfluenceGraphCard.tsx`**

   Renders each chain as a vertical flow with labeled nodes. Pattern: follows `InfluenceChainCard.tsx` exactly.

   Each node type renders as a section:

   ```
   MONEY          — Donor name, amount, sector
   LOBBYING       — Org name, spending, target committees
   LEGISLATION    — Bill title, vote (yea/nay)
   REGULATION     — Agency, rule title, status, comment count
   ENFORCEMENT    — Agency actions, penalties, trend direction
   OUTCOME        — Economic indicator, stock trades, trends
   ```

   - Uses existing `InsightCard`, `ConfidenceBadge`, `InsightDisclaimer` components
   - Nodes with null data render "No data available" (never hidden)
   - First chain expanded, subsequent collapsed
   - Source links: Federal Register URL, ECHO facility page, CourtListener docket URL

2. **`src/components/intelligence/InfluenceGraphSankey.tsx`**

   Aggregate flow visualization for the overview:
   - Pure SVG (no new charting dependency)
   - 6 columns (one per node type), horizontal flow left-to-right
   - Edge width proportional to dollar amounts
   - Colors: #3ea2d4 (blue) for data links, #e11d07 (red) for money flow, #0a9338 (green) for outcomes
   - 2px structural borders, no gradients, no shadows
   - Responsive: stacks vertically on mobile (<768px)

3. **Integrate into `src/components/intelligence/IntelligenceTab.tsx`**

   Add after existing InfluenceChainCard section:

   ```typescript
   const { data: graphData } = useSWR<InfluenceGraphInsight>(
     `/api/intelligence/representative/${bioguideId}/influence-graph`,
     fetcher,
     SWR_OPTIONS
   );
   ```

   New section titled "Full Influence Graph" with Sankey overview + expandable chain cards.

4. **Tests:**
   - InfluenceGraphCard renders all 6 node types
   - Handles 0-10 chains without overflow
   - Null nodes render "No data available"
   - Confidence badges match thresholds (green >= 0.8, amber >= 0.6, hidden < 0.6)
   - Mobile responsive verification

**Run `npm run validate:all` when complete.**

```

---

## Critical Files Reference

| File | Role |
|---|---|
| `src/lib/intelligence/analyzers/influence-chain-analyzer.ts` | Core analyzer being extended (1,066 lines) |
| `src/lib/intelligence/types.ts` | All insight type definitions (700 lines) |
| `packages/entity-resolution/src/fec-entity-resolution.ts` | Existing name matching to consolidate |
| `packages/entity-resolution/src/sic-sector-map.ts` | SIC -> sector mapping (reuse for EPA/OSHA) |
| `packages/entity-resolution/src/committee-agency-map.ts` | Committee -> agency mapping (legislation->regulation join) |
| `packages/entity-resolution/src/index.ts` | Package exports |
| `src/lib/data-sources/epa-echo-service.ts` | EPA enforcement (extend) |
| `src/lib/data-sources/regulations-gov-service.ts` | Regulations.gov (extend) |
| `src/lib/data-sources/cfpb-complaint-service.ts` | CFPB complaints (extend) |
| `src/lib/data-sources/federal-register-service.ts` | Federal Register (extend) |
| `src/lib/intelligence/analyzers/shared.ts` | Shared analyzer utilities |
| `src/lib/intelligence/embeddings/embedding-classifier.ts` | Text embeddings (reuse for regulation-bill similarity) |
| `src/lib/connections/policy-area-map.ts` | Policy area -> agencies/sectors routing table |
| `src/components/intelligence/InfluenceChainCard.tsx` | UI pattern to follow |
| `src/components/intelligence/IntelligenceTab.tsx` | Integration point for new UI |

## New Environment Variables

| Variable | Source | Required By |
|---|---|---|
| `DOL_API_KEY` | dataportal.dol.gov/api-keys | Phase 3 |
| `COURTLISTENER_API_TOKEN` | courtlistener.com | Phase 4 |
```
