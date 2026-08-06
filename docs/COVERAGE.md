# CIV.IQ Coverage Matrix

**Last reviewed:** 2026-04-16
**Audience:** Anyone evaluating whether CIV.IQ can answer a specific civic question.
**Promise:** Every claim on this page is falsifiable. If a row says "complete," any reader can verify it against the cited API. If a row says "unavailable," the routes return `dataQuality: 'unavailable'` rather than empty arrays.

This page is the canonical answer to "what does CIV.IQ actually cover?" It supersedes any marketing copy elsewhere in the repo. If you find this page disagrees with a public-facing claim, the claim is wrong — please open an issue.

---

## TL;DR

| Level                  | Coverage                             | One-line reality                                                                           |
| ---------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| **Federal**            | Complete across all wired domains    | 535 members, all bills, all roll calls, full FEC + LDA + USASpending + Federal Register.   |
| **State legislatures** | Complete for legislators/bills/votes | All 50 states via OpenStates. Campaign finance is **not currently available** (see below). |
| **State executives**   | Partial                              | Governors and AGs sourced from Wikidata SPARQL.                                            |
| **Local government**   | 10 pilot cities                      | Legistar-backed council data for 10 named cities. Everywhere else returns `unavailable`.   |

If you came here expecting "all 50 states + every city in America," that does not exist anywhere — and CIV.IQ is honest enough not to pretend it does.

---

## Federal coverage (complete across all wired domains)

| Domain                       | Source                     | Status   | Update cadence       | Verify with                                     |
| ---------------------------- | -------------------------- | -------- | -------------------- | ----------------------------------------------- |
| Members of Congress          | Congress.gov v3            | complete | weekly bioguide sync | `/api/representatives?state=CA`                 |
| House roll call votes        | House Clerk XML            | complete | per session          | `/api/votes/recent`                             |
| Senate roll call votes       | Senate.gov XML             | complete | per session          | `/api/votes/recent`                             |
| Bills (text, sponsors, etc.) | Congress.gov v3            | complete | continuous           | `/api/bills?congress=119`                       |
| Committee assignments        | Congress.gov v3            | complete | continuous           | `/api/representative/[bioguideId]/committees`   |
| Hearing transcripts          | GovInfo.gov                | complete | per hearing          | `/api/hearings/recent`                          |
| Federal campaign finance     | FEC.gov                    | complete | continuous           | `/api/representative/[bioguideId]/finance`      |
| Lobbying disclosures         | Senate LDA                 | complete | quarterly            | `/api/representative/[bioguideId]/lobbying`     |
| Federal contracts/grants     | USASpending.gov v2         | complete | continuous           | `/api/spending/district/[districtId]`           |
| Rules / executive orders     | Federal Register           | complete | daily                | `/api/federal-register/recent`                  |
| STOCK Act trades             | SEC EDGAR                  | complete | per filing           | `/api/representative/[bioguideId]/stock-trades` |
| Public comments on rules     | Regulations.gov            | complete | continuous           | `/api/regulations/[docketId]/comments`          |
| Districts (boundaries)       | Census TIGER/Line          | complete | post-2031 redistrict | `/api/districts/[state]`                        |
| Demographics                 | Census ACS                 | complete | annual               | `/api/districts/[districtId]/demographics`      |
| Employment / wages           | Bureau of Labor Statistics | complete | monthly              | `/api/districts/[districtId]/economy`           |

Federal is the platform's strongest layer. The cross-domain joins (votes × finance × lobbying × committee jurisdiction) are designed for and tested on federal data.

---

## State coverage

### What works (complete)

| Domain                      | Source             | Status   | Verify with                                  |
| --------------------------- | ------------------ | -------- | -------------------------------------------- |
| State legislators           | OpenStates GraphQL | complete | `/api/state-legislature/[state]/legislators` |
| State bills                 | OpenStates GraphQL | complete | `/api/state-legislature/[state]/bills`       |
| State committees            | OpenStates GraphQL | complete | `/api/state-legislature/[state]/committees`  |
| State roll call votes       | OpenStates GraphQL | complete | `/api/state-legislature/[state]/votes`       |
| State legislative dist.     | Census TIGER/Line  | complete | `/api/state-districts/[state]`               |
| State executives (Gov, AG)  | Wikidata SPARQL    | partial  | `/api/states/[state]/executives`             |
| State judiciary (top court) | Wikidata SPARQL    | partial  | `/api/states/[state]/judiciary`              |

All 50 states. Approximately 7,383 state legislators. Wikidata-sourced executive/judiciary data is partial because Wikidata coverage varies by state — routes return `dataQuality: 'partial'` where appropriate.

### What does NOT work (unavailable)

| Domain                           | Why                                                                                         | Route behavior                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **State campaign finance**       | FollowTheMoney.org is in maintenance mode during the OpenSecrets merger. No usable API key. | Returns `dataQuality: 'unavailable'` with a `notes[]` entry citing the merger. |
| State lobbying disclosures       | No federated state-level LDA equivalent exists. Each state's regime is different.           | Not wired. No route claims this data.                                          |
| State-level FOIA / court records | Per-state portals, no unified source.                                                       | Not wired.                                                                     |

#### State campaign finance — current status and roadmap

**Decision (2026-04-16):** Document as out-of-scope short-term; track the OpenSecrets/FTM merger.

