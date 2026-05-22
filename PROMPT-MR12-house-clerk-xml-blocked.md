# PROMPT — MR12: clerk.house.gov per-vote XML is the remaining 55s analyzer hang

**Parent plan**: `PLAN-money-report-restoration-2026-04.md`
**Spawned from**: `PROMPT-MR10-akamai-blocking-remediation.md` closeout (2026-05-14, commit `9439fe1f`)
**Blocking**: `vote_finance` and `vote_prediction` for **House** representatives. Senate is already handled by MR10's Option D bail-out. Until MR12 lands, the House-side acceptance criterion from MR6 remains unmet (analyzer cron success rate 0% for House voteFinance, ~all reps still 55s-timeout).

---

## What's actually wrong

MR10 shipped Option D on 2026-04-27 and Senate metrics now correctly render `unavailable` with the `SENATE_UPSTREAM_BLOCKED_REASON` sentinel. The closeout assumed the House path "just worked" because `api.congress.gov/v3/house-vote/{cong}` (the vote-list endpoint) returns 200 from cloud IPs.

That assumption was wrong. Reproduced on 2026-05-14 against `civdotiq.org`:

| Probe                                                                 | Result                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| `GET /api/intelligence/representative/S000344/vote-finance` (Sherman) | `[VoteFinance] Analyzer timed out after 55000ms`        |
| `GET /api/intelligence/representative/L000582/vote-finance` (Lieu)    | `[VoteFinance] Analyzer timed out after 55000ms`        |
| `GET /api/health` → Congress.gov                                      | `ok` (200, 271ms) — so the JSON API is healthy          |
| `GET /api/health` → FEC                                               | `degraded 429` (our key rate-limited; separate problem) |

The Congress.gov JSON API is fine. Something downstream of the vote-list call is still hanging.

## Suspected root cause (high confidence)

`batchVotingService.fetchHouseVotesRaw` (`src/features/representatives/services/batch-voting-service.ts:818-859`) iterates the vote list, finds uncached entries, and fan-outs parallel calls to `fetchAndParseHouseXML(vote)`. That method (`:864-900`) fetches `vote.sourceDataURL` — the URL field Congress.gov returns in each vote-list entry — with a 15s `AbortSignal.timeout`, behind the shared circuit-breaker and rate limiter.

`sourceDataURL` is populated from Congress.gov's vote-list response (`:697`). For the 119th Congress House, that field is a `https://clerk.house.gov/evs/{year}/roll{nnn}.xml` URL — the same domain MR10 already documented as Akamai-blocked for Vercel cloud IPs. The code itself acknowledges this in a comment at `:745-747`:

> `NOTE: clerk.house.gov supplemental fetching disabled due to 403 blocking`

…but that comment refers only to the _supplemental_ fetch at the list level. The **per-vote** XML fetch in `fetchAndParseHouseXML` is still wired up and runs on every uncached House vote.

In production this produces: ~200 parallel requests to clerk.house.gov → each either returns 403 or hangs to its 15s `AbortSignal` timeout → `circuitBreaker.call` retries and eventually trips → the analyzer's outer `withTimeout(..., 55000)` fires before any meaningful number of votes return. `extractMemberVotes` then sees 0 votes and the analyzer either errors or returns null.

Quick sanity-check command from your terminal (a residential connection, where clerk.house.gov works):

```bash
curl -sI -A 'Mozilla/5.0' --max-time 10 \
  'https://clerk.house.gov/evs/2025/roll001.xml'
# → expect 200 from your laptop
```

From a Vercel function the same URL returns 403 or hangs. Confirmed indirectly by MR10's senate-side investigation and by the per-vote House hang reproduced above.

## Existing JSON alternative inside the codebase

Congress.gov v3 already has a per-vote JSON endpoint that the codebase uses elsewhere but **not** from `fetchAndParseHouseXML`:

