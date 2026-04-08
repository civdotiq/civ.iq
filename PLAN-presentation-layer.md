# PLAN: Presentation Layer — Distribution, Framing, Questions, Sustainability

**Created:** 2026-04-07
**Status:** Phase 1 complete
**Scope:** 6 phases, each ending with a commit. Phases are independent — start a new conversation for each.

**Context:** Three rounds of research (see `docs/RESEARCH-PROMPT-civic-intelligence-presentation.md`) identified four gaps in CIV.IQ's otherwise complete backend: distribution/SEO, campaign finance framing, question-driven entry, and data pipeline sustainability. This plan is the implementation roadmap.

**Key finding from codebase audit:** JSON-LD structured data (21 schema types) and per-analyzer disclaimers already exist. The research assumed these were gaps — they're not. The work is refinement and coverage, not greenfield.

---

## Phase 1: SEO Coverage Audit & Gaps ~~(1-3 days)~~ COMPLETE

**Completed:** 2026-04-07
**Commits:** `c1a7a60c` (schema coverage), `85f21649` (citable facts block)

### What was done

1. **Audited all 61 civic page routes + homepage.** Results:
   - All priority entity pages (representative, committee, bill, vote, district, delegation, lobby, influence/PAC) already had full coverage: `generateMetadata`, JSON-LD, `BreadcrumbSchema`, OpenGraph
   - 15 modified files: added `generateMetadata` + OG to 6 entity layouts, OG to 5 existing metadata exports, metadata to 2 server component pages
   - 11 new `layout.tsx` files created for client component pages that had no metadata at all (enforcement, spending, regulations, districts index, state-districts, local, elections/federal, elections/state, transparency, state-bills/[state], regulations/[documentNumber])
   - New JSON-LD schemas: `AdministrativeAreaSchema` on state pages, `GovernmentOrganizationSchema` on state legislature layout, `ProfilePageSchema` + `BreadcrumbSchema` on state legislator pages

2. **VoteAction schema evaluated — not added.** Schema.org `VoteAction` is for user-facing polls (choosing from options), not legislative roll calls. `LegislativeEventSchema` on vote pages is the correct semantic fit.

3. **AI citation readiness verified and improved:**
   - Key political facts (party, state, district) already server-rendered in hero section
   - **Fixed:** `data-speakable` attributes were declared in SpeakableSchema but missing from DOM on both representative and bill pages
   - **Added:** Server-rendered `CitableFacts` component on representative pages — fetches summary data (total raised, bills sponsored) in parallel via `Promise.all`, renders as semantic `<dl>` with `data-speakable="rep-facts"`. Crawlers and AI systems get party, state, committees, finance, and contact info without executing JavaScript.
   - **Known limitation:** Detailed finance data (top donors, individual contributions) and vote alignment stats are still client-side fetched — would require architectural refactor to move server-side

4. **llms.txt verified** — exists at `public/llms.txt`, comprehensive, referenced from root layout via `<link rel="llms-txt">`

5. **next-seo library evaluated — not adopted.** Provides generic JSON-LD components (Article, Product, Recipe) but nothing for civic/government schemas. CIV.IQ's custom `JsonLd.tsx` with 21 domain-specific schema types is superior for this use case.

### What was NOT done (deferred or skipped)

- `state-districts/[state]/[chamber]/[district]` detail page OG + schemas (low traffic)
- Keyword optimization of meta descriptions (premature without Search Console data)

---

## Phase 2: Methodology Page & Disclaimer Upgrade ~~(1-2 days)~~ COMPLETE

**Completed:** 2026-04-07
**Commits:** `2509cb9d` (initial page + disclaimer link + audit), `d017588e` (fix citation, complete sources, simplify), `fa996cfd` (fix URLs, remove jargon, verify FK), `e7ad7050` (collapse table into grouped sections)

### What exists

