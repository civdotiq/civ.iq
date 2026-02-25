/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Export Types
 *
 * Structured types for citizen-portable district data exports.
 * Rewilding means the data isn't trapped. Care means the citizen owns it.
 */

export interface DistrictExportMetadata {
  exportedAt: string;
  version: string;
  sources: string[];
  license: string;
  platform: string;
  districtId: string;
  congress: string;
}

export interface ExportRepresentative {
  name: string;
  party: string;
  bioguideId: string;
  chamber: string;
  imageUrl?: string;
  yearsInOffice?: number;
}

export interface ExportDemographics {
  population: number;
  medianIncome: number;
  medianAge: number;
  diversityIndex: number;
  urbanPercentage: number;
  white_percent: number;
  black_percent: number;
  hispanic_percent: number;
  asian_percent: number;
  poverty_rate: number;
  bachelor_degree_percent: number;
  ageDistribution?: Array<{ bracket: string; count: number }>;
  incomeDistribution?: Array<{ bracket: string; count: number }>;
  employmentByIndustry?: Array<{ industry: string; count: number }>;
}

export interface ExportGeography {
  area: number;
  counties: string[];
  majorCities: string[];
}

export interface ExportPolitical {
  cookPVI: string;
  lastElection: {
    winner: string;
    margin: number;
    turnout: number;
  };
  registeredVoters: number;
}

export interface ExportSpending {
  totalAmount: number;
  awards: Array<{
    recipientName: string;
    amount: number;
    awardType: string;
    agency: string;
    description: string;
  }>;
}

export interface ExportBill {
  id: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  status: string;
  policyArea: string | null;
  introducedDate: string;
  latestActionDate: string;
  latestActionText: string;
  relevanceScore: number;
  relevanceReasons: string[];
}

export interface DistrictExport {
  metadata: DistrictExportMetadata;
  district: {
    id: string;
    state: string;
    number: string;
    name: string;
  };
  representatives: ExportRepresentative[];
  demographics: ExportDemographics | null;
  geography: ExportGeography;
  political: ExportPolitical;
  spending: ExportSpending | null;
  bills: ExportBill[];
}
