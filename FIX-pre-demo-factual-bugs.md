# Pre-Demo Factual Bug Fixes — CIV.IQ

**Created:** 2026-04-21
**Purpose:** Three small fixes that come _before_ the remaining audit phases. These are factual-data bugs surfaced by Phase 1 of `AUDIT-federal-demo-readiness.md` that no existing phase targets. They are cheap, high-trust-impact, and should land first.
**Parent audit:** `AUDIT-federal-demo-readiness.md`

---

## Why these three first

A presentation-layer rough edge (missing intro copy, a bare spinner) can be explained away in a live demo — "we're polishing that." A **factually wrong string** rendered by a site whose entire premise is "real government data only" cannot. Once a visitor sees the House Budget Committee's description on the Financial Services page, they stop trusting every other number on the site. These three fixes close that class of problem before any presentation polish.

---

## Status of the parent audit — `AUDIT-federal-demo-readiness.md`

| Phase | Theme                       | Status              | Where                          |
| ----- | --------------------------- | ------------------- | ------------------------------ |
| 1     | Federal coverage inventory  | **done** 2026-04-21 | findings at lines 447–534      |
| 2     | Silent-failure empty states | **done** 2026-04-21 | outcome at lines 188–200       |
| 3     | GraphCanvas determinism     | **done** 2026-04-21 | outcome at lines 240–248       |
| 4     | Citizen clarity polish      | pending             | ~2 hr, prompt at lines 248–330 |
| 5     | Intelligence-tab guardrail  | pending             | ~45 min, prompt in doc         |
| 6     | Federal demo rehearsal      | pending             | ~30 min, prompt in doc         |

**Pre-phase fixes A / B / C below** come from Phase 1 gap items #5 (HSBA description bug), #6 (`/congress/house` + `/congress/senate` 404), and #9 (duplicate `| CIV.IQ | CIV.IQ` title suffix). They are not covered by any existing phase.

---

## How to run these fixes

Each fix is its own Claude Code session. Open a fresh session, paste the **Prompt for Claude** block from that fix, let it run to completion, then close the session. Do not chain fixes in one session — the validate/commit discipline comes from clean session boundaries.

---

## Fix A — Committee description data bug

### What's wrong

Navigate to `/committee/HSBA` (House Financial Services). Scroll to the committee description. It currently reads something like:

> "Responsible for the federal budget process, fiscal policy oversight, budget resolution…"

That is the **House Budget Committee**'s blurb, pasted on the Financial Services page. The underlying data file is `src/data/committees-with-subcommittees.json` (or similar — Claude will confirm). Either the description is on the wrong committee, or two committees share the same row, or a field was copy-pasted and never edited.

### Why it matters

Of the ~41 federal surfaces in the Phase 1 inventory, this is the only one where CIV.IQ displays a **wrong fact** as authoritative data. A journalist, staffer, or policy professional spotting this in a demo will quietly discount every other chart on the site.

### Prompt for Claude (paste into a fresh session)

```
I'm fixing a data bug flagged in AUDIT-federal-demo-readiness.md (gap #5) and tracked in FIX-pre-demo-factual-bugs.md as Fix A.

Problem: /committee/HSBA (House Financial Services) renders the House Budget Committee's description. The text starts "Responsible for the federal budget process, fiscal policy oversight, budget resolution…" — that belongs on HSBU, not HSBA.

Task:
1. Locate the data source. Start with: grep for "budget resolution" in src/data/ and in any committees*.json, committees*.ts files. The file is likely src/data/committees-with-subcommittees.json or similar.
2. Identify the wrong row: find the committee entry whose systemCode is HSBA and whose description is the Budget Committee text.
3. Replace the description with the correct House Financial Services Committee description. Use the House Financial Services Committee's own published jurisdiction statement (house.gov/committees/financial-services) as the source of truth — not Wikipedia, not a paraphrase. Paste the official jurisdiction text verbatim or lightly trimmed, and add a source comment in the JSON/TS file if the format allows.
4. Spot-check 5 other committee entries (HSAG, HSED, HSFA, HSII, HSJU) to confirm their descriptions match their actual committees. If you find any more mis-matches, fix them and list each one in your end-of-session report.
5. Do NOT refactor the file or restructure the data shape. Minimal diff only.

After the fix, Claude should:
1. Run `npm run validate:all`. It must pass with no new failures (pre-existing npm audit / sitemap warnings are fine).
2. Run `npm run dev`, then curl http://localhost:3000/committee/HSBA and confirm the correct description now renders in the HTML. Also curl /committee/HSBU to confirm the Budget Committee page is unchanged.
3. Update AUDIT-federal-demo-readiness.md: in the Phase 1 inventory table row for `/committee/HSBA` (around line 479), change the "Gap notes" to reflect the fix, and add a new "## Fix A outcome — 2026-04-21" block at the bottom of the Phase 1 findings section with: file modified, exact description swap (before → after, truncated), any additional mis-matches found, and validate:all result.
4. Update FIX-pre-demo-factual-bugs.md: check the Fix A acceptance boxes below.
5. Commit as: `fix(data): correct HSBA committee description (was Budget Committee blurb)`. Do NOT commit if the user's session instructions say otherwise.
6. Stop. Do not proceed to Fix B or any audit phase — separate session per fix.
```

