# Entity Pages for Everything — Implementation Plan

## Vision

Every noun on the site becomes a page. Every entity name becomes a link. A citizen sees "American Petroleum Institute" on a representative's finance tab and clicks through to a page that explains what that organization is, what it advocates for, and how it engages with Congress — all from public government records. No dead ends. No starting over. No jargon.

The data for this already exists across the analyzers. There's no new computation — just a new front door to existing data. A PAC page is the pac-vote analyzer's output reorganized around the PAC. A committee page is the lobbying pipeline analyzer reorganized around the committee. An industry page is the sector leaderboard plus enforcement plus regulation data.

This turns the site from a collection of isolated profiles into an actual navigable web.

## Binding Principle

CIV.IQ organizes government data that exists publicly on many different websites, and makes it easier to understand for the average citizen. Both halves matter equally. A page that organizes data but doesn't help a citizen understand it is incomplete. Every entity page must:

1. **Present public government records** from their original sources (Senate LDA, FEC, Congress.gov, Federal Register, EPA ECHO, etc.), attributed and linked.
2. **Explain what the data means** in plain language at a Flesch-Kincaid grade level of 8 or below — the same standard the intelligence layer already enforces.
3. **Define terms a non-expert wouldn't know.** "LD-2 disclosure" means nothing. "Quarterly lobbying report filed with the U.S. Senate" does.
4. **Lead with comprehension, follow with detail.** Each section opens with a plain-language summary of what it shows and why it matters, then presents the data.
5. **Use the intelligence layer's existing rules.** No causation claims. Confidence and methodology disclosed. Data source attribution on every section.

## Page Tiers

Not every entity has enough data to justify a full page. Publishing a page with just a name and a spending number isn't making government data easier to understand — it's thin content.

**Full page** — Entity has enough data for 3+ sections with real content, 5+ outbound entity links, and a meaningful plain-language summary. Gets a dedicated route and full page treatment.

**Info card** — Entity exists in the data but doesn't meet the full page threshold. Rendered as an expandable inline card wherever the entity appears (e.g., on a representative's finance tab or a committee's lobbying section). Shows what's available — name, total spending, issue areas — without pretending it's a complete page. Links to the original government data source (Senate LDA search, FEC lookup).

For lobbying organizations: the ~500-1,000 most active registrants (by filing count and spending) will likely qualify for full pages. The remaining ~11,000 get info cards. The quality gate is automated but the threshold is honest — we'd rather show a useful card than a hollow page.

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

| Source                         | What it gives us                                                                                  | Free?                   | Use for                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------- |
| **Wikidata (expanded)**        | Org descriptions, founding dates, HQ locations, logos, parent companies, industry classifications | Yes                     | Lobbying org pages, PAC pages, agency pages                          |
| **Wikipedia (expanded)**       | Org summaries, history, key people                                                                | Yes                     | Any entity with a Wikipedia article                                  |
| **Regulations.gov API**        | Public comments on regulations — who commented, positions taken                                   | Yes, API key            | Lobbying org pages (what regulations this org publicly commented on) |
| **USASpending.gov (expanded)** | Federal contracts and grants by recipient org                                                     | Yes, already integrated | Agency pages, lobbying org pages                                     |
| **IRS Exempt Org data**        | Tax-exempt status, EIN, ruling date, asset size                                                   | Yes, bulk download      | PAC/nonprofit classification and size                                |

### Future / if needed

These sources don't directly serve the comprehension goal but could be useful later for entity verification or deeper enrichment:

| Source                            | What it gives us                                                | Why deferred                                                                                                         |
| --------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **ProPublica Nonprofit Explorer** | 990 tax filings — revenue, expenses, executive compensation     | Exec compensation and financial internals serve investigative use cases, not civic comprehension. Revisit if needed. |
| **OpenCorporates**                | Company registry data — jurisdiction, status, officers, filings | Useful as backend entity verification, not as citizen-facing content. Integrate as internal plumbing if needed.      |

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

### Comprehension goal

After visiting a lobbying org page, a citizen understands: what this organization is, what policy areas it advocates for, how much it spends on lobbying, and which parts of Congress it engages with. A citizen who has never heard of lobbying disclosures should leave this page knowing more than when they arrived.

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

### Entity resolution confidence

Cross-references that rely on entity resolution (lobbying org → PAC, lobbying org → enforcement target) must communicate match quality to the citizen:

- **High confidence (≥ 0.8)**: Present the connection directly. "This organization also operates the [PAC Name] political action committee."
- **Moderate confidence (0.6–0.8)**: Qualify the language. "This organization appears to be associated with [PAC Name] based on name matching."
- **Below 0.6**: Do not display the connection. The match isn't reliable enough to present as fact.

This uses the existing confidence constants in `confidence-constants.ts`. The citizen doesn't see a number — they see honest language.

### Page sections

Each section opens with a plain-language summary explaining what the section shows and why it matters, before presenting the data. All narrative text must meet Flesch-Kincaid grade ≤ 8.

