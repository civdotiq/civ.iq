/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Temporal Aggregation Engine
 *
 * Builds temporal profiles for graph nodes by aggregating edge data
 * into quarterly buckets with trend detection and anomaly flagging.
 *
 * Historical data sources by edge type:
 * - donated_to: FEC contributions by date -> quarterly buckets
 * - lobbied: LDA filings by quarter -> quarterly buckets
 * - voted_on: Congress.gov votes by date -> quarterly buckets
 * - Others: point-in-time only (no historical aggregation)
 */

import { mean } from 'simple-statistics';
import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import { detectAnomalies } from '@civiq/civic-statistics';
import logger from '@/lib/logging/simple-logger';
import type { GraphEdge, GraphEdgeType } from '@/types/graph';
import type {
  TemporalBucket,
  TemporalEdge,
  TemporalEdgeSummary,
  TemporalEvent,
  TemporalProfile,
  TemporalTrend,
} from './temporal-types';

const DEFAULT_QUARTERS = 8;

/** Edge types that support temporal aggregation. */
const TEMPORAL_EDGE_TYPES: ReadonlySet<GraphEdgeType> = new Set([
  'donated_to',
  'lobbied',
  'voted_on',
  'awarded_contract',
  'traded_stock',
]);

/**
 * Build a temporal profile for a node by:
 * 1. Hydrating the node's neighborhood (uses cached data)
 * 2. Grouping edges by type
 * 3. For each edge with temporal data, computing quarterly buckets
 * 4. Aggregating into TemporalProfile with trend detection and events
 */
export async function buildTemporalProfile(
  nodeId: string,
  options?: { quarters?: number }
): Promise<TemporalProfile | null> {
  const quarters = options?.quarters ?? DEFAULT_QUARTERS;

  const neighborhood = await hydrateNeighborhood(nodeId);
  if (!neighborhood) {
    logger.warn('[Mesh:Temporal] Node not found', { nodeId });
    return null;
  }

  const cutoffDate = getQuarterCutoff(quarters);
  const edgesByType = groupEdgesByType(neighborhood.edges);
  const edgeSummaries: TemporalEdgeSummary[] = [];
  const allEvents: TemporalEvent[] = [];

  let globalFrom = '';
  let globalTo = '';

  for (const [edgeType, edges] of edgesByType) {
    if (!TEMPORAL_EDGE_TYPES.has(edgeType)) continue;

    const temporalEdges: TemporalEdge[] = [];

    for (const edge of edges) {
      const temporal = buildTemporalEdge(edge, cutoffDate);
      if (temporal) {
        temporalEdges.push(temporal);

        // Track global date range
        if (!globalFrom || temporal.firstSeen < globalFrom) globalFrom = temporal.firstSeen;
        if (!globalTo || temporal.lastSeen > globalTo) globalTo = temporal.lastSeen;

        // Detect events for this edge
        const otherNodeId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
        const events = detectTemporalEvents(temporal.buckets, edgeType, otherNodeId);
        allEvents.push(...events);
      }
    }

    if (temporalEdges.length === 0) continue;

    // Compute trend breakdown
    const trendBreakdown = { increasing: 0, decreasing: 0, stable: 0, new: 0, ended: 0 };
    for (const te of temporalEdges) {
      trendBreakdown[te.trend]++;
    }

    // Aggregate buckets across all edges of this type
    const aggregateBuckets = aggregateBucketsAcrossEdges(temporalEdges);

    edgeSummaries.push({
      edgeType,
      totalEdges: temporalEdges.length,
      trendBreakdown,
      aggregateBuckets,
    });
  }

  if (edgeSummaries.length === 0) {
    return {
      nodeId,
      from: new Date().toISOString().slice(0, 10),
      to: new Date().toISOString().slice(0, 10),
      edgeSummaries: [],
      events: [],
    };
  }

  // Sort events by magnitude descending
  allEvents.sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude));

  return {
    nodeId,
    from: globalFrom,
    to: globalTo,
    edgeSummaries,
    events: allEvents.slice(0, 20),
  };
}

/**
 * Build a TemporalEdge from a GraphEdge by bucketing its temporal data.
 * Returns null if the edge has no temporal data.
 */
