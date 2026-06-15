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
export interface ServicesHealthProfile {
  education: {
    schoolDistrictPerformance: number; // 0-100 scale
    graduationRate: number; // Percentage
    collegeEnrollmentRate: number; // Percentage
    federalEducationFunding: number; // Annual funding
    teacherToStudentRatio: number;
  };
  healthcare: {
    hospitalQualityRating: number; // 0-5 star rating
    primaryCarePhysiciansPerCapita: number;
    healthOutcomeIndex: number; // 0-100 scale
    medicareProviderCount: number;
    healthcareCostIndex: number; // Relative to national average
  };
  publicHealth: {
    preventableDiseaseRate: number; // Per 100,000 population
    mentalHealthProviderRatio: number;
    substanceAbusePrograms: number;
    preventiveCareCoverage: number; // Percentage
  };
}

// Government Investment & Services Data Types
export interface GovernmentServicesProfile {
  federalInvestment: {
    totalAnnualSpending: number; // Federal dollars to district
    contractsAndGrants: number; // Number of active contracts/grants
    majorProjects: Array<{
      title: string;
      amount: number;
      agency: string;
      description: string;
    }>;
    infrastructureInvestment: number;
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
      impactLevel: 'High' | 'Medium' | 'Low';
    }>;
    federalFacilities: Array<{
      name: string;
      type: string;
      employees: number;
      economicImpact: number;
    }>;
    appropriationsSecured: number; // Annual amount
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
