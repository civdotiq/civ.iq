# Surface Unsurfaced API Routes

## What You're Doing

This codebase has ~30 fully-functional API routes returning real government data that no user can see. They have caching, error handling, typed responses, and real external data sources — but zero UI consumers. Your job is to surface them into the existing UI, following every existing pattern exactly.

**Read before you build.** For every task below, read the target files and at least one working example of the same pattern before writing any code.

## Ground Rules

- Follow every existing pattern exactly. No new conventions.
- Aicher/Ulm design system: `border-2` structural borders, no rounded corners, no shadows, no gradients. Colors: red `#e11d07`, green `#0a9338`, blue `#3ea2d4`. 8px grid spacing.
- All data comes from the existing API routes — do NOT create new API routes.
- `npm run build` after every logical unit of work. Fix type errors immediately.
- Commit after each numbered phase with `feat:` or `fix:` conventional commit prefix.

---

## Phase 1: Cleanup Dead Routes

Delete these two routes that violate the real-data-only rule:

1. `src/app/api/representative/[bioguideId]/votes-simple/route.ts` — returns hardcoded fake data (`"Test Bill"`, `"test-vote-1"`)
2. `src/app/api/representative/[bioguideId]/voting-record/route.ts` — returns stub with `featureStatus: 'in-development'`

Grep the codebase first to confirm nothing imports them. They have zero consumers.

Build. Commit: `fix: delete fake data routes (votes-simple, voting-record)`

---

## Phase 2: Enhance Federal Representative Profile

The profile lives in `src/features/representatives/components/SimpleRepresentativeProfile.tsx`. It uses `TabNavigation` with tab IDs. Each tab is either inline or a dynamically-imported component. Study this file and `src/features/representatives/components/VotingTab.tsx` or `BillsTab.tsx` for the pattern: SWR fetch → loading/error/empty states → render.

### 2a: Add Election Cycle Selector to Finance Tab

**API:** `GET /api/representative/{bioguideId}/election-cycles`
Returns: `{ cycles: number[], defaultCycle: number | null }`

**What to do:**

- Read `src/features/campaign-finance/components/CampaignFinanceVisualizer.tsx` (the current finance tab component)
- Add a cycle selector dropdown at the top that fetches from `/api/representative/{bioguideId}/election-cycles`
- Pass the selected cycle to existing finance data fetches (they accept a `?cycle=` param)
- Default to `defaultCycle` from the response
- Aicher styling: `border-2 border-gray-300` select element, no rounded corners

### 2b: Add Funding Sources Section to Finance Tab

**API:** `GET /api/representative/{bioguideId}/finance/funding-sources`
Returns: `{ fundingSources: { individual, pac, party, candidate, other — each with amount and percentage } }`

**What to do:**

- Add a "Funding Sources" section inside the existing finance tab
- Horizontal stacked bar showing individual vs PAC vs party vs self-funded proportions
- Use the percentage values from the API directly
- Pattern: look at how `finance/industries` data is displayed in the existing finance tab

### 2c: Add Expenditures Section to Finance Tab

**API:** `GET /api/representative/{bioguideId}/finance/expenditures`
Returns: `{ totalDisbursements, expenditureCategories: [...] }`

**What to do:**

- Add a "How the Money Is Spent" section below funding sources
- Simple category list with amounts, similar to the top contributors display pattern

### 2d: Add Connections Tab to Representative Profile

**API:** `GET /api/representative/{bioguideId}/connections`
Returns: `{ districtSpending, relevantAgencies, relevantTopics, relevantHearings, openCommentPeriods, stateLegislators, cityCouncilMembers }`

This is the richest orphaned endpoint — aggregates 6 data sources.

**What to do:**

- Create `src/features/representatives/components/ConnectionsTab.tsx`
- Add a "Connections" tab to `SimpleRepresentativeProfile.tsx` (dynamically imported like the other heavy tabs)
- Use the same SWR + loading/error pattern as `VotingTab.tsx`
- Layout: section cards for each connection type. Each section shows a header, count, and list.
  - "District Spending" — top contracts/grants with amounts
  - "Relevant Hearings" — upcoming hearings from committees they serve on
  - "Open Comment Periods" — regulations open for public comment, with days remaining
  - "State Legislators" — state-level reps in the same district
  - "City Council" — local officials if available
- Add to `getDataSourcesForTab()` function with appropriate sources
- Add icon: use `Link2` or `Network` from lucide-react

### 2e: Show Leadership Positions in Header

**API:** `GET /api/representative/{bioguideId}/leadership`
Returns: `{ leadership: [{ name, type }] }`

**What to do:**

