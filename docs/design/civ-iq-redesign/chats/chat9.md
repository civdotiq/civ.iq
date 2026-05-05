# Claude Code Instructions

_Started 2026-05-04 21:12 UTC_

---

## User

## Assistant

I'll start by exploring the existing design system to understand the chassis (`tokens.css`, `chrome.jsx`, `primitives.jsx`) and existing canvases so I can build coherent extensions.

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

I have a strong sense of the system. Let me look at the existing canvases (especially the latest) and key primitives to understand the chassis I'm extending.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Let me look at the existing canvas examples and design-canvas component, then plan the work.

_[tool: read_file]_

_[tool: read_file]_

I have a clear picture now. Let me snip the README read which I've internalized, then look at a couple more reference files to understand the chassis style and check the Coverage canvas for previous patterns.

_[tool: read_file]_

_[tool: read_file]_

I have enough context. Let me plan and start building.

_[tool: update_todos]_

[Acknowledged silently — beginning Bucket 1.]

_[tool: snip]_

Now I'll write Bucket 1 — the 5 search row variants. I'll create a single `SearchVariants.jsx` file with all five row components plus a wrapper that renders each within the same chassis as `SearchResults`.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: show_html]_

_[tool: snip]_

_[tool: get_webview_logs]_

I'll continue with Bucket 2 — Embed Mode. The brief calls for a chassis variant (no header/footer/breadcrumbs, just a panel with attribution), 3 embed panels at responsive widths, and a print template.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

Now Bucket 3 — the AI Surface. The brief is heavy on this one. Key points: NO chatbot vocabulary, wire-bulletin Q&A column aesthetic, citation-required, methodology block, confidence band, limitations panel. And the `/investigate` IA call — I'll pick **Option 1: Deprecate** (most consistent with "infrastructure, not investigation tool" product memory) and document the rationale in the canvas itself.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

_[tool: update_todos]_

All three canvases shipped:

