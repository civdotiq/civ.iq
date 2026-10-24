# CIV.IQ Coverage Matrix

**Last reviewed:** 2026-10-14
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

## Data sources (40: 29 government, 11 open datasets)

**Counting rule:** one row per upstream provider that live production code (a page, an API route, or the `/api/mcp` tool server) reads, either at request time or from a committed or GitHub-Actions-mirrored copy. Each agency counts once however many of its endpoints we call (all Census APIs and files are one row). News feeds, AI model providers, map tiles, address autocomplete, and local-government pilots are not counted. Last counted 2026-10-14.

Government records are read directly from the agency where it publishes an API or bulk file. Where an open dataset sits between us and the record, it is listed below under its own name.

### Government (29)

| #   | Provider                                 | What we read                                                   |
| --- | ---------------------------------------- | -------------------------------------------------------------- |
| 1   | Congress.gov API (Library of Congress)   | Members, bills, actions, committees                            |
| 2   | U.S. House Clerk                         | House roll-call XML, floor schedule, member photos             |
| 3   | Senate.gov                               | Senate roll-call XML (live and Actions mirror), floor schedule |
| 4   | LDA (lda.gov)                            | Lobbying registrations and reports (API and mirrored corpus)   |
| 5   | GovInfo (GPO)                            | Hearings, BILLSTATUS policy areas (mirrored corpus)            |
| 6   | FEC                                      | Candidates, committees, contributions, expenditures            |
| 7   | U.S. Census Bureau                       | Geocoder, ACS, TIGER boundaries, Gazetteer, school finance     |
| 8   | USASpending.gov                          | Federal contracts, grants, awards                              |
| 9   | Federal Register                         | Rules, proposed rules, executive orders, comment periods       |
| 10  | Regulations.gov                          | Public comments on rules                                       |
| 11  | SEC EDGAR                                | Company filings                                                |
| 12  | FRED (Federal Reserve Bank of St. Louis) | Economic indicators                                            |
| 13  | Bureau of Labor Statistics               | LAUS unemployment, QCEW employment and wages                   |
| 14  | EPA ECHO / FRS                           | Enforcement and compliance                                     |
| 15  | OSHA (Department of Labor)               | Workplace enforcement                                          |
| 16  | CFPB                                     | Consumer complaints                                            |
| 17  | NOAA NCEI                                | Climate and weather records                                    |
| 18  | EIA                                      | Energy data                                                    |
| 19  | HUD                                      | Housing data                                                   |
| 20  | FDIC                                     | Bank data                                                      |
| 21  | FEMA                                     | Disaster declarations                                          |
| 22  | Treasury Fiscal Data                     | Federal fiscal data                                            |
| 23  | NIH RePORTER                             | Research grants                                                |
| 24  | CMS (incl. data.medicaid.gov)            | Provider data, Medicaid enrollment                             |
| 25  | College Scorecard (Dept. of Education)   | Higher-education outcomes                                      |
| 26  | NHTSA                                    | Vehicle safety                                                 |
| 27  | FBI Crime Data Explorer                  | Crime statistics                                               |
| 28  | CDC PLACES                               | Local health estimates                                         |
| 29  | VA                                       | Veteran population                                             |

### Open datasets (11)

These are not government APIs. Most republish or index official records; the rest are reference data where no official machine-readable source exists.

| #   | Provider                                  | What we read                                                               |
| --- | ----------------------------------------- | -------------------------------------------------------------------------- |
| 30  | OpenStates (Plural)                       | State legislators, bills, committees, votes (API v3 and CC0 people corpus) |
| 31  | Congress Trading Monitor (kadoa, MIT)     | STOCK Act trades for both chambers, parsed from the official filings ¹     |
| 32  | @unitedstates congress-legislators        | Legislator IDs, terms, and photos (public domain)                          |
| 33  | Wikidata                                  | State executives, state judiciary, organization identifiers                |
| 34  | Wikipedia                                 | Short descriptions for organizations and sectors                           |
| 35  | CourtListener (Free Law Project)          | Federal court cases (influence-graph context)                              |
| 36  | MIT Election Data and Science Lab (MEDSL) | Historical election results (static snapshot)                              |
| 37  | National Governors Association            | Current governors (weekly mirror)                                          |
| 38  | National Conference of State Legislatures | Legislature names and structure (static snapshot)                          |
| 39  | Ballotpedia                               | 2025 statewide election results (static snapshot)                          |
| 40  | Urban Institute Education Data Portal     | NCES Common Core of Data (school districts)                                |