- Read `src/features/representatives/components/HeroStatsHeader.tsx`
- If the representative holds a leadership position, show a badge in the hero header next to their party badge
- Fetch on mount with SWR, show nothing if empty array
- Badge style: `border-2 border-yellow-500 bg-yellow-50 text-yellow-800` (matches existing leadership badge pattern in state legislator profiles — see `SimpleStateLegislatorProfile.tsx` line 648)

Build + commit: `feat: enhance federal representative profile with finance cycles, funding sources, expenditures, connections tab, and leadership badges`

---

## Phase 3: Enhance State Legislator Profile

The profile lives in `src/features/state-legislature/components/SimpleStateLegislatorProfile.tsx`. Study its tab system — it's simpler than the federal one (inline `renderMainContent()` switch, not dynamic imports).

### 3a: Add Finance Tab

**API:** `GET /api/state-legislature/{state}/legislator/{id}/finance`
Returns: `{ totalContributions, topIndustries: [...], electionCycles: [...] }`

**What to do:**

- Add a "Finance" tab to `stateLegislatorTabs` array (use `DollarSign` icon from lucide-react)
- Add `case 'finance':` in `renderMainContent()`
- Fetch with SWR from the API endpoint
- Display: total contributions headline number, top industries list with amounts, election cycle badges
- Gracefully handle missing data (FollowTheMoney coverage varies by state) — show "Campaign finance data not available for this state" when the API returns empty
- Use `encodeBase64Url(legislator.id)` for the URL param, same as the news tab does

### 3b: Add Network Tab

**API:** `GET /api/state-legislature/{state}/legislator/{id}/network`
Returns: `{ bipartisanScore, frequentCollaborators: [...], collaborationByParty: {...}, recentCollaborations: [...] }`

**What to do:**

- Add a "Network" tab to `stateLegislatorTabs` (use `Users` icon — already imported)
- Fetch with SWR
- Display: bipartisan score as a percentage bar (red/blue), top collaborators list with party affiliation badges, collaboration-by-party breakdown

### 3c: Enrich Voting Tab with Vote Enrichment

**API:** `GET /api/state-legislature/{state}/legislator/{id}/vote-enrichment`
Returns: `{ partyLineAlignment, topicBreakdown, keyVotes, attendanceRate }`

**What to do:**

- Read the existing `StateLegislatorVotingRecord.tsx` component
- Add a summary section at the top of the voting tab showing: party-line alignment %, attendance rate %, and topic breakdown
- Fetch with SWR, render above the existing vote list
- Don't replace the existing component — augment it

### 3d: Add Calendar/Schedule Section to Overview

**API:** `GET /api/state-legislature/{state}/calendar`
Returns: events array with date, description, location, participants

**What to do:**

- Add an "Upcoming Schedule" section to the overview tab's main content area (in `renderMainContent()` case 'overview', after the existing Biography/Committees/Service History sections)
- Fetch with SWR, show next 5 upcoming events
- Simple list: date, event title, location
- Empty state: "No upcoming events scheduled"

Build + commit: `feat: add finance, network, calendar, and vote enrichment to state legislator profiles`

---

## Phase 4: Add Federal Register Pages

### 4a: Regulations Search Page

**API:** `GET /api/federal-register?type=...&agency=...&per_page=...&page=...`

**What to do:**

- Create `src/app/(civic)/regulations/page.tsx` (server component with client search)
- Layout: search input + filter dropdowns (document type, agency) + results list
- Each result: title, type badge, agency, publication date, summary excerpt, link to detail page
- Detail pages already exist at `/regulations/[documentNumber]` — link to them
- Pattern reference: look at `/legislation` or `/committees` page for search + filter + list pattern
- Add metadata export for SEO

### 4b: Executive Orders Page

**API:** `GET /api/federal-register/executive-orders?per_page=...&page=...`

**What to do:**

- Create `src/app/(civic)/executive-orders/page.tsx`
- Chronological feed of executive orders: EO number, title, date, abstract
- Link each to the Federal Register source URL
- Simple paginated list — use the same pagination pattern as the legislation page
- Add metadata export for SEO

### 4c: Comment Periods Dashboard

**API:** `GET /api/federal-register/comment-periods`

**What to do:**

- Create `src/app/(civic)/comment-periods/page.tsx`
- Three sections: "Closing Soon" (highlighted, urgency), "Open for Comment", "Recently Closed"
- Each item: title, agency, days remaining (or days since closed), link to comment
- Stats bar at top: total open, closing this week
- This is a citizen-participation page — make it clear these are opportunities to influence policy

Build + commit: `feat: add regulations search, executive orders feed, and comment periods dashboard`

---

## Phase 5: Add Spending Geography + Bill Votes

### 5a: Geographic Spending on Spending Page

**API:** `GET /api/spending/geography?geo_layer=state&scope=place_of_performance&fiscal_year=2024`

**What to do:**

