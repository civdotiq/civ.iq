# Methodology

## Correlation

**Default: Spearman rank correlation.** Civic data is rarely normally distributed — donation amounts follow power-law distributions, voting alignment is bounded [0,1], and sample sizes are typically small (10-50 data points per sector). Spearman handles all of these gracefully without assumptions about underlying distributions.

Pearson is available via `{ method: 'pearson' }` for cases where the data is known to be approximately normal.

## Confidence Scoring

The confidence formula weights three factors:

| Factor            | Weight | Rationale                                 |
| ----------------- | ------ | ----------------------------------------- |
| Sample size       | 50%    | Largest driver of statistical reliability |
| Data completeness | 30%    | Missing data introduces systematic bias   |
| Peer count        | 20%    | More peers = more meaningful comparison   |

**Sample size factor** scales linearly from 0 (at minimum) to 1 (at 3x minimum). This means hitting the bare minimum only contributes ~17% to the sample component.

**Display thresholds:**

- Below 0.6: hide insight entirely
- 0.6-0.8: show with amber confidence indicator
- Above 0.8: show with green confidence indicator

## Sample Size Thresholds

| Analysis Type       | Minimum | Rationale                                          |
| ------------------- | ------- | -------------------------------------------------- |
| Votes per sector    | 10      | Need sufficient votes to detect alignment patterns |
| Quarters (temporal) | 4       | One full year minimum for trend detection          |
| Stock trades        | 3       | Statistical minimum for pattern detection          |
| Lobbying filings    | 5       | Filter noise from single-filing lobbying           |
| PAC recipients      | 3       | Need multiple recipients for meaningful comparison |
| Peers               | 3       | Percentile rank requires at least 3 data points    |

All thresholds were set conservatively. An analyzer should produce no output rather than produce a misleading insight from insufficient data.

## Peer Comparison

Uses quantile rank (percentile) rather than z-scores because:

1. Percentiles are more intuitive for non-technical audiences
2. They don't assume normal distribution
3. They're bounded [0, 100] — no extreme values to explain