- `InsightDisclaimer` component (`src/components/intelligence/InsightDisclaimer.tsx`) — renders disclaimer + expandable methodology on every insight card
- 15 analyzers each with their own `DISCLAIMER` constant — all say "correlation does not indicate causation" in various phrasings
- Disclaimers are contextual per analyzer (finance vs. lobbying vs. enforcement vs. stock trades)

### What to do

1. **Create `/methodology` page** at `src/app/(civic)/methodology/page.tsx`. Content:

   **Section 1 — How CIV.IQ presents campaign finance data**
   - State the academic consensus: party affiliation and ideology predict votes far more strongly than contributions (cite Ansolabehere, de Figueiredo, and Snyder 2003)
   - Explain that research shows contributions are most reliably associated with _access to policymakers_ (cite Kalla and Broockman 2016 — donors get 3-4x more meetings) and _committee engagement_ (cite Hall and Wayman 1990), not specific roll call votes
   - Explain strategic giving: donors give to legislators who already agree with them, creating spurious correlation
   - State clearly: "CIV.IQ presents donations alongside votes for transparency. We do not claim that donations caused votes."

   **Section 2 — Five pathways of campaign finance activity (ranked by evidence)**
   1. Access (strongest) — Kalla & Broockman 2016
   2. Committee gatekeeping (strong) — Hall & Wayman 1990, Hojnacki & Kimball 2001
   3. Agenda-setting (moderate) — Furnas et al. 2023, McKay 2018
   4. Strategic giving (the confound) — the endogeneity problem
   5. Direct vote-buying (weakest) — mostly unsupported outside specific industries

   **Section 3 — Data sources and methodology**
   - List all data sources with links to originating agencies
   - Explain the statistics-first, AI-second pipeline
   - Explain confidence scores, minimum sample sizes, z-score thresholds
   - Explain entity resolution (how CIV.IQ links data across sources)

   **Section 4 — What CIV.IQ does NOT claim**
   - Does not claim donations caused votes
   - Does not claim lobbying is improper (it's protected by the First Amendment)
   - Does not editorialize — uses "received," "associated with," "correlated with"
   - Does not cherry-pick timeframes or comparisons

2. **Upgrade analyzer disclaimers** to link to the methodology page. In each analyzer's DISCLAIMER constant, append: `'For full methodology, see civdotiq.org/methodology.'` — or better, have the `InsightDisclaimer` component render a link to `/methodology` below the expandable section.

3. **Audit language across analyzers for the word "influence."** The research recommends replacing "influence" in user-facing text with "access," "engagement," or "activity." This phase only audits and flags — the actual rename is deferred. Create a list of every user-facing occurrence of "influence" (component labels, page titles, card headings) vs. internal-only occurrences (file names, function names, Redis keys).

### Files to touch

- `src/app/(civic)/methodology/page.tsx` — NEW
- `src/app/(civic)/methodology/layout.tsx` — NEW (metadata, breadcrumbs)
- `src/components/intelligence/InsightDisclaimer.tsx` — add methodology page link
- `src/components/seo/JsonLd.tsx` — may add `AboutPage` schema for methodology page

### Validation

```bash
npm run validate:all
# Manual: verify methodology page renders, links work, reading level is accessible
# Manual: verify InsightDisclaimer now links to /methodology
```

### Commit message pattern

`feat(trust): add methodology page with academic citations and disclaimer upgrade`

---

## Phase 3: Data Source Monitoring (1 day)

### What exists

- `scripts/diagnose-apis.ts` — CLI script that tests API connectivity for all sources
- No runtime health check endpoint
- No external monitoring
- All 23 services have individual rate limiters and cache TTLs
- Upstash Redis as primary cache with in-memory fallback

### What to do

1. **Create `/api/health` endpoint** that probes critical data sources and returns structured status. Model after the existing `diagnose-apis.ts` script but as an API route. Include:
   - Status per source: `ok`, `degraded` (responding but slow), `down`, `stale` (cached data older than expected TTL)
   - Last successful fetch timestamp per source (from Redis cache metadata)
   - Overall health: `healthy`, `degraded`, `critical`
   - Response time per probe
   - Only probe critical sources (Congress.gov, FEC) on every call; probe others on a rotating schedule to avoid rate limit consumption

2. **Deploy changedetection.io** (self-hosted via Docker, or use the free hosted tier at changedetection.io). Monitor these endpoints:

   **Critical (check every 6 hours):**
   | Source | URL to monitor | Notes |
   |--------|---------------|-------|
   | Congress.gov API | `https://api.congress.gov` | Requires API key in query param |
   | FEC API | `https://api.open.fec.gov/v1` | Public status page |
   | Senate LDA | `https://lda.senate.gov/api/v1` | No auth required |

   **Important (check daily):**
   | Source | URL to monitor |
   |--------|---------------|
   | Federal Register | `https://www.federalregister.gov/api/v1` |
   | EPA ECHO | `https://echodata.epa.gov/echo` |
   | FRED | `https://api.stlouisfed.org/fred` |
   | Census Geocoder | `https://geocoding.geo.census.gov` |
   | Regulations.gov | `https://api.regulations.gov/v4` |

   **Standard (check weekly):**
   All remaining sources: SEC EDGAR, OSHA, CFPB, CourtListener, NOAA, EIA, HUD, FDIC, FEMA, Treasury, NIH, CMS, College Scorecard, NHTSA, FBI UCR, Senate Stock Watcher, House Disclosures

3. **Add visible freshness indicators.** Each data section on representative pages should show when the data was last fetched. The `InsightDisclaimer` component already shows methodology — consider adding a `dataAsOf` display. Check if `dataAsOf` is already in the insight types (it is — `src/lib/intelligence/types.ts` line 80: `dataAsOf: string`). Ensure it's rendered visibly, not hidden.

4. **Document the monitoring setup** in a brief section in the methodology page (Phase 2) — "CIV.IQ monitors all data sources and displays freshness timestamps. When a source becomes unavailable, we show the last available data with its date."

### Files to touch

- `src/app/api/health/route.ts` — NEW
- Docker compose or deployment config for changedetection.io (document in README, don't commit Docker files)

### Validation

```bash
npm run validate:all
curl http://localhost:3000/api/health  # Verify endpoint returns structured JSON
```

### Commit message pattern

`feat(ops): add health check endpoint and data source monitoring guide`

---

## Phase 4: Question-Template Pages (1-2 weeks)

### What exists

- 26 intelligence API routes that can serve as "pod generators"
- `/your-reps` address lookup flow (address → Census Geocoder → district → representatives)
- Unified search at `/api/search/unified`
- Dynamic sitemap generator
- All data infrastructure needed to answer the questions

### What to do

This is the largest phase. The core idea: create URL-addressable question pages that route to existing API endpoints and render multi-panel ("pod") responses. Each question template generates many indexable pages (one per entity).

1. **Define the first 15 question templates** across four categories:

   **WHO (representation identity):**
   - "Who represents [address]?" → existing `/your-reps` flow
   - "Who sits on the [committee] committee?" → `/api/committee/[id]/members`

   **HOW (voting behavior):**
   - "How does [legislator] vote?" → `/api/representative/[bioguideId]/votes`
   - "How did [legislator] vote on [bill]?" → voting record + bill details
   - "How does [legislator] compare to their party?" → temporal vote analyzer

   **WHAT (legislative activity):**
   - "What bills has [legislator] sponsored?" → `/api/representative/[bioguideId]/bills`
   - "What is [committee] working on?" → committee bills + hearings
   - "What bills are about [topic]?" → `/api/bills?policyArea=[topic]`

   **WHERE (money and access):**
   - "Where do [legislator]'s campaign contributions come from?" → vote-finance analyzer
   - "Where does [industry] money go in Congress?" → sector leaderboard
   - "Who lobbies on [topic]?" → lobbying pipeline analyzer

   **WHY (comparison and accountability):**
   - "Is [legislator] more partisan than average?" → temporal vote analyzer + peer comparison
   - "Does [legislator]'s voting align with their donors?" → vote-finance analyzer
   - "How does [legislator] compare to [legislator]?" → side-by-side comparison

   **WHEN/ACTION:**
   - "How do I contact [legislator]?" → representative profile contact info

2. **Create the routing infrastructure:**
   - Route pattern: `/ask/[questionSlug]` — e.g., `/ask/campaign-contributions/[bioguideId]`
   - Each question page is a server component that:
     (a) Fetches data from relevant API routes server-side
     (b) Renders 2-4 "pods" — each a self-contained card answering one facet
     (c) Shows "Related questions" at the bottom (computed from the entity, not AI-generated)
     (d) Includes full JSON-LD structured data and dynamic metadata for SEO
   - Create a shared `QuestionLayout` component that handles the pod grid, breadcrumbs, related questions pattern
   - Add question pages to the sitemap generator (this is where the thousands of new indexable pages come from)

3. **Add question suggestions to existing pages:**
   - On representative profile pages, show 3-5 relevant questions as cards/links below the hero section
   - On the homepage, replace or augment the feature grid with the most common question templates
   - On `/your-reps` results, show personalized questions for each representative

4. **Wire up "People Also Ask" pattern:**
   - After each question answer, show 3-5 follow-up questions based on the entities involved
   - These are computed deterministically: if viewing campaign contributions for Rep. Smith, related questions are "How does Rep. Smith vote?", "Who else does [top industry] fund?", "What bills has Rep. Smith's committee advanced?"
   - Each related question links to another `/ask/` page — creating deep internal linking

### Files to touch

- `src/app/(civic)/ask/[questionSlug]/page.tsx` — NEW (dynamic route)
- `src/app/(civic)/ask/[questionSlug]/layout.tsx` — NEW (metadata)
- `src/app/(civic)/ask/` — subdirectories per question category as needed
- `src/components/questions/QuestionLayout.tsx` — NEW (shared pod layout)
- `src/components/questions/RelatedQuestions.tsx` — NEW
- `src/components/questions/QuestionSuggestions.tsx` — NEW (for embedding in existing pages)
- `src/lib/questions/question-registry.ts` — NEW (template definitions + routing table)
- `src/lib/questions/related-questions.ts` — NEW (deterministic related question computation)
- `src/app/sitemap.ts` — add question pages to sitemap
- `src/app/(civic)/representative/[bioguideId]/page.tsx` — add question suggestions
- `src/app/(civic)/your-reps/page.tsx` — add question suggestions to results
- `src/app/page.tsx` — consider adding question entry point to homepage

### Implementation approach

Start with 3 question templates that map to existing, well-tested analyzers:

1. "Where do [legislator]'s campaign contributions come from?" → vote-finance analyzer
2. "How does [legislator] vote compared to their party?" → temporal vote analyzer
3. "Who represents [address]?" → existing lookup flow repackaged as question format

Ship these 3, verify the pattern works, then expand to the full 15.

### Validation

```bash
npm run validate:all
# Manual: verify question pages render with real data for 3+ legislators
# Manual: verify question pages appear in sitemap output
# Manual: verify related questions link to valid pages
# Manual: test structured data with Google Rich Results Test
```

### Commit message pattern

`feat(questions): add question-driven entry pages with pod layout and related questions`

---

## Phase 5: Email Alert System ~~(3-4 weeks)~~ COMPLETE

**Completed:** 2026-04-08
**Commit:** `46664aa1`

### What exists

- No email infrastructure
- No user accounts or subscription management
- Atom feeds exist per entity type (`/api/feed/{type}/{id}`)
- All intelligence analyzers cache results in Redis with TTLs

### What to do

**This is the most complex phase and the only one requiring new infrastructure dependencies.**

1. **Choose email provider.** Options for a solo developer:
   - **Resend** — simplest API, generous free tier (100 emails/day, 3,000/month), built for developers, good Next.js integration
   - **Postmark** — excellent deliverability, 100 free emails/month (too low for alerts)
   - **Amazon SES** — cheapest at scale ($0.10/1,000 emails), more setup

   Recommendation: **Resend** for simplicity. Upgrade to SES only if alert volume exceeds free tier.

2. **Subscription model** (no authentication required, following TheyWorkForYou pattern):
   - User enters email + selects entities to watch (representatives, topics, committees)
   - Confirmation email with one-click verify link (double opt-in, CAN-SPAM compliant)
   - Subscriptions stored in a lightweight database (Upstash Redis or Vercel KV — you already have Upstash)
   - Unsubscribe link in every email (one-click, CAN-SPAM required)

3. **Change detection pipeline:**
   - Scheduled job (Vercel Cron or standalone) runs daily:
     (a) For each entity with subscribers, fetch current data from APIs
     (b) Compare against last-known state in Redis
     (c) If significant change detected (new vote, new FEC filing, party-line deviation change > 5%), queue an alert
   - Change types to detect:
     - New roll call vote by a watched legislator
     - New FEC filing for a watched legislator
     - New bill sponsored/cosponsored by a watched legislator
     - Party-line alignment shift > 5 percentage points

4. **Email templates:**
   - Plain text + simple HTML (no complex layouts — deliverability matters more than design)
   - Format: "Your representative [Name] voted [Yea/Nay] on [Bill Title] on [Date]. [1-sentence context from civic brief]. View details: [link to question page or profile]"
   - Footer: methodology disclaimer + unsubscribe link
   - Branded with CIV.IQ identity (Braun Linear in email is impractical — use system sans-serif)

5. **Alert subscription UI:**
   - Add "Get alerts" button to representative profile pages
   - Add "Alert me about this representative" to `/your-reps` results
   - Simple modal/inline form: email input + checkboxes for alert types (votes, finance, legislation)
   - Confirmation screen: "Check your email to confirm"

### Files to touch

- `src/app/api/alerts/subscribe/route.ts` — NEW
- `src/app/api/alerts/verify/route.ts` — NEW
- `src/app/api/alerts/unsubscribe/route.ts` — NEW
- `src/app/api/cron/alerts/route.ts` — NEW (daily change detection)
- `src/lib/alerts/subscription-store.ts` — NEW (Redis-backed)
- `src/lib/alerts/change-detector.ts` — NEW
- `src/lib/alerts/email-sender.ts` — NEW (Resend integration)
- `src/lib/alerts/email-templates.ts` — NEW
- `src/components/alerts/AlertSubscribeButton.tsx` — NEW
- `src/components/alerts/AlertSubscribeForm.tsx` — NEW
- `.env.local` — add `RESEND_API_KEY`
- `vercel.json` — add cron schedule for daily alert job

### Validation

```bash
npm run validate:all
# Manual: subscribe with test email, verify confirmation flow
# Manual: trigger a change, verify alert email arrives
# Manual: verify unsubscribe works with one click
# Manual: verify CAN-SPAM compliance (physical address, unsubscribe)
```

### Commit message pattern

`feat(alerts): add email alert system for representative activity changes`

---

## Phase 6: Data Source Triage (1 day, mostly analysis)

### What exists

- 23 data source services in `src/lib/data-sources/`
- 2 critical sources (Congress.gov, FEC) and 21 supplementary sources
- Each source has rate limiters, cache TTLs, and error handling
- The research estimates 20-80 hours/source/year for maintenance

### What to do

This phase is analysis, not code. The output is a decision document, not a feature.

1. **Classify sources by tier:**

   **Tier 1 — Core (maintain at all costs):**
   - Congress.gov API — bills, members, committees, votes (powers the entire platform)
   - FEC API — campaign finance (powers all money-related analyzers)
   - Senate LDA — lobbying filings (powers influence chain, lobbying pipeline)
   - Census Geocoder — address → district resolution (powers /your-reps)

   **Tier 2 — High-value (maintain actively):**
   - Federal Register API — regulation analysis, comment periods
   - Senate/House Stock Disclosures — stock trade analysis
   - SEC EDGAR — company entity resolution, ticker mapping
   - FRED — state economic indicators for district profiles
   - Open States — state legislature data

   **Tier 3 — District enrichment (maintain passively, degrade gracefully):**
   - EPA ECHO, OSHA, CFPB, NOAA, EIA, HUD, FDIC, FEMA, Treasury, NIH, CMS, College Scorecard, NHTSA, FBI UCR, CourtListener, Regulations.gov

   "Maintain passively" means: don't proactively fix breakages unless a user reports them or changedetection.io alerts. Show "Data unavailable since [date]" and move on. These sources enrich district profiles and topic pages but don't power the core value proposition (the cross-domain join between money, votes, and lobbying).

2. **Estimate actual usage per source.** Once analytics are in place (even simple Vercel Analytics), check:
   - Which district profile sections do users actually expand/view?
   - Which topic pages get traffic?
   - Are enforcement, regulation, and court pages visited, or are they ghost towns?

3. **Document the triage decision** in a `docs/DATA-SOURCE-TIERS.md` file listing each source, its tier, maintenance commitment, and degradation behavior.

4. **Implement graceful degradation UI** for Tier 3 sources. When a source is down:
   - Show a card with: "[Source] data last updated [date]. This data source is currently unavailable."
   - Don't break the page layout — use the empty state pattern from the design system
   - Log the degradation for monitoring

### Files to touch

- `docs/DATA-SOURCE-TIERS.md` — NEW (decision document)
- Components that render Tier 3 data — add empty state handling if missing

### Validation

```bash
# No code validation needed — this is a decision phase
# Manual: verify Tier 3 source pages degrade gracefully when data is unavailable
```

### Commit message pattern

`docs(ops): add data source tier classification and maintenance policy`

---

## Phase Order & Dependencies

```
Phase 1 (SEO audit)          ──┐
Phase 2 (Methodology page)   ──┼── Independent, can run in any order
Phase 3 (Monitoring)         ──┘
                                │
Phase 4 (Question templates) ───── Depends on Phases 1-2 for SEO/framing patterns
                                │
Phase 5 (Email alerts)       ───── Depends on Phase 4 for question page links in emails
                                │
Phase 6 (Source triage)      ───── Depends on Phase 3 for monitoring data
```

Phases 1, 2, and 3 are independent and can be done in any order or in parallel. Phase 4 benefits from having SEO patterns and the methodology page in place. Phase 5 benefits from having question pages to link to in alert emails. Phase 6 benefits from having monitoring running for a while to gather data.

---

## Starting a New Conversation

When beginning each phase, paste this context into the new conversation:

> I'm implementing Phase [N] of `PLAN-presentation-layer.md`. Read the plan file for full context. The plan was informed by three rounds of research on distribution, campaign finance framing, question-driven entry, and data sustainability. Key codebase facts:
>
> - 216 API routes, 19 analyzers, 37 intelligence UI components
> - JSON-LD already implemented (21 schema types in `src/components/seo/JsonLd.tsx`)
> - Per-analyzer disclaimers already exist (15 analyzers with DISCLAIMER constants)
> - `InsightDisclaimer` component renders disclaimer + methodology on every insight card
> - Dynamic sitemap at `src/app/sitemap.ts`
> - 26 intelligence API routes serve as "pod generators" for question pages
> - Upstash Redis for caching, no user auth system
> - Solo developer — scope conservatively

---

## Success Criteria

The plan succeeds if:

1. Every entity page has complete structured data and appears in Google Rich Results Test
2. A methodology page exists that a journalist or academic would cite
3. All 23 data sources are monitored with alerts on breakage
4. At least 10 question-template pages exist and appear in the sitemap
5. Citizens can subscribe to email alerts for their representatives without creating an account
6. A documented triage policy exists for data source maintenance
