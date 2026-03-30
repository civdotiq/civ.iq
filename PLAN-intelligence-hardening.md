# Intelligence Layer Hardening Plan

## Context

An honest audit of CIV.IQ's intelligence layer found that all 12+ analyzers fetch real data and compute real statistics — no fakes, no stubs. But the system has dead code paths, silent failures, a cold-start problem, and methodology shortcuts that aren't surfaced to users. This plan fixes every issue identified in the audit, in 8 phases ordered by dependency and risk.

**Workflow**: Implement phase -> `npm run validate:all` -> commit -> clear context -> paste next phase prompt -> repeat. After all 8 phases pass, push.

---

## Phase 1: Surgical Fixes (3 files, ~30 min)

**Goal**: Fix three isolated bugs that each require < 10 lines of code.

### Fix 1A: District insight count inflation

**File**: `src/app/api/intelligence/district/[districtId]/route.ts`
**Line 75-76**: `insightsAvailable += 2` hardcodes +2 regardless of actual data.
**Fix**: Remove the hardcoded +2. Only count insights that have actually been checked. Add checks for vote-finance and temporal cached insights (read from Redis like the existing `fjInsight` check on line 70).

### Fix 1B: SIC filter no-op in enforcement analyzer

**File**: `src/lib/intelligence/analyzers/enforcement-analyzer.ts`
**Line 163**: `const sicCodeFilter = scope.type === 'sector' ? undefined : undefined;`
**Fix**: Add a `sectorToSicRanges()` function to `packages/entity-resolution/src/sic-sector-map.ts` that reverses the existing `SIC_RANGES` array (iterates ranges, collects those matching the target sector, returns `{start, end}[]`). Then in the enforcement analyzer, call it to get SIC ranges and pass the first matching code prefix to the EPA/OSHA query filters. Also export this new function from the package barrel.
**Files touched**:

- `packages/entity-resolution/src/sic-sector-map.ts` — add `sectorToSicRanges()`
- `packages/entity-resolution/src/index.ts` — add export
- `src/lib/intelligence/analyzers/enforcement-analyzer.ts` — use it at line 163

### Fix 1C: Civic brief calls its own API via HTTP

**File**: `src/lib/intelligence/analyzers/civic-brief-assembler.ts`
**Lines 257-296**: `fetchVotingData()` does `fetch(NEXT_PUBLIC_BASE_URL + '/api/representative/...')`.
**Fix**: Replace the HTTP self-call with a direct import of `batchVotingService` from `@/features/representatives/services/batch-voting-service` (same import used by vote-finance-analyzer.ts line 25). Call `batchVotingService.getHouseMemberVotes()` or the Senate equivalent, then extract vote count and bill counts directly. Remove the `process.env.NEXT_PUBLIC_BASE_URL` dependency.
**Reference**: See how `vote-finance-analyzer.ts` uses `batchVotingService` at lines 195-210 for the exact pattern.

### Verification

```bash
npm run validate:all
```

Then manually confirm: `grep -r "NEXT_PUBLIC_BASE_URL" src/lib/intelligence/` returns no matches in the assembler.

### Commit

`fix(intelligence): patch district count inflation, SIC filter no-op, and brief self-HTTP call`

---

## Phase 2: Civic Brief Dead Code Revival (3 files, ~1.5 hrs)

**Goal**: Wire peer statistics into the civic brief so patterns 2 (voting-party-divergence) and 5 (in-state-funding-ratio) can actually fire.

### Problem

`civic-brief-assembler.ts:128-138` hardcodes four peer fields to `null`:

- `peerPartyAlignmentPct` / `peerPartyAlignmentStd` (Pattern 2 at `civic-brief-patterns.ts:117`)
- `peerInStatePctMean` / `peerInStatePctStd` (Pattern 5 at `civic-brief-patterns.ts:229`)

Both patterns check for null and return immediately, making them dead code.

### Design

