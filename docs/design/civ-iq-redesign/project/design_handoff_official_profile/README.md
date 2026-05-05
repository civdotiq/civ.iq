# Handoff: CIV.IQ Federal Official Profile Redesign

## Overview

A redesign of the federal elected-official profile page for CIV.IQ (civic-intelligence platform aggregating voting records, campaign finance, committee assignments, lobbying disclosures, and contact info from 19 government sources).

The redesign produces **four artboards** on a single design canvas. Each artboard is a complete profile page expressing a different IA / emphasis. The user selected **#04 (Hybrid)** as the primary direction, with #01 and #02 as supporting reference. #03 (Money-First) is exploratory and may be cut.

## About the Design Files

The files in `designs/` are **design references created in HTML/JSX** — prototypes showing intended look and behavior, not production code to copy directly. They run inline-Babel React for rapid iteration, with style applied via inline `style={{...}}` objects.

The task is to **recreate these designs in the CIV.IQ codebase's existing environment** — Next.js + Tailwind + the `aicher-system.css` token layer — using established repo patterns (see `src/styles/aicher-system.css`, `src/components/icons/AicherIcons.tsx`, and the Tailwind utilities like `bg-civiq-blue`, `tracking-aicher`, `px-grid-2`).

The exact pixel values, colors, and typography in the JSX files map 1:1 to the design system's CSS variables. **Use the design tokens, not the hard-coded values** — e.g. wherever you see `'#3ea2d4'`, that's `var(--civiq-blue)` / `bg-civiq-blue`.

## Fidelity

**High-fidelity.** Pixel-perfect mockups with final colors, typography, spacing, and interactive states. Recreate using the codebase's existing Tailwind utilities and Aicher token classes. The design strictly adheres to the existing CIV.IQ system rules:

- 8px grid for every spacing value
- 2px solid black borders on every card/container; square corners (`--radius-layout: 0`)
- 3px radius on interactive elements (buttons/chips/inputs) only
- UPPERCASE labels with `letter-spacing: 0.08em`
- No gradients, no card shadows, no emoji, no stock icons (use `AicherIcons`)
- Red = Republican; green = Democrat; blue is the product action color; amber is the error color
- Confidence + methodology + correlation-not-causation disclaimer on every analytic insight

## Variations Delivered

