# GAP — Redesign Coverage vs. Live Routes (2026-05-01)

Source of truth for the redesign:
`/Users/mbs/Downloads/CIV.IQ Design System-handoff.zip`
→ `civ-iq-design-system/project/redesign/` and `project/handoff/reference-jsx/`

The handoff itself states it is a **reference spec, not code to import** (see `handoff/IMPLEMENTATION_NOTES.md`). It ships **16 page templates** plus shared chassis (`tokens.css`, `chrome.jsx`, `primitives.jsx`).

The live site has **~80 page routes** (`src/app/**/page.tsx`, excluding APIs).

**Headline:** ~16/80 routes have a direct redesign template. Most of the remaining ~64 routes are listing pages, topic hubs, civic feature hubs, and legal/utility pages — they are not stuck waiting on Figma; they need to be applied against the chassis (tokens + primitives + chrome) using existing templates as the inheritance source.

---

## 1. Templates shipped in the handoff

From `redesign/` + `ui_kits/web/`:

| #   | Template                            | File                                           | Notes                            |
| --- | ----------------------------------- | ---------------------------------------------- | -------------------------------- |
| 1   | Landing                             | `Landing.jsx → LandingPage`                    | Hero + wire-bulletin             |
| 2   | Address result                      | `Landing.jsx → AddressResultPage`              | Triage UI for "you live at X"    |
| 3   | Search results                      | `SearchResults.jsx`                            | Faceted sidebar + 3 row variants |
| 4   | Federal profile (HYBRID — approved) | `ProfileHybrid.jsx` ⭐                         | Tabbed chassis, 5 panels         |
| 4a  | Federal profile (alt — Refined)     | `ProfileRefined.jsx`                           | Reference only                   |
| 4b  | Federal profile (alt — Dossier)     | `ProfileDossier.jsx`                           | Reference only                   |
| 4c  | Federal profile (alt — MoneyFirst)  | `ProfileMoneyFirst.jsx`                        | Reference only                   |
| 5   | Bill detail                         | `BillDetail.jsx`                               | Vertical 5-panel + timeline      |
| 6   | Committee detail                    | `CommitteeDetail.jsx`                          | Dense 8-col member grid          |
| 7   | Roll call detail                    | `RollLobby.jsx → RollCallDetail`               | Per-member vote grid             |
| 8   | Lobby filing                        | `RollLobby.jsx → LobbyFilingDetail`            | Money-flow SVG diagram           |
| 9   | FEC filing                          | `FECIndustry.jsx → FECFilingDetail`            | Money-flow SVG diagram           |
| 10  | Industry / sector                   | `FECIndustry.jsx → IndustrySectorPage`         | Ranked tables + bars             |
| 11  | State legislator profile            | `StateLegislator.jsx → StateLegislatorProfile` | Mirrors federal hybrid           |
| 12  | State legislature page              | `StateLegislator.jsx → StateLegislaturePage`   | Chamber rosters + calendar       |
| 13  | State overview                      | `StateOverview.jsx`                            | State landing                    |
| 14  | Methodology                         | `SystemPages.jsx → MethodologyPage`            | Static                           |
| 15  | About                               | `SystemPages.jsx → AboutPage`                  | Static                           |
| 16  | 404                                 | `SystemPages.jsx → NotFoundPage`               | File-stamp aesthetic             |

⭐ = approved direction. Build first.

---

## 2. Direct mapping — covered routes (~16)

