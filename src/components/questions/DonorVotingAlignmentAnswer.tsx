/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * DonorVotingAlignmentAnswer — pod renderer for the donor-voting-alignment
 * question. Shows the raw yea-rate on bills touching top donor sectors, the
 * per-sector breakdown (filtered to sectors that actually donated), a
 * plain-language methodology note, and sources.
 *
 * Server component. Data arrives via props; parent page streams this pod
 * inside a Suspense boundary (cold computation can take 40–55s).
 */

import Link from 'next/link';
import { displaySector } from '@/lib/mesh/sector-display';
import type { VoteFinanceInsight, InsightResponse } from '@/lib/intelligence/types';

interface DonorVotingAlignmentAnswerProps {
  voteFinance: InsightResponse<VoteFinanceInsight> | null;
}

/** Sectors excluded from the per-sector breakdown. */
const EXCLUDED_SECTORS = new Set(['Other']);

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function HeadlinePod({ insight }: { insight: VoteFinanceInsight | null }) {
  if (!insight) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Yea-rate on industry-tagged bills</h2>
        <p className="type-sm text-gray-500">
          We couldn&apos;t compute this representative&apos;s yea-rate. This usually means they have
          no FEC-matched campaign committee, too few recorded votes for the current Congress, or no
          itemized contributions with employer data.
        </p>
      </div>
    );
  }

  const totalSectorVotes = insight.correlations.reduce((sum, c) => sum + c.billsVotedOn, 0);

  if (totalSectorVotes === 0) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Yea-rate on industry-tagged bills</h2>
        <p className="type-sm text-gray-500">
          No recorded votes on industry-tagged bills yet. Check back as more roll-call votes are
          recorded in the current Congress.
        </p>
      </div>
    );
  }

  const yeaRate = insight.overallAlignment ?? 0;
  const peer = insight.peerComparison;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Yea-rate on industry-tagged bills</h2>
      <div className="mb-3">
        <span className="type-2xl font-semibold text-black">{(yeaRate * 100).toFixed(0)}%</span>
        <span className="type-sm text-gray-500 ml-2">yea rate</span>
      </div>
      <p className="type-sm text-gray-700 mb-3">
        Across {totalSectorVotes} recorded votes on bills that touch an industry sector, this
        representative voted yea {(yeaRate * 100).toFixed(0)}% of the time. The per-sector breakdown
        below narrows this to sectors that actually donated to them.
      </p>
      <p className="type-xs text-gray-500">
        A yea vote isn&apos;t the same as a vote &ldquo;for&rdquo; an industry — a single bill can
        help or hurt a sector. This is the raw yea-rate, not a support score.
      </p>
      {peer && peer.peerCount > 0 && (
        <dl className="mt-4 pt-3 border-t border-gray-200 space-y-1">
          <div className="flex justify-between items-baseline">
            <dt className="type-xs text-gray-500">{peer.peerGroupLabel} average</dt>
            <dd className="type-sm font-medium text-gray-900">
              {(peer.peerAverage * 100).toFixed(0)}%
              <span className="text-gray-500 type-xs ml-1">
                ({peer.peerCount} {peer.peerCount === 1 ? 'peer' : 'peers'})
              </span>
            </dd>
          </div>
          {peer.lowPeerCount && (
            <p className="type-xs text-gray-500">
              Peer group is small; treat the comparison as directional.
            </p>
          )}
        </dl>
      )}
      {!peer && insight.peerComparisonUnavailableReason && (
        <p className="mt-4 pt-3 border-t border-gray-200 type-xs text-gray-500">
          {insight.peerComparisonUnavailableReason}
        </p>
      )}
    </div>
  );
}

