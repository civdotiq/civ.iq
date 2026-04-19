# FEC Rate Limit Bug — Remediation Plan

**Date**: 2026-04-18
**Status**: Proposed
**Owner**: TBD

## 1. Problem

A single uncached page load for a high-raising member of Congress (e.g., Nancy Pelosi, P000197) can consume the **entire hourly FEC API quota** and trigger 30+ minute retry storms.

### Measured behavior

- `/ask/campaign-contributions/P000197` on a cold cache: 5+ minutes to render.
- FEC server logs during a single visit:
  - ~2,400 paginated requests to `schedules/schedule_a/` for Pelosi's principal committee (Committee C00213512).
  - HTTP 429 after ~85 pages, with retry-after of 48s → 37 min (FEC's 429 payload is aggressive under sustained pressure).
- FEC per-key rate limit: **1,000 requests/hour**.
- Three call sites trigger the full-pagination path:
  1. `GET /api/representative/[bioguideId]/finance/industries`
  2. `GET /api/representative/[bioguideId]/finance/geography`
  3. Question-page fetcher (`fetchCampaignContributionsData` in `src/lib/questions/template-data-fetchers.ts`)

Site #3 was patched on 2026-04-18 to pass `useSampleData: true` — reduces to ~5 requests. Sites #1 and #2 still contain the bug.

## 2. Root cause

`aggregateFinanceData(fecId, cycle, state)` in `src/lib/fec/finance-aggregator.ts` calls `fecApiService.getAllIndividualContributions()` by default, which paginates through every Schedule A contribution record for every committee tied to the candidate.

For low-activity freshmen this is ~10 pages; for top fundraisers it's 2,000+. There is no cap and no use of FEC's pre-aggregated endpoints.

Secondary amplifiers:

- `analyzeVoteFinance` (used by WHERE and WHY question cards) fetches up to `MAX_VOTES` roll-call votes per session × 2 sessions and classifies each by industry. 200 votes = ~80s on cold cache. Not FEC-related, but compounds wall-clock time on the same pages.
- Retry logic in the FEC client waits on the server's `Retry-After` header without a circuit-breaker. A single 429 cascades into more 429s as concurrent requests pile up.
- Result-level caching exists (`govCache`), but raw per-page fetches are not cached, so any cache miss replays the full 2,400-page walk.

## 3. Fix layers

Each layer is shippable on its own; later layers assume earlier ones.

### Layer 0 — Immediate containment

Mirror the `useSampleData: true` patch already applied to question pages into the two remaining API routes:

- `src/app/api/representative/[bioguideId]/finance/industries/route.ts:75`
- `src/app/api/representative/[bioguideId]/finance/geography/route.ts:85`

Three-line diff each. Effect: any direct API consumer drops from 2,400 FEC calls to ~5, sorted by `-contribution_receipt_amount` (top donors captured).

**Risk**: "top industries" is computed from a biased sample (top 500 donors by dollar amount rather than all 238,000). For large-dollar industry signal this is fine; for breadth-based measurement (e.g., "share of donors from teachers") it introduces skew. Document in `SourceCitation` and `/methodology` that breakdowns are sample-based when sample mode is active.

**Estimate**: 30 min of work, immediate to ship.

### Layer 1 — Replace pagination with FEC's pre-aggregated endpoints

FEC server-side aggregates are available:

- `GET /schedules/schedule_a/by_employer/?candidate_id=X&cycle=Y` — employer + industry signal in 1 request (up to 100 employers).
- `GET /schedules/schedule_a/by_state/?candidate_id=X&cycle=Y` — geography in 1 request.
- `GET /schedules/schedule_a/by_size/?candidate_id=X&cycle=Y` — contribution size buckets in 1 request (already used at `fec-api-service.ts:1482`).
- `GET /schedules/schedule_a/by_occupation/?candidate_id=X&cycle=Y` — occupation aggregates in 1 request (complements `by_employer` for individual donors whose employer is empty).

Build a new `aggregateFinanceDataFromAggregates(fecId, cycle, state)` that hits these four endpoints in parallel and runs `categorizeContribution()` on the employer strings to produce `industryBreakdown`. Fan-in: 4 FEC requests per candidate regardless of fundraising size.

Callers switch from `aggregateFinanceData` (Schedule A paginator) to the new function. Keep the old function available for one release under a `useRawContributions: true` escape hatch, then delete.

**Known trade-offs**:

- `by_employer` totals differ from raw Schedule A sums by 1–3% because FEC filters refunds/memos differently on the aggregate endpoint. Acceptable; add a footnote.
- Lost: per-contribution filtering (e.g., excluding conduits like ActBlue/WinRed). FEC's aggregates include conduits. Mitigation: fetch `by_employer` with and without ActBlue/WinRed as a top-line adjustment, or accept conduit inclusion and label clearly.

**Estimate**: ~1 day.

### Layer 2 — Quota governance

Add a token-bucket tracker for FEC API calls in Redis (or in-memory for local dev), keyed by API key:

- Hard cap at 900/hour (100-request safety margin).
- When depleted: return cached-stale if present, otherwise `"data-unavailable"` empty state. **Do not retry** — that's what causes the current cascades.
- Surface headroom as a metric (`fec_quota_remaining`) consumable by `/api/internal/stats` or similar.
- On 429 from FEC, mark the key as depleted until the server-provided `Retry-After` elapses. No in-process retries.

**Estimate**: ~1 day, independent of Layer 1.

### Layer 3 — Precomputation

Nightly batch job writes `{industries, geography, size-buckets}` for every 535 federal members × 2–3 active cycles to a cache:

- Storage: `data-cache/finance/{bioguideId}-{cycle}.json` (gitignored; same pattern as other cached government data) or Redis, whichever the existing cache layer prefers.
- Schedule: GitHub Actions, daily at 02:00 UTC for the current cycle, weekly for closed cycles.
- Cost: 535 members × 4 FEC calls (Layer 1) × 2 cycles = 4,280 calls, spread across 1 hour = comfortably within the 1,000/hour limit for a single key. With Layer 2's 900/hour cap, stagger across 2 hours.

Page handlers read pre-baked files; cold request path never touches FEC.

**Estimate**: ~2 days.

### Layer 4 — Analyzer slimming (not strictly FEC, but on the same hot paths)

`analyzeVoteFinance` dominates cold-load time for Pelosi/Murkowski cards (55–80s). Options:

- Cache vote-industry classifications **at the bill level**, not per-representative. All 435 House members share the same underlying bill list for a given Congress; classifying each bill once eliminates 434× duplicated classification work.
- Precompute the alignment score in the same nightly job as Layer 3. Serve from cache; recompute only when contributions or new votes arrive.

**Estimate**: ~1–2 days.

## 4. Sequencing recommendation

1. **Now** (today): Layer 0 for the two remaining API routes. Two 3-line diffs. Removes the worst-case quota burn surface.
2. **This week**: Layer 1. Structural fix; makes per-page FEC cost O(1).
3. **Next**: Layer 2. Defensive cap prevents future regressions from reintroducing the bug.
4. **Later**: Layer 3 + Layer 4. Moves the work offline; cold-page latency drops to <1s.

## 5. Verification

After each layer:

- Unit: confirm `aggregateFinanceData(fecId, cycle, state, true)` makes ≤10 FEC calls for any candidate regardless of size.
- Integration: load `/ask/campaign-contributions/P000197` with an empty cache; measure (a) total FEC calls made, (b) wall-clock time, (c) no 429s in logs.
- Soak: simulate 50 parallel cold-cache page loads for 10 different top-raising members. Layer 2 should keep total FEC calls under 900/hour. Without Layer 2, Layer 1 alone handles this (50 × 4 = 200 calls).

## 6. Honest risks / open questions

- **Sample bias** (Layer 0, transitional): top-donor sample over-represents industries with big-dollar donors (finance, real estate) and under-represents industries with many small donors (labor, retirees). This is a known limitation until Layer 1 ships. The existing confidence labeling (`dataConfidence: 'low'`) already accounts for small samples, but the UI currently doesn't distinguish sample-based from full-universe aggregates. Add a surfaced indicator.
- **FEC aggregate vs. raw disagreement** (Layer 1): Documented 1–3% delta. Civic utility requires transparency; show both numbers when they differ materially.
- **Precomputation staleness** (Layer 3): Live-cycle data changes during filing windows (quarterly + year-end). 24h staleness is acceptable per the existing `SourceCitation` pattern showing `dataAsOf`. Not acceptable for anything claiming real-time — but we don't currently make that claim.
- **Multi-key scaling**: If we hit genuine quota ceilings, FEC allows requesting additional API keys. Layer 2's tracker should support key-rotation when that becomes necessary. Not needed today.
- **Not addressed here**: `analyzeVoteFinance` vote fetching via `batchVotingService` is a separate slowness (81s for 200 votes). Congress.gov doesn't rate-limit as aggressively, but the wall-clock cost is user-facing. Layer 4 covers it.

## 7. What was already patched on 2026-04-18

- `src/components/landing/AskQuestionSection.tsx`: replaced non-existent `partisanship` slug with `donor-voting-alignment` in the WHY card (was a hard 404).
- `src/lib/questions/template-data-fetchers.ts:149`: `aggregateFinanceData(fecId, 2024, state, true)` — sample mode for question-page finance fetcher.

Neither fully addresses the API routes; Layers 0 and onward remain.
