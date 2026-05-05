# GAP Redesign Coverage 2026

_Started 2026-05-04 19:33 UTC_

---

## User

Have we completed the GAP-redesign-coverage-2026-05.md?

## Assistant

I'll check the project files to see what's there and look for that document.

_[tool: list_files]_

_[tool: grep]_

No — there's no file named `GAP-redesign-coverage-2026-05.md` in this project. A search across all project contents turned up zero matches for that name or string.

If you'd like, I can:

- Create that file as a new gap/coverage doc (tell me what sections you want), or
- Point me to where it should live and I'll scaffold it.

## User

## Assistant

No — `GAP-redesign-coverage-2026-05.md` does not exist in this project. I searched both the file tree and full-text contents and there are zero matches.

You've now pasted the document content though. Want me to:

1. **Save it as-is** to `GAP-redesign-coverage-2026-05.md` at the project root, or
2. **Save + review** — drop it in and flag any inconsistencies against what's actually in `redesign/`, `handoff/`, and `ui_kits/` (the doc references specific files like `ProfileHybrid.jsx`, `tokens.css`, etc. — I can verify those exist and the template count matches), or
3. **Save + render** — also produce an HTML version for easier reading alongside the other handoff docs.

Which do you want?

## User

all

## Assistant

_[tool: update_todos]_

Saving the markdown first, then exploring the referenced folders in parallel.

_[tool: write_file]_

Now verifying references against actual project files.

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

Found something interesting — the redesign folder ships **more templates than the doc accounts for**. Let me also check `IMPLEMENTATION_NOTES.md` to verify the "16 templates / reference spec" claim.

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

All template references in the doc verify cleanly. Now checking the un-mentioned redesign files and rendering HTML.

_[tool: grep]_

_[tool: snip]_

_[tool: snip]_

Verification done. Now writing the HTML render and a verification notes file.

_[tool: write_file]_

Now rendering the HTML version. I'll use a clean Helvetica + warm-neutral aesthetic that matches what looks like the CIV.IQ system feel (file-stamp / dossier vibe from the redesign).

_[tool: read_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Done — three files written:

- **`GAP-redesign-coverage-2026-05.md`** — the markdown doc you pasted, saved verbatim.
- **`GAP-redesign-coverage-2026-05.verification-notes.md`** — cross-check against actual project files. The doc verifies cleanly on the 16 templates and chassis claims, but **undercounts**: `redesign/` actually contains 8 more page-level templates (`Compare`, `DistrictPage`, `Election`, `IssueTopic`, `LocalCouncil`, `PACProfile`, `SpendingContract`, `VotingRecord`). Notably, `IssueTopic.jsx` likely already covers the §3d topic-hub gap, and `DistrictPage.jsx` / `LocalCouncil.jsx` already cover routes the doc lists as inheritable.
- **`GAP-redesign-coverage-2026-05.html`** — file-stamp dossier render using the project's CIV.IQ tokens (Braun Linear, neutral paper, 2px rules, mono stamps), with a verification flag callout in §1 pointing at the notes file.

## User

OK I want to update Claude Code on where we're at with the coverage of pages. Tell me what pages we've made.

## Assistant

_[tool: snip]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: grep]_

_[tool: snip]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

_[tool: snip]_

Here's a status snapshot of pages built, organized by canvas. All sit on the same chassis (`tokens.css` + `chrome.jsx` + `primitives.jsx`) and are presented in four design canvases.

## Pages built (24 total page templates across 4 canvases)

### 📁 `redesign/Profile Redesigns.html` — Federal profile exploration (4)

The original profile bake-off. **Hybrid approved** ★.

1. `ProfileRefined` — Hakeem Jeffries (D, NY-08)
2. `ProfileDossier` — Lisa Murkowski (R, AK)
3. `ProfileMoneyFirst` — Mike Johnson (R, LA-04)
4. **`ProfileHybrid`** ★ — tabbed chassis + Dossier density (the canonical federal profile)

### 📁 `redesign/Connected System.html` — Federal core flow (8)

