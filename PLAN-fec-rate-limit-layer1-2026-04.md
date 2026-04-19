# FEC Rate Limit — Layer 1 Implementation Plan

**Date**: 2026-04-18
**Status**: Proposed (Layer 0 shipped same day)
**Parent**: `PLAN-fec-rate-limit-2026-04.md` § 3.1
**Target ship**: this week

## 1. Goal

Replace `aggregateFinanceData`'s Schedule A pagination with FEC's pre-aggregated endpoints so per-page FEC cost is O(1) (4 calls) regardless of candidate size, and remove the top-donor sampling bias introduced by Layer 0.

**Current cost per cold page load (after Layer 0):**

- `getSampleContributions`: ~5 FEC requests (1 candidate lookup + up to 5 pages of 200 contributions sorted by amount)
- Bias: over-samples large-dollar donors; under-represents labor, retirees, small-dollar

**Layer 1 target:**

- 4 FEC requests, flat: `by_employer`, `by_occupation`, `by_state`, `by_size`
- No sampling — server-side aggregates cover the full contribution universe

## 2. File-level changes

### 2.1 `src/lib/fec/fec-api-service.ts` — add 3 methods

`getContributionsBySize` already exists at line 1473. Add the same pattern for the three missing endpoints. Each is a single request, cached via `govCache` the same way `getContributionsBySize` is.

```ts
// New: ~line 1495
async getContributionsByEmployer(
  candidateId: string,
  cycle: number
): Promise<Array<{ employer: string; total: number; count: number }>>

async getContributionsByOccupation(
  candidateId: string,
  cycle: number
): Promise<Array<{ occupation: string; total: number; count: number }>>

async getContributionsByState(
  candidateId: string,
  cycle: number
): Promise<Array<{ state: string; state_full: string; total: number; count: number }>>
```

URL shape (verify exact field names against `https://api.open.fec.gov/developers/`):

- `/schedules/schedule_a/by_employer/?candidate_id=X&cycle=Y&per_page=100&sort=-total`
- `/schedules/schedule_a/by_occupation/?candidate_id=X&cycle=Y&per_page=100&sort=-total`
- `/schedules/schedule_a/by_state/?candidate_id=X&cycle=Y&per_page=100&sort=-total`

All three share `govCache` TTL with existing `getContributionsBySize` (1h) since the underlying data updates quarterly.

### 2.2 `src/lib/fec/finance-aggregator.ts` — new aggregator fn

Add `aggregateFinanceDataFromAggregates(candidateId, cycle, representativeState)` next to the existing `aggregateFinanceData` (keep the old one — see § 4 rollout).

```ts
export async function aggregateFinanceDataFromAggregates(
  candidateId: string,
  cycle: number,
  representativeState: string
): Promise<ProcessedFinanceData | null>;
```

Fan-in (Promise.all):

1. `fecApiService.getFinancialSummary(candidateId, cycle)` — required, already called
2. `fecApiService.getPrincipalCommitteeId(candidateId, cycle)` — for source URLs, already called
3. `fecApiService.getContributionsByEmployer(candidateId, cycle)` — NEW
4. `fecApiService.getContributionsByOccupation(candidateId, cycle)` — NEW (fallback for employer="")
5. `fecApiService.getContributionsByState(candidateId, cycle)` — NEW
6. `fecApiService.getContributionsBySize(candidateId, cycle)` — existing (not wired into ProcessedFinanceData today, but worth adding to the return so the Layer 2 quota work and future size-bucket UI have it)

Total: 6 FEC calls (financial summary + committee lookup + 4 aggregates). 2 of the 6 already run today, so the incremental cost over the current code path is 4.

Replacement logic for the existing helpers:

- `processIndustryBreakdown(contributions, total)` — replaced by `processIndustryBreakdownFromEmployers(byEmployer, byOccupation, total)`. Feed each `{employer, total, count}` row to the existing `categorizeContribution()` which already handles raw employer strings. When `employer` is blank/"SELF-EMPLOYED"/"RETIRED", fall back to the matching occupation row to improve sector assignment (retirees and small business are heavily in the occupation field, not employer).
- `processGeographicBreakdown(contributions, total, state)` — replaced by `processGeographicBreakdownFromStates(byState, total, state)`. Direct map; no categorization needed. `isHomeState` logic preserved.
- `dataQuality` changes semantics — see § 3.

### 2.3 Call-site migrations

Switch these three callers from `aggregateFinanceData` to `aggregateFinanceDataFromAggregates`:

- `src/app/api/representative/[bioguideId]/finance/industries/route.ts:75` (currently `aggregateFinanceData(..., true)` from Layer 0)
- `src/app/api/representative/[bioguideId]/finance/geography/route.ts:85` (currently `aggregateFinanceData(..., true)` from Layer 0)
- `src/lib/questions/template-data-fetchers.ts:149` (currently `aggregateFinanceData(..., true)` from 2026-04-18 patch)

No other callers of `aggregateFinanceData` exist (verify with grep during implementation). If any do, flip them too.

## 3. Semantic changes we must own

### 3.1 `dataQuality.contributionsWithEmployer` / `contributionsWithState`

Today these fields report raw-contribution coverage: "of 1,000 sampled contributions, 850 have an employer string." The aggregate endpoints don't expose that denominator directly.

Options:

- **(preferred)** Repurpose the fields. `totalContributionsAnalyzed` = sum of `count` across all employer rows; `contributionsWithEmployer` = sum excluding the "" / "SELF EMPLOYED" / "RETIRED" / "NONE" / "INFORMATION REQUESTED" rows. FEC already isolates those as distinct employer buckets. Same for state: count - (count where `state` is null/blank).
- Derive `completenessPercentage` from the ratio above. Same shape, honest semantics.

