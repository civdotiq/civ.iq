# PLAN — Closing CIV.IQ Backbone Gaps

**Created:** 2026-04-15
**Source:** Full 7-dimension audit (coverage, provenance, entity resolution, freshness, reliability, reproducibility, external consumability)
**Principle:** Civic data integrity is non-negotiable. Every fix below must preserve the "real government data or 'Data unavailable'" invariant. No shortcuts that paper over gaps with plausible-looking stand-ins.

---

## Phasing recommendation (TL;DR)

Do **not** do one gap at a time. The 10 gaps split into **5 bundled phases** based on shared code surface and shared design decisions. Bundling inside a phase avoids two sessions arriving at inconsistent conventions (e.g., two different ways of signaling "upstream API errored"). Separating between phases avoids polluting diffs across unrelated concerns.

| Phase                       | Gaps        | Rationale for bundling                                                                                                                                    | Effort | Depends on                             |
| --------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| **1. Security baseline**    | #4          | Fast, independent, gives a clean dep tree before any feature work. Do first so later regressions aren't blamed on audit fixes.                            | 1–2h   | —                                      |
| **2. Integrity core**       | #5, #1      | Both need a shared `dataQuality` response contract. Design once, apply everywhere. Gap #1's fragility is the single biggest risk to backbone credibility. | 4–6h   | Phase 1                                |
| **3. Freshness plumbing**   | #2, #7      | Both touch `src/lib/fec/` + the bioguide-FEC mapping layer. Shared context.                                                                               | 4–6h   | Phase 2 (for contract consistency)     |
| **4. Scope honesty**        | #6, #8      | Both are "decide first, then update docs + UI" tasks. Minimal code touch, maximal integrity leverage.                                                     | 2–3h   | — (can run parallel to others)         |
| **5. Infrastructure story** | #3, #9, #10 | All three answer "can someone actually build on this?" Publishing packages without a bootstrap doc or usage telemetry is theater.                         | 4–6h   | Phase 1 (for security-clean publishes) |

**Total:** ~15–23 hours across 5 sessions. Can be compressed by one person in a focused week, or spread across a month of evenings.

---

## Critical rules for every phase

Before starting any session, reload these. Most are in `CLAUDE.md` and `.claude/rules/` already, but re-stating because integrity is the whole point:

1. **Real data only.** No Math.random(). No plausible-looking fabricated arrays. Empty result = explicit "Data unavailable" + reason, not silent `[]`.
2. **Every insight carries:** `confidence`, `dataAsOf`, `methodology`, `disclaimer`, `sources[]`. This audit confirmed 10/10 sampled intelligence routes already do this — do not regress.
3. **30-line rule.** Validate after each meaningful chunk. Don't write 200 lines then pray.
4. **`npm run validate:all` before every commit.** The audit ran this green (5 pass / 2 warn / 0 fail). Keep it that way.
5. **Conventional commits.** `fix(lobbying):`, `feat(fec-pagination):`, etc.
6. **No causation language.** "pattern", "correlation", "association" — never "caused", "influenced", "resulted in".

---

## Phase 1 — Security baseline (Gap #4)

### Context

`npm audit` surfaced **16 vulnerabilities, 12 high-severity** across: Next.js (HTTP smuggling, CSRF bypass, DoS), fast-xml-parser (entity expansion), tar chain (path traversal via cacache/onnxruntime/@huggingface/transformers), vite (path traversal), hono (cookie validation, IP matching, SSG path traversal), sqlite3 (transitive). A backbone cannot ship known-exploitable dependencies.

### Success criteria

- `npm audit` reports **0 high-severity** vulnerabilities.
- `npm run validate:all` still green.
- ML inference (vote predictor, embeddings) still functions end-to-end (breaking change risk: `@huggingface/transformers@4.1.0`).
- No new bugs in `/api/mcp` or `/api/intelligence/**`.

### Plan

1. `npm audit fix` (non-breaking). Verify validate:all.
2. Evaluate `next@16.2.3` upgrade — within minor range, probably safe. Verify build + all 220 API routes render.
3. Evaluate `@huggingface/transformers@4.1.0` (breaking). Run embedding tests: `embedText()` + bill-lobbying similarity. If broken, pin and document the remaining CVE with mitigation notes.
4. Commit per logical unit. Do not lump Next upgrade with transformers upgrade — if one regresses, the other should roll back cleanly.

### Verification commands

```bash
npm audit --audit-level=high
npm run validate:all
npm run test -- embedding-classifier
npm run diagnose:apis
```

### Starter prompt for new session

```
Fix the high-severity npm vulnerabilities in CIV.IQ per Phase 1 of
PLAN-backbone-gaps-2026-04.md. Work through audit fix → Next 16.2.3 →
@huggingface/transformers@4.1.0 in sequence, validating after each.
Stop and ask if transformers upgrade breaks embedding tests.
```

