/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OSHA Inspection Service
 *
 * Queries the Department of Labor OSHA enforcement data.
 * API: https://apiprod.dol.gov/v4/osha/
 * Auth: DOL_API_KEY header (Bearer token)
 *
 * Pattern: epa-echo-service.ts
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  OshaInspection,
  OshaViolation,
  OshaInspectionSummary,
  OshaRawInspection,
  OshaRawViolation,
} from '@/types/osha';

const BASE_URL = 'https://apiprod.dol.gov/v4/osha';

const MIN_REQUEST_INTERVAL_MS = 200;
let lastRequestTime = 0;
const CACHE_TTL = 21600; // 6 hours

function getDOLApiKey(): string | undefined {
  return process.env.DOL_API_KEY;
}

async function rateLimitedFetch(url: string, apiKey: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'User-Agent': 'CIV.IQ (civdotiq.org)',
    },
    signal: AbortSignal.timeout(30_000),
  });
}

function transformInspection(raw: OshaRawInspection): OshaInspection {
  return {
    activityNumber: String(raw.activity_nr),
    establishmentName: raw.estab_name ?? '',
    siteAddress: raw.site_address ?? '',
    siteCity: raw.site_city ?? '',
    siteState: raw.site_state ?? '',
    siteZip: raw.site_zip ?? '',
    sicCode: raw.sic_code ?? '',
    naicsCode: raw.naics_code ?? '',
    inspectionType: raw.insp_type ?? '',
    openDate: raw.open_date ?? '',
    closeDate: raw.close_case_date ?? null,
    totalCurrentPenalty: raw.total_current_penalty ?? 0,
    violationCount: 0, // Populated via separate violations query
    seriousViolationCount: 0,
  };
}

function transformViolation(raw: OshaRawViolation): OshaViolation {
  return {
    activityNumber: String(raw.activity_nr),
    citationId: raw.citation_id ?? '',
    violationType: (raw.viol_type ?? 'O') as OshaViolation['violationType'],
    currentPenalty: raw.current_penalty ?? 0,
    initialPenalty: raw.initial_penalty ?? 0,
    standard: raw.standard ?? '',
    abatementDate: raw.abate_date ?? null,
  };
}

export class OshaService {
  /**
   * Search OSHA inspections with optional filters.
   */
  async searchInspections(params: {
    state?: string;
    sicCode?: string;
    establishmentName?: string;
    limit?: number;
    offset?: number;
  }): Promise<OshaInspection[]> {
    const apiKey = getDOLApiKey();
    if (!apiKey) {
      logger.warn('DOL_API_KEY not configured');
      return [];
    }

    const { state, sicCode, establishmentName, limit = 200, offset = 0 } = params;
    const cacheKey = `osha-inspections:${state ?? ''}:${sicCode ?? ''}:${establishmentName?.slice(0, 20) ?? ''}:${limit}:${offset}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const qp = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
          });

          if (state) qp.set('site_state', state.toUpperCase());
          if (sicCode) qp.set('sic_code', sicCode);
          if (establishmentName) qp.set('estab_name', establishmentName);

          const url = `${BASE_URL}/OSHA_inspection?${qp.toString()}`;
          logger.info('OSHA inspection search', { state, sicCode, establishmentName });

          const response = await rateLimitedFetch(url, apiKey);
          if (!response.ok) {
            throw new Error(`DOL API returned ${response.status}`);
          }

          const data = await response.json();
          const records = Array.isArray(data) ? data : (data.results ?? []);

          return (records as OshaRawInspection[]).map(transformInspection);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('OshaService.searchInspections failed', error as Error);
      return [];
    }
  }

  /**
   * Get violations for a specific inspection by activity number.
   */
  async getViolations(activityNumber: string): Promise<OshaViolation[]> {
    const apiKey = getDOLApiKey();
    if (!apiKey) {
      logger.warn('DOL_API_KEY not configured');
      return [];
    }

    const cacheKey = `osha-violations:${activityNumber}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const qp = new URLSearchParams({
            activity_nr: activityNumber,
            limit: '200',
          });

          const url = `${BASE_URL}/OSHA_violation?${qp.toString()}`;
          logger.info('OSHA violation fetch', { activityNumber });

          const response = await rateLimitedFetch(url, apiKey);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`DOL API returned ${response.status}`);
          }

          const data = await response.json();
          const records = Array.isArray(data) ? data : (data.results ?? []);

          return (records as OshaRawViolation[]).map(transformViolation);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('OshaService.getViolations failed', error as Error);
      return [];
    }
  }

  /**
   * Get inspection summary statistics by SIC code and optional state.
   */
  async getInspectionSummaryBySIC(
    sicCode: string,
    state?: string
  ): Promise<OshaInspectionSummary | null> {
    const inspections = await this.searchInspections({ sicCode, state, limit: 200 });

    if (inspections.length === 0) return null;

    const totalPenalties = inspections.reduce((sum, i) => sum + i.totalCurrentPenalty, 0);
    const seriousCount = inspections.filter(i => i.seriousViolationCount > 0).length;

    const dates = inspections
      .map(i => i.openDate)
      .filter(d => d)
      .sort();

    return {
      sicCode,
      state: state ?? null,
      totalInspections: inspections.length,
      totalPenalties,
      avgPenalty: inspections.length > 0 ? totalPenalties / inspections.length : 0,
      seriousViolationRate: inspections.length > 0 ? seriousCount / inspections.length : 0,
      periodStart: dates[0] ?? '',
      periodEnd: dates[dates.length - 1] ?? '',
    };
  }
}

export const oshaService = new OshaService();
