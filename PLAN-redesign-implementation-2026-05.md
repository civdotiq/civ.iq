# CIV.IQ Redesign — Implementation Tracker

> **Started 2026-05-04. One PR per session. Each PR is independently revertible.**
> Source-of-truth handoff: `docs/design/civ-iq-redesign/`
> Primitives: `src/components/cq/`
> Tokens (additive layer): `src/styles/aicher-system.css` (search for `REDESIGN TOKEN LAYER`)

This file is the **only thing a new Claude Code session needs to read** to continue
the work. Status table below tracks progress; per-PR specs tell each session exactly
what to do, what to verify, and how to commit.

---

## How to start a new session

Paste this prompt into a fresh Claude Code conversation:

```
I'm continuing the CIV.IQ redesign. The full plan is in
PLAN-redesign-implementation-2026-05.md at the project root.

Read that file first. Look at the status table. Pick up the lowest-numbered
pending PR. Read its detailed spec. Implement it.

DO ONE PR PER SESSION. Commit at the end. Don't auto-advance to the next PR.

Reference spec is in docs/design/civ-iq-redesign/. Primitives are in
src/components/cq/. Tokens are in src/styles/aicher-system.css.

Today: implement PR <N>.
```

Replace `<N>` with the next pending PR number from the status table.

---

## Status

Updated **2026-05-07** (PR 11 landed).

| PR  | Title                                                                  | Status    | Commit     |
| --- | ---------------------------------------------------------------------- | --------- | ---------- |
| 0   | IA renames (`/representative` → `/officials`, `/investigate` → `/ask`) | ☐ pending | —          |
| 1   | Tokens (additive `--civiq-*` layer)                                    | ✅ done   | _stage_    |
| 2   | `Cq*` primitives (15 components)                                       | ✅ done   | _stage_    |
| 3   | ProfileHybrid ⭐                                                       | ✅ done   | `10d86e1f` |
| 4   | BillDetail                                                             | ✅ done   | `80858cb7` |
| 5   | SearchResults                                                          | ✅ done   | `9de89a2c` |
| 6   | CommitteeDetail                                                        | ✅ done   | `f90e3add` |
| 7   | StateOverview                                                          | ✅ done   | `e499ebeb` |
| 8   | SystemPages (Methodology / About / 404)                                | ✅ done   | `faef7f5f` |
| 9   | StateLegislator + StateLegislaturePage                                 | ✅ done   | `0120e476` |
| 10  | RollCallDetail                                                         | ✅ done   | `ba8dbc74` |
| 11  | Filings (LobbyFilingDetail + FECFilingDetail)                          | ✅ done   | `9b80c022` |
| 12  | IndustrySectorPage                                                     | ☐ pending | —          |
| 13  | VotingRecord                                                           | ☐ pending | —          |
| 14  | DistrictPage                                                           | ☐ pending | —          |
| 15  | Compare                                                                | ☐ pending | —          |
| 16  | IssueTopic                                                             | ☐ pending | —          |
| 17  | PACProfile                                                             | ☐ pending | —          |
| 18  | SpendingContract                                                       | ☐ pending | —          |
| 19  | Election                                                               | ☐ pending | —          |
| 20  | LocalCouncil                                                           | ☐ pending | —          |
| 21  | Search Variants (5 row templates)                                      | ☐ pending | —          |
| 22  | EmbedMode (3 widths + print)                                           | ☐ pending | —          |
| 23  | AI Surface (AskEntry + AskResult)                                      | ☐ pending | —          |

**Update protocol.** When a PR completes: edit the row to `✅ done`, paste the
short commit hash into the Commit column, update the "Updated" date at the top
of this section.

---

## Common protocol — every PR

1. **Open a new session.** Paste the bootstrap prompt above.
2. **Read this plan.** Identify the next pending PR. Read its spec below.
3. **Read the reference files** named in the spec (handoff JSX is read-only —
   never import it into `src/`).
4. **Implement.** Use `Cq*` primitives from `@/components/cq` for all chrome.
   Token-driven only — never inline hex.
