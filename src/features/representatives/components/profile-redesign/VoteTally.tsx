/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { getPartyTextClass } from '@/lib/party-colors';
import { votesNeeded, type VoteTallySummary } from '@/lib/vote-tally';

interface TallyResponse {
  tally?: VoteTallySummary;
}

async function fetchTally(url: string): Promise<VoteTallySummary | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const body: TallyResponse = await response.json();
  return body.tally ?? null;
}

/**
 * A finished roll call never changes, so a tally fetched once is good for the
 * whole session — no focus or stale revalidation.
 */
export function useVoteTally(voteId: string | undefined) {
  return useSWR<VoteTallySummary | null>(
    voteId ? `/api/vote/${voteId}?view=tally` : null,
    fetchTally,
    { revalidateOnFocus: false, revalidateIfStale: false, shouldRetryOnError: false }
  );
}

/**
 * Yeas and nays drawn to the chamber's scale, with a tick at the votes needed
 * when the source states a threshold. Neutral grays: position is never color.
 */
export function TallyBar({ tally }: { tally: VoteTallySummary }) {
  const scale = Math.max(tally.seats, tally.yeas + tally.nays + tally.present + tally.notVoting, 1);
  // A simple-majority mark sits mid-bar on nearly every roll call and says
  // nothing; only supermajorities (cloture 3/5, suspension 2/3) earn the tick.
  const needed = tally.requiredMajority === '1/2' ? null : votesNeeded(tally);
  const pct = (n: number) => `${(n / scale) * 100}%`;
  const label = `${tally.yeas} yea, ${tally.nays} nay${needed ? `, ${needed} needed` : ''}`;

  return (
    <div className="w-full" role="img" aria-label={label}>
      <div className="relative flex h-2.5 bg-gray-100">
        <div className="h-full bg-gray-800" style={{ width: pct(tally.yeas) }} />
        <div className="h-full bg-gray-400" style={{ width: pct(tally.nays) }} />
        {needed !== null && (
          <div
            className="absolute -top-1 -bottom-1 w-0.5 bg-civiq-blue-dark"
            style={{ left: pct(needed) }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-gray-600">
        <span>
          {tally.yeas}–{tally.nays}
        </span>
        {needed !== null && <span className="text-civiq-blue-dark">{needed} needed</span>}
      </div>
    </div>
  );
}

const PARTY_NAMES: Record<string, string> = { D: 'Democrats', R: 'Republicans', I: 'Independents' };

/** "Democrats 45 yea · 2 nay" per party. Party color marks the party name only. */
export function PartyBreakdown({ tally }: { tally: VoteTallySummary }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-gray-700">
      {tally.parties.map(p => (
        <li key={p.party}>
          <span className={`font-medium ${getPartyTextClass(p.party)}`}>
            {PARTY_NAMES[p.party]}
          </span>{' '}
          <span className="tabular-nums">
            {p.yea} yea · {p.nay} nay
            {p.other > 0 ? ` · ${p.other} other` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}
