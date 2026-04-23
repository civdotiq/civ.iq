# PROMPT — MR4: Pre-Warm Intelligence Cache via Vercel Cron

**Canonical plan**: `PLAN-money-report-restoration-2026-04.md`
**Phase goal**: Land a Vercel cron that keeps Redis caches warm for `finance-jurisdiction`, `vote-finance`, `vote-prediction`, and `influence-chain` for every current member of Congress, so cold-path compute never hits a real user.

**Prerequisites**: MR1 + MR2 + MR3 landed. Analyzers fit their budgets; ONNX model ships with the bundle.

---

## Context You Need

- `scripts/warm-intelligence-cache.ts` exists but only warms finance-jurisdiction and vote-finance. It runs as a node script, not on Vercel.
- `vercel.json` has six existing crons: `rss-aggregator`, `bill-summarizer`, `nostr-publisher`, `stock-trade-parser`, `dataset-generator`, `alerts`. Pattern: each is `src/app/api/cron/<name>/route.ts` with `maxDuration` via `src/app/api/cron/**/*.ts: { "maxDuration": 300 }`.
- Vercel crons require the route to be callable by the Vercel cron runner. Protect it with `CRON_SECRET` (existing pattern in other crons — verify).
- Congress has 535 current members. Warming all 4 analyzers takes far more than 300s in a single invocation. The cron must be **chunked** — each invocation warms a bounded slice, and the chunks together complete over a schedule period.

---

## Work Plan

### Step 1 — Audit existing cron pattern

Read one existing cron (e.g. `src/app/api/cron/bill-summarizer/route.ts`) and note:

- How auth is handled (`Authorization: Bearer <CRON_SECRET>`?).
- How errors are logged.
- How the route is marked `export const dynamic = 'force-dynamic'` and `maxDuration`.

Mirror that pattern — don't invent a new one.

### Step 2 — Design the chunking

Two viable approaches:

**a) Offset-rotation cron (simpler)**:

- Run one cron every 30 minutes.
- Each invocation warms a contiguous slice of 20 reps, cycling through `[0,20) → [20,40) → …` using a Redis-stored cursor (`cron:warm-intel:cursor`).
- Full 535-rep cycle in ~14 hours, so every rep is re-warmed ~1.7× per day.
- Advantage: one cron entry, one route; deterministic progress; easy rollback.

**b) Multiple offset crons (spread load)**:

- `@hourly` cron at minute 0 warms reps 0–89.
- `@hourly` cron at minute 15 warms reps 90–179. Etc.
- More complex; only do this if (a) exceeds the 300s cap per invocation after MR2's trimming.

Pick (a) unless measurements from MR2 say a slice of 20 will exceed 250s (leaving 50s headroom under 300s).

### Step 3 — Implement `src/app/api/cron/warm-intelligence/route.ts`

Responsibilities:

1. Verify `Authorization: Bearer ${process.env.CRON_SECRET}` (reject others with 401 — **do not** expose to unauthenticated callers).
2. Read cursor from Redis (`cron:warm-intel:cursor`, default 0).
3. Fetch the full rep list via `getAllEnhancedRepresentatives` (this itself is cached via `RepresentativesCoreService`).
4. Slice `[cursor, cursor + SLICE_SIZE)`.
5. For each rep in the slice, run all four analyzers with `Promise.allSettled`, each wrapped in a 55s timeout. Log per-rep status + elapsed.
6. Advance cursor to `(cursor + SLICE_SIZE) % reps.length`.
7. Return a JSON summary: `{ warmed: N, errors: M, slice: [start,end], nextCursor }`.

Use `logger.info/warn/error` — not `console.log`.

### Step 4 — Extend `scripts/warm-intelligence-cache.ts`

The node script should do the same work as the cron so ops can manually warm after a cache flush. Extend to include `analyzeVotePrediction` and `analyzeInfluenceChains` alongside the existing two.

Keep the script's CLI flags (`--dry-run`, `--incremental`) working.

### Step 5 — Add cron entry to `vercel.json`

```json
{
  "path": "/api/cron/warm-intelligence",
  "schedule": "*/30 * * * *"
}
```

Place it in the existing `crons` array. Vercel will invoke with a header identifying itself; the route's auth check is still required because the URL is publicly reachable.

### Step 6 — Observability

