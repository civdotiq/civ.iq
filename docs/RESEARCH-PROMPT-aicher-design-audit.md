# Deep Research Prompt: Otl Aicher / Ulm School Design System Audit for CIV.IQ

Use this prompt with an AI research assistant (Claude, ChatGPT Deep Research, Perplexity, etc.) to get a thorough analysis of how Aicher/Ulm School principles could be better applied to CIV.IQ's civic intelligence platform.

---

## The Prompt

I need deep research on the Otl Aicher / HfG Ulm School of Design tradition and how its principles apply to a civic data web application. I'll describe the project, its current design system, what's actually built, and then I need you to identify gaps, missed opportunities, and concrete recommendations.

### About the Project

**CIV.IQ** (civdotiq.org) is a civic intelligence platform that provides nonpartisan access to real government data — congressional voting records, campaign finance, lobbying disclosures, federal spending, committee assignments, stock trades, and state legislature data. It serves 181 API endpoints backed by real government sources (Congress.gov, FEC, Census Bureau, USASpending.gov, Senate LDA, OpenStates, Federal Register, etc.).

The platform is **civic infrastructure** — think of it like Wikipedia for civic data, not a news site or investigation tool. The audience is citizens, journalists, researchers, and civic technologists who need to understand how their government works by looking at the actual data.

The design philosophy is explicitly modeled on **Otl Aicher's work** — particularly his wayfinding systems for the 1972 Munich Olympics and the Munich Airport, his pictogram systems, and the broader **HfG Ulm School of Design** tradition of systematic, functional, information-first design.

### Current Design System (What We've Built)

**Identity:**

- **Font**: Braun Linear (the typeface designed for Braun by the Ulm School lineage — Dieter Rams era). Weights 100 (display only, >=48px), 300 (secondary), 400 (body), 500 (medium), 700 (bold). Served as self-hosted WOFF2 with `font-display: swap`.
- **Grid**: 8px base unit. All spacing is multiples: 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 96, 128px. Named tokens: `grid-1` through `grid-16`, plus rhythm aliases (`rhythm-compact: 24px`, `rhythm-section: 40px`, `rhythm-break: 64px`).
- **Design language**: Structured, geometric, systematic. No decoration without function.

**Color System (5 colors + gray ramp):**
| Color | Hex | Role | Constraint |
|-------|-----|------|------------|
| Red | #e11d07 | Republican party identification ONLY | Never for errors, warnings, or system states |
| Green | #0a9338 | Democrat party identification ONLY | Never for success or system states |
| Blue | #3ea2d4 | Links, interactive elements, active states, CTAs | The primary action color |
| Amber | #d97706 | Warnings, attention, data caveats | System warning state |
| Black | #000000 | Primary text, structural borders | |
| Gray ramp | neutral grays | Non-partisan data, borders, secondary text | Primary UI chrome |

The deliberate constraint: red and green are **partisan semantic colors** — using red for errors or green for success would inject partisan meaning into UI feedback. So system states use blue (success/confirmation), amber (error/warning), and gray (info). This is a civic design decision, not an aesthetic one.

**Border System (primary spatial tool — not shadows):**
| Weight | Role | Example |
|--------|------|---------|
| 1px | Dividers, secondary separators | Table rows, list items, internal divisions |
| 2px | Structural, primary containers | Cards, inputs, buttons, section wrappers |
| 3px | Emphasis, selected states | Active tabs, focus indicators, current section |

Shadows are allowed ONLY for functional elevation (modals, dropdowns, tooltips). Borders do the heavy lifting for spatial hierarchy.

**Corners**: 0px radius for all layout containers (cards, sections, panels). 2-4px allowed on interactive elements (buttons, inputs, chips, badges) as tactile affordance.

**Typography Behavior:**

- Size-dependent letter spacing: display (-0.02em tightened), heading (0.02em), body (0.025em), labels (0.08em wide)
- Uppercase restricted to labels and short category tags (<=3 words). Headings and tab names use sentence case — Aicher knew all-caps destroys word shape recognition at reading speed.
- Minimum weight: 400 for body, 300 for captions. Weight 100 only for hero display text >=48px.
- Type scale: 12px (labels) / 14px (small body) / 16px (body) / 18px (subheadings) / 24px (section headers) / 32px (major headers) / 48px (display statistics) / 64px (hero display, names)

