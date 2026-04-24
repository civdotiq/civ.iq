# PROMPT — MR7: Root-cause 100% Timeout on vote_finance + vote_prediction in Production

**Parent plan**: `PLAN-money-report-restoration-2026-04.md`
**Spawned from**: `PROMPT-MR6-verification-signoff.md` (2026-04-23 re-run, after push + deploy)
**Blocking**: MR6 sign-off — PLAN acceptance criteria cannot be met until this is fixed.

---

## The Problem

On 2026-04-23 21:05 UTC, immediately after MR1–MR5 deployed to production, one cron slice of 20 reps produced:

| Analyzer             |  ok | timeout | success rate |
| -------------------- | --: | ------: | -----------: |
| finance_jurisdiction |   3 |      17 |          15% |
| vote_finance         |   0 |      20 |       **0%** |
| vote_prediction      |   0 |      20 |       **0%** |
| influence_chain      |   2 |      18 |          10% |

Every `vote_finance` and `vote_prediction` call timed out at **exactly 55000ms** — the `ANALYZER_TIMEOUT_MS` ceiling introduced in MR3. MR2's trim (reduced MAX_VOTES, peer trim) was validated locally but does not fit inside 55s in production.

## What's Different Between Local and Production

| Factor                         | Local dev                           | Vercel production                                                                       |
| ------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------- |
| Redis                          | Often set (or fallback memory fine) | **Not provisioned** (see MR8)                                                           |
| Upstream API latency           | Lower (cached DNS, warm TCP)        | Higher (cold connections per function)                                                  |
| Function boot / bundle loading | Hot                                 | Cold on first invocation per instance                                                   |
| ONNX model load (MR1)          | In-repo, already in FS              | Unpacked lazily via `outputFileTracingIncludes` — needs to verify actual cold-load cost |

The 55s timeout fires on **every** vote_finance call and **every** vote_prediction call, across 20 different reps, on four sequential invocations within the same cron run. This is not one slow rep — it's the analyzer hitting a structural budget problem.

## Hypotheses to Investigate (in priority order)

1. **Upstream sequential fan-out.** `vote-finance-analyzer.ts` likely fetches votes from Congress.gov and contributions from FEC; if it serializes >10 upstream calls (e.g., one per vote to resolve sector classification), even 500ms/call × 80 calls = 40s just in network time, and a single cold-start adds another 15s.
2. **FEC rate-limit backoff.** FEC enforces per-key QPS. If MR2's trim still produces >30 parallel FEC calls, the client's retry-with-backoff may be consuming the 55s budget on HTTP 429s. Log raw HTTP statuses the cron run saw.
3. **ONNX cold load (vote_prediction).** MR1 shipped the model via `outputFileTracingIncludes`. Verify the model actually lands on the serverless function's filesystem post-deploy and measure `loadSession()` wall-clock. If cold-load is 8–12s, combined with 45s compute it explodes the budget.
4. **No warm path, ever.** Without Redis (MR8), the analyzer cache in `shared.ts` writes to per-instance memory. The cron warms instance A; the request lands on instance B; cold again. The cron is only useful once Redis is provisioned.
5. **MAX_VOTES still too generous.** `vote-finance-analyzer.ts:59` is `MAX_VOTES = 200` after MR2. Check whether production actually returns 200 votes per rep for the 119th Congress and whether the per-vote enrichment is the bottleneck.

## Proposed Investigation Plan

### Step 1 — Add high-resolution timing to the analyzers

Instrument `vote-finance-analyzer.ts` and `vote-prediction-analyzer.ts` with phase timings:

- upstream fetch wall-clock per source
- vote count returned
- stat compute time
- FEC call count + rate-limit hits

Emit via `logger.info` so we can read them from Vercel dashboard logs.

### Step 2 — Reproduce against production with a single bioguide

`GET /api/intelligence/representative/P000595/vote-finance` directly, measure. Compare against local with identical data. Use Vercel `/logs` for the specific invocation.

### Step 3 — Decide between three remediation paths

- **A. Harder trim.** MAX_VOTES=50, peer group=20, skip enrichment on cache-miss and serve "computing". Fast but lossy.
- **B. Async compute (Vercel Workflow or Queues).** Kick off the heavy compute in a background durable step; the orchestrator returns `{ state: 'computing' }` immediately. MR5's `computing` state is already declared — orchestrator just never emits it yet.
- **C. Precompute offline.** Run the expensive computation nightly via a script (not a live cron), write results to a static JSON or to a separate cold store. The live endpoint becomes a pure read.

Recommend B because it matches MR5's type union and Vercel's Fluid Compute model, but A is the fastest incremental improvement.

## Success Criteria

