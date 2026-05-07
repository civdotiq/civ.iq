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
import { getMostRecentElectionYear } from '@/lib/data/state-election-cycles';
import type { GeographicSpendingResponse } from '@/types/spending';
import type { RaceResultOrUnavailable } from '@/types/elections';
import {
  initialsOf,
  partyOf,
  type DelegationMember,
  type DelegationSummary,
  type StateChamber,
  type StateDemographics,
  type StateElectionResult,
  type StateExecutiveSummary,
  type StateExecutivesSummary,
  type StateFederalSpending,
  type StateLegislatureSummary,
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

interface StateLegislatureApiResponse {
  chambers?: {
    upper?: StateChamber & { title?: string };
    lower?: StateChamber & { title?: string };
  };
  legislators?: unknown[];
  totalCount?: number;
  session?: { name?: string; status?: string };
  error?: string;
}

async function loadStateLegislature(stateCode: string): Promise<StateLegislatureSummary | null> {
  try {
    const url = `${getServerBaseUrl()}/api/state-legislature/${stateCode}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as StateLegislatureApiResponse;
    if (data.error || !data.chambers) return null;
    const upperRaw = data.chambers.upper;
    const lowerRaw = data.chambers.lower;
    const upper: StateChamber | null =
      upperRaw && upperRaw.totalSeats > 0
        ? {
            name: upperRaw.name,
            totalSeats: upperRaw.totalSeats,
            democraticSeats: upperRaw.democraticSeats,
            republicanSeats: upperRaw.republicanSeats,
            otherSeats: upperRaw.otherSeats,
          }
        : null;
    const lower: StateChamber | null =
      lowerRaw && lowerRaw.totalSeats > 0
        ? {
            name: lowerRaw.name,
            totalSeats: lowerRaw.totalSeats,
            democraticSeats: lowerRaw.democraticSeats,
            republicanSeats: lowerRaw.republicanSeats,
            otherSeats: lowerRaw.otherSeats,
          }
        : null;
    if (!upper && !lower) return null;
    const totalCount =
      typeof data.totalCount === 'number' && data.totalCount > 0
        ? data.totalCount
        : (upper?.totalSeats ?? 0) + (lower?.totalSeats ?? 0);
    return {
      upper,
      lower,
      totalCount,
      sessionName: data.session?.name,
      sessionStatus: data.session?.status,
      isUnicameral: !lower,
    };
  } catch {
    return null;
  }
}

interface StateExecutivesApiResponse {
  executives?: Array<{
    id?: string;
    name?: string;
    position?: string;
    party?: string;
    termEnd?: string;
  }>;
  totalCount?: number;
  nextElection?: { date?: string; offices?: string[] };
}

function execParty(party: string | undefined): { code: 'd' | 'r' | 'i'; label: string } {
  const p = (party ?? '').toLowerCase();
  if (p.startsWith('d')) return { code: 'd', label: 'Democratic' };
  if (p.startsWith('r')) return { code: 'r', label: 'Republican' };
  return { code: 'i', label: party || 'Independent' };
}

function formatExecPosition(position: string): string {
  return position.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function loadStateExecutives(stateCode: string): Promise<StateExecutivesSummary | null> {
  try {
    const url = `${getServerBaseUrl()}/api/state-executives/${stateCode}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = (await res.json()) as StateExecutivesApiResponse;
    const list = Array.isArray(data.executives) ? data.executives : [];
    if (list.length === 0) return null;

    const summaries: StateExecutiveSummary[] = list.flatMap(exec => {
      if (!exec.id || !exec.name || !exec.position) return [];
      const party = execParty(exec.party);
      const termEndYear =
        exec.termEnd && !Number.isNaN(new Date(exec.termEnd).getTime())
          ? new Date(exec.termEnd).getUTCFullYear()
          : undefined;
      return [
        {
          id: exec.id,
          name: exec.name,
          position: formatExecPosition(exec.position),
          party: party.code,
          partyLabel: party.label,
          termEndYear,
        },
      ];
    });

    const governor = summaries.find(s => s.position.toLowerCase() === 'governor') ?? null;
    const others = summaries.filter(s => s.id !== governor?.id);

    return {
      governor,
      others,
      totalCount: summaries.length,
      nextElectionDate: data.nextElection?.date,
      nextElectionOffices: data.nextElection?.offices,
    };
  } catch {
    return null;
  }
}

async function loadGovernorResult(stateCode: string): Promise<StateElectionResult | null> {
  try {
    // Pick the most recent gubernatorial cycle the state actually held an
    // election in. NJ/VA cut at 2025; standard states at 2024 (or whatever
    // the lookup returns). MS/LA hold gubernatorial in 2027 — no result yet.
    const recent = getMostRecentElectionYear(stateCode);
    const candidateYears = [recent, recent - 1, recent - 2].filter(y => y >= 2024);
    for (const year of candidateYears) {
      const url = `${getServerBaseUrl()}/api/elections/${year}?type=governor&state=${stateCode}`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) continue;
      // 2024 route wraps in `{ result, metadata }`; 2025 route returns the
      // result flat — accept either shape.
      const body = (await res.json()) as
        | RaceResultOrUnavailable
        | { result?: RaceResultOrUnavailable };
      const result =
        'dataAvailable' in body
          ? (body as RaceResultOrUnavailable)
          : (body as { result?: RaceResultOrUnavailable }).result;
      if (!result || result.dataAvailable !== true) continue;
      return {
        year,
        office: 'GOVERNOR',
        raceLabel: 'Governor',
        winner: result.winner as 'D' | 'R' | 'I',
        demPct: result.demPct,
        repPct: result.repPct,
        margin: result.margin,
        totalVotes: result.total,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadStateOverviewData(stateCode: string): Promise<StateOverviewData> {
  const stateName = getStateName(stateCode) ?? stateCode;
  const [delegation, demographics, spending, legislature, executives, governorResult] =
    await Promise.all([
      loadDelegation(stateCode),
      loadDemographics(stateCode),
      loadFederalSpending(stateCode),
      loadStateLegislature(stateCode),
      loadStateExecutives(stateCode),
      loadGovernorResult(stateCode),
    ]);

  return {
    stateCode,
    stateName,
    delegation,
    demographics,
    spending,
    legislature,
    executives,
    governorResult,
    fetchedAt: new Date().toISOString(),
  };
}
