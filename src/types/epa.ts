/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * EPA ECHO (Enforcement and Compliance History Online) Types
 *
 * Types for EPA facility search, violations, Superfund sites, and TRI data.
 *
 * APIs:
 * - ECHO REST: https://echodata.epa.gov/echo/echo_rest_services
 * - DFR: https://echodata.epa.gov/echo/dfr_rest_services
 * - GIS (Superfund): https://geopub.epa.gov/arcgis/rest/services/EMEF/efpoints/MapServer/0/query
 * - Envirofacts (TRI): https://data.epa.gov/efservice
 */

/** EPA-regulated facility from ECHO REST search */
export interface EpaFacility {
  registryId: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  latitude: number | null;
  longitude: number | null;
  sicCodes: string;
  naicsCodes: string;
  complianceStatus: string;
  sncFlag: string;
  totalPenalties: string;
  inspectionCount: number;
  formalActionCount: number;
  triReleasesTransfers: string | null;
}

/** Violation record from EPA DFR */
export interface EpaViolation {
  sourceId: string;
  violationId: string;
  federalRule: string;
  contaminantName: string;
  violationCategoryCode: string;
  violationCategoryDesc: string;
  compliancePeriodBeginDate: string | null;
  compliancePeriodEndDate: string | null;
  status: string;
  enforcementActions: Array<{
    actionId: string;
    actionType: string;
    actionDate: string;
    penaltyAmount: string | null;
  }>;
}

/** Superfund (NPL) site from EPA GIS Feature Service */
export interface SuperfundSite {
  registryId: string;
  siteId: string;
  name: string;
  address: string;
  city: string;
  county: string;
  state: string;
  epaRegion: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
}

/** Toxic Release Inventory facility from Envirofacts */
export interface ToxicRelease {
  facilityId: string;
  facilityName: string;
  street: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  countyFips: string;
  epaRegion: string;
  latitude: number | null;
  longitude: number | null;
  parentCompany: string | null;
  epaRegistryId: string | null;
  isClosed: boolean;
}

// ── Raw API response types ──────────────────────────────────────

/** ECHO REST search response envelope */
export interface EchoSearchResponse {
  Results: {
    Message: string;
    QueryRows: string;
    QueryID: string;
    CAARows?: string;
    CWARows?: string;
    RCRRows?: string;
    TRIRows?: string;
    TotalPenalties?: string;
  };
}

/** ECHO REST QID response with facility data */
export interface EchoQidResponse {
  Results: {
    QueryRows: string;
    Facilities: Array<Record<string, string | null>>;
  };
}

/** DFR response for violations */
export interface DfrViolationsResponse {
  Results: {
    ViolationsEnforcementActions?: {
      Sources?: Array<{
        Violations?: Array<{
          SourceID: string;
          ViolationID: string;
          FederalRule: string;
          ContaminantName: string;
          ViolationCategoryCode: string;
          ViolationCategoryDesc: string;
          CompliancePeriodBeginDate: string | null;
          CompliancePeriodEndDate: string | null;
          Status: string;
          EnforcementActions?: Array<{
            ActionID: string;
            ActionType: string;
            ActionDate: string;
            PenaltyAmount: string | null;
          }>;
        }>;
      }>;
    };
  };
}

/** GIS Feature Service response for Superfund sites */
export interface GisFeatureResponse {
  features: Array<{
    attributes: Record<string, string | number | null>;
  }>;
}

/** Envirofacts TRI facility response */
export interface TriFacilityResponse {
  tri_facility_id: string;
  facility_name: string;
  street_address: string;
  city_name: string;
  county_name: string;
  state_abbr: string;
  zip_code: string;
  state_county_fips_code: string;
  region: string;
  fac_closed_ind: string;
  pref_latitude: string;
  pref_longitude: string;
  epa_registry_id: string | null;
  parent_co_name: string | null;
  standardized_parent_company: string | null;
}
