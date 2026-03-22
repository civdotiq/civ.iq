/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CMS Provider Data Service
 *
 * Queries CMS Provider Data for hospital and nursing home information.
 * Uses the data.cms.gov DKAN query API.
 *
 * API: https://data.cms.gov/provider-data/
 * No API key required.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type { Hospital, NursingHome } from '@/types/cms';

// CMS DKAN query endpoint
const CMS_QUERY_BASE = 'https://data.cms.gov/provider-data/api/1/datastore/query';

// Distribution UUIDs (not dataset UUIDs — CMS DKAN requires these)
const HOSPITAL_DIST_UUID = 'ae3f2207-fca8-50d5-9fd5-d6a7d3426ee3';
const NURSING_HOME_DIST_UUID = '70aaea3b-015d-5534-91fc-469709efb895';

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

/** Build CMS DKAN query URL with conditions */
function buildQueryUrl(
  distUuid: string,
  conditions: Array<{ property: string; value: string }>,
  limit: number
): string {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', '0');

  for (let i = 0; i < conditions.length; i++) {
    params.set(`conditions[${i}][property]`, conditions[i]!.property);
    params.set(`conditions[${i}][value]`, conditions[i]!.value);
    params.set(`conditions[${i}][operator]`, '=');
  }

  return `${CMS_QUERY_BASE}/${distUuid}?${params.toString()}`;
}

// Raw record type from DKAN query (field names differ from Socrata)
interface RawHospitalDkan {
  facility_id: string;
  facility_name: string;
  address: string;
  citytown: string;
  state: string;
  zip_code: string;
  countyparish: string;
  telephone_number: string;
  hospital_type: string;
  hospital_ownership: string;
  emergency_services: string;
  hospital_overall_rating: string;
  mortality_national_comparison?: string;
  safety_of_care_national_comparison?: string;
  readmission_national_comparison?: string;
  patient_experience_national_comparison?: string;
  effectiveness_of_care_national_comparison?: string;
  timeliness_of_care_national_comparison?: string;
  efficient_use_of_medical_imaging_national_comparison?: string;
}

interface RawNursingHomeDkan {
  cms_certification_number_ccn: string;
  provider_name: string;
  provider_address: string;
  citytown: string;
  state: string;
  zip_code: string;
  countyparish: string;
  telephone_number: string;
  ownership_type: string;
  number_of_certified_beds: string;
  average_number_of_residents_per_day: string;
  overall_rating: string;
  health_inspection_rating: string;
  staffing_rating: string;
  qm_rating: string;
  abuse_icon: string;
  special_focus_status: string;
  total_weighted_health_survey_score: string;
}

function transformHospital(raw: RawHospitalDkan): Hospital {
  return {
    facilityId: raw.facility_id ?? '',
    facilityName: raw.facility_name ?? '',
    address: raw.address ?? '',
    city: raw.citytown ?? '',
    state: raw.state ?? '',
    zipCode: raw.zip_code ?? '',
    countyName: raw.countyparish ?? '',
    phoneNumber: raw.telephone_number ?? '',
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

function transformNursingHome(raw: RawNursingHomeDkan): NursingHome {
  return {
    federalProviderNumber: raw.cms_certification_number_ccn ?? '',
    providerName: raw.provider_name ?? '',
    providerAddress: raw.provider_address ?? '',
    providerCity: raw.citytown ?? '',
    providerState: raw.state ?? '',
    providerZipCode: raw.zip_code ?? '',
    providerCountyName: raw.countyparish ?? '',
    phoneNumber: raw.telephone_number ?? '',
    ownershipType: raw.ownership_type ?? '',
    numberOfCertifiedBeds: parseIntOrNull(raw.number_of_certified_beds),
    numberOfResidents: parseIntOrNull(raw.average_number_of_residents_per_day),
    overallRating: parseIntOrNull(raw.overall_rating),
    healthInspectionRating: parseIntOrNull(raw.health_inspection_rating),
    staffingRating: parseIntOrNull(raw.staffing_rating),
    qualityMeasureRating: parseIntOrNull(raw.qm_rating),
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
          const conditions: Array<{ property: string; value: string }> = [
            { property: 'state', value: stateUpper },
          ];
          if (city) {
            conditions.push({ property: 'citytown', value: city.toUpperCase() });
          }

          const url = buildQueryUrl(HOSPITAL_DIST_UUID, conditions, 200);
          logger.info('CMS hospital search', { state: stateUpper, city });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`CMS API returned ${response.status}`);
          }

          const data = await response.json();
          const results: RawHospitalDkan[] = data.results ?? [];

          return results.map(transformHospital);
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
          const conditions: Array<{ property: string; value: string }> = [
            { property: 'state', value: stateUpper },
          ];
          if (city) {
            conditions.push({ property: 'citytown', value: city.toUpperCase() });
          }

          const url = buildQueryUrl(NURSING_HOME_DIST_UUID, conditions, 200);
          logger.info('CMS nursing home search', { state: stateUpper, city });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`CMS API returned ${response.status}`);
          }

          const data = await response.json();
          const results: RawNursingHomeDkan[] = data.results ?? [];

          return results.map(transformNursingHome);
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
