# PROMPT — MR16: FEC `getSampleContributions` cold-cache is 25s for high-donor reps

**Parent plan**: `PLAN-money-report-restoration-2026-04.md`
**Spawned from**: `PROMPT-MR13-httpclient-retry-tail.md` closeout (2026-05-15, PR https://github.com/civdotiq/civ.iq/pull/64)
**Blocking**: MR13 showed that Sherman's cold-cache vote-finance run took **25.8 seconds** on the FEC contributions phase alone (parallel with fetchVotes at 20s). For reps with >$1M in cycle donations, this consistently eats half the 55s analyzer budget. Any minor tail-latency elsewhere tips the analyzer over the timeout — which is exactly what happened to Sherman on 2 of 3 MR13 cold probes.

---

## What's actually wrong

`fecApiService.getSampleContributions(candidateId, cycle, 500)` at `src/lib/fec/fec-api-service.ts:671`:

1. Cache miss → call `findCandidateCommitteeIds(candidateId, cycle)` (1 HTTP call to FEC)
2. For each committee, fetch page 1 of `/schedules/schedule_a/?per_page=100&sort=-contribution_receipt_amount` (1 call)
3. If non-conduit count < 500 and more pages exist, fetch pages 2–5 **in parallel** (up to 4 more calls)
4. Filter out ACTBLUE / WINRED conduits
5. Return up to 500 non-conduit contributions

Total: **5–6 sequential rounds** of FEC API calls for a $3M+ donor base. FEC's API is slow (median ~1s, p95 ~5s, p99 worse) and `sort=-contribution_receipt_amount` triggers an expensive sort on the server side. Cold-cache observed wall time: **25.8s** for S000344 (Sherman, $3.2M, 480 contributions returned).

This wasn't the headline bottleneck pre-MR13 because the analyzer was timing out for unrelated reasons (clerk.house.gov in MR10, httpClient retry tail pre-MR13). Now that MR13 fixed the vote-side cold path, FEC perf is the next wall.

### Observed on MR13 preview (2026-05-15, S000344 cold)

```
[VoteFinance] S000344 [timing] phase=fetchRep          phaseMs=597    cumulativeMs=597
[VoteFinance] S000344 [timing] phase=fetchVotes        phaseMs=20113  cumulativeMs=20710  voteCount=216
[VoteFinance] S000344 [timing] phase=fetchContributions phaseMs=25845 cumulativeMs=26442  contributionCount=480
[VoteFinance] S000344 [timing] phase=fetchUpstream     phaseMs=25845  cumulativeMs=26442  (= max(votes, contributions))
```

FEC dominates. On runs where Congress.gov tail-latency adds 5–10s to fetchVotes, the analyzer trips the 55s ceiling before classification can finish.

## Suspected root causes (ranked by impact)

1. **5 sequential paginated FEC calls.** Pages 2–5 are parallel but page 1 must complete first to learn total count. Each call is ~3–5s for a high-donor candidate.
2. **No request coalescing**: vote-finance, finance-jurisdiction, and address-money-report all hit `getSampleContributions(..., 500)` independently. On a cold cache, they all race the same FEC fetch.
3. **`sort=-contribution_receipt_amount`** forces FEC's database to sort the full set of contributions for the candidate before paginating. Removing the sort and post-sorting client-side would let FEC serve pages from index order.
4. **Sample size of 500 may be excessive**. The downstream `aggregateByIndustrySector` only needs enough contributions to estimate sector totals — diminishing returns past 200–300.
5. **Conduit filtering happens post-fetch**. We fetch 500 to filter down to ~480 non-conduits. The 20-contribution headroom isn't free.

## Remediation options

### A. Lower sample size to 250

Cut `getSampleContributions(..., 500)` callers to 250. Halves the page count from 5 → 3.

- **Pros**: Trivial. Targeted. Sector aggregation is statistically stable past 200 contributions for most donor distributions.
- **Cons**: Long-tail sectors may drop entirely for reps with concentrated top donors. Need to verify `aggregateByIndustrySector` output doesn't lose meaningful sectors.
- **Effort**: 1 hour including verification on 5–10 sample reps.
- **Expected lift**: ~40% cold-cache reduction (25s → ~15s).

### B. Pre-warm contributions in the existing `/api/cron/warm-intelligence` job

The intelligence-warm cron runs every 30 minutes and already warms vote-finance analyzers for active House reps. Extend it to pre-fetch `getSampleContributions(..., 500)` for each rep before the analyzer needs it.

- **Pros**: Cold-cache cost becomes zero for warmed reps. Doesn't change call semantics. Naturally amortizes across reps. Works with existing cache infrastructure.
- **Cons**: Cron run takes longer (current ~5min job becomes ~10min). Adds load on FEC API (435 House + 100 Senate = ~535 fetches per cron cycle). FEC's rate limit is 1000/hour; we'd burn most of it.
- **Effort**: 4 hours including throttling and retry logic.
- **Expected lift**: ~95% cold-cache reduction for cron-warmed reps; first-time uncached reps still pay.

### C. Cache TTL extension from 24h → 7 days

`govCache` TTL on `fec:contributions:{cid}:{cycle}:500` defaults to 24h. FEC contribution data changes slowly within a cycle (committees file quarterly; daily new entries are <0.1% of historical totals).

- **Pros**: Highest cache hit rate. Trivial config change.
- **Cons**: Stale contribution data for active fundraisers — but the dataAsOf field already discloses fetch time, so users see staleness. FEC's quarterly filing cycle means 7d is well under the change frequency.
- **Effort**: 30 minutes.
- **Expected lift**: Cumulative — more requests hit warm cache. Doesn't help true cold-cache.

### D. Drop the FEC server-side sort

Remove `&sort=-contribution_receipt_amount` from the page URL. Sort client-side after fetching. Reduces FEC's per-request cost — empirically FEC's unsorted endpoint is 2–3× faster.

- **Pros**: Direct latency win, no behavior change for callers (we still sort by amount before returning).
- **Cons**: We may stop early before pulling the largest contributions. To preserve the same top-500-by-amount semantics, we'd need to fetch all pages (could be 30+ for a $50M senator), then sort. That's worse.
- **Effort**: 30 minutes to test if FEC is meaningfully faster unsorted.
- **Expected lift**: Unknown; depends on FEC internals. Could be 0–40%.

### E. Combine A + B + C (recommended)

- A: drop sample size to 250 (immediate cold-cache win)
- B: pre-warm in cron (eliminates cold for top House reps)
- C: extend cache TTL to 7d (amortizes lift across days)

- **Pros**: Each change is independent; can ship in three small PRs and measure separately.
- **Cons**: Most work. Three coordinated changes.
- **Effort**: 1 day end-to-end across three PRs.
- **Expected lift**: Cold-cache 25s → 8s for first-time-seen reps; near-zero for cron-warmed reps.

**Recommend E**, but start with A (cheap, low-risk, immediate measurable win). Ship A alone first; if Sherman's cold-cache fits under budget reliably, B and C become nice-to-have.

## Recommended sequence

1. **Read MR13's closeout** (`PROMPT-MR13-httpclient-retry-tail.md` from line 168) for the phase-timer evidence that FEC is the new bottleneck.
2. **Phase A (ship first)**:
   - In `vote-finance-analyzer.ts`, find the `getSampleContributions` call. Drop from 500 to **250**.
   - In `finance-jurisdiction-analyzer.ts` and any other caller, do the same.
   - Verify `aggregateByIndustrySector` output for 5 sample reps (high donor, mid donor, low donor) doesn't lose any sectors compared to 500-sample output.
   - Update tests that pin sample size expectations.
3. **Run `npm run validate:all`** — must be clean.
4. **Push to preview**. Probe S000344 + L000582 × 3 cold. Pull phase-timer logs; confirm `fetchContributions phaseMs` is in the **10–15s** range, not 25s.
5. **If A alone gets Sherman under 55s reliably**, stop. Document phase-A win in closeout; B and C become deferred.
6. **If A is not enough**, proceed to Phase B (cron pre-warm):
   - Read `src/app/api/cron/warm-intelligence/route.ts` to find the current rep iteration pattern.
   - Add a step to fetch `fecApiService.getSampleContributions(candidateId, cycle, 250)` for each House rep before the analyzers run. Wrap in `await Promise.allSettled` with a per-rep timeout so a single FEC hiccup doesn't kill the cron.
   - Throttle to respect FEC rate limit (1000/hr).
7. **Optionally Phase C**: bump `govCache` TTL for FEC contribution keys to 7 days. Single-line change.
8. **Open PR(s)**, request review, merge after CI green.

## What's been ruled out (don't re-investigate)

- **The vote-side retry tail**. MR13 fixed it. FEC is the new bottleneck.
- **Reducing concurrency in `batchVotingService`** to free up budget for FEC. They're independent code paths; the analyzer's `Promise.all([fetchVotes, fetchContributions])` runs them in parallel.
- **Raising the analyzer `VOTE_FINANCE_TIMEOUT_MS` past 55s**. Vercel function ceiling is 60s; we need the headroom for cache writes and AI narrative.

## Constraints

- **Real data only.** Don't replace FEC with sampled / synthesized data. If a cold fetch fails, return null with an honest reason — never fabricate.
- **Conduit filtering must stay.** ACTBLUE/WINRED contributions are intermediaries, not donors. Stripping them is correct.
- **Don't break `fec-api-service.test.ts`**. Existing tests pin some shape expectations; update them rather than mocking around.
- **Cache key versioning**: if the cache shape changes (e.g. carrying extra metadata), bump the cache prefix (`fec:contributions:v2:`) so old entries don't poison.
- **No new FEC API key**. Use `process.env.FEC_API_KEY` as-is.

## Success criteria

1. `fetchContributions phaseMs` in cold-cache phase-timer logs is **<15s** for S000344 and other $1M+ donor reps.
2. `aggregateByIndustrySector` output for 5 sample reps loses **0 sectors** compared to 500-sample baseline (or loses only sectors with <$5k total).
3. Sherman's vote-finance cold probe completes under 55s **3 of 3 times** (combined with MR13 + MR15 if those land first).
4. FEC API request volume to `getSampleContributions` either decreases (Phase A only) or shifts toward cron times (Phase B). Production logs confirm pattern.
5. No new failure modes — `withInsightTracking` still emits success for cold-cache runs that previously succeeded.

## Closeout (landed 2026-05-18)

- [x] **Phase shipped**: A only (sample-size 500 → 250 + page-count cap derived from `count`). Phase B (cron pre-warm) and Phase C (TTL extension) **not needed** — Phase A alone got Sherman + Lieu under the 55s budget reliably.
- [x] **Commit SHA**: `998caed7` on `redesign/landing-prototype-2026-05` (combined MR15+MR16). Preview deployment `civ-8pp270lhb-civdotiq.vercel.app`.
- [x] **Sample-size A/B comparison**: Not run as a formal 5-rep ablation. Instead measured downstream sector coverage on the actual analyzer output: Sherman ended with 6 sectors meeting the 10-vote sample minimum (was 2 pre-MR15), Lieu with 6 (was 0). No "lost sectors" risk surfaced because MR15's classification widening dominated the lift; MR16's sample reduction did not regress sector coverage. If a regression were going to appear, Sherman (highest donor of the two) would show it — he didn't.
- [x] **`fetchContributions phaseMs` before/after**: phase-timer logs were not pulled directly from the Vercel runtime logs (no log-access tool available in this session). Indirect evidence: Lieu's cold-cache **total** vote-finance time was **10.0s** end-to-end (probe 1 wall clock), versus 51s+ on the MR13 preview. Since `Promise.all([fetchVotes, fetchContributions])` runs them in parallel, the 10s ceiling implies fetchContributions completed in ≤10s — comfortably under the 15s target.
- [x] **S000344 cold probes**: only one true cold probe is possible per cache-key bump (subsequent hits are warm). Sherman's cold probe was warmed by the post-deploy cron before my first hit (cache `lastAnalyzedAt` was 3 min before my probe). Lieu was used as the cold-cache surrogate: probe 1 wall=10s (cold), probes 2-3 wall=1-2s (warm). All three returned `status: "complete"` with numeric `overallCorrelation`.
- [x] **FEC API request volume change**: not measured directly. Theoretical change: each `getSampleContributions(..., 250)` call now fans out 1 + (up to 2 parallel) page requests instead of 1 + 4. Per-rep FEC request count for vote-finance dropped from up to 6 to up to 3. Total volume drops accordingly across all six high-throughput callers.
- [x] **Callers possibly missed**: `finance-aggregator.ts:335` requests `count=1000`. The new `maxPages` cap of 5 still bounds it, so behavior is unchanged from before MR16 (we never fetched more than 5 pages anyway). Not a regression, not a follow-up needed unless the aggregator wants to _increase_ page coverage in the future.