---

## Phase 2 — Integrity core (Gaps #5 + #1)

### Context

**Gap #5:** Multiple routes (`/api/representative/[bioguideId]/committees`, `/api/spending/district/[districtId]`, `/api/representative/[bioguideId]/lobbying`) return `[]` whether the upstream API errored OR the entity legitimately has no records. Consumers — including the UI, the MCP tools, and any third-party SDK user — cannot tell the difference. This is the single biggest data-integrity leak in the system: silent false negatives.

**Gap #1:** The lobbying matcher in `src/lib/data-sources/senate-lobbying-api.ts:359–383` uses 13 hardcoded committee→keyword pairs with substring matching. Committees like "Intellectual Property", "Rules", "Ethics", "Oversight" have no entry and silently return zero lobbying activity regardless of reality. This is the concrete, falsifiable worst case of Gap #5.

These two ship together because Gap #1's fix (distinguishing "unmatched committee" from "no filings") requires the `dataQuality` contract from Gap #5. Designing them apart = two different conventions.

### Success criteria

- All join-based API responses carry a `dataQuality` field with one of: `complete | partial | empty | unavailable`, plus a `sourceStatus` map per upstream dependency.
- The lobbying matcher can handle any committee name via embedding similarity (reusing the existing `embedText()` from `src/lib/intelligence/embedding-classifier.ts`), falling back to keywords only as a tiebreaker.
- Unmatched committee names are **logged** (so coverage gaps are visible) and **signaled in response** (so consumers aren't misled).
- UI components for committees, district spending, and lobbying distinguish "no data exists" from "data source unavailable" visually.

### Design: the `dataQuality` contract

```ts
type DataQuality = 'complete' | 'partial' | 'empty' | 'unavailable';

interface SourceStatus {
  source: string; // e.g., "congress.gov", "senate-lda", "usaspending"
  status: 'ok' | 'error' | 'timeout' | 'rate-limited' | 'not-configured';
  errorMessage?: string;
  fetchedAt: string; // ISO timestamp
}

interface BackboneResponse<T> {
  data: T;
  dataQuality: DataQuality;
  sourceStatus: SourceStatus[];
  // existing fields continue: confidence, dataAsOf, methodology, disclaimer, sources
}
```

Semantics:

- `complete`: all sources ok, data populated.
- `partial`: some sources ok (data trustworthy for those), some errored.
- `empty`: all sources ok, data is genuinely []. The TRUE empty case.
- `unavailable`: critical sources failed, no data to show.

### Plan

**Step 1 — Define the contract.** Add types to `src/types/backbone-response.ts`. Add a helper `buildSourceStatus(source, promise)` that wraps upstream calls and produces a SourceStatus entry on resolve/reject.

**Step 2 — Apply to the 3 audited silent-failure routes.**

- `/api/representative/[bioguideId]/committees/route.ts` — wrap the Congress.gov fetch.
- `/api/spending/district/[districtId]/route.ts` — wrap the USASpending fetch + aggregate.
- `/api/representative/[bioguideId]/lobbying/route.ts` — wrap the LDA fetch.

**Step 3 — Audit remaining routes.** Grep `src/app/api/` for `return NextResponse.json([])` and `return NextResponse.json({ data: [] })` patterns. For each: is the `[]` legitimate or silencing? Apply contract where silencing.

**Step 4 — Fix the lobbying matcher.** In `src/lib/data-sources/senate-lobbying-api.ts`:

- Add an embedding-based matcher using `embedText()` + cosine similarity against pre-embedded LDA issue descriptions. Threshold ~0.5 for match.
- Keep the 13-keyword table as a fast path, but expand it to cover all ~40 standing committees (House + Senate). Use Congress.gov committee jurisdiction text as the source of keyword expansion.
- Add `matchingMethod: 'keyword' | 'embedding' | 'fallback'` and `matchConfidence: number` to each returned filing.
- Log `console.warn` when a committee name hits the fallback path — signals a keyword-table gap to operators.

**Step 5 — UI distinguishability.** Update these three components to branch on `dataQuality`:

- `CommitteeMembershipsCard.tsx`
- `InfluencePathSection.tsx` / spending cards
- `LobbyingActivityCard.tsx` (or equivalent)

For `unavailable`, show "Data source temporarily unavailable — last updated [X]" not "No records found."

### Verification

```bash
# Integration test: trigger each error path by pointing at bad upstream
# e.g., temporarily set CONGRESS_GOV_API_KEY=bad, hit committees route
# should return dataQuality: 'unavailable', not []

npm run test -- senate-lobbying-api
npm run validate:all
```

### Starter prompt for new session

```
Execute Phase 2 of PLAN-backbone-gaps-2026-04.md: close the silent-failure
leak (Gap 5) and fix the lobbying matcher (Gap 1). The plan defines a
dataQuality contract — implement it in src/types/backbone-response.ts, apply
it to the three audited routes (committees, district spending, lobbying),
then grep for remaining [] returns and audit them. For the lobbying matcher,
add an embedding-based matcher using embedText() from embedding-classifier.ts
and expand the keyword table to all ~40 standing committees. Update UI
components to distinguish "unavailable" from "empty". Validate with integration
tests that simulate upstream failure. This is the biggest civic-integrity
fix in the queue — take your time and do it right.
```

---

## Phase 3 — Freshness plumbing (Gaps #2 + #7)

### Context

**Gap #2:** Two foundational mappings have no refresh mechanism.

- `src/lib/data/bioguide-fec-mapping.json` — last updated 2025-09-18 (7 months stale). Manual updates only. Newly elected/appointed members get `hasFecMapping: false` and no finance data until a human edits the file.
- `src/lib/data/zip-district-mapping-119th.json` — updated 2025-08-19 based on post-2023 redistricting. This one is _structurally_ static until 2031, but the staleness isn't documented.

**Gap #7:** `fecApiService.getSampleContributions()` hard-caps at 200 contributions per call (`src/lib/fec/fec-api-service.ts`). For high-volume candidates (leadership, national figures) this is a single-digit percent sample. No pagination cursor. Breaks any claim about donor-base coverage.

Bundled because both touch FEC code paths and the bioguide-FEC boundary. One context load, two wins.

### Success criteria

- A scheduled GitHub Action (weekly or biweekly) diffs current Congress.gov membership against `bioguide-fec-mapping.json`, opens an auto-PR with new FEC IDs. Uses the same pattern as `sync-vacancies.yml`.
- ZIP mapping file has a documented freshness header: last-updated, source, invariant ("33,774 ZIPs, 7,299 multi-district"), next-refresh-trigger ("post-2031 redistricting").
- `getAllContributions(fecId, cycle, opts)` added with cursor pagination. `getSampleContributions` stays as a convenience wrapper, but the limit is now a documented cap in response metadata.
- Response metadata for finance routes includes `contributionCoverage: { fetched, estimated_total, coverage_percent }`.

### Plan

**Step 1 — bioguide-FEC sync job.**

- Create `.github/workflows/sync-bioguide-fec.yml` — weekly on Sundays 14 UTC.
- Create `scripts/sync-bioguide-fec.ts` mirroring `scripts/sync-vacancies.ts`:
  1. Fetch current Congress membership from Congress.gov.
  2. For each bioguide ID not in mapping, query FEC candidate search by name + state + party.
  3. Rank candidates by filing date; take top match; flag confidence <0.9 for human review.
  4. Write updated JSON, open PR if diff.
- Add test: given a known-mapped bioguide ID, `getFecIdFor(bioguideId)` returns stable value.

**Step 2 — ZIP mapping freshness documentation.**

- Prepend header comment to `zip-district-mapping-119th.ts` with: generation date, source URL, row counts (sanity invariant), next-expected-refresh-trigger.
- Add a test that imports the mapping and asserts row counts haven't silently changed.

**Step 3 — FEC pagination.**

- Add `getAllContributions(fecId, cycle, { limit, onPage })` to `fec-api-service.ts` using FEC's `last_indexes` cursor.
- Respect FEC rate limit (1000 req/hr) — add backoff in the service.
- Cache per-cycle aggressively: closed cycles are immutable, TTL 30 days; current cycle TTL 1 hour.
- Update `/api/representative/[bioguideId]/finance/route.ts` to use `getAllContributions` with a sensible default (e.g., 1000) and expose `contributionCoverage` in response.

**Step 4 — Update mapping imports.** `bioguide-fec-mapping.ts` re-exports from `@civiq/entity-resolution`. Ensure the sync script updates the package data, not just the JSON — or decide where the canonical source lives (recommend: package is source of truth, app imports from package).

### Verification

```bash
# Manually run the sync script
npx tsx scripts/sync-bioguide-fec.ts --dry-run

# Pagination test
npm run test -- fec-api-service

# Verify a high-volume candidate now returns >200 contributions
# e.g., curl localhost:3000/api/representative/P000197/finance?all=true
```

### Starter prompt for new session

```
G
```

---

## Phase 4 — Scope honesty (Gaps #6 + #8)

### Context

**Gap #6:** `FollowTheMoney` (state campaign finance) is in maintenance mode during OpenSecrets merger. `ftm-api-service.ts` gracefully returns empty arrays without an API key. The state legislator finance routes are wired but return nothing. Memory notes this gap in `data_followthemoney-gap.md`.

**Gap #8:** Local government = 10 cities via Legistar (`CITY_CONFIGS` in `/src/app/api/city/[cityId]/council/route.ts:19–90`). `/api/local-government/[location]` returns `getEmptyLocationResponse()` for everything else. Calling this "local coverage" is an overstatement.

These bundle because both are "decide first, code second" tasks. The engineering is small; the honesty is large.

### Success criteria

- Public-facing text (README, llms.txt, any "about our coverage" page) matches reality exactly. No implicit promise of state finance or broad local coverage.
- Routes that can't deliver return `dataQuality: 'unavailable'` with a `reason` explaining which source is down/missing (integrates with Phase 2's contract).
- A **coverage page** (`/coverage` or `docs/COVERAGE.md`) spells out federal-complete, state-partial-with-table, local-10-cities-with-list. Honest, citable, dated.

