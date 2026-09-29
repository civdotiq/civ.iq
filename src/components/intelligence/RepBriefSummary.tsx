/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import type { CivicBriefInsight } from '@/lib/intelligence/types';

interface RepBriefSummaryProps {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: string | null;
  chamber: 'House' | 'Senate';
  className?: string;
}

// A cold brief is computed on demand (11-18s observed, up to the 55s analyzer
// budget). Cap the wait so the card settles on its empty state instead of an
// endless skeleton. Generous on purpose: an early abort can cancel the server
// run before it caches, keeping the brief cold for the next visitor.
const BRIEF_TIMEOUT_MS = 30_000;

const fetcher = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(BRIEF_TIMEOUT_MS) }).then(r => (r.ok ? r.json() : null));

function partyLabel(party: string): string {
  if (party === 'D') return 'Democrat';
  if (party === 'R') return 'Republican';
  if (party === 'I' || party === 'ID') return 'Independent';
  return party;
}

function partyColor(party: string): string {
  if (party === 'D') return 'bg-party-dem';
  if (party === 'R') return 'bg-[#e11d07]';
  return 'bg-gray-500';
}

export function RepBriefSummary({
  bioguideId,
  name,
  party,
  state,
  district,
  chamber,
  className = '',
}: RepBriefSummaryProps) {
  const { data: insight, isLoading } = useSWR<CivicBriefInsight>(
    `/api/intelligence/representative/${bioguideId}/brief`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000, shouldRetryOnError: false }
  );

  const location = district ? `${state}-${district}` : state;
  const topFinding = insight?.patterns?.[0] ?? null;

  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Identity — always visible immediately */}
      <div className="flex items-start gap-3 mb-3">
        <span
          className={`w-3 h-3 mt-1.5 flex-shrink-0 ${partyColor(party)}`}
          aria-label={partyLabel(party)}
        />
        <div className="min-w-0">
          <h3 className="aicher-heading type-base text-gray-900 truncate">{name}</h3>
          <p className="type-sm text-gray-500">
            {partyLabel(party)} · {chamber} · {location}
          </p>
        </div>
      </div>

      {/* Brief content — loads progressively */}
      {isLoading && (
        <div className="space-y-2 mb-4" role="status">
          <p className="type-xs text-gray-500">
            Building summary from Congress.gov and FEC records…
          </p>
          <div className="h-3 bg-gray-200 w-full animate-pulse" />
          <div className="h-3 bg-gray-200 w-4/5 animate-pulse" />
          <div className="h-3 bg-gray-200 w-3/5 animate-pulse" />
        </div>
      )}

      {insight && (
        <>
          <p className="type-sm text-gray-700 leading-relaxed mb-3">{insight.summary}</p>

          {topFinding && (
            <div className="border-t-2 border-gray-100 pt-3 mb-3">
              <p className="type-xs text-gray-500 aicher-heading mb-1">Key finding</p>
              <p className="type-sm text-gray-900">{topFinding.headline}</p>
            </div>
          )}
        </>
      )}

      {!isLoading && !insight && (
        <p className="type-sm text-gray-400 mb-3">
          Brief not yet available for this representative.
        </p>
      )}

      {/* Link to full profile */}
      <Link
        href={`/representative/${bioguideId}?tab=intelligence`}
        className="inline-block type-sm text-[#3ea2d4] aicher-heading py-2 min-h-[44px] leading-[44px] aicher-focus"
        aria-label={`View full profile for ${name}`}
      >
        View full profile
      </Link>

      {/* Question links */}
      <div className="border-t border-gray-200 pt-3 mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <Link
          href={`/ask/campaign-contributions/${bioguideId}`}
          className="type-xs text-[#3ea2d4] hover:underline"
        >
          Campaign contributions
        </Link>
        <Link
          href={`/ask/voting-record/${bioguideId}`}
          className="type-xs text-[#3ea2d4] hover:underline"
        >
          Voting record
        </Link>
        <Link
          href={`/ask/contact-info/${bioguideId}`}
          className="type-xs text-[#3ea2d4] hover:underline"
        >
          Contact info
        </Link>
      </div>
    </div>
  );
}