5. **Gate behind `?v=new`.** Existing route stays default. Only `?v=new` renders
   the redesign. See "Common patterns → Feature flag" below.
6. **Verify.** Run the verification commands from the PR spec.
7. **Commit.** Use the pre-written commit message. Conventional Commits format
   (`feat:`, `fix:`, `docs:`, `chore:`).
8. **Update this plan.** Status row → `✅ done`. Paste commit hash.
9. **STOP.** Do not start the next PR. New session for that.

### Verification commands (every PR)

```bash
npx tsc --noEmit                          # type-check, must be clean
npx eslint src/components/cq/ <new-paths> # lint new files
npm run dev                               # boot dev server
# Manually visit BOTH urls:
#   http://localhost:3000/<route>          (old design — unchanged)
#   http://localhost:3000/<route>?v=new    (new design — verify visually)
```

### Commit format

```
feat(redesign-pr<N>): <title> behind ?v=new

- <one-line summary of what landed>
- <files of note>
- Reference: docs/design/civ-iq-redesign/project/redesign/<File>.jsx
- Plan: PLAN-redesign-implementation-2026-05.md (PR <N>)
```

### Before staging files

`git status` may show files unrelated to this work
(e.g. `PROMPT-*.md`, `src/app/page.tsx` modifications). **Stage only the files
you created or intentionally modified for this PR.** Use `git add <path>` per
file — not `git add .` or `git add -A`.

---

## Common patterns

### Feature flag (`?v=new`)

Each redesigned route reads `searchParams.v`:

```tsx
// src/app/officials/[bioguideId]/page.tsx
import { OldOfficialProfile } from '@/components/officials/OldOfficialProfile';
import { ProfileHybrid } from '@/components/officials/ProfileHybrid';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ bioguideId: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { bioguideId } = await params;
  const { v } = await searchParams;
  if (v === 'new') return <ProfileHybrid bioguideId={bioguideId} />;
  return <OldOfficialProfile bioguideId={bioguideId} />;
}
```

For non-prod environments, also honor `NEXT_PUBLIC_CIVIQ_V === 'new'` so QA
doesn't have to append `?v=new` everywhere.

### Empty / error / loading states

