# CIV.IQ Integrity Audit

**Date:** 2026-03-22
**Scope:** Phone book completeness, infrastructure reliability, editorial bias, navigation dead ends
**Method:** Full codebase investigation across 4 areas, 40+ files read, grep/glob across all source

---

## Cross-Cutting Requirement: Plain Language Compliance

**All user-facing prose added or modified in this audit must follow the federal Plain Language Guidelines ([plainlanguage.gov](https://www.plainlanguage.gov)) and the Plain Writing Act of 2010 (Public Law 111-274).**

This project already enforces plain language for AI-generated content via `src/lib/ai/plain-language.ts` and validates it with `src/features/legislation/services/ai/reading-level-validator.ts`. The same standard applies to all static content written for this audit.

### Writing rules (from `PLAIN_LANGUAGE_RULES` in `src/lib/ai/plain-language.ts`)

| Rule                                                                                                          | Example                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Write for the reader. Use "you" and "your."                                                                   | "Your representative can help" not "The representative's office assists constituents" |
| State the major point first.                                                                                  | Lead with what matters, then details.                                                 |
| Active voice. Make clear who does what.                                                                       | "Congress votes on bills" not "Bills are voted on by Congress"                        |
| Sentences under 20 words. Average 15.                                                                         | One idea per sentence.                                                                |
| Everyday words. Define technical terms in parentheses.                                                        | "appropriation (money set aside by Congress)"                                         |
| "must" not "shall". "may" not "is authorized to".                                                             |                                                                                       |
| No nominalizations. Use verbs, not noun forms.                                                                | "decide" not "make a determination"                                                   |
| Replace jargon: "commence" -> "begin", "utilize" -> "use", "prior to" -> "before", "subsequent to" -> "after" |                                                                                       |
| No analogies, metaphors, or hypothetical scenarios.                                                           |                                                                                       |
| Specific numbers, dates, and dollar amounts.                                                                  |                                                                                       |

### Validation target

- **Flesch-Kincaid Grade Level <= 8**
- **Flesch Reading Ease >= 60**

### Items with new user-facing prose (must pass reading level validation)

| Item | Content type                               |
| ---- | ------------------------------------------ |
| 1.1  | About page epistemic limits (7 items)      |
| 1.2  | Blind-spot annotations (4 tab annotations) |
| 1.4  | Renamed labels (neutral descriptors)       |
| 1.5  | FEC lag disclosure sentence                |
| 2.2  | Constituent services explainer             |
| 4.4  | Outbound link context text                 |

### How to validate reading level

Use the existing `ReadingLevelValidator` class:

```typescript
import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';

const result = ReadingLevelValidator.analyze(text);
console.log(result.gradeLevel); // Must be <= 8
console.log(result.fleschReadingEase); // Must be >= 60
console.log(result.complexWords); // Fix these
console.log(result.suggestions); // Follow these
```

Or manually verify: count average words per sentence (target: 15), check for passive voice, flag words over 3 syllables.

---

## Investigation Findings

### Area 1: Phone Book Completeness

| #   | Gap                              | Status                                              | Evidence                                                                                                                                                                                                                  |
| --- | -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | District office locations        | **YES — type exists, never populated or rendered**  | Type at `representative.ts:158-163`. `congress.service.ts` mapping (lines 830-896) never sets `contact` field. `OverviewSidebar.tsx` only uses `currentTerm.office` (DC office).                                          |
| 2   | Constituent services explanation | **YES — no casework guidance**                      | `ContactInfoTab.tsx:50-79` has a "Need Help?" box with generic text linking house.gov. No mention of casework categories (VA, SSA, IRS, USCIS, passports).                                                                |
| 3   | Attendance rate                  | **PARTIAL — exists in VotingTab, absent from hero** | `VotingTab.tsx:507-558` renders a conditional "Vote Attendance Record" box with percentage and missed count. Not in `HeroStatsHeader.tsx`. Hero shows raw "Votes Cast" count only.                                        |
| 4   | Legislative effectiveness        | **YES — enacted count buried in BillsTab**          | `BillsTab.tsx:369` shows enacted count in a tab-level stats grid. Hero shows only `billsSponsored`. No success rate computed. `RepresentativeAnalytics.effectiveness` type exists (lines 235-240) but is never populated. |
| 5   | Floor speeches                   | **YES — completely absent**                         | `govinfo.ts:22` has a `CREC` type enum value. No API route, service, or component fetches Congressional Record data.                                                                                                      |
| 6   | Caucus memberships               | **YES — populated in service, never rendered**      | `congress.service.ts:895` calls `getCaucusesForMember()` loading from `public/data/caucus-membership.json` (119th Congress, Congressional Data Coalition source). Zero UI components reference `caucuses`.                |
| 7   | Election history                 | **PARTIAL — on district page only, single cycle**   | `DistrictCharts.tsx:412-416` renders `ElectionHistoryChart` with 2024 results from `election-results-house.ts` (MEDSL data). Representative profile page has no election results.                                         |
| 8   | Earmarks                         | **YES — completely absent**                         | Only FEC contribution "earmarking" in `recipient-resolver.ts:142`. No congressional directed spending data whatsoever.                                                                                                    |

**`getAllEnhancedRepresentatives` callers:** 12 API route files load all 535 members including `search/route.ts`, `representatives/all/route.ts`, `v1/representatives/route.ts`, `v2/representatives/route.ts`, `districts/[districtId]/route.ts`, `warmup/route.ts`, and 6 others. Additionally called by `representatives-core.service.ts`, `committee.service.ts`, `search-handler.ts`, `cascade.ts`, `query-executor.ts`, and the state delegation page.

---

### Area 2: Infrastructure Reliability

| #   | Gap                                                | Status             | Evidence                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Health check validates key existence, not validity | **YES**            | `health/route.ts:37-41` uses `!!process.env.CONGRESS_API_KEY` etc. Pure truthy coercion. No HTTP validation request to any upstream API.                                                                                                                                                                                                            |
| 2   | Circuit breaker throws without serving stale cache | **YES**            | `circuit-breaker.ts:39` throws `Error('Circuit breaker ... is OPEN')`. `stale-response-cache.ts` exists with `fetchWithStaleFallback()` fully implemented but imported by zero production code -- only its test file.                                                                                                                               |
| 3   | `dataAsOf` uses `new Date()` not source freshness  | **YES**            | 11 of 13 analyzers set `dataAsOf: new Date().toISOString()`. Only `federal-register-extractor.ts:163` uses `doc.publication_date`. The `InsightBase` type at `types.ts:27-40` already correctly documents it as "freshest source data" and already has a separate `lastAnalyzedAt` field (line 37). The type is correct; implementations are wrong. |
| 4   | FEC lag not disclosed in any UI                    | **YES**            | Backend comment at `finance-helpers.ts:20` says "FEC data updates quarterly" -- never surfaced to users. Zero UI components disclose the 20-90 day FEC reporting lag.                                                                                                                                                                               |
| 5   | District metadata file incomplete                  | **NO -- RESOLVED** | `district_metadata_real.json` has 444 districts across 56 states/territories. API route loads it first, falls back to demo file only on error.                                                                                                                                                                                                      |
| 6   | 10+ routes load all 535 reps                       | **YES**            | 12 API route files call `getAllEnhancedRepresentatives()`. Most only need 1-3 reps for the requested district.                                                                                                                                                                                                                                      |
| 7   | No freshness timestamps on main reference pages    | **YES**            | 22+ pages pass `lastUpdated={new Date()}` -- render time, not data freshness.                                                                                                                                                                                                                                                                       |

**Additional findings:**

- Congressional vacancies file (`congressional-vacancies.ts`) last updated 2025-11-13. TN-07 special election (Dec 2025) result missing. Entirely manual.
- Election results (`election-results-house.ts`) generated 2026-03-04, hardcoded, no auto-refresh mechanism.

---

### Area 3: Editorial Bias in Presentation

| #   | Gap                                              | Status                                 | Evidence                                                                                                                                                                                                                    |
| --- | ------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Red used for high alignment scores (>60%)        | **YES**                                | `SectorLeaderboard.tsx:78` -- `alignmentColor()` returns `text-red-600` for >60%. `MoneyReportCard.tsx:50` -- `metricColor()` returns `text-[#e11d07]` for >60%. Implies high sector voting correlation is a danger signal. |
| 2   | Label says "alignment" not neutral descriptor    | **YES**                                | `SectorLeaderboard.tsx:228` column header "Alignment", line 190 "Mean alignment". `InsightCard.tsx:184` "Avg alignment". `VoteShiftTimeline.tsx:57` "Party Alignment Over Time".                                            |
| 3   | Label says "independence" not neutral descriptor | **YES**                                | `VotePredictionCard.tsx:38` "Voting Independence Analysis", line 46 "Independence score". `MoneyReportCard.tsx:158` "Independence Score", lines 201/219 "Most/Least independent".                                           |
| 4   | Nav says "Investigate"                           | **YES**                                | `Header.tsx:48` -- `{ name: 'Investigate', href: '/investigate' }`. `InvestigateClient.tsx:110` heading "Investigate Connections".                                                                                          |
| 5   | No About page                                    | **NO -- exists but lacks limitations** | About page at `src/app/(public)/about/page.tsx` has mission, 4 principles, 9 data sources. No "What CIV.IQ Does Not Show" section.                                                                                          |
| 6   | No blind-spot annotations on tabs                | **YES**                                | `TabNavigation.tsx:320-351` tab descriptions are purely positive. No annotations about what data is NOT captured.                                                                                                           |

**Disclaimer character:** Analyzer disclaimers are defensive ("does not indicate wrongdoing") rather than epistemic (what data is missing, what the analysis cannot see).

---

### Area 4: Navigation Dead Ends

| #   | Gap                           | Status                                          | Evidence                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Two address lookup pages      | **YES -- with redirect, but dead code remains** | `next.config.mjs:176-184` has 301 redirect `/money-report` -> `/your-reps`. But `Header.tsx:47` still links to `/money-report` (redirect hop). `/your-reps` NOT in nav. Dead code: `money-report/page.tsx`, `money-report/layout.tsx`, deprecated `AddressLookupForm.tsx` (283 lines), deprecated `MoneyReportCard.tsx`. |
| 2   | `/local` dead end             | **YES**                                         | `local/page.tsx` is a static placeholder with "There is no single API for local government data". Nav `Header.tsx:61` still lists it as "Officials".                                                                                                                                                                     |
| 3   | Bill search limited           | **PARTIAL**                                     | `legislation/page.tsx` has 4 client-side filters but data capped at 50 bills. API accepts up to 250. No pagination. Congress.gov listing endpoint has no keyword search.                                                                                                                                                 |
| 4   | Committees page has no search | **YES**                                         | `committees/page.tsx` loads from static JSON, `force-static`. No search bar, no filter controls.                                                                                                                                                                                                                         |

---

## Implementation Plan

### Phase 1: Structural Honesty

_No new API integrations. Editorial, labeling, content, and type-correctness changes only._

---

#### 1.1 -- Add epistemic limits section to About page

**Status:** Modifies existing
**Scope:** M (30-100 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/app/(public)/about/page.tsx` -- Add a new "What CIV.IQ Does Not Show" section between the "Principles" section (ends line 131) and the "Official Sources" section (starts line 133)

**Data source:** Static content (no API)

**Implementation approach:**
Insert a new `<div className="mb-grid-8">` block after line 131 containing an `<h2>` header "What This Data Cannot Tell You" styled identically to the existing section headers (`text-sm font-semibold text-gray-500 uppercase tracking-wider mb-grid-3`). Below it, render 7 items in a `space-y-grid-3` container using the same `border-b border-gray-100 pb-grid-2` pattern as the Principles section. Each item has a bold lead phrase and a gray-600 explanatory sentence. Content covers: (1) behind-the-scenes negotiation, (2) bills killed by inaction, (3) constituent service quality, (4) who gets access, (5) symbolic vs. consequential votes, (6) staff competence, (7) whether contributions changed minds. All text must follow PlainLanguage.gov guidelines: "you/your" to address the reader, active voice, sentences under 20 words, everyday words with technical terms defined in parentheses, no jargon or nominalizations. Target Flesch-Kincaid Grade Level <= 8, Flesch Reading Ease >= 60. Validate with `ReadingLevelValidator.analyze()`. No links -- declarative, not navigational.

**Design system compliance:**

- Font: Braun Linear (inherited)
- Spacing: 8px grid multiples (`mb-grid-8`, `mb-grid-3`, `pb-grid-2`, `space-y-grid-3`)
- Borders: `border-b border-gray-100` (matching Principles section)
- Colors: `text-gray-500` header, `text-black` bold leads, `text-gray-600 text-sm` explanations
- No shadows, no rounded corners, no gradients

**Dependencies:** None

**Plain language compliance:** All 7 items must follow PlainLanguage.gov guidelines. Use "you" and "your." Active voice. Sentences under 20 words. Everyday words -- define technical terms in parentheses. No jargon, no nominalizations, no analogies. See `src/lib/ai/plain-language.ts` for the full `PLAIN_LANGUAGE_RULES` constant.

**Verification:**

- [ ] Visit `/about` -- "What This Data Cannot Tell You" appears between Principles and Official Sources
- [ ] Each of the 7 items renders with bold lead phrase and explanatory text
- [ ] All text passes Flesch-Kincaid Grade Level <= 8, Flesch Reading Ease >= 60 (validate with `ReadingLevelValidator.analyze()` from `src/features/legislation/services/ai/reading-level-validator.ts`)
- [ ] No passive voice, no nominalizations, no jargon without parenthetical definitions
- [ ] Sentences average under 20 words
- [ ] Visual style matches Principles section exactly
- [ ] `npm run validate:all` passes

---

#### 1.2 -- Add blind-spot annotations to representative profile tabs

**Status:** Modifies existing
**Scope:** S (10-30 lines per file, 4 files)

**Files to modify:**

- `/Users/mbs/civ.iq/src/features/representatives/components/VotingTab.tsx` -- Annotation at top of tab content
- `/Users/mbs/civ.iq/src/features/representatives/components/FinanceTab.tsx` -- Annotation at top
- `/Users/mbs/civ.iq/src/features/representatives/components/BillsTab.tsx` -- Annotation at top
- `/Users/mbs/civ.iq/src/components/intelligence/IntelligenceTab.tsx` -- Annotation at top

**Data source:** Static content (no API)

**Implementation approach:**
In each file, add a `<p>` element with class `text-sm text-gray-500 mb-grid-3 border-l-2 border-gray-200 pl-grid-2` immediately after the tab's opening container div and before the first data-rendering element. Text per tab:

- **VotingTab**: "Roll call votes only. Does not include voice votes, committee markup votes, unanimous consent, or the negotiation that determines what reaches the floor."
- **FinanceTab**: "Shows reported contributions. Does not show who meets with your representative, independent expenditure groups, or whether contributions influenced any decision."
- **BillsTab**: "Shows bills introduced and their status. Does not show how actively your representative worked on them, or distinguish a messaging bill from a years-long legislative effort."
- **IntelligenceTab**: "Statistical patterns in public records. Cannot measure intent, relationships, or the private dynamics of legislating."

**Design system compliance:**

- `text-sm text-gray-500`, `border-l-2 border-gray-200`, `pl-grid-2 mb-grid-3`

**Dependencies:** None

**Plain language compliance:** All 4 annotations must follow PlainLanguage.gov guidelines. Active voice. Under 20 words per sentence. No jargon. Address the reader directly where appropriate.

**Verification:**

- [ ] Representative profile (e.g., bioguideId `P000197`): each of 4 tabs shows annotation
- [ ] Annotations are visually subordinate to data content
- [ ] All annotation text passes Flesch-Kincaid <= 8 (validate with `ReadingLevelValidator.analyze()`)
- [ ] No wrapping issues on mobile (375px)
- [ ] `npm run validate:all` passes

---

#### 1.3 -- Replace editorial color coding with neutral palette

**Status:** Modifies existing
**Scope:** S (10-30 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/components/intelligence/SectorLeaderboard.tsx` -- Replace `alignmentColor()` (lines 77-81)
- `/Users/mbs/civ.iq/src/components/intelligence/MoneyReportCard.tsx` -- Replace `metricColor()` (lines 45-51) and `independenceColor()` (lines 57-63)

**Implementation approach:**
Replace three color functions with neutral gray intensity. `SectorLeaderboard.tsx alignmentColor()`: `>60 -> 'text-gray-900'`, `>=30 -> 'text-gray-600'`, `else -> 'text-gray-400'`. Same pattern for `metricColor()` and `independenceColor()` in `MoneyReportCard.tsx`. Removes red/green editorial judgment from non-partisan data. Red/green reserved for party identification per design system.

**Dependencies:** None

**Verification:**

- [ ] Leaderboard scores use gray intensity instead of red/amber/green
- [ ] Money report metrics use gray intensity
- [ ] `npm run validate:all` passes

---

#### 1.4 -- Rename editorial labels to neutral descriptors

**Status:** Modifies existing
**Scope:** M (30-100 lines across 8 files)

**Files to modify:**

- `/Users/mbs/civ.iq/src/components/intelligence/SectorLeaderboard.tsx` -- "Alignment" -> "Sector vote rate" (lines 190, 228, 286)
- `/Users/mbs/civ.iq/src/components/intelligence/InsightCard.tsx` -- "Avg alignment" -> "Avg sector vote rate" (line 184)
- `/Users/mbs/civ.iq/src/components/intelligence/VoteShiftTimeline.tsx` -- "Party Alignment Over Time" -> "Party-line voting rate over time" (line 57), "Quarterly alignment" -> "Quarterly rate" (lines 66, 103), data key `alignment` -> `partyLineRate` (lines 48, 72, 76)
- `/Users/mbs/civ.iq/src/components/intelligence/VotePredictionCard.tsx` -- "Voting Independence Analysis" -> "Voting pattern analysis" (line 38), "Independence score" -> "Prediction divergence" (lines 46, 127)
- `/Users/mbs/civ.iq/src/components/intelligence/MoneyReportCard.tsx` -- "Independence Score" -> "Prediction divergence" (line 158), "Most/Least independent" -> "Highest/Lowest divergence" (lines 201, 219)
- `/Users/mbs/civ.iq/src/shared/components/navigation/Header.tsx` -- "Investigate" -> "Connections" (line 48)
- `/Users/mbs/civ.iq/src/app/(civic)/investigate/InvestigateClient.tsx` -- "Investigate Connections" -> "Explore Connections" (line 110), "Investigate" breadcrumb -> "Connections" (line 105), "Who do you want to investigate?" -> "Search for a representative" (line 151)
- `/Users/mbs/civ.iq/src/features/representatives/components/OverviewSidebar.tsx` -- "Investigate connections" -> "Explore connections" (line 311)

**Dependencies:** None

**Verification:**

- [ ] Grep `src/components/intelligence/` for "alignment" in UI labels -- zero hits (type internals are OK)
- [ ] Grep for "independence" in UI labels -- zero hits
- [ ] Grep navigation for "Investigate" -- zero hits
- [ ] `npm run validate:all` passes

---

#### 1.5 -- Add FEC data lag disclosure to Campaign Finance tab

**Status:** Modifies existing
**Scope:** XS (<10 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/features/representatives/components/FinanceTab.tsx` -- Add disclosure line using existing `metadata?.dataFromCycle` and `cycle` data

**Implementation approach:**
After any annotation (from 1.2), add `<p className="text-xs text-gray-400 mb-grid-2">` with: "Campaign finance data from FEC.gov. Filing reports cover the {cycle} election cycle, typically 20-90 days behind real-time." Interpolate cycle from existing `FinanceData.cycle` field. No new API calls.

**Plain language compliance:** Disclosure text must use everyday words and active voice per PlainLanguage.gov. No jargon. Under 20 words per sentence.

**Dependencies:** None

**Verification:**

- [ ] Campaign Finance tab shows FEC lag disclosure
- [ ] Disclosure text passes Flesch-Kincaid <= 8
- [ ] `npm run validate:all` passes

---

#### 1.6 -- Fix `dataAsOf` semantics in all analyzers

**Status:** Modifies existing
**Scope:** M (30-100 lines across 11 files)

**Files to modify:**

- `/Users/mbs/civ.iq/src/lib/intelligence/analyzers/shared.ts` -- Add `freshestDate()` helper
- 11 analyzer files (finance-jurisdiction, influence-chain, vote-finance, temporal-proximity, civic-brief-assembler, pac-vote, lobbying-pipeline, temporal-vote, bill-intelligence, vote-prediction, stock-committee) -- Replace `dataAsOf: new Date().toISOString()` with `freshestDate()` call using actual source timestamps

**Implementation approach:**
The `InsightBase` type already has both `dataAsOf` ("freshest source data") and `lastAnalyzedAt` ("when generated") -- the type is correct, only implementations are wrong. Add `freshestDate(...dates: (string | undefined)[]): string` to `shared.ts` that filters undefined, sorts, returns most recent ISO string (falls back to `new Date().toISOString()` if none). Each analyzer passes its source data timestamps (vote dates, FEC transaction dates, filing dates, trade dates).

**Dependencies:** None

**Verification:**

- [ ] `/api/intelligence/representative/P000197/vote-finance` returns `dataAsOf` as a past date
- [ ] `lastAnalyzedAt` is today's date
- [ ] Grep `dataAsOf: new Date()` in analyzers -- zero hits
- [ ] `npm run validate:all` passes

---

#### 1.7 -- Consolidate address lookup and clean up deprecated code

**Status:** Modifies existing + deletes dead code
**Scope:** S (10-30 lines of changes, plus deletions)

**Files to modify:**

- `/Users/mbs/civ.iq/src/shared/components/navigation/Header.tsx` -- Line 47: `'Money Report'` -> `'Your Reps'`, `'/money-report'` -> `'/your-reps'`

**Files to delete:**

- `/Users/mbs/civ.iq/src/app/(civic)/money-report/page.tsx`
- `/Users/mbs/civ.iq/src/app/(civic)/money-report/layout.tsx`
- `/Users/mbs/civ.iq/src/components/intelligence/AddressLookupForm.tsx` (deprecated, 283 lines)
- `/Users/mbs/civ.iq/src/components/intelligence/MoneyReportCard.tsx` (deprecated)

**Implementation approach:**
Change nav link to point directly to `/your-reps`. Delete 4 dead-code files. Keep the 301 redirect in `next.config.mjs` for external links. Grep for imports of deleted components before removing.

**Dependencies:** None

**Verification:**

- [ ] "Your Reps" in nav lands on `/your-reps` with no redirect hop
- [ ] `/money-report` still 301-redirects (via next.config.mjs)
- [ ] Grep for `AddressLookupForm` and `MoneyReportCard` imports -- zero hits outside tests
- [ ] `npm run validate:all` passes

---

#### ~~1.8 -- `/local` page~~ [SKIPPED]

**Status:** No change. The `/local` page is an intentional roadmap signal for planned local government coverage. It stays as-is, including its nav entry.

---

#### 1.9 -- Replace misleading `lastUpdated={new Date()}` with source freshness

**Status:** Modifies existing
**Scope:** M (30-100 lines across multiple files)

**Files to modify:**

- `/Users/mbs/civ.iq/src/app/(civic)/representative/[bioguideId]/page.tsx` -- Line 253
- `/Users/mbs/civ.iq/src/app/(civic)/districts/[districtId]/page.tsx` -- Line 410
- `/Users/mbs/civ.iq/src/app/(civic)/congress/page.tsx` -- Line 314
- 12 topic pages under `/Users/mbs/civ.iq/src/app/(civic)/topics/`

**Implementation approach:**
Compute `dataFreshness` from the latest source data timestamps in each page's fetched data. If source freshness cannot be determined, remove the `lastUpdated` prop entirely rather than showing a misleading timestamp.

**Dependencies:** Easier after 1.6 but not strictly required

**Verification:**

- [ ] Representative profile "Data through" shows a past date, not today
- [ ] Reloading same page twice shows same timestamp (not new Date())
- [ ] `npm run validate:all` passes

---

### Phase 2: Phone Book Completion

_New data rendering and targeted API integrations._

---

#### 2.1 -- Render district office locations

**Status:** New rendering of existing type
**Scope:** L (100-300 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/features/representatives/services/congress.service.ts` -- Populate `contact.districtOffices` from Congress.gov Members API or `congress-legislators` YAML
- `/Users/mbs/civ.iq/src/features/representatives/components/OverviewSidebar.tsx` -- Render district offices after Washington Office section (line 204)

**Data source:** Congress.gov Members API `GET /v3/member/{bioguideId}` or `congress-legislators` YAML supplementary data

**Implementation approach:**
Verify API response shape for a known member. If district offices available, map in `congress.service.ts` to existing `contact.districtOffices` type (address, phone, fax, hours). In `OverviewSidebar.tsx`, conditionally render "District Offices" section when `representative.contact?.districtOffices?.length > 0`. Each office: bordered block with address, phone (`tel:` link), hours.

**Design system compliance:** `aicher-card`, 2px borders, `text-civiq-blue` for phone links, 8px grid spacing

**Dependencies:** None

**Verification:**

- [ ] House member profile shows district offices in sidebar
- [ ] Phone numbers are clickable `tel:` links
- [ ] Members with zero offices show no section
- [ ] `npm run validate:all` passes

---

#### 2.2 -- Add constituent services explainer

**Status:** Modifies existing
**Scope:** S (10-30 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/features/representatives/components/ContactInfoTab.tsx` -- Replace "Need Help?" section (lines 50-79) with casework guidance

**Implementation approach:**
Replace generic text with "What Your Representative's Office Can Help With" section. Content varies by `representative.chamber`: House members (VA, SSA, IRS, USCIS, passports, military academy nominations, Capitol tours), Senators (add judicial nominations). Link to `representative.currentTerm?.contactForm`.

**Plain language compliance:** This is citizen-facing guidance. Must follow PlainLanguage.gov strictly. Use "you" and "your" throughout. Active voice. Define any acronyms on first use: "USCIS (U.S. Citizenship and Immigration Services)". Sentences under 20 words. No bureaucratic language ("commence", "utilize", "in order to"). State what the office _does_, not what it "is authorized to do."

**Dependencies:** None

**Verification:**

- [ ] House member Overview tab shows House-specific casework text
- [ ] Senator Overview tab shows Senate-specific additions
- [ ] All casework text passes Flesch-Kincaid <= 8 (validate with `ReadingLevelValidator.analyze()`)
- [ ] Text uses "you/your" to address the reader directly
- [ ] No passive voice, no jargon without parenthetical definitions
- [ ] `npm run validate:all` passes

---

#### 2.3 -- Surface attendance rate in hero stats

**Status:** Modifies existing
**Scope:** M (30-100 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/features/representatives/components/HeroStatsHeader.tsx` -- Add `attendanceRate?: number` to stats interface, render as percentage replacing "Committees" stat
- `/Users/mbs/civ.iq/src/app/(civic)/representative/[bioguideId]/page.tsx` -- Compute `votesParticipated / totalRollCalls` from vote data

**Data source:** Computed from existing vote data (already fetched)

**Implementation approach:**
Compute attendance from votes: `const participated = votes.filter(v => v.position !== 'Not Voting').length`. Pass to hero. Show as percentage with sublabel "Votes participated, current Congress". Replaces "Committees" (already visible in CommitteeMembershipsCard).

**Dependencies:** None

**Verification:**

- [ ] Hero shows attendance percentage matching VotingTab's attendance box
- [ ] Members with zero votes show "N/A"
- [ ] `npm run validate:all` passes

---

#### 2.4 -- Surface legislative effectiveness metrics

**Status:** Modifies existing
**Scope:** M (30-100 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/features/representatives/components/HeroStatsHeader.tsx` -- Add `billsEnacted?: number`, show as secondary line under "Bills Sponsored"
- `/Users/mbs/civ.iq/src/app/(civic)/representative/[bioguideId]/page.tsx` -- Compute enacted count using BillsTab's existing filter logic

**Data source:** Computed from existing bill data

**Implementation approach:**
Reuse `bills.filter(b => b.status?.toLowerCase().includes('enacted')).length`. Show "X enacted" in `text-sm text-gray-500` below the main sponsored count. Show raw ratio (e.g., "143 sponsored / 3 enacted"), NOT a percentage.

**Dependencies:** None

**Verification:**

- [ ] Senior member profile shows enacted sub-line under sponsored count
- [ ] Enacted count matches BillsTab stats grid
- [ ] `npm run validate:all` passes

---

#### 2.5 -- Render caucus memberships

**Status:** New rendering of existing data
**Scope:** S (10-30 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/features/representatives/components/ContactInfoTab.tsx` -- Add "Caucus Memberships" section after CommitteeMembershipsCard

**Data source:** Already populated by `congress.service.ts:895` from `public/data/caucus-membership.json`

**Implementation approach:**
Conditional render: `representative.caucuses?.length > 0`. List items with `text-sm text-gray-700 py-grid-1 border-b border-gray-100`. No new data fetching needed.

**Dependencies:** None

**Verification:**

- [ ] House member profile shows caucus list
- [ ] Members with no caucus data show no section
- [ ] `npm run validate:all` passes

---

#### 2.6 -- Surface election results on representative profile

**Status:** Modifies existing
**Scope:** M (30-100 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/app/(civic)/representative/[bioguideId]/page.tsx` -- Import election results, pass to sidebar
- `/Users/mbs/civ.iq/src/features/representatives/components/OverviewSidebar.tsx` -- Add "Last Election (2024)" section with margin, turnout, party split

**Data source:** `src/data/election-results-house.ts` (2024 MEDSL), `src/data/election-results-statewide.ts` (Senators)

**Design system compliance:** Party colors (`#0a9338` D, `#e11d07` R) for party identification -- appropriate use

**Dependencies:** None

**Verification:**

- [ ] House member sidebar shows election results
- [ ] At-large states (AK, WY) render correctly
- [ ] `npm run validate:all` passes

---

#### 2.7 -- Expand bill listing and add pagination

**Status:** Modifies existing
**Scope:** L (100-300 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/app/(civic)/legislation/page.tsx` -- Increase limit from 50 to 250, add "Show more" pagination
- `/Users/mbs/civ.iq/src/app/api/bills/latest/route.ts` -- Add `offset` parameter for pagination

**Data source:** Congress.gov API supports pagination natively (`?limit={n}&offset={n}`)

**Implementation approach:**
API: add `offset` parameter. Page: fetch 250 initially, "Show more" button fetches next page and appends. Client-side filters continue operating on all loaded bills. No server-side text search (Congress.gov doesn't support it).

**Dependencies:** None

**Verification:**

- [ ] Initial load shows up to 250 bills
- [ ] "Show more" loads and appends next page
- [ ] Client-side filters work across full set
- [ ] `npm run validate:all` passes

---

#### 2.8 -- Add search/filter to `/committees`

**Status:** Modifies existing
**Scope:** S (10-30 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/app/(civic)/committees/page.tsx` -- Extract client component for filtering, add text input and chamber filter

**Implementation approach:**
Create `CommitteeFilter` client component. Receives full committee list as prop, filters by name and chamber. Client-side filtering of 34 committees is appropriate. Input: `border-2 border-gray-300 px-grid-2 py-grid-1 text-sm`, no rounded corners, no shadow.

**Dependencies:** None

**Verification:**

- [ ] Type "armed" -- only Armed Services committees shown
- [ ] Select "Senate" -- only Senate committees shown
- [ ] `npm run validate:all` passes

---

### Phase 3: Infrastructure Hardening

_Reliability, monitoring, and performance._

---

#### 3.1 -- Health check must validate API keys with live requests

**Status:** Modifies existing
**Scope:** M (30-100 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/app/api/health/route.ts` -- Replace `!!process.env.X` with lightweight validation requests

**Data source:** Congress.gov `GET /v3/bill/118/hr/1`, FEC `GET /v1/candidate/P00003335/`

**Implementation approach:**
Parallel `Promise.allSettled()` validation with 5s timeout. Return `{ congress: { status, latencyMs, message? }, fec: { ... } }`. Cache for 60s. Keep existence checks for Census/OpenStates (less critical).

**Dependencies:** None

**Verification:**

- [ ] `GET /api/health` returns `congress.status: "ok"` with latency
- [ ] Invalid key returns `congress.status: "error"` with 401
- [ ] `npm run validate:all` passes

---

#### 3.2 -- Wire stale response cache into circuit breaker

**Status:** Modifies existing
**Scope:** M (30-100 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/lib/circuit-breaker.ts` -- Check stale cache before throwing when OPEN
- `/Users/mbs/civ.iq/src/lib/cache/stale-response-cache.ts` -- May need type exports

**Implementation approach:**
Add optional `cacheKey` to `execute()`. When OPEN, call `getStaleResponse(cacheKey)` before throwing. On success, call `storeResponse(cacheKey, result)`. Return `X-Data-Stale: true` header when serving stale data.

**Dependencies:** None

**Verification:**

- [ ] Tripped breaker with stale data: returns stale instead of throwing
- [ ] Tripped breaker without stale data: throws as before
- [ ] `npm run validate:all` passes

---

#### 3.3 -- Add upstream rate limit handling

**Status:** New utility
**Scope:** M (30-100 lines)

**Files to create:**

- `/Users/mbs/civ.iq/src/lib/api/rate-limit-handler.ts` -- `fetchWithRetry()` with exponential backoff

**Files to modify:**

- `/Users/mbs/civ.iq/src/lib/circuit-breaker.ts` -- 429 responses don't count as failures

**Implementation approach:**
`fetchWithRetry(url, options, { maxRetries: 3, baseDelayMs: 1000 })`. Parse `Retry-After` header. Exponential backoff: 1s, 2s, 4s. Log retries. 429s excluded from circuit breaker failure count.

**Dependencies:** None

**Verification:**

- [ ] Mock 429 with Retry-After: retries and succeeds
- [ ] 429 does not increment circuit breaker failures
- [ ] `npm run validate:all` passes

---

#### ~~3.4 -- Swap district metadata~~ [RESOLVED]

API already uses `district_metadata_real.json` (444 districts). No action needed.

---

#### 3.5 -- Optimize search routes

**Status:** Modifies existing
**Scope:** L (100-300 lines)

**Files to modify:**

- `/Users/mbs/civ.iq/src/features/representatives/services/congress.service.ts` -- Add `getRepresentativesByState()` using `GET /v3/member/{stateCode}`
- District-specific API routes -- Use state-filtered endpoint instead of loading all 535
- `/Users/mbs/civ.iq/src/app/api/search/route.ts` -- Singleton in-memory cache populated once per cold start

**Dependencies:** None

**Verification:**

- [ ] District route returns correct members without loading all 535
- [ ] Search responds under 500ms after cold start
- [ ] `npm run validate:all` passes

---

#### 3.6 -- Automate vacancy detection

**Status:** New
**Scope:** M (30-100 lines)

**Files to create:**

- `/Users/mbs/civ.iq/src/app/api/cron/vacancy-check/route.ts` -- Daily cron, compare member count to 535

**Data source:** Congress.gov `GET /v3/member?currentMember=true&limit=1` (count in metadata)

**Implementation approach:**
Fetch current count, compare to 535, log warning on mismatch. Protected by `CRON_SECRET`. Does not auto-update -- detection only.

**Dependencies:** None

**Verification:**

- [ ] With correct `CRON_SECRET`: returns check result
- [ ] Without `CRON_SECRET`: returns 401
- [ ] `npm run validate:all` passes

---

#### 3.7 -- Source freshness tracking in analyzer implementations

**Status:** Implementation companion to 1.6
**Scope:** M (30-100 lines across 11 files)

Same 11 analyzer files as 1.6. Detailed per-analyzer source timestamp mappings:

- **vote-finance**: latest vote `actionDate` + latest FEC `transactionDate`
- **influence-chain**: latest lobbying `receivedDate` + latest vote `actionDate`
- **pac-vote**: latest PAC `contributionDate` + latest vote `actionDate`
- **temporal-proximity**: latest contribution `date` + latest vote `date`
- **temporal-vote**: latest vote `actionDate`
- **lobbying-pipeline**: latest filing `receivedDate`
- **finance-jurisdiction**: latest FEC `transactionDate`
- **civic-brief-assembler**: earliest `dataAsOf` from constituent insights
- **bill-intelligence**: latest bill `updateDate`
- **vote-prediction**: latest vote `actionDate`
- **stock-committee**: latest trade `transactionDate`

**Dependencies:** 1.6 (helper function must exist first)

---

### Phase 4: Deeper Legibility

_Larger integrations requiring research and new data sources._

---

#### 4.1 -- Integrate Congressional Record for floor speeches

**Status:** Complete
**Scope:** XL (300+ lines)

**Files created:**

- `src/lib/data-sources/congressional-record.service.ts`
- `src/app/api/representative/[bioguideId]/speeches/route.ts`
- `src/features/representatives/components/SpeechesTab.tsx`

**Files modified:**

- `src/types/govinfo.ts` -- CREC granule/member types
- `src/components/icons/AicherIcons.tsx` -- SpeechIcon
- `src/features/representatives/components/SimpleRepresentativeProfile.tsx` -- Tab wiring

**Data source:** GovInfo.gov API CREC collection (search + granule summary endpoints)

**Blocker resolved:** GovInfo CREC granule metadata has structured `members[]` array with `bioGuideId`, `memberName`, `party`, `state`, `chamber`. No NER required.

---

#### 4.2 -- Research earmark/CPF data (feasibility assessment only)

Check: House Appropriations CPF data format, Senate CDS data, ProPublica/Taxpayers for Common Sense datasets. Deliverable: 1-page feasibility memo.

---

#### 4.3 -- Expand election history (2014-2024)

**Data source:** MIT Election Data + Science Lab (MEDSL) -- 6 cycles. Note redistricting boundary between 2020-2022.

---

#### 4.4 -- Add "where to learn more" outbound links

Contextual outbound links after blind-spot annotations: Congressional Record, CRS Reports, GovTrack, ProPublica. 1-2 links per tab maximum.

**Dependencies:** 1.2 (annotations must exist), 2.2 (for ContactInfoTab)

---

## Summary

| Phase   | Items                  | Description                                                    | Status   |
| ------- | ---------------------- | -------------------------------------------------------------- | -------- |
| Phase 1 | 1.1-1.9                | Structural honesty: editorial, labeling, content. No new APIs. | Complete |
| Phase 2 | 2.1-2.8                | Phone book completion: new rendering + targeted integrations.  | Complete |
| Phase 3 | 3.1-3.7 (3.4 resolved) | Infrastructure: reliability, monitoring, performance.          | Complete |
| Phase 4 | 4.1-4.4                | Deeper legibility: larger integrations, research.              | Complete |

**Resolved:** 3.4 (district metadata) -- API already uses complete file.
**Resolved:** 4.1 (Congressional Record) -- GovInfo CREC granule metadata has structured `members[]` array with bioguide IDs. No NER required.

**Audit complete.** All 4 phases implemented across the `audit/phase-1`, `audit/phase-2` branches (2026-03-22).
