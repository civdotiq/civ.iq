/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for cosine similarity and sector classification.
 * All pure math — no mocks, no ML dependencies.
 */

import {
  cosineSimilarity,
  classifySectors,
  DEFAULT_THRESHOLD,
  DEFAULT_MAX_SECTORS,
} from '@/lib/intelligence/embeddings/cosine-similarity';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { SectorEmbeddingEntry } from '@/lib/intelligence/embeddings/types';

describe('cosine similarity', () => {
  describe('cosineSimilarity', () => {
    it('returns 1.0 for identical vectors', () => {
      const v = [0.5, 0.5, 0.5, 0.5];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 10);
    });

    it('returns -1.0 for opposite vectors', () => {
      const a = [1, 0, 0];
      const b = [-1, 0, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 10);
    });

    it('returns 0.0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 10);
    });

    it('returns correct value for known vectors', () => {
      // a = [3, 4], b = [4, 3]
      // dot = 12 + 12 = 24
      // |a| = 5, |b| = 5
      // cosine = 24/25 = 0.96
      const a = [3, 4];
      const b = [4, 3];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.96, 2);
    });

    it('returns 1.0 for parallel vectors of different magnitude', () => {
      const a = [1, 2, 3];
      const b = [2, 4, 6];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 10);
    });

    it('handles normalized vectors (dot product = cosine)', () => {
      // Pre-normalized vectors (magnitude = 1)
      const a = [1 / Math.sqrt(2), 1 / Math.sqrt(2)];
      const b = [1, 0];
      // cos(45°) = 1/sqrt(2) ≈ 0.7071
      expect(cosineSimilarity(a, b)).toBeCloseTo(1 / Math.sqrt(2), 5);
    });

    it('returns 0 for empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('returns 0 for zero vectors', () => {
      expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
    });

    it('returns 0 when one vector is zero', () => {
      expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
    });

    it('handles mismatched lengths (uses shorter)', () => {
      const a = [1, 0];
      const b = [1, 0, 0, 0, 0];
      // Only first 2 elements compared: dot=1, |a|=1, |b|=1 → 1.0
      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 10);
    });

    it('works with Float32Array', () => {
      const a = new Float32Array([0.5, 0.5, 0.5, 0.5]);
      const b = [0.5, 0.5, 0.5, 0.5];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
    });
  });

  describe('classifySectors', () => {
    // Create synthetic sector embeddings for testing.
    // Each sector gets a unit vector along a different axis.
    const sectorEmbeddings: SectorEmbeddingEntry[] = [
      { sector: IndustrySector.DEFENSE, embedding: [1, 0, 0, 0] },
      { sector: IndustrySector.HEALTH, embedding: [0, 1, 0, 0] },
      { sector: IndustrySector.ENERGY_NATURAL_RESOURCES, embedding: [0, 0, 1, 0] },
      { sector: IndustrySector.LABOR, embedding: [0, 0, 0, 1] },
    ];

    it('returns sectors above threshold sorted by confidence', () => {
      // Bill embedding close to DEFENSE and somewhat to HEALTH
      const billEmbedding = [0.8, 0.4, 0.1, 0.05];
      const results = classifySectors(billEmbedding, sectorEmbeddings, {
        threshold: 0.1,
      });

      expect(results.length).toBeGreaterThanOrEqual(2);
      // First result should be DEFENSE (highest similarity)
      expect(results[0]!.sector).toBe(IndustrySector.DEFENSE);
      expect(results[0]!.confidence).toBeGreaterThan(results[1]!.confidence);
    });

    it('filters out sectors below threshold', () => {
      // Bill embedding aligned with DEFENSE only
      const billEmbedding = [1, 0, 0, 0];
      const results = classifySectors(billEmbedding, sectorEmbeddings, {
        threshold: 0.5,
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.sector).toBe(IndustrySector.DEFENSE);
      expect(results[0]!.confidence).toBeCloseTo(1.0, 5);
    });

    it('caps at maxSectors', () => {
      // Bill embedding has similarity to all sectors
      const billEmbedding = [0.5, 0.5, 0.5, 0.5];
      const results = classifySectors(billEmbedding, sectorEmbeddings, {
        threshold: 0.1,
        maxSectors: 2,
      });

      expect(results).toHaveLength(2);
    });

    it('returns empty array when all below threshold', () => {
      const billEmbedding = [0.1, 0.1, 0.1, 0.1];
      const results = classifySectors(billEmbedding, sectorEmbeddings, {
        threshold: 0.99,
      });

      expect(results).toEqual([]);
    });

    it('uses default threshold and maxSectors', () => {
      expect(DEFAULT_THRESHOLD).toBe(0.56);
      expect(DEFAULT_MAX_SECTORS).toBe(3);

      // With default threshold of 0.56, only high-similarity sectors pass
      const billEmbedding = [0.9, 0.3, 0.1, 0.05];
      const results = classifySectors(billEmbedding, sectorEmbeddings);

      // DEFENSE should pass (high similarity ~0.94)
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0]!.sector).toBe(IndustrySector.DEFENSE);
    });

    it('handles empty sector embeddings', () => {
      const results = classifySectors([1, 0, 0], []);
      expect(results).toEqual([]);
    });

    it('handles empty bill embedding', () => {
      const results = classifySectors([], sectorEmbeddings);
      expect(results).toEqual([]);
    });

    it('returns correct confidence values', () => {
      // Unit vector along HEALTH axis
      const billEmbedding = [0, 1, 0, 0];
      const results = classifySectors(billEmbedding, sectorEmbeddings, {
        threshold: 0.5,
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.sector).toBe(IndustrySector.HEALTH);
      expect(results[0]!.confidence).toBeCloseTo(1.0, 5);
    });
  });
});