| Live route                                     | Redesign template           | Status                                  |
| ---------------------------------------------- | --------------------------- | --------------------------------------- |
| `/`                                            | Landing                     | Covered                                 |
| `/your-reps`, `/your-reps/money-report`        | Address result              | Covered (split across two routes)       |
| `/(public)/search`, `/(public)/results`        | Search results              | Covered                                 |
| `/representative/[bioguideId]`                 | Federal profile (Hybrid) ⭐ | Covered — **build first**               |
| `/bill/[billId]`                               | Bill detail                 | Covered                                 |
| `/committee/[committeeId]`                     | Committee detail            | Covered                                 |
| `/vote/[voteId]`                               | Roll call detail            | Covered                                 |
| `/lobby/[registrantId]`                        | Lobby filing                | Close — registrant page, not per-filing |
| _(no route)_                                   | FEC filing                  | **Missing route** — needs to be created |
| `/industry/[sector]`                           | Industry / sector           | Covered                                 |
| `/representative/state/[state]/[legislatorId]` | State legislator profile    | Covered                                 |
| `/state-legislature/[state]/legislator/[id]`   | State legislator profile    | Covered (duplicate of above)            |
| `/state-legislature/[state]`                   | State legislature page      | Covered                                 |
| `/states/[state]`                              | State overview              | Covered                                 |
| `/methodology`                                 | Methodology                 | Covered                                 |
| `/(public)/about`                              | About                       | Covered                                 |
| `not-found.tsx`                                | 404                         | Covered                                 |

**Open questions surfaced by the mapping:**

- The redesign assumes a per-filing route for FEC; the live site has none. Decide: add `/finance/filings/[id]` or treat the existing `/representative/[bioguideId]` "Money" panel as the entry point.
- Two routes serve the state-legislator profile (`/representative/state/...` and `/state-legislature/[state]/legislator/[id]`). Pick one canonical and 301 the other.
- `/lobby/[registrantId]` is a registrant page; the redesign is a per-filing page. Either rescope the existing route or add a child `/lobby/[registrantId]/filings/[id]`.

---

## 3. Un-templated routes — inheritance plan (~55)

These routes have no direct redesign mock. They are not blocked on design — every one of them can be built by **applying the chassis** (tokens, `Cq*` primitives, `CqHeader`, source rails, 2px borders, plain-language readings) to one of the 16 existing templates as the inheritance source.

### 3a. Index / listing pages → inherit from **SearchResults** (faceted-listing pattern)

Take the SearchResults sidebar + result-row pattern. Drop facets that don't apply. Swap the row variant.

| Route                                   | Inherit from  | Row variant               | Delta                           |
| --------------------------------------- | ------------- | ------------------------- | ------------------------------- |
| `/representatives`                      | SearchResults | `ResultRow` (official)    | Filter by chamber/state/party   |
| `/committees`                           | SearchResults | `CommitteeResultRow`      | Filter by chamber/jurisdiction  |
| `/legislation`                          | SearchResults | `BillResultRow`           | Filter by congress/status/topic |
| `/state-bills`                          | SearchResults | `BillResultRow`           | Filter by state                 |
| `/state-bills/[state]`                  | SearchResults | `BillResultRow`           | Pre-filtered to one state       |
| `/districts`                            | SearchResults | new `DistrictResultRow`   | Map + state filter              |
| `/state-districts`                      | SearchResults | new `DistrictResultRow`   | State + chamber filter          |
| `/states`                               | SearchResults | new `StateResultRow`      | 50-row index                    |
| `/industry`                             | SearchResults | new `SectorResultRow`     | NAICS-style facets              |
| `/elections`                            | SearchResults | new `ElectionResultRow`   | Year + state                    |
| `/regulations`                          | SearchResults | new `RegulationResultRow` | Agency + comment-window         |
| `/state-legislature/[state]/committees` | SearchResults | `CommitteeResultRow`      | State-scoped                    |

### 3b. Detail pages mirroring an existing template

| Route                                           | Inherit from                    | Delta                                        |
| ----------------------------------------------- | ------------------------------- | -------------------------------------------- |
| `/state-bills/[state]/[billId]`                 | BillDetail                      | State-source rail; no Congress.gov           |
| `/state-legislature/[state]/committee/[id]`     | CommitteeDetail                 | State-source rail                            |
| `/state-legislature/[state]/vote/[id]`          | RollCallDetail                  | State chamber size                           |
| `/regulations/[documentNumber]`                 | BillDetail                      | Comment timeline replaces vote panel         |
| `/districts/[districtId]`                       | StateOverview                   | District-scoped roll-up; demographics + reps |
| `/state-districts/[state]/[chamber]/[district]` | StateOverview / district detail | State-district roll-up                       |
| `/delegation/[stateCode]`                       | StateOverview                   | Delegation roster panel                      |
| `/influence/[committeeId]`                      | CommitteeDetail                 | Add money-flow diagram (reuse from Lobby)    |

