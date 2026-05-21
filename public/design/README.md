# `public/design/` — design previews (not production)

Static HTML mockups for review. Served by Next.js as plain assets at `/design/<file>.html`. **Not linked from the site; not crawlable** (every file ships `<meta name="robots" content="noindex,nofollow">`).

## Files

| File              | Source                                                                    | Last synced |
| ----------------- | ------------------------------------------------------------------------- | ----------- |
| `landing-v3.html` | `civ-iq-design-system` bundle, `project/CIV.IQ Landing (standalone).html` | 2026-05-19  |

## landing-v3.html

A faithful re-implementation of the standalone landing prototype from the Claude Design bundle (URL: `https://api.anthropic.com/v1/design/h/MUwPrGE2v3tFDnTQv8AIhg`). Self-contained — inline CSS, inline SVG marks, no JS. Loads Braun Linear from `/fonts/`.

Open at `http://localhost:3000/design/landing-v3.html` (or the deployed equivalent).

### What's in it

Top-to-bottom:

1. **Sticky nav** — logo lockup · Federal/State/Local dropdown buttons · About · search field · dark-mode toggle
2. **Hero** — centered logo mark · `CIV.IQ` eyebrow · `Know your Representatives` H1 · lede · search row (icon + input + `SEARCH`) · `USE MY LOCATION` blue-outline button · "Try:" microcopy · source attribution
3. **What you can do** — 4-column, 8-card grid: Federal Reps · State Legislatures · District Maps · Voting Records · Campaign Finance · Committees · Bill Tracking · Local Government. Each card has a colored icon tile (red/green/blue), title, description, and a stat link.
4. **Quick start** — 2-column Federal / State. Federal lists three example profiles (Jeffries · Thune · Johnson) plus All Reps / All Districts; State has a "Browse by state" select plus All State Legislatures.
5. **Ask a question** — 4-card grid tagged Where/How/Why/What with sample questions.
6. **Footer** — 4 columns: Platform · Developers · Open Protocols · Legal. Copyright strip.
7. **FAB** — black circle "N" bottom-left (Nostr feed placeholder — see "Open questions" below).

### Deliberate corrections vs. the bundle

These changed because the bundle's standalone HTML drifted from the canonical CIV.IQ design system:

| Concern                  | Bundle standalone                                | This prototype (canonical)                                                                  |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Brand red                | `#E5341C`                                        | `#e11d07`                                                                                   |
| Brand green              | `#1E9E3E`                                        | `#0a9338`                                                                                   |
| Brand blue               | `#3AA8DC`                                        | `#3ea2d4`                                                                                   |
| Font stack               | `'Helvetica Neue', Helvetica, Arial, sans-serif` | `'Braun Linear', 'Helvetica Neue', Helvetica, Arial, sans-serif` (5 weights from `/fonts/`) |
| Interactive radii        | 6px                                              | 3px                                                                                         |
| Search row               | bare `<div>`                                     | real `<form action="/search" method="get" role="search">` with `type="submit"`              |
| Address input            | unlabeled                                        | `<label class="sr-only">`                                                                   |
| Dropdown buttons         | no popup hint                                    | `aria-haspopup="true" aria-expanded="false"`                                                |
| Theme toggle             | no state                                         | `aria-pressed="false"` (still decorative — see below)                                       |
| Landmarks                | none                                             | `<main>`, `<nav aria-label>`, `<header>`, `<section aria-labelledby>`, `<footer>`           |
| Tabular figures on stats | no                                               | `font-variant-numeric: tabular-nums lining-nums`                                            |

### Known divergences from `src/styles/aicher-system.css`

The bundle's standalone uses a softer "wire-service / newspaper bulletin" treatment than the strict Aicher rules currently encoded in `aicher-system.css`. This prototype faithfully reproduces the standalone's softer treatment so you can compare. **Decide whether to adopt this softer direction or tighten the prototype.**

