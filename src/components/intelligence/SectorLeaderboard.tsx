/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { RepLink } from '@/components/shared/links/EntityLinks';
import { SourceCitation } from './SourceCitation';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { getPartyHexColor } from '@/lib/party-colors';
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

const PARTIES = [
  { label: 'All', value: '' },
  { label: 'D', value: 'D' },
  { label: 'R', value: 'R' },
  { label: 'I', value: 'I' },
] as const;

type SortKey = 'state' | 'name' | 'party' | 'rate';
type SortDir = 'asc' | 'desc';

const COLUMNS: Array<{ key: SortKey; label: string; align: string }> = [
  { key: 'name', label: 'Name', align: 'text-left' },
  { key: 'party', label: 'Party', align: 'text-center' },
  { key: 'state', label: 'State', align: 'text-left' },
  { key: 'rate', label: 'Yes-vote rate', align: 'text-right' },
];

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

/** The API sends 0-1 rates (yea / (yea + nay)); display as percent. */
function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Signed difference from the House average, in percentage points. */
function vsAverage(rate: number, mean: number): string {
  const diff = (rate - mean) * 100;
  if (Math.abs(diff) < 0.05) return '0.0';
  return `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}`;
}

function compareEntries(
  a: SectorLeaderboardEntry,
  b: SectorLeaderboardEntry,
  key: SortKey
): number {
  switch (key) {
    case 'rate':
      return a.sectorAlignmentScore - b.sectorAlignmentScore;
    case 'party':
      return a.party.localeCompare(b.party);
    case 'name':
      return a.name.localeCompare(b.name);
    case 'state':
      return a.state.localeCompare(b.state) || a.name.localeCompare(b.name);
  }
}

const fetcher = (url: string): Promise<SectorLeaderboardResponse | null> =>
  fetch(url).then(res => {
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json() as Promise<SectorLeaderboardResponse>;
  });

// ── Props ────────────────────────────────────────────────────────────

interface SectorLeaderboardProps {
  /** Initial sector (IndustrySector enum string value). */
  initialSector?: string;
  className?: string;
}

// ── Component ────────────────────────────────────────────────────────

/**
 * House members' yes-vote rates on bills classified to a sector, with the
 * House average as the baseline. Deliberately unranked and money-free: the
 * rates sit close together, and the only per-member sector dollar figure
 * available is a contribution sample, not a total.
 */
