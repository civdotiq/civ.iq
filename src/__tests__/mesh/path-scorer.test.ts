/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Civic Mesh Weighted Influence Path Scoring.
 *
 * Tests scoreEdge() dollar/temporal/confidence weighting and monotonicity.
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

// Mock path-finder
jest.mock('@/lib/graph/path-finder', () => ({
  findPaths: jest.fn().mockResolvedValue({ paths: [], fromId: '', toId: '' }),
}));

import { scoreEdge } from '@/lib/mesh/propagation/path-scorer';
import type { GraphEdge } from '@/types/graph';

function makeEdge(overrides: Partial<GraphEdge>): GraphEdge {
  return {
    id: 'test-edge',
    source: 'node-a',
    target: 'node-b',
    type: 'donated_to',
    confidence: 0.8,
    sources: ['test'],
    properties: {},
    temporal: { date: new Date().toISOString() },
    ...overrides,
  };
}

describe('scoreEdge', () => {
  it('scores a donation edge with dollar amount', () => {
    const edge = makeEdge({
      type: 'donated_to',
      properties: { amount: 100_000 },
      confidence: 0.9,
    });

    const score = scoreEdge(edge);
    expect(score.dollarWeight).toBeGreaterThan(0);
    expect(score.dollarWeight).toBeLessThanOrEqual(1);
    expect(score.temporalWeight).toBeGreaterThan(0);
    expect(score.temporalWeight).toBeLessThanOrEqual(1);
    expect(score.confidenceWeight).toBe(0.9);
    expect(score.combinedScore).toBe(
      score.dollarWeight * score.temporalWeight * score.confidenceWeight
    );
  });

  it('higher dollar amount produces higher dollarWeight', () => {
    const lowEdge = makeEdge({ properties: { amount: 1_000 }, confidence: 1 });
    const highEdge = makeEdge({ properties: { amount: 1_000_000 }, confidence: 1 });

    const lowScore = scoreEdge(lowEdge);
    const highScore = scoreEdge(highEdge);

    expect(highScore.dollarWeight).toBeGreaterThan(lowScore.dollarWeight);
  });

  it('more recent edge produces higher temporalWeight', () => {
    const now = new Date();
    const recentEdge = makeEdge({
      temporal: { date: now.toISOString() },
      confidence: 1,
    });

    const oldDate = new Date(now);
    oldDate.setFullYear(oldDate.getFullYear() - 2);
    const oldEdge = makeEdge({
      temporal: { date: oldDate.toISOString() },
      confidence: 1,
    });

    const recentScore = scoreEdge(recentEdge);
    const oldScore = scoreEdge(oldEdge);

    expect(recentScore.temporalWeight).toBeGreaterThan(oldScore.temporalWeight);
  });

  it('uses lastSeen over date when available', () => {
    const now = new Date();
    const edge = makeEdge({
      temporal: {
        date: '2020-01-01',
        lastSeen: now.toISOString(),
      },
      confidence: 1,
    });

    const score = scoreEdge(edge);
    // Should use lastSeen (recent), not date (old), so temporalWeight should be high
    expect(score.temporalWeight).toBeGreaterThan(0.9);
  });

  it('assigns 0.5 temporal weight for missing date', () => {
    const edge = makeEdge({
      temporal: undefined,
      confidence: 1,
    });

    const score = scoreEdge(edge);
    expect(score.temporalWeight).toBe(0.5);
  });

  it('gives non-dollar edge types fixed dollar weight', () => {
    const votedEdge = makeEdge({ type: 'voted_on', confidence: 1 });
    const servesEdge = makeEdge({ type: 'serves_on', confidence: 1 });

    const votedScore = scoreEdge(votedEdge);
    const servesScore = scoreEdge(servesEdge);

    expect(votedScore.dollarWeight).toBe(0.8);
    expect(servesScore.dollarWeight).toBe(0.5);
  });

  it('gives low dollar weight for zero-amount dollar edges', () => {
    const edge = makeEdge({
      type: 'donated_to',
      properties: { amount: 0 },
      confidence: 1,
    });

    const score = scoreEdge(edge);
    expect(score.dollarWeight).toBe(0.1);
  });

  it('reads spending property for lobbied edges', () => {
    const edge = makeEdge({
      type: 'lobbied',
      properties: { spending: 500_000 },
      confidence: 0.8,
    });

    const score = scoreEdge(edge);
    expect(score.dollarWeight).toBeGreaterThan(0.1);
  });

  it('combined score is product of all weights', () => {
    const edge = makeEdge({
      properties: { amount: 50_000 },
      confidence: 0.7,
    });

    const score = scoreEdge(edge);
    const expected = score.dollarWeight * score.temporalWeight * score.confidenceWeight;
    expect(score.combinedScore).toBeCloseTo(expected, 10);
  });
});
