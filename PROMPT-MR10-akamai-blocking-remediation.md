# PROMPT — MR10: Senate / clerk.house.gov XML is blocked by Akamai for cloud-IP traffic

**Parent plan**: `PLAN-money-report-restoration-2026-04.md`
**Spawned from**: `PROMPT-MR7-analyzer-timeout-rootcause.md` (root-causing the analyzer 55 s timeouts)
**Blocking**: vote-finance, vote-prediction, and any other analyzer that depends on Senate roll-call XML. Until this is resolved, the money-report acceptance criteria from MR6 cannot be met.

---

## What's actually wrong

Two upstream issues, one big and one small, both surfaced during the MR7 investigation on 2026-04-23.

### 1. Senate roll-call XML is blocked by Akamai for cloud IPs (the real problem)

`batchVotingService.fetchAndParseHouseXML` and the equivalent Senate path fetch:

- `https://www.senate.gov/legislative/LIS/roll_call_votes/vote{cong}{sess}/vote_{cong}_{sess}_{nnnnn}.xml`
- `https://clerk.house.gov/evs/{year}/roll{nnn}.xml`

Both URLs return **HTTP 200** from a residential connection (verified 2026-04-23 from `mbs@civ.iq` working tree). Both return **403 Forbidden** or hang past 55 s when called from Vercel's serverless IPs. The `User-Agent` / `Referer` browser-spoof headers our `HttpClient` already adds (see `batch-voting-service.ts:33-55`) do not bypass this — Akamai is filtering on the cloud-IP range itself or on TLS fingerprints, not on the request headers.