export function SectorLeaderboard({ initialSector, className = '' }: SectorLeaderboardProps) {
  const [selectedSector, setSelectedSector] = useState<string>(
    initialSector ?? IndustrySector.FINANCE_INSURANCE_REAL_ESTATE
  );
  const [party, setParty] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'state', dir: 'asc' });

  const slug = useMemo(() => sectorToSlug(selectedSector), [selectedSector]);
  const query = party ? `?party=${party}` : '';

  const { data, isLoading } = useSWR<SectorLeaderboardResponse | null>(
    `/api/intelligence/sector/${slug}/leaderboard${query}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const rows = useMemo(() => {
    const entries = [...(data?.entries ?? [])];
    entries.sort((a, b) => {
      const c = compareEntries(a, b, sort.key);
      return sort.dir === 'asc' ? c : -c;
    });
    return entries;
  }, [data, sort]);

  const toggleSort = (key: SortKey) =>
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'rate' ? 'desc' : 'asc' }
    );

  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      <h3 className="aicher-heading type-lg text-gray-900 mb-1">
        House yes-vote rate on {selectedSector} bills
      </h3>
      <p className="type-xs text-gray-500 mb-4">
        Share of each member&apos;s yea and nay votes that were yea, on recent House roll calls on
        bills classified to this sector. Senators are not covered.
      </p>

      {/* Sector selector */}
      <div className="mb-4">
        <label className="sr-only" htmlFor="sector-vote-rate-sector">
          Sector
        </label>
        <select
          id="sector-vote-rate-sector"
          value={selectedSector}
          onChange={e => setSelectedSector(e.target.value)}
          className="w-full border-2 border-gray-900 bg-white p-2 text-base text-gray-900 focus:outline-none focus:border-civiq-blue"
        >
          {ALL_SECTORS.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Party filter */}
      <div className="flex flex-wrap gap-1 mb-4" role="group" aria-label="Filter by party">
        {PARTIES.map(p => (
          <button
            key={p.value}
            type="button"
            onClick={() => setParty(p.value)}
            aria-pressed={party === p.value}
            className={`px-3 py-2 min-h-[44px] type-xs font-medium rounded-sm ${
              party === p.value
                ? 'border-2 border-civiq-blue text-gray-900'
                : 'border-2 border-gray-200 text-gray-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2" aria-label="Loading sector vote rates">
          <div className="h-8 bg-gray-200 animate-pulse" />
          <div className="h-6 bg-gray-100 animate-pulse w-3/4" />
          <div className="h-6 bg-gray-100 animate-pulse w-2/3" />
          <div className="h-6 bg-gray-100 animate-pulse w-5/6" />
        </div>
      )}

      {/* Baseline */}
      {!isLoading && data?.stats && (
        <div className="bg-gray-50 p-3 mb-4 flex flex-wrap gap-4">
          <div>
            <span className="type-xs text-gray-500">House average</span>
            <div className="aicher-heading type-2xl text-gray-900">{pct(data.stats.mean)}</div>
          </div>
          <div>
            <span className="type-xs text-gray-500">Median</span>
            <div className="aicher-heading type-2xl text-gray-900">{pct(data.stats.median)}</div>
          </div>
          <div>
            <span className="type-xs text-gray-500">Spread (SD)</span>
            <div className="aicher-heading type-2xl text-gray-900">
              {(data.stats.standardDeviation * 100).toFixed(1)} pts
            </div>
          </div>
          <div>
            <span className="type-xs text-gray-500">Members included</span>
            <div className="aicher-heading type-2xl text-gray-900">
              {data.stats.includedMembers}
            </div>
          </div>
          <div>
            <span className="type-xs text-gray-500">Too few votes</span>
            <div className="aicher-heading type-2xl text-gray-400">
              {data.stats.excludedMembers}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && data && rows.length > 0 && (
        <div className="bg-gray-50 overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full">
            <caption className="sr-only">
              House yes-vote rate on {selectedSector} bills, by member
            </caption>
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b-2 border-gray-200">
                {COLUMNS.map(col => {
                  const active = sort.key === col.key;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={
                        active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                      }
                      className={`type-xs font-medium p-2 ${col.align}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`min-h-[44px] ${active ? 'text-civiq-blue' : 'text-gray-500'}`}
                      >
                        {col.label}
                        {active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                      </button>
                    </th>
                  );
                })}
                <th scope="col" className="type-xs text-gray-500 font-medium text-right p-2">
                  vs. avg (pts)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map(entry => (
                <tr key={entry.bioguideId}>
                  <td className="type-xs p-2">
                    <RepLink
                      bioguideId={entry.bioguideId}
                      name={entry.name}
                      className="font-medium"
                    />
                  </td>
                  <td className="p-2 text-center whitespace-nowrap">
                    <span
                      className="inline-block w-3 h-3 border-2 border-gray-300 align-middle"
                      style={{ backgroundColor: getPartyHexColor(entry.party) }}
                      aria-hidden="true"
                    />
                    <span className="type-xs text-gray-600 ml-1">{entry.party}</span>
                  </td>
                  <td className="type-xs text-gray-600 p-2">{entry.state}</td>
                  <td className="type-xs font-medium text-gray-900 text-right p-2 tabular-nums">
                    {pct(entry.sectorAlignmentScore)}
                  </td>
                  <td className="type-xs text-gray-600 text-right p-2 tabular-nums">
                    {vsAverage(entry.sectorAlignmentScore, data.stats.mean)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && rows.length === 0 && (
        <div className="bg-gray-50 p-6 text-center">
          <p className="type-sm text-gray-500">
            No House members have at least 10 recorded votes on {selectedSector} bills for this
            filter yet.
          </p>
        </div>
      )}

      {/* Freshness + disclaimer */}
      {data?.dataAsOf && <SourceCitation sources={[]} dataAsOf={data.dataAsOf} className="mt-3" />}
      <p className="type-xs text-gray-500 mt-1">
        Most members fall within a few points of the House average, so small gaps are not
        meaningful. A sector&apos;s bills include measures that both help and limit the industry, so
        a higher or lower rate does not show support for or opposition to it. Members with fewer
        than 10 yea or nay votes on these bills are left out.
      </p>
    </div>
  );
}

export default SectorLeaderboard;
