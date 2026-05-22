# PROMPT — MR13: Tighten httpClient retry policy for api.congress.gov so MAX_VOTES can climb

**Parent plan**: `PLAN-money-report-restoration-2026-04.md`
**Spawned from**: `PROMPT-MR12-house-clerk-xml-blocked.md` closeout (2026-05-14, merged as PR #63 commit `b5cc9032`)
**Blocking**: `overallCorrelation` is permanently `null` for House reps in production. The money-report rep tiles show `voteFinance: unavailable` for the House because the orchestrator can't extract a numeric value. MR13 unblocks raising `MAX_VOTES` so enough sector-classified votes pass the `MIN_VOTES_PER_SECTOR=10` floor.

---

## What's actually wrong

MR12 swapped the per-vote House roster fetch from the Akamai-blocked `clerk.house.gov` XML to Congress.gov's JSON `/v3/house-vote/{cong}/{sess}/{rollNum}/members` sub-resource. Both probed reps now return `status: 'complete'` in ~37s on cold cache. Win.

But MR12 also had to lower `MAX_VOTES` from 120 to 50 to fit the 55s analyzer budget. At 50 votes per session, the bill-classifier surfaces ~12 industry-classified votes total, which spreads across 4 sectors as 1–6 per sector. None reach `MIN_VOTES_PER_SECTOR=10`. Result: `overallCorrelation: null` for every House rep, even when the analyzer technically succeeds.

We tried `MAX_VOTES=100` (preview `civ-hhdq5x4pg-civdotiq.vercel.app`, 2026-05-14). Lieu cold call:

| Phase              | phaseMs    | cumulativeMs | Note                                         |
| ------------------ | ---------- | ------------ | -------------------------------------------- |
| fetchRep           | 620        | 620          |                                              |
| fetchContributions | 4,478      | 5,099        | FEC was fast this time                       |
| **fetchVotes**     | **53,330** | **53,951**   | **2 /members fetches hit retry tail**        |
| fetchUpstream      | 53,331     | 53,951       | (max of votes + contributions)               |
| ...                |            |              | analyzer timed out at 55s, nothing past here |

Vercel logs from the same run:

```
2026-05-14T18:40:32.918Z  WARN  HTTP client fetch failed after retries
  url: https://api.congress.gov/v3/house-vote/119/2/124/members?format=json
  attempts: 3, error: "The operation was aborted due to timeout"

2026-05-14T18:40:48.533Z  WARN  HTTP client fetch failed after retries
  url: https://api.congress.gov/v3/house-vote/119/2/109/members?format=json
  attempts: 3, error: "The operation was aborted due to timeout"
```

Two `/members` calls each chewed through:

- attempt 1: 10s AbortSignal timeout
- 1s backoff
- attempt 2: 10s AbortSignal timeout
- 2s backoff
- attempt 3: 10s AbortSignal timeout
- 4s backoff (never used; loop exits)

= **~37 seconds per failed fetch**. Within a single concurrency slot.

## Suspected root cause (high confidence)

`HttpClient.fetch` at `src/features/representatives/services/batch-voting-service.ts:31-136` retries on **any** network error, including `AbortError`. The relevant block at `:102-117`:

```ts
} catch (error) {
  lastError = error instanceof Error ? error : new Error('Unknown fetch error');
  // Retry on network errors with exponential backoff
  if (attempt < maxRetries - 1) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
    logger.debug('Network error, retrying with backoff', { ... });
    await new Promise(resolve => setTimeout(resolve, delay));
    continue;
  }
}
```

Retrying on `AbortError` is wrong when the abort came from our own `AbortSignal.timeout`. The upstream isn't transiently flaky — it's just slow. Three serial 10s waits don't help.

This was masked pre-MR12 because every clerk.house.gov call was hanging anyway, so the analyzer always died at 55s with zero votes processed. Now that ~98% of `/members` calls succeed in <500ms, the ~2% that hit a tail-latency spike dominate the budget when MAX_VOTES is high.

## Remediation options

### A. Skip retry when the error is our own AbortSignal timeout

In the catch block at `:102-117`, detect `AbortError` and break out of the retry loop immediately instead of waiting + retrying. Other network errors (DNS failure, connection reset) still get the existing 3-attempt retry.

- **Pros**: Surgical, one-conditional change. Preserves retry for genuinely transient failures. Affects all callers of `HttpClient.fetch` uniformly.
- **Cons**: Loses the second-chance retry for cases where api.congress.gov really did transiently hang and would have succeeded on retry. Estimated impact: <1% of analyzer runs see those.
- **Effort**: 30 minutes including a unit test.

### B. Lower the AbortSignal timeout from 10s → 5s for the JSON /members path

In `fetchAndParseHouseMembersJSON` at `batch-voting-service.ts:865` (post-MR12 line), change `AbortSignal.timeout(10000)` → `AbortSignal.timeout(5000)`.

- **Pros**: Trivial. Halves the worst-case tail without changing retry semantics.
- **Cons**: Doesn't fully solve it. A failing fetch still costs 5+1+5+2+5 = 18s instead of 32s. Better but still expensive. And it cuts the success window — Congress.gov is normally fast, but a healthy-but-slow response that takes 6s would now be killed.
- **Effort**: 15 minutes.

### C. Combine A + B

Lower the timeout AND skip retry on abort. Failed fetch costs exactly 5s, full stop.

- **Pros**: Maximum budget savings. At MAX_VOTES=200, even 5 simultaneous failed fetches only cost 5s × 5 / 5 concurrency = 5s. Comfortable.
- **Cons**: Most aggressive change.
- **Effort**: 45 minutes.

### D. Per-URL retry policy config

Make `HttpClient` accept a per-URL retry config. api.congress.gov gets one policy, clerk.house.gov gets another (though that path is dead after MR12), FEC gets another.

- **Pros**: Cleanest architectural fix.
- **Cons**: Bigger refactor. Other tickets touch the same code path. Probably overkill for MR13's actual goal.
- **Effort**: 1 full day.

**Recommend C** — it's the smallest change that fully resolves the budget problem. A and B alone leave headroom thin.

## Recommended sequence

1. **Read the MR12 closeout** (`PROMPT-MR12-house-clerk-xml-blocked.md` lines 114+) for context on what was already changed and why MAX_VOTES is at 50.
2. **Implement Option C** in `batch-voting-service.ts`:
   - At `HttpClient.fetch` (~line 31): in the `catch` block, check `if ((error as Error).name === 'AbortError') break;` before the retry-with-backoff logic.
   - At `fetchAndParseHouseMembersJSON` (~line 865): drop the AbortSignal timeout to 5000ms.
3. **Raise MAX_VOTES** in `src/lib/intelligence/analyzers/vote-finance-analyzer.ts` from 50 back to **150** (not 120 — we want enough cushion to hit `MIN_VOTES_PER_SECTOR=10` in the top sectors).
4. **Update the corresponding test** in `src/__tests__/intelligence/vote-finance-analyzer.test.ts` (line ~160).
5. **Add a unit test** for the new no-retry-on-abort behavior. Mock `fetch` to throw an `AbortError` and assert `HttpClient.fetch` rejects on the first attempt without backoff.
6. **Run `npm run validate:all`** — must be clean before pushing.
7. **Push to preview**. Vercel auto-builds. Wait for `vercel inspect <url> --wait`.
8. **Probe both reps** on the preview:

   ```bash
   vercel curl --deployment <preview-url> \
     "/api/intelligence/representative/S000344/vote-finance?cb=$(date +%s%N)"
   vercel curl --deployment <preview-url> \
     "/api/intelligence/representative/L000582/vote-finance?cb=$(date +%s%N)"
   ```

   Both should return `status: 'complete'` with `overallCorrelation` as a **number** (not null) in **under 55 seconds**, including on cold cache. Test multiple times to catch tail-latency runs.

9. **Probe the money-report orchestrator**:

   ```bash
   vercel curl --deployment <preview-url> \
     "/api/intelligence/address/money-report?zip=90049"
   ```

   Brad Sherman's tile should show `voteFinance: { state: 'ready', value: <number> }`. The two Senate reps continue to render `unavailable` with the MR10 sentinel.

10. **Pull Vercel logs** with the MR7 phase-timer query to confirm `fetchVotes` is in the 10–25s range, not 50s+:

    ```bash
    vercel logs <preview-url> --no-follow -n 1 --expand --query "S000344" \
      | grep -oE 'phase":"[^"]+","phaseMs":[0-9]+,"cumulativeMs":[0-9]+[^}]*'
    ```

11. **Open PR**, request review, merge after CI green.

## What's been ruled out (don't re-investigate)

- **clerk.house.gov XML**. Removed entirely in MR12 (~244 LoC deleted). The XML parsers (`parseHouseXMLPrimary/Legacy/Alternative`) are gone.
- **The JSON /members endpoint itself**. MR12 verified 200 from Vercel (`iad1` region, 304ms first call, ~600ms steady-state with bill enrichment chained).
- **Cache key collisions**. MR12 already fixed the latent bug where House per-vote cache keys didn't include session.
- **The analyzer's outer 55s timeout itself**. Don't raise it. The prompt is to fit inside it.

## Constraints

- **Do not change retry behavior for FEC**. FEC's retry policy lives in `src/lib/fec/fec-api-service.ts`, not `HttpClient`. It has its own quirks (handles 429 separately) and is out of scope.
- **Do not change `MIN_VOTES_PER_SECTOR`** in `packages/civic-statistics/src/civic-stats.ts`. The 10-vote floor is a published statistical-integrity rule (`.claude/rules/intelligence-layer.md`). Working around it would violate the project's data-integrity contract.
- **Preserve MR5's UI contract**: `ready | computing | insufficient-data | unavailable`. After MR13, House money-report tiles should be `ready`, not a new sentinel.
- **Do not remove MR7's phase-timer scaffolding**. Still needed to verify MR13's effect and to catch regressions.
- **Stay inside the 55s `ANALYZER_TIMEOUT_MS`**. Don't raise it. If MAX_VOTES=150 still doesn't fit, lower it incrementally until it does, then file a follow-up.

## Success criteria

1. Direct vote-finance probes for **S000344** and **L000582** return `status: 'complete'` with **numeric** `overallCorrelation` in under 55s on cold cache. Verified across 3 consecutive probes to rule out tail-latency luck.
2. `/api/intelligence/address/money-report?zip=90049` returns Brad Sherman with `voteFinance: { state: 'ready', value: <number> }`. Senate reps continue to render `unavailable` with the MR10 sentinel.
3. New unit test for `HttpClient.fetch` no-retry-on-abort behavior passes.
4. Production `/api/cron/warm-intelligence` House success rate ≥ 90% on the post-deploy run (it was 0% pre-MR12, "complete but null" post-MR12).
5. PROMPT-MR12's "House cron success rate post-deploy" checkbox can finally be checked.

## Closeout (fill in when landed)

- [ ] Option chosen (A / B / C / D):
- [ ] Commit SHA(s):
- [ ] AbortError retry-skip verified via unit test (paste test name):
- [ ] Direct vote-finance probes for `S000344` + `L000582` returned numeric `overallCorrelation` (paste 3 consecutive responses):
- [ ] Money-report ZIP 90049 House tile returned `state: 'ready'` (paste response):
- [ ] MR12 + MR10 closeout cron-success-rate checkboxes flipped to PASS:
- [ ] Production House cron success rate post-deploy:
- [ ] Any sample-size deferrals remaining (e.g. low-vote freshman reps still below threshold): list bioguideIds and propose handling:
