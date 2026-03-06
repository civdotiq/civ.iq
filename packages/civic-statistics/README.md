# @civiq/civic-statistics

Civic data statistics utilities — correlation, peer comparison, and confidence scoring with civic-domain defaults.

## Install

```bash
npm install @civiq/civic-statistics
```

## Quick Start

```typescript
import {
  correlation,
  peerComparison,
  confidenceScore,
  meetsSampleSize,
} from '@civiq/civic-statistics';

// Spearman rank correlation (default for civic data)
const result = correlation(donations, votingScores);
// { coefficient: 0.42, method: 'spearman', sampleSize: 15, meetsMinimum: true }

// Peer comparison with percentile rank
const comparison = peerComparison(0.73, peerValues, 'Senate Finance Committee');
// { value: 0.73, peerAverage: 0.61, peerCount: 12, percentileRank: 82, ... }

// Confidence scoring for insight display
const confidence = confidenceScore({
  sampleSize: 25,
  minimumSampleSize: 10,
  dataCompleteness: 0.9,
  peerCount: 15,
});
// 0.72 — show with amber indicator

// Sample size validation
meetsSampleSize(8, 'votes'); // false (minimum 10)
meetsSampleSize(5, 'trades'); // true (minimum 3)
```

## API Reference

### `correlation(x, y, options?)`

Compute correlation between two numeric arrays. Defaults to Spearman rank correlation (robust to non-normal distributions typical in civic data).

Returns `null` if arrays differ in length, have fewer than `minimumSampleSize` elements, or contain zero variance.

### `peerComparison(value, peerValues, peerGroupLabel)`

Compare a value against a peer group using percentile rank. Returns `null` if fewer than 3 peers.

### `confidenceScore(factors)`

Compute a confidence score (0-1) based on sample size, data completeness, and peer count. Below 0.6 = hide, 0.6-0.8 = amber, above 0.8 = green.

### `meetsSampleSize(actual, type)`

Check if a sample size meets the minimum threshold. Types: `votes` (10), `quarters` (4), `trades` (3), `peers` (3), `filings` (5), `recipients` (3).

### `mean(values)`, `sampleStandardDeviation(values)`

Re-exported from `simple-statistics` for convenience.

## Constants

| Constant                | Value | Usage                    |
| ----------------------- | ----- | ------------------------ |
| `MIN_VOTES_PER_SECTOR`  | 10    | Vote-finance correlation |
| `MIN_QUARTERS_TEMPORAL` | 4     | Temporal analysis        |
| `MIN_TRADES_STOCK`      | 3     | Stock-committee analysis |
| `MIN_FILINGS_LOBBYING`  | 5     | Lobbying pipeline        |
| `MIN_PAC_RECIPIENTS`    | 3     | PAC-vote analysis        |
| `MIN_RELEVANT_VOTES`    | 3     | Per-recipient PAC votes  |
| `MIN_PEERS`             | 3     | Peer comparison          |

## Data Sources

This library provides statistical utilities for analyzing data from:

- Congress.gov API (voting records, bill classifications)
- FEC.gov API (campaign contributions, PAC disbursements)
- Senate LDA API (lobbying filings)
- House Clerk (stock trade disclosures)

## License

MIT - Mark Sandford
