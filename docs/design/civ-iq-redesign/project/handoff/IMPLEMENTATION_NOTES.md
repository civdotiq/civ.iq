# CIV.IQ Redesign — Implementation Notes for Claude Code

> **Read this first.** This handoff folder is a **reference spec**, not code to import. Use it the way you'd use a Figma file: study the visual design, lift tokens, match information hierarchy. Do not copy `.jsx` files into `src/`.

---

## What's in this folder

```
handoff/
├── IMPLEMENTATION_NOTES.md   ← you are here
├── README.md                 ← quick orientation for the dev agent
├── tokens.css                ← drop-in CSS variables (THE source of truth for color/type/spacing)
├── fonts.css                 ← @font-face declarations (only if you don't already have Braun Linear)
├── fonts/                    ← Braun Linear .woff2 (5 weights) — same files already in the public repo
├── assets/                   ← logo
├── screens/                  ← rendered HTML of every redesign page (open in a browser)
├── screenshots/              ← pinned PNGs of every screen for unambiguous visual targets
└── reference-jsx/            ← the prototype JSX files, READ-ONLY reference (do NOT import)
```

---

## What this redesign IS

A complete visual + information-architecture refresh of CIV.IQ, applied across:

- **Federal officeholder profile** — 4 explorations (Refined, Dossier, Money-First, **Hybrid** — the approved direction)
- **Connected system** — bill detail, search results, committee detail, state overview, methodology, about, 404
- **Coverage extension** — landing, address result, state legislator profile, state legislature, roll-call detail, lobbying filing, FEC filing, industry/sector page
- **Expansion templates (added 2026-05)** — head-to-head compare, congressional district, election matchup, issue/topic aggregator, local (city-council) chamber, PAC profile, federal spending/contract award, full voting record

All pages share one chassis: black masthead with breadcrumb crumbs, 2px black borders on every card, square corners, source rails on the right of every primary panel, plain-language reading paragraphs, every analytic insight carries a confidence + methodology + correlation-not-causation disclaimer.

## What this redesign IS NOT

- **It is not a runnable app.** The JSX files use Babel-in-the-browser, UMD React from unpkg, and `window.X = X` global sharing. None of that belongs in a real Next.js / Vite / CRA codebase.
- **It is not data.** The `data.jsx` and inline data objects (`OFFICIAL_JEFFRIES`, `BILL_HR3684`, `STATE_NY`, etc.) are hand-stubbed for visual review. Replace with real queries against your actual data layer.
- **It is not a component library.** `primitives.jsx`, `chrome.jsx`, and the per-page JSX files are scaffolding tuned for static artboards inside a `<DesignCanvas>`. Reimplement these as proper components in your stack.

---

## File → real-route mapping

