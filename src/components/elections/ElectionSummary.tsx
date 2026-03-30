/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import type { RaceResultFull } from '@/types/elections';
import { formatDistrictLabel, raceLink } from './ElectionResultsTable';

interface ElectionSummaryProps {
  results: RaceResultFull[];
  raceLabel: string;
}

const CLOSE_RACE_THRESHOLD = 5;

export function ElectionSummary({ results, raceLabel }: ElectionSummaryProps) {
  if (results.length === 0) return null;

  const demWins = results.filter(r => r.winner === 'D').length;
  const repWins = results.filter(r => r.winner === 'R').length;
  const otherWins = results.length - demWins - repWins;
  const closeRaces = results.filter(r => r.margin < CLOSE_RACE_THRESHOLD);
  const closest = [...results].sort((a, b) => a.margin - b.margin).slice(0, 3);

  const totalVotes = results.reduce((sum, r) => sum + r.total, 0);
  const totalDem = results.reduce((sum, r) => sum + r.dem, 0);
  const totalRep = results.reduce((sum, r) => sum + r.rep, 0);

  return (
    <div className="mb-8 space-y-4">
      {/* Headline */}
      <div className="border-2 border-black dark:border-gray-600 p-4">
        <p className="text-lg font-medium">
          {demWins > repWins ? (
            <>
              <span className="text-[#0a9338]">Democrats</span> won {demWins} of {results.length}{' '}
              {raceLabel}
            </>
          ) : repWins > demWins ? (
            <>
              <span className="text-[#e11d07]">Republicans</span> won {repWins} of {results.length}{' '}
              {raceLabel}
            </>
          ) : (
            <>
              Split: {demWins} Dem, {repWins} Rep of {results.length} {raceLabel}
            </>
          )}
          {otherWins > 0 && <span className="text-gray-500"> ({otherWins} other)</span>}
        </p>

        {/* Party split bar */}
        <div className="mt-3 flex h-6 w-full overflow-hidden border border-gray-300 dark:border-gray-600">
          {demWins > 0 && (
            <div
              className="bg-[#0a9338] flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(demWins / results.length) * 100}%` }}
            >
              {demWins}
            </div>
          )}
          {otherWins > 0 && (
            <div
              className="bg-gray-400 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(otherWins / results.length) * 100}%` }}
            >
              {otherWins}
            </div>
          )}
          {repWins > 0 && (
            <div
              className="bg-[#e11d07] flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(repWins / results.length) * 100}%` }}
            >
              {repWins}
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total votes" value={totalVotes.toLocaleString('en-US')} />
        <StatCard
          label="Dem popular vote"
          value={`${((totalDem / totalVotes) * 100).toFixed(1)}%`}
          color="text-[#0a9338]"
        />
        <StatCard
          label="Rep popular vote"
          value={`${((totalRep / totalVotes) * 100).toFixed(1)}%`}
          color="text-[#e11d07]"
        />
        <StatCard
          label="Close races"
          value={`${closeRaces.length}`}
          sub={`decided by <${CLOSE_RACE_THRESHOLD} pts`}
        />
      </div>

      {/* Closest races — with links */}
      {closest.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs aicher-heading-wide text-gray-500 dark:text-gray-400 tracking-wider mb-2">
            CLOSEST RACES
          </p>
          <div className="space-y-2">
            {closest.map(r => {
              const href = raceLink(r);
              const label = formatDistrictLabel(r);
              return (
                <div key={r.districtId} className="flex items-center justify-between text-sm">
                  {href ? (
                    <Link href={href} className="font-medium text-civiq-blue hover:underline">
                      {label}
                    </Link>
                  ) : (
                    <span className="font-medium">{label}</span>
                  )}
                  <span className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        r.winner === 'D'
                          ? 'text-[#0a9338]'
                          : r.winner === 'R'
                            ? 'text-[#e11d07]'
                            : 'text-gray-500'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          r.winner === 'D'
                            ? 'bg-[#0a9338]'
                            : r.winner === 'R'
                              ? 'bg-[#e11d07]'
                              : 'bg-gray-400'
                        }`}
                      />
                      won by {r.margin.toFixed(1)} pts
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color || ''}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