Live status for the sources with a health probe is reported at `/api/health`.

---

## Federal coverage (complete across all wired domains)

| Domain                       | Source                     | Status   | Update cadence       | Verify with                                       |
| ---------------------------- | -------------------------- | -------- | -------------------- | ------------------------------------------------- |
| Members of Congress          | Congress.gov v3            | complete | weekly bioguide sync | `/api/representatives?state=MI&district=12`       |
| House roll call votes        | House Clerk XML            | complete | per session          | `/api/vote/[voteId]`                              |
| Senate roll call votes       | Senate.gov XML             | complete | per session          | `/api/senate-votes/[voteNumber]`                  |
| Bills (text, sponsors, etc.) | Congress.gov v3            | complete | continuous           | `/api/v1/bills`                                   |
| Committee assignments        | Congress.gov v3            | complete | continuous           | `/api/representative/[bioguideId]/committees`     |
| Hearing transcripts          | GovInfo.gov                | complete | per hearing          | `/api/govinfo/hearings`                           |
| Federal campaign finance     | FEC.gov                    | complete | continuous           | `/api/representative/[bioguideId]/finance`        |
| Lobbying disclosures         | LDA (lda.gov)              | complete | quarterly            | `/api/representative/[bioguideId]/lobbying`       |
| Federal contracts/grants     | USASpending.gov v2         | complete | continuous           | `/api/spending/district/[districtId]`             |
| Rules / executive orders     | Federal Register           | complete | daily                | `/api/federal-register`                           |
| STOCK Act trades             | STOCK Act PTRs via CTM ¹   | complete | daily                | `/api/representative/[bioguideId]/stock-trades`   |
| Public comments on rules     | Regulations.gov            | complete | continuous           | `/api/federal-register/[documentNumber]/comments` |
| Districts (boundaries)       | Census TIGER/Line          | complete | post-2031 redistrict | `/api/district-boundaries/[districtId]`           |
| Demographics                 | Census ACS                 | complete | annual               | `/api/districts/[districtId]`                     |
| Employment / wages           | Bureau of Labor Statistics | complete | monthly              | `/api/districts/[districtId]/economic-profile`    |

¹ The Congress Trading Monitor (CTM) open dataset (MIT, github.com/kadoa-org/congress-trading-monitor) parses the official STOCK Act Periodic Transaction Reports for both chambers: Senate filings from efdsearch.senate.gov, House filings from disclosures-clerk.house.gov. Every trade links to its original filing.

Federal is the platform's strongest layer. The cross-domain joins (votes × finance × lobbying × committee jurisdiction) are designed for and tested on federal data.

---

## State coverage

### What works (complete)

| Domain                      | Source                    | Status    | Verify with                                            |
| --------------------------- | ------------------------- | --------- | ------------------------------------------------------ |
| State legislators           | OpenStates API v3, corpus | complete  | `/api/state-legislature/[state]`                       |
| State bills                 | OpenStates API v3         | complete  | `/api/state-bills/[state]`                             |
| State committees            | OpenStates API v3         | complete  | `/api/state-legislature/[state]/committees`            |
| State roll call votes       | OpenStates API v3         | partial ² | `/api/state-legislature/[state]/legislator/[id]/votes` |
| State legislative dist.     | Census TIGER/Line         | complete  | `/api/state-districts/[state]/[chamber]/[district]`    |
| State executives (Gov, AG)  | Wikidata SPARQL, NGA      | partial   | `/api/state-executives/[state]`                        |
| State judiciary (top court) | Wikidata SPARQL           | partial   | `/api/state-judiciary/[state]`                         |

² Per-legislator vote history currently returns an empty list. A bulk roll-call corpus built from OpenStates session data is in progress (PR #222); until it ships, treat an empty list as "not available", not "no votes".

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

The intelligence analyzers (listed in the [README](../README.md#intelligence-layer)) operate on the federal layer: votes × FEC × LDA × committees × STOCK Act trades × Federal Register. They are **not designed to operate on state legislator data** because the state-level cross-domain joins they need (state campaign finance, state lobbying) do not exist. Every analyzer is federal-only; none runs for state or local officials.

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
