/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { computeShapFactors } from '@/lib/intelligence/ml/vote-predictor';
import type { VotePredictionModelMetadata } from '@/lib/intelligence/ml/vote-predictor';

describe('SHAP Factor Computation', () => {
  const baseMetadata: VotePredictionModelMetadata = {
    modelVersion: '1.0.0',
    trainedAt: '2025-03-01T00:00:00Z',
    trainingRecords: 5000,
    testAccuracy: 0.78,
    testAUC: 0.85,
    featureNames: [
      'donor_pct_agribusiness',
      'donor_pct_communications',
      'donor_pct_construction',
      'donor_pct_defense',
      'donor_pct_energy',
      'donor_pct_finance',
      'donor_pct_health',
      'donor_pct_lawyers',
      'donor_pct_transportation',
      'donor_pct_misc_business',
      'donor_pct_labor',
      'donor_pct_ideology',
      'donor_pct_other',
      'party_R',
      'party_D',
      'chamber_Senate',
      'years_in_office',
      // 13 bill sectors ...
      'bill_agribusiness',
      'bill_communications',
      'bill_construction',
      'bill_defense',
      'bill_energy',
      'bill_finance',
      'bill_health',
      'bill_lawyers',
      'bill_transportation',
      'bill_misc_business',
      'bill_labor',
      'bill_ideology',
      'bill_other',
      'bill_cosponsor_count',
      'sponsor_same_party',
      'donor_bill_overlap',
      'max_donor_sector_in_bill',
    ],
    predictionThreshold: 0.6,
    topFeatures: [],
    shapFeatures: [
      { feature: 'party_R', meanAbsShap: 0.25 },
      { feature: 'donor_bill_overlap', meanAbsShap: 0.18 },
      { feature: 'donor_pct_defense', meanAbsShap: 0.12 },
      { feature: 'donor_pct_health', meanAbsShap: 0.1 },
      { feature: 'years_in_office', meanAbsShap: 0.08 },
      { feature: 'donor_pct_finance', meanAbsShap: 0.06 },
    ],
  };

  // Build a feature values array matching the feature names
  function makeFeatureValues(overrides: Record<string, number> = {}): number[] {
    const defaults: Record<string, number> = {
      donor_pct_defense: 0.3,
      donor_pct_health: 0.2,
      party_R: 1,
      party_D: 0,
      chamber_Senate: 0,
      years_in_office: 10,
      donor_bill_overlap: 0.5,
      max_donor_sector_in_bill: 0.3,
    };
    const merged = { ...defaults, ...overrides };
    return baseMetadata.featureNames.map(name => merged[name] ?? 0);
  }

  it('returns up to 5 active SHAP factors', () => {
    const featureValues = makeFeatureValues();
    const factors = computeShapFactors(
      baseMetadata,
      featureValues,
      baseMetadata.featureNames,
      0.75
    );
    expect(factors.length).toBeLessThanOrEqual(5);
    expect(factors.length).toBeGreaterThan(0);
  });

  it('filters out neutral (zero-value) features', () => {
    const featureValues = makeFeatureValues();
    const factors = computeShapFactors(
      baseMetadata,
      featureValues,
      baseMetadata.featureNames,
      0.75
    );
    for (const f of factors) {
      expect(f.direction).not.toBe('neutral');
      expect(f.featureValue).not.toBe(0);
    }
  });

  it('assigns toward_yea direction when prediction is yea', () => {
    const featureValues = makeFeatureValues();
    const factors = computeShapFactors(baseMetadata, featureValues, baseMetadata.featureNames, 0.8);
    const activeFactors = factors.filter(f => f.featureValue !== 0);
    for (const f of activeFactors) {
      expect(f.direction).toBe('toward_yea');
    }
  });

  it('assigns toward_nay direction when prediction is nay', () => {
    const featureValues = makeFeatureValues();
    const factors = computeShapFactors(baseMetadata, featureValues, baseMetadata.featureNames, 0.2);
    const activeFactors = factors.filter(f => f.featureValue !== 0);
    for (const f of activeFactors) {
      expect(f.direction).toBe('toward_nay');
    }
  });

  it('returns empty array when no SHAP features in metadata', () => {
    const noShapMetadata = { ...baseMetadata, shapFeatures: undefined };
    const featureValues = makeFeatureValues();
    const factors = computeShapFactors(
      noShapMetadata,
      featureValues,
      baseMetadata.featureNames,
      0.8
    );
    expect(factors).toEqual([]);
  });

  it('returns empty array when SHAP features array is empty', () => {
    const emptyShapMetadata = { ...baseMetadata, shapFeatures: [] };
    const featureValues = makeFeatureValues();
    const factors = computeShapFactors(
      emptyShapMetadata,
      featureValues,
      baseMetadata.featureNames,
      0.8
    );
    expect(factors).toEqual([]);
  });

  it('sorts factors by importance descending', () => {
    const featureValues = makeFeatureValues();
    const factors = computeShapFactors(
      baseMetadata,
      featureValues,
      baseMetadata.featureNames,
      0.75
    );
    for (let i = 1; i < factors.length; i++) {
      expect(factors[i - 1]!.importance).toBeGreaterThanOrEqual(factors[i]!.importance);
    }
  });

  it('includes correct human labels', () => {
    const featureValues = makeFeatureValues();
    const factors = computeShapFactors(
      baseMetadata,
      featureValues,
      baseMetadata.featureNames,
      0.75
    );
    const partyFactor = factors.find(f => f.feature === 'party_R');
    if (partyFactor) {
      expect(partyFactor.humanLabel).toBe('Republican party');
    }
  });

  it('includes correct feature values from the input', () => {
    const featureValues = makeFeatureValues({ donor_pct_defense: 0.42 });
    const factors = computeShapFactors(
      baseMetadata,
      featureValues,
      baseMetadata.featureNames,
      0.75
    );
    const defenseFactor = factors.find(f => f.feature === 'donor_pct_defense');
    if (defenseFactor) {
      expect(defenseFactor.featureValue).toBeCloseTo(0.42, 4);
    }
  });
});