All four are documented; **prioritize the Hybrid (#04) for implementation**.

### #04 · Hybrid (PRIMARY — implement this)

**File:** `designs/ProfileHybrid.jsx`
**Reference subject:** Hakeem Jeffries (D, NY-08, House Minority Leader)
**Width:** 1080px content; full-bleed top masthead

A tabbed chassis (like the current site) with Dossier-level data density inside each tab. Sticky tab bar so it stays visible during scroll.

**Layout, top to bottom:**

1. **Black masthead strip** (full-bleed) — `background: #111827`, white text. Left: `CIV.IQ · Public Record · {chamber} · {state}`. Right: file ID, compile date, source count. Padding `10px 36px`, mono font, 11px uppercase 0.08em tracking.
2. **Crumb + sources rail** — left `← Federal · {chamber} · {state}` label; right: 3 compact source tags + "+N more" count.
3. **Hero** — 3-column grid `120px 1fr 220px` with 32px gaps and a 2px black bottom border:
   - Left: 120×120 portrait, 2px black frame, party-colored 6px left stripe inside the frame, hatched stripe placeholder background (`repeating-linear-gradient(45deg, #f9fafb 0 8px, #f3f4f6 8px 16px)`), initials centered at `size * 0.32` font, "Photo · placeholder" microtype bottom-right
   - Center: chip row (party chip filled, role outlined, position info-blue outlined) → uppercase name `font-size: 56px, weight 700, letter-spacing -0.02em, line-height 1.0` → mono caption `In office since {year} · Next election {date} · {congress} Congress`
   - Right: stacked `Compare` (secondary) and `Contact rep →` (primary blue) buttons + offices/web microtype below
4. **Headline stats** — 5-column grid, what-they-DID + funding only, no party-vote color in the lead. Each cell: `padding: 20px 18px`, 1px line divider between cells, label uppercase 11px, value 32px bold tabular-nums, mono caption with footnote markers `[1]` `[2]`. The five: Bills sponsored · Attendance · Raised this cycle · Committees · Caucuses. **Critical:** "Votes with party" must NOT be in this row.
5. **Secondary alignment row** — small contextual data on `--bg2` (#f9fafb) ground with 2px black bottom border. 3-col grid, each cell shows label-left + value-right at 16px tabular-nums. Data: `Votes w/ {Party} caucus` (party color), `Votes w/ chamber majority` (ink), `Bipartisan bills co-sponsored` (ink).
6. **Contact strip** — 2px black-bordered band, 5-col grid `160px 1fr 1fr 1fr 220px`. First cell: black bg, white "Contact" label + grey microtype. Three middle cells: DC office + 2 district offices, each with location label, address (12px fg2), and phone (mono bold). Right cell: `bg2` ground, `Online` label + 3 links (web, contact form, twitter handle as mono).
7. **Sticky tab bar** — `position: sticky, top: 0, z-index: 5, background: #fff` with 2px black borders top and bottom. Tabs: `Voting record · Money · Bills sponsored · Committees · Lobbyist meetings`. Active tab: black bg, white text. Inactive: transparent bg, ink text. 14px 18px padding, 12px uppercase 700 0.08em.
8. **Active panel** — see panel specs in `ProfileHybrid.jsx`. Each panel begins with a `PanelHeader` (eyebrow label + 22px bold title + optional right action button).
9. **Footer disclaimer** — confidence, as-of date, methodology, correlation-not-causation, plus footnote glossary.

**Panels:**

- **Voting record** — 2-col `1fr 320px`. Main: vote table `110px 1fr 80px 110px 110px` grid (Bill mono, Title + optional `· public law` annotation in green mono, Yes/No outlined chip, outcome, mono date), 7 rows. Plain-reading callout below. Sidebar: vote-alignment card (4 stacked horizontal mini-bars: with party, with majority, with Speaker, attendance) + "Most-recent vote" callout (blue 6px left bar, bg2 ground).
- **Money** — full-width stacked composition bar (6 segments separated by 2px black dividers, percent labels white mono inside ≥7% segments) → 2-col `1.2fr 1fr`. Left: detailed `CqBar` rows (label + sub + bar + pct + amount). Right: top-industries ranked list (ordinal mono prefix + name + thin bar + amount). Plain-reading callout below.
- **Bills sponsored** — 5-col table grid `110px 1fr 110px 110px 110px` (Bill mono, Title, Status info-chip, Introduced mono date, Co-sponsors bold mono).
- **Committees** — 2-col `1fr 320px`. Main: per-committee blocks (18px name + role chip + serving-since/members mono caption + subcommittee outlined chips). Sidebar: full caucus list (ordinal mono + name, divider rows).
- **Lobbyist meetings** — 4-col table `110px 1fr 1fr 1fr` (Date mono, Org bold, Topic, Filer mono).

### #01 · Refined Classic (`designs/ProfileRefined.jsx`)

A polished version of the existing tabbed page. Uses 5 stat cells in headline (still includes party-vote — to be deprioritized per #04 feedback). Same hero pattern, different tab content layout. Reference for: tab bar styling, sources rail pattern, sidebar with committees + caucuses card.

### #02 · Dossier (`designs/ProfileDossier.jsx`)

Wire-service-density single-page layout. Reference subject: Lisa Murkowski (R-AK Senate). Uses 160×160 portrait, 8-field vital grid, marginalia-style sources rail, two-column body with `§ I.` `§ II.` etc. section headers (14px uppercase, 2px black bottom border). Reference for: dense data presentation, footnote conventions `[1]` `[2]`, marginalia source rail.

### #03 · Money-First (`designs/ProfileMoneyFirst.jsx`)

Exploratory. Campaign finance is the hero (80px total-raised number). Reference subject: Speaker Mike Johnson. May be cut from production.

## Components to Build (Reusable)

These should become real React components in the codebase, replacing the inline duplication in the JSX files. Names below match the conventions in `designs/primitives.jsx`.

| Component                                 | Purpose                                                | Notes                                                                                       |
| ----------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `<OfficialMasthead/>`                     | Top black strip with file metadata                     | Full-bleed, mono font                                                                       |
| `<OfficialHero/>`                         | 3-col portrait + identity + actions                    | 2px black bottom border                                                                     |
| `<OfficialPortrait/>`                     | Square 120×120 (or 160) framed photo                   | 2px black border, party-colored 6px left stripe, fallback to hatched placeholder + initials |
| `<StatCell/>`                             | Label + big tabular number + mono caption              | Used in headline rows; supports footnote markers                                            |
| `<AlignmentRow/>`                         | Compact label-left/value-right cell on bg2             | New for #04                                                                                 |
| `<ContactStrip/>`                         | 5-col band: label + 3 office cells + online cell       | Black-bg first cell, line dividers                                                          |
| `<TabBar/>`                               | Sticky tabs with black-active state                    | Already partially exists in repo                                                            |
| `<PanelHeader/>`                          | Eyebrow + 22px title + right-action slot               | Reused across all panels                                                                    |
| `<VoteRow/>` `<BillRow/>` `<MeetingRow/>` | Table-row components                                   | Match grid templates above                                                                  |
| `<CompositionBar/>`                       | Full-width stacked horizontal bar                      | Money panel; 2px black borders, percent labels inside                                       |
| `<DataBar/>`                              | Label + sub + bar + pct + amount row                   | Repeated across money/industry sections                                                     |
| `<PlainReading/>`                         | Blue 6px left bar, bg2 ground, "PLAIN READING." prefix | Already a system pattern                                                                    |
| `<SourceTag/>`                            | Small attribution chip (compact + full variants)       | Already exists; `compact` variant adds `bullet + name · id` mono inline                     |
| `<Disclaimer/>`                           | Confidence + as-of + methodology + correlation line    | Mono 10px on every analytic page                                                            |
| `<Chip/>`                                 | Filled + outlined, party/info/warn/ink variants        | `whitespace-nowrap` mandatory; existing component needs that fix                            |

## Interactions & Behavior

- **Tab switching:** Client-side state; no URL change required for v1, but recommend `?tab=record` query param so deep links work and external pages can link directly.
- **Sticky tab bar:** `position: sticky, top: 0` once user scrolls past the contact strip. If the site has a fixed header, offset `top` by the header height.
- **Hover states:**
  - Cards: black border flips to `--civiq-blue` on hover, optional `translateY(-2px)`. No shadow added.
  - Buttons: color inversion. Primary blue → white bg + blue text + blue border. Secondary white → black bg + white text.
  - Links: left-to-right underline grow on hover (existing `.link-underline` utility).
- **Focus:** `outline: 2px solid var(--civiq-blue); outline-offset: 2px;` square outline.
- **Transitions:** `cubic-bezier(0.25, 0.1, 0.25, 1)` 150ms desktop, 100ms mobile. No bounce.
- **Download CSV** buttons in each panel — wire to existing CSV-export endpoint per source (Congress.gov roll-call, FEC, etc.).
- **Compare** button — opens existing comparison flow (out of scope here).
- **Contact rep →** primary CTA — anchors to the Contact strip.

## Responsive

The designs are 1080px content-width desktop. For ≤768px:

- Hero collapses to single column; portrait stacks on top, name + chips below, action buttons in a row at the bottom.
- Headline stat row: 2 cols then 1 col.
- Secondary alignment row: stacked.
- Contact strip: stacks office cells vertically; the black "Contact" cell becomes a header bar.
- Tab bar: horizontal scroll, active tab kept in view.
- Tables: switch to card-per-row layout (already a pattern in `aicher-data-list`).

## Data Requirements

The hero, stats, and panels expect this shape per official (see `designs/data.jsx` for full type):

```ts
type Official = {
  id: string; // congress.gov bioguide ID
  name: string;
  short: string; // "Jeffries"
  role: 'U.S. Representative' | 'U.S. Senator';
  chamber: 'House' | 'Senate';
  district: string; // "NY-08" or "AK"
  state: string;
  party: 'd' | 'r' | 'i';
  partyLong: 'Democrat' | 'Republican' | 'Independent';
  position?: string; // "House Minority Leader", "Speaker of the House"
  since: number;
  next_election: string;
  congress: string; // "119th"

  // Floor record
  party_vote: number; // 0–100
  attendance: number; // 0–100
  bills_sponsored: number;
  cosponsored: number;

  // Service
  committees: string[];
  caucus_count: number;

  // Money
  raised: string; // pre-formatted, e.g. "$3.42M"
  cash_on_hand: string;
  small_donor_pct: number;
  pac_pct: number;
  industry_top: string;

  contact: {
    dc: { addr: string; phone: string };
    district: { name: string; addr: string; phone: string }[];
    web: string;
    contact_form: string;
    twitter: string;
  };

  sources: { name: string; id: string; updated: string }[];
};
```

The voting-record table, bill list, money composition, industry list, and lobbying meeting list each need their own data shape — see panel implementations in `ProfileHybrid.jsx`.

## Design Tokens Used

All defined in `designs/colors_and_type.css` and (in the real codebase) `src/styles/aicher-system.css`:

**Colors**

- `--civiq-red #e11d07` — party-R only
- `--civiq-green #0a9338` — party-D only
- `--civiq-blue #3ea2d4` — primary action
- `--civiq-blue-active #2a7aa3` — links hover/active
- `--data-vlau #6b6b83` — chromatic grey for non-party data viz
- `--data-greige #b8b5a9` — secondary chromatic grey
- `--fg1 #111827` `--fg2 #4b5563` `--fg3 #6b7280` `--fg4 #9ca3af` — ink scale
- `--bg1 #ffffff` `--bg2 #f9fafb` `--bg3 #f3f4f6` — ground scale
- `--line #e5e7eb` — hairlines
- `--ink #000000` — structural borders
- `--color-error #b45309` (amber) — never red

**Type**

- `--font-primary` Braun Linear with Helvetica Neue fallback
- `--font-mono` system mono stack
- Scale: 12 / 14 / 16 / 18 / 24 / 32 / 48 / 64 px
- Tracking: -0.02em display · +0.02em heading · +0.025em body · +0.08em label

**Spacing**

- 8px grid; padding/margins all multiples of 8 (or 4 for hairlines)

**Borders**

- `--border-divider 1px` row separators
- `--border-structural 2px` cards/containers
- `--border-emphasis 3px` selected/active

**Radii**

- `--radius-layout 0` cards/containers
- `--radius-interactive 3px` buttons/chips/inputs

## Assets

- **Fonts** — `designs/fonts/` (Braun Linear 5 weights .woff2). Already present in the repo at `public/fonts/`.
- **Logo** — `designs/assets/civiq-logo.png`. Already present in the repo.
- **Icons** — Use existing `src/components/icons/AicherIcons.tsx`. Do not introduce Lucide/Heroicons/etc.
- **Portraits** — Source from `bioguide.congress.gov` member photos, 450×550 minimum. Display square 120×120 (hero) or 160×160 (dossier-style) with `object-fit: cover` and 2px black frame.

## Files in This Bundle

- `designs/Profile Redesigns.html` — entry point; pan/zoom design canvas with all 4 artboards
- `designs/design-canvas.jsx` — canvas component (not part of production)
- `designs/primitives.jsx` — shared `Cq*` primitives (CqLabel, CqChip, CqStat, CqBar, CqPortrait, CqSourceTag, CqButton, CqPlainReading, CqDisclaimer)
- `designs/data.jsx` — three sample officials (Jeffries, Murkowski, Johnson)
- `designs/ProfileRefined.jsx` — variant 01
- `designs/ProfileDossier.jsx` — variant 02
- `designs/ProfileMoneyFirst.jsx` — variant 03
- `designs/ProfileHybrid.jsx` — **variant 04, primary direction**
- `designs/colors_and_type.css` — design tokens (mirror of repo's `aicher-system.css`)
- `designs/fonts/` — Braun Linear woff2

## Implementation Order Suggestion

1. Build the reusable components listed above as standalone files in the appropriate folder of the repo (likely `src/components/profile/`). Match existing repo conventions for file structure and naming.
2. Build `<OfficialProfilePage>` as a Next.js page assembling the components in the order documented for #04.
3. Wire data: hero + headline-stats + alignment-row from existing member ingestion; panels query their respective data sources lazily on tab activation.
4. Add `?tab=` query param sync.
5. Mobile breakpoints last.
6. Replace mock data in `data.jsx` with live ingestion.

## Out of Scope

- Search and address-lookup flows (already exist in repo)
- Comparison view (existing flow)
- Bill detail page (existing route)
- Producing photo portraits (use bioguide source)
- Production CSV export endpoints (already exist per source)
