/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { RepLink } from '@/components/shared/links/EntityLinks';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { SectorLeaderboardResponse, SectorLeaderboardEntry } from '@/lib/intelligence/types';

// ── Constants ────────────────────────────────────────────────────────

const ALL_SECTORS: IndustrySector[] = [
  IndustrySector.AGRIBUSINESS,
  IndustrySector.COMMUNICATIONS_ELECTRONICS,
  IndustrySector.CONSTRUCTION,
  IndustrySector.DEFENSE,
  IndustrySector.ENERGY_NATURAL_RESOURCES,
  IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
  IndustrySector.HEALTH,
  IndustrySector.LAWYERS_LOBBYISTS,
  IndustrySector.TRANSPORTATION,
  IndustrySector.MISC_BUSINESS,
  IndustrySector.LABOR,
  IndustrySector.IDEOLOGY_SINGLE_ISSUE,
  IndustrySector.OTHER,
];

const PARTY_COLORS: Record<string, string> = {
  D: '#0a9338',
  R: '#e11d07',
  I: '#6b7280',
};

const CHAMBERS = [
  { label: 'All', value: '' },
  { label: 'House', value: 'house' },
  { label: 'Senate', value: 'senate' },
] as const;

const PARTIES = [
  { label: 'All', value: '' },
  { label: 'D', value: 'D' },
  { label: 'R', value: 'R' },
  { label: 'I', value: 'I' },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────

/** Convert IndustrySector enum value to URL slug. */
function sectorToSlug(sector: string): string {
  return sector
    .toLowerCase()
    .replace(/[/&]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/'/g, '')
    .replace(/-{2,}/g, '-');
}

/** Format dollar amount compactly: $1.2M, $500K, $1.5K */
function formatCompactDollars(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `$${k >= 10 ? Math.round(k) : k.toFixed(1)}K`;
  }
  return `$${Math.round(amount)}`;
}

/** Score intensity: darker gray = higher value. Neutral, non-editorial. */
function alignmentColor(score: number): string {
  if (score > 60) return 'text-gray-900';
  if (score >= 30) return 'text-gray-600';
  return 'text-gray-400';
}

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  });

// ── Props ────────────────────────────────────────────────────────────

