/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  analyzeTemporalProximity,
  type TemporalProximityInsight,
} from '@/lib/intelligence/analyzers/temporal-proximity-analyzer';
import type { GraphNeighborhood, GraphNode, GraphEdge } from '@/types/graph';

jest.mock('@/lib/intelligence/statistics/civic-stats', () => ({
  confidenceScore: jest.fn(() => 0.7),
}));

jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  generateInsightNarrative: jest.fn(
    (_sys: string, _user: string, fallback: string, _label: string) =>
      Promise.resolve({ narrative: fallback, source: 'statistical-fallback' as const })
  ),
  freshestDate: (...dates: (string | undefined | null)[]) => {
    const valid = dates.filter((d): d is string => !!d && !isNaN(Date.parse(d)));
    if (valid.length === 0) return new Date().toISOString();
    valid.sort((a, b) => Date.parse(b) - Date.parse(a));
    return valid[0]!;
  },
}));

function makeNode(id: string): GraphNode {
  return {
    id,
    type: 'representative',
    label: id,
    properties: {},
    dataAsOf: '2026-03-10T00:00:00Z',
  };
}

function makeDonationEdge(orgId: string, repId: string, date: string, amount: number): GraphEdge {
  return {
    id: `${orgId}->donated_to->${repId}`,
    type: 'donated_to',
    sourceId: orgId,
    targetId: repId,
    label: `$${amount} from ${orgId}`,
    properties: { amount },
    weight: 0.5,
    confidence: 0.9,
    temporal: { date },
    dataAsOf: '2026-03-10T00:00:00Z',
  };
}

function makeVoteEdge(repId: string, billId: string, date: string): GraphEdge {
  return {
    id: `${repId}->voted_on->${billId}`,
    type: 'voted_on',
    sourceId: repId,
    targetId: billId,
    label: `Voted on ${billId}`,
    properties: { position: 'yea' },
    weight: 0.5,
    confidence: 1.0,
    temporal: { date },
    dataAsOf: '2026-03-10T00:00:00Z',
  };
}

describe('analyzeTemporalProximity', () => {
  it('returns empty patterns when no temporal edges exist', async () => {
    const nbr: GraphNeighborhood = {
      center: makeNode('rep:A'),
      edges: [],
      connectedNodes: [],
      completeness: 'complete',
      failedSources: [],
    };

    const result = await analyzeTemporalProximity(nbr, 'A000001');
    expect(result.patterns).toHaveLength(0);
    expect(result.totalPatternsDetected).toBe(0);
    expect(result.narrative).toContain('No notable timing patterns');
  });

  it('detects contribution → vote pattern within 90 days', async () => {
    const repId = 'rep:A';
    const nbr: GraphNeighborhood = {
      center: makeNode(repId),
      edges: [
        makeDonationEdge('org:X', repId, '2026-01-15', 5000),
        makeDonationEdge('org:Y', repId, '2026-02-01', 10000),
        makeVoteEdge(repId, 'bill:1', '2026-03-01'),
        makeVoteEdge(repId, 'bill:2', '2026-03-15'),
      ],
      connectedNodes: [],
      completeness: 'complete',
      failedSources: [],
    };

    const result = await analyzeTemporalProximity(nbr, 'A000001');
    const contribPattern = result.patterns.find(p => p.type === 'contribution_vote');
    expect(contribPattern).toBeDefined();
    expect(contribPattern!.instanceCount).toBeGreaterThanOrEqual(2);
    expect(contribPattern!.avgDaysBetween).toBeLessThanOrEqual(90);
  });

  it('does not detect pattern when effect precedes cause', async () => {
    const repId = 'rep:A';
    const nbr: GraphNeighborhood = {
      center: makeNode(repId),
      edges: [
        // Vote happens BEFORE donation
        makeVoteEdge(repId, 'bill:1', '2026-01-01'),
        makeVoteEdge(repId, 'bill:2', '2026-01-15'),
        makeDonationEdge('org:X', repId, '2026-06-01', 5000),
        makeDonationEdge('org:Y', repId, '2026-06-15', 10000),
      ],
      connectedNodes: [],
      completeness: 'complete',
      failedSources: [],
    };

    const result = await analyzeTemporalProximity(nbr, 'A000001');
    const contribPattern = result.patterns.find(p => p.type === 'contribution_vote');
    // No pattern because effect (vote) precedes cause (donation)
    expect(contribPattern).toBeUndefined();
  });

  it('never claims causation in narrative', async () => {
    const repId = 'rep:A';
    const nbr: GraphNeighborhood = {
      center: makeNode(repId),
      edges: [
        makeDonationEdge('org:X', repId, '2026-01-15', 5000),
        makeDonationEdge('org:Y', repId, '2026-02-01', 10000),
        makeVoteEdge(repId, 'bill:1', '2026-03-01'),
        makeVoteEdge(repId, 'bill:2', '2026-03-15'),
      ],
      connectedNodes: [],
      completeness: 'complete',
      failedSources: [],
    };

    const result = await analyzeTemporalProximity(nbr, 'A000001');
    expect(result.narrative).not.toContain('caused');
    expect(result.narrative).not.toContain('influenced');
    expect(result.narrative).not.toContain('resulted in');
    expect(result.disclaimer).toContain('does not imply causation');
  });

  it('includes InsightBase fields', async () => {
    const nbr: GraphNeighborhood = {
      center: makeNode('rep:A'),
      edges: [],
      connectedNodes: [],
      completeness: 'complete',
      failedSources: [],
    };

    const result = await analyzeTemporalProximity(nbr, 'A000001');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.methodology).toBeTruthy();
    expect(result.disclaimer).toBeTruthy();
    expect(result.dataAsOf).toBeTruthy();
    expect(result.lastAnalyzedAt).toBeTruthy();
    expect(result.source).toBe('statistical-fallback');
  });
});
