/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Civic Mesh Temporal Aggregation.
 *
 * Tests computeTrend(), detectTemporalEvents(), dateToPeriod(),
 * periodToDateRange(), and backward compatibility of GraphEdge.temporal.
 */

// Mock logger before anything imports it
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock hydrateNeighborhood to avoid TransformStream / AI SDK import chain
jest.mock('@/lib/graph/hydrator', () => ({
  hydrateNeighborhood: jest.fn(),
}));

import {
  computeTrend,
  detectTemporalEvents,
  dateToPeriod,
  periodToDateRange,
} from '@/lib/mesh/temporal';
import type { TemporalBucket } from '@/lib/mesh/temporal-types';
import type { GraphEdge } from '@/types/graph';

describe('Temporal Mesh', () => {
  describe('dateToPeriod', () => {
    it('converts Q1 dates', () => {
      expect(dateToPeriod('2024-01-15')).toBe('2024-Q1');
      expect(dateToPeriod('2024-03-31')).toBe('2024-Q1');
    });

    it('converts Q2 dates', () => {
      expect(dateToPeriod('2024-04-01')).toBe('2024-Q2');
      expect(dateToPeriod('2024-06-30')).toBe('2024-Q2');
    });

    it('converts Q3 dates', () => {
      expect(dateToPeriod('2024-07-01')).toBe('2024-Q3');
      expect(dateToPeriod('2024-09-30')).toBe('2024-Q3');
    });

    it('converts Q4 dates', () => {
      expect(dateToPeriod('2024-10-01')).toBe('2024-Q4');
      expect(dateToPeriod('2024-12-31')).toBe('2024-Q4');
    });
  });

  describe('periodToDateRange', () => {
    it('returns correct range for Q1', () => {
      const range = periodToDateRange('2024-Q1');
      expect(range.start).toBe('2024-01-01');
      expect(range.end).toBe('2024-03-31');
    });

    it('returns correct range for Q4', () => {
      const range = periodToDateRange('2024-Q4');
      expect(range.start).toBe('2024-10-01');
      expect(range.end).toBe('2024-12-31');
    });

    it('handles invalid period gracefully', () => {
      const range = periodToDateRange('invalid');
      expect(range.start).toBe('invalid');
      expect(range.end).toBe('invalid');
    });
  });

  describe('computeTrend', () => {
    const makeBuckets = (values: number[], startYear = 2023, startQ = 1): TemporalBucket[] =>
      values.map((value, i) => {
        const q = ((startQ - 1 + i) % 4) + 1;
        const y = startYear + Math.floor((startQ - 1 + i) / 4);
        const period = `${y}-Q${q}`;
        const { start, end } = periodToDateRange(period);
        return { period, start, end, value, eventCount: 1 };
      });

    it('returns "stable" for constant values', () => {
      const buckets = makeBuckets([100, 100, 100, 100], 2025);
      const trend = computeTrend(buckets, '2025-01-01', '2026-03-15');
      expect(trend).toBe('stable');
    });

    it('returns "increasing" for rising values', () => {
      const buckets = makeBuckets([100, 200, 300, 500], 2025);
      const trend = computeTrend(buckets, '2025-01-01', '2026-03-15');
      expect(trend).toBe('increasing');
    });

    it('returns "decreasing" for falling values', () => {
      const buckets = makeBuckets([500, 300, 200, 100], 2025);
      const trend = computeTrend(buckets, '2025-01-01', '2026-03-15');
      expect(trend).toBe('decreasing');
    });

    it('returns "new" when firstSeen is within last quarter', () => {
      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 30);
      const buckets = makeBuckets([100]);
      const trend = computeTrend(
        buckets,
        recentDate.toISOString().slice(0, 10),
        now.toISOString().slice(0, 10)
      );
      expect(trend).toBe('new');
    });

    it('returns "ended" when lastSeen is before last quarter', () => {
      const buckets = makeBuckets([100, 200, 300, 100], 2020);
      const trend = computeTrend(buckets, '2020-01-01', '2020-12-31');
      expect(trend).toBe('ended');
    });

    it('returns "ended" for single bucket older than the last quarter', () => {
      // Single bucket lives in 2023-Q1 but the window's dataAsOf is 2025-12-31,
      // so lastSeen is well before the current quarter → correctly "ended".
      const buckets = makeBuckets([100]);
      const trend = computeTrend(buckets, '2023-01-01', '2025-12-31');
      expect(trend).toBe('ended');
    });

    it('returns "stable" for single bucket spanning an old start to current lastSeen', () => {
      // firstSeen old (not "new"), lastSeen is current (not "ended"),
      // and buckets.length < 2 → falls through to "stable". Exercises the
      // single-bucket stable branch that the "ended" case doesn't reach.
      const now = new Date().toISOString().slice(0, 10);
      const buckets = makeBuckets([100]);
      const trend = computeTrend(buckets, '2023-01-01', now);
      expect(trend).toBe('stable');
    });
  });

  describe('detectTemporalEvents', () => {
    it('returns empty for fewer than 3 buckets', () => {
      const buckets: TemporalBucket[] = [
        { period: '2024-Q1', start: '2024-01-01', end: '2024-03-31', value: 100, eventCount: 1 },
        { period: '2024-Q2', start: '2024-04-01', end: '2024-06-30', value: 200, eventCount: 1 },
      ];
      const events = detectTemporalEvents(buckets, 'donated_to', 'org:test');
      expect(events).toHaveLength(0);
    });

    it('detects anomalous spike in donations', () => {
      const buckets: TemporalBucket[] = [
        { period: '2024-Q1', start: '2024-01-01', end: '2024-03-31', value: 100, eventCount: 5 },
        { period: '2024-Q2', start: '2024-04-01', end: '2024-06-30', value: 110, eventCount: 6 },
        { period: '2024-Q3', start: '2024-07-01', end: '2024-09-30', value: 105, eventCount: 5 },
        { period: '2024-Q4', start: '2024-10-01', end: '2024-12-31', value: 1000, eventCount: 50 },
      ];
      const events = detectTemporalEvents(buckets, 'donated_to', 'org:test');
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.edgeType).toBe('donated_to');
      expect(events[0]!.relatedNodeId).toBe('org:test');
      expect(events[0]!.magnitude).toBeGreaterThan(1);
    });

    it('returns empty for uniform values', () => {
      const buckets: TemporalBucket[] = [
        { period: '2024-Q1', start: '2024-01-01', end: '2024-03-31', value: 100, eventCount: 5 },
        { period: '2024-Q2', start: '2024-04-01', end: '2024-06-30', value: 100, eventCount: 5 },
        { period: '2024-Q3', start: '2024-07-01', end: '2024-09-30', value: 100, eventCount: 5 },
        { period: '2024-Q4', start: '2024-10-01', end: '2024-12-31', value: 100, eventCount: 5 },
      ];
      const events = detectTemporalEvents(buckets, 'donated_to', 'org:test');
      expect(events).toHaveLength(0);
    });
  });

  describe('GraphEdge backward compatibility', () => {
    it('accepts old-style temporal field', () => {
      const edge: GraphEdge = {
        id: 'test',
        type: 'donated_to',
        sourceId: 'org:test',
        targetId: 'rep:A000360',
        label: 'Test',
        properties: {},
        weight: 0.5,
        confidence: 1.0,
        temporal: { date: '2024-06-15', period: '2024 cycle' },
        dataAsOf: '2024-06-15',
      };
      expect(edge.temporal?.date).toBe('2024-06-15');
      expect(edge.temporal?.period).toBe('2024 cycle');
    });

    it('accepts new-style temporal field with extended properties', () => {
      const edge: GraphEdge = {
        id: 'test',
        type: 'donated_to',
        sourceId: 'org:test',
        targetId: 'rep:A000360',
        label: 'Test',
        properties: {},
        weight: 0.5,
        confidence: 1.0,
        temporal: {
          date: '2024-06-15',
          period: '2024 cycle',
          firstSeen: '2024-01-15',
          lastSeen: '2024-06-15',
          trend: 'increasing',
          yoyChange: 0.25,
          buckets: [
            {
              period: '2024-Q1',
              start: '2024-01-01',
              end: '2024-03-31',
              value: 5000,
              eventCount: 3,
            },
            {
              period: '2024-Q2',
              start: '2024-04-01',
              end: '2024-06-30',
              value: 8000,
              eventCount: 5,
            },
          ],
        },
        dataAsOf: '2024-06-15',
      };
      expect(edge.temporal?.firstSeen).toBe('2024-01-15');
      expect(edge.temporal?.lastSeen).toBe('2024-06-15');
      expect(edge.temporal?.trend).toBe('increasing');
      expect(edge.temporal?.yoyChange).toBe(0.25);
      expect(edge.temporal?.buckets).toHaveLength(2);
    });

    it('allows temporal to be undefined', () => {
      const edge: GraphEdge = {
        id: 'test',
        type: 'serves_on',
        sourceId: 'rep:A000360',
        targetId: 'cmte:SSFI',
        label: 'Test',
        properties: {},
        weight: 0.5,
        confidence: 1.0,
        dataAsOf: '2024-06-15',
      };
      expect(edge.temporal).toBeUndefined();
    });
  });
});