This is **not our bug**. Another developer filed it as [LibraryOfCongress/api.congress.gov#441](https://github.com/LibraryOfCongress/api.congress.gov/issues/441) on 2026-04-18. **Status as of 2026-04-25: CLOSED by the LoC team on 2026-04-24** — final reply was "this is coming from Senate.gov, contact the Senate webmaster." The Library of Congress is not going to fix this. Anyone who needs Senate roll-call data programmatically from cloud infrastructure has to route around it themselves.

A related earlier issue, [#437](https://github.com/LibraryOfCongress/api.congress.gov/issues/437), is the same pattern for `congress.gov/rss/` blocked by Cloudflare. [#431](https://github.com/LibraryOfCongress/api.congress.gov/issues/431) tracks general origin-server instability with a tentative 2026-04-27 fix target.

There's also no JSON alternative for Senate votes — issue [#436](https://github.com/LibraryOfCongress/api.congress.gov/issues/436) was a recent request for one and was closed without action. The only official source for Senate roll-call data IS the Akamai-blocked XML.

**Implication for our remediation**: Option C (wait for the LoC) is dead. The choice is now A (mirror it ourselves) or B (third-party feed) or D (ship House-only honestly).

### 2. Health probe falsely flags Congress.gov as down (the small, misleading signal)

`src/app/api/health/route.ts:53` probes `https://api.congress.gov/v3` **without** appending `api_key=$CONGRESS_API_KEY`, so the probe gets a 403 and reports the source as `down (404)`. Independent verification with the local key on the same machine: `/v3?api_key=...` returns 301, `/v3/bill?api_key=...&limit=1` returns 200, `/v3/house-vote/119?api_key=...&limit=1` returns 200. The api.congress.gov JSON API itself is fine — only the senate.gov / clerk.house.gov XML mirrors are blocked.

The same pattern likely applies to FEC (`down: 403` in the same probe) and Senate LDA (`down: 400`) — probe URLs probably need API keys appended. Worth verifying.

## Diagnostic scaffolding still on production

Three artifacts shipped during MR7 are still live and should be removed (or gated behind a stricter token) once MR10 closes:

- `src/app/api/intelligence/debug/phase-timings/[bioguideId]/[analyzer]/route.ts`
- `getLastPhases` and the `lastPhases` map in `src/lib/intelligence/analyzers/shared.ts`
- `createPhaseTimer().mark/.record` calls in `vote-finance-analyzer.ts`, `vote-prediction-analyzer.ts`
- ONNX cold-load timing block in `vote-predictor.ts:loadSession`

Investigation commits: `56a5671a`, `9ce4b10a`, `4220669e`, `c5dff80b`. Memory note: `project_mr7-rootcause-2026-04-23.md`.

## Remediation options (pick one before implementing)

There is no clean fix on Vercel. Each option below has trade-offs the next session needs to decide between **before** writing code.

### A. Mirror the XML ourselves on a non-blocked host

Run a small worker on infrastructure whose IPs aren't blocked (residential VPN-backed VPS, GitHub Actions runner, Cloudflare Worker pulling through a residential gateway, or even a $5/mo home Pi) that periodically re-mirrors the senate.gov and clerk.house.gov XML to a public bucket (S3, R2, Vercel Blob). The analyzers then fetch from our mirror.

- **Pros**: One-time setup, fully solves the problem for Senate AND House. Removes Vercel's dependency on a flaky upstream entirely. Aligns with the long-term "CIV.IQ as canonical civic data backbone" vision in user memory.
- **Cons**: New piece of infrastructure to maintain. Stale-data window (mirror lag). May have terms-of-service implications worth checking.
- **Effort**: 1–2 days.

### B. Use a third-party mirror (GovTrack / VoteView)

GovTrack and Voteview historically maintain their own scraped Senate vote datasets. Confirm they're current, then point the analyzer at their JSON endpoints as a fallback.

- **Pros**: No new infrastructure on our side. Fast to integrate.
- **Cons**: Adds an external dependency we don't control. GovTrack's API status is uncertain (last project memory check was months ago). Need to verify license/usage terms.
- **Effort**: 0.5–1 day if their API is healthy and matches our shape.

### C. ~~Wait for the Library of Congress to fix it~~ (DEAD as of 2026-04-24)

Issue #441 was closed by the LoC team telling reporters to contact the Senate webmaster directly. There is no fix coming from upstream. **Do not pick this option.**

### D. Hybrid — ship what works, gate what doesn't

House votes via `api.congress.gov/v3/house-vote/...` work fine (verified 200 from cloud-equivalent test). The Senate path is the only one structurally broken. Update the analyzer to:

1. Continue serving House reps with full vote-finance + vote-prediction insights.
2. For Senate reps, return `unavailable` with a specific reason like "Senate roll-call data temporarily unavailable due to upstream blocking" until A or B lands.
3. Update MR5's UI states to render that reason honestly.

- **Pros**: Restores the money-report for House users immediately (435 of 536 reps). Honest about what's blocked. Buys time to pick A or B for Senate.
- **Cons**: Senate users (101 reps + their constituents) see "unavailable" in the meantime.
- **Effort**: ~1 day for the bail-out + UI surfacing.

## Recommended sequence

1. **Verify the diagnosis** end-to-end: hit `api.congress.gov/v3/house-vote/119/...` from production via the existing diagnostic endpoint, confirm it returns 200 + actual vote data (i.e., House should already work and the cron's House timeouts are something else — possibly key-related). Then hit `senate.gov/.../*.xml` from production and confirm 403 / timeout.
2. **Fix the health probe** (small): pass API keys for Congress.gov, FEC, and Senate LDA so the dashboard stops lying about which sources are actually down. This is a 30-line change that prevents future MR7-style time sinks.
3. **Implement Option D** as the immediate ship: split the analyzer behavior by chamber. Restore House users now.
4. **Decide between A and B** for the Senate fix in a separate prompt. Don't try to make the decision under pressure during MR10.
5. **Remove MR7 diagnostic scaffolding** once Option D ships and the analyzer is observable through normal channels again.

## Constraints

- No synthetic data ever, no chamber-aggregated guesses, no "estimated based on similar reps." Senate users get honest "unavailable" until the upstream is real.
- Don't attempt residential-proxy workarounds against senate.gov — likely violates terms of use, brittle, and ethically questionable for a civic-data project.
- Don't disable the Senate analyzers globally without checking what other surfaces depend on them (search `analyzeVoteFinance`, `analyzeVotePrediction` callers).

## Success criteria

1. House reps return real `vote_finance` + `vote_prediction` insights inside the orchestrator budget. Money-report for House addresses (e.g. ZIP 90210, Representative Lieu) renders `ready` for those metrics.
2. Senate reps return `unavailable` with a specific human-readable reason — not `timeout` and not a silent dash.
3. `/api/health` reports Congress.gov / FEC / Senate LDA as `ok` when the real APIs are healthy.
4. No MR7 diagnostic routes or instrumentation remain in the codebase.

## Closeout (fill in when landed)

- [ ] Option chosen (A / B / C / D / hybrid):
- [ ] Commit SHA(s):
- [ ] House cron success rates:
- [ ] Senate state-rendering verification:
- [ ] Health probe re-checked:
- [ ] MR7 diagnostic scaffolding removed (commit SHA):
