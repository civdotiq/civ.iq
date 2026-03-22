/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CMS Provider Data Types
 *
 * Types for CMS Hospital Compare and Nursing Home Compare datasets.
 *
 * API: https://data.cms.gov/provider-data/
 * No API key required.
 */

/** CMS Hospital from Hospital General Information dataset */
export interface Hospital {
  facilityId: string;
  facilityName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  countyName: string;
  phoneNumber: string;
  hospitalType: string;
  hospitalOwnership: string;
  emergencyServices: boolean;
  overallRating: number | null;
  mortalityNationalComparison: string | null;
  safetyNationalComparison: string | null;
  readmissionNationalComparison: string | null;
  patientExperienceNationalComparison: string | null;
  effectivenessNationalComparison: string | null;
  timelinessNationalComparison: string | null;
  efficientUseOfMedicalImaging: string | null;
}

/** CMS Nursing Home from Nursing Home Compare dataset */
export interface NursingHome {
  federalProviderNumber: string;
  providerName: string;
  providerAddress: string;
  providerCity: string;
  providerState: string;
  providerZipCode: string;
  providerCountyName: string;
  phoneNumber: string;
  ownershipType: string;
  numberOfCertifiedBeds: number | null;
  numberOfResidents: number | null;
  overallRating: number | null;
  healthInspectionRating: number | null;
  staffingRating: number | null;
  qualityMeasureRating: number | null;
  abuseIcon: string | null;
  inSpecialFocusFacilityProgram: boolean;
  totalWeightedHealthSurveyScore: number | null;
}

/** Combined quality summary for a provider */
export interface ProviderQuality {
  facilityId: string;
  name: string;
  type: 'hospital' | 'nursing_home';
  overallRating: number | null;
  city: string;
  state: string;
  metrics: Record<string, string | number | null>;
}

// ── Raw API response types ──────────────────────────────────────

/** Raw CMS dataset response from data.cms.gov */
export interface CmsDatasetResponse<T> {
  data: T[];
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

/** Raw hospital record from CMS */
export interface RawHospitalRecord {
  facility_id: string;
  facility_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  county_name: string;
  phone_number: string;
  hospital_type: string;
  hospital_ownership: string;
  emergency_services: string;
  hospital_overall_rating: string;
  mortality_national_comparison: string;
  safety_of_care_national_comparison: string;
  readmission_national_comparison: string;
  patient_experience_national_comparison: string;
  effectiveness_of_care_national_comparison: string;
  timeliness_of_care_national_comparison: string;
  efficient_use_of_medical_imaging_national_comparison: string;
}

/** Raw nursing home record from CMS */
export interface RawNursingHomeRecord {
  federal_provider_number: string;
  provider_name: string;
  provider_address: string;
  provider_city: string;
  provider_state: string;
  provider_zip_code: string;
  provider_county_name: string;
  provider_phone_number: string;
  ownership_type: string;
  number_of_certified_beds: string;
  number_of_residents_in_certified_beds: string;
  overall_rating: string;
  health_inspection_rating: string;
  staffing_rating: string;
  quality_measure_five_star_rating: string;
  abuse_icon: string;
  special_focus_status: string;
  total_weighted_health_survey_score: string;
}