### Plan

**Step 1 — Decisions.** Before writing code, decide each:

_State campaign finance:_

- [ ] Option A: Wait for OpenSecrets merger to re-publish a usable state-level API. Track their status. Document ETA in coverage page.
- [ ] Option B: Pilot 3–5 states via SoS APIs (CA, NY, TX, FL, IL have accessible APIs). Expensive to scale but honest signal.
- [ ] Option C: Document state finance as explicitly out of scope. Remove finance sections from state legislator pages.

Recommended: **C short-term + A tracked**. Don't pretend state finance works when it doesn't.

_Local government:_

- [ ] Option A: Expand Legistar coverage (~100 cities support Legistar with minor config). Scoped ongoing work.
- [ ] Option B: Re-label nav and docs as "federal + state + pilot cities (10)". Add a roadmap page.
- [ ] Option C: Both — B immediately, A as ongoing expansion.

Recommended: **C**. B is the integrity win (ships today); A is the growth story.

**Step 2 — Execute the label changes.**

- Update README coverage claims.
- Update `public/llms.txt` coverage section.
- Update any `<meta name="description">` tags that overclaim.
- Create `docs/COVERAGE.md` with the honest matrix (federal/state/local × domains) and dates.
- Remove or gate state finance UI behind `dataQuality: 'unavailable'` with clear messaging.

