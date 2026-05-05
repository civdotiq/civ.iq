# CIV.IQ Design System

> **Civic intelligence from government sources, organized for public use.**

CIV.IQ aggregates public data about elected officials — voting records, campaign finance, committee assignments, lobbying filings, federal spending — from 19 government sources into one clear civic record. Citizens enter an address and see who represents them, how they vote, and who funds them, at an 8th-grade reading level. No editorializing, no ads, no signups, no fabricated data.

The brand is **Otl Aicher / Ulm School / 1972 Munich Olympics** through-and-through: a red dot, a green rectangle, and four blue pictogram dots form a lowercase "i". Everything downstream — typography, grid, iconography, copywriting — flows from that heritage. Functional clarity over decoration.

---

## Sources

- **Logo hero image:** `uploads/civiq-logo-hero.webp` (user-provided)
- **Codebase:** GitHub `civdotiq/civ.iq` (MIT, Mark Sandford). Canonical style source is `src/styles/aicher-system.css`. Icon system is `src/components/icons/AicherIcons.tsx`. Landing behavior is `src/app/page.tsx` + `src/components/SearchForm.tsx` + `src/components/landing/FeatureGrid.tsx` + `src/components/landing/QuickStartPaths.tsx`. Header is `src/shared/components/navigation/Header.tsx`.
- **Fonts:** Braun Linear (Thin/Light/Regular/Medium/Bold) — shipped with the repo, copied here into `fonts/`.
- **Product copy source of truth:** `public/llms.txt` in the repo.

---

## Index

```
README.md                 ← you are here
SKILL.md                  ← Agent-Skills–compatible entry point
colors_and_type.css       ← CSS vars: colors, fonts, type scale, tracking, motion
fonts/                    ← Braun Linear woff2 (5 weights)
assets/                   ← logos, favicons, icons.jsx (full pictogram set)
preview/                  ← design-system cards (registered for the DS tab)
ui_kits/
  web/                    ← Civ.iq website UI kit: landing, rep profile, bill, search
slides/                   ← (none — no deck template provided)
```

---

## CONTENT FUNDAMENTALS

**Voice is institutional, restrained, factual.** Think "wire service" crossed with "civics textbook". CIV.IQ talks _about_ data, not at the reader. Never exclaims. Never asks rhetorical questions. Never hedges ("probably", "maybe") — every claim carries a confidence score and methodology note instead.

**Reading level: 8th grade.** Plain words: _uses, funds, votes, sponsors, meets_. Not: _utilizes, capitalizes, deliberates_.

**Casing:**

- **UPPERCASE for labels, nav, section eyebrows, CTAs** — the Aicher signature ("KNOW YOUR", "QUICK START", "SEARCH", "FEDERAL").
- **Title Case for proper nouns** — "Hakeem Jeffries", "House Minority Leader", "119th Congress".
- **Sentence case for body and descriptions** — "See how your representatives vote, who funds them, and what they sponsor — all from public government data."

**Person:**

- Product-to-user: **"you" / "your"** — "Know Your Representatives", "Your Reps", "Find your federal, state, and local representatives."
- Product-as-organization: **third person** — "CIV.IQ fills the vacuum…", never "we".
- Never "our representatives" — they aren't CIV.IQ's, they're yours.

**Numbers are specific and real.** "535 Members", "7,383 Districts", "$2B+ Tracked", "119th Congress", "60 requests/minute". No "thousands of" or "lots of". Numerals from 10 up. Tabular-nums for stat displays.

**Tone markers.** Honest about gaps: _"dataQuality: 'unavailable' rather than empty arrays."_ — "Local government coverage — expanding incrementally." — "Federal only — state campaign finance is not currently available." If data is missing, the copy says so.

**No exclamation marks. No emoji.** Zero. The brand is a public utility — a library card catalog, not an app. Iconography fills the expressive role emoji would otherwise take.

**CTAs are verbs in uppercase.** `SEARCH`, `VIEW MI`, `CHOOSE YOUR DISTRICT →`, `Try Again`, `Dismiss`. Arrow glyph `→` is allowed. Never "Get started" or "Let's go".

**Example copy:**

- Hero: "**KNOW YOUR REPRESENTATIVES.** See how your representatives vote, who funds them, and what they sponsor — all from public government data."
- Microcopy: "Try: '123 Main St, Detroit, MI' or '1600 Pennsylvania Ave, Washington, DC'"
- Error: "**MULTIPLE DISTRICTS FOUND** — Your address may span multiple districts. Use advanced search to select yours."
- Disclaimer (required on every analytic insight): confidence score (0–1), data-as-of timestamp, methodology, "correlation does not imply causation".

