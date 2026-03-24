/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const originalEnv = process.env;

import { RegulationsGovService } from '@/lib/data-sources/regulations-gov-service';

describe('RegulationsGovService', () => {
  let service: RegulationsGovService;

  beforeEach(() => {
    service = new RegulationsGovService();
    jest.clearAllMocks();
    process.env = { ...originalEnv, DATA_GOV_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('searchDocuments', () => {
    it('searches and extracts documents from JSON:API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'EPA-HQ-OAR-2021-0317-0001',
              type: 'documents',
              attributes: {
                documentId: 'EPA-HQ-OAR-2021-0317-0001',
                documentType: 'Proposed Rule',
                title: 'Clean Air Standards',
                agencyId: 'EPA',
                docketId: 'EPA-HQ-OAR-2021-0317',
                commentStartDate: '2025-01-01',
                commentEndDate: '2025-03-01',
                postedDate: '2025-01-01',
                lastModifiedDate: '2025-01-15',
                objectId: 'obj-1',
                withdrawn: false,
              },
            },
          ],
          meta: { totalElements: 1, totalPages: 1 },
        }),
      });

      const docs = await service.searchDocuments({ agencyId: 'EPA' });

      expect(docs).toHaveLength(1);
      expect(docs[0]?.documentId).toBe('EPA-HQ-OAR-2021-0317-0001');
      expect(docs[0]?.agencyId).toBe('EPA');
      expect(docs[0]?.type).toBe('documents');
    });

    it('returns empty when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.DATA_GOV_API_KEY;

      const docs = await service.searchDocuments({ agencyId: 'EPA' });
      expect(docs).toEqual([]);
    });

    it('returns empty on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const docs = await service.searchDocuments({ agencyId: 'EPA' });
      expect(docs).toEqual([]);
    });

    it('builds query params from filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: {} }),
      });

      await service.searchDocuments({
        agencyId: 'EPA',
        documentType: 'Proposed Rule',
        searchTerm: 'clean air',
        pageSize: 10,
        pageNumber: 2,
      });

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('filter%5BagencyId%5D=EPA');
      expect(calledUrl).toContain('filter%5BdocumentType%5D=Proposed+Rule');
      expect(calledUrl).toContain('filter%5BsearchTerm%5D=clean+air');
      expect(calledUrl).toContain('page%5Bsize%5D=10');
      expect(calledUrl).toContain('page%5Bnumber%5D=2');
    });
  });

  describe('getDocument', () => {
    it('fetches a single document', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'EPA-HQ-OAR-2021-0317-0001',
            type: 'documents',
            attributes: {
              documentId: 'EPA-HQ-OAR-2021-0317-0001',
              documentType: 'Proposed Rule',
              title: 'Clean Air Standards',
              agencyId: 'EPA',
              docketId: 'EPA-HQ-OAR-2021-0317',
              abstract: 'Updates to clean air standards',
              openForComment: true,
              commentCount: 1500,
              postedDate: '2025-01-01',
              lastModifiedDate: '2025-01-15',
              objectId: 'obj-1',
              withdrawn: false,
            },
          },
        }),
      });

      const doc = await service.getDocument('EPA-HQ-OAR-2021-0317-0001');

      expect(doc).not.toBeNull();
      expect(doc?.title).toBe('Clean Air Standards');
      expect(doc?.commentCount).toBe(1500);
    });

    it('returns null for 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const doc = await service.getDocument('NONEXISTENT');
      expect(doc).toBeNull();
    });
  });

  describe('getComments', () => {
    it('fetches comments for a docket', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'comment-1',
              type: 'comments',
              attributes: {
                commentId: 'EPA-HQ-OAR-2021-0317-0500',
                documentId: 'EPA-HQ-OAR-2021-0317-0001',
                docketId: 'EPA-HQ-OAR-2021-0317',
                agencyId: 'EPA',
                title: 'Public Comment on Clean Air',
                postedDate: '2025-02-01',
                submitterType: 'Individual',
                organization: null,
                category: null,
                withdrawn: false,
              },
            },
          ],
          meta: { totalElements: 150, totalPages: 6 },
        }),
      });

      const result = await service.getComments('EPA-HQ-OAR-2021-0317');

      expect(result.comments).toHaveLength(1);
      expect(result.total).toBe(150);
      expect(result.totalPages).toBe(6);
      expect(result.comments[0]?.submitterType).toBe('Individual');
    });

    it('returns empty when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.DATA_GOV_API_KEY;

      const result = await service.getComments('test-docket');
      expect(result.comments).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getCommentStats', () => {
    it('aggregates comment statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'c1',
              type: 'comments',
              attributes: {
                commentId: 'c1',
                documentId: 'd1',
                docketId: 'dk1',
                agencyId: 'EPA',
                title: 'Comment 1',
                postedDate: '2025-01-01',
                submitterType: 'Individual',
                organization: null,
                category: null,
                withdrawn: false,
              },
            },
            {
              id: 'c2',
              type: 'comments',
              attributes: {
                commentId: 'c2',
                documentId: 'd1',
                docketId: 'dk1',
                agencyId: 'EPA',
                title: 'Comment 2',
                postedDate: '2025-01-02',
                submitterType: 'Organization',
                organization: 'Green Corp',
                category: null,
                withdrawn: false,
              },
            },
          ],
          meta: { totalElements: 500 },
        }),
      });

      const stats = await service.getCommentStats('dk1');

      expect(stats).not.toBeNull();
      expect(stats?.total).toBe(500);
      expect(stats?.bySubmitterType['Individual']).toBe(1);
      expect(stats?.bySubmitterType['Organization']).toBe(1);
    });

    it('returns null when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.DATA_GOV_API_KEY;

      const stats = await service.getCommentStats('test');
      expect(stats).toBeNull();
    });
  });

  describe('getDocket', () => {
    it('fetches a docket', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'EPA-HQ-OAR-2021-0317',
            type: 'dockets',
            attributes: {
              docketId: 'EPA-HQ-OAR-2021-0317',
              agencyId: 'EPA',
              title: 'Clean Air Standards Rulemaking',
              docketType: 'Rulemaking',
              lastModifiedDate: '2025-01-15',
              objectId: 'obj-1',
            },
          },
        }),
      });

      const docket = await service.getDocket('EPA-HQ-OAR-2021-0317');

      expect(docket).not.toBeNull();
      expect(docket?.docketType).toBe('Rulemaking');
      expect(docket?.agencyId).toBe('EPA');
    });

    it('returns null for 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const docket = await service.getDocket('NONEXISTENT');
      expect(docket).toBeNull();
    });
  });

  describe('searchByRIN', () => {
    it('delegates to searchDocuments with RIN as searchTerm', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'doc-1',
              type: 'documents',
              attributes: {
                documentId: 'EPA-HQ-2025-0001',
                documentType: 'Rule',
                title: 'Final Rule for RIN',
                agencyId: 'EPA',
                docketId: 'EPA-HQ-2025',
                commentStartDate: null,
                commentEndDate: null,
                postedDate: '2025-03-01',
                lastModifiedDate: '2025-03-01',
                objectId: 'obj-rin',
                withdrawn: false,
              },
            },
          ],
          meta: { totalElements: 1, totalPages: 1 },
        }),
      });

      const docs = await service.searchByRIN('2060-A001');

      expect(docs).toHaveLength(1);
      expect(docs[0]?.title).toBe('Final Rule for RIN');
      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('2060-A001');
    });
  });

  describe('getDocketDocuments', () => {
    it('fetches documents filtered by docketId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'doc-1',
              type: 'documents',
              attributes: {
                documentId: 'EPA-HQ-2025-0001',
                documentType: 'Proposed Rule',
                title: 'Proposed Rule in Docket',
                agencyId: 'EPA',
                docketId: 'EPA-HQ-2025',
                commentStartDate: '2025-01-01',
                commentEndDate: '2025-03-01',
                postedDate: '2025-01-01',
                lastModifiedDate: '2025-01-01',
                objectId: 'obj-dk',
                withdrawn: false,
              },
            },
          ],
          meta: { totalElements: 1 },
        }),
      });

      const docs = await service.getDocketDocuments('EPA-HQ-2025');
      expect(docs).toHaveLength(1);
      expect(docs[0]?.docketId).toBe('EPA-HQ-2025');
    });
  });

  describe('getRuleLifecycle', () => {
    it('constructs lifecycle from docket and its documents', async () => {
      // getDocket call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'EPA-HQ-2025',
            type: 'dockets',
            attributes: {
              docketId: 'EPA-HQ-2025',
              agencyId: 'EPA',
              title: 'Clean Water Rulemaking',
              docketType: 'Rulemaking',
              lastModifiedDate: '2025-03-01',
              objectId: 'obj-1',
            },
          },
        }),
      });

      // getDocketDocuments call — searchDocuments
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'doc-pr',
              type: 'documents',
              attributes: {
                documentId: 'EPA-HQ-2025-PR',
                documentType: 'Proposed Rule',
                title: 'Proposed Clean Water Rule',
                agencyId: 'EPA',
                docketId: 'EPA-HQ-2025',
                commentStartDate: '2025-01-01',
                commentEndDate: '2025-02-01',
                postedDate: '2025-01-01',
                lastModifiedDate: '2025-01-01',
                objectId: 'obj-pr',
                withdrawn: false,
              },
            },
            {
              id: 'doc-fr',
              type: 'documents',
              attributes: {
                documentId: 'EPA-HQ-2025-FR',
                documentType: 'Rule',
                title: 'Final Clean Water Rule',
                agencyId: 'EPA',
                docketId: 'EPA-HQ-2025',
                commentStartDate: null,
                commentEndDate: null,
                postedDate: '2025-03-01',
                lastModifiedDate: '2025-03-01',
                objectId: 'obj-fr',
                withdrawn: false,
              },
            },
          ],
          meta: { totalElements: 2 },
        }),
      });

      // getDocument detail call (for RIN)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'doc-pr',
            type: 'documents',
            attributes: {
              documentId: 'EPA-HQ-2025-PR',
              documentType: 'Proposed Rule',
              title: 'Proposed Clean Water Rule',
              agencyId: 'EPA',
              docketId: 'EPA-HQ-2025',
              rin: '2040-AF00',
              commentCount: 500,
              postedDate: '2025-01-01',
              lastModifiedDate: '2025-01-01',
              objectId: 'obj-pr',
              withdrawn: false,
            },
          },
        }),
      });

      // getCommentStats call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'c1',
              type: 'comments',
              attributes: {
                commentId: 'c1',
                documentId: 'd1',
                docketId: 'EPA-HQ-2025',
                agencyId: 'EPA',
                title: 'Comment',
                postedDate: '2025-01-15',
                submitterType: 'Individual',
                organization: null,
                category: null,
                withdrawn: false,
              },
            },
          ],
          meta: { totalElements: 300 },
        }),
      });

      const lifecycle = await service.getRuleLifecycle('EPA-HQ-2025');

      expect(lifecycle).not.toBeNull();
      expect(lifecycle?.docketId).toBe('EPA-HQ-2025');
      expect(lifecycle?.status).toBe('final');
      expect(lifecycle?.rin).toBe('2040-AF00');
      expect(lifecycle?.totalComments).toBe(300);
      expect(lifecycle?.proposedDate).toBe('2025-01-01');
      expect(lifecycle?.finalRuleDate).toBe('2025-03-01');
    });

    it('returns null when docket not found', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const lifecycle = await service.getRuleLifecycle('NONEXISTENT');
      expect(lifecycle).toBeNull();
    });
  });

  describe('getOrganizationComments', () => {
    it('fetches and filters comments by organization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'c1',
              type: 'comments',
              attributes: {
                commentId: 'c1',
                documentId: 'd1',
                docketId: 'EPA-HQ-2025',
                agencyId: 'EPA',
                title: 'Comment from Green Corp',
                postedDate: '2025-02-01',
                submitterType: 'Organization',
                organization: 'Green Corp International',
                category: null,
                withdrawn: false,
              },
            },
            {
              id: 'c2',
              type: 'comments',
              attributes: {
                commentId: 'c2',
                documentId: 'd1',
                docketId: 'EPA-HQ-2025',
                agencyId: 'EPA',
                title: 'Comment from other org',
                postedDate: '2025-02-02',
                submitterType: 'Organization',
                organization: 'Other Industries',
                category: null,
                withdrawn: false,
              },
            },
          ],
          meta: { totalElements: 2 },
        }),
      });

      const result = await service.getOrganizationComments('EPA-HQ-2025', 'Green Corp');

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]?.organization).toContain('Green Corp');
    });

    it('returns empty when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.DATA_GOV_API_KEY;

      const result = await service.getOrganizationComments('test', 'org');
      expect(result.comments).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
