# Changelog

All notable changes to `@civiq/civic-statistics` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [0.1.1] — 2026-04-17

### Changed

- Publish metadata: correct repository URL (`git+https://github.com/civdotiq/civ.iq.git`) with `directory` key, added `homepage`, `bugs`, `engines.node>=20`, and `publishConfig` with provenance attestation. No API changes.

## [0.1.0] — 2026-04-16

Initial public release. Extracted from the CIV.IQ intelligence layer so any civic-data project can reuse the same statistical primitives.

### Added

- `correlation(x, y, options?)` — Spearman (default) and Pearson correlation with sample-size gating and zero-variance detection. Returns `null` rather than misleading NaN when inputs are unsuitable.
- `peerComparison(value, peers, label)` — percentile rank against a peer group with configurable minimum (default 3 peers).
- `peerComparisonWithAnomalies(...)` — peer comparison that surfaces outliers above/below a z-score threshold.
- `confidenceScore({ sampleSize, minimumSampleSize, dataCompleteness, peerCount })` — 0–1 score for gating insight display. Below 0.6 hide; 0.6–0.8 amber; above 0.8 green.
- `meetsSampleSize(actual, type)` — civic-domain minimums: `votes` (10), `quarters` (4), `trades` (3), `peers` (3), `filings` (5), `recipients` (3), `relevant_votes` (3).
- `detectAnomalies(values, threshold?)` — z-score-based anomaly detection.
- Exported constants: `MIN_VOTES_PER_SECTOR`, `MIN_QUARTERS_TEMPORAL`, `MIN_TRADES_STOCK`, `MIN_FILINGS_LOBBYING`, `MIN_PAC_RECIPIENTS`, `MIN_RELEVANT_VOTES`, `MIN_PEERS`, `ANOMALY_THRESHOLD`.
- Re-exports of `mean` and `sampleStandardDeviation` from `simple-statistics` for convenience.

### Design choices

- Spearman is the default correlation method — civic data is rarely normally distributed, and rank correlation is robust to outliers (single large donors, single landslide votes).
- Every function returns `null` on insufficient data rather than throwing. Consumers should branch on `null` and show "insufficient data" in UI.
- No causation language anywhere in the API or docs. The library computes associations; interpretation is the caller's responsibility.

### Notes

- Tested against Node 20+ with vitest.
- ESM-only. Bundled as `.js` + `.d.ts`; no CJS build.
- Zero runtime dependencies other than `simple-statistics`.