function buildTemporalEdge(edge: GraphEdge, cutoffDate: string): TemporalEdge | null {
  if (!edge.temporal?.date) return null;

  const date = edge.temporal.date;
  if (date < cutoffDate) return null;

  const firstSeen = edge.temporal.firstSeen ?? date;
  const lastSeen = edge.temporal.lastSeen ?? date;

  // Build buckets from the edge's temporal data
  let buckets: TemporalBucket[];

  if (edge.temporal.buckets && edge.temporal.buckets.length > 0) {
    // Hydrator provided pre-computed buckets
    buckets = edge.temporal.buckets as TemporalBucket[];
  } else {
    // Create a single bucket from the point-in-time data
    const period = dateToPeriod(date);
    const { start, end } = periodToDateRange(period);
    const value =
      typeof edge.properties.amount === 'number'
        ? edge.properties.amount
        : typeof edge.properties.spending === 'number'
          ? edge.properties.spending
          : 1;

    buckets = [
      {
        period,
        start,
        end,
        value,
        eventCount: 1,
      },
    ];
  }

  const trend = computeTrend(buckets, firstSeen, lastSeen);
  const yoyChange = computeYoYChange(buckets);

  return { firstSeen, lastSeen, buckets, trend, yoyChange };
}

/**
 * Compute trend for a series of temporal buckets.
 * Uses simple linear regression on the last 4 complete quarters.
 * Threshold: slope > 10% of mean = increasing, < -10% = decreasing, else stable.
 * "new" if firstSeen within last quarter. "ended" if lastSeen before last quarter.
 */
export function computeTrend(
  buckets: TemporalBucket[],
  firstSeen: string,
  lastSeen: string
): TemporalTrend {
  const now = new Date();
  const lastQuarterStart = getQuarterStart(now);
  lastQuarterStart.setMonth(lastQuarterStart.getMonth() - 3);

  // Check "new" — first seen within last quarter
  if (firstSeen >= lastQuarterStart.toISOString().slice(0, 10)) {
    return 'new';
  }

  // Check "ended" — last seen before last quarter
  if (lastSeen < lastQuarterStart.toISOString().slice(0, 10)) {
    return 'ended';
  }

  if (buckets.length < 2) return 'stable';

  // Use last 4 complete quarters for trend
  const sorted = [...buckets].sort((a, b) => a.period.localeCompare(b.period));
  const recent = sorted.slice(-4);

  if (recent.length < 2) return 'stable';

  // Simple linear regression: y = values, x = 0,1,2,...
  const values = recent.map(b => b.value);
  const avg = mean(values);
  if (avg === 0) return 'stable';

  const n = values.length;
  let sumXY = 0;
  let sumX2 = 0;
  const xMean = (n - 1) / 2;

  for (let i = 0; i < n; i++) {
    sumXY += (i - xMean) * (values[i]! - avg);
    sumX2 += (i - xMean) * (i - xMean);
  }

  const slope = sumX2 === 0 ? 0 : sumXY / sumX2;
  const slopeAsPercent = slope / avg;

  if (slopeAsPercent > 0.1) return 'increasing';
  if (slopeAsPercent < -0.1) return 'decreasing';
  return 'stable';
}

/**
 * Detect significant temporal events (anomalies in time-series).
 * Uses Modified Z-Score anomaly detection applied to temporal bucket values.
 */
export function detectTemporalEvents(
  buckets: TemporalBucket[],
  edgeType: GraphEdgeType,
  relatedNodeId: string
): TemporalEvent[] {
  if (buckets.length < 3) return [];

  const events: TemporalEvent[] = [];
  const sorted = [...buckets].sort((a, b) => a.period.localeCompare(b.period));
  const values = sorted.map(b => b.value);

  // Use anomaly detection — compare each bucket against the rest as "peers"
  for (let i = 0; i < sorted.length; i++) {
    const bucket = sorted[i]!;
    const peerValues = values.filter((_, idx) => idx !== i);

    if (peerValues.length < 3) continue;

    const subject = new Map<string, number>([['value', bucket.value]]);
    const peers = new Map<string, number[]>([['value', peerValues]]);

    const result = detectAnomalies(subject, peers, { threshold: 3.0, minimumPeers: 3 });

    if (result.hasAnomalies) {
      const peerMean = mean(peerValues);
      const changeRatio = peerMean > 0 ? bucket.value / peerMean : 0;

      events.push({
        date: bucket.start,
        edgeType,
        description: buildEventDescription(edgeType, bucket, changeRatio),
        magnitude: changeRatio,
        relatedNodeId,
      });
    }
  }

  return events;
}

