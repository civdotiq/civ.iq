/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { RaceResultFull } from '@/types/elections';
import { US_STATES } from '@/lib/data/us-states';

interface ElectionResultsTableProps {
  results: RaceResultFull[];
  labelFn: (result: RaceResultFull) => string;
}

type SortField = 'race' | 'margin' | 'winner';
type SortDir = 'asc' | 'desc';

const CLOSE_THRESHOLD = 5;

function formatVotes(n: number): string {
  return n.toLocaleString('en-US');
}

function partyColor(party: string): string {
  if (party === 'D') return '#0a9338';
  if (party === 'R') return '#e11d07';
  return '#9ca3af';
}

function partyName(party: string): string {
  if (party === 'D') return 'Democrat';
  if (party === 'R') return 'Republican';
  if (party === 'L') return 'Libertarian';
  return 'Other';
}

export function formatDistrictLabel(result: RaceResultFull): string {
  const id = result.districtId;
  const dashIdx = id.indexOf('-');
  if (dashIdx > 0) {
    const stateCode = id.slice(0, dashIdx);
    const suffix = id.slice(dashIdx + 1);

    if (['PRESIDENT', 'SENATE', 'GOVERNOR'].includes(suffix)) {
      return US_STATES[stateCode as keyof typeof US_STATES] || stateCode;
    }

    const distNum = parseInt(suffix, 10);
    if (!isNaN(distNum) && suffix.length <= 2) {
      const stateName = US_STATES[stateCode as keyof typeof US_STATES] || stateCode;
      if (distNum === 0) return `${stateName} At-Large`;
      return `${stateName} ${ordinal(distNum)}`;
    }

    if (suffix.startsWith('lower-') || suffix.startsWith('upper-')) {
      const chamber = suffix.startsWith('upper-') ? 'Senate' : 'House';
      const num = suffix.split('-')[1];
      const stateName = US_STATES[stateCode as keyof typeof US_STATES] || stateCode;
      return `${stateName} ${chamber} District ${num}`;
    }
  }
  return id;
}

/**
 * Returns a CIV.IQ link for a race result, or null if no appropriate page exists.
 */