**Step 3 — Route cleanup.**

- `/api/local-government/[location]` — ensure response signals "not in supported city list" with the 10-city list included.
- State finance routes — return `dataQuality: 'unavailable'`, `reason: 'FollowTheMoney API in maintenance during OpenSecrets merger; state campaign finance not currently available'`.

### Verification

```bash
# No false promises in public text
grep -ri "state.*campaign.*finance" README.md public/llms.txt
grep -ri "nationwide.*local" README.md public/llms.txt

npm run validate:all
```

### Starter prompt for new session

```
Execute Phase 4 of PLAN-backbone-gaps-2026-04.md: scope honesty. Make two
decisions (state finance strategy; local coverage framing), then align
public-facing text and route responses with reality. The goal is that every
claim CIV.IQ makes is falsifiable and true. Create docs/COVERAGE.md with
the honest federal/state/local matrix. No marketing puffery.
```

---

## Phase 5 — Infrastructure story (Gaps #3 + #9 + #10)

### Context

**Gap #3:** Three packages exist at `packages/civic-statistics`, `packages/entity-resolution`, `packages/sdk` — all v0.1.0, all pointing at internal GitHub URLs, none published to npm. README calls them "open-source packages" but nobody outside the repo can `npm install` them.

**Gap #9:** No reproducibility path. A third party cloning the repo cannot tell — from docs alone — how to populate the data layer, which env vars are required, what the scripts do in what order, or how long they take.

**Gap #10:** No signal that anyone actually builds on this. "Backbone" means others consume you. If the MCP server has zero external clients and the SDK has zero installs, the claim is aspirational.

Bundled because they form one coherent story: publish the packages → document how to bootstrap → measure who uses what.

### Success criteria

- `@civiq/civic-statistics`, `@civiq/entity-resolution`, `@civiq/sdk` all published to npm under `@civiq` org. `npm install @civiq/sdk` works.
- Each package has a README with: purpose, install instructions, usage example, link back to main repo.
- `docs/BOOTSTRAP.md` takes a reader from fresh clone to working dev server with populated data. Listed env vars, expected script runtimes, Redis setup, verification commands.
- A usage dashboard or at minimum a `docs/ADOPTION.md` tracking: MCP clients connected in the last 30 days, npm download counts per package, OpenAPI endpoint traffic summary.

### Plan

**Step 1 — npm publishing prep.**

- Claim `@civiq` npm org (requires one-time manual step).
- For each of the 3 packages:
  - Audit `package.json`: repository URL, homepage, license (MIT?), keywords, types, main/module/exports, files.
  - Polish README with install + minimal usage example.
  - Add `LICENSE` file.
  - Add `CHANGELOG.md` with initial 0.1.0 entry.
- Add `.github/workflows/publish.yml` triggered on tags matching `@civiq/*@v*` — builds package, runs tests, publishes with npm provenance attestation.
- Publish 0.1.0 (non-breaking initial release).

**Step 2 — `docs/BOOTSTRAP.md`.** Sections:

