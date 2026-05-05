# Documentation updates

_Started 2026-05-04 20:34 UTC_

---

## User

update reference-jsx/ and IMPLEMENTATION_NOTES.md to include the 8 new  
 templates

## Assistant

I'll explore the project structure first to understand what we're working with.

_[tool: list_files]_

_[tool: list_files]_

_[tool: grep]_

Let me explore the handoff structure and understand the current state.

_[tool: list_files]_

Now let me identify the 8 new templates by comparing redesign/ to handoff/reference-jsx/.

_[tool: run_script]_

The 8 new templates are: Compare, DistrictPage, Election, IssueTopic, LocalCouncil, PACProfile, SpendingContract, VotingRecord.

Let me check IMPLEMENTATION_NOTES.md and the \_render.html to understand structure, then examine if redesign jsx files are self-contained or rely on the same primitives.

_[tool: read_file]_

_[tool: read_file]_

Now let me look at the new jsx files briefly to understand their components/exports, and check what needs to be exported.

_[tool: run_script]_

_[tool: snip]_

Let me check whether the new files use `Object.assign(window,...)` and verify all needed components/data are available globally. Then I'll copy them and update the harness + notes.

_[tool: grep]_

_[tool: grep]_

Good — pattern is consistent. Let me also verify whether the existing handoff/reference-jsx files are identical to redesign/ versions, and check screens listing for screenshot files.

_[tool: run_script]_

Good — handoff is in sync. No screens/ html files to add (only the harness exists). Now I'll:

1. Copy the 8 new jsx files into `handoff/reference-jsx/`
2. Update `handoff/screens/_render.html` to load them and add screen entries
3. Update `handoff/IMPLEMENTATION_NOTES.md` mapping table & per-screen notes

_[tool: copy_files]_

Now update the render harness:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

Now update IMPLEMENTATION_NOTES.md. I'll add the 8 new templates to the mapping table, expand the "What this redesign IS" intro section, and add per-screen gotchas. Let me read a few of the new files briefly to write accurate gotchas:

_[tool: run_script]_

Now update IMPLEMENTATION_NOTES.md:

_[tool: str_replace_edit]_

Now let me verify by loading one of the new screens in the harness:

_[tool: show_html]_

The user asked for a file edit task, not a build. Let me just verify the harness loads cleanly via webview logs check, then summarize.

_[tool: show_html]_

_[tool: get_webview_logs]_