1. **Identity header**
   - Name, description (from Wikidata/Wikipedia or "Lobbying organization registered with the U.S. Senate")
   - Plain-language explanation of what lobbying disclosure means: "Organizations that lobby the federal government are required to file public reports with the U.S. Senate. This page shows [Org Name]'s public filings."
   - Founded, headquarters, website, parent org (if Wikidata has it)
   - Total lobbying spending (current cycle + all time)
   - Number of filings, number of lobbyists employed
   - PAC badge: if entity resolution links to a FEC committee (confidence ≥ 0.8), show "Also operates [PAC Name]" with `<PACLink>`. If 0.6–0.8, show "May be associated with [PAC Name]."

2. **Issues & legislation**
   - Section intro: "These are the policy areas [Org Name] reported lobbying on, and bills in Congress related to those areas."
   - LDA issue codes grouped and labeled in plain language (e.g., "Energy and nuclear power", "International trade", "National defense") — not raw codes
   - For each issue area: bills in current Congress matching that issue code
   - Each bill rendered with `<BillLink>`, showing title, status, sponsor with `<RepLink>`
   - This answers: "What policy areas does this organization advocate for?"

3. **Congressional activity**
   - Section intro: "These are the committees and agencies [Org Name] reported contacting in its lobbying filings."
   - Committees contacted (from LDA government_entities field — this is a self-reported field in the org's own filings)
   - Each committee with `<CommitteeLink>`, showing number of filings mentioning it
   - Agencies contacted (resolved via committee-agency-map)
   - This answers: "Which parts of Congress and the federal government does this organization engage with?"

4. **PAC activity** (only if entity resolution links to a FEC committee)
   - Section intro: "This organization also operates a political action committee (PAC), which makes campaign contributions to candidates for federal office. PAC contributions are reported to the Federal Election Commission."
   - Representatives who received contributions from the PAC
   - Each rep with `<RepLink>`, party, state, amount received
   - This answers: "Which candidates has this organization's PAC contributed to?"
   - Note: committee overlap information is available on each representative's own page — no need to re-derive it here

5. **Enforcement & regulatory activity**
   - Section intro: "These are federal enforcement actions involving [Org Name] from EPA and OSHA public records."
   - EPA/OSHA enforcement actions against this org (subject to entity resolution confidence thresholds above)
   - Regulations.gov comments filed by this org (if we integrate that API) — framed as: "Public comments [Org Name] submitted on proposed federal regulations"
   - Federal Register regulations affecting this org's sector
   - This answers: "Is this organization also subject to federal regulation?"

6. **Historical spending chart**
   - Section intro: "[Org Name]'s reported lobbying spending over time, from Senate disclosure filings."
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

### Comprehension goal

After visiting an industry page, a citizen understands: what this sector is, how much political activity it generates, who the major organizations are, and what legislation and regulation is currently relevant to it. This page makes a complex policy area approachable.

### Current state

The `/industry/[sector]` page is the thinnest entity page. It shows a leaderboard, a legislation list, and a committee list. It's a client component with SWR. No Wikipedia/Wikidata enrichment. No enforcement. No lobbying. No PACs.

### What to add

All sections open with a plain-language summary (Flesch-Kincaid grade ≤ 8).

1. **Sector overview** (new section, top of page)
   - Wikipedia summary for the industry (e.g., "Defense industry in the United States")
   - Plain-language context: what this industry does, why it interacts with government
   - Total political spending in this sector (from FEC aggregate data)
   - Total lobbying spending (from LDA filings filtered by issue codes mapping to this sector)
   - Number of active PACs, lobbying orgs

2. **Major organizations** (new section)
   - Top PACs classified into this sector via `categorizePACByName`, each with `<PACLink>`, total disbursements, recipient count
   - Top lobbying registrants whose filings match this sector's issue codes, each with `<LobbyLink>`, total spending, number of filings
   - Section intro: "These are the largest political action committees and lobbying organizations active in [sector], based on public FEC and Senate disclosure filings."

3. **Enforcement landscape** (new section)
   - Section intro: "Federal agencies enforce regulations in this sector. This is a summary of recent enforcement activity from EPA and OSHA public records."
   - Enforcement actions from enforcement-analyzer with sector scope
   - Total actions, total penalties, trend (increasing/decreasing)
   - Top enforced companies with entity links

4. **Regulatory activity** (new section)
   - Section intro: "These are active and recent federal regulations being written or updated that affect the [sector] sector."
   - Active rulemakings from Federal Register filtered by sector's agencies
   - Each regulation with `<RegulationLink>`

### Data sources

All existing — enforcement-analyzer, lobbying-pipeline data, FEC sector classification, Federal Register API. The only new data call is the Wikipedia/Wikidata summary for the sector.

### Structured data upgrade

Currently `CollectionPageSchema`. Add `about` with industry topic, add `hasPart` linking to sub-entities (top PACs, committees, legislation).

---

## Phase 4: PAC Page Enrichment (~2-3 hrs)

### Comprehension goal

After visiting a PAC page, a citizen understands: what a PAC is, what type of PAC this is, what industry it's associated with, who it has contributed to, and whether a related organization also lobbies Congress. A citizen who has never heard of a PAC should leave understanding this one.

### Current state

`/influence/[committeeId]` shows FEC committee info, financial totals, and resolved recipients with links to representative profiles. No intelligence layer data. No sector classification. No lobbying connection.

### What to add

1. **Sector & classification** (new section or header enrichment)
   - Industry sector from `categorizePACByName` with `<SectorLink>`
   - PAC type explanation in plain language (e.g., "This is a Connected PAC, meaning it is affiliated with a corporation or trade association. It raises money from the organization's employees and members." vs. "This is a Non-Connected PAC, meaning it raises money around a cause or ideology rather than a specific company.")
   - Wikidata/Wikipedia summary of parent organization if available

2. **Voting alignment** (new section — from pac-vote-analyzer)
   - Section intro: "This shows how legislators who received contributions from this PAC voted on bills related to the PAC's policy area, compared to the overall average."
   - Aggregate yea rate on sector-relevant bills across all recipients
   - Comparison to party baseline
   - Peer comparison to other PACs in same sector
   - Narrative from pac-vote-analyzer (existing intelligence layer output, already Flesch-Kincaid validated)

3. **Related lobbying activity** (new section)
   - If entity resolution matches this PAC to a lobbying registrant (subject to confidence thresholds from Phase 2), show `<LobbyLink>` with lobbying spending
   - Section intro: "The organization behind this PAC also files lobbying disclosures with the U.S. Senate."
   - Show overlapping issue areas between lobbying activity and PAC sector

4. **Recipient details enrichment**
   - Add committee membership info per recipient (which committees do they sit on?)
   - Add `<SectorLink>` and `<CommitteeLink>` references

### Schema.org

Change from `GovernmentOrganizationSchema` to `OrganizationSchema`. Do not use `funder` relationship — Schema.org's `funder` implies financial support of an entity, which mischaracterizes campaign contributions. Use `makesOffer` or omit the PAC-to-recipient relationship from structured data and let the page content speak for itself.

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
| Representative | ProfilePage, Person    | `memberOf` → committees                                            |
| Bill           | Legislation            | `sponsor` → Person, `legislationPassedBy` → GovernmentOrganization |
| Vote           | LegislativeEvent       | `about` → Legislation link                                         |
| Committee      | GovernmentOrganization | `member` → Person[], `subOrganization`                             |
| PAC            | GovernmentOrganization | Change to Organization (no `funder` — see Phase 4 note)            |
| Industry       | CollectionPage         | Add `about` with industry topic                                    |
| Lobby Org      | (new)                  | Organization with structured fields                                |
| Regulation     | (audit)                | Legislation or CreativeWork                                        |

### Internal link graph quality

Target: every entity page has **minimum 5 outbound** entity links and **minimum 3 inbound** entity links.

Validation script: `scripts/validate-entity-links.ts` — renders each entity page type, counts entity links, flags pages below threshold.

### Anti-slop quality gates

A full page must have:

- 3+ sections with real data (not just an empty state)
- 5+ outbound entity links to other CIV.IQ pages
- Plain-language summary per section (Flesch-Kincaid grade ≤ 8)
- Terms a non-expert wouldn't know are explained in context (not in a glossary — inline)
- Schema.org JSON-LD markup
- `generateMetadata` with entity-specific title and description
- Data source attribution for every section
- Breadcrumb navigation
- Entity resolution cross-references respect confidence thresholds (≥ 0.8 direct, 0.6–0.8 qualified, < 0.6 omitted)

Pages that don't meet the data threshold (3+ sections, 5+ links) render as info cards, not full pages. Info cards link to the original government data source (Senate LDA search, FEC lookup) so the citizen can still access the raw record.

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

A citizen enters their address. They see their representative's page. Under campaign finance, they notice "Defense: $145,000" and don't know what that means. "Defense" is a link. They click it.

The industry page opens with a paragraph explaining what the defense sector is and how it interacts with Congress. Below that, they see the scale — total lobbying and PAC spending across the sector — and the major organizations involved. One name they recognize: Lockheed Martin. They've heard of them. They click through.

The lobbying org page tells them, in plain language, that Lockheed Martin is registered to lobby the federal government and files quarterly reports with the U.S. Senate. It spent $12.4 million on lobbying last year, focused on defense and aerospace policy. The page shows which committees they contacted and which bills relate to those policy areas. Each one is a link to a page that explains what the bill does.

The citizen didn't know any of this 3 minutes ago. They didn't need to know what "LDA" means, or how to search Senate.gov, or what a lobbying disclosure is. The site organized publicly available government records from four different federal websites and explained them in language they could follow.

That's the product. Not a trail of connections for experts to follow — a set of pages that make government data legible to anyone.