### Acceptance

- [ ] `/committee/HSBA` renders the correct House Financial Services Committee jurisdiction text
- [ ] `/committee/HSBU` (House Budget) still renders its own correct description
- [ ] No other committee mis-matches found (or all additional ones fixed and listed)
- [ ] `npm run validate:all` passes
- [ ] AUDIT-federal-demo-readiness.md updated with Fix A outcome block

---

## Fix B — `/congress/house` and `/congress/senate` return 404

### What's wrong

Both URLs are canonical-sounding. A slide, email, search engine, or bookmark might point to either. Neither route exists. Both return HTTP 404 and a blank page.

### Why it matters

Any inbound link to either URL lands on a blank 404 during a demo. The URLs sound so canonical that a presenter might even type them from memory. It's a silent failure that turns into a visible one the moment anyone outside the team interacts with the site.

### Prompt for Claude (paste into a fresh session)

```
I'm fixing a routing gap flagged in AUDIT-federal-demo-readiness.md (gap #6) and tracked in FIX-pre-demo-factual-bugs.md as Fix B.

Problem: /congress/house and /congress/senate both return HTTP 404. They sound canonical; any inbound link dies.

Task:
Pick the SMALLEST fix that closes the gap. Two options:

Option 1 (recommended, 10 minutes): Add thin redirect routes.
- Create src/app/(civic)/congress/house/page.tsx that redirect()s to /congress.
- Create src/app/(civic)/congress/senate/page.tsx that redirect()s to /congress.
- Use the Next.js server `redirect()` helper. Permanent (308) redirects are fine — these are canonical redirects, not temporary.
- Include a minimal generateMetadata that sets the title to "House — U.S. Congress | CIV.IQ" and "Senate — U.S. Congress | CIV.IQ" so any social share on the old URL still shows meaningful metadata before the redirect.

Option 2 (build real hub pages — only if the /congress hub is already chamber-filterable): Create real pages that filter the existing congress hub by chamber. Do NOT build new data fetching for this.

Default to Option 1 unless you discover the /congress hub already exposes a chamber filter that can be pre-applied trivially. Do not scope-creep.

After the fix, Claude should:
1. Run `npm run validate:all`. Must pass.
2. Run `npm run dev`, then curl -I http://localhost:3000/congress/house and /congress/senate. Confirm 308 redirects (or 200 if Option 2). Follow the redirect (curl -L) and confirm /congress renders.
3. Update AUDIT-federal-demo-readiness.md: in the Phase 1 inventory table, change the `/congress/house` and `/congress/senate` rows (lines ~473-474) from **404** to the new render state and update the gap notes. Add a `## Fix B outcome — 2026-04-21` block under the Phase 1 findings with: files created, option chosen, redirect target, validate result.
4. Update FIX-pre-demo-factual-bugs.md: check the Fix B acceptance boxes below.
5. Commit as: `fix(routes): add /congress/house and /congress/senate redirects to /congress`. Do NOT commit if instructed otherwise.
6. Stop. Separate session for Fix C.
```

### Acceptance

- [ ] `/congress/house` no longer 404s (redirect or real page)
- [ ] `/congress/senate` no longer 404s (redirect or real page)
- [ ] `/congress` itself is unchanged and still works
- [ ] `npm run validate:all` passes
- [ ] AUDIT doc inventory rows updated + Fix B outcome block added

---

## Fix C — Duplicate `| CIV.IQ | CIV.IQ` title suffix

### What's wrong

On `/federal`, `/elections`, and `/investigate`, the browser tab title ends in `| CIV.IQ | CIV.IQ` — the brand suffix is wrapped twice. Visible in the tab bar, social-share previews, and Google results.

### Why it matters

It's a small thing, but it's a small thing that **every visitor sees in their tab bar**. Screams "broken template." Almost certainly a one-line fix: somewhere both a layout-level `generateMetadata` and a page-level `generateMetadata` are each appending ` | CIV.IQ`, or a template + default combo is stacking.

### Prompt for Claude (paste into a fresh session)

```
I'm fixing a title-template bug flagged in AUDIT-federal-demo-readiness.md (gap #9) and tracked in FIX-pre-demo-factual-bugs.md as Fix C.

