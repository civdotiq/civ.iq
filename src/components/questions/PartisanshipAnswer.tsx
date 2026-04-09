/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * PartisanshipAnswer — pod renderer for the partisanship question.
 *
 * Pods: Partisan score vs peers, Trend over time, Notable departures, Sources.
 * Server component. All data passed as typed props from the page.
 */

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

interface PartisanshipAnswerProps {
  profile: RepProfile;
  partyAlignment: PartyAlignmentData | null;
  temporalInsight: InsightResponse<TemporalVoteInsight> | null;
}

const PARTY_COLORS: Record<string, string> = {
  Republican: '#e11d07',
  Democratic: '#0a9338',
};

function PartisanScorePod({
  profile,
  alignment,
}: {
  profile: RepProfile;
  alignment: PartyAlignmentData | null;
}) {
  if (!alignment || alignment.total_votes_analyzed === 0) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Partisan score vs peers</h2>
        <p className="type-sm text-gray-500">
          Partisanship analysis requires voting record data from Congress.gov.
        </p>
      </div>
    );
  }

  const partyColor = PARTY_COLORS[profile.party] ?? '#6b7280';
  const diff = alignment.overall_alignment - alignment.comparison_to_peers.party_avg_alignment;
  const moreOrLess = diff > 0 ? 'more' : 'less';
  const diffAbs = Math.abs(diff);

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Partisan score vs peers</h2>
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
        {profile.name} is{' '}
        <span className="font-medium">
          {diffAbs.toFixed(1)} points {moreOrLess} partisan
        </span>{' '}
        than the {profile.party} party average.
      </p>
      <dl className="space-y-2">
        <div className="flex justify-between">
          <dt className="type-xs text-gray-500">Party average</dt>
          <dd className="type-sm font-medium text-gray-900">
            {alignment.comparison_to_peers.party_avg_alignment.toFixed(1)}%
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="type-xs text-gray-500">{profile.state} average</dt>
          <dd className="type-sm font-medium text-gray-900">
            {alignment.comparison_to_peers.state_avg_alignment.toFixed(1)}%
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="type-xs text-gray-500">Chamber average</dt>
          <dd className="type-sm font-medium text-gray-900">
            {alignment.comparison_to_peers.chamber_avg_alignment.toFixed(1)}%
          </dd>
        </div>
      </dl>
    </div>
  );
}

function TrendPod({ insight }: { insight: InsightResponse<TemporalVoteInsight> | null }) {
  if (!insight?.data?.quarters?.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Trend over time</h2>
        <p className="type-sm text-gray-500">
          Quarterly trend data is not yet available for this representative.
        </p>
      </div>
    );
  }

  const { quarters, overallTrend } = insight.data;
  const trendLabel =
    overallTrend === 'increasing'
      ? 'Becoming more partisan'
      : overallTrend === 'decreasing'
        ? 'Becoming less partisan'
        : overallTrend === 'volatile'
          ? 'Volatile pattern'
          : 'Stable over time';

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Trend over time</h2>
      <p className="type-xs text-gray-500 mb-3">{trendLabel}</p>
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

const SIGNIFICANCE_STYLES: Record<string, string> = {
  high: 'text-gray-900 font-medium',
  medium: 'text-gray-700',
  low: 'text-gray-500',
};

function NotableDeparturesPod({
  departures,
}: {
  departures: PartyAlignmentData['key_departures'] | undefined;
}) {
  if (!departures?.length) return null;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Notable departures from party line</h2>
      <ul className="divide-y divide-gray-200">
        {departures.map((d, i) => (
          <li key={i} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className={`type-sm line-clamp-1 ${SIGNIFICANCE_STYLES[d.significance] ?? 'text-gray-700'}`}
                >
                  {d.bill_title}
                </p>
                <p className="type-xs text-gray-500 mt-0.5">
                  {d.bill_number} —{' '}
                  {new Date(d.vote_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="type-xs text-gray-900">Voted {d.representative_position}</span>
                <p className="type-xs text-gray-500">Party: {d.party_majority_position}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
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
        and chamber roll call records. Peer averages computed from same-party, same-chamber members.{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function PartisanshipAnswer({
  profile,
  partyAlignment,
  temporalInsight,
}: PartisanshipAnswerProps) {
  return (
    <>
      <PartisanScorePod profile={profile} alignment={partyAlignment} />
      <TrendPod insight={temporalInsight} />
      <NotableDeparturesPod departures={partyAlignment?.key_departures} />
      <SourcesPod />
    </>
  );
}
