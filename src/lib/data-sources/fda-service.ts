/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FDA openFDA Service
 *
 * Queries openFDA for drug/food/device recalls, adverse events,
 * and enforcement actions.
 *
 * API: https://api.fda.gov/
 * Key: Optional OPENFDA_API_KEY (240 req/min vs 40 req/min without).
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  FdaRecall,
  FdaAdverseEvent,
  FdaEnforcementAction,
  OpenFdaResponse,
  RawEnforcementResult,
  RawDrugEventResult,
} from '@/types/fda';

const FDA_BASE = 'https://api.fda.gov';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 43200; // 12 hours

function getApiKeyParam(): string {
  const key = process.env.OPENFDA_API_KEY;
  return key ? `&api_key=${encodeURIComponent(key)}` : '';
}

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

function transformRecall(raw: RawEnforcementResult): FdaRecall {
  return {
    recallNumber: raw.recall_number ?? '',
    reportDate: raw.report_date ?? '',
    recallInitiationDate: raw.recall_initiation_date ?? '',
    centerClassificationDate: raw.center_classification_date ?? null,
    terminationDate: raw.termination_date ?? null,
    classification: (raw.classification ?? 'Class III') as FdaRecall['classification'],
    status: raw.status ?? '',
    voluntaryMandated: raw.voluntary_mandated ?? '',
    productDescription: raw.product_description ?? '',
    reasonForRecall: raw.reason_for_recall ?? '',
    codeInfo: raw.code_info ?? '',
    productQuantity: raw.product_quantity ?? '',
    distributionPattern: raw.distribution_pattern ?? '',
    recallingFirm: raw.recalling_firm ?? '',
    city: raw.city ?? '',
    state: raw.state ?? '',
    country: raw.country ?? '',
    productType: raw.product_type ?? '',
  };
}

function transformAdverseEvent(raw: RawDrugEventResult): FdaAdverseEvent {
  return {
    safetyReportId: raw.safetyreportid ?? '',
    receiveDate: raw.receivedate ?? '',
    receiptDate: raw.receiptdate ?? null,
    serious: raw.serious === '1',
    seriousnessHospitalization: raw.seriousnesshospitalization === '1',
    seriousnessDeath: raw.seriousnessdeath === '1',
    seriousnessLifeThreatening: raw.seriousnesslifethreatening === '1',
    seriousnessDisabling: raw.seriousnessdisabling === '1',
    patientOnsetAge: raw.patient?.patientonsetage
      ? parseFloat(raw.patient.patientonsetage)
      : null,
    patientOnsetAgeUnit: raw.patient?.patientonsetageunit ?? null,
    patientSex: raw.patient?.patientsex ?? null,
    drugs: (raw.patient?.drug ?? []).map(d => ({
      medicinalProduct: d.medicinalproduct ?? '',
      drugIndication: d.drugindication ?? null,
      drugCharacterization: d.drugcharacterization ?? '',
    })),
    reactions: (raw.patient?.reaction ?? []).map(r => ({
      reactionMedDrapt: r.reactionmeddrapt ?? '',
      reactionOutcome: r.reactionoutcome ?? null,
    })),
  };
}

function transformEnforcementAction(raw: RawEnforcementResult): FdaEnforcementAction {
  return {
    eventId: `${raw.recall_number}-${raw.report_date}`,
    recallNumber: raw.recall_number ?? '',
    reportDate: raw.report_date ?? '',
    classification: raw.classification ?? '',
    status: raw.status ?? '',
    recallingFirm: raw.recalling_firm ?? '',
    productDescription: raw.product_description ?? '',
    reasonForRecall: raw.reason_for_recall ?? '',
    productType: raw.product_type ?? '',
    city: raw.city ?? '',
    state: raw.state ?? '',
  };
}