**Motion**: Mechanical, functional. `cubic-bezier(0.25, 0.1, 0.25, 1)` timing. 150ms default, 100ms on mobile. Respects `prefers-reduced-motion`. No decorative animation — motion only communicates state change.

**Dark Mode**: Class-based (`.dark` on `<html>`). Lighter borders, adjusted blues for contrast, `#1a1a1e` background. Inline script prevents flash. Border weights reduce by 1px tier in dark mode (structural drops from 2px to 1px).

**Banned**: Purple gradients, gradient buttons, Inter/Roboto/system fonts, decorative emojis, decorative shadows, rounded corners >4px.

### What's Actually Built (Site Architecture & Components)

**Pages (what citizens see):**

1. **Homepage**: Hero with "Know Your Representatives" headline, prominent address search bar (Radar.io autocomplete), "Use my location" geolocation, 8-card feature grid (Representatives, State Legislatures, District Maps, Voting Records, Campaign Finance, Committees, Bill Tracking, Local Government), quick-start paths for federal and state entry points, data source attribution strip.

2. **Representative Profile** (`/representative/[bioguideId]`): Server-rendered with 1-hour ISR. Breadcrumb navigation. Tabbed interface (Profile, Bills, Votes, Finance, News) using Aicher tab system (black 2px container border, active tab = blue background + blue underline). Intelligence tab with collapsible analysis cards. Sidebar with committee list and quick links. 64px display name, party-colored accent.

3. **Browse Representatives** (`/representatives`): Filterable grid (chamber, party, state). Compare mode for side-by-side analysis. Server-rendered initial data, client-side filtering.

4. **Legislation** (`/legislation`): Bill search/filter (topic, chamber, type). Floor activity feed. Bill lifecycle chart (5-step horizontal pipeline: Introduction > Committee > Floor Vote > Other Chamber > President). Witness search. Each bill card: number, title, type/chamber/topic badges, latest action.

5. **District Detail** (`/districts/[districtId]`): Two-column layout (main + 320px sidebar). Interactive district boundary map (PMTiles). Demographics (population, income, diversity), economic indicators, housing affordability, federal spending profile (contracts & grants), AI spending narrative, relevant legislation, neighboring districts, FAQ section. Print and export buttons.

6. **Districts Browse** (`/districts`): Interactive national map. Filters (search, state, competitiveness). Demographics dashboard. Responsive district card grid.

7. **Congress Hub** (`/congress`): Wikipedia-style reference page with table of contents (Overview, Senate, House, Committees, by State). Live Congress stats. 50-state delegation grid. FAQ with rich snippets.

8. **Committees** (`/committees`): Static page. Three chamber sections (House, Senate, Joint). Stats cards for counts. Expandable subcommittee lists. Jurisdiction excerpts.

9. **Industries** (`/industry/[sector]`): 10 sector pages. Wikipedia summaries. Bills, committees, and lobbying connections per sector. Sector leaderboard (ranked legislators by sector vote rate + donations).

10. **Federal Spending** (`/spending`): District-level spending search. Contracts vs grants breakdown. Top contracts/grants lists. Geographic spending comparison (state/county/district) with per-capita calculations.

11. **Money Report Card** (`/your-reps/money-report`): Address-based. Analyzes all representatives for a district. Per-rep finance-jurisdiction overlap, vote-finance correlation, independence score bars. Aggregate stats banner.

12. **Advanced Search** (`/search`): Multi-criteria filtering (voting patterns, committee membership, campaign finance, experience). Popular search presets.

13. **State Legislature** (`/state-legislature/[state]`): State legislators, bills, committees, votes via OpenStates.

14. **Comment Periods** (`/comment-periods`): Open federal regulation comment tracking.

15. **Executive Orders** (`/executive-orders`): Presidential executive orders.

16. **Investigation Graph** (`/investigate`): Network graph visualization with context-aware sidebar showing node/edge details, confidence badges, connection groups.

**Component Vocabulary:**

_Navigation & Wayfinding:_

