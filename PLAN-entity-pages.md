# Entity Pages for Everything — Implementation Plan

## Vision

Every noun on the site becomes a page. Every entity name becomes a link. A citizen sees "American Petroleum Institute" on a representative's finance tab and clicks through to a page showing every legislator they donated to, every bill they lobbied on, every regulation they commented on, every enforcement action against them. No dead ends. No starting over.

The data for this already exists across the analyzers. There's no new computation — just a new front door to existing data. A PAC page is the pac-vote analyzer's output reorganized around the PAC. A committee page is the lobbying pipeline analyzer reorganized around the committee. An industry page is the sector leaderboard plus enforcement plus regulation data.

This turns the site from a collection of isolated profiles into an actual navigable web.

---

## Current State

| Entity Type       | Page Route                      | Status   | Depth                                                           |
| ----------------- | ------------------------------- | -------- | --------------------------------------------------------------- |
| Representative    | `/representative/[bioguideId]`  | Rich     | Deep — finance, voting, committees, intelligence                |
| Bill              | `/bill/[billId]`                | Rich     | Sponsor, cosponsors, AI summary, intelligence                   |
| Vote              | `/vote/[voteId]`                | Solid    | Vote breakdown, party analysis, crossover voters                |
| Committee         | `/committee/[committeeId]`      | Good     | Members, subcommittees, regs, hearings, Wikipedia, intelligence |
| PAC/FEC Committee | `/influence/[committeeId]`      | Moderate | FEC totals, resolved recipients, financial summary              |
| Industry/Sector   | `/industry/[sector]`            | Thin     | Leaderboard, legislation list, committee list                   |
| Regulation        | `/regulations/[documentNumber]` | Exists   | Needs audit                                                     |
| Topics            | `/topics/[topic]`               | Exists   | 12 topic pages                                                  |

**Missing entity types:**

- Lobbying organizations — appear everywhere, no page
- Federal agencies — referenced in committee data, no dedicated page

**Missing connections:**

- Entity names rendered as plain text, not links
- No way to navigate from a PAC → the lobbying org behind it
- No way to navigate from an industry → top PACs and lobbying orgs in that industry
- Intelligence insights computed but not surfaced on the pages they're about

---

## External Data Sources for Enrichment

We already integrate Wikidata (99% rep coverage), Wikipedia (98% rep coverage, committee pages), FEC, Congress.gov, Federal Register, Census, BLS, Senate LDA, and more. The patterns exist. For entity pages, we can tap additional free sources:

### Already integrated (reuse for new pages)

| Source                   | What it gives us                                                  | Currently used for                           |
| ------------------------ | ----------------------------------------------------------------- | -------------------------------------------- |
| **Wikidata SPARQL**      | Structured bios, founding dates, logos, headquarters, parent orgs | Representatives, state executives, judiciary |
| **Wikipedia REST API**   | Summaries, images, history, related entities                      | Representatives, committees                  |
| **FEC API**              | PAC financials, disbursements, contributor data                   | Influence pages, finance tabs                |
| **Senate LDA API**       | Lobbying filings, issues, spending, government targets            | Influence chain analyzer, lobbying pipeline  |
| **Federal Register API** | Regulations, rulemakings, agency actions                          | Regulation analyzer, committee pages         |
| **EPA ECHO / OSHA API**  | Enforcement actions by company, SIC code, state                   | Enforcement analyzer                         |
| **SEC EDGAR**            | SIC codes for ticker-to-sector resolution                         | Stock-committee analyzer                     |

### New sources to integrate

