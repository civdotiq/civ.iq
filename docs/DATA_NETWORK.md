# Data Network — CIV.IQ Civic Intelligence Graph

## What This Is

CIV.IQ aggregates data from 9 federal APIs into isolated domain endpoints. The **join layer** wires those domains together — connecting bills to spending, committees to regulations, campaign finance to oversight jurisdiction, and districts to relevant legislation.

This document maps the full network: which data lives where, how domains connect, and what each join endpoint does.

---

## Data Domains

CIV.IQ organizes federal data into 8 domains, each backed by one or more government APIs:

```
DOMAIN                  PRIMARY API               WHAT IT HOLDS
──────────────────────  ────────────────────────  ─────────────────────────────────
Representatives         Congress.gov v3            Members, committees, votes, photos
Bills & Legislation     Congress.gov v3            Bill text, status, sponsors, actions
Committees              Congress.gov v3            Jurisdiction, meetings, reports
Campaign Finance        FEC API                    Contributions, expenditures, donors
Federal Spending        USAspending.gov v2         Contracts, grants, awards by agency
Regulations             Federal Register API       Proposed rules, final rules, comments
Hearings                GovInfo API                Congressional hearing transcripts
Districts               Census API, USAspending    Demographics, boundaries, spending
```

Before the join layer, these 8 domains were completely isolated — 107 endpoints, zero connections between them.

---

## The Network

10 join endpoints create 15 cross-domain connections:

```
                        ┌──────────────┐
                        │    BILLS     │
                        │ Congress.gov │
                        └──┬───┬───┬──┘
                 Gap 1A │  │   │  │ Gap 4
            (spending)  │  │   │  │ (votes)
                        │  │   │  │
          ┌─────────────┘  │   │  └──────────────┐
          ▼                │   │                  ▼
  ┌───────────────┐   Gap 7│   │Gap 8      ┌──────────┐
  │   SPENDING    │(lifecycle) │(district)  │  VOTES   │
  │ USAspending   │        │   │            │ Congress │
  └───┬───────────┘        │   │            └──────────┘
      │                    │   │
 Gap 1B (reverse)     ┌────┘   └────┐
      │               ▼             ▼
      │        ┌────────────┐ ┌───────────┐
      └───────►│ COMMITTEES │ │ DISTRICTS │
               │ Congress   │ │ Census    │
               └──┬─────┬──┘ └───────────┘
                  │     │
            Gap 2 │     │ Gap 3
        (regs)    │     │ (finance)
                  │     │
          ┌───────┘     └────────┐
          ▼                      ▼
  ┌───────────────┐     ┌───────────────┐
  │  REGULATIONS  │     │   CAMPAIGN    │
  │ Fed Register  │     │   FINANCE     │
  └───────────────┘     │   FEC         │
          ▲             └───────────────┘
          │
          │ Gap 6 (policy area search)
          │
  ┌───────────────┐
  │   HEARINGS    │──── Gap 5 (connections)
  │   GovInfo     │
  └───────────────┘
```

---

## Join Endpoints

### Gap 1A: Bill to Spending

```
GET /api/bill/{billId}/spending

Bill ──policyArea──► policy-area-map ──agencySlugs──► USAspending
Bill ──committees──► committee-agency-map ──agencies──► USAspending
```

Given a bill, finds related federal spending. Maps the bill's policy area and committee assignments to federal agencies, then queries USAspending for awards from those agencies. Each agency is tagged as `direct` (matched via committee) or `inferred` (matched via policy area).

**Cache:** 6h | **Sources:** congress.gov, usaspending.gov

---

### Gap 1B: Agency to Bills

```
GET /api/spending/agency/{agencySlug}/bills

Agency ──reverse lookup──► committees ──topics──► policy-area-map ──► Congress.gov bills
```

The reverse of Gap 1A. Given a federal agency slug, finds bills that affect it. Uses `getCommitteesForAgency()` to find oversight committees, maps their topics to policy areas, then fetches recent bills matching those policy areas.

**Cache:** 2h | **Sources:** congress.gov

---

### Gap 2: Committee to Regulations

```
GET /api/committee/{committeeId}/regulations

Committee ──code──► committee-agency-map ──agencies──► Federal Register
                                          ──topics──► keyword filter
```