Problem: Browser tab titles on /federal, /elections, /investigate end with "| CIV.IQ | CIV.IQ" (double brand suffix). Other pages render correctly with one suffix.

Task:
1. Reproduce: curl each of /federal, /elections, /investigate and grep the <title> tag. Confirm the duplication is present.
2. Trace the source. Likely candidates, in order:
   a. A page-level generateMetadata that returns `title: "X | CIV.IQ"` AND a layout-level metadata `title.template: "%s | CIV.IQ"` — the template then appends a second suffix.
   b. Two nested layouts both applying a template.
   c. A shared title helper that appends the suffix unconditionally even when the incoming title already has it.
3. Fix at the source, not per-page. Do NOT add a band-aid that strips the duplicate after the fact. If the root cause is a page-level `title:` including the suffix when the layout template already appends it, change those three pages to return just the page-specific title (e.g. `"Federal Government"` not `"Federal Government | CIV.IQ"`). If the root cause is stacked templates, remove the inner one.
4. After fixing, spot-check 5 other pages that were already correct (/representatives, /committees, /bill/119-hr-7682, /methodology, /) and confirm their titles did NOT regress to single-suffix-missing.

After the fix, Claude should:
1. Run `npm run validate:all`. Must pass.
2. Run `npm run dev`, then curl each of /federal, /elections, /investigate and the 5 spot-check pages. Grep <title> for each. Confirm each has exactly one "| CIV.IQ" suffix — not zero, not two.
3. Update AUDIT-federal-demo-readiness.md: in the Phase 1 inventory table, update gap notes for /federal, /elections, /investigate rows (remove the "duplicate brand suffix" note). Also remove bullet 3 of "Additional notes" (around line 507) that flagged this issue. Add a `## Fix C outcome — 2026-04-21` block under Phase 1 findings with: root cause (one line), file(s) modified, titles confirmed for the 8 pages probed, validate result.
4. Update FIX-pre-demo-factual-bugs.md: check the Fix C acceptance boxes below.
5. Commit as: `fix(metadata): remove duplicate "| CIV.IQ" title suffix on three pages`. Do NOT commit if instructed otherwise.
6. Stop.
```

### Acceptance

- [ ] `/federal`, `/elections`, `/investigate` each show exactly one `| CIV.IQ` in `<title>`
- [ ] 5 spot-checked pages still show exactly one `| CIV.IQ` each
- [ ] Root cause fixed at the source, not patched downstream
- [ ] `npm run validate:all` passes
- [ ] AUDIT doc inventory rows + Additional notes updated, Fix C outcome block added

---

## After A + B + C: return to the audit phases

Once all three pre-phase fixes are landed, resume the parent audit. Recommended order:

### Phase 2 — Silent-failure empty states — **DONE 2026-04-21**

**Status:** Completed prior to this plan being written. Outcome recorded in `AUDIT-federal-demo-readiness.md` lines 188–200. Code committed as `fix(intelligence): replace silent null returns with designed empty states`. Skip this section and resume at Fix A.

**What it fixed in plain English:** Three React components previously did `return null` when their data source returned nothing. The user just saw a missing section — no "Data unavailable" message, no explanation. Phase 2 swapped those three `return null`s for proper empty-state components that say what's missing and why (e.g. "No campaign finance filings found for this representative in the current cycle").

**Also covers (discovered in Phase 1):** Gap item #4 — the Intelligence tab's `financeJurisdiction` analyzer returning `null` silently on Jeffries' page. Phase 2 should include the analyzer-null case, not just the component-null case.

**Prompt:** Use the prompt block starting around line 160 of `AUDIT-federal-demo-readiness.md`.

**What Claude should do at the end of the Phase 2 session:**

1. `npm run validate:all` passes.
2. `npm run dev` and manually verify: visit Hakeem Jeffries' profile, open the Intelligence tab, confirm the `financeJurisdiction` panel shows a proper "not enough data" state instead of empty space.
3. Update `AUDIT-federal-demo-readiness.md`: check the Phase 2 acceptance criteria boxes, add a `### Outcome (YYYY-MM-DD)` block under Phase 2 with files modified and verification.
4. Update gap items #4 and the "silent null in Intelligence analyzer output" line in the Phase 1 gap list — mark as resolved.
5. Commit as `fix(ui): render explicit empty states instead of silent return null`.
6. Stop.

### Phase 4 — Citizen clarity polish (~2 hr)

**What it fixes in plain English:** Three small presentation-layer additions that reframe the site from "expert dashboard" to "civic tool for normal people."

