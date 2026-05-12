# PROMPT — Redesign PR 3 Polish

**Goal:** close the three known deferrals from PR 3 (ProfileHybrid) plus one design-system rule violation that surfaced when reviewing the redesign in dev. This is a single focused PR, not a sweep.

**Scope discipline:** federal officeholder profile (`/representative/[bioguideId]`) only. Do NOT touch state legislator, district, committee, or any other page in this PR. If you find yourself editing files outside `src/components/officials/ProfileHybrid/` or one of the explicitly-named files below, you've scope-crept.

**No feature flag.** PR 3 already gates the chassis behind `?v=new`. The polish work lives inside that same gate — nothing new to gate.

---

## Items, in priority order

### Item 1 — Wire headline stats (HIGH priority, biggest credibility hit)

**File:** `src/components/officials/ProfileHybrid/ProfileHybrid.tsx` lines 205–226

**Current state:** three of five stat cells render `<UnknownStat caption="Loaded from /bills" />` placeholders with `caption="Loads with panel"` microcopy:

- BILLS SPONSORED
- ROLL-CALL VOTES
- RAISED, CYCLE

The remaining two cells (Committees, Caucuses) are wired and show real numbers. The contrast makes the page read as half-loaded.

**Data sources already in the codebase:**

- Roll-call vote count: `RecordPanel.tsx` already computes `totalVotes` from `/api/representative/[id]/batch` (votes endpoint, line 87). Lift that fetch up or duplicate the call at the chassis level.
- Bills sponsored count: `BillsPanel.tsx` reads from the batch endpoint. Same pattern.
- Raised this cycle: `MoneyPanel.tsx` reads from `/api/representative/[id]/finance` (or batch). Sum to a single dollar figure for the cycle.

**Approach:** add a server-side or top-of-chassis fetch that pulls the three numeric summaries from `/api/representative/[id]/batch` and passes them to the stat cells. Avoid three separate fetches — use one batch call. Each panel will still re-fetch its detail on mount; that's fine.

**Acceptance:** open the page for at least 3 reps spanning both parties and both chambers (e.g. Thanedar D-MI-13 House, a Republican House member, a Democratic Senator, a Republican Senator). All three stats display real numbers. When data is unavailable (e.g. a freshman with no votes yet), show `—` with a `Data unavailable` caption — same pattern Committees/Caucuses already use. Never show the placeholder microcopy.

---

### Item 2 — Wire OR delete the secondary alignment row

**File:** `src/components/officials/ProfileHybrid/ProfileHybrid.tsx` lines 250–280

**Current state:** three columns hardcoded to `'—'`:

- Votes w/ [party]
- Votes w/ chamber majority
- Bipartisan co-sponsorships

**Important context:** the Vote Alignment card on the right side of the Voting Record panel **already shows "with Democratic 97%"** populated from `/api/representative/[id]/party-alignment`. The secondary row and the alignment card display the same dimension. One is filled, the other isn't.

**Decision required up front (ask the user):**

- **Option A — Delete the row.** Cleaner. The alignment card already serves the purpose. Reduces visual weight at the top.
- **Option B — Wire all three.** Party alignment comes free from the existing endpoint. Chamber majority needs a new computation (`votes_with_majority / total_votes`). Bipartisan co-sponsorships needs a new compute or an endpoint that joins sponsored bills with co-sponsor party data.

**My recommendation:** Option A. The alignment card already shows the most important signal in a more prominent position; this row reads as a "we measured three things" boast without earning the space. The hardcoded `'—'` is the giveaway that nobody actually wanted to wire it.

**Acceptance:**

- If A: row removed, layout below it absorbs the space, no visual gap.
- If B: all three columns populate from real data, never hardcoded.

---

### Item 3 — Fix vote-outcome color rule violation

**File:** `src/components/officials/ProfileHybrid/RecordPanel.tsx` lines 56–60

**Current state:**

```ts
function chipVariantFor(position: string | undefined): 'd' | 'r' | 'i' {
  if (position === 'Yea' || position === 'Yes') return 'd'; // Democrat green
  if (position === 'Nay' || position === 'No') return 'r'; // Republican red
  return 'i';
}
```

**The violation:** `.claude/rules/design-system.md` is explicit — "Party colors (red/green) are ONLY for political party identification. Never for errors or system state." PR 10's spec restates it: "Color encoding is **party** (red/green), not vote (yes/no); vote is encoded by an icon glyph + label."

A Democrat voting NAY currently shows a red chip — semiotically reading as "Republican-coded vote" to anyone scanning fast. Reverse for a Republican voting YEA. The conflation is the rule's exact failure mode.

**Available variants** (`src/components/cq/CqChip.tsx` line 3): `'d' | 'r' | 'i' | 'info' | 'warn' | 'ink'`.

**Fix approach:**

- YEA: `variant="ink"` filled (solid black chip, white text)
- NAY: `variant="ink"` outline (white chip, black border, black text)
- Present/Abstain: `variant="i"` (already neutral)