Per chat10 decision (#4): **use the existing "Data unavailable — last successful
fetch {timestamp}" pattern by default**. Only build bespoke empty states for these
explicit moments:

- AskResult no-results variant (PR 23)
- LobbyingActivity no-filings variant (PR 11)
- BillTimeline pre-introduction variant (PR 4)

Skeletons: existing shimmer skeleton with the Aicher grid structure.
Rate-limit (429): same "Data unavailable" copy + "retry in {n}s" subline.

### Visual regression (Playwright)

The repo already has Playwright (`npm run test:e2e`). Each redesigned route
should land with a snapshot test at **1440px** and **390px** widths, captured on
both `?v=old` (or no flag) and `?v=new`. PR 3 establishes the convention; later
PRs copy it.

### Hand-drawn charts

`PollChart` (PR 19), `PACChart` (PR 17) — inline SVG path geometry, **no shared
helper, no charting library**. Match the reference geometry pixel-faithfully.
Per chat10 decision (#9).

### Confidence display

`CqDisclaimer` already renders confidence as a band label (High / Medium / Low),
not a numeric float. Per chat10 decision (#5). Pass the float as a prop; the
component bands it.

---

## Hard rules — do / do-not

**Do not** (will be rejected in review):

- Import any file from `docs/design/civ-iq-redesign/` into `src/`. It is reference
  spec, not code. JSX uses Babel-in-the-browser + UMD React + `Object.assign(window)` —
  none of that belongs in production.
- Copy `chrome.jsx` / `primitives.jsx` / `data.jsx` wholesale. Re-derive against
  Next.js + the existing data layer.
- Use the inline data stubs (`OFFICIAL_JEFFRIES`, `BILL_HR3684`, `STATE_NY`, etc.).
  Wire to real Congress.gov / FEC / USASpending / Senate LDA / OpenStates / etc.
  per the project's existing data services.
- Reuse `<DesignCanvas>` / `<DCSection>` / `<DCArtboard>` — those are review-time
  scaffolding only.
- Inline hex colors (`#3ea2d4`, etc.). Always `var(--civiq-blue)` / `var(--fg1)` etc.
- Touch other routes in this PR. One PR = one route family.
- Replace existing primitives. `Cq*` ships **alongside**, not over.
- Push prompt files (`PROMPT-*.md`, `PLAN-*.md`, `BRIEF-*.md`) to GitHub
  (project memory: `feedback_prompt-files-local-only`).
- Auto-advance to the next PR. Stop after commit.

**Do**:

- Use `@/components/cq` for chrome (CqPage, CqHeader, CqFooter, CqBreadcrumb).
- Use existing routing, layouts, error boundaries, loading states, data fetching.
- Match information hierarchy from the reference HTML (open in browser if helpful)
  and the per-screen gotchas in `docs/design/civ-iq-redesign/project/handoff/IMPLEMENTATION_NOTES.md`.
- Use 8th-grade reading level, sentence-case body, uppercase tracked labels.
  No emoji, no exclamation marks. See `docs/design/civ-iq-redesign/project/README.md`
  → "CONTENT FUNDAMENTALS".
- Carry confidence + as-of + methodology + correlation disclaimer on every
  analytic insight (`<CqDisclaimer />`).
- Square corners on layout. 3px radius on interactive elements only.
- 2px black borders on every card/container.
- `font-variant-numeric: tabular-nums` on every numeric stat.
- Address (not ZIP) for any district lookup (memory: `feedback_address-not-zip`).

---

## PR 3 — ProfileHybrid ⭐ (federal official profile)

**Goal.** Render the federal-officeholder profile (e.g. Jeffries, Murkowski, Johnson)
using the approved Hybrid direction: tabbed chassis + Dossier-level density inside
each tab, behind `?v=new`.

**Reference files** (read-only):

- `docs/design/civ-iq-redesign/project/redesign/ProfileHybrid.jsx` (414 lines)
- `docs/design/civ-iq-redesign/project/handoff/IMPLEMENTATION_NOTES.md` →
  "Per-screen gotchas → ProfileHybrid"
- Browser preview: open `docs/design/civ-iq-redesign/project/redesign/Profile Redesigns.html`
  in any browser; ProfileHybrid is artboard #04.

**Files to create:**

- `src/components/officials/ProfileHybrid/ProfileHybrid.tsx` — top-level component
- `src/components/officials/ProfileHybrid/PanelHeader.tsx` — shared header with `CqSourceTag` rail
- `src/components/officials/ProfileHybrid/RecordPanel.tsx` — voting record tab
- `src/components/officials/ProfileHybrid/MoneyPanel.tsx` — campaign finance tab
- `src/components/officials/ProfileHybrid/BillsPanel.tsx` — bills sponsored tab
- `src/components/officials/ProfileHybrid/CommitteesPanel.tsx` — committees + caucuses tab
- `src/components/officials/ProfileHybrid/MeetingsPanel.tsx` — lobbyist meetings tab
- `src/components/officials/ProfileHybrid/ContactStrip.tsx` — sticky contact block
- `src/components/officials/ProfileHybrid/index.ts` — barrel
- `tests/e2e/officials-profile.spec.ts` — Playwright snapshot at 1440 + 390

**Files to modify:**

- `src/app/representative/[bioguideId]/page.tsx` (or `/officials/[bioguideId]/page.tsx`
  if PR 0 has landed) — add `?v=new` branch.

**Data wiring.**

- Reuse the existing services in `src/lib/` and `src/features/representatives/`.
- Five panels need: voting record (Congress.gov votes), money (FEC summaries +
  top industries), bills (Congress.gov sponsored), committees (Congress.gov
  member committees), meetings (Senate LDA filings — federal only).
- For each section: if data is unavailable, render the existing "Data unavailable"
  empty state. Don't render an empty card.

**Visual targets** (from gotchas):

- Tabbed chassis with 5 panels.
- Shared `PanelHeader` includes `CqSourceTag` on the right of every panel.
- Hard 120×120 square portrait, never circular.
- Every numeric stat uses `font-variant-numeric: tabular-nums`.
- Headline stats row: Bills sponsored · Attendance · Raised this cycle · Committees · Caucuses.
- Secondary stats (smaller, grey ground): Votes with party · Votes with chamber majority · Bipartisan co-sponsorships.
  ("Votes with party" demoted from headline per chat 2 user feedback.)

**Verify.**

```bash
npx tsc --noEmit
npx eslint src/components/officials/ProfileHybrid/
npm run dev
# Visit (replace bioguide ID with a real one — H001075 = Jeffries):
#   http://localhost:3000/representative/H001075           → old design
#   http://localhost:3000/representative/H001075?v=new     → ProfileHybrid
# Try a Republican: M001153 = Murkowski (Senate)
# Confirm:
#   - 5 tabs render and switch
#   - PanelHeader has CqSourceTag on the right of every panel
#   - Portrait is 120×120 square (not circular)
#   - Numeric stats are tabular (column-aligned digits)
#   - Empty states show "Data unavailable" not blank cards
#   - Dark mode works (toggle theme)
npm run test:e2e -- officials-profile  # Playwright snapshot
```

**Commit.**

```
feat(redesign-pr3): ProfileHybrid behind ?v=new

- 5 tabbed panels (Record, Money, Bills, Committees, Meetings)
- Shared PanelHeader with CqSourceTag rail
- 120×120 hard-square portrait, tabular-nums stats
- Headline stats: bills/attendance/raised/committees/caucuses
- Reference: docs/design/civ-iq-redesign/project/redesign/ProfileHybrid.jsx
- Plan: PLAN-redesign-implementation-2026-05.md (PR 3)
```

**Done when:**

- [ ] All 5 panels render with real data for at least 3 officials (D + R, House + Senate)
- [ ] `?v=new` branch is gated; default route unchanged
- [ ] Dark mode parity verified
- [ ] Playwright snapshots committed
- [ ] `npx tsc --noEmit` clean
- [ ] `npx eslint` clean on new paths
- [ ] Commit landed with hash recorded in status table
- [ ] **Stop. Open a new session for PR 4.**

---

## PR 4–23 — lightweight specs

Each PR follows the same protocol as PR 3. Reference details live in
`docs/design/civ-iq-redesign/project/handoff/IMPLEMENTATION_NOTES.md` →
"Per-screen gotchas". Below is just enough to start a session.

### PR 0 — IA renames

Two route renames + 308 redirects. **No UI change.** Land before PR 3 if doing
the rename at all; otherwise PR 3+ ships under the old paths and a separate
session does the rename later.

- `/representative/[bioguideId]` → `/officials/[bioguideId]` (federal)
- `/representative/state/[state]/[id]` → `/state-legislature/[state]/legislator/[id]`
- `/investigate` → `/ask`

Per chat 9 decisions: filings live at `/finance/filings/[id]` and
`/lobby/filings/[id]` (top-level, not nested under official). Elections collapse
to `/elections?level=…&cycle=…` instead of three listing routes.

Update breadcrumb copy: "Representatives" → "Officials".

### PR 4 — BillDetail (`/bills/[congress]/[type]/[number]`)

Long page, five panels stacked: BillSummary · BillTimeline · BillVote · BillText · RelatedBills. `TimelinePanel` uses custom vertical-line + dot SVG — match precisely. Vote breakdown bars use party tokens (red/green) — the **only** place red/green encode party in this file.

### PR 5 — SearchResults (`/search`)

Faceted filter sidebar (`FacetGroup`) on the left, results column on the right. Three result row variants: official, bill, committee. Don't collapse them into one component.

### PR 6 — CommitteeDetail (`/committees/[id]`)

Members panel renders as a **dense grid** of portraits (8 columns, ~80px tiles), not a list. Subcommittee panel uses a different card style (no portraits).

### PR 7 — StateOverview (`/states/[stateCode]`)

Mirrors federal stack one-to-one. Reuse federal primitives.

### PR 8 — SystemPages

Three pages, one PR: `/methodology`, `/about`, `not-found.tsx`. Mostly static; voice + microtype matter. The 404 has a "file-stamp" aesthetic — date + path stamped in monospace.

### PR 9 — StateLegislator + StateLegislaturePage

`/state-legislature/[state]/legislator/[id]` (uses ProfileHybrid chassis with state-specific panels) + `/state-legislature/[state]` (chamber rosters + leadership + session calendar).

### PR 10 — RollCallDetail

`/votes/[congress]/[chamber]/[session]/[rollCall]`. Per-member vote grid is paginated for large chambers — render the first ~50 with "view all 435" affordance. Color encoding is **party** (red/green), not vote (yes/no); vote is encoded by an icon glyph + label.

### PR 11 — Filings (LobbyFilingDetail + FECFilingDetail)

`/lobby/filings/[id]` and `/finance/filings/[id]`. Both use a flow-diagram pattern (FlowBox + Arrow) that visualizes money path. SVG-based; mirror the geometry exactly. Don't substitute a 3rd-party flow library.

### PR 12 — IndustrySectorPage (`/industries/[sectorId]`)

Largest data density. Multiple ranked tables: top contributors, top recipients, top bills lobbied. Tables use `CqBar` for proportional bars inside cells. Watch row heights — assumes ~36px row height.

### PR 13 — VotingRecord (`/officials/[bioguideId]/votes`)

Hero is the **compact** profile variant (smaller portrait, no tabs) — links back to the full profile. Left filter rail (chamber, session, category, year, vote outcome); right column is a long table. ~36px row height.

### PR 14 — DistrictPage (`/districts/[stateCode]/[districtNumber]`)

Sections: demographics, seated rep (compact card), neighboring districts strip, federal money flowing in, ZIP list. `DistrictMap` is a styled SVG placeholder — **real Mapbox/MapLibre wiring is a follow-up PR** (chat10 decision #8). Keep the 2px-bordered container exactly as drawn.

### PR 15 — Compare (`/compare?a=&b=`)

Parallel scanning is the point — don't dual-tab. Both portraits use 120×120 hard-square spec. URL-driven via `?a=<bioguideId>&b=<bioguideId>`. `CompareRow` per data point, inside `CompareSection` panels.

### PR 16 — IssueTopic (`/topics/[slug]`)

Sponsor/opposition split-column treatment for key reps is load-bearing — don't collapse. Aggregates bills, key reps, money flows in/out, milestones timeline. Topic slug → server-side aggregation across multiple bill/finance queries.

### PR 17 — PACProfile (`/pacs/[id]`)

`PACChart` is a stacked-bar contributions-by-cycle SVG — match geometry, no chart library. Cross-link recipients to officials, donors to industry-sector pages.

### PR 18 — SpendingContract (`/spending/awards/[id]`)

Two `PartyCard` blocks side-by-side (awarder agency, recipient vendor). Period of performance is a horizontal date band; milestones below stack like `BillDetail`'s `TimelinePanel`.

### PR 19 — Election (`/elections/[id]`)

Head-to-head matchup, not a roster. `PollChart` is hand-drawn SVG — match geometry. Party tokens (red/green) for fills.

### PR 20 — LocalCouncil (`/local/[municipalityId]`)

Federal `ProfileHybrid` chassis at city scale. Members render as a roster table (not the dense 8-column portrait grid CommitteeDetail uses). Ward-map is a placeholder (same as DistrictPage).

### PR 21 — Search Variants (extends `/search`)

Five new row templates on the same `FacetGroup` chassis: `DistrictResultRow`, `StateResultRow`, `SectorResultRow`, `RegulationResultRow`, `TopicResultRow`. Per-variant empty states are designed (not generic). Per chat10 decisions: SectorResultRow uses **top 1 + (2 more)** affordance; RegulationResultRow drops "stage", keeps "comment status" only.

### PR 22 — EmbedMode (`/embed/bill/[id]`, `/embed/district/[id]`, `/embed/reps/[id]`, `/districts/[id]/print`)

Mast-less chassis variant: no header, footer, or breadcrumbs. Single bottom "Data via CIV.IQ" attribution. Three embed widths (320 / 480 / 640) — panel grid genuinely reflows, not just type shrink. Print is letter-size 2-column, no interactive elements.

### PR 23 — AI Surface (`/ask`, `/ask/[slug]/[entityId]`)

**No chatbot vocabulary** — no "chat" / "assistant" / "bot" / sparkles / message bubbles / soft corners. Brand word is "Ask" or "Q&A". Question echo is parsed + structured (entity chips), not free-text. Every claim carries inline numbered superscript anchored to citation rail. Methodology block titled "How this answer was built." Reading-level ≤ 8 enforceable. Confidence renders as band label (already handled by `CqDisclaimer`).

---

## Gotchas & known traps

- **Server vs client components.** `CqHeader` is `'use client'` (search input
  has internal state). Most other primitives are server-safe. Don't add
  `'use client'` to a panel just because it imports `CqHeader` — only the
  Header itself needs it.
- **`force-dynamic` overrides `revalidate`.** If a route uses `force-dynamic`,
  ISR doesn't apply. Don't add `revalidate` thinking it'll do anything.
  (Memory: codebase-map.md.)
- **`next/image` in `CqPortrait`.** `src` is optional — passes through to
  Next's Image when provided, otherwise falls back to initials placeholder.
  The placeholder is intentional, not a TODO.
- **Dark mode.** `var(--civiq-*)` aliases re-resolve through `var(--aicher-*)`
  in `.dark`, which auto-desaturates. No per-component dark overrides needed.
- **jsdom + NextResponse.** In tests, `NextResponse.headers.get()` returns
  undefined. Use `.forEach()` to iterate. (Memory: testing.)
- **Modified files in working tree.** Before each commit, run `git status`
  and stage only redesign files. There may be unrelated work in
  `PROMPT-*.md`, `src/app/page.tsx`, etc.
- **PROMPT-_.md / PLAN-_.md / BRIEF-\*.md are local-only.** Commit locally for
  handoff, but never `git push` them. (Memory: feedback_prompt-files-local-only.)

---

## Reference paths

```
docs/design/civ-iq-redesign/                       Vendored handoff bundle
  README.md                                          Brand guide + content rules
  chats/chat1-10.md                                  Decision history
  project/README.md                                  Design system declaration
  project/SKILL.md                                   Skill metadata
  project/colors_and_type.css                        Original token export
  project/redesign/*.jsx                             Reference JSX (DO NOT IMPORT)
  project/redesign/*.html                            Browser-renderable previews
  project/handoff/IMPLEMENTATION_NOTES.md            Per-screen gotchas
  project/handoff/tokens.css                         Token contract
  project/GAP-redesign-coverage-2026-05.md           Coverage map vs routes

src/styles/aicher-system.css                       Tokens (search REDESIGN TOKEN LAYER)
src/components/cq/                                 Cq* primitives
  README.md                                          Primitive contract + usage
  index.ts                                           Barrel
  Cq*.tsx                                            15 components

PLAN-redesign-implementation-2026-05.md            ← you are here
```

---

## Open decisions

Track decisions deferred from chat10. When one resolves, move it to "Resolved"
or fold into the relevant PR.

- **Storybook (PR 2).** Dropped this cycle. Example routes have been sufficient.
  Revisit if primitives grow beyond the current 15.
- **Map layer (PR 14, PR 20).** Real Mapbox/MapLibre integration is post-launch.
  Production fallback is the styled SVG placeholder.
- **Handoff bundle freshness.** Final memo manifest diff against
  `handoff/reference-jsx/` due 2026-05-06. Currently 24 files synced.
- **`/investigate` IA.** Chat10 decision: **deprecate** (Option 1). 301 redirect
  to `/ask`. No template needed. Folded into PR 0.
