/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Economic & Infrastructure Health Data Types
// All metrics are number | null: null = data unavailable (no real API source
// or upstream failure); 0 is reserved for a genuine measured zero.
export interface EconomicProfile {
  employment: {
    unemploymentRate: number | null; // Percentage (BLS LAUS, statewide)
    laborForceParticipation: number | null; // Percentage (BLS LAUS, statewide)
    jobGrowthRate: number | null; // Percentage; null = no data source
    majorIndustries: string[];
    averageWage: number | null; // Annual dollars (BLS QCEW, statewide)
  };
  infrastructure: {
    // All null = no real API source exists for these metrics
    bridgeConditionRating: number | null; // 0-100 scale
    highwayFunding: number | null; // Annual federal funding
    broadbandAvailability: number | null; // Percentage with high-speed access
    publicTransitAccessibility: number | null; // 0-100 scale
  };
  connectivity: {
    // All null pending a correct FCC Broadband Data Collection integration;
    // the prior values were formula-derived, not measured
    fiberAvailability: number | null; // Percentage with fiber access
    averageDownloadSpeed: number | null; // Mbps
    averageUploadSpeed: number | null; // Mbps
    digitalDivideIndex: number | null; // 0-100, higher = more connected
  };
}

// Education & Healthcare Access Data Types
// All metrics are number | null: null = data unavailable (no real API source
// or upstream failure); 0 is reserved for a genuine measured zero.
export interface ServicesHealthProfile {
  education: {
    schoolDistrictPerformance: number | null; // 0-100 scale
    graduationRate: number | null; // Percentage
    collegeEnrollmentRate: number | null; // Percentage
    federalEducationFunding: number | null; // Annual federal revenue to state school systems (statewide, Census ASFIN)
    teacherToStudentRatio: number | null; // Students per teacher
  };
  healthcare: {
    hospitalQualityRating: number | null; // 0-5 star rating
    primaryCarePhysiciansPerCapita: number | null;
    healthOutcomeIndex: number | null; // 0-100 scale
    medicareProviderCount: number | null;
    healthcareCostIndex: number | null; // Relative to national average
  };
  // CDC PLACES county-level model-based estimates (BRFSS crude prevalence).
  // PLACES does not publish congressional-district figures: values are for
  // the counties overlapping the district (Census CD-county crosswalk) and
  // are presented per county, never synthesized into a district number.
  // null = data unavailable. The pre-2026-07 fields (preventableDiseaseRate
  // "per 100,000", mentalHealthProviderRatio, substanceAbusePrograms) did
  // not map to anything PLACES publishes and were removed.
  publicHealth: {
    dataYear: string | null; // BRFSS survey year of the PLACES release
    measures: Array<{
      measureId: string; // CDC PLACES measure id, e.g. 'DIABETES'
      label: string;
      unit: '%';
      counties: Array<{
        fips: string;
        name: string;
        value: number; // crude prevalence, percent of adults
        lowCI: number | null;
        highCI: number | null;
      }>;
    }>;
    // Population-weighted DISTRICT estimate aggregated from PLACES census-tract
    // values (tracts nest inside districts via the Census CD-to-tract crosswalk;
    // weighted by tract adult population). This is a real district figure, not a
    // county value. null = below the coverage threshold or no tract data — fall
    // back to the county table above. See cdc-places-district-estimate.ts.
    districtEstimate: {
      dataYear: string | null;
      method: string; // plain-language methodology note
      measures: Array<{
        measureId: string;
        label: string;
        unit: '%';
        value: number | null; // weighted crude prevalence; null below threshold
        lowCI: number | null; // approximate, pop-weighted mean of tract limits
        highCI: number | null;
        coverage: {
          tractsUsed: number;
          tractsExcluded: number; // had a value but no usable weight
          adultPopCovered: number;
          districtAdultPop: number;
          pctCovered: number; // 0-1
        };
        estimateUnavailableReason?: string;
      }>;
    } | null;
  } | null;
}

// Government Investment & Services Data Types
export interface GovernmentServicesProfile {
  federalInvestment: {
    // District-scoped USASpending figures (place of performance, current
    // federal fiscal year to date). null = data unavailable.
    totalAnnualSpending: number | null; // Federal obligations in the district, current FY to date
    contractsAndGrants: number | null; // Contracts + grants awarded in the district, current FY
    spendingPerCapita: number | null; // USASpending-published per-capita for the district
    population: number | null; // USASpending-published district population
    majorProjects: Array<{
      title: string;
      amount: number;
      agency: string;
      description: string;
    }>;
    // null: no honest source — the old value was a keyword heuristic over a
    // 10-award sample, not a measured total. Pending a PSC/NAICS-coded query.
    infrastructureInvestment: number | null;
  };
  socialServices: {
    // null = data unavailable (no real API source); 0 is reserved for a genuine zero count
    snapBeneficiaries: number | null; // Number of households
    medicaidEnrollment: number | null;
    housingAssistanceUnits: number | null;
    veteransServices: number | null; // Number of veterans served
  };
  representation: {
    billsAffectingDistrict: Array<{
      billNumber: string;
      title: string;
      status: string;
      // null = no real impact classification available (never fabricate one)
      impactLevel: 'High' | 'Medium' | 'Low' | null;
    }>;
    federalFacilities: Array<{
      name: string;
      type: string;
      employees: number;
      economicImpact: number;
    }>;
    appropriationsSecured: number | null; // Annual amount; null = no data source
  };
  // Statewide figures (NOT district-specific). Federal data for these
  // metrics is only published at the state level; surfaced separately so it
  // is never read as a district-level number. null = data unavailable.
  stateContext: {
    state: string; // 2-letter code these statewide figures belong to
    medicaidChipEnrollment: number | null; // CMS, statewide Medicaid + CHIP
    medicaidChipPeriod: string | null; // reporting period, YYYYMM
    medicaidChipPreliminary: boolean; // newest CMS figure may be revised
    veteranPopulation: number | null; // VA VetPop, statewide veteran count
    veteranPopulationFiscalYear: string | null; // e.g. "FY2026"
  };
}

// Combined district enhancement data
export interface DistrictEnhancements {
  economic: EconomicProfile;
  services: ServicesHealthProfile;
  government: GovernmentServicesProfile;
  lastUpdated: string;
  dataSources: {
    bls: string;
    dot: string;
    fcc: string;
    education: string;
    cdc: string;
    cms: string;
    usaspending: string;
    congress: string;
  };
}

// API Response wrapper
export interface DistrictEnhancementsResponse {
  districtId: string;
  enhancements: DistrictEnhancements;
  metadata: {
    timestamp: string;
    cached: boolean;
    dataQuality: 'high' | 'medium' | 'low';
    notes: string[];
  };
}