Differentiation is shape (filled vs outline), not color. The text label "YEA" / "NAY" already carries the meaning unambiguously. Confirm `CqChip` supports `filled={false}` for an outline style; if not, add it (small CqChip change, but in scope because the design system requires it).

**Acceptance:**

- Open a Republican member's voting record. NAYs must not appear red. YEAs must not appear green.
- The vote alignment bar on the right (which shows "with Democratic 97%") **keeps** the party color — that bar is alignment-with-party, so party color is correct there. Don't change that bar.

---

### Item 4 — Investigate the address-data gap

**Symptom:** all three address blocks on Thanedar's profile read "Address unavailable" (Washington DC + two district offices).

**Likely cause:** the federal officeholder data feed (`src/services/api/representatives.ts` and downstream services) may not be pulling office addresses from House.gov / Senate.gov XML feeds, or the field mapping changed.

**Investigation (do NOT fix in this PR if the gap turns out to be a data-source problem):**

1. Open `/api/representative/T000488` and inspect the response. Does the JSON contain `offices` / `addresses`?
2. If yes, the bug is in the UI (`ContactStrip.tsx`) — fix it here.
3. If no, the bug is upstream (the data fetcher isn't pulling office data). File this as a separate issue named "Federal office addresses missing for current members" and link it from the PR description. Do not expand this PR's scope to fix data ingestion — that's a different change set.

**Acceptance:**

- Either: address blocks populate with real data on the same 3 reps used for Item 1, OR
- A follow-up issue is filed with the upstream root cause and PR 3.5 ships with the existing "Address unavailable" empty state preserved (which is already rule-compliant — designed empty state, not a blank card).

---

## Items explicitly OUT OF SCOPE

- **State legislator profile.** Different chassis, different file. Save for a separate "PR 9 polish" session.
- **The Upstash Redis dev/prod split.** Ops issue, not a redesign issue.
- **Dropping the `?v=new` flag globally.** That's the next strategic decision after this polish lands, not part of polish.
- **PR 0 (IA renames).** Deferred per the 2026-05-12 session — A is an SEO risk we don't take, B is cleanup with no user benefit, C deletes a real feature (graph canvas) that `/ask` does not absorb.
- **The Next.js dev-tools "N" indicator.** Built into Next.js 16, dev-only, never ships. Not a CIV.IQ widget. No action.

---

## Files you'll likely modify

- `src/components/officials/ProfileHybrid/ProfileHybrid.tsx` (Items 1 + 2)
- `src/components/officials/ProfileHybrid/RecordPanel.tsx` (Item 3 — `chipVariantFor`)
- `src/components/cq/CqChip.tsx` (Item 3 — may need outline-style support)
- `src/components/officials/ProfileHybrid/ContactStrip.tsx` (Item 4, only if UI bug)
- Possibly a new helper for the batched stat fetch, e.g. `src/components/officials/ProfileHybrid/useProfileSummary.ts`

## Files NOT to modify

- API routes under `src/app/api/` — this is a presentation PR, not a data PR
- Type definitions in `src/types/` — data shape stays the same
- Any other page chassis or Cq primitive other than `CqChip`
- Anything under `src/lib/intelligence/` — analyzer logic is untouched
- Test scaffolding outside the files you change

## Verification

```bash
npx tsc --noEmit
npx eslint src/components/officials/ProfileHybrid src/components/cq/CqChip.tsx
npm run dev
# Visit 3 reps with NEXT_PUBLIC_CIVIQ_V=new in .env.local:
#   /representative/T000488   (Thanedar, D, House)
#   /representative/T000490   (Taylor, R, House)
#   /representative/<Democratic Senator>
#   /representative/<Republican Senator>
# Note: H001075 = Kamala Harris (historical — not in 119th Congress). Don't use for verification.
# Verify:
#   - Five headline stats all show real numbers or honest empty states
#   - Secondary row gone OR all three columns populated
#   - Vote chips never red/green for Y/N
#   - Vote Alignment bar on right still uses party color (correct)
#   - Plain-reading callout and methodology disclaimer unchanged
#   - Default ?v=old branch still renders the old chassis unchanged
```

## Commit format

```
feat(redesign-pr3-polish): wire headline stats, remove vote-color rule violation

- Wire BILLS SPONSORED, ROLL-CALL VOTES, RAISED CYCLE in ProfileHybrid headline row
- [Removed | Wired] secondary alignment row (party / chamber majority / bipartisan)
- Replace party-color vote chips with ink filled/outline variant
- <Note address gap as data issue OR fix if it was a UI bug>
- Plan: PROMPT-redesign-pr3-polish.md
- Memory: project_redesign-pr3-polish-followups.md (closes the three known deferrals)
```

Per `feedback_prompt-files-local-only`: commit this PROMPT file locally but never push it to GitHub.

After landing: update `project_redesign-pr3-polish-followups.md` memory to mark the three deferrals closed (or update the surviving address-gap follow-up if Item 4 falls into a separate issue).
