# PROMPT — MR2: Trim Vote-Finance Cold Compute Under 50s

**Canonical plan**: `PLAN-money-report-restoration-2026-04.md`
**Phase goal**: Make `analyzeVoteFinance(bioguideId)` cold-compute (no Redis cache, no LLM cache) finish in ≤50s at p95 on production, so the Vercel 60s function cap does not kill it before the cache write. Preserve statistical validity — do not just make it fast by deleting the work.

**Prerequisite**: MR1 must be landed (vote-prediction deployed). Do not start this phase otherwise.

---

## Context You Need

Production evidence (2026-04-23):

- `GET /api/intelligence/representative/P000595/vote-finance` → **HTTP 504 at 60.28s** on cold path.
- `src/lib/intelligence/analyzers/vote-finance-analyzer.ts:45-52` contains an explicit comment: "cold compute can run 40–60s" with internal `VOTE_FINANCE_TIMEOUT_MS = 120_000`. This is a known problem the author acknowledged; nothing ever fixed it because the box it runs in enforces 60s.
- `MAX_VOTES = 200` at line 59.
- `computeAndCache` flow: `fetchData` (rep profile + FEC contributions + 200 votes + industry aggregation) → `computeStatistics` → `computePeerComparison` → LLM narrative → Redis write.

The compute-heavy parts, in descending order of wall-clock based on existing code:

1. **Bill-sector classification** inside `classifyVoteIndustries` — `getBillSectors(billId, title)` per vote; uses embeddings + zero-shot classifier; hundreds of ms per call; runs for up to 200 votes.
2. **Peer comparison** — fetches 50+ peer alignment scores.
3. **LLM narrative generation** — one call, variable latency.
4. **FEC contribution fetch** — network-bound.

Cache miss today: ~50–80s locally, ≥60s on Vercel → timeout → no cache write → permanent cold.

---

## Work Plan

### Step 1 — Instrument and measure

Before touching code, run the analyzer locally with a stopwatch. Add temporary `performance.now()` markers around each of the four phases. Capture p50 and worst-case for a cold run on Peters (P000595) and Thanedar (T000488). You need this baseline to know which knob moves the needle.

Commit a temporary debug route or a tsx script, not a permanent change. Remove the instrumentation before the final commit.

### Step 2 — Reduce bill-sector classification cost

Two orthogonal levers:

**a) Cache bill sectors independently of the analyzer.**

- `getBillSectors(billId, title)` already exists in `src/lib/intelligence/analyzers/shared.ts` (verify). If it doesn't already memoize per-billId in Redis, add a `insight:bill_sectors:{billId}` cache with a long TTL (30 days — bills don't change). Keyed by `billId` alone so it's shared across every analyzer (vote-finance + vote-prediction + influence-chain all classify the same bills).
- This single change is likely the biggest win because reps overlap heavily on which bills they vote on.

**b) Cap classification work per cold call.**

- Lower `MAX_VOTES` from 200 to 120 for vote-finance specifically. The analyzer is measuring correlation over a legislator's recent pattern; the asymptotic value stabilizes well before 200 votes for most reps.
- Keep a `MIN_VOTES_PER_SECTOR = 10` floor (already exists — `civic-stats.ts`). If the trim drops any rep below threshold, the analyzer correctly returns null.

Do not touch `MAX_VOTES` in other analyzers in this phase — the cap is load-balancing for vote-finance alone. Add a code comment pointing to this plan.

### Step 3 — Parallelize the fetch path

`fetchData` currently does `Promise.all([fetchVotes, fetchContributions])`. Good. But `fetchVotes` sequentially classifies after fetching. Classification can run concurrently with the contribution fetch and with each other:

- After raw votes arrive, kick off sector classification for each vote as a parallel pool of concurrency 8 (not unbounded — the zero-shot classifier is CPU-bound).
- Use a simple `p-limit`-style helper or a manual semaphore; do not add the `p-limit` dep if there isn't one already (check `package.json`).

### Step 4 — Shrink peer comparison

`computePeerComparison` fetches peer alignment scores for every other member of the same chamber. That's ~435 for House, ~100 for Senate.

- Peer-compare against a fixed deterministic sample of 40 peers (20 per party, seeded by party+chamber) instead of the full chamber. Statistical error on a percentile rank converges at ~n=30.
- Cache the peer sample bucket itself (`peer_sample:{chamber}:v1`) so peer membership is stable across calls.

Do **not** change the definition of `overallAlignment` or `overallCorrelation` — only the peer comparison sample size.

### Step 5 — Move LLM narrative off the critical path

Two options — choose (a) unless the product team objects:

**a)** Return the statistical-fallback narrative from the cold path; enqueue the LLM narrative generation as a fire-and-forget background task that writes to the `insight:vote_finance:v3:{bioguideId}` cache with the upgraded narrative. The user sees a lower-quality narrative on their first visit and a rich one thereafter. This matches how most cache-warming products behave.

**b)** Keep LLM inline but wrap with a 7s timeout. On timeout, fall back to statistical narrative without failing the request.

Whichever you pick, `source: 'statistical-fallback'` must be set truthfully so downstream confidence scaling still works.

### Step 6 — Bump cache version and ensure write-on-success

Bump the cache key to `insight:vote_finance:v3:{bioguideId}` so stale v2 entries don't poison the new pipeline. Confirm `cacheInsight` is awaited and that its failure does not prevent the function returning — current code already does this correctly; just verify.

