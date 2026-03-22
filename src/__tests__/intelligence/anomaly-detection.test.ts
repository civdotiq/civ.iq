/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for anomaly detection (Modified Z-Score / MAD-based).
 * All pure functions — no mocks needed.
 *
 * Modified Z-Score formula: 0.6745 * (x - median) / MAD
 * where MAD = median(|x_i - median(x)|) for each x_i in peer values.
 */

import {
  detectAnomalies,
  ANOMALY_THRESHOLD,
  peerComparisonWithAnomalies,
} from '@civiq/civic-statistics';

describe('anomaly detection', () => {
  // ── ANOMALY_THRESHOLD ───────────────────────────────────────────

  it('exports a conservative threshold of 3.5', () => {
    expect(ANOMALY_THRESHOLD).toBe(3.5);
  });

  // ── detectAnomalies ─────────────────────────────────────────────

  describe('detectAnomalies', () => {
    it('flags a clear outlier with correct z-score', () => {
      // Peers: [78000, 80000, 81000, 82000, 85000]
      // Median = 81000
      // Deviations from median: [3000, 1000, 0, 1000, 4000]
      // MAD = median([0, 1000, 1000, 3000, 4000]) = 1000
      // Subject = 340000
      // Modified Z = 0.6745 * (340000 - 81000) / 1000 = 0.6745 * 259 = 174.6955
      const subject = new Map([['Defense', 340_000]]);
      const peers = new Map([['Defense', [80_000, 82_000, 78_000, 85_000, 81_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.hasAnomalies).toBe(true);
      expect(result.flags).toHaveLength(1);

      const flag = result.flags[0]!;
      expect(flag.dimension).toBe('Defense');
      expect(flag.isAnomaly).toBe(true);
      expect(flag.peerMedian).toBe(81_000);
      expect(flag.modifiedZScore).toBeCloseTo(174.7, 0);
      expect(result.overallScore).toBeCloseTo(174.7, 0);
      expect(result.method).toBe('modified-z-score');
      expect(result.meetsMinimumPeers).toBe(true);
    });

    it('does not flag values within normal range', () => {
      // Subject = 83000, Median = 81000, MAD = 1000
      // Modified Z = 0.6745 * (83000 - 81000) / 1000 = 0.6745 * 2 = 1.349
      const subject = new Map([['Health', 83_000]]);
      const peers = new Map([['Health', [80_000, 82_000, 78_000, 85_000, 81_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.hasAnomalies).toBe(false);
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0]!.isAnomaly).toBe(false);
      expect(result.flags[0]!.modifiedZScore).toBeCloseTo(1.349, 2);
      expect(result.overallScore).toBe(0); // No anomalies → overallScore = 0
    });

    it('handles multiple dimensions and sorts by severity', () => {
      const subject = new Map([
        ['Defense', 340_000], // huge outlier
        ['Health', 83_000], // normal
        ['Energy', 500_000], // even bigger outlier
      ]);
      const peers = new Map([
        ['Defense', [80_000, 82_000, 78_000, 85_000, 81_000]],
        ['Health', [80_000, 82_000, 78_000, 85_000, 81_000]],
        ['Energy', [50_000, 55_000, 48_000, 52_000, 51_000]],
      ]);

      const result = detectAnomalies(subject, peers);

      expect(result.hasAnomalies).toBe(true);
      expect(result.flags).toHaveLength(3);

      // Should be sorted by |modifiedZScore| descending
      const zScores = result.flags.map(f => Math.abs(f.modifiedZScore));
      expect(zScores[0]!).toBeGreaterThan(zScores[1]!);
      expect(zScores[1]!).toBeGreaterThan(zScores[2]!);

      // Energy: peers [48000,50000,51000,52000,55000], median=51000
      // deviations=[3000,1000,0,1000,4000], MAD=1000
      // Z = 0.6745*(500000-51000)/1000 = 302.93
      // Defense: Z = 0.6745*(340000-81000)/1000 = 174.70
      // Energy z-score is higher because the deviation is larger
      expect(result.flags[0]!.dimension).toBe('Energy');
      expect(result.flags[1]!.dimension).toBe('Defense');
      expect(result.flags[2]!.dimension).toBe('Health');
    });

    it('skips dimensions with fewer than MIN_PEERS', () => {
      const subject = new Map([['Defense', 340_000]]);
      const peers = new Map([
        ['Defense', [80_000, 82_000]], // Only 2 peers — below MIN_PEERS (3)
      ]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags).toHaveLength(0);
      expect(result.hasAnomalies).toBe(false);
      expect(result.meetsMinimumPeers).toBe(false);
    });

    it('returns null z-score when MAD=0 and stddev=0 (all peers identical)', () => {
      const subject = new Map([['Defense', 200_000]]);
      const peers = new Map([['Defense', [80_000, 80_000, 80_000, 80_000, 80_000]]]);

      const result = detectAnomalies(subject, peers);

      // MAD=0, stddev=0, value !== median → cannot compute z-score → no flag
      expect(result.flags).toHaveLength(0);
      expect(result.meetsMinimumPeers).toBe(true);
    });

    it('returns z-score=0 when subject equals all-identical peers', () => {
      const subject = new Map([['Defense', 80_000]]);
      const peers = new Map([['Defense', [80_000, 80_000, 80_000, 80_000, 80_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0]!.modifiedZScore).toBe(0);
      expect(result.flags[0]!.isAnomaly).toBe(false);
    });

    it('falls back to mean/stddev when MAD=0 but stddev > 0', () => {
      // Peers: [80000, 80000, 80000, 80000, 100000]
      // Median = 80000, MAD = median([0,0,0,0,20000]) = 0 → fallback
      // Mean = 84000, stddev = sqrt(((4*16M + 256M)/4)) = sqrt(80M) ≈ 8944.27
      // Subject = 500000
      // Z = (500000 - 84000) / 8944.27 ≈ 46.51
      const subject = new Map([['Defense', 500_000]]);
      const peers = new Map([['Defense', [80_000, 80_000, 80_000, 80_000, 100_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0]!.isAnomaly).toBe(true);
      expect(result.flags[0]!.modifiedZScore).toBeCloseTo(46.51, 0);
    });

    it('returns meetsMinimumPeers=false when no dimension has enough peers', () => {
      const subject = new Map([['Defense', 100]]);
      const peers = new Map([
        ['Defense', [50, 60]], // Only 2, below default MIN_PEERS=3
      ]);

      const result = detectAnomalies(subject, peers);
      expect(result.meetsMinimumPeers).toBe(false);
    });

    it('respects custom threshold', () => {
      // Subject = 150000, Median = 81000, MAD = 1000
      // Z = 0.6745 * (150000 - 81000) / 1000 = 0.6745 * 69 = 46.54
      const subject = new Map([['Defense', 150_000]]);
      const peers = new Map([['Defense', [80_000, 82_000, 78_000, 85_000, 81_000]]]);

      const strict = detectAnomalies(subject, peers, { threshold: 1.0 });
      const loose = detectAnomalies(subject, peers, { threshold: 100 });

      expect(strict.threshold).toBe(1.0);
      expect(loose.threshold).toBe(100);

      // Both compute the same z-score
      expect(strict.flags[0]!.modifiedZScore).toBeCloseTo(loose.flags[0]!.modifiedZScore, 5);

      // Strict flags it, loose does not
      expect(strict.flags[0]!.isAnomaly).toBe(true);
      expect(loose.flags[0]!.isAnomaly).toBe(false);

      // Description reflects the threshold — strict says anomaly, loose says normal
      // 150000/81000 = 1.85x (< 2), so percentage description: "85% above"
      expect(strict.flags[0]!.description).toContain('85% above the peer median');
      expect(loose.flags[0]!.description).toContain('within normal range');
    });

    it('generates correct description for large outlier above median', () => {
      // ratio = 340000 / 81000 ≈ 4.2 → "4.2x the peer median"
      const subject = new Map([['Defense', 340_000]]);
      const peers = new Map([['Defense', [80_000, 82_000, 78_000, 85_000, 81_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags[0]!.description).toBe(
        'Defense funding is 4.2x the peer median ($340,000 vs $81,000).'
      );
    });

    it('generates correct description for moderate outlier', () => {
      // Subject = 120000, Median = 81000, ratio = 1.48 (< 2), so percentage description
      // But z-score needs to exceed threshold. With MAD=1000:
      // Z = 0.6745 * (120000 - 81000) / 1000 = 26.3 → anomaly
      // pctDiff = |48|% above
      const subject = new Map([['Defense', 120_000]]);
      const peers = new Map([['Defense', [80_000, 82_000, 78_000, 85_000, 81_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags[0]!.description).toBe(
        'Defense funding is 48% above the peer median ($120,000 vs $81,000).'
      );
    });

    it('generates correct description for outlier below median', () => {
      // Subject = 30000, Median = 81000, ratio = 0.37 (< 0.5)
      // Z = 0.6745 * (30000 - 81000) / 1000 = -34.4 → anomaly
      // 1/ratio = 2.7 → "2.7x below"
      const subject = new Map([['Defense', 30_000]]);
      const peers = new Map([['Defense', [80_000, 82_000, 78_000, 85_000, 81_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags[0]!.isAnomaly).toBe(true);
      expect(result.flags[0]!.modifiedZScore).toBeLessThan(0);
      expect(result.flags[0]!.description).toBe(
        'Defense funding is 2.7x below the peer median ($30,000 vs $81,000).'
      );
    });

    it('handles empty subject map', () => {
      const subject = new Map<string, number>();
      const peers = new Map([['Defense', [80_000, 82_000, 78_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags).toHaveLength(0);
      expect(result.hasAnomalies).toBe(false);
      expect(result.overallScore).toBe(0);
    });

    it('handles subject dimension not in peers', () => {
      const subject = new Map([['Transportation', 100_000]]);
      const peers = new Map([['Defense', [80_000, 82_000, 78_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags).toHaveLength(0);
    });

    it('handles zero-value subject with non-zero peers', () => {
      // Subject = 0, Median = 81000, MAD = 1000
      // Z = 0.6745 * (0 - 81000) / 1000 = -54.63
      const subject = new Map([['Defense', 0]]);
      const peers = new Map([['Defense', [80_000, 82_000, 78_000, 85_000, 81_000]]]);

      const result = detectAnomalies(subject, peers);

      expect(result.flags).toHaveLength(1);
      expect(result.flags[0]!.isAnomaly).toBe(true);
      expect(result.flags[0]!.modifiedZScore).toBeCloseTo(-54.63, 0);
    });

    it('respects custom minimumPeers', () => {
      const subject = new Map([['Defense', 340_000]]);
      const peers = new Map([
        ['Defense', [80_000, 82_000, 78_000]], // 3 peers
      ]);

      // With minimumPeers=5, should skip
      const result = detectAnomalies(subject, peers, { minimumPeers: 5 });
      expect(result.flags).toHaveLength(0);
      expect(result.meetsMinimumPeers).toBe(false);

      // With minimumPeers=3, should process
      const result2 = detectAnomalies(subject, peers, { minimumPeers: 3 });
      expect(result2.flags).toHaveLength(1);
      expect(result2.meetsMinimumPeers).toBe(true);
    });
  });

  // ── peerComparisonWithAnomalies ─────────────────────────────────

  describe('peerComparisonWithAnomalies', () => {
    it('returns base peer comparison without sector data', () => {
      const result = peerComparisonWithAnomalies(0.5, [0.3, 0.4, 0.6, 0.7, 0.5], 'Test peers');

      expect(result).not.toBeNull();
      expect(result!.value).toBe(0.5);
      expect(result!.peerGroupLabel).toBe('Test peers');
      expect(result!.percentileRank).toBeDefined();
      expect(result!.anomalies).toBeUndefined();
    });

    it('attaches anomaly results when sector data provided', () => {
      const result = peerComparisonWithAnomalies(0.5, [0.3, 0.4, 0.6, 0.7, 0.5], 'Test peers', {
        subject: new Map([['Defense', 340_000]]),
        peers: new Map([['Defense', [80_000, 82_000, 78_000, 85_000, 81_000]]]),
      });

      expect(result).not.toBeNull();
      expect(result!.anomalies).toBeDefined();
      expect(result!.anomalies!.method).toBe('modified-z-score');
      expect(result!.anomalies!.hasAnomalies).toBe(true);
      expect(result!.anomalies!.flags[0]!.modifiedZScore).toBeCloseTo(174.7, 0);
    });

    it('returns result with lowPeerCount when 2-4 peers', () => {
      const result = peerComparisonWithAnomalies(
        0.5,
        [0.3, 0.4], // Below MIN_PEERS but >= 2
        'Test peers'
      );

      expect(result).not.toBeNull();
      expect(result!.lowPeerCount).toBe(true);
      expect(result!.peerCount).toBe(2);
    });

    it('returns null when fewer than 2 peers', () => {
      const result = peerComparisonWithAnomalies(
        0.5,
        [0.3], // Below hard floor of 2
        'Test peers'
      );

      expect(result).toBeNull();
    });

    it('preserves base peer comparison fields when anomalies attached', () => {
      const result = peerComparisonWithAnomalies(0.8, [0.3, 0.4, 0.6, 0.7, 0.5], 'Test peers', {
        subject: new Map([['Health', 83_000]]),
        peers: new Map([['Health', [80_000, 82_000, 78_000, 85_000, 81_000]]]),
      });

      expect(result).not.toBeNull();
      expect(result!.value).toBe(0.8);
      expect(result!.peerGroupLabel).toBe('Test peers');
      expect(result!.peerCount).toBe(5);
      // No anomalies for normal-range value
      expect(result!.anomalies!.hasAnomalies).toBe(false);
    });
  });
});