Clean (only Babel's standard dev-mode warning). Let me check a couple more to be safe:

_[tool: show_html]_

_[tool: get_webview_logs]_

Clean. Done.

**Summary**

Updated `handoff/reference-jsx/` and `handoff/IMPLEMENTATION_NOTES.md` to include the 8 new templates (`Compare`, `DistrictPage`, `Election`, `IssueTopic`, `LocalCouncil`, `PACProfile`, `SpendingContract`, `VotingRecord`):

- **`handoff/reference-jsx/`** — copied all 8 jsx files from `redesign/`.
- **`handoff/screens/_render.html`** — added `<script>` includes and 8 new entries to the `SCREENS` map (`compare`, `district`, `election`, `issue-topic`, `local-council`, `pac-profile`, `spending-contract`, `voting-record`). Verified with `?screen=compare` and `?screen=election` — both render clean.
- **`handoff/IMPLEMENTATION_NOTES.md`**:
  - Added an "Expansion templates (added 2026-05)" line to the "What this redesign IS" intro.
  - Appended 8 rows to the file→real-route mapping table with best-guess Next.js routes and component names.
  - Updated the PR sequence in "Recommended implementation order" to ~18 PRs and noted the 8 expansion templates reuse existing primitives — no new shared components needed, sequence by product priority.
  - Added a per-screen gotcha block for each of the 8.

Next steps if you want them: pin screenshots into `handoff/screenshots/` for the new screens, and add a `screens/*.html` baked render per template to match the existing convention (right now only `_render.html` exists).

## User

Please give me a prompt to tell Claude Code about these changes.

## Assistant

_[tool: snip]_

Here's a prompt you can paste to Claude Code:

---

The CIV.IQ redesign handoff has been expanded with **8 new page templates** (added 2026-05). The reference spec lives in `docs/design/civ-iq-redesign/` (or wherever you've vendored the handoff folder) — re-read `IMPLEMENTATION_NOTES.md` first, the mapping table and per-screen gotchas have been updated.

The new templates (all in `reference-jsx/`, all reusing the existing primitives + chrome from PR 1–2 — no new shared components required):

| Template                                        | Renders                                                                    | Suggested route                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| `Compare.jsx` → `ComparePage`                   | Two officials side-by-side (matched rows, not two profiles glued together) | `src/app/compare/page.tsx` driven by `?a=&b=`             |
| `DistrictPage.jsx` → `DistrictPage`             | Single congressional district as a first-class page (NY-08 reference)      | `src/app/districts/[stateCode]/[districtNumber]/page.tsx` |
| `Election.jsx` → `ElectionPage`                 | Head-to-head matchup (OH-Sen 2024 reference)                               | `src/app/elections/[id]/page.tsx`                         |
| `IssueTopic.jsx` → `IssueTopicPage`             | Topic-as-entity aggregator ("Housing" reference)                           | `src/app/topics/[slug]/page.tsx`                          |
| `LocalCouncil.jsx` → `LocalCouncilPage`         | City-council chamber (NYC City Council D-33 reference)                     | `src/app/local/[municipalityId]/page.tsx`                 |
| `PACProfile.jsx` → `PACProfilePage`             | PAC profile (Senate Majority PAC reference)                                | `src/app/pacs/[id]/page.tsx`                              |
| `SpendingContract.jsx` → `SpendingContractPage` | USASpending award (SpaceX · NASA Commercial Crew reference)                | `src/app/spending/awards/[id]/page.tsx`                   |
| `VotingRecord.jsx` → `VotingRecordPage`         | Full filterable voting history for one member                              | `src/app/officials/[bioguideId]/votes/page.tsx`           |

To preview any of them locally: open `screens/_render.html?screen=<key>` where `<key>` is one of `compare`, `district`, `election`, `issue-topic`, `local-council`, `pac-profile`, `spending-contract`, `voting-record`.

**Same hard rules as before** — these JSX files are reference spec, not code to import. Don't ship `@babel/standalone`, don't `Object.assign(window, …)`, don't import the inline data stubs into production routes, don't reuse `<DesignCanvas>`/`<DCSection>`/`<DCArtboard>`. Re-derive components against the existing Next.js + Tailwind stack using `tokens.css` as the contract. Match copywriting voice (uppercase labels, sentence-case body, confidence + methodology + correlation disclaimer on every analytic insight).

**Sequencing.** Land these _after_ the core 10 PRs (tokens → primitives → ProfileHybrid → bill detail → search → committee → state overview → system pages → state legislator → roll-call → filings → industry sector). The 8 expansion templates are independent of each other — sequence by product priority. Each is one PR; each is independently revertible.

**Per-template gotchas** (full text in `IMPLEMENTATION_NOTES.md` "Per-screen gotchas") — a few highlights:

- **Compare**: parallel scanning is the point — don't dual-tab. Both portraits use the same hard-square 120×120 spec from `ProfileHybrid`.
- **DistrictPage / LocalCouncil**: `DistrictMap` and the ward map are styled SVG placeholders — wire to your real map layer (Mapbox/MapLibre) but keep the 2px-bordered container.
- **Election**: `PollChart` is hand-drawn SVG — match the geometry, don't substitute a charting library. Party tokens for fills, same constraint as `BillDetail`.
- **IssueTopic**: sponsor/opposition split-column treatment for key reps is load-bearing — don't collapse it.
- **PACProfile**: `PACChart` is a stacked-bar contributions-by-cycle SVG. Cross-link recipients → official profiles, donors → industry-sector pages.
- **SpendingContract**: two `PartyCard` blocks (awarder + recipient) mirror each other; milestones below stack like `BillDetail`'s `TimelinePanel`.
- **VotingRecord**: hero is the **compact** profile variant — links back out to the full profile. ~36px row height (same gotcha as `IndustrySectorPage`).

Pick one template, ship it as a single PR with the page + sub-components split into separate files, don't touch other routes.

## User

## Assistant

_[tool: read_file]_

<No need to peek further; the task is to draft an answers document for the engineer/designer to send back to Claude Code. I have enough context.>

_[tool: snip]_

Here's a reply you can send back to Claude Code. It answers Q1–Q5, addresses the bonus, and is written from the design side so the routing decisions are explicit and revertible.

---

# Re: Questions for Claude Design — 2026-05-04

Thanks for catching the routing inconsistencies. Answers below. None of these are visual decisions — they're IA calls — so treat my answers as defaults you can push back on if the live codebase makes them painful.

## Q1. `/representative/` → `/officials/` — yes, intentional rename

Land it as a **dedicated PR before PR 3 (ProfileHybrid)**. Don't ship the redesign at a URL we're about to deprecate.

- New canonical: `/officials/[bioguideId]` (federal), `/officials/state/[state]/[legislatorId]` (state — see Q4 first, this may not be the final shape).
- Old `/representative/...` paths → 308 permanent redirects to the new paths. Keep the redirects indefinitely; external links and search results will hold for years.
- Update `breadcrumb` copy from "Representatives" to "Officials" everywhere it appears.
- Reason: state legislators, governors, and judges all qualify as "officials"; "representative" is federal-House-leaning and we're already coloring outside it.

## Q2. `FECFilingDetail` → `/finance/filings/[id]`

Filings as **first-class entities, parallel to spending awards**.

- Canonical: `/finance/filings/[id]`
- Mirrors `/spending/awards/[id]` exactly — same URL grammar, same breadcrumb shape, same "primary document" mental model.
- Reject scoping under the official (`/officials/[id]/filings/[id]`) — filings are committee documents, not officeholder documents; scoping under a person misrepresents the source.
- Reject `/fec/...` namespacing — FEC is the source agency, not a user-facing concept. Users search for "Andy Kim's Q1 filing," not "FEC filing."
- Cross-link the filing back to the candidate, the committee, and (when applicable) the PAC. Don't subordinate it to any of them in the URL.

## Q3. Lobby filings — Option 3 (filings as peers)

Pick **Option 3**: `/lobby/filings/[id]` as a top-level filing route, leave `/lobby/[registrantId]` as the registrant entity hub.

Reasons:

- Mirrors the precedent we just set in Q2 (`/finance/filings/[id]`, `/spending/awards/[id]`). Three primary-document patterns, one URL grammar.
- Filings are **the** referenceable artifact for lobbying — citations, journalism, FOIA crosswalks all point at filings, not at registrant pages. Top-level URL keeps citations stable.
- Registrant page (`/lobby/[registrantId]`) keeps its job: "Akin Gump as an entity" — client roster, filings index, total dollars, key issue areas.
- Reject Option 1 (rescope) — lossy and breaks every existing inbound link to registrant pages.
- Reject Option 2 (sub-route) — implies the filing is owned by the registrant. It's not — it's a public document the registrant submitted.

## Q4. State-legislator profile — `/state-legislature/[state]/legislator/[id]`

**Pick the newer, scoped path. Deprecate the older federal-style mirror.**

- Canonical: `/state-legislature/[state]/legislator/[id]`
- Deprecate: `/representative/state/[state]/[legislatorId]` → 308 redirect to the canonical path (do this in the same PR as Q1).
- Reasons:
  - Breadcrumb writes itself: `Home › New York › Legislature › Sen. Gounardes`. No state-specific logic, no per-state breadcrumb branching.
  - Q1 makes the federal-style mirror even worse — `/officials/state/[state]/[id]` reads as "an official, who happens to live under state, oh and there's a state code, and then an id." The state-legislature-scoped path reads as a hierarchy.
  - Keeps the federal `/officials/[bioguideId]` namespace clean — federal officials have stable bioguide IDs; state legislators don't, and pretending they're peers in the same namespace will cause join headaches downstream.

## Q5. Per-template route summary — confirmed with one edit

| Template             | Canonical route                                                         |
| -------------------- | ----------------------------------------------------------------------- |
| ComparePage          | `/compare?a=&b=` ✅                                                     |
| DistrictPage         | `/districts/[stateCode]/[districtNumber]` ✅                            |
| ElectionPage         | `/elections/[id]` ✅                                                    |
| IssueTopicPage       | `/topics/[slug]` ✅                                                     |
| LocalCouncilPage     | `/local/[municipalityId]` ✅                                            |
| PACProfilePage       | `/pacs/[id]` ✅                                                         |
| SpendingContractPage | `/spending/awards/[id]` ✅                                              |
| VotingRecordPage     | `/officials/[bioguideId]/votes` ✅ (pending Q1, which is now confirmed) |

One add:

- **FECFilingDetail** → `/finance/filings/[id]` (Q2)
- **LobbyFilingDetail** → `/lobby/filings/[id]` (Q3)
- **StateLegislatorProfile** → `/state-legislature/[state]/legislator/[id]` (Q4)

Add those three rows to the mapping table when you sync `IMPLEMENTATION_NOTES.md`.

## Bonus: `/elections` listing routes

**Collapse to one listing with facets**: `/elections` with `?level=federal|state|local` and `?cycle=2026|2024|...` query params.

- Three parallel listings is a maintenance tax with no IA payoff — same row template, same filter chrome, just pre-filtered.
- Faceted single-listing matches what we did with SearchResults (one route, faceted sidebar).
- Keep `/elections/federal` and `/elections/state` as 308 redirects to `/elections?level=federal` etc. Indefinite — same reasoning as Q1.

## Not-blocking → now blocking, and resolved

The handoff-bundle staleness you flagged is fixed:

- `handoff/reference-jsx/` now contains all 24 JSX files (16 original + 8 expansion).
- `handoff/screens/_render.html` includes the 8 new screens — preview any with `?screen=<key>` where `<key>` ∈ `compare`, `district`, `election`, `issue-topic`, `local-council`, `pac-profile`, `spending-contract`, `voting-record`.
- `handoff/IMPLEMENTATION_NOTES.md` mapping table and per-screen gotchas are updated; PR sequence is now ~18 PRs.

I'll do a follow-up sync after this thread to add the three additional rows from Q2/Q3/Q4 plus the rename PR (Q1) into the implementation order. **Suggested PR order with these answers baked in:**

1. **Rename PR** (Q1 + Q4 redirects) — `/representative/...` → `/officials/...` and state-legislator path consolidation. Lands first, no UI changes.
2. PR 1 — Tokens.
3. PR 2 — Shared primitives.
4. PR 3 — ProfileHybrid (now at the new `/officials/[bioguideId]` URL).
5. PR 4+ — One page type per PR, in priority order. The 8 expansion templates are independent of each other.

Push back on any of these if the live codebase makes them expensive — I'd rather hear it now than after the rename PR is merged.
