/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Profile stat band (getRepresentativeSummary): money comes from the current
 * cycle, and an FEC error reads as unavailable — never as an older cycle's
 * totals or a cached $0.
 */

const mockSummary = jest.fn();
const mockCacheSet = jest.fn();

jest.mock('@/services/cache', () => ({
  govCache: {
    get: async () => null,
    set: (...a: unknown[]) => mockCacheSet(...a),
  },
}));
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: { getFinancialSummary: (...a: unknown[]) => mockSummary(...a) },
}));
jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  bioguideToFECMapping: { C001035: { fecId: 'S6ME00159', name: 'Collins' } },
}));
jest.mock('@/features/record-card/record-card-data', () => ({
  getRecordCardHeadline: async () => null,
}));
jest.mock('@/services/congress/optimized-congress.service', () => ({}));
jest.mock('@/services/congress/bill-response-utils', () => ({ createLegacyResponse: jest.fn() }));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { getRepresentativeSummary } from '@/services/batch/representative-batch.service';
import { getCurrentElectionCycle } from '@/lib/fec/election-cycle';

const CURRENT = getCurrentElectionCycle();

beforeEach(() => {
  mockSummary.mockReset();
  mockCacheSet.mockReset();
});

describe('getRepresentativeSummary finance', () => {
  test('uses the current cycle when it has filings', async () => {
    mockSummary.mockImplementation(async (_id: string, cycle: number) => ({
      receipts: cycle === CURRENT ? 16_200_000 : 1_600_000,
      disbursements: 1,
    }));
    const result = await getRepresentativeSummary('C001035');
    expect(result).toMatchObject({ totalRaised: 16_200_000, financeCycle: CURRENT });
    expect(result.financeUnavailable).toBe(false);
  });

  test('a current-cycle FEC error is unavailable: no older cycle, no $0, not cached', async () => {
    mockSummary.mockImplementation(async (_id: string, cycle: number) => {
      if (cycle === CURRENT) throw new Error('FEC API error: 429');
      return { receipts: 1_600_000, disbursements: 1 };
    });
    const result = await getRepresentativeSummary('C001035');
    expect(result.financeUnavailable).toBe(true);
    expect(result.totalRaised).toBeUndefined();
    expect(result.financeCycle).toBeUndefined();
    // Neither the summary nor the batch response wrapping the failure is cached.
    const writes = mockCacheSet.mock.calls.map(c => String(c[0]));
    expect(writes.filter(k => k.startsWith('representative-summary'))).toHaveLength(0);
    expect(writes.filter(k => k.startsWith('batch:'))).toHaveLength(0);
  });
});
