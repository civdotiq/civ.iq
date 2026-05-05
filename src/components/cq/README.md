# Cq\* Primitives — CIV.IQ Redesign

Token-driven React components for the 2026-05 redesign. Reference spec lives in
`docs/design/civ-iq-redesign/` (vendored handoff bundle).

## Usage

```tsx
import { CqPage, CqStat, CqLabel, CqChip, CqDisclaimer } from '@/components/cq';

export default function ExamplePage() {
  return (
    <CqPage currentNav="find" crumbs={['HOME', 'OFFICIALS', 'JEFFRIES']}>
      <CqLabel>Bills sponsored</CqLabel>
      <CqStat label="Bills" value="42" />
      <CqChip variant="d">D-NY-08</CqChip>
      <CqDisclaimer confidence={0.94} asof="May 4, 2026" />
    </CqPage>
  );
}
```

## Contract

- All colors come from CSS custom properties (`var(--civiq-blue)`, `var(--fg1)`, etc.).
  Tokens are defined in `src/styles/aicher-system.css`. Dark mode flips automatically
  via the `.dark` class on `<html>`.
- Spacing follows the 8px grid (`var(--grid)`).
- Borders are `2px solid var(--ink)` (structural), `1px solid var(--line)` (divider),
  `3px solid var(--ink)` (emphasis).
- Layout containers are square (`var(--radius-layout)` = 0). Interactive elements
  use `var(--radius-interactive)` = 3px.
- Confidence in `CqDisclaimer` renders as a band label (High / Medium / Low),
  not a numeric float — per chat10 product decision.

## What lives here

| Component        | Purpose                                                |
| ---------------- | ------------------------------------------------------ |
| `CqLabel`        | Uppercase tracked label (12px), the Aicher signature   |
| `CqChip`         | Party / status pill (D / R / Info / Warn / Ink)        |
| `CqSourceTag`    | Source attribution rail (compact + full)               |
| `CqButton`       | Primary / secondary / ghost button                     |
| `CqPortrait`     | 2px-framed square portrait with party stripe           |
| `CqStat`         | Headline number with label + caption (tabular-nums)    |
| `CqBar`          | Horizontal data row (label · bar · pct · amount)       |
| `CqPlainReading` | Blue-left-bar callout, plain-language summary          |
| `CqDisclaimer`   | Confidence + as-of + methodology + correlation footer  |
| `CqLogoMark`     | Pictogram lockup (red dot, green stem, four blue dots) |
| `CqSearchGlyph`  | Search icon (circle + handle)                          |
| `CqBreadcrumb`   | Black masthead crumb row                               |
| `CqHeader`       | 56px chassis header with nav + search                  |
| `CqFooter`       | Dossier-strip footer with sources + methodology        |
| `CqPage`         | Composed chassis (Header + Breadcrumb + main + Footer) |

## Hard rules (from `docs/design/civ-iq-redesign/project/handoff/IMPLEMENTATION_NOTES.md`)

These primitives ship **alongside** existing primitives — they don't replace them.
Pages opt into the redesign by importing `@/components/cq`. Existing pages
continue to use the existing components until their migration PR.

Do not:

- Copy `chrome.jsx` / `primitives.jsx` / `data.jsx` from the handoff into `src/`.
  Those are reference-jsx prototypes.
- Use `Object.assign(window, …)` to share components.
- Add `@babel/standalone` or `<script type="text/babel">` anywhere.
- Import inline data stubs (`OFFICIAL_JEFFRIES`, `BILL_HR3684`, etc.) into
  production routes — they are content specs, not values.

Do:

- Use the existing data layer (`src/lib/`, `src/features/`).
- Match the **information hierarchy** from the reference HTML, not the inline
  prototype style objects.
- Follow `CONTENT FUNDAMENTALS` from `docs/design/civ-iq-redesign/project/README.md`
  (8th-grade reading level, sentence case body, uppercase labels, no emoji).
