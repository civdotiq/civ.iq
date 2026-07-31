# Data Source Tier Classification & Maintenance Policy

**Created:** 2026-04-12
**Context:** CIV.IQ consumes 28 government data sources. With estimated maintenance of 20-80 hours/source/year, maintaining all sources at the same priority is unsustainable for a solo developer. This document classifies sources into tiers to focus effort where it matters most.

**Core value proposition:** The cross-domain join between money (FEC), votes (Congress.gov), and lobbying (Senate LDA). Everything else is enrichment.

---

## Tier Definitions

| Tier  | Label      | Maintenance Commitment                                                                 | When It Breaks                                    |
| ----- | ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **1** | Core       | Fix within 24 hours. Proactive monitoring. These power the platform's reason to exist. | Platform is fundamentally broken.                 |
| **2** | High-value | Fix within 1 week. Active monitoring. These power distinct features users navigate to. | A major feature section is degraded.              |
| **3** | Enrichment | Fix when reported. Passive monitoring. Show "Data unavailable" and move on.            | A card or section is empty; the page still works. |

---

## Tier 1 -- Core (4 sources)

These power the money-votes-lobbying join. If any of these goes down, CIV.IQ's core intelligence is broken.

### Congress.gov API

| Property           | Value                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL           | `https://api.congress.gov/v3`                                                                                                                                                                      |
| API key            | `CONGRESS_API_KEY` (required)                                                                                                                                                                      |
| Cache TTL          | 30 min (bills), 1 hr (summary)                                                                                                                                                                     |
| Consumers          | 10+ files: bills route, civic-brief assembler, influence-chain analyzer, lobbying-pipeline analyzer, bill-intelligence analyzer, question template fetchers, change detector, batch service, feeds |
| Cross-domain joins | Congress + FEC (bills vs. donor sectors), Congress + Senate LDA (lobbying issue codes to policy areas), all three in influence-chain analyzer                                                      |
| Error handling     | Returns empty `{ bills: [] }` on failure -- consumers never crash                                                                                                                                  |

**Why Tier 1:** Powers bills, members, committees, votes. Every representative profile page, every analyzer, every intelligence insight depends on this. Without it, there is no platform.

### FEC API

| Property           | Value                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base URL           | `https://api.open.fec.gov/v1`                                                                                                                          |
| API key            | `FEC_API_KEY` (required)                                                                                                                               |
| Cache TTL          | 5 min (search) to 30 days (committee info)                                                                                                             |
| Consumers          | 55+ files: 13 API routes, 7 analyzers, finance aggregator, graph hydrators, MCP tools, trading cards                                                   |
| Cross-domain joins | FEC + Congress (contribution sectors vs. bill policy areas), FEC + Senate LDA (org name fuzzy match to PAC contributions), FEC + votes (PAC alignment) |
| Error handling     | Mixed -- some methods return `[]`/`null`, some re-throw. EnhancedFEC retries 3x then re-throws. Callers in analyzer layer use `.catch(() => null)`.    |

**Why Tier 1:** Largest footprint of any source. Powers all campaign finance data, every money-related analyzer, the influence chain, sector leaderboard, and address money report. The "money" in money-votes-lobbying.

### Senate LDA (Lobbying Disclosures)

| Property           | Value                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Base URL           | `https://lda.gov/api/v1`                                                                                                         |
| API key            | None (public)                                                                                                                    |
| Cache TTL          | 7 days (quarterly filings), 24 hr (org search), 30 min (assembled route)                                                         |
| Consumers          | 20 files: lobbying route, lobby org route, 4 analyzers, graph hydrators, MCP tools, dataset generators                           |
| Cross-domain joins | LDA + Congress (issue codes to policy areas to bills), LDA + FEC (org names to PAC contributions), LDA + committee membership    |
| Error handling     | `fetchFilingsByQuarter` and `getCommitteeLobbyingData` re-throw (callers must catch); `fetchFilingsForOrganization` returns `[]` |

**Why Tier 1:** Powers all lobbying data. The "lobbying" in money-votes-lobbying. Without it, influence chains, lobbying pipelines, and bill intelligence are all broken.

### Census Geocoder