export function raceLink(result: RaceResultFull): string | null {
  const id = result.districtId;
  const dashIdx = id.indexOf('-');
  if (dashIdx < 1) return null;

  const stateCode = id.slice(0, dashIdx);
  const suffix = id.slice(dashIdx + 1);

  // House district → /districts/PA-07
  const distNum = parseInt(suffix, 10);
  if (!isNaN(distNum) && suffix.length <= 2) {
    return `/districts/${stateCode}-${suffix}`;
  }

  // Statewide offices → /delegation/GA (senators + reps) or /states/ga (governor)
  if (suffix === 'PRESIDENT' || suffix === 'SENATE') {
    return `/delegation/${stateCode}`;
  }
  if (suffix === 'GOVERNOR') {
    return `/states/${stateCode.toLowerCase()}`;
  }

  // State legislature → /state-legislature/al
  if (suffix.startsWith('lower-') || suffix.startsWith('upper-')) {
    return `/state-legislature/${stateCode.toLowerCase()}`;
  }

  return null;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function MarginBar({ demPct, repPct, winner }: { demPct: number; repPct: number; winner: string }) {
  const otherPct = Math.max(0, 100 - demPct - repPct);
  return (
    <div
      className="flex h-4 w-full overflow-hidden bg-gray-100 dark:bg-gray-800"
      role="img"
      aria-label={`${winner === 'D' ? 'Democrat' : 'Republican'} lead`}
    >
      {demPct > 0 && (
        <div className="bg-[#0a9338] transition-all" style={{ width: `${demPct}%` }} />
      )}
      {otherPct > 0 && (
        <div className="bg-gray-300 dark:bg-gray-600" style={{ width: `${otherPct}%` }} />
      )}
      {repPct > 0 && (
        <div className="bg-[#e11d07] transition-all" style={{ width: `${repPct}%` }} />
      )}
    </div>
  );
}

function RaceRow({ result, label }: { result: RaceResultFull; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const isClose = result.margin < CLOSE_THRESHOLD;
  const href = raceLink(result);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#2a2a2e] transition-colors"
        aria-expanded={expanded}
      >
        {/* Main row */}
        <div className="flex items-center gap-3">
          {/* Race label — clickable link */}
          <div className="min-w-[140px] md:min-w-[200px] flex-shrink-0">
            {href ? (
              <Link
                href={href}
                className="font-medium text-sm text-civiq-blue hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {label}
              </Link>
            ) : (
              <span className="font-medium text-sm">{label}</span>
            )}
          </div>

          {/* Winner + margin text */}
          <div className="min-w-[140px] flex-shrink-0 flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: partyColor(result.winner) }}
            />
            <span className="text-sm">
              <span className="font-medium" style={{ color: partyColor(result.winner) }}>
                {partyName(result.winner)}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                won by {result.margin.toFixed(1)} pts
              </span>
            </span>
          </div>

          {/* Competitiveness badge */}
          <div className="flex-shrink-0 w-16">
            {isClose && (
              <span className="inline-block px-1.5 py-0.5 text-xs font-medium border border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30">
                Close
              </span>
            )}
          </div>

          {/* Margin bar */}
          <div className="flex-1 min-w-[80px] hidden sm:block">
            <MarginBar demPct={result.demPct} repPct={result.repPct} winner={result.winner} />
          </div>

          {/* Expand chevron */}
          <svg
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Mobile margin bar */}
        <div className="sm:hidden mt-2">
          <MarginBar demPct={result.demPct} repPct={result.repPct} winner={result.winner} />
        </div>
      </button>

      {/* Expanded vote details */}
      {expanded && (
        <div className="px-4 pb-3 bg-gray-50 dark:bg-[#222226]">
          <div className="grid grid-cols-3 gap-4 text-sm max-w-md">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Democrat</p>
              <p className="font-medium text-[#0a9338] tabular-nums">{formatVotes(result.dem)}</p>
              <p className="text-xs text-gray-400 tabular-nums">{result.demPct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Republican</p>
              <p className="font-medium text-[#e11d07] tabular-nums">{formatVotes(result.rep)}</p>
              <p className="text-xs text-gray-400 tabular-nums">{result.repPct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Other</p>
              <p className="font-medium text-gray-500 tabular-nums">{formatVotes(result.other)}</p>
              <p className="text-xs text-gray-400 tabular-nums">
                {result.total > 0 ? ((result.other / result.total) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 tabular-nums">
            Total: {formatVotes(result.total)} votes cast
          </p>
        </div>
      )}
    </div>
  );
}

function SortButton({
  field,
  label,
  activeField,
  activeDir,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  activeField: SortField;
  activeDir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = activeField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`font-semibold hover:text-black dark:hover:text-white transition-colors inline-flex items-center gap-1 ${
        isActive ? 'text-black dark:text-white' : ''
      } ${className || ''}`}
    >
      {label}
      {isActive && (
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={activeDir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
          />
        </svg>
      )}
    </button>
  );
}

export function ElectionResultsTable({ results, labelFn }: ElectionResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('race');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'margin' ? 'asc' : 'asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...results];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortField) {
        case 'race':
          return dir * labelFn(a).localeCompare(labelFn(b));
        case 'margin':
          return dir * (a.margin - b.margin);
        case 'winner': {
          const order: Record<string, number> = { D: 0, R: 1, L: 2, OTHER: 3 };
          const diff = (order[a.winner] ?? 4) - (order[b.winner] ?? 4);
          return diff !== 0 ? dir * diff : dir * (a.margin - b.margin);
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [results, sortField, sortDir, labelFn]);

  if (results.length === 0) {
    return (
      <div className="border-2 border-gray-300 dark:border-gray-600 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No results found for the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black dark:border-gray-600">
      {/* Sortable header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b-2 border-black dark:border-gray-600 bg-gray-50 dark:bg-[#222226] text-xs text-gray-500 dark:text-gray-400">
        <div className="min-w-[140px] md:min-w-[200px] flex-shrink-0">
          <SortButton
            field="race"
            label="Race"
            activeField={sortField}
            activeDir={sortDir}
            onSort={handleSort}
          />
        </div>
        <div className="min-w-[140px] flex-shrink-0">
          <SortButton
            field="winner"
            label="Result"
            activeField={sortField}
            activeDir={sortDir}
            onSort={handleSort}
          />
        </div>
        <div className="flex-shrink-0 w-16">
          <SortButton
            field="margin"
            label="Margin"
            activeField={sortField}
            activeDir={sortDir}
            onSort={handleSort}
          />
        </div>
        <div className="flex-1 min-w-[80px] hidden sm:block font-semibold">Vote share</div>
        <div className="w-4 flex-shrink-0" />
      </div>

      {/* Rows */}
      {sorted.map(r => (
        <RaceRow key={r.districtId} result={r} label={labelFn(r)} />
      ))}
    </div>
  );
}