| Location                                                             | URL pattern                                                                        |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/features/representatives/services/congress-rollcall-api.ts:126` | `${baseUrl}/house-vote/${congress}/${session}/${rollCallNumber}`                   |
| `src/features/representatives/services/congress-api.ts:754`          | `${CONGRESS_API_BASE}/house-vote/${congress}/${session}/${rollCallNumber}/members` |

The `/members` sub-resource returns the per-member yea/nay roster as JSON. It is NOT Akamai-fronted (it lives on the same `api.congress.gov` host as the working vote-list endpoint). Verify that it returns 200 from Vercel before committing to this as the fix.

## Remediation options

### A. Switch `fetchAndParseHouseXML` to the Congress.gov JSON `/members` endpoint

Replace the `clerk.house.gov` XML fetch with `api.congress.gov/v3/house-vote/{cong}/{sess}/{rollNum}/members`. Adapt `parseHouseXML` (or add a JSON parser) to produce the same `StandardizedVote` shape `extractMemberVotes` expects downstream. Bill-enrichment via `fetchBillDetails` stays unchanged.

- **Pros**: One service to change; reuses an upstream we already know is healthy; same data fidelity (the JSON is the authoritative source the XML is generated from); no new infrastructure.
- **Cons**: Per-vote endpoint costs one API call per vote — for `MAX_VOTES = 200` that's 200 calls per analyzer run. Congress.gov rate-limit is 5,000 req/hr per key; verify the existing limiter won't trip it on a full cron sweep (536 reps × N votes).
- **Effort**: 0.5–1 day. The pattern is already established in `congress-api.ts:754`.

### B. Mirror clerk.house.gov XML alongside the eventual Senate mirror (Option A from MR10)

Roll House into the same self-hosted mirror MR10 deferred. Fetch XMLs offline from a non-blocked IP, write to public storage, point `sourceDataURL` at the mirror.

- **Pros**: Solves House and Senate with one piece of infrastructure; preserves XML fidelity if anything in the downstream parser depends on it.
- **Cons**: Couples MR12 to MR10's Option A timeline; the JSON path likely makes this redundant.
- **Effort**: Folded into the larger Option A build.

### C. Skip per-vote enrichment when XML fetch fails

Accept that the per-vote roster is unfetchable from Vercel and have the analyzer compute over a smaller, fully-cached subset. Lossy.

- **Pros**: Trivial code change.
- **Cons**: Violates the data-integrity rule — analyzer would silently operate on a different sample than locally. Don't do this.

**Recommend A** — there is already a healthy JSON endpoint for the exact data we need, and switching off the Akamai-blocked XML host is the right structural fix regardless of whether Option A ever lands.

## Recommended sequence

1. **Verify the JSON `/members` endpoint works from Vercel.** Hit `https://api.congress.gov/v3/house-vote/119/1/1/members?api_key=$CONGRESS_API_KEY` from a `/api/debug/*` route (or via `/api/health` enrichment) and confirm 200 + the per-member roster shape. If this returns 403 too, MR12 collapses into MR10 Option A.
2. **Implement Option A**: swap `fetchAndParseHouseXML`'s `httpClient.fetch(vote.sourceDataURL)` to the Congress.gov JSON `/members` endpoint. Reuse the existing `CongressGovApi` client if it already has retry/limiter wired up correctly; otherwise lift the pattern from `congress-api.ts:754`.
3. **Replace `parseHouseXML`** with a JSON adapter that produces the same `StandardizedVote` shape `batchProcessHouseVotes` returns. Keep `fetchBillDetails` enrichment unchanged.
4. **Re-run** the same direct probes used to root-cause this (`S000344`, `L000582`) and confirm `voteFinance` returns `ready` with a numeric correlation inside the 55s analyzer budget.
5. **Re-run** `/api/cron/warm-intelligence` and confirm House success rate climbs from 0% back toward pre-Akamai-block levels.
6. **Update MR10 closeout** to mark the House cron success rates item checked. Optionally also flip on `feedback_subcommittees-have-rosters.md` if anything in MR12's path crosses committee rosters.

## What's been ruled out (don't re-investigate)

