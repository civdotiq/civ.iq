# Data Integrity Audit: 3-Wave Fix Plan

## Context

Commit `5e3e513c` fixed a data integrity bug where Congress.gov API silently ignores the `congress` parameter on member-scoped legislation endpoints, causing `pagination.count` to always return career totals. The fix applied client-side filtering via `fetchSponsoredLegislation`.

A full codebase audit revealed **15 additional data integrity issues** across Congress.gov, FEC, USASpending, OpenStates, and SEC integrations. This plan fixes all 15 in 3 waves, ordered by citizen-facing severity.

---

## WAVE 1: Congress.gov API Parameter Trust (5 issues, 1 commit)

All share the same root cause: trusting Congress.gov `pagination.count` or `congress` parameter filtering.

### 1A. Fix `fetchCosponsoredCount` (HIGH)

**File**: `src/services/congress/optimized-congress.service.ts`

The `fetchCosponsoredCount` function (lines 605-628) reads `pagination.count` from the cosponsored-legislation endpoint, which is always the all-time career total.

**Changes**:

- In `getBillsSummary()` (lines 644-647), replace `fetchCosponsoredCount(bioguideId)` with `fetchCosponsoredLegislation(bioguideId, apiKey, 119, 250, 1, true)` and use `.total`
- Delete `fetchCosponsoredCount` function entirely (lines 602-628)
- Update destructuring: `const [sponsoredData, cosponsoredData] = ...` then `cosponsoredCount: cosponsoredData.total`

### 1B. Replace `getOptimizedBillsByMember` in batch service (HIGH)

**File**: `src/services/batch/representative-batch.service.ts`, lines 157-199

The batch bills handler calls `getOptimizedBillsByMember` (trusts congress param) and hardcodes `cosponsored: { count: 0, bills: [] }`.

**Changes**:

- Extract `createLegacyResponse` from `src/app/api/representative/[bioguideId]/bills/route.ts` (lines 18-64) into `src/services/congress/bill-response-utils.ts`
- Update the route file to import from the new shared location
- Replace batch service bills handler (lines 160-197) to use `getComprehensiveBillsByMember` + `createLegacyResponse`
- Update import at line 8-11: swap `getOptimizedBillsByMember` for `getComprehensiveBillsByMember`

### 1C. Replace `getOptimizedBillsByMember` in background-refresh (MEDIUM)

**File**: `src/services/cache/background-refresh.ts`, lines 114-120

**Changes**:

- Replace `getOptimizedBillsByMember` call with `getComprehensiveBillsByMember`
- Update import at line 10
- Update cache key at line 114 to use `comprehensive-bills:` prefix for clarity

### 1D. Fix `totalCareer` semantics (MEDIUM)

**File**: `src/services/congress/optimized-congress.service.ts`, line 655

`totalCareer: sponsoredData.total` is actually the 119th Congress count, not career total.

**Consumer**: `BiographyCard.tsx:286` reads `batchData?.bills?.totalCareer || 0` as `billsSponsored`.

**Changes**:

- In `BillsSummaryResult` type (line 595-600): rename `totalCareer` to `totalCurrentCongress`
- Update assignment at line 655 and error fallback at line 670
- Update `BiographyCard.tsx:286` to use `totalCurrentCongress`
- Update `BiographyCard.tsx:36` type annotation

### 1E. Deprecate `getOptimizedBillsByMember` (cleanup)

**File**: `src/services/congress/optimized-congress.service.ts`, lines 451-589

After all callers are migrated, add `@deprecated` JSDoc comment. Do not delete yet.

---

## WAVE 2: Other Citizen-Visible Wrong Numbers (2 issues, 1 commit)

### 2A. Fix Votes Cast capped at 50 (HIGH)

**File**: `src/services/batch/representative-batch.service.ts`, line 626

`getRepresentativeSummary` fetches with `{ votes: { limit: 50 } }`, then `totalResults: votes.length` caps at 50. HeroStatsHeader displays this as "Votes Cast / This term".

Most representatives cast 200-400 votes per congress. Congress.gov has no count-only endpoint.

**Changes**:

- Line 626: change `{ votes: { limit: 50 } }` to `{ votes: { limit: 500 } }`
- Add comment explaining rationale (votes are counted, not rendered, so extra payload is acceptable)

### 2B. Migrate batch service + cache from old FECAPI class (MEDIUM)

**Files**: `src/services/batch/representative-batch.service.ts:12,380-404`, `src/services/cache/background-refresh.ts:13,138`

Both files import the old `fecAPI` class and only call `getCandidateFinancials`. The new `fecApiService.getFinancialSummary` returns a single object (or null) with the same field names.

**Changes in batch service**:

- Replace import: `import { fecApiService } from '@/lib/fec/fec-api-service'` (remove `fecAPI` import)
- Lines 385-403: simplify cycle loop:
  ```typescript
  const candidate = await fecApiService.getFinancialSummary(candidateId, cycle);
  if (candidate) {
    summaryData = candidate;
    matchedCycle = cycle;
    break;
  }
  ```
- Track `matchedCycle` and include it in the result metadata for Wave 3 Issue 3E
- Field names are identical (`receipts`, `disbursements`, `last_cash_on_hand_end_period`, etc.)

**Changes in background-refresh**:

- Replace import similarly
- The background-refresh passes `bioguideId` directly to the FEC API, but FEC needs `candidateId`. Check if the background-refresh has access to the bioguide-FEC mapping. If not, skip FEC caching in background-refresh or add the mapping lookup.

**After migration**:

- Add `@deprecated` JSDoc to the `FECAPI` class in `src/lib/fec-api.ts`

---

## WAVE 3: Data Quality Improvements (8 issues, 1 commit)

All independent; can be implemented in any order.

