/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CourtListener Service
 *
 * Queries the CourtListener REST API v4 for federal court dockets.
 * API: https://www.courtlistener.com/api/rest/v4/
 * Auth: COURTLISTENER_API_TOKEN header (Token auth)
 * Rate: 750ms interval (5,000 queries/hr)
 *
 * Pattern: epa-echo-service.ts
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  CourtCase,
  JudgePosition,
  CourtListenerRawDocket,
  CourtListenerRawPosition,
  CourtListenerListResponse,
} from '@/types/courtlistener';

const BASE_URL = 'https://www.courtlistener.com/api/rest/v4';

const MIN_REQUEST_INTERVAL_MS = 750;
let lastRequestTime = 0;
const CACHE_TTL = 43200; // 12 hours

function getApiToken(): string | undefined {
  return process.env.COURTLISTENER_API_TOKEN;
}

async function rateLimitedFetch(url: string, token: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: {
      Authorization: `Token ${token}`,
      Accept: 'application/json',
      'User-Agent': 'CIV.IQ (civdotiq.org)',
    },
    signal: AbortSignal.timeout(30_000),
  });
}

function transformDocket(raw: CourtListenerRawDocket): CourtCase {
  return {
    docketId: raw.id,
    caseName: raw.case_name ?? '',
    court: raw.court ?? '',
    dateFiled: raw.date_filed ?? '',
    dateTerminated: raw.date_terminated ?? null,
    parties: (raw.parties ?? []).map(p => p.name),
    natureOfSuit: raw.nature_of_suit ?? null,
  };
}

function transformPosition(raw: CourtListenerRawPosition): JudgePosition {
  return {
    personId: raw.person?.id ?? 0,
    name: raw.person?.name_full ?? '',
    court: raw.court?.short_name ?? '',
    dateStart: raw.date_start ?? '',
    nominatedBy: raw.date_nominated ?? null,
    appointedBy: raw.appointer?.person?.name_full ?? null,
  };
}

export class CourtListenerService {
  /**
   * Search court dockets by party name, court, and date range.
   */
  async searchDockets(params: {
    partyName?: string;
    court?: string;
    dateAfter?: string;
    limit?: number;
  }): Promise<CourtCase[]> {
    const token = getApiToken();
    if (!token) {
      logger.warn('COURTLISTENER_API_TOKEN not configured');
      return [];
    }

    const { partyName, court, dateAfter, limit = 20 } = params;
    const cacheKey = `cl-dockets:${partyName?.slice(0, 30) ?? ''}:${court ?? ''}:${dateAfter ?? ''}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const qp = new URLSearchParams();
          if (partyName) qp.set('q', partyName);
          if (court) qp.set('court', court);
          if (dateAfter) qp.set('date_filed__gte', dateAfter);
          qp.set('page_size', String(Math.min(limit, 100)));
          qp.set('order_by', '-date_filed');

          const url = `${BASE_URL}/dockets/?${qp.toString()}`;
          logger.info('CourtListener docket search', { partyName, court });

          const response = await rateLimitedFetch(url, token);
          if (!response.ok) {
            throw new Error(`CourtListener API returned ${response.status}`);
          }

          const data: CourtListenerListResponse<CourtListenerRawDocket> =
            await response.json();
          return (data.results ?? []).map(transformDocket);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('CourtListenerService.searchDockets failed', error as Error);
      return [];
    }
  }

  /**
   * Search for court cases involving a federal agency.
   * Searches by agency name as a party.
   */
  async searchAgencyCases(
    agencyName: string,
    opts?: { dateAfter?: string; limit?: number }
  ): Promise<CourtCase[]> {
    return this.searchDockets({
      partyName: agencyName,
      dateAfter: opts?.dateAfter,
      limit: opts?.limit ?? 20,
    });
  }

  /**
   * Get judicial positions for a person by ID.
   */
  async getJudgePositions(personId: number): Promise<JudgePosition[]> {
    const token = getApiToken();
    if (!token) {
      logger.warn('COURTLISTENER_API_TOKEN not configured');
      return [];
    }

    const cacheKey = `cl-positions:${personId}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${BASE_URL}/positions/?person=${personId}&page_size=50`;
          logger.info('CourtListener judge positions', { personId });

          const response = await rateLimitedFetch(url, token);
          if (!response.ok) {
            throw new Error(`CourtListener API returned ${response.status}`);
          }

          const data: CourtListenerListResponse<CourtListenerRawPosition> =
            await response.json();
          return (data.results ?? []).map(transformPosition);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('CourtListenerService.getJudgePositions failed', error as Error);
      return [];
    }
  }
}

export const courtListenerService = new CourtListenerService();
