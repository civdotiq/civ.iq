/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { EnhancedRepresentative } from '@/types/representative';

export type Party = 'd' | 'r' | 'i';

export interface DelegationMember {
  bioguideId: string;
  name: string;
  party: Party;
  partyLabel: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  imageUrl?: string;
  yearsInOffice?: number;
  nextElection?: string;
  initials: string;
}

export interface DelegationSummary {
  senators: DelegationMember[];
  houseMembers: DelegationMember[];
  totals: { d: number; r: number; i: number };
}

export interface StateDemographics {
  population: number;
  medianAge: number;
  medianHouseholdIncome: number;
  perCapitaIncome: number;
  source: string;
  surveyYear: number;
}

export interface StateFederalSpending {
  fiscalYear: number;
  aggregatedAmount: number;
  perCapita: number | null;
  source: string;
}

export interface StateChamber {
  name: string;
  totalSeats: number;
  democraticSeats: number;
  republicanSeats: number;
  otherSeats: number;
}

export interface StateLegislatureSummary {
  upper: StateChamber | null;
  lower: StateChamber | null;
  totalCount: number;
  sessionName?: string;
  sessionStatus?: string;
  isUnicameral: boolean;
}

export interface StateExecutiveSummary {
  id: string;
  name: string;
  position: string;
  party: 'd' | 'r' | 'i';
  partyLabel: string;
  termEndYear?: number;
}

export interface StateExecutivesSummary {
  governor: StateExecutiveSummary | null;
  others: StateExecutiveSummary[];
  totalCount: number;
  nextElectionDate?: string;
  nextElectionOffices?: string[];
}

export interface StateElectionResult {
  year: number;
  office: 'GOVERNOR' | 'US_SENATE' | 'US_PRESIDENT';
  raceLabel: string;
  winner: 'D' | 'R' | 'I';
  demPct: number;
  repPct: number;
  margin: number;
  totalVotes: number;
}

export interface StateOverviewData {
  stateCode: string;
  stateName: string;
  delegation: DelegationSummary | null;
  demographics: StateDemographics | null;
  spending: StateFederalSpending | null;
  legislature: StateLegislatureSummary | null;
  executives: StateExecutivesSummary | null;
  governorResult: StateElectionResult | null;
  fetchedAt: string;
}

export function partyOf(rep: Pick<EnhancedRepresentative, 'party'>): Party {
  const p = (rep.party ?? '').toLowerCase();
  if (p.startsWith('d')) return 'd';
  if (p.startsWith('r')) return 'r';
  return 'i';
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
