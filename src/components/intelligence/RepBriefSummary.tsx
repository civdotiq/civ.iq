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

const fetcher = (url: string) => fetch(url).then(r => (r.ok ? r.json() : null));

function partyLabel(party: string): string {
  if (party === 'D') return 'Democrat';
  if (party === 'R') return 'Republican';
  if (party === 'I' || party === 'ID') return 'Independent';
  return party;
}

function partyColor(party: string): string {
  if (party === 'D') return 'bg-[#0a9338]';
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
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
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
        <div className="space-y-2 mb-4">
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
    </div>
  );
}