function SectorBreakdownPod({ insight }: { insight: VoteFinanceInsight | null }) {
  if (!insight) return null;

  const sectors = insight.correlations.filter(
    c => c.meetsSampleSize && c.donationAmount > 0 && !EXCLUDED_SECTORS.has(c.sector)
  );

  if (!sectors.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Per-sector breakdown</h2>
        <p className="type-sm text-gray-500">
          No donor sector has both recorded donations and 10 or more relevant votes to show a
          meaningful breakdown.
        </p>
      </div>
    );
  }

  const sorted = [...sectors].sort((a, b) => b.donationAmount - a.donationAmount);
  const maxDonation = Math.max(...sorted.map(c => c.donationAmount), 1);

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-1">Per-sector breakdown</h2>
      <p className="type-xs text-gray-500 mb-4">
        Sectors where this representative has received itemized donations and cast at least 10
        recorded votes on bills touching the sector. Bar width shows donation amount.
      </p>
      <ul className="divide-y divide-gray-200">
        {sorted.map(sector => (
          <li key={sector.sector} className="py-3 first:pt-0 last:pb-0">
            <div className="flex justify-between items-baseline mb-1">
              <span className="type-sm text-gray-900 truncate mr-2">
                {displaySector(sector.sector)}
              </span>
              <span className="type-sm font-medium text-gray-900 shrink-0">
                {(sector.alignmentScore * 100).toFixed(0)}% yea rate
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 border border-gray-200">
                <div
                  className="h-full bg-gray-400"
                  style={{
                    width: `${Math.round((sector.donationAmount / maxDonation) * 100)}%`,
                  }}
                />
              </div>
              <span className="type-xs text-gray-500 shrink-0 w-16 text-right">
                {formatCurrency(sector.donationAmount)}
              </span>
            </div>
            <p className="type-xs text-gray-500 mt-0.5">
              {sector.billsVotedOn} {sector.billsVotedOn === 1 ? 'vote' : 'votes'} on{' '}
              sector-relevant bills
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
        <h2 className="type-sm font-semibold text-black mb-3">How this was calculated</h2>
        <p className="type-sm text-gray-500">Methodology will appear once data is available.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">How this was calculated</h2>
      <p className="type-sm text-gray-700 mb-3">
        For every recorded vote we pulled, we check whether the bill touches specific industry
        sectors — using the bill&apos;s official policy area and the industries named in its
        summary. For each sector that donated to this representative, we count how often they voted
        yea on bills touching that sector.
      </p>
      <p className="type-xs text-gray-500 mb-3">
        Sectors with fewer than 10 recorded votes on sector-tagged bills are excluded, and the
        generic FEC &ldquo;Other&rdquo; bucket is not shown. A yea vote isn&apos;t inherently
        &ldquo;for&rdquo; an industry — individual bills can help or hurt a sector — so this is a
        raw yea-rate, not a support score.
      </p>
      <dl className="pt-3 border-t border-gray-200 space-y-1">
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

function DisclaimerPod({ insight }: { insight: VoteFinanceInsight | null }) {
  if (!insight) return null;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Context</h2>
      <p className="type-sm text-gray-700">{insight.disclaimer}</p>
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
        </a>{' '}
        (current two-year cycle). Voting records from{' '}
        <a href="https://www.congress.gov" className="text-[#3ea2d4] hover:underline">
          Congress.gov
        </a>{' '}
        (119th Congress).{' '}
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
      <HeadlinePod insight={insight} />
      <SectorBreakdownPod insight={insight} />
      <MethodologyPod insight={insight} />
      <DisclaimerPod insight={insight} />
      <SourcesPod />
    </>
  );
}

/**
 * Pod-shaped skeleton shown while the analyzer computes. The cold path can
 * take 40–55 seconds, so the parent page streams this fallback via Suspense
 * and swaps in real pods when the server component resolves.
 */
export function DonorVotingAlignmentSkeleton() {
  return (
    <>
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Votes on donor-industry bills</h2>
        <div className="h-8 w-24 bg-gray-200 animate-pulse mb-3" aria-hidden />
        <div className="h-4 w-3/4 bg-gray-100 animate-pulse mb-2" aria-hidden />
        <div className="h-4 w-1/2 bg-gray-100 animate-pulse mb-4" aria-hidden />
        <p className="type-xs text-gray-500">
          Computing this representative&apos;s vote-finance analysis. This can take up to a minute
          the first time a page is visited.
        </p>
      </div>
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Per-sector breakdown</h2>
        <ul className="space-y-3">
          {[0, 1, 2].map(i => (
            <li key={i}>
              <div className="h-4 w-1/3 bg-gray-100 animate-pulse mb-2" aria-hidden />
              <div className="h-2 w-full bg-gray-100 animate-pulse" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">How this was calculated</h2>
        <div className="h-4 w-full bg-gray-100 animate-pulse mb-2" aria-hidden />
        <div className="h-4 w-5/6 bg-gray-100 animate-pulse mb-2" aria-hidden />
        <div className="h-4 w-2/3 bg-gray-100 animate-pulse" aria-hidden />
      </div>
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Context</h2>
        <div className="h-4 w-full bg-gray-100 animate-pulse mb-2" aria-hidden />
        <div className="h-4 w-3/4 bg-gray-100 animate-pulse" aria-hidden />
      </div>
    </>
  );
}