### 3.2 `overallDataConfidence`

`calculateDataConfidence` currently gates on sample size. With full-universe aggregates, confidence should be `high` whenever FEC returns non-empty aggregates, `low` when aggregates are empty (new candidate, pre-first-filing). Adjust thresholds; don't let the "1000 contributions" rule trip a false `low` on complete data.

### 3.3 Conduit handling (ActBlue / WinRed)

FEC aggregates include conduits. For big Democratic raisers, ActBlue can be the #1 "employer" at $50M+ — which is accurate but swamps the industry view.

Minimum viable: show the aggregate as-is, label ActBlue/WinRed rows in the UI as "conduit (aggregator)" rather than filtering. Matches FEC's own behavior on their site.

Follow-up (not blocking Layer 1 ship): a `conduitAdjustment` field that reports the ActBlue/WinRed total separately so downstream UI can subtract if it wants industry-only signal. Cheap — we get both rows from the same `by_employer` response.

### 3.4 `by_employer` vs raw Schedule A sum — 1–3% delta

Documented in parent plan § 3.1 and § 6. Add an inline comment in the new aggregator citing the FEC docs page that explains the difference (memos/refunds/itemization threshold). No UI change needed; `dataAsOf` / `SourceCitation` already telegraph "FEC aggregate, as of X."

## 4. Rollout & escape hatch

- Ship `aggregateFinanceDataFromAggregates` alongside the old function.
- Switch the 3 callers (§ 2.3).
- Keep `aggregateFinanceData(…, true)` available for one release as the fallback path. No flag wrapping — if Layer 1 regresses, revert the 3 caller edits, not a flag.
- One release later (next week's deploy): delete `aggregateFinanceData`, `getAllIndividualContributions`, and the `useSampleData` branch entirely. `getSampleContributions` stays — it's still used by 7 other call sites for non-aggregated work (contributor lists, civic-alignment, jurisdiction, etc.).

## 5. Testing

### 5.1 Unit (jest)

- `src/__tests__/lib/fec/finance-aggregator-from-aggregates.test.ts` (new)
  - Mock the 4 aggregate endpoints
  - Assert `industryBreakdown` correctly categorizes "BOEING CO" → Defense, "GOLDMAN SACHS" → Finance, etc. using real `categorizeContribution`
  - Assert retiree/self-employed rows fall back to occupation-based categorization
  - Assert `isHomeState` flag set correctly for `representativeState`
  - Assert empty aggregates → `overallDataConfidence: 'low'` + empty breakdowns (mirrors current null-financial-summary behavior)
  - Assert total FEC calls ≤ 6 (via mock call counts)

- Update existing tests in `src/__tests__/api/representative/finance.test.ts`:
  - Currently mocks `getSampleContributions` — flip mocks to the 4 aggregate methods
  - Keep at least one test that still exercises `getSampleContributions` (for the escape-hatch path) until the one-release grace period ends

### 5.2 Integration

Manual smoke against real FEC API with a dev key:

- Pelosi (P000197) — stress case, 238k contributions; verify 4 FEC calls, verify top industries match PublicGood/OpenSecrets within 10%
- Murkowski (M001153) — medium case
- A freshman with <5 filings — ensures the empty-aggregate branch works
- Log total FEC calls per request via the existing `logger.info('[FEC API]')` spans

### 5.3 Regression

- Run `npm run validate:all` — no new warnings vs Layer 0 baseline
- Visit `/ask/campaign-contributions/P000197` cold-cache; confirm <30s render and no 429 in FEC logs
- Confirm `/ask/campaign-contributions/M001153` industry breakdown changes direction meaningfully from Layer 0 sample (sample bias removed = labor/retiree share should rise)

## 6. Risks (short)

- **FEC aggregate endpoint schema drift**: verify field names (`total` vs `receipt_amount`, `state` vs `contributor_state`) against live API before writing the TS types. 30 min of curl + jq before coding saves rework.
- **Per-page cap on `by_employer`**: FEC returns up to 100 rows per page. For Pelosi-scale this is enough for top-100 employers but truncates the long tail. Industry categorization bins the tail under "Other/Unknown" anyway, so the industry view doesn't suffer; the `topEmployers` sub-list will cap at ~100. Acceptable; note in the aggregator JSDoc.
- **`getContributionsBySize` currently unused by aggregator**: wiring it into `ProcessedFinanceData` is technically a scope expansion. If that slows the ship, defer — the 3 existing callers don't read size buckets today.
- **Conduit dominance** (§ 3.3) is the biggest UX-visible change. If QA shows ActBlue/WinRed swamp the industry chart and label isn't enough, add the conduit-adjustment field before ship, not after.

## 7. Effort

- FEC service methods + types: 2h
- New aggregator + processors: 3h
- Tests: 3h
- Manual FEC smoke + tuning: 2h
- **Total**: ~1 day of focused work, consistent with parent plan estimate.

## 8. Exit criteria

- [ ] `aggregateFinanceDataFromAggregates` ships behind no flag; 3 callers migrated
- [ ] Cold-cache `/ask/campaign-contributions/P000197` makes ≤ 6 FEC requests
- [ ] `dataQuality.overallDataConfidence === 'high'` for any candidate with non-empty FEC summary
- [ ] Industry breakdown for M001153 visibly differs from Layer 0 sample (confirms bias removal)
- [ ] `npm run validate:all` green
- [ ] Layer 0's `true` sample flags removed from the 3 caller sites
