# Federal Profile Redesign

_Started 2026-04-26 23:12 UTC_

---

## User

Can you please redesign the profile pages of federal elected officials?

## Assistant

I'll help you redesign profile pages for federal elected officials. Let me first explore the existing CIV.IQ design system to understand what we're working with.

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

I'll explore the rest of the kit and existing data quickly, then build redesigns.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: list_files]_

I have enough context. Let me ask a few quick questions before building, since this is a substantive redesign.

_[tool: questions_v2]_

## User

Questions answered:

- scope: Decide for me
- variations: 3
- directions: By-the-book — refined version of current layout, Decide for me
- novelty: Decide for me
- hero: Identity (name, role, district, photo)
- photo: Decide for me
- official: Mix of D and R, House and Senate (more variety across artboards)
- tweaks: No — keep it static
- extras: How to contact the representative

## Assistant

_[tool: snip]_

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: read_file]_

Now I have what I need. Let me design the system and build.

**Design system declaration (declared out loud per skill):**

- Strict CIV.IQ Aicher orthodoxy: 8px grid, 2px black borders, square corners, uppercase labels with 0.08em tracking, Braun Linear, no shadows on cards, no gradients, no emoji
- Three artboards on a design canvas:
  1. **REFINED CLASSIC** — same layout as current, polished IA, better stat hierarchy, contact strip — _Hakeem Jeffries (D-NY-08, House)_
  2. **DOSSIER** — dense wire-service grid, two-column data-rich, every fact attributed inline — _Lisa Murkowski (R-AK, Senate)_
  3. **MONEY-FIRST** — campaign finance is the hero, sankey-style provenance bars, voting lower — _Mike Johnson (R-LA-04, House Speaker)_