### 3c. Hub / overview pages → inherit from **StateOverview** (panel-grid roll-up)

| Route                | Inherit from                       | Delta                                            |
| -------------------- | ---------------------------------- | ------------------------------------------------ |
| `/federal`           | StateOverview                      | Federal scope, swap state header                 |
| `/congress`          | StateOverview                      | Both-chambers panel grid                         |
| `/congress/house`    | StateOverview                      | House-only                                       |
| `/congress/senate`   | StateOverview                      | Senate-only                                      |
| `/local`             | StateOverview                      | Local scope (limited data — honest empty states) |
| `/spending`          | StateOverview / IndustrySectorPage | Ranked tables of contracts/grants                |
| `/influence`         | StateOverview                      | Network/index of money flows                     |
| `/comment-periods`   | StateOverview                      | Open windows panel                               |
| `/executive-orders`  | StateOverview                      | Recent orders panel                              |
| `/enforcement`       | StateOverview                      | DOJ/SEC actions panel                            |
| `/elections/federal` | StateOverview                      | Federal cycle scope                              |
| `/elections/state`   | StateOverview                      | State cycle scope                                |
| `/alerts/status`     | StateOverview                      | Operational status panels                        |

### 3d. Topic hubs (12 + 1 index) → all share **one** new template

`/topics`, `/topics/agriculture`, `/topics/defense`, `/topics/economy`, `/topics/education`, `/topics/environment`, `/topics/finance`, `/topics/foreign-policy`, `/topics/healthcare`, `/topics/immigration`, `/topics/infrastructure`, `/topics/justice`, `/topics/technology`

These should NOT each get a bespoke design. Build **one topic-hub template** that takes `{ topic }` as input and renders:

- Topic header + 1-paragraph plain-language reading
- "Recent legislation" panel (BillResultRow rows)
- "Active hearings/regulations" panel
- "Top spenders this cycle" panel (sector ranked-bar pattern lifted from IndustrySectorPage)
- Source rail

Inheritance: **IndustrySectorPage chassis + BillDetail's plain-language reading pattern.**

### 3e. AI / interactive flows — need bespoke design

These have UX requirements that the handoff doesn't address:

| Route                    | Notes                                          |
| ------------------------ | ---------------------------------------------- |
| `/ask`                   | Q&A entry — prompt input + suggested questions |
| `/ask/[slug]/[entityId]` | Q&A result with citations                      |
| `/investigate`           | Open-ended investigation surface               |

Recommendation: **flag for a follow-up design pass.** Don't ship these in PR 1–10; keep the existing UI until a dedicated mock lands.

### 3f. Education / glossary

| Route                          | Inherit from  | Delta                        |
| ------------------------------ | ------------- | ---------------------------- |
| `/education`                   | SearchResults | Lesson rows                  |
| `/education/[lessonId]`        | Methodology   | Long-form static page        |
| `/glossary`                    | SearchResults | Term-row variant, A–Z facets |
| `/glossary/[term]`             | Methodology   | Single-term definition page  |
| `/transparency/reading-levels` | Methodology   | Static report                |

### 3g. Public / legal / utility

| Route                            | Inherit from                               |
| -------------------------------- | ------------------------------------------ |
| `/(public)/data-sources`         | Methodology                                |
| `/(public)/developers`           | Methodology                                |
| `/(public)/disclaimer`           | Methodology                                |
| `/(public)/embed-docs`           | Methodology                                |
| `/(public)/migrate/google-civic` | Methodology                                |
| `/(public)/open`                 | Methodology                                |
| `/(public)/privacy`              | Methodology                                |
| `/(public)/terms`                | Methodology                                |
| `/admin/api-health`              | (admin — exempt from public design system) |

### 3h. Embeds — keep utility design, do NOT apply full chassis

| Route                           | Treatment                                                   |
| ------------------------------- | ----------------------------------------------------------- |
| `/embed/bill/[billId]`          | Apply tokens + 2px borders; skip masthead/footer (embedded) |
| `/embed/district/[districtId]`  | Same                                                        |
| `/embed/reps/[districtId]`      | Same                                                        |
| `/districts/[districtId]/print` | Print stylesheet only — already has `civic-pack-print.css`  |

