/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { getStateName, normalizeStateIdentifier } from '@/lib/data/us-states';
import {
  getElectionGroup,
  getElectionCycleLabel,
  getMostRecentElectionYear,
  getNextElectionYear,
} from '@/lib/data/state-election-cycles';
import type { RaceResultFull } from '@/types/elections';

// ── Types ────────────────────────────────────────────────────────────

interface EnforcementAction {
  agency: 'EPA' | 'OSHA' | 'SEC' | 'CFPB';
  actionType: string;
  organization: string;
  penaltyAmount: number;
  date: string;
  state: string;
}

interface EnforcementInsightResponse {
  scope: { type: 'state'; state: string };
  actions: EnforcementAction[];
  stats: {
    totalActions: number;
    totalPenalties: number;
    byAgency: Array<{ agency: string; count: number; penalties: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    periodMonths: number;
  };
  narrative: string;
  confidence: number;
  dataAsOf: string;
  methodology: string;
  disclaimer: string;
  sources: Array<{ name: string; url?: string }>;
}

interface CrimeStats {
  state: string;
  year: number;
  population: number;
  offenses: Record<string, { actual: number; rate: number; clearances: number }>;
  nationalComparison: Record<string, { rate: number }>;
  coveragePercent: number;
}

interface CrimeTrendPoint {
  year: number;
  stateRate: number;
  nationalRate: number;
}

interface CrimeResponse {
  state: string;
  crimeStats: CrimeStats;
  trends: {
    violent: CrimeTrendPoint[];
    property: CrimeTrendPoint[];
  };
  dataSource: string;
}

interface StateExecutive {
  id: string;
  name: string;
  position: string;
  party: 'Democratic' | 'Republican' | 'Independent' | 'Other';
  termStart: string;
  termEnd: string;
  photoUrl?: string;
  keyInitiatives: string[];
}

interface ExecutivesResponse {
  state: string;
  stateName: string;
  executives: StateExecutive[];
  nextElection: { date: string; offices: string[] };
  partyBreakdown: Record<string, number>;
}

interface DemographicsResponse {
  state_code: string;
  state_name: string;
  population: number;
  median_age: number;
  median_household_income: number;
  per_capita_income: number;
  poverty_rate: number;
  demographics: Record<string, number>;
  education: {
    high_school_or_higher: number;
    bachelors_or_higher: number;
    graduate_or_professional: number;
  };
  housing: { median_home_value: number; median_rent: number; homeownership_rate: number };
  employment: { labor_force_participation_rate: number; unemployment_rate: number };
  data_source: string;
  survey_year: number;
}

interface LegislatureChamber {
  name: string;
  title: string;
  totalSeats: number;
  democraticSeats: number;
  republicanSeats: number;
  otherSeats: number;
}

interface StateLegislator {
  id: string;
  name: string;
  party: 'Democratic' | 'Republican' | 'Independent' | 'Other';
  chamber: 'upper' | 'lower';
  district: string;
  photoUrl?: string;
}

interface LegislatureResponse {
  state: string;
  stateName: string;
  session: { name: string; startDate: string; endDate: string; status?: string };
  chambers: { upper: LegislatureChamber; lower: LegislatureChamber };
  legislators: StateLegislator[];
  totalCount: number;
  error?: string;
}

// ── Fetcher ──────────────────────────────────────────────────────────

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const SWR_OPTIONS = { revalidateOnFocus: false, dedupingInterval: 300_000 };

// ── Helpers ──────────────────────────────────────────────────────────

const PARTY_COLORS: Record<string, string> = {
  Democratic: '#2563eb',
  Republican: '#e11d07',
  Independent: '#6b7280',
  Other: '#6b7280',
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  return `$${amount.toLocaleString()}`;
}

function formatPosition(position: string): string {
  return position.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Main Page ────────────────────────────────────────────────────────

export default function LegacyStateOverviewPage() {
  const params = useParams();
  const rawState = params.state as string;
  const stateCode = normalizeStateIdentifier(rawState);
  const stateName = stateCode ? getStateName(stateCode) : undefined;

  const [activeTab, setActiveTab] = useState<'overview' | 'legislature' | 'elections'>('overview');

  if (!stateCode || !stateName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center border-2 border-gray-200 p-8 bg-white max-w-md">
          <p className="aicher-heading type-lg text-gray-900 mb-2">State not found</p>
          <p className="type-sm text-gray-500 mb-4">
            &ldquo;{rawState}&rdquo; is not a recognized U.S. state code.
          </p>
          <Link href="/states" className="type-sm text-[#3ea2d4] aicher-heading">
            Browse all states
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="type-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <Link href="/states" className="hover:text-[#3ea2d4]">
            States
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="text-gray-900">{stateName}</span>
        </nav>

        {/* Header */}
        <div className="border-2 border-gray-900 bg-white p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 border-2 border-gray-900 flex items-center justify-center flex-shrink-0">
              <span className="aicher-heading type-2xl text-gray-900">{stateCode}</span>
            </div>
            <div>
              <h1 className="aicher-heading text-3xl text-gray-900">{stateName}</h1>
              <p className="type-sm text-gray-500 mt-1">State government overview</p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6">
          {(['overview', 'legislature', 'elections'] as const).map(tab => {
            const labels = {
              overview: 'Overview',
              legislature: 'Legislature',
              elections: 'Elections',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 min-h-[44px] type-sm aicher-heading transition-colors ${
                  activeTab === tab
                    ? 'border-2 border-gray-900 bg-white text-gray-900 border-b-[3px] border-b-[#3ea2d4]'
                    : 'border-2 border-gray-200 text-gray-500 hover:text-gray-900'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <OverviewTab stateCode={stateCode} stateName={stateName} />}
        {activeTab === 'legislature' && <LegislatureTab stateCode={stateCode} />}
        {activeTab === 'elections' && <ElectionsTab stateCode={stateCode} stateName={stateName} />}

        <ExploreFooter
          variant="state"
          currentSection={stateName}
          relatedLinks={[
            { href: '/states', label: 'All 50 States' },
            { href: `/delegation/${stateCode}`, label: `${stateCode} Congressional Delegation` },
          ]}
        />
      </main>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────

function OverviewTab({ stateCode, stateName }: { stateCode: string; stateName: string }) {
  const { data: execs, isLoading: execsLoading } = useSWR<ExecutivesResponse>(
    `/api/state-executives/${stateCode}`,
    fetcher,
    SWR_OPTIONS
  );

  const { data: demographics, isLoading: demoLoading } = useSWR<DemographicsResponse>(
    `/api/state-demographics/${stateCode}`,
    fetcher,
    SWR_OPTIONS
  );

  const { data: enforcement, isLoading: enforcementLoading } = useSWR<EnforcementInsightResponse>(
    `/api/intelligence/enforcement/state/${stateCode}`,
    fetcher,
    { ...SWR_OPTIONS, dedupingInterval: 600_000 }
  );

  const { data: crimeData, isLoading: crimeLoading } = useSWR<CrimeResponse>(
    `/api/states/${stateCode}/crime`,
    fetcher,
    { ...SWR_OPTIONS, dedupingInterval: 600_000 }
  );

  return (
    <div className="space-y-6">
      {/* Demographics stats */}
      {demoLoading && <SkeletonGrid count={4} />}
      {demographics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Population" value={demographics.population.toLocaleString()} />
          <StatBox
            label="Median income"
            value={formatCurrency(demographics.median_household_income)}
          />
          <StatBox
            label="Unemployment"
            value={`${demographics.employment.unemployment_rate.toFixed(1)}%`}
          />
          <StatBox label="Median age" value={demographics.median_age.toFixed(1)} />
        </div>
      )}

      {/* State executives */}
      {execsLoading && <SkeletonCard />}
      {execs && execs.executives.length > 0 && (
        <div className="border-2 border-gray-900 bg-white p-4 sm:p-6">
          <h2 className="aicher-heading type-lg text-gray-900 mb-4">State Leadership</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {execs.executives.slice(0, 6).map(exec => (
              <div key={exec.id} className="border-2 border-gray-200 p-3">
                <div className="flex items-start gap-3">
                  <span
                    className="inline-block w-3 h-3 mt-1 flex-shrink-0 border-2 border-gray-300"
                    style={{ backgroundColor: PARTY_COLORS[exec.party] ?? '#6b7280' }}
                    title={exec.party}
                  />
                  <div>
                    <p className="type-sm font-medium text-gray-900">{exec.name}</p>
                    <p className="type-xs text-gray-500">{formatPosition(exec.position)}</p>
                    {exec.termEnd && (
                      <p className="type-xs text-gray-400">
                        Term ends {new Date(exec.termEnd).getFullYear()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {execs.nextElection?.date && (
            <p className="type-xs text-gray-400 mt-4">
              Next statewide election:{' '}
              {new Date(execs.nextElection.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}
      {execs && execs.executives.length === 0 && (
        <EmptyState message="State executive data not yet available from Wikidata for this state." />
      )}

      {/* Education + Housing */}
      {demographics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="border-2 border-gray-200 bg-white p-4 sm:p-6">
            <h3 className="aicher-heading type-sm text-gray-500 mb-3">Education</h3>
            <div className="space-y-2">
              <DataRow
                label="High school or higher"
                value={`${demographics.education.high_school_or_higher.toFixed(1)}%`}
              />
              <DataRow
                label="Bachelor's or higher"
                value={`${demographics.education.bachelors_or_higher.toFixed(1)}%`}
              />
              <DataRow
                label="Graduate or professional"
                value={`${demographics.education.graduate_or_professional.toFixed(1)}%`}
              />
            </div>
          </div>
          <div className="border-2 border-gray-200 bg-white p-4 sm:p-6">
            <h3 className="aicher-heading type-sm text-gray-500 mb-3">Housing</h3>
            <div className="space-y-2">
              <DataRow
                label="Median home value"
                value={formatCurrency(demographics.housing.median_home_value)}
              />
              <DataRow
                label="Median rent"
                value={formatCurrency(demographics.housing.median_rent)}
              />
              <DataRow
                label="Homeownership rate"
                value={`${demographics.housing.homeownership_rate.toFixed(1)}%`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Poverty + Labor */}
      {demographics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatBox label="Poverty rate" value={`${demographics.poverty_rate.toFixed(1)}%`} />
          <StatBox
            label="Per capita income"
            value={formatCurrency(demographics.per_capita_income)}
          />
          <StatBox
            label="Labor participation"
            value={`${demographics.employment.labor_force_participation_rate.toFixed(1)}%`}
          />
        </div>
      )}

      {demographics && <p className="type-xs text-gray-400">Source: {demographics.data_source}</p>}

      {/* Enforcement */}
      {enforcementLoading && <SkeletonCard />}
      {enforcement && enforcement.stats && (
        <EnforcementSection enforcement={enforcement} stateName={stateName} />
      )}

      {/* Public Safety */}
      {crimeLoading && <SkeletonCard />}
      {crimeData && crimeData.crimeStats && (
        <PublicSafetySection crimeData={crimeData} stateName={stateName} />
      )}

      {/* Link to delegation */}
      <Link
        href={`/delegation/${stateCode}`}
        className="block border-2 border-[#3ea2d4] text-[#3ea2d4] type-sm text-center font-bold py-3 hover:bg-[#3ea2d4] hover:text-white transition-colors"
      >
        View {stateName} congressional delegation
      </Link>
    </div>
  );
}

// ── Legislature Tab ──────────────────────────────────────────────────

function LegislatureTab({ stateCode }: { stateCode: string }) {
  const { data, isLoading, error } = useSWR<LegislatureResponse>(
    `/api/state-legislature/${stateCode}`,
    fetcher,
    SWR_OPTIONS
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonGrid count={6} />
      </div>
    );
  }

  if (error || !data) {
    return <EmptyState message="State legislature data temporarily unavailable from OpenStates." />;
  }

  if (data.error || data.totalCount === 0) {
    return <EmptyState message="State legislature data not currently available for this state." />;
  }

  const { chambers, session, legislators } = data;
  const isUnicameral = chambers.lower.totalSeats === 0;

  return (
    <div className="space-y-6">
      {/* Session info */}
      {session.name && session.name !== 'Data Unavailable' && (
        <div className="border-2 border-gray-200 bg-white p-4">
          <p className="type-sm text-gray-700">
            <span className="aicher-heading">Current session:</span> {session.name}
            {session.status && (
              <span className="ml-2 type-xs text-gray-400">({session.status})</span>
            )}
          </p>
        </div>
      )}

      {/* Chamber party control bars */}
      <div className="border-2 border-gray-900 bg-white p-4 sm:p-6">
        <h2 className="aicher-heading type-lg text-gray-900 mb-4">Party Control</h2>
        <div className="space-y-6">
          <ChamberBar chamber={chambers.upper} />
          {!isUnicameral && <ChamberBar chamber={chambers.lower} />}
          {isUnicameral && (
            <p className="type-xs text-gray-400">Nebraska has a unicameral legislature.</p>
          )}

          {/* Trifecta note */}
          {!isUnicameral && chambers.upper.totalSeats > 0 && chambers.lower.totalSeats > 0 && (
            <TrifectaStatus upper={chambers.upper} lower={chambers.lower} />
          )}
        </div>
      </div>

      {/* Legislator roster */}
      {legislators.length > 0 && (
        <LegislatorRoster
          legislators={legislators}
          chambers={chambers}
          isUnicameral={isUnicameral}
        />
      )}

      <p className="type-xs text-gray-400">Source: OpenStates</p>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────

function ChamberBar({ chamber }: { chamber: LegislatureChamber }) {
  if (chamber.totalSeats === 0) return null;

  const demPct = (chamber.democraticSeats / chamber.totalSeats) * 100;
  const repPct = (chamber.republicanSeats / chamber.totalSeats) * 100;
  const demLead = chamber.democraticSeats > chamber.republicanSeats;
  const margin = Math.abs(chamber.democraticSeats - chamber.republicanSeats);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="type-sm font-medium text-gray-900">{chamber.name}</h3>
        <span className="type-xs text-gray-500">
          {demLead ? 'D' : 'R'}+{margin} of {chamber.totalSeats}
        </span>
      </div>
      <div className="flex h-6 border-2 border-gray-200 overflow-hidden">
        <div
          className="h-full"
          style={{ width: `${demPct}%`, backgroundColor: '#2563eb' }}
          title={`Democrat: ${chamber.democraticSeats}`}
        />
        <div
          className="h-full"
          style={{ width: `${repPct}%`, backgroundColor: '#e11d07' }}
          title={`Republican: ${chamber.republicanSeats}`}
        />
        {chamber.otherSeats > 0 && (
          <div
            className="h-full bg-gray-400"
            style={{ width: `${(chamber.otherSeats / chamber.totalSeats) * 100}%` }}
            title={`Other: ${chamber.otherSeats}`}
          />
        )}
      </div>
      <div className="flex justify-between mt-1 type-xs text-gray-500">
        <span>{chamber.democraticSeats} D</span>
        {chamber.otherSeats > 0 && <span>{chamber.otherSeats} I/Other</span>}
        <span>{chamber.republicanSeats} R</span>
      </div>
    </div>
  );
}

function TrifectaStatus({
  upper,
  lower,
}: {
  upper: LegislatureChamber;
  lower: LegislatureChamber;
}) {
  const upperDemLead = upper.democraticSeats > upper.republicanSeats;
  const lowerDemLead = lower.democraticSeats > lower.republicanSeats;
  const isTrifecta = upperDemLead === lowerDemLead;

  return (
    <p className="type-xs text-gray-500 border-t-2 border-gray-100 pt-3">
      <span className="aicher-heading">Legislature control:</span>{' '}
      {isTrifecta ? (
        <span style={{ color: upperDemLead ? '#2563eb' : '#e11d07' }}>
          {upperDemLead ? 'Democratic' : 'Republican'} control of both chambers
        </span>
      ) : (
        <span className="text-gray-600">Divided — chambers controlled by different parties</span>
      )}
    </p>
  );
}

function LegislatorRoster({
  legislators,
  chambers,
  isUnicameral,
}: {
  legislators: StateLegislator[];
  chambers: LegislatureResponse['chambers'];
  isUnicameral: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const upper = legislators.filter(l => l.chamber === 'upper');
  const lower = legislators.filter(l => l.chamber === 'lower');

  const INITIAL_SHOW = 10;

  return (
    <div className="border-2 border-gray-200 bg-white p-4 sm:p-6">
      <h2 className="aicher-heading type-lg text-gray-900 mb-4">
        Current Members ({legislators.length})
      </h2>

      {/* Upper chamber */}
      {upper.length > 0 && (
        <div className="mb-6">
          <h3 className="type-sm aicher-heading text-gray-500 mb-2">
            {chambers.upper.name} ({upper.length})
          </h3>
          <LegislatorList legislators={showAll ? upper : upper.slice(0, INITIAL_SHOW)} />
        </div>
      )}

      {/* Lower chamber */}
      {!isUnicameral && lower.length > 0 && (
        <div>
          <h3 className="type-sm aicher-heading text-gray-500 mb-2">
            {chambers.lower.name} ({lower.length})
          </h3>
          <LegislatorList legislators={showAll ? lower : lower.slice(0, INITIAL_SHOW)} />
        </div>
      )}

      {legislators.length > INITIAL_SHOW * (isUnicameral ? 1 : 2) && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="mt-4 type-xs text-[#3ea2d4] aicher-heading py-2 min-h-[44px] inline-flex items-center"
          aria-expanded={showAll}
        >
          {showAll ? 'Show fewer' : `Show all ${legislators.length} members`}
        </button>
      )}
    </div>
  );
}

function LegislatorList({ legislators }: { legislators: StateLegislator[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
      {legislators.map(leg => (
        <div key={leg.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50">
          <span
            className="inline-block w-2.5 h-2.5 flex-shrink-0 border border-gray-300"
            style={{ backgroundColor: PARTY_COLORS[leg.party] ?? '#6b7280' }}
            title={leg.party}
          />
          <span className="type-sm text-gray-900 truncate">{leg.name}</span>
          <span className="type-xs text-gray-400 flex-shrink-0">Dist. {leg.district}</span>
        </div>
      ))}
    </div>
  );
}

// ── Elections Tab ────────────────────────────────────────────────────

function ElectionsTab({ stateCode, stateName }: { stateCode: string; stateName: string }) {
  const electionGroup = getElectionGroup(stateCode);
  const mostRecent = getMostRecentElectionYear(stateCode);
  const next = getNextElectionYear(stateCode);
  const cycleLabel = getElectionCycleLabel(stateCode);

  // Determine which year to fetch governor data from
  const isOddYear = electionGroup === 'odd-year';
  // NJ and VA have 2025 data; MS and LA next vote in 2027
  const has2025Gov = isOddYear && (stateCode === 'NJ' || stateCode === 'VA');
  const govYear = has2025Gov ? 2025 : isOddYear ? null : 2024;

  // Fetch governor result from the appropriate year
  const { data: govResult, isLoading: govLoading } = useSWR<
    RaceResultFull | { dataAvailable: false }
  >(
    govYear ? `/api/elections/${govYear}?type=governor&state=${stateCode}` : null,
    fetcher,
    SWR_OPTIONS
  );

  const govDataAvailable =
    govResult && !('dataAvailable' in govResult && govResult.dataAvailable === false);
  const govNoElection =
    govResult && 'dataAvailable' in govResult && govResult.dataAvailable === false;

  return (
    <div className="space-y-6">
      {/* Election cycle info */}
      <div className="border-2 border-gray-900 bg-white p-4 sm:p-6">
        <h2 className="aicher-heading type-lg text-gray-900 mb-4">Election Schedule</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <StatBox label="Most recent" value={String(mostRecent)} />
          <StatBox label="Next election" value={String(next)} />
          <StatBox
            label="Cycle type"
            value={
              electionGroup === 'odd-year'
                ? 'Odd-year'
                : electionGroup === '2-year-senate'
                  ? '2-year senate'
                  : 'Standard'
            }
          />
        </div>
        <p className="type-sm text-gray-600">{cycleLabel}</p>
      </div>

      {/* Governor results */}
      {govYear && (
        <div className="border-2 border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="aicher-heading type-lg text-gray-900 mb-4">
            {govYear} State Election Results
          </h2>

          {govLoading && <SkeletonCard />}
          {govNoElection && (
            <p className="type-sm text-gray-500 mb-4">
              No gubernatorial election in {stateName} in {govYear}.
            </p>
          )}
          {govDataAvailable && (
            <RaceResultCard title={`${stateName} Governor`} result={govResult as RaceResultFull} />
          )}
        </div>
      )}

      {/* MS/LA notice — odd-year states without 2025 data */}
      {isOddYear && !has2025Gov && (
        <div className="border-2 border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="aicher-heading type-lg text-gray-900 mb-4">Recent Elections</h2>
          <p className="type-sm text-gray-600">
            {stateName} holds state elections in odd years. The next gubernatorial election is in
            2027.
          </p>
        </div>
      )}

      <p className="type-xs text-gray-400">
        Sources: MIT Election Data and Science Lab (MEDSL); Ballotpedia (2025)
      </p>
    </div>
  );
}

function RaceResultCard({ title, result }: { title: string; result: RaceResultFull }) {
  const demPct = result.demPct;
  const repPct = result.repPct;
  const otherPct = 100 - demPct - repPct;

  return (
    <div className="border-2 border-gray-200 p-4 mb-4">
      <h3 className="type-sm aicher-heading text-gray-900 mb-3">{title}</h3>
      <div className="flex h-6 border border-gray-200 overflow-hidden mb-2">
        {demPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${demPct}%`, backgroundColor: '#2563eb' }}
            title={`Democrat: ${demPct.toFixed(1)}%`}
          />
        )}
        {repPct > 0 && (
          <div
            className="h-full"
            style={{ width: `${repPct}%`, backgroundColor: '#e11d07' }}
            title={`Republican: ${repPct.toFixed(1)}%`}
          />
        )}
        {otherPct > 0.5 && (
          <div
            className="h-full bg-gray-400"
            style={{ width: `${otherPct}%` }}
            title={`Other: ${otherPct.toFixed(1)}%`}
          />
        )}
      </div>
      <div className="flex justify-between type-xs text-gray-600">
        <span>
          D: {demPct.toFixed(1)}% ({result.dem.toLocaleString()})
        </span>
        <span>
          R: {repPct.toFixed(1)}% ({result.rep.toLocaleString()})
        </span>
      </div>
      <p className="type-xs text-gray-500 mt-2">
        Winner:{' '}
        <span
          className="font-medium"
          style={{ color: result.winner === 'D' ? '#2563eb' : '#e11d07' }}
        >
          {result.winner === 'D' ? 'Democrat' : 'Republican'}
        </span>{' '}
        by {result.margin.toFixed(1)} points ({result.total.toLocaleString()} total votes)
      </p>
    </div>
  );
}

// ── Enforcement Section ──────────────────────────────────────────────

function formatPenalty(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

const TREND_LABELS: Record<string, string> = {
  increasing: 'Increasing',
  decreasing: 'Decreasing',
  stable: 'Stable',
};

function EnforcementSection({
  enforcement,
  stateName,
}: {
  enforcement: EnforcementInsightResponse;
  stateName: string;
}) {
  const [showActions, setShowActions] = useState(false);
  const { stats, narrative, actions } = enforcement;

  return (
    <div className="border-2 border-gray-900 bg-white p-4 sm:p-6">
      <h2 className="aicher-heading type-lg text-gray-900 mb-2">Federal Enforcement Activity</h2>
      <p className="type-sm text-gray-600 mb-4">
        Federal agency enforcement actions in {stateName} from EPA, OSHA, and CFPB public records.
      </p>

      {/* Narrative */}
      {narrative && (
        <p className="type-sm text-gray-700 mb-4 border-l-[3px] border-[#3ea2d4] pl-3">
          {narrative}
        </p>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatBox label="Total actions" value={String(stats.totalActions)} />
        <StatBox label="Total penalties" value={formatPenalty(stats.totalPenalties)} />
        <StatBox label="Trend" value={TREND_LABELS[stats.trend] ?? stats.trend} />
        <StatBox
          label="Period"
          value={
            stats.periodMonths >= 12
              ? `${Math.round(stats.periodMonths / 12)} yr`
              : `${stats.periodMonths} mo`
          }
        />
      </div>

      {/* Agency breakdown */}
      {stats.byAgency.length > 0 && (
        <div className="mb-4">
          <h3 className="type-sm aicher-heading text-gray-500 mb-2">By agency</h3>
          <div className="space-y-1">
            {stats.byAgency.map(a => (
              <div
                key={a.agency}
                className="flex items-center justify-between type-sm py-1.5 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-900 font-medium">{a.agency}</span>
                <span className="text-gray-500 tabular-nums">
                  {a.count} action{a.count !== 1 ? 's' : ''} · {formatPenalty(a.penalties)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent actions (expandable) */}
      {actions.length > 0 && (
        <div>
          <button
            onClick={() => setShowActions(prev => !prev)}
            className="type-xs text-[#3ea2d4] aicher-heading py-2 min-h-[44px] inline-flex items-center"
            aria-expanded={showActions}
          >
            {showActions ? 'Hide recent actions' : `Show ${actions.length} recent actions`}
          </button>
          {showActions && (
            <div className="space-y-1 mt-2">
              {actions.slice(0, 20).map((action, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between py-1.5 border-b border-gray-100 last:border-0 type-xs"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-900">{action.organization}</span>
                    <span className="text-gray-400 ml-2">
                      {action.agency} · {action.actionType}
                    </span>
                  </div>
                  <span className="text-gray-500 tabular-nums flex-shrink-0 ml-2">
                    {action.penaltyAmount > 0 ? formatPenalty(action.penaltyAmount) : '—'}
                  </span>
                </div>
              ))}
              {actions.length > 20 && (
                <p className="type-xs text-gray-400 pt-1">Showing 20 of {actions.length} actions</p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="type-xs text-gray-400 mt-3">
        Sources: EPA ECHO, OSHA, CFPB
        {enforcement.dataAsOf &&
          ` · Data as of ${new Date(enforcement.dataAsOf).toLocaleDateString()}`}
      </p>
    </div>
  );
}

// ── Public Safety Section ────────────────────────────────────────────

function PublicSafetySection({
  crimeData,
  stateName,
}: {
  crimeData: CrimeResponse;
  stateName: string;
}) {
  const { crimeStats, trends } = crimeData;
  const violent = crimeStats.offenses['violent-crime'];
  const property = crimeStats.offenses['property-crime'];
  const nationalViolent = crimeStats.nationalComparison['violent-crime'];
  const nationalProperty = crimeStats.nationalComparison['property-crime'];

  return (
    <div className="border-2 border-gray-900 bg-white p-4 sm:p-6">
      <h2 className="aicher-heading type-lg text-gray-900 mb-2">Public Safety</h2>
      <p className="type-sm text-gray-600 mb-4">
        FBI Uniform Crime Report data for {stateName}. Ground-truth crime statistics vs political
        rhetoric.
      </p>

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {violent && (
          <>
            <StatBox label="Violent crime rate" value={`${violent.rate.toFixed(0)}`} />
            {nationalViolent && (
              <StatBox label="National avg" value={`${nationalViolent.rate.toFixed(0)}`} />
            )}
          </>
        )}
        {property && (
          <>
            <StatBox label="Property crime rate" value={`${property.rate.toFixed(0)}`} />
            {nationalProperty && (
              <StatBox label="National avg" value={`${nationalProperty.rate.toFixed(0)}`} />
            )}
          </>
        )}
      </div>
      <p className="type-xs text-gray-400 mb-4">Rates per 100,000 residents</p>

      {/* Comparison context */}
      {violent && nationalViolent && (
        <p className="type-sm text-gray-700 mb-4 border-l-[3px] border-[#3ea2d4] pl-3">
          {stateName}&apos;s violent crime rate is{' '}
          {violent.rate > nationalViolent.rate
            ? `${((violent.rate / nationalViolent.rate - 1) * 100).toFixed(0)}% above`
            : `${((1 - violent.rate / nationalViolent.rate) * 100).toFixed(0)}% below`}{' '}
          the national average.
          {property && nationalProperty && (
            <>
              {' '}
              Property crime is{' '}
              {property.rate > nationalProperty.rate
                ? `${((property.rate / nationalProperty.rate - 1) * 100).toFixed(0)}% above`
                : `${((1 - property.rate / nationalProperty.rate) * 100).toFixed(0)}% below`}{' '}
              the national average.
            </>
          )}
        </p>
      )}

      {/* Offense breakdown */}
      {Object.keys(crimeStats.offenses).length > 2 && (
        <div className="mb-4">
          <h3 className="type-sm aicher-heading text-gray-500 mb-2">By offense type</h3>
          <div className="space-y-1">
            {Object.entries(crimeStats.offenses)
              .filter(([key]) => key !== 'violent-crime' && key !== 'property-crime')
              .slice(0, 8)
              .map(([key, data]) => (
                <div
                  key={key}
                  className="flex items-center justify-between type-sm py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="text-gray-900">{formatOffenseLabel(key)}</span>
                  <span className="text-gray-500 tabular-nums">
                    {data.actual.toLocaleString()} ({data.rate.toFixed(1)}/100K)
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Trend summary */}
      {trends.violent.length > 1 && (
        <TrendSummary violent={trends.violent} property={trends.property} />
      )}

      <p className="type-xs text-gray-400 mt-3">
        Source: {crimeData.dataSource}
        {crimeStats.year && ` · ${crimeStats.year} data`}
        {crimeStats.coveragePercent < 100 &&
          ` · ${crimeStats.coveragePercent.toFixed(0)}% agency coverage`}
      </p>
    </div>
  );
}

const OFFENSE_LABELS: Record<string, string> = {
  HOM: 'Homicide',
  RPE: 'Rape',
  ROB: 'Robbery',
  ASS: 'Aggravated assault',
  BUR: 'Burglary',
  LAR: 'Larceny/theft',
  MVT: 'Motor vehicle theft',
  ARS: 'Arson',
};

function TrendSummary({
  violent,
  property,
}: {
  violent: CrimeTrendPoint[];
  property: CrimeTrendPoint[];
}) {
  const vFirst = violent[0];
  const vLast = violent[violent.length - 1];
  const pFirst = property[0];
  const pLast = property[property.length - 1];

  if (!vFirst || !vLast) return null;

  const vChange = (((vLast.stateRate - vFirst.stateRate) / vFirst.stateRate) * 100).toFixed(1);
  const vDir = vLast.stateRate > vFirst.stateRate ? 'up' : 'down';

  return (
    <div>
      <h3 className="type-sm aicher-heading text-gray-500 mb-2">5-year trend</h3>
      <div className="flex gap-4 type-xs text-gray-600">
        <span>
          Violent crime: {vDir} {Math.abs(Number(vChange))}% ({vFirst.year}–{vLast.year})
        </span>
        {pFirst &&
          pLast &&
          (() => {
            const pChange = (
              ((pLast.stateRate - pFirst.stateRate) / pFirst.stateRate) *
              100
            ).toFixed(1);
            const pDir = pLast.stateRate > pFirst.stateRate ? 'up' : 'down';
            return (
              <span>
                Property crime: {pDir} {Math.abs(Number(pChange))}% ({pFirst.year}–{pLast.year})
              </span>
            );
          })()}
      </div>
    </div>
  );
}

function formatOffenseLabel(key: string): string {
  return OFFENSE_LABELS[key] ?? key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── UI Primitives ────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-gray-200 bg-white p-3">
      <div className="aicher-heading type-2xl text-gray-900">{value}</div>
      <div className="type-xs text-gray-500 aicher-heading-wide">{label}</div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between type-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-2 border-gray-200 bg-white p-6 text-center">
      <p className="type-sm text-gray-500">{message}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="border-2 border-gray-200 bg-white p-6 animate-pulse">
      <div className="h-5 bg-gray-100 w-40 mb-4" />
      <div className="space-y-3">
        <div className="h-16 bg-gray-100" />
        <div className="h-16 bg-gray-100" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-2 border-gray-200 bg-white p-3 animate-pulse">
          <div className="h-8 bg-gray-100 w-16 mb-1" />
          <div className="h-3 bg-gray-100 w-20" />
        </div>
      ))}
    </div>
  );
}