Connects a congressional committee to the regulations it oversees. Maps the committee to its oversight agencies, queries the Federal Register for each agency's proposed rules, final rules, and open comment periods. Filters by topic relevance and groups results into three categories. Open comments are sorted by urgency (days until close).

**Cache:** 3h | **Sources:** federalregister.gov

---

### Gap 3: Campaign Finance x Committee Jurisdiction

```
GET /api/representative/{bioguideId}/finance-jurisdiction

Rep ──committees──► committee-agency-map ──topics──► industrySectors
Rep ──bioguideId──► FEC mapping ──fecId──► FEC contributions ──► categorize by sector
                                                                      │
Result: Which donor sectors overlap with the rep's committee jurisdiction?
```

The "money and power" join. For a representative, maps their committee assignments to industry sectors (via policy-area-map), then fetches their FEC contributions and categorizes each by sector. Cross-references to find where donor industries overlap with the member's oversight jurisdiction.

**Cache:** 12h | **Sources:** congress.gov, fec.gov

---

### Gap 4: Bill to Votes

```
GET /api/bill/{billId}/votes

Bill ──fetchBillFromCongress──► bill.votes[] ──► pass/fail summary
```

Simplest join. Fetches a bill's full record including its vote history, then computes summary statistics (total votes, passed count, failed count, chambers).

**Cache:** 24h | **Sources:** congress.gov

---

### Gap 5: Hearings Connections

```
GET /api/govinfo/hearings/connections?committeeId=HSAS
GET /api/govinfo/hearings/connections?billId=119-hr-1
GET /api/govinfo/hearings/connections?policyArea=Health

Filter ──► GovInfo hearings ──► keyword scoring ──► ranked matches
```

