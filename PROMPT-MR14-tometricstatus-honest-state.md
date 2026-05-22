# PROMPT — MR14: toMetricStatus should emit `insufficient-data`, not `unavailable`, when an insight exists but extracted value is null

**Parent plan**: `PLAN-money-report-restoration-2026-04.md`
**Spawned from**: `PROMPT-MR12-house-clerk-xml-blocked.md` closeout (2026-05-14, merged as PR #63 commit `b5cc9032`)
**Blocking**: Honest UI state. After MR12, House reps' vote-finance insights compute successfully but lack a numeric `overallCorrelation` (not enough votes per sector). The money-report orchestrator currently labels these `unavailable` — which the UI treats as "we couldn't fetch the data." That's untrue: we have plenty of data, just not enough per-sector to compute one summary number. The MR5 "honest empty state" contract explicitly distinguishes `insufficient-data` (the rep genuinely lacks records) from `unavailable` (we can't reach the source). MR14 fixes the mislabeling.

**Independence note**: MR14 is independent of MR13. If MR13 ships first and bumps MAX_VOTES so every House rep gets a numeric `overallCorrelation`, MR14 becomes a safety-net change — important for thin-vote-history reps (freshmen, mid-cycle appointees) who still won't meet the sample floor. If MR14 ships first, House money-report tiles will show `insufficient-data` instead of `unavailable` immediately, which is more honest. Either order works.

---

## What's actually wrong

`toMetricStatus` at `src/app/api/intelligence/address/money-report/route.ts:212-240`:

```ts
function toMetricStatus<T>(
  result: PromiseSettledResult<{ insight: T | null; unavailableReason?: string }>,
  extract: (outcome: { insight: T | null; unavailableReason?: string }) => number | null
): MetricStatus {
  if (result.status === 'rejected') {
    const message =
      result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'unknown');
    const isTimeout = /timed out/i.test(message);
    return { state: 'unavailable', reason: isTimeout ? 'timeout' : 'analyzer-error' };
  }

  const value = extract(result.value);
  if (value !== null) {
    return { state: 'ready', value };
  }

  if (result.value.unavailableReason) {
    if (result.value.unavailableReason === SENATE_UPSTREAM_BLOCKED_REASON) {
      return { state: 'unavailable', reason: result.value.unavailableReason };
    }
    return { state: 'insufficient-data', reason: result.value.unavailableReason };
  }

  return { state: 'unavailable', reason: 'analyzer-error' }; // ← THE BUG
}
```

The defensive `return { state: 'unavailable', reason: 'analyzer-error' }` at the bottom fires when:

1. The analyzer promise **fulfilled** (no rejection, no error)
2. The extracted value is **null** (e.g., `insight.overallCorrelation === null`)
3. The outcome has **no `unavailableReason`** set

This is the cache-hit path. `analyzeVoteFinanceWithReason` returns `{ insight: <cached> }` with no `unavailableReason` on cache hit (see `vote-finance-analyzer.ts:122-127`). If the cached insight has `overallCorrelation: null` (sample size not met), `extract` returns null, no reason is set, and we fall to the misleading `unavailable / analyzer-error`.

**Concrete reproduction post-MR12** (production, 2026-05-14):

```
GET /api/intelligence/representative/S000344/vote-finance
  → status: 'complete', overallCorrelation: null, 4 sectors with billsVotedOn: 1–6
    (clearly the analyzer ran and produced output — narrative, correlations, etc.)

GET /api/intelligence/address/money-report?zip=90049
  → Brad Sherman voteFinance: { state: 'unavailable', reason: 'analyzer-error' }
    (claims we couldn't analyze — false; the data exists, just not enough per sector)
```

The UI then renders an amber "Unavailable" pill on Brad Sherman's tile, which is the wrong signal.

## Why the analyzer doesn't set `unavailableReason` on cache hit

By design. `analyzeVoteFinanceWithReason` only sets `unavailableReason` when the _current run_ explicitly returns null with a reason — e.g., "Fewer than 10 sector-classified votes" inside `computeAndCache`. On cache hit, the insight is returned as-is. If a prior compute decided "we have data but no overall correlation", that decision lives inside the insight object (as `overallCorrelation: null` with populated `correlations[]` and `narrative`), not as an unavailableReason.

So the missing-context lives on the _consumer side_: `toMetricStatus` needs to recognize that "insight is non-null but extract returned null" is **a third class** distinct from "rejected" and "fulfilled-but-null-insight."

## Remediation

### A. Add a fourth branch to `toMetricStatus`

Between the `value !== null` check and the `unavailableReason` check, insert:

```ts
if (result.value.insight !== null) {
  // Analyzer ran, produced an insight, but the extracted value couldn't be
  // computed (e.g., overallCorrelation requires MIN_VOTES_PER_SECTOR=10 in
  // 3+ sectors and the rep's record didn't hit that floor).
  return {
    state: 'insufficient-data',
    reason:
      'Analyzer ran but the headline metric could not be computed (sample size or sector coverage)',
  };
}
```

- **Pros**: Surgical. One conditional. Zero changes to analyzers. Matches the MR5 honest-empty-state contract exactly.
- **Cons**: The reason string is generic. Could be refined per-extractor (e.g., "Fewer than 3 sectors had 10+ votes" for `voteFinance` specifically).
- **Effort**: 1 hour including tests and a refined per-metric reason.

### B. Plumb a richer outcome through the analyzers

Change `analyzeVoteFinanceWithReason` (and siblings) to set `unavailableReason` on cache hit when the cached insight has missing components. The analyzer would have to re-derive "why is the cached insight thin" by inspecting the insight, which is awkward.

- **Pros**: Reason strings are analyzer-specific and precise.
- **Cons**: Conceptually weird — the cached insight already represents the analyzer's verdict; deriving a "reason" by re-inspecting it on every consumer call duplicates logic.
- **Effort**: 1 day. Touches 4 analyzer entry points + their caches.

### C. Store the unavailableReason in the cache alongside the insight

Change the cache shape from `<VoteFinanceInsight>` to `<{ insight, unavailableReason? }>`. Persist the reason on cache write so future cache hits return it.

- **Pros**: Future-proofs. Reasons are exactly what the original compute decided.
- **Cons**: Invalidates existing Redis cache entries (one-time cold-rebuild on every key). Touches 4 cache-write paths. Bigger blast radius.
- **Effort**: 2-3 hours but with cache invalidation risk.

**Recommend A** — the simplest correct fix. Reason strings can be refined later. The MR5 contract speaks to _state_, and state is what's wrong today.

## Recommended sequence

1. **Read the MR12 closeout** (`PROMPT-MR12-house-clerk-xml-blocked.md` lines 114+) for context on why we land here.
2. **Read `toMetricStatus`** at `src/app/api/intelligence/address/money-report/route.ts:200-240`. Understand the four-branch decision tree.
3. **Implement Option A**. Insert the new branch between the `value !== null` and `unavailableReason` checks. Use a per-metric reason if it's easy — e.g., for `voteFinance`, "Fewer than 3 sectors had 10+ classified votes"; for `financeJurisdiction`, "No committee assignments overlap with donor industries". (Pass the per-metric reason in as a third arg to `toMetricStatus` if needed.)
4. **Update the JSDoc** above `toMetricStatus` to reflect the new branch (currently documents 4 cases; will be 5).
5. **Add unit tests** in a new file `src/__tests__/app/api/intelligence/money-report-toMetricStatus.test.ts` covering all five branches:
   - rejected (timeout) → `unavailable / timeout`
   - rejected (other) → `unavailable / analyzer-error`
   - fulfilled, numeric value → `ready`
   - fulfilled, null value, **insight present** → `insufficient-data` (the NEW branch)
   - fulfilled, null value, no insight, has `unavailableReason === SENATE_UPSTREAM_BLOCKED_REASON` → `unavailable` (preserved)
   - fulfilled, null value, no insight, has other `unavailableReason` → `insufficient-data` (preserved)
   - fulfilled, null value, no insight, no reason → `unavailable / analyzer-error` (defensive default, preserved)
6. **Run `npm run validate:all`** — must be clean before pushing.
7. **Push to preview**. Wait for build with `vercel inspect <url> --wait`.
8. **Probe the money-report endpoint** and confirm Brad Sherman now shows `insufficient-data`:

   ```bash
   vercel curl --deployment <preview-url> \
     "/api/intelligence/address/money-report?zip=90049" \
     | jq '.representatives[] | {name, chamber, voteFinance}'
   ```

   Expected post-MR14:

   ```
   Brad Sherman      | House  | { state: 'insufficient-data', reason: 'Fewer than 3 sectors had 10+ classified votes' }
   Adam Schiff       | Senate | { state: 'unavailable', reason: 'Senate roll-call XML upstream is blocked from Vercel...' }
   Alejandro Padilla | Senate | { state: 'unavailable', reason: '...' }
   ```

9. **Optional: probe a House rep with a healthy correlation** (if MR13 has shipped — pick any well-established member like Pelosi P000197 or McCarthy M001172). Should return `state: 'ready'` with a numeric value, confirming the `ready` branch wasn't broken.
10. **Open PR**, link to MR12 closeout, merge after CI green.

## What's been ruled out (don't re-investigate)

- **The analyzer itself**. Vote-finance is producing the correct output for House reps post-MR12. The issue is purely in the orchestrator's state mapping.
- **The MR5 honest-empty-state design**. It's correct as designed; `toMetricStatus` is what diverges from it.
- **The cache TTL**. 7 days is fine. Issue isn't staleness.
- **The Senate sentinel handling**. `SENATE_UPSTREAM_BLOCKED_REASON` correctly emits `unavailable`. Preserve that branch verbatim.

## Constraints

- **Don't change analyzer behavior**. Only the orchestrator's interpretation of analyzer outcomes changes.
- **Preserve `SENATE_UPSTREAM_BLOCKED_REASON → state: 'unavailable'`**. Senate House money-report tiles for senators must keep rendering the MR10 sentinel. Don't accidentally route them through the new `insufficient-data` branch.
- **Preserve `rejected → state: 'unavailable', reason: 'timeout' | 'analyzer-error'`**. A genuinely failed analyzer (network, crash, infinite loop) is correctly `unavailable`.
- **MetricStatus type is `ready | computing | insufficient-data | unavailable`** (see `src/lib/intelligence/types.ts:692-696`). Don't invent new states.

## Success criteria

1. `/api/intelligence/address/money-report?zip=90049` returns Brad Sherman with `voteFinance: { state: 'insufficient-data', reason: <specific> }` (NOT `unavailable / analyzer-error`).
2. Senate reps (Schiff, Padilla) continue to render `voteFinance: { state: 'unavailable', reason: <MR10 sentinel> }`. No regression of MR10's chamber bail-out.
3. Unit tests cover all five branches of `toMetricStatus`. Test file lives at `src/__tests__/app/api/intelligence/money-report-toMetricStatus.test.ts`.
4. `npm run validate:all` is clean.
5. The UI for the Brad Sherman tile changes from "Unavailable" (amber) to "Insufficient data" (gray-with-explanation) post-deploy. Visual verification on `civdotiq.org/money-report?zip=90049` after merge.

## Closeout (fill in when landed)

- [ ] Option chosen (A / B / C):
- [ ] Commit SHA(s):
- [ ] Unit test file path + test count:
- [ ] Money-report ZIP 90049 Brad Sherman tile returned `state: 'insufficient-data'` (paste response):
- [ ] Senate reps still return `state: 'unavailable'` with MR10 sentinel (paste response):
- [ ] Production UI verified (screenshot or note):
- [ ] Any extractors that don't fit the new branch cleanly (and why):