- **4a — Homepage CTA:** add a clear "Find my representatives" button next to the search box so a non-expert guest knows what to do.
- **4b — Tab intros:** the Finance and Voting tabs on rep profiles currently dump users straight into charts. Add a one-paragraph plain-English intro to each tab explaining what the data is, where it comes from, and how to read a "yea" vote.
- **4c — Data freshness timestamp:** the rep profile currently claims "data is refreshed automatically" with no actual date. Add a real `Data last updated: <date>` line in the hero.

**Prompt:** Use the prompt block starting around line 248 of `AUDIT-federal-demo-readiness.md`.

**What Claude should do at the end of the Phase 4 session:**

1. `npm run validate:all` passes.
2. `npm run dev` and walk the three additions manually: homepage CTA visible above the fold, Finance/Voting intros render on `/representative/J000294`, freshness timestamp shows an actual date in the hero.
3. Screenshot (or describe) the rendered state of each of the three in the session output.
4. Update `AUDIT-federal-demo-readiness.md`: check Phase 4 acceptance criteria, add Outcome block, mark gap items #1 / #2 / #3 as resolved in the Phase 1 gap list.
5. Commit as `feat(ui): citizen-facing polish — homepage CTA, tab intros, data freshness`.
6. Stop.

### Phase 5 — Intelligence-tab guardrail (~45 min)

**What it fixes in plain English:** When the intelligence analyzers don't have enough data to say something meaningful (low-activity reps, freshmen, etc.), the tab currently still renders with empty skeletons. Phase 5 adds a guardrail: if fewer than N analyzers return usable results, hide the tab entirely (or show a single "Intelligence unavailable for this representative yet" message). This prevents the gap #10 scenario (freshman rep with a half-empty Intelligence tab).

**Prompt:** Use the prompt block in `AUDIT-federal-demo-readiness.md` for Phase 5.

**What Claude should do at the end of the Phase 5 session:**

1. `npm run validate:all` passes.
2. Manually verify on two reps: Jeffries (high activity — Intelligence tab should render) and one freshman rep from the most recent class (low activity — Intelligence tab should either be hidden or show the unified unavailable message).
3. Update `AUDIT-federal-demo-readiness.md`: check Phase 5 acceptance criteria, add Outcome block, mark gap item #10 as resolved.
4. Commit as `feat(intelligence): guardrail hides thin Intelligence tab on low-activity reps`.
5. Stop.

### Phase 6 — Federal demo rehearsal (~30 min)

**What it does in plain English:** Not a fix — a final rehearsal. Walk the 7-step federal demo script end-to-end with DevTools open. Confirm no console errors, no 404s, no blank skeletons, no layout shifts, no slow pages over 3 seconds. Produce a go/no-go readout.

**Prompt:** Use the prompt block in `AUDIT-federal-demo-readiness.md` for Phase 6.

**What Claude should do at the end of the Phase 6 session:**

1. No code changes in this phase — read-only rehearsal.
2. Produce a short readout in the AUDIT doc: each of the 7 steps of the federal demo script, with pass/fail/observation, and any regressions introduced by Phases 2/4/5 (or Fixes A/B/C).
3. If any step fails, DO NOT fix it in the Phase 6 session — flag it, recommend which prior phase to reopen, and stop.
4. If all 7 steps pass: close the audit. Add a `## Audit closed — YYYY-MM-DD` line at the top of `AUDIT-federal-demo-readiness.md` with the demo-readiness verdict.
5. No commit needed unless the readout itself is added to the doc.
6. Stop.

---

## Total time estimate

| Block                               | Time                                    |
| ----------------------------------- | --------------------------------------- |
| Fix A (HSBA description)            | ~20 min                                 |
| Fix B (congress/house + senate 404) | ~15 min                                 |
| Fix C (duplicate CIV.IQ suffix)     | ~20 min                                 |
| Phase 2 (silent empty states)       | ~30 min                                 |
| Phase 4 (citizen clarity polish)    | ~2 hr                                   |
| Phase 5 (intelligence guardrail)    | ~45 min                                 |
| Phase 6 (demo rehearsal)            | ~30 min                                 |
| **Total**                           | **~5 hours** of focused Claude sessions |

Spread across 7 separate sessions. Not one marathon.

---

## If you only have 1 hour before the demo

Do Fix A and Fix B. Skip everything else. Wrong committee data and 404 links are the two things that instantly signal "this site is broken." Everything else can be talked through during a demo.

---

## Session hygiene reminder

- One fix or phase per Claude Code session. Don't chain.
- Every session ends with `npm run validate:all` passing.
- Every session updates `AUDIT-federal-demo-readiness.md` with an outcome block and resolved gap markers — that doc is the living record.
- Every session ends with "Stop" — don't auto-advance to the next phase.
