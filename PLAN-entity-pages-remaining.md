# Entity Pages — Remaining Implementation Plan

## Context

PLAN-entity-pages.md defined 6 phases. Phases 1-4 are substantially complete. Phase 5 (cross-linking) is ~60% done. Phase 6 (Schema.org) is ~30% done. This document covers the 4 highest-impact remaining gaps, plus a summary of known lower-priority gaps.

**Reference commits**:

- `bf1acf7e` — Initial 6-phase implementation
- `6a870842` — Audit gap fixes: registrantId propagation, Wikidata enrichment, cross-linking
- Next commit — Lobby page sections (bills, PAC recipients, enforcement), comprehension rewrites, party-null fix

---

## Item 1+2: Industry Page Major Organizations + Sector Metrics

### Problem

The industry page "Major Organizations" section currently keyword-searches FEC for the sector name (e.g., searches "Defense" in PAC names). This is semantically wrong — it returns PACs with "Defense" in the name, not PACs _classified_ in the defense sector. The existing `categorizePACByName()` function does proper sector classification but isn't used here.

Also completely missing: top lobbying registrants with `<LobbyLink>`.

Also missing from sector overview: total political spending, total lobbying spending, count of active PACs and lobbying orgs. Without these numbers, citizens have no sense of scale.

### Architecture

**New endpoint**: `GET /api/industry/[sector]/organizations`

```typescript
interface IndustryOrganizationsResponse {
  topPACs: Array<{
    committeeId: string;
    name: string;
    sector: string;
    totalDisbursements: number;
  }>;
  topLobbyingOrgs: Array<{
    registrantId: string;
    name: string;
    totalSpending: number;
    filingCount: number;
  }>;
  metrics: {
    totalLobbyingSpending: number;
    activePACCount: number;
    activeLobbyingOrgCount: number;
  };
  metadata: {
    generatedAt: string;
    dataSources: string[];
  };
}
```

### PAC data flow

1. FEC search by sector name via `fecApiService.searchCommittees(sectorName)` — gets ~20 candidates
2. Run `categorizePACByName()` on each result
3. Keep only those where classified sector matches requested sector
4. `total_disbursements` is already in `FECCommitteeSearchResult`
5. Sort by disbursements, take top 10

### Lobbying org data flow

1. Build sector → LDA issue codes mapping:
   - `getAllLDAIssueCodes()` returns all ~200 codes
   - For each code, `getPolicyAreasForLDAIssue(code)` returns Congress.gov policy areas
   - For each policy area, `getIndustrySectorsForPolicyArea(area)` returns sectors
   - If our sector is in the list, this code matches
2. Take the top 3 matched LDA issue codes
3. For each, fetch from Senate LDA API: `lda.senate.gov/api/v1/filings/?general_issue_code=XXX&page_size=50`
4. Aggregate by registrant: name, registrant.id, total spending (income or expenses), filing count
5. Self-lobbying detection: if `registrant.name === client.name`, store `registrant.id` as the registrantId for linking
6. Sort by spending, take top 10

### Metrics

Computed from the fetched data:

- `totalLobbyingSpending`: sum of all matched filings' spending
- `activePACCount`: count of PACs that passed sector classification
- `activeLobbyingOrgCount`: count of unique registrants in matched filings

### Cache

24 hours via `cachedFetch`. Response headers: `s-maxage=86400, stale-while-revalidate=3600`.

### Files to create

- `src/app/api/industry/[sector]/organizations/route.ts`

### Files to modify

- `src/app/(civic)/industry/[sector]/IndustrySectorClient.tsx`:
  - Replace current SWR call to `/api/influence/search?q=SECTOR` with `/api/industry/[sector]/organizations`
  - Render PACs with `<PACLink>` + disbursement amount
  - Add lobbying registrants subsection with `<LobbyLink>` + spending + filing count
  - Add section intro per plan: "These are the largest political action committees and lobbying organizations active in [sector], based on public FEC and Senate disclosure filings."
  - Add metrics (spending totals, org counts) to the sector overview `<div>` at top of page

### Imports needed

```typescript
// In the API route:
import { categorizePACByName, IndustrySector } from '@/lib/fec/industry-taxonomy';
import { fecApiService } from '@/lib/fec/fec-api-service';
import {
  getAllLDAIssueCodes,
  getPolicyAreasForLDAIssue,
} from '@/lib/intelligence/entity-resolution/lda-issue-policy-map';
import { getIndustrySectorsForPolicyArea } from '@/lib/connections/policy-area-map';
import { cachedFetch } from '@/lib/cache';
```

### Sector → LDA issue code helper

```typescript
function getSectorIssueCodes(sector: IndustrySector): string[] {
  const codes: string[] = [];
  for (const code of getAllLDAIssueCodes()) {
    const areas = getPolicyAreasForLDAIssue(code);
    if (!areas) continue;
    for (const area of areas) {
      if (getIndustrySectorsForPolicyArea(area).includes(sector)) {
        codes.push(code);
        break;
      }
    }
  }
  return codes;
}
```

### Sector parsing

Reuse the `parseSector()` function from the existing `/api/industry/[sector]/connections/route.ts`:

```typescript
function parseSector(input: string): IndustrySector | null {
  const normalized = decodeURIComponent(input).toLowerCase().replace(/-/g, ' ');
  for (const value of Object.values(IndustrySector)) {
    if (value.toLowerCase() === normalized) return value;
    if (value.toLowerCase().replace(/[/&]/g, ' ') === normalized) return value;
  }
  return null;
}
```

---

## Item 3: PAC Parent Organization Wikipedia Summary

### Problem