1. `vote_finance` and `vote_prediction` cron success rate ≥ 80% across one full 536-rep sweep.
2. A cold-cache call to `GET /api/intelligence/address/money-report?zip=48201` returns `ready` (not `timeout`) for Peters's `voteFinance` and `independence` within the 120s orchestrator budget.
3. MR6 re-runs from Step 1 and all six acceptance-criteria bullets pass.

## Dependencies

- MR8 (Redis) — without Redis, even if compute fits in 55s, the result doesn't persist across instances, so warm-cron is ineffective. Recommend MR7 and MR8 land together.

## Constraints

- No changes to MR5's UI contract — keep `ready | computing | insufficient-data | unavailable` intact.
- Preserve data integrity — no synthetic values, no guessing from partial data.
- Stay inside federal scope.

---

## Closeout (fill in when landed)

- [x] **Root cause identified — H1 (upstream sequential fan-out), narrowed to `batchVotingService.fetchVotes`**.

  Evidence (2026-04-23 instrumentation pass; commits `56a5671a`, `9ce4b10a`, `4220669e`):

  Per-phase timings via `/api/intelligence/debug/phase-timings/:bioguideId/:analyzer`:

  | Run | bioguideId       | analyzer        | fetchRep | fetchContributions    | fetchVotes             | total            |
  | --- | ---------------- | --------------- | -------- | --------------------- | ---------------------- | ---------------- |
  | 1   | P000595 (Senate) | vote-finance    | 599 ms   | 2047 ms (305 records) | **never resolved**     | timeout 55009 ms |
  | 2   | P000595 (Senate) | vote-prediction | 563 ms   | 1470 ms (305 records) | 26845 ms (**0 votes**) | 27416 ms         |
  | 3   | C001035 (Senate) | vote-finance    | 4 ms     | 1985 ms (300 records) | 1136 ms (**0 votes**)  | 1991 ms          |
  - FEC is fast and reliable (1.5–2s for ~300 records). H2 ruled out.
  - Vote-prediction has no ONNX cold-load contribution because `fetchVotes` returns first (0 votes → analyzer aborts before predictions). H3 inconclusive but non-blocking.
  - `fetchVotes` returns **0 votes** even when it does complete. The `/api/health` probe shows `Congress.gov: down (404)`, so `batchVotingService.getHouseVoteList` and `getSenateMemberVotes` are running their full retry/circuit-breaker chains against an empty/missing upstream and either timing out (>55s) or returning empty arrays (1–27s, high variance).
  - H4 (no warm path / Redis) compounds this — same XML pulls re-run on every cold instance — but isn't the proximate cause; even a fully warm cache wouldn't help on the first call to a rep.
  - H5 (MAX_VOTES too generous) is irrelevant because classification never runs.

- [x] **Cron slice rerun (post-instrumentation, pre-fix), 2026-04-23**: still 0/20 ok on vote_finance and vote_prediction; finance_jurisdiction 9/20 ok, influence_chain 5/20 ok. Total slice wall-clock 220455 ms (4 batches × ~55 s). Confirms the timeouts are entirely inside `batchVotingService.fetchVotes`.

- [ ] **Remediation deferred (separate PR/prompt).** Recommended path:
  1. Fix the Congress.gov 404 first — the API key may be wrong, expired, or pointing at a removed endpoint. Without a working upstream, no remediation path inside the analyzers can return real data.
  2. After upstream is healthy, add a fast-path bail-out: if `fetchVotes` returns 0 votes, the analyzer should return `unavailable` immediately rather than continuing to the contribution merge. The current code already does this on `!rawVotes.length` but only after the slow XML pulls; the bail-out should be earlier (e.g., after `getHouseVoteList`, before the parallel XML batch).
  3. Then revisit MR7 Step 3 options: a hard MAX_VOTES trim (A), async/queued compute (B), or offline precompute (C).

- [ ] **Diagnostic scaffolding to remove on closeout**:
  - `src/app/api/intelligence/debug/phase-timings/[bioguideId]/[analyzer]/route.ts`
  - `getLastPhases` and the `lastPhases` map in `src/lib/intelligence/analyzers/shared.ts`
  - `createPhaseTimer().mark/.record` calls in `vote-finance-analyzer.ts`, `vote-prediction-analyzer.ts`
  - ONNX cold-load timing block in `vote-predictor.ts:loadSession`

- [x] **Investigation commits**: `56a5671a` (instrumentation), `9ce4b10a` (diagnostic endpoint), `4220669e` (concurrent sibling recording).

- [ ] **Cron slice success rates post-fix**: pending remediation PR.
- [ ] **MR6 re-run result**: pending remediation PR.
