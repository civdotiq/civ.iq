/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * EPA ECHO Service
 *
 * Queries EPA Enforcement and Compliance History Online (ECHO) data:
 * - Facility search via ECHO REST Services
 * - Violations via Detailed Facility Report (DFR)
 * - Superfund sites via EPA GIS Feature Service
 * - Toxic Release Inventory via Envirofacts
 *
 * No API key required for any endpoint.
 */

import { cachedFetch } from '@/lib/cache';
import { parseUpstreamTotal, type CountedResult } from '@/lib/data-sources/upstream-total';
import logger from '@/lib/logging/simple-logger';
import type {
  EpaFacility,
  EpaViolation,
  EpaEnforcementCase,
  EpaEnforcementCaseDetail,
  EpaComplianceTimeline,
  EpaComplianceQuarter,
  SuperfundSite,
  ToxicRelease,
  EchoSearchResponse,
  EchoQidResponse,
  DfrViolationsResponse,
  GisFeatureResponse,
  TriFacilityResponse,
} from '@/types/epa';

const ECHO_BASE = 'https://echodata.epa.gov/echo';
const GIS_BASE = 'https://geopub.epa.gov/arcgis/rest/services/EMEF/efpoints/MapServer/0/query';
const TRI_BASE = 'https://data.epa.gov/efservice';

const MIN_REQUEST_INTERVAL_MS = 200;
let lastRequestTime = 0;
const CACHE_TTL = 21600; // 6 hours

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

function transformFacility(raw: Record<string, string | null>): EpaFacility {
  return {
    registryId: raw['RegistryID'] ?? '',
    name: raw['FacName'] ?? '',
    street: raw['FacStreet'] ?? '',
    city: raw['FacCity'] ?? '',
    state: raw['FacState'] ?? '',
    zip: raw['FacZip'] ?? '',
    county: raw['FacCounty'] ?? '',
    countyFips: raw['FacDerivedStctyFIPS'] ?? '',
    latitude: raw['FacLat'] ? parseFloat(raw['FacLat']) : null,
    longitude: raw['FacLong'] ? parseFloat(raw['FacLong']) : null,
    sicCodes: raw['FacSICCodes'] ?? '',
    naicsCodes: raw['FacNAICSCodes'] ?? '',
    complianceStatus: raw['FacComplianceStatus'] ?? 'Unknown',
    sncFlag: raw['FacSNCFlg'] ?? 'N',
    totalPenalties: raw['FacTotalPenalties'] ?? '$0',
    inspectionCount: raw['FacInspectionCount'] ? parseInt(raw['FacInspectionCount'], 10) : 0,
    formalActionCount: raw['FacFormalActionCount'] ? parseInt(raw['FacFormalActionCount'], 10) : 0,
    triReleasesTransfers: raw['TRIReleasesTransfers'] ?? null,
  };
}

export class EpaEchoService {
  /**
   * Search EPA-regulated facilities by state, ZIP, or SIC code.
   * Uses the two-step ECHO REST pattern: search → get_qid.
   */
  async searchFacilities(params: {
    state: string;
    zip?: string;
    sicCode?: string;
    limit?: number;
  }): Promise<EpaFacility[]> {
    return (await this.searchFacilitiesWithTotal(params)).items;
  }