- Log cursor, slice range, per-analyzer per-rep status.
- After each invocation, write a single summary line prefixed `[WARM-INTEL]` for easy grep in Vercel logs.
- Consider emitting to an existing monitoring pipeline if one exists (grep for `insightMetrics` or similar — don't invent a new one).

### Step 7 — Tests

- Unit test the route with the rep list stubbed to 25 members, `SLICE_SIZE = 10`. Assert three consecutive invocations touch reps 0–9, 10–19, 20–24 + 0–4 (wrap-around).
- Unit test 401 rejection when `Authorization` header is missing or wrong.
- Unit test error isolation: one analyzer throwing does not prevent the other three from attempting.

### Step 8 — First-run manual trigger

After deploy, manually trigger the cron a few times via curl (with CRON_SECRET) to warm the initial cache. Don't wait for the schedule; you want MR6's verification to hit warm caches.

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "https://civdotiq.org/api/cron/warm-intelligence" -m 300
```

Run this ~30 times back-to-back to cover the full chamber. Log the last response's `nextCursor: 0` to confirm the cycle closed.

---

## Files You Will Touch

- `src/app/api/cron/warm-intelligence/route.ts` — new file.
- `scripts/warm-intelligence-cache.ts` — extend to 4 analyzers.
- `vercel.json` — new cron entry.
- `src/__tests__/cron/warm-intelligence.test.ts` — new tests.

## Files You Must Not Touch

- Analyzer internals (MR1 + MR2 scope).
- money-report route (MR3).
- UI (MR5).

---

## Success Criteria

1. `/api/cron/warm-intelligence` returns 401 without `CRON_SECRET`, 200 with it, and completes one slice of 20 reps in <280s against production.
2. Cursor advances and wraps correctly across invocations (verified by manual triggers or unit test).
3. After manual warm-up run, cold-flushed money-report for ZIP 48201 returns 200 in <5s (all 3 reps, all metrics populated).
4. `npm run validate:all` passes.
5. Commit subject: `feat(intel): pre-warm analyzer caches via Vercel cron (MR4)`.

---

## Closeout (fill in before ending the session)

- [ ] Commit SHA: _pending — not yet committed, awaiting user approval._
- [x] Slice size + schedule chosen + rationale: **SLICE_SIZE=20 per invocation, `*/30 * * * *` schedule (approach (a) from the prompt). Overridable via `WARM_INTEL_SLICE_SIZE` env var for ops + tests. Reps are processed in inner batches of 5 (`REP_CONCURRENCY=5`) so 4 concurrent analyzers × 5 reps ≤ 20 in-flight analyzer calls. Worst-case per-invocation wall time = 4 batches × 55s per-analyzer timeout = ~220s, leaving ~80s headroom under the 300s cron cap. 535 / 20 ≈ 27 invocations per cycle → ~13.5h full chamber cycle.**
- [ ] Per-slice timing measured against prod: _requires deploy — run `curl -w "%{time_total}\n" …` after deploy._
- [ ] Manual warm-up run log excerpt: _requires deploy — run ~30 curls back-to-back, grep `[WARM-INTEL]`, paste the last summary showing `nextCursor: 0`._
- [ ] Warm-cache money-report timing: _requires deploy — run `curl -w "%{time_total}\n" -X POST https://civdotiq.org/api/intelligence/address/money-report -d '{"zipCode":"48201"}' -H 'Content-Type: application/json'` after warm-up completes._
- [x] `npm run validate:all` result: **passed with warnings (preexisting). 213 test suites / 2595 tests passing. 5 new tests in `src/__tests__/cron/warm-intelligence.test.ts` all green. Warnings unchanged from main: security audit (resend/svix upstream deps) + 2 `dataValidation.ts` console statements.**
- [x] Deviations from this prompt:
  - **Slice wraps within a single invocation** (e.g. 20–24 + 0–4) rather than emitting a short tail slice at the end of the chamber — makes each invocation do uniform work and matches the test assertion requested in Step 7.
  - **`SLICE_SIZE` exposed via `WARM_INTEL_SLICE_SIZE` env var** so the unit test can use `SLICE_SIZE=10` with 25 stubbed reps as the prompt described without hard-coding a test-only constant into the route.
  - **No new monitoring pipeline emission** — searched for `insightMetrics`/equivalent and found none; per the prompt ("grep for `insightMetrics` … don't invent a new one") I stuck with structured `logger.info` lines prefixed `[WARM-INTEL]`.
  - **GET delegates to POST unconditionally** (matching `dataset-generator`/`bill-summarizer`). Vercel cron uses GET, so skipping GET's dev-only bypass keeps prod behaviour identical regardless of NODE_ENV.