- Prerequisites (Node version, package manager, Redis).
- Required env vars with links to each API key signup page:
  - CONGRESS_GOV_API_KEY (api.congress.gov/sign-up)
  - FEC_API_KEY (api.open.fec.gov/developers)
  - OPENSTATES_API_KEY (openstates.org/accounts/login)
  - CENSUS_API_KEY (api.census.gov/data/key_signup.html)
  - FRED_API_KEY, SEC_USER_AGENT, NOAA_TOKEN, etc.
- Optional env vars (Upstash Redis for production cache).
- Bootstrap sequence with expected times:
  - `npm ci` (2 min)
  - `npm run process-zip-districts` (1 min)
  - `npm run seed-congress-data` (10 min, respects Congress.gov rate limits)
  - `npm run warm:intelligence` (20 min, optional but recommended)
  - `npm run dev` → localhost:3000
- Verification: `npm run diagnose:apis` (all green), hit `/api/representatives?state=CA` (returns 52 members).

**Step 3 — Adoption telemetry.**

- MCP handshake: MCP protocol includes `clientInfo` in the initialize request. Log `{ name, version }` with timestamp to a structured log (Vercel logs + optionally Upstash).
- OpenAPI/REST: parse `User-Agent` on `/api/v1/*` routes, extract SDK signature (e.g., `@civiq/sdk/0.1.0`).
- npm downloads: auto-fetch weekly from `api.npmjs.org/downloads/point/last-week/@civiq/sdk` and commit to a JSON file, similar to vacancies pattern.
- `docs/ADOPTION.md` auto-generated or manually maintained monthly:
  - MCP clients (30d)
  - npm downloads per package (30d)
  - REST traffic summary (if Vercel analytics are available)
  - External projects citing CIV.IQ (manually curated)

### Verification

```bash
# Packages published and installable
npm view @civiq/civic-statistics version
npm view @civiq/entity-resolution version
npm view @civiq/sdk version

# Bootstrap doc works: hand it to someone who's never seen the repo
# and verify they reach a populated dev server.

# Telemetry live
curl localhost:3000/api/mcp -X POST -d '{"method":"initialize",...}' \
  # check logs for clientInfo capture
```

### Starter prompt for new session

```
Execute Phase 5 of PLAN-backbone-gaps-2026-04.md: publish the three
@civiq packages to npm, write docs/BOOTSTRAP.md for third-party
reproducibility, and add adoption telemetry. This is the final phase
that turns "civic intelligence product" into "civic data backbone" —
without published packages, a bootstrap path, and demonstrated consumers,
the backbone claim is aspirational. Start with package.json hygiene
audits, then publish, then docs, then telemetry.
```

---

## Per-session checklist

At the start of each phase session:

- [ ] Reload CLAUDE.md and relevant `.claude/rules/*.md`.
- [ ] Run `npm run validate:all` — confirm green baseline before changes.
- [ ] Run `git status` — confirm clean tree. Never start a phase on top of stale changes.

At the end of each phase session:

- [ ] `npm run validate:all` green.
- [ ] Conventional commit per logical unit. No "fix(everything): phase 2 done" mega-commits.
- [ ] Update this file's status table below.
- [ ] Note anything surprising in `.claude/memory/` for future sessions.

## Status tracker