| Property           | Value                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base URL           | `https://geocoding.geo.census.gov/geocoder/geographies/address`                                                                                  |
| API key            | None (public)                                                                                                                                    |
| Cache TTL          | 7 days (govCache), 30 days (ISR)                                                                                                                 |
| Consumers          | 10 files: unified-geocode route, address/representatives route, money-report route, search route, address-to-legislators service, results page   |
| Cross-domain joins | Census -> Congress.gov (district to representative), Census -> OpenStates (district to state legislator), Census -> FEC + LDA (via money report) |
| Error handling     | Throws typed `CensusGeocoderException` -- by design, callers must handle (bad address = user error, not silent failure)                          |

**Why Tier 1:** Powers the `/your-reps` address lookup -- the primary entry point for citizens. Without it, users cannot find their representatives. Everything downstream (money report, district profile) depends on this.

---

## Tier 2 -- High-Value (6 sources)

These power distinct feature sections that users navigate to directly. They have their own pages, analyzers, or significant cross-domain joins.

### Federal Register API

| Property           | Value                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Base URL           | `https://www.federalregister.gov/api/v1`                                                                                       |
| API key            | None (public)                                                                                                                  |
| Cache TTL          | 1 hr (metadata, rules), 24 hr (preamble, RIN -- immutable content), 30 days (extractor)                                        |
| Consumers          | 3 analyzers (regulation, federal-register-extractor, influence-graph), no direct API routes                                    |
| Cross-domain joins | Bills to regulations via RIN matching, FR + LDA + Regulations.gov in regulation analyzer, FR as node in influence graph chains |
| Error handling     | Excellent -- all methods return `null`/`[]` on error                                                                           |

**Why Tier 2:** Powers the bill-to-regulation link in the influence graph. Without it, the chain stops at legislation and never reaches enforcement outcomes.

### Senate Stock Disclosures

| Property           | Value                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Base URL           | `https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/` (filers.json + filer/{id}.json) |
| API key            | None (GitHub-hosted JSON, MIT license, refreshed daily)                                                                  |
| Cache TTL          | 24 hr (filer index + per-filer), 7 days (analyzer)                                                                       |
| Consumers          | stock-committee analyzer, stock-trade-leaderboard analyzer, stock-trades API route, health check, dataset generator      |
| Cross-domain joins | Senate trades + committee jurisdiction sectors, trades + SEC EDGAR SIC codes                                             |
| Error handling     | Route uses circuit breaker, returns `{ trades: [] }` on failure. Analyzer returns `null` on failure.                     |