- All three include a contact block (DC office, district offices, phone, web, social)
- Photos: square 120×120 with 2px frame in #1, 160×160 in #2, no portrait (pictogram only) in #3 to vary
- Accent vocabulary: red is party-R only; green is party-D only; blue for action/links; amber for ethics/warnings; chromatic greys (#6b6b83 vlau, #b8b5a9 greige) for non-party data viz

Let me copy the assets I need into the redesign folder, then build.

_[tool: copy_files]_

Now let me build a shared primitives/data file, then the three variations.

_[tool: write_file]_

_[tool: write_file]_

[Continuing work — building the three variation artboards now.]

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Three federal-official profile redesigns are live on a design canvas — same Aicher system, three different lenses:

1. **Refined Classic** — Jeffries (D-NY-08). Polished version of the existing layout: 5-stat row, sticky contact strip, sources rail, sidebar for committees + caucuses.
2. **Dossier** — Murkowski (R-AK Senate). Wire-service density. Black masthead, 160px portrait, 8-field vital grid, two-column § sections (record / money / contact), inline footnoted sources.
3. **Money-First** — Speaker Johnson (R-LA-04). Campaign finance is the hero — 80px total raised number, full-width stacked provenance bar, top-industry rail. Voting record demoted to a side panel. No portrait — pictogram identity only.

All three carry: party chips (red/green for party only), blue for action, contact block with DC + district offices + web + form + handle, confidence/methodology disclaimer, and source attribution on every panel.

## User

Verifier agent check completed

## Assistant

[Fixing chip wrap.]

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Fixed the chip wrapping bug — added `white-space: nowrap` to `CqChip` so all three artboards now render their chip rows cleanly.

## User

where can I see the mockups?

## Assistant

_[tool: snip]_

_[tool: show_to_user]_

They're now open in your preview pane — `redesign/Profile Redesigns.html`. It's a pan/zoom canvas with three artboards side-by-side:

1. **Refined Classic** — Jeffries
2. **Dossier** — Murkowski
3. **Money-First** — Speaker Johnson

Click any artboard's title to enter focus mode (fullscreen), or use ←/→ to flip between them. Drag on empty canvas to pan, scroll to zoom.

## User

I like 1 and 2. I like 1 because it's similar to the tabbed design we have now, and I like #2 because it has so much great info. I personally like a lot of info, but I understand it can be a lot for a reader.

## Assistant

[Snipping settled work, then planning hybrid.]

_[tool: snip]_

_[tool: questions_v2]_

## User

Questions timed out; go with defaults

## Assistant

[Going with "Decide for me" defaults: Refined Classic chassis (tabs) with Dossier-density inside each tab, default density, all sections accessible via tabs + sticky nav hybrid, Jeffries, add as 4th artboard.]

_[tool: snip]_

[Building hybrid: tabbed chassis with Dossier-level density inside each tab, sticky in-page nav, Jeffries.]

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Added a 4th artboard, **04 · Hybrid** — Refined Classic's tabbed chassis with Dossier-level density inside each tab. Same masthead and sources rail, 6 stat cells (instead of 5), full 4-cell contact strip with all district offices, and tabs for: Voting record / Money / Bills / Committees / Lobbyist meetings. Each panel is dense (vote alignment sidebar, stacked finance bar + industries, full bill metadata, committee subcommittees + caucus list, lobbying disclosures with explainer).

Cleared earlier resolved iterations to make room.

## User

04 · Hybrid (1+2) — Tabbed chassis, Dossier density — Jeffries - looks good, but "Votes With Party" seems like "the most important thing" on the page, when it's not really a stat I care about

## Assistant

_[tool: snip]_

Fair point — "votes with party" reads as the headline number when it's really just one signal, and a partisan-coded one at that. Let me rebalance the hybrid stats.

Better hierarchy: lead with **what they did** (bills sponsored, attendance) and **what funds them** (raised, small-donor share), with party-vote demoted to a secondary row or removed from the headline.

_[tool: read_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Rebalanced the hybrid's headline stats:

- **Primary row (5 large stats)**: Bills sponsored · Attendance · Raised this cycle · Committees · Caucuses — all action/funding metrics, no party color in the lead
- **Secondary row (small, grey ground)**: Votes with party · Votes with chamber majority · Bipartisan co-sponsorships — alignment context without dominating

"Votes with party" is now where it belongs: contextual alignment data, not the page's hero number.

## User

how do I universalize these designs onto my Claude Code project?

## Assistant

_[tool: snip]_

_[tool: invoke_skill]_

[Building handoff folder.]

_[tool: snip]_

_[tool: copy_files]_

_[tool: snip]_

_[tool: write_file]_

_[tool: present_fs_item_for_download]_

_[tool: snip]_

Download is ready above. Unzip into your Claude Code project, then point it at `design_handoff_official_profile/README.md` — that's the self-contained spec; the `designs/` folder is the live HTML reference.

The README prioritizes #04 Hybrid as the implementation target, lists the reusable components to build, and maps every hard-coded value back to the existing `aicher-system.css` tokens so Claude Code uses your repo's Tailwind utilities (`bg-civiq-blue`, `tracking-aicher`, etc.) instead of inline styles.

## User

OK, also, I'm wondering, if someone were to click on a 'recent floor vote' would they see the old page or this new design?

## Assistant

_[tool: snip]_

Good question — and the honest answer is **it depends on what we ship next**.

What we redesigned: the **profile page** (the rep's own page). What you'd land on by clicking a row in the "Recent floor votes" table is the **bill detail page** (e.g. H.R. 8404 — Respect for Marriage Act). That's a separate page, with its own existing design in the repo (`bill detail` was listed alongside profile/landing/search in the original UI kit).

So today, if your team ships only the profile redesign, clicking a vote would jump from this new Aicher-tight profile to the **old bill page** — which would feel inconsistent.

Three options:

1. **Quickest:** Ship just the profile. Accept the visual mismatch on bill click-through until bill detail is redesigned.
2. **Recommended:** Treat profile + bill detail as one design pass. They share 90% of the vocabulary (same masthead, sources rail, plain-reading callout, contact-strip-equivalent for sponsors, footnote disclaimer). I can mock the bill detail page next so the click-through stays inside the new system.
3. **Interim:** Update only the bill detail page's hero strip and table styling (masthead + sources rail + 2px borders + Aicher chips) so it visually rhymes with the new profile, even if its IA isn't fully redone.

Want me to mock the bill detail page next?

## User

OK, well I want our designs to be on EVERY page in the website. Is that possible?

## Assistant

_[tool: snip]_

_[tool: snip]_

Yes — totally possible. Your design system is already a real, named token layer (`aicher-system.css`), so the work is **mostly mechanical, partly design judgment**. Here's the honest breakdown:

**What's already done for you (free)**

- Tokens, type, colors, borders, spacing — already shipped in the codebase. Every page that uses the right utility classes already inherits the system.
- The system has explicit rules for cards, tables, chips, hovers, focus, motion. Most pages just need to _use_ them.

**What needs design work (per page)**

The CIV.IQ surface is small. Roughly:

| Page                              | Status                          | Effort          |
| --------------------------------- | ------------------------------- | --------------- |
| Landing                           | Done in the existing kit        | —               |
| Address result                    | Done                            | —               |
| **Official profile**              | ✅ Done (this conversation)     | —               |
| **Bill detail**                   | Exists, needs redesign to match | M (~1 day mock) |
| **Search results**                | Exists, lighter touch           | S               |
| **Committee page**                | Likely needs new design         | M               |
| **State / chamber overview**      | Probably needed                 | M               |
| **Methodology / sources / about** | Mostly type + tokens            | S               |
| **Error / 404 / empty states**    | Aicher templates                | S               |
| **Embeds / widgets**              | Already deferred per repo notes | —               |

So: ~5 more page mocks at the same fidelity as the profile work, plus a small global-chrome pass (header, footer, error states). Realistic scope: **2–3 working sessions** to mock everything; the engineering side is a refactor sweep, not a rewrite, because the tokens already exist.

**Recommended order**

1. **Bill detail** — directly linked from the new profile, biggest visual mismatch today.
2. **Search results** — high-traffic entry point.
3. **Committee + state overview** — natural next-clicks from the profile.
4. **Methodology / about / error states** — easy wins.
5. **Global chrome pass** — header, footer, breadcrumbs everywhere.

Want me to start on bill detail next, or do you want me to mock all five remaining pages as a comprehensive system pass on one big design canvas?