- The `FollowTheMoney.org` API was the only viable cross-state aggregator. After the OpenSecrets merger, it is in maintenance mode and the user-facing site warns of bugs. We have no API key and the merged successor has not published a stable replacement endpoint.
- Per-state Secretary of State APIs exist for ~5 states (CA, NY, TX, FL, IL) with very different schemas. Integrating them is plausible but is a separate, scoped effort (not Phase-4 scope), and would still leave 45 states uncovered.
- `/api/state-legislature/[state]/legislator/[id]/finance` returns a `BackboneResponse` with `dataQuality: 'unavailable'` and a source-status entry documenting why. The state legislator profile UI surfaces this honestly rather than claiming "coming soon."
- This page is the place where status updates will be tracked. When a usable replacement exists, we will note the date here and link to the integration PR.

---

## Local government coverage

### Reality

CIV.IQ supports city council data for **10 pilot cities** — nine through their open Legistar APIs, plus Detroit from a hand-verified roster corpus (its Legistar database froze in 2018). Outside of these cities, no local government data is wired — the routes return `dataQuality: 'unavailable'` instead of empty arrays.

| City         | State | Source                 | Endpoint                         |
| ------------ | ----- | ---------------------- | -------------------------------- |
| Austin       | TX    | Legistar (austin)      | `/api/city/austin/council`       |
| Boston       | MA    | Legistar (boston)      | `/api/city/boston/council`       |
| Chicago      | IL    | Legistar (chicago)     | `/api/city/chicago/council`      |
| Denver       | CO    | Legistar (denver)      | `/api/city/denver/council`       |
| Detroit      | MI    | Verified roster corpus | `/api/city/detroit/council`      |
| Minneapolis  | MN    | Legistar (minneapolis) | `/api/city/minneapolis/council`  |
| Oakland      | CA    | Legistar (oakland)     | `/api/city/oakland/council`      |
| Philadelphia | PA    | Legistar (philacity)   | `/api/city/philadelphia/council` |
| Portland     | OR    | Legistar (portland)    | `/api/city/portland/council`     |
| Seattle      | WA    | Legistar (seattle)     | `/api/city/seattle/council`      |

Detroit additionally supports address → council district → members lookup at `/api/city/detroit/district?address=<full street address>` (Census Geocoder + the city's own district boundary layer, boundaries effective 2026-01-01). Other cities return 501 from that endpoint.

`CITY_CONFIGS` in `src/app/api/city/[cityId]/council/route.ts` is the source of truth. Any city not in that list is genuinely unsupported — calling its endpoint returns the supported-city list.

### Why coverage is small

There is no national local-government API. Over 90,000 local jurisdictions in the U.S. each publish records in different formats (or not at all). Legistar gives us ~100 cities for free, and we have currently wired 10. Expanding the list is straightforward configuration work, but each city requires verification that the Legistar endpoint is live and the body-name keywords match local conventions.

### Roadmap

- **Short-term (Phase 4 — done):** Be honest. Routes return `unavailable` outside the pilot list. Public-facing text matches the 10-city reality.
- **Medium-term (separate roadmap):** Expand Legistar coverage incrementally. Goal is to add cities only after verifying the endpoint and naming conventions, not to bulk-import broken configs.
- **Out-of-scope:** Building per-city scrapers for jurisdictions without open APIs. That is a different product.

---

## Intelligence layer coverage

The 12 intelligence analyzers operate on the federal layer (votes × FEC × LDA × committees × USASpending). They are **not designed to operate on state legislator data** because the necessary state-level cross-domain joins (state campaign finance, state lobbying) do not exist.

| Analyzer                       | Federal | State | Local |
| ------------------------------ | ------- | ----- | ----- |
| Finance-Jurisdiction Overlap   | ✅      | ❌    | ❌    |
| Vote-Finance Correlation       | ✅      | ❌    | ❌    |
| Temporal Vote Shifts           | ✅      | ❌    | ❌    |
| Lobbying Pipeline              | ✅      | ❌    | ❌    |
| PAC-to-Vote Tracing            | ✅      | ❌    | ❌    |
| Stock-Committee Overlap        | ✅      | ❌    | ❌    |
| Influence Chain                | ✅      | ❌    | ❌    |
| Sector Leaderboard             | ✅      | ❌    | ❌    |
| Vote Prediction (XGBoost/ONNX) | ✅      | ❌    | ❌    |
| Bill Intelligence              | ✅      | ❌    | ❌    |
| Bill-Lobbying Similarity       | ✅      | ❌    | ❌    |
| Federal Register Analysis      | ✅      | n/a   | n/a   |

State legislator profiles render legislators, bills, votes, and committee data — but not analyzer output, because the input data isn't there.

---

## How responses signal coverage

Every join-based API response carries the `BackboneResponse` contract introduced in Phase 2 (`src/types/backbone-response.ts`):

```ts
{
  data: T,
  dataQuality: 'complete' | 'partial' | 'empty' | 'unavailable',
  sourceStatus: SourceStatus[]
}
```

Consumers (UI, MCP tools, SDK clients) can distinguish four cases without ambiguity:

- `complete` — all upstream sources returned data.
- `partial` — some sources returned data, others errored. The `data` is trustworthy for the sources that returned `ok`.
- `empty` — all sources returned ok, the dataset is genuinely empty (the entity exists, has no records).
- `unavailable` — critical sources are down or not configured. Do not interpret an empty `data` as "no records exist."

This contract is the technical mechanism that makes this coverage page enforceable. If you see `dataQuality: 'complete'` with empty data, that is the source telling you "this entity has no records," not "we don't know."

---

## Update policy

This page is updated whenever:

1. A new data source is wired in (add a row).
2. An upstream API status changes (e.g., FollowTheMoney returns to service).
3. A pilot city is added or removed.
4. A coverage-shaped claim is made elsewhere in the repo and we discover it disagrees with this page (the page wins; the other claim gets fixed).

Anyone who finds a CIV.IQ claim that contradicts this page should open an issue tagged `coverage-honesty`.