| Phase                    | Status                                                                     | Date       | Commit                                                                                                                                                                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Security baseline    | 🟢 done (4.1.0 upgrade landed 2026-04-16; A1 follow-ups closed 2026-04-20) | 2026-04-15 | `7bdcae97`, `926579f6`, `cee4255b`, `fe82588f`, `0e20cbca`, +[gh#55](https://github.com/civdotiq/civ.iq/issues/55), [gh#56](https://github.com/civdotiq/civ.iq/issues/56) | 16 vulns (12 high) initial → 10 high after first pass → **7 vulns / 5 high after the deferred `@huggingface/transformers@3.8.1 → 4.1.0` upgrade landed on 2026-04-16**. Reversal trigger: Phase 2 calibration uncovered that 3.8.1 was silently broken on Node 25 — `embedText()` returned null in production while every mocked test passed (`docs/EMBEDDING-PIPELINE-BROKEN-2026-04.md`). The original SECURITY.md gate ("non-mocked pipeline smoke test must exist") is now satisfied by `npm run smoke:embedding` (`scripts/smoke-embedding-pipeline.ts`, real Node, no mocks). Verification: smoke script PASS for all 4 ML pipelines (warm 3.8 s / cold 9.9 s for FE + ZS + NER + ORT — see `docs/EMBEDDING-PIPELINE-BROKEN-2026-04.md`); 86 tests pass across the 7 ML test suites; smoke is now wired into `validate:all` as a critical step so a future runtime regression breaks CI; `validate:all` green; Next 16.2.3 smoke-tested against 8 routes. Remaining 5 high CVEs are all install-time-only `tar` via `cacache` and `sqlite3` chains — see SECURITY.md for accepted-risk reasoning. **A1 follow-ups (2026-04-20, per `PROMPT-A1-phase1-followups.md`):** (a) `proxy.ts` migration for Next 17 compat is tracked in [gh#55](https://github.com/civdotiq/civ.iq/issues/55) — deferred, no code today. (b) Cascade-failure contract: `/api/representative/[bioguideId]/committees` was verified cascade-safe after Phase 2's `fetchWithSourceStatus` refactor and pinned by `src/__tests__/api/representative/cascade-failure.test.ts` (4 failure modes: no key / network / HTTP 500 / timeout — all return 503 + `dataQuality: 'unavailable'`) in commit `fe82588f`; audit of the remaining 16 sibling representative-detail routes (bills, votes, finance, ...) that still surface bare 500s is tracked in [gh#56](https://github.com/civdotiq/civ.iq/issues/56). (c) `.next/build-lock` CI flakiness — `scripts/validation/validate-all.js` now removes stale locks preflight in commit `0e20cbca`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2 — Integrity core       | 🟢 done                                                                    | 2026-04-16 | see commits                                                                                                                                                               | BackboneResponse contract (`src/types/backbone-response.ts`) with `DataQuality` enum, `SourceStatus`, `fetchWithSourceStatus()` helper. Applied to committees, spending, lobbying routes — all now return `dataQuality` + `sourceStatus[]` instead of silent `[]`. Lobbying matcher expanded to 38 committee keyword entries (added Aging, Conservation, Forestry on 2026-04-16 follow-up after calibration showed those committees scored below the embedding threshold) plus embedding-based fallback via `embedText()` + cosine similarity. `matchingMethod` and `matchConfidence` added to `CommitteeLobbyingData`. UI updated: `SpendingSummaryCards` handles `unavailable` state, `LobbyingTab` surfaces metadata notes. **Calibration:** dev-only `/api/debug/calibrate-lobbying` endpoint runs the calibration set; results captured in `docs/CALIBRATION-lobbying-2026-04-16.json`. Production threshold = **0.40** with top-3 cap (chosen because max unrelated similarity is 0.356 — going lower pulls in noise). Calibration was **re-captured under transformers@4.1.0** after the upgrade landed: per-committee similarities shift by ±0.01–0.04 vs the prior 3.8.1 capture but the threshold and keyword decisions remain valid (same 6/8 produce a partial-or-better embedding match, same 2 fall through to keyword tier, noise floor essentially unchanged). **Embedding pipeline:** initially discovered to be silently broken under `@huggingface/transformers@3.8.1` on Node 25 (calibration captured via a temporary symlink workaround that was removed before commit). **Resolved 2026-04-16** by upgrading to `@huggingface/transformers@4.1.0` — see updated `docs/EMBEDDING-PIPELINE-BROKEN-2026-04.md` and the Phase 1 row above. The `npm run smoke:embedding` script (real Node, no mocks) now confirms the pipeline produces unit-norm 384-dim embeddings. **Threshold tests:** 3 tests in `senate-lobbying-api.test.ts` use vectors with known cosine similarity (0.45 above, 0.35 below the 0.40 threshold) to pin the threshold value — verified to fail when threshold drifts to 0.30 or 0.50. Also fixed dompurify 3.3.2→3.4.0 (moderate CVE). `validate:all` green at the end of each commit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 3 — Freshness plumbing   | 🟢 done                                                                    | 2026-04-16 | see commits                                                                                                                                                               | Weekly `sync-bioguide-fec.yml` (Sundays 14 UTC) runs `scripts/sync-bioguide-fec.ts` (exposed as `npm run sync:bioguide-fec`), which pulls `legislators-current.yaml` from `unitedstates/congress-legislators` and rewrites the canonical mapping at `packages/entity-resolution/data/bioguide-fec-mapping.json`. The unreferenced app mirror (`src/lib/data/bioguide-fec-mapping.json`) was deleted to eliminate divergence risk — the package is now the single source of truth and the app imports through the re-export shim. **Congress.gov + FEC candidate-search fallback:** when a Congress.gov current member is missing from the YAML (typical 1–2 week lag), the script queries FEC `/candidates/search/` and scores each result on last-name (0.4) + first-name (0.2) + state (0.1) + office (0.2) + party (0.1); matches ≥ 0.9 auto-apply, the rest are flagged in workflow logs with full confidence breakdown for human review. State names from Congress.gov are normalized to 2-letter codes before the FEC query. **Office-prefix selection:** the script picks the FEC ID whose chamber prefix matches each member's current term, so veteran House→Senate members (Sanders, Wicker, Cantwell, etc.) get their active Senate ID instead of a stale House one — the initial sync corrected ~50 such entries, added 2 new members, and fixed a Pelosi FEC-ID typo (`H8CA05050` → `H8CA05035`) that had been silently breaking her finance queries. **Sync script tests:** 23 unit tests in `src/__tests__/scripts/sync-bioguide-fec.test.ts` cover merge/lastUpdated preservation, diff summary, office-prefix matching, FEC match scoring, and the fallback proposer (including high-confidence auto-apply, low-confidence flag-only, and FEC-error resilience). **ZIP mapping:** `zip-district-mapping-119th.ts` now carries a freshness header (source, generation date, row-count invariants 33,778 / 7,299 / 26,479, next-refresh trigger post-2031); counts pinned by `src/__tests__/utils/zip-district-mapping.test.ts`. **FEC contribution pagination:** new `getAllContributions(candidateId, cycle, { limit, perPage, sort, onPage })` uses FEC's `last_indexes` cursor (page=N is capped at 10,000), adds 429/5xx retry-with-backoff honouring `Retry-After`, caches closed cycles 30d / current 1h, and **end-to-end verified against live FEC**: Pelosi 2020 → 250 rows in 24 s across 3 paginated calls with `last_index`+`last_contribution_receipt_amount` cursor values echoed correctly; estimated total 304,338. **Multi-committee fix:** `estimatedTotal` is now computed from up-front per-committee probes so the denominator reflects all committees even when the caller-provided limit stops pagination before later committees are paginated (the earlier sum-as-you-go approach under-counted when the limit was hit mid-stream). Finance route calls `getAllContributions({ limit: 1000 })` and surfaces `contributionCoverage: { fetched, estimatedTotal, coveragePercent, cappedAt, cursorExhausted }` in response metadata. **Cleanup:** the unreferenced `scripts/generate-fec-mappings.ts` (wrote a stale TS format, referenced an npm script that didn't exist) was deleted. `validate:all` green: 188/188 test suites, 2,382 tests (+24 vs start of phase); 2 accepted-risk install-time warnings carried over from Phase 1.                                                                                                                    |
| 4 — Scope honesty        | 🟢 done                                                                    | 2026-04-16 | `f1d3c555`, `ac35ab94`, `3d271ef9`, `e3664a73`, +`<follow-up>`                                                                                                            | **Decisions:** state finance = Option C short-term + A tracked (out-of-scope; track OpenSecrets/FTM merger); local government = Option C (relabel as "federal + state + 10 pilot cities"). **`docs/COVERAGE.md`** is the canonical coverage matrix; README, `public/llms.txt`, About page, and `/local` page align to it. State finance route rewritten as a `BackboneResponse` — `FOLLOWTHEMONEY_API_KEY` absent returns 503 / `dataQuality: 'unavailable'` with an OpenSecrets-merger note; configured path uses `fetchWithSourceStatus()` + `computeDataQuality()`. UI replaces the "coming soon" placeholder with an honest unavailable card. Local government route rewritten to return a `BackboneResponse` — pilot-city matches → 200 / `partial` pointing the caller to `/api/city/[id]/council`, unsupported → 503 / `unavailable` with a `pilotCities[]` payload listing all 10 supported cities and their endpoints. `CITY_CONFIGS` extracted to `src/lib/local-government/pilot-cities.ts` as the single source of truth. **Completion follow-up (same date):** P0 consumer-regression audit — clean: neither route is referenced by `packages/sdk`, `src/lib/mcp`, `public/openapi.json`, `src/__tests__`, or `public/llms*.txt`, and no old-shape fields (`success: true, finance`, `officials: []`, `jurisdictions:`, `nextElections:`) appear outside the plan itself, so no consumer fix was needed. P1 contract tests (4) added: `src/__tests__/api/state-legislature/legislator-finance.test.ts` pins the unavailable-when-FTM-absent path and the empty-when-resolve-returns-null path; `src/__tests__/api/local-government/local-government.test.ts` pins the pilot-match (`boston-ma` → `legistar:boston`) and unsupported (`fakecity-zz` → `civiq:local-government` not-configured, 10-city payload) paths. P1 runtime smoke: three real-upstream JSON fixtures committed under `docs/fixtures/phase4/` with a README documenting regression-detection workflow; the FTM-configured success path is intentionally not fixtured (no key in this env — called out in the README). `validate:all` green: 6 passed / 2 warn (carried-over Phase 1 install-time CVEs) / 0 fail. **P2 polish landed 2026-04-20 (per `PROMPT-A3-phase4-polish.md`):** two of the three originally deferred items plus one new overclaim caught during the session. (1) Tab label (`d0a39699`) — dropped "(currently unavailable)" suffix from the Finance tab description since the card already flags unavailability via the BackboneResponse contract. (2) Dormant-doc header (`12bcdbca`) — state-finance route now explicitly documents the active FTM-absent branch vs the dormant FTM-configured branch so no future cleanup deletes the shape contract. (3) Metadata honesty (`ae3fba94` + `3aa434f8`) — layout.tsx description / openGraph / twitter, the disclaimer page, and the Organization JSON-LD default now say "federal and state representatives — plus 10 pilot cities" instead of the unqualified "federal, state, and local" overclaim. **Still deferred:** tightening the "CIV.IQ is honest enough not to pretend…" prose in `docs/COVERAGE.md` — low-priority stylistic polish; not worth a dedicated session, fold into the next COVERAGE.md edit pass.                                                                                                                                                                                                                    |
| 5 — Infrastructure story | 🟢 done                                                                    | 2026-04-16 | see commits                                                                                                                                                               | **Packages:** Verified all three `@civiq/*` packages are live on npm (initial publish 2026-03-25). Package.json hygiene pass: added `publishConfig.access=public` + `provenance=true`, normalized `repository.url` to `git+https://github.com/civdotiq/civ.iq.git` with `directory` keys, added `homepage`, `bugs`, `engines.node>=20`, `sideEffects:false`, `prepublishOnly` (clean+build+test), and expanded `files` arrays to include README/LICENSE/CHANGELOG/METHODOLOGY. Fixed missing `LICENSE` in `@civiq/sdk`. Fixed `packages/entity-resolution/tsconfig.json` to exclude `src/__tests__` — tarball no longer ships compiled test files. All three packages rebuild + test clean (civic-statistics 41 tests, entity-resolution 105, sdk 27 — +2 for UA behavior). `npm pack --dry-run` tarball sizes: civic-statistics 12.4 kB, entity-resolution 160.7 kB, sdk 15.8 kB. **CHANGELOGs:** wrote Keep-a-Changelog 0.1.0 entries for each package documenting the actual API surface. **Publish workflow:** `.github/workflows/publish-packages.yml` — triggers on tags matching `@civiq/<pkg>@v*` with `workflow_dispatch` fallback (per-package choice + dry_run flag); verifies tag version matches package.json, runs lint/type-check/build/test, refuses double-publish, and publishes with `--provenance --access public` using `NPM_TOKEN`. **BOOTSTRAP.md:** end-to-end reproducibility doc — prerequisites, 4 required + 10 optional env vars (each with signup URL and rate-limit note), bootstrap sequence with expected wall-clock times, a curl-based verification matrix pinning the post-Phase-2 `dataQuality` contract, common failure modes, and an explicit "what you are NOT getting" section covering state finance / non-pilot local gov / ML training / production Redis. **Adoption telemetry:** `src/lib/analytics/adoption-telemetry.ts` exports pure helpers for SDK UA parsing (`extractSdkSignature`) and MCP clientInfo extraction (`extractMcpClientInfo`) with 19 jest tests pinning shapes (bare UA, composite UA, prerelease semver, JSON-RPC batches, bare-params shape from mcp-handler's `onEvent`, malformed inputs). MCP route wired into `onEvent` handler (REQUEST_RECEIVED + method=initialize → `recordMcpInitialize`). Middleware emits `adoption.sdk.request` metric lines for `/api/v1/*` and `/api/mcp` traffic whose UA carries `@civiq/sdk/<version>`. SDK `HttpClient` sends `User-Agent: @civiq/sdk/<version>` by default in Node/Bun/Deno and silently skips in browsers (fetch-spec compliance); accepts optional `userAgent` token that appends after the SDK signature. **Snapshot:** `scripts/snapshot-adoption.ts` (`npm run snapshot:adoption`) polls `api.npmjs.org/downloads/point/{period}/{pkg}` for last-day/week/month counts + published version; result lands in `docs/adoption/npm-downloads.json`. `.github/workflows/snapshot-adoption.yml` runs Mondays 13 UTC and opens a PR on diff. Initial snapshot (2026-04-16): civic-statistics 5/64 (week/month), entity-resolution 4/65, sdk 4/66 — low but honest, and in git. **`docs/ADOPTION.md`** documents the three adoption signals (npm snapshot in git, MCP handshakes in logs, REST SDK traffic in logs), lists what is explicitly NOT measured (page views, drive-by scrapes, federated read traffic), and links back to the telemetry source. `npm run lint`, `npm run type-check`, all 42 relevant unit tests + 72 middleware tests pass; `validate:all` green. |

---

## What this plan explicitly does NOT do

- **Does not** add new data domains (no new APIs integrated beyond what's already wired). This is a hardening plan, not an expansion plan.
- **Does not** rebuild the intelligence layer. Analyzers pass the audit — don't touch them.
- **Does not** introduce a database migration. All fixes are code + config + content.
- **Does not** change the "federal-first, state-partial, local-minimal" shape. Phase 4 is about documenting that shape honestly, not changing it.

Expansion plans (more states for finance, more cities for local gov, new ML capabilities) belong in separate roadmap documents. Finish hardening first. Integrity before growth.
