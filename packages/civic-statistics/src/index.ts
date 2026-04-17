/**
 * @civiq/civic-statistics
 *
 * Civic data statistics utilities — correlation, peer comparison,
 * confidence scoring with civic-domain defaults.
 */

export {
  correlation,
  peerComparison,
  peerComparisonWithAnomalies,
  confidenceScore,
  meetsSampleSize,
  mean,
  sampleStandardDeviation,
  MIN_VOTES_PER_SECTOR,
  MIN_QUARTERS_TEMPORAL,
  MIN_TRADES_STOCK,
  MIN_FILINGS_LOBBYING,
  MIN_PAC_RECIPIENTS,
  MIN_RELEVANT_VOTES,
  MIN_PEERS,
} from './civic-stats';

export { detectAnomalies, ANOMALY_THRESHOLD } from './anomaly-detection';

export type { CorrelationMethod, CorrelationResult } from './civic-stats';

export type { PeerComparison, AnomalyFlag, AnomalyResult } from './types';
