# CIV.IQ Coverage Matrix

**Last reviewed:** 2026-09-17
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
| **Local government**   | Not covered                          | No city/county data. Local records lack a shared standard or central source.               |

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

Local (city/county) government: not covered. Local records lack a shared standard or central source; CIV.IQ intends to add them only once a verified public source exists.

There is no national local-government API. Over 90,000 local jurisdictions in the U.S. each publish records in different formats, or not at all. CIV.IQ does not serve city or county officials, councils, or district lookups, and does not advertise partial city coverage, city lists, or a local roadmap. When a verified public source with a shared standard exists, this page will record the date and link the integration PR.

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
3. A verified public source for local (city/county) government becomes available.
4. A coverage-shaped claim is made elsewhere in the repo and we discover it disagrees with this page (the page wins; the other claim gets fixed).

Anyone who finds a CIV.IQ claim that contradicts this page should open an issue tagged `coverage-honesty`.