| Element                  | Prototype (faithful to standalone)               | `aicher-system.css` canonical       |
| ------------------------ | ------------------------------------------------ | ----------------------------------- |
| Card borders             | `1px solid #E5E5E0` (light gray hairline)        | `2px solid #000` (structural black) |
| Input borders            | `1px solid #E5E5E0`                              | `2px solid #000`                    |
| Button borders (loc-btn) | `1px solid var(--blue)`                          | `2px solid #000` or party tokens    |
| Ink colors               | `#15161A` / `#4A4D55` / `#7A7E88`                | `#111827` / `#4b5563` / `#6b7280`   |
| Card hover               | border flips to blue (matches canonical rule)    | border flips to blue ✓              |
| Sticky nav height        | 60px (computed from 14px padding + 32px content) | 56px                                |
| Layout radii (cards)     | 0px ✓                                            | 0px ✓                               |

### Open questions (unspecced in the bundle)

These were in the standalone HTML but have no spec in the design chats or JSX kit. Decide before implementing in `src/app/page.tsx`:

1. **Federal / State / Local dropdowns** — the nav buttons render a caret and `aria-haspopup="true"`, but no popup panel exists in any source file. What should each open? (My guess: Federal = `/officials` + `/bills` + `/committees`, State = state index, Local = roadmap stub.)
2. **Dark-mode toggle** — present in this surface only; no dark theme in the JSX kit or `aicher-system.css`. Should this ship before a real dark theme exists, or be hidden?
3. **The "N" FAB** — appears only in the standalone, no chat or JSX reference. Likely "Nostr" given the brand's Nostr-publishing story, but unclear what it should do (open a relay? link to `/nostr`? show a feed widget?). Currently a non-functional `aria-label="Nostr feed (placeholder)"` button.
4. **`USE MY LOCATION`** — needs geolocation API wiring + reverse-geocode fallback. Bundle leaves it as a non-functional button.
5. **`SEARCH` submit** — currently `GET /search?q=…` — that route does not exist in `src/app/`. Either build the search results page (the bundle has `SearchResults.jsx` to draw from at `civ-iq-design-system/project/handoff/reference-jsx/SearchResults.jsx`) or point the form at the existing `/officials` / `/your-reps` flow.

### Deliberately NOT included

Sections that exist in the bundle's other landing variants (`ui_kits/web/LandingScreen.jsx`, `redesign/Landing.jsx`) but were dropped in the standalone the user had open:

- Newspaper masthead strip ("Vol. III · No. 26 · …")
- "Sample Record" preview card next to hero
- Dark stat band (181 feeds / 535 / 17,400+ bills / $8.2B / 8th grade)
- "How it works" 4-step pipeline (Collect → Connect → Rewrite → Show the source)
- "Latest votes" / "Recent filings" two-column live feed
- "Coverage, Honestly" 3-tier strip
- "Who uses it" audience strip
- For-developers API/curl strip
- FAQ accordion
- Dark blue bottom CTA ("Look up your representatives.")

If you want any of these back, they live in:

- `civ-iq-design-system/project/ui_kits/web/LandingScreen.jsx` (lines vary)
- `civ-iq-design-system/project/redesign/Landing.jsx`

### Where this fits in the redesign roadmap

The repo has an in-flight `?v=new` redesign (PRs 1–23 landed) whose default-flag-flip is paused per `project_redesign-cutover-deferred.md`. The bundle's landing chrome (Federal/State/Local nav, 4-column footer) is a **different chrome system** than the `?v=new` work uses (`CqHeader` / `CqFooter` with `Find officials · Bills · State overviews · Methodology · About`). Choosing this landing as the production direction means deciding which chrome to standardize on for the whole site — that's the "chrome swap decision" listed as unblocker #7 in the cutover memo.

### Next steps (when you're ready)

1. Open `landing-v3.html` in the dev server, walk through it, decide:
   - Soft treatment (faithful to bundle) vs. tightened Aicher (2px black borders)?
   - Resolve the 5 open questions above
2. If approved, port to `src/app/page.tsx` using existing `aicher-system.css` tokens; replace inline SVG marks with the existing `<Logo>` component if one exists, otherwise extract to `src/components/landing/`.
3. Decide whether this lands behind `?v=design`, replaces the `?v=new` chrome, or replaces the default landing directly.