---

## VISUAL FOUNDATIONS

### Colors

Three brand primaries from the logo. No gradients. Ever.

- **`--civiq-red` `#e11d07`** — emphasis, banners, CTAs-with-urgency; also the Republican party token.
- **`--civiq-green` `#0a9338`** — confirmation accents, data bars; also the Democrat party token.
- **`--civiq-blue` `#3ea2d4`** — **the primary action color.** Buttons, links, focus rings, "success" states (blue, not green, because green is reserved for party). Hover-underlines. Selected tabs.

Because red/green encode _party_, CIV.IQ separated status semantics:

- **Success → blue** (`#3ea2d4`), not green.
- **Error → amber** (`#b45309`), not red.
  Warnings are amber `#d97706`.

Neutrals are cool greys (`--fg1 #111827` through `--fg4 #9ca3af`, `--bg2 #f9fafb`). Structural borders are black (`#000`) in light mode, `#333` in dark.

For data viz with 4+ categories, Aicher/ERCO chromatic greys are added: `--data-vlau` `#6b6b83` (violet-grey) and `--data-greige` `#b8b5a9` (grey-beige) — so a chart doesn't have to touch red or green except for party alignment.

### Type

**Braun Linear** (Dieter Rams, shipped with the repo, 5 weights) with `Helvetica Neue → Helvetica → Arial` fallback. The geometric sans-serif is doing Aicher's job.

Scale is systematic, 1.25–1.5× steps: 12 / 14 / 16 / 18 / 24 / 32 / 48 / 64 px. **Tracking varies by size:** `-0.02em` at display, `+0.02em` at heading, `+0.025em` at body, **`+0.08em` at label/12px** — opening up the small caps in classic Ulm fashion. Display and titles are **UPPERCASE**. Labels are uppercase + tracked. Body is sentence case.

### Spacing

**Strict 8px grid.** Every margin, padding, gap, and component height is a multiple of `--grid` (8px). Utilities run `p-1` through `p-6` and `grid-1` through `grid-8`. Touch targets are `44px` (5.5 × grid) minimum on mobile.

Rhythm: `rhythm-compact` 24px, `rhythm-section` 40px, `rhythm-break` 64px. Density presets: `density-compact` / `density-default` / `density-detailed` expose `--section-gap` and `--card-padding` tokens for contextual tuning.

### Backgrounds

**Paper-first.** Pure `#fff` surfaces on a `#f9fafb` ground. No hero images, no photography as background, no patterns, no textures, no blur. The logo image is the only brand illustration and it is used sparingly and centered. A single full-bleed product shot is allowed in a hero block; it is framed, not bled.

### Borders

Borders are the entire visual grammar. **Shadows are reserved for true elevation only** — tooltips and modals. Weight hierarchy:

- `--border-divider` `1px` — list rows (0.5px on retina).
- `--border-structural` `2px` — every card, container, input, button, image frame.
- `--border-emphasis` `3px` — selected states, active tabs, status-accent left bars.

All structural borders are **solid black** in light mode. Hover on a card swaps the black border to `--civiq-blue`.

### Radii

**Layout is square.** `--radius-layout: 0px`. Cards, containers, images, sidebars — all hard-cornered. **Interactive elements are softened 3px** — `--radius-interactive: 3px` for buttons, badges, chips, inputs. No pill shapes except profile photos (hard square 120×120 frame — pictogram tradition).

### Shadows

`--shadow-tooltip` (subtle, 2px) for tooltips. `--shadow-elevated` (12px) for popovers, modals, dropdowns. Nothing else gets a shadow. Cards rely on 2px black borders.

### Motion

`--timing-aicher: cubic-bezier(0.25, 0.1, 0.25, 1)` — mechanical, not springy. `--duration-default: 150ms` desktop, `100ms` mobile. Fades: `animate-fadeIn` 400ms, `animate-slideIn` 300ms. No bounce, no parallax, no scroll-linked animation. Hovers are instant and linear.

### Hover + press

- **Card hover:** border flips black → `--civiq-blue`. Optional `translateY(-2px)` lift (`aicher-hover`). No shadow added.
- **Button hover:** color inversion — white button with black border becomes black with white text; primary-blue becomes white with blue text. No brightness shift.
- **Accent-bar hover:** 6px left-bar widens to 12px (`accent-bar-hover`).
- **Press:** `translateY(0)` or `translateY(1px)`. No scale shrink.
- **Link hover:** underline grows left→right (`link-underline`).