**Step 2A: Add party-keyed alignment cache in temporal-vote-analyzer.ts**
The temporal analyzer already caches per-rep alignment scores at `temporal-alignment:{chamber}:{state}:{bioguideId}`. Add a second key: `temporal-alignment-party:{chamber}:{party}:{bioguideId}` so the brief can scan by chamber+party (which is what pattern 2's text says: "the average House Democrat").

- Modify `cachePeerScore()` (~line 629) to accept a `party` parameter
- Add one more `getRedisCache().set()` call for the party-keyed key
- Update call site (~line 371) to pass `data.party`

**Step 2B: Add in-state-pct score cache in civic-brief-assembler.ts**
After computing `fundingData.inStatePct`, cache it at `brief-instate-pct:{chamber}:{bioguideId}` for peer aggregation. Add a small helper `cacheInStatePctScore()` and call it (fire-and-forget) after the parallel fetch in `computeAndCache()`.

**Step 2C: Add two peer-stats fetcher functions in civic-brief-assembler.ts**

- `fetchPeerPartyAlignmentStats(bioguideId, chamber, party)` — scans `temporal-alignment-party:{chamber}:{party}:*`, collects scores, computes mean+stdDev via `mean()` and `sampleStandardDeviation()` from `@civiq/civic-statistics`. Returns null if < 5 peers.
- `fetchPeerInStatePctStats(bioguideId, chamber)` — scans `brief-instate-pct:{chamber}:*`, same approach.

**Step 2D: Wire into the assembler pipeline**
In `computeAndCache()`:

1. Also fetch cached `TemporalVoteInsight` in the parallel fetch (alongside fjInsight, icInsight)
2. Extract individual `partyAlignmentPct` from temporal insight's quarters (average of `alignmentScore` \* 100)
3. Enrich `votingData.partyAlignmentPct` if it's null (currently always null — see line 282)
4. Call both peer-stats fetchers in parallel
5. Replace the four hardcoded nulls with the fetched stats

**Imports to add**: `mean`, `sampleStandardDeviation` from `@civiq/civic-statistics`; `TemporalVoteInsight` from types.

### Fallback behavior

When peer data isn't cached yet (cold start), the fetcher functions return null, and patterns 2 and 5 continue to return null — same as today, but now they'll start firing once >= 5 peers have been analyzed. This is the same progressive-enrichment pattern temporal-vote-analyzer and vote-finance-analyzer already use.

### Files

- `src/lib/intelligence/analyzers/temporal-vote-analyzer.ts` — add party-keyed cache
- `src/lib/intelligence/analyzers/civic-brief-assembler.ts` — new fetchers + wiring
- `src/__tests__/intelligence/civic-brief.test.ts` — add test for peer stats flow

### Verification

```bash
npm run validate:all
```

Then verify pattern detectors are no longer unconditionally dead: `grep -n "peerPartyAlignmentPct: null" src/lib/intelligence/analyzers/civic-brief-assembler.ts` should return zero matches.

### Commit

`fix(intelligence): wire peer statistics into civic brief, revive 2 dead pattern detectors`

---

## Phase 3: Temporal Context + Enforcement Completion (2 files, ~1.5 hrs)

**Goal**: Fill in two "always empty" data fields and enable enforcement data in the influence graph.

### Fix 3A: Populate temporal vote shift context fields

**File**: `src/lib/intelligence/analyzers/temporal-vote-analyzer.ts`
**Lines 559-561**: `newCommittees: []` and `largeContributions: 0` are never populated.
**Fix**: After detecting each shift (line 554), enrich the context:

- `newCommittees`: Query Congress.gov committee membership for the representative, filter to committees where the start date falls within the shift quarter. The rep data (including committee assignments with dates) is already fetched in `fetchData()`.
- `largeContributions`: Query FEC contributions for the shift quarter using `fecApiService.getSampleContributions()` filtered by date range, count those above a threshold (e.g., $2,000). The FEC service is already imported by other analyzers — add the import here.
- Both enrichments should be wrapped in try/catch with empty fallbacks.

### Fix 3B: Enable enforcement in influence graph

**File**: `src/lib/intelligence/analyzers/influence-graph-analyzer.ts`
**Line 229**: `const enforcementActions: EnforcementAction[] = [];` with comment "we don't want to trigger full analysis here."
**Fix**: Import `analyzeEnforcement` from `./enforcement-analyzer`. For each chain, identify the primary sector from the chain's bill sectors. Call `analyzeEnforcement({ type: 'sector', sector: primarySector })` with a 10-second timeout via the existing `withTimeout()` helper. Extract the top 3 enforcement actions from the result. If the call times out or fails, keep the empty array (preserving current behavior as fallback).
**Files touched**:

- `src/lib/intelligence/analyzers/influence-graph-analyzer.ts` — add import, call analyzer
- No type changes needed — `EnforcementAction` is already the expected type

### Verification

```bash
npm run validate:all
```

### Commit

`fix(intelligence): populate temporal shift context, enable enforcement in influence graph`

---

## Phase 4: Error Transparency (25 files, ~2 hrs)

**Goal**: Replace silent `.catch(() => null)` with structured error reporting across all 24 intelligence API routes so consumers can distinguish "no data" from "upstream failure."

### Design

**Step 4A: Define error types in `src/lib/intelligence/types.ts`**

```typescript
export interface InsightError {
  source: string; // e.g., "senate-lda", "fec-api", "congress-gov"
  type: 'upstream_timeout' | 'upstream_error' | 'insufficient_data' | 'internal_error';
  message: string;
  timestamp: string;
}

export interface InsightResponse<T> {
  data: T | null;
  errors: InsightError[];
  status: 'complete' | 'partial' | 'unavailable';
}
```

**Step 4B: Add error collection helper in `src/lib/intelligence/analyzers/shared.ts`**
Create a `collectInsightError()` utility that builds `InsightError` objects with timestamp. Create `classifyError()` that maps caught errors to types (timeout → `upstream_timeout`, HTTP 5xx → `upstream_error`, etc.).

**Step 4C: Update the 7 routes that use `.catch(() => null)`**
These are the routes identified in the audit:

1. `district/[districtId]/route.ts:70`
2. `representative/[bioguideId]/influence-chain/route.ts:38`
3. `enforcement/state/[state]/route.ts:33`
4. `regulation/[agencySlug]/route.ts:36`
5. `enforcement/organization/route.ts:32`
6. `representative/[bioguideId]/influence-graph/route.ts:41`
7. `enforcement/sector/[sector]/route.ts:31`

Replace `.catch(() => null)` with `.catch(e => { errors.push(classifyError(e, 'source-name')); return null; })`.

**Step 4D: Update route responses**
For routes that return insights, wrap the response in `InsightResponse<T>`. Routes that currently return 200 with null values should add `errors` and `status` fields. Routes that return 404 on null should return 200 with `status: 'unavailable'` and the error explaining why.

**Step 4E: Update the combined representative endpoint**
`representative/[bioguideId]/route.ts` currently returns `{ insights: { fj: null, vf: null } }` silently. Wrap in `InsightResponse` with per-analyzer error reporting.

### Backward compatibility

Add `errors` and `status` as new fields — don't remove or restructure existing response shapes. Consumers that don't check `errors` continue working unchanged.

### Files

- `src/lib/intelligence/types.ts` — add InsightError, InsightResponse types
- `src/lib/intelligence/analyzers/shared.ts` — add error utilities
- All 24 route files under `src/app/api/intelligence/` — update error handling
- Relevant test files — update response shape expectations

### Verification

```bash
npm run validate:all
```

### Commit

`feat(intelligence): add structured error reporting across all 24 intelligence API routes`

---

## Phase 5: Confidence Transparency + SHAP Fix (5 files, ~1.5 hrs)

**Goal**: Make hardcoded confidence values explicit and improve SHAP direction inference.

### Fix 5A: Centralize confidence constants

**New file**: `src/lib/intelligence/confidence-constants.ts`

```typescript
/** Hardcoded link confidence values with documented rationale. */
export const LINK_CONFIDENCE = {
  /** Committee membership is verifiable fact from Congress.gov */
  committee: 0.95,
  /** Bill-sector classification uses ML with 4-tier fallback */
  billSectorMatch: 0.7,
  /** Vote record is verifiable fact from House Clerk / Senate */
  vote: 1.0,
  /** Regulation-bill link via committee-agency mapping is deterministic */
  regulationLink: 0.8,
  /** Lobbying-committee match: 0.9 if direct alias hit, 0.7 if fuzzy */
  lobbyingDirect: 0.9,
  lobbyingFuzzy: 0.7,
  /** FEC contribution match: 0.9 if exact name, 0.6 if fuzzy */
  contributionExact: 0.9,
  contributionFuzzy: 0.6,
} as const;
```

Update `influence-chain-analyzer.ts` (lines 801, 811, 823) and `regulation-analyzer.ts` (line 141) to import from this file.

### Fix 5B: Add `confidenceMethod` to InsightBase

**File**: `src/lib/intelligence/types.ts`
Add to `InsightBase`:

```typescript
/** Whether confidence was computed from data or estimated by heuristic. */
confidenceMethod: 'computed' | 'heuristic' | 'mixed';
```

Update each analyzer to set this field. Most will be `'computed'` (they use `confidenceScore()`). The link-level confidences in influence-chain are `'heuristic'`. The combined insight confidence is `'mixed'` when it uses both.

### Fix 5C: Improve SHAP direction inference

**File**: `src/lib/intelligence/ml/vote-predictor.ts`
**Lines 382-425**: Currently all active features get assigned `predictedDirection` (the same direction as the overall prediction).
**Fix**: Use the `expectedValue` from `shap-values.json` (0.383 — the base rate) and per-feature logic:

- For binary features (party*R, chamber_Senate, bill_affects*\*): If the feature is active (1) and the prediction moves ABOVE expectedValue, the feature pushed toward_yea. If below, toward_nay.
- For continuous features (donor*pct*\*, years_in_office, bill_cosponsor_count): Compare the feature value to a reasonable baseline (0 for donor percentages since they're already relative, median for others). If above baseline and prediction is above expected, the feature pushed toward_yea.
- This is still an approximation but much better than "everything points the same way."

Load `expectedValue` from the model metadata (it's already in `shap-values.json` at key `expectedValue`). Add it to `VotePredictionModelMetadata` type.

### Files

- `src/lib/intelligence/confidence-constants.ts` — new, ~25 lines
- `src/lib/intelligence/types.ts` — add `confidenceMethod` to InsightBase
- `src/lib/intelligence/analyzers/influence-chain-analyzer.ts` — import constants
- `src/lib/intelligence/analyzers/regulation-analyzer.ts` — import constants
- `src/lib/intelligence/ml/vote-predictor.ts` — improve SHAP direction logic
- All analyzer files — add `confidenceMethod` field to returned insights
- Test files — update expected shapes

### Verification

```bash
npm run validate:all
```

### Commit

`feat(intelligence): centralize confidence constants, add confidenceMethod, improve SHAP directions`

---

## Phase 6: Cache Warming Script (2 files, ~2 hrs)

**Goal**: Solve the cold-start problem so leaderboards and peer comparisons work on fresh deployments.

### Design

A new script `scripts/warm-intelligence-cache.ts` that:

1. Fetches all 535 members via `getAllEnhancedRepresentatives()`
2. For each member, runs the lightweight analyzers (finance-jurisdiction, vote-finance) that populate the cache keys needed by leaderboards and peer comparisons
3. Respects rate limits: FEC API (1000/hr), Congress.gov (throttled), Senate XML (slow)
4. Supports incremental mode: skip members whose cache keys already exist
5. Batches: process 5 members in parallel, sleep 5s between batches
6. Reports progress: `[42/535] Warmed A000055 (Robert Aderholt) — fj: ok, vf: ok, 12.3s`

**Reference patterns**:

- `scripts/collect-training-data.ts` — same sequential-with-rate-limiting pattern, 806 lines
- `src/app/api/cache/warm/route.ts` — existing cache warm endpoint (only warms basic data endpoints, not intelligence). The new script extends this idea to intelligence analyzers.

### Also update the existing cache warm endpoint

**File**: `src/app/api/cache/warm/route.ts`
Add a `?scope=intelligence` query parameter that triggers intelligence cache warming for the leader list (the ~20 bioguideIds already defined at lines 50-71). This gives a lightweight API-triggered warm option for CI/CD.

### Files

- `scripts/warm-intelligence-cache.ts` — new script (~200 lines)
- `src/app/api/cache/warm/route.ts` — add intelligence scope option
- `package.json` — add `"warm:intelligence"` script

### Verification

```bash
npx tsx scripts/warm-intelligence-cache.ts --dry-run  # verify it lists members without calling APIs
npm run validate:all
```

### Commit

`feat(intelligence): add cache warming script for intelligence analyzers`

---

## Phase 7: Cluster Quality Improvement (2 files, ~1 hr)

**Goal**: Reduce the 69% noise rate in influence clusters by tuning HDBSCAN parameters.

### Approach

**File**: `scripts/compute-influence-clusters.py`
Current parameters: `min_cluster_size=5`, `min_samples=3` on 482 legislators with 13 donor-sector features.

Changes:

1. Lower `min_cluster_size` from 5 to 3 (allows smaller meaningful clusters)
2. Lower `min_samples` from 3 to 2 (more permissive core point threshold)
3. Add `cluster_selection_epsilon=0.1` to merge nearby clusters
4. Add a quality report to stdout: cluster count, noise count, noise %, silhouette score
5. If noise % > 50% after tuning, try UMAP with `n_neighbors=10` (currently 15) to create tighter local structure

Then regenerate:

```bash
python scripts/compute-influence-clusters.py
```

**File**: `src/lib/intelligence/clusters/influence-clusters.json`
Replace with the regenerated output.

### Verification

```bash
python scripts/compute-influence-clusters.py  # check quality report
npm run validate:all
```

### Commit

`fix(intelligence): tune HDBSCAN parameters to reduce unclustered legislators from 69% to <50%`

---

## Phase 8: Integration Smoke Tests (1 file, ~2 hrs)

**Goal**: Create a small suite of tests that verify end-to-end data flow against real government APIs for a known, stable legislator.

### Design

**New file**: `src/__tests__/intelligence/integration/smoke.integration.test.ts`

Target legislator: Chuck Grassley (G000386) — senior senator, extensive data, unlikely to leave office.

Tests (each with 30s timeout, marked `skip` in CI by default):

1. `finance-jurisdiction returns non-null insight with valid shape` — calls `analyzeFinanceJurisdiction('G000386')`, asserts non-null, validates InsightBase fields, checks overlapScore is 0-1
2. `vote-finance returns correlations with sample sizes` — calls `analyzeVoteFinance('G000386')`, asserts correlations array non-empty, checks sample sizes
3. `temporal analysis returns quarters` — calls `analyzeTemporalVotes('G000386')`, asserts >= 4 quarters
4. `influence chain finds at least one chain` — calls `analyzeInfluenceChains('G000386')`, asserts chains array non-empty
5. `enforcement returns actions for energy sector` — calls `analyzeEnforcement({ type: 'sector', sector: 'Energy & Natural Resources' })`, asserts actions array non-empty
6. `entity resolution matches known company` — calls `companiesMatch('EXXON MOBIL', 'ExxonMobil Corporation')`, asserts true
7. `embedding classifier returns sectors for bill text` — calls `classifyBillSectors('An act to regulate carbon emissions from power plants')`, asserts non-empty array

Guard: `describe.skipIf(!process.env.RUN_SMOKE_TESTS)` — only runs when explicitly enabled.

### package.json script

```json
"test:smoke": "RUN_SMOKE_TESTS=1 jest --testPathPattern=smoke.integration --runInBand --testTimeout=60000"
```

### Files

- `src/__tests__/intelligence/integration/smoke.integration.test.ts` — new
- `package.json` — add test:smoke script

### Verification

```bash
RUN_SMOKE_TESTS=1 npx jest --testPathPattern=smoke.integration --runInBand --testTimeout=60000
npm run validate:all  # smoke tests skipped by default, won't break CI
```

### Commit

`test(intelligence): add integration smoke tests against real government APIs`

---

## Phase Prompts

Each prompt below is designed to be pasted into a fresh Claude Code conversation.

### Phase 1 Prompt

```
Read CLAUDE.md, then read PLAN-intelligence-hardening.md.

Execute Phase 1: Surgical Fixes. Three independent bug fixes:

1A. District insight count inflation
- File: src/app/api/intelligence/district/[districtId]/route.ts
- Line 75-76 hardcodes `insightsAvailable += 2`. Fix: check Redis for actual cached insights (vote-finance and temporal) like line 70 does for finance-jurisdiction. Only increment for insights that actually exist in cache.

1B. SIC filter no-op in enforcement analyzer
- File: src/lib/intelligence/analyzers/enforcement-analyzer.ts line 163
- `const sicCodeFilter = scope.type === 'sector' ? undefined : undefined` — always undefined
- Fix: Add `sectorToSicRanges(sector: IndustrySector): {start: number, end: number}[]` to packages/entity-resolution/src/sic-sector-map.ts (reverse the existing SIC_RANGES array). Export it from the package barrel. Use it in the enforcement analyzer to pass a real SIC code filter when scope.type === 'sector'.

1C. Civic brief calls its own HTTP API
- File: src/lib/intelligence/analyzers/civic-brief-assembler.ts lines 257-296
- fetchVotingData() does fetch(NEXT_PUBLIC_BASE_URL + '/api/representative/...')
- Fix: Import batchVotingService from @/features/representatives/services/batch-voting-service (same import vote-finance-analyzer.ts uses at line 25). Call it directly to get votes and bills. Remove the HTTP self-call entirely.

After all three fixes, run `npm run validate:all`. Fix any issues. Do NOT commit — just tell me results.
```

### Phase 2 Prompt

```
Read CLAUDE.md, then read PLAN-intelligence-hardening.md.

Execute Phase 2: Civic Brief Dead Code Revival. Wire peer statistics so patterns 2 (voting-party-divergence) and 5 (in-state-funding-ratio) in civic-brief-patterns.ts can actually fire.

The problem: civic-brief-assembler.ts lines 128-138 hardcodes peerPartyAlignmentPct, peerPartyAlignmentStd, peerInStatePctMean, peerInStatePctStd all to null. Both patterns check for null and return immediately.

Implementation:
1. In temporal-vote-analyzer.ts, modify cachePeerScore() to also write a party-keyed cache key: `temporal-alignment-party:{chamber}:{party}:{bioguideId}`. Add `party` param, update call site.
2. In civic-brief-assembler.ts:
   a. Add cacheInStatePctScore() helper that writes `brief-instate-pct:{chamber}:{bioguideId}` after computing inStatePct
   b. Add fetchPeerPartyAlignmentStats(bioguideId, chamber, party) — scans temporal-alignment-party keys, computes mean+stdDev with mean() and sampleStandardDeviation() from @civiq/civic-statistics, returns null if < 5 peers
   c. Add fetchPeerInStatePctStats(bioguideId, chamber) — same pattern for in-state %
   d. In computeAndCache(): also fetch cached TemporalVoteInsight, extract partyAlignmentPct from quarters average, call both peer fetchers in parallel, wire results into PatternInput
3. Update tests in src/__tests__/intelligence/civic-brief.test.ts

The patterns themselves (civic-brief-patterns.ts) need NO changes — they already handle the non-null case correctly.

After implementation, run `npm run validate:all`. Fix any issues. Do NOT commit.
```

### Phase 3 Prompt

```
Read CLAUDE.md, then read PLAN-intelligence-hardening.md.

Execute Phase 3: Temporal Context + Enforcement Completion.

3A. Populate temporal vote shift context fields
- File: src/lib/intelligence/analyzers/temporal-vote-analyzer.ts lines 555-564
- newCommittees is always []. Fix: After detecting a shift, check the representative's committee assignments (already in the fetched data) for committees with start dates within that quarter.
- largeContributions is always 0. Fix: Query FEC contributions for the quarter around the shift, count those above $2,000. Import fecApiService and getFECIdFromBioguide. Wrap in try/catch — if FEC fails, leave as 0.

3B. Enable enforcement in influence graph
- File: src/lib/intelligence/analyzers/influence-graph-analyzer.ts line 229
- enforcementActions is always []. The comment says "we don't want to trigger full analysis."
- Fix: Import analyzeEnforcement from ./enforcement-analyzer. For each chain, identify the primary sector from chain's bill sectors. Call analyzeEnforcement({ type: 'sector', sector: primarySector }) wrapped in withTimeout() with 10s limit. Extract top 3 enforcement actions. On timeout/failure, keep empty array.

After implementation, run `npm run validate:all`. Fix any issues. Do NOT commit.
```

### Phase 4 Prompt

```
Read CLAUDE.md, then read PLAN-intelligence-hardening.md.

Execute Phase 4: Error Transparency. Replace silent .catch(() => null) with structured error reporting across all 24 intelligence API routes.

1. Add to src/lib/intelligence/types.ts:
   - InsightError interface: { source, type ('upstream_timeout'|'upstream_error'|'insufficient_data'|'internal_error'), message, timestamp }
   - InsightResponse<T> interface: { data: T | null, errors: InsightError[], status: 'complete'|'partial'|'unavailable' }

2. Add to src/lib/intelligence/analyzers/shared.ts:
   - collectInsightError(source, error) — builds InsightError with timestamp
   - classifyError(error, source) — maps caught errors to types

3. Update the 7 routes using .catch(() => null):
   - district/[districtId]/route.ts:70
   - representative/[bioguideId]/influence-chain/route.ts:38
   - enforcement/state/[state]/route.ts:33
   - regulation/[agencySlug]/route.ts:36
   - enforcement/organization/route.ts:32
   - representative/[bioguideId]/influence-graph/route.ts:41
   - enforcement/sector/[sector]/route.ts:31
   Replace with error collection pattern.

4. Update all 24 intelligence route responses to include errors[] and status fields. Add them as new fields — don't break existing response shapes.

5. Update relevant tests to expect the new fields.

After implementation, run `npm run validate:all`. Fix any issues. Do NOT commit.
```

### Phase 5 Prompt

```
Read CLAUDE.md, then read PLAN-intelligence-hardening.md.

Execute Phase 5: Confidence Transparency + SHAP Fix.

5A. Create src/lib/intelligence/confidence-constants.ts with all hardcoded link confidence values:
   - committee: 0.95, billSectorMatch: 0.7, vote: 1.0, regulationLink: 0.8
   - lobbyingDirect: 0.9, lobbyingFuzzy: 0.7, contributionExact: 0.9, contributionFuzzy: 0.6
   Each with a JSDoc comment explaining why that value. Import and use in:
   - influence-chain-analyzer.ts (lines 801, 811, 823)
   - regulation-analyzer.ts (line 141)

5B. Add confidenceMethod: 'computed' | 'heuristic' | 'mixed' to InsightBase in types.ts.
   Update every analyzer to set this field appropriately.

5C. Improve SHAP direction in vote-predictor.ts (lines 382-425):
   - Load expectedValue from shap-values.json (value: 0.383, already in the file)
   - Add expectedValue to VotePredictionModelMetadata type
   - For binary features (party_R, bill_affects_*, sponsor_same_party): if feature=1, direction is toward_yea if feature pushes prediction above expectedValue, toward_nay if below
   - For continuous features (donor_pct_*): compare feature value to 0 baseline — above-zero donor percentages with above-expected predictions push toward_yea
   - This replaces the current logic where ALL active features get the same direction

After implementation, run `npm run validate:all`. Fix any issues. Do NOT commit.
```

### Phase 6 Prompt

```
Read CLAUDE.md, then read PLAN-intelligence-hardening.md.

Execute Phase 6: Cache Warming Script.

Create scripts/warm-intelligence-cache.ts that:
1. Fetches all members via getAllEnhancedRepresentatives()
2. For each member, runs analyzeFinanceJurisdiction() and analyzeVoteFinance() (the two analyzers that populate cache keys needed by leaderboards and peer comparisons)
3. Supports --dry-run flag (list members without calling APIs)
4. Supports --incremental flag (skip members with existing cache)
5. Batches: 5 members in parallel, 5s sleep between batches
6. Progress: [42/535] Warmed G000386 (Chuck Grassley) — fj: ok, vf: ok, 12.3s
7. Summary at end: warmed N members, M skipped, K errors, total time

Reference: scripts/collect-training-data.ts for the rate-limiting and batching pattern.

Also update src/app/api/cache/warm/route.ts to support ?scope=intelligence query param that runs intelligence warming for the ~20 congressional leaders already listed in that file.

Add to package.json: "warm:intelligence": "tsx scripts/warm-intelligence-cache.ts"

After implementation, run `npm run validate:all`. Fix any issues. Do NOT commit.
```

### Phase 7 Prompt

```
Read CLAUDE.md, then read PLAN-intelligence-hardening.md.

Execute Phase 7: Cluster Quality Improvement.

In scripts/compute-influence-clusters.py:
1. Change min_cluster_size from 5 to 3
2. Change min_samples from 3 to 2
3. Add cluster_selection_epsilon=0.1 to HDBSCAN
4. Try n_neighbors=10 in UMAP (currently 15)
5. Add quality report: cluster count, noise count, noise %, silhouette score (from sklearn.metrics)
6. Print comparison: "Before: 16 clusters, 333 noise (69%). After: N clusters, M noise (X%)"

Run the script to regenerate src/lib/intelligence/clusters/influence-clusters.json.

Target: noise rate below 50%. If parameter tuning alone doesn't achieve this, consider adding n_components=5 in UMAP (intermediate dimensionality before clustering).

After regeneration, run `npm run validate:all`. Fix any issues. Do NOT commit.
```

### Phase 8 Prompt

```
Read CLAUDE.md, then read PLAN-intelligence-hardening.md.

Execute Phase 8: Integration Smoke Tests.

Create src/__tests__/intelligence/integration/smoke.integration.test.ts with:
- Guard: describe.skipIf(!process.env.RUN_SMOKE_TESTS) so it doesn't run in CI
- Target: Chuck Grassley (G000386) — senior senator, extensive data
- Tests (each 30s timeout):
  1. analyzeFinanceJurisdiction returns valid insight shape
  2. analyzeVoteFinance returns correlations with sample sizes
  3. analyzeTemporalVotes returns >= 4 quarters
  4. analyzeInfluenceChains finds at least one chain
  5. analyzeEnforcement returns actions for energy sector
  6. companiesMatch resolves known company variants
  7. classifyBillSectors returns sectors for test text

Add to package.json: "test:smoke": "RUN_SMOKE_TESTS=1 jest --testPathPattern=smoke.integration --runInBand --testTimeout=60000"

After implementation, run `npm run validate:all` (smoke tests should be skipped).
Then run `npm run test:smoke` separately to verify against real APIs.
Do NOT commit.
```

---

## Final Commit + Push Sequence

After all 8 phases pass individually:

```bash
git log --oneline -8  # verify all 8 commits are clean
npm run validate:all  # final full validation
git push origin main
```

## Risk Assessment

| Phase | Risk                                   | Mitigation                                       |
| ----- | -------------------------------------- | ------------------------------------------------ |
| 1     | Very low — isolated one-line fixes     | Each fix is independent                          |
| 2     | Medium — Redis scan performance        | Limit to same-chamber peers (~250 keys max)      |
| 3     | Medium — new API calls in hot path     | 10s timeout on enforcement, try/catch on FEC     |
| 4     | Low — additive fields only             | No breaking changes to response shapes           |
| 5     | Low — cosmetic + type changes          | Confidence values don't change, just get labeled |
| 6     | Low — new script, no prod code changes | --dry-run flag for safe testing                  |
| 7     | Low — offline Python recomputation     | Compare before/after quality metrics             |
| 8     | Low — tests default to skip            | Only run with explicit env var                   |
