# Chat

_Started 2026-05-04 22:13 UTC_

---

## User

## Assistant

Below are answers in order. Where I haven't decided yet, I've flagged it as open with a return date rather than guessing.

## Implementation strategy

**1. Tokens merge strategy — additive.**
New tokens layer on under new names; no existing token values change in PR 1. Why: PR 1 is global and non-reversible in practice, so we want zero behavioral change to unmigrated pages — visual updates land per-route via PRs 3+ that opt into the new token names. If we later want to retire old tokens, that's a separate, named deprecation PR with its own diff.

**2. Primitive replacement strategy — ship alongside.**
`Cq*` primitives land as new components; existing primitives stay untouched until each page migrates in its own PR. Why: a same-PR import-path swap couples the design-system change to 30+ page migrations and makes bisecting regressions painful. Per-page migration PRs can be reverted independently. Retirement of the old primitives is a final cleanup PR after all routes are migrated, and I'll name the retirees in that PR's description, not now.

**3. Feature-flag and visual-regression plan — per-route flag (`?v=new`), env-gated default.**
Each redesigned route reads `?v=new` (or `NEXT_PUBLIC_CIVIQ_V=new` in non-prod) to render the new tree; default stays old until the route's flip-PR. Visual regression: Playwright snapshot per redesigned route at 1440 and 390 widths, captured on both `?v=old` and `?v=new`, gating PRs 3+. PR 1 (tokens) and PR 2 (primitives) only need a smoke snapshot on the existing routes to confirm no visual drift, since they're additive.

**4. Empty / error / loading states — apply the existing "Data unavailable" pattern by default; designed states only where called out.**
For Congress.gov, FEC, Senate LDA, OpenStates, and Regulations.gov panels: use the existing "Data unavailable — last successful fetch {timestamp}" component for 404/5xx, and the existing skeleton for loading. Rate-limit (429) renders the same "Data unavailable" copy with a "retry in {n}s" subline. Why: panels here are read-only data surfaces, and a consistent fallback is more legible than 12 bespoke empty states. The exceptions with designed empty states are `AskResult` (no-results variant in template #35), `LobbyingActivity` (no filings variant), and `BillTimeline` (pre-introduction variant) — those three are intentional product moments, not error states.

## Open product decisions

**5. AskResult confidence — band label ("High / Medium / Low").**
Three bands, mapped from the float server-side. The numeric confidence is not a meaningful precision signal to a civic-information audience and invites false comparison.

**6. SectorResultRow density — "top 1 + (2 more)".**
Single named entity with a "+2 more" affordance that expands inline. Keeps the row scannable in a long results list.

**7. RegulationResultRow — drop "stage", keep "comment status".**
Comment status is the actionable signal (open / closing soon / closed); rule stage is secondary and lives on the detail page.

## Scope clarifications

**8. Map placeholders — follow-up PR, not in PR 15/16.**
Real Mapbox/MapLibre wiring is deferred to a post-launch PR. Production fallback is the styled SVG placeholder shipped in the templates, with district/ward labels rendered from the same data the real map will consume — so swapping in the live layer is purely visual.

**9. Hand-drawn charts — confirmed, no shared helper.**
`PollChart` and `PACChart` inject data directly into SVG path geometry inline per their templates. There is no `<DesignChart>` or equivalent helper file. If a third chart appears later we can extract one then.

**10. Handoff bundle freshness — open, will return by 2026-05-06.**
I need to diff `handoff/reference-jsx/` against the 2026-05-04 final memo's manifest before confirming all 35 files are present and `IMPLEMENTATION_NOTES.md` mapping table is current. Will post the delta (or a clean confirmation) Wednesday.

**11. Storybook — dev-side prerequisite.**
Design isn't scaffolding Storybook. PR 2 should either drop the Storybook-entries line item and rely on the existing `Cq*` example routes for primitive review, or a dev-side PR 2a stands up Storybook config first. My preference is to drop it for this cycle — example routes have been sufficient through Canvases 1–7.
