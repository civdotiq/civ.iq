/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getDataGovApiKey, dataGovRateLimitedFetch } from './data-gov-rate-limiter';
import type {
  RegDocument,
  RegDocumentDetail,
  RegComment,
  RegDocket,
  RegCommentStats,
  RegDocFilters,
  RegAPIResponse,
  RegAPISingleResponse,
  RuleLifecycle,
} from '@/types/regulations-gov';

const BASE_URL = 'https://api.regulations.gov/v4';

async function rateLimitedFetch(url: string, apiKey: string): Promise<Response> {
  return dataGovRateLimitedFetch(url, {
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/vnd.api+json',
    },
  });
}

/** Extract attributes from JSON:API data array */
function extractDocuments(data: RegAPIResponse<Omit<RegDocument, 'id' | 'type'>>): RegDocument[] {
  return (data.data ?? []).map(item => ({
    id: item.id,
    type: 'documents' as const,
    ...item.attributes,
  }));
}

function extractComments(data: RegAPIResponse<Omit<RegComment, 'id' | 'type'>>): RegComment[] {
  return (data.data ?? []).map(item => ({
    id: item.id,
    type: 'comments' as const,
    ...item.attributes,
  }));
}

export class RegulationsGovService {
  /**
   * Search for documents on Regulations.gov
   */
  async searchDocuments(filters: RegDocFilters): Promise<RegDocument[]> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return [];
    }

    const params = new URLSearchParams();
    if (filters.agencyId) params.set('filter[agencyId]', filters.agencyId);
    if (filters.docketId) params.set('filter[docketId]', filters.docketId);
    if (filters.documentType) params.set('filter[documentType]', filters.documentType);
    if (filters.searchTerm) params.set('filter[searchTerm]', filters.searchTerm);
    if (filters.postedDateFrom) params.set('filter[postedDate][ge]', filters.postedDateFrom);
    if (filters.postedDateTo) params.set('filter[postedDate][le]', filters.postedDateTo);
    if (filters.commentEndDateFrom) params.set('filter[commentEndDate][ge]', filters.commentEndDateFrom);
    if (filters.commentEndDateTo) params.set('filter[commentEndDate][le]', filters.commentEndDateTo);
    params.set('page[size]', String(filters.pageSize ?? 25));
    params.set('page[number]', String(filters.pageNumber ?? 1));
    if (filters.sortBy) params.set('sort', `${filters.sortOrder === 'ASC' ? '' : '-'}${filters.sortBy}`);

    const cacheKey = `regs-docs:${params.toString()}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${BASE_URL}/documents?${params.toString()}`;
          logger.info('Searching Regulations.gov documents', { filters });

          const response = await rateLimitedFetch(url, apiKey);
          if (!response.ok) {
            throw new Error(`Regulations.gov API returned ${response.status}`);
          }

          const data = await response.json();
          return extractDocuments(data);
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('Regulations.gov document search failed', error as Error);
      return [];
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocument(documentId: string): Promise<RegDocumentDetail | null> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return null;
    }

    const cacheKey = `regs-doc:${documentId}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${BASE_URL}/documents/${encodeURIComponent(documentId)}`;
          logger.info('Fetching Regulations.gov document', { documentId });

          const response = await rateLimitedFetch(url, apiKey);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Regulations.gov API returned ${response.status}`);
          }

          const data: RegAPISingleResponse<Omit<RegDocumentDetail, 'id' | 'type'>> =
            await response.json();

          return {
            id: data.data.id,
            type: 'documents' as const,
            ...data.data.attributes,
          } as RegDocumentDetail;
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('Failed to fetch Regulations.gov document', error as Error, { documentId });
      return null;
    }
  }

  /**
   * Get public comments for a docket
   */
  async getComments(
    docketId: string,
    opts?: { pageSize?: number; pageNumber?: number; sortBy?: string }
  ): Promise<{ comments: RegComment[]; total: number; totalPages: number }> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return { comments: [], total: 0, totalPages: 0 };
    }

    const pageSize = opts?.pageSize ?? 25;
    const pageNumber = opts?.pageNumber ?? 1;
    const cacheKey = `regs-comments:${docketId}:${pageSize}:${pageNumber}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            'filter[docketId]': docketId,
            'page[size]': String(pageSize),
            'page[number]': String(pageNumber),
            sort: opts?.sortBy ?? '-postedDate',
          });

          const url = `${BASE_URL}/comments?${params.toString()}`;
          logger.info('Fetching Regulations.gov comments', { docketId, pageNumber });

          const response = await rateLimitedFetch(url, apiKey);
          if (!response.ok) {
            throw new Error(`Regulations.gov API returned ${response.status}`);
          }

          const data = await response.json();
          const comments = extractComments(data);
          const meta = data.meta;

          return {
            comments,
            total: meta?.totalElements ?? comments.length,
            totalPages: meta?.totalPages ?? 1,
          };
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('Failed to fetch Regulations.gov comments', error as Error, { docketId });
      return { comments: [], total: 0, totalPages: 0 };
    }
  }

  /**
   * Get comment statistics for a docket
   */
  async getCommentStats(docketId: string): Promise<RegCommentStats | null> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) return null;

    const cacheKey = `regs-comment-stats:${docketId}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          // Fetch first page to get total count from meta
          const params = new URLSearchParams({
            'filter[docketId]': docketId,
            'page[size]': '25',
            'page[number]': '1',
          });

          const url = `${BASE_URL}/comments?${params.toString()}`;
          logger.info('Fetching comment stats', { docketId });

          const response = await rateLimitedFetch(url, apiKey);
          if (!response.ok) {
            throw new Error(`Regulations.gov API returned ${response.status}`);
          }

          const data = await response.json();
          const comments = extractComments(data);
          const total = data.meta?.totalElements ?? comments.length;

          // Aggregate submitter types from available page
          const bySubmitterType: Record<string, number> = {};
          for (const comment of comments) {
            const submitterType = comment.submitterType ?? 'Unknown';
            bySubmitterType[submitterType] = (bySubmitterType[submitterType] ?? 0) + 1;
          }

          return {
            total,
            bySubmitterType,
            docketId,
            lastUpdated: new Date().toISOString(),
          };
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('Failed to fetch comment stats', error as Error, { docketId });
      return null;
    }
  }

  /**
   * Get a docket by ID
   */
  async getDocket(docketId: string): Promise<RegDocket | null> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return null;
    }

    const cacheKey = `regs-docket:${docketId}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${BASE_URL}/dockets/${encodeURIComponent(docketId)}`;
          logger.info('Fetching Regulations.gov docket', { docketId });

          const response = await rateLimitedFetch(url, apiKey);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Regulations.gov API returned ${response.status}`);
          }

          const data: RegAPISingleResponse<Omit<RegDocket, 'id' | 'type'>> =
            await response.json();

          return {
            id: data.data.id,
            type: 'dockets' as const,
            ...data.data.attributes,
          } as RegDocket;
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('Failed to fetch docket', error as Error, { docketId });
      return null;
    }
  }
  /**
   * Search documents by Regulation Identifier Number (RIN).
   * RINs link Federal Register rules to Regulations.gov dockets.
   */
  async searchByRIN(rin: string): Promise<RegDocument[]> {
    return this.searchDocuments({ searchTerm: rin, pageSize: 25 });
  }

  /**
   * Get all documents in a docket.
   */
  async getDocketDocuments(
    docketId: string,
    opts?: { pageSize?: number }
  ): Promise<RegDocument[]> {
    return this.searchDocuments({ docketId, pageSize: opts?.pageSize ?? 25 });
  }

  /**
   * Reconstruct the rule lifecycle for a docket by examining its documents.
   * Determines status from document types and dates.
   */
  async getRuleLifecycle(docketId: string): Promise<RuleLifecycle | null> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return null;
    }

    const cacheKey = `regs-lifecycle:${docketId}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const docket = await this.getDocket(docketId);
          if (!docket) return null;

          const docs = await this.getDocketDocuments(docketId, { pageSize: 50 });

          let proposedDate: string | null = null;
          let commentOpenDate: string | null = null;
          let commentCloseDate: string | null = null;
          let finalRuleDate: string | null = null;
          const effectiveDate: string | null = null;
          let rin: string | null = null;
          let isWithdrawn = false;

          for (const doc of docs) {
            if (doc.withdrawn) {
              isWithdrawn = true;
            }
            if (doc.documentType === 'Proposed Rule') {
              proposedDate = proposedDate ?? doc.postedDate;
              commentOpenDate = commentOpenDate ?? doc.commentStartDate;
              commentCloseDate = commentCloseDate ?? doc.commentEndDate;
            }
            if (doc.documentType === 'Rule') {
              finalRuleDate = finalRuleDate ?? doc.postedDate;
            }
          }

          // Get RIN from first detailed document if available
          if (docs.length > 0) {
            const detail = await this.getDocument(docs[0]!.documentId);
            if (detail?.rin) {
              rin = detail.rin;
            }
            if (detail && !effectiveDate) {
              // effectiveDate not on the list doc type, but present on detail
              // We check via the Federal Register link instead
            }
          }

          // Get total comments
          const commentStats = await this.getCommentStats(docketId);
          const totalComments = commentStats?.total ?? 0;

          // Determine status
          let status: RuleLifecycle['status'];
          if (isWithdrawn) {
            status = 'withdrawn';
          } else if (finalRuleDate) {
            status = 'final';
          } else if (commentCloseDate && new Date(commentCloseDate) < new Date()) {
            status = 'comment_closed';
          } else if (commentOpenDate) {
            status = 'comment_period';
          } else {
            status = 'proposed';
          }

          return {
            docketId,
            agencyId: docket.agencyId,
            title: docket.title,
            status,
            proposedDate,
            commentOpenDate,
            commentCloseDate,
            finalRuleDate,
            effectiveDate,
            totalComments,
            rin,
          };
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('Failed to get rule lifecycle', error as Error, { docketId });
      return null;
    }
  }

  /**
   * Search comments on a docket filtered by organization name.
   */
  async getOrganizationComments(
    docketId: string,
    orgName: string
  ): Promise<{ comments: RegComment[]; total: number }> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return { comments: [], total: 0 };
    }

    const cacheKey = `regs-org-comments:${docketId}:${orgName.toLowerCase().slice(0, 30)}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            'filter[docketId]': docketId,
            'filter[searchTerm]': orgName,
            'page[size]': '25',
            'page[number]': '1',
            sort: '-postedDate',
          });

          const url = `${BASE_URL}/comments?${params.toString()}`;
          logger.info('Fetching org comments on docket', { docketId, orgName });

          const response = await rateLimitedFetch(url, apiKey);
          if (!response.ok) {
            throw new Error(`Regulations.gov API returned ${response.status}`);
          }

          const data = await response.json();
          const comments = extractComments(data);
          const total = data.meta?.totalElements ?? comments.length;

          // Filter to comments where organization matches
          const orgLower = orgName.toLowerCase();
          const matched = comments.filter(
            c => c.organization?.toLowerCase().includes(orgLower)
          );

          return { comments: matched, total };
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('Failed to fetch org comments', error as Error, { docketId, orgName });
      return { comments: [], total: 0 };
    }
  }
}

export const regulationsGovService = new RegulationsGovService();