**Why Tier 2:** Powers stock trade analysis, a high-interest feature for transparency. Third-party GitHub data source introduces supply chain risk (repo could be deleted or go stale — the previous source, Senate Stock Watcher, froze in March 2021; the health probe now checks the dataset's own `generatedAt` timestamp to catch this). Coverage: electronic eFD filings 2015-present; pre-2015 paper filings excluded. Every trade retains its primary-source efdsearch.senate.gov link.

### House Stock Disclosures

| Property           | Value                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Base URL           | `https://disclosures-clerk.house.gov`                                                            |
| API key            | None (public)                                                                                    |
| Cache TTL          | 7 days (PDFs -- immutable), 24 hr (index), 6 hr (per-member)                                     |
| Consumers          | stock-committee analyzer, stock-trades route, sec-filings route, daily cron parser, health check |
| Cross-domain joins | House trades -> SEC EDGAR (tickers to company profiles), trades + committee jurisdiction sectors |
| Error handling     | Very thorough -- year-level try/catch continues on failure, route returns `{ trades: [] }`       |

**Why Tier 2:** Powers House member stock trade analysis. Daily cron job processes new PTR filings. More resilient than Senate source (official .gov data vs. third-party GitHub).

### SEC EDGAR

| Property       | Value                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Base URL       | `https://efts.sec.gov/LATEST`                                                                                  |
| API key        | None (public, 10 req/s rate limit)                                                                             |
| Cache TTL      | 30 min (profile, search), 1 hr (financial facts), 24 hr (ticker-CIK mapping)                                   |
| Consumers      | sec-filings API route, health check. Indirectly used by stock-committee analyzer via ticker-industry resolver. |
| Error handling | All methods return `null`/`{ hits: [] }` on error                                                              |

**Why Tier 2:** Enables the stock-trades-to-company-profile join and ticker-to-sector resolution. Without it, stock trade analysis loses industry context.

### FRED (Federal Reserve Economic Data)

| Property           | Value                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Base URL           | `https://api.stlouisfed.org/fred`                                                                                                   |
| API key            | `FRED_API_KEY` (optional -- degrades gracefully without it)                                                                         |
| Cache TTL          | 1 hr (all methods), 6 hr (route ISR)                                                                                                |
| Consumers          | economic-indicators API route, influence-graph analyzer                                                                             |
| Cross-domain joins | FRED state indicators as OutcomeSignal nodes in influence graph chains (lobbying -> legislation -> regulation -> economic outcomes) |
| Error handling     | Excellent -- returns `[]` when key missing, per-indicator try/catch inside `getStateIndicators`                                     |

**Why Tier 2:** Provides the economic outcome signals that complete the influence graph. Without it, the chain ends at regulation and cannot show real-world economic effects.

### Open States

| Property           | Value                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL           | `https://v3.openstates.org`                                                                                                                        |
| API key            | `OPENSTATES_API_KEY` (optional -- works without, but rate-limited)                                                                                 |
| Cache TTL          | 3 days to 6 months (election-aware), 30 min default                                                                                                |
| Consumers          | 15+ API routes (state legislature, state bills, committees, calendar, votes, feeds), address-to-legislators service, unified search, 6+ components |
| Cross-domain joins | Census geocoding + OpenStates districts, OpenStates IDs + Follow the Money                                                                         |
| Error handling     | `StateLegislatureCoreService` wraps all calls with try/catch returning `[]`/`null`. Route handlers add additional error handling.                  |

**Why Tier 2:** Powers the entire state legislature section. Without it, state-level representative data, bills, committees, and votes are all gone. Large consumer footprint.

---

## Tier 3 -- Enrichment (18 sources)

These enrich district profiles, topic pages, and MCP tool responses. They don't power the core value proposition. When they break, show "Data unavailable" and move on.

### Summary Table

| Source            | Base URL                           | API Key                     | Cache TTL | Primary Consumer                                                       | Political Threat                       |
| ----------------- | ---------------------------------- | --------------------------- | --------- | ---------------------------------------------------------------------- | -------------------------------------- |
| EPA ECHO          | `echodata.epa.gov/echo`            | None                        | 6 hr      | community-profile, enforcement analyzer, MCP                           | **HIGH** -- active suppression risk    |
| OSHA              | `apiprod.dol.gov/v4/osha`          | `DOL_API_KEY`               | 6 hr      | enforcement analyzer only                                              | **MEDIUM-HIGH** -- key can be revoked  |
| CFPB              | `consumerfinance.gov/...api/v1`    | None                        | 12 hr     | community-profile, enforcement analyzer, MCP                           | **HIGH** -- CFPB repeatedly targeted   |
| NOAA              | `ncdc.noaa.gov/cdo-web/api/v2`     | `NOAA_TOKEN`                | 24 hr     | MCP environment tool only                                              | **VERY HIGH** -- explicitly targeted   |
| EIA               | `api.eia.gov/v2`                   | `EIA_API_KEY`               | 24 hr     | community-profile, MCP                                                 | MEDIUM                                 |
| HUD               | `huduser.gov/hudapi`               | `HUD_API_TOKEN`             | 24 hr     | housing API route, MCP                                                 | MEDIUM                                 |
| FDIC              | `api.fdic.gov/banks`               | None                        | 24 hr     | community-profile, MCP                                                 | LOW                                    |
| FEMA              | `fema.gov/api/open/v2`             | None                        | 24 hr     | community-profile, MCP                                                 | MEDIUM                                 |
| Treasury Fiscal   | `api.fiscaldata.treasury.gov`      | None                        | 12 hr     | MCP economy tool only                                                  | LOW                                    |
| NIH Reporter      | `api.reporter.nih.gov/v2`          | None                        | 24 hr     | community-profile, MCP                                                 | **HIGH** -- grants actively defunded   |
| CMS               | `data.cms.gov/provider-data/api/1` | None                        | 24 hr     | community-profile, MCP                                                 | MEDIUM                                 |
| College Scorecard | `api.data.gov/ed/collegescorecard` | `DATA_GOV_API_KEY` (shared) | 24 hr     | community-profile, MCP                                                 | **HIGH** -- Dept of Ed targeted        |
| NHTSA             | `api.nhtsa.gov/recalls`            | None                        | 12 hr     | MCP safety tool only                                                   | LOW                                    |
| FBI UCR           | `api.usa.gov/crime/fbi/cde`        | `DATA_GOV_API_KEY` (shared) | 24 hr     | crime API route, MCP                                                   | **HIGH** -- politically sensitive      |
| CourtListener     | `courtlistener.com/api/rest/v4`    | `COURTLISTENER_API_TOKEN`   | 12 hr     | influence-graph analyzer only                                          | MEDIUM (independent nonprofit)         |
| Regulations.gov   | `api.regulations.gov/v4`           | `DATA_GOV_API_KEY` (shared) | 30 min    | regulation analyzer, comments route                                    | **HIGH** -- regulatory rollback target |
| USASpending       | `api.usaspending.gov/api/v2`       | None                        | varies    | spending routes, district profile, MCP, graph hydrators                | MEDIUM                                 |
| Wikidata SPARQL   | `query.wikidata.org/sparql`        | None                        | varies    | photos, biographies, state executives, judiciary, lobby org enrichment | LOW (community-maintained)             |

### Error Handling Status

All 18 Tier 3 services have graceful error handling -- every method returns empty arrays or null rather than throwing to consumers. The `community-profile` route adds a second layer with `.catch(() => [])` / `.catch(() => null)` on every call. No consumer will crash if a Tier 3 service fails.

### DATA_GOV_API_KEY Shared Quota Risk

Three services share a single `DATA_GOV_API_KEY` with a 1,000 req/hr quota through `data-gov-rate-limiter.ts`:

- College Scorecard
- FBI UCR
- Regulations.gov

If one service exhausts the quota, all three degrade simultaneously. Consider obtaining separate API keys if contention becomes an issue.

---

## Degradation Behavior

### What users see when Tier 3 sources are down

| Consumer                                       | Behavior When Source Returns Empty                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Community Profile section** (district pages) | Cards with zero data are hidden. If all 8 sources return empty, the entire section is hidden (returns `null`). No blank bordered cards. |
| **Enforcement page**                           | Shows "Enforcement data not available for this selection" message. Minimum threshold of 3 actions prevents rendering partial data.      |
| **State page (crime section)**                 | Section simply does not render (`{crimeData && crimeData.crimeStats && ...}`). No blank card.                                           |
| **State page (enforcement section)**           | Section simply does not render. Skeleton shown during loading, nothing shown on failure.                                                |
| **Housing route**                              | Returns 404 with message: "Housing data not available. HUD API token may not be configured."                                            |
| **MCP tools**                                  | Return text messages like "No NOAA climate data available. NOAA_TOKEN may not be configured."                                           |

### What is NOT shown (gap)

None of the current consumer pages show a "Data unavailable since [date]" message with last-known-good timestamp. They either hide the section entirely or show a generic error. This is acceptable for now -- the health check endpoint tracks `lastSuccessfulFetch` per source, and freshness timestamps are surfaced through the `InsightDisclaimer` component on intelligence cards.

---

## Health Check Alignment

The `/api/health` route already classifies sources into tiers and probes them on rotation. Current tier assignments in the health route vs. this document:

| Source                                                    | Health Route Tier | This Document                                                    | Aligned? |
| --------------------------------------------------------- | ----------------- | ---------------------------------------------------------------- | -------- |
| Congress.gov, FEC, Senate LDA                             | critical          | Tier 1                                                           | Yes      |
| Federal Register, EPA ECHO, FRED, Census, Regulations.gov | important         | Mixed (FR/FRED/Census = Tier 2; EPA = Tier 3; Regs.gov = Tier 3) | Partial  |
| Everything else                                           | standard          | Tier 2 or 3                                                      | Partial  |

The health route's tier classification was written before this analysis. The `important` tier in the health route doesn't perfectly map to this document's Tier 2 -- EPA ECHO and Regulations.gov are classified as Tier 3 here (enrichment) but `important` in the health route (probed more frequently). This is fine: the health route's rotation frequency should reflect how often we want to _detect_ breakage, not how urgently we'd _fix_ it.

### Env Var Mismatches Found

| Source | Health Route `requiresKey` | Service Reads   | Issue                                                    |
| ------ | -------------------------- | --------------- | -------------------------------------------------------- |
| NOAA   | `NOAA_API_KEY`             | `NOAA_TOKEN`    | Mismatch -- health check may report false "down"         |
| HUD    | `HUD_API_KEY`              | `HUD_API_TOKEN` | Mismatch -- health check may report false "down"         |
| OSHA   | (none)                     | `DOL_API_KEY`   | Missing -- health check probes without auth, may get 401 |

These are fixed in the same commit as this document.

---

## API Key Inventory

| Env Var                   | Required By                                 | Tier | Required or Optional                            |
| ------------------------- | ------------------------------------------- | ---- | ----------------------------------------------- |
| `CONGRESS_API_KEY`        | Congress.gov                                | 1    | **Required** -- throws if missing               |
| `FEC_API_KEY`             | FEC API                                     | 1    | **Required** -- throws on first call if missing |
| `FRED_API_KEY`            | FRED                                        | 2    | Optional -- degrades gracefully                 |
| `OPENSTATES_API_KEY`      | Open States                                 | 2    | Optional -- works without, rate-limited         |
| `DOL_API_KEY`             | OSHA                                        | 3    | Required -- returns `[]` if missing             |
| `NOAA_TOKEN`              | NOAA                                        | 3    | Required -- returns `[]` if missing             |
| `HUD_API_TOKEN`           | HUD                                         | 3    | Required -- returns `null` if missing           |
| `EIA_API_KEY`             | EIA                                         | 3    | Required -- returns `null`/`[]` if missing      |
| `COURTLISTENER_API_TOKEN` | CourtListener                               | 3    | Required -- returns `[]` if missing             |
| `DATA_GOV_API_KEY`        | College Scorecard, FBI UCR, Regulations.gov | 3    | Required -- all three degrade if missing        |

**Total keys to maintain:** 10 (2 critical, 2 optional, 6 Tier 3)

---

## Maintenance Estimates (Revised)

| Tier      | Sources | Est. Hours/Year       | Strategy                                                                   |
| --------- | ------- | --------------------- | -------------------------------------------------------------------------- |
| Tier 1    | 4       | 80-160                | Proactive monitoring, immediate fixes, test coverage for all consumers     |
| Tier 2    | 6       | 60-120                | Active monitoring, fix within a week, test coverage for primary consumers  |
| Tier 3    | 18      | 40-80 (reactive only) | Fix when reported. No proactive maintenance. Show empty states gracefully. |
| **Total** | **28**  | **180-360**           | Down from 560-2,240 if all maintained equally                              |

The key insight: Tier 3 sources account for 64% of sources but should consume only ~25% of maintenance hours. The savings come from not proactively chasing every API schema change, rate limit adjustment, or endpoint migration for enrichment sources.

---

## Decision Rationale

### Why USASpending is Tier 3, not Tier 2

USASpending powers district spending data (8+ consumer files), but it doesn't participate in the core money-votes-lobbying join. It enriches district profiles and enables bill-to-spending connections, but the platform's core intelligence doesn't break without it. If it proves to be heavily trafficked (once analytics are in place), promote to Tier 2.

### Why Regulations.gov is Tier 3, not Tier 2

Despite being classified as `important` in the health route, Regulations.gov only feeds the regulation analyzer and a comments API route. It enriches the bill-to-regulation link but doesn't power it (that's the Federal Register's job via RIN matching). Regulations.gov adds public comment counts -- nice to have, not essential.

### Why Open States is Tier 2, not Tier 1

Open States powers all state legislature data -- a significant feature surface. But state legislature data doesn't participate in the money-votes-lobbying join (there's no state-level FEC or LDA equivalent currently integrated). If state campaign finance (Follow the Money) is ever integrated, Open States would be promoted to Tier 1.

### Why EPA ECHO is Tier 3 despite HIGH political threat

Political threat level affects _likelihood of breakage_, not _impact of breakage_. EPA ECHO data enriches enforcement analysis and community profiles, but the platform's core value proposition doesn't depend on it. The high threat level means we should be _prepared_ for breakage (good empty states, monitoring), not that we should invest disproportionate maintenance effort.

---

## Review Schedule

Re-evaluate this classification:

- After 3 months of analytics data (which pages get traffic?)
- After any Tier 1 source has a major outage (did our response time meet the 24-hour target?)
- After any Tier 3 source is reported broken by a user (how long did it take us to notice?)
- When adding new data sources
