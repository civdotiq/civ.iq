# Landing Page Web UI

_Started 2026-04-20 17:39 UTC_

---

## User

## Assistant

I'll start by exploring the provided assets and the GitHub repository to understand CIV.IQ.

_[tool: update_todos]_

_[tool: list_files]_

_[tool: view_image]_

The CIV.IQ logo is distinctly Otl Aicher-inspired — geometric primitives (red circle + green rectangle forming a lowercase "i") with 4 blue dots below. Let me explore the GitHub repo.

_[tool: github_list_repos]_

_[tool: github_get_tree]_

Let me explore more of the structure — especially src/app, components, and styling.

_[tool: github_read_file]_

_[tool: github_get_tree]_

Great context. Let me dig into styles, components, and the app directory.

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

Excellent — there's an `aicher-system.css` file! This is the core. Let me read it plus the global styles, fonts, images, and a few key components.

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: snip]_

_[tool: set_project_title]_

_[tool: github_import_files]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: snip]_

_[tool: github_read_file]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: snip]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: github_get_tree]_

_[tool: snip]_

_[tool: github_read_file]_

_[tool: snip]_

I have enough context now. Let me build the design system — I have the full aicher-system.css, fonts, icons, logos, key components (SearchForm, FeatureGrid, Header, QuickStartPaths), page.tsx, and brand voice from llms.txt & README.

_[tool: copy_files]_

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: snip]_

Now let me write the preview card system and README/SKILL files. I'll batch efficiently.

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

Now I'll build the preview cards — I'll create a shared CSS, a handful of focused HTML cards for DS tab, and the web UI kit. Let me build them efficiently in one pass.

_[tool: write_file]_

_[tool: snip]_

_[tool: list_files]_

Let me check what's actually in place so I can build consistent previews.

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

Good — I have everything I need. Let me build the preview cards efficiently. I'll create one-purpose cards, keep them minimal, and register them in batches.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now Spacing, Components, and Brand cards.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

Now register all these cards and build the UI kit.

_[tool: register_assets]_

Now let me build the UI kit. I'll create a minimal but representative web UI kit for CIV.IQ — the key product is a marketing site + civic record viewer.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: show_html]_

Let me register the UI kit card, finalize README + SKILL.md, and then call done.

_[tool: register_assets]_

_[tool: read_file]_

README is already comprehensive. Let me check SKILL.md and then call done.

_[tool: read_file]_

Everything is in place. Let me verify the UI kit loads and then hand off.

_[tool: done]_

_[tool: fork_verifier_agent]_

The CIV.IQ Design System is ready. Open the **Design System** tab to review all the cards, or the UI kit for the clickable prototype.

**Caveats / uncertainties**

- **Braun Linear** ships in the civ.iq repo and I copied all 5 weights into `fonts/` — but please confirm the license lets us redistribute it this way. If not, the fallback stack (`Helvetica Neue → Arial`) already covers it.
- The **party-red = urgency** overlap is a real design tension in the brand. I kept the repo's convention (status → amber/blue, not red/green) but the logo still _uses_ red as its primary brand accent — so CTAs with red-for-urgency may occasionally read as "Republican" in context. Worth watching.
- No slide deck was provided, so I didn't build `slides/`. If you want a CIV.IQ slide template (for press decks, board updates, etc.), say the word.
- I only built **one** UI kit — the web product. The repo also hints at a mobile surface and an embeddable widget; I left those out on purpose to avoid invention. Say the word if you want me to add them.

**Ask for you:**

1. **Browse the Design System tab and approve / request changes on each card** — especially the color semantics (status-blue vs. party-green is load-bearing), button styles, and the hero typography. Use "Request changes" with a note on anything that feels off.
2. **Click through the UI kit** (`ui_kits/web/index.html`) — landing → pick an address → pick an official. Flag any screen that feels un-CIV.IQ so I can tighten it.

## User

Regenerate "Icon system".

## Assistant

The user wants true Aicher-style pictograms — solid silhouettes (not line icons), like the Munich '72 athlete pictograms. Let me check what's in `assets/icons.jsx` since the codebase has its own AicherIcons set.

_[tool: read_file]_

Perfect — the codebase has the actual AicherIcons set with solid-fill silhouettes. I'll use those directly instead of the line-icon placeholders I made. Let me also peek at the rest and grab more icon names.