Multi-directional. Connects hearings to committees, bills, or policy areas via keyword matching. Supports three filter modes — by committee (match chamber + topic keywords), by bill (extract keywords from bill's policy area and title), or by policy area (use mapped topics). Each hearing gets a relevance score and matched topics list.

**Cache:** 2h | **Sources:** govinfo.gov, congress.gov

---

### Gap 6: Policy Area Search

```
GET /api/search/policy-area?policyArea=Health

policyArea ──► policy-area-map ──► 4 parallel fetches:
  ├── Congress.gov ──► bills with matching policyArea
  ├── Federal Register ──► regulations from mapped agencies
  ├── USAspending ──► aggregate spending by mapped agencies
  └── committee-agency-map ──► oversight committees
```

Cross-domain search. Given a policy area string, returns related items from all four data domains in parallel. The single endpoint that touches the most data sources.

**Cache:** 2h | **Sources:** congress.gov, federalregister.gov, usaspending.gov

Also: `GET /api/search/policy-area/list` returns all 32 valid policy area values.

---

### Gap 7: Bill Lifecycle

```
GET /api/bills/lifecycle?status=passed_house&since=30d&chamber=house

Congress.gov bills ──mapCongressStatus()──► normalized status ──► filter + count
```

Tracks bills through their legislative journey. Fetches recent bills, normalizes their status via `mapCongressStatus()`, and filters by status, date range, and chamber. Returns a status histogram showing the distribution of bills across all lifecycle stages.

Valid statuses: `introduced`, `referred`, `reported`, `passed_house`, `passed_senate`, `passed_both`, `failed`, `enacted`, `vetoed`

**Cache:** 1h | **Sources:** congress.gov

---

### Gap 8: District to Relevant Bills

```
GET /api/district/{districtId}/bills

District ──USAspending──► top agencies ──agencyNameToSlug──► committee-agency-map ──► topics
District ──census/reps──► House rep ──committees──► committee-agency-map ──► topics
                                                                               │
Combined topics ──► policy-area-map ──► relevant policyAreas                   │
                                              │                                │
Congress.gov bills ◄──────────────────────────┘                                │
       │                                                                       │
       └──► relevance scoring:                                                 │
            +3  policyArea maps to agency with district spending ◄─────────────┘
            +2  title matches rep's committee topics
            +1  title matches district spending topics
```

The most complex join. Personalizes bill discovery for a congressional district. Uses spending data and representative committee assignments to build a relevance profile, then scores bills against it. Returns bills ranked by how much they matter to that specific district, with explanations for each score.

**Cache:** 6h | **Sources:** congress.gov, usaspending.gov

---

## Shared Infrastructure

Three files power all 10 join endpoints:

### policy-area-map.ts

Maps each of Congress.gov's 32 policy area strings to four other domains:

```
"Armed Forces and National Security" ──► {
  topics: ["defense", "military", "veterans", "national security"],
  industrySectors: [DEFENSE, MISC_BUSINESS],
  agencySlugs: ["department-of-defense", "department-of-veterans-affairs"],
  federalRegisterKeywords: ["defense", "military", "armed forces"]
}
```

This is the central routing table. When a join endpoint needs to translate between domains, it starts here.

### committee-agency-map.ts

Bidirectional mapping between 29 congressional committees and the federal agencies they oversee:

```
HSIF (House Energy and Commerce) ──► [
  { name: "Department of Energy", slug: "department-of-energy" },
  { name: "EPA", slug: "environmental-protection-agency" },
  { name: "FCC", slug: "federal-communications-commission" },
  ...
]
```

Key: `getCommitteesForAgency()` enables the reverse lookup — given an agency, find which committees oversee it. This powers Gaps 1B, 6, and 8.

### types/joins.ts

Standard response envelope for all join endpoints:

```typescript
interface JoinMetadata {
  generatedAt: string;
  dataSources: string[]; // which APIs were actually queried
  joinType: string; // e.g. "bill-spending"
  dataQuality: 'complete' | 'partial' | 'degraded'; // honest about what we got
}
```

Every join response includes `metadata` with these fields, so consumers always know which data sources contributed and whether the response is complete.

---

## Data Quality

Join endpoints never fake data. When an upstream API fails or returns empty:

| Situation               | Behavior                             | dataQuality |
| ----------------------- | ------------------------------------ | ----------- |
| All sources return data | Full response                        | `complete`  |
| Some sources fail       | Partial response with available data | `partial`   |
| Primary source fails    | Empty results with honest metadata   | `degraded`  |
| Missing API key         | 503 with clear error message         | n/a         |

---

## Caching

| Endpoint              | TTL | Why                                 |
| --------------------- | --- | ----------------------------------- |
| Bill votes            | 24h | Votes are final once cast           |
| Bill spending         | 6h  | Awards update throughout the day    |
| Agency bills          | 2h  | New bills introduced frequently     |
| Committee regulations | 3h  | Federal Register publishes daily    |
| Finance jurisdiction  | 12h | FEC data released quarterly         |
| Hearings connections  | 2h  | Hearings added weekly               |
| Policy area search    | 2h  | Aggregation across multiple sources |
| Bill lifecycle        | 1h  | Status changes can happen any time  |
| District bills        | 6h  | Spending + bills relatively stable  |
| Policy area list      | 24h | Reference data, changes never       |

---

## Test Coverage

54 tests across 9 test suites in `src/__tests__/api/joins/`:

| Suite                 | Tests | What it validates                                    |
| --------------------- | ----- | ---------------------------------------------------- |
| bill-votes            | 4     | Vote retrieval, 404/503 errors, metadata             |
| bill-spending         | 5     | Spending joins, API errors, limits, agencies         |
| agency-bills          | 5     | Reverse lookup, policy filtering, empty results      |
| finance-jurisdiction  | 4     | Overlap detection, 404, industry sectors, quality    |
| committee-regulations | 7     | Regulations, 404, case-insensitive, grouping, Senate |
| hearings-connections  | 7     | All 3 filter modes, scoring, topics, errors          |
| policy-area-search    | 6     | Validation, cross-domain results, filtering, errors  |
| bill-lifecycle        | 8     | Status filter, date ranges, chambers, counts         |
| district-bills        | 8     | Relevance scoring, at-large, rep lookup, format      |

---

## External APIs

| API                  | Domain                         | Auth                  | Rate Limit         |
| -------------------- | ------------------------------ | --------------------- | ------------------ |
| Congress.gov v3      | Bills, reps, committees, votes | API key (header)      | 5,000/hr           |
| FEC API              | Campaign finance               | API key (query param) | 1,000/hr           |
| USAspending.gov v2   | Federal spending               | None                  | 1,000/min          |
| Federal Register API | Regulations                    | None                  | No published limit |
| GovInfo API          | Hearings, documents            | API key (query param) | 1,000/hr           |
| Census API           | Demographics, geocoding        | API key (query param) | 500/day            |
| GDELT v2             | News                           | None                  | No published limit |
| Senate.gov XML       | Senate votes                   | None                  | No published limit |
| congress-legislators | Member data                    | None (GitHub)         | No limit           |
