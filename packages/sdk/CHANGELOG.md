# Changelog

All notable changes to `@civiq/sdk` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [0.1.0] — 2026-04-16

Initial public release of the TypeScript client for the CIV.IQ civic data API.

### Added — resources

- `civiq.representatives` — `list`, `get`, `profile`, `compare`, `all`.
- `civiq.bills` — `list`, `get`, `summary`.
- `civiq.votes` — `get`.
- `civiq.districts` — `get`, `geocode` (address mode).
- `civiq.committees` — `list`, `get`.
- `civiq.intelligence` — `votePrediction`, `influenceChain`, `sectorLeaderboard`, `moneyReportByAddress`, `influenceClusters`.
- `civiq.search` — `unified`, `policyArea`.
- `civiq.states` — `legislature`, `bills`, `legislatorsByAddress`.
- `civiq.graph` — `neighbors`, `entity`.

### Added — error handling

- Typed error classes: `NotFoundError`, `RateLimitError`, `BadRequestError`, `UpstreamError`, `CivIQError`.
- `RateLimitError.retryAfter` surfaces the server's `Retry-After` value in seconds.

### Added — types

- All response types are exported for TypeScript consumers: `RepresentativeDetail`, `BillSummary`, `VoteDetail`, `DistrictDetail`, `IntelligenceInsight`, and siblings.

### Added — configuration

- `new CivIQ({ baseUrl })` — defaults to `https://civdotiq.org/api`. Override for local development or self-hosted deployments.
- Default `User-Agent: @civiq/sdk/<version>` is sent on every request so API operators can see SDK adoption.

### Contract

- `BackboneResponse<T>` is surfaced end-to-end: each response carries `dataQuality` (`complete | partial | empty | unavailable`), `sourceStatus[]`, `confidence`, `dataAsOf`, `methodology`, `disclaimer`, and `sources[]`. Consumers can rely on these fields to distinguish "no data exists" from "data source temporarily unavailable" without string-matching error messages.

### Notes

- Tested against Node 20+ with vitest.
- ESM-only. Bundled as `.js` + `.d.ts`; no CJS build.
- Zero runtime dependencies — uses native `fetch`.
- API base is the public CIV.IQ deployment; rate-limited at 60 requests/minute per client. Self-hosted callers can point `baseUrl` at their own deployment.
