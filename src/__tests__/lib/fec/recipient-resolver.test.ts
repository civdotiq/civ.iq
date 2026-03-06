/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for recipient-resolver.ts
 *
 * Tests PAC recipient resolution chain: FEC disbursements → committee info → bioguide mapping.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/services/cache', () => ({
  govCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockGetCommitteeDisbursementsByRecipient = jest.fn();
const mockGetCommitteeInfo = jest.fn();
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getCommitteeDisbursementsByRecipient: (...args: unknown[]) =>
      mockGetCommitteeDisbursementsByRecipient(...args),
    getCommitteeInfo: (...args: unknown[]) => mockGetCommitteeInfo(...args),
  },
}));

const mockGetBioguideFromFEC = jest.fn();
const mockGetMappingByFEC = jest.fn();
jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  getFECIdFromBioguide: jest.fn(),
  getBioguideFromFEC: (...args: unknown[]) => mockGetBioguideFromFEC(...args),
  getMappingByFEC: (...args: unknown[]) => mockGetMappingByFEC(...args),
  bioguideToFECMapping: {},
}));

import { resolveCommitteeRecipients } from '@/lib/fec/recipient-resolver';

describe('recipient-resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves committee recipients from single page', async () => {
    mockGetCommitteeDisbursementsByRecipient.mockResolvedValue({
      results: [
        {
          recipient_id: 'C00123456',
          recipient_name: 'Campaign Committee A',
          total: 50000,
          count: 5,
          memo_total: 0,
          memo_count: 0,
        },
      ],
      pagination: { pages: 1, per_page: 100, count: 1, page: 1 },
    });

    mockGetCommitteeInfo.mockResolvedValue({
      candidate_ids: ['H0CA12345'],
    });

    mockGetBioguideFromFEC.mockReturnValue('A000001');
    mockGetMappingByFEC.mockReturnValue({
      state: 'CA',
      district: '12',
      office: 'H',
    });

    const result = await resolveCommitteeRecipients('C00999999', 2026);

    expect(result).toHaveLength(1);
    expect(result[0].recipientName).toBe('Campaign Committee A');
    expect(result[0].bioguideId).toBe('A000001');
    expect(result[0].totalAmount).toBe(50000);
    expect(result[0].chamber).toBe('House');
    expect(result[0].state).toBe('CA');
  });

  it('handles recipients with no committee ID match', async () => {
    mockGetCommitteeDisbursementsByRecipient.mockResolvedValue({
      results: [
        {
          recipient_id: 'X00000000',
          recipient_name: 'Unknown Entity',
          total: 10000,
          count: 1,
          memo_total: 0,
          memo_count: 0,
        },
      ],
      pagination: { pages: 1, per_page: 100, count: 1, page: 1 },
    });

    const result = await resolveCommitteeRecipients('C00999999', 2026);

    expect(result).toHaveLength(1);
    expect(result[0].bioguideId).toBeNull();
    expect(result[0].totalAmount).toBe(10000);
  });

  it('resolves candidate IDs starting with H/S directly', async () => {
    mockGetCommitteeDisbursementsByRecipient.mockResolvedValue({
      results: [
        {
          recipient_id: 'H0TX01234',
          recipient_name: 'Candidate X',
          total: 25000,
          count: 3,
          memo_total: 0,
          memo_count: 0,
        },
      ],
      pagination: { pages: 1, per_page: 100, count: 1, page: 1 },
    });

    mockGetBioguideFromFEC.mockReturnValue('B000002');
    mockGetMappingByFEC.mockReturnValue(null);

    const result = await resolveCommitteeRecipients('C00999999', 2026);

    expect(result).toHaveLength(1);
    expect(result[0].bioguideId).toBe('B000002');
    expect(result[0].candidateId).toBe('H0TX01234');
  });

  it('detects earmarked contributions', async () => {
    mockGetCommitteeDisbursementsByRecipient.mockResolvedValue({
      results: [
        {
          recipient_id: 'C00111111',
          recipient_name: 'Earmarked Fund',
          total: 30000,
          count: 10,
          memo_total: 5000,
          memo_count: 3,
        },
      ],
      pagination: { pages: 1, per_page: 100, count: 1, page: 1 },
    });

    mockGetCommitteeInfo.mockResolvedValue(null);

    const result = await resolveCommitteeRecipients('C00999999', 2026);

    expect(result[0].isEarmarked).toBe(true);
  });

  it('sorts results by total amount descending', async () => {
    mockGetCommitteeDisbursementsByRecipient.mockResolvedValue({
      results: [
        {
          recipient_id: 'A1',
          recipient_name: 'Small',
          total: 1000,
          count: 1,
          memo_total: 0,
          memo_count: 0,
        },
        {
          recipient_id: 'A2',
          recipient_name: 'Large',
          total: 50000,
          count: 5,
          memo_total: 0,
          memo_count: 0,
        },
        {
          recipient_id: 'A3',
          recipient_name: 'Medium',
          total: 10000,
          count: 2,
          memo_total: 0,
          memo_count: 0,
        },
      ],
      pagination: { pages: 1, per_page: 100, count: 3, page: 1 },
    });

    const result = await resolveCommitteeRecipients('C00999999', 2026);

    expect(result[0].recipientName).toBe('Large');
    expect(result[1].recipientName).toBe('Medium');
    expect(result[2].recipientName).toBe('Small');
  });
});
