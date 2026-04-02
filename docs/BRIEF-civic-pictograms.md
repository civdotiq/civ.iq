# Design Brief: CIV.IQ Civic Pictogram System

## Commission Overview

CIV.IQ is commissioning the first pictogram set to apply Otl Aicher's 1972 Munich Olympics geometric construction method to civic and democratic concepts. No such set exists. This is original work that extends a 50-year design tradition into an entirely new domain.

The deliverable is **15 pictograms** representing civic processes, institutions, and data concepts — plus the **construction grid and system documentation** needed to extend the set in the future.

These pictograms will be released under a **Creative Commons Attribution 4.0 (CC BY 4.0)** license as a public design resource. The designer will be credited as originator.

---

## The Client

**CIV.IQ** (civdotiq.org) is a nonpartisan civic intelligence platform that provides public access to real U.S. government data — congressional voting records, campaign finance, lobbying disclosures, federal spending, committee assignments, stock trades, and state legislature data. It serves 181 API endpoints backed by real government sources (Congress.gov, FEC, Census Bureau, USASpending.gov, Senate Lobbying Disclosure Act filings, OpenStates, Federal Register).

The platform is civic infrastructure — designed to function like Wikipedia for civic data, not a news site, investigation tool, or partisan advocacy platform. The audience is citizens, journalists, researchers, and civic technologists.

The design system is explicitly modeled on the HfG Ulm / Otl Aicher tradition. The existing implementation uses:

