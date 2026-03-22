/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEMA Service
 *
 * Queries FEMA OpenAPI for disaster declarations and assistance data.
 * No API key required.
 *
 * - Declarations: /api/open/v2/DisasterDeclarationsSummaries
 * - Assistance: /api/open/v1/FemaWebDisasterSummaries
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  FemaDisasterDeclaration,
  FemaAssistance,
  FemaRawDeclaration,
  FemaRawAssistance,
} from '@/types/fema';

const FEMA_V2_BASE = 'https://www.fema.gov/api/open/v2';
const FEMA_V1_BASE = 'https://www.fema.gov/api/open/v1';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 86400; // 24 hours

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': 'CIV.IQ (civdotiq.org)' },
    signal: AbortSignal.timeout(30_000),
  });
}

function transformDeclaration(raw: FemaRawDeclaration): FemaDisasterDeclaration {
  return {
    femaDeclarationString: raw.femaDeclarationString,
    disasterNumber: raw.disasterNumber,
    state: raw.state,
    declarationType: raw.declarationType as 'DR' | 'EM' | 'FM',
    declarationDate: raw.declarationDate,
    fyDeclared: raw.fyDeclared,
    incidentType: raw.incidentType,
    declarationTitle: raw.declarationTitle,
    ihProgramDeclared: raw.ihProgramDeclared,
    iaProgramDeclared: raw.iaProgramDeclared,
    paProgramDeclared: raw.paProgramDeclared,
    hmProgramDeclared: raw.hmProgramDeclared,
    incidentBeginDate: raw.incidentBeginDate,
    incidentEndDate: raw.incidentEndDate,
    disasterCloseoutDate: raw.disasterCloseoutDate,
    fipsStateCode: raw.fipsStateCode,
    fipsCountyCode: raw.fipsCountyCode,
    designatedArea: raw.designatedArea,
    region: raw.region,
  };
}

function transformAssistance(raw: FemaRawAssistance): FemaAssistance {
  return {
    disasterNumber: raw.disasterNumber,
    totalNumberIaApproved: raw.totalNumberIaApproved,
    totalAmountIhpApproved: raw.totalAmountIhpApproved,
    totalAmountHaApproved: raw.totalAmountHaApproved,
    totalAmountOnaApproved: raw.totalAmountOnaApproved,
    totalObligatedAmountPa: raw.totalObligatedAmountPa,
    totalObligatedAmountCatAb: raw.totalObligatedAmountCatAb,
    totalObligatedAmountCatC2g: raw.totalObligatedAmountCatC2g,
    totalObligatedAmountHmgp: raw.totalObligatedAmountHmgp,
    paLoadDate: raw.paLoadDate,
    iaLoadDate: raw.iaLoadDate,
  };
}

export class FemaService {
  /**
   * Search FEMA disaster declarations by state, year, and/or type.
   */
  async searchDisasters(params: {
    state: string;
    year?: number;
    type?: 'DR' | 'EM' | 'FM';
    limit?: number;
  }): Promise<FemaDisasterDeclaration[]> {
    const { state, year, type, limit = 50 } = params;
    const cacheKey = `fema-disasters:${state}:${year ?? ''}:${type ?? ''}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const filters: string[] = [`state eq '${state.toUpperCase()}'`];
          if (year) filters.push(`fyDeclared eq ${year}`);
          if (type) filters.push(`declarationType eq '${type}'`);

          const params = new URLSearchParams({
            $filter: filters.join(' and '),
            $orderby: 'declarationDate desc',
            $top: String(Math.min(limit, 200)),
            $format: 'json',
          });

          const url = `${FEMA_V2_BASE}/DisasterDeclarationsSummaries?${params}`;
          logger.info('FEMA disaster search', { state, year, type });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            throw new Error(`FEMA API returned ${response.status}`);
          }

          const data = await response.json();
          const declarations: FemaRawDeclaration[] =
            data.DisasterDeclarationsSummaries ?? [];

          return declarations.map(transformDeclaration);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FemaService.searchDisasters failed', error as Error);
      return [];
    }
  }

  /**
   * Get disaster assistance/funding summary by disaster number.
   * Uses FemaWebDisasterSummaries (v1 only).
   */
  async getDisasterAssistance(disasterNumber: number): Promise<FemaAssistance | null> {
    const cacheKey = `fema-assistance:${disasterNumber}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            $filter: `disasterNumber eq ${disasterNumber}`,
            $format: 'json',
          });

          const url = `${FEMA_V1_BASE}/FemaWebDisasterSummaries?${params}`;
          logger.info('FEMA assistance fetch', { disasterNumber });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`FEMA v1 API returned ${response.status}`);
          }

          const data = await response.json();
          const summaries: FemaRawAssistance[] =
            data.FemaWebDisasterSummaries ?? [];

          if (summaries.length === 0) return null;
          return transformAssistance(summaries[0]!);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FemaService.getDisasterAssistance failed', error as Error);
      return null;
    }
  }
}

export const femaService = new FemaService();