### 3A. FEC `cycle` vs `two_year_transaction_period` (MEDIUM)

**File**: `src/lib/fec/fec-api-service.ts`

Schedule A transaction queries should use `two_year_transaction_period` (actual transaction timing), not `cycle` (election cycle association).

**Change 3 methods**:

- `getAllIndividualContributions` (~line 338): `cycle=` -> `two_year_transaction_period=`
- `getSampleContributions` (~line 427): same
- `validateCandidateData` (~line 561): same

**Keep `cycle` for** (correct usage): `getFinancialSummary`, `findCandidateCommitteeIds`, `getContributionsBySize`, `getIndependentExpenditures`

### 3B. USASpending fallback total (MEDIUM)

**Files**: `src/lib/services/spending.service.ts`, `src/app/api/spending/district/[districtId]/route.ts:55`

When aggregate API fails, `totalSpending` silently falls back to sum of top-10 awards.

**Changes**:

- Add `dataQuality: 'complete' | 'partial'` and `dataNote?: string` to the response
- Set `'partial'` with explanatory note when `aggregate` is null

### 3C. OpenStates `getBills` chamber filter (MEDIUM)

**File**: `src/lib/openstates-api.ts`, lines 739-769

Fetches 1 page, filters client-side by chamber, may return far fewer than `limit`.

**Changes**:

- Add pagination loop (matching existing `getBillsBySponsor` pattern at lines 779-800+)
- Keep fetching pages until `limit` filtered results collected, with `maxPages = 10` safety

### 3D. Hardcoded "2024" on state legislature page (MEDIUM)

**File**: `src/app/(civic)/state-legislature/[state]/page.tsx`, line 514

**Change**:

```tsx
// Before:
<p className="text-2xl font-bold text-gray-900">2024</p>
// After:
<p className="text-2xl font-bold text-gray-900">
  {legislatureData.session?.name || new Date().getFullYear().toString()}
</p>
```

### 3E. Finance "Current cycle" label (LOW)

**Files**: `src/features/representatives/components/HeroStatsHeader.tsx:358`, `src/services/batch/representative-batch.service.ts`

**Changes**:

- In batch finance handler: track and return `matchedCycle` (already added in Wave 2B)
- Propagate through `getRepresentativeSummary` result
- Add `financeCycle?: number` to HeroStatsHeader stats type
- Display `{stats.financeCycle ? \`${stats.financeCycle} Cycle\` : 'Current cycle'}`

### 3F. SEC EDGAR total cap (LOW)

**File**: `src/lib/data-sources/sec-edgar-service.ts`, line 187

**Changes**:

- Add `totalIsApproximate?: boolean` to `SecSearchResult` type
- Set to `true` when `data.hits?.total?.relation === 'gte'`

### 3G. FEC committee search pagination inflation (LOW)

**File**: `src/lib/fec/fec-api-service.ts`, lines 1294-1297

**Changes**:

- Stop inflating `pagination.count`
- Keep original API count; the extra merged results are a page-1 bonus

### 3H. Design system party color violations (LOW)

**File**: `src/lib/fec-api.ts`, lines 912-923

**Changes**:

- `'DEM'`: `#3B82F6` -> `#0a9338` (civiq-green)
- `'REP'`: `#EF4444` -> `#e11d07` (civiq-red)
- `'IND'`: `#8B5CF6` -> `#6B7280` (gray, no purple in design system)

---

## Critical Files Summary

| File                                                          | Wave | Changes                                                          |
| ------------------------------------------------------------- | ---- | ---------------------------------------------------------------- |
| `src/services/congress/optimized-congress.service.ts`         | 1    | Fix cosponsoredCount, rename totalCareer, deprecate getOptimized |
| `src/services/batch/representative-batch.service.ts`          | 1,2  | Swap to comprehensive, fix votes limit, migrate FEC, track cycle |
| `src/services/cache/background-refresh.ts`                    | 1,2  | Swap to comprehensive, migrate FEC                               |
| `src/app/api/representative/[bioguideId]/bills/route.ts`      | 1    | Extract createLegacyResponse                                     |
| `src/services/congress/bill-response-utils.ts`                | 1    | NEW: shared createLegacyResponse                                 |
| `src/features/representatives/components/BiographyCard.tsx`   | 1    | Update totalCareer -> totalCurrentCongress                       |
| `src/features/representatives/components/HeroStatsHeader.tsx` | 3    | Finance cycle label                                              |
| `src/lib/fec/fec-api-service.ts`                              | 3    | cycle -> two_year_transaction_period, pagination fix             |
| `src/lib/fec-api.ts`                                          | 2,3  | Deprecate, fix party colors                                      |
| `src/lib/openstates-api.ts`                                   | 3    | Add pagination to getBills                                       |
| `src/lib/services/spending.service.ts`                        | 3    | dataQuality flag                                                 |
| `src/app/(civic)/state-legislature/[state]/page.tsx`          | 3    | Fix hardcoded 2024                                               |
| `src/lib/data-sources/sec-edgar-service.ts`                   | 3    | totalIsApproximate flag                                          |

## Severity Summary

| Severity | Count | Wave                |
| -------- | ----- | ------------------- |
| HIGH     | 5     | 1 (3), 2 (2)        |
| MEDIUM   | 7     | 1 (2), 2 (1), 3 (4) |
| LOW      | 3     | 3 (3)               |

## Verification

After each wave:

1. `npm run validate:all` (lint + type-check + test + build)
2. Manual spot-check: load a long-serving rep's page (e.g., /representative/G000386 for Grassley) and verify:
   - Bills sponsored count matches the bill list
   - Cosponsored count is reasonable for a single congress (~20-80, not 500+)
   - Votes cast exceeds 50
   - Finance data loads with correct cycle label
3. Compare batch vs direct API responses for the same representative