### Focus

`outline: 2px solid var(--civiq-blue); outline-offset: 2px;` — visible, square, never rounded.

### Transparency + blur

Avoided. The only transparency is `rgba(62,162,212,0.2)` for `::selection` and the subtle `rgba(62,162,212,0.1)` grid-debug overlay. No backdrop-filter. No glassmorphism.

### Layout rules

The fixed header is `56px` tall with a `2px solid black` bottom border, always. The logo lockup sits left, nav sits center-right, search + theme toggle sit right. Content is capped at `max-w-6xl` (1152px) with 16–24px gutters; hero blocks go to `max-w-4xl` (896px).

### Cards

2px black border, white background, 24–32px padding, square corners, no shadow. Optional 4px top or 6px left accent bar in red/green/blue to categorize. Hover borders go blue. Nested cards are avoided — prefer `aicher-data-list` (2px top + 2px bottom row borders, no card-in-card).

### Imagery + photo treatment

- Representative photos: square, 120×120, 2px black frame, `object-fit: cover`. No circular portraits.
- Logo: the full-color pictogram on white. Never recolored, never on a busy background.
- Full-bleed imagery is rare; when used, always B&W or documentary-cool, never warm filters or grain.
- No stock illustrations.

---

## ICONOGRAPHY

**One proprietary set — `AicherIcons` — copied wholesale into `assets/icons.jsx`.** 27 icons, built to strict Aicher-pictogram rules:

- **24×24 grid, 2px uniform stroke, geometric primitives only** — circles, rectangles, lines; right angles and 45° diagonals only.
- **Solid black fills** (`currentColor`), no gradients, no partial opacity except the loading spinner.
- **Human figures** follow the 1972 Munich template: circle head (r=2–3), rectangular torso, rectangular legs — never outlined. See `RepresentativeIcon`, `RepresentativesIcon`, `CommitteeIcon`.
- **Objects** use recognizable silhouettes reduced to primitives: `CapitolIcon` (columns + pediment + dome, all rects), `VoteIcon` (checkmark as solid polygon in a square), `LocationIcon` (teardrop = circle + triangle), `SearchIcon` (circle + rotated rect handle).
- **Directional glyphs** (`ArrowRightIcon`, `ArrowLeftIcon`) are a rect shaft + solid triangle head.

**Usage.** Icons are placed inside **color-filled squares** (`w-12 h-12`, primary/red/green/blue) with **white icon fill** for feature cards — the 1972 pictogram-on-colored-tile layout. For inline icons (nav, buttons, list items), the icon inherits `currentColor` from surrounding text. Size runs `14–24px` inline, `24–32px` on tiles.

**Never used:** emoji (zero — not even a ✅ or 🏛️), unicode icon glyphs, Font Awesome, Lucide, Heroicons, Material icons. The brand has its own pictogram vocabulary that is central to its Aicher lineage; substituting a generic set would break the heritage. If a glyph is missing, add it to `assets/icons.jsx` using the existing rules.

**Arrow-glyph exception.** The literal Unicode `→` (U+2192) is allowed in copy (`CHOOSE YOUR DISTRICT →`) because it reads as type, not as an icon.

---

## CAVEATS + SUBSTITUTIONS

- **Braun Linear is genuinely shipped** in the civ.iq repo (5 weights, woff2) and is copied into `fonts/` here. No Google-Font substitution was needed. If the license becomes a concern, closest fallback is **Inter** or **Helvetica Neue**; the fallback stack in `colors_and_type.css` is already `'Braun Linear', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif`.
- The repo's `.tsx` pages depend on Next.js / Tailwind utilities (`bg-civiq-blue`, `tracking-aicher`, `px-grid-2`, etc.) that this design system inlines as plain CSS classes / variables in `colors_and_type.css` so the UI kits run in vanilla HTML without a build step.
- No slide template was provided. `slides/` is intentionally absent.

---

## UI KITS

- **`ui_kits/web/`** — landing page, representative profile, bill detail, search-results. Built from the actual `page.tsx` + `FeatureGrid` + `SearchForm` + `Header` source. See `ui_kits/web/README.md`.

The mobile and embed widget surfaces exist in the codebase but are deliberately not rebuilt here — the web UI kit already covers the core visual vocabulary at typography-parity.