  /**
   * As `searchFacilities`, but also reports how many facilities match upstream.
   *
   * ECHO's step-1 search already returns `QueryRows` — the size of the whole
   * result set — and the row fetch that follows is capped at a 100-row
   * responseset. Callers that publish a facility count need the former; the
   * rows only support the per-facility detail.
   */
  async searchFacilitiesWithTotal(params: {
    state: string;
    zip?: string;
    sicCode?: string;
    limit?: number;
  }): Promise<CountedResult<EpaFacility>> {
    const { state, zip, sicCode, limit = 20 } = params;
    const cacheKey = `epa-facilities-ct:${state}:${zip ?? ''}:${sicCode ?? ''}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          // Step 1: Search to get a QID
          const searchParams = new URLSearchParams({
            output: 'JSON',
            p_st: state.toUpperCase(),
            p_act: 'Y', // Active facilities only
            responseset: String(Math.min(limit, 100)),
          });
          if (zip) searchParams.set('p_zip', zip);
          if (sicCode) searchParams.set('p_sic', sicCode);
          // A state-only search returns hundreds of thousands of rows and ECHO
          // rejects it with a queryset-limit error. When no ZIP/SIC narrows the
          // query, restrict to major facilities to stay under the limit.
          if (!zip && !sicCode) searchParams.set('p_maj', 'Y');

          const searchUrl = `${ECHO_BASE}/echo_rest_services.get_facilities?${searchParams}`;
          logger.info('EPA ECHO facility search', { state, zip, sicCode });

          const searchResponse = await rateLimitedFetch(searchUrl);
          if (!searchResponse.ok) {
            throw new Error(`ECHO API returned ${searchResponse.status}`);
          }

          const searchData: EchoSearchResponse = await searchResponse.json();
          const totalAvailable = parseUpstreamTotal(searchData.Results?.QueryRows);
          if (searchData.Results?.QueryRows === '0') return { items: [], totalAvailable: 0 };
          const qid = searchData.Results?.QueryID;
          if (!qid) {
            // ECHO returns HTTP 200 with an error message (not results) when a
            // query is rejected — surface it instead of masking it as "0".
            const echoError = searchData.Results?.Error ?? searchData.Results?.Message;
            throw new Error(`ECHO search returned no QueryID${echoError ? `: ${echoError}` : ''}`);
          }

          // Step 2: Fetch facility data using QID
          const qidParams = new URLSearchParams({
            output: 'JSON',
            qid,
            // 91 is FacDerivedStctyFIPS, the state+county FIPS EPA derives for
            // each facility — the only field here that joins to the county and
            // district mappings. FacCounty (7) is a name and is often null.
            qcolumns: '1,2,3,4,5,6,7,15,16,17,18,34,36,41,54,60,68,91',
            responseset: String(Math.min(limit, 100)),
          });

          const qidUrl = `${ECHO_BASE}/echo_rest_services.get_qid?${qidParams}`;
          const qidResponse = await rateLimitedFetch(qidUrl);
          if (!qidResponse.ok) {
            throw new Error(`ECHO QID API returned ${qidResponse.status}`);
          }

          const qidData: EchoQidResponse = await qidResponse.json();
          const facilities = qidData.Results?.Facilities ?? [];
          return { items: facilities.map(transformFacility), totalAvailable };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EpaEchoService.searchFacilities failed', error as Error);
      return { items: [], totalAvailable: null };
    }
  }

  /**
   * Get violations for a specific facility by registry ID.
   * Uses the DFR (Detailed Facility Report) API.
   */
  async getFacilityViolations(registryId: string): Promise<EpaViolation[]> {
    const cacheKey = `epa-violations:${registryId}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${ECHO_BASE}/dfr_rest_services.get_dfr?p_id=${encodeURIComponent(registryId)}&output=JSON`;
          logger.info('EPA DFR violation fetch', { registryId });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`DFR API returned ${response.status}`);
          }

          const data: DfrViolationsResponse = await response.json();
          const sources = data.Results?.ViolationsEnforcementActions?.Sources ?? [];
          const violations: EpaViolation[] = [];

          for (const source of sources) {
            for (const v of source.Violations ?? []) {
              violations.push({
                sourceId: v.SourceID ?? '',
                violationId: v.ViolationID ?? '',
                federalRule: v.FederalRule ?? '',
                contaminantName: v.ContaminantName ?? '',
                violationCategoryCode: v.ViolationCategoryCode ?? '',
                violationCategoryDesc: v.ViolationCategoryDesc ?? '',
                compliancePeriodBeginDate: v.CompliancePeriodBeginDate ?? null,
                compliancePeriodEndDate: v.CompliancePeriodEndDate ?? null,
                status: v.Status ?? 'Unknown',
                enforcementActions: (v.EnforcementActions ?? []).map(a => ({
                  actionId: a.ActionID ?? '',
                  actionType: a.ActionType ?? '',
                  actionDate: a.ActionDate ?? '',
                  penaltyAmount: a.PenaltyAmount ?? null,
                })),
              });
            }
          }

          return violations;
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EpaEchoService.getFacilityViolations failed', error as Error);
      return [];
    }
  }

  /**
   * Get Superfund (NPL) sites by state via EPA GIS Feature Service.
   */
  async getSuperfundSites(state: string): Promise<SuperfundSite[]> {
    const cacheKey = `epa-superfund:${state.toUpperCase()}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            where: `state_code='${state.toUpperCase()}'`,
            outFields: '*',
            f: 'json',
            resultRecordCount: '500',
          });

          const url = `${GIS_BASE}?${params}`;
          logger.info('EPA Superfund site search', { state });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            throw new Error(`EPA GIS API returned ${response.status}`);
          }

          const data: GisFeatureResponse = await response.json();
          return (data.features ?? []).map(f => {
            const a = f.attributes;
            return {
              registryId: String(a['registry_id'] ?? ''),
              siteId: String(a['site_id'] ?? ''),
              name: String(a['primary_name'] ?? ''),
              address: String(a['location_address'] ?? ''),
              city: String(a['city_name'] ?? ''),
              county: String(a['county_name'] ?? ''),
              state: String(a['state_code'] ?? ''),
              epaRegion: String(a['epa_region'] ?? ''),
              zip: String(a['postal_code'] ?? ''),
              latitude: typeof a['latitude'] === 'number' ? a['latitude'] : null,
              longitude: typeof a['longitude'] === 'number' ? a['longitude'] : null,
            };
          });
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EpaEchoService.getSuperfundSites failed', error as Error);
      return [];
    }
  }

  /**
   * Get Toxic Release Inventory (TRI) facilities by state and optional county.
   * Uses EPA Envirofacts REST API.
   */
  async getToxicReleases(state: string, county?: string): Promise<ToxicRelease[]> {
    const cacheKey = `epa-tri:${state.toUpperCase()}:${county ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          let url = `${TRI_BASE}/tri_facility/state_abbr/${state.toUpperCase()}`;
          if (county) {
            url += `/county_name/${encodeURIComponent(county.toUpperCase())}`;
          }
          url += '/rows/0:999/JSON';

          logger.info('EPA TRI facility search', { state, county });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`Envirofacts API returned ${response.status}`);
          }

          const data: TriFacilityResponse[] = await response.json();
          if (!Array.isArray(data)) return [];

          return data.map(f => ({
            facilityId: f.tri_facility_id ?? '',
            facilityName: f.facility_name ?? '',
            street: f.street_address ?? '',
            city: f.city_name ?? '',
            county: f.county_name ?? '',
            state: f.state_abbr ?? '',
            zip: f.zip_code ?? '',
            countyFips: f.state_county_fips_code ?? '',
            epaRegion: f.region ?? '',
            latitude: f.pref_latitude ? parseFloat(f.pref_latitude) : null,
            longitude: f.pref_longitude ? parseFloat(f.pref_longitude) : null,
            parentCompany: f.standardized_parent_company ?? f.parent_co_name ?? null,
            epaRegistryId: f.epa_registry_id ?? null,
            isClosed: f.fac_closed_ind === '1',
          }));
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EpaEchoService.getToxicReleases failed', error as Error);
      return [];
    }
  }
  /**
   * Search EPA enforcement cases by state, SIC code, or facility name.
   * Uses the ECHO case_rest_services API.
   */
  async searchEnforcementCases(params: {
    state?: string;
    sicCode?: string;
    facilityName?: string;
    penaltyMin?: number;
    dateFrom?: string;
  }): Promise<EpaEnforcementCase[]> {
    const { state, sicCode, facilityName, penaltyMin, dateFrom } = params;
    const cacheKey = `epa-enforcement:${state ?? ''}:${sicCode ?? ''}:${facilityName?.slice(0, 20) ?? ''}:${penaltyMin ?? ''}:${dateFrom ?? ''}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const qp = new URLSearchParams({
            output: 'JSON',
            responseset: '100',
          });

          if (state) qp.set('p_st', state.toUpperCase());
          if (sicCode) qp.set('p_sic', sicCode);
          if (facilityName) qp.set('p_name', facilityName);
          if (penaltyMin) qp.set('p_penalty', String(penaltyMin));
          if (dateFrom) qp.set('p_cs_date_from', dateFrom);

          const searchUrl = `${ECHO_BASE}/case_rest_services.get_cases?${qp.toString()}`;
          logger.info('EPA enforcement case search', { state, sicCode });

          const searchResponse = await rateLimitedFetch(searchUrl);
          if (!searchResponse.ok) {
            throw new Error(`ECHO case API returned ${searchResponse.status}`);
          }

          const data = await searchResponse.json();
          const cases = data.Results?.Cases ?? [];

          return cases.map((c: Record<string, string | null>) => ({
            caseNumber: c['CaseNumber'] ?? '',
            caseName: c['CaseName'] ?? '',
            activityTypeDesc: c['ActivityTypeDesc'] ?? '',
            enforcementOutcome: c['EnforcementOutcome'] ?? '',
            totalPenalties: parseFloat(c['TotalPenalties'] ?? '0') || 0,
            federalPenalty: parseFloat(c['FederalPenalty'] ?? '0') || 0,
            stateLocalPenalty: parseFloat(c['StateLocalPenalty'] ?? '0') || 0,
            complianceActionCost: parseFloat(c['ComplianceActionCost'] ?? '0') || 0,
            settlementDate: c['SettlementDate'] ?? null,
            leadAgency: c['LeadAgency'] ?? '',
            defendants: (c['Defendants'] ?? '').split(';').filter(Boolean),
            facilityState: c['FacilityState'] ?? '',
            facilitySICCode: c['FacilitySICCode'] ?? null,
          })) as EpaEnforcementCase[];
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EpaEchoService.searchEnforcementCases failed', error as Error);
      return [];
    }
  }

  /**
   * Get detailed enforcement case information including penalty breakdown.
   */
  async getEnforcementCaseDetail(caseNumber: string): Promise<EpaEnforcementCaseDetail | null> {
    const cacheKey = `epa-case-detail:${caseNumber}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const qp = new URLSearchParams({
            p_case_number: caseNumber,
            output: 'JSON',
          });

          const url = `${ECHO_BASE}/case_rest_services.get_case_detail?${qp.toString()}`;
          logger.info('EPA enforcement case detail', { caseNumber });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`ECHO case detail API returned ${response.status}`);
          }

          const data = await response.json();
          const c = data.Results?.Cases?.[0] as Record<string, string | null> | undefined;
          if (!c) return null;

          return {
            caseNumber: c['CaseNumber'] ?? '',
            caseName: c['CaseName'] ?? '',
            activityTypeDesc: c['ActivityTypeDesc'] ?? '',
            enforcementOutcome: c['EnforcementOutcome'] ?? '',
            totalPenalties: parseFloat(c['TotalPenalties'] ?? '0') || 0,
            federalPenalty: parseFloat(c['FederalPenalty'] ?? '0') || 0,
            stateLocalPenalty: parseFloat(c['StateLocalPenalty'] ?? '0') || 0,
            complianceActionCost: parseFloat(c['ComplianceActionCost'] ?? '0') || 0,
            settlementDate: c['SettlementDate'] ?? null,
            leadAgency: c['LeadAgency'] ?? '',
            defendants: (c['Defendants'] ?? '').split(';').filter(Boolean),
            facilityState: c['FacilityState'] ?? '',
            facilitySICCode: c['FacilitySICCode'] ?? null,
            penaltyAssessed: parseFloat(c['PenaltyAssessed'] ?? '0') || 0,
            penaltyPaid: parseFloat(c['PenaltyPaid'] ?? '0') || 0,
            enforcementType: c['EnforcementType'] ?? '',
            relatedFacilities: (c['RelatedFacilities'] ?? '').split(';').filter(Boolean),
          } as EpaEnforcementCaseDetail;
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EpaEchoService.getEnforcementCaseDetail failed', error as Error);
      return null;
    }
  }

  /**
   * Get quarterly compliance history for a facility.
   * Uses the DFR API compliance_summary.
   */
  async getComplianceHistory(registryId: string): Promise<EpaComplianceTimeline | null> {
    const cacheKey = `epa-compliance:${registryId}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${ECHO_BASE}/dfr_rest_services.get_dfr?p_id=${encodeURIComponent(registryId)}&output=JSON`;
          logger.info('EPA compliance history fetch', { registryId });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`DFR compliance API returned ${response.status}`);
          }

          const data = await response.json();
          const dfr = data.Results;
          if (!dfr) return null;

          const facilityName = dfr.Facility?.FacName ?? '';

          // Extract compliance quarters from DFR data
          const quarters: EpaComplianceQuarter[] = [];
          const complianceSources = dfr.ComplianceSummary?.Sources ?? [];

          for (const source of complianceSources) {
            for (const quarter of source.Quarters ?? []) {
              quarters.push({
                quarter: quarter.YearQuarter ?? '',
                status:
                  quarter.Status === 'V'
                    ? 'in_violation'
                    : quarter.Status === 'C'
                      ? 'in_compliance'
                      : 'unknown',
                programArea: source.ProgramArea ?? '',
              });
            }
          }

          const violationQuarters = quarters.filter(q => q.status === 'in_violation').length;

          return {
            registryId,
            facilityName,
            quarters,
            currentStatus: dfr.Facility?.FacComplianceStatus ?? 'Unknown',
            totalQuarters: quarters.length,
            violationQuarters,
          } as EpaComplianceTimeline;
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('EpaEchoService.getComplianceHistory failed', error as Error);
      return null;
    }
  }
}

export const epaEchoService = new EpaEchoService();