- Fixed header (64px, 2px black bottom border) with logo, dropdown mega-menu (Federal/State/Local sections), global search, theme toggle
- Mobile: hamburger menu, accordion navigation with focus trap, 44px touch targets
- Breadcrumbs on every page >=2 levels deep (3 implementations: basic, context-preserving with sessionStorage, and universal with query params)
- Tab navigation: Aicher-styled tabs (2px black container border, blue active state, uppercase labels)

_Cards & Containers:_

- `aicher-card`: 24px padding, 2px black border, white background, blue border on hover
- `stat-card`: Same base + 48px bold stat numbers + 12px uppercase labels
- `legislation-card`, `committee-card`: Domain-specific variants with consistent 2px borders
- `aicher-metric-card`: 6px colored left accent bar
- `aicher-sidebar-card`: Highlight (blue) and warning (red) variants
- Cards have 0px border radius. No decorative shadows.

_Data Visualization:_

- WaffleChart: 10x10 grid of squares (100 cells = 1% each), pure geometric, no rounding
- StackedBar: Horizontal proportional segments with optional labels
- HemicycleChart: SVG legislature seating visualization (multi-row House, single-row Senate)
- VoteShiftTimeline: Recharts line chart (quarterly party-line rate + rolling average + shift markers)
- InfluenceClusterChart: Custom SVG scatter plot of legislators by donor similarity
- ShapFactorsBar: Diverging horizontal bar chart (Nay/Yea push factors)
- Data bar fills (green, blue, red variants) inside 1px bordered containers
- Progress bars: 8px height, blue fill, smooth transition

_Intelligence Cards (the analytical layer):_

- InsightCard: Narrative-first progressive disclosure — signal badge + title + confidence badge in header, AI narrative paragraph, compact source citation, collapsible stats grid, collapsible disclaimer/methodology. Left border colored by signal type.
- CivicBriefCard: Executive summary per representative. Key numbers grid, top findings (expandable), sector contribution bars, full analysis accordion.
- VotePredictionCard: SHAP factor visualization, deviation table, prediction divergence stats.
- InfluenceChainCard: Lobbying-to-vote chains. Vertical step diagrams with confidence dots.
- InfluenceGraphCard: Extended pipeline (lobbying > vote > regulation > enforcement > court > outcome). Collapsible methodology per chain.
- MoneyReportCard: District-level aggregate. Per-rep percentage bars for overlap/correlation/independence.
- TemporalProximityCard: Money-to-vote timing patterns with pattern rows and edge pair details.
- BillIntelligenceSection: Bill funding/lobbying analysis with vote result bar, committee badge, sector confidence badges, lobbying language similarity table.
- StockOverlapTable: Trade-committee jurisdiction flagging.
- PACVoteTable: PAC donation-to-legislator voting correlation.
- SectorLeaderboard: Interactive sector/chamber/party filtering with ranked table.

_Badges & Signals:_

- ConfidenceBadge: Binary — high (>=0.8, blue) or moderate (0.6-0.8, amber). Hidden below 0.6.
- SignalBadge: Four types — alert (amber), pattern (blue), tracking (gray), baseline (light gray). Uppercase labels.
- Party badges: Colored dots (D=green, R=red, I=gray) with letter label.
- Status badges for legislation: passed (blue bg), active (light blue), failed (amber).

_Data Transparency:_

- DataSourceAttribution: 8 pre-configured sources with reliability indicators.
- DataQualityIndicator: Four levels (high/medium/low/unavailable).
- DataTransparencyPanel: Composite of source badge, cache status, quality, freshness.
- EdgeCaseTooltip: Modal explanations for territories, DC, at-large, multi-district.
- Every insight card carries: confidence score, disclaimer (always visible), methodology (collapsible), data-as-of date.

_Loading & Empty States:_

- Skeleton loaders for data-loading states (shimmer animation, grid-aligned)
- Spinners with context text ("Analyzing your representatives...")
- Designed empty states explaining why data is unavailable

_Forms:_

- AddressAutocomplete: Radar.io powered, debounced, keyboard navigable
- GlobalSearch: Cross-entity search (reps, bills, committees, PACs) with categorized results
- RepresentativeLookupForm: Address fields with state select

_Accessibility:_

- Focus rings: 2px solid blue, 2px offset
- `prefers-reduced-motion: reduce` disables all animation
- `prefers-contrast: high` thickens borders
- Skip-to-main-content link
- ARIA attributes throughout (combobox, listbox, dialog, expanded, controls)
- 44px minimum touch targets on mobile
- 16px base font (prevents iOS zoom)

