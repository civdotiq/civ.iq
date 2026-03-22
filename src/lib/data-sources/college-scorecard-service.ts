/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * College Scorecard Service
 *
 * Queries the Department of Education College Scorecard API for
 * institution data including costs, outcomes, and demographics.
 *
 * API: https://api.data.gov/ed/collegescorecard/v1/
 * Uses shared DATA_GOV_API_KEY via data-gov-rate-limiter.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import {
  getDataGovApiKey,
  dataGovRateLimitedFetch,
} from '@/lib/data-sources/data-gov-rate-limiter';
import type {
  CollegeScorecardInstitution,
  CollegeScorecardDetails,
  CollegeScorecardApiResponse,
  RawScorecardResult,
} from '@/types/college-scorecard';

const SCORECARD_BASE = 'https://api.data.gov/ed/collegescorecard/v1';

const CACHE_TTL = 86400; // 24 hours

const OWNERSHIP_MAP: Record<number, string> = {
  1: 'Public',
  2: 'Private nonprofit',
  3: 'Private for-profit',
};

const DEGREE_MAP: Record<number, string> = {
  0: 'Not classified',
  1: 'Certificate',
  2: "Associate's",
  3: "Bachelor's",
  4: 'Graduate',
};

const BASIC_FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.zip',
  'school.school_url',
  'school.ownership',
  'school.locale',
  'latest.student.size',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.average.overall',
  'latest.completion.rate_suppressed.overall',
  'latest.cost.avg_net_price.overall',
  'latest.earnings.10_yrs_after_entry.median',
  'latest.aid.median_debt_suppressed.overall',
  'school.degrees_awarded.predominant',
  'school.degrees_awarded.highest',
  'school.under_investigation',
].join(',');

const DETAIL_FIELDS = [
  BASIC_FIELDS,
  'latest.aid.federal_loan_rate',
  'latest.aid.pell_grant_rate',
  'latest.student.retention_rate.overall.full_time',
  'latest.cost.faculty_salary',
  'latest.academics.program_percentage.education',
  'latest.academics.program_percentage.health',
  'latest.academics.program_percentage.computer',
  'latest.academics.program_percentage.engineering',
  'latest.academics.program_percentage.business_marketing',
].join(',');

function transformInstitution(raw: RawScorecardResult): CollegeScorecardInstitution {
  return {
    unitId: raw.id,
    name: raw['school.name'] ?? '',
    city: raw['school.city'] ?? '',
    state: raw['school.state'] ?? '',
    zip: raw['school.zip'] ?? '',
    url: raw['school.school_url'] ?? null,
    ownership: OWNERSHIP_MAP[raw['school.ownership'] ?? 0] ?? 'Unknown',
    locale: raw['school.locale']?.toString() ?? null,
    size: raw['latest.student.size'] ?? null,
    admissionRate: raw['latest.admissions.admission_rate.overall'] ?? null,
    satAverage: raw['latest.admissions.sat_scores.average.overall'] ?? null,
    completionRate: raw['latest.completion.rate_suppressed.overall'] ?? null,
    averageNetPrice: raw['latest.cost.avg_net_price.overall'] ?? null,
    medianEarnings: raw['latest.earnings.10_yrs_after_entry.median'] ?? null,
    medianDebt: raw['latest.aid.median_debt_suppressed.overall'] ?? null,
    predominantDegree: DEGREE_MAP[raw['school.degrees_awarded.predominant'] ?? 0] ?? null,
    highestDegree: DEGREE_MAP[raw['school.degrees_awarded.highest'] ?? 0] ?? null,
    underInvestigation: raw['school.under_investigation'] === 1,
  };
}

function transformDetails(raw: RawScorecardResult): CollegeScorecardDetails {
  const base = transformInstitution(raw);
  return {
    ...base,
    federalLoanRate: raw['latest.aid.federal_loan_rate'] as number | null,
    pellGrantRate: raw['latest.aid.pell_grant_rate'] as number | null,
    retentionRate: raw['latest.student.retention_rate.overall.full_time'] as number | null,
    facultyAverageSalary: raw['latest.cost.faculty_salary'] as number | null,
    instructionalExpenditurePerStudent: null, // not in basic fields
    studentToFacultyRatio: null,
    endowmentPerStudent: null,
    programPercentages: {
      education: (raw['latest.academics.program_percentage.education'] as number) ?? 0,
      health: (raw['latest.academics.program_percentage.health'] as number) ?? 0,
      computer: (raw['latest.academics.program_percentage.computer'] as number) ?? 0,
      engineering: (raw['latest.academics.program_percentage.engineering'] as number) ?? 0,
      business: (raw['latest.academics.program_percentage.business_marketing'] as number) ?? 0,
    },
  };
}

export class CollegeScorecardService {
  /**
   * Search institutions by state and/or name.
   */
  async searchInstitutions(params: {
    state?: string;
    name?: string;
    limit?: number;
  }): Promise<CollegeScorecardInstitution[]> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return [];
    }

    const { state, name, limit = 25 } = params;
    const cacheKey = `college-scorecard:${state ?? ''}:${name ?? ''}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const queryParts: string[] = [
            `api_key=${apiKey}`,
            `fields=${BASIC_FIELDS}`,
            `per_page=${Math.min(limit, 100)}`,
            'sort=latest.student.size:desc',
          ];

          if (state) queryParts.push(`school.state=${state.toUpperCase()}`);
          if (name) queryParts.push(`school.name=${encodeURIComponent(name)}`);

          // Only degree-granting, currently operating institutions
          queryParts.push('school.operating=1');
          queryParts.push('school.degrees_awarded.predominant__range=1..4');

          const url = `${SCORECARD_BASE}/schools?${queryParts.join('&')}`;
          logger.info('College Scorecard search', { state, name });

          const response = await dataGovRateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`College Scorecard API returned ${response.status}`);
          }

          const data: CollegeScorecardApiResponse = await response.json();
          return (data.results ?? []).map(transformInstitution);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('CollegeScorecardService.searchInstitutions failed', error as Error);
      return [];
    }
  }

  /**
   * Get detailed institution data by unit ID.
   */
  async getInstitutionDetails(unitId: number): Promise<CollegeScorecardDetails | null> {
    const apiKey = getDataGovApiKey();
    if (!apiKey) {
      logger.warn('DATA_GOV_API_KEY not configured');
      return null;
    }

    const cacheKey = `college-scorecard-detail:${unitId}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${SCORECARD_BASE}/schools?api_key=${apiKey}&id=${unitId}&fields=${DETAIL_FIELDS}`;
          logger.info('College Scorecard details', { unitId });

          const response = await dataGovRateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`College Scorecard API returned ${response.status}`);
          }

          const data: CollegeScorecardApiResponse = await response.json();
          const result = data.results?.[0];
          if (!result) return null;

          return transformDetails(result);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('CollegeScorecardService.getInstitutionDetails failed', error as Error);
      return null;
    }
  }
}

export const collegeScorecardService = new CollegeScorecardService();
