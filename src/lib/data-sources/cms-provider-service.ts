/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CMS Provider Data Service
 *
 * Queries CMS Provider Data for hospital and nursing home information.
 * Uses the data.cms.gov Socrata-compatible API.
 *
 * API: https://data.cms.gov/provider-data/
 * No API key required.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  Hospital,
  NursingHome,
  RawHospitalRecord,
  RawNursingHomeRecord,
} from '@/types/cms';

// CMS dataset identifiers (Socrata API format)
const HOSPITAL_DATASET = 'https://data.cms.gov/provider-data/api/1/datastore/sql';
const NURSING_HOME_DATASET = 'https://data.cms.gov/provider-data/api/1/datastore/sql';

// CMS dataset UUIDs
const HOSPITAL_UUID = 'xubh-q36u'; // Hospital General Information
const NURSING_HOME_UUID = '4pq5-n9py'; // Nursing Home Compare (Provider Info)

const MIN_REQUEST_INTERVAL_MS = 200;
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

function parseIntOrNull(value: string | undefined | null): number | null {
  if (!value || value === 'Not Available' || value === '') return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

function parseNationalComparison(value: string | undefined | null): string | null {
  if (!value || value === 'Not Available' || value === '') return null;
  return value;
}

function transformHospital(raw: RawHospitalRecord): Hospital {
  return {
    facilityId: raw.facility_id ?? '',
    facilityName: raw.facility_name ?? '',
    address: raw.address ?? '',
    city: raw.city ?? '',
    state: raw.state ?? '',
    zipCode: raw.zip_code ?? '',
    countyName: raw.county_name ?? '',
    phoneNumber: raw.phone_number ?? '',
    hospitalType: raw.hospital_type ?? '',
    hospitalOwnership: raw.hospital_ownership ?? '',
    emergencyServices: raw.emergency_services === 'Yes',
    overallRating: parseIntOrNull(raw.hospital_overall_rating),
    mortalityNationalComparison: parseNationalComparison(raw.mortality_national_comparison),
    safetyNationalComparison: parseNationalComparison(
      raw.safety_of_care_national_comparison
    ),
    readmissionNationalComparison: parseNationalComparison(
      raw.readmission_national_comparison
    ),
    patientExperienceNationalComparison: parseNationalComparison(
      raw.patient_experience_national_comparison
    ),
    effectivenessNationalComparison: parseNationalComparison(
      raw.effectiveness_of_care_national_comparison
    ),
    timelinessNationalComparison: parseNationalComparison(
      raw.timeliness_of_care_national_comparison
    ),
    efficientUseOfMedicalImaging: parseNationalComparison(
      raw.efficient_use_of_medical_imaging_national_comparison
    ),
  };
}

function transformNursingHome(raw: RawNursingHomeRecord): NursingHome {
  return {
    federalProviderNumber: raw.federal_provider_number ?? '',
    providerName: raw.provider_name ?? '',
    providerAddress: raw.provider_address ?? '',
    providerCity: raw.provider_city ?? '',
    providerState: raw.provider_state ?? '',
    providerZipCode: raw.provider_zip_code ?? '',
    providerCountyName: raw.provider_county_name ?? '',
    phoneNumber: raw.provider_phone_number ?? '',
    ownershipType: raw.ownership_type ?? '',
    numberOfCertifiedBeds: parseIntOrNull(raw.number_of_certified_beds),
    numberOfResidents: parseIntOrNull(raw.number_of_residents_in_certified_beds),
    overallRating: parseIntOrNull(raw.overall_rating),
    healthInspectionRating: parseIntOrNull(raw.health_inspection_rating),
    staffingRating: parseIntOrNull(raw.staffing_rating),
    qualityMeasureRating: parseIntOrNull(raw.quality_measure_five_star_rating),
    abuseIcon: raw.abuse_icon === 'Y' ? 'Yes' : null,
    inSpecialFocusFacilityProgram:
      raw.special_focus_status === 'SFF' || raw.special_focus_status === 'SFF Candidate',
    totalWeightedHealthSurveyScore: parseIntOrNull(raw.total_weighted_health_survey_score),
  };
}

export class CmsProviderService {
  /**
   * Search CMS hospitals by state, optionally filtered by city.
   */
  async searchHospitals(state: string, city?: string): Promise<Hospital[]> {
    const stateUpper = state.toUpperCase();
    const cacheKey = `cms-hospitals:${stateUpper}:${city ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          let whereClause = `state = '${stateUpper}'`;
          if (city) {
            whereClause += ` AND UPPER(city) = '${city.toUpperCase().replace(/'/g, "''")}'`;
          }

          const query = encodeURIComponent(
            `[SELECT * FROM ${HOSPITAL_UUID}][WHERE ${whereClause}][LIMIT 200]`
          );
          const url = `${HOSPITAL_DATASET}?query=${query}`;
          logger.info('CMS hospital search', { state: stateUpper, city });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`CMS API returned ${response.status}`);
          }

          const data: RawHospitalRecord[] = await response.json();
          if (!Array.isArray(data)) return [];

          return data.map(transformHospital);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('CmsProviderService.searchHospitals failed', error as Error);
      return [];
    }
  }

  /**
   * Search CMS nursing homes by state, optionally filtered by city.
   */
  async searchNursingHomes(state: string, city?: string): Promise<NursingHome[]> {
    const stateUpper = state.toUpperCase();
    const cacheKey = `cms-nursing-homes:${stateUpper}:${city ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          let whereClause = `provider_state = '${stateUpper}'`;
          if (city) {
            whereClause += ` AND UPPER(provider_city) = '${city.toUpperCase().replace(/'/g, "''")}'`;
          }

          const query = encodeURIComponent(
            `[SELECT * FROM ${NURSING_HOME_UUID}][WHERE ${whereClause}][LIMIT 200]`
          );
          const url = `${NURSING_HOME_DATASET}?query=${query}`;
          logger.info('CMS nursing home search', { state: stateUpper, city });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`CMS API returned ${response.status}`);
          }

          const data: RawNursingHomeRecord[] = await response.json();
          if (!Array.isArray(data)) return [];

          return data.map(transformNursingHome);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('CmsProviderService.searchNursingHomes failed', error as Error);
      return [];
    }
  }
}

export const cmsProviderService = new CmsProviderService();