interface SectorLeaderboardProps {
  /** Initial sector (IndustrySector enum string value). */
  initialSector?: string;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────

export function SectorLeaderboard({ initialSector, className = '' }: SectorLeaderboardProps) {
  const [selectedSector, setSelectedSector] = useState<string>(
    initialSector ?? IndustrySector.FINANCE_INSURANCE_REAL_ESTATE
  );
  const [chamber, setChamber] = useState('');
  const [party, setParty] = useState('');

  const slug = useMemo(() => sectorToSlug(selectedSector), [selectedSector]);

  const queryParams = useMemo(() => {
    const parts: string[] = [];
    if (chamber) parts.push(`chamber=${chamber}`);
    if (party) parts.push(`party=${party}`);
    parts.push('limit=20');
    return parts.join('&');
  }, [chamber, party]);

  const { data, isLoading } = useSWR<SectorLeaderboardResponse>(
    `/api/intelligence/sector/${slug}/leaderboard?${queryParams}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      <h3 className="aicher-heading type-lg text-gray-900 mb-4">Sector Leaderboard</h3>

      {/* Sector selector */}
      <div className="mb-4">
        <select
          value={selectedSector}
          onChange={e => setSelectedSector(e.target.value)}
          className="w-full border-2 border-gray-900 bg-white p-2 text-base text-gray-900 focus:outline-none"
        >
          {ALL_SECTORS.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1">
          {CHAMBERS.map(c => (
            <button
              key={c.value}
              onClick={() => setChamber(c.value)}
              className={`px-3 py-2 min-h-[44px] type-xs font-medium ${
                chamber === c.value
                  ? 'border-2 border-gray-900 bg-gray-100 text-gray-900'
                  : 'border-2 border-gray-200 text-gray-500'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PARTIES.map(p => (
            <button
              key={p.value}
              onClick={() => setParty(p.value)}
              className={`px-3 py-2 min-h-[44px] type-xs font-medium ${
                party === p.value
                  ? 'border-2 border-gray-900 bg-gray-100 text-gray-900'
                  : 'border-2 border-gray-200 text-gray-500'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 animate-pulse" />
          <div className="h-6 bg-gray-100 animate-pulse w-3/4" />
          <div className="h-6 bg-gray-100 animate-pulse w-2/3" />
          <div className="h-6 bg-gray-100 animate-pulse w-5/6" />
          <div className="h-6 bg-gray-100 animate-pulse w-1/2" />
        </div>
      )}

      {/* Stats bar */}
      {!isLoading && data?.stats && (
        <div className="bg-gray-50 p-3 mb-4 flex flex-wrap gap-4">
          <div>
            <span className="type-xs text-gray-500">Average sector vote rate</span>
            <div className="aicher-heading type-2xl text-gray-900">
              {data.stats.mean.toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="type-xs text-gray-500">Typical (middle value)</span>
            <div className="aicher-heading type-2xl text-gray-900">
              {data.stats.median.toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="type-xs text-gray-500">Included</span>
            <div className="aicher-heading type-2xl text-gray-900">
              {data.stats.includedMembers}
            </div>
          </div>
          <div>
            <span className="type-xs text-gray-500">Excluded</span>
            <div className="aicher-heading type-2xl text-gray-400">
              {data.stats.excludedMembers}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && data?.entries && data.entries.length > 0 && (
        <div className="bg-gray-50 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="type-xs text-gray-500 font-medium text-left p-2 w-12">#</th>
                <th className="type-xs text-gray-500 font-medium text-left p-2">Name</th>
                <th className="type-xs text-gray-500 font-medium text-center p-2 w-12">Party</th>
                <th className="type-xs text-gray-500 font-medium text-left p-2 w-14 hidden sm:table-cell">
                  State
                </th>
                <th className="type-xs text-gray-500 font-medium text-right p-2 w-24">
                  Sector vote rate
                </th>
                <th className="type-xs text-gray-500 font-medium text-right p-2 w-24 hidden sm:table-cell">
                  Donations
                </th>
                <th className="type-xs text-gray-500 font-medium text-right p-2 w-16 hidden md:table-cell">
                  Bills
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.entries.map((entry: SectorLeaderboardEntry) => (
                <tr key={entry.bioguideId} className="hover:bg-gray-50">
                  <td className="type-xs text-gray-400 p-2">{entry.rank}</td>
                  <td className="type-xs p-2">
                    <RepLink
                      bioguideId={entry.bioguideId}
                      name={entry.name}
                      className="font-medium"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className="inline-block w-3 h-3 border-2 border-gray-300"
                      style={{ backgroundColor: PARTY_COLORS[entry.party] ?? '#6b7280' }}
                      title={entry.party}
                    />
                  </td>
                  <td className="type-xs text-gray-600 p-2 hidden sm:table-cell">{entry.state}</td>
                  <td
                    className={`type-xs font-medium text-right p-2 ${alignmentColor(entry.sectorAlignmentScore)}`}
                  >
                    {entry.sectorAlignmentScore.toFixed(1)}%
                  </td>
                  <td className="type-xs text-gray-600 text-right p-2 hidden sm:table-cell">
                    {formatCompactDollars(entry.sectorDonationAmount)}
                  </td>
                  <td className="type-xs text-gray-600 text-right p-2 hidden md:table-cell">
                    {entry.billsVotedOn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data?.entries && data.entries.length === 0 && (
        <div className="bg-gray-50 p-6 text-center">
          <p className="type-sm text-gray-400">
            No legislators meet the minimum data threshold for this sector and filter combination.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="type-xs text-gray-400 mt-3">
        Sector vote rates reflect voting patterns on sector-relevant bills relative to campaign
        donations. Correlation does not indicate causation or improper behavior.
      </p>
    </div>
  );
}

export default SectorLeaderboard;
