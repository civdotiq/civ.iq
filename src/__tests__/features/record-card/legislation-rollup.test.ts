/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the Record Card legislation rollup (pure computation).
 * Fixtures are synthetic test inputs exercising the real classification
 * (mapCongressStatus) — no mocks, no network.
 */

import {
  computeLegislationRollup,
  isCountableBill,
} from '@/features/record-card/legislation-rollup';
import type { ProcessedBill } from '@/services/congress/optimized-congress.service';

const CURRENT = 119;

function bill(overrides: Partial<ProcessedBill>): ProcessedBill {
  return {
    id: 'HR-1',
    number: '1',
    title: 'A bill',
    introducedDate: '2025-03-01',
    status: 'Referred to the Committee on Energy and Commerce.',
    lastAction: 'Referred to the Committee on Energy and Commerce.',
    congress: CURRENT,
    type: 'HR',
    relationship: 'sponsored',
    ...overrides,
  };
}

describe('isCountableBill', () => {
  it('accepts bills and resolutions', () => {
    for (const type of ['HR', 'S', 'HJRES', 'SJRES', 'HCONRES', 'SCONRES', 'HRES', 'SRES']) {
      expect(isCountableBill({ type })).toBe(true);
    }
  });

  it('accepts dotted/spaced type variants', () => {
    expect(isCountableBill({ type: 'H.R.' })).toBe(true);
    expect(isCountableBill({ type: 'S. RES' })).toBe(true);
  });

  it('rejects amendments and unknowns', () => {
    for (const type of ['SAMDT', 'HAMDT', 'SA', 'Unknown', '']) {
      expect(isCountableBill({ type })).toBe(false);
    }
  });
});

describe('computeLegislationRollup', () => {
  it('splits current Congress vs career and classifies statuses', () => {
    const sponsored = [
      // 119th: 1 enacted, 1 reported, 1 referred
      bill({
        status: 'Became Public Law No: 119-24.',
        lastAction: 'Became Public Law No: 119-24.',
      }),
      bill({
        number: '2',
        status: 'Reported by the Committee on Ways and Means. H. Rept. 119-55.',
      }),
      bill({ number: '3' }),
      // Prior congress: 1 enacted, 1 passed house
      bill({ number: '4', congress: 117, status: 'Became Public Law No: 117-9.' }),
      bill({ number: '5', congress: 117, status: 'Passed House by voice vote.' }),
    ];
    const cosponsored = [
      bill({ number: '6', relationship: 'cosponsored', status: 'Became Public Law No: 119-30.' }),
      bill({ number: '7', relationship: 'cosponsored', congress: 118 }),
    ];

    const r = computeLegislationRollup('D000624', sponsored, cosponsored, 2, CURRENT);

    expect(r.current.introduced).toBe(3);
    expect(r.career.introduced).toBe(5);
    expect(r.current.enactedFromSponsored).toBe(1);
    expect(r.career.enactedFromSponsored).toBe(2);
    expect(r.current.enactedFromCosponsored).toBe(1);
    expect(r.current.enacted).toBe(2);
    expect(r.career.enacted).toBe(3);
    // Advanced past committee: enacted + reported (119th sponsored) + enacted cosponsored
    expect(r.current.advancedFromSponsored).toBe(2);
    expect(r.career.advancedFromSponsored).toBe(4); // + prior enacted + passed house
    expect(r.current.cosponsored).toBe(1);
    expect(r.career.cosponsored).toBe(2);
    expect(r.firstTerm).toBe(false);
  });

  it('excludes amendments from every count', () => {
    const sponsored = [
      bill({}),
      bill({ number: 'SA 100', type: 'SAMDT', status: 'Amendment agreed to in Senate.' }),
    ];
    const r = computeLegislationRollup('X000001', sponsored, [], 0, CURRENT);
    expect(r.current.introduced).toBe(1);
    expect(r.career.introduced).toBe(1);
  });

  it('uses the API total for career cosponsored and flags truncation', () => {
    const cosponsored = [bill({ number: '10', relationship: 'cosponsored' })];
    const r = computeLegislationRollup('X000001', [], cosponsored, 4000, CURRENT);

    expect(r.career.cosponsored).toBe(4000);
    expect(r.cosponsoredSample.truncated).toBe(true);
    expect(r.cosponsoredSample.fetched).toBe(1);
    expect(r.cosponsoredSample.apiTotal).toBe(4000);
  });

  it('does not flag truncation when the sample is complete', () => {
    const cosponsored = [
      bill({ number: '10', relationship: 'cosponsored' }),
      bill({ number: '11', relationship: 'cosponsored', congress: 118 }),
    ];
    const r = computeLegislationRollup('X000001', [], cosponsored, 2, CURRENT);
    expect(r.cosponsoredSample.truncated).toBe(false);
    expect(r.career.cosponsored).toBe(2);
  });

  it('marks first-term members for column collapse', () => {
    const sponsored = [bill({}), bill({ number: '2' })];
    const cosponsored = [bill({ number: '3', relationship: 'cosponsored' })];
    const r = computeLegislationRollup('N000001', sponsored, cosponsored, 1, CURRENT);
    expect(r.firstTerm).toBe(true);
  });

  it('picks the most recently introduced enacted bill as the provenance example', () => {
    const sponsored = [
      bill({
        number: '4',
        congress: 117,
        introducedDate: '2021-05-01',
        status: 'Became Public Law No: 117-9.',
        lastAction: 'Became Public Law No: 117-9.',
        title: 'Old Law',
      }),
      bill({
        number: '1219',
        introducedDate: '2025-02-10',
        status: 'Became Public Law No: 119-24.',
        lastAction: 'Became Public Law No: 119-24.',
        title: 'New Law',
      }),
    ];
    const r = computeLegislationRollup('D000624', sponsored, [], 0, CURRENT);
    expect(r.enactedExample?.number).toBe('1219');
    expect(r.enactedExample?.latestAction).toContain('Public Law No: 119-24');
  });

  it('returns zero counts with null example on empty input (caller renders empty state)', () => {
    const r = computeLegislationRollup('X000001', [], [], 0, CURRENT);
    expect(r.career.introduced).toBe(0);
    expect(r.enactedExample).toBeNull();
    expect(r.firstTerm).toBe(true);
  });
});