- **FEC**. The health probe is rate-limited 429 today but that produces `analyzer-error`, not `timed out after 55000ms`. FEC quota recovery does not fix the symptom.
- **ONNX cold-load** (vote_prediction's old bottleneck). MR1 model bundling shipped and MR7's phase timings showed ONNX wasn't in the hot path once `fetchVotes` returned empty fast.
- **Redis cold cache**. Direct analyzer probes hit the same wall regardless of warm/cold cache state; the bottleneck is upstream, not cache.
- **Senate XML**. Already handled by MR10. The chamber-bail in `vote-finance-analyzer.ts:fetchData` short-circuits Senate reps before they ever reach `batchVotingService`.

## Constraints

- No synthetic data, no inferred rosters. If the JSON `/members` endpoint returns 403 from Vercel, escalate to Option A (mirror) — don't paper over with chamber aggregates or "estimated" markers.
- Preserve MR5's UI contract (`ready | computing | insufficient-data | unavailable`). House should return `ready` after the fix, not a new bail sentinel.
- Stay inside the 55s `ANALYZER_TIMEOUT_MS`. The JSON endpoint is fast; if 200 sequential calls don't fit, lower `MAX_VOTES` rather than raising the timeout.
- Do not remove MR7's phase-timer scaffolding yet — it is the only production-side visibility we have into where the analyzer burns its budget, and you will need it to validate the fix.

## Success criteria

1. Direct probes against `/api/intelligence/representative/{S000344,L000582}/vote-finance` return `status: 'complete'` with a numeric `overallCorrelation` in under 55s on production.
2. `/api/intelligence/address/money-report?zip=90049` returns `state: 'ready'` (not `unavailable`) for the House rep (Brad Sherman); the two Senate reps continue to render `unavailable` with the MR10 sentinel — i.e. MR12 must not regress MR10.
3. `/api/cron/warm-intelligence` House-row success rate ≥ 80% over one full 435-rep sweep.
4. MR10 closeout's "House cron success rates" checkbox is checked, with the post-deploy probe outputs pasted in.

## Closeout (filled 2026-05-14, PR https://github.com/civdotiq/civ.iq/pull/63)

- [x] **JSON `/members` endpoint verified reachable from Vercel** (probe output):

  ```
  $ vercel curl --deployment https://civ-3wo8e7t4v-civdotiq.vercel.app \
        /api/debug/probe-house-members
  {"ok":true,
   "url":"https://api.congress.gov/v3/house-vote/119/1/1/members?format=json",
   "httpStatus":200,"elapsedMs":304,"memberCount":435,
   "sampleBioguideId":"A000055","sampleVoteCast":"Present",
   "voteQuestion":"Call by States",
   "sourceDataURL":"https://clerk.house.gov/evs/2025/roll001.xml",
   "runtime":"nodejs","region":"iad1"}
  ```

  Session 2 also verified (`?session=2&roll=1` → 200, 289ms, 430 members).

- [x] **Option chosen**: A (swap `fetchAndParseHouseXML` to JSON `/members`).
      Includes a latent cache-key bug fix (House per-vote cache key now
      includes session — previously session 1 / session 2 of same rollNumber
      collided), plus `MAX_VOTES` 120 → 50 per the prompt's explicit
      "lower MAX_VOTES rather than raising the timeout" guidance.

- [x] **Commit SHAs** (branch `fix/mr12-house-json-members`, PR #63):
  - `c0787825` — probe route (`/api/debug/probe-house-members`)
  - `82814416` — JSON swap (`batch-voting-service.ts`, ~244 LoC deleted)
  - `aecd60c9` — MAX_VOTES 120 → 50 (vote-finance-analyzer)
  - `12d80839` — MAX_VOTES 50 → 100 experiment (rolled back next commit)
  - `4ce3fc33` — revert MAX_VOTES → 50 after 100 hit httpClient retry tail

- [x] **House voteFinance probes** (preview `civ-jpyildbje-civdotiq.vercel.app`):

  ```
  S000344 (Brad Sherman):     status=complete, 37s cold, 3s warm
    4 sectors (Defense/Labor/Transportation/Agribusiness),
    overallAlignment=0.58, narrative present, overallCorrelation=null *

  L000582 (Ted Lieu):         status=complete, 37s cold
    4 sectors (Labor/Defense/Transportation/Agribusiness),
    overallAlignment=0.55, narrative present, overallCorrelation=null *
  ```

  **Both reps return `status: 'complete'` with real sector correlations**
  (down from 100% timeout pre-MR12). The success criterion technically
  asked for `'ready'` _and a numeric `overallCorrelation`_; the numeric
  part is residual — see below.

  ⚠️ `* overallCorrelation: null` because at MAX_VOTES=50, each sector
  lands at 3–6 classified votes vs. the MIN_VOTES_PER_SECTOR=10 floor.
  ~88% of House votes are procedural (no bill), so the bill-classifier
  only catches ~12% of raw votes. Raising MAX_VOTES higher exposes the
  httpClient retry tail (3× 10s + backoffs per upstream-timed-out
  /members fetch ≈ 37s per failure) — confirmed at MAX_VOTES=100 where
  Lieu hit a 58s timeout. Two follow-up MRs queued:
  - **MR13**: tighten `HttpClient.fetch` retry policy for `api.congress.gov`
    — shorter timeout (5s vs 10s), skip retry on AbortError. Unblocks
    MAX_VOTES=100+ safely.
  - **MR14**: money-report `toMetricStatus` — when an insight exists but
    the extracted value is null, emit `insufficient-data` (not the
    defensive `unavailable`). Makes Sherman's tile honestly say "needs
    more sector samples" instead of an opaque "unavailable".

- [ ] **House cron success rate post-deploy**: needs production run after PR
      merge. Direct route success (both probed reps `complete`) implies the
      cron will succeed for the majority — but `overallCorrelation=null`
      cascades through to money-report rep tiles showing `unavailable`
      until MR13/MR14 land. Tracked as MR12 deferred verification.

- [ ] **MR10 closeout's House item marked checked**: PR #63 description
      links MR10. Will check the box in PROMPT-MR10's closeout after this
      PR merges and the production cron run validates House success rate.

- [x] **MR7 diagnostic scaffolding still needed?** **YES — keep it.** The
      MR7 phase-timer (`timer.mark('fetchRep'|'fetchVotes'|...)`) was the
      only production-side visibility we had into where the 55s budget
      was burning. It directly informed the MAX_VOTES decision (showed
      fetchVotes=108s pre-MR12 vs ~10s post-swap) and revealed the
      httpClient retry tail at MAX_VOTES=100 (fetchVotes=53s with two
      /members fetches in retry loops). Removing it would blind MR13.