- **Braun Linear** typeface (Ulm School lineage, Dieter Rams era)
- **8px base grid** (all spacing in multiples: 8, 16, 24, 32, 40, 48px...)
- **2px structural borders** as the primary spatial tool (not shadows)
- **0px border radius** on all layout containers
- **0°/45°/90° geometric language** throughout
- **Monochrome primary palette**: black structural borders, gray chrome, blue (#3ea2d4) for interactive elements

The pictograms must feel as though they were drawn with the same compass and straightedge as the rest of the interface.

---

## Construction Specifications

The pictograms must follow the Aicher constructive method. These are not stylistic preferences — they are structural requirements derived from Aicher's documented system.

### Grid

- **Orthogonal + diagonal square grid.** Squares are the base module, subdivided by horizontal, vertical, and 45-degree diagonal lines.
- **Grid module size**: The pictograms will be rendered at two optical sizes in the interface — **16px** (data tables, inline labels) and **24px** (navigation, section headers, card headers). The construction grid must produce clean results at both sizes.
- **Center alignment**: All forms centered within the bounding grid.

### Geometry

- **Permitted angles**: 0°, 45°, 90° (and supplements: 135°, 180°). When these three do not suffice for a specific form, **15° increments** are permitted for harmony — but this should be the exception, not the default.
- **Curves**: Circles and arcs are geometric (compass-drawn from grid intersections). No freeform or organic curves. No bezier approximations of curves — true circular arcs only.
- **Perspective**: None. All forms are flat orthographic projection. No 3/4 views, no isometric, no dimensional rendering.

### Stroke

- **Uniform stroke weight** throughout all pictograms in the system. No element visually heavier than another.
- **Target stroke weight**: 2px at 24px render size (matching the platform's structural border weight). 1.5px at 16px render size (optically corrected for the smaller tier).
- **Stroke caps**: Butt / square. Never rounded.
- **Stroke joins**: Miter / square. Never rounded.
- **No fills**: Pictograms are pure stroke geometry. Exception: if a pictogram requires a solid region to differentiate a primary element from a secondary element (following Aicher's convention of solid human figures vs. outlined equipment), this must be consistent across the full set.

### Reduction

- **Maximum 3–5 components per pictogram.** Communicate the concept with the minimum essential geometric elements.
- **No facial features, no emotion, no narrative.** These are structural symbols, not illustrations.
- **No text, letters, or numerals** within the pictograms. The symbols must be language-independent.
- **No culturally specific references** (e.g., no U.S. Capitol dome, no specific flag). The concepts should be abstractly universal — "legislature" not "Congress," "constituency boundary" not "congressional district."

### Systematic Coherence

- All 15 pictograms must share the same grid, stroke weight, cap/join style, and visual density.
- A pictogram for "legislation" and a pictogram for "regulation" placed side by side must look like they belong to the same family while remaining instantly distinguishable.
- The system must be extensible: a future designer should be able to add a 16th pictogram using only the grid template and construction rules, without needing to consult the original designer.

---

## The 15 Civic Concepts

Each pictogram represents a civic process, institution, or data concept. Below is the concept, what it must communicate, and what it must NOT be confused with.

### 1. Legislation / Bill

**Must communicate**: A formal proposal that moves through a structured lifecycle (introduction, committee, floor vote, other chamber, executive signature). It is a living document with stages, not a static file.

**Must not be confused with**: A generic document, a regulation, or an executive order. These are three different civic instruments and need three different pictograms.

**Conceptual essence**: A document in motion through a process.

### 2. Voting / Roll Call Vote

**Must communicate**: A structured collective decision — individual members recording their position (yea/nay/present) on a specific question. This is a formal, recorded act, not an election or a poll.

**Must not be confused with**: An election (citizens choosing representatives), a committee hearing, or general approval/rejection.

**Conceptual essence**: Multiple positions being formally registered on a single question.

### 3. Campaign Contribution

**Must communicate**: Money flowing from a private source (individual, organization) toward a political candidate or committee. The directionality matters — this is money entering the political system.

**Must not be confused with**: Federal spending (money flowing outward from government), lobbying expenditure (money spent on influence activities), or a PAC (a pooling vehicle).

**Conceptual essence**: A directed monetary transfer into the political sphere.

### 4. Lobbying

**Must communicate**: An organization directing structured influence toward government decision-makers. Lobbying is a formal, registered activity — not informal persuasion or protest.

**Must not be confused with**: Campaign contribution (direct money transfer), testimony (public statement at a hearing), or advocacy (public-facing communication).

**Conceptual essence**: An intermediary entity channeling influence toward a decision point.

### 5. Federal Spending / Appropriation

**Must communicate**: Money flowing outward from government to recipients (contractors, grantees, states, individuals). The directionality is the opposite of campaign contribution — this is public money being distributed.

**Must not be confused with**: Campaign contribution (money flowing inward), taxation (money flowing to government from citizens), or a budget (a plan, not an expenditure).

**Conceptual essence**: Public funds being directed outward to specific recipients.

### 6. Committee / Deliberative Body

**Must communicate**: A formally constituted subgroup of a legislature with defined jurisdiction and authority to examine, amend, and report on specific matters. This is a structured body, not a casual meeting.

**Must not be confused with**: A full legislative chamber, a hearing (a specific event a committee holds), or a caucus (an informal grouping).

**Conceptual essence**: A structured subset of a larger body with delegated authority over a defined domain.

### 7. District / Constituency

**Must communicate**: A bounded geographic area that elects a single representative. The concept combines territory (a place on a map) with representation (a person accountable to that place).

**Must not be confused with**: A state (a sovereign entity), a ZIP code (a postal designation), a precinct (a voting administration unit), or a county (a local government unit).

**Conceptual essence**: A bounded territory linked to a specific representative.

### 8. Executive Order

**Must communicate**: A directive issued by a single executive authority (president, governor) that carries the force of law without legislative approval. It is unilateral — one person, binding effect.

**Must not be confused with**: Legislation (requires legislative process), regulation (requires agency rulemaking process), or a proclamation (symbolic, no binding effect).

**Conceptual essence**: A single authoritative directive with immediate binding force.

### 9. Hearing / Testimony

**Must communicate**: A formal proceeding where witnesses present information or evidence before a committee or panel. The essential relationship is: a person speaking to a structured body that is listening and evaluating.

**Must not be confused with**: A floor debate (among legislators), a press conference (to the public), or an interview (between two parties).

**Conceptual essence**: A witness before an evaluating panel.

### 10. Regulation / Rulemaking

**Must communicate**: A rule with the force of law created by an executive agency (not the legislature) through a structured process (proposed rule, comment period, final rule). A regulation is an instrument of the executive branch, not the legislative branch.

**Must not be confused with**: Legislation (created by the legislature), an executive order (issued directly by the executive, no rulemaking process), or a guideline (advisory, not binding).

**Conceptual essence**: A rule derived from agency authority through a structured administrative process.

### 11. PAC / Political Action Committee

**Must communicate**: A vehicle that pools political contributions from multiple sources and directs them toward candidates or causes. The key concept is aggregation — many inputs consolidated into directed political spending.

**Must not be confused with**: An individual campaign contribution (one-to-one), a lobbying organization (influences policy, not elections), or a political party (a permanent institution, not a fundraising vehicle).

**Conceptual essence**: A pooling mechanism that aggregates and redirects political money.

### 12. Public Comment Period

**Must communicate**: A defined window during which citizens can submit input on a proposed government action (typically a regulation). The essential concepts are: open public participation, a time-bounded window, and input directed toward a specific proposal.

**Must not be confused with**: Voting (a binding decision), testimony (invited and structured), or petition (citizen-initiated, not government-initiated).

**Conceptual essence**: A time-bounded opening for citizen input on a government proposal.

### 13. Party Alignment / Independence

**Must communicate**: The degree to which a legislator's behavior aligns with or diverges from their political party's collective position. This is a spectrum — not a binary "loyal" or "rebel."

**Must not be confused with**: A political party itself (an institution), an ideology (a belief system), or a caucus (an organized subgroup).

**Conceptual essence**: An individual's position relative to a group's central tendency.

### 14. Influence Chain / Money-to-Policy Pipeline

**Must communicate**: A multi-step pathway where money, lobbying activity, legislative votes, and policy outcomes are linked in sequence. The key concept is a connected chain of distinct civic actions — contribution leads to lobbying, which relates to a vote, which produces a regulation or outcome.

**Must not be confused with**: A single lobbying action, a single contribution, or a causal claim (the chain shows correlation and proximity, not proven causation).

**Conceptual essence**: A sequential chain of linked civic actions.

### 15. Data Source / Provenance

**Must communicate**: The origin and reliability of information — where data comes from and how trustworthy it is. In a civic context, this means: this information was retrieved from an official government source and can be verified.

**Must not be confused with**: A database (a storage system), an API (a technical interface), or transparency (a broader concept about openness).

**Conceptual essence**: Verified origin of information from an authoritative source.

---

## Integration Requirements

### Render Sizes

The pictograms will be used at two primary sizes in the interface:

| Size          | Stroke Weight | Context                                                            |
| ------------- | ------------- | ------------------------------------------------------------------ |
| **24 x 24px** | 2px           | Navigation headers, card headers, section labels, standalone icons |
| **16 x 16px** | 1.5px         | Inline data table labels, badge prefixes, compact UI elements      |

The designer should produce **two optically tuned versions** of each pictogram — not simply scaled copies. At 16px, some details may need simplification to maintain clarity (following Aicher's own practice of adapting pictograms across signage scales).

### File Format

- **SVG** with clean, minimal markup (no embedded styles, no transforms where avoidable, no raster elements)
- Stroke-based (not outlined/filled paths) so stroke weight can be adjusted if needed
- ViewBox normalized to a consistent coordinate system across all 15 pictograms
- Optimized for inline SVG embedding in a React/Next.js application

### Color

The pictograms are delivered in **monochrome black (#000000) on transparent**. Color is applied by the platform's CSS — the pictograms themselves carry no color information. They must work equally well in:

- Black on white (light mode)
- Light gray (#e5e5e5) on dark (#1a1a1e) (dark mode)
- Blue (#3ea2d4) for interactive/active states
- Amber (#d97706) for warning contexts

### Spacing

When used inline with text, the pictograms should optically align with Braun Linear at 14–16px body text size. The 24px pictogram should sit comfortably beside 14px uppercase labels with 0.08em tracking.

---

## Reference Materials

### Construction method (how to build)

- **ERCO / Otl Aicher pictogram system** at piktogramm.de — the canonical implementation. Study the geometric grammar, not the specific pictograms (those are copyrighted and not to be replicated).
- **Carlos Rosa, "Grids, circles, squares and lines!"** (CIDAG 2010, free on ResearchGate) — the best published deconstruction of Aicher's method, including the Generating Grid / Regulation Grid distinction.
- **FH Potsdam P5.js Pictogram Editor** (interface.fh-potsdam.de/gestalten-in-code/projects/otl-aicher/) — MIT-licensed digital construction tool. Useful for understanding the body-part modularity and grid constraints.
- **"Otl Aicher: Design. Type. Thinking."** (Nerdinger & Vossenkuhl, Prestel, 2022) — definitive single-volume reference with 370 illustrations including archival construction sheets.
- **1972 Munich Olympics Design Manual** (reprinted) — the primary source document.
- **IBM Design Language Pictograms** (ibm.com/design/language) — not Aicher-specific, but the best-documented modern geometric pictogram system. Study their contribution process and documentation methodology as a model.

### Civic concepts (what to depict)

- **AIGA/DOT Symbol Signs** (public domain, 50 symbols) — the closest freely available geometric pictogram tradition. Study how abstract civic concepts like "information" and "customs" are reduced to geometric forms. Note: these use rounded caps and naturalistic angles — do not replicate their construction, only their approach to conceptual reduction.
- **Noun Project Iconathon Democracy Collection** (CC0, crowdsourced) — useful for surveying how other designers have attempted civic concepts. Multiple styles, inconsistent construction — use only as a catalog of conceptual approaches, not as a geometric reference.
- **CIV.IQ's live platform** at civdotiq.org — browse the interface to see where each pictogram will be used in context. Note the density of the data environment and the small sizes at which these pictograms must remain legible.

---

## Deliverables

| Deliverable                     | Description                                                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **15 pictograms** (24px tier)   | SVG files, stroke-based, monochrome, optimized for inline embedding                                                                                                                                      |
| **15 pictograms** (16px tier)   | Optically adjusted versions for small-size use                                                                                                                                                           |
| **Construction grid template**  | The modular grid system used to build the pictograms, delivered as SVG and Figma/Illustrator file, documented so a future designer can construct new pictograms without consulting the original designer |
| **Construction rules document** | Written specification: permitted angles, stroke weight, cap/join rules, grid module relationships, reduction principles, solid-vs-outline conventions if applicable                                      |
| **Concept mapping sheet**       | For each pictogram: the concept, the geometric reduction rationale (why these specific forms represent this concept), and visual differentiation notes (how it stays distinct from its nearest sibling)  |
| **Usage guidelines**            | Minimum size, clear space, alignment with text, color application rules, contexts where each pictogram is appropriate                                                                                    |

---

## Licensing

All deliverables will be released under **Creative Commons Attribution 4.0 International (CC BY 4.0)**. The designer retains attribution credit. CIV.IQ retains the right to use, modify, and distribute the pictograms and grid system without restriction.

This choice is deliberate. No civic pictogram set in the Aicher tradition exists anywhere. By open-sourcing this work, it becomes a public resource — consistent with CIV.IQ's mission as civic infrastructure.

---

## Budget Range

**$5,000 – $15,000 USD** for the complete deliverable set, depending on the designer's rate and revision process.

This range reflects:

- 15 pictograms at two optical sizes (30 SVG files)
- Construction grid development and documentation
- 2–3 rounds of revision
- The specialized geometric skill required (this is not standard icon design)

We are open to discussing scope adjustments. If 15 pictograms at this budget is infeasible, we would prioritize a smaller initial set (8–10) with the grid system and documentation, then commission the remainder in a second phase.

---

## Evaluation Criteria

Submissions will be evaluated on:

1. **Geometric discipline**: Do the pictograms strictly follow the Aicher constructive rules? Rounded caps, organic curves, or freeform angles are disqualifying.
2. **Conceptual clarity**: Can each pictogram be correctly identified by someone unfamiliar with the system? The concepts are abstract — the geometric reduction must be unambiguous.
3. **Mutual distinction**: Can all 15 pictograms be distinguished from each other at 16px? Siblings like "legislation" and "regulation" must be visually separable at a glance.
4. **Systematic coherence**: Do all 15 pictograms feel like they belong to the same family? Visual weight, density, and complexity should be consistent.
5. **Integration**: Do the pictograms look native alongside Braun Linear typography, 2px borders, and 0px-radius cards? Test against the live platform at civdotiq.org.
6. **Extensibility**: Is the grid system and documentation clear enough that a different designer could produce a 16th pictogram that is indistinguishable in quality and style?

---

## Timeline

We are flexible on timeline. Quality and geometric rigor are more important than speed. A realistic expectation:

- **Week 1–2**: Grid system development + 3 initial pictogram drafts for review
- **Week 3–4**: First round of all 15 pictograms
- **Week 5–6**: Revisions and optical size adjustments
- **Week 7–8**: Final deliverables, documentation, and integration testing

---

## Contact

For questions about the platform, design system, or civic concept definitions:

**Mark Sandford**
Founder, CIV.IQ
civdotiq.org

---

_This brief was prepared in April 2026. CIV.IQ is an independent civic technology project. The pictogram commission is funded independently and is not affiliated with any government agency, political party, or advocacy organization._
