/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Economic & Infrastructure Health Data Types
export interface EconomicProfile {
  employment: {
    unemploymentRate: number;
    laborForceParticipation: number;
    jobGrowthRate: number;
    majorIndustries: string[];
    averageWage: number;
  };
  infrastructure: {
    bridgeConditionRating: number; // 0-100 scale
    highwayFunding: number; // Annual federal funding
    broadbandAvailability: number; // Percentage with high-speed access
    publicTransitAccessibility: number; // 0-100 scale
  };
  connectivity: {
    fiberAvailability: number; // Percentage with fiber access
    averageDownloadSpeed: number; // Mbps
    averageUploadSpeed: number; // Mbps
    digitalDivideIndex: number; // 0-100, higher = more connected
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
  publicHealth: {
    preventableDiseaseRate: number | null; // Per 100,000 population
    mentalHealthProviderRatio: number | null;
    substanceAbusePrograms: number | null;
    preventiveCareCoverage: number | null; // Percentage
  };
}

// Government Investment & Services Data Types
export interface GovernmentServicesProfile {
  federalInvestment: {
    // null = data unavailable (USASpending fetch failed or returned nothing)
    totalAnnualSpending: number | null; // Federal dollars (statewide total)
    contractsAndGrants: number | null; // Number of active contracts/grants
    majorProjects: Array<{
      title: string;
      amount: number;
      agency: string;
      description: string;
    }>;
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