- Read the existing spending page at `src/app/(civic)/spending/page.tsx`
- Add a "Spending by Geography" section
- Render as a ranked list of states/districts with amounts and per-capita figures
- Allow toggling between state/county/district `geo_layer` and place_of_performance/recipient_location `scope`
- Filter buttons matching the Aicher system (`border-2`, no rounded corners)

### 5b: Bill Vote Breakdown on Bill Detail

**API:** `GET /api/bill/{billId}/votes`

**What to do:**

- Read the existing bill detail page/components
- Add a "Floor Votes" section showing vote results with party breakdown
- Pattern: red/green/gray bars for Yea/Nay/Not Voting, segmented by party
- Only show if the API returns data (many bills never reach a floor vote)

Build + commit: `feat: add geographic spending view and bill vote breakdowns`

---

## Phase 6: Update Navigation

**File:** `src/shared/components/navigation/Header.tsx`

The `navigationSections` array defines the dropdown menus. Currently:

```
Federal: Representatives, Districts, Committees, Legislation, Spending, Influence
State: Legislatures, Districts, Bills
Local: Officials
```

**What to do:**

- Add to Federal: `{ name: 'Regulations', href: '/regulations' }` and `{ name: 'Executive Orders', href: '/executive-orders' }`
- Add to Federal: `{ name: 'Comment Periods', href: '/comment-periods' }`
- Also update `MobileNav` if it has a separate nav structure (check `src/shared/components/navigation/MobileNav.tsx`)
- Add `/congress` to the Federal section: `{ name: 'Congress', href: '/congress' }` — this page already exists and works, it's just not linked from the nav

Build + commit: `feat: add regulations, executive orders, comment periods, and congress to navigation`

---

## Phase 7: Final Validation

```bash
npm run validate:all
```

Fix any issues. Then verify manually:

1. Representative profile → Finance tab shows cycle selector, funding sources, expenditures
2. Representative profile → Connections tab loads and shows multi-source data
3. Representative profile → Leadership badge shows for leaders (try bioguide ID of a known leader)
4. State legislator profile → Finance tab shows FollowTheMoney data (or graceful empty state)
5. State legislator profile → Network tab shows co-sponsorship data
6. State legislator profile → Voting tab has enrichment summary at top
7. `/regulations` → search works, links to detail pages
8. `/executive-orders` → chronological list loads
9. `/comment-periods` → three sections render with stats
10. Navigation dropdowns include all new pages
11. `/congress` is now reachable from the Federal dropdown

Commit: `chore: final validation pass for unsurfaced route integration`

---

## Files You'll Be Reading (pattern references)

- `src/features/representatives/components/SimpleRepresentativeProfile.tsx` — main federal profile, tab system
- `src/features/representatives/components/VotingTab.tsx` — SWR fetch + loading/error pattern for tabs
- `src/features/representatives/components/BillsTab.tsx` — another tab pattern example
- `src/features/representatives/components/HeroStatsHeader.tsx` — header with badges
- `src/features/representatives/components/TabNavigation.tsx` — tab component
- `src/features/campaign-finance/components/CampaignFinanceVisualizer.tsx` — current finance tab
- `src/features/state-legislature/components/SimpleStateLegislatorProfile.tsx` — state legislator profile
- `src/features/state-legislature/components/StateLegislatorVotingRecord.tsx` — state voting tab
- `src/shared/components/navigation/Header.tsx` — main nav
- `src/app/(civic)/legislation/page.tsx` — search + filter + list pattern
- `src/app/(civic)/spending/page.tsx` — spending page to enhance
- `src/app/(civic)/regulations/[documentNumber]/page.tsx` — existing regulation detail page

## Files You'll Be Creating

- `src/features/representatives/components/ConnectionsTab.tsx`
- `src/app/(civic)/regulations/page.tsx`
- `src/app/(civic)/executive-orders/page.tsx`
- `src/app/(civic)/comment-periods/page.tsx`

## Files You'll Be Modifying

- `src/features/representatives/components/SimpleRepresentativeProfile.tsx` (add tabs, header badge)
- `src/features/representatives/components/HeroStatsHeader.tsx` (leadership badge)
- `src/features/campaign-finance/components/CampaignFinanceVisualizer.tsx` (cycle selector, funding sources, expenditures)
- `src/features/state-legislature/components/SimpleStateLegislatorProfile.tsx` (add tabs, calendar)
- `src/features/state-legislature/components/StateLegislatorVotingRecord.tsx` (vote enrichment)
- `src/shared/components/navigation/Header.tsx` (nav items)
- `src/shared/components/navigation/MobileNav.tsx` (nav items if separate)
- `src/app/(civic)/spending/page.tsx` (geography section)
- Bill detail components (vote breakdown section)
