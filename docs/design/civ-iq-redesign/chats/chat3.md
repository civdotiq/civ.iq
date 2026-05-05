# Bill Detail Redesign

_Started 2026-04-27 21:23 UTC_

---

## User

Please make the design universal by making the following: Bill detail — directly linked from the new profile, biggest visual mismatch today.
Search results — high-traffic entry point.
Committee + state overview — natural next-clicks from the profile.
Methodology / about / error states — easy wins.
Global chrome pass — header, footer, breadcrumbs everywhere.

## Assistant

I'll explore the project to understand the existing design system before making changes.

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

I see — the user is asking me to build out the rest of the redesigned screens to match the new profile in `redesign/`. Let me note the system-reminder: this appears to be the user's own civic data project (CIV.IQ) which is open-source (MIT). I'll continue with the design work as it's their project, not branded copyrighted UI.

Let me explore the redesign and existing UI kit context.

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Now let me look at the existing UI kit screens (Bill, Search, Committee, etc.) to understand what currently exists vs. what I need to redesign.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

[Will continue working without acknowledging.]

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

[Continuing — I now have enough context. Let me check one more piece (ProfileRefined to use as the visual chassis to match) then build the new screens.]

_[tool: snip]_

_[tool: read_file]_

_[tool: read_file]_

[Snipping settled exploration of the existing files.]

_[tool: snip]_

_[tool: snip]_

I have enough context. Let me build the universal redesigned screens. I'll create:

1. **Bill detail** — directly linked from the new profile
2. **Search results** — high-traffic entry point
3. **Committee detail** — natural next click
4. **State overview** — natural next click
5. **Methodology / About / Error states** — easy wins
6. **Global chrome** — Header, Footer, Breadcrumbs (shared)

All matching the new redesign vocabulary: black masthead strips, sticky tab bars, source rails, plain-reading callouts, contact strips, 2px black borders, square layout, 3px interactive radius, party tokens only for party.

Let me set up todos and start.

_[tool: update_todos]_

[Snipping older settled context, then proceeding.]

_[tool: snip]_

I have all the context I need. Let me build everything in one cohesive file. I'll write the shared chrome and all screens, registered as a single canvas.

_[tool: write_file]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: write_file]_

[Snipping older settled phases.]

_[tool: snip]_

_[tool: update_todos]_

_[tool: write_file]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: write_file]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: snip]_

_[tool: write_file]_

_[tool: update_todos]_

I need to wire everything into the design canvas. Let me first check the existing structure.

_[tool: snip]_

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

I'll create a new canvas file for the connected system pages.

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

_[tool: update_todos]_

Built out **Connected System.html** — 8 pages extending the approved Hybrid profile chassis into a full product:

1. **Search results** — faceted rail, mixed result types, top-match hero
2. **Profile** — the approved Hybrid (Jeffries)
3. **Bill detail** — H.R. 3684, with sticky tabs (summary/timeline/vote/text/related), party-stacked vote bar, plain-reading callout
4. **Committee detail** — House Budget, roster, hearings, subcommittees
5. **State overview** — NY, district grid, senators, industries
6. **Methodology** — source ledger, confidence formula, "what we don't do"
7. **About** — masthead, people, funding ledger
8. **404** — black file-stamp dossier

Same vocabulary throughout: black masthead crumbs, 2px borders, square corners, source-tag rails, mono captions, confidence disclaimers, no shadows.

## User

Where can I see these?

## Assistant

_[tool: snip]_

You're already viewing it — **redesign/Connected System.html** is open in your tab right now. All 8 pages are laid out as artboards on the design canvas, organized into three sections:

- **Entry points** → Search results
- **Profile → Bill (the link)** → Profile + Bill detail
- **Lateral pages** → Committee, State, Methodology, About, 404

Pan/zoom around the canvas to navigate. Click the expand icon on any artboard's label row to open it fullscreen (←/→/Esc to step through them). Drag the grip handles to reorder.

If you don't see it, refresh the preview — the file is at `redesign/Connected System.html`.

## User

is this every page type on the website?

## Assistant

_[tool: snip]_

No — there are still meaningful gaps. Here's what we have vs. what's missing on a typical civic-data site like this:

**Covered (8)**

- Search results · Profile · Bill detail · Committee detail · State overview · Methodology · About · 404

**Still missing — likely worth adding**

_High-traffic, user-facing_

- **Landing / homepage** — the front door (there's an old `LandingScreen.jsx` in the UI kit but it hasn't been brought into the new system)
- **Address lookup result** — "you live at 123 Main St → here are your 7 reps" (the AddressResultScreen exists in the old kit but not redesigned)
- **State legislator profile** — the state-level analog to the federal profile
- **State legislature page** — chamber rosters, leadership, session calendar

_Federal coverage gaps_

- **Vote / roll-call detail** — single roll call, every member's vote (currently a tab inside Bill, not its own URL)
- **Lobbying filing detail** — one LDA filing, the registrants, who they met
- **Contribution / FEC filing detail** — one quarter of one campaign's finance
- **Industry / sector page** — "all securities-industry contributions in 2024"

_System / utility_

- **Compare view** — side-by-side two officials or two bills
- **Watchlist / saved items** — even without accounts, a session-scoped tracker
- **Empty states** — search with no results, committee with no recent activity
- **Loading / data-stale banner** — when confidence < 0.85
- **Error 500 + maintenance** — sibling to the 404
- **API docs / developer page** — referenced in the footer
- **Privacy + terms** — required for a 501(c)(3)
- **Mobile breakpoints** — everything I built is desktop-only at 1280px

Want me to prioritize? My suggestion for next round, in order:

1. **Landing** — re-skin the old one to match the new system
2. **Vote detail + Address lookup** — these are the 2 highest-traffic URLs we don't have yet
3. **Compare view** — the most interesting design problem left
4. **Mobile** for the profile + bill + search (the top 3 by traffic)

Or tell me which subset matters and I'll build that.
