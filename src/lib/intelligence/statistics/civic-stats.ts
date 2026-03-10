/**
 * Re-export shim — source moved to @civiq/civic-statistics package.
 * All existing consumers import from this path unchanged.
 */
export {
  correlation,
  peerComparison,
  peerComparisonWithAnomalies,
  confidenceScore,
  meetsSampleSize,
  mean,
  sampleStandardDeviation,
  detectAnomalies,
  ANOMALY_THRESHOLD,
  MIN_VOTES_PER_SECTOR,
  MIN_QUARTERS_TEMPORAL,
  MIN_TRADES_STOCK,
  MIN_FILINGS_LOBBYING,
  MIN_PAC_RECIPIENTS,
  MIN_RELEVANT_VOTES,
  MIN_PEERS,
} from '@civiq/civic-statistics';

export type {
  CorrelationMethod,
  CorrelationResult,
  PeerComparison,
  AnomalyFlag,
  AnomalyResult,
} from '@civiq/civic-statistics';