### Research Questions

Now, given all of the above context, I need you to research the following deeply. Don't just give surface-level answers — I want historical context, specific Aicher/Ulm examples, and concrete recommendations that account for the fact that this is a **data-dense civic platform** serving citizens, not a consumer product or portfolio site.

**1. Aicher's Pictogram & Icon Language**
Aicher created the iconic pictogram system for the 1972 Munich Olympics using a strict geometric grid (circles, arcs, 45-degree angles, consistent stroke weights). CIV.IQ currently uses Lucide icons (a generic open-source icon set).

- How did Aicher construct his pictograms? What was the grid, the stroke weight system, the geometric constraints?
- What would a CIV.IQ-specific pictogram set look like for civic concepts (voting, legislation, campaign finance, lobbying, committees, districts, spending, regulations)?
- Should we build a custom icon set or adapt an existing geometric icon system? What are the practical tradeoffs?
- How did Aicher handle icons at different sizes (signage vs printed materials vs small labels)?

**2. Aicher's Color Theory in Context**
Aicher was famously deliberate about color. His Munich Olympics palette, his Rotis work, his ERCO lighting identity, his Isny work — each had a distinct color strategy.

- What were Aicher's specific principles for color in information systems vs identity systems?
- CIV.IQ has an unusual constraint: red and green are reserved for partisan identification, so they can't serve as system state colors. Is there historical precedent in Aicher's work or the Ulm tradition for this kind of semantic color reservation?
- Our current palette is: blue (action), amber (warning), gray (neutral), black (structural), red/green (party only). Is this palette sufficient for a data-dense platform? Where might it break down (data visualization with many categories, heatmaps, correlation displays)?
- How did Aicher and the Ulm school approach color in data visualization specifically? Were there principles for encoding quantitative data with color?

**3. Grid Systems for Data-Dense Interfaces**
The Ulm School and Aicher used strict grids (the 8-unit grid, Otl Aicher's "visual grammar"). CIV.IQ uses an 8px base grid.

- How did Aicher apply grid systems to information-dense layouts (airport terminal directories, timetables, exhibition catalogs)?
- What was the Ulm School's approach to grid hierarchy — how do you create visual rhythm when every card, table, and chart competes for attention?
- CIV.IQ has pages with 10+ data cards, tables, charts, and narrative text all on one screen (e.g., a representative profile with 5 tabs, each containing multiple insight cards). How would Aicher organize information at this density?
- What specific grid strategies work for responsive civic data (desktop dashboard that must also work on a phone)?

**4. Typography in the Ulm/Aicher Tradition**
CIV.IQ uses Braun Linear, a typeface from the Ulm School lineage.

- What were the Ulm School's specific typographic rules (Max Bill, Tomás Maldonado, Aicher's own writing)?
- How did they handle type hierarchy in information-dense contexts — schedules, catalogs, reference materials?
- Aicher had strong opinions about uppercase. He wrote in all-lowercase in his later career. Our system restricts uppercase to short labels only. What was Aicher's reasoning and how does it apply to UI labels, navigation, and data labels?
- How should type weight and size interact in a system with 8 tiers of type (12px through 64px)? What were the Ulm guidelines for this?

**5. Wayfinding for Complex Data Navigation**
Aicher's Munich Airport signage is legendary for helping people navigate complex spaces.

- What specific principles made Aicher's wayfinding work (decision points, progressive disclosure, redundant coding, landmark orientation)?
- CIV.IQ has a deep navigation tree: Home > Federal > Representatives > [Name] > Intelligence > Influence Chain > [Specific Organization]. Users drill 4-6 levels deep into data. How would Aicher's wayfinding principles apply?
- The platform has 3 navigation paradigms: mega-menu (top nav), breadcrumbs (positional), and tab navigation (within-page). Is this the right set? How did Aicher layer navigation systems?
- What about "you are here" indicators for a web application? Aicher used color-coded zones in airports. Could CIV.IQ benefit from zone-based color coding (e.g., federal = one accent, state = another, spending = another)?

**6. The Ulm School's Approach to Data Presentation**
The Ulm School (HfG) was deeply concerned with visual communication and information design. Gui Bonsiepe, Tomás Maldonado, and others wrote extensively about it.

