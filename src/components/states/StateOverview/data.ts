/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Server-side data fetcher for the redesigned StateOverview page.
 * Real government APIs only — empty payloads when a feed is unavailable.
 */

import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { getStateName } from '@/lib/data/us-states';
import { getServerBaseUrl } from '@/lib/server-url';
import type { GeographicSpendingResponse } from '@/types/spending';
import {
  initialsOf,
  partyOf,
  type DelegationMember,
  type DelegationSummary,
  type StateDemographics,
  type StateFederalSpending,
  type StateOverviewData,
} from './types';

interface DemographicsApiResponse {
  population?: number;
  median_age?: number;
  median_household_income?: number;
  per_capita_income?: number;
  data_source?: string;
  survey_year?: number;
}

async function loadDelegation(stateCode: string): Promise<DelegationSummary | null> {
  try {
    const all = await getAllEnhancedRepresentatives();
    const reps = all.filter(r => r.state?.toUpperCase() === stateCode);
    if (reps.length === 0) return null;

    const senators: DelegationMember[] = [];
    const houseMembers: DelegationMember[] = [];
    const totals = { d: 0, r: 0, i: 0 };

    for (const rep of reps) {
      const party = partyOf(rep);
      totals[party] += 1;
      const member: DelegationMember = {
        bioguideId: rep.bioguideId,
        name: rep.name,
        party,
        partyLabel: rep.party,
        state: rep.state,
        district: rep.district,
        chamber: rep.chamber as 'House' | 'Senate',
        imageUrl: rep.imageUrl,
        yearsInOffice: rep.yearsInOffice,
        nextElection: rep.nextElection,
        initials: initialsOf(rep.name),
      };
      if (member.chamber === 'Senate') senators.push(member);
      else houseMembers.push(member);
    }

    senators.sort((a, b) => a.name.localeCompare(b.name));
    houseMembers.sort((a, b) => {
      const da = parseInt(a.district ?? '0', 10) || 0;
      const db = parseInt(b.district ?? '0', 10) || 0;
      return da - db;
    });

    return { senators, houseMembers, totals };
  } catch {
    return null;
  }
}

async function loadDemographics(stateCode: string): Promise<StateDemographics | null> {
  try {
    const url = `${getServerBaseUrl()}/api/state-demographics/${stateCode}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as DemographicsApiResponse;
    if (!data.population || data.population <= 0) return null;
    return {
      population: data.population,
      medianAge: data.median_age ?? 0,
      medianHouseholdIncome: data.median_household_income ?? 0,
      perCapitaIncome: data.per_capita_income ?? 0,
      source: data.data_source ?? 'Census Bureau ACS',
      surveyYear: data.survey_year ?? 0,
    };
  } catch {
    return null;
  }
}

async function loadFederalSpending(stateCode: string): Promise<StateFederalSpending | null> {
  try {
    const fiscalYear = new Date().getUTCFullYear() - 1;
    const url = `${getServerBaseUrl()}/api/spending/geography?geo_layer=state&scope=place_of_performance&fiscal_year=${fiscalYear}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as GeographicSpendingResponse;
    if (!data.success || !Array.isArray(data.results)) return null;
    const match = data.results.find(r => r.shapeCode?.toUpperCase() === stateCode);
    if (!match || !match.aggregatedAmount) return null;
    return {
      fiscalYear: data.fiscalYear,
      aggregatedAmount: match.aggregatedAmount,
      perCapita: match.perCapita,
      source: data.metadata?.dataSource ?? 'usaspending.gov',
    };
  } catch {
    return null;
  }
}

export async function loadStateOverviewData(stateCode: string): Promise<StateOverviewData> {
  const stateName = getStateName(stateCode) ?? stateCode;
  const [delegation, demographics, spending] = await Promise.all([
    loadDelegation(stateCode),
    loadDemographics(stateCode),
    loadFederalSpending(stateCode),
  ]);

  return {
    stateCode,
    stateName,
    delegation,
    demographics,
    spending,
    fetchedAt: new Date().toISOString(),
  };
}