| Source                            | What it gives us                                                                                  | Free?                   | Use for                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| **Wikidata (expanded)**           | Org descriptions, founding dates, HQ locations, logos, parent companies, industry classifications | Yes                     | Lobbying org pages, PAC pages, agency pages                                |
| **Wikipedia (expanded)**          | Org summaries, history, key people, controversies section                                         | Yes                     | Any entity with a Wikipedia article                                        |
| **ProPublica Nonprofit Explorer** | 990 tax filings for nonprofits — revenue, expenses, executive compensation                        | Yes, API                | PACs organized as 501(c)(4)s, trade associations                           |
| **Regulations.gov API**           | Public comments on regulations — who commented, positions taken                                   | Yes, API key            | Lobbying org pages (which regs they commented on)                          |
| **OpenCorporates**                | Company registry data — jurisdiction, status, officers, filings                                   | Free tier (limited)     | Verifying lobbying org / PAC parent company identity                       |
| **USASpending.gov (expanded)**    | Federal contracts and grants by recipient org                                                     | Yes, already integrated | Agency pages, lobbying org pages (do they also receive federal contracts?) |
| **IRS Exempt Org data**           | Tax-exempt status, EIN, ruling date, asset size                                                   | Yes, bulk download      | PAC/nonprofit classification and size                                      |

### The Wikipedia/Wikidata pattern

We already have this working for representatives and committees. The same pattern applies to any entity with a Wikidata Q-ID:

1. Look up entity in Wikidata by name/identifier → get Q-ID
2. SPARQL query for structured fields (founding date, HQ, parent org, logo, website, description)
3. Wikipedia REST API for summary paragraph and image
4. Cache aggressively (org data changes rarely — 30-day TTL)
5. Display with `DataSourceAttribution` component (medium reliability for Wikipedia/Wikidata)

For lobbying orgs and major PACs, Wikidata coverage is high for well-known entities (American Petroleum Institute, NRA, Planned Parenthood, Chamber of Commerce) and nonexistent for small ones. That's fine — show the enrichment when available, fall back to pure LDA/FEC data when not.

---

## Phase 1: EntityLink Component Family (~1 hr)

Before building new pages, create the linking infrastructure so every page can point to every other page.

### Components

```tsx
// src/components/shared/links/EntityLinks.tsx

<RepLink bioguideId="G000386" name="Chuck Grassley" />
<CommitteeLink code="SSJU" name="Judiciary" />
<BillLink billId="hr-1234-119" title="Defense Spending Act" />
<PACLink committeeId="C00123456" name="National Beer Wholesalers PAC" />
<LobbyLink registrantId="12345" name="American Petroleum Institute" />
<SectorLink sector="Defense" />
<RegulationLink documentNumber="2024-12345" title="Clean Air Standards" />
<VoteLink voteId="h-123-2024" label="Roll Call #123" />
```

### Behavior