---

## 4. Phased rollout plan (mirrors handoff's "small PRs" guidance)

The handoff explicitly recommends one page-type per PR. Sequence:

**Phase 0 — chassis (no UI changes shipped)**

- PR 0a: Merge `handoff/tokens.css` into `src/styles/aicher-system.css` (already exists — diff & merge, don't replace).
- PR 0b: Reimplement `Cq*` primitives + `CqHeader` / `CqFooter` / `CqBreadcrumb` as real React components (NOT copies of `chrome.jsx` / `primitives.jsx`). Storybook entries.

**Phase 1 — the 16 directly-templated routes** (one PR each, ~10 PRs)

1. `/representative/[bioguideId]` (Hybrid) ⭐ — start here
2. `/bill/[billId]`
3. `/(public)/search` + `/(public)/results`
4. `/committee/[committeeId]`
5. `/states/[state]`
6. `/methodology` + `/(public)/about` + `not-found.tsx`
7. `/representative/state/...` + `/state-legislature/[state]/legislator/[id]`
8. `/state-legislature/[state]`
9. `/vote/[voteId]`
10. `/lobby/[registrantId]` + decide on FEC filing route
11. `/industry/[sector]`
12. `/` (Landing) + `/your-reps` + `/your-reps/money-report`

**Phase 2 — listing/index pages** (group by inheritance, ~3 PRs)

- All §3a SearchResults-derived listings
- All §3b detail pages
- All §3c hub/overview pages

**Phase 3 — topic hubs** (1 PR for the shared template, ~13 routes use it)

- All §3d topic pages share one template

**Phase 4 — long tail**

- §3f education/glossary
- §3g legal/utility (Methodology-derived)
- §3h embeds (tokens only)

**Phase 5 — bespoke**

- §3e AI/interactive flows — separate design engagement

---

## 5. What is NOT covered by the handoff and likely needs new design

1. **AI features** — `/ask`, `/ask/[slug]/[entityId]`, `/investigate` (no template, no analog).
2. **Topic hub template** — 13 routes share a pattern but no mock exists. One new template covers all.
3. **Index/listing variants** — DistrictResultRow, StateResultRow, SectorResultRow, ElectionResultRow, RegulationResultRow row patterns are not in the handoff. They follow SearchResults' row-variant convention but each variant needs its own metadata grid.
4. **Embed pages** — handoff doesn't address embedded contexts (no masthead/footer).
5. **Print pages** — `/districts/[districtId]/print` already has its own stylesheet; out of scope.
6. **Admin** — `/admin/api-health` is internal; out of scope.
7. **District / state-district detail roll-ups** — `/districts/[districtId]`, `/state-districts/[state]/[chamber]/[district]`, `/delegation/[stateCode]` mirror StateOverview but have a smaller-scope header pattern that should be designed once and shared.

---

## 6. Coverage scorecard

| Category               |  Routes | Direct template |              Inheritable | Bespoke needed |
| ---------------------- | ------: | --------------: | -----------------------: | -------------: |
| Federal core           |       8 |               8 |                        0 |              0 |
| State core             |       8 |               5 |                        3 |              0 |
| Index / listing        |      12 |               0 |                       12 |              0 |
| Detail (state-mirrors) |       8 |               0 |                        8 |              0 |
| Hub / overview         |      13 |               0 |                       13 |              0 |
| Topic hubs             |      13 |               0 | 13 (one shared template) |              0 |
| AI / interactive       |       3 |               0 |                        0 |              3 |
| Education / glossary   |       5 |               0 |                        5 |              0 |
| Legal / utility        |       8 | 1 (methodology) |                        7 |              0 |
| Embeds / print         |       4 |               0 |          4 (tokens only) |              0 |
| Admin                  |       1 |               0 |                        0 |     0 (exempt) |
| **Total**              | **~80** |         **~14** |                  **~62** |         **~3** |

**Reading:** 14 routes have an exact mock, 62 can be built by applying the chassis to an existing template, 3 (AI flows) need new design. There is no route blocked on a missing template that doesn't fall into the inheritance plan above.
