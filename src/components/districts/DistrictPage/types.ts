/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export interface DistrictPageProps {
  districtId: string;
}

export interface DistrictRepresentative {
  name: string;
  party: string;
  bioguideId: string;
  imageUrl?: string;
  yearsInOffice?: number;
}

export interface DistrictDemographics {
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
}

export interface DistrictPolitical {
  cookPVI: string;
  lastElection: {
    winner: string;
    margin: number;
    turnout: number;
  };
  registeredVoters: number;
}

export interface DistrictGeography {
  area: number;
  counties: string[];
  majorCities: string[];
}

export interface DistrictDetailsResponse {
  district: {
    id: string;
    state: string;
    number: string;
    name: string;
    representative: DistrictRepresentative;
    demographics?: DistrictDemographics;
    political: DistrictPolitical;
    geography: DistrictGeography;
  };
  metadata: {
    timestamp: string;
    dataSource: string;
  };
}

export interface MajorProject {
  title: string;
  amount: number;
  agency: string;
  description: string;
}

export interface GovernmentSpendingResponse {
  districtId: string;
  government: {
    federalInvestment: {
      totalAnnualSpending: number;
      contractsAndGrants: number;
      majorProjects: MajorProject[];
      infrastructureInvestment: number;
    };
  };
  metadata: { timestamp: string };
}

export interface NeighborEntry {
  id: string;
  name: string;
}

export interface NeighborsResponse {
  district: string;
  neighbors: NeighborEntry[];
  metadata: { timestamp: string };
}

export interface ZipShare {
  zip: string;
  share: number; // 0-1 share of district population covered
  primary: boolean;
}

export interface ZipsResponse {
  districtId: string;
  zips: ZipShare[];
  metadata: { timestamp: string; total: number };
}