// ── Helper Functions ──────────────────────────────────────────────────

function groupEdgesByType(edges: GraphEdge[]): Map<GraphEdgeType, GraphEdge[]> {
  const map = new Map<GraphEdgeType, GraphEdge[]>();
  for (const edge of edges) {
    const existing = map.get(edge.type);
    if (existing) {
      existing.push(edge);
    } else {
      map.set(edge.type, [edge]);
    }
  }
  return map;
}

/** Get ISO date string for N quarters ago. */
function getQuarterCutoff(quarters: number): string {
  const now = new Date();
  now.setMonth(now.getMonth() - quarters * 3);
  return now.toISOString().slice(0, 10);
}

/** Convert an ISO date to a quarter period string like "2024-Q1". */
export function dateToPeriod(date: string): string {
  // Parse as local date parts to avoid UTC timezone shift issues
  const parts = date.slice(0, 10).split('-');
  const year = parseInt(parts[0]!);
  const month = parseInt(parts[1]!) - 1; // 0-indexed
  const quarter = Math.floor(month / 3) + 1;
  return `${year}-Q${quarter}`;
}

/** Get the start and end dates for a quarter period string. */
export function periodToDateRange(period: string): { start: string; end: string } {
  const match = period.match(/^(\d{4})-Q([1-4])$/);
  if (!match) {
    return { start: period, end: period };
  }

  const year = parseInt(match[1]!);
  const quarter = parseInt(match[2]!);
  const startMonth = (quarter - 1) * 3;

  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0); // Last day of quarter

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/** Get the start of the quarter containing the given date. */
function getQuarterStart(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

/** Compute year-over-year change between most recent complete quarter and same quarter last year. */
function computeYoYChange(buckets: TemporalBucket[]): number | null {
  if (buckets.length < 5) return null;

  const sorted = [...buckets].sort((a, b) => a.period.localeCompare(b.period));
  const latest = sorted[sorted.length - 1]!;

  // Find same quarter last year
  const match = latest.period.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;

  const lastYearPeriod = `${parseInt(match[1]!) - 1}-Q${match[2]!}`;
  const lastYear = sorted.find(b => b.period === lastYearPeriod);

  if (!lastYear || lastYear.value === 0) return null;

  return (latest.value - lastYear.value) / lastYear.value;
}

/** Aggregate buckets across multiple TemporalEdges into combined quarterly totals. */
function aggregateBucketsAcrossEdges(temporalEdges: TemporalEdge[]): TemporalBucket[] {
  const periodMap = new Map<
    string,
    { value: number; eventCount: number; start: string; end: string }
  >();

  for (const te of temporalEdges) {
    for (const bucket of te.buckets) {
      const existing = periodMap.get(bucket.period);
      if (existing) {
        existing.value += bucket.value;
        existing.eventCount += bucket.eventCount;
      } else {
        periodMap.set(bucket.period, {
          value: bucket.value,
          eventCount: bucket.eventCount,
          start: bucket.start,
          end: bucket.end,
        });
      }
    }
  }

  return Array.from(periodMap.entries())
    .map(([period, data]) => ({
      period,
      start: data.start,
      end: data.end,
      value: data.value,
      eventCount: data.eventCount,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/** Build a human-readable description for a temporal event. */
function buildEventDescription(
  edgeType: GraphEdgeType,
  bucket: TemporalBucket,
  changeRatio: number
): string {
  const label = edgeTypeLabels[edgeType] ?? edgeType;
  const pctChange = Math.abs((changeRatio - 1) * 100).toFixed(0);
  const direction = changeRatio > 1 ? 'above' : 'below';

  return `${label} in ${bucket.period} was ${pctChange}% ${direction} average ($${Math.round(bucket.value).toLocaleString()})`;
}

const edgeTypeLabels: Partial<Record<GraphEdgeType, string>> = {
  donated_to: 'Donations',
  lobbied: 'Lobbying spending',
  voted_on: 'Voting activity',
  awarded_contract: 'Contract awards',
  traded_stock: 'Stock trades',
};