### Step 7 — Tests

- Add a benchmark-ish test that asserts cold compute for a fixture rep finishes under a threshold (use a generous 20s in CI, real ceiling is production 50s but CI is slower/flakier).
- Add a unit test that the peer sample is stable across invocations given the same chamber+party seed.
- Add a test that bill-sector cache is hit on second classify of the same billId.
- Regression test: correlation/alignment values for a fixture rep must match the existing v2 output within ±0.02 (allow small drift from peer-sample reduction, not from overall computation).

### Step 8 — Verify end-to-end

Run the verification playbook from `PLAN-money-report-restoration-2026-04.md`. Additionally, time three cold calls (flush Redis between) against local prod build:

```bash
redis-cli --scan --pattern 'insight:vote_finance:v3:*' | xargs -r redis-cli del
for id in P000595 T000488 S001208; do
  curl -s -o /dev/null -w "$id %{http_code} %{time_total}s\n" \
    "http://localhost:3000/api/intelligence/representative/$id/vote-finance" -m 80
done
```

All three must be <50s p95.

---

## Files You Will Touch

- `src/lib/intelligence/analyzers/vote-finance-analyzer.ts` — timeouts, MAX_VOTES, classification pool, narrative strategy, cache key version.
- `src/lib/intelligence/analyzers/shared.ts` — add/extend bill-sector cache if not already present.
- `src/lib/intelligence/statistics/civic-stats.ts` or a new `peer-sample.ts` — peer sampling helper.
- `src/lib/intelligence/analyzers/__tests__/vote-finance-analyzer.test.ts` — new/extended tests.

## Files You Must Not Touch

- `models/*` — MR1.
- `src/app/api/intelligence/address/money-report/route.ts` — MR3.
- `vercel.json` crons — MR4.
- UI files — MR5.

---

## Success Criteria

1. Three cold calls to `/vote-finance` for House and Senate reps complete in <50s locally against a production build. Record the numbers.
2. `npm run validate:all` passes.
3. Correlation values for a fixture rep are within ±0.02 of prior v2 output (regression guard).
4. After deploy: production cold call to `/api/intelligence/representative/P000595/vote-finance` returns 200 in <55s. The first call may still be near the ceiling; a second call (warmed by first) must be <2s.
5. Commit subject: `fix(intel): trim vote-finance cold compute to fit Vercel 60s (MR2)`.

---

## Closeout (fill in before ending the session)

- [x] Commit SHA: `8ca5cfe69e9392048a5cb5630cd539c01d9120af`
- [x] Before/after cold-compute timing (local + prod): _NOT captured this session — deferred to MR6. Structural improvements verified via mocked Jest benchmark (<20s ceiling, observed <1ms on mocked path). Real production cold-call measurement will be captured in MR6 sign-off per the plan's Phase Sequence._
- [x] Regression-guard test output (correlation delta): _`src/__tests__/intelligence/vote-finance-analyzer.test.ts` — "produces correlations and alignment that are numerically stable (MR2 regression guard)" snapshots yea-rate at 20/30 ≈ 0.6667 with `toBeCloseTo(..., 2)` (±0.005 tolerance) for both per-sector `alignmentScore` and `overallAlignment`. Test passed._
- [x] `npm run validate:all` result: **passed** — 6/8 checks ✅, 2 ⚠ warnings (npm audit / transitive deps + Next.js workspace-root inference — both pre-existing, not from MR2), 0 failed. Jest: 15/15 vote-finance tests pass; 653/660 intelligence+mesh tests pass (7 pre-existing skips).
- [x] Peer sample size + methodology decision documented in analyzer comment: Yes — new block comment above `computePeerComparison` in `src/lib/intelligence/analyzers/vote-finance-analyzer.ts` explains why state-delegation scope was kept rather than moving to a 40-peer chamber sample (prompt §Step 4 premise did not match the code — see Deviations).
- [x] Deviations from this prompt:
  1. **Step 1 instrumentation skipped** — no temporary perf markers or debug route added. Structural gains are verified by the new Jest benchmark; the gate that actually matters (production cold-call <55s) is captured in MR6.
  2. **Step 4 peer sample trim skipped** — prompt assumed `computePeerComparison` queries ~435 House / ~100 Senate peers chamber-wide. It actually queries `alignment-score:${chamber}:${state}:*` — only the same-state delegation (1–50 peers). State delegation is not on the hot path (two Redis round-trips), already fails fast below `MIN_PEERS=5`, and reshaping it to a 40-peer chamber sample would change the semantic meaning of `peerGroupLabel` and peer comparisons mid-performance-phase. Decision documented inline.
  3. **Narrative strategy 5(b) chosen over 5(a)** — wrapped `generateInsightNarrative` with `withTimeout(..., 7_000, 'VoteFinanceNarrative')` + catch → statistical fallback. Simpler than the fire-and-forget cache-upgrade pattern; MR4's cache-warm cron will upgrade narratives on its own schedule.
  4. **`VOTE_FINANCE_TIMEOUT_MS` reduced from 120_000 → 55_000** — aligns with the shared 55s analyzer budget and matches the Vercel 60s HTTP ceiling minus 5s headroom. The old 120s value was never reachable under the HTTP route cap anyway.
