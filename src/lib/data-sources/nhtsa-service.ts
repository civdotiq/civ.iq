/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NHTSA Vehicle Safety Service
 *
 * Queries NHTSA for vehicle recalls and consumer complaints.
 *
 * API: https://api.nhtsa.gov/
 * No API key required.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  NhtsaRecall,
  NhtsaComplaint,
  NhtsaApiResponse,
  RawNhtsaRecall,
  RawNhtsaComplaint,
} from '@/types/nhtsa';

const NHTSA_BASE = 'https://api.nhtsa.gov';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 43200; // 12 hours

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

function parseDateField(value: string | null | undefined): string | null {
  if (!value) return null;
  // NHTSA dates can be "/Date(1234567890000)/" format or ISO strings
  const msMatch = value.match(/\/Date\((\d+)\)\//);
  if (msMatch?.[1]) {
    return new Date(parseInt(msMatch[1], 10)).toISOString().split('T')[0] ?? null;
  }
  return value;
}

function transformRecall(raw: RawNhtsaRecall): NhtsaRecall {
  return {
    campaignNumber: raw.NHTSACampaignNumber ?? '',
    actionNumber: raw.NHTSAActionNumber ?? '',
    reportReceivedDate: parseDateField(raw.ReportReceivedDate) ?? '',
    component: raw.Component ?? '',
    summary: raw.Summary ?? '',
    consequence: raw.Consequence ?? '',
    remedy: raw.Remedy ?? '',
    notes: raw.Notes ?? '',
    manufacturer: raw.Manufacturer ?? '',
    make: raw.Make ?? '',
    model: raw.Model ?? '',
    modelYear: raw.ModelYear ?? '',
    parkIt: raw.parkIt ?? false,
    parkOutSide: raw.parkOutSide ?? false,
  };
}

function transformComplaint(raw: RawNhtsaComplaint): NhtsaComplaint {
  const product = raw.products?.[0];
  return {
    odiNumber: raw.odiNumber ?? 0,
    manufacturer: raw.manufacturer ?? '',
    make: product?.make ?? '',
    model: product?.model ?? '',
    modelYear: product?.year ?? '',
    dateOfIncident: parseDateField(raw.dateOfIncident),
    dateComplaintFiled: parseDateField(raw.dateComplaintFiled),
    numberOfInjuries: raw.numberOfInjuries ?? 0,
    numberOfDeaths: raw.numberOfDeaths ?? 0,
    crash: raw.crash === 'Yes',
    fire: raw.fire === 'Yes',
    component: raw.components ?? '',
    summary: raw.summary ?? '',
  };
}

export class NhtsaService {
  /**
   * Search NHTSA vehicle recalls by make, model, and/or year.
   */
  async searchRecalls(params: {
    make?: string;
    model?: string;
    year?: number;
  }): Promise<NhtsaRecall[]> {
    const { make, model, year } = params;
    const cacheKey = `nhtsa-recalls:${make ?? ''}:${model ?? ''}:${year ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const queryParts: string[] = [];
          if (make) queryParts.push(`make=${encodeURIComponent(make)}`);
          if (model) queryParts.push(`model=${encodeURIComponent(model)}`);
          if (year) queryParts.push(`modelYear=${year}`);

          if (queryParts.length === 0) {
            logger.warn('NHTSA recall search requires at least make, model, or year');
            return [];
          }

          const url = `${NHTSA_BASE}/recalls/recallsByVehicle?${queryParts.join('&')}`;
          logger.info('NHTSA recall search', { make, model, year });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`NHTSA API returned ${response.status}`);
          }

          const data: NhtsaApiResponse<RawNhtsaRecall> = await response.json();
          return (data.results ?? []).map(transformRecall);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('NhtsaService.searchRecalls failed', error as Error);
      return [];
    }
  }

  /**
   * Search NHTSA vehicle complaints by make, model, and/or component.
   */
  async searchComplaints(params: {
    make?: string;
    model?: string;
    component?: string;
  }): Promise<NhtsaComplaint[]> {
    const { make, model, component } = params;
    const cacheKey = `nhtsa-complaints:${make ?? ''}:${model ?? ''}:${component ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const queryParts: string[] = [];
          if (make) queryParts.push(`make=${encodeURIComponent(make)}`);
          if (model) queryParts.push(`model=${encodeURIComponent(model)}`);

          if (!make && !model) {
            logger.warn('NHTSA complaint search requires at least make or model');
            return [];
          }

          const url = `${NHTSA_BASE}/complaints/complaintsByVehicle?${queryParts.join('&')}`;
          logger.info('NHTSA complaint search', { make, model, component });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`NHTSA API returned ${response.status}`);
          }

          const data: NhtsaApiResponse<RawNhtsaComplaint> = await response.json();
          let results = (data.results ?? []).map(transformComplaint);

          // Filter by component if specified
          if (component) {
            const componentLower = component.toLowerCase();
            results = results.filter(c =>
              c.component.toLowerCase().includes(componentLower)
            );
          }

          return results;
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('NhtsaService.searchComplaints failed', error as Error);
      return [];
    }
  }
}

export const nhtsaService = new NhtsaService();