A citizen sees "LOCKHEED MARTIN EMPLOYEES POLITICAL ACTION COMMITTEE" and doesn't know what Lockheed Martin is. The plan calls for a Wikipedia summary of the parent organization to provide context.

### Implementation

**In `src/app/(civic)/influence/[committeeId]/page.tsx`** (server component):

1. Derive parent org name from PAC name by stripping suffixes:

```typescript
const parentOrgName = profile.committee.name
  .replace(/\s+(PAC|POLITICAL ACTION COMMITTEE|FUND|COMMITTEE)$/i, '')
  .replace(/\s+(FOR GOOD GOVERNMENT|FOR AMERICA|EMPLOYEES?)$/i, '')
  .trim();
```

2. Fetch Wikipedia summary server-side (same pattern as industry page):

```typescript
async function fetchWikiSummary(orgName: string): Promise<string | null> {
  try {
    // Wikipedia search API → get first result title
    // Wikipedia extracts API → get intro paragraph (explaintext, max 400 chars)
    // 5-second timeout, return null on failure
  } catch {
    return null;
  }
}
```

3. Pass as prop to client:

```tsx
<CommitteeProfileClient
  profile={profile}
  sector={classification?.sector ?? null}
  pacTypeExplanation={pacTypeExplanation}
  parentOrgSummary={parentOrgSummary} // new prop
/>
```

**In `CommitteeProfileClient.tsx`**:

4. Accept new `parentOrgSummary?: string | null` prop
5. Render in the existing "Sector & PAC Type" section, after the type explanation:

```tsx
{
  parentOrgSummary && (
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
      {parentOrgSummary}
    </p>
  );
}
```

### Why server-side

Wikipedia fetch makes 2 external API calls (search + extract). Server-side with ISR means citizens don't see a loading spinner, and the result is cached via Next.js revalidation.

### Data source attribution

Add `WikipediaAttribution` (or generic `DataSourceAttribution` for Wikipedia) to the section when `parentOrgSummary` is non-null.

---

## Item 4: PAC Voting Alignment Section Intro

### Problem

The PAC vote data renders via `InsightCard` + `PACVoteTable` components, but there's no section framing that explains _what this means_ to a citizen. The plan specifies a formal section with intro text.

### Implementation

**In `CommitteeProfileClient.tsx`**, find:

```tsx
{/* PAC Vote Intelligence */}
{pacInsight && pacInsight.recipientVotes && (
  <div className="space-y-4">
    <InsightCard ... />
    <PACVoteTable ... />
  </div>
)}
```

Replace with:

```tsx
{/* Voting alignment */}
{pacInsight && pacInsight.recipientVotes && (
  <div className="space-y-4">
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Voting alignment
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        This shows how legislators who received contributions from this PAC voted on
        bills related to the PAC's policy area, compared to the overall average.
        Alignment does not prove influence — it shows a pattern worth understanding.
      </p>
    </div>
    <InsightCard ... />
    <PACVoteTable ... />
  </div>
)}
```

### Why this matters

Without the intro, a citizen sees a table of vote percentages with no context. The intro reframes it as: "here's a pattern, here's what it means, here's the caveat." This is the difference between data and comprehension.

---

## Lower-Priority Known Gaps (not in this plan)

These are documented for future work. They are either diminishing returns, blocked by data model gaps, or require new external API integrations.

| Gap                                                         | Why deferred                                                                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Industry: Federal Register regulations with RegulationLink  | Requires new Federal Register API integration filtered by sector's agencies. The industry connections API already fetches bills but not rulemakings. ~2 hrs, partially blocked.             |
| Industry: Enforcement org names can't link (no IDs in data) | The enforcement analyzer returns org names but no registrant IDs or entity identifiers. Would need to enrich the enforcement API response with entity resolution. ~1 hr, data model change. |
| PAC: Recipient committee memberships per row                | Requires calling `getEnhancedRepresentative` for each of ~15 recipients to get committee data. Expensive (15 API calls). Could batch but adds latency. ~1 hr.                               |
| Bill page: Lobbying organizations section                   | No existing endpoint returns lobbying orgs for a specific bill. Would need: bill → policy area → LDA issue codes → filter filings → show orgs. New section + new API. ~2 hrs.               |
| Committee page: Related bills section                       | Committee pages show intelligence data but not a dedicated bills-in-pipeline section. Would need Congress.gov bill fetch filtered by committee. ~1 hr.                                      |
| Committee page: Lobbying orgs section                       | The InfluenceChainTable already shows lobbying orgs via the intelligence layer. A dedicated section would be redundant unless reformatted for citizen comprehension. Low priority.          |
| Phase 6: `scripts/validate-entity-links.ts`                 | Plan calls for a validation script that counts inbound/outbound entity links per page and flags pages below threshold (5 outbound, 3 inbound). Infrastructure, not user-facing.             |
| Phase 6: Bill schema missing `sponsor` field                | `LegislationSchema` in `JsonLd.tsx` doesn't include the sponsor Person. Minor SEO gap.                                                                                                      |
| VotingTab: Bills link to Congress.gov externally            | Intentional — vote-specific context requires the external source. Not a gap.                                                                                                                |

---

## Validation Checklist

After implementing Items 1-4, run:

```bash
npx tsc --noEmit          # Zero type errors
npx eslint src/ --quiet   # Zero lint errors
npx jest influence-chain lobbying-pipeline  # 28/28 tests pass
npm run build             # Clean build, all routes present
```

Verify new route exists: `/api/industry/[sector]/organizations`

Verify on industry page: Major Organizations section shows PACs with PACLink and lobbying registrants with LobbyLink.

Verify on PAC page: Parent org Wikipedia summary appears in Sector & Classification section.

Verify on PAC page: Voting alignment section has intro text framing the data.