- Blue text, consistent with Aicher design system link color (#3ea2d4)
- If ID is missing/null, render as plain text (never a broken link)
- Proper `<Link>` with prefetch for internal navigation
- Compact — no icons, no decoration, just a colored text link that fits inline

### Why this comes first

Every subsequent phase needs these components. Building them first means every new page and every enrichment can use them immediately.

---

## Phase 2: Lobbying Organization Pages (~4-5 hrs)

### Why this is the priority

Lobbying orgs are the most important missing node. They appear in:

- Influence chain analysis ("Organization X lobbied for bill Y")
- Lobbying pipeline analysis ("$2.1M in lobbying targeted this committee")
- Bill intelligence ("3 organizations lobbied for this bill")

But clicking any of those names is a dead end today.

### Route: `/lobby/[registrantId]/page.tsx`

### Data assembly (API route: `/api/lobby/[registrantId]`)

**Core data (Senate LDA — already available):**

- `lobbyingService.getFilingsByRegistrant(registrantId)` — all filings
- From filings: total spending, filing count, issue codes, government entities targeted, lobbyists employed
- Historical spending by year

**Cross-referenced data (existing services):**

- Entity resolution → match to FEC committee ID if parent org has a PAC
- Committee-agency map → resolve government_entities to committee codes
- Congress.gov bills → bills matching the org's lobbying issue codes
- Enforcement analyzer → EPA/OSHA actions against this org (by name match)

**External enrichment (new):**

- Wikidata SPARQL → description, founding date, HQ, logo, parent org, website
- Wikipedia REST API → summary paragraph, image
- ProPublica Nonprofit Explorer → 990 data if nonprofit (revenue, assets, exec compensation)

### Page sections

1. **Identity header**
   - Name, description (from Wikidata/Wikipedia or "Lobbying organization registered with the U.S. Senate")
   - Founded, headquarters, website, parent org (if Wikidata has it)
   - Total lobbying spending (current cycle + all time)
   - Number of filings, number of lobbyists employed
   - PAC badge: if entity resolution links to a FEC committee, show "Also operates [PAC Name]" with `<PACLink>`

2. **Issues & legislation**
   - LDA issue codes grouped and labeled (e.g., "Energy/Nuclear", "Trade", "Defense")
   - For each issue area: bills in current Congress matching that issue code
   - Each bill rendered with `<BillLink>`, showing title, status, sponsor with `<RepLink>`
   - This answers: "What specific legislation is this organization trying to influence?"

3. **Government targets**
   - Committees targeted (from LDA government_entities field)
   - Each committee with `<CommitteeLink>`, showing number of filings targeting it
   - Agencies targeted (resolved via committee-agency-map)
   - This answers: "Who in government are they talking to?"

4. **Connected legislators**
   - If PAC exists: representatives who received donations from the PAC
   - Each rep with `<RepLink>`, party, state, amount received, committee overlap
   - Sorted by amount, showing whether the rep sits on a targeted committee
   - If no PAC: show committee members of targeted committees (different framing: "Legislators on committees this organization lobbies")
   - This answers: "Which legislators are connected to this organization?"

5. **Enforcement & regulatory activity**
   - EPA/OSHA enforcement actions against this org (by name match via entity resolution)
   - Regulations.gov comments filed by this org (if we integrate that API)
   - Federal Register regulations affecting this org's sector
   - This answers: "Is this organization also subject to government oversight?"

6. **Historical spending chart**
   - Simple bar chart of lobbying spending by year (from LDA filings grouped by year)
   - Shows trend — increasing, decreasing, stable

### What makes this NOT slop

The LDA data alone (filings, spending) is on Senate.gov. OpenSecrets repackages it. That's not unique.

**Our unique value:**

- Cross-referencing lobbying targets with committee members' campaign funding from the same org's PAC
- Matching lobbying issue codes to specific bills in Congress and showing their status
- Connecting the lobbying side to the enforcement side (are they lobbied AND regulated?)
- Entity resolution linking the lobbying entity to its PAC and its regulated subsidiaries

**Quality gates:**

- Minimum 3 sections with real data to publish
- Minimum 5 outbound entity links
- Schema.org `Organization` JSON-LD
- `generateMetadata` with org name, spending, top issues
- Breadcrumb: Home > Lobbying > [Org Name]
- Data source attribution for every section

### Schema.org markup

```json
{
  "@type": "Organization",
  "name": "American Petroleum Institute",
  "description": "...",
  "foundingDate": "1919",
  "address": { "@type": "PostalAddress", "addressLocality": "Washington", "addressRegion": "DC" },
  "url": "https://www.api.org",
  "sameAs": ["https://www.wikidata.org/wiki/Q466889"],
  "memberOf": { "@type": "GovernmentOrganization", "name": "Senate Lobbying Disclosure" }
}
```

---

## Phase 3: Industry/Sector Page Enrichment (~3-4 hrs)

### Current state

The `/industry/[sector]` page is the thinnest entity page. It shows a leaderboard, a legislation list, and a committee list. It's a client component with SWR. No Wikipedia/Wikidata enrichment. No enforcement. No lobbying. No PACs.

### What to add

1. **Sector overview** (new section, top of page)
   - Wikipedia summary for the industry (e.g., "Defense industry in the United States")
   - Total political spending in this sector (from FEC aggregate data)
   - Total lobbying spending (from LDA filings filtered by issue codes mapping to this sector)
   - Number of active PACs, lobbying orgs

2. **Top PACs in this sector** (new section)
   - PACs classified into this sector via `categorizePACByName`
   - Each with `<PACLink>`, total disbursements, recipient count
   - Answers: "Who are the major political donors in this industry?"

3. **Top lobbying organizations** (new section)
   - Lobbying registrants whose filings match this sector's issue codes
   - Each with `<LobbyLink>`, total spending, number of filings
   - Answers: "Who is lobbying on behalf of this industry?"

4. **Enforcement landscape** (new section)
   - Enforcement actions from enforcement-analyzer with sector scope
   - Total actions, total penalties, trend (increasing/decreasing)
   - Top enforced companies with entity links
   - Answers: "How heavily regulated/enforced is this industry?"

5. **Regulatory activity** (new section)
   - Active rulemakings from Federal Register filtered by sector's agencies
   - Each regulation with `<RegulationLink>`
   - Answers: "What rules are being written that affect this industry?"

### Data sources

All existing — enforcement-analyzer, lobbying-pipeline data, FEC sector classification, Federal Register API. The only new data call is the Wikipedia/Wikidata summary for the sector.

### Structured data upgrade

Currently `CollectionPageSchema`. Add `about` with industry topic, add `hasPart` linking to sub-entities (top PACs, committees, legislation).

---

## Phase 4: PAC Page Enrichment (~2-3 hrs)

### Current state

`/influence/[committeeId]` shows FEC committee info, financial totals, and resolved recipients with links to representative profiles. No intelligence layer data. No sector classification. No lobbying connection.

### What to add

1. **Sector & classification** (new section or header enrichment)
   - Industry sector from `categorizePACByName` with `<SectorLink>`
   - PAC type explanation (e.g., "Connected PAC" = corporate-affiliated, "Non-Connected" = ideological)
   - Wikidata/Wikipedia summary of parent organization if available

2. **Voting alignment** (new section — from pac-vote-analyzer)
   - Aggregate yea rate on sector-relevant bills across all recipients
   - Comparison to party baseline
   - Peer comparison to other PACs in same sector
   - Narrative from pac-vote-analyzer

3. **Connected lobbying org** (new section)
   - If entity resolution matches this PAC to a lobbying registrant, show `<LobbyLink>` with lobbying spending
   - Show overlapping issue areas between lobbying activity and PAC sector
   - Answers: "Does this PAC's parent organization also lobby?"

4. **Recipient details enrichment**
   - Add committee membership info per recipient (which committees do they sit on?)
   - Flag recipients who sit on committees relevant to PAC's sector
   - Add `<SectorLink>` and `<CommitteeLink>` references

### Schema.org

Change from `GovernmentOrganizationSchema` to `OrganizationSchema`. Add `funder` relationship to recipient legislators.

---

## Phase 5: Cross-Linking Audit (~3-4 hrs)

### Principle

After all entity pages exist and are enriched, do a systematic audit of every entity page to ensure every noun is a link.

### Audit checklist

#### Representative page

- [ ] Committee names → `<CommitteeLink>`
- [ ] Bill titles in BillsTab → `<BillLink>`
- [ ] PAC/donor names in FinanceTab → `<PACLink>`
- [ ] Industry sectors in FinanceTab → `<SectorLink>`
- [ ] Lobbying org names in influence chain card → `<LobbyLink>`
- [ ] Vote roll calls in VotingTab → `<VoteLink>`

#### Bill page

- [ ] Sponsor → `<RepLink>`
- [ ] Cosponsors → `<RepLink>`
- [ ] Committee assignments → `<CommitteeLink>`
- [ ] Policy area → `<SectorLink>` or topic link
- [ ] Lobbying orgs (from bill intelligence) → `<LobbyLink>`
- [ ] Vote results → `<VoteLink>`

#### Committee page

- [ ] Members → `<RepLink>` (likely already linked)
- [ ] Bills in pipeline → `<BillLink>`
- [ ] Lobbying orgs (from intelligence) → `<LobbyLink>`
- [ ] Regulations → `<RegulationLink>`
- [ ] Jurisdiction sectors → `<SectorLink>`

#### PAC page

- [ ] Recipients → `<RepLink>` (likely already linked)
- [ ] Sector → `<SectorLink>`
- [ ] Parent lobbying org → `<LobbyLink>`

#### Industry page

- [ ] Leaderboard reps → `<RepLink>`
- [ ] Committees → `<CommitteeLink>`
- [ ] Legislation → `<BillLink>`
- [ ] Top PACs → `<PACLink>`
- [ ] Top lobbying orgs → `<LobbyLink>`

---

## Phase 6: Schema.org & SEO Quality (~2 hrs)

### Structured data audit

| Page           | Current Schema         | Add/Fix                                                            |
| -------------- | ---------------------- | ------------------------------------------------------------------ |
| Representative | ProfilePage, Person    | `memberOf` → committees, `funder` → top donors                     |
| Bill           | Legislation            | `sponsor` → Person, `legislationPassedBy` → GovernmentOrganization |
| Vote           | LegislativeEvent       | `about` → Legislation link                                         |
| Committee      | GovernmentOrganization | `member` → Person[], `subOrganization`                             |
| PAC            | GovernmentOrganization | Change to Organization, add `funder`                               |
| Industry       | CollectionPage         | Add `about` with industry topic                                    |
| Lobby Org      | (new)                  | Organization with structured fields                                |
| Regulation     | (audit)                | Legislation or CreativeWork                                        |

### Internal link graph quality

Target: every entity page has **minimum 5 outbound** entity links and **minimum 3 inbound** entity links.

Validation script: `scripts/validate-entity-links.ts` — renders each entity page type, counts entity links, flags pages below threshold.

### Anti-slop quality gates

A page must have:

- 3+ sections with real data (not just an empty state)
- 5+ outbound entity links to other CIV.IQ pages
- Narrative or contextual text (not just data tables)
- Schema.org JSON-LD markup
- `generateMetadata` with entity-specific title and description
- Data source attribution
- Breadcrumb navigation

Pages that don't meet these gates show an "insufficient data" message instead of publishing thin content.

---

## Execution Order

| Phase | Work                            | Time    | Depends On |
| ----- | ------------------------------- | ------- | ---------- |
| 1     | EntityLink component family     | 1 hr    | Nothing    |
| 2     | Lobbying org API + page         | 4-5 hrs | Phase 1    |
| 3     | Industry page enrichment        | 3-4 hrs | Phase 1    |
| 4     | PAC page enrichment             | 2-3 hrs | Phase 1    |
| 5     | Cross-linking audit (all pages) | 3-4 hrs | Phases 2-4 |
| 6     | Schema.org audit + validation   | 2 hrs   | Phase 5    |

**Total: ~16-19 hrs across 6 phases.**

Phase 1 is the foundation. Phases 2-4 can partially overlap (different pages). Phase 5 must come after all pages are enriched. Phase 6 is the final polish.

---

## What Success Looks Like

A citizen enters their address. They see their representative's page. They notice "Defense: $145,000" linked to the Defense industry page. They click through. They see the sector leaderboard, top PACs, and a lobbying org — American Petroleum Institute. They click API's lobbying page. They see API lobbied the Armed Services Committee on 3 energy bills, and their PAC donated to 12 committee members. They click one of those bills. They see the vote breakdown and the sponsor's funding context.

Five pages. Zero dead ends. Every click revealed a connection they didn't know existed. They never used search. They never needed to know what to look for.

That's the navigable web of civic information.
