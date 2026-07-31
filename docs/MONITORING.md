# Data Source Monitoring Guide

CIV.IQ depends on 28 government and public data APIs. This document lists every source with its base URL, check frequency, and recommended external monitoring setup.

## Health Check Endpoint

**`GET /api/health`** — probes data sources and returns structured JSON.

- **Critical sources** (Congress.gov, FEC, Senate LDA) are probed on every call
- **Non-critical sources** rotate by UTC hour to avoid rate limit consumption
- Returns per-source: `status` (ok/degraded/down/stale/skipped), `responseTimeMs`, `lastSuccessfulFetch`, `httpStatus`
- Returns overall: `healthy` / `degraded` / `critical`
- HTTP 503 when status is `critical` (any critical source is down)

## External Monitoring with changedetection.io

Self-host via Docker (`docker run -d -p 5000:5000 dgtlmoon/changedetection.io`) or use the free hosted tier at [changedetection.io](https://changedetection.io).

For each source below, configure changedetection.io to fetch the URL at the listed interval. Alert on HTTP status changes or connection failures.

### Critical — Check Every 6 Hours

These power the core platform (bills, members, campaign finance, lobbying).

| Source           | Probe URL                                                        | Auth                   | Notes                |
| ---------------- | ---------------------------------------------------------------- | ---------------------- | -------------------- |
| Congress.gov API | `https://api.congress.gov/v3?api_key={CONGRESS_API_KEY}`         | API key in query param | Rate limit: 5,000/hr |
| FEC API          | `https://api.open.fec.gov/v1/`                                   | None for status page   | Rate limit: 1,000/hr |
| Senate LDA       | `https://lda.gov/api/v1/filings/?filing_period=2025&page_size=1` | None                   | Lobbying filings     |

### Important — Check Daily

These power regulations, economic data, district lookup, and comments.

| Source           | Probe URL                                                                                                                                                                             | Auth                   | Notes                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------- |
| Federal Register | `https://www.federalregister.gov/api/v1/documents.json?per_page=1`                                                                                                                    | None                   | Rules and notices      |
| EPA ECHO         | `https://echodata.epa.gov/echo/echo_rest_services.get_facility_info?output=JSON&p_st=DC&p_act=Y&responseset=1`                                                                        | None                   | Enforcement data       |
| FRED             | `https://api.stlouisfed.org/fred/series?series_id=GDP&file_type=json&api_key={FRED_API_KEY}`                                                                                          | API key in query param | Economic indicators    |
| Census Geocoder  | `https://geocoding.geo.census.gov/geocoder/geographies/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC&benchmark=Public_AR_Current&vintage=Current_Current&format=json` | None                   | Address → district     |
| Regulations.gov  | `https://api.regulations.gov/v4/documents?filter[lastModifiedDate][ge]=2025-01-01&page[size]=1`                                                                                       | `X-Api-Key` header     | Public comment periods |

### Standard — Check Weekly

These enrich district profiles and topic pages. Graceful degradation is acceptable.

| Source                   | Base URL                                                                                           | Auth                            | Notes                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| SEC EDGAR (data)         | `https://data.sec.gov`                                                                             | None (User-Agent required)      | Company filings, ticker mapping                                                                           |
| SEC EDGAR (search)       | `https://efts.sec.gov/LATEST`                                                                      | None                            | Full-text search                                                                                          |
| OSHA                     | `https://apiprod.dol.gov/v4/osha`                                                                  | None                            | Workplace safety inspections                                                                              |
| CFPB                     | `https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/`                 | None                            | Consumer complaints                                                                                       |
| CourtListener            | `https://www.courtlistener.com/api/rest/v4`                                                        | `Authorization: Token` header   | Federal court opinions                                                                                    |
| NOAA CDO                 | `https://www.ncdc.noaa.gov/cdo-web/api/v2`                                                         | `token` header                  | Climate data                                                                                              |
| EIA                      | `https://api.eia.gov/v2`                                                                           | `api_key` query param           | Energy data                                                                                               |
| HUD                      | `https://www.huduser.gov/hudapi/public`                                                            | `Authorization: Bearer` header  | Fair market rents, income limits                                                                          |
| FDIC                     | `https://api.fdic.gov/banks`                                                                       | None                            | Bank data                                                                                                 |
| FEMA                     | `https://www.fema.gov/api/open/v2`                                                                 | None                            | Disaster declarations                                                                                     |
| Treasury Fiscal          | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service`                                  | None                            | Exchange rates, debt                                                                                      |
| NIH Reporter             | `https://api.reporter.nih.gov/v2`                                                                  | None (POST to /projects/search) | Research grants                                                                                           |
| CMS                      | `https://data.cms.gov/provider-data/api/1/datastore/query`                                         | None                            | Healthcare provider data (DKAN)                                                                           |
| College Scorecard        | `https://api.data.gov/ed/collegescorecard/v1`                                                      | `api_key` query param           | Higher education data                                                                                     |
| NHTSA                    | `https://api.nhtsa.gov`                                                                            | None                            | Vehicle safety recalls                                                                                    |
| FBI UCR                  | `https://api.usa.gov/crime/fbi/cde`                                                                | `API_KEY` query param           | Crime statistics                                                                                          |
| Open States              | `https://v3.openstates.org`                                                                        | `apikey` query param            | State legislatures                                                                                        |
| USASpending              | `https://api.usaspending.gov/api/v2`                                                               | None                            | Federal contracts/grants                                                                                  |
| Congress Trading Monitor | `https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/stats.json` | None                            | Senate stock trades (community data); probe checks `generatedAt` content freshness, not just reachability |
| House Disclosures        | `https://disclosures-clerk.house.gov`                                                              | None                            | House financial disclosures (ZIP)                                                                         |
| Wikidata SPARQL          | `https://query.wikidata.org/sparql`                                                                | None                            | Biographies, state executives                                                                             |

## Alerting Strategy

1. **changedetection.io** monitors external API availability (is the endpoint up?)
2. **`/api/health`** monitors from the application's perspective (can we reach it? how fast? is cached data stale?)
3. **Vercel deployment logs** capture runtime errors from individual API calls

When a Tier 3 (Standard) source goes down:

- The health endpoint reports it as `down`
- The application shows "Data unavailable" per the existing empty state pattern
- No immediate action needed unless a user reports it or it stays down >7 days

When a Tier 1 (Critical) source goes down:

- The health endpoint returns HTTP 503 with `status: "critical"`
- Investigate immediately — the core platform is degraded