The dev agent should map each redesign file to the corresponding route/component in **your actual codebase** (the dev agent will need to confirm these paths against the live repo — they're best-guess against the public `civdotiq/civ.iq` structure):

| Redesign file                                  | Renders                                                      | Likely real route                                                  | Likely real component(s)                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `Landing.jsx → LandingPage`                    | Front-page wire-bulletin landing                             | `src/app/page.tsx`                                                 | `SearchForm`, `FeatureGrid`, `QuickStartPaths`                                                   |
| `Landing.jsx → AddressResultPage`              | "You live at X → here are your reps"                         | `src/app/results/page.tsx` (or address handler)                    | new — district triage UI                                                                         |
| `ProfileHybrid.jsx` ⭐                         | **Approved federal-official profile**                        | `src/app/officials/[bioguideId]/page.tsx`                          | `OfficialProfile`, `RecordPanel`, `MoneyPanel`, `BillsPanel`, `CommitteesPanel`, `MeetingsPanel` |
| `ProfileRefined.jsx`                           | Alternate profile direction (rejected)                       | —                                                                  | reference only — visual cues for compact profile cards                                           |
| `ProfileDossier.jsx`                           | Alternate profile direction (rejected)                       | —                                                                  | reference only — typographic density study                                                       |
| `ProfileMoneyFirst.jsx`                        | Alternate profile direction (rejected)                       | —                                                                  | reference only — money-as-lede framing                                                           |
| `BillDetail.jsx`                               | H.R. 3684 detail                                             | `src/app/bills/[congress]/[type]/[number]/page.tsx`                | `BillSummary`, `BillTimeline`, `BillVote`, `BillText`, `RelatedBills`                            |
| `SearchResults.jsx`                            | Query that doesn't parse as address                          | `src/app/search/page.tsx`                                          | `SearchResults`, faceted filter sidebar                                                          |
| `CommitteeDetail.jsx`                          | House Budget Committee                                       | `src/app/committees/[id]/page.tsx`                                 | `CommitteeMembers`, `CommitteeBills`, `Hearings`, `Subcommittees`                                |
| `StateOverview.jsx`                            | New York state landing                                       | `src/app/states/[stateCode]/page.tsx`                              | `StateOverview`                                                                                  |
| `StateLegislator.jsx → StateLegislatorProfile` | NY-SD-26 (Sen. Gounardes)                                    | `src/app/states/[stateCode]/legislators/[id]/page.tsx`             | new — mirrors federal `OfficialProfile`                                                          |
| `StateLegislator.jsx → StateLegislaturePage`   | NY chamber rosters + session calendar                        | `src/app/states/[stateCode]/legislature/page.tsx`                  | new                                                                                              |
| `RollLobby.jsx → RollCallDetail`               | H.R. 3684 final passage votes                                | `src/app/votes/[congress]/[chamber]/[session]/[rollCall]/page.tsx` | new — first-class roll-call page                                                                 |
| `RollLobby.jsx → LobbyFilingDetail`            | Akin Gump for BlackRock, Q4 2024                             | `src/app/lobbying/filings/[id]/page.tsx`                           | new                                                                                              |
| `FECIndustry.jsx → FECFilingDetail`            | Friends of Andy Kim, Q1 2026                                 | `src/app/finance/filings/[id]/page.tsx`                            | new                                                                                              |
| `FECIndustry.jsx → IndustrySectorPage`         | Real estate as an entity                                     | `src/app/industries/[sectorId]/page.tsx`                           | new — sector roll-up                                                                             |
| `SystemPages.jsx → MethodologyPage`            | Public dossier                                               | `src/app/methodology/page.tsx`                                     | static MDX or component                                                                          |
| `SystemPages.jsx → AboutPage`                  | Masthead, people, funding                                    | `src/app/about/page.tsx`                                           | static MDX or component                                                                          |
| `SystemPages.jsx → NotFoundPage`               | File-stamp 404                                               | `src/app/not-found.tsx`                                            | global error UI                                                                                  |
| `Compare.jsx → ComparePage`                    | Two officials side-by-side (Jeffries vs Johnson default)     | `src/app/compare/page.tsx` (new)                                   | new — `CompareHero`, `CompareSection`, `CompareRow`                                              |
| `DistrictPage.jsx → DistrictPage`              | Single congressional district as a page (NY-08)              | `src/app/districts/[stateCode]/[districtNumber]/page.tsx` (new)    | new — `DistrictMap` placeholder, demographics, neighboring-districts                             |
| `Election.jsx → ElectionPage`                  | Head-to-head matchup (OH-Sen 2024: Brown vs Moreno)          | `src/app/elections/[id]/page.tsx` (new)                            | new — `CandidateHero`, `ComparePane`, `PollChart`, `EndorsePane`                                 |
| `IssueTopic.jsx → IssueTopicPage`              | Topic aggregator ("Housing")                                 | `src/app/topics/[slug]/page.tsx` (new)                             | new — bills + key reps + money flows + milestones rolled up                                      |
| `LocalCouncil.jsx → LocalCouncilPage`          | City council chamber (NYC City Council, D-33)                | `src/app/local/[municipalityId]/page.tsx` (new)                    | new — federal Profile chassis at city scale                                                      |
| `PACProfile.jsx → PACProfilePage`              | PAC profile (Senate Majority PAC)                            | `src/app/pacs/[id]/page.tsx` (new)                                 | new — mirrors official profile chassis with `PACChart`                                           |
| `SpendingContract.jsx → SpendingContractPage`  | USASpending award page (SpaceX · NASA Commercial Crew, FY24) | `src/app/spending/awards/[id]/page.tsx` (new)                      | new — `PartyCard` (awarder/recipient), milestones, related contracts                             |
| `VotingRecord.jsx → VotingRecordPage`          | Full filterable voting history for a member                  | `src/app/officials/[bioguideId]/votes/page.tsx` (new)              | new — filter rail + long vote table + by-category/year summary stats                             |

⭐ = approved direction. Build this one first.

---

## Recommended implementation order (small PRs)

**PR 1 — Tokens.** Port `handoff/tokens.css` into the existing token file (`src/styles/aicher-system.css` already exists in the repo — diff and merge, don't replace). Add any missing variants (`--civiq-blue-cool`, `--data-vlau-light`, `--data-greige-light`). Land standalone, no UI changes.

**PR 2 — Shared primitives.** Look at `reference-jsx/primitives.jsx` and `reference-jsx/chrome.jsx`. Reimplement these as **real** components in your stack. Names to match (so the redesign vocabulary survives): `CqLabel`, `CqChip`, `CqSourceTag`, `CqButton`, `CqPortrait`, `CqStat`, `CqBar`, `CqPlainReading`, `CqDisclaimer`, `CqHeader`, `CqLogoMark`, `CqSearchGlyph`, `CqBreadcrumb`, `CqFooter`, `CqPage`. Storybook entries strongly recommended.

**PR 3 — Approved profile.** Build the federal-official profile page using `reference-jsx/ProfileHybrid.jsx` + `screenshots/03-profile-hybrid.png` as the visual target. Wire to your real data layer. Each panel (`RecordPanel`, `MoneyPanel`, `BillsPanel`, `CommitteesPanel`, `MeetingsPanel`) should be its own file.

**PR 4+ — One page type per PR.** Bill detail → search results → committee → state overview → methodology/about/404 → state legislator → roll-call → filings → industry sector → **voting record** → **district page** → **compare** → **issue/topic** → **PAC profile** → **spending/contract** → **election** → **local council**. Approximately 18 PRs total. Each one ships the redesign for one page; each one is independently revertible.

The eight expansion templates (added 2026-05 — `Compare`, `DistrictPage`, `Election`, `IssueTopic`, `LocalCouncil`, `PACProfile`, `SpendingContract`, `VotingRecord`) all reuse the same primitives + chrome from PR 1–2; none of them require new shared components. Sequence them after the core 10 PRs above, in whatever order matches product priority — they're independent of each other.

---

## Hard rules — tell Claude Code these explicitly

The dev agent must not:

1. **Add `@babel/standalone` to the repo.** No `<script type="text/babel">`. No UMD React from unpkg. The redesign JSX is reference-only.
2. **Copy `chrome.jsx`, `primitives.jsx`, or `data.jsx` wholesale into `src/`.** Re-derive them as proper components against the existing stack (Next.js + Tailwind, per the `civdotiq/civ.iq` repo structure).
3. **Use `Object.assign(window, {...})` to share components.** This is a prototype workaround — your stack uses ES module imports.
4. **Import the inline data stubs (`OFFICIAL_JEFFRIES`, `BILL_HR3684`, `STATE_NY`, etc.) into production routes.** They're for visual review; production reads from the data layer.
5. **Reuse the `<DesignCanvas>` / `<DCSection>` / `<DCArtboard>` wrappers.** Those are review-time scaffolding — they don't belong in a real route.
6. **Match the inline `style={{...}}` objects character-for-character.** Translate to your styling system (Tailwind classes, CSS modules, vanilla-extract — whatever the repo uses) using `tokens.css` as the contract.
7. **Reformat or "modernize" `tokens.css`.** Variable names are referenced across the design system docs — keep them stable.

The dev agent should:

1. **Use existing routing, layouts, error boundaries, loading states, and data fetching patterns** from the current codebase.
2. **Match the visual design** (spacing, borders, type, color, density) using the rendered HTML in `screens/` and the PNGs in `screenshots/` as the source of truth.
3. **Copy the copywriting voice** — uppercase labels, sentence-case body, 8th-grade reading level, no exclamation marks, no emoji, every analytic insight carries confidence + methodology + correlation disclaimer. See README.md "CONTENT FUNDAMENTALS".
4. **Preserve names and IA** — `RecordPanel`, `MoneyPanel`, `CqHeader`, `CqLabel` etc. — so design discussions still parse against the implementation.
5. **Treat hard-coded data inside the JSX as content specs** — what fields appear, in what order, with what label — not as values to ship.

---

## Per-screen gotchas

**ProfileHybrid (the approved profile, ⭐).** Tabbed chassis with five panels. The panel header pattern (`PanelHeader`) is shared across every panel and includes a `CqSourceTag` on the right — that source rail is part of the brand contract. Every numeric stat uses `font-variant-numeric: tabular-nums`. Portrait is hard 120×120 square, never circular.

**BillDetail.** Long page with five panels stacked vertically; the `TimelinePanel` uses a custom vertical-line + dot rendering that's visually load-bearing — match it precisely. Vote breakdown bars are `CqBar` instances with party tokens (red/green) — these are the **only** places red/green encode party in this file.

**SearchResults.** Faceted filter sidebar (`FacetGroup`) on the left, results column on the right. Three result row variants: official (`ResultRow`), bill (`BillResultRow`), committee (`CommitteeResultRow`). Each variant has a different metadata grid — don't collapse them into one component.

**CommitteeDetail.** Members panel renders as a **dense grid** of portraits (8 columns, ~80px tiles), not a list. Subcommittee panel uses a different card style (no portraits).

**StateOverview / StateLegislator / StateLegislaturePage.** These mirror the federal stack one-to-one — reuse the federal primitives. The state-legislator profile uses the same `ProfileHybrid` chassis with state-specific panel content.

**RollCallDetail.** Per-member vote grid is paginated for large chambers — render the first ~50 with a "view all 435" affordance. Color encoding is party (red/green), not vote (yes/no); vote is encoded by an icon glyph + label.

**LobbyFilingDetail / FECFilingDetail.** Both use a flow-diagram pattern (`FlowBox` + `Arrow` in `FECIndustry.jsx`) that visualizes money path. SVG-based; mirror the geometry exactly — don't substitute a 3rd-party flow library.

**IndustrySectorPage.** Largest data density — multiple ranked tables, top contributors, top recipients, top bills lobbied. Tables use the `CqBar` component for proportional bars inside cells. Watch row heights — the redesign assumes ~36px row height; the existing app may default taller.

**Landing / AddressResultPage.** The landing hero uses the largest type in the system (`--type-4xl` 64px, uppercase, `--tracking-display`). Address result is a triage page — multiple-districts case is the design driver, not the happy path.

**Methodology / About / 404.** Mostly static, but voice + microtype matter. The 404 has a "file-stamp" aesthetic — date + path stamped in monospace — that's a brand moment, don't replace with generic 404 copy.

**Compare.** Two officials presented as matched rows (`CompareRow` per data point) inside `CompareSection` panels — not two profiles glued together. The hero (`CompareHero`) puts both portraits at the same 120×120 hard-square spec from `ProfileHybrid`. Default load is Jeffries vs Johnson; URL should drive `?a=<bioguideId>&b=<bioguideId>`. Don't dual-tab; the whole point is parallel scanning.

**DistrictPage.** First-class page for one congressional district (NY-08 in the reference). Sections: demographics block, the seated rep (compact card linking to the full profile), neighboring districts strip, federal money flowing in, ZIP list. `DistrictMap` is a styled SVG placeholder — wire it to your real map layer (Mapbox/MapLibre) but keep the 2px-bordered container exactly as drawn.

**Election.** Head-to-head matchup, not a roster. Hero shows both candidates side-by-side; below it, finance + voting-alignment + endorsements panels run in parallel columns (`ComparePane`). `PollChart` is hand-drawn SVG — match the geometry, don't substitute a charting library. Use party tokens for fills (red/green) — same constraint as `BillDetail`.

**IssueTopic.** Topic-as-entity page ("Housing" in the reference). Aggregates bills, key reps (split into sponsors and opposition columns — that split is the point), money flows in/out of the issue area, and a milestones timeline. Reuses `CqBar` for proportional money rows. Topic slug → server-side aggregation across multiple bill/finance queries.

**LocalCouncil.** Federal `ProfileHybrid` chassis applied at city scale (NYC City Council, District 33 in the reference). Members table is a roster, not the dense 8-column portrait grid `CommitteeDetail` uses — local chambers are small enough that a real table reads better. Ward-map area is a placeholder; same wiring story as `DistrictMap`.

**PACProfile.** Mirrors the official-profile chassis: hero (with PAC-type chip — super PAC vs leadership PAC vs traditional), headline metrics, top recipients, top donors, ad-spending log, plain reading paragraph. `PACChart` is a stacked-bar contribution-by-cycle SVG; match geometry. Cross-link recipients to the federal profile and donors to industry-sector pages.

**SpendingContract.** Single USASpending award (SpaceX · NASA Commercial Crew, FY24 in the reference). Hero shows award + amount with `tabular-nums`. Two `PartyCard` blocks side-by-side (awarder agency, recipient vendor) — these mirror each other and use the same template. Period of performance is a horizontal date band; milestones below it stack vertically like `BillDetail`'s `TimelinePanel`. Related-contracts strip at the bottom links peer awards.

**VotingRecord.** Full filterable voting history for a member. Hero is the **compact** profile variant (smaller portrait, no tabs) — links back out to the full profile. Left filter rail (chamber, session, category, year, vote outcome); right column is a long table — 24 rows in the reference, tall pages in production. Bottom of page: by-category and by-year summary stat blocks. Row height ~36px (same gotcha as `IndustrySectorPage`).

---

## How to brief Claude Code (template)

```
Open this repo. The redesign reference lives in docs/design/civ-iq-redesign/.
Start by reading IMPLEMENTATION_NOTES.md and README.md.

Today: implement PR 3 — federal-official profile page (the approved
"ProfileHybrid" direction). Visual target is screens/03-profile-hybrid.html
and screenshots/03-profile-hybrid.png. Reference component is
reference-jsx/ProfileHybrid.jsx — read for structure and field list, do NOT
import.

Constraints:
- Use the existing Next.js routing and data layer
- Use existing token names from src/styles/aicher-system.css; merge in
  any new tokens from docs/design/civ-iq-redesign/tokens.css
- Match the 2px black borders, square corners, source rail, and tabular-
  nums numerics shown in the screenshot
- Voice rules from README.md "CONTENT FUNDAMENTALS"

Open a single PR with the page + the panel components split into
separate files. Don't touch other routes.
```