export class FdaService {
  /**
   * Search FDA recalls across drug, food, and device enforcement databases.
   */
  async searchRecalls(params: {
    product?: string;
    company?: string;
    classification?: 'Class I' | 'Class II' | 'Class III';
    limit?: number;
  }): Promise<FdaRecall[]> {
    const { product, company, classification, limit = 25 } = params;

    const searchTerms: string[] = [];
    if (product) searchTerms.push(`product_description:"${product}"`);
    if (company) searchTerms.push(`recalling_firm:"${company}"`);
    if (classification) searchTerms.push(`classification:"${classification}"`);

    const searchQuery = searchTerms.length > 0 ? searchTerms.join('+AND+') : '';
    const cacheKey = `fda-recalls:${searchQuery}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          // Search across drug, food, and device enforcement endpoints
          const endpoints = [
            `${FDA_BASE}/drug/enforcement.json`,
            `${FDA_BASE}/food/enforcement.json`,
            `${FDA_BASE}/device/enforcement.json`,
          ];

          const allRecalls: FdaRecall[] = [];
          const perEndpointLimit = Math.ceil(Math.min(limit, 100) / endpoints.length);

          for (const endpoint of endpoints) {
            try {
              const searchPart = searchQuery ? `search=${searchQuery}&` : '';
              const url = `${endpoint}?${searchPart}limit=${perEndpointLimit}${getApiKeyParam()}`;
              logger.info('FDA recall search', { endpoint, searchQuery });

              const response = await rateLimitedFetch(url);
              if (!response.ok) {
                if (response.status === 404) continue;
                logger.warn('FDA endpoint returned error', {
                  endpoint,
                  status: response.status,
                });
                continue;
              }

              const data: OpenFdaResponse<RawEnforcementResult> = await response.json();
              allRecalls.push(...(data.results ?? []).map(transformRecall));
            } catch (e) {
              logger.warn('FDA recall endpoint failed', {
                endpoint,
                error: (e as Error).message,
              });
            }
          }

          return allRecalls.slice(0, limit);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FdaService.searchRecalls failed', error as Error);
      return [];
    }
  }

  /**
   * Search FDA adverse event reports for drugs or devices.
   */
  async searchAdverseEvents(params: {
    drug?: string;
    device?: string;
    limit?: number;
  }): Promise<FdaAdverseEvent[]> {
    const { drug, device, limit = 25 } = params;

    const cacheKey = `fda-adverse:${drug ?? ''}:${device ?? ''}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const results: FdaAdverseEvent[] = [];

          // Drug adverse events
          if (drug || (!drug && !device)) {
            try {
              const searchPart = drug
                ? `search=patient.drug.medicinalproduct:"${drug}"&`
                : '';
              const url = `${FDA_BASE}/drug/event.json?${searchPart}limit=${Math.min(limit, 100)}${getApiKeyParam()}`;
              logger.info('FDA drug adverse event search', { drug });

              const response = await rateLimitedFetch(url);
              if (response.ok) {
                const data: OpenFdaResponse<RawDrugEventResult> = await response.json();
                results.push(...(data.results ?? []).map(transformAdverseEvent));
              }
            } catch (e) {
              logger.warn('FDA drug adverse event search failed', {
                error: (e as Error).message,
              });
            }
          }

          // Device adverse events (use enforcement as proxy — device events have different schema)
          if (device) {
            try {
              const url = `${FDA_BASE}/device/enforcement.json?search=product_description:"${device}"&limit=${Math.min(limit, 100)}${getApiKeyParam()}`;
              logger.info('FDA device adverse event search', { device });

              const response = await rateLimitedFetch(url);
              if (response.ok) {
                const data: OpenFdaResponse<RawEnforcementResult> = await response.json();
                // Map device enforcement to adverse event shape for unified results
                for (const raw of data.results ?? []) {
                  results.push({
                    safetyReportId: raw.recall_number ?? '',
                    receiveDate: raw.report_date ?? '',
                    receiptDate: null,
                    serious: raw.classification === 'Class I',
                    seriousnessHospitalization: false,
                    seriousnessDeath: false,
                    seriousnessLifeThreatening: raw.classification === 'Class I',
                    seriousnessDisabling: false,
                    patientOnsetAge: null,
                    patientOnsetAgeUnit: null,
                    patientSex: null,
                    drugs: [],
                    reactions: [
                      {
                        reactionMedDrapt: raw.reason_for_recall ?? '',
                        reactionOutcome: null,
                      },
                    ],
                  });
                }
              }
            } catch (e) {
              logger.warn('FDA device event search failed', {
                error: (e as Error).message,
              });
            }
          }

          return results.slice(0, limit);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FdaService.searchAdverseEvents failed', error as Error);
      return [];
    }
  }

  /**
   * Get FDA enforcement actions for a specific company.
   */
  async getEnforcementActions(company: string): Promise<FdaEnforcementAction[]> {
    const cacheKey = `fda-enforcement:${company.toLowerCase()}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const endpoints = [
            `${FDA_BASE}/drug/enforcement.json`,
            `${FDA_BASE}/food/enforcement.json`,
            `${FDA_BASE}/device/enforcement.json`,
          ];

          const allActions: FdaEnforcementAction[] = [];

          for (const endpoint of endpoints) {
            try {
              const url = `${endpoint}?search=recalling_firm:"${company}"&limit=100${getApiKeyParam()}`;
              logger.info('FDA enforcement action search', { endpoint, company });

              const response = await rateLimitedFetch(url);
              if (!response.ok) {
                if (response.status === 404) continue;
                continue;
              }

              const data: OpenFdaResponse<RawEnforcementResult> = await response.json();
              allActions.push(...(data.results ?? []).map(transformEnforcementAction));
            } catch (e) {
              logger.warn('FDA enforcement endpoint failed', {
                endpoint,
                error: (e as Error).message,
              });
            }
          }

          // Sort by report date descending
          allActions.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
          return allActions;
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('FdaService.getEnforcementActions failed', error as Error);
      return [];
    }
  }
}

export const fdaService = new FdaService();
