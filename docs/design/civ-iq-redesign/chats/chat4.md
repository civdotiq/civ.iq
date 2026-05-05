# Civics platform redesign

_Started 2026-04-28 19:38 UTC_

---

## User

Please begin designing the following in the order you feel is most important: Covered (8)

Search results · Profile · Bill detail · Committee detail · State overview · Methodology · About · 404
Still missing — likely worth adding

High-traffic, user-facing

Landing / homepage — the front door (there's an old LandingScreen.jsx in the UI kit but it hasn't been brought into the new system)
Address lookup result — "you live at 123 Main St → here are your 7 reps" (the AddressResultScreen exists in the old kit but not redesigned)
State legislator profile — the state-level analog to the federal profile
State legislature page — chamber rosters, leadership, session calendar
Federal coverage gaps

Vote / roll-call detail — single roll call, every member's vote (currently a tab inside Bill, not its own URL)
Lobbying filing detail — one LDA filing, the registrants, who they met
Contribution / FEC filing detail — one quarter of one campaign's finance
Industry / sector page — "all securities-industry contributions in 2024"
System / utility

Compare view — side-by-side two officials or two bills
Watchlist / saved items — even without accounts, a session-scoped tracker
Empty states — search with no results, committee with no recent activity
Loading / data-stale banner — when confidence < 0.85
Error 500 + maintenance — sibling to the 404
API docs / developer page — referenced in the footer
Privacy + terms — required for a 501(c)(3)
Mobile breakpoints — everything I built is desktop-only at 1280px

## Assistant

I'll take a look at the existing design system first to understand the visual language before planning.

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: list_files]_

This is the redesigned system. Let me look at it carefully.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

I have a clear picture of the system now. Let me examine a couple more existing redesigned pages to make sure my new pages match the visual conventions exactly.

_[tool: read_file]_

_[tool: read_file]_

I have what I need. Let me clean up context and proceed.

_[tool: snip]_

Now I'll plan and build the 8 new pages. The user listed 8 specific ones from the high-traffic list:

1. Landing / homepage
2. Address lookup result
3. State legislator profile
4. State legislature page
5. Vote / roll-call detail
6. Lobbying filing detail
7. Contribution / FEC filing detail
8. Industry / sector page

These all exist as needed pieces. Strategy: build each as a standalone artboard inside a new design canvas HTML, reusing `CqPage`, `CqHeader`, `CqFooter`, `CqBreadcrumb`, all primitives, and the `data.jsx` officials. Split the 8 pages across 3-4 files of moderate size to keep each manageable.

_[tool: update_todos]_

I'll start writing the files now. Let me build them efficiently — covering all 8 pages.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: update_todos]_

Let me check what files I have and continue with the remaining work.

_[tool: list_files]_

_[tool: snip]_

_[tool: read_file]_

I have Landing already. Let me check if AddressResult exists and proceed with the remaining files.

_[tool: grep]_

_[tool: read_file]_

<!-- snipping settled exploration -->

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

<!-- continuing work -->

_[tool: write_file]_

<!-- continuing -->

_[tool: snip]_

_[tool: update_todos]_

<!-- snipping -->

_[tool: snip]_

<!-- continuing build -->

Now I'll build the coverage canvas tying all 8 new pages together, plus mark the Landing item complete (it already exists).

_[tool: update_todos]_

_[tool: write_file]_

<!-- snipping settled earlier work -->

_[tool: snip]_

_[tool: done]_

<!-- continuing -->

_[tool: snip]_

_[tool: fork_verifier_agent]_

<!-- ending turn -->

Extension complete. Eight new page types built on the approved Aicher/Ulm chassis:

**Entry** — Landing (front-page-of-a-bulletin) · Address result
**State government** — Legislator profile (Gounardes, NY-SD-26) · Legislature (NY chamber rosters + calendar)
**Primary documents** — Roll call (H.R. 3684) · Lobbying filing (Akin Gump / BlackRock) · FEC filing (Andy Kim, Q1 2026)
**Cross-cutting** — Industry/sector (real estate as a first-class entity)

All wired into `redesign/Coverage.html` as a design canvas. Same black masthead crumbs, 2px borders, source rails, plain-language readings, confidence disclaimers as the original profile work.