_[tool: read_file]_

Now I'll rewrite the icon card using the real AicherIcons — solid-fill pictograms in colored tiles, the Munich '72 layout.

_[tool: write_file]_

_[tool: show_to_user]_

_[tool: save_screenshot]_

_[tool: view_image]_

The Munich '72 pictogram grid is rendering — solid silhouettes, colored tiles, blue mullion between them. Let me clean up the screenshot and register.

_[tool: delete_file]_

The icon card is regenerated. It now uses the actual `AicherIcons` from the codebase — solid-fill pictograms laid out Munich '72–style on a blue mullion grid, with red/green/blue/ink tiles punctuating the sheet rather than all-white line icons.

## User

Regenerate "Icon system": in between what you built before and these please.

## Assistant

Got it — halfway between the stroked line icons (too light) and the fully solid Munich pictograms (too heavy). I'll build the glyphs with a **consistent 2.5px black stroke on white tiles**, keep simple solid accents (filled arrowheads, filled dots) where needed, and drop the colored tile backgrounds. A cleaner, more uniform family.

_[tool: write_file]_

_[tool: show_to_user]_

_[tool: save_screenshot]_

_[tool: view_image]_

Clean, consistent family — 2px black strokes, uniform tiles, labels beneath. That's the in-between you wanted. Let me clean up.

_[tool: delete_file]_

Icon system regenerated — 24 glyphs, consistent 2px stroked style on a hairline-divided white sheet. Sits between the earlier thin line icons and the heavy solid pictograms: the drawing language is uniform, the weight reads confidently at small sizes, and filled arrowheads / dots add just enough solid punctuation to stay true to the Aicher lineage without tipping into Munich-pictogram heft.

## User

Make me a one page brief that describes the project

## Assistant

I'll create a one-page brief for CIV.IQ — a printable/shareable summary using the design system.

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

One-page brief is up — masthead with the CIV.IQ lockup, tri-color hero headline, a 4-column stat band, two-column body (Problem / How It Works + Audience / Brand / Non-Goals), and a four-principle stripe at the bottom. Letter-sized, printable (Cmd+P → Save as PDF gives you a clean single page).

