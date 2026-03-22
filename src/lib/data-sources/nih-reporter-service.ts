/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NIH RePORTER Service
 *
 * Queries NIH RePORTER for funded research grants and projects.
 *
 * API: https://api.reporter.nih.gov/v2/
 * No API key required.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  NihGrant,
  NihProjectDetails,
  NihReporterSearchResponse,
  RawNihProject,
} from '@/types/nih-reporter';

const NIH_BASE = 'https://api.reporter.nih.gov/v2';

const MIN_REQUEST_INTERVAL_MS = 500;
let lastRequestTime = 0;
const CACHE_TTL = 86400; // 24 hours

async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CIV.IQ (civdotiq.org)',
      ...init?.headers,
    },
    signal: init?.signal ?? AbortSignal.timeout(30_000),
  });
}

function transformGrant(raw: RawNihProject): NihGrant {
  const contactPi = raw.principal_investigators?.find(pi => pi.is_contact_pi);
  const primaryFunding = raw.agency_ic_fundings?.[0];

  return {
    projectNumber: raw.project_num ?? '',
    projectTitle: raw.project_title ?? '',
    fiscalYear: raw.fiscal_year ?? 0,
    organization: raw.organization?.org_name ?? '',
    organizationCity: raw.organization?.org_city ?? '',
    organizationState: raw.organization?.org_state ?? '',
    department: raw.organization?.department ?? null,
    principalInvestigator: contactPi?.full_name ?? raw.principal_investigators?.[0]?.full_name ?? '',
    awardAmount: raw.award_amount ?? 0,
    fundingMechanism: raw.activity_code ?? null,
    nihInstitute: primaryFunding?.abbreviation ?? null,
    projectStartDate: raw.project_start_date ?? null,
    projectEndDate: raw.project_end_date ?? null,
    abstractText: raw.abstract_text ?? null,
  };
}

function transformProjectDetails(raw: RawNihProject): NihProjectDetails {
  const base = transformGrant(raw);
  return {
    ...base,
    spendingCategories: raw.spending_categories_desc
      ? raw.spending_categories_desc.split(';').map(s => s.trim()).filter(Boolean)
      : [],
    publicHealthRelevance: raw.phr_text ?? null,
    terms: raw.terms
      ? raw.terms.split(';').map(s => s.trim()).filter(Boolean)
      : [],
    totalCost: raw.total_cost ?? null,
    totalCostSubProjects: raw.total_cost_sub_projects ?? null,
  };
}

export class NihReporterService {
  /**
   * Search NIH grants by state, institution, and/or topic.
   */
  async searchGrants(params: {
    state?: string;
    institution?: string;
    topic?: string;
    limit?: number;
  }): Promise<NihGrant[]> {
    const { state, institution, topic, limit = 25 } = params;
    const cacheKey = `nih-grants:${state ?? ''}:${institution ?? ''}:${topic ?? ''}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const criteria: Record<string, unknown> = {
            use_relevance: true,
            include_active_projects: true,
          };

          if (state) {
            criteria.org_states = [{ value: state.toUpperCase() }];
          }
          if (institution) {
            criteria.org_names = [{ value: institution, operator: 'contains' }];
          }
          if (topic) {
            criteria.advanced_text_search = {
              operator: 'and',
              search_field: 'projecttitle,terms,abstracttext',
              search_text: topic,
            };
          }

          const body = {
            criteria,
            offset: 0,
            limit: Math.min(limit, 100),
            sort_field: 'award_amount',
            sort_order: 'desc',
          };

          logger.info('NIH RePORTER search', { state, institution, topic });
          const response = await rateLimitedFetch(`${NIH_BASE}/projects/search`, {
            method: 'POST',
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`NIH RePORTER API returned ${response.status}`);
          }

          const data: NihReporterSearchResponse = await response.json();
          return (data.results ?? []).map(transformGrant);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('NihReporterService.searchGrants failed', error as Error);
      return [];
    }
  }

  /**
   * Get detailed project information by project number.
   */
  async getProjectDetails(projectNumber: string): Promise<NihProjectDetails | null> {
    const cacheKey = `nih-project:${projectNumber}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const body = {
            criteria: {
              project_nums: [projectNumber],
            },
            offset: 0,
            limit: 1,
          };

          logger.info('NIH RePORTER project details', { projectNumber });
          const response = await rateLimitedFetch(`${NIH_BASE}/projects/search`, {
            method: 'POST',
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`NIH RePORTER API returned ${response.status}`);
          }

          const data: NihReporterSearchResponse = await response.json();
          const result = data.results?.[0];
          if (!result) return null;

          return transformProjectDetails(result);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('NihReporterService.getProjectDetails failed', error as Error);
      return null;
    }
  }
}

export const nihReporterService = new NihReporterService();
