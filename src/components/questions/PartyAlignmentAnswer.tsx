/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * PartyAlignmentAnswer — pod renderer for the party-alignment question.
 *
 * Pods: Party-line voting rate, Quarterly trend, Notable shifts.
 * Server component. All data passed as typed props from the page.
 */

import { InsightCard } from '@/components/intelligence/InsightCard';
import Link from 'next/link';
import type { TemporalVoteInsight, InsightResponse, QuarterData } from '@/lib/intelligence/types';

interface PartyAlignmentData {
  overall_alignment: number;
  total_votes_analyzed: number;
  alignment_trend: 'increasing' | 'decreasing' | 'stable';
  comparison_to_peers: {
    state_avg_alignment: number;
    party_avg_alignment: number;
    chamber_avg_alignment: number;
  };
  voting_patterns: {
    with_party: number;
    against_party: number;
    bipartisan: number;
    absent: number;
  };
  key_departures: Array<{
    bill_number: string;
    bill_title: string;
    vote_date: string;
    representative_position: string;
    party_majority_position: string;
    significance: 'high' | 'medium' | 'low';
  }>;
}

interface RepProfile {
  name: string;
  party: string;
  state: string;
}

interface PartyAlignmentAnswerProps {
  profile: RepProfile;
  partyAlignment: PartyAlignmentData | null;
  temporalInsight: InsightResponse<TemporalVoteInsight> | null;
}

const PARTY_COLORS: Record<string, string> = {
  Republican: '#e11d07',
  Democratic: '#0a9338',
};

function AlignmentRatePod({
  profile,
  alignment,
}: {
  profile: RepProfile;
  alignment: PartyAlignmentData | null;
}) {
  if (!alignment || alignment.total_votes_analyzed === 0) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Party-line voting rate</h2>
        <p className="type-sm text-gray-500">
          Party alignment data is not yet available. This requires voting record data from
          Congress.gov.
        </p>
      </div>
    );
  }

  const partyColor = PARTY_COLORS[profile.party] ?? '#6b7280';
  const trendLabel =
    alignment.alignment_trend === 'increasing'
      ? 'trending up'
      : alignment.alignment_trend === 'decreasing'
        ? 'trending down'
        : 'stable';

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Party-line voting rate</h2>
      <div className="flex items-baseline gap-3 mb-3">
        <span
          className="inline-block w-3 h-3 shrink-0"
          style={{ backgroundColor: partyColor }}
          aria-label={profile.party}
        />
        <span className="type-2xl font-semibold text-black">
          {alignment.overall_alignment.toFixed(1)}%
        </span>
      </div>
      <p className="type-sm text-gray-700 mb-4">
        {profile.name} votes with the {profile.party} party {alignment.overall_alignment.toFixed(1)}
        % of the time ({trendLabel}).
      </p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="type-xs text-gray-500">Votes analyzed</dt>
          <dd className="font-medium text-gray-900">{alignment.total_votes_analyzed}</dd>
        </div>
        <div>
          <dt className="type-xs text-gray-500">Party average</dt>
          <dd className="font-medium text-gray-900">
            {alignment.comparison_to_peers.party_avg_alignment.toFixed(1)}%
          </dd>
        </div>
      </dl>
    </div>
  );
}

function QuarterlyTrendPod({ insight }: { insight: InsightResponse<TemporalVoteInsight> | null }) {
  if (!insight?.data?.quarters?.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Quarterly trend</h2>
        <p className="type-sm text-gray-500">
          Detailed voting trend analysis is not yet available.
        </p>
      </div>
    );
  }

  const quarters = insight.data.quarters;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Quarterly trend</h2>
      <ul className="space-y-2">
        {quarters.map((q: QuarterData) => (
          <li key={q.quarter} className="flex justify-between items-center">
            <span className="type-xs text-gray-600">{q.quarter}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-100 border border-gray-200">
                <div
                  className="h-full bg-gray-500"
                  style={{ width: `${Math.round(q.alignmentScore * 100)}%` }}
                />
              </div>
              <span className="type-xs font-medium text-gray-900 w-12 text-right">
                {(q.alignmentScore * 100).toFixed(1)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotableShiftsPod({ insight }: { insight: InsightResponse<TemporalVoteInsight> | null }) {
  if (!insight?.data?.shifts?.length) return null;

  const shifts = insight.data.shifts;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Notable shifts</h2>
      <InsightCard
        title="Voting pattern changes"
        insight={insight.data}
        keyStats={shifts.map(s => ({
          label: `${s.quarter} — ${s.direction === 'increase' ? 'More aligned' : 'Less aligned'}`,
          value: `${s.magnitude.toFixed(1)} pts`,
        }))}
      />
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Voting data from{' '}
        <a href="https://www.congress.gov" className="text-[#3ea2d4] hover:underline">
          Congress.gov
        </a>{' '}
        and chamber roll call records.{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function PartyAlignmentAnswer({
  profile,
  partyAlignment,
  temporalInsight,
}: PartyAlignmentAnswerProps) {
  return (
    <>
      <AlignmentRatePod profile={profile} alignment={partyAlignment} />
      <QuarterlyTrendPod insight={temporalInsight} />
      <NotableShiftsPod insight={temporalInsight} />
      <SourcesPod />
    </>
  );
}
