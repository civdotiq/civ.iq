/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for fec-api-service.ts
 *
 * Tests the classifyPACType function and key service methods.
 * External API calls are mocked.
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

jest.mock('@/lib/data/pac-acronyms', () => ({
  PAC_ACRONYMS: {},
}));

process.env.FEC_API_KEY = 'test-key';

import { classifyPACType, FECApiService } from '@/lib/fec/fec-api-service';

type FetchMock = jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

function mockFetchResponses(responses: Array<{ ok?: boolean; status?: number; body: unknown }>) {
  const fetchMock = jest.fn() as unknown as FetchMock;
  responses.forEach(r => {
    fetchMock.mockImplementationOnce(async () => {
      const status = r.status ?? (r.ok === false ? 500 : 200);
      return {
        ok: r.ok ?? status < 400,
        status,
        statusText: status < 400 ? 'OK' : 'ERR',
        headers: new Headers(),
        json: async () => r.body,
      } as unknown as Response;
    });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('fec-api-service', () => {
  describe('classifyPACType', () => {
    it('classifies Super PACs (Independent Expenditure-Only)', () => {
      expect(classifyPACType('O', 'B')).toBe('superPac');
      expect(classifyPACType('O', '')).toBe('superPac');
    });

    it('classifies Leadership PACs', () => {
      expect(classifyPACType('N', 'D')).toBe('leadership');
      expect(classifyPACType('Q', 'J')).toBe('leadership');
    });

    it('classifies Hybrid PACs', () => {
      expect(classifyPACType('N', 'B')).toBe('hybrid');
    });

    it('classifies Traditional PACs', () => {
      expect(classifyPACType('N', 'U')).toBe('traditional');
      expect(classifyPACType('Q', 'U')).toBe('traditional');
    });

    it('returns null for unrecognized types', () => {
      expect(classifyPACType('X', 'Y')).toBeNull();
      expect(classifyPACType('', '')).toBeNull();
    });

    it('prioritizes Super PAC over other designations', () => {
      // Type 'O' = Super PAC regardless of designation
      expect(classifyPACType('O', 'D')).toBe('superPac');
    });

    it('prioritizes Leadership designation over Traditional type', () => {
      // Designation 'D' = Leadership even if type is traditional
      expect(classifyPACType('N', 'D')).toBe('leadership');
    });
  });

  describe('getAllContributions (last_indexes cursor)', () => {
    // Stub the (expensive) committee resolution so we only exercise the
    // pagination/coverage logic here.
    function withStubbedCommitteeIds(ids: string[]) {
      const spy = jest
        .spyOn(FECApiService.prototype, 'findCandidateCommitteeIds')
        .mockResolvedValue(ids);
      return spy;
    }

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('follows the last_indexes cursor until exhaustion and reports coverage', async () => {
      withStubbedCommitteeIds(['C00001']);
      const makeRow = (i: number) => ({
        contributor_name: `Donor ${i}`,
        contributor_city: 'NYC',
        contributor_state: 'NY',
        contributor_zip: '10001',
        contributor_employer: 'Acme',
        contributor_occupation: 'Engineer',
        contribution_receipt_amount: 100 - i,
        contribution_receipt_date: '2024-01-01',
        committee_name: 'Test',
        candidate_id: 'H0XX00000',
        file_number: 1,
        line_number: '11A',
      });
      mockFetchResponses([
        // Up-front estimatedTotal probe for the single committee
        {
          body: {
            api_version: '1.0',
            pagination: { page: 1, pages: 3, per_page: 1, count: 3 },
            results: [makeRow(0)],
          },
        },
        // Page 1
        {
          body: {
            api_version: '1.0',
            pagination: {
              page: 1,
              pages: 2,
              per_page: 2,
              count: 3,
              last_indexes: { last_index: '2', last_contribution_receipt_amount: '99' },
            },
            results: [makeRow(0), makeRow(1)],
          },
        },
        // Page 2
        {
          body: {
            api_version: '1.0',
            pagination: {
              page: 2,
              pages: 2,
              per_page: 2,
              count: 3,
              last_indexes: null,
            },
            results: [makeRow(2)],
          },
        },
      ]);

      const service = new FECApiService();
      const result = await service.getAllContributions('H0XX00000', 2024, {
        limit: 10,
        perPage: 2,
      });

      expect(result.contributions).toHaveLength(3);
      expect(result.coverage).toEqual({
        fetched: 3,
        estimatedTotal: 3,
        coveragePercent: 100,
        cappedAt: null,
        cursorExhausted: true,
      });

      // Call ordering: [probe, page1, page2]. The page-2 URL must echo the
      // last_indexes values returned on page 1.
      const page2Url = (global.fetch as jest.Mock).mock.calls[2]?.[0] as string;
      expect(page2Url).toContain('last_index=2');
      expect(page2Url).toContain('last_contribution_receipt_amount=99');
    });

    it('computes estimatedTotal across all committees via up-front probes', async () => {
      // Even if the caller-provided limit stops pagination before we touch
      // the second committee, the denominator should still reflect the full
      // universe: 200 (committee A) + 50 (committee B) = 250.
      withStubbedCommitteeIds(['C_A', 'C_B']);
      const row = {
        contributor_name: 'Donor',
        contributor_city: '',
        contributor_state: '',
        contributor_zip: '',
        contributor_employer: '',
        contributor_occupation: '',
        contribution_receipt_amount: 50,
        contribution_receipt_date: '2024-01-01',
        committee_name: '',
        candidate_id: 'H0XX00000',
        file_number: 1,
        line_number: '11A',
      };
      mockFetchResponses([
        // Probe C_A
        { body: { api_version: '1.0', pagination: { count: 200 }, results: [row] } },
        // Probe C_B
        { body: { api_version: '1.0', pagination: { count: 50 }, results: [row] } },
        // Pagination: one page against C_A then cap hits
        {
          body: {
            api_version: '1.0',
            pagination: { count: 200, last_indexes: null },
            results: [row],
          },
        },
      ]);

      const service = new FECApiService();
      const result = await service.getAllContributions('H0XX00000', 2024, {
        limit: 1,
        perPage: 1,
      });

      expect(result.coverage.estimatedTotal).toBe(250);
      expect(result.coverage.fetched).toBe(1);
    });

    it('caps at the caller-provided limit and marks cappedAt', async () => {
      withStubbedCommitteeIds(['C00001']);
      const row = {
        contributor_name: 'Donor',
        contributor_city: '',
        contributor_state: '',
        contributor_zip: '',
        contributor_employer: '',
        contributor_occupation: '',
        contribution_receipt_amount: 50,
        contribution_receipt_date: '2024-01-01',
        committee_name: '',
        candidate_id: 'H0XX00000',
        file_number: 1,
        line_number: '11A',
      };
      mockFetchResponses([
        // Probe call
        {
          body: {
            api_version: '1.0',
            pagination: { count: 100 },
            results: [row],
          },
        },
        // Page 1
        {
          body: {
            api_version: '1.0',
            pagination: {
              page: 1,
              pages: 50,
              per_page: 2,
              count: 100,
              last_indexes: { last_index: '1', last_contribution_receipt_amount: '50' },
            },
            results: [row, row],
          },
        },
        // Page 2
        {
          body: {
            api_version: '1.0',
            pagination: {
              page: 2,
              pages: 50,
              per_page: 2,
              count: 100,
              last_indexes: { last_index: '2', last_contribution_receipt_amount: '50' },
            },
            results: [row, row],
          },
        },
      ]);

      const service = new FECApiService();
      const result = await service.getAllContributions('H0XX00000', 2024, {
        limit: 3,
        perPage: 2,
      });

      expect(result.contributions).toHaveLength(3);
      expect(result.coverage.cappedAt).toBe(3);
      expect(result.coverage.estimatedTotal).toBe(100);
      // 3 of 100 = 3.0% coverage
      expect(result.coverage.coveragePercent).toBeCloseTo(3.0, 1);
    });

    it('returns empty coverage when no committees are found', async () => {
      withStubbedCommitteeIds([]);
      const service = new FECApiService();
      const result = await service.getAllContributions('H0XX00000', 2024, { limit: 100 });
      expect(result.contributions).toHaveLength(0);
      expect(result.coverage.fetched).toBe(0);
      expect(result.coverage.estimatedTotal).toBe(0);
      expect(result.coverage.coveragePercent).toBe(0);
    });
  });
});