- What were the Ulm School's principles for presenting quantitative data to non-expert audiences?
- How did they approach the tension between completeness (showing all the data) and clarity (making the story obvious)?
- CIV.IQ uses progressive disclosure (narrative summary first, expandable stats, collapsible methodology). Is this consistent with Ulm principles or does it violate the "everything visible" ethos?
- The intelligence cards use a "narrative-first" pattern — an AI-generated plain-language paragraph before showing numbers. Would the Ulm School approve of narrative framing of data, or would they consider it editorializing?

**7. Print and Physical Artifact Design**
Aicher was a master of print. CIV.IQ has a print stylesheet and "Civic Pack" export feature.

- What were Aicher's principles for translating screen/signage information to printed documents?
- How should civic data look in print? (Representatives profiles, district reports, voting records)
- CIV.IQ's print stylesheet switches to serif (Georgia) for print readability. Would Aicher have kept the sans-serif identity in print?
- What paper/layout traditions from the Ulm School would apply to civic data printouts?

**8. Dark Mode in the Aicher Tradition**
The Aicher tradition is primarily associated with light backgrounds (white/light gray), strong black borders, and restrained color. CIV.IQ has a dark mode.

- Is there precedent in the Aicher/Ulm tradition for inverted (dark) presentation?
- Our dark mode reduces border weights by 1 tier (2px structural drops to 1px). Is this the right adaptation, or should borders maintain their weight and just lighten in color?
- How should the 5-color palette adapt for dark backgrounds while maintaining the partisan color semantics?

**9. The Kruger Accents — Compatible or Contradictory?**
The CSS includes some "Kruger-inspired accents" — bold inline highlight blocks (colored background, italic uppercase), skewed accent banners (-2 degree rotation), and ultra-tight display tracking (-0.04em). These reference Barbara Kruger's bold graphic design tradition.

- Is there a coherent way to blend Kruger's confrontational graphic style with Aicher's systematic restraint?
- Where (if anywhere) do Kruger-style accents belong in a civic data platform?
- Should these be removed, confined to specific contexts (e.g., homepage hero, campaign finance alerts), or evolved into something that bridges both traditions?

**10. Peer Analysis**
What existing civic, government, or data platforms come closest to Aicher/Ulm principles?

- Examples: UK Government Design System (GOV.UK), Swiss Federal design, Nordic government platforms, data journalism sites (ProPublica, The Markup, FiveThirtyEight), museum information systems, transit authority design systems.
- What do they do well that CIV.IQ could learn from?
- What do they get wrong from an Aicher perspective?
- Are there non-government examples of Ulm School-inspired digital design systems that handle high data density well?

**11. Accessibility as a Design Principle (Not a Checklist)**
The Ulm School was fundamentally about democratic access to information — design as a social responsibility.

- How does this philosophy translate to web accessibility beyond WCAG compliance?
- CIV.IQ serves citizens with varying literacy levels looking at complex financial and legislative data. How would the Ulm School approach plain-language presentation of complex civic data?
- Our Flesch-Kincaid target is grade 8 for all AI-generated text. Is this the right target? What was the Ulm School's stance on reading level in public-facing information?

**12. What Would Aicher Change?**
Given everything described above — the font, grid, color system, border hierarchy, component vocabulary, page architecture, data density, civic mission — if Otl Aicher were reviewing this design system today:

- What would he keep?
- What would he remove or simplify?
- What would he add that we're missing entirely?
- Where are we being too rigid in applying his principles? (Remember: "Aicher was systematic, not dogmatic — where a rule hurts usability, the rule is wrong.")
- Where are we not rigid enough?

### What I Want Back

For each research area, provide:

1. **Historical context** — what Aicher/Ulm actually said and did (with specific project references)
2. **Gap analysis** — where CIV.IQ's current implementation diverges from or falls short of these principles
3. **Concrete recommendations** — specific, implementable changes (not vague "consider improving typography")
4. **Priority** — which changes would have the highest impact on citizen usability
5. **Tradeoffs** — what we'd lose or risk with each recommendation

Be honest. If something we're doing is already strong, say so. If something is misguided, say that too. This is infrastructure for democracy — it needs to be right, not merely on-brand.
