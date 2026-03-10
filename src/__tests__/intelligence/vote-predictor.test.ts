/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  buildFeatureVector,
  featureVectorToArray,
  _resetForTesting,
} from '@/lib/intelligence/ml/vote-predictor';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';

describe('Vote Predictor', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  describe('buildFeatureVector', () => {
    const donorProfile: Record<string, number> = {
      [IndustrySector.DEFENSE]: 0.3,
      [IndustrySector.HEALTH]: 0.2,
      [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE]: 0.15,
      [IndustrySector.ENERGY_NATURAL_RESOURCES]: 0.1,
      [IndustrySector.AGRIBUSINESS]: 0.05,
      [IndustrySector.COMMUNICATIONS_ELECTRONICS]: 0.05,
      [IndustrySector.CONSTRUCTION]: 0.03,
      [IndustrySector.LAWYERS_LOBBYISTS]: 0.03,
      [IndustrySector.TRANSPORTATION]: 0.03,
      [IndustrySector.MISC_BUSINESS]: 0.03,
      [IndustrySector.LABOR]: 0.02,
      [IndustrySector.IDEOLOGY_SINGLE_ISSUE]: 0.01,
      [IndustrySector.OTHER]: 0.0,
    };

    it('builds feature vector with correct donor-bill overlap', () => {
      const fv = buildFeatureVector(
        donorProfile,
        'R',
        'House',
        10,
        [IndustrySector.DEFENSE, IndustrySector.HEALTH],
        5,
        true
      );

      // donor_bill_overlap = 0.3 (defense) + 0.2 (health) = 0.5
      expect(fv.donorBillOverlap).toBeCloseTo(0.5, 4);
      // max_donor_sector_in_bill = max(0.3, 0.2) = 0.3
      expect(fv.maxDonorSectorInBill).toBeCloseTo(0.3, 4);
    });

    it('sets bill-affects-sectors flags correctly', () => {
      const fv = buildFeatureVector(
        donorProfile,
        'D',
        'Senate',
        4,
        [IndustrySector.DEFENSE],
        12,
        false
      );

      expect(fv.billAffectsSectors[IndustrySector.DEFENSE]).toBe(true);
      expect(fv.billAffectsSectors[IndustrySector.HEALTH]).toBe(false);
    });

    it('handles empty bill sectors', () => {
      const fv = buildFeatureVector(donorProfile, 'I', 'House', 2, [], 0, false);

      expect(fv.donorBillOverlap).toBe(0);
      expect(fv.maxDonorSectorInBill).toBe(0);
    });
  });

  describe('featureVectorToArray', () => {
    it('produces correct-length array', () => {
      const fv = buildFeatureVector(
        { [IndustrySector.DEFENSE]: 1.0 },
        'R',
        'House',
        10,
        [IndustrySector.DEFENSE],
        5,
        true
      );

      const arr = featureVectorToArray(fv);

      // 13 donor + 2 party + 1 chamber + 1 years + 13 bill + 1 cosponsor + 1 same_party + 2 interaction = 34
      expect(arr.length).toBe(34);
    });

    it('encodes party correctly', () => {
      const fvR = buildFeatureVector({}, 'R', 'House', 0, [], 0, false);
      const fvD = buildFeatureVector({}, 'D', 'House', 0, [], 0, false);
      const fvI = buildFeatureVector({}, 'I', 'House', 0, [], 0, false);

      const arrR = featureVectorToArray(fvR);
      const arrD = featureVectorToArray(fvD);
      const arrI = featureVectorToArray(fvI);

      // party_R at index 13, party_D at index 14
      expect(arrR[13]).toBe(1); // R flag
      expect(arrR[14]).toBe(0); // D flag
      expect(arrD[13]).toBe(0);
      expect(arrD[14]).toBe(1);
      expect(arrI[13]).toBe(0);
      expect(arrI[14]).toBe(0);
    });

    it('encodes chamber correctly', () => {
      const fvHouse = buildFeatureVector({}, 'D', 'House', 0, [], 0, false);
      const fvSenate = buildFeatureVector({}, 'D', 'Senate', 0, [], 0, false);

      const arrHouse = featureVectorToArray(fvHouse);
      const arrSenate = featureVectorToArray(fvSenate);

      // chamber_Senate at index 15
      expect(arrHouse[15]).toBe(0);
      expect(arrSenate[15]).toBe(1);
    });
  });
});