- **Canvas 5 · Search Variants** — 5 row templates (DistrictResultRow, StateResultRow, SectorResultRow, RegulationResultRow, TopicResultRow) on the same `FacetGroup` chassis, with per-variant empty states and reference rows for each.
- **Canvas 6 · Embed Mode** — mast-less chassis variant + EmbedBill/EmbedDistrict/EmbedReps at 320/480/640px (the panel grid genuinely reflows, doesn't just shrink type) + PrintDistrict letter-size 2-column.
- **Canvas 7 · AI Surface** — AskEntryPage (wire-bulletin Q&A, no chat composer) + AskResultPage (question echo → answer with inline citations → expanded source rail → confidence/methodology/limitations sticky right rail). `/investigate` decision: **deprecate** (Option 1), with the rejected options + rationale on-canvas.

Pushback flagged for review:

- **Bucket 1 metadata grids** — used the suggested grids verbatim. Two worth checking: SectorResultRow's "top 3 PACs / top 3 recipients" is a lot to fit at 36px row height; rendered as compact mono lists, may want demotion to "top 1" with a `+2 more` affordance. RegulationResultRow's "stage" + "comment status" overlap conceptually — left both, but flag.
- **AI surface no-chatbot framing** — held the line: question slips, citation rail with inline numbered superscripts, methodology block titled "How this answer was built." No bubbles, no sparkles, no "assistant."
- **/investigate** — picked deprecate, not Option 2. The "compare 5 reps" use case is real but is better solved as a Q&A multi-entity slug (`/ask/voting-record-housing/NY-delegation`); noted as an entity-resolver enhancement, not a separate canvas.

## User

Verifier agent check completed

## Assistant

Verifier passed clean across all three canvases. Buckets 1, 2, and 3 are ready for review — when you've looked them over, ping me on any of the pushback items (Bucket 1 row density, the deprecate call, anything else) and I'll iterate.

## User

What can I tell Claude Code?

## Assistant

Here's the handoff message for Claude Code — paste this into the dev repo:

---

# CIV.IQ Design — Coverage Canvases 5–7 shipped

Three new canvases close out the GAP doc. Templates 25–35 are ready to implement against `tokens.css`. Same hard rules as prior canvases: reference spec, not code to import.

## What landed

**Canvas 5 — `redesign/Search Variants.html`** · Phase 3
5 new row variants extending `SearchResults.jsx`:

| #   | Template              | Routes                           |
| --- | --------------------- | -------------------------------- |
| 25  | `DistrictResultRow`   | `/districts`, `/state-districts` |
| 26  | `StateResultRow`      | `/states`                        |
| 27  | `SectorResultRow`     | `/industry`                      |
| 28  | `RegulationResultRow` | `/regulations`                   |
| 29  | `TopicResultRow`      | `/topics`                        |

Same `FacetGroup` sidebar, ~36px row height, reuses `CqPortrait` / `CqStat` / `CqBar` / `CqLabel` / `CqSourceTag`. Per-variant empty states are designed (not generic). One `CqSourceTag` per row, max.

**Canvas 6 — `redesign/Embed Mode.html`** · Phase 5
Mast-less chassis variant + 3 panels at 320/480/640 + 1 print:

| #   | Template        | Route                           |
| --- | --------------- | ------------------------------- |
| 30  | `EmbedBill`     | `/embed/bill/[billId]`          |
| 31  | `EmbedDistrict` | `/embed/district/[districtId]`  |
| 32  | `EmbedReps`     | `/embed/reps/[districtId]`      |
| 33  | `PrintDistrict` | `/districts/[districtId]/print` |

Embed chassis: no `CqHeader` / `CqFooter` / breadcrumbs. Yes to 2px borders, source tags, plain readings, party tokens, tabular nums, confidence/methodology/correlation disclaimer, single bottom "Data via CIV.IQ" attribution. The panel grid genuinely reflows across the three widths — don't just shrink type. Print is letter-size 2-column, no interactive elements.

**Canvas 7 — `redesign/AI Surface.html`** · Phase 6
| # | Template | Route |
|---|---|---|
| 34 | `AskEntryPage` | `/ask` |
| 35 | `AskResultPage` | `/ask/[slug]/[entityId]` |

Wire-bulletin Q&A on the same Aicher chassis. **No chatbot vocabulary** — no "chat" / "assistant" / "bot" / sparkles / message bubbles / soft corners anywhere in the implementation. Brand word is "Ask" or "Q&A". Question echo is parsed + structured (entity chips), not free-text. Every claim carries an inline numbered superscript anchored to an expanded citation rail. Methodology, confidence band, limitations are all separate components — methodology titled "How this answer was built." Reading-level ≤ 8 is enforceable copy, not just a guideline.

## /investigate IA call

**Deprecate.** PR 0.5: 301 redirect `/investigate` → `/ask`. No template needed. Rationale on Canvas 7. Multi-entity comparison ("compare 5 reps' votes on housing") is handled by `/ask` with a delegation slug (`/ask/voting-record-housing/NY-delegation`) — entity-resolver enhancement, not a new chassis.

## Sequencing

1. PR 0 — `/representative/` → `/officials/` rename (already queued)
2. PR 0.5 — `/investigate` → `/ask` 301
3. Phase 3 PRs — Templates 25–29 (one PR each)
4. Phase 5 PRs — Templates 30–33
5. Phase 6 PRs — Templates 34–35

## Hard rules (unchanged)

Reference spec, not code to import. Don't ship `@babel/standalone`. Don't `Object.assign(window, …)`. Don't import inline data stubs into production routes. Don't reuse `<DesignCanvas>` / `<DCSection>` / `<DCArtboard>` — those are canvas chrome only. Re-derive against the existing Next.js + Tailwind stack using `tokens.css` as the contract. Match copywriting voice (uppercase labels, sentence-case body, confidence + methodology + correlation disclaimer on every analytic insight).

## Open design questions worth a look before you start

- **Bucket 1 row density.** SectorResultRow's "top 3 PACs / top 3 recipients" rendered as compact mono lists at 36px row height — works, but `top 1 + "(2 more)"` may be calmer. Flag during PR 27.
- **RegulationResultRow** — "stage" and "comment status" overlap conceptually. Left both per brief, but if implementation feels redundant, drop "stage."
- **Q&A confidence score format.** Two-decimal float (0.91) on Canvas 7. If product wants a band label only ("High / Medium / Low") to avoid false precision, swap at the component level.

After Phase 6 ships, the GAP doc closes out.

---

Files to point Claude Code at:

- `redesign/Search Variants.html` + `redesign/SearchVariants.jsx`
- `redesign/Embed Mode.html` + `redesign/EmbedMode.jsx`
- `redesign/AI Surface.html` + `redesign/AISurface.jsx`
- `colors_and_type.css` (token contract)
- `GAP-redesign-coverage-2026-05.md` (existing 18-PR plan)
