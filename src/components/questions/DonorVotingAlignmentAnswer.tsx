/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * DonorVotingAlignmentAnswer — pod renderer for the donor-voting-alignment question.
 *
 * Pods: Correlation summary, Sector breakdown, Methodology note, Sources.
 * Server component. All data passed as typed props from the page.
 */

import Link from 'next/link';
import type { VoteFinanceInsight, InsightResponse } from '@/lib/intelligence/types';

interface DonorVotingAlignmentAnswerProps {
  voteFinance: InsightResponse<VoteFinanceInsight> | null;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function describeCorrelation(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 0.7) return 'strong';
  if (abs >= 0.4) return 'moderate';
  if (abs >= 0.2) return 'weak';
  return 'negligible';
}

function CorrelationSummaryPod({ insight }: { insight: VoteFinanceInsight | null }) {
  if (!insight) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Correlation summary</h2>
        <p className="type-sm text-gray-500">
          Donor-voting alignment analysis is not yet available. This requires sufficient voting and
          campaign contribution data to detect patterns.
        </p>
      </div>
    );
  }

  const hasCorrelation = insight.overallCorrelation !== null;
  const sectorsAnalyzed = insight.correlations.filter(c => c.meetsSampleSize).length;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Correlation summary</h2>
      {hasCorrelation ? (
        <>
          <div className="mb-3">
            <span className="type-2xl font-semibold text-black">
              {(insight.overallCorrelation! * 100).toFixed(1)}%
            </span>
          </div>
          <p className="type-sm text-gray-700 mb-4">
            A{' '}
            <span className="font-medium">
              {describeCorrelation(insight.overallCorrelation!)} correlation
            </span>{' '}
            between donor sector funding and voting alignment, based on {sectorsAnalyzed}{' '}
            {sectorsAnalyzed === 1 ? 'sector' : 'sectors'} with sufficient data.
          </p>
          {insight.peerComparison && (
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="type-xs text-gray-500">Peer average</dt>
                <dd className="type-sm font-medium text-gray-900">
                  {(insight.peerComparison.peerAverage * 100).toFixed(1)}%
                </dd>
              </div>
              {insight.peerComparison.percentileRank !== undefined && (
                <div className="flex justify-between">
                  <dt className="type-xs text-gray-500">Percentile rank</dt>
                  <dd className="type-sm font-medium text-gray-900">
                    {insight.peerComparison.percentileRank.toFixed(0)}th
                  </dd>
                </div>
              )}
            </dl>
          )}
        </>
      ) : (
        <p className="type-sm text-gray-500">
          Not enough sectors meet the minimum sample size (10 votes per sector) to compute an
          overall correlation.{' '}
          {sectorsAnalyzed > 0
            ? `${sectorsAnalyzed} sector${sectorsAnalyzed === 1 ? '' : 's'} analyzed so far.`
            : ''}
        </p>
      )}
    </div>
  );
}

function SectorBreakdownPod({ insight }: { insight: VoteFinanceInsight | null }) {
  const sectors = insight?.correlations ?? [];
  const qualifying = sectors.filter(c => c.meetsSampleSize);

  if (!qualifying.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Sector alignment</h2>
        <p className="type-sm text-gray-500">
          No sectors have enough data (10+ votes) to show alignment patterns.
        </p>
      </div>
    );
  }

  const sorted = [...qualifying].sort((a, b) => b.alignmentScore - a.alignmentScore);
  const maxDonation = Math.max(...sorted.map(c => c.donationAmount), 1);

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Sector alignment</h2>
      <ul className="divide-y divide-gray-200">
        {sorted.map(sector => (
          <li key={sector.sector} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-baseline mb-1">
              <span className="type-sm text-gray-900 truncate mr-2">{sector.sector}</span>
              <span className="type-sm font-medium text-gray-900 shrink-0">
                {(sector.alignmentScore * 100).toFixed(1)}% aligned
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 border border-gray-200">
                <div
                  className="h-full bg-gray-400"
                  style={{ width: `${Math.round((sector.donationAmount / maxDonation) * 100)}%` }}
                />
              </div>
              <span className="type-xs text-gray-500 shrink-0 w-16 text-right">
                {formatCurrency(sector.donationAmount)}
              </span>
            </div>
            <p className="type-xs text-gray-500 mt-0.5">
              {sector.billsVotedOn} {sector.billsVotedOn === 1 ? 'bill' : 'bills'} analyzed
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MethodologyPod({ insight }: { insight: VoteFinanceInsight | null }) {
  if (!insight) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Methodology</h2>
        <p className="type-sm text-gray-500">
          Analysis methodology will be shown when data is available.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Methodology</h2>
      <p className="type-sm text-gray-700 mb-3">{insight.methodology}</p>
      <p className="type-xs text-gray-500">{insight.disclaimer}</p>
      <dl className="mt-3 space-y-1">
        <div className="flex justify-between">
          <dt className="type-xs text-gray-500">Confidence</dt>
          <dd className="type-xs font-medium text-gray-900">
            {(insight.confidence * 100).toFixed(0)}%
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="type-xs text-gray-500">Data as of</dt>
          <dd className="type-xs font-medium text-gray-900">
            {new Date(insight.dataAsOf).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Campaign finance data from{' '}
        <a href="https://www.fec.gov" className="text-[#3ea2d4] hover:underline">
          FEC.gov
        </a>
        . Voting records from{' '}
        <a href="https://www.congress.gov" className="text-[#3ea2d4] hover:underline">
          Congress.gov
        </a>
        .{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function DonorVotingAlignmentAnswer({ voteFinance }: DonorVotingAlignmentAnswerProps) {
  const insight = voteFinance?.data ?? null;

  return (
    <>
      <CorrelationSummaryPod insight={insight} />
      <MethodologyPod insight={insight} />
      <SectorBreakdownPod insight={insight} />
      <SourcesPod />
    </>
  );
}
