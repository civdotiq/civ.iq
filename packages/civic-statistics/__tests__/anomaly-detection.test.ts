import { describe, it, expect } from 'vitest';
import { detectAnomalies, ANOMALY_THRESHOLD } from '../src/index';

describe('detectAnomalies', () => {
  it('exports the default threshold', () => {
    expect(ANOMALY_THRESHOLD).toBe(3.5);
  });

  it('flags a dimension with extreme deviation', () => {
    const subject = new Map([
      ['A', 500],
      ['B', 50],
    ]);
    const peers = new Map([
      ['A', [40, 50, 60, 55, 45]],
      ['B', [45, 55, 50, 48, 52]],
    ]);

    const result = detectAnomalies(subject, peers);

    expect(result.hasAnomalies).toBe(true);
    expect(result.method).toBe('modified-z-score');
    expect(result.threshold).toBe(3.5);
    expect(result.meetsMinimumPeers).toBe(true);

    const flagA = result.flags.find(f => f.dimension === 'A');
    expect(flagA).toBeDefined();
    expect(flagA!.isAnomaly).toBe(true);
    expect(flagA!.value).toBe(500);
    expect(Math.abs(flagA!.modifiedZScore)).toBeGreaterThan(3.5);

    const flagB = result.flags.find(f => f.dimension === 'B');
    expect(flagB).toBeDefined();
    expect(flagB!.isAnomaly).toBe(false);
  });

  it('returns no anomalies when values are in range', () => {
    const subject = new Map([['X', 52]]);
    const peers = new Map([['X', [48, 50, 55, 51, 53]]]);

    const result = detectAnomalies(subject, peers);
    expect(result.hasAnomalies).toBe(false);
    expect(result.overallScore).toBe(0);
  });

  it('skips dimensions with too few peers', () => {
    const subject = new Map([['X', 500]]);
    const peers = new Map([['X', [50, 60]]]);

    const result = detectAnomalies(subject, peers);
    expect(result.flags).toHaveLength(0);
    expect(result.meetsMinimumPeers).toBe(false);
  });

  it('respects custom threshold', () => {
    const subject = new Map([['X', 150]]);
    const peers = new Map([['X', [40, 50, 60, 55, 45]]]);

    const loose = detectAnomalies(subject, peers, { threshold: 100 });
    expect(loose.flags.find(f => f.dimension === 'X')?.isAnomaly).toBe(false);

    const tight = detectAnomalies(subject, peers, { threshold: 1 });
    expect(tight.flags.find(f => f.dimension === 'X')?.isAnomaly).toBe(true);
  });

  it('respects custom minimum peers', () => {
    const subject = new Map([['X', 500]]);
    const peers = new Map([['X', [50, 60]]]);

    expect(detectAnomalies(subject, peers, { minimumPeers: 3 }).flags).toHaveLength(0);
    expect(detectAnomalies(subject, peers, { minimumPeers: 2 }).flags).toHaveLength(1);
  });

  it('sorts flags by |modifiedZScore| descending', () => {
    const subject = new Map([
      ['A', 500],
      ['B', 80],
      ['C', 50],
    ]);
    const peers = new Map([
      ['A', [40, 50, 60, 55, 45]],
      ['B', [40, 50, 60, 55, 45]],
      ['C', [40, 50, 60, 55, 45]],
    ]);

    const result = detectAnomalies(subject, peers);
    expect(result.flags.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < result.flags.length; i++) {
      expect(Math.abs(result.flags[i - 1]!.modifiedZScore)).toBeGreaterThanOrEqual(
        Math.abs(result.flags[i]!.modifiedZScore)
      );
    }
  });

  it('handles all-identical peer values', () => {
    const subject = new Map([['X', 100]]);
    const peers = new Map([['X', [50, 50, 50, 50, 50]]]);

    // MAD=0, std=0, value!=median → computeModifiedZScore returns null → dimension skipped
    const result = detectAnomalies(subject, peers);
    expect(result.flags).toHaveLength(0);
  });

  it('generates descriptions for flagged dimensions', () => {
    const subject = new Map([['X', 200]]);
    const peers = new Map([['X', [40, 50, 60, 55, 45]]]);

    const result = detectAnomalies(subject, peers);
    const flag = result.flags[0];
    expect(flag).toBeDefined();
    expect(flag!.description.length).toBeGreaterThan(0);
  });

  it('sets overallScore to max |z-score| of anomalous flags', () => {
    const subject = new Map([
      ['A', 500],
      ['B', 100],
    ]);
    const peers = new Map([
      ['A', [40, 50, 60, 55, 45]],
      ['B', [40, 50, 60, 55, 45]],
    ]);

    const result = detectAnomalies(subject, peers);
    if (result.hasAnomalies) {
      const maxZ = Math.max(
        ...result.flags.filter(f => f.isAnomaly).map(f => Math.abs(f.modifiedZScore))
      );
      expect(result.overallScore).toBeCloseTo(maxZ, 5);
    }
  });
});