**Ask:** want me to tweak the stats (I used the numbers from the repo's llms.txt), swap any section, or make a second "internal/investor" variant with different emphasis?

## User

Looks good! This is what I want in the brief:

## Assistant

I'll rewrite the brief to match this content — same visual system, but with the real content: open-source framing, the data-feed numbers, the funding ladder, and the authorial voice. The funding tiers need a real layout.

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Brief updated with the real content:

- **Masthead** now carries the "Civic Data Infrastructure · Free · Open Source (MIT)" positioning line
- **Stat band** shows the true numbers — 181 feeds, 535 MoCs, 8th-grade reading level, $150/mo
- **"What's there today"** — the five-item list pulled directly from your copy (plain-language summaries, cross-source matching, careful ML, built for reuse)
- **"Why this way"** — the Quorum/FiscalNote contrast and the Wikipedia-for-civic-data analogy
- **"Who's building it"** — your bio and the two remaining gaps
- **The Ask** — the funding ladder as a real two-column table, with the $85K tier highlighted in civ-blue
- **Footer** — links to civdotiq.org, GitHub, and your email in mono, with the independent/nonpartisan byline

Prints to a single Letter page (Cmd+P → Save as PDF).

## User

Remove "No Made Up Data".

## Assistant

_[tool: str_replace_edit]_

_[tool: show_to_user]_

Done.

## User

What else can I make with Claude Design?

## Assistant

Lots of useful things with what's already in this design system. Here's a menu, rough-sorted by effort:

**Fundraising / outreach**

- A **pitch deck** (10–15 slides) — same Aicher language, built for an investor or foundation meeting
- A **sponsor prospectus** PDF — tiered packages with what each unlocks
- A **cold-intro email template** + a one-line "what CIV.IQ is" elevator card
- A **press kit** — logo lockups, screenshots, boilerplate paragraph, Mark's bio

**Product marketing**

- A proper **civdotiq.org landing page** (the UI kit has the bones — we could build it out: How it works, Sources, FAQ, For journalists, For researchers)
- **Feature announcement posts** / changelog entries when you ship state coverage or Spanish
- **OG / social share images** — when someone shares a rep's CIV.IQ page on Twitter, what does that card look like?
- **A "how our data is sourced" page** — the trust page

**Product surfaces we haven't built**

- The **representative detail page** fully fleshed out (voting record, money, bills, committees, lobbyist meetings — right now it's just sketched)
- The **bill detail page** — who sponsored, who voted which way, plain-language summary, lobbying filings that match it
- An **embeddable widget** for newsrooms — "Show this rep's CIV.IQ record"
- **Email digest** mockups — "This week your reps voted on…"
- **Mobile screens** — the UI kit is desktop only

**Civic-specific artifacts**

- **Infographics** — "Where does a bill actually go?" / "How campaign money flows" — Aicher-pictogram explainers
- A **data-source matrix** poster — all 181 feeds, what they cover, how often they update
- **Civics-classroom one-pagers** — teacher-ready handouts using the record format

**Internal / planning**

- A **roadmap one-pager** — federal ✓, states in progress, Spanish next
- A **state-coverage progress map** — 50-state grid showing what's live

Want me to start with one? The **pitch deck**, the **proper landing page**, or the **rep + bill detail pages** feel like they'd give you the most immediate mileage.

## User

Please make a "data-source matrix"

## Assistant

Good pick — this is the kind of artifact that does a lot of work in one image: it makes the "181 feeds" claim legible, shows the breadth, and doubles as a credibility prop in the pitch deck.

A few quick decisions I'll make unless you say otherwise:

- **Format**: single-page poster (Letter landscape, printable) — scannable in one glance
- **Organization**: grouped by domain (People, Money, Lawmaking, Spending, Regulation, Reference), not alphabetically
- **Per-feed detail**: source name, what it covers, update cadence, status (Live / Partial / Planned)
- **Real sources only** — I'll use the actual federal data feeds the product touches (Congress.gov, FEC, USASpending, Senate LDA, Federal Register, Census, GAO, etc.) rather than invent 181 entries. The poster will show the real named feeds and account for the long tail in a "+N more" footer.

Let me check what the codebase has on the actual sources before I start writing entries.

_[tool: github_get_tree]_

_[tool: github_read_file]_

Let me check the canonical coverage matrix — it's explicitly named as the source of truth.

_[tool: github_read_file]_

This is a gift — the canonical matrix. I'll turn it into a real poster: Federal (complete) / State (mixed) / Local (pilot) tiers, with each row showing **source · what · cadence · status**, plus the intelligence-analyzer grid at the bottom. Letter landscape, scannable.

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Landscape data-source matrix is up — three tiers (Federal complete / State mostly-complete with the FollowTheMoney gap called out / 10-city Legistar pilot) and the 12 federal-only analyzer grid at the bottom right, with a summary band up top and a legend footer. Prints as single landscape Letter.

**Caveats:**

- State feed count shows 7 (5 complete + 2 partial); local shows 10 individual city rows — total visible feeds land around ~32, not 181. The "181" number in the pitch likely counts each state-legislature feed × 50 states + per-city feeds. Want me to add a small "181 total · 32 shown as canonical sources" note, or reconcile those numbers?
- I used the COVERAGE.md file as canonical truth, which supersedes the llms.txt marketing copy per that doc's own rules.

## User

A background task has completed. Here are the results:

## Assistant

The verifier is right — Letter landscape is 816px tall but the content lands at ~1823px. Three fixes together: (1) switch to Tabloid landscape (17×11 = 1632×1056) which is a natural fit for a poster, (2) tighten row density slightly, (3) balance columns so Federal fills vertically.

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: done]_

I need to update the viewport registration for the new Tabloid size and register the asset properly.

_[tool: register_assets]_

_[tool: fork_verifier_agent]_

_[tool: snip]_

Resized to Tabloid landscape (17×11in / 1632×1056px) — that's the natural size for a data poster anyway, and gives the three columns room to breathe without rebalancing content. Verifier is checking fit.

## User

A background task has completed. Here are the results:

## Assistant

The intel grid is the real victim. Best fix: move the intel table into column 2's empty space (state column is short — only 7 rows + a note), and tighten row padding everywhere.

_[tool: read_file]_

Let me redistribute: move intel into column 2 (state is short) and tighten row padding.

_[tool: str_replace_edit]_

Now remove the intel section from column 3 (where it's duplicated now):

_[tool: str_replace_edit]_

Now I need to check what's left of the old column 3 intel section and clean it up:

_[tool: read_file]_

There's dangling orphan rows from the old intel section. Clean up:

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Redistributed: intel-analyzer grid moved under the state column (state was the shortest, making column-2 the natural home for it), added a small "honest about local coverage" note to fill column 3's tail, tightened row padding. Waiting on verifier.

## User

A background task has completed. Here are the results:

## Assistant

Applying the verifier's suggested combination: tighter gaps, smaller padding, smaller summary vals, trim the local note-block.

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Applied all the verifier's suggested cuts: gaps 18→12, padding 40+36→28+24, summary val 22→18, local note-block compacted. Should land under 1056.

## User

A background task has completed. Here are the results:

## Assistant

Three small cuts: drop the local note-block, tighten intel row padding, compact masthead gap.

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Dropped the local note-block and tightened intel rows and masthead — should save ~45-50px.

## User

A background task has completed. Here are the results:

## Assistant

## Assistant

## User

I want to update the Web UI for the landing page

## Assistant

_[tool: snip]_

_[tool: update_todos]_

_[tool: list_files]_

Before I redesign, let me see what's there now and ask a few sharp questions about direction.

_[tool: read_file]_

_[tool: questions_v2]_

_[tool: snip]_

## User

Questions timed out; go with defaults

## Assistant

I'll go with defaults: bolder, fuller landing page; 2 contrasting directions; full set of sections; "Public record, made legible" headline; data-rich hero; Olympic/Aicher poster vibe with real data proof.

_[tool: snip]_

_[tool: read_file]_

_[tool: read_file]_

I'll build a much fuller landing page. Two contrasting directions — a "Newspaper / Public Record" version and an "Olympic Poster" version — both visible in the same kit via screen toggles.

Given context, I'll consolidate into one ambitious LandingScreen with the full set of sections (hero, sample queries, how-it-works pipeline, live data feed, sources matrix preview, who-uses, coverage honesty, API/devs, FAQ, footer). I'll write it as a single bigger file.

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Landing page rebuilt as a full marketing site — newspaper-style masthead strip, big editorial hero with a sample official record card peeking in, dark stat band, six common-question grid, four-step Aicher pictogram pipeline, two-column "latest votes / recent filings" newspaper section, three-tier coverage honesty (Federal/State/Local), dark "Wikipedia for civic data" audience strip, code-sample API section, FAQ accordion, and a big blue bottom CTA. All built on the existing primitives, all using the design system's colors and type rules.

## User

this doesn't seem like plain english to me. it's hard to understand and uses jargon.

## Assistant

You're right — I wrote that section in engineer-speak. Let me rewrite it in plain English.

_[tool: snip]_

_[tool: str_replace_edit]_

While I'm at it, let me also de-jargon the Coverage section and the FAQ — same problem.

_[tool: str_replace_edit]_

_[tool: grep]_

The line was just truncated in display. Let me check exact text:

_[tool: read_file]_

Same string — the issue was a double-space typo I introduced. Let me redo all four edits cleanly:

_[tool: str_replace_edit]_

_[tool: done]_

Cleaned up the jargon across the page:

- **Pipeline**: Ingest/Match/Translate/Cite → **Collect / Connect / Rewrite / Show the source**, with descriptions a non-engineer can read.
- **Coverage section**: dropped `dataQuality`, "joins", "OpenStates", "FollowTheMoney maintenance mode", "silent empty arrays" — replaced with sentences that say what's actually true.
- **FAQ**: rewrote the "missing data" answer the same way.

## User

Can you please update the preview?

## Assistant

_[tool: show_to_user]_

Preview is now showing `ui_kits/web/index.html` with the updated landing page.

## User

Our previous data partner went offline? What's that mean?

## Assistant

Fair point — that's still vague. Looking back at the source: the README mentions FollowTheMoney went into maintenance mode, which is why state-level campaign finance is unavailable. But for a public landing page, that internal context doesn't matter to a citizen — they just want to know whether they can see the data or not.

Let me cut it:

_[tool: str_replace_edit]_

Replaced the vague "previous data partner went offline" line with two concrete things you _can_ see at the state level (bills/votes/committees), and made the missing piece self-explanatory: "State-level campaign finance — not yet available."