Profile → Bill linkage + lateral pages.

1. `SearchResults` — query for an address that doesn't parse
2. `ProfileHybrid` — Jeffries (the approved one, in context)
3. `BillDetail` — H.R. 3684 (Infrastructure Investment & Jobs Act)
4. `CommitteeDetail` — House Budget
5. `StateOverview` — New York
6. `MethodologyPage`
7. `AboutPage`
8. `NotFoundPage` — file-stamp 404

### 📁 `redesign/Coverage.html` — Coverage extension (8)

Entry points, state gov, primary documents, money.

1. `LandingPage` — wire-bulletin front page
2. `AddressResultPage` — "you live at X → here are your reps"
3. `StateLegislatorProfile` — Sen. Andrew Gounardes (NY-SD-26)
4. `StateLegislaturePage` — NY chamber rosters + session calendar
5. `RollCallDetail` — H.R. 3684 final passage, per-member vote
6. `LobbyFilingDetail` — Akin Gump for BlackRock, Q4 2024
7. `FECFilingDetail` — Friends of Andy Kim, Q1 2026
8. `IndustrySectorPage` — Real estate as an entity

### 📁 `redesign/Civic Infrastructure.html` — Coverage extension v2 (8)

Local gov, geography, elections, topics, money entities, spending, voting record.

1. `LocalCouncilPage` — NYC City Council
2. `DistrictPage` — NY-08 (Brooklyn–Queens)
3. `ElectionPage` — Brown vs Moreno, OH Senate 2024
4. `ComparePage` — Jeffries vs Johnson
5. `IssueTopicPage` — Housing
6. `PACProfilePage` — Senate Majority PAC
7. `SpendingContractPage` — NASA × SpaceX, Crew-9/10
8. `VotingRecordPage` — Hakeem Jeffries full history

---

## Coverage delta vs the GAP doc

The GAP doc lists **16 templates**. Reality is **24** — these 8 from `Civic Infrastructure.html` are the ones the GAP doc didn't account for:

| Template               | Live route it covers                                 | GAP doc treatment                               |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------- |
| `LocalCouncilPage`     | `/local`                                             | Listed as "inheritable from StateOverview"      |
| `DistrictPage`         | `/districts/[districtId]`                            | Listed as "inheritable from StateOverview"      |
| `ElectionPage`         | `/elections/[id]` (?)                                | Not mentioned                                   |
| `ComparePage`          | (no route — needs `/compare/[a]/[b]`)                | Not mentioned                                   |
| `IssueTopicPage`       | `/topics/*` (13 routes)                              | **GAP §3d & §5 say "no mock exists"** — it does |
| `PACProfilePage`       | (no route — needs `/pac/[id]`)                       | Not mentioned                                   |
| `SpendingContractPage` | `/spending/[id]` (?)                                 | Not mentioned                                   |
| `VotingRecordPage`     | sub-page of profile, or `/representative/[id]/votes` | Not mentioned                                   |

## What this means for the Claude Code update

- **22/80 routes have a direct mock** (not 14). The single biggest unlock is `IssueTopicPage` — it covers all 13 `/topics/*` routes via a parameterized template, collapsing GAP §3d entirely.
- **Still genuinely uncovered:** the 3 AI flows (`/ask`, `/ask/[slug]/[entityId]`, `/investigate`) — no template, no analog.
- **Open routing decisions:** `ComparePage`, `PACProfilePage`, `SpendingContractPage`, `ElectionPage`, `VotingRecordPage` are designed but have no live route. Need product calls on URL shape before Claude Code can wire them up.
- **Still inheritable (not direct):** SearchResults-derived listings (§3a, ~12 routes), state-detail mirrors (§3b, ~8), most hub/overviews (§3c, ~13), education/glossary, legal/utility, embeds.

Want me to write this up as a one-page status memo for Claude Code (HTML in the same dossier style as the GAP doc)?

## User

Yes please

## Assistant

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

## Assistant

## User

Save this design as a PDF: STATUS-coverage-2026-05.html

## Assistant
